"use client";

import { FormEvent, useEffect, useState } from "react";

type AuditItem = { id: string; action: string; entityType: string | null; createdAt: string };

export function SecuritySettings() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [logs, setLogs] = useState<AuditItem[]>([]);

  useEffect(() => {
    fetch("/api/admin/audit?limit=8").then((response) => response.json()).then((data) => setLogs(data.logs ?? []));
  }, []);

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/admin/security/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setMessage(data.error ?? "Could not change password."); return; }
    window.location.href = "/admin/login";
  }

  async function logoutAll() {
    if (!window.confirm("Log out all admin sessions?")) return;
    const response = await fetch("/api/admin/security/logout-all", { method: "POST" });
    if (response.ok) window.location.href = "/admin/login";
  }

  return <section className="space-y-10 border-t border-line pt-8"><div><p className="text-[10px] uppercase tracking-editorial text-muted">Security</p><h2 className="mt-3 text-xl">Admin access</h2></div><form onSubmit={changePassword} className="grid max-w-3xl gap-5 md:grid-cols-2"><label className="block"><span className="mb-2 block text-[10px] uppercase tracking-editorial text-muted">Current password</span><input required type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="w-full border-b border-line bg-transparent py-3 text-sm outline-none focus:border-ink" /></label><label className="block"><span className="mb-2 block text-[10px] uppercase tracking-editorial text-muted">New password</span><input required minLength={12} type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="w-full border-b border-line bg-transparent py-3 text-sm outline-none focus:border-ink" /></label><div className="flex flex-wrap items-center gap-4 md:col-span-2"><button className="bg-ink px-5 py-3 text-[10px] uppercase tracking-editorial text-paper">Change password</button><button type="button" onClick={logoutAll} className="px-1 py-3 text-[10px] uppercase tracking-editorial text-muted underline underline-offset-4">Log out all sessions</button>{message && <span className="text-xs text-red-600">{message}</span>}</div></form><div className="max-w-3xl"><p className="text-[10px] uppercase tracking-editorial text-muted">Recent activity</p><div className="mt-3 divide-y divide-line border-y border-line">{logs.length ? logs.map((log) => <div key={log.id} className="flex flex-wrap justify-between gap-3 py-3 text-xs"><span>{log.action.replaceAll("_", " ")}</span><time className="text-muted">{new Date(log.createdAt).toLocaleString()}</time></div>) : <p className="py-4 text-xs text-muted">No activity recorded yet.</p>}</div></div></section>;
}
