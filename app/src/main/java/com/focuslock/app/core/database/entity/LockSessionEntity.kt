package com.focuslock.app.core.database.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.focuslock.app.engine.statemachine.LockStatus

@Entity(tableName = "lock_sessions")
data class LockSessionEntity(
    @PrimaryKey val id: String,
    val title: String,
    val createdAt: Long,
    val startedAt: Long,
    val endsAt: Long,
    val totalDurationMillis: Long,
    val status: LockStatus,
    val completedAt: Long? = null,
    val isStrict: Boolean = true
)
