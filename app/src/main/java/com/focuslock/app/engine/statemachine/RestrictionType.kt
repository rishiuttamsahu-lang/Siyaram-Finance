package com.focuslock.app.engine.statemachine

/**
 * Types of app restrictions supported by the engine.
 */
enum class RestrictionType(
    val title: String,
    val description: String
) {
    BLOCK_APP(
        title = "Block Opening the App",
        description = "Completely prevent launching selected apps during active lock."
    ),
    BLOCK_ACCOUNT_SWITCH(
        title = "Block Account Switching",
        description = "Prevent switching profiles or secret accounts inside target apps."
    ),
    BLOCK_INCOGNITO(
        title = "Block Incognito & Private Tabs",
        description = "Detect and block opening private or incognito browsing windows."
    ),
    BLOCK_REELS_SHORT_VIDEO(
        title = "Block Reels & Short Videos",
        description = "Target and block the endless short-form video feeds inside apps."
    ),
    BLOCK_NOTIFICATIONS(
        title = "Mute Distraction Notifications",
        description = "Suppress incoming notification alerts from target apps."
    ),
    CUSTOM_ACTION(
        title = "Custom Guard Rule",
        description = "Enforce custom UI element block hook."
    )
}
