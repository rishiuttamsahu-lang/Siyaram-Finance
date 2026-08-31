package com.focuslock.app.domain.usecase

import com.focuslock.app.domain.model.AppInfo
import com.focuslock.app.domain.repository.AppDiscoveryRepository
import kotlinx.coroutines.flow.Flow

/**
 * UseCase to retrieve and categorize all installed apps on the device.
 */
class GetInstalledAppsUseCase(
    private val repository: AppDiscoveryRepository
) {
    operator fun invoke(): Flow<List<AppInfo>> {
        return repository.getInstalledApps()
    }
}
