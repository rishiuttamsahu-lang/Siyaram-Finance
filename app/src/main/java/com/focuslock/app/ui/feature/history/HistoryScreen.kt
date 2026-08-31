package com.focuslock.app.ui.feature.history

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
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.focuslock.app.core.designsystem.component.FocusCard
import com.focuslock.app.core.designsystem.component.FocusTopHeader
import com.focuslock.app.core.designsystem.theme.AccentLight
import com.focuslock.app.core.designsystem.theme.CanvasBackground
import com.focuslock.app.core.designsystem.theme.FocusLockTheme
import com.focuslock.app.core.designsystem.theme.PrimaryAccent
import com.focuslock.app.core.designsystem.theme.SuccessBadgeBg
import com.focuslock.app.core.designsystem.theme.SuccessBadgeText
import com.focuslock.app.core.designsystem.theme.SurfaceDark
import com.focuslock.app.core.designsystem.theme.SurfaceWhite
import com.focuslock.app.core.designsystem.theme.TextPrimary
import com.focuslock.app.core.designsystem.theme.TextSecondary

/**
 * Rich Session History & Analytics Log Screen.
 */
@Composable
fun HistoryScreen(
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 20.dp, vertical = 14.dp)
    ) {
        item {
            FocusTopHeader(
                title = "Session History",
                subtitle = "Track past locks, commitments, and focus achievements"
            )
            Spacer(modifier = Modifier.height(16.dp))
        }

        // Summary KPI Banner
        item {
            FocusCard(
                modifier = Modifier.fillMaxWidth(),
                cornerRadius = 20.dp,
                backgroundColor = SurfaceDark
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(18.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "6",
                            style = MaterialTheme.typography.displaySmall.copy(
                                fontWeight = FontWeight.ExtraBold,
                                color = PrimaryAccent,
                                fontSize = 24.sp
                            )
                        )
                        Text(
                            text = "Locks Done",
                            style = MaterialTheme.typography.bodySmall.copy(
                                color = Color.White.copy(alpha = 0.7f),
                                fontSize = 11.sp
                            )
                        )
                    }

                    Surface(
                        modifier = Modifier
                            .width(1.dp)
                            .height(36.dp),
                        color = Color.White.copy(alpha = 0.15f)
                    ) {}

                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "264h",
                            style = MaterialTheme.typography.displaySmall.copy(
                                fontWeight = FontWeight.ExtraBold,
                                color = Color.White,
                                fontSize = 24.sp
                            )
                        )
                        Text(
                            text = "Time Saved",
                            style = MaterialTheme.typography.bodySmall.copy(
                                color = Color.White.copy(alpha = 0.7f),
                                fontSize = 11.sp
                            )
                        )
                    }

                    Surface(
                        modifier = Modifier
                            .width(1.dp)
                            .height(36.dp),
                        color = Color.White.copy(alpha = 0.15f)
                    ) {}

                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "100%",
                            style = MaterialTheme.typography.displaySmall.copy(
                                fontWeight = FontWeight.ExtraBold,
                                color = SuccessBadgeText,
                                fontSize = 24.sp
                            )
                        )
                        Text(
                            text = "Commit Rate",
                            style = MaterialTheme.typography.bodySmall.copy(
                                color = Color.White.copy(alpha = 0.7f),
                                fontSize = 11.sp
                            )
                        )
                    }
                }
            }
            Spacer(modifier = Modifier.height(20.dp))
        }

        item {
            Text(
                text = "Completed Locks",
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    color = TextPrimary
                )
            )
            Spacer(modifier = Modifier.height(12.dp))
        }

        // Past Lock Card 1
        item {
            HistorySessionCard(
                title = "7-Day Social Lock Sprint",
                completedDate = "Completed Aug 28 • 168 hours protected",
                apps = listOf("Instagram", "Chrome", "YouTube"),
                blocksPrevented = 42,
                durationPill = "7 Days"
            )
            Spacer(modifier = Modifier.height(12.dp))
        }

        // Past Lock Card 2
        item {
            HistorySessionCard(
                title = "3-Day Deep Work Detox",
                completedDate = "Completed Aug 20 • 72 hours protected",
                apps = listOf("Instagram", "Chrome"),
                blocksPrevented = 28,
                durationPill = "3 Days"
            )
            Spacer(modifier = Modifier.height(12.dp))
        }

        // Past Lock Card 3
        item {
            HistorySessionCard(
                title = "1-Day Weekend Disconnect",
                completedDate = "Completed Aug 14 • 24 hours protected",
                apps = listOf("Instagram", "YouTube", "Twitter / X"),
                blocksPrevented = 16,
                durationPill = "1 Day"
            )
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
private fun HistorySessionCard(
    title: String,
    completedDate: String,
    apps: List<String>,
    blocksPrevented: Int,
    durationPill: String
) {
    FocusCard(
        modifier = Modifier.fillMaxWidth(),
        cornerRadius = 18.dp
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary,
                        fontSize = 15.sp
                    )
                )

                Surface(
                    modifier = Modifier.clip(CircleShape),
                    color = SuccessBadgeBg
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = SuccessBadgeText,
                            modifier = Modifier.size(12.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "Completed",
                            style = MaterialTheme.typography.labelSmall.copy(
                                color = SuccessBadgeText,
                                fontWeight = FontWeight.Bold,
                                fontSize = 11.sp
                            )
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = completedDate,
                style = MaterialTheme.typography.bodyMedium.copy(
                    color = TextSecondary,
                    fontSize = 12.sp
                )
            )

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Apps Protected Pills
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    apps.forEach { appName ->
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = AccentLight
                        ) {
                            Text(
                                text = appName,
                                style = MaterialTheme.typography.labelSmall.copy(
                                    color = PrimaryAccent,
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 11.sp
                                ),
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                            )
                        }
                    }
                }

                Text(
                    text = "$blocksPrevented distractions blocked",
                    style = MaterialTheme.typography.bodySmall.copy(
                        color = TextSecondary,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium
                    )
                )
            }
        }
    }
}

@Preview(showBackground = true, widthDp = 390, heightDp = 844)
@Composable
fun HistoryScreenPreview() {
    FocusLockTheme {
        HistoryScreen()
    }
}
