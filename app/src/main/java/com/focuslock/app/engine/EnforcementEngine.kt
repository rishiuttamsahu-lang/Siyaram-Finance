package com.focuslock.app.engine

import com.focuslock.app.domain.model.AppRestriction
import com.focuslock.app.domain.model.LockSession
import com.focuslock.app.engine.statemachine.LockStatus
import com.focuslock.app.engine.statemachine.RestrictionType
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow

data class InterceptionEvent(
    val packageName: String,
    val appName: String,
    val matchedRule: RestrictionType,
    val remainingMillis: Long,
    val timestamp: Long = System.currentTimeMillis()
)

/**
 * Central runtime enforcement engine responsible for evaluating real-time
 * application events against the active LockSession.
 */
object EnforcementEngine {

    private val _activeSession = MutableStateFlow<LockSession?>(null)
    val activeSession: StateFlow<LockSession?> = _activeSession.asStateFlow()

    private val _interceptionEvents = MutableSharedFlow<InterceptionEvent>(extraBufferCapacity = 10)
    val interceptionEvents: SharedFlow<InterceptionEvent> = _interceptionEvents.asSharedFlow()

    fun setActiveSession(session: LockSession?) {
        _activeSession.value = session
    }

    fun isProtectionActive(): Boolean {
        val session = _activeSession.value ?: return false
        return session.status == LockStatus.ACTIVE && !session.isExpired
    }

    /**
     * Evaluates whether launching [packageName] violates the active lock session.
     */
    fun evaluatePackageLaunch(packageName: String): Boolean {
        val session = _activeSession.value ?: return false
        if (!isProtectionActive()) return false

        // Never intercept self or critical system components
        if (packageName == "com.focuslock.app" || isSystemAllowlisted(packageName)) {
            return false
        }

        val restriction = session.restrictions.firstOrNull {
            it.packageName.equals(packageName, ignoreCase = true) && it.isEnabled
        }

        if (restriction != null && restriction.restrictionType == RestrictionType.BLOCK_APP) {
            _interceptionEvents.tryEmit(
                InterceptionEvent(
                    packageName = packageName,
                    appName = restriction.appName,
                    matchedRule = RestrictionType.BLOCK_APP,
                    remainingMillis = session.remainingMillis
                )
            )
            return true
        }

        return false
    }

    /**
     * Evaluates whether in-app UI interactions (such as opening account switcher or incognito tab)
     * match targeted sub-restrictions.
     */
    fun evaluateUiContent(packageName: String, contentText: String?): Boolean {
        val session = _activeSession.value ?: return false
        if (!isProtectionActive() || contentText.isNullOrBlank()) return false

        val textLower = contentText.lowercase()
        val pkgLower = packageName.lowercase()

        val matchingRestriction = session.restrictions.firstOrNull {
            it.packageName.equals(packageName, ignoreCase = true) && it.isEnabled
        } ?: return false

        // Check for Instagram / Social Account Switching triggers
        if (matchingRestriction.restrictionType == RestrictionType.BLOCK_ACCOUNT_SWITCH) {
            if (textLower.contains("switch accounts") || textLower.contains("add account") ||
                textLower.contains("log in to existing account") || textLower.contains("create new account")
            ) {
                _interceptionEvents.tryEmit(
                    InterceptionEvent(
                        packageName = packageName,
                        appName = matchingRestriction.appName,
                        matchedRule = RestrictionType.BLOCK_ACCOUNT_SWITCH,
                        remainingMillis = session.remainingMillis
                    )
                )
                return true
            }
        }

        // Check for Browser Incognito triggers
        if (matchingRestriction.restrictionType == RestrictionType.BLOCK_INCOGNITO) {
            if (textLower.contains("new incognito tab") || textLower.contains("private tab") ||
                textLower.contains("incognito window") || textLower.contains("inprivate")
            ) {
                _interceptionEvents.tryEmit(
                    InterceptionEvent(
                        packageName = packageName,
                        appName = matchingRestriction.appName,
                        matchedRule = RestrictionType.BLOCK_INCOGNITO,
                        remainingMillis = session.remainingMillis
                    )
                )
                return true
            }
        }

        return false
    }

    private fun isSystemAllowlisted(packageName: String): Boolean {
        val pkg = packageName.lowercase()
        return pkg.contains("android.launcher") ||
                pkg.contains("systemui") ||
                pkg.contains("nexuslauncher") ||
                pkg.contains("dialer") ||
                pkg.contains("telecom") ||
                pkg.contains("emergency")
    }
}
