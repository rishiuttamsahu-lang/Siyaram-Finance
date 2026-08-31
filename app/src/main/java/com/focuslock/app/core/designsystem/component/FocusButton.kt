package com.focuslock.app.core.designsystem.component

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import com.focuslock.app.core.designsystem.theme.BorderSubtle
import com.focuslock.app.core.designsystem.theme.PrimaryAccent
import com.focuslock.app.core.designsystem.theme.SurfaceWhite
import com.focuslock.app.core.designsystem.theme.TextPrimary

/**
 * Primary CTA Button (Solid Orange Pill, White Bold Text, Optional Arrow Icon).
 */
@Composable
fun FocusPrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    showTrailingArrow: Boolean = true,
    trailingIcon: ImageVector? = null,
    height: Dp = 56.dp
) {
    Button(
        onClick = onClick,
        modifier = modifier
            .fillMaxWidth()
            .height(height),
        enabled = enabled,
        shape = CircleShape,
        colors = ButtonDefaults.buttonColors(
            containerColor = PrimaryAccent,
            contentColor = Color.White,
            disabledContainerColor = PrimaryAccent.copy(alpha = 0.4f),
            disabledContentColor = Color.White.copy(alpha = 0.7f)
        ),
        elevation = ButtonDefaults.buttonElevation(defaultElevation = 0.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = text,
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    color = Color.White
                )
            )
            if (showTrailingArrow || trailingIcon != null) {
                Spacer(modifier = Modifier.width(8.dp))
                Icon(
                    imageVector = trailingIcon ?: Icons.AutoMirrored.Filled.ArrowForward,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(18.dp)
                )
            }
        }
    }
}

/**
 * Secondary Button (White Background, Subtle/Dark Border, Dark Text).
 */
@Composable
fun FocusSecondaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    height: Dp = 56.dp
) {
    OutlinedButton(
        onClick = onClick,
        modifier = modifier
            .fillMaxWidth()
            .height(height),
        enabled = enabled,
        shape = CircleShape,
        border = BorderStroke(1.5.dp, BorderSubtle),
        colors = ButtonDefaults.outlinedButtonColors(
            containerColor = SurfaceWhite,
            contentColor = TextPrimary
        )
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.titleMedium.copy(
                fontWeight = FontWeight.SemiBold,
                fontSize = 16.sp,
                color = TextPrimary
            )
        )
    }
}

/**
 * Floating / Action Plus Button (Elevated Orange Circle).
 */
@Composable
fun FocusAddActionButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    size: Dp = 56.dp
) {
    Surface(
        onClick = onClick,
        modifier = modifier.size(size),
        shape = CircleShape,
        color = PrimaryAccent,
        shadowElevation = 6.dp
    ) {
        Box(contentAlignment = Alignment.Center) {
            Icon(
                imageVector = Icons.Default.Add,
                contentDescription = "Create Focus",
                tint = Color.White,
                modifier = Modifier.size(28.dp)
            )
        }
    }
}

/**
 * Icon Button in Rounded Square Surface (e.g. Header Notification Bell or Back Arrow).
 */
@Composable
fun FocusRoundedIconButton(
    icon: ImageVector,
    contentDescription: String?,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    backgroundColor: Color = SurfaceWhite,
    iconTint: Color = TextPrimary,
    size: Dp = 44.dp,
    shapeRadius: Dp = 14.dp
) {
    Surface(
        onClick = onClick,
        modifier = modifier
            .size(size)
            .clip(RoundedCornerShape(shapeRadius)),
        shape = RoundedCornerShape(shapeRadius),
        color = backgroundColor,
        border = BorderStroke(1.dp, BorderSubtle)
    ) {
        Box(contentAlignment = Alignment.Center) {
            Icon(
                imageVector = icon,
                contentDescription = contentDescription,
                tint = iconTint,
                modifier = Modifier.size(20.dp)
            )
        }
    }
}
