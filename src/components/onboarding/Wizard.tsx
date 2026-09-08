"use client";

import { useState } from "react";
import Link from "next/link";
import { JourneySidebar } from "./JourneySidebar";
import { Section } from "./Section";
import { TextField, SelectField, FileField, CheckboxField } from "./fields";
import { AGE_RANGES, COUNTRIES, ID_DOCUMENT_TYPES, ADDRESS_PROOF_TYPES, STEPS } from "./data";
import { IconCheck, IconLock } from "./icons";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Errors = Record<string, string>;

interface Form {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirm: string;
  ageRange: string;
  country: string;
  acceptTerms: boolean;
  acceptRisk: boolean;
  idType: string;
  idFile?: string;
  addressType: string;
  addressFile?: string;
}

const EMPTY: Form = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirm: "",
  ageRange: "",
  country: "",
  acceptTerms: false,
  acceptRisk: false,
  idType: "",
  addressType: "",
};

const HEADINGS = [
  { title: "Create your account", sub: "Set up your profile and trading preferences in minutes." },
  { title: "Verify your identity", sub: "Complete KYC so we can activate your account securely." },
  { title: "Fund & start trading", sub: "Confirm your purchase and receive your account credentials." },
];

/**
 * Three-step onboarding wizard.
 *
 * State is held in the component and nothing is persisted — the API routes that
 * would validate the order, create the user and store KYC documents are
 * deliberately out of scope. Each step validates on Continue so the flow can be
 * exercised end to end.
 */
