package com.focuslock.app.service.foreground

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.focuslock.app.MainActivity
import com.focuslock.app.R
import com.focuslock.app.engine.EnforcementEngine
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.util.Locale
import java.util.concurrent.TimeUnit

/**
 * Foreground Service maintaining active lock state, ongoing notification,
 * and resilient timestamp countdowns across app lifecycle events.
 */
class FocusForegroundService : Service() {

    private val serviceScope = CoroutineScope(Dispatchers.Default + Job())
    private var timerJob: Job? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action

        if (action == ACTION_STOP_SERVICE) {
            stopForegroundService()
            return START_NOT_STICKY
        }

        startForegroundNotification()
        startResilientTimerLoop()

        return START_STICKY
    }

    private fun startForegroundNotification() {
        val initialNotification = buildNotification("FocusLock Active — Protection Running")

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                initialNotification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
            )
        } else {
            startForeground(NOTIFICATION_ID, initialNotification)
        }
    }

    private fun startResilientTimerLoop() {
        timerJob?.cancel()
        timerJob = serviceScope.launch {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            while (isActive) {
                val session = EnforcementEngine.activeSession.value

                if (session == null || session.isExpired) {
                    Log.i(TAG, "Active session ended or expired.")
                    stopForegroundService()
                    break
                }

                // Compute remaining time strictly using absolute timestamps (never drift!)
                val remainingMillis = session.remainingMillis
                val formattedTime = formatTimeRemaining(remainingMillis)
                val appCount = session.restrictions.size

                val notification = buildNotification(
                    contentText = "$formattedTime remaining • $appCount apps locked"
                )
                notificationManager.notify(NOTIFICATION_ID, notification)

                delay(10000L) // Update ongoing notification every 10 seconds to conserve battery
            }
        }
    }

    private fun buildNotification(contentText: String): Notification {
        val openAppIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            openAppIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("FocusLock is Active")
            .setContentText(contentText)
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setShowWhen(false)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                getString(R.string.notification_channel_name),
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = getString(R.string.notification_channel_desc)
                setShowBadge(false)
            }

            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun stopForegroundService() {
        timerJob?.cancel()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
        stopSelf()
    }

    override fun onDestroy() {
        timerJob?.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        const val CHANNEL_ID = "focus_lock_channel"
        const val NOTIFICATION_ID = 1001
        const val ACTION_START_SERVICE = "com.focuslock.app.ACTION_START"
        const val ACTION_STOP_SERVICE = "com.focuslock.app.ACTION_STOP"
        private const val TAG = "FocusForegroundService"

        fun start(context: Context) {
            val intent = Intent(context, FocusForegroundService::class.java).apply {
                action = ACTION_START_SERVICE
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            val intent = Intent(context, FocusForegroundService::class.java).apply {
                action = ACTION_STOP_SERVICE
            }
            context.startService(intent)
        }

        fun formatTimeRemaining(millis: Long): String {
            val totalSeconds = TimeUnit.MILLISECONDS.toSeconds(millis)
            val days = TimeUnit.MILLISECONDS.toDays(millis)
            val hours = (totalSeconds / 3600) % 24
            val minutes = (totalSeconds % 3600) / 60

            return when {
                days > 0 -> "${days}d ${hours}h"
                hours > 0 -> "${hours}h ${minutes}m"
                else -> "${minutes}m"
            }
        }
    }
}
