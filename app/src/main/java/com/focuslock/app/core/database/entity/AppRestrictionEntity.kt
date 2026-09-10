package com.focuslock.app.core.database.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import com.focuslock.app.engine.statemachine.RestrictionType

@Entity(
    tableName = "app_restrictions",
    foreignKeys = [
        ForeignKey(
            entity = LockSessionEntity::class,
            parentColumns = ["id"],
            childColumns = ["sessionId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index(value = ["sessionId"]), Index(value = ["packageName"])]
)
data class AppRestrictionEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val sessionId: String,
    val packageName: String,
    val appName: String,
    val restrictionType: RestrictionType,
    val isEnabled: Boolean = true
)
