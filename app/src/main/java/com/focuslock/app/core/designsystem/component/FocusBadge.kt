package com.focuslock.app.core.designsystem.component

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Shield
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
import com.focuslock.app.core.designsystem.theme.AccentLight
import com.focuslock.app.core.designsystem.theme.PrimaryAccent
import com.focuslock.app.core.designsystem.theme.SuccessBadgeBg
import com.focuslock.app.core.designsystem.theme.SuccessBadgeText
import com.focuslock.app.core.designsystem.theme.SurfaceDark
import com.focuslock.app.core.designsystem.theme.TextSecondary

/**
 * Green Active Status Pill Badge (e.g. "Active" with indicator dot).
 */
@Composable
fun FocusActiveStatusBadge(
    modifier: Modifier = Modifier,
    text: String = "Active"
) {
    Surface(
        modifier = modifier.clip(CircleShape),
        shape = CircleShape,
        color = SuccessBadgeBg
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(6.dp)
                    .background(SuccessBadgeText, CircleShape)
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = text,
                style = MaterialTheme.typography.labelSmall.copy(
                    color = SuccessBadgeText,
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp
                )
            )
        }
    }
}

/**
 * Orange Accent Pill Badge (e.g., "ACTIVE FOCUS" or "3 APPS PROTECTED").
 */
@Composable
fun FocusAccentPillBadge(
    text: String,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null,
    backgroundColor: Color = AccentLight,
    textColor: Color = PrimaryAccent
) {
    Surface(
        modifier = modifier.clip(CircleShape),
        shape = CircleShape,
        color = backgroundColor
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (icon != null) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = textColor,
                    modifier = Modifier.size(14.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
            }
            Text(
                text = text,
                style = MaterialTheme.typography.labelSmall.copy(
                    color = textColor,
                    fontWeight = FontWeight.Bold,
                    fontSize = 11.sp,
                    letterSpacing = 0.5.sp
                )
            )
        }
    }
}

/**
 * Step Counter Pill (e.g., "STEP 1 OF 5").
 */
@Composable
fun FocusStepLabel(
    currentStep: Int,
    totalSteps: Int = 5,
    modifier: Modifier = Modifier
) {
    Text(
        text = "STEP $currentStep OF $totalSteps".uppercase(),
        style = MaterialTheme.typography.labelSmall.copy(
            color = PrimaryAccent,
            fontWeight = FontWeight.ExtraBold,
            fontSize = 12.sp,
            letterSpacing = 1.sp
        ),
        modifier = modifier
    )
}

/**
 * Shield Protection Badge for Lock Timers & Headers.
 */
@Composable
fun FocusShieldBadge(
    modifier: Modifier = Modifier,
    size: Dp = 36.dp,
    iconSize: Dp = 18.dp,
    backgroundColor: Color = SurfaceDark,
    iconTint: Color = PrimaryAccent
) {
    Surface(
        modifier = modifier.size(size),
        shape = CircleShape,
        color = backgroundColor,
        shadowElevation = 2.dp
    ) {
        Box(contentAlignment = Alignment.Center) {
            Icon(
                imageVector = Icons.Default.Shield,
                contentDescription = "Protection Shield",
                tint = iconTint,
                modifier = Modifier.size(iconSize)
            )
        }
    }
}
