package com.focuslock.app.data.repository

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
import android.os.Build
import com.focuslock.app.core.common.AppCategoryClassifier
import com.focuslock.app.domain.model.AppInfo
import com.focuslock.app.domain.repository.AppDiscoveryRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.withContext

/**
 * Implementation of AppDiscoveryRepository querying the Android PackageManager.
 */
class AppDiscoveryRepositoryImpl(
    private val context: Context
) : AppDiscoveryRepository {

    private val packageManager: PackageManager = context.packageManager

    override fun getInstalledApps(): Flow<List<AppInfo>> = flow {
        val apps = fetchLaunchableApps()
        emit(apps)
    }.flowOn(Dispatchers.IO)

    override fun getRecommendedApps(): Flow<List<AppInfo>> = flow {
        val apps = fetchLaunchableApps().filter { it.isRecommended }
        emit(apps)
    }.flowOn(Dispatchers.IO)

    override fun searchApps(query: String): Flow<List<AppInfo>> = flow {
        val allApps = fetchLaunchableApps()
        if (query.isBlank()) {
            emit(allApps)
        } else {
            val filtered = allApps.filter {
                it.appName.contains(query, ignoreCase = true) ||
                        it.packageName.contains(query, ignoreCase = true) ||
                        it.category.contains(query, ignoreCase = true)
            }
            emit(filtered)
        }
    }.flowOn(Dispatchers.IO)

    private suspend fun fetchLaunchableApps(): List<AppInfo> = withContext(Dispatchers.IO) {
        val mainIntent = Intent(Intent.ACTION_MAIN, null).apply {
            addCategory(Intent.CATEGORY_LAUNCHER)
        }

        val resolveInfos: List<ResolveInfo> = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            packageManager.queryIntentActivities(
                mainIntent,
                PackageManager.ResolveInfoFlags.of(PackageManager.MATCH_ALL.toLong())
            )
        } else {
            @Suppress("DEPRECATION")
            packageManager.queryIntentActivities(mainIntent, 0)
        }

        val appList = mutableListOf<AppInfo>()
        val seenPackages = mutableSetOf<String>()

        for (resolveInfo in resolveInfos) {
            val activityInfo = resolveInfo.activityInfo ?: continue
            val packageName = activityInfo.packageName

            // Skip self and already added packages
            if (packageName == context.packageName || seenPackages.contains(packageName)) {
                continue
            }
            seenPackages.add(packageName)

            val appName = resolveInfo.loadLabel(packageManager)?.toString() ?: activityInfo.name
            val icon = resolveInfo.loadIcon(packageManager)
            val isRecommended = AppCategoryClassifier.isRecommendedApp(packageName)
            val category = AppCategoryClassifier.getCategoryName(activityInfo.applicationInfo)

            appList.add(
                AppInfo(
                    packageName = packageName,
                    appName = appName,
                    category = category,
                    isRecommended = isRecommended,
                    icon = icon
                )
            )
        }

        // Sort: Recommended first, then alphabetically by app name
        appList.sortedWith(
            compareByDescending<AppInfo> { it.isRecommended }
                .thenBy { it.appName.lowercase() }
        )
    }
}
