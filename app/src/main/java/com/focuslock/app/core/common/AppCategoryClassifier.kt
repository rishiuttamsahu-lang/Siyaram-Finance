package com.focuslock.app.core.common

import android.content.pm.ApplicationInfo
import android.os.Build

/**
 * Utility to classify Android packages into human-readable categories
 * and identify popular distraction apps.
 */
object AppCategoryClassifier {

    private val RECOMMENDED_PACKAGES = setOf(
        "com.instagram.android",
        "com.android.chrome",
        "com.google.android.youtube",
        "com.twitter.android",
        "com.zhiliaoapp.musically", // TikTok
        "com.facebook.katana",
        "com.snapchat.android",
        "com.reddit.frontpage",
        "com.netflix.mediaclient",
        "com.whatsapp",
        "org.telegram.messenger",
        "com.pinterest",
        "com.discord",
        "com.spotify.music"
    )

    fun isRecommendedApp(packageName: String): Boolean {
        return RECOMMENDED_PACKAGES.contains(packageName.lowercase())
    }

    fun getCategoryName(appInfo: ApplicationInfo): String {
        // 1. Android category check (API 26+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            when (appInfo.category) {
                ApplicationInfo.CATEGORY_SOCIAL -> return "Social Media"
                ApplicationInfo.CATEGORY_GAME -> return "Game"
                ApplicationInfo.CATEGORY_VIDEO -> return "Video & Streaming"
                ApplicationInfo.CATEGORY_AUDIO -> return "Music & Audio"
                ApplicationInfo.CATEGORY_IMAGE -> return "Photos & Visuals"
                ApplicationInfo.CATEGORY_PRODUCTIVITY -> return "Productivity"
                ApplicationInfo.CATEGORY_NEWS -> return "News & Reading"
                ApplicationInfo.CATEGORY_MAPS -> return "Navigation"
            }
        }

        // 2. Package-based fallback classification
        val pkg = appInfo.packageName.lowercase()
        return when {
            pkg.contains("instagram") || pkg.contains("facebook") || pkg.contains("twitter") ||
                    pkg.contains("snapchat") || pkg.contains("tiktok") || pkg.contains("reddit") ||
                    pkg.contains("threads") || pkg.contains("pinterest") -> "Social Media"

            pkg.contains("chrome") || pkg.contains("browser") || pkg.contains("firefox") ||
                    pkg.contains("opera") || pkg.contains("edge") -> "Web Browser"

            pkg.contains("youtube") || pkg.contains("netflix") || pkg.contains("disney") ||
                    pkg.contains("primevideo") || pkg.contains("twitch") || pkg.contains("hotstar") -> "Entertainment"

            pkg.contains("whatsapp") || pkg.contains("telegram") || pkg.contains("discord") ||
                    pkg.contains("messenger") || pkg.contains("signal") -> "Messaging"

            pkg.contains("spotify") || pkg.contains("music") || pkg.contains("sound") ||
                    pkg.contains("podcasts") -> "Music & Audio"

            pkg.contains("game") || pkg.contains("pubg") || pkg.contains("roblox") ||
                    pkg.contains("supercell") || pkg.contains("miniclip") -> "Game"

            pkg.contains("amazon") || pkg.contains("flipkart") || pkg.contains("shopping") ||
                    pkg.contains("ebay") || pkg.contains("myntra") -> "Shopping"

            else -> "Application"
        }
    }
}
