"use client";

import dynamic from "next/dynamic";

// recharts is heavy to parse/hydrate — split it into its own chunk and skip
// server rendering so it doesn't block the rest of the dashboard tab.
const DashboardCharts = dynamic(() => import("./DashboardCharts"), {
  ssr: false,
  loading: () => (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="h-80 w-full bg-zinc-100 dark:bg-white/5 rounded-[2rem] animate-pulse" />
      <div className="h-80 w-full bg-zinc-100 dark:bg-white/5 rounded-[2rem] animate-pulse" />
    </div>
  ),
});

export default DashboardCharts;
