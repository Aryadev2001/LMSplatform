import Link from "next/link";
import { notFound } from "next/navigation";
import { Brand } from "@/components/brand";
import { buttonVariants } from "@/components/ui/button";
import { getCourseBySlug, formatInr, formatRuntime, tierBadgeStyle } from "@/lib/courses";
import { CheckCircle2, PlayCircle, Clock, Layers, ArrowRight } from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getCourseBySlug(slug);
  return {
    title: data ? `${data.course.name} — EDT` : "Course — EDT",
    description: data?.course.tagline ?? undefined,
  };
}

export default async function CourseLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getCourseBySlug(slug);
  if (!data || data.course.status !== "published") notFound();

  const { course, modules, totalLessons, totalSeconds } = data;
  const isHigh = course.requiresApplication;

  return (
    <div className="relative isolate min-h-screen bg-secondary/20">
      <div className="absolute inset-0 -z-10 bg-grid-soft" />

      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Link href="/">
          <Brand />
        </Link>
        <Link href="/diagnostic" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Take the Business X-Ray
        </Link>
      </header>

      <div className="mx-auto max-w-5xl px-6 pb-20">
        {/* Hero */}
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            <span
              className="inline-block rounded-full px-3 py-1 text-xs font-semibold"
              style={tierBadgeStyle(course.badgeColor)}
            >
              {course.tier === "low" ? "Entry program" : course.tier === "mid" ? "Core program" : "Flagship program"}
            </span>
            <h1 className="mt-4 text-balance text-4xl font-semibold tracking-tight md:text-5xl">
              {course.name}
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">{course.tagline}</p>
            <p className="mt-4 max-w-xl text-muted-foreground">{course.description}</p>

            <div className="mt-6 flex flex-wrap gap-5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Layers className="size-4" /> {modules.length} modules
              </span>
              <span className="flex items-center gap-1.5">
                <PlayCircle className="size-4" /> {totalLessons} lessons
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="size-4" /> {formatRuntime(totalSeconds)} content
              </span>
              <span className="flex items-center gap-1.5">
                {course.durationMonths} month{course.durationMonths > 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Price card */}
          <div className="h-fit rounded-2xl bg-card p-6 shadow-soft">
            <div className="text-3xl font-bold">{formatInr(course.priceCents)}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {course.type === "subscription" ? "per quarter" : "one-time payment"}
            </div>
            {isHigh ? (
              <Link
                href={`/enroll?course=${course.slug}`}
                className={buttonVariants({
                  className:
                    "mt-5 h-11 w-full rounded-xl bg-brand-gradient font-semibold text-white hover:opacity-95",
                })}
              >
                Apply now
                <ArrowRight className="size-4" />
              </Link>
            ) : (
              <Link
                href={`/enroll?course=${course.slug}`}
                className={buttonVariants({
                  className:
                    "mt-5 h-11 w-full rounded-xl bg-brand-gradient font-semibold text-white hover:opacity-95",
                })}
              >
                Enrol now
                <ArrowRight className="size-4" />
              </Link>
            )}
            {isHigh && (
              <p className="mt-3 text-center text-[11px] text-muted-foreground">
                Application + qualification call required
              </p>
            )}
            <ul className="mt-5 space-y-2 text-xs text-muted-foreground">
              <li className="flex gap-2">
                <CheckCircle2 className="size-3.5 shrink-0 text-[#8CC63F]" /> Lifetime access &amp;
                updates
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="size-3.5 shrink-0 text-[#8CC63F]" /> Magic-link login, no
                password
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="size-3.5 shrink-0 text-[#8CC63F]" /> Certificate on
                completion
              </li>
            </ul>
          </div>
        </div>

        {/* Curriculum */}
        <div className="mt-14">
          <h2 className="text-2xl font-semibold tracking-tight">What you&apos;ll learn</h2>
          <div className="mt-5 space-y-3">
            {modules.map((mod, i) => (
              <div key={mod.id} className="overflow-hidden rounded-2xl bg-card shadow-card">
                <div className="flex items-center justify-between border-b border-black/5 px-5 py-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Module {i + 1}
                    </div>
                    <div className="text-sm font-semibold">{mod.title}</div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {mod.lessons.length} lessons
                  </span>
                </div>
                <ul className="divide-y divide-black/5">
                  {mod.lessons.map((l) => (
                    <li
                      key={l.id}
                      className="flex items-center justify-between px-5 py-3 text-sm"
                    >
                      <span className="flex items-center gap-2.5">
                        <PlayCircle className="size-4 text-muted-foreground" />
                        {l.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(l.durationSeconds / 60)} min
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 text-center">
          <Link
            href={`/enroll?course=${course.slug}`}
            className={buttonVariants({
              size: "lg",
              className:
                "h-12 rounded-xl bg-brand-gradient px-8 font-semibold text-white hover:opacity-95",
            })}
          >
            {isHigh ? "Apply for this program" : `Enrol — ${formatInr(course.priceCents)}`}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
