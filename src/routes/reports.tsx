import { createFileRoute } from "@tanstack/react-router";

import { ReportPanel, TimeTrackNav } from "@/components/timetrack-shell";
import { useTimeTrack } from "@/hooks/use-timetrack";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — TimeTrack" },
      {
        name: "description",
        content: "Weekly, monthly, and per-session totals across your time buckets.",
      },
      { property: "og:title", content: "Reports — TimeTrack" },
      {
        property: "og:description",
        content: "Review your tracked time by week, month, or session.",
      },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { state, bucketMap } = useTimeTrack();

  return (
    <main className="timetrack-app">
      <TimeTrackNav />
      <ReportPanel logs={state.logs} buckets={bucketMap} />
    </main>
  );
}
