export default function SuperAdminLoading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse space-y-6 p-6">
      <div className="space-y-2">
        <div className="h-3 w-32 rounded bg-secondary" />
        <div className="h-8 w-72 rounded bg-secondary" />
        <div className="h-3 w-2/3 rounded bg-secondary/60" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
        className="h-96 rounded-2xl border bg-white"
        style={{ borderColor: "var(--ed-line)" }}
      />
    </div>
  );
}
