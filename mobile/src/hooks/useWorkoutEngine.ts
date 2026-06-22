import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { WorkoutInterval } from '../types/workout';

export interface EngineState {
  currentIntervalIndex: number;
  timeRemaining: number;       // fractional seconds, for smooth display
  isRunning: boolean;
  isPaused: boolean;
  isComplete: boolean;
  elapsedTotal: number;        // total seconds elapsed in workout
  currentRound: number;
  totalRounds: number;
  totalDurationSec: number;
}

export interface EngineCallbacks {
  onIntervalChange?: (
    current: WorkoutInterval,
    next: WorkoutInterval | null,
    index: number,
  ) => void;
  onCountdown?: (n: number) => void;   // fires for 3, 2, 1 before interval ends
  onHalfway?: () => void;              // fires once at 50% of total workout duration
  onComplete?: () => void;
}

const TICK_MS = 100;

export function useWorkoutEngine(
  intervals: WorkoutInterval[],
  callbacks: EngineCallbacks,
) {
  const totalDurationSec = useMemo(
    () => intervals.reduce((sum, i) => sum + i.durationSec, 0),
    [intervals],
  );
  const totalRounds = useMemo(
    () => (intervals.length > 0 ? Math.max(...intervals.map((i) => i.roundGroup)) : 1),
    [intervals],
  );

  // ── Refs that the tick closure reads (no stale-closure issues) ──────────────
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Absolute timestamp (ms) when the current segment became active
  const segStartRef = useRef(0);
  // Effective duration of current segment (ms) — grows with +30s
  const segDurMsRef = useRef(0);
  // Running index into intervals[]
  const indexRef = useRef(0);
  // Total elapsed (seconds) at the moment the current segment started
  const elapsedAtSegStartRef = useRef(0);
  // Mirror of timeRemaining state — read in pause/resume without closure issues
  const timeRemainingRef = useRef(0);

  const halfwayFiredRef = useRef(false);
  // Which countdown ticks (3,2,1) have already fired for this segment
  const countdownFiredRef = useRef(new Set<number>());

  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;
  const intervalsRef = useRef(intervals);
  intervalsRef.current = intervals;

  // ── UI state ────────────────────────────────────────────────────────────────
  const [state, setState] = useState<EngineState>({
    currentIntervalIndex: 0,
    timeRemaining: intervals[0]?.durationSec ?? 0,
    isRunning: false,
    isPaused: false,
    isComplete: false,
    elapsedTotal: 0,
    currentRound: intervals[0]?.roundGroup ?? 1,
    totalRounds,
    totalDurationSec,
  });

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const clearTicker = () => {
    if (tickerRef.current !== null) {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
  };

  // Transition to a new interval (or complete the workout)
  const advanceToInterval = useCallback(
    (newIndex: number, elapsedTotal: number) => {
      const list = intervalsRef.current;

      if (newIndex >= list.length) {
        clearTicker();
        setState((prev) => ({
          ...prev,
          isRunning: false,
          isComplete: true,
          timeRemaining: 0,
          elapsedTotal,
        }));
        callbacksRef.current.onComplete?.();
        return;
      }

      const interval = list[newIndex];
      const next = list[newIndex + 1] ?? null;

      indexRef.current = newIndex;
      segDurMsRef.current = interval.durationSec * 1000;
      segStartRef.current = Date.now();
      elapsedAtSegStartRef.current = elapsedTotal;
      countdownFiredRef.current = new Set();

      callbacksRef.current.onIntervalChange?.(interval, next, newIndex);

      setState((prev) => ({
        ...prev,
        currentIntervalIndex: newIndex,
        timeRemaining: interval.durationSec,
        currentRound: interval.roundGroup,
        elapsedTotal,
      }));
    },
    [],
  );

  // ── Tick ────────────────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    const list = intervalsRef.current;
    const index = indexRef.current;
    const interval = list[index];
    if (!interval) return;

    const elapsedInSegMs = Date.now() - segStartRef.current;
    const timeRemaining = Math.max(0, (segDurMsRef.current - elapsedInSegMs) / 1000);
    const elapsedTotal = elapsedAtSegStartRef.current + elapsedInSegMs / 1000;

    timeRemainingRef.current = timeRemaining;

    // Halfway cue — fires once per workout
    if (!halfwayFiredRef.current && elapsedTotal >= totalDurationSec / 2) {
      halfwayFiredRef.current = true;
      callbacksRef.current.onHalfway?.();
    }

    // 3-2-1 countdown before interval ends
    const ceilRemaining = Math.ceil(timeRemaining);
    if (
      ceilRemaining <= 3 &&
      ceilRemaining >= 1 &&
      !countdownFiredRef.current.has(ceilRemaining)
    ) {
      countdownFiredRef.current.add(ceilRemaining);
      callbacksRef.current.onCountdown?.(ceilRemaining);
    }

    setState((prev) => ({ ...prev, timeRemaining, elapsedTotal }));

    if (timeRemaining <= 0) {
      advanceToInterval(index + 1, elapsedTotal);
    }
  }, [advanceToInterval, totalDurationSec]);

  const startTicker = useCallback(() => {
    clearTicker();
    tickerRef.current = setInterval(tick, TICK_MS);
  }, [tick]);

  // ── Public controls ─────────────────────────────────────────────────────────
  const start = useCallback(() => {
    if (intervals.length === 0) return;

    const first = intervals[0];
    indexRef.current = 0;
    segDurMsRef.current = first.durationSec * 1000;
    segStartRef.current = Date.now();
    elapsedAtSegStartRef.current = 0;
    halfwayFiredRef.current = false;
    countdownFiredRef.current = new Set();

    callbacksRef.current.onIntervalChange?.(first, intervals[1] ?? null, 0);

    setState({
      currentIntervalIndex: 0,
      timeRemaining: first.durationSec,
      isRunning: true,
      isPaused: false,
      isComplete: false,
      elapsedTotal: 0,
      currentRound: first.roundGroup,
      totalRounds,
      totalDurationSec,
    });

    startTicker();
  }, [intervals, totalRounds, totalDurationSec, startTicker]);

  const pause = useCallback(() => {
    clearTicker();
    setState((prev) => ({ ...prev, isRunning: false, isPaused: true }));
  }, []);

  const resume = useCallback(() => {
    // Reconstruct segStartRef so remaining time is preserved exactly
    const remaining = timeRemainingRef.current;
    segStartRef.current = Date.now() - (segDurMsRef.current - remaining * 1000);
    setState((prev) => ({ ...prev, isRunning: true, isPaused: false }));
    startTicker();
  }, [startTicker]);

  const skipToNext = useCallback(() => {
    const elapsedInSegMs = Date.now() - segStartRef.current;
    const elapsedTotal = elapsedAtSegStartRef.current + elapsedInSegMs / 1000;
    advanceToInterval(indexRef.current + 1, elapsedTotal);
    if (tickerRef.current !== null) startTicker();
  }, [advanceToInterval, startTicker]);

  const addRestTime = useCallback((seconds: number) => {
    segDurMsRef.current += seconds * 1000;
    setState((prev) => ({ ...prev, timeRemaining: prev.timeRemaining + seconds }));
  }, []);

  const end = useCallback(() => {
    clearTicker();
    const elapsedTotal =
      elapsedAtSegStartRef.current + (Date.now() - segStartRef.current) / 1000;
    setState((prev) => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      isComplete: true,
      elapsedTotal,
    }));
    callbacksRef.current.onComplete?.();
  }, []);

  // Cleanup on unmount
  useEffect(() => () => clearTicker(), []);

  return { state, controls: { start, pause, resume, skipToNext, addRestTime, end } };
}
