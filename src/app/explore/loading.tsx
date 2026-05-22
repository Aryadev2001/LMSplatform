export default function ExploreLoading() {
  return (
    <div
      style={{ background: "var(--ed-bg)" }}
      className="min-h-screen animate-pulse"
    >
      <div
        className="h-16 border-b"
        style={{ borderColor: "var(--ed-line)" }}
      />
      <section
        className="border-b"
        style={{ borderColor: "var(--ed-line)" }}
      >
        <div className="mx-auto max-w-7xl space-y-3 px-6 py-12">
          <div className="h-3 w-24 rounded bg-secondary" />
          <div className="h-9 w-72 rounded bg-secondary" />
          <div className="h-3 w-40 rounded bg-secondary/70" />
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-7 w-24 rounded-full bg-secondary" />
          ))}
        </div>
        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <div className="space-y-3 rounded-2xl border bg-white p-5" style={{ borderColor: "var(--ed-line)" }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-20 rounded bg-secondary" />
                <div className="h-3 w-full rounded bg-secondary/70" />
                <div className="h-3 w-3/4 rounded bg-secondary/70" />
              </div>
            ))}
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-2xl border bg-white"
                style={{ borderColor: "var(--ed-line)" }}
              >
                <div className="h-36 bg-secondary" />
                <div className="space-y-2 p-4">
                  <div className="h-3 w-1/3 rounded bg-secondary" />
                  <div className="h-4 w-full rounded bg-secondary/70" />
                  <div className="h-4 w-4/5 rounded bg-secondary/70" />
                  <div className="mt-3 flex justify-between">
                    <div className="h-3 w-10 rounded bg-secondary" />
                    <div className="h-4 w-16 rounded bg-secondary" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
