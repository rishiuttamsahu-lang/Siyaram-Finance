package com.focuslock.app.ui.feature.wizard

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

/**
 * In-flight state holder for the 5-step restriction creation wizard.
 */
class WizardSharedState {
    val selectedPackageNames = mutableStateListOf<String>("com.instagram.android", "com.android.chrome")
    val selectedRestrictions = mutableStateListOf<String>("BLOCK_APP", "BLOCK_ACCOUNT_SWITCH")
    var lockDurationDays by mutableIntStateOf(7)
    var isStrictModeEnabled by mutableStateOf(true)

    fun toggleAppSelection(packageName: String) {
        if (selectedPackageNames.contains(packageName)) {
            selectedPackageNames.remove(packageName)
        } else {
            selectedPackageNames.add(packageName)
        }
    }

    fun toggleRestriction(restrictionType: String) {
        if (selectedRestrictions.contains(restrictionType)) {
            selectedRestrictions.remove(restrictionType)
        } else {
            selectedRestrictions.add(restrictionType)
        }
    }

    fun reset() {
        selectedPackageNames.clear()
        selectedRestrictions.clear()
        lockDurationDays = 7
        isStrictModeEnabled = true
    }
}
