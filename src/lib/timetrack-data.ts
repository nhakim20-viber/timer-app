import type { TimeBucket, TimeLog, TimeTrackState } from "@/lib/timetrack-types";

const now = new Date("2026-04-24T12:00:00.000Z");

function isoAtOffset(hoursAgo: number) {
  return new Date(now.getTime() - hoursAgo * 60 * 60 * 1000).toISOString();
}

export const bucketPalette = ["rust", "sage", "ink", "clay", "ocean", "amber"] as const;

export const seedBuckets: TimeBucket[] = [
  {
    id: "bucket-commute",
    name: "Commuting",
    color: "rust",
    archivedAt: null,
    createdAt: isoAtOffset(240),
    presetTags: ["#train", "#office"],
  },
  {
    id: "bucket-podcasts",
    name: "Podcasts",
    color: "ink",
    archivedAt: null,
    createdAt: isoAtOffset(230),
    presetTags: ["#basketball", "#analysis"],
  },
  {
    id: "bucket-exercise",
    name: "Exercise",
    color: "sage",
    archivedAt: null,
    createdAt: isoAtOffset(220),
    presetTags: ["#strength"],
  },
  {
    id: "bucket-cooking",
    name: "Cooking",
    color: "amber",
    archivedAt: null,
    createdAt: isoAtOffset(210),
    presetTags: ["#dinner"],
  },
];

export const seedLogs: TimeLog[] = [
  {
    id: "log-1",
    bucketId: "bucket-commute",
    startTime: isoAtOffset(34),
    endTime: isoAtOffset(33.3),
    durationSeconds: 42 * 60,
    tags: ["#train", "#office"],
    note: "Morning ride downtown.",
    createdAt: isoAtOffset(33),
    updatedAt: isoAtOffset(33),
  },
  {
    id: "log-2",
    bucketId: "bucket-podcasts",
    startTime: isoAtOffset(34),
    endTime: isoAtOffset(33.25),
    durationSeconds: 45 * 60,
    tags: ["#basketball"],
    note: "Post-game recap episode.",
    createdAt: isoAtOffset(33),
    updatedAt: isoAtOffset(33),
  },
  {
    id: "log-3",
    bucketId: "bucket-exercise",
    startTime: isoAtOffset(28),
    endTime: isoAtOffset(27.15),
    durationSeconds: 51 * 60,
    tags: ["#strength"],
    note: "Upper body day.",
    createdAt: isoAtOffset(27),
    updatedAt: isoAtOffset(27),
  },
  {
    id: "log-4",
    bucketId: "bucket-cooking",
    startTime: isoAtOffset(6.4),
    endTime: isoAtOffset(5.6),
    durationSeconds: 48 * 60,
    tags: ["#dinner"],
    note: "Weeknight pasta.",
    createdAt: isoAtOffset(5),
    updatedAt: isoAtOffset(5),
  },
  {
    id: "log-5",
    bucketId: "bucket-podcasts",
    startTime: isoAtOffset(5.8),
    endTime: isoAtOffset(5.1),
    durationSeconds: 42 * 60,
    tags: ["#basketball", "#analysis"],
    note: "Draft deep-dive.",
    createdAt: isoAtOffset(5),
    updatedAt: isoAtOffset(5),
  },
];

export const initialTimeTrackState: TimeTrackState = {
  buckets: seedBuckets,
  logs: seedLogs,
  activeTimers: [{ bucketId: "bucket-commute", startedAt: isoAtOffset(0.5) }],
};