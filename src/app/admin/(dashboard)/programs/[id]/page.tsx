import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db/client";
import {
  programs,
  modules,
  lessons,
  exams,
  examQuestions,
  courseOffers,
} from "@/db/schema";
import { eq, and, asc, inArray, desc, sql } from "drizzle-orm";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth";
import { requireTenantId } from "@/lib/tenant";
import { formatInr } from "@/lib/courses";
import { ModuleDialog, DeleteModuleButton, DeleteLessonButton } from "./module-dialog";
import { LessonDialog } from "./lesson-dialog";
import { ExamDialog, DeleteExamButton } from "./exam-dialog";
import { OfferDialog, DeleteOfferButton } from "./offer-dialog";
import {
  ArrowLeft,
  PlayCircle,
  FileText,
  Video,
  ClipboardList,
  Clock,
  Layers,
  Tag,
} from "lucide-react";

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

  // Exams attached to this course (any module, plus course-level).
  const examRows = await db
    .select({
      id: exams.id,
      title: exams.title,
      moduleId: exams.moduleId,
      durationMinutes: exams.durationMinutes,
      totalMarks: exams.totalMarks,
      passingMarks: exams.passingMarks,
      isActive: exams.isActive,
      questionCount: sql<number>`(
        select count(*)::int from ${examQuestions} q where q.exam_id = ${exams.id}
      )`,
    })
    .from(exams)
    .where(and(eq(exams.programId, id), eq(exams.tenantId, tenantId)))
    .orderBy(desc(exams.createdAt));
  const moduleOptions = mods.map((m) => ({ id: m.id, title: m.title }));
  const moduleTitleById = new Map(mods.map((m) => [m.id, m.title] as const));

  // Offers attached to this course (any active state).
  const offerRows = await db
    .select({
      id: courseOffers.id,
      type: courseOffers.type,
      valueInt: courseOffers.valueInt,
      voucherCode: courseOffers.voucherCode,
      maxRedemptions: courseOffers.maxRedemptions,
      redemptionsUsed: courseOffers.redemptionsUsed,
      startsAt: courseOffers.startsAt,
      expiresAt: courseOffers.expiresAt,
      isActive: courseOffers.isActive,
    })
    .from(courseOffers)
    .where(
      and(eq(courseOffers.programId, id), eq(courseOffers.tenantId, tenantId)),
    )
    .orderBy(desc(courseOffers.createdAt));

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
                      initial={{
                        id: mod.id,
                        title: mod.title,
                        description: mod.description,
                        releaseAt: mod.releaseAt
                          ? new Date(mod.releaseAt).toISOString().slice(0, 16)
                          : null,
                        unlockAfterDays: mod.unlockAfterDays ?? null,
                      }}
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

      {/* Exams */}
      <div>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              — Exam Q-bank
            </div>
            <h2 className="mt-1 text-xl font-extrabold tracking-tight">
              Exams ({examRows.length})
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Build a question bank per module, or one course-level final exam.
              Total marks update automatically from the questions you add.
            </p>
          </div>
          <ExamDialog
            courseId={course.id}
            modules={moduleOptions}
            mode="create"
          />
        </div>

        {examRows.length === 0 ? (
          <Card className="border-dashed bg-transparent p-10 text-center shadow-none">
            <ClipboardList className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No exams yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create one and start adding questions — minimum 2 options, exactly one correct.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {examRows.map((ex) => {
              const moduleLabel = ex.moduleId
                ? `Module · ${moduleTitleById.get(ex.moduleId) ?? "—"}`
                : "Course-level final";
              return (
                <Card
                  key={ex.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-none bg-card p-4 shadow-card sm:flex-nowrap"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold">{ex.title}</span>
                      {ex.isActive ? (
                        <Badge variant="default" className="font-normal">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="font-normal">
                          Draft
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Layers className="size-3" /> {moduleLabel}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" /> {ex.durationMinutes} min
                      </span>
                      <span>
                        <strong className="text-foreground">{ex.questionCount}</strong>{" "}
                        question{ex.questionCount === 1 ? "" : "s"}
                      </span>
                      <span>
                        <strong className="text-foreground">{ex.totalMarks}</strong> total marks
                      </span>
                      <span>Pass: {ex.passingMarks}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/admin/programs/${course.id}/exams/${ex.id}`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors hover:bg-secondary"
                    >
                      Manage questions
                    </Link>
                    <ExamDialog
                      courseId={course.id}
                      modules={moduleOptions}
                      mode="edit"
                      initial={{
                        id: ex.id,
                        title: ex.title,
                        moduleId: ex.moduleId,
                        durationMinutes: ex.durationMinutes,
                        passingMarks: ex.passingMarks,
                        isActive: ex.isActive,
                      }}
                    />
                    <DeleteExamButton examId={ex.id} courseId={course.id} />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Offers — reward points / percentage discounts / voucher codes. */}
      <div>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              — Offers &amp; vouchers
            </div>
            <h2 className="mt-1 text-xl font-extrabold tracking-tight">
              Offers ({offerRows.length})
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Reward points granted on purchase, automatic % discounts, or
              voucher codes a buyer enters at checkout.
            </p>
          </div>
          <OfferDialog courseId={course.id} mode="create" />
        </div>

        {offerRows.length === 0 ? (
          <Card className="border-dashed bg-transparent p-10 text-center shadow-none">
            <Tag className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No offers yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add a launch-week voucher or set a permanent points reward to
              attract enrollments.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {offerRows.map((o) => {
              const typeLabel =
                o.type === "voucher_code"
                  ? "Voucher"
                  : o.type === "reward_percentage"
                    ? "Auto discount"
                    : "Reward points";
              const valueLabel =
                o.type === "reward_points"
                  ? `${o.valueInt} pts`
                  : `${o.valueInt}%`;
              const expired = o.expiresAt && o.expiresAt < new Date();
              const notYet = o.startsAt && o.startsAt > new Date();
              const exhausted =
                o.maxRedemptions !== null &&
                o.redemptionsUsed >= o.maxRedemptions;
              const statusLabel = !o.isActive
                ? "Disabled"
                : expired
                  ? "Expired"
                  : notYet
                    ? "Scheduled"
                    : exhausted
                      ? "Exhausted"
                      : "Live";
              const statusVariant: "default" | "secondary" | "destructive" =
                statusLabel === "Live"
                  ? "default"
                  : statusLabel === "Disabled" || statusLabel === "Expired"
                    ? "secondary"
                    : "secondary";
              return (
                <Card
                  key={o.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-none bg-card p-4 shadow-card sm:flex-nowrap"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold">{typeLabel}</span>
                      <span
                        className="rounded-md bg-secondary px-2 py-0.5 font-mono text-xs"
                        style={{ color: "var(--ed-ink)" }}
                      >
                        {valueLabel}
                      </span>
                      {o.voucherCode && (
                        <span
                          className="rounded-md bg-secondary px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider"
                          style={{ color: "var(--ed-ink)" }}
                        >
                          {o.voucherCode}
                        </span>
                      )}
                      <Badge variant={statusVariant} className="font-normal">
                        {statusLabel}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span>
                        Redemptions:{" "}
                        <strong className="text-foreground">
                          {o.redemptionsUsed}
                        </strong>
                        {o.maxRedemptions !== null
                          ? ` / ${o.maxRedemptions}`
                          : ""}
                      </span>
                      {o.startsAt && (
                        <span>
                          Starts {o.startsAt.toISOString().slice(0, 10)}
                        </span>
                      )}
                      {o.expiresAt && (
                        <span>
                          Expires {o.expiresAt.toISOString().slice(0, 10)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <OfferDialog
                      courseId={course.id}
                      mode="edit"
                      initial={{
                        id: o.id,
                        type: o.type,
                        valueInt: o.valueInt,
                        voucherCode: o.voucherCode,
                        maxRedemptions: o.maxRedemptions,
                        startsAt: o.startsAt
                          ? o.startsAt.toISOString()
                          : null,
                        expiresAt: o.expiresAt
                          ? o.expiresAt.toISOString()
                          : null,
                        isActive: o.isActive,
                      }}
                    />
                    <DeleteOfferButton offerId={o.id} courseId={course.id} />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

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
