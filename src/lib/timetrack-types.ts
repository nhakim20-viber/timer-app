export type TimeBucket = {
  id: string;
  name: string;
  color: string;
  archivedAt: string | null;
  createdAt: string;
  presetTags: string[];
};

export type TimeLog = {
  id: string;
  bucketId: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  tags: string[];
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type ActiveTimer = {
  bucketId: string;
  startedAt: string;
  selectedTags: string[];
};

export type ReportWindow = "week" | "month" | "session";

export type TimeTrackState = {
  buckets: TimeBucket[];
  logs: TimeLog[];
  activeTimers: ActiveTimer[];
};