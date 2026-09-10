package com.focuslock.app.ui.feature.wizard.component

import android.graphics.drawable.Drawable
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.graphics.drawable.toBitmap
import com.focuslock.app.core.designsystem.component.FocusCard
import com.focuslock.app.core.designsystem.theme.AccentLight
import com.focuslock.app.core.designsystem.theme.BorderSubtle
import com.focuslock.app.core.designsystem.theme.PrimaryAccent
import com.focuslock.app.core.designsystem.theme.SurfaceWhite
import com.focuslock.app.core.designsystem.theme.TextPrimary
import com.focuslock.app.core.designsystem.theme.TextSecondary
import com.focuslock.app.domain.model.AppInfo

/**
 * App row item with custom circular checkmark for Step 1/5 Select Apps.
 */
@Composable
fun SelectAppItem(
    app: AppInfo,
    isSelected: Boolean,
    onToggle: () -> Unit,
    modifier: Modifier = Modifier
) {
    FocusCard(
        modifier = modifier.fillMaxWidth(),
        cornerRadius = 16.dp,
        backgroundColor = SurfaceWhite,
        isSelected = isSelected,
        onClick = onToggle
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f)
            ) {
                // App Icon or Letter Fallback
                if (app.icon != null) {
                    val bitmap = try {
                        app.icon.toBitmap(width = 96, height = 96).asImageBitmap()
                    } catch (e: Exception) {
                        null
                    }

                    if (bitmap != null) {
                        Image(
                            bitmap = bitmap,
                            contentDescription = app.appName,
                            modifier = Modifier
                                .size(44.dp)
                                .clip(RoundedCornerShape(12.dp))
                        )
                    } else {
                        AppInitialFallback(appName = app.appName)
                    }
                } else {
                    AppInitialFallback(appName = app.appName)
                }

                Spacer(modifier = Modifier.width(14.dp))

                Column {
                    Text(
                        text = app.appName,
                        style = MaterialTheme.typography.bodyLarge.copy(
                            fontWeight = FontWeight.SemiBold,
                            color = TextPrimary,
                            fontSize = 15.sp
                        )
                    )
                    Text(
                        text = app.category,
                        style = MaterialTheme.typography.bodyMedium.copy(
                            color = TextSecondary,
                            fontSize = 12.sp
                        )
                    )
                }
            }

            // Custom Circular Checkbox
            Surface(
                onClick = onToggle,
                modifier = Modifier.size(28.dp),
                shape = CircleShape,
                color = if (isSelected) PrimaryAccent else Color.Transparent,
                border = if (!isSelected) androidx.compose.foundation.BorderStroke(1.5.dp, BorderSubtle) else null
            ) {
                Box(contentAlignment = Alignment.Center) {
                    if (isSelected) {
                        Icon(
                            imageVector = Icons.Default.Check,
                            contentDescription = "Selected",
                            tint = Color.White,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun AppInitialFallback(appName: String) {
    Surface(
        modifier = Modifier
            .size(44.dp)
            .clip(RoundedCornerShape(12.dp)),
        color = AccentLight
    ) {
        Box(contentAlignment = Alignment.Center) {
            Text(
                text = appName.take(1).uppercase(),
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.Bold,
                    color = PrimaryAccent,
                    fontSize = 18.sp
                )
            )
        }
    }
}
