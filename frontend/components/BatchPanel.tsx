"use client";

import { useState } from "react";
import { downloadBlob, downloadZip } from "@/lib/download";
import { formatBytes } from "@/lib/format";
import {
  AlertIcon,
  CheckCircleIcon,
  DownloadIcon,
  FileIcon,
  RefreshIcon,
  Spinner,
} from "./icons";
import { isZipName, pagesLabel } from "@/lib/pages";
import BatchPreviewDialog, { type PreviewEntry } from "./BatchPreviewDialog";
import type { BatchItem } from "./useBatchConversion";

interface Props {
  items: BatchItem[];
  running: boolean;
  onCancel: () => void;
  onRetryFailed: () => void;
  onReset: () => void;
}

const STATUS_LABEL: Record<BatchItem["status"], string> = {
  pending: "Aguardando",
  converting: "Convertendo…",
  done: "Concluído",
  error: "Falhou",
  cancelled: "Cancelado",
};

function StatusIcon({ status }: { status: BatchItem["status"] }) {
  if (status === "converting") return <Spinner className="text-accent-text" />;
  if (status === "done")
    return <CheckCircleIcon width={20} height={20} className="text-success" />;
  if (status === "error")
    return <AlertIcon width={20} height={20} className="text-danger" />;
  return <FileIcon width={20} height={20} className="text-muted" />;
}

export default function BatchPanel({
  items,
  running,
  onCancel,
  onRetryFailed,
  onReset,
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const total = items.length;
  const done = items.filter((it) => it.status === "done");
  const finished = items.filter(
    (it) => it.status === "done" || it.status === "error",
  ).length;
  const retryable = items.some(
    (it) => it.status === "error" || it.status === "cancelled",
  );

  // Um item por arquivo; PDFs divididos contribuem com uma entrada por página.
  const entries: PreviewEntry[] = done.flatMap((it) =>
    (it.pages ?? []).map((p, i) => ({
      key: `${it.id}:${i}`,
      name: p.name,
      text: p.text,
    })),
  );

  const buttonClass =
    "flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-line font-medium transition-colors hover:bg-inset";

  return (
    <section
      aria-live="polite"
      className="rounded-3xl border border-line bg-surface p-5 sm:p-7"
    >
      <h2 className="text-lg font-semibold">
        {running
          ? `Convertendo ${Math.min(finished + 1, total)} de ${total}…`
          : `${done.length} de ${total} convertidos`}
      </h2>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={finished}
        className="mt-3 h-2 overflow-hidden rounded-full bg-inset"
      >
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${(finished / total) * 100}%` }}
        />
      </div>

      <ul className="mt-5 divide-y divide-line overflow-hidden rounded-xl bg-inset">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-4 py-3">
            <StatusIcon status={item.status} />
            {(() => {
              const content = (
                <>
                  <p className="truncate font-mono text-sm">{item.file.name}</p>
                  <p
                    className={`truncate text-xs ${
                      item.status === "error" ? "text-danger" : "text-muted"
                    }`}
                  >
                    {item.status === "error"
                      ? item.error
                      : item.status === "done" && item.result
                        ? `${STATUS_LABEL.done} · ${
                            isZipName(item.result.filename)
                              ? `${pagesLabel(item.pages?.length ?? 0)} · `
                              : ""
                          }${formatBytes(item.result.blob.size)} · clique para visualizar`
                        : STATUS_LABEL[item.status]}
                  </p>
                </>
              );
              // Só arquivos concluídos abrem; os demais seguem como texto.
              return item.status === "done" && item.result ? (
                <button
                  type="button"
                  onClick={() => setOpenId(`${item.id}:0`)}
                  className="-mx-2 min-w-0 flex-1 rounded-lg px-2 py-1 text-left transition-colors hover:bg-surface"
                >
                  {content}
                </button>
              ) : (
                <div className="min-w-0 flex-1">{content}</div>
              );
            })()}
            {item.status === "done" && item.result && (
              <button
                type="button"
                aria-label={`Baixar ${item.result.filename}`}
                onClick={() =>
                  downloadBlob(item.result!.blob, item.result!.filename)
                }
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line transition-colors hover:bg-surface"
              >
                <DownloadIcon width={16} height={16} />
              </button>
            )}
          </li>
        ))}
      </ul>

      {running ? (
        <button type="button" onClick={onCancel} className={`${buttonClass} mt-5 w-full`}>
          Cancelar
        </button>
      ) : (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          {done.length > 0 && (
            <button
              type="button"
              onClick={() =>
                void downloadZip(
                  done.flatMap((it) =>
                    isZipName(it.result!.filename)
                      ? // PDF dividido: pasta com o nome do arquivo, sem zip dentro de zip
                        (it.pages ?? []).map((p) => ({
                          name: `${it.result!.filename.replace(/\.zip$/i, "")}/${p.name}`,
                          blob: new Blob([p.text], {
                            type: "text/markdown;charset=utf-8",
                          }),
                        }))
                      : [{ name: it.result!.filename, blob: it.result!.blob }],
                  ),
                  "pdftomd.zip",
                )
              }
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-accent-ink transition-opacity hover:opacity-90"
            >
              <DownloadIcon />
              Baixar todos (.zip)
            </button>
          )}
          {retryable && (
            <button type="button" onClick={onRetryFailed} className={buttonClass}>
              <RefreshIcon />
              Tentar novamente os que falharam
            </button>
          )}
          <button type="button" onClick={onReset} className={buttonClass}>
            Converter outros arquivos
          </button>
        </div>
      )}

      {openId && entries.some((e) => e.key === openId) && (
        <BatchPreviewDialog
          entries={entries}
          currentKey={openId}
          onChange={setOpenId}
          onClose={() => setOpenId(null)}
        />
      )}
    </section>
  );
}
