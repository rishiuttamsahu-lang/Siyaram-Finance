package com.focuslock.app.core.designsystem.component

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.focuslock.app.core.designsystem.theme.BorderSubtle
import com.focuslock.app.core.designsystem.theme.PrimaryAccent

/**
 * Segmented Step Progress Bar for 5-step wizard navigation.
 *
 * @param currentStep 1-indexed current step (1..totalSteps)
 * @param totalSteps Total number of steps (default: 5)
 */
@Composable
fun FocusStepProgressBar(
    currentStep: Int,
    modifier: Modifier = Modifier,
    totalSteps: Int = 5,
    segmentHeight: Dp = 4.dp
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        for (step in 1..totalSteps) {
            val isCompletedOrActive = step <= currentStep
            val color = if (isCompletedOrActive) PrimaryAccent else BorderSubtle

            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(segmentHeight)
                    .clip(RoundedCornerShape(50))
                    .background(color)
            )
        }
    }
}
