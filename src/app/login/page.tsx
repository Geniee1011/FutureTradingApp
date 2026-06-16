"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Icon } from "@/components/icons";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const login = useAuthStore((s) => s.login);
  const registered = params.get("registered");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? "Login failed.");
      return;
    }
    const next = params.get("next");
    const home = res.role === "admin" ? "/admin/traders" : "/dashboard";
    router.replace(next && !next.startsWith("/login") ? next : home);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {registered && (
        <div className="rounded-lg border border-long/40 bg-long/10 px-3 py-2 text-sm text-long">
          Account created — please sign in.
        </div>
      )}
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
        <PasswordInput
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </Field>

      {error && (
        <div className="rounded-lg border border-short/40 bg-short/10 px-3 py-2 text-sm text-short">{error}</div>
      )}

      <Button type="submit" size="lg" loading={loading} className="w-full">
        Sign in
      </Button>

      <div className="text-center text-sm text-muted">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Register
        </Link>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Icon name="logo" width={26} height={26} />
          </span>
          <h1 className="text-xl font-semibold">Trader Portal</h1>
          <p className="mt-1 text-sm text-muted">Sign in to access your trading dashboard</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-xl">
          <Suspense fallback={<div className="h-64" />}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-4 text-center text-xs text-muted-2">
          Protected area · Unauthorized access is monitored
        </p>
      </div>
    </div>
  );
}
