package com.focuslock.app.ui.feature.wizard

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.focuslock.app.data.repository.AppDiscoveryRepositoryImpl
import com.focuslock.app.domain.model.AppInfo
import com.focuslock.app.domain.repository.AppDiscoveryRepository
import com.focuslock.app.domain.usecase.GetInstalledAppsUseCase
import com.focuslock.app.domain.usecase.SearchAppsUseCase
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class SelectAppsUiState(
    val isLoading: Boolean = true,
    val searchQuery: String = "",
    val recommendedApps: List<AppInfo> = emptyList(),
    val allApps: List<AppInfo> = emptyList(),
    val isSearching: Boolean = false
)

/**
 * ViewModel managing installed apps querying and search filtering for Wizard Step 1.
 */
class SelectAppsViewModel(
    application: Application
) : AndroidViewModel(application) {

    private val repository: AppDiscoveryRepository = AppDiscoveryRepositoryImpl(application)
    private val getInstalledAppsUseCase = GetInstalledAppsUseCase(repository)
    private val searchAppsUseCase = SearchAppsUseCase(repository)

    private val _searchQuery = MutableStateFlow("")
    private val _installedApps = MutableStateFlow<List<AppInfo>>(emptyList())
    private val _isLoading = MutableStateFlow(true)

    val uiState: StateFlow<SelectAppsUiState> = combine(
        _isLoading,
        _searchQuery,
        _installedApps
    ) { isLoading, query, apps ->
        val filtered = if (query.isBlank()) {
            apps
        } else {
            apps.filter {
                it.appName.contains(query, ignoreCase = true) ||
                        it.packageName.contains(query, ignoreCase = true) ||
                        it.category.contains(query, ignoreCase = true)
            }
        }

        val recommended = filtered.filter { it.isRecommended }
        val others = filtered.filter { !it.isRecommended }

        SelectAppsUiState(
            isLoading = isLoading,
            searchQuery = query,
            recommendedApps = recommended,
            allApps = others,
            isSearching = query.isNotBlank()
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = SelectAppsUiState()
    )

    init {
        loadInstalledApps()
    }

    fun onSearchQueryChanged(query: String) {
        _searchQuery.value = query
    }

    private fun loadInstalledApps() {
        viewModelScope.launch {
            _isLoading.value = true
            getInstalledAppsUseCase().collect { apps ->
                // Fallback mock sample if running in preview/empty emulator with no user apps
                val finalApps = if (apps.isEmpty()) getSampleFallbackApps() else apps
                _installedApps.value = finalApps
                _isLoading.value = false
            }
        }
    }

    private fun getSampleFallbackApps(): List<AppInfo> {
        return listOf(
            AppInfo("com.instagram.android", "Instagram", "Social Media", isRecommended = true),
            AppInfo("com.android.chrome", "Chrome", "Web Browser", isRecommended = true),
            AppInfo("com.google.android.youtube", "YouTube", "Entertainment", isRecommended = true),
            AppInfo("com.twitter.android", "Twitter / X", "Social Media", isRecommended = true),
            AppInfo("com.whatsapp", "WhatsApp", "Messaging", isRecommended = true),
            AppInfo("com.facebook.katana", "Facebook", "Social Media", isRecommended = false),
            AppInfo("com.reddit.frontpage", "Reddit", "Social Media", isRecommended = false),
            AppInfo("org.telegram.messenger", "Telegram", "Messaging", isRecommended = false),
            AppInfo("com.netflix.mediaclient", "Netflix", "Entertainment", isRecommended = false),
            AppInfo("com.snapchat.android", "Snapchat", "Social Media", isRecommended = false)
        )
    }
}
