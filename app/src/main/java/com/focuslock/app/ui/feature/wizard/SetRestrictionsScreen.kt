package com.focuslock.app.ui.feature.wizard

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
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
import com.focuslock.app.core.designsystem.theme.SurfaceWhite
import com.focuslock.app.core.designsystem.theme.TextPrimary
import com.focuslock.app.core.designsystem.theme.TextSecondary
import com.focuslock.app.engine.statemachine.RestrictionType

/**
 * Pixel-Perfect Step 2/5: Set Restrictions Flow conforming to Pages Designs/Set Restriction.png.
 */
@Composable
fun SetRestrictionsScreen(
    state: WizardSharedState,
    onBackClick: () -> Unit,
    onNextClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val expandedStates = remember { mutableStateMapOf<String, Boolean>() }

    val appSpecificRules = mapOf(
        "com.instagram.android" to listOf(
            RestrictionType.BLOCK_APP,
            RestrictionType.BLOCK_ACCOUNT_SWITCH,
            RestrictionType.BLOCK_REELS_SHORT_VIDEO
        ),
        "com.android.chrome" to listOf(
            RestrictionType.BLOCK_APP,
            RestrictionType.BLOCK_INCOGNITO
        ),
        "com.google.android.youtube" to listOf(
            RestrictionType.BLOCK_APP,
            RestrictionType.BLOCK_REELS_SHORT_VIDEO
        )
    )

    val defaultRules = listOf(
        RestrictionType.BLOCK_APP,
        RestrictionType.BLOCK_NOTIFICATIONS
    )

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
                        modifier = Modifier.weight(0.35f)
                    )
                    FocusPrimaryButton(
                        text = "Next: Lock Duration",
                        onClick = onNextClick,
                        enabled = state.selectedRestrictions.isNotEmpty(),
                        modifier = Modifier.weight(0.65f)
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
                    title = "Set Restrictions",
                    subtitle = "Configure rules for protected apps",
                    onBackClick = onBackClick
                )
                Spacer(modifier = Modifier.height(10.dp))
            }

            // Step Progress Bar
            item {
                FocusStepLabel(currentStep = 2, totalSteps = 5)
                Spacer(modifier = Modifier.height(8.dp))
                FocusStepProgressBar(currentStep = 2, totalSteps = 5)
                Spacer(modifier = Modifier.height(18.dp))
            }

            // Summary Heading
            item {
                Text(
                    text = "Configuring ${state.selectedPackageNames.size} Selected Apps",
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = TextPrimary
                    )
                )
                Spacer(modifier = Modifier.height(12.dp))
            }

            // App Accordions / Cards
            items(state.selectedPackageNames) { pkgName ->
                val isExpanded = expandedStates[pkgName] ?: true
                val rulesForApp = appSpecificRules[pkgName] ?: defaultRules
                val simpleName = pkgName.split(".").last().replaceFirstChar { it.uppercase() }

                FocusCard(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 12.dp),
                    cornerRadius = 18.dp
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { expandedStates[pkgName] = !isExpanded },
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Surface(
                                    modifier = Modifier.size(36.dp),
                                    shape = RoundedCornerShape(10.dp),
                                    color = AccentLight
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Text(
                                          text = simpleName.take(1),
                                          style = MaterialTheme.typography.titleMedium.copy(
                                              fontWeight = FontWeight.Bold,
                                              color = PrimaryAccent
                                          )
                                        )
                                    }
                                }
                                Spacer(modifier = Modifier.size(10.dp))
                                Column {
                                    Text(
                                        text = simpleName,
                                        style = MaterialTheme.typography.bodyLarge.copy(
                                            fontWeight = FontWeight.Bold,
                                            color = TextPrimary
                                        )
                                    )
                                    Text(
                                        text = pkgName,
                                        style = MaterialTheme.typography.bodyMedium.copy(
                                            fontSize = 11.sp,
                                            color = TextSecondary
                                        )
                                    )
                                }
                            }

                            Icon(
                                imageVector = if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                                contentDescription = "Toggle",
                                tint = TextSecondary
                            )
                        }

                        AnimatedVisibility(visible = isExpanded) {
                            Column(modifier = Modifier.padding(top = 14.dp)) {
                                rulesForApp.forEach { rule ->
                                    val isChecked = state.selectedRestrictions.contains(rule.name)

                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clickable { state.toggleRestriction(rule.name) }
                                            .padding(vertical = 8.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column(modifier = Modifier.weight(1f).padding(end = 12.dp)) {
                                            Text(
                                                text = rule.title,
                                                style = MaterialTheme.typography.bodyMedium.copy(
                                                    fontWeight = FontWeight.SemiBold,
                                                    color = TextPrimary,
                                                    fontSize = 14.sp
                                                )
                                            )
                                            Text(
                                                text = rule.description,
                                                style = MaterialTheme.typography.bodyMedium.copy(
                                                    fontSize = 12.sp,
                                                    color = TextSecondary
                                                )
                                            )
                                        }

                                        Surface(
                                            onClick = { state.toggleRestriction(rule.name) },
                                            modifier = Modifier.size(24.dp),
                                            shape = CircleShape,
                                            color = if (isChecked) PrimaryAccent else Color.Transparent,
                                            border = if (!isChecked) BorderStroke(1.5.dp, BorderSubtle) else null
                                        ) {
                                            Box(contentAlignment = Alignment.Center) {
                                                if (isChecked) {
                                                    Icon(
                                                        imageVector = Icons.Default.Check,
                                                        contentDescription = "Active",
                                                        tint = Color.White,
                                                        modifier = Modifier.size(14.dp)
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Info Notice Box
            item {
                Spacer(modifier = Modifier.height(6.dp))
                FocusInfoNoticeCard(
                    title = "Strict Enforcement Engine",
                    text = "Accessibility Service and UsageStats will automatically detect and block restricted user actions instantly."
                )
                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }
}

@Preview(showBackground = true, widthDp = 390, heightDp = 844)
@Composable
fun SetRestrictionsPreview() {
    FocusLockTheme {
        SetRestrictionsScreen(
            state = WizardSharedState().apply {
                selectedPackageNames.add("com.instagram.android")
                selectedPackageNames.add("com.android.chrome")
            },
            onBackClick = {},
            onNextClick = {}
        )
    }
}
