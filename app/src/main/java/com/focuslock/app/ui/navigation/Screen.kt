package com.focuslock.app.ui.navigation

/**
 * Type-safe navigation routes for FocusLock.
 */
sealed class Screen(val route: String) {
    // 5 Main Bottom Bar Destinations
    data object Home : Screen("home")
    data object History : Screen("history")
    data object Insights : Screen("insights")
    data object Settings : Screen("settings")

    // Wizard Sub-flow Destinations (5 Steps)
    data object WizardSelectApps : Screen("wizard_select_apps")
    data object WizardSetRestrictions : Screen("wizard_set_restrictions")
    data object WizardStartLock : Screen("wizard_start_lock")

    // Active Lock Detail Destination
    data object ActiveLockDetail : Screen("active_lock_detail")

    companion object {
        val topLevelRoutes = listOf(
            Home.route,
            History.route,
            Insights.route,
            Settings.route
        )
    }
}
