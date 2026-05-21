import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { tenants } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { requireTenantId } from "@/lib/tenant";
import { PageHeader } from "@/components/dashboard/page-header";
import { OnboardingWizard, type InitialOnboardingData } from "./wizard";

export const dynamic = "force-dynamic";

export const metadata = { title: "Partner setup — eurodigital.coach" };

type SocialKey =
  | "website"
  | "linkedin"
  | "twitter"
  | "instagram"
  | "facebook"
  | "youtube";

type Socials = Partial<Record<SocialKey, string>>;

function pickSocials(raw: unknown): Socials {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const out: Socials = {};
  const keys: SocialKey[] = [
    "website",
    "linkedin",
    "twitter",
    "instagram",
    "facebook",
    "youtube",
  ];
  for (const k of keys) {
    if (typeof r[k] === "string") out[k] = r[k] as string;
  }
  return out;
}

export default async function OnboardPage() {
  await requireRole("admin");
  const tenantId = await requireTenantId();

  const [row] = await db
    .select({
      businessLegalName: tenants.businessLegalName,
      businessRegNumber: tenants.businessRegNumber,
      businessRegDocUrl: tenants.businessRegDocUrl,
      businessAddressLine1: tenants.businessAddressLine1,
      businessAddressLine2: tenants.businessAddressLine2,
      businessCity: tenants.businessCity,
      businessState: tenants.businessState,
      businessPostalCode: tenants.businessPostalCode,
      businessCountry: tenants.businessCountry,
      businessPhone: tenants.businessPhone,
      businessFinancialInfo: tenants.businessFinancialInfo,
      companyProfile: tenants.companyProfile,
      companySocials: tenants.companySocials,
      ownerName: tenants.ownerName,
      ownerTitle: tenants.ownerTitle,
      ownerPhotoUrl: tenants.ownerPhotoUrl,
      ownerProfile: tenants.ownerProfile,
      ownerSocials: tenants.ownerSocials,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const fin = (row?.businessFinancialInfo ?? {}) as {
    annualRevenueRange?: string | null;
    taxId?: string | null;
    bankReference?: string | null;
  };

  const initial: InitialOnboardingData = {
    business: {
      legalName: row?.businessLegalName ?? "",
      regNumber: row?.businessRegNumber ?? "",
      regDocUrl: row?.businessRegDocUrl ?? "",
      addressLine1: row?.businessAddressLine1 ?? "",
      addressLine2: row?.businessAddressLine2 ?? "",
      city: row?.businessCity ?? "",
      state: row?.businessState ?? "",
      postalCode: row?.businessPostalCode ?? "",
      country: row?.businessCountry ?? "",
      phone: row?.businessPhone ?? "",
      annualRevenueRange: fin.annualRevenueRange ?? "",
      taxId: fin.taxId ?? "",
      bankReference: fin.bankReference ?? "",
    },
    branding: {
      companyProfile: row?.companyProfile ?? "",
      socials: pickSocials(row?.companySocials),
    },
    owner: {
      name: row?.ownerName ?? "",
      title: row?.ownerTitle ?? "",
      photoUrl: row?.ownerPhotoUrl ?? "",
      profile: row?.ownerProfile ?? "",
      socials: pickSocials(row?.ownerSocials),
    },
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Partner setup"
        description="Complete your partner profile so learners trust your storefront."
      />
      <OnboardingWizard initial={initial} />
    </div>
  );
}
