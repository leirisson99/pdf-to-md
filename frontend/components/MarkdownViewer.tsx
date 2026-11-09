"use client";

import Link from "next/link";
import { useState } from "react";
import { useConversion } from "./ConversionProvider";
import DocumentView from "./DocumentView";
import { ArrowLeftIcon } from "./icons";
import PagerControls from "./PagerControls";

export default function MarkdownViewer() {
  const { conversion } = useConversion();
  const [index, setIndex] = useState(0);

  if (!conversion || conversion.pages.length === 0) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-lg font-semibold">Nenhum arquivo para visualizar</p>
        <p className="text-sm text-muted">
          Converta um arquivo primeiro. A prévia some ao recarregar a página.
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

  const { pages } = conversion;
  const page = pages[Math.min(index, pages.length - 1)];

  return (
    <DocumentView
      key={page.name}
      filename={page.name}
      text={page.text}
      leading={
        <Link
          href="/"
          aria-label="Voltar"
          className="flex h-10 items-center gap-2 rounded-xl border border-line px-3 text-sm font-medium transition-colors hover:bg-surface sm:px-4"
        >
          <ArrowLeftIcon width={18} height={18} />
          <span className="hidden sm:inline">Voltar</span>
        </Link>
      }
      extraControls={
        pages.length > 1 && (
          <PagerControls
            index={index}
            total={pages.length}
            onChange={setIndex}
            labelPrev="Página anterior"
            labelNext="Próxima página"
          />
        )
      }
    />
  );
}
