import * as React from "react";

import { initialTimeTrackState, bucketPalette } from "@/lib/timetrack-data";
import type { ActiveTimer, TimeBucket, TimeLog, TimeTrackState } from "@/lib/timetrack-types";

const STORAGE_KEY = "timetrack-mvp-state";

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function loadState(): TimeTrackState {
  if (typeof window === "undefined") {
    return initialTimeTrackState;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return initialTimeTrackState;
    }

    const parsed = JSON.parse(raw) as TimeTrackState;
    // Migrate older persisted state that lacks new fields.
    return {
      ...parsed,
      buckets: (parsed.buckets ?? []).map((b) => ({ ...b, presetTags: b.presetTags ?? [] })),
      activeTimers: (parsed.activeTimers ?? []).map((t) => ({ ...t, selectedTags: t.selectedTags ?? [] })),
    };
  } catch {
    return initialTimeTrackState;
  }
}

function saveState(state: TimeTrackState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function useTimeTrack() {
  const [state, setState] = React.useState<TimeTrackState>(initialTimeTrackState);
  const [now, setNow] = React.useState(0);
  const [hasMounted, setHasMounted] = React.useState(false);

  React.useEffect(() => {
    setHasMounted(true);
    setState(loadState());
    setNow(Date.now());

    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  React.useEffect(() => {
    if (!hasMounted) return;
    saveState(state);
  }, [hasMounted, state]);

  const activeBucketIds = React.useMemo(
    () => new Set(state.activeTimers.map((timer) => timer.bucketId)),
    [state.activeTimers],
  );

  const visibleBuckets = React.useMemo(
    () => state.buckets.filter((bucket) => !bucket.archivedAt),
    [state.buckets],
  );

  const tagSuggestions = React.useMemo(
    () => Array.from(new Set(state.logs.flatMap((log) => log.tags))).sort(),
    [state.logs],
  );

  const toggleTimer = React.useCallback((bucketId: string) => {
    setState((current) => {
      const active = current.activeTimers.find((timer) => timer.bucketId === bucketId);
      const timestamp = new Date().toISOString();

      if (active) {
        const started = new Date(active.startedAt).getTime();
        const ended = new Date(timestamp).getTime();

        const nextLog: TimeLog = {
          id: makeId("log"),
          bucketId,
          startTime: active.startedAt,
          endTime: timestamp,
          durationSeconds: Math.max(60, Math.round((ended - started) / 1000)),
          tags: active.selectedTags ?? [],
          note: "",
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        return {
          ...current,
          activeTimers: current.activeTimers.filter((timer) => timer.bucketId !== bucketId),
          logs: [nextLog, ...current.logs],
        };
      }

      const nextTimer: ActiveTimer = { bucketId, startedAt: timestamp, selectedTags: [] };
      return { ...current, activeTimers: [nextTimer, ...current.activeTimers] };
    });
  }, []);

  const createBucket = React.useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    setState((current) => {
      const color = bucketPalette[current.buckets.length % bucketPalette.length];
      const nextBucket: TimeBucket = {
        id: makeId("bucket"),
        name: trimmed,
        color,
        archivedAt: null,
        createdAt: new Date().toISOString(),
      };

      return { ...current, buckets: [nextBucket, ...current.buckets] };
    });
  }, []);

  const archiveBucket = React.useCallback((bucketId: string) => {
    setState((current) => ({
      ...current,
      activeTimers: current.activeTimers.filter((timer) => timer.bucketId !== bucketId),
      buckets: current.buckets.map((bucket) =>
        bucket.id === bucketId ? { ...bucket, archivedAt: new Date().toISOString() } : bucket,
      ),
    }));
  }, []);

  const addManualLog = React.useCallback((input: {
    bucketId: string;
    startTime: string;
    endTime: string;
    tags: string[];
    note: string;
  }) => {
    const start = new Date(input.startTime).getTime();
    const end = new Date(input.endTime).getTime();
    if (!input.bucketId || Number.isNaN(start) || Number.isNaN(end) || end <= start) return;

    const timestamp = new Date().toISOString();
    const nextLog: TimeLog = {
      id: makeId("log"),
      bucketId: input.bucketId,
      startTime: new Date(start).toISOString(),
      endTime: new Date(end).toISOString(),
      durationSeconds: Math.round((end - start) / 1000),
      tags: input.tags,
      note: input.note.trim(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    setState((current) => ({ ...current, logs: [nextLog, ...current.logs] }));
  }, []);

  const updateLog = React.useCallback((logId: string, updates: Partial<TimeLog>) => {
    setState((current) => ({
      ...current,
      logs: current.logs.map((log) => {
        if (log.id !== logId) return log;

        const startTime = updates.startTime ?? log.startTime;
        const endTime = updates.endTime ?? log.endTime;
        const durationSeconds = Math.max(
          60,
          Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000),
        );

        return {
          ...log,
          ...updates,
          startTime,
          endTime,
          durationSeconds,
          updatedAt: new Date().toISOString(),
        };
      }),
    }));
  }, []);

  const bucketMap = React.useMemo(
    () => Object.fromEntries(state.buckets.map((bucket) => [bucket.id, bucket])),
    [state.buckets],
  );

  const getElapsedSeconds = React.useCallback(
    (bucketId: string) => {
      if (!hasMounted) return 0;

      const active = state.activeTimers.find((timer) => timer.bucketId === bucketId);
      if (!active) return 0;
      return Math.max(0, Math.round((now - new Date(active.startedAt).getTime()) / 1000));
    },
    [hasMounted, now, state.activeTimers],
  );

  return {
    state,
    visibleBuckets,
    bucketMap,
    activeBucketIds,
    tagSuggestions,
    now,
    hasMounted,
    toggleTimer,
    createBucket,
    archiveBucket,
    addManualLog,
    updateLog,
    getElapsedSeconds,
  };
}