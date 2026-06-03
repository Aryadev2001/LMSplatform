import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { lessons, modules, programs, enrollments, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { isProxyableVideo } from "@/lib/lesson-media";
import { isModuleLocked } from "@/lib/drip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Enrollment statuses that grant course access (matches the rest of the app).
const ENROLLED_STATUSES = ["paid", "account_created", "assigned"] as const;

/**
 * Auth + enrollment-gated video stream. The lesson's real (public) Blob URL is
 * resolved server-side and proxied here, so it never reaches the browser —
 * a shared `/api/lessons/<id>/stream` link is useless without the viewer's
 * session, and access is re-checked on every request (revocable). Range
 * requests are forwarded so seeking/scrubbing works.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ lessonId: string }> },
): Promise<Response> {
  const { lessonId } = await params;

  const { userId } = await auth();
  if (!userId) return new NextResponse("Sign in required.", { status: 401 });

  // lesson → module → program (course + owning tenant)
  const [row] = await db
    .select({
      videoUrl: lessons.videoUrl,
      programId: modules.courseId,
      tenantId: programs.tenantId,
      releaseAt: modules.releaseAt,
      unlockAfterDays: modules.unlockAfterDays,
    })
    .from(lessons)
    .innerJoin(modules, eq(modules.id, lessons.moduleId))
    .innerJoin(programs, eq(programs.id, modules.courseId))
    .where(eq(lessons.id, lessonId))
    .limit(1);

  if (!row || !row.videoUrl) return new NextResponse("Not found.", { status: 404 });
  if (!isProxyableVideo(row.videoUrl)) {
    // External embeds (YouTube/Vimeo/Loom) are rendered directly, not proxied.
    return new NextResponse("Not a streamable file.", { status: 400 });
  }

  // ---- Authorization: super (any), tenant-admin of THIS course (preview),
  // or a student with an active enrollment in the course. ----
  const me = await getCurrentUser();
  let allowed = false;
  if (me?.role === "super") {
    allowed = true;
  } else if (me?.role === "admin" && me.tenantId && me.tenantId === row.tenantId) {
    allowed = true;
  } else {
    const [dbUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1);
    if (dbUser) {
      const [enr] = await db
        .select({ id: enrollments.id, createdAt: enrollments.createdAt })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.userId, dbUser.id),
            eq(enrollments.programId, row.programId),
            inArray(enrollments.status, [...ENROLLED_STATUSES]),
          ),
        )
        .orderBy(asc(enrollments.createdAt))
        .limit(1);
      if (enr) {
        // Drip gate — a not-yet-released module's video stays locked even if
        // the lesson UUID is known (the UI hiding alone is not enforcement).
        if (
          isModuleLocked(
            { releaseAt: row.releaseAt, unlockAfterDays: row.unlockAfterDays },
            enr.createdAt ?? null,
          )
        ) {
          return new NextResponse("This lesson isn't available yet.", { status: 403 });
        }
        allowed = true;
      }
    }
  }
  if (!allowed) return new NextResponse("You're not enrolled in this course.", { status: 403 });

  // ---- Proxy (stream) the upstream file, forwarding Range for seeking. ----
  const range = req.headers.get("range");
  let upstream: Response;
  try {
    upstream = await fetch(row.videoUrl, {
      headers: range ? { Range: range } : {},
      cache: "no-store",
    });
  } catch {
    return new NextResponse("Upstream fetch failed.", { status: 502 });
  }
  if (!upstream.ok && upstream.status !== 206) {
    return new NextResponse("Upstream error.", { status: 502 });
  }

  const headers = new Headers();
  for (const h of [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "etag",
    "last-modified",
  ]) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  // Never let a CDN/browser cache the protected stream under a shareable key.
  headers.set("cache-control", "private, no-store");
  headers.set("content-disposition", "inline");

  return new NextResponse(upstream.body, { status: upstream.status, headers });
}
