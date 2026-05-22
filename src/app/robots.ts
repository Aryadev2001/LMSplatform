import type { MetadataRoute } from "next";

/**
 * Public crawl policy. We let search engines index the marketing
 * surfaces (home, explore, course detail, institute storefronts) but
 * block everything else — auth pages, dashboards, internal APIs,
 * payment flows, and sub-routes that aren't useful in search results.
 */
export default function robots(): MetadataRoute.Robots {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "https://eurodigital.coach";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/explore", "/courses/", "/institute/", "/partner-program", "/legal/"],
        disallow: [
          "/sign-in",
          "/sign-up",
          "/post-login",
          "/onboarding",
          "/admin/",
          "/super-admin/",
          "/student/",
          "/checkout",
          "/cart",
          "/enroll",
          "/api/",
          "/forbidden",
          "/accept-invite",
          "/verify/",
          "/certificate/",
          "/invoice/",
          // Diagnostic surfaces are user-specific.
          "/diagnostic/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
