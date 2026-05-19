import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getStudentSnapshot } from "@/lib/student";
import { StudentSidebar } from "@/components/euro/student-sidebar";

export const dynamic = "force-dynamic";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireRole("student");
  const snap = await getStudentSnapshot(auth.userId);
  if (!snap) redirect("/sign-in");

  return (
    <div
      className="flex min-h-screen"
      style={{ background: "var(--ed-bg)" }}
    >
      <StudentSidebar
        name={snap.fullName}
        studentCode={snap.studentCode}
        points={snap.pointsBalance}
        activeCourses={snap.counts.activeCourses}
        completed={snap.counts.completed}
      />
      <main className="flex-1 overflow-x-hidden px-8 py-8">{children}</main>
    </div>
  );
}
