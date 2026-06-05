/**
 * Content-only skeleton. This renders INSIDE the student layout's <main> (the
 * real sidebar is already there), so it must NOT draw its own sidebar/shell —
 * just a placeholder that mirrors the page body (header → stat pills → cards).
 */
export default function StudentLoading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse space-y-8">
      {/* Header */}
      <div className="space-y-2.5">
        <div className="h-3 w-24 rounded bg-secondary/70" />
        <div className="h-8 w-56 rounded bg-secondary" />
        <div className="h-3 w-72 rounded bg-secondary/60" />
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-2xl border bg-white p-4"
            style={{ borderColor: "var(--ed-line)" }}
          >
            <div className="size-10 shrink-0 rounded-xl bg-secondary" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-10 rounded bg-secondary" />
              <div className="h-2.5 w-16 rounded bg-secondary/60" />
            </div>
          </div>
        ))}
      </div>

      {/* Card grid */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl border bg-white"
            style={{ borderColor: "var(--ed-line)" }}
          >
            <div className="h-36 bg-secondary" />
            <div className="space-y-3 p-5">
              <div className="h-4 w-3/4 rounded bg-secondary" />
              <div className="h-3 w-1/2 rounded bg-secondary/60" />
              <div className="mt-5 h-2 w-full rounded-full bg-secondary/50" />
              <div className="flex items-center justify-between pt-1">
                <div className="h-3 w-20 rounded bg-secondary/50" />
                <div className="h-3 w-16 rounded bg-secondary/50" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
