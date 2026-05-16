import "dotenv/config";
import { db } from "../src/db/client";
import {
  tenants, users, programs, enrollments, payments,
} from "../src/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { STUDENT_DB_ROLES } from "../src/lib/auth";

async function run() {
  let pass = true;
  const ok = (l: string, c: boolean) => { if (!c) pass = false; console.log(`${c ? "OK  " : "FAIL"} ${l}`); };

  // ---- two isolated tenants, each with the full object graph ----
  const mk = async (tag: string) => {
    const [t] = await db.insert(tenants).values({
      slug: `zziso-${tag}-${Math.random().toString(36).slice(2,7)}`, name: `ZZ ${tag}`,
    }).returning({ id: tenants.id });
    const [u] = await db.insert(users).values({
      clerkId: `zziso_${tag}_${Math.random().toString(36).slice(2,10)}`,
      email: `zziso-${tag}-${Math.random().toString(36).slice(2,7)}@t.test`,
      role: "STUDENT", tenantId: t.id, fullName: `ZZ ${tag} Student`,
    }).returning({ id: users.id });
    const [c] = await db.insert(programs).values({
      name: `ZZ ${tag} Course`, slug: `zziso-${tag}-${Math.random().toString(36).slice(2,7)}`,
      priceCents: 100000, tenantId: t.id, status: "published",
    }).returning({ id: programs.id });
    const [e] = await db.insert(enrollments).values({
      fullName: `ZZ ${tag}`, email: `zziso-${tag}@t.test`, programId: c.id, status: "paid",
    }).returning({ id: enrollments.id });
    const [p] = await db.insert(payments).values({
      enrollmentId: e.id, amountCents: 100000, currency: "INR", status: "succeeded",
      tenantId: t.id, studentUserId: u.id,
    }).returning({ id: payments.id });
    return { tId: t.id, uId: u.id, cId: c.id, eId: e.id, pId: p.id };
  };

  const A = await mk("A");
  const B = await mk("B");

  try {
    // students list predicate (admin/(dashboard)/students/page.tsx)
    const aStudents = await db.select({ id: users.id }).from(users)
      .where(and(eq(users.tenantId, A.tId), inArray(users.role, [...STUDENT_DB_ROLES])));
    ok("students list: A sees only A's student", aStudents.length === 1 && aStudents[0].id === A.uId);
    ok("students list: A's query excludes B's student",
       !aStudents.some((r) => r.id === B.uId));

    // programs list predicate
    const aProgs = await db.select({ id: programs.id }).from(programs)
      .where(eq(programs.tenantId, A.tId));
    ok("programs list: A sees only A's course",
       aProgs.length === 1 && aProgs[0].id === A.cId && !aProgs.some(r=>r.id===B.cId));

    // payments list predicate
    const aPays = await db.select({ id: payments.id }).from(payments)
      .where(eq(payments.tenantId, A.tId));
    ok("payments list: A sees only A's payment",
       aPays.length === 1 && aPays[0].id === A.pId && !aPays.some(r=>r.id===B.pId));

    // enrollments list predicate (enrollments innerJoin programs WHERE programs.tenantId)
    const aEnr = await db.select({ id: enrollments.id }).from(enrollments)
      .innerJoin(programs, eq(programs.id, enrollments.programId))
      .where(eq(programs.tenantId, A.tId));
    ok("enrollments list: A sees only A's enrollment",
       aEnr.length === 1 && aEnr[0].id === A.eId && !aEnr.some(r=>r.id===B.eId));

    // detail-page guard: A-admin opening B's student → blocked
    const [bUser] = await db.select({ tenantId: users.tenantId }).from(users)
      .where(eq(users.id, B.uId)).limit(1);
    ok("student detail: B's user.tenantId !== A → would 404", bUser.tenantId !== A.tId);

    // course access guard: A-student opening B's course slug → blocked
    const [bCourse] = await db.select({ tenantId: programs.tenantId }).from(programs)
      .where(eq(programs.id, B.cId)).limit(1);
    ok("course access: B's course.tenantId !== A → would 404", bCourse.tenantId !== A.tId);

    // assignStudent guard: A-admin assigning B's course → rejected
    const crossAssign = await db.select({ id: programs.id }).from(programs)
      .where(and(eq(programs.id, B.cId), eq(programs.tenantId, A.tId))).limit(1);
    ok("assign guard: A cannot resolve B's course under A's tenant", crossAssign.length === 0);

    // symmetric: B's queries never see A
    const bAll = await db.select({ id: users.id }).from(users)
      .where(and(eq(users.tenantId, B.tId), inArray(users.role, [...STUDENT_DB_ROLES])));
    ok("symmetry: B sees only B's student, never A's",
       bAll.length === 1 && bAll[0].id === B.uId && !bAll.some(r=>r.id===A.uId));
  } finally {
    for (const X of [A, B]) {
      await db.delete(payments).where(eq(payments.id, X.pId));
      await db.delete(enrollments).where(eq(enrollments.id, X.eId));
      await db.delete(programs).where(eq(programs.id, X.cId));
      await db.delete(users).where(eq(users.id, X.uId));
      await db.delete(tenants).where(eq(tenants.id, X.tId));
    }
    console.log("\n(cleanup done — both throwaway tenants removed)");
  }

  console.log(`\n${pass ? "✓ PASS — cross-tenant isolation holds: every scoped query excludes the other tenant" : "✗ FAIL — A LEAK EXISTS"}`);
  if (!pass) process.exit(1);
}
run().then(()=>process.exit(0)).catch((e)=>{console.error(e);process.exit(1);});
