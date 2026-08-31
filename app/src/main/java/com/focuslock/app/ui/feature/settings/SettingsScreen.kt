package com.focuslock.app.ui.feature.settings

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
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.focuslock.app.core.designsystem.component.FocusCard
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

/**
 * Settings & System Health Screen.
 */
@Composable
fun SettingsScreen(
    modifier: Modifier = Modifier
) {
    var strictModeEnabled by remember { mutableStateOf(true) }
    var antiUninstallEnabled by remember { mutableStateOf(true) }
    var bootResilienceEnabled by remember { mutableStateOf(true) }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 20.dp, vertical = 14.dp)
    ) {
        item {
            FocusTopHeader(
                title = "Settings & Guard",
                subtitle = "Configure protection levels and enforcement shields"
            )
            Spacer(modifier = Modifier.height(16.dp))
        }

        // Section 1: System Service Status
        item {
            Text(
                text = "System Protection Status",
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = TextPrimary
                )
            )
            Spacer(modifier = Modifier.height(10.dp))

            PermissionStatusCard(
                title = "Accessibility Interceptor",
                desc = "Active & monitoring app launches",
                icon = Icons.Default.Security,
                isGranted = true
            )
            Spacer(modifier = Modifier.height(8.dp))

            PermissionStatusCard(
                title = "System Alert Overlay",
                desc = "Granted for non-bypassable block screens",
                icon = Icons.Default.Shield,
                isGranted = true
            )
            Spacer(modifier = Modifier.height(8.dp))

            PermissionStatusCard(
                title = "Battery Optimization",
                desc = "Unrestricted background persistence",
                icon = Icons.Default.BatterySaver,
                isGranted = true
            )
            Spacer(modifier = Modifier.height(20.dp))
        }

        // Section 2: Strict Mode Defenses
        item {
            Text(
                text = "Strict Mode & Anti-Bypass",
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = TextPrimary
                )
            )
            Spacer(modifier = Modifier.height(10.dp))

            SettingToggleCard(
                title = "Unbreakable Strict Mode",
                desc = "Disables early unlock, session cancellation, and timer edits",
                isChecked = strictModeEnabled,
                onCheckedChange = { strictModeEnabled = it }
            )
            Spacer(modifier = Modifier.height(8.dp))

            SettingToggleCard(
                title = "Anti-Uninstall Defense",
                desc = "Prevents uninstalling or disabling FocusLock during active locks",
                isChecked = antiUninstallEnabled,
                onCheckedChange = { antiUninstallEnabled = it }
            )
            Spacer(modifier = Modifier.height(8.dp))

            SettingToggleCard(
                title = "Reboot Resilience",
                desc = "Automatically restores locks and alarms upon device restart",
                isChecked = bootResilienceEnabled,
                onCheckedChange = { bootResilienceEnabled = it }
            )
            Spacer(modifier = Modifier.height(20.dp))
        }

        // Section 3: App Information
        item {
            FocusCard(
                modifier = Modifier.fillMaxWidth(),
                cornerRadius = 16.dp
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "FocusLock v1.0.0",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary,
                            fontSize = 15.sp
                        )
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Clean Architecture • Jetpack Compose • MVVM • Room SQLite",
                        style = MaterialTheme.typography.bodySmall.copy(
                            color = TextSecondary,
                            fontSize = 12.sp
                        )
                    )
                }
            }
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
private fun PermissionStatusCard(
    title: String,
    desc: String,
    icon: ImageVector,
    isGranted: Boolean
) {
    FocusCard(
        modifier = Modifier.fillMaxWidth(),
        cornerRadius = 14.dp
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
                    modifier = Modifier.size(36.dp),
                    shape = CircleShape,
                    color = AccentLight
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = icon,
                            contentDescription = null,
                            tint = PrimaryAccent,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        text = title,
                        style = MaterialTheme.typography.bodyMedium.copy(
                            fontWeight = FontWeight.SemiBold,
                            color = TextPrimary,
                            fontSize = 14.sp
                        )
                    )
                    Text(
                        text = desc,
                        style = MaterialTheme.typography.bodySmall.copy(
                            color = TextSecondary,
                            fontSize = 11.sp
                        )
                    )
                }
            }

            Surface(
                modifier = Modifier.clip(CircleShape),
                color = if (isGranted) SuccessBadgeBg else AccentLight
            ) {
                Text(
                    text = if (isGranted) "Active" else "Action Needed",
                    style = MaterialTheme.typography.labelSmall.copy(
                        color = if (isGranted) SuccessBadgeText else PrimaryAccent,
                        fontWeight = FontWeight.Bold,
                        fontSize = 11.sp
                    ),
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                )
            }
        }
    }
}

@Composable
private fun SettingToggleCard(
    title: String,
    desc: String,
    isChecked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    FocusCard(
        modifier = Modifier.fillMaxWidth(),
        cornerRadius = 14.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.bodyMedium.copy(
                        fontWeight = FontWeight.SemiBold,
                        color = TextPrimary,
                        fontSize = 14.sp
                    )
                )
                Text(
                    text = desc,
                    style = MaterialTheme.typography.bodySmall.copy(
                        color = TextSecondary,
                        fontSize = 11.sp
                    )
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Switch(
                checked = isChecked,
                onCheckedChange = onCheckedChange,
                colors = SwitchDefaults.colors(
                    checkedThumbColor = Color.White,
                    checkedTrackColor = PrimaryAccent,
                    uncheckedThumbColor = Color.White,
                    uncheckedTrackColor = CanvasBackground
                )
            )
        }
    }
}

@Preview(showBackground = true, widthDp = 390, heightDp = 844)
@Composable
fun SettingsScreenPreview() {
    FocusLockTheme {
        SettingsScreen()
    }
}