export function Wizard({ orderNumber }: { orderNumber: string }) {
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(1);
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState(false);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => (e[k] ? { ...e, [k]: "" } : e));
  };

  /** Which sections of the current step are filled in — drives the tick badges. */
  const complete: Record<string, boolean> = {
    account: Boolean(
      form.firstName && form.lastName && EMAIL_RE.test(form.email) && form.password.length >= 8 &&
        form.password === form.confirm && form.ageRange && form.country,
    ),
    documents: form.acceptTerms && form.acceptRisk,
    identity: Boolean(form.idType && form.idFile),
    address: Boolean(form.addressType && form.addressFile),
    payment: true,
  };

  function validate(): boolean {
    const e: Errors = {};

    if (step === 0) {
      if (form.firstName.trim().length < 2) e.firstName = "Enter your first name.";
      if (form.lastName.trim().length < 2) e.lastName = "Enter your last name.";
      if (!EMAIL_RE.test(form.email.trim())) e.email = "Enter a valid email address.";
      if (form.password.length < 8) e.password = "Use at least 8 characters.";
      if (form.password !== form.confirm) e.confirm = "Passwords do not match.";
      if (!form.ageRange) e.ageRange = "Select your age range.";
      if (!form.country) e.country = "Select your country.";
      if (!form.acceptTerms) e.acceptTerms = "You must accept the terms to continue.";
      if (!form.acceptRisk) e.acceptRisk = "You must acknowledge the risk disclosure.";
    }

    if (step === 1) {
      if (!form.idType) e.idType = "Choose a document type.";
      if (!form.idFile) e.idFile = "Upload your identity document.";
      if (!form.addressType) e.addressType = "Choose a document type.";
      if (!form.addressFile) e.addressFile = "Upload your proof of address.";
    }

    setErrors(e);

    // Reveal the first section that has an error, so the message is on screen.
    if (Object.keys(e).length) {
      const inSecond =
        (step === 0 && (e.acceptTerms || e.acceptRisk) && !e.firstName && !e.lastName && !e.email) ||
        (step === 1 && (e.addressType || e.addressFile) && !e.idType && !e.idFile);
      setOpen(inSecond ? 2 : 1);
      return false;
    }
    return true;
  }

  function next() {
    if (!validate()) return;
    if (step === STEPS.length - 1) {
      setDone(true);
      return;
    }
    setStep((s) => s + 1);
    setOpen(1);
  }

  function back() {
    setErrors({});
    setStep((s) => Math.max(0, s - 1));
    setOpen(1);
  }

  const toggle = (n: number) => setOpen((o) => (o === n ? 0 : n));

  if (done) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--l-red)] p-4 text-white">
          <IconCheck />
        </span>
        <h1 className="mt-6 text-[clamp(1.6rem,4vw,2.2rem)] font-extrabold tracking-[-0.02em] text-[var(--l-ink)]">
          You&rsquo;re all set
        </h1>
        <p className="mt-3 text-[14.5px] leading-relaxed text-[var(--l-body)]">
          Order <span className="nums font-semibold text-[var(--l-ink)]">{orderNumber}</span> has been
          redeemed. Your credentials are on their way to{" "}
          <span className="font-semibold text-[var(--l-ink)]">{form.email}</span>.
        </p>
        <Link
          href="/login"
          className="l-cta mt-8 inline-block rounded-xl px-7 py-3.5 text-[14px] font-bold"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  const heading = HEADINGS[step];

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr] lg:gap-12">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <JourneySidebar current={step} />
      </div>

      <div>
        <p className="l-serif text-[15px] text-[var(--l-body)]">
          Step {step + 1} of {STEPS.length}
        </p>
        <h1 className="mt-1.5 text-[clamp(1.6rem,4vw,2.2rem)] leading-tight font-extrabold tracking-[-0.025em] text-[var(--l-ink)]">
          {heading.title}
        </h1>
        <p className="mt-2 text-[14px] text-[var(--l-body)]">{heading.sub}</p>

        <div className="mt-7 space-y-4">
          {step === 0 && (
            <>
              <Section
                index={1}
                title="Account information"
                complete={complete.account}
                open={open === 1}
                onToggle={() => toggle(1)}
              >
                <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                  <TextField
                    label="First name"
                    required
                    autoComplete="given-name"
                    placeholder="Enter your first name"
                    value={form.firstName}
                    error={errors.firstName}
                    onChange={(e) => set("firstName", e.target.value)}
                  />
                  <TextField
                    label="Last name"
                    required
                    autoComplete="family-name"
                    placeholder="Enter your last name"
                    value={form.lastName}
                    error={errors.lastName}
                    onChange={(e) => set("lastName", e.target.value)}
                  />
                  <TextField
                    className="sm:col-span-2"
                    label="Email address"
                    required
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    hint="Must match the email used for the purchase."
                    value={form.email}
                    error={errors.email}
                    onChange={(e) => set("email", e.target.value)}
                  />
                  <TextField
                    label="Password"
                    required
                    type="password"
                    autoComplete="new-password"
                    placeholder="Create a password"
                    value={form.password}
                    error={errors.password}
                    onChange={(e) => set("password", e.target.value)}
                  />
                  <TextField
                    label="Confirm password"
                    required
                    type="password"
                    autoComplete="new-password"
                    placeholder="Confirm your password"
                    value={form.confirm}
                    error={errors.confirm}
                    onChange={(e) => set("confirm", e.target.value)}
                  />
                  <SelectField
                    label="Age"
                    required
                    value={form.ageRange}
                    error={errors.ageRange}
                    onChange={(e) => set("ageRange", e.target.value)}
                  >
                    <option value="">Select your age range</option>
                    {AGE_RANGES.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField
                    className="sm:col-span-2"
                    label="Country of residence"
                    required
                    value={form.country}
                    error={errors.country}
                    onChange={(e) => set("country", e.target.value)}
                  >
                    <option value="">Select your country</option>
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </SelectField>
                </div>
              </Section>

              <Section
                index={2}
                title="Documents"
                complete={complete.documents}
                open={open === 2}
                onToggle={() => toggle(2)}
              >
                <div className="space-y-5">
                  <CheckboxField
                    checked={form.acceptTerms}
                    error={errors.acceptTerms}
                    onChange={(v) => set("acceptTerms", v)}
                    label={
                      <>
                        I have read and accept the <span className="font-semibold text-[var(--l-ink)]">Terms of Service</span> and{" "}
                        <span className="font-semibold text-[var(--l-ink)]">Privacy Policy</span>.
                      </>
                    }
                  />
                  <CheckboxField
                    checked={form.acceptRisk}
                    error={errors.acceptRisk}
                    onChange={(v) => set("acceptRisk", v)}
                    label={
                      <>
                        I understand that evaluation accounts are simulated and that futures trading
                        carries substantial risk of loss.
                      </>
                    }
                  />
                </div>
              </Section>
            </>
          )}

          {step === 1 && (
            <>
              <Section
                index={1}
                title="Identity Documents"
                complete={complete.identity}
                open={open === 1}
                onToggle={() => toggle(1)}
              >
                <div className="space-y-5">
                  <SelectField
                    label="Document type"
                    required
                    value={form.idType}
                    error={errors.idType}
                    onChange={(e) => set("idType", e.target.value)}
                  >
                    <option value="">Select a document</option>
                    {ID_DOCUMENT_TYPES.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </SelectField>
                  <FileField
                    label="Upload document"
                    required
                    fileName={form.idFile}
                    error={errors.idFile}
                    onFile={(n) => set("idFile", n)}
                    hint="Photo page, in colour, all four corners visible."
                  />
                </div>
              </Section>

              <Section
                index={2}
                title="Proof of Address"
                complete={complete.address}
                open={open === 2}
                onToggle={() => toggle(2)}
              >
                <div className="space-y-5">
                  <SelectField
                    label="Document type"
                    required
                    value={form.addressType}
                    error={errors.addressType}
                    onChange={(e) => set("addressType", e.target.value)}
                  >
                    <option value="">Select a document</option>
                    {ADDRESS_PROOF_TYPES.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </SelectField>
                  <FileField
                    label="Upload document"
                    required
                    fileName={form.addressFile}
                    error={errors.addressFile}
                    onFile={(n) => set("addressFile", n)}
                    hint="Issued within the last 3 months and showing your full address."
                  />
                </div>
              </Section>
            </>
          )}

          {step === 2 && (
            <>
              <Section index={1} title="Payment" complete open={open === 1} onToggle={() => toggle(1)}>
                <div className="rounded-xl border border-[var(--l-line)] bg-[var(--l-paper-2)] p-5">
                  <p className="flex items-center gap-2 text-[12px] font-bold tracking-[0.1em] text-[var(--l-body)] uppercase">
                    <span className="h-3.5 w-3.5 text-[var(--l-blue-500)]">
                      <IconLock />
                    </span>
                    Purchase confirmed
                  </p>

                  <dl className="mt-4 space-y-3">
                    {[
                      ["Order number", orderNumber],
                      ["Billed to", form.email || "—"],
                      ["Status", "Paid"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between gap-4">
                        <dt className="text-[13px] text-[var(--l-body)]">{k}</dt>
                        <dd className="nums text-[13px] font-bold text-[var(--l-ink)]">{v}</dd>
                      </div>
                    ))}
                  </dl>

                  <p className="mt-4 border-t border-[var(--l-line)] pt-4 text-[12.5px] leading-relaxed text-[var(--l-body)]">
                    Your membership fee was taken at checkout. Nothing further is charged here.
                  </p>
                </div>
              </Section>

              <Section
                index={2}
                title="Launch Platform"
                open={open === 2}
                onToggle={() => toggle(2)}
              >
                <p className="text-[13.5px] leading-relaxed text-[var(--l-body)]">
                  Completing onboarding redeems order{" "}
                  <span className="nums font-semibold text-[var(--l-ink)]">{orderNumber}</span>, creates
                  your trading account and emails your credentials. An order can only be redeemed once.
                </p>
              </Section>
            </>
          )}
        </div>

        <div className="mt-8 flex items-center justify-between gap-4 border-t border-[var(--l-line)] pt-7">
          <button
            type="button"
            onClick={back}
            disabled={step === 0}
            className="rounded-lg border border-[var(--l-line)] px-5 py-2.5 text-[13.5px] font-semibold text-[var(--l-ink)] transition-colors hover:bg-[var(--l-paper-2)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Back
          </button>

          <button type="button" onClick={next} className="l-cta rounded-lg px-6 py-2.5 text-[13.5px] font-bold">
            {step === STEPS.length - 1 ? "Complete onboarding" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
