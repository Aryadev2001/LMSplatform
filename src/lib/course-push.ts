import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db/client";
import { programs, modules, lessons, coursePushHistory, tenants } from "@/db/schema";

/**
 * Master-course push.
 *
 * A master course has `isMasterCourse=true` and `tenantId=NULL` (lives in the
 * EDT catalog, above tenants). Pushing deep-clones program → modules →
 * lessons into a tenant with `sourceCourseId` pointing back at the master.
 *
 * Tenant-editable on a pushed copy: price, publish status, tierUnlockEligible.
 * Everything structural (name/description/modules/lessons) is owned by the
 * master and overwritten on every Sync — the tenant's price/status survive.
 */

async function cloneStructure(masterId: string, copyId: string) {
  const mods = await db
    .select()
    .from(modules)
    .where(eq(modules.courseId, masterId));

  for (const m of mods) {
    const [newMod] = await db
      .insert(modules)
      .values({
        courseId: copyId,
        title: m.title,
        description: m.description,
        orderIndex: m.orderIndex,
      })
      .returning({ id: modules.id });

    const ls = await db.select().from(lessons).where(eq(lessons.moduleId, m.id));
    if (ls.length > 0) {
      await db.insert(lessons).values(
        ls.map((l) => ({
          moduleId: newMod.id,
          title: l.title,
          videoUrl: l.videoUrl,
          durationSeconds: l.durationSeconds,
          resources: l.resources,
          orderIndex: l.orderIndex,
        })),
      );
    }
  }
}

/** Deep-clone an existing course into a NEW master (tenantId NULL). */
export async function promoteToMaster(sourceCourseId: string): Promise<string> {
  const [src] = await db
    .select()
    .from(programs)
    .where(eq(programs.id, sourceCourseId))
    .limit(1);
  if (!src) throw new Error("Source course not found");
  if (src.isMasterCourse) return src.id;

  const slug = src.slug ? `${src.slug}-master` : null;
  const [master] = await db
    .insert(programs)
    .values({
      slug,
      name: src.name,
      tagline: src.tagline,
      description: src.description,
      priceCents: src.priceCents,
      currency: src.currency,
      durationMonths: src.durationMonths,
      tier: src.tier,
      type: src.type,
      badgeColor: src.badgeColor,
      status: "draft",
      requiresApplication: src.requiresApplication,
      isActive: true,
      tenantId: null,
      isMasterCourse: true,
      tierUnlockEligible: src.tierUnlockEligible,
    })
    .returning({ id: programs.id });

  await cloneStructure(sourceCourseId, master.id);
  return master.id;
}

function copySlug(baseSlug: string | null, tenantSlug: string): string | null {
  return baseSlug ? `${baseSlug}-${tenantSlug}` : null;
}

/**
 * Push (or re-sync) a master into one tenant. If the tenant already has a
 * copy of this master, its structure is rebuilt from the master while its
 * price / status / tierUnlockEligible are preserved.
 */
export async function pushMasterToTenant(params: {
  masterId: string;
  tenantId: string;
  pushedByUserId: string | null;
}): Promise<{ copyId: string; synced: boolean }> {
  const { masterId, tenantId, pushedByUserId } = params;

  const [master] = await db
    .select()
    .from(programs)
    .where(and(eq(programs.id, masterId), eq(programs.isMasterCourse, true)))
    .limit(1);
  if (!master) throw new Error("Master course not found");

  const [tenant] = await db
    .select({ slug: tenants.slug })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  if (!tenant) throw new Error("Tenant not found");

  const [existing] = await db
    .select()
    .from(programs)
    .where(and(eq(programs.sourceCourseId, masterId), eq(programs.tenantId, tenantId)))
    .limit(1);

  if (existing) {
    // SYNC: overwrite structure, preserve tenant-owned commercial fields.
    await db
      .update(programs)
      .set({
        name: master.name,
        tagline: master.tagline,
        description: master.description,
        durationMonths: master.durationMonths,
        tier: master.tier,
        type: master.type,
        badgeColor: master.badgeColor,
        requiresApplication: master.requiresApplication,
        updatedAt: new Date(),
        // preserved: priceCents, status, tierUnlockEligible, slug
      })
      .where(eq(programs.id, existing.id));

    // Rebuild structure (cascade deletes lessons via modules FK).
    await db.delete(modules).where(eq(modules.courseId, existing.id));
    await cloneStructure(masterId, existing.id);

    await db
      .update(coursePushHistory)
      .set({ syncedAt: new Date(), pushedById: pushedByUserId })
      .where(
        and(
          eq(coursePushHistory.masterCourseId, masterId),
          eq(coursePushHistory.targetTenantId, tenantId),
        ),
      );

    return { copyId: existing.id, synced: true };
  }

  // FRESH PUSH: deep-clone into the tenant.
  const [copy] = await db
    .insert(programs)
    .values({
      slug: copySlug(master.slug, tenant.slug),
      name: master.name,
      tagline: master.tagline,
      description: master.description,
      priceCents: master.priceCents,
      currency: master.currency,
      durationMonths: master.durationMonths,
      tier: master.tier,
      type: master.type,
      badgeColor: master.badgeColor,
      status: "draft",
      requiresApplication: master.requiresApplication,
      isActive: true,
      tenantId,
      isMasterCourse: false,
      sourceCourseId: masterId,
      tierUnlockEligible: master.tierUnlockEligible,
    })
    .returning({ id: programs.id });

  await cloneStructure(masterId, copy.id);

  await db.insert(coursePushHistory).values({
    masterCourseId: masterId,
    targetTenantId: tenantId,
    pushedById: pushedByUserId,
    copyCourseId: copy.id,
  });

  return { copyId: copy.id, synced: false };
}

/** Re-sync a master into every tenant that already has a copy. */
export async function syncMasterToAllTenants(params: {
  masterId: string;
  pushedByUserId: string | null;
}): Promise<{ tenants: number }> {
  const copies = await db
    .select({ tenantId: programs.tenantId })
    .from(programs)
    .where(
      and(eq(programs.sourceCourseId, params.masterId), isNotNull(programs.tenantId)),
    );

  let n = 0;
  for (const c of copies) {
    if (!c.tenantId) continue;
    await pushMasterToTenant({
      masterId: params.masterId,
      tenantId: c.tenantId,
      pushedByUserId: params.pushedByUserId,
    });
    n += 1;
  }
  return { tenants: n };
}
