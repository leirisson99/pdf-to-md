"use client";

import Link from "next/link";
import { useState } from "react";
import { downloadBlob } from "@/lib/download";
import { formatBytes } from "@/lib/format";
import { useConversion } from "./ConversionProvider";
import { ArrowLeftIcon, CheckIcon, CopyIcon, DownloadIcon } from "./icons";

export default function MarkdownViewer() {
  const { conversion } = useConversion();
  const [copied, setCopied] = useState(false);

  if (!conversion) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-lg font-semibold">Nenhum arquivo para visualizar</p>
        <p className="text-sm text-muted">
          Converta um PDF primeiro. A prévia some ao recarregar a página.
        </p>
        <Link
          href="/"
          className="mt-2 flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-accent-ink hover:opacity-90"
        >
          <ArrowLeftIcon width={18} height={18} />
          Voltar ao início
        </Link>
      </div>
    );
  }

  async function copy() {
    if (!conversion) return;
    try {
      await navigator.clipboard.writeText(conversion.text);
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
      <header className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-3">
        <Link href="/" className={buttonClass} aria-label="Voltar">
          <ArrowLeftIcon width={18} height={18} />
          <span className="hidden sm:inline">Voltar</span>
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-sm font-medium">
            {conversion.filename}
          </p>
          <p className="text-xs text-muted">{formatBytes(conversion.blob.size)}</p>
        </div>
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
          onClick={() => downloadBlob(conversion.blob, conversion.filename)}
          className="flex h-10 items-center gap-2 rounded-xl bg-accent px-3 text-sm font-semibold text-accent-ink transition-opacity hover:opacity-90 sm:px-4"
        >
          <DownloadIcon width={18} height={18} />
          <span className="hidden sm:inline">Baixar</span>
        </button>
      </header>
      <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words bg-inset p-5 font-mono text-[13px] leading-relaxed sm:p-8">
        {conversion.text}
      </pre>
    </div>
  );
}
