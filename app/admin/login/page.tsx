"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    setLoading(false);
    if (!response.ok) { setError("Email or password is incorrect."); return; }
    router.push("/admin"); router.refresh();
  }

  return <main className="flex min-h-screen items-center justify-center bg-paper px-5"><div className="w-full max-w-sm"><p className="mb-3 text-[10px] uppercase tracking-editorial text-muted">Private workspace</p><h1 className="font-sans text-6xl font-normal tracking-[-0.05em]">Welcome back.</h1><form onSubmit={submit} className="mt-12 space-y-5"><label className="block"><span className="mb-2 block text-[10px] uppercase tracking-editorial text-muted">Email</span><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full border-b border-line bg-transparent py-3 text-sm outline-none focus:border-ink" /></label><label className="block"><span className="mb-2 block text-[10px] uppercase tracking-editorial text-muted">Password</span><input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full border-b border-line bg-transparent py-3 text-sm outline-none focus:border-ink" /></label>{error && <p className="text-xs text-red-600">{error}</p>}<button disabled={loading} className="mt-5 w-full bg-ink px-5 py-4 text-[10px] uppercase tracking-editorial text-paper disabled:opacity-50">{loading ? "Signing in…" : "Sign in"}</button></form></div></main>;
}
