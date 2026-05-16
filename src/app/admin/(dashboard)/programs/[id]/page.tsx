import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { programs, modules, lessons } from "@/db/schema";
import { eq, and, asc, inArray } from "drizzle-orm";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth";
import { requireTenantId } from "@/lib/tenant";
import { formatInr } from "@/lib/courses";
import { ModuleDialog, DeleteModuleButton, DeleteLessonButton } from "./module-dialog";
import { LessonDialog } from "./lesson-dialog";
import { ArrowLeft, PlayCircle, FileText, Video } from "lucide-react";

export const dynamic = "force-dynamic";

type Resource = { label: string; url: string };

export default async function CourseContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("admin");
  const { id } = await params;
  const tenantId = await requireTenantId();

  const [course] = await db.select().from(programs).where(eq(programs.id, id)).limit(1);
  // Cross-tenant course access blocked (acceptance #6).
  if (!course || course.tenantId !== tenantId) notFound();

  const mods = await db
    .select()
    .from(modules)
    .where(eq(modules.courseId, id))
    .orderBy(asc(modules.orderIndex));

  const moduleIds = mods.map((m) => m.id);
  const allLessons = moduleIds.length
    ? await db
        .select()
        .from(lessons)
        .where(inArray(lessons.moduleId, moduleIds))
        .orderBy(asc(lessons.orderIndex))
    : [];
  const lessonsByModule = (moduleId: string) =>
    allLessons.filter((l) => l.moduleId === moduleId);

  const totalLessons = mods.reduce((s, m) => s + lessonsByModule(m.id).length, 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/admin/programs"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to courses
      </Link>

      <PageHeader
        eyebrow="— Course content"
        title={course.name}
        description={`${formatInr(course.priceCents)} · ${mods.length} modules · ${totalLessons} lessons`}
        actions={<ModuleDialog courseId={course.id} mode="create" />}
      />

      {mods.length === 0 ? (
        <Card className="border-none bg-card p-12 text-center shadow-card">
          <Video className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No content yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add a module, then add lessons with video URLs and downloadable resources.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {mods.map((mod, i) => {
            const modLessons = lessonsByModule(mod.id);
            return (
              <Card key={mod.id} className="overflow-hidden border-none bg-card shadow-card">
                <div className="flex items-start justify-between gap-3 border-b border-black/5 p-5">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Module {i + 1}
                    </div>
                    <div className="text-sm font-semibold">{mod.title}</div>
                    {mod.description && (
                      <div className="mt-1 text-xs text-muted-foreground">{mod.description}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <ModuleDialog
                      courseId={course.id}
                      mode="edit"
                      initial={{ id: mod.id, title: mod.title, description: mod.description }}
                    />
                    <DeleteModuleButton moduleId={mod.id} courseId={course.id} />
                  </div>
                </div>

                <ul className="divide-y divide-black/5">
                  {modLessons.length === 0 && (
                    <li className="px-5 py-4 text-xs text-muted-foreground">
                      No lessons in this module yet.
                    </li>
                  )}
                  {modLessons.map((l) => {
                    const res = (l.resources as Resource[] | null) ?? [];
                    return (
                      <li
                        key={l.id}
                        className="flex items-center justify-between gap-3 px-5 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          {l.videoUrl ? (
                            <PlayCircle className="size-4 shrink-0 text-[#1AADE0]" />
                          ) : (
                            <Video className="size-4 shrink-0 text-muted-foreground" />
                          )}
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{l.title}</div>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <span>{Math.round(l.durationSeconds / 60)} min</span>
                              {!l.videoUrl && (
                                <Badge variant="secondary" className="font-normal">
                                  No video
                                </Badge>
                              )}
                              {res.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <FileText className="size-3" />
                                  {res.length} resource{res.length > 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <LessonDialog
                            courseId={course.id}
                            moduleId={mod.id}
                            mode="edit"
                            initial={{
                              id: l.id,
                              title: l.title,
                              videoUrl: l.videoUrl,
                              durationMinutes: Math.round(l.durationSeconds / 60),
                              resources: res,
                            }}
                          />
                          <DeleteLessonButton lessonId={l.id} courseId={course.id} />
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <div className="border-t border-black/5 p-4">
                  <LessonDialog courseId={course.id} moduleId={mod.id} mode="create" />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="border-none bg-secondary/40 p-5 shadow-none">
        <div className="flex items-start gap-3">
          <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Uploading content:</span> add a lesson and{" "}
            <span className="font-medium">upload the video file directly</span> — it streams inside
            the student dashboard with seeking. You can also upload PDFs/worksheets as resources,
            or paste an external link (YouTube/Vimeo/Drive) instead. Requires the Vercel Blob store
            to be connected to this project.
          </div>
        </div>
      </Card>
    </div>
  );
}
