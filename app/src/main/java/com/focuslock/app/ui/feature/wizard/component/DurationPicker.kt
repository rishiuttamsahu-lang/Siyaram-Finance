package com.focuslock.app.ui.feature.wizard.component

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.focuslock.app.core.designsystem.component.FocusCard
import com.focuslock.app.core.designsystem.theme.PrimaryAccent
import com.focuslock.app.core.designsystem.theme.SurfaceWhite
import com.focuslock.app.core.designsystem.theme.TextPrimary
import com.focuslock.app.core.designsystem.theme.TextSecondary

/**
 * Grid of duration selection pills matching Pages Designs/start a lock.png.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun DurationPickerGrid(
    selectedDays: Int,
    onSelectDays: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    val durationOptions = listOf(3, 5, 7, 10, 14, 30)

    Column(modifier = modifier.fillMaxWidth()) {
        Text(
            text = "Select Lock Duration",
            style = MaterialTheme.typography.titleMedium.copy(
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
                color = TextPrimary
            )
        )
        Spacer(modifier = Modifier.height(12.dp))

        FlowRow(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
            maxItemsInEachRow = 3
        ) {
            durationOptions.forEach { days ->
                val isSelected = selectedDays == days
                FocusCard(
                    modifier = Modifier.weight(1f),
                    cornerRadius = 14.dp,
                    backgroundColor = SurfaceWhite,
                    isSelected = isSelected,
                    onClick = { onSelectDays(days) }
                ) {
                    Column(
                        modifier = Modifier.padding(vertical = 14.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "$days Days",
                            style = MaterialTheme.typography.bodyLarge.copy(
                                fontWeight = FontWeight.Bold,
                                color = if (isSelected) PrimaryAccent else TextPrimary,
                                fontSize = 15.sp
                            )
                        )
                        Text(
                            text = "${days * 24}h",
                            style = MaterialTheme.typography.labelSmall.copy(
                                color = TextSecondary,
                                fontSize = 11.sp
                            )
                        )
                    }
                }
            }
        }
    }
}
