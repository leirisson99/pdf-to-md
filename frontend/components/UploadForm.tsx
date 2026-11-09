"use client";

import { useEffect, useRef, useState } from "react";
import {
  ConvertAbortedError,
  convertPdf,
  MAX_FILE_SIZE_MB,
  type Engine,
} from "@/lib/api";
import { downloadBlob } from "@/lib/download";
import { formatBytes } from "@/lib/format";
import { readPages } from "@/lib/pages";
import {
  ACCEPT_ATTR,
  ACCEPTED_LABEL,
  extensionOf,
  isAccepted,
  isImage,
  isPdf,
} from "@/lib/formats";
import BatchPanel from "./BatchPanel";
import { useConversion } from "./ConversionProvider";
import ConvertingCard from "./ConvertingCard";
import Dropzone from "./Dropzone";
import EngineSelector from "./EngineSelector";
import { AlertIcon, ArrowRightIcon, CloseIcon, FileIcon } from "./icons";
import SuccessCard from "./SuccessCard";
import { useBatchConversion } from "./useBatchConversion";

type Status = "idle" | "converting" | "success" | "error";

const MAX_BATCH_FILES = 20;

function validate(file: File): string | null {
  if (!isAccepted(file)) return `Formato não suportado. Use ${ACCEPTED_LABEL}.`;
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024)
    return `O arquivo excede o limite de ${MAX_FILE_SIZE_MB} MB.`;
  return null;
}

const sameFile = (a: File, b: File) => a.name === b.name && a.size === b.size;

