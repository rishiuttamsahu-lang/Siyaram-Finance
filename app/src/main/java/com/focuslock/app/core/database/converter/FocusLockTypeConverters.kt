package com.focuslock.app.core.database.converter

import androidx.room.TypeConverter
import com.focuslock.app.engine.statemachine.LockStatus
import com.focuslock.app.engine.statemachine.RestrictionType

class FocusLockTypeConverters {

    @TypeConverter
    fun fromLockStatus(status: LockStatus): String = status.name

    @TypeConverter
    fun toLockStatus(value: String): LockStatus = try {
        LockStatus.valueOf(value)
    } catch (e: Exception) {
        LockStatus.DRAFT
    }

    @TypeConverter
    fun fromRestrictionType(type: RestrictionType): String = type.name

    @TypeConverter
    fun toRestrictionType(value: String): RestrictionType = try {
        RestrictionType.valueOf(value)
    } catch (e: Exception) {
        RestrictionType.BLOCK_APP
    }
}
