package com.focuslock.app.ui.feature.activelock

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.HourglassTop
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.focuslock.app.core.designsystem.component.FocusAccentPillBadge
import com.focuslock.app.core.designsystem.component.FocusActiveStatusBadge
import com.focuslock.app.core.designsystem.component.FocusCard
import com.focuslock.app.core.designsystem.component.FocusCircularTimer
import com.focuslock.app.core.designsystem.component.FocusInfoNoticeCard
import com.focuslock.app.core.designsystem.component.FocusTopHeader
import com.focuslock.app.core.designsystem.theme.AccentLight
import com.focuslock.app.core.designsystem.theme.BorderSubtle
import com.focuslock.app.core.designsystem.theme.CanvasBackground
import com.focuslock.app.core.designsystem.theme.FocusLockTheme
import com.focuslock.app.core.designsystem.theme.PrimaryAccent
import com.focuslock.app.core.designsystem.theme.SuccessBadgeBg
import com.focuslock.app.core.designsystem.theme.SuccessBadgeText
import com.focuslock.app.core.designsystem.theme.SurfaceDark
import com.focuslock.app.core.designsystem.theme.SurfaceWhite
import com.focuslock.app.core.designsystem.theme.TextPrimary
import com.focuslock.app.core.designsystem.theme.TextSecondary
import com.focuslock.app.engine.EnforcementEngine

/**
 * Pixel-Perfect Active Lock Detail Screen conforming to Pages Designs/active lock.png.
 */
