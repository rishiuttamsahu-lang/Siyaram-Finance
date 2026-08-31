package com.focuslock.app.service.accessibility

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import com.focuslock.app.engine.EnforcementEngine

/**
 * Accessibility Service monitoring foreground apps and window UI elements
 * to enforce active distraction blocking rules without battery drain.
 */
class FocusAccessibilityService : AccessibilityService() {

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null || !EnforcementEngine.isProtectionActive()) return

        val packageName = event.packageName?.toString() ?: return

        when (event.eventType) {
            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> {
                // Check if the launched package is blocked
                val isBlocked = EnforcementEngine.evaluatePackageLaunch(packageName)
                if (isBlocked) {
                    Log.i(TAG, "Blocked foreground app launch: $packageName")
                    handleInterception(packageName)
                }
            }

            AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED -> {
                // Inspect node hierarchy for restricted sub-actions (e.g. account switching or incognito)
                val rootNode = rootInActiveWindow ?: return
                inspectNodeHierarchy(rootNode, packageName)
            }
        }
    }

    private fun inspectNodeHierarchy(node: AccessibilityNodeInfo, packageName: String) {
        val text = node.text?.toString()
        val contentDesc = node.contentDescription?.toString()
        val combinedText = buildString {
            if (!text.isNullOrBlank()) append(text).append(" ")
            if (!contentDesc.isNullOrBlank()) append(contentDesc)
        }

        if (combinedText.isNotBlank()) {
            val isActionBlocked = EnforcementEngine.evaluateUiContent(packageName, combinedText)
            if (isActionBlocked) {
                Log.i(TAG, "Blocked restricted action in: $packageName with text: $combinedText")
                handleInterception(packageName)
                return
            }
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            inspectNodeHierarchy(child, packageName)
        }
    }

    private fun handleInterception(packageName: String) {
        // 1. Send user back to home screen launcher immediately
        performGlobalAction(GLOBAL_ACTION_HOME)

        // 2. Launch Block Screen activity / Overlay
        try {
            val blockIntent = Intent().apply {
                setClassName(applicationContext, "com.focuslock.app.ui.feature.block.BlockScreenActivity")
                putExtra("EXTRA_BLOCKED_PACKAGE", packageName)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            }
            startActivity(blockIntent)
        } catch (e: Exception) {
            Log.e(TAG, "Error surfacing block screen", e)
        }
    }

    override fun onInterrupt() {
        Log.w(TAG, "FocusAccessibilityService interrupted.")
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        Log.i(TAG, "FocusAccessibilityService connected & ready.")
    }

    companion object {
        private const val TAG = "FocusAccessibility"
    }
}
