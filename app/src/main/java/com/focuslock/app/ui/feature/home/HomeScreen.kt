package com.focuslock.app.ui.feature.home

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.focuslock.app.core.designsystem.component.FocusAccentPillBadge
import com.focuslock.app.core.designsystem.component.FocusActiveStatusBadge
import com.focuslock.app.core.designsystem.component.FocusCard
import com.focuslock.app.core.designsystem.component.FocusCircularTimer
import com.focuslock.app.core.designsystem.component.FocusGrooveTunesBar
import com.focuslock.app.core.designsystem.component.FocusStatCard
import com.focuslock.app.core.designsystem.component.FocusTopHeader
import com.focuslock.app.core.designsystem.theme.FocusLockTheme
import com.focuslock.app.core.designsystem.theme.PrimaryAccent
import com.focuslock.app.core.designsystem.theme.TextPrimary
import com.focuslock.app.core.designsystem.theme.TextSecondary
import com.focuslock.app.domain.model.AppInfo
import com.focuslock.app.ui.feature.home.component.HomeEmptyStateCard
import com.focuslock.app.ui.feature.home.component.ProtectedAppItem

/**
 * Pixel-Perfect Home Dashboard conforming to Pages Designs/Home.png.
 */
@Composable
fun HomeScreen(
    onActiveLockClick: () -> Unit,
    onNotificationClick: () -> Unit,
    onStartLockClick: () -> Unit = onActiveLockClick,
    viewModel: HomeViewModel = viewModel(),
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()

    HomeContent(
        uiState = uiState,
        onActiveLockClick = onActiveLockClick,
        onNotificationClick = onNotificationClick,
        onStartLockClick = onStartLockClick,
        onToggleGrooveTunes = { viewModel.toggleGrooveTunes() },
        modifier = modifier
    )
}

@Composable
fun HomeContent(
    uiState: HomeUiState,
    onActiveLockClick: () -> Unit,
    onNotificationClick: () -> Unit,
    onStartLockClick: () -> Unit,
    onToggleGrooveTunes: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 14.dp)
    ) {
        // 1. Top Header with Notification Bell
        FocusTopHeader(
            title = "Focus",
            onNotificationClick = onNotificationClick
        )

        Spacer(modifier = Modifier.height(14.dp))

        // 2. Groove Tunes Bar
        FocusGrooveTunesBar(
            trackTitle = uiState.grooveTunesTrack,
            isPlaying = uiState.isGrooveTunesPlaying,
            onClick = onToggleGrooveTunes
        )

        Spacer(modifier = Modifier.height(20.dp))

        // 3. Active Focus Hero Card OR Empty State
        if (uiState.activeSession != null) {
            FocusCard(
                modifier = Modifier.fillMaxWidth(),
                cornerRadius = 24.dp,
                onClick = onActiveLockClick
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        FocusAccentPillBadge(text = "ACTIVE FOCUS")
                        FocusAccentPillBadge(
                            text = "${uiState.protectedApps.size} APPS PROTECTED",
                            icon = Icons.Default.Lock
                        )
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    // Circular Countdown Timer
                    FocusCircularTimer(
                        timeText = uiState.formattedRemainingTime,
                        progress = uiState.timerProgress,
                        subtitle = "Remaining"
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    // Active Protection Badge
                    FocusActiveStatusBadge(text = "Protection is Active")
                }
            }
        } else {
            HomeEmptyStateCard(
                onStartLockClick = onStartLockClick
            )
        }

        Spacer(modifier = Modifier.height(20.dp))

        // 4. Quick Stats Grid (2 Columns)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            FocusStatCard(
                title = "Time Protected Today",
                value = uiState.timeProtectedTodayFormatted,
                icon = Icons.Default.Timer,
                modifier = Modifier.weight(1f)
            )
            FocusStatCard(
                title = "Sessions Completed",
                value = "${uiState.sessionsCompletedThisWeek} This Week",
                icon = Icons.Default.CheckCircle,
                modifier = Modifier.weight(1f)
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        // 5. Protected Apps Section
        if (uiState.protectedApps.isNotEmpty()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Protected Apps",
                    style = MaterialTheme.typography.titleLarge.copy(
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp,
                        color = TextPrimary
                    )
                )
                Text(
                    text = "View All",
                    style = MaterialTheme.typography.bodyMedium.copy(
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 14.sp,
                        color = PrimaryAccent
                    ),
                    modifier = Modifier.clickable(onClick = onActiveLockClick)
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            uiState.protectedApps.forEach { app ->
                ProtectedAppItem(
                    app = app,
                    onClick = onActiveLockClick,
                    modifier = Modifier.padding(bottom = 10.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(20.dp))
    }
}

@Preview(showBackground = true, widthDp = 390, heightDp = 844)
@Composable
fun HomeScreenActivePreview() {
    FocusLockTheme {
        HomeContent(
            uiState = HomeUiState(
                activeSession = null, // Will use preview default
                protectedApps = listOf(
                    AppInfo("com.instagram.android", "Instagram", "Social Media"),
                    AppInfo("com.android.chrome", "Chrome", "Browser")
                ),
                formattedRemainingTime = "45:20",
                timerProgress = 0.65f
            ),
            onActiveLockClick = {},
            onNotificationClick = {},
            onStartLockClick = {},
            onToggleGrooveTunes = {}
        )
    }
}
