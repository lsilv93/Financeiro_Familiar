// Ícones geométricos simples (traço único), herdam a cor do texto.
const PATHS: Record<string, string> = {
  panel: "M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6v-9h-6v9zm0-16v5h6V4h-6z",
  list: "M5 7h14M5 12h14M5 17h9",
  clock: "M12 7v5l3 2M12 21a9 9 0 100-18 9 9 0 000 18z",
  card: "M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm0 3h18",
  calendar: "M5 6h14a1 1 0 011 1v12a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1zm0 4h14M8 4v4M16 4v4",
  bank: "M3 10l9-6 9 6M5 10v8m4-8v8m6-8v8m4-8v8M3 20h18",
  gear: "M12 15a3 3 0 100-6 3 3 0 000 6zm0-12v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1m0-12.8l-2.1 2.1M7.7 16.3l-2.1 2.1",
  plus: "M12 5v14M5 12h14",
  out: "M10 5H6a1 1 0 00-1 1v12a1 1 0 001 1h4m5-4l4-3-4-3m4 3H10",
  menu: "M4 7h16M4 12h16M4 17h16",
  up: "M12 19V5m0 0l-6 6m6-6l6 6",
  down: "M12 5v14m0 0l6-6m-6 6l-6-6",
  alert: "M12 8v5m0 3.5v.01M10.3 4.3L3 17a2 2 0 001.7 3h14.6a2 2 0 001.7-3L13.7 4.3a2 2 0 00-3.4 0z",
  trash: "M5 7h14M10 11v6m4-6v6M6 7l1 12h10l1-12M9 7V4h6v3",
  check: "M5 12l5 5 9-10",
  coin: "M12 21a9 9 0 100-18 9 9 0 000 18zm2.6-12.2c-.6-.5-1.5-.8-2.6-.8-1.5 0-2.6.8-2.6 1.8s1 1.6 2.6 1.9c1.6.3 2.6.9 2.6 1.9s-1.1 1.8-2.6 1.8c-1.1 0-2-.3-2.6-.8M12 6.5V8m0 8v1.5",
  news: "M5 5h11a1 1 0 011 1v13H6a1 1 0 01-1-1V5zm12 4h2a1 1 0 011 1v8a1 1 0 01-1 1h-2M8 9h6M8 13h6M8 16h4",
  bell: "M6 17h12l-1.5-2V10a4.5 4.5 0 00-9 0v5L6 17zm4 3a2 2 0 004 0",
  list2: "M4 6h16M4 12h16M4 18h10",
  cart: "M3 4h2l2.4 11h9.2L19 8H6.2M9 20a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z",
  edit: "M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4",
  table: "M4 5h16v14H4V5zm0 5h16M4 14h16M10 5v14",
  share: "M8.6 13.5l6.8 4M15.4 6.5l-6.8 4M18 8a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100-6 3 3 0 000 6zm12 7a3 3 0 100-6 3 3 0 000 6z",
};

export function Icon({ name, size = 20, className = "" }: { name: keyof typeof PATHS | string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={PATHS[name] ?? ""} />
    </svg>
  );
}
