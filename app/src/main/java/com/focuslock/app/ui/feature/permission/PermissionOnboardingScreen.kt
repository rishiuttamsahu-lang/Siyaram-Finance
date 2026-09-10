package com.focuslock.app.ui.feature.permission

import android.content.Context
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BatterySaver
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
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
import com.focuslock.app.core.designsystem.theme.SuccessBadgeBg
import com.focuslock.app.core.designsystem.theme.SuccessBadgeText
import com.focuslock.app.core.designsystem.theme.SurfaceDark
import com.focuslock.app.core.designsystem.theme.SurfaceWhite
import com.focuslock.app.core.designsystem.theme.TextPrimary
import com.focuslock.app.core.designsystem.theme.TextSecondary
import com.focuslock.app.core.permission.PermissionManager

/**
 * Step 4/5: Permissions Diagnostic and Onboarding Screen.
 */
@Composable
fun PermissionOnboardingScreen(
    onBackClick: () -> Unit,
    onContinueClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current

    var isAccessibilityGranted by remember { mutableStateOf(false) }
    var isOverlayGranted by remember { mutableStateOf(false) }
    var isBatteryIgnored by remember { mutableStateOf(false) }

    fun refreshPermissions() {
        isAccessibilityGranted = PermissionManager.isAccessibilityServiceEnabled(context)
        isOverlayGranted = PermissionManager.isOverlayPermissionGranted(context)
        isBatteryIgnored = PermissionManager.isBatteryOptimizationIgnored(context)
    }

    LaunchedEffect(Unit) {
        refreshPermissions()
    }

    val allReady = isAccessibilityGranted && isOverlayGranted && isBatteryIgnored

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
                        text = if (allReady) "Continue to Final Step" else "Continue Anyway (Demo)",
                        onClick = onContinueClick,
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
            item {
                Spacer(modifier = Modifier.height(14.dp))
                FocusTopHeader(
                    title = "System Permissions",
                    subtitle = "Grant essential system guards for active protection",
                    onBackClick = onBackClick
                )
                Spacer(modifier = Modifier.height(10.dp))
            }

            item {
                FocusStepLabel(currentStep = 4, totalSteps = 5)
                Spacer(modifier = Modifier.height(8.dp))
                FocusStepProgressBar(currentStep = 4, totalSteps = 5)
                Spacer(modifier = Modifier.height(18.dp))
            }

            item {
                FocusInfoNoticeCard(
                    title = "Why these permissions are needed",
                    text = "FocusLock requires Accessibility and Overlay permissions to intercept blocked apps and display the non-bypassable lock screen."
                )
                Spacer(modifier = Modifier.height(18.dp))
            }

            // Permission 1: Accessibility Interceptor
            item {
                PermissionActionCard(
                    title = "Accessibility Interceptor",
                    description = "Required to detect when Instagram, Chrome, or blocked apps are launched in real-time.",
                    icon = Icons.Default.Security,
                    isGranted = isAccessibilityGranted,
                    onGrantClick = {
                        PermissionManager.openAccessibilitySettings(context)
                    }
                )
                Spacer(modifier = Modifier.height(12.dp))
            }

            // Permission 2: Display Overlay
            item {
                PermissionActionCard(
                    title = "Display Over Other Apps",
                    description = "Required to display the unbreakable full-screen Block Screen over restricted apps.",
                    icon = Icons.Default.Shield,
                    isGranted = isOverlayGranted,
                    onGrantClick = {
                        PermissionManager.openOverlaySettings(context)
                    }
                )
                Spacer(modifier = Modifier.height(12.dp))
            }

            // Permission 3: Battery Optimization Exclusion
            item {
                PermissionActionCard(
                    title = "Ignore Battery Optimization",
                    description = "Prevents Android from killing the countdown timer and background foreground service.",
                    icon = Icons.Default.BatterySaver,
                    isGranted = isBatteryIgnored,
                    onGrantClick = {
                        PermissionManager.requestIgnoreBatteryOptimization(context)
                    }
                )
                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }
}

@Composable
private fun PermissionActionCard(
    title: String,
    description: String,
    icon: ImageVector,
    isGranted: Boolean,
    onGrantClick: () -> Unit
) {
    FocusCard(
        modifier = Modifier.fillMaxWidth(),
        cornerRadius = 18.dp,
        onClick = onGrantClick
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                modifier = Modifier.size(42.dp),
                shape = CircleShape,
                color = if (isGranted) SuccessBadgeBg else AccentLight
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = if (isGranted) Icons.Default.Check else icon,
                        contentDescription = null,
                        tint = if (isGranted) SuccessBadgeText else PrimaryAccent,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.width(14.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary,
                        fontSize = 15.sp
                    )
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = description,
                    style = MaterialTheme.typography.bodySmall.copy(
                        color = TextSecondary,
                        fontSize = 12.sp,
                        lineHeight = 16.sp
                    )
                )
            }

            Spacer(modifier = Modifier.width(8.dp))

            Surface(
                modifier = Modifier.clip(CircleShape),
                color = if (isGranted) SuccessBadgeBg else PrimaryAccent
            ) {
                Text(
                    text = if (isGranted) "Granted" else "Enable",
                    style = MaterialTheme.typography.labelSmall.copy(
                        color = if (isGranted) SuccessBadgeText else Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 11.sp
                    ),
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                )
            }
        }
    }
}

@Preview(showBackground = true, widthDp = 390, heightDp = 844)
@Composable
fun PermissionOnboardingPreview() {
    FocusLockTheme {
        PermissionOnboardingScreen(
            onBackClick = {},
            onContinueClick = {}
        )
    }
}
