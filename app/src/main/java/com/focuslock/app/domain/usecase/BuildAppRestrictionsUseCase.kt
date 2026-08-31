package com.focuslock.app.domain.usecase

import com.focuslock.app.domain.model.AppRestriction
import com.focuslock.app.engine.statemachine.RestrictionType

/**
 * UseCase to generate and validate domain AppRestriction models from user wizard selections.
 */
class BuildAppRestrictionsUseCase {

    operator fun invoke(
        sessionId: String,
        selectedPackagesWithNames: Map<String, String>,
        selectedRuleTypes: Set<RestrictionType>
    ): List<AppRestriction> {
        val result = mutableListOf<AppRestriction>()

        for ((pkg, name) in selectedPackagesWithNames) {
            val pkgLower = pkg.lowercase()

            for (rule in selectedRuleTypes) {
                // Apply app-specific applicability
                val isApplicable = when (rule) {
                    RestrictionType.BLOCK_APP -> true
                    RestrictionType.BLOCK_ACCOUNT_SWITCH -> pkgLower.contains("instagram") || pkgLower.contains("twitter") || pkgLower.contains("facebook")
                    RestrictionType.BLOCK_INCOGNITO -> pkgLower.contains("chrome") || pkgLower.contains("browser") || pkgLower.contains("firefox")
                    RestrictionType.BLOCK_REELS_SHORT_VIDEO -> pkgLower.contains("instagram") || pkgLower.contains("youtube") || pkgLower.contains("tiktok")
                    RestrictionType.BLOCK_NOTIFICATIONS -> true
                    RestrictionType.CUSTOM_ACTION -> false
                }

                if (isApplicable) {
                    result.add(
                        AppRestriction(
                            sessionId = sessionId,
                            packageName = pkg,
                            appName = name,
                            restrictionType = rule,
                            isEnabled = true
                        )
                    )
                }
            }
        }

        return result
    }
}