@Composable
fun ActiveLockScreen(
    onBackClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val activeSession by EnforcementEngine.activeSession.collectAsState()

    val timeText = if (activeSession != null && !activeSession!!.isExpired) {
        val totalSecs = activeSession!!.remainingMillis / 1000
        val hours = totalSecs / 3600
        val mins = (totalSecs % 3600) / 60
        val secs = totalSecs % 60
        String.format("%02d:%02d:%02d", hours, mins, secs)
    } else {
        "06:18:42"
    }

    val progress = activeSession?.progress ?: 0.85f
    val titleBadge = activeSession?.title?.uppercase() ?: "7-DAY SPRINT"
    val appCount = activeSession?.restrictions?.size ?: 3

    Scaffold(
        containerColor = CanvasBackground
    ) { paddingValues ->
        LazyColumn(
            modifier = modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 20.dp)
        ) {
            // Header
            item {
                Spacer(modifier = Modifier.height(14.dp))
                FocusTopHeader(
                    title = "Active Lock",
                    onBackClick = onBackClick,
                    isCentered = true
                )
                Spacer(modifier = Modifier.height(10.dp))
            }

            // 1. Hero Countdown Card
            item {
                FocusCard(
                    modifier = Modifier.fillMaxWidth(),
                    cornerRadius = 24.dp
                ) {
                    Column(
                        modifier = Modifier.padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            FocusAccentPillBadge(text = titleBadge)
                            FocusAccentPillBadge(
                                text = "$appCount APPS LOCKED",
                                icon = Icons.Default.Lock
                            )
                        }

                        Spacer(modifier = Modifier.height(24.dp))

                        FocusCircularTimer(
                            timeText = timeText,
                            progress = progress,
                            subtitle = "Remaining in Lock",
                            size = 210.dp
                        )

                        Spacer(modifier = Modifier.height(28.dp))

                        FocusActiveStatusBadge(text = "Enforcement Guard Active")
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            // 2. Session Progress Bar Card
            item {
                FocusCard(
                    modifier = Modifier.fillMaxWidth(),
                    cornerRadius = 18.dp
                ) {
                    Column(modifier = Modifier.padding(18.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Session Progress",
                                style = MaterialTheme.typography.titleMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary,
                                    fontSize = 15.sp
                                )
                            )
                            Text(
                                text = "${(progress * 100).toInt()}%",
                                style = MaterialTheme.typography.titleMedium.copy(
                                    fontWeight = FontWeight.ExtraBold,
                                    color = PrimaryAccent,
                                    fontSize = 15.sp
                                )
                            )
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        LinearProgressIndicator(
                            progress = { progress },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(8.dp)
                                .clip(RoundedCornerShape(50)),
                            color = PrimaryAccent,
                            trackColor = CanvasBackground,
                            strokeCap = StrokeCap.Round
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "Elapsed: 18h 41m",
                                style = MaterialTheme.typography.bodyMedium.copy(
                                    color = TextSecondary,
                                    fontSize = 12.sp
                                )
                            )
                            Text(
                                text = "Total: 168h 00m",
                                style = MaterialTheme.typography.bodyMedium.copy(
                                    color = TextSecondary,
                                    fontSize = 12.sp
                                )
                            )
                        }
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            // 3. Protected Apps & Rule Breakdown
            item {
                Text(
                    text = "Active Protected Apps",
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = TextPrimary
                    )
                )
                Spacer(modifier = Modifier.height(10.dp))

                ActiveAppDetailItem(
                    name = "Instagram",
                    category = "Social Media",
                    rule = "Account Switching Blocked • App Launch Blocked",
                    initial = "I"
                )
                Spacer(modifier = Modifier.height(8.dp))

                ActiveAppDetailItem(
                    name = "Google Chrome",
                    category = "Web Browser",
                    rule = "Incognito & Private Tabs Disabled",
                    initial = "C"
                )
                Spacer(modifier = Modifier.height(8.dp))

                ActiveAppDetailItem(
                    name = "YouTube",
                    category = "Entertainment",
                    rule = "Endless Shorts Feed Blocked",
                    initial = "Y"
                )
                Spacer(modifier = Modifier.height(16.dp))
            }

            // 4. Motivation Card
            item {
                FocusCard(
                    modifier = Modifier.fillMaxWidth(),
                    cornerRadius = 18.dp
                ) {
                    Row(
                        modifier = Modifier.padding(18.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(
                            modifier = Modifier.size(42.dp),
                            shape = CircleShape,
                            color = AccentLight
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(
                                    text = "🎯",
                                    fontSize = 20.sp
                                )
                            }
                        }
                        Spacer(modifier = Modifier.width(14.dp))
                        Column {
                            Text(
                                text = "You're doing great!",
                                style = MaterialTheme.typography.titleMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary,
                                    fontSize = 15.sp
                                )
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = "18 distraction attempts prevented so far today. Keep the momentum going!",
                                style = MaterialTheme.typography.bodyMedium.copy(
                                    color = TextSecondary,
                                    fontSize = 12.sp,
                                    lineHeight = 16.sp
                                )
                            )
                        }
                    }
                }
                Spacer(modifier = Modifier.height(14.dp))
            }

            // 5. Strict Lock Policy Notice
            item {
                FocusInfoNoticeCard(
                    title = "Strict Lock Policy",
                    text = "Modifications and early exits are strictly disabled during this session. Stay locked in!"
                )
                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }
}

@Composable
private fun ActiveAppDetailItem(
    name: String,
    category: String,
    rule: String,
    initial: String
) {
    FocusCard(
        modifier = Modifier.fillMaxWidth(),
        cornerRadius = 16.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                Surface(
                    modifier = Modifier.size(38.dp),
                    shape = RoundedCornerShape(10.dp),
                    color = AccentLight
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            text = initial,
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = PrimaryAccent,
                                fontSize = 16.sp
                            )
                        )
                    }
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        text = name,
                        style = MaterialTheme.typography.bodyLarge.copy(
                            fontWeight = FontWeight.SemiBold,
                            color = TextPrimary,
                            fontSize = 14.sp
                        )
                    )
                    Text(
                        text = rule,
                        style = MaterialTheme.typography.bodyMedium.copy(
                            color = TextSecondary,
                            fontSize = 11.sp
                        )
                    )
                }
            }

            Surface(
                modifier = Modifier.clip(CircleShape),
                color = SuccessBadgeBg
            ) {
                Text(
                    text = "Guarded",
                    style = MaterialTheme.typography.labelSmall.copy(
                        color = SuccessBadgeText,
                        fontWeight = FontWeight.Bold,
                        fontSize = 11.sp
                    ),
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                )
            }
        }
    }
}

@Preview(showBackground = true, widthDp = 390, heightDp = 844)
@Composable
fun ActiveLockScreenPreview() {
    FocusLockTheme {
        ActiveLockScreen(
            onBackClick = {}
        )
    }
}
