import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { students, users } from "@/db/schema";
import { requireRole, getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/page-header";
import { StudentProfileForm, type InitialProfile } from "./profile-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Your profile — eurodigital.coach" };

type PaymentMode = "card" | "upi" | "netbanking" | "wallet" | "";

interface PersonalShape {
  gender?: string;
  country?: string;
  city?: string;
  languages?: string;
  studentIdCard?: string;
}
interface ProfessionalShape {
  occupation?: string;
  company?: string;
  industry?: string;
  experienceYears?: number;
  linkedin?: string;
}
interface FinancialShape {
  incomeRange?: string;
  fundingSource?: string;
  billingAddress?: string;
  taxId?: string;
}

function pickObject<T extends object>(raw: unknown, fallback: T): T {
  if (raw && typeof raw === "object") return raw as T;
  return fallback;
}

export default async function StudentProfilePage() {
  await requireRole("student");
  const me = await getCurrentUser();
  if (!me) return null;

  const [u] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
    })
    .from(users)
    .where(eq(users.clerkId, me.userId))
    .limit(1);
  if (!u) return null;

  const [st] = await db
    .select()
    .from(students)
    .where(eq(students.userId, u.id))
    .limit(1);

  const initial: InitialProfile = {
    fullName: u.fullName ?? "",
    phone: st?.phone ?? "",
    dateOfBirth: st?.dateOfBirth ? String(st.dateOfBirth) : "",
    address: st?.address ?? "",
    personal: pickObject<PersonalShape>(st?.personalInfo, {}),
    professional: pickObject<ProfessionalShape>(st?.professionalInfo, {}),
    financial: pickObject<FinancialShape>(st?.financialInfo, {}),
    paymentModePreference: (st?.paymentModePreference ?? "") as PaymentMode,
    whatsappConsent: !!st?.whatsappConsent,
    termsAccepted: !!st?.termsAcceptedAt,
    disclaimerAccepted: !!st?.disclaimerAcceptedAt,
    complete: !!st?.profileCompletedAt,
    phoneVerified: !!st?.phoneVerifiedAt,
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Your profile"
        description="Personal, professional and billing info we use to enrol you in courses, issue certificates and send updates. Fill it in once — required for paid enrolments."
      />
      <StudentProfileForm initial={initial} />
    </div>
  );
}
