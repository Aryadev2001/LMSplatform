import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isAdminRole } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ALLOWED_PREFIXES = ["video/", "image/", "application/", "audio/"];

function fail(message: string, status: number) {
  console.error(`[blob/upload] ${status}: ${message}`);
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request): Promise<NextResponse> {
  // ---- 1. Auth: must be a signed-in admin ----
  let clerkUserId: string | null = null;
  try {
    const a = await auth();
    clerkUserId = a.userId;
  } catch {
    return fail("Auth context unavailable. Refresh and try again.", 401);
  }
  if (!clerkUserId) {
    return fail("You are not signed in. Sign in as an admin and retry.", 401);
  }

  const [dbUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.clerkId, clerkUserId))
    .limit(1);
  if (!dbUser || !isAdminRole(dbUser.role)) {
    return fail("This account is not an admin — uploads are admin-only.", 403);
  }

  // ---- 2. Validate request ----
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return fail("Storage is not configured (BLOB_READ_WRITE_TOKEN missing).", 500);
  }

  const filename = request.headers.get("x-filename");
  const contentType = request.headers.get("content-type") ?? "application/octet-stream";
  if (!filename) return fail("Missing x-filename header.", 400);
  if (!ALLOWED_PREFIXES.some((p) => contentType.startsWith(p))) {
    return fail(`Unsupported file type: ${contentType}`, 415);
  }

  // ---- 3. Buffer the body (sized → reliable, no multipart-stream issues) ----
  let bytes: Buffer;
  try {
    const ab = await request.arrayBuffer();
    bytes = Buffer.from(ab);
  } catch (e) {
    return fail(
      `Could not read the uploaded file: ${e instanceof Error ? e.message : "unknown"}`,
      400,
    );
  }
  if (bytes.byteLength === 0) return fail("The uploaded file is empty.", 400);

  // ---- 4. Store in Vercel Blob ----
  try {
    const blob = await put(filename, bytes, {
      access: "public",
      addRandomSuffix: true,
      contentType,
    });
    return NextResponse.json({
      url: blob.url,
      pathname: blob.pathname,
      size: bytes.byteLength,
    });
  } catch (e) {
    return fail(
      `Vercel Blob rejected the file: ${e instanceof Error ? e.message : "unknown error"}`,
      502,
    );
  }
}
