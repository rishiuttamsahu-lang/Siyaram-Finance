package com.focuslock.app.domain.usecase

import com.focuslock.app.domain.model.AppInfo
import com.focuslock.app.domain.repository.AppDiscoveryRepository
import kotlinx.coroutines.flow.Flow

/**
 * UseCase to filter apps by name, package or category.
 */
class SearchAppsUseCase(
    private val repository: AppDiscoveryRepository
) {
    operator fun invoke(query: String): Flow<List<AppInfo>> {
        return repository.searchApps(query)
    }
}
