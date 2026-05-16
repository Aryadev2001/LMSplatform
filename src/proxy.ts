import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/enroll(.*)",
  "/diagnostic(.*)",
  "/courses(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/forbidden",
  "/admin/login(.*)",
  "/api/webhooks(.*)",
  "/api/health",
  "/api/bootstrap-admin",
  // Upload route does its OWN admin check inside the handler. Excluded from
  // the middleware redirect so a streamed POST body is never intercepted.
  "/api/blob/upload",
]);

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

  const { userId, redirectToSignIn } = await auth();

  // Admin section has its own dedicated sign-in
  if (isAdminRoute(req) && !userId) {
    const adminLogin = new URL("/admin/login", req.url);
    adminLogin.searchParams.set("redirect_url", req.url);
    return NextResponse.redirect(adminLogin);
  }

  // All other protected routes: just require authentication.
  // Authoritative role enforcement happens in each section's layout via
  // requireRole() (DB-backed), so it works even without Clerk session-token
  // customization.
  if (!userId) return redirectToSignIn({ returnBackUrl: req.url });
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
