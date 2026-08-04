import { useCallback, useEffect, useRef } from "react";

// Single source of truth for the inactivity policy.
export const IDLE_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes
export const IDLE_WARNING_MS = 2 * 60 * 1000;  // warn 2 minutes before timeout (at 18 min)

const ACTIVITY_EVENTS = ["mousedown", "mousemove", "keydown", "wheel", "touchstart", "click"];

/**
 * Idle/inactivity timer. Timers live in refs (not state) so activity events
 * never trigger a re-render or re-run the effect — avoids render loops.
 *
 * Once the warning fires, ambient activity (mouse moving, etc.) is ignored;
 * only an explicit call to `stayActive()` (the "Stay signed in" button)
 * resets the clock. This matches the UX: the warning should not silently
 * dismiss itself just because the cursor twitched.
 */
export function useIdleTimeout({ enabled, onWarn, onTimeout }) {
  const warnTimerRef = useRef(null);
  const logoutTimerRef = useRef(null);
  const warningActiveRef = useRef(false);

  const onWarnRef = useRef(onWarn);
  const onTimeoutRef = useRef(onTimeout);
  onWarnRef.current = onWarn;
  onTimeoutRef.current = onTimeout;

  const clearTimers = useCallback(() => {
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    warnTimerRef.current = null;
    logoutTimerRef.current = null;
  }, []);

  const resetTimers = useCallback(() => {
    clearTimers();
    warningActiveRef.current = false;
    warnTimerRef.current = setTimeout(() => {
      warningActiveRef.current = true;
      onWarnRef.current?.();
    }, IDLE_TIMEOUT_MS - IDLE_WARNING_MS);
    logoutTimerRef.current = setTimeout(() => {
      onTimeoutRef.current?.();
    }, IDLE_TIMEOUT_MS);
  }, [clearTimers]);

  // Explicit user action ("Stay signed in") — always resets, even mid-warning.
  const stayActive = useCallback(() => {
    resetTimers();
  }, [resetTimers]);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      return undefined;
    }

    resetTimers();

    const handleActivity = () => {
      if (warningActiveRef.current) return; // warning shown — only "Stay signed in" resets
      resetTimers();
    };

    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }));
    return () => {
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, handleActivity));
      clearTimers();
    };
  }, [enabled, resetTimers, clearTimers]);

  return { stayActive };
}
