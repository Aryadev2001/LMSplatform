import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import {
  ArrowLeft,
  Clock,
  Layers,
  Hash,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { db } from "@/db/client";
import { exams, examQuestions, modules, programs } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { requireTenantId } from "@/lib/tenant";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExamDialog, DeleteExamButton } from "../../exam-dialog";
import {
  QuestionsEditor,
  type QuestionRow,
} from "./questions-editor";

export const dynamic = "force-dynamic";

interface OptionShape {
  label: string;
  isCorrect: boolean;
}

function normaliseOptions(raw: unknown): OptionShape[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((o) => {
      if (!o || typeof o !== "object") return null;
      const r = o as Record<string, unknown>;
      const label = typeof r.label === "string" ? r.label : "";
      const isCorrect = r.isCorrect === true;
      return { label, isCorrect };
    })
    .filter((o): o is OptionShape => o !== null);
}

export default async function ExamEditorPage({
  params,
}: {
  params: Promise<{ id: string; examId: string }>;
}) {
  await requireRole("admin");
  const tenantId = await requireTenantId();
  const { id: courseId, examId } = await params;

  // Course must belong to the caller's tenant (acceptance #6).
  const [course] = await db
    .select({ id: programs.id, name: programs.name })
    .from(programs)
    .where(and(eq(programs.id, courseId), eq(programs.tenantId, tenantId)))
    .limit(1);
  if (!course) notFound();

  const [exam] = await db
    .select({
      id: exams.id,
      title: exams.title,
      moduleId: exams.moduleId,
      durationMinutes: exams.durationMinutes,
      totalMarks: exams.totalMarks,
      passingMarks: exams.passingMarks,
      isActive: exams.isActive,
    })
    .from(exams)
    .where(
      and(
        eq(exams.id, examId),
        eq(exams.programId, courseId),
        eq(exams.tenantId, tenantId),
      ),
    )
    .limit(1);
  if (!exam) notFound();

  const [moduleRows, questionRows] = await Promise.all([
    db
      .select({ id: modules.id, title: modules.title })
      .from(modules)
      .where(eq(modules.courseId, courseId))
      .orderBy(asc(modules.orderIndex)),
    db
      .select({
        id: examQuestions.id,
        question: examQuestions.question,
        options: examQuestions.options,
        marks: examQuestions.marks,
        orderIndex: examQuestions.orderIndex,
      })
      .from(examQuestions)
      .where(eq(examQuestions.examId, examId))
      .orderBy(asc(examQuestions.orderIndex)),
  ]);

  const moduleLabel = exam.moduleId
    ? `Module · ${moduleRows.find((m) => m.id === exam.moduleId)?.title ?? "—"}`
    : "Course-level final";

  const questions: QuestionRow[] = questionRows.map((q) => ({
    id: q.id,
    question: q.question,
    options: normaliseOptions(q.options),
    marks: q.marks,
    orderIndex: q.orderIndex,
  }));

  const passable = exam.totalMarks >= exam.passingMarks;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href={`/admin/programs/${courseId}`}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to course
      </Link>

      <PageHeader
        eyebrow={`— ${course.name}`}
        title={exam.title}
        description={`${questions.length} question${
          questions.length === 1 ? "" : "s"
        } · ${exam.totalMarks} total marks · ${exam.durationMinutes} minutes`}
        actions={
          <div className="flex items-center gap-1">
            <ExamDialog
              courseId={courseId}
              modules={moduleRows.map((m) => ({ id: m.id, title: m.title }))}
              mode="edit"
              initial={{
                id: exam.id,
                title: exam.title,
                moduleId: exam.moduleId,
                durationMinutes: exam.durationMinutes,
                passingMarks: exam.passingMarks,
                isActive: exam.isActive,
              }}
            />
            <DeleteExamButton examId={exam.id} courseId={courseId} />
          </div>
        }
      />

      {/* Exam meta card */}
      <Card className="grid gap-3 border-none bg-card p-5 shadow-card sm:grid-cols-4">
        <Meta
          icon={Layers}
          label="Scope"
          value={moduleLabel}
        />
        <Meta
          icon={Clock}
          label="Duration"
          value={`${exam.durationMinutes} min`}
        />
        <Meta
          icon={Hash}
          label="Total marks"
          value={String(exam.totalMarks)}
        />
        <Meta
          icon={passable ? CheckCircle2 : XCircle}
          label="Passing"
          value={`${exam.passingMarks}${
            !passable ? " ⚠ below total" : ""
          }`}
        />
        <div className="sm:col-span-4">
          {exam.isActive ? (
            <Badge variant="default" className="font-normal">
              Active — students can attempt
            </Badge>
          ) : (
            <Badge variant="secondary" className="font-normal">
              Draft — not visible to students
            </Badge>
          )}
        </div>
      </Card>

      <QuestionsEditor
        examId={exam.id}
        courseId={courseId}
        questions={questions}
      />
    </div>
  );
}

function Meta({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
        <Icon className="size-3" /> {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold">{value}</div>
    </div>
  );
}
