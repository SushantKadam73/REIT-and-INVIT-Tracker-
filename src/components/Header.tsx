"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "./ThemeProvider";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/calculator/", label: "Income Calculator" },
  { href: "/tax/", label: "Tax Simulator" },
  { href: "/portfolio/", label: "Portfolio" },
  { href: "/compare/", label: "Compare" },
  { href: "/methodology/", label: "Methodology" },
];

export function Header() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center gap-4 h-14">
        <Link href="/" className="font-bold text-lg tracking-tight shrink-0">
          REIT<span className="text-muted-foreground">/</span>InvIT
          <span className="hidden sm:inline text-muted-foreground font-normal text-sm ml-2">
            India Tracker
          </span>
        </Link>
        <nav className="flex-1 overflow-x-auto flex gap-1 text-sm">
          {NAV.map((n) => {
            const active =
              n.href === "/"
                ? pathname === "/"
                : pathname.startsWith(n.href.replace(/\/$/, ""));
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`px-2.5 py-1.5 rounded-md whitespace-nowrap transition-colors ${
                  active
                    ? "bg-muted text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <button
          aria-label="Toggle dark mode"
          onClick={() =>
            setTheme(theme === "dark" ? "light" : theme === "light" ? "system" : "dark")
          }
          className="shrink-0 w-9 h-9 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          title={`Theme: ${theme}`}
        >
          {theme === "dark" ? "🌙" : theme === "light" ? "☀️" : "💻"}
        </button>
      </div>
    </header>
  );
}
