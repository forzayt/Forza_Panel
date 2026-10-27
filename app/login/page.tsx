"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/tailgrids/core/button";
import { Card } from "@/components/tailgrids/core/card";
import { Input } from "@/components/tailgrids/core/input";
import { Label } from "@/components/tailgrids/core/label";
import { toast } from "sonner";

type Mode = "loading" | "setup" | "login";

interface StatusResponse {
  configured: boolean;
  authenticated: boolean;
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("loading");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/status", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`API responded ${res.status}`);
        return res.json() as Promise<StatusResponse>;
      })
      .then((json) => {
        if (cancelled) return;
        if (json.authenticated) {
          router.replace("/");
          return;
        }
        setMode(json.configured ? "login" : "setup");
      })
      .catch(() => {
        // If status cannot be read, fall back to the sign-in form.
        if (!cancelled) setMode("login");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mode === "loading" || isSubmitting) return;

    if (!username.trim()) {
      toast.error("Username is required.");
      return;
    }
    if (mode === "setup") {
      if (password.length < 4) {
        toast.error("Password must be at least 4 characters.");
        return;
      }
      if (password !== confirm) {
        toast.error("Passwords do not match.");
        return;
      }
    } else if (!password) {
      toast.error("Password is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(mode === "setup" ? "/api/admin/setup" : "/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;

      if (!res.ok) {
        toast.error(json?.error ?? `Request failed (${res.status}).`);
        return;
      }

      toast.success(mode === "setup" ? "Admin account created." : "Signed in.");
      router.replace("/");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background-gray-secondary_alt_2 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-2xl font-semibold tracking-tight text-text-primary">
            ForzaPanel
          </p>
          <p className="mt-1 text-sm text-text-tertiary">
            {mode === "setup"
              ? "Create the admin account to get started"
              : mode === "login"
                ? "Sign in to manage this host"
                : "Checking admin configuration…"}
          </p>
        </div>

        <Card>
          {mode === "loading" ? (
            <p className="py-6 text-center text-sm text-text-tertiary">Loading…</p>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1">
                <Label htmlFor="admin-username">Username</Label>
                <Input
                  id="admin-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoComplete="username"
                  spellCheck={false}
                  autoFocus
                  className="w-full"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="admin-password">Password</Label>
                <Input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === "setup" ? "new-password" : "current-password"}
                  className="w-full"
                />
              </div>

              {mode === "setup" && (
                <div className="space-y-1">
                  <Label htmlFor="admin-confirm">Confirm password</Label>
                  <Input
                    id="admin-confirm"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="w-full"
                  />
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                appearance="fill"
                isDisabled={isSubmitting}
                className="w-full bg-orange-500 text-white hover:bg-orange-400"
              >
                {isSubmitting
                  ? mode === "setup"
                    ? "Creating…"
                    : "Signing in…"
                  : mode === "setup"
                    ? "Create admin account"
                    : "Sign in"}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </main>
  );
}
