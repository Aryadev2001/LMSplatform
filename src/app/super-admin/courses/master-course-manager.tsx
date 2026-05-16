"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Sparkles, Upload, RefreshCw } from "lucide-react";
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
import {
  promoteCourseToMaster,
  pushMasterCourse,
  syncMasterCourse,
} from "../actions";

interface MasterRow {
  id: string;
  name: string;
  tier: string;
  status: string;
  copies: number;
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
                <div className="mt-1 flex gap-2">
                  <Badge variant="outline">{m.tier}</Badge>
                  <Badge variant="secondary">{m.copies} tenant copies</Badge>
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
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
