package com.focuslock.app

import android.app.Application
import android.util.Log

/**
 * FocusLock Application class.
 * Serves as the central entry point for application-level initialization.
 */
class FocusLockApp : Application() {

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "FocusLock Application initialized.")
    }

    companion object {
        const val TAG = "FocusLockApp"
    }
}
