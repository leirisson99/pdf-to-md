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
import { useConversion } from "./ConversionProvider";
import ConvertingCard from "./ConvertingCard";
import Dropzone from "./Dropzone";
import EngineSelector from "./EngineSelector";
import { AlertIcon, ArrowRightIcon, CloseIcon, FileIcon } from "./icons";
import SuccessCard from "./SuccessCard";

type Status = "idle" | "converting" | "success" | "error";

const PREVIEW_CHARS = 1500;

function validate(file: File): string | null {
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return "Selecione um arquivo PDF.";
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024)
    return `O arquivo excede o limite de ${MAX_FILE_SIZE_MB} MB.`;
  return null;
}

export default function UploadForm() {
  const { conversion, setConversion } = useConversion();
  // Ao voltar da tela cheia, o resultado ainda está em memória.
  const [status, setStatus] = useState<Status>(conversion ? "success" : "idle");
  const [file, setFile] = useState<File | null>(null);
  const [engine, setEngine] = useState<Engine>("fast");
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cancela requisição pendente ao desmontar.
  useEffect(() => () => abortRef.current?.abort(), []);

  function selectFile(next: File) {
    const error = validate(next);
    setFileError(error);
    if (!error) setFile(next);
  }

  async function handleConvert() {
    if (!file) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setUploaded(false);
    setStatus("converting");
    try {
      const res = await convertPdf(file, engine, {
        signal: controller.signal,
        onUploaded: () => setUploaded(true),
      });
      const text = await res.blob.text();
      setConversion({ filename: res.filename, blob: res.blob, text });
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

  function reset() {
    abortRef.current?.abort();
    setStatus("idle");
    setFile(null);
    setConversion(null);
    setFileError(null);
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
    const { text } = conversion;
    return (
      <SuccessCard
        filename={conversion.filename}
        size={conversion.blob.size}
        preview={
          text.length > PREVIEW_CHARS ? `${text.slice(0, PREVIEW_CHARS)}\n…` : text
        }
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

      {file ? (
        <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
            <FileIcon />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-base font-medium">
              {file.name}
            </p>
            <p className="text-sm text-muted">{formatBytes(file.size)} · PDF</p>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="h-11 rounded-xl border border-line px-4 text-sm font-medium transition-colors hover:bg-inset"
          >
            Trocar
          </button>
          <button
            type="button"
            aria-label="Remover arquivo"
            onClick={() => {
              setFile(null);
              setStatus("idle");
            }}
            className="flex h-11 w-9 items-center justify-center text-muted transition-colors hover:text-foreground"
          >
            <CloseIcon />
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              const next = e.target.files?.[0];
              if (next) selectFile(next);
              e.target.value = "";
            }}
          />
        </div>
      ) : (
        <Dropzone onFile={selectFile} error={fileError} />
      )}

      <EngineSelector value={engine} onChange={setEngine} />

      <div>
        <button
          type="button"
          disabled={!file}
          onClick={handleConvert}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-accent text-base font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-disabled disabled:text-disabled-ink disabled:hover:opacity-100"
        >
          <ArrowRightIcon />
          {status === "error" ? "Tentar novamente" : "Converter"}
        </button>
        {!file && (
          <p className="mt-4 text-center text-sm text-muted">
            Selecione um PDF para habilitar a conversão.
          </p>
        )}
      </div>
    </div>
  );
}
