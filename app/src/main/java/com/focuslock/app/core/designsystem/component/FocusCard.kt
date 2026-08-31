package com.focuslock.app.core.designsystem.component

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.focuslock.app.core.designsystem.theme.BorderSelected
import com.focuslock.app.core.designsystem.theme.BorderSubtle
import com.focuslock.app.core.designsystem.theme.InfoIcon
import com.focuslock.app.core.designsystem.theme.InfoSurface
import com.focuslock.app.core.designsystem.theme.PrimaryAccent
import com.focuslock.app.core.designsystem.theme.SurfaceWhite
import com.focuslock.app.core.designsystem.theme.TextPrimary
import com.focuslock.app.core.designsystem.theme.TextSecondary

/**
 * Custom FocusLock Card matching Figma specifications (20dp or 14dp radius, subtle border).
 */
@Composable
fun FocusCard(
    modifier: Modifier = Modifier,
    cornerRadius: Dp = 20.dp,
    backgroundColor: Color = SurfaceWhite,
    borderColor: Color = BorderSubtle,
    borderWidth: Dp = 1.dp,
    isSelected: Boolean = false,
    onClick: (() -> Unit)? = null,
    content: @Composable () -> Unit
) {
    val effectiveBorderColor = if (isSelected) BorderSelected else borderColor
    val effectiveBorderWidth = if (isSelected) 1.5.dp else borderWidth
    val shape = RoundedCornerShape(cornerRadius)

    Surface(
        modifier = modifier
            .clip(shape)
            .then(
                if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier
            )
            .border(
                border = BorderStroke(effectiveBorderWidth, effectiveBorderColor),
                shape = shape
            ),
        shape = shape,
        color = backgroundColor,
        tonalElevation = 0.dp,
        shadowElevation = 0.dp
    ) {
        content()
    }
}

/**
 * Stat Card for 2-column dashboard metrics (e.g., "1h 30m Time Protected Today").
 */
@Composable
fun FocusStatCard(
    title: String,
    value: String,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null,
    iconTint: Color = PrimaryAccent
) {
    FocusCard(
        modifier = modifier,
        cornerRadius = 16.dp,
        backgroundColor = SurfaceWhite
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            if (icon != null) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = iconTint,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.size(8.dp))
            }
            Text(
                text = value,
                style = MaterialTheme.typography.titleLarge.copy(
                    fontWeight = FontWeight.Bold,
                    fontSize = 20.sp,
                    color = TextPrimary
                )
            )
            Text(
                text = title,
                style = MaterialTheme.typography.bodyMedium.copy(
                    fontSize = 13.sp,
                    color = TextSecondary
                ),
                modifier = Modifier.padding(top = 4.dp)
            )
        }
    }
}

/**
 * Notice & Information Callout Card (e.g., "How restrictions work?").
 */
@Composable
fun FocusInfoNoticeCard(
    text: String,
    modifier: Modifier = Modifier,
    title: String? = null,
    icon: ImageVector = Icons.Default.Info
) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp)),
        color = InfoSurface,
        shape = RoundedCornerShape(14.dp)
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.Top
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = InfoIcon,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(10.dp))
            Column {
                if (title != null) {
                    Text(
                        text = title,
                        style = MaterialTheme.typography.bodyLarge.copy(
                            fontWeight = FontWeight.SemiBold,
                            color = TextPrimary,
                            fontSize = 14.sp
                        )
                    )
                }
                Text(
                    text = text,
                    style = MaterialTheme.typography.bodyMedium.copy(
                        color = TextSecondary,
                        fontSize = 13.sp
                    )
                )
            }
        }
    }
}