export default function UploadForm() {
  const { conversion, setConversion } = useConversion();
  // Ao voltar da tela cheia, o resultado ainda está em memória.
  const [status, setStatus] = useState<Status>(conversion ? "success" : "idle");
  const [files, setFiles] = useState<File[]>([]);
  const [engine, setEngine] = useState<Engine>("fast");
  const [splitPages, setSplitPages] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const batch = useBatchConversion();

  // Fluxo de arquivo único (prévia, tela cheia) só vale com exatamente 1 arquivo.
  const file = files.length === 1 ? files[0] : null;
  const hasPdf = files.some(isPdf);

  // Cancela requisição pendente ao desmontar.
  useEffect(() => () => abortRef.current?.abort(), []);

  /** Valida e junta os arquivos novos aos já selecionados. */
  function addFiles(incoming: File[]) {
    const errors: string[] = [];
    const valid: File[] = [];
    for (const f of incoming) {
      const error = validate(f);
      if (error) errors.push(incoming.length > 1 ? `${f.name}: ${error}` : error);
      else valid.push(f);
    }

    const merged = [...files];
    for (const f of valid) if (!merged.some((m) => sameFile(m, f))) merged.push(f);
    if (merged.length > MAX_BATCH_FILES) {
      errors.push(`Limite de ${MAX_BATCH_FILES} arquivos por lote.`);
    }

    setFileError(errors.length > 0 ? errors.join(" ") : null);
    setFiles(merged.slice(0, MAX_BATCH_FILES));
  }

  /** "Trocar" (arquivo único): substitui em vez de acrescentar. */
  function replaceFile(next: File) {
    const error = validate(next);
    setFileError(error);
    if (!error) setFiles([next]);
  }

  function removeFile(target: File) {
    const remaining = files.filter((f) => f !== target);
    setFiles(remaining);
    setFileError(null);
    if (remaining.length === 0) setStatus("idle");
  }

  async function handleConvertSingle(target: File) {
    const controller = new AbortController();
    abortRef.current = controller;
    setUploaded(false);
    setStatus("converting");
    try {
      const res = await convertPdf(target, engine, {
        signal: controller.signal,
        onUploaded: () => setUploaded(true),
        splitPages: splitPages && isPdf(target),
      });
      const pages = await readPages(res);
      setConversion({ filename: res.filename, blob: res.blob, pages });
      setStatus("success");
    } catch (err) {
      if (err instanceof ConvertAbortedError) {
        setStatus("idle");
        return;
      }
      setErrorMessage(
        err instanceof Error ? err.message : "Erro inesperado na conversão.",
      );
      setStatus("error");
    }
  }

  function handleConvert() {
    if (files.length === 0) return;
    if (files.length === 1) void handleConvertSingle(files[0]);
    else batch.start(files, engine, splitPages);
  }

  function reset() {
    abortRef.current?.abort();
    batch.reset();
    setStatus("idle");
    setFiles([]);
    setConversion(null);
    setFileError(null);
  }

  if (batch.items.length > 0) {
    return (
      <BatchPanel
        items={batch.items}
        running={batch.running}
        onCancel={batch.cancel}
        onRetryFailed={() => batch.retryFailed(engine, splitPages)}
        onReset={reset}
      />
    );
  }

  if (status === "converting" && file) {
    return (
      <ConvertingCard
        file={file}
        engine={engine}
        uploaded={uploaded}
        onCancel={() => abortRef.current?.abort()}
      />
    );
  }

  if (status === "success" && conversion) {
    return (
      <SuccessCard
        filename={conversion.filename}
        size={conversion.blob.size}
        pages={conversion.pages}
        onDownload={() => downloadBlob(conversion.blob, conversion.filename)}
        onReset={reset}
      />
    );
  }

  return (
    <div className="space-y-8">
      {status === "error" && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-danger/40 bg-danger-soft p-4 text-sm text-danger"
        >
          <AlertIcon className="mt-0.5 shrink-0" width={18} height={18} />
          <div>
            <p className="font-semibold">Falha na conversão</p>
            <p className="mt-1 opacity-90">{errorMessage}</p>
          </div>
        </div>
      )}

      {files.length > 0 ? (
        <div className="space-y-3">
          {files.map((f) => (
            <div
              key={`${f.name}-${f.size}`}
              className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
                <FileIcon />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-base font-medium">
                  {f.name}
                </p>
                <p className="text-sm text-muted">{formatBytes(f.size)} · {extensionOf(f.name).toUpperCase()}</p>
              </div>
              {files.length === 1 && (
                <button
                  type="button"
                  onClick={() => replaceInputRef.current?.click()}
                  className="h-11 rounded-xl border border-line px-4 text-sm font-medium transition-colors hover:bg-inset"
                >
                  Trocar
                </button>
              )}
              <button
                type="button"
                aria-label={`Remover ${f.name}`}
                onClick={() => removeFile(f)}
                className="flex h-11 w-9 items-center justify-center text-muted transition-colors hover:text-foreground"
              >
                <CloseIcon />
              </button>
            </div>
          ))}

          {files.length < MAX_BATCH_FILES && (
            <button
              type="button"
              onClick={() => addInputRef.current?.click()}
              className="h-11 w-full rounded-xl border border-dashed border-muted/50 text-sm font-medium text-muted transition-colors hover:border-muted hover:text-foreground"
            >
              + Adicionar mais arquivos
            </button>
          )}
          {fileError && (
            <p role="alert" className="text-sm text-danger">
              {fileError}
            </p>
          )}

          <input
            ref={replaceInputRef}
            type="file"
            accept={ACCEPT_ATTR}
            className="hidden"
            onChange={(e) => {
              const next = e.target.files?.[0];
              if (next) replaceFile(next);
              e.target.value = "";
            }}
          />
          <input
            ref={addInputRef}
            type="file"
            accept={ACCEPT_ATTR}
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) addFiles(Array.from(e.target.files));
              e.target.value = "";
            }}
          />
        </div>
      ) : (
        <Dropzone onFiles={addFiles} error={fileError} />
      )}

      {(files.length === 0 || hasPdf) && (
        <EngineSelector value={engine} onChange={setEngine} />
      )}
      {hasPdf && (
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-surface p-4">
          <input
            type="checkbox"
            checked={splitPages}
            onChange={(e) => setSplitPages(e.target.checked)}
            className="mt-1 h-4 w-4 accent-[var(--accent)]"
          />
          <span>
            <span className="block text-sm font-semibold">
              Um arquivo .md por página
            </span>
            <span className="block text-sm text-muted">
              Os PDFs são baixados em um .zip, com uma página por arquivo.
              Páginas em branco são ignoradas.
            </span>
          </span>
        </label>
      )}
      {files.length > 0 && !hasPdf && (
        <p className="text-sm text-muted">
          {files.some(isImage)
            ? "Imagens são convertidas com OCR (reconhecimento de texto) do Docling; só o texto é extraído."
            : "Este formato é convertido automaticamente com o Docling."}
        </p>
      )}
      {hasPdf && files.some((f) => !isPdf(f)) && (
        <p className="-mt-4 text-sm text-muted">
          O modo escolhido vale só para os PDFs; os demais formatos usam sempre
          o Docling.
        </p>
      )}

      <div>
        <button
          type="button"
          disabled={files.length === 0}
          onClick={handleConvert}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-accent text-base font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-disabled disabled:text-disabled-ink disabled:hover:opacity-100"
        >
          <ArrowRightIcon />
          {status === "error"
            ? "Tentar novamente"
            : files.length > 1
              ? `Converter ${files.length} arquivos`
              : "Converter"}
        </button>
        {files.length === 0 && (
          <p className="mt-4 text-center text-sm text-muted">
            Selecione um ou mais arquivos para habilitar a conversão.
          </p>
        )}
      </div>
    </div>
  );
}
