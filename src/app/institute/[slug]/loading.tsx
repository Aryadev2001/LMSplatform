export default function InstituteLoading() {
  return (
    <div style={{ background: "var(--ed-bg)" }} className="min-h-screen animate-pulse">
      <div className="h-16 border-b" style={{ borderColor: "var(--ed-line)" }} />
      <section style={{ background: "var(--ed-ink)" }}>
        <div className="mx-auto flex max-w-7xl gap-6 px-6 py-10">
          <div className="size-32 rounded-2xl bg-white/10" />
          <div className="flex-1 space-y-3">
            <div className="h-5 w-44 rounded-full bg-white/10" />
            <div className="h-9 w-2/3 rounded bg-white/10" />
            <div className="h-4 w-1/2 rounded bg-white/10" />
            <div className="flex gap-4 pt-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-3 w-16 rounded bg-white/10" />
              ))}
            </div>
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-6 pb-24 pt-8">
        <div className="mb-8 flex gap-3 border-b pb-3" style={{ borderColor: "var(--ed-line)" }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-5 w-24 rounded bg-secondary" />
          ))}
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border bg-white"
              style={{ borderColor: "var(--ed-line)" }}
            >
              <div className="h-40 bg-secondary" />
              <div className="space-y-2 p-4">
                <div className="h-3 w-1/3 rounded bg-secondary" />
                <div className="h-4 w-full rounded bg-secondary/70" />
                <div className="h-3 w-2/3 rounded bg-secondary/60" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
