package com.focuslock.app.core.common

/**
 * Generic Result wrapper for domain operations and repository responses.
 */
sealed interface Result<out T> {
    data class Success<T>(val data: T) : Result<T>
    data class Error(val exception: Throwable, val message: String? = exception.message) : Result<Nothing>
    data object Loading : Result<Nothing>
}
