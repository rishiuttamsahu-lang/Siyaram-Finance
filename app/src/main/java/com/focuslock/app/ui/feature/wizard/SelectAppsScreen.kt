package com.focuslock.app.ui.feature.wizard

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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
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
import com.focuslock.app.core.designsystem.component.FocusPrimaryButton
import com.focuslock.app.core.designsystem.component.FocusStepLabel
import com.focuslock.app.core.designsystem.component.FocusStepProgressBar
import com.focuslock.app.core.designsystem.component.FocusTopHeader
import com.focuslock.app.core.designsystem.theme.BorderSubtle
import com.focuslock.app.core.designsystem.theme.CanvasBackground
import com.focuslock.app.core.designsystem.theme.FocusLockTheme
import com.focuslock.app.core.designsystem.theme.PrimaryAccent
import com.focuslock.app.core.designsystem.theme.SurfaceWhite
import com.focuslock.app.core.designsystem.theme.TextPrimary
import com.focuslock.app.core.designsystem.theme.TextSecondary
import com.focuslock.app.domain.model.AppInfo
import com.focuslock.app.ui.feature.wizard.component.AppSearchBar
import com.focuslock.app.ui.feature.wizard.component.SelectAppItem

/**
 * Pixel-Perfect Step 1/5: Select Apps Flow conforming to Pages Designs/Select Apps.png.
 */
@Composable
fun SelectAppsScreen(
    state: WizardSharedState,
    onBackClick: () -> Unit,
    onNextClick: () -> Unit,
    viewModel: SelectAppsViewModel = viewModel(),
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()

    SelectAppsContent(
        uiState = uiState,
        selectedPackages = state.selectedPackageNames.toSet(),
        onToggleApp = { pkg -> state.toggleAppSelection(pkg) },
        onSearchQueryChange = { viewModel.onSearchQueryChanged(it) },
        onBackClick = onBackClick,
        onNextClick = onNextClick,
        modifier = modifier
    )
}

@Composable
fun SelectAppsContent(
    uiState: SelectAppsUiState,
    selectedPackages: Set<String>,
    onToggleApp: (String) -> Unit,
    onSearchQueryChange: (String) -> Unit,
    onBackClick: () -> Unit,
    onNextClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Scaffold(
        containerColor = CanvasBackground,
        bottomBar = {
            // Sticky Bottom Action Bar with Counter and CTA
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = SurfaceWhite,
                shadowElevation = 8.dp,
                border = androidx.compose.foundation.BorderStroke(1.dp, BorderSubtle)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(0.45f)) {
                        Text(
                            text = if (selectedPackages.size == 1) "1 app selected" else "${selectedPackages.size} apps selected",
                            style = MaterialTheme.typography.bodyLarge.copy(
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary,
                                fontSize = 15.sp
                            )
                        )
                        Text(
                            text = if (selectedPackages.isEmpty()) "Select at least 1 app" else "Ready for restrictions",
                            style = MaterialTheme.typography.bodyMedium.copy(
                                color = if (selectedPackages.isEmpty()) PrimaryAccent else TextSecondary,
                                fontSize = 12.sp
                            )
                        )
                    }

                    FocusPrimaryButton(
                        text = "Next: Restrictions",
                        onClick = onNextClick,
                        enabled = selectedPackages.isNotEmpty(),
                        modifier = Modifier.weight(0.55f)
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
            // 1. Header
            item {
                Spacer(modifier = Modifier.height(14.dp))
                FocusTopHeader(
                    title = "Select Apps",
                    subtitle = "Choose apps to block from distraction",
                    onBackClick = onBackClick
                )
                Spacer(modifier = Modifier.height(10.dp))
            }

            // 2. Step Progress Bar
            item {
                FocusStepLabel(currentStep = 1, totalSteps = 5)
                Spacer(modifier = Modifier.height(8.dp))
                FocusStepProgressBar(currentStep = 1, totalSteps = 5)
                Spacer(modifier = Modifier.height(18.dp))
            }

            // 3. Search Bar
            item {
                AppSearchBar(
                    query = uiState.searchQuery,
                    onQueryChange = onSearchQueryChange
                )
                Spacer(modifier = Modifier.height(20.dp))
            }

            // 4. Loading State
            if (uiState.isLoading) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(180.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(
                            color = PrimaryAccent,
                            modifier = Modifier.size(36.dp)
                        )
                    }
                }
            } else {
                // 5. Recommended Section
                if (uiState.recommendedApps.isNotEmpty()) {
                    item {
                        Text(
                            text = if (uiState.isSearching) "Recommended Results" else "Recommended",
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp,
                                color = TextPrimary
                            )
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                    }

                    items(uiState.recommendedApps, key = { it.packageName }) { app ->
                        SelectAppItem(
                            app = app,
                            isSelected = selectedPackages.contains(app.packageName),
                            onToggle = { onToggleApp(app.packageName) },
                            modifier = Modifier.padding(bottom = 10.dp)
                        )
                    }

                    item { Spacer(modifier = Modifier.height(14.dp)) }
                }

                // 6. All Apps Section
                if (uiState.allApps.isNotEmpty()) {
                    item {
                        Text(
                            text = if (uiState.isSearching) "Other Matches" else "All Apps",
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp,
                                color = TextPrimary
                            )
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                    }

                    items(uiState.allApps, key = { it.packageName }) { app ->
                        SelectAppItem(
                            app = app,
                            isSelected = selectedPackages.contains(app.packageName),
                            onToggle = { onToggleApp(app.packageName) },
                            modifier = Modifier.padding(bottom = 10.dp)
                        )
                    }
                }

                item { Spacer(modifier = Modifier.height(24.dp)) }
            }
        }
    }
}

@Preview(showBackground = true, widthDp = 390, heightDp = 844)
@Composable
fun SelectAppsPreview() {
    FocusLockTheme {
        SelectAppsContent(
            uiState = SelectAppsUiState(
                isLoading = false,
                recommendedApps = listOf(
                    AppInfo("com.instagram.android", "Instagram", "Social Media", isRecommended = true),
                    AppInfo("com.android.chrome", "Chrome", "Browser", isRecommended = true)
                ),
                allApps = listOf(
                    AppInfo("com.facebook.katana", "Facebook", "Social Media"),
                    AppInfo("com.reddit.frontpage", "Reddit", "Social Media")
                )
            ),
            selectedPackages = setOf("com.instagram.android"),
            onToggleApp = {},
            onSearchQueryChange = {},
            onBackClick = {},
            onNextClick = {}
        )
    }
}
