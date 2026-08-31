package com.focuslock.app.core.designsystem.component

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.GraphicEq
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.focuslock.app.core.designsystem.theme.PrimaryAccent
import com.focuslock.app.core.designsystem.theme.SurfaceWhite
import com.focuslock.app.core.designsystem.theme.TextPrimary
import com.focuslock.app.core.designsystem.theme.TextSecondary

/**
 * Top App Header Bar for Screens and Wizard.
 */
@Composable
fun FocusTopHeader(
    title: String,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    onBackClick: (() -> Unit)? = null,
    onNotificationClick: (() -> Unit)? = null,
    isCentered: Boolean = false
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 14.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (onBackClick != null) {
            FocusRoundedIconButton(
                icon = Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = "Back",
                onClick = onBackClick
            )
        } else {
            Column {
                Text(
                    text = title,
                    style = MaterialTheme.typography.displayLarge.copy(
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 28.sp,
                        color = TextPrimary
                    )
                )
                if (subtitle != null) {
                    Text(
                        text = subtitle,
                        style = MaterialTheme.typography.bodyMedium.copy(
                            color = TextSecondary,
                            fontSize = 14.sp
                        )
                    )
                }
            }
        }

        if (isCentered && onBackClick != null) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleLarge.copy(
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    color = TextPrimary
                )
            )
        }

        if (onNotificationClick != null) {
            FocusRoundedIconButton(
                icon = Icons.Default.Notifications,
                contentDescription = "Notifications",
                onClick = onNotificationClick
            )
        } else if (onBackClick != null) {
            // Balance layout for centered title
            Spacer(modifier = Modifier.size(44.dp))
        }
    }
}

/**
 * Groove Tunes Focus Audio Banner (from Home.png).
 */
@Composable
fun FocusGrooveTunesBar(
    modifier: Modifier = Modifier,
    trackTitle: String = "Groove Tunes — Focus beats playlist playing",
    isPlaying: Boolean = true,
    onClick: (() -> Unit)? = null
) {
    FocusCard(
        modifier = modifier.fillMaxWidth(),
        cornerRadius = 14.dp,
        backgroundColor = SurfaceWhite,
        onClick = onClick
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                modifier = Modifier
                    .size(32.dp)
                    .clip(RoundedCornerShape(8.dp)),
                color = PrimaryAccent.copy(alpha = 0.12f)
            ) {
                Icon(
                    imageVector = Icons.Default.MusicNote,
                    contentDescription = null,
                    tint = PrimaryAccent,
                    modifier = Modifier
                        .padding(6.dp)
                        .size(18.dp)
                )
            }
            Spacer(modifier = Modifier.width(10.dp))
            Text(
                text = trackTitle,
                style = MaterialTheme.typography.bodyMedium.copy(
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                    color = TextPrimary
                ),
                maxLines = 1,
                modifier = Modifier.weight(1f)
            )
            if (isPlaying) {
                Icon(
                    imageVector = Icons.Default.GraphicEq,
                    contentDescription = "Playing",
                    tint = PrimaryAccent,
                    modifier = Modifier.size(18.dp)
                )
            }
        }
    }
}
