import type { Metadata, Viewport } from "next";
import { Inter, Poppins, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { TenantBrandStyle } from "@/components/tenant-brand-style";
import { NavProgress } from "@/components/nav-progress";
import { PageLoader } from "@/components/page-loader";
import { PWARegister } from "@/components/pwa-register";
import { Suspense } from "react";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Euro Digital Technologies — Business Diagnosis & Clarity Program",
  description:
    "Take the free Business X-Ray: a 7-layer scan that scores your business 0–100 and shows you exactly what to fix first. By Euro Digital Technologies (eurodigital.coach).",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "EuroDigital", statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#1AADE0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        // Minimal, safe theming only. Let Clerk's well-tested default
        // elements render (including the OTP segmented input) — we just
        // match colors, radius, and font. No !important hacks, no element
        // overrides that fight Clerk's internal markup.
        variables: {
          colorPrimary: "#18181b",
          colorText: "#18181b",
          colorTextSecondary: "#71717a",
          colorBackground: "#ffffff",
          colorInputBackground: "#ffffff",
          colorInputText: "#18181b",
          colorDanger: "#dc2626",
          borderRadius: "0.625rem",
          fontFamily: "var(--font-geist-sans)",
        },
        elements: {
          // Only neutralize Clerk's own card chrome so it sits cleanly
          // inside our page layout. Nothing that touches inputs/OTP.
          cardBox: "shadow-none",
          card: "shadow-none border-0 bg-transparent",
          footer: "hidden",
        },
      }}
    >
      <html
        lang="en"
        suppressHydrationWarning
        className={`${inter.variable} ${jetbrainsMono.variable} ${poppins.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col bg-background text-foreground">
          {/* Global page preloader (pencil loader) — shows on first load and
              briefly on each route change, then fades out. Uses usePathname
              only, so it needs no Suspense boundary. */}
          <PageLoader />
          {/* Suspense around the nav-progress because it reads
              useSearchParams() which would otherwise opt-in the whole tree
              to client-side bailout on routes without their own boundary. */}
          <Suspense fallback={null}>
            <NavProgress />
          </Suspense>
          <PWARegister />
          <TenantBrandStyle />
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
            <TooltipProvider delay={150}>
              {children}
              <Toaster richColors closeButton position="top-right" theme="light" />
            </TooltipProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
