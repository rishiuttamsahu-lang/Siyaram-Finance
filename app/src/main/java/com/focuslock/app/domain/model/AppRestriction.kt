package com.focuslock.app.domain.model

import com.focuslock.app.engine.statemachine.RestrictionType

/**
 * Domain model for a specific app restriction setting.
 */
data class AppRestriction(
    val id: Long = 0,
    val sessionId: String,
    val packageName: String,
    val appName: String,
    val restrictionType: RestrictionType,
    val isEnabled: Boolean = true
)
