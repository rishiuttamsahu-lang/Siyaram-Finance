package com.focuslock.app.core.database.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "session_history")
data class SessionHistoryEntity(
    @PrimaryKey val id: String,
    val sessionId: String,
    val title: String,
    val startedAt: Long,
    val endedAt: Long,
    val durationSeconds: Long,
    val protectedAppsCount: Int,
    val distractionsBlockedCount: Int = 0,
    val isCompletedSuccessfully: Boolean = true
)
