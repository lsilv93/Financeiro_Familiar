"use client";
import { useEffect, useState } from "react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
  };
  return (
    <button onClick={toggle} className={`btn-ghost ${className}`} aria-label="Alternar modo escuro" title="Alternar tema">
      {dark ? "☀️" : "🌙"}
      <span className="text-sm">{dark ? "Modo claro" : "Modo escuro"}</span>
    </button>
  );
}
