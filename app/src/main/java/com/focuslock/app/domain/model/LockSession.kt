package com.focuslock.app.domain.model

import com.focuslock.app.engine.statemachine.LockStatus
import java.util.UUID

/**
 * Domain model representing a Focus Lock session.
 */
data class LockSession(
    val id: String = UUID.randomUUID().toString(),
    val title: String,
    val createdAt: Long = System.currentTimeMillis(),
    val startedAt: Long,
    val endsAt: Long,
    val totalDurationMillis: Long,
    val status: LockStatus,
    val completedAt: Long? = null,
    val isStrict: Boolean = true,
    val restrictions: List<AppRestriction> = emptyList()
) {
    /**
     * Calculates remaining time in milliseconds using absolute timestamp.
     */
    val remainingMillis: Long
        get() = maxOf(0L, endsAt - System.currentTimeMillis())

    /**
     * Calculates completion percentage (0.0 to 1.0).
     */
    val progress: Float
        get() {
            if (totalDurationMillis <= 0L) return 1f
            val elapsed = System.currentTimeMillis() - startedAt
            return (elapsed.toFloat() / totalDurationMillis).coerceIn(0f, 1f)
        }

    val isExpired: Boolean
        get() = remainingMillis == 0L
}
