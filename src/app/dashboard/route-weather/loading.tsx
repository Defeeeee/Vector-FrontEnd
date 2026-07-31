export default function Loading() {
  return (
    <div className="w-full h-full min-h-[400px] flex flex-col space-y-8 animate-pulse p-4 md:p-8">
      <div className="space-y-4">
        <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-12 w-64 bg-zinc-200 dark:bg-zinc-800 rounded" />
      </div>

      <div className="grid md:grid-cols-[1fr_320px] gap-6">
        <div className="h-48 w-full bg-zinc-200 dark:bg-zinc-800 rounded-[2rem]" />
        <div className="h-48 w-full bg-zinc-200 dark:bg-zinc-800 rounded-[2rem]" />
      </div>

      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 w-full bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
