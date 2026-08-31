package com.focuslock.app.core.common

import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers

/**
 * Standard Coroutine Dispatcher provider for clean testing and injection.
 */
data class AppDispatchers(
    val main: CoroutineDispatcher = Dispatchers.Main,
    val io: CoroutineDispatcher = Dispatchers.IO,
    val default: CoroutineDispatcher = Dispatchers.Default
)
