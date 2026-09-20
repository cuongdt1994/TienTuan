"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderKanban, Tags, Images, Settings, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

const nav = [
  ["Dashboard", "/admin", LayoutDashboard],
  ["Projects", "/admin/projects", FolderKanban],
  ["Categories", "/admin/categories", Tags],
  ["Media", "/admin/media", Images],
  ["Settings", "/admin/settings", Settings],
] as const;

export function AdminShell({ children, email }: { children: React.ReactNode; email: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/admin/login"; }
  return <div className="min-h-screen bg-paper text-ink">
    <button onClick={() => setOpen(!open)} className="fixed right-5 top-5 z-50 rounded-full bg-ink p-3 text-paper lg:hidden" aria-label="Toggle admin navigation">{open ? <X size={18} /> : <Menu size={18} />}</button>
    <aside className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-line bg-paper px-7 py-8 transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
      <Link href="/admin" className="font-sans text-2xl font-medium tracking-[-0.04em]">Tien Tuan / Admin</Link>
      <p className="mt-2 break-all text-[10px] uppercase tracking-editorial text-muted">{email}</p>
      <nav className="mt-16 space-y-2">
        {nav.map(([label, href, Icon]) => <Link key={href} onClick={() => setOpen(false)} href={href} className={`flex items-center gap-3 px-3 py-3 text-xs ${path === href ? "bg-ink text-paper" : "text-muted hover:bg-fog hover:text-ink"}`}><Icon size={15} strokeWidth={1.5} />{label}</Link>)}
      </nav>
      <button onClick={logout} className="absolute bottom-8 left-7 flex items-center gap-3 px-3 py-3 text-xs text-muted hover:text-ink"><LogOut size={15} strokeWidth={1.5} />Log out</button>
    </aside>
    <main className="min-h-screen lg:pl-64">{children}</main>
  </div>;
}
