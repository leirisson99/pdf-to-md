"use client";

import { type ViewMode, useConversion } from "./ConversionProvider";

const OPTIONS: { value: ViewMode; label: string }[] = [
  { value: "formatted", label: "Formatado" },
  { value: "raw", label: "Markdown" },
];

export default function ViewModeToggle() {
  const { viewMode, setViewMode } = useConversion();
  return (
    <div
      role="group"
      aria-label="Modo de visualização"
      className="flex rounded-xl border border-line p-0.5 text-sm"
    >
      {OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          aria-pressed={viewMode === value}
          onClick={() => setViewMode(value)}
          className={`rounded-[10px] px-3 py-1.5 font-medium transition-colors ${
            viewMode === value
              ? "bg-accent-soft text-accent-text"
              : "text-muted hover:text-foreground"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
