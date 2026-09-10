package com.focuslock.app.core.designsystem.component

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.focuslock.app.core.designsystem.theme.BorderSubtle
import com.focuslock.app.core.designsystem.theme.PrimaryAccent
import com.focuslock.app.core.designsystem.theme.SurfaceDark
import com.focuslock.app.core.designsystem.theme.TextPrimary
import com.focuslock.app.core.designsystem.theme.TextSecondary

/**
 * FocusLock Circular Countdown Timer Widget.
 *
 * @param timeText Formatted string (e.g. "45:20" or "02:14:50")
 * @param progress Fraction between 0f (start) and 1f (full / completed)
 * @param subtitle Text label under the numeric timer (default: "Remaining")
 * @param size Outer diameter of the circular widget
 * @param strokeWidth Stroke thickness for the progress arc
 */
@Composable
fun FocusCircularTimer(
    timeText: String,
    progress: Float,
    modifier: Modifier = Modifier,
    subtitle: String = "Remaining",
    size: Dp = 200.dp,
    strokeWidth: Dp = 10.dp,
    progressColor: Color = PrimaryAccent,
    trackColor: Color = BorderSubtle,
    showShieldBadge: Boolean = true
) {
    val animatedProgress by animateFloatAsState(
        targetValue = progress.coerceIn(0f, 1f),
        animationSpec = tween(durationMillis = 600),
        label = "TimerProgress"
    )

    Box(
        modifier = modifier.size(size),
        contentAlignment = Alignment.Center
    ) {
        // Circular Progress Ring
        Canvas(modifier = Modifier.size(size - strokeWidth)) {
            val stroke = Stroke(
                width = strokeWidth.toPx(),
                cap = StrokeCap.Round
            )

            // Background Track
            drawArc(
                color = trackColor,
                startAngle = -90f,
                sweepAngle = 360f,
                useCenter = false,
                style = stroke
            )

            // Active Progress Arc
            drawArc(
                color = progressColor,
                startAngle = -90f,
                sweepAngle = animatedProgress * 360f,
                useCenter = false,
                style = stroke
            )
        }

        // Center Content (Time + Subtitle)
        Column(
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = timeText,
                style = MaterialTheme.typography.displayLarge.copy(
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = if (timeText.length > 5) 36.sp else 46.sp,
                    color = TextPrimary,
                    letterSpacing = (-1).sp
                )
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodyMedium.copy(
                    fontSize = 14.sp,
                    color = TextSecondary,
                    fontWeight = FontWeight.Normal
                )
            )
        }

        // Overlapping Shield Badge at bottom
        if (showShieldBadge) {
            Box(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .offset(y = 12.dp)
            ) {
                FocusShieldBadge(
                    size = 38.dp,
                    iconSize = 20.dp,
                    backgroundColor = SurfaceDark,
                    iconTint = PrimaryAccent
                )
            }
        }
    }
}
