import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  parseTenantHost,
  portalForHost,
  TENANT_SLUG_HEADER,
  TENANT_DOMAIN_HEADER,
} from "@/lib/tenant";

const isPublicRoute = createRouteMatcher([
  "/",
  "/enroll(.*)",
  "/diagnostic(.*)",
  "/courses(.*)",
  "/institute(.*)",
  "/explore(.*)",
  "/about(.*)",
  "/pricing(.*)",
  "/for-institutes(.*)",
  "/contact(.*)",
  "/help(.*)",
  "/legal(.*)",
  "/cart(.*)",
  "/verify(.*)",
  "/certificate(.*)",
  "/partner/onboard(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/accept-invite(.*)",
  "/forbidden",
  "/admin/login(.*)",
  "/api/webhooks(.*)",
  "/api/cron(.*)",
  "/api/health",
  "/api/bootstrap-admin",
  // Upload route does its OWN admin check inside the handler. Excluded from
  // the middleware redirect so a streamed POST body is never intercepted.
  "/api/blob/upload",
]);

// /super-admin uses the same dedicated console login as /admin.
const isAdminRoute = createRouteMatcher(["/admin(.*)", "/super-admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  // Resolve tenant CONTEXT from the host (pure string parse, no DB) and pass
  // it downstream as request headers. The DB lookup happens in the cached
  // server helper getTenantFromRequest(), keeping middleware fast.
  const parsed = parseTenantHost(req.headers.get("host"));
  const slug = parsed.kind === "subdomain" ? parsed.slug : "";
  const domain = parsed.kind === "custom" ? parsed.domain : "";

  const pass = () => {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set(TENANT_SLUG_HEADER, slug);
    requestHeaders.set(TENANT_DOMAIN_HEADER, domain);
    return NextResponse.next({ request: { headers: requestHeaders } });
  };

  // Portal subdomains: partner.<root> serves the tenant dashboard, and
  // student.<root> serves the student dashboard. Only the bare root is
  // redirected to the section entry — deeper paths flow normally so the
  // whole dashboard lives under that domain (auth handled as usual).
  const portal = portalForHost(req.headers.get("host"));
  if (portal && req.nextUrl.pathname === "/") {
    return NextResponse.redirect(
      new URL(portal === "partner" ? "/admin" : "/student", req.url),
    );
  }

  if (isPublicRoute(req)) return pass();

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

  return pass();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
