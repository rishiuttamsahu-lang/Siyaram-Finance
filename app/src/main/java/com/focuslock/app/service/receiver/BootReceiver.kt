package com.focuslock.app.service.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.focuslock.app.data.repository.LockSessionRepositoryImpl
import com.focuslock.app.engine.EnforcementEngine
import com.focuslock.app.service.foreground.FocusForegroundService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * BroadcastReceiver triggered on system reboot to restore active lock sessions
 * and relaunch the persistent foreground protection service.
 */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action != Intent.ACTION_BOOT_COMPLETED) return

        Log.i(TAG, "Device reboot completed. Restoring active lock sessions...")

        val pendingResult = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val repository = LockSessionRepositoryImpl(context)
                val activeSession = repository.getActiveSessionSync()

                if (activeSession != null && !activeSession.isExpired) {
                    Log.i(TAG, "Restoring active lock session: ${activeSession.id} (${activeSession.remainingMillis}ms remaining)")
                    EnforcementEngine.setActiveSession(activeSession)
                    FocusForegroundService.start(context)
                } else if (activeSession != null && activeSession.isExpired) {
                    Log.i(TAG, "Active session expired during device downtime. Marking completed.")
                    repository.completeSession(activeSession.id)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error restoring active lock on reboot", e)
            } finally {
                pendingResult.finish()
            }
        }
    }

    companion object {
        private const val TAG = "BootReceiver"
    }
}
