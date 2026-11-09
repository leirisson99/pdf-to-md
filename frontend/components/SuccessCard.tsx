"use client";

import Link from "next/link";
import { useState } from "react";
import { formatBytes, truncateMarkdown } from "@/lib/format";
import { isZipName, pagesLabel, type PageEntry } from "@/lib/pages";
import { useConversion } from "./ConversionProvider";
import MarkdownRenderer from "./MarkdownRenderer";
import PagerControls from "./PagerControls";
import ViewModeToggle from "./ViewModeToggle";
import {
  CheckCircleIcon,
  DownloadIcon,
  ExpandIcon,
  FileIcon,
  RefreshIcon,
} from "./icons";

const PREVIEW_CHARS = 1500;

interface Props {
  filename: string;
  size: number;
  pages: PageEntry[];
  onDownload: () => void;
  onReset: () => void;
}

export default function SuccessCard({
  filename,
  size,
  pages,
  onDownload,
  onReset,
}: Props) {
  const { viewMode } = useConversion();
  const [index, setIndex] = useState(0);
  const page = pages[Math.min(index, pages.length - 1)];
  const preview = truncateMarkdown(page?.text ?? "", PREVIEW_CHARS);
  const split = isZipName(filename);
  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-line bg-surface p-5 sm:p-7">
        <div className="flex items-center gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
            <CheckCircleIcon width={24} height={24} />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Conversão concluída</h2>
            <p className="text-sm text-muted">
              {split
                ? `${pagesLabel(pages.length)}, um arquivo .md por página, dentro de um .zip.`
                : "Seu Markdown está pronto para baixar."}
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-xl bg-inset px-4 py-3">
          <FileIcon className="shrink-0 text-muted" width={20} height={20} />
          <span className="min-w-0 flex-1 truncate font-mono text-sm">
            {filename}
          </span>
          <span className="shrink-0 text-sm text-muted">
            {formatBytes(size)}
          </span>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onDownload}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-accent-ink transition-opacity hover:opacity-90"
          >
            <DownloadIcon />
            {split ? "Baixar .zip" : "Baixar Markdown"}
          </button>
          <button
            type="button"
            onClick={onReset}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-line font-medium transition-colors hover:bg-inset"
          >
            <RefreshIcon />
            Converter outro arquivo
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-line bg-inset">
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5 text-sm">
          <span className="font-semibold">Prévia</span>
          <span className="min-w-0 flex-1 truncate text-right font-mono text-muted">
            {page?.name ?? filename}
          </span>
          {pages.length > 1 && (
            <PagerControls
              index={index}
              total={pages.length}
              onChange={setIndex}
              labelPrev="Página anterior"
              labelNext="Próxima página"
            />
          )}
          <ViewModeToggle />
          <Link
            href="/preview"
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-surface"
          >
            <ExpandIcon width={14} height={14} />
            Tela cheia
          </Link>
        </div>
        {viewMode === "formatted" ? (
          <div className="max-h-[360px] overflow-auto p-5 text-sm">
            <MarkdownRenderer text={preview} />
          </div>
        ) : (
          <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap break-words p-5 font-mono text-[13px] leading-relaxed">
            {preview}
          </pre>
        )}
      </section>
    </div>
  );
}
