package com.focuslock.app.ui.feature.home

import com.focuslock.app.domain.model.AppInfo
import com.focuslock.app.domain.model.LockSession

/**
 * UI State for the Home Dashboard.
 */
data class HomeUiState(
    val activeSession: LockSession? = null,
    val protectedApps: List<AppInfo> = emptyList(),
    val timeProtectedTodayFormatted: String = "1h 30m",
    val sessionsCompletedThisWeek: Int = 6,
    val grooveTunesTrack: String = "Groove Tunes — Focus beats playlist playing",
    val isGrooveTunesPlaying: Boolean = true,
    val formattedRemainingTime: String = "45:20",
    val timerProgress: Float = 0.65f
)
