import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { db } from "@/db/client";
import {
  tenants,
  users,
  programs,
  payments,
  auditLogs,
  enrollments,
} from "@/db/schema";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  requireSuper,
  type SuperRole,
  STUDENT_DB_ROLES,
} from "@/lib/auth";
import { canWrite, canSeeFinancials } from "@/lib/super";
import { formatCurrency, formatDate } from "@/lib/format";
import { TenantEditForm } from "./tenant-edit-form";
import { OpenAsTenantButton } from "./open-as-tenant-button";

export const dynamic = "force-dynamic";

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const me = await requireSuper();
  const writable = canWrite(me.rawRole as SuperRole);

  const [t] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!t) notFound();

  const showMoney = canSeeFinancials(me.rawRole as SuperRole);

  const [[uc], [cc], [stuC], [freeC], [pubC], [rev], [enrC], courses, activity] =
    await Promise.all([
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(users)
        .where(eq(users.tenantId, tenantId)),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(programs)
        .where(eq(programs.tenantId, tenantId)),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(users)
        .where(
          and(
            eq(users.tenantId, tenantId),
            inArray(users.role, [...STUDENT_DB_ROLES]),
          ),
        ),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(programs)
        .where(
          and(eq(programs.tenantId, tenantId), eq(programs.priceCents, 0)),
        ),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(programs)
        .where(
          and(eq(programs.tenantId, tenantId), eq(programs.status, "published")),
        ),
      db
        .select({ s: sql<number>`coalesce(sum(amount_cents)::bigint, 0)` })
        .from(payments)
        .where(
          and(eq(payments.tenantId, tenantId), eq(payments.status, "succeeded")),
        ),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(enrollments)
        .innerJoin(programs, eq(enrollments.programId, programs.id))
        .where(eq(programs.tenantId, tenantId)),
      db
        .select({
          id: programs.id,
          name: programs.name,
          status: programs.status,
          priceCents: programs.priceCents,
          currency: programs.currency,
          isActive: programs.isActive,
          createdAt: programs.createdAt,
        })
        .from(programs)
        .where(eq(programs.tenantId, tenantId))
        .orderBy(desc(programs.createdAt))
        .limit(20),
      db
        .select({
          id: auditLogs.id,
          actorRole: auditLogs.actorRole,
          action: auditLogs.action,
          targetType: auditLogs.targetType,
          targetId: auditLogs.targetId,
          createdAt: auditLogs.createdAt,
          metadataJson: auditLogs.metadataJson,
        })
        .from(auditLogs)
        .where(
          or(
            inArray(
              auditLogs.actorUserId,
              db
                .select({ id: users.id })
                .from(users)
                .where(eq(users.tenantId, tenantId)),
            ),
            and(
              eq(auditLogs.targetType, "tenant"),
              eq(auditLogs.targetId, tenantId),
            ),
          ),
        )
        .orderBy(desc(auditLogs.createdAt))
        .limit(30),
    ]);

  return (
    <div>
      <Link
        href="/super-admin/tenants"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        All tenants
      </Link>

      <PageHeader
        eyebrow={`/${t.slug}`}
        title={t.name}
        description={`Created ${t.createdAt.toISOString().slice(0, 10)} · ${uc?.n ?? 0} users · ${cc?.n ?? 0} courses · tier ${t.tier}`}
        actions={
          <div className="flex items-center gap-3">
            <Badge variant="outline">{t.status}</Badge>
            <Badge variant="secondary" className="capitalize">
              {t.tier}
            </Badge>
            <OpenAsTenantButton tenantId={t.id} disabled={!writable} />
          </div>
        }
      />

      {/* Partner registration details — everything the partner filled in
          on /admin/partner/onboard, visible to super-admins for vetting. */}
      <PartnerRegistrationCard tenant={t} />


      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Tenant settings</CardTitle>
            </CardHeader>
            <CardContent>
              <TenantEditForm
                writable={writable}
                tenant={{
                  id: t.id,
                  name: t.name,
                  slug: t.slug,
                  status: t.status,
                  brandPrimaryColor: t.brandPrimaryColor,
                  brandSecondaryColor: t.brandSecondaryColor,
                  heroTagline: t.heroTagline ?? "",
                  referralEnabled: t.referralEnabled,
                  referralPointsPercent: t.referralPointsPercent,
                  referralRedeemMaxPercent: t.referralRedeemMaxPercent,
                  platformFeeBps: t.platformFeeBps,
                }}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Payment gateway</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {(() => {
                const rzp = !!t.razorpayKeyId && !!t.razorpayKeySecret;
                const stripe = !!t.stripePublishableKey && !!t.stripeSecretKey;
                const id = stripe
                  ? t.stripePublishableKey!
                  : rzp
                    ? t.razorpayKeyId!
                    : "";
                const masked =
                  id.length > 12 ? `${id.slice(0, 12)}…${id.slice(-4)}` : id;
                if (!rzp && !stripe) {
                  return (
                    <>
                      <Badge variant="outline">Not connected</Badge>
                      <p className="text-[11px] text-muted-foreground">
                        The tenant hasn&apos;t connected a payment gateway yet.
                        They do this from their own dashboard → Settings →
                        Payment gateway.
                      </p>
                    </>
                  );
                }
                return (
                  <>
                    <div className="flex flex-wrap gap-1.5">
                      {t.paymentProvider && (
                        <Badge variant="default" className="capitalize">
                          {t.paymentProvider} active
                        </Badge>
                      )}
                      {rzp && <Badge variant="secondary">Razorpay</Badge>}
                      {stripe && <Badge variant="secondary">Stripe</Badge>}
                    </div>
                    <p className="font-mono text-xs text-muted-foreground">{masked}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Secrets are encrypted and not visible here — supervision
                      only. The tenant manages their own keys.
                    </p>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Activity stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Students", value: String(stuC?.n ?? 0) },
          { label: "Courses", value: `${cc?.n ?? 0}${(freeC?.n ?? 0) > 0 ? ` (${freeC?.n} free)` : ""}` },
          { label: "Published", value: String(pubC?.n ?? 0) },
          { label: "Enrollments", value: String(enrC?.n ?? 0) },
          {
            label: "Revenue",
            value: showMoney
              ? formatCurrency(Number(rev?.s ?? 0), "INR")
              : "—",
          },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Courses */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">Courses ({cc?.n ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No courses yet.
                  </TableCell>
                </TableRow>
              )}
              {courses.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{c.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {c.priceCents === 0 ? (
                      <Badge variant="secondary">Free</Badge>
                    ) : (
                      formatCurrency(c.priceCents, c.currency)
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.isActive ? "default" : "outline"}>
                      {c.isActive ? "active" : "inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {formatDate(c.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent activity — everything this tenant's users did + super actions targeting them */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Actor role</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activity.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No activity recorded yet.
                  </TableCell>
                </TableRow>
              )}
              {activity.map((a) => {
                const meta = (a.metadataJson as Record<string, unknown> | null) ?? {};
                const detail = meta.name ?? meta.domain ?? meta.provider ?? "";
                return (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(a.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{a.actorRole}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{a.action}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {a.targetType}
                    </TableCell>
                    <TableCell className="line-clamp-1 max-w-xs text-xs text-muted-foreground">
                      {typeof detail === "string" ? detail : ""}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

interface RegistrationCardProps {
  tenant: typeof tenants.$inferSelect;
}

type SocialMap = {
  website?: string;
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  facebook?: string;
  youtube?: string;
};

function PartnerRegistrationCard({ tenant: t }: RegistrationCardProps) {
  const fin = (t.businessFinancialInfo ?? {}) as {
    annualRevenueRange?: string | null;
    taxId?: string | null;
    bankReference?: string | null;
  };
  const companySocials = (t.companySocials ?? {}) as SocialMap;
  const ownerSocials = (t.ownerSocials ?? {}) as SocialMap;
  const address = [
    t.businessAddressLine1,
    t.businessAddressLine2,
    [t.businessCity, t.businessState, t.businessPostalCode]
      .filter(Boolean)
      .join(", "),
    t.businessCountry,
  ]
    .filter(Boolean)
    .join(" · ");

  const hasAnything =
    t.businessLegalName ||
    t.businessAddressLine1 ||
    t.companyProfile ||
    t.ownerName ||
    t.businessRegDocUrl;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-sm">Partner registration</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasAnything ? (
          <p className="text-xs text-muted-foreground">
            The partner hasn&apos;t filled in their registration form yet.
            They do this from /admin/partner/onboard.
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            <RegSection title="Business">
              <RegRow label="Legal name" value={t.businessLegalName} />
              <RegRow label="Reg #" value={t.businessRegNumber} />
              <RegRow
                label="Reg doc"
                link={t.businessRegDocUrl}
                value={t.businessRegDocUrl ? "View document" : null}
              />
              <RegRow label="Address" value={address || null} />
              <RegRow label="Phone" value={t.businessPhone} />
              <RegRow label="Revenue range" value={fin.annualRevenueRange ?? null} />
              <RegRow label="Tax ID" value={fin.taxId ?? null} />
              <RegRow label="Bank ref" value={fin.bankReference ?? null} />
            </RegSection>

            <RegSection title="Branding">
              <RegRow
                label="Logo"
                link={t.logoUrl}
                value={t.logoUrl ? "View logo" : null}
              />
              <RegRow label="Primary color" value={t.brandPrimaryColor} />
              <RegRow label="Secondary color" value={t.brandSecondaryColor} />
              <RegRow label="Hero tagline" value={t.heroTagline} />
              <RegRow
                label="Company profile"
                value={t.companyProfile ?? null}
                multiline
              />
              <RegRow
                label="Website"
                link={companySocials.website}
                value={companySocials.website ?? null}
              />
              <RegRow
                label="LinkedIn"
                link={companySocials.linkedin}
                value={companySocials.linkedin ?? null}
              />
              <RegRow
                label="Other socials"
                value={
                  [
                    companySocials.twitter && "X",
                    companySocials.instagram && "Instagram",
                    companySocials.facebook && "Facebook",
                    companySocials.youtube && "YouTube",
                  ]
                    .filter(Boolean)
                    .join(" · ") || null
                }
              />
            </RegSection>

            <RegSection title="Owner">
              <RegRow
                label="Photo"
                link={t.ownerPhotoUrl}
                value={t.ownerPhotoUrl ? "View photo" : null}
              />
              <RegRow label="Name" value={t.ownerName} />
              <RegRow label="Title" value={t.ownerTitle} />
              <RegRow
                label="Profile"
                value={t.ownerProfile ?? null}
                multiline
              />
              <RegRow
                label="LinkedIn"
                link={ownerSocials.linkedin}
                value={ownerSocials.linkedin ?? null}
              />
              <RegRow
                label="Other socials"
                value={
                  [
                    ownerSocials.twitter && "X",
                    ownerSocials.instagram && "Instagram",
                    ownerSocials.facebook && "Facebook",
                    ownerSocials.youtube && "YouTube",
                    ownerSocials.website && "Website",
                  ]
                    .filter(Boolean)
                    .join(" · ") || null
                }
              />
            </RegSection>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RegSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </div>
      <dl className="space-y-1.5 text-sm">{children}</dl>
    </div>
  );
}

function RegRow({
  label,
  value,
  link,
  multiline,
}: {
  label: string;
  value: string | null | undefined;
  link?: string | null;
  multiline?: boolean;
}) {
  const has = !!value;
  return (
    <div className="grid grid-cols-[110px_1fr] gap-2 border-b py-1 last:border-b-0">
      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd
        className={`break-words text-xs ${has ? "text-foreground" : "text-muted-foreground"} ${multiline ? "whitespace-pre-wrap" : ""}`}
      >
        {has && link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline-offset-2 hover:underline"
          >
            {value}
          </a>
        ) : (
          value || "—"
        )}
      </dd>
    </div>
  );
}

