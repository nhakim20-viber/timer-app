import * as React from "react";
import {
  CalendarDays,
  PauseCircle,
  PlayCircle,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTimeTrack } from "@/hooks/use-timetrack";
import type { ReportWindow, TimeBucket, TimeLog } from "@/lib/timetrack-types";

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m ${seconds}s`;
}

function formatDurationCompact(totalSeconds: number) {
  return `${(totalSeconds / 3600).toFixed(totalSeconds >= 3600 ? 1 : 2)}h`;
}

function startOfDay(value: string) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function toLocalDateTimeValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function formatClockTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(new Date(value));
}

function bucketToneClass(color: string) {
  return `bucket-tone-${color}`;
}

function BucketCard({
  bucket,
  isActive,
  elapsedSeconds,
  onToggle,
  onArchive,
}: {
  bucket: TimeBucket;
  isActive: boolean;
  elapsedSeconds: number;
  onToggle: () => void;
  onArchive: () => void;
}) {
  return (
    <div className={`bucket-tile-wrap ${bucketToneClass(bucket.color)} ${isActive ? "is-active" : ""}`}>
      <button
        type="button"
        onClick={onToggle}
        className="bucket-tile"
        aria-pressed={isActive}
        aria-label={`${isActive ? "Stop" : "Start"} ${bucket.name} timer`}
      >
        <span className="bucket-tile-icon" aria-hidden="true">
          {isActive ? <PauseCircle /> : <PlayCircle />}
        </span>
        <span className="bucket-tile-name">{bucket.name}</span>
        <span className="bucket-tile-time">{isActive ? formatDuration(elapsedSeconds) : "Tap to start"}</span>
        {isActive ? <span className="bucket-tile-status">Running · tap to stop</span> : null}
      </button>
      <button
        type="button"
        className="bucket-tile-archive"
        onClick={onArchive}
        aria-label={`Archive ${bucket.name}`}
      >
        <Trash2 />
      </button>
    </div>
  );
}

function StatsStrip({ logs, buckets, activeCount }: { logs: TimeLog[]; buckets: TimeBucket[]; activeCount: number }) {
  const weeklySeconds = logs
    .filter((log) => Date.now() - new Date(log.endTime).getTime() <= 7 * 24 * 60 * 60 * 1000)
    .reduce((sum, log) => sum + log.durationSeconds, 0);

  const monthlySeconds = logs
    .filter((log) => Date.now() - new Date(log.endTime).getTime() <= 30 * 24 * 60 * 60 * 1000)
    .reduce((sum, log) => sum + log.durationSeconds, 0);

  const stats = [
    { label: "Active timers", value: `${activeCount}`, meta: "running now" },
    { label: "Weekly total", value: formatDurationCompact(weeklySeconds), meta: "last 7 days" },
    { label: "Monthly total", value: formatDurationCompact(monthlySeconds), meta: "last 30 days" },
    { label: "Buckets", value: `${buckets.length}`, meta: "live categories" },
  ];

  return (
    <section className="stats-grid" aria-label="Summary metrics">
      {stats.map((stat) => (
        <div key={stat.label} className="stat-chip">
          <span>{stat.label}</span>
          <strong>{stat.value}</strong>
          <em>{stat.meta}</em>
        </div>
      ))}
    </section>
  );
}

function DailyLogs({
  logs,
  buckets,
  suggestions,
  onUpdate,
  hasMounted,
}: {
  logs: TimeLog[];
  buckets: Record<string, TimeBucket>;
  suggestions: string[];
  onUpdate: (logId: string, updates: Partial<TimeLog>) => void;
  hasMounted: boolean;
}) {
  const [selectedDay, setSelectedDay] = React.useState(() => {
    const latest = logs[0]?.startTime ?? "2026-04-24T12:00:00.000Z";
    return new Date(latest).toISOString().slice(0, 10);
  });

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draftTags, setDraftTags] = React.useState("");
  const dayStart = startOfDay(`${selectedDay}T00:00:00`);

  const dayLogs = logs.filter((log) => startOfDay(log.startTime) === dayStart);

  return (
    <Card className="panel-card">
      <CardHeader className="panel-header-row">
        <div>
          <CardTitle>Timelog list</CardTitle>
          <CardDescription>Edit sessions without losing the audit trail.</CardDescription>
        </div>
        <div className="day-picker-wrap">
          <CalendarDays />
          <Input type="date" value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {dayLogs.length === 0 ? (
          <div className="empty-state">No sessions recorded for this day.</div>
        ) : (
          dayLogs.map((log) => {
            const bucket = buckets[log.bucketId];
            const isEditing = editingId === log.id;
            return (
              <div key={log.id} className="log-row">
                <div className="log-main">
                  <div className={`tone-dot ${bucketToneClass(bucket?.color ?? "ink")}`} />
                  <div>
                    <p className="log-title">{bucket?.name ?? "Archived bucket"}</p>
                    <p className="log-meta">
                      {formatClockTime(log.startTime)}
                      {" — "}
                      {formatClockTime(log.endTime)}
                      {" · "}
                      {formatDuration(log.durationSeconds)}
                    </p>
                  </div>
                </div>
                <div className="log-tags">{log.tags.length ? log.tags.join(" ") : "No tags"}</div>
                <div className="log-actions">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingId(isEditing ? null : log.id);
                      setDraftTags(log.tags.join(" "));
                    }}
                  >
                    {isEditing ? "Close" : "Edit"}
                  </Button>
                </div>

                {isEditing ? (
                  <div className="log-editor">
                    <label>
                      <span>Start</span>
                      <Input
                        type="datetime-local"
                          value={hasMounted ? toLocalDateTimeValue(new Date(log.startTime)) : ""}
                        onChange={(e) =>
                          onUpdate(log.id, {
                            startTime: new Date(e.target.value).toISOString(),
                          })
                        }
                      />
                    </label>
                    <label>
                      <span>End</span>
                      <Input
                        type="datetime-local"
                          value={hasMounted ? toLocalDateTimeValue(new Date(log.endTime)) : ""}
                        onChange={(e) =>
                          onUpdate(log.id, {
                            endTime: new Date(e.target.value).toISOString(),
                          })
                        }
                      />
                    </label>
                    <label className="md:col-span-2">
                      <span>Tags</span>
                      <Input
                        value={draftTags}
                        onChange={(e) => setDraftTags(e.target.value)}
                        onBlur={() =>
                          onUpdate(log.id, {
                            tags: draftTags
                              .split(/\s+/)
                              .map((tag) => tag.trim())
                              .filter(Boolean)
                              .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)),
                          })
                        }
                        placeholder={suggestions.slice(0, 4).join(" ") || "#commute #basketball"}
                      />
                    </label>
                    <label className="md:col-span-2">
                      <span>Note</span>
                      <Input
                        value={log.note}
                        onChange={(e) => onUpdate(log.id, { note: e.target.value })}
                        placeholder="Optional context"
                      />
                    </label>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function ReportPanel({ logs, buckets }: { logs: TimeLog[]; buckets: Record<string, TimeBucket> }) {
  const [window, setWindow] = React.useState<ReportWindow>("week");
  const [tagFilter, setTagFilter] = React.useState("");

  const filtered = logs.filter((log) => {
    const age = Date.now() - new Date(log.endTime).getTime();
    const insideWindow =
      window === "week"
        ? age <= 7 * 24 * 60 * 60 * 1000
        : window === "month"
          ? age <= 30 * 24 * 60 * 60 * 1000
          : true;

    const matchesTag = tagFilter ? log.tags.includes(tagFilter) : true;
    return insideWindow && matchesTag;
  });

  const grouped = Object.values(
    filtered.reduce<Record<string, { bucketName: string; seconds: number; sessions: number }>>((acc, log) => {
      const bucketName = buckets[log.bucketId]?.name ?? "Archived bucket";
      if (!acc[log.bucketId]) {
        acc[log.bucketId] = { bucketName, seconds: 0, sessions: 0 };
      }
      acc[log.bucketId].seconds += log.durationSeconds;
      acc[log.bucketId].sessions += 1;
      return acc;
    }, {}),
  ).sort((a, b) => b.seconds - a.seconds);

  const maxSeconds = grouped[0]?.seconds ?? 1;
  const knownTags = Array.from(new Set(logs.flatMap((log) => log.tags))).sort();

  return (
    <Card className="panel-card">
      <CardHeader className="panel-header-row">
        <div>
          <CardTitle>Reports</CardTitle>
          <CardDescription>Weekly, monthly, and per-session averages with optional tag cuts.</CardDescription>
        </div>
        <div className="report-toolbar">
          <Tabs value={window} onValueChange={(value) => setWindow(value as ReportWindow)}>
            <TabsList>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="session">Session</TabsTrigger>
            </TabsList>
          </Tabs>
          <select className="report-select" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
            <option value="">All tags</option>
            {knownTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {grouped.length === 0 ? (
          <div className="empty-state">No report rows match this filter yet.</div>
        ) : (
          grouped.map((row) => {
            const avg = window === "session" ? row.seconds / row.sessions : row.seconds / (window === "week" ? 7 : 30);
            return (
              <div key={row.bucketName} className="report-row">
                <div className="report-copy">
                  <p>{row.bucketName}</p>
                  <span>
                    {formatDuration(row.seconds)} total · {formatDurationCompact(avg)} average
                  </span>
                </div>
                <div className="report-bar-wrap">
                  <div className="report-bar" style={{ width: `${(row.seconds / maxSeconds) * 100}%` }} />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

export function TimeTrackShell() {
  const {
    state,
    visibleBuckets,
    bucketMap,
    activeBucketIds,
    tagSuggestions,
    hasMounted,
    toggleTimer,
    createBucket,
    archiveBucket,
    addManualLog,
    updateLog,
    getElapsedSeconds,
  } = useTimeTrack();

  const [bucketDraft, setBucketDraft] = React.useState("");
  const [manualBucketId, setManualBucketId] = React.useState(visibleBuckets[0]?.id ?? "");
  const [manualStart, setManualStart] = React.useState("");
  const [manualEnd, setManualEnd] = React.useState("");
  const [manualTags, setManualTags] = React.useState("");
  const [manualNote, setManualNote] = React.useState("");

  React.useEffect(() => {
    if (!manualBucketId && visibleBuckets[0]) {
      setManualBucketId(visibleBuckets[0].id);
    }
  }, [manualBucketId, visibleBuckets]);

  React.useEffect(() => {
    if (!hasMounted) return;
    setManualStart((current) => current || toLocalDateTimeValue(new Date(Date.now() - 60 * 60 * 1000)));
    setManualEnd((current) => current || toLocalDateTimeValue(new Date()));
  }, [hasMounted]);



  return (
    <main className="timetrack-app">
      <Card className="panel-card buckets-hero-card">
        <CardContent className="bucket-grid bucket-grid-large">
          {visibleBuckets.map((bucket) => (
            <BucketCard
              key={bucket.id}
              bucket={bucket}
              isActive={activeBucketIds.has(bucket.id)}
              elapsedSeconds={getElapsedSeconds(bucket.id)}
              onToggle={() => toggleTimer(bucket.id)}
              onArchive={() => archiveBucket(bucket.id)}
            />
          ))}
        </CardContent>
        <CardHeader className="panel-header-row">
          <form
            className="bucket-create-row"
            onSubmit={(e) => {
              e.preventDefault();
              createBucket(bucketDraft);
              setBucketDraft("");
            }}
          >
            <Input
              value={bucketDraft}
              onChange={(e) => setBucketDraft(e.target.value)}
              placeholder="Add bucket"
            />
            <Button type="submit" variant="secondary" size="icon" aria-label="Add bucket">
              <Plus />
            </Button>
          </form>
        </CardHeader>
      </Card>

      <StatsStrip logs={state.logs} buckets={visibleBuckets} activeCount={state.activeTimers.length} />

      <section className="layout-grid">
        <div className="primary-column">

          <DailyLogs
            logs={[...state.logs].sort((a, b) => +new Date(b.startTime) - +new Date(a.startTime))}
            buckets={bucketMap}
            suggestions={tagSuggestions}
            onUpdate={updateLog}
            hasMounted={hasMounted}
          />
        </div>

        <aside className="secondary-column">
          <Card className="panel-card">
            <CardHeader>
              <CardTitle>Manual entry</CardTitle>
              <CardDescription>Backfill a session you forgot to time live.</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="manual-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  addManualLog({
                    bucketId: manualBucketId,
                    startTime: new Date(manualStart).toISOString(),
                    endTime: new Date(manualEnd).toISOString(),
                    tags: manualTags
                      .split(/\s+/)
                      .map((tag) => tag.trim())
                      .filter(Boolean)
                      .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)),
                    note: manualNote,
                  });
                  setManualTags("");
                  setManualNote("");
                }}
              >
                <label>
                  <span>Bucket</span>
                  <select value={manualBucketId} onChange={(e) => setManualBucketId(e.target.value)}>
                    {visibleBuckets.map((bucket) => (
                      <option key={bucket.id} value={bucket.id}>
                        {bucket.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Start</span>
                  <Input type="datetime-local" value={manualStart} onChange={(e) => setManualStart(e.target.value)} />
                </label>
                <label>
                  <span>End</span>
                  <Input type="datetime-local" value={manualEnd} onChange={(e) => setManualEnd(e.target.value)} />
                </label>
                <label>
                  <span>Tags</span>
                  <Input
                    value={manualTags}
                    onChange={(e) => setManualTags(e.target.value)}
                    placeholder={tagSuggestions.slice(0, 3).join(" ") || "#workout #basketball"}
                  />
                </label>
                <label>
                  <span>Note</span>
                  <Input value={manualNote} onChange={(e) => setManualNote(e.target.value)} placeholder="Optional note" />
                </label>
                <Button type="submit" variant="hero" size="pill">
                  <Plus />
                  Add timelog
                </Button>
              </form>
            </CardContent>
          </Card>



          <ReportPanel logs={state.logs} buckets={bucketMap} />
        </aside>
      </section>
    </main>
  );
}