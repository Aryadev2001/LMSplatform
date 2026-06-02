// Shared Clerk theme so /sign-in and /sign-up render as part of the
// eurodigital brand instead of default Clerk chrome. We render our own
// heading + tab switch, so Clerk's header/footer/navbar are hidden.

export const clerkAppearance = {
  variables: {
    colorPrimary: "#00aeef",
    colorText: "#0e1e2b",
    colorTextSecondary: "#6b7a8b",
    colorBackground: "#ffffff",
    colorInputText: "#0e1e2b",
    colorDanger: "#f43f5e",
    colorSuccess: "#6fa62a",
    borderRadius: "0.75rem",
    fontFamily: "inherit",
    fontSize: "0.95rem",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none border-0",
    card: "w-full bg-transparent shadow-none p-0 gap-5",
    header: "hidden",
    navbar: "hidden",
    navbarMobileMenuRow: "hidden",
    footer: "hidden",
    logoBox: "hidden",
    main: "gap-5",
    formButtonPrimary:
      "h-11 bg-[#00aeef] hover:bg-[#0091c7] text-white text-sm font-bold tracking-tight normal-case shadow-none transition-colors after:hidden",
    formFieldInput:
      "h-11 rounded-xl border border-[#e3e9f0] bg-white text-[#0e1e2b] focus:border-[#00aeef] focus:ring-4 focus:ring-[#00aeef]/15 transition-shadow",
    formFieldLabel: "text-[13px] font-semibold text-[#243447]",
    formFieldInputShowPasswordButton: "text-[#6b7a8b]",
    formFieldAction: "text-[#00aeef] font-semibold hover:text-[#0091c7]",
    formResendCodeLink: "text-[#00aeef] font-semibold hover:text-[#0091c7]",
    identityPreview: "rounded-xl border border-[#e3e9f0] bg-[#f5f8fb]",
    identityPreviewEditButton: "text-[#00aeef]",
    // Google OAuth is disabled for now (production custom credentials not yet
    // configured → "Authorization Error"). Hide the social buttons + the
    // "or" divider so only email sign-in shows. Re-enable by removing these
    // two "hidden" overrides once Google custom creds are set up in Clerk.
    socialButtons: "hidden",
    socialButtonsBlockButton: "hidden",
    socialButtonsBlockButtonText: "font-semibold",
    dividerRow: "hidden",
    dividerLine: "bg-[#e3e9f0]",
    dividerText: "text-[11px] uppercase tracking-widest text-[#6b7a8b]",
    otpCodeFieldInput:
      "rounded-lg border border-[#e3e9f0] focus:border-[#00aeef] focus:ring-4 focus:ring-[#00aeef]/15",
    formHeaderTitle: "hidden",
    formHeaderSubtitle: "hidden",
    alert: "rounded-xl",
    spinner: "text-[#00aeef]",
  },
  layout: {
    socialButtonsPlacement: "bottom",
    socialButtonsVariant: "blockButton",
    showOptionalFields: false,
  },
} as const;
