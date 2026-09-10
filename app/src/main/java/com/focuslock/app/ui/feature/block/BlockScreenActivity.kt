package com.focuslock.app.ui.feature.block

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.focuslock.app.MainActivity
import com.focuslock.app.core.designsystem.theme.FocusLockTheme
import com.focuslock.app.engine.EnforcementEngine
import com.focuslock.app.engine.statemachine.RestrictionType

/**
 * Fullscreen non-bypassable Activity displayed when a restricted app or UI trigger is intercepted.
 */
class BlockScreenActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        // Handle back button strictly: redirect to device home launcher
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                returnToHomeScreen()
            }
        })

        val packageName = intent.getStringExtra("EXTRA_BLOCKED_PACKAGE") ?: "Target App"
        val ruleName = intent.getStringExtra("EXTRA_RESTRICTION_TYPE") ?: RestrictionType.BLOCK_APP.name
        val matchedRule = try {
            RestrictionType.valueOf(ruleName)
        } catch (e: Exception) {
            RestrictionType.BLOCK_APP
        }

        val appName = packageName.split(".").last().replaceFirstChar { it.uppercase() }

        setContent {
            FocusLockTheme {
                val session = EnforcementEngine.activeSession.value
                val remainingTime = if (session != null && !session.isExpired) {
                    val totalSecs = session.remainingMillis / 1000
                    val hours = totalSecs / 3600
                    val mins = (totalSecs % 3600) / 60
                    val secs = totalSecs % 60
                    if (hours > 0) String.format("%02d:%02d:%02d", hours, mins, secs)
                    else String.format("%02d:%02d", mins, secs)
                } else {
                    "06:18:42"
                }

                BlockScreenContent(
                    blockedAppName = appName,
                    matchedRule = matchedRule,
                    remainingTimeText = remainingTime,
                    progress = session?.progress ?: 0.85f,
                    onReturnHome = { returnToHomeScreen() }
                )
            }
        }
    }

    private fun returnToHomeScreen() {
        val homeIntent = Intent(Intent.ACTION_MAIN).apply {
            addCategory(Intent.CATEGORY_HOME)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        startActivity(homeIntent)
        finish()
    }
}
