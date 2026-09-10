package com.focuslock.app.core.designsystem.component

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Insights
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.focuslock.app.core.designsystem.theme.PrimaryAccent
import com.focuslock.app.core.designsystem.theme.SurfaceDark
import com.focuslock.app.core.designsystem.theme.TextSecondary

enum class FocusNavigationTab(
    val title: String,
    val icon: ImageVector
) {
    HOME("Home", Icons.Default.Home),
    HISTORY("History", Icons.Default.DateRange),
    INSIGHTS("Insights", Icons.Default.Insights),
    SETTINGS("Settings", Icons.Default.Settings)
}

/**
 * 5-Tab Dark Slate Navigation Bar with Center Floating '+' Button.
 */
@Composable
fun FocusBottomBar(
    currentTab: FocusNavigationTab,
    onTabSelected: (FocusNavigationTab) -> Unit,
    onCreateFocusClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(84.dp),
        contentAlignment = Alignment.BottomCenter
    ) {
        // Main Slate Bar Container
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .height(72.dp)
                .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)),
            color = SurfaceDark,
            shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp),
                horizontalArrangement = Arrangement.SpaceAround,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Tab 1: Home
                NavigationItem(
                    tab = FocusNavigationTab.HOME,
                    isSelected = currentTab == FocusNavigationTab.HOME,
                    onClick = { onTabSelected(FocusNavigationTab.HOME) }
                )

                // Tab 2: History
                NavigationItem(
                    tab = FocusNavigationTab.HISTORY,
                    isSelected = currentTab == FocusNavigationTab.HISTORY,
                    onClick = { onTabSelected(FocusNavigationTab.HISTORY) }
                )

                // Spacer for Center Action Button
                Spacer(modifier = Modifier.size(52.dp))

                // Tab 4: Insights
                NavigationItem(
                    tab = FocusNavigationTab.INSIGHTS,
                    isSelected = currentTab == FocusNavigationTab.INSIGHTS,
                    onClick = { onTabSelected(FocusNavigationTab.INSIGHTS) }
                )

                // Tab 5: Settings
                NavigationItem(
                    tab = FocusNavigationTab.SETTINGS,
                    isSelected = currentTab == FocusNavigationTab.SETTINGS,
                    onClick = { onTabSelected(FocusNavigationTab.SETTINGS) }
                )
            }
        }

        // Center Floating Action Button (+)
        Box(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .offset(y = (-4).dp)
        ) {
            Surface(
                onClick = onCreateFocusClick,
                modifier = Modifier.size(56.dp),
                shape = CircleShape,
                color = PrimaryAccent,
                shadowElevation = 8.dp
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = "Create Focus Lock",
                        tint = Color.White,
                        modifier = Modifier.size(28.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun NavigationItem(
    tab: FocusNavigationTab,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    val interactionSource = remember { MutableInteractionSource() }
    val tint = if (isSelected) PrimaryAccent else TextSecondary

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
        modifier = Modifier
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                onClick = onClick
            )
            .padding(horizontal = 8.dp, vertical = 6.dp)
    ) {
        Icon(
            imageVector = tab.icon,
            contentDescription = tab.title,
            tint = tint,
            modifier = Modifier.size(24.dp)
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = tab.title,
            style = MaterialTheme.typography.labelSmall.copy(
                fontSize = 11.sp,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                color = tint
            )
        )
    }
}
