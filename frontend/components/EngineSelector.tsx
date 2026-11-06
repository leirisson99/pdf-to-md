import type { Engine } from "@/lib/api";
import { BoltIcon, ScanIcon } from "./icons";

const OPTIONS: {
  value: Engine;
  title: string;
  description: string;
  Icon: typeof BoltIcon;
}[] = [
  {
    value: "fast",
    title: "Fast",
    description: "Rápido. Ideal para PDFs com texto selecionável.",
    Icon: BoltIcon,
  },
  {
    value: "accurate",
    title: "Accurate",
    description:
      "Mais lento. Melhor para tabelas, layouts complexos e PDFs escaneados (OCR).",
    Icon: ScanIcon,
  },
];

interface Props {
  value: Engine;
  onChange: (engine: Engine) => void;
}

export default function EngineSelector({ value, onChange }: Props) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-semibold">Modo de conversão</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {OPTIONS.map(({ value: v, title, description, Icon }) => {
          const selected = v === value;
          return (
            <label
              key={v}
              className={`relative flex cursor-pointer gap-3 rounded-2xl border p-4 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
                selected
                  ? "border-2 border-accent bg-surface p-[15px]"
                  : "border-line bg-surface hover:border-muted/50"
              }`}
            >
              <input
                type="radio"
                name="engine"
                value={v}
                checked={selected}
                onChange={() => onChange(v)}
                className="sr-only"
              />
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  selected ? "bg-accent text-accent-ink" : "bg-inset"
                }`}
              >
                <Icon />
              </span>
              <span className="min-w-0 flex-1 pr-7">
                <span className="block text-base font-semibold">{title}</span>
                <span className="mt-1 block text-sm leading-relaxed text-muted">
                  {description}
                </span>
              </span>
              <span
                aria-hidden="true"
                className={`absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                  selected ? "border-accent" : "border-muted"
                }`}
              >
                {selected && (
                  <span className="h-2 w-2 rounded-full bg-accent" />
                )}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
