/**
 * Next.js instrumentation hook — runs once per server start.
 *
 * Sentry SDK is intentionally NOT yet wired (no `@sentry/nextjs`
 * dependency installed) because it adds bundle size + needs a paid plan
 * or self-hosted endpoint to actually receive events. When you're ready
 * to enable production error reporting:
 *
 *   1. npm install @sentry/nextjs
 *   2. npx @sentry/wizard@latest -i nextjs  (this writes more config files)
 *   3. Set SENTRY_DSN in Vercel (Production + Preview scope)
 *   4. Uncomment the import + Sentry.init below
 *   5. Push to main — errors start landing in your Sentry project
 *
 * Keeping this file as a no-op now means Next's instrumentation hook is
 * picked up correctly (the build will warn if it's missing) without us
 * coupling to a specific provider before you've decided which one.
 */

export async function register() {
  // Uncomment to enable Sentry once installed + DSN set:
  //
  // const Sentry = await import("@sentry/nextjs");
  // Sentry.init({
  //   dsn: process.env.SENTRY_DSN,
  //   tracesSampleRate: 0.1,
  //   environment: process.env.VERCEL_ENV ?? "development",
  // });
}
