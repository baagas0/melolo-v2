/**
 * Scheduler Initialization Module
 * This module initializes the Rumble upload scheduler when imported
 */

import scheduler from './scheduler';

let initialized = false;

export function initializeScheduler() {
    if (initialized) {
        console.log('[Scheduler Init] Scheduler already initialized');
        return;
    }

    if (process.env.NODE_ENV === 'production') {
        console.log('[Scheduler Init] Production mode detected - starting scheduler automatically');
        scheduler.start();
    } else {
        console.log('[Scheduler Init] Development mode detected - scheduler not started automatically');
        console.log('[Scheduler Init] Use POST /api/scheduler/start to start the scheduler manually');
    }

    initialized = true;
}

// Auto-initialize in production
initializeScheduler();

export default scheduler;
