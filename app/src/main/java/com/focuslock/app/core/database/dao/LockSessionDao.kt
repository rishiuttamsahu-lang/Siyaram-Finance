package com.focuslock.app.core.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.focuslock.app.core.database.entity.LockSessionEntity
import com.focuslock.app.engine.statemachine.LockStatus
import kotlinx.coroutines.flow.Flow

@Dao
interface LockSessionDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSession(session: LockSessionEntity)

    @Update
    suspend fun updateSession(session: LockSessionEntity)

    @Query("SELECT * FROM lock_sessions WHERE id = :sessionId LIMIT 1")
    suspend fun getSessionById(sessionId: String): LockSessionEntity?

    @Query("SELECT * FROM lock_sessions WHERE status = 'ACTIVE' LIMIT 1")
    fun getActiveSessionFlow(): Flow<LockSessionEntity?>

    @Query("SELECT * FROM lock_sessions WHERE status = 'ACTIVE' LIMIT 1")
    suspend fun getActiveSessionSync(): LockSessionEntity?

    @Query("UPDATE lock_sessions SET status = :newStatus WHERE id = :sessionId")
    suspend fun updateStatus(sessionId: String, newStatus: LockStatus)

    @Query("SELECT * FROM lock_sessions ORDER BY createdAt DESC")
    fun getAllSessionsFlow(): Flow<List<LockSessionEntity>>
}
