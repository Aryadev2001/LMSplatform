/**
 * Drip / scheduled module release.
 *
 * A module unlocks at the LATER of its two optional conditions:
 *  - releaseAt: an absolute date (cohort-style), and/or
 *  - unlockAfterDays: N days after the student enrolled (self-paced).
 * Both null → available immediately.
 */
export interface ModuleDrip {
  releaseAt: Date | null;
  unlockAfterDays: number | null;
}

const DAY_MS = 86_400_000;

/** When the module becomes available, or null if it's available now. */
export function moduleUnlockAt(m: ModuleDrip, enrolledAt: Date | null): Date | null {
  const times: number[] = [];
  if (m.releaseAt) times.push(m.releaseAt.getTime());
  if (m.unlockAfterDays != null && enrolledAt) {
    times.push(enrolledAt.getTime() + m.unlockAfterDays * DAY_MS);
  }
  if (times.length === 0) return null;
  return new Date(Math.max(...times));
}

export function isModuleLocked(
  m: ModuleDrip,
  enrolledAt: Date | null,
  now: Date = new Date(),
): boolean {
  const at = moduleUnlockAt(m, enrolledAt);
  return at != null && at.getTime() > now.getTime();
}
