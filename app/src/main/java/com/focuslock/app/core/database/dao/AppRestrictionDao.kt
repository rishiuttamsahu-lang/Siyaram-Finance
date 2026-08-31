package com.focuslock.app.core.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.focuslock.app.core.database.entity.AppRestrictionEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface AppRestrictionDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertRestrictions(restrictions: List<AppRestrictionEntity>)

    @Query("SELECT * FROM app_restrictions WHERE sessionId = :sessionId")
    fun getRestrictionsForSessionFlow(sessionId: String): Flow<List<AppRestrictionEntity>>

    @Query("SELECT * FROM app_restrictions WHERE sessionId = :sessionId")
    suspend fun getRestrictionsForSessionSync(sessionId: String): List<AppRestrictionEntity>

    @Query("DELETE FROM app_restrictions WHERE sessionId = :sessionId")
    suspend fun deleteRestrictionsForSession(sessionId: String)
}
