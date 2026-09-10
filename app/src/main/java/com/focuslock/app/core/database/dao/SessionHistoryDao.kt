package com.focuslock.app.core.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.focuslock.app.core.database.entity.SessionHistoryEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface SessionHistoryDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertHistory(history: SessionHistoryEntity)

    @Query("SELECT * FROM session_history ORDER BY endedAt DESC")
    fun getAllHistoryFlow(): Flow<List<SessionHistoryEntity>>

    @Query("SELECT SUM(durationSeconds) FROM session_history")
    fun getTotalTimeProtectedSeconds(): Flow<Long?>

    @Query("SELECT COUNT(*) FROM session_history")
    fun getTotalCompletedSessionsCount(): Flow<Int>
}
