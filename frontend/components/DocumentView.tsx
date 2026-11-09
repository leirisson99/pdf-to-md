"use client";

import { useState } from "react";
import { downloadBlob } from "@/lib/download";
import { formatBytes } from "@/lib/format";
import { useConversion } from "./ConversionProvider";
import { CheckIcon, CopyIcon, DownloadIcon } from "./icons";
import MarkdownRenderer from "./MarkdownRenderer";
import ViewModeToggle from "./ViewModeToggle";

/** Acima disso, renderizar formatado pode travar a aba: abre em modo Markdown. */
const LARGE_TEXT_CHARS = 300_000;

interface Props {
  filename: string;
  text: string;
  /** Botão à esquerda do cabeçalho (voltar / fechar). */
  leading: React.ReactNode;
  /** Controles extras (ex.: anterior/próximo), antes do alternador. */
  extraControls?: React.ReactNode;
}

export default function DocumentView({
  filename,
  text,
  leading,
  extraControls,
}: Props) {
  const { viewMode } = useConversion();
  const [copied, setCopied] = useState(false);
  const [forceFormatted, setForceFormatted] = useState(false);

  const tooLarge = text.length > LARGE_TEXT_CHARS;
  const formatted = viewMode === "formatted" && (!tooLarge || forceFormatted);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard indisponível (ex.: contexto não seguro): ignora
    }
  }

  const buttonClass =
    "flex h-10 items-center gap-2 rounded-xl border border-line px-3 text-sm font-medium transition-colors hover:bg-surface sm:px-4";

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-line px-4 py-3">
        {leading}
        <div className="min-w-0 flex-1 basis-40">
          <p className="truncate font-mono text-sm font-medium">{filename}</p>
          <p className="text-xs text-muted">
            {formatBytes(new TextEncoder().encode(text).length)}
          </p>
        </div>
        {extraControls}
        <ViewModeToggle />
        <button type="button" onClick={copy} className={buttonClass}>
          {copied ? (
            <CheckIcon width={18} height={18} className="text-success" />
          ) : (
            <CopyIcon width={18} height={18} />
          )}
          <span className="hidden sm:inline">{copied ? "Copiado" : "Copiar"}</span>
        </button>
        <button
          type="button"
          onClick={() =>
            downloadBlob(
              new Blob([text], { type: "text/markdown;charset=utf-8" }),
              filename,
            )
          }
          className="flex h-10 items-center gap-2 rounded-xl bg-accent px-3 text-sm font-semibold text-accent-ink transition-opacity hover:opacity-90 sm:px-4"
        >
          <DownloadIcon width={18} height={18} />
          <span className="hidden sm:inline">Baixar</span>
        </button>
      </header>

      {viewMode === "formatted" && tooLarge && !forceFormatted && (
        <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-line bg-surface px-4 py-2 text-sm text-muted">
          Documento muito grande: exibindo o Markdown puro para manter a página
          fluida.
          <button
            type="button"
            onClick={() => setForceFormatted(true)}
            className="font-medium text-accent-text underline underline-offset-2"
          >
            Formatar mesmo assim
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto bg-inset p-5 sm:p-8">
        {formatted ? (
          <div className="mx-auto max-w-3xl">
            <MarkdownRenderer text={text} />
          </div>
        ) : (
          <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed">
            {text}
          </pre>
        )}
      </div>
    </div>
  );
}
