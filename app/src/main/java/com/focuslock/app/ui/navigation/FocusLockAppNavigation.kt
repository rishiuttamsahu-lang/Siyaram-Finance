package com.focuslock.app.ui.navigation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.focuslock.app.core.designsystem.component.FocusBottomBar
import com.focuslock.app.core.designsystem.component.FocusNavigationTab
import com.focuslock.app.core.designsystem.theme.CanvasBackground
import com.focuslock.app.ui.feature.activelock.ActiveLockScreen
import com.focuslock.app.ui.feature.history.HistoryScreen
import com.focuslock.app.ui.feature.home.HomeScreen
import com.focuslock.app.ui.feature.insights.InsightsScreen
import com.focuslock.app.ui.feature.settings.SettingsScreen
import com.focuslock.app.ui.feature.wizard.SelectAppsScreen
import com.focuslock.app.ui.feature.wizard.SetRestrictionsScreen
import com.focuslock.app.ui.feature.wizard.StartLockScreen
import com.focuslock.app.ui.feature.wizard.WizardSharedState

/**
 * Root Navigation Scaffold and NavHost wiring up all 5 main tabs and the 5-step wizard.
 */
@Composable
fun FocusLockAppNavigation(
    navController: NavHostController = rememberNavController()
) {
    val wizardState = remember { WizardSharedState() }
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route ?: Screen.Home.route

    val isBottomBarVisible = currentRoute in Screen.topLevelRoutes

    val currentTab = when (currentRoute) {
        Screen.History.route -> FocusNavigationTab.HISTORY
        Screen.Insights.route -> FocusNavigationTab.INSIGHTS
        Screen.Settings.route -> FocusNavigationTab.SETTINGS
        else -> FocusNavigationTab.HOME
    }

    Scaffold(
        containerColor = CanvasBackground,
        bottomBar = {
            if (isBottomBarVisible) {
                FocusBottomBar(
                    currentTab = currentTab,
                    onTabSelected = { tab ->
                        val targetRoute = when (tab) {
                            FocusNavigationTab.HOME -> Screen.Home.route
                            FocusNavigationTab.HISTORY -> Screen.History.route
                            FocusNavigationTab.INSIGHTS -> Screen.Insights.route
                            FocusNavigationTab.SETTINGS -> Screen.Settings.route
                        }
                        if (currentRoute != targetRoute) {
                            navController.navigate(targetRoute) {
                                popUpTo(Screen.Home.route) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        }
                    },
                    onCreateFocusClick = {
                        wizardState.reset()
                        navController.navigate(Screen.WizardSelectApps.route)
                    }
                )
            }
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(CanvasBackground)
                .padding(paddingValues)
        ) {
            NavHost(
                navController = navController,
                startDestination = Screen.Home.route
            ) {
                // 1. Home Dashboard
                composable(Screen.Home.route) {
                    HomeScreen(
                        onActiveLockClick = {
                            navController.navigate(Screen.ActiveLockDetail.route)
                        },
                        onStartLockClick = {
                            wizardState.reset()
                            navController.navigate(Screen.WizardSelectApps.route)
                        },
                        onNotificationClick = {
                            // Notifications route
                        }
                    )
                }

                // 2. History & Logs
                composable(Screen.History.route) {
                    HistoryScreen()
                }

                // 3. Insights
                composable(Screen.Insights.route) {
                    InsightsScreen()
                }

                // 4. Settings
                composable(Screen.Settings.route) {
                    SettingsScreen()
                }

                // 5. Wizard: Step 1/5 - Select Apps
                composable(Screen.WizardSelectApps.route) {
                    SelectAppsScreen(
                        state = wizardState,
                        onBackClick = { navController.popBackStack() },
                        onNextClick = { navController.navigate(Screen.WizardSetRestrictions.route) }
                    )
                }

                // 6. Wizard: Step 2/5 - Set Restrictions
                composable(Screen.WizardSetRestrictions.route) {
                    SetRestrictionsScreen(
                        state = wizardState,
                        onBackClick = { navController.popBackStack() },
                        onNextClick = { navController.navigate(Screen.WizardStartLock.route) }
                    )
                }

                // 7. Wizard: Step 3/5 - Start Lock
                composable(Screen.WizardStartLock.route) {
                    StartLockScreen(
                        state = wizardState,
                        onBackClick = { navController.popBackStack() },
                        onStartLockClick = {
                            navController.navigate(Screen.Home.route) {
                                popUpTo(Screen.Home.route) { inclusive = true }
                            }
                        }
                    )
                }

                // 8. Active Lock Detail
                composable(Screen.ActiveLockDetail.route) {
                    ActiveLockScreen(
                        onBackClick = { navController.popBackStack() }
                    )
                }
            }
        }
    }
}
