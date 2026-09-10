package com.focuslock.app.core.database

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.focuslock.app.core.database.converter.FocusLockTypeConverters
import com.focuslock.app.core.database.dao.AppRestrictionDao
import com.focuslock.app.core.database.dao.LockSessionDao
import com.focuslock.app.core.database.dao.SessionHistoryDao
import com.focuslock.app.core.database.entity.AppRestrictionEntity
import com.focuslock.app.core.database.entity.LockSessionEntity
import com.focuslock.app.core.database.entity.SessionHistoryEntity

@Database(
    entities = [
        LockSessionEntity::class,
        AppRestrictionEntity::class,
        SessionHistoryEntity::class
    ],
    version = 1,
    exportSchema = false
)
@TypeConverters(FocusLockTypeConverters::class)
abstract class FocusLockDatabase : RoomDatabase() {

    abstract fun lockSessionDao(): LockSessionDao
    abstract fun appRestrictionDao(): AppRestrictionDao
    abstract fun sessionHistoryDao(): SessionHistoryDao

    companion object {
        private const val DB_NAME = "focuslock_database.db"

        @Volatile
        private var INSTANCE: FocusLockDatabase? = null

        fun getInstance(context: Context): FocusLockDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    FocusLockDatabase::class.java,
                    DB_NAME
                )
                    .fallbackToDestructiveMigration()
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
