package com.focuslock.app.domain.repository

import com.focuslock.app.domain.model.AppInfo
import kotlinx.coroutines.flow.Flow

/**
 * Repository interface for discovering and querying installed applications.
 */
interface AppDiscoveryRepository {
    /**
     * Retrieves all user-launchable applications installed on the device.
     */
    fun getInstalledApps(): Flow<List<AppInfo>>

    /**
     * Retrieves high-distraction recommended applications for quick selection.
     */
    fun getRecommendedApps(): Flow<List<AppInfo>>

    /**
     * Searches installed applications matching the given query string.
     */
    fun searchApps(query: String): Flow<List<AppInfo>>
}
