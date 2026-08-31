package com.focuslock.app.data.repository

import android.content.Context
import com.focuslock.app.core.database.FocusLockDatabase
import com.focuslock.app.core.database.entity.AppRestrictionEntity
import com.focuslock.app.core.database.entity.LockSessionEntity
import com.focuslock.app.core.database.entity.SessionHistoryEntity
import com.focuslock.app.domain.model.AppRestriction
import com.focuslock.app.domain.model.LockSession
import com.focuslock.app.domain.repository.LockSessionRepository
import com.focuslock.app.engine.EnforcementEngine
import com.focuslock.app.engine.statemachine.LockStatus
import com.focuslock.app.service.foreground.FocusForegroundService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.withContext
import java.util.UUID

class LockSessionRepositoryImpl(
    private val context: Context,
    database: FocusLockDatabase = FocusLockDatabase.getInstance(context)
) : LockSessionRepository {

    private val sessionDao = database.lockSessionDao()
    private val restrictionDao = database.appRestrictionDao()
    private val historyDao = database.sessionHistoryDao()

    override fun getActiveSession(): Flow<LockSession?> {
        return sessionDao.getActiveSessionFlow().combine(
            restrictionDao.getRestrictionsForSessionFlow("")
        ) { sessionEntity, _ ->
            if (sessionEntity != null) {
                val restrictions = restrictionDao.getRestrictionsForSessionSync(sessionEntity.id)
                mapToDomain(sessionEntity, restrictions)
            } else {
                null
            }
        }.flowOn(Dispatchers.IO)
    }

    override suspend fun getActiveSessionSync(): LockSession? = withContext(Dispatchers.IO) {
        val entity = sessionDao.getActiveSessionSync() ?: return@withContext null
        val restrictions = restrictionDao.getRestrictionsForSessionSync(entity.id)
        mapToDomain(entity, restrictions)
    }

    override suspend fun createAndStartSession(
        title: String,
        durationMillis: Long,
        restrictions: List<AppRestriction>,
        isStrict: Boolean
    ): LockSession = withContext(Dispatchers.IO) {
        val sessionId = UUID.randomUUID().toString()
        val now = System.currentTimeMillis()
        val endsAt = now + durationMillis

        val sessionEntity = LockSessionEntity(
            id = sessionId,
            title = title,
            createdAt = now,
            startedAt = now,
            endsAt = endsAt,
            totalDurationMillis = durationMillis,
            status = LockStatus.ACTIVE,
            isStrict = isStrict
        )

        val restrictionEntities = restrictions.map { r ->
            AppRestrictionEntity(
                sessionId = sessionId,
                packageName = r.packageName,
                appName = r.appName,
                restrictionType = r.restrictionType,
                isEnabled = r.isEnabled
            )
        }

        // Persist to Room SQLite
        sessionDao.insertSession(sessionEntity)
        restrictionDao.insertRestrictions(restrictionEntities)

        val domainSession = mapToDomain(sessionEntity, restrictionEntities)

        // Update in-memory enforcement engine and start foreground service
        EnforcementEngine.setActiveSession(domainSession)
        FocusForegroundService.start(context)

        domainSession
    }

    override suspend fun completeSession(sessionId: String) = withContext(Dispatchers.IO) {
        val session = sessionDao.getSessionById(sessionId) ?: return@withContext
        val now = System.currentTimeMillis()
        val durationSecs = (now - session.startedAt) / 1000

        sessionDao.updateStatus(sessionId, LockStatus.COMPLETED)

        val history = SessionHistoryEntity(
            id = UUID.randomUUID().toString(),
            sessionId = sessionId,
            title = session.title,
            startedAt = session.startedAt,
            endedAt = now,
            durationSeconds = durationSecs,
            protectedAppsCount = restrictionDao.getRestrictionsForSessionSync(sessionId).size,
            isCompletedSuccessfully = true
        )
        historyDao.insertHistory(history)

        EnforcementEngine.setActiveSession(null)
        FocusForegroundService.stop(context)
    }

    override fun getAllSessions(): Flow<List<LockSession>> {
        return sessionDao.getAllSessionsFlow().combine(
            historyDao.getAllHistoryFlow()
        ) { sessions, _ ->
            sessions.map { s ->
                val restrictions = restrictionDao.getRestrictionsForSessionSync(s.id)
                mapToDomain(s, restrictions)
            }
        }.flowOn(Dispatchers.IO)
    }

    private fun mapToDomain(
        entity: LockSessionEntity,
        restrictions: List<AppRestrictionEntity>
    ): LockSession {
        return LockSession(
            id = entity.id,
            title = entity.title,
            createdAt = entity.createdAt,
            startedAt = entity.startedAt,
            endsAt = entity.endsAt,
            totalDurationMillis = entity.totalDurationMillis,
            status = entity.status,
            completedAt = entity.completedAt,
            isStrict = entity.isStrict,
            restrictions = restrictions.map {
                AppRestriction(
                    id = it.id,
                    sessionId = it.sessionId,
                    packageName = it.packageName,
                    appName = it.appName,
                    restrictionType = it.restrictionType,
                    isEnabled = it.isEnabled
                )
            }
        )
    }
}
