package com.focuslock.app.domain.repository

import com.focuslock.app.domain.model.AppRestriction
import com.focuslock.app.domain.model.LockSession
import com.focuslock.app.engine.statemachine.LockStatus
import kotlinx.coroutines.flow.Flow

interface LockSessionRepository {

    fun getActiveSession(): Flow<LockSession?>

    suspend fun getActiveSessionSync(): LockSession?

    suspend fun createAndStartSession(
        title: String,
        durationMillis: Long,
        restrictions: List<AppRestriction>,
        isStrict: Boolean = true
    ): LockSession

    suspend fun completeSession(sessionId: String)

    fun getAllSessions(): Flow<List<LockSession>>
}
