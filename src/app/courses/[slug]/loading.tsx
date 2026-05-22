export default function CourseLoading() {
  return (
    <div style={{ background: "var(--ed-bg)" }} className="min-h-screen animate-pulse">
      <div className="h-16 border-b" style={{ borderColor: "var(--ed-line)" }} />
      <section
        className="border-b"
        style={{ borderColor: "var(--ed-line)" }}
      >
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="h-5 w-16 rounded-full bg-secondary" />
              <div className="h-5 w-20 rounded-full bg-secondary" />
            </div>
            <div className="space-y-2">
              <div className="h-8 w-3/4 rounded bg-secondary" />
              <div className="h-8 w-1/2 rounded bg-secondary/80" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full rounded bg-secondary/60" />
              <div className="h-4 w-2/3 rounded bg-secondary/60" />
            </div>
            <div className="flex gap-4 pt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-3 w-16 rounded bg-secondary/60" />
              ))}
            </div>
          </div>
          <div className="rounded-2xl border bg-white" style={{ borderColor: "var(--ed-line)" }}>
            <div className="h-40 bg-secondary" />
            <div className="space-y-3 p-6">
              <div className="h-7 w-24 rounded bg-secondary" />
              <div className="h-3 w-32 rounded bg-secondary/60" />
              <div className="h-11 w-full rounded-xl bg-secondary" />
              <div className="h-9 w-full rounded-xl bg-secondary/70" />
              <div className="space-y-2 pt-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-3 w-3/4 rounded bg-secondary/60" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-10">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border bg-white p-5"
            style={{ borderColor: "var(--ed-line)" }}
          >
            <div className="mb-4 h-5 w-40 rounded bg-secondary" />
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-secondary/60" />
              <div className="h-3 w-5/6 rounded bg-secondary/60" />
              <div className="h-3 w-2/3 rounded bg-secondary/60" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
