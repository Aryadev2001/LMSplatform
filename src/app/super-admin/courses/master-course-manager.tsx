"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  Sparkles,
  Upload,
  RefreshCw,
  GraduationCap,
  X,
  Building2,
  IndianRupee,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createMasterCourse,
  promoteCourseToMaster,
  pushMasterCourse,
  syncMasterCourse,
  publishMasterCourseToStudents,
  unpublishMasterCourseFromStudents,
  sellMasterCourseToInstitute,
} from "../actions";

interface MasterRow {
  id: string;
  name: string;
  tier: string;
  status: string;
  copies: number;
  studentPublished?: boolean;
}
interface NamedRow {
  id: string;
  name: string;
  slug?: string;
}
interface PushedRow {
  masterId: string;
  tenantId: string;
  synced: boolean;
}

export function MasterCourseManager({
  writable,
  masters,
  promotable,
  tenants,
  pushed,
}: {
  writable: boolean;
  masters: MasterRow[];
  promotable: NamedRow[];
  tenants: NamedRow[];
  pushed: PushedRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [promoteId, setPromoteId] = useState<string>("");
  const [targets, setTargets] = useState<Record<string, Set<string>>>({});
  const [studentPrice, setStudentPrice] = useState<Record<string, string>>({});
  const [sellTo, setSellTo] = useState<Record<string, string>>({});
  const [sellPrice, setSellPrice] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: "",
    tagline: "",
    priceRupees: "",
    durationMonths: "3",
    tier: "low" as "low" | "mid" | "high",
    type: "one_time" as "one_time" | "subscription",
  });

  function run(fn: () => Promise<{ success: boolean; error?: string }>, okMsg: string) {
    startTransition(async () => {
      const r = await fn();
      if (r.success) {
        toast.success(okMsg);
        router.refresh();
      } else {
        toast.error(r.error ?? "Failed");
      }
    });
  }

  function toggleTarget(masterId: string, tenantId: string) {
    setTargets((prev) => {
      const set = new Set(prev[masterId] ?? []);
      if (set.has(tenantId)) set.delete(tenantId);
      else set.add(tenantId);
      return { ...prev, [masterId]: set };
    });
  }

  const hasCopy = (masterId: string, tenantId: string) =>
    pushed.some((p) => p.masterId === masterId && p.tenantId === tenantId);

  return (
    <div className="space-y-6">
      {/* Create a new master course (e.g. AI) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Create a master course</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. AI for Everyone"
                disabled={!writable}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tagline (optional)</Label>
              <Input
                value={form.tagline}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tagline: e.target.value }))
                }
                placeholder="One-line summary"
                disabled={!writable}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Price (₹)</Label>
              <Input
                type="number"
                min={0}
                value={form.priceRupees}
                onChange={(e) =>
                  setForm((f) => ({ ...f, priceRupees: e.target.value }))
                }
                placeholder="0 for free"
                disabled={!writable}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Duration (months)</Label>
              <Input
                type="number"
                min={1}
                value={form.durationMonths}
                onChange={(e) =>
                  setForm((f) => ({ ...f, durationMonths: e.target.value }))
                }
                disabled={!writable}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tier</Label>
              <Select
                value={form.tier}
                onValueChange={(v) =>
                  v && setForm((f) => ({ ...f, tier: v as typeof f.tier }))
                }
                disabled={!writable}
              >
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Beginner</SelectItem>
                  <SelectItem value="mid">Intermediate</SelectItem>
                  <SelectItem value="high">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) =>
                  v && setForm((f) => ({ ...f, type: v as typeof f.type }))
                }
                disabled={!writable}
              >
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">One-time</SelectItem>
                  <SelectItem value="subscription">Subscription</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              disabled={
                !writable || pending || form.name.trim().length < 3
              }
              onClick={() =>
                run(async () => {
                  const r = await createMasterCourse({
                    name: form.name,
                    tagline: form.tagline,
                    priceRupees: form.priceRupees || 0,
                    durationMonths: form.durationMonths || 3,
                    tier: form.tier,
                    type: form.type,
                  });
                  if (r.success)
                    setForm({
                      name: "",
                      tagline: "",
                      priceRupees: "",
                      durationMonths: "3",
                      tier: "low",
                      type: "one_time",
                    });
                  return r;
                }, "Master course created — push it to tenants below")
              }
              className="rounded-xl"
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Create master course
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Created as a draft master. Push it to tenants below; each tenant
            sets their price and publishes it to go live for students (who
            can pay or redeem reward points at checkout).
          </p>
        </CardContent>
      </Card>

      {/* Promote */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Promote a course to master</CardTitle>
        </CardHeader>
        <CardContent>
          {promotable.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No authored courses available to promote.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <Select value={promoteId} onValueChange={(v) => v && setPromoteId(v)}>
                <SelectTrigger className="h-10 w-72 rounded-xl">
                  <SelectValue placeholder="Choose a course" />
                </SelectTrigger>
                <SelectContent>
                  {promotable.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                disabled={!writable || pending || !promoteId}
                onClick={() =>
                  run(
                    () => promoteCourseToMaster({ courseId: promoteId }),
                    "Master course created",
                  )
                }
                className="rounded-xl"
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                Promote to master
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Masters list */}
      {masters.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No master courses yet.
          </CardContent>
        </Card>
      ) : (
        masters.map((m) => (
          <Card key={m.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm">{m.name}</CardTitle>
                <div className="mt-1 flex flex-wrap gap-2">
                  <Badge variant="outline">{m.tier}</Badge>
                  <Badge variant="secondary">{m.copies} tenant copies</Badge>
                  {m.studentPublished && (
                    <Badge
                      className="border-transparent font-normal text-white"
                      style={{ background: "var(--ed-green-dark)" }}
                    >
                      <GraduationCap className="size-3" /> Live for students
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                disabled={!writable || pending || m.copies === 0}
                onClick={() =>
                  run(() => syncMasterCourse({ masterId: m.id }), "Synced to all tenants")
                }
                className="rounded-xl"
              >
                <RefreshCw className="size-3.5" />
                Sync all
              </Button>
            </CardHeader>
            <CardContent>
              {/* Publish straight to students (AI Catalog) */}
              <div
                className="mb-4 rounded-xl border p-3"
                style={{ borderColor: "var(--ed-line)", background: "rgba(141,198,63,0.06)" }}
              >
                <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <GraduationCap className="size-3.5" /> Publish to students (AI Catalog)
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">₹</span>
                    <Input
                      type="number"
                      min={0}
                      value={studentPrice[m.id] ?? ""}
                      onChange={(e) =>
                        setStudentPrice((p) => ({ ...p, [m.id]: e.target.value }))
                      }
                      placeholder="Price (0 = free)"
                      disabled={!writable}
                      className="h-9 w-40 rounded-xl"
                    />
                  </div>
                  <Button
                    disabled={!writable || pending}
                    onClick={() =>
                      run(
                        () =>
                          publishMasterCourseToStudents({
                            masterId: m.id,
                            priceRupees: studentPrice[m.id] || 0,
                          }),
                        m.studentPublished
                          ? "Updated — live in every student's AI Catalog"
                          : "Published — now in every student's AI Catalog",
                      )
                    }
                    className="h-9 rounded-xl text-white"
                    style={{ background: "var(--ed-gradient)" }}
                  >
                    {pending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <GraduationCap className="size-4" />
                    )}
                    {m.studentPublished ? "Update price" : "Publish to students"}
                  </Button>
                  {m.studentPublished && (
                    <Button
                      variant="outline"
                      disabled={!writable || pending}
                      onClick={() =>
                        run(
                          () => unpublishMasterCourseFromStudents({ masterId: m.id }),
                          "Removed from the student catalog",
                        )
                      }
                      className="h-9 rounded-xl"
                    >
                      <X className="size-3.5" /> Remove
                    </Button>
                  )}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Appears in every student&apos;s AI Catalog, purchasable at this
                  price (test-mode until Stripe is connected). Kept out of the
                  public institute marketplace.
                </p>
              </div>

              <div className="mb-3 text-[10px] uppercase tracking-widest text-muted-foreground">
                Push to tenants
              </div>
              {tenants.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active tenants.</p>
              ) : (
                <>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {tenants.map((t) => {
                      const already = hasCopy(m.id, t.id);
                      const checked = targets[m.id]?.has(t.id) ?? false;
                      return (
                        <label
                          key={t.id}
                          className="flex items-center gap-2 rounded-lg border border-black/5 px-3 py-2 text-sm"
                        >
                          <Checkbox
                            checked={checked}
                            disabled={!writable}
                            onCheckedChange={() => toggleTarget(m.id, t.id)}
                          />
                          <span className="flex-1">{t.name}</span>
                          {already && (
                            <Badge variant="secondary" className="text-[10px]">
                              has copy
                            </Badge>
                          )}
                        </label>
                      );
                    })}
                  </div>
                  <Button
                    disabled={
                      !writable || pending || !(targets[m.id]?.size)
                    }
                    onClick={() =>
                      run(
                        () =>
                          pushMasterCourse({
                            masterId: m.id,
                            tenantIds: Array.from(targets[m.id] ?? []),
                          }),
                        "Pushed to selected tenants",
                      )
                    }
                    className="mt-3 rounded-xl"
                  >
                    {pending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Upload className="size-4" />
                    )}
                    Push to {targets[m.id]?.size ?? 0} selected
                  </Button>
                </>
              )}

              {/* Sell to ONE institute (interim B2B invoice) */}
              {tenants.length > 0 && (
                <div
                  className="mt-4 rounded-xl border p-3"
                  style={{ borderColor: "var(--ed-line)", background: "rgba(0,174,239,0.05)" }}
                >
                  <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <Building2 className="size-3.5" /> Sell to an institute
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={sellTo[m.id] ?? ""}
                      onValueChange={(v) => v && setSellTo((s) => ({ ...s, [m.id]: v }))}
                    >
                      <SelectTrigger className="h-9 w-56 rounded-xl">
                        <SelectValue placeholder="Choose an institute" />
                      </SelectTrigger>
                      <SelectContent>
                        {tenants.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1">
                      <IndianRupee className="size-3.5 text-muted-foreground" />
                      <Input
                        type="number"
                        min={1}
                        value={sellPrice[m.id] ?? ""}
                        onChange={(e) =>
                          setSellPrice((p) => ({ ...p, [m.id]: e.target.value }))
                        }
                        placeholder="Price"
                        disabled={!writable}
                        className="h-9 w-32 rounded-xl"
                      />
                    </div>
                    <Button
                      disabled={
                        !writable || pending || !sellTo[m.id] || !sellPrice[m.id]
                      }
                      onClick={() =>
                        run(
                          () =>
                            sellMasterCourseToInstitute({
                              masterId: m.id,
                              tenantId: sellTo[m.id],
                              priceRupees: sellPrice[m.id],
                            }),
                          "Sold — invoice recorded (pending until paid)",
                        )
                      }
                      className="h-9 rounded-xl"
                    >
                      {pending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Building2 className="size-4" />
                      )}
                      Sell
                    </Button>
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Assigns the course to the institute now and records a pending
                    invoice (settle it in the Institute invoices list, or
                    automatically once Stripe is connected).
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
