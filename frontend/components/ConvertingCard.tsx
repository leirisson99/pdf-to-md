"use client";

import { useEffect, useState } from "react";
import type { Engine } from "@/lib/api";
import { formatBytes } from "@/lib/format";
import { CheckCircleIcon, FileIcon, InfoIcon, Spinner } from "./icons";

interface Props {
  file: File;
  engine: Engine;
  uploaded: boolean;
  onCancel: () => void;
}

export default function ConvertingCard({
  file,
  engine,
  uploaded,
  onCancel,
}: Props) {
  // Progresso estimado: o backend não informa andamento, então a barra
  // avança de forma assintótica até 92% enquanto aguarda a resposta.
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed((t) => t + 0.5), 500);
    return () => clearInterval(id);
  }, []);

  const progress = uploaded
    ? 15 + 77 * (1 - Math.exp(-elapsed / 25))
    : 3 + 12 * (1 - Math.exp(-elapsed / 5));

  const engineLabel = engine === "accurate" ? "Accurate" : "Fast";

  return (
    <section
      aria-live="polite"
      className="rounded-3xl border border-line bg-surface p-5 sm:p-7"
    >
      <div className="flex items-center gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
          <FileIcon />
        </span>
        <div className="min-w-0">
          <p className="truncate font-mono text-base font-medium">
            {file.name}
          </p>
          <p className="text-sm text-muted">
            {formatBytes(file.size)} · Modo {engineLabel}
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3 font-semibold">
        <Spinner className="text-accent-text" />
        Convertendo seu PDF...
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        className="mt-4 h-2 overflow-hidden rounded-full bg-disabled"
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <ul className="mt-5 space-y-3 text-sm">
        <Step done={uploaded} active={!uploaded} label="PDF enviado" />
        <Step
          done={false}
          active={uploaded}
          label="Extraindo texto, tabelas e estrutura"
        />
        <Step done={false} active={false} label="Gerando o arquivo Markdown" />
      </ul>

      {engine === "accurate" && (
        <p className="mt-6 flex gap-3 rounded-xl bg-accent-soft p-4 text-sm leading-relaxed text-accent-text">
          <InfoIcon className="mt-0.5 shrink-0" width={18} height={18} />
          O modo Accurate pode demorar mais, principalmente em PDFs
          escaneados. Mantenha esta aba aberta.
        </p>
      )}

      <button
        type="button"
        onClick={onCancel}
        className="mt-6 h-12 rounded-xl border border-line px-5 text-sm font-medium transition-colors hover:bg-inset"
      >
        Cancelar
      </button>
    </section>
  );
}

function Step({
  done,
  active,
  label,
}: {
  done: boolean;
  active: boolean;
  label: string;
}) {
  return (
    <li
      className={`flex items-center gap-3 ${
        active ? "font-medium text-foreground" : "text-muted"
      }`}
    >
      {done ? (
        <CheckCircleIcon className="text-success" width={20} height={20} />
      ) : active ? (
        <Spinner className="text-accent-text" />
      ) : (
        <span className="h-5 w-5 rounded-full border-2 border-muted/70" />
      )}
      {label}
    </li>
  );
}
