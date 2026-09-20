"use client";

import { FormEvent, useEffect, useState } from "react";
import { IntroAvatarUploader } from "@/components/admin/intro-avatar-uploader";
import { SecuritySettings } from "@/components/admin/security-settings";

type Settings = {
  photographerName: string;
  phone: string;
  zalo: string;
  email: string;
  instagram: string;
  facebook: string;
  introEnabled: boolean;
  introAvatarUrl: string;
  websiteTitle: string;
  websiteDescription: string;
};

const empty: Settings = {
  photographerName: "",
  phone: "",
  zalo: "",
  email: "",
  instagram: "",
  facebook: "",
  introEnabled: true,
  introAvatarUrl: "",
  websiteTitle: "",
  websiteDescription: "",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState(empty);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((response) => response.json())
      .then((data) => setSettings({ ...empty, ...(data.settings ?? {}), introAvatarUrl: data.settings?.introAvatarUrl ?? "" }));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (response.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  function field(key: Exclude<keyof Settings, "introEnabled">, label: string, type = "text") {
    return (
      <label className="block">
        <span className="mb-2 block text-[10px] uppercase tracking-editorial text-muted">{label}</span>
        <input
          type={type}
          value={settings[key]}
          onChange={(event) => setSettings({ ...settings, [key]: event.target.value })}
          className="w-full border-b border-line bg-transparent py-3 outline-none focus:border-ink"
        />
      </label>
    );
  }

  return (
    <div className="p-5 md:p-10">
      <p className="text-[10px] uppercase tracking-editorial text-muted">Configuration</p>
      <h1 className="mt-3 font-display text-6xl tracking-[-0.05em]">Settings</h1>
      <form onSubmit={submit} className="mt-14 max-w-3xl space-y-8">
        <div className="grid gap-8 md:grid-cols-2">
          {field("photographerName", "Photographer name")}
          {field("email", "Email", "email")}
          {field("phone", "Phone")}
          {field("zalo", "Zalo")}
          {field("instagram", "Instagram URL")}
          {field("facebook", "Facebook URL")}
        </div>

        <div className="border-t border-line pt-8">
          <p className="text-[10px] uppercase tracking-editorial text-muted">Opening screen</p>
          <label className="mt-5 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={settings.introEnabled}
              onChange={(event) => setSettings({ ...settings, introEnabled: event.target.checked })}
              className="mt-1 h-4 w-4 accent-ink"
            />
            <span>
              <span className="block text-sm">Show personal intro before the portfolio</span>
              <span className="mt-1 block text-xs font-normal text-muted">Visitors will see your avatar, Portfolio title, social links, and Open button first.</span>
            </span>
          </label>
          <div className="mt-8">
            <IntroAvatarUploader value={settings.introAvatarUrl} onChange={(introAvatarUrl) => setSettings({ ...settings, introAvatarUrl })} />
          </div>
        </div>

        <div className="grid gap-8 border-t border-line pt-8">
          {field("websiteTitle", "Website title")}
          {field("websiteDescription", "Website description")}
        </div>
        <button className="bg-ink px-5 py-3 text-[10px] uppercase tracking-editorial text-paper">{saved ? "Saved ✓" : "Save settings"}</button>
      </form>
      <div className="mt-16"><SecuritySettings /></div>
    </div>
  );
}
