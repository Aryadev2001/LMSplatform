export default function StudentLoading() {
  return (
    <div
      className="flex min-h-screen animate-pulse"
      style={{ background: "var(--ed-bg)" }}
    >
      <aside
        className="hidden w-64 shrink-0 flex-col gap-6 px-4 py-6 lg:flex"
        style={{ background: "var(--ed-ink)" }}
      >
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-full bg-white/10" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-20 rounded bg-white/10" />
            <div className="h-2.5 w-32 rounded bg-white/10" />
          </div>
        </div>
        <div className="h-16 rounded-xl bg-white/10" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-7 rounded-lg bg-white/5" />
          ))}
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden px-8 py-8">
        <div className="mb-6 h-8 w-1/2 rounded bg-secondary" />
        <div className="mb-6 h-12 rounded-2xl bg-secondary/40" />
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="space-y-2 rounded-2xl border bg-white p-5"
              style={{ borderColor: "var(--ed-line)" }}
            >
              <div className="h-3 w-2/3 rounded bg-secondary" />
              <div className="h-7 w-1/2 rounded bg-secondary" />
              <div className="h-3 w-3/4 rounded bg-secondary/60" />
            </div>
          ))}
        </div>
        <div
          className="h-40 rounded-2xl border bg-white"
          style={{ borderColor: "var(--ed-line)" }}
        />
      </main>
    </div>
  );
}
