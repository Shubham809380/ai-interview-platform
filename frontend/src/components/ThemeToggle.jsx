import { Moon, SunMedium } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
      aria-label="Toggle color mode"
    >
      {theme === "dark" ? <SunMedium size={16} /> : <Moon size={16} />}
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
