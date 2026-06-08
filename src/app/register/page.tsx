"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Field";
import { Icon } from "@/components/icons";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Client-side validation (the server validates again).
    if (name.trim().length < 2) return setError("Please enter your full name.");
    if (!EMAIL_RE.test(email.trim())) return setError("Please enter a valid email address.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords do not match.");

    setLoading(true);
    const res = await register(name, email, password);
    setLoading(false);

    if (!res.ok) {
      setError(res.error ?? "Registration failed.");
      return;
    }
    // Success → back to login with a confirmation flag.
    router.replace("/login?registered=1");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Icon name="logo" width={26} height={26} />
          </span>
          <h1 className="text-xl font-semibold">Create your account</h1>
          <p className="mt-1 text-sm text-muted">Open a Trader Portal account</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-xl">
          <form onSubmit={submit} className="space-y-4">
            <Field label="Full name">
              <Input
                autoComplete="name"
                placeholder="Jane Trader"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                autoComplete="username"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                autoComplete="new-password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>
            <Field label="Confirm password">
              <Input
                type="password"
                autoComplete="new-password"
                placeholder="Re-enter your password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </Field>

            {error && (
              <div className="rounded-lg border border-short/40 bg-short/10 px-3 py-2 text-sm text-short">{error}</div>
            )}

            <Button type="submit" size="lg" loading={loading} className="w-full">
              Create account
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
