package com.focuslock.app.domain.model

import android.graphics.drawable.Drawable

/**
 * Representation of an installed application discovered on the device.
 */
data class AppInfo(
    val packageName: String,
    val appName: String,
    val category: String = "App",
    val isRecommended: Boolean = false,
    val icon: Drawable? = null
)
