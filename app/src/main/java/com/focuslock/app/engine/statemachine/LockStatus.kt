package com.focuslock.app.engine.statemachine

/**
 * State lifecycle for a Focus Lock session.
 */
enum class LockStatus {
    DRAFT,
    READY,
    ACTIVE,
    COMPLETED
}
