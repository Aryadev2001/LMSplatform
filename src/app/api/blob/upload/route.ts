import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isAdminRole } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Client uploads go BROWSER → Vercel Blob directly. This route only mints a
// short-lived, scoped upload token (a tiny JSON request), so it is NOT
// affected by the 4.5 MB serverless request-body limit that previously made
// >4.5 MB videos fail with HTTP 413 FUNCTION_PAYLOAD_TOO_LARGE. Large videos
// (multi-GB) now upload reliably.
const ALLOWED_CONTENT_TYPES = [
  "video/*",
  "image/*",
  "audio/*",
  "application/pdf",
];

export async function POST(request: Request): Promise<NextResponse> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Storage is not configured (BLOB_READ_WRITE_TOKEN missing)." },
      { status: 500 },
    );
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      // Auth runs here, on the token-mint request, BEFORE any bytes move.
      // Only a signed-in admin can obtain an upload token.
      onBeforeGenerateToken: async () => {
        const { userId } = await auth();
        if (!userId) {
          throw new Error("You are not signed in. Sign in as an admin and retry.");
        }
        const [dbUser] = await db
          .select({ role: users.role })
          .from(users)
          .where(eq(users.clerkId, userId))
          .limit(1);
        if (!dbUser || !isAdminRole(dbUser.role)) {
          throw new Error("This account is not an admin — uploads are admin-only.");
        }
        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          addRandomSuffix: true,
          // Generous cap so large lesson videos succeed; well under Blob's
          // 5 TB object limit. (5 GB.)
          maximumSizeInBytes: 5 * 1024 * 1024 * 1024,
        };
      },
      // Fired by Blob after the browser finishes uploading. Not reachable on
      // localhost (no public callback URL) — we don't rely on it; the client
      // gets the final URL from the upload() return value.
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(jsonResponse);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed.";
    console.error(`[blob/upload] ${message}`);
    // 400 so the client surfaces the (auth/validation) reason inline.
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
