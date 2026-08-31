package com.focuslock.app.ui.feature.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.focuslock.app.domain.model.AppInfo
import com.focuslock.app.domain.model.LockSession
import com.focuslock.app.engine.statemachine.LockStatus
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.util.Locale
import java.util.concurrent.TimeUnit

/**
 * ViewModel managing Home Dashboard state and real-time timer countdown updates.
 */
class HomeViewModel : ViewModel() {

    private val sampleProtectedApps = listOf(
        AppInfo(
            packageName = "com.instagram.android",
            appName = "Instagram",
            category = "Social Media"
        ),
        AppInfo(
            packageName = "com.android.chrome",
            appName = "Chrome",
            category = "Web Browser"
        ),
        AppInfo(
            packageName = "com.google.android.youtube",
            appName = "YouTube",
            category = "Entertainment"
        )
    )

    // Default sample session matching Figma Home.png preview
    private val initialSession = LockSession(
        title = "Social Distraction Lock",
        startedAt = System.currentTimeMillis() - TimeUnit.MINUTES.toMillis(15),
        endsAt = System.currentTimeMillis() + TimeUnit.MINUTES.toMillis(45) + TimeUnit.SECONDS.toMillis(20),
        totalDurationMillis = TimeUnit.HOURS.toMillis(1),
        status = LockStatus.ACTIVE,
        isStrict = true
    )

    private val _uiState = MutableStateFlow(
        HomeUiState(
            activeSession = initialSession,
            protectedApps = sampleProtectedApps,
            timeProtectedTodayFormatted = "1h 30m",
            sessionsCompletedThisWeek = 6,
            grooveTunesTrack = "Groove Tunes — Focus beats playlist playing",
            isGrooveTunesPlaying = true,
            formattedRemainingTime = formatRemainingTime(initialSession.remainingMillis),
            timerProgress = initialSession.progress
        )
    )
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        startTimerTicker()
    }

    private fun startTimerTicker() {
        viewModelScope.launch {
            while (isActive) {
                delay(1000L)
                _uiState.update { state ->
                    val session = state.activeSession
                    if (session != null && !session.isExpired) {
                        val remaining = session.remainingMillis
                        state.copy(
                            formattedRemainingTime = formatRemainingTime(remaining),
                            timerProgress = session.progress
                        )
                    } else {
                        state
                    }
                }
            }
        }
    }

    fun toggleGrooveTunes() {
        _uiState.update { it.copy(isGrooveTunesPlaying = !it.isGrooveTunesPlaying) }
    }

    fun clearActiveSessionForTesting() {
        _uiState.update { it.copy(activeSession = null) }
    }

    fun restoreActiveSessionForTesting() {
        _uiState.update { it.copy(activeSession = initialSession) }
    }

    companion object {
        fun formatRemainingTime(millis: Long): String {
            val totalSeconds = TimeUnit.MILLISECONDS.toSeconds(millis)
            val hours = totalSeconds / 3600
            val minutes = (totalSeconds % 3600) / 60
            val seconds = totalSeconds % 60

            return if (hours > 0) {
                String.format(Locale.getDefault(), "%02d:%02d:%02d", hours, minutes, seconds)
            } else {
                String.format(Locale.getDefault(), "%02d:%02d", minutes, seconds)
            }
        }
    }
}
