import * as React from "react";
import {
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
import { Link } from "@tanstack/react-router";

export function TimeTrackNav() {
  return (
    <nav className="timetrack-nav" aria-label="Primary">
      <Link
        to="/"
        activeOptions={{ exact: true }}
        activeProps={{ className: "timetrack-nav-link is-active" }}
        inactiveProps={{ className: "timetrack-nav-link" }}
      >
        Timers
      </Link>
      <Link
        to="/reports"
        activeProps={{ className: "timetrack-nav-link is-active" }}
        inactiveProps={{ className: "timetrack-nav-link" }}
      >
        Reports
      </Link>
    </nav>
  );
}

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
  selectedTags,
  onToggle,
  onArchive,
  onToggleTag,
  onAddTag,
}: {
  bucket: TimeBucket;
  isActive: boolean;
  elapsedSeconds: number;
  selectedTags: string[];
  onToggle: () => void;
  onArchive: () => void;
  onToggleTag: (tag: string) => void;
  onAddTag: (tag: string) => void;
}) {
  const [tagDraft, setTagDraft] = React.useState("");
  const [adding, setAdding] = React.useState(false);

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

      {isActive ? (
        <div className="bucket-tile-tags" onClick={(e) => e.stopPropagation()}>
          {bucket.presetTags.map((tag) => {
            const on = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                className={`bucket-tag-chip ${on ? "is-on" : ""}`}
                aria-pressed={on}
                onClick={() => onToggleTag(tag)}
              >
                {tag}
              </button>
            );
          })}
          {adding ? (
            <form
              className="bucket-tag-add-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (tagDraft.trim()) {
                  onAddTag(tagDraft);
                  setTagDraft("");
                }
                setAdding(false);
              }}
            >
              <input
                autoFocus
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onBlur={() => {
                  if (tagDraft.trim()) onAddTag(tagDraft);
                  setTagDraft("");
                  setAdding(false);
                }}
                placeholder="new tag"
                className="bucket-tag-input"
              />
            </form>
          ) : (
            <button
              type="button"
              className="bucket-tag-chip bucket-tag-add"
              onClick={() => setAdding(true)}
              aria-label="Add tag"
            >
              + add tag
            </button>
          )}
        </div>
      ) : null}

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


function DayCalendarView({
  logs,
  buckets,
  selectedDay,
  onSelectDay,
}: {
  logs: TimeLog[];
  buckets: Record<string, TimeBucket>;
  selectedDay: string;
  onSelectDay: (day: string) => void;
}) {
  const dayStart = new Date(`${selectedDay}T00:00:00`);
  const dayStartMs = dayStart.getTime();
  const dayEndMs = dayStartMs + 24 * 60 * 60 * 1000;

  const dayLogs = logs
    .filter((log) => {
      const s = new Date(log.startTime).getTime();
      const e = new Date(log.endTime).getTime();
      return e > dayStartMs && s < dayEndMs;
    })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const HOUR_PX = 48;
  const totalHeight = HOUR_PX * 24;
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="day-view">
      <div className="day-view-controls">
        <Input
          type="date"
          value={selectedDay}
          onChange={(e) => onSelectDay(e.target.value)}
          className="day-view-date"
        />
        <span className="day-view-label">
          {dayStart.toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      </div>

      {dayLogs.length === 0 ? (
        <div className="empty-state">No sessions recorded for this day.</div>
      ) : (
        <div className="day-view-grid" style={{ height: totalHeight }}>
          <div className="day-view-hours">
            {hours.map((h) => (
              <div key={h} className="day-view-hour" style={{ height: HOUR_PX }}>
                <span>
                  {h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`}
                </span>
              </div>
            ))}
          </div>
          <div className="day-view-events">
            {hours.map((h) => (
              <div key={h} className="day-view-row" style={{ height: HOUR_PX }} />
            ))}
            {dayLogs.map((log) => {
              const bucket = buckets[log.bucketId];
              const s = Math.max(new Date(log.startTime).getTime(), dayStartMs);
              const e = Math.min(new Date(log.endTime).getTime(), dayEndMs);
              const top = ((s - dayStartMs) / (60 * 60 * 1000)) * HOUR_PX;
              const height = Math.max(18, ((e - s) / (60 * 60 * 1000)) * HOUR_PX);
              return (
                <div
                  key={log.id}
                  className={`day-view-event ${bucketToneClass(bucket?.color ?? "ink")}`}
                  style={{ top, height }}
                >
                  <p className="day-view-event-title">{bucket?.name ?? "Archived bucket"}</p>
                  <p className="day-view-event-meta">
                    {formatClockTime(log.startTime)} — {formatClockTime(log.endTime)} ·{" "}
                    {formatDuration(log.durationSeconds)}
                  </p>
                  {log.tags.length ? (
                    <p className="day-view-event-tags">{log.tags.join(" ")}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function ReportPanel({ logs, buckets }: { logs: TimeLog[]; buckets: Record<string, TimeBucket> }) {
  const [window, setWindow] = React.useState<ReportWindow>("week");
  const [tagFilter, setTagFilter] = React.useState("");
  const [selectedDay, setSelectedDay] = React.useState(() => {
    const latest = logs[0]?.startTime;
    const d = latest ? new Date(latest) : new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  });

  const filtered = logs.filter((log) => {
    const matchesTag = tagFilter ? log.tags.includes(tagFilter) : true;
    if (!matchesTag) return false;
    if (window === "day") return true; // day view handles its own filtering
    const age = Date.now() - new Date(log.endTime).getTime();
    if (window === "week") return age <= 7 * 24 * 60 * 60 * 1000;
    if (window === "month") return age <= 30 * 24 * 60 * 60 * 1000;
    return true;
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

  const dayFilteredLogs = tagFilter ? logs.filter((l) => l.tags.includes(tagFilter)) : logs;

  return (
    <Card className="panel-card">
      <CardHeader className="panel-header-row">
        <div>
          <CardTitle>Reports</CardTitle>
          <CardDescription>Daily, weekly, monthly, and per-session views with optional tag cuts.</CardDescription>
        </div>
        <div className="report-toolbar">
          <Tabs value={window} onValueChange={(value) => setWindow(value as ReportWindow)}>
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
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
        {window === "day" ? (
          <DayCalendarView
            logs={dayFilteredLogs}
            buckets={buckets}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
          />
        ) : grouped.length === 0 ? (
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
    activeBucketIds,
    tagSuggestions,
    hasMounted,
    toggleTimer,
    createBucket,
    archiveBucket,
    addManualLog,
    getElapsedSeconds,
    toggleActiveTimerTag,
    addBucketTag,
  } = useTimeTrack();

  const activeTimerMap = React.useMemo(
    () => Object.fromEntries(state.activeTimers.map((t) => [t.bucketId, t])),
    [state.activeTimers],
  );

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
      <TimeTrackNav />
      <Card className="panel-card buckets-hero-card">
        <CardContent className="bucket-grid bucket-grid-large">
          {visibleBuckets.map((bucket) => (
            <BucketCard
              key={bucket.id}
              bucket={bucket}
              isActive={activeBucketIds.has(bucket.id)}
              elapsedSeconds={getElapsedSeconds(bucket.id)}
              selectedTags={activeTimerMap[bucket.id]?.selectedTags ?? []}
              onToggle={() => toggleTimer(bucket.id)}
              onArchive={() => archiveBucket(bucket.id)}
              onToggleTag={(tag) => toggleActiveTimerTag(bucket.id, tag)}
              onAddTag={(tag) => addBucketTag(bucket.id, tag)}
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


      <section className="layout-grid">
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
        </aside>
      </section>
    </main>
  );
}