package com.focuslock.app.core.designsystem.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val FocusLockLightColorScheme = lightColorScheme(
    primary = PrimaryAccent,
    onPrimary = SurfaceWhite,
    primaryContainer = AccentLight,
    onPrimaryContainer = PrimaryAccent,
    background = CanvasBackground,
    onBackground = TextPrimary,
    surface = SurfaceWhite,
    onSurface = TextPrimary,
    outline = BorderSubtle
)

@Composable
fun FocusLockTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    // FocusLock uses warm canvas theme as standard across Figma designs
    MaterialTheme(
        colorScheme = FocusLockLightColorScheme,
        typography = FocusLockTypography,
        content = content
    )
}
