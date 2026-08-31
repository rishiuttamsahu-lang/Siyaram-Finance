package com.focuslock.app.ui.feature.block

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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.focuslock.app.core.designsystem.component.FocusCard
import com.focuslock.app.core.designsystem.component.FocusCircularTimer
import com.focuslock.app.core.designsystem.component.FocusPrimaryButton
import com.focuslock.app.core.designsystem.theme.AccentLight
import com.focuslock.app.core.designsystem.theme.CanvasBackground
import com.focuslock.app.core.designsystem.theme.FocusLockTheme
import com.focuslock.app.core.designsystem.theme.PrimaryAccent
import com.focuslock.app.core.designsystem.theme.SurfaceDark
import com.focuslock.app.core.designsystem.theme.SurfaceWhite
import com.focuslock.app.core.designsystem.theme.TextPrimary
import com.focuslock.app.core.designsystem.theme.TextSecondary
import com.focuslock.app.engine.statemachine.RestrictionType

/**
 * Non-bypassable Blocking Overlay Screen displayed when a restricted app,
 * account switch, or incognito mode is intercepted.
 */
@Composable
fun BlockScreenContent(
    blockedAppName: String,
    matchedRule: RestrictionType,
    remainingTimeText: String,
    progress: Float,
    onReturnHome: () -> Unit,
    modifier: Modifier = Modifier
) {
    val ruleReason = when (matchedRule) {
        RestrictionType.BLOCK_APP -> "$blockedAppName is locked during this active focus session."
        RestrictionType.BLOCK_ACCOUNT_SWITCH -> "Account switching in $blockedAppName is blocked by FocusLock."
        RestrictionType.BLOCK_INCOGNITO -> "Incognito and private browsing windows are disabled."
        RestrictionType.BLOCK_REELS_SHORT_VIDEO -> "Short video feeds and reels are blocked in $blockedAppName."
        RestrictionType.BLOCK_NOTIFICATIONS -> "Distraction alerts are muted."
        RestrictionType.CUSTOM_ACTION -> "This action is restricted during active focus."
    }

    Surface(
        modifier = modifier.fillMaxSize(),
        color = CanvasBackground
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp, vertical = 28.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Top Shield Emblem
            Column(
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Surface(
                    modifier = Modifier
                        .size(72.dp)
                        .clip(CircleShape),
                    color = SurfaceDark,
                    shadowElevation = 8.dp
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = Icons.Default.Shield,
                            contentDescription = "Shield Guard",
                            tint = PrimaryAccent,
                            modifier = Modifier.size(38.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(18.dp))

                Text(
                    text = "Access Blocked",
                    style = MaterialTheme.typography.displayLarge.copy(
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 28.sp,
                        color = TextPrimary
                    )
                )

                Spacer(modifier = Modifier.height(6.dp))

                Text(
                    text = ruleReason,
                    style = MaterialTheme.typography.bodyMedium.copy(
                        color = TextSecondary,
                        fontSize = 14.sp,
                        textAlign = TextAlign.Center
                    ),
                    modifier = Modifier.padding(horizontal = 16.dp)
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Center Circular Countdown Card
            FocusCard(
                modifier = Modifier.fillMaxWidth(),
                cornerRadius = 24.dp,
                backgroundColor = SurfaceWhite
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "LOCK IN PROGRESS",
                        style = MaterialTheme.typography.labelSmall.copy(
                            color = PrimaryAccent,
                            fontWeight = FontWeight.ExtraBold,
                            letterSpacing = 1.sp,
                            fontSize = 11.sp
                        )
                    )

                    Spacer(modifier = Modifier.height(18.dp))

                    FocusCircularTimer(
                        timeText = remainingTimeText,
                        progress = progress,
                        subtitle = "Remaining in Lock",
                        size = 190.dp
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        text = "Strict Mode Active • No Early Unlock",
                        style = MaterialTheme.typography.bodyMedium.copy(
                            color = TextSecondary,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Motivation Box
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp)),
                color = AccentLight,
                shape = RoundedCornerShape(16.dp)
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Lock,
                        contentDescription = null,
                        tint = PrimaryAccent,
                        modifier = Modifier.size(22.dp)
                    )
                    Spacer(modifier = Modifier.size(12.dp))
                    Text(
                        text = "Stay committed to your deep focus. Instant distraction is temporary, true mastery is permanent.",
                        style = MaterialTheme.typography.bodyMedium.copy(
                            color = TextPrimary,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                            lineHeight = 18.sp
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.height(28.dp))

            // Bottom CTA
            FocusPrimaryButton(
                text = "Return to Home Screen",
                onClick = onReturnHome,
                trailingIcon = Icons.Default.Home
            )
        }
    }
}

@Preview(showBackground = true, widthDp = 390, heightDp = 844)
@Composable
fun BlockScreenPreview() {
    FocusLockTheme {
        BlockScreenContent(
            blockedAppName = "Instagram",
            matchedRule = RestrictionType.BLOCK_ACCOUNT_SWITCH,
            remainingTimeText = "06:18:42",
            progress = 0.85f,
            onReturnHome = {}
        )
    }
}
