"use client";

import { useState, useTransition } from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  Phone,
  ShieldCheck,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { persistVerifiedPhone } from "./actions";

type Step = "idle" | "sent" | "verified";

interface Props {
  /** Current value from the students row (verified or self-reported). */
  initialPhone: string;
  /** Whether the existing phone has been verified via Clerk. */
  initialVerified: boolean;
  /** Called by parent when the verified phone changes — keeps the parent
   *  form's `phone` state in sync. */
  onChange: (phone: string, verified: boolean) => void;
}

/**
 * Phone OTP verification widget. Uses Clerk's frontend SDK to add the
 * phone number to the current user, send a 6-digit SMS code, and attempt
 * verification. On success, the verified number is persisted to the
 * `students` row + `students.phone_verified_at` via a server action.
 *
 * Graceful when Clerk phone auth isn't enabled: surfaces a clear inline
 * error so the user knows the platform-team has to flip the Clerk
 * dashboard toggle, rather than failing silently.
 */
export function PhoneVerification({ initialPhone, initialVerified, onChange }: Props) {
  const { user, isLoaded } = useUser();
  const [phone, setPhone] = useState(initialPhone);
  const [code, setCode] = useState("");
  const [step, setStep] = useState<Step>(initialVerified ? "verified" : "idle");
  const [pending, startTransition] = useTransition();
  const [phoneNumberId, setPhoneNumberId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pre-populate from Clerk if the user already verified this number in a
  // prior session — that supersedes anything in our DB.
  // (Computed once on mount; re-renders pick up the verified-from-DB state.)

  async function sendCode() {
    setErrorMsg(null);
    if (!isLoaded || !user) {
      setErrorMsg("Loading your account…");
      return;
    }
    const trimmed = phone.trim().replace(/\s+/g, "");
    if (trimmed.length < 6) {
      setErrorMsg("Enter a valid mobile number including country code (e.g. +91…).");
      return;
    }
    try {
      // If Clerk already has a (possibly unverified) phone matching this,
      // re-use it instead of creating duplicates.
      let pn = user.phoneNumbers.find((p) => p.phoneNumber === trimmed);
      if (!pn) {
        pn = await user.createPhoneNumber({ phoneNumber: trimmed });
      }
      await pn.prepareVerification();
      setPhoneNumberId(pn.id);
      setStep("sent");
      toast.success(`6-digit code sent to ${trimmed}`);
    } catch (e: unknown) {
      const msg = errorMessage(e);
      // Common Clerk failure modes get specific messages so the user can
      // act, not just stare at "An error occurred."
      if (/phone.*number.*not.*allowed/i.test(msg) || /sms.*not.*enabled/i.test(msg)) {
        setErrorMsg(
          "Phone-based verification isn't enabled on this Clerk instance yet. The platform team needs to toggle 'Phone number' on under User & Authentication → Email, Phone, Username in the Clerk dashboard.",
        );
        return;
      }
      if (/already.*exists/i.test(msg)) {
        setErrorMsg(
          "That number is already on another account on this platform. Use a different number or sign in with the original account.",
        );
        return;
      }
      setErrorMsg(`Could not send the code: ${msg}`);
    }
  }

  async function verifyCode() {
    setErrorMsg(null);
    if (!isLoaded || !user) {
      setErrorMsg("Loading your account…");
      return;
    }
    const trimmedCode = code.replace(/\D/g, "");
    if (trimmedCode.length < 4) {
      setErrorMsg("Enter the 6-digit code from your SMS.");
      return;
    }
    const pn = phoneNumberId
      ? user.phoneNumbers.find((p) => p.id === phoneNumberId)
      : null;
    if (!pn) {
      setErrorMsg("Verification session expired — tap 'Send code' to start again.");
      setStep("idle");
      return;
    }
    try {
      const result = await pn.attemptVerification({ code: trimmedCode });
      if (result.verification.status !== "verified") {
        setErrorMsg("Code didn't match. Check the SMS and try again.");
        return;
      }
      // Best-effort: mark this number as the primary on the Clerk user
      // so notifications + future support land on the right line.
      try {
        await user.update({ primaryPhoneNumberId: pn.id });
      } catch {
        /* not fatal — verification still counts */
      }
      // Persist to our DB (students.phone + phone_verified_at). The action
      // re-checks Clerk's verification state server-side so this can't be
      // spoofed by skipping the OTP step.
      startTransition(async () => {
        const r = await persistVerifiedPhone(pn.phoneNumber);
        if (!r.success) {
          setErrorMsg(r.error);
          return;
        }
        setStep("verified");
        onChange(pn.phoneNumber, true);
        toast.success("Mobile number verified");
      });
    } catch (e: unknown) {
      const msg = errorMessage(e);
      if (/incorrect/i.test(msg) || /wrong.*code/i.test(msg)) {
        setErrorMsg("Code didn't match. Check the SMS and try again.");
        return;
      }
      if (/expired/i.test(msg)) {
        setErrorMsg("That code has expired. Tap 'Resend' for a fresh one.");
        return;
      }
      setErrorMsg(`Could not verify: ${msg}`);
    }
  }

  function resetToIdle() {
    setStep("idle");
    setCode("");
    setPhoneNumberId(null);
    setErrorMsg(null);
    onChange(phone, false);
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">Mobile number *</Label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          type="tel"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            if (step !== "idle") resetToIdle();
            onChange(e.target.value, false);
          }}
          placeholder="+91 98765 43210"
          className="h-10 rounded-xl"
          disabled={step === "sent" || pending}
        />
        {step === "verified" ? (
          <span
            className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-bold"
            style={{
              borderColor: "rgba(141,198,63,0.4)",
              background: "rgba(141,198,63,0.10)",
              color: "var(--ed-green-dark, #4f7f1c)",
            }}
          >
            <ShieldCheck className="size-3.5" /> Verified
          </span>
        ) : step === "sent" ? (
          <Button
            type="button"
            variant="outline"
            onClick={sendCode}
            disabled={pending}
            className="h-10 rounded-xl"
          >
            <RefreshCw className="size-4" />
            Resend code
          </Button>
        ) : (
          <Button
            type="button"
            onClick={sendCode}
            disabled={pending}
            className="h-10 rounded-xl"
          >
            <Phone className="size-4" />
            Send code
          </Button>
        )}
      </div>

      {step === "sent" && (
        <div className="space-y-2 rounded-xl border bg-secondary/20 p-3">
          <Label className="text-xs font-medium">
            Enter the 6-digit code we sent to {phone}
          </Label>
          <div className="flex items-center gap-2">
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className="h-10 rounded-xl text-center font-mono text-base tracking-[0.4em]"
            />
            <Button
              type="button"
              onClick={verifyCode}
              disabled={pending || code.length < 4}
              className="h-10 rounded-xl"
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
              Verify
            </Button>
          </div>
          <button
            type="button"
            onClick={resetToIdle}
            className="text-[11px] font-semibold text-muted-foreground underline-offset-2 hover:underline"
          >
            Cancel — use a different number
          </button>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] leading-snug text-red-700"
        >
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <span className="break-words">{errorMsg}</span>
        </div>
      )}

      {step !== "verified" && (
        <p className="text-[11px] text-muted-foreground">
          We use this to send order receipts and (later, with your consent)
          course updates. Required before paid checkout.
        </p>
      )}
    </div>
  );
}

function errorMessage(e: unknown): string {
  if (e && typeof e === "object" && "errors" in e) {
    const errs = (e as { errors?: Array<{ message?: string; longMessage?: string }> }).errors;
    if (Array.isArray(errs) && errs[0]) {
      return errs[0].longMessage ?? errs[0].message ?? String(e);
    }
  }
  if (e instanceof Error) return e.message;
  return String(e);
}
