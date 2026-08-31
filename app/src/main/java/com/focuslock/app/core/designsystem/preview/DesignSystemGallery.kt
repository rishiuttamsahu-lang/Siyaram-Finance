package com.focuslock.app.core.designsystem.preview

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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
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
import com.focuslock.app.core.designsystem.component.FocusAccentPillBadge
import com.focuslock.app.core.designsystem.component.FocusActiveStatusBadge
import com.focuslock.app.core.designsystem.component.FocusAddActionButton
import com.focuslock.app.core.designsystem.component.FocusBottomBar
import com.focuslock.app.core.designsystem.component.FocusCard
import com.focuslock.app.core.designsystem.component.FocusCircularTimer
import com.focuslock.app.core.designsystem.component.FocusGrooveTunesBar
import com.focuslock.app.core.designsystem.component.FocusInfoNoticeCard
import com.focuslock.app.core.designsystem.component.FocusNavigationTab
import com.focuslock.app.core.designsystem.component.FocusPrimaryButton
import com.focuslock.app.core.designsystem.component.FocusSecondaryButton
import com.focuslock.app.core.designsystem.component.FocusStatCard
import com.focuslock.app.core.designsystem.component.FocusStepLabel
import com.focuslock.app.core.designsystem.component.FocusStepProgressBar
import com.focuslock.app.core.designsystem.component.FocusTopHeader
import com.focuslock.app.core.designsystem.theme.AccentLight
import com.focuslock.app.core.designsystem.theme.CanvasBackground
import com.focuslock.app.core.designsystem.theme.FocusLockTheme
import com.focuslock.app.core.designsystem.theme.InfoSurface
import com.focuslock.app.core.designsystem.theme.PrimaryAccent
import com.focuslock.app.core.designsystem.theme.SuccessBadgeBg
import com.focuslock.app.core.designsystem.theme.SurfaceDark
import com.focuslock.app.core.designsystem.theme.SurfaceWhite
import com.focuslock.app.core.designsystem.theme.TextPrimary
import com.focuslock.app.core.designsystem.theme.TextSecondary

/**
 * Visual Preview Gallery verifying Phase 2 Design System tokens and custom components.
 */
@Composable
fun DesignSystemGallery() {
    var selectedTab by remember { mutableStateOf(FocusNavigationTab.HOME) }

    Scaffold(
        containerColor = CanvasBackground,
        bottomBar = {
            FocusBottomBar(
                currentTab = selectedTab,
                onTabSelected = { selectedTab = it },
                onCreateFocusClick = { /* Preview Action */ }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 16.dp)
        ) {
            // Header
            FocusTopHeader(
                title = "Focus",
                subtitle = "Design System Showcase",
                onNotificationClick = {}
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Step Progress Bar Demo
            FocusStepLabel(currentStep = 2, totalSteps = 5)
            Spacer(modifier = Modifier.height(8.dp))
            FocusStepProgressBar(currentStep = 2, totalSteps = 5)

            Spacer(modifier = Modifier.height(20.dp))

            // Groove Tunes Bar
            FocusGrooveTunesBar()

            Spacer(modifier = Modifier.height(24.dp))

            // Active Focus Timer Card
            Text(
                text = "1. Active Focus Card & Timer",
                style = MaterialTheme.typography.titleLarge.copy(
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    color = TextPrimary
                )
            )
            Spacer(modifier = Modifier.height(12.dp))

            FocusCard(
                modifier = Modifier.fillMaxWidth(),
                cornerRadius = 24.dp
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
                            text = "3 APPS PROTECTED",
                            icon = Icons.Default.Lock
                        )
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    FocusCircularTimer(
                        timeText = "45:20",
                        progress = 0.65f,
                        subtitle = "Remaining"
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    FocusActiveStatusBadge(text = "Protection is Active")
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // 2-Column Stat Cards
            Text(
                text = "2. Quick Stats Grid",
                style = MaterialTheme.typography.titleLarge.copy(
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    color = TextPrimary
                )
            )
            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                FocusStatCard(
                    title = "Time Protected Today",
                    value = "1h 30m",
                    icon = Icons.Default.Timer,
                    modifier = Modifier.weight(1f)
                )
                FocusStatCard(
                    title = "Sessions This Week",
                    value = "6 Sessions",
                    icon = Icons.Default.Lock,
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Buttons & CTA Demo
            Text(
                text = "3. Buttons & CTAs",
                style = MaterialTheme.typography.titleLarge.copy(
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    color = TextPrimary
                )
            )
            Spacer(modifier = Modifier.height(12.dp))

            FocusPrimaryButton(
                text = "Start 7-Day Lock",
                onClick = {}
            )

            Spacer(modifier = Modifier.height(10.dp))

            FocusSecondaryButton(
                text = "Back to Setup",
                onClick = {}
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Notice Card
            Text(
                text = "4. Information Notice Card",
                style = MaterialTheme.typography.titleLarge.copy(
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    color = TextPrimary
                )
            )
            Spacer(modifier = Modifier.height(12.dp))

            FocusInfoNoticeCard(
                title = "How restrictions work?",
                text = "Once activated, selected apps will be completely blocked for the chosen duration. Strict Mode prevents early exit."
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Color Tokens Preview
            Text(
                text = "5. Palette Tokens",
                style = MaterialTheme.typography.titleLarge.copy(
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    color = TextPrimary
                )
            )
            Spacer(modifier = Modifier.height(12.dp))

            PalettePreviewRow()

            Spacer(modifier = Modifier.height(30.dp))
        }
    }
}

@Composable
private fun PalettePreviewRow() {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        ColorChip(name = "Accent", color = PrimaryAccent)
        ColorChip(name = "Dark", color = SurfaceDark)
        ColorChip(name = "Canvas", color = CanvasBackground)
        ColorChip(name = "Light", color = AccentLight)
        ColorChip(name = "Success", color = SuccessBadgeBg)
        ColorChip(name = "Info", color = InfoSurface)
    }
}

@Composable
private fun ColorChip(name: String, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(CircleShape)
                .background(color)
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = name,
            style = MaterialTheme.typography.labelSmall.copy(
                fontSize = 10.sp,
                color = TextSecondary
            )
        )
    }
}

@Preview(showBackground = true, widthDp = 390, heightDp = 844)
@Composable
fun DesignSystemGalleryPreview() {
    FocusLockTheme {
        DesignSystemGallery()
    }
}
