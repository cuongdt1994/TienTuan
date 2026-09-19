"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => setVisible(window.scrollY > 240);
    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition-all duration-300 hover:border-ink hover:text-ink ${visible ? "opacity-60" : "opacity-30"}`}
    >
      <ArrowUp size={14} strokeWidth={1.4} />
    </button>
  );
}
