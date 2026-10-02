"use client";
import { useEffect, useState } from "react";

function SunMoon({ light }: { light: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {light ? <path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z" /> : <path d="M12 16a4 4 0 100-8 4 4 0 000 8zM12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4l1.4 1.4m0-14.2l-1.4 1.4M6.3 17.7l-1.4 1.4" />}
    </svg>
  );
}

export function useTheme() {
  const [light, setLight] = useState(false);
  useEffect(() => setLight(document.documentElement.classList.contains("light")), []);
  const toggle = () => {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    try { localStorage.setItem("theme", next ? "light" : "dark"); } catch {}
  };
  return { light, toggle };
}

/** Botão com texto (menus). */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { light, toggle } = useTheme();
  return (
    <button onClick={toggle} className={`btn-ghost ${className}`} aria-label="Alternar entre tema claro e escuro">
      <SunMoon light={light} />{light ? "Tema escuro" : "Tema claro"}
    </button>
  );
}

/** Botão quadrado só com ícone (telas de login). */
export function ThemeIconButton({ className = "" }: { className?: string }) {
  const { light, toggle } = useTheme();
  return (
    <button onClick={toggle} className={`btn-icon ${className}`} aria-label="Alternar entre tema claro e escuro" title={light ? "Tema escuro" : "Tema claro"}>
      <SunMoon light={light} />
    </button>
  );
}
