package com.focuslock.app.ui.feature.wizard

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.focuslock.app.core.designsystem.component.FocusCard
import com.focuslock.app.core.designsystem.component.FocusInfoNoticeCard
import com.focuslock.app.core.designsystem.component.FocusPrimaryButton
import com.focuslock.app.core.designsystem.component.FocusSecondaryButton
import com.focuslock.app.core.designsystem.component.FocusStepLabel
import com.focuslock.app.core.designsystem.component.FocusStepProgressBar
import com.focuslock.app.core.designsystem.component.FocusTopHeader
import com.focuslock.app.core.designsystem.theme.AccentLight
import com.focuslock.app.core.designsystem.theme.BorderSubtle
import com.focuslock.app.core.designsystem.theme.CanvasBackground
import com.focuslock.app.core.designsystem.theme.FocusLockTheme
import com.focuslock.app.core.designsystem.theme.PrimaryAccent
import com.focuslock.app.core.designsystem.theme.SurfaceDark
import com.focuslock.app.core.designsystem.theme.SurfaceWhite
import com.focuslock.app.core.designsystem.theme.TextPrimary
import com.focuslock.app.core.designsystem.theme.TextSecondary
import com.focuslock.app.ui.feature.wizard.component.DurationPickerGrid
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

/**
 * Pixel-Perfect Step 3/5: Start a Lock conforming to Pages Designs/start a lock.png.
 */
@Composable
fun StartLockScreen(
    state: WizardSharedState,
    onBackClick: () -> Unit,
    onStartLockClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    var isCommitmentChecked by remember { mutableStateOf(true) }

    val now = System.currentTimeMillis()
    val endsAt = now + TimeUnit.DAYS.toMillis(state.lockDurationDays.toLong())

    val dateFormat = SimpleDateFormat("MMM d, h:mm a", Locale.getDefault())
    val startDateStr = "Today, " + SimpleDateFormat("h:mm a", Locale.getDefault()).format(Date(now))
    val endDateStr = dateFormat.format(Date(endsAt))

    Scaffold(
        containerColor = CanvasBackground,
        bottomBar = {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = SurfaceWhite,
                shadowElevation = 8.dp,
                border = BorderStroke(1.dp, BorderSubtle)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 14.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    FocusSecondaryButton(
                        text = "Back",
                        onClick = onBackClick,
                        modifier = Modifier.weight(0.32f)
                    )
                    FocusPrimaryButton(
                        text = "Start ${state.lockDurationDays}-Day Lock",
                        onClick = onStartLockClick,
                        enabled = isCommitmentChecked,
                        modifier = Modifier.weight(0.68f)
                    )
                }
            }
        }
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
                    title = "Start a Lock",
                    subtitle = "Lock in. Stay focused.",
                    onBackClick = onBackClick
                )
                Spacer(modifier = Modifier.height(10.dp))
            }

            // Step Progress Bar
            item {
                FocusStepLabel(currentStep = 3, totalSteps = 5)
                Spacer(modifier = Modifier.height(8.dp))
                FocusStepProgressBar(currentStep = 3, totalSteps = 5)
                Spacer(modifier = Modifier.height(18.dp))
            }

            // Hero Motivation Banner
            item {
                FocusCard(
                    modifier = Modifier.fillMaxWidth(),
                    cornerRadius = 20.dp,
                    backgroundColor = SurfaceDark
                ) {
                    Row(
                        modifier = Modifier.padding(18.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(
                            modifier = Modifier.size(46.dp),
                            shape = CircleShape,
                            color = PrimaryAccent.copy(alpha = 0.2f)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    imageVector = Icons.Default.Shield,
                                    contentDescription = null,
                                    tint = PrimaryAccent,
                                    modifier = Modifier.size(24.dp)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.size(14.dp))
                        Column {
                            Text(
                                text = "Lock in. Stay focused.",
                                style = MaterialTheme.typography.titleMedium.copy(
                                    fontWeight = FontWeight.ExtraBold,
                                    color = Color.White,
                                    fontSize = 17.sp
                                )
                            )
                            Text(
                                text = "Eliminate distractions with unyielding discipline.",
                                style = MaterialTheme.typography.bodyMedium.copy(
                                    color = Color.White.copy(alpha = 0.7f),
                                    fontSize = 12.sp
                                )
                            )
                        }
                    }
                }
                Spacer(modifier = Modifier.height(20.dp))
            }

            // Duration Selector Grid
            item {
                DurationPickerGrid(
                    selectedDays = state.lockDurationDays,
                    onSelectDays = { state.lockDurationDays = it }
                )
                Spacer(modifier = Modifier.height(20.dp))
            }

            // Session Preview Card
            item {
                FocusCard(
                    modifier = Modifier.fillMaxWidth(),
                    cornerRadius = 20.dp
                ) {
                    Column(modifier = Modifier.padding(18.dp)) {
                        Text(
                            text = "Session Preview",
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                        )
                        Spacer(modifier = Modifier.height(12.dp))

                        PreviewRow(label = "Start Time", value = startDateStr)
                        PreviewRow(label = "End Time", value = endDateStr)
                        PreviewRow(label = "Total Duration", value = "${state.lockDurationDays} Days (${state.lockDurationDays * 24} Hours)")
                        PreviewRow(label = "Protected Apps", value = "${state.selectedPackageNames.size} Apps Configured")
                        PreviewRow(label = "Enforcement Mode", value = "Strict Mode (Unbreakable)")
                    }
                }
                Spacer(modifier = Modifier.height(14.dp))
            }

            // Important Warning Callout Box
            item {
                FocusInfoNoticeCard(
                    title = "Important to know",
                    text = "You won't be able to turn off protections, remove apps, or unlock early once this session begins."
                )
                Spacer(modifier = Modifier.height(16.dp))
            }

            // Commitment Pledge Toggle
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .clickable { isCommitmentChecked = !isCommitmentChecked }
                        .padding(vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        onClick = { isCommitmentChecked = !isCommitmentChecked },
                        modifier = Modifier.size(24.dp),
                        shape = CircleShape,
                        color = if (isCommitmentChecked) PrimaryAccent else Color.Transparent,
                        border = if (!isCommitmentChecked) BorderStroke(1.5.dp, BorderSubtle) else null
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            if (isCommitmentChecked) {
                                Icon(
                                    imageVector = Icons.Default.Check,
                                    contentDescription = "Committed",
                                    tint = Color.White,
                                    modifier = Modifier.size(14.dp)
                                )
                            }
                        }
                    }
                    Spacer(modifier = Modifier.size(10.dp))
                    Text(
                        text = "I commit to this focus period and accept the lock terms.",
                        style = MaterialTheme.typography.bodyMedium.copy(
                            color = TextPrimary,
                            fontWeight = FontWeight.Medium,
                            fontSize = 13.sp
                        )
                    )
                }
                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }
}

@Composable
private fun PreviewRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium.copy(
                color = TextSecondary,
                fontSize = 13.sp
            )
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium.copy(
                color = TextPrimary,
                fontWeight = FontWeight.SemiBold,
                fontSize = 13.sp
            )
        )
    }
}

@Preview(showBackground = true, widthDp = 390, heightDp = 844)
@Composable
fun StartLockPreview() {
    FocusLockTheme {
        StartLockScreen(
            state = WizardSharedState().apply {
                lockDurationDays = 7
                selectedPackageNames.add("com.instagram.android")
            },
            onBackClick = {},
            onStartLockClick = {}
        )
    }
}
