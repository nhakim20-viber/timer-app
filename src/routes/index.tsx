import { createFileRoute } from "@tanstack/react-router";

import { TimeTrackShell } from "@/components/timetrack-shell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TimeTrack — Personal Time Logging" },
      {
        name: "description",
        content:
          "A calm web MVP for personal time logging with simultaneous timers, editable timelogs, and neutral reports.",
      },
      { property: "og:title", content: "TimeTrack — Personal Time Logging" },
      {
        property: "og:description",
        content:
          "Track personal activity buckets, run multiple timers, and review clear reports without nudges or gamification.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return <TimeTrackShell />;
}
