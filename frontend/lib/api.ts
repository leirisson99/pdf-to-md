import { extensionOf, markdownName } from "./formats";

export type Engine = "fast" | "accurate";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const MAX_FILE_SIZE_MB = Number(
  process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB ?? 20,
);

export interface ConvertResult {
  blob: Blob;
  filename: string;
}

export class ConvertError extends Error {}
export class ConvertAbortedError extends Error {}

interface ConvertOptions {
  signal?: AbortSignal;
  /** Só vale para PDF: o backend devolve um .zip com um .md por página. */
  splitPages?: boolean;
  /** Chamado quando o envio do arquivo termina (servidor passou a processar). */
  onUploaded?: () => void;
}

function filenameFromHeader(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const match = /filename="?([^";]+)"?/i.exec(header);
  return match ? match[1] : fallback;
}

/**
 * Usa XHR (e não fetch) para saber quando o upload terminou, o que permite
 * mostrar o passo "Arquivo enviado" de forma real.
 */
export function convertPdf(
  file: File,
  engine: Engine,
  { signal, onUploaded, splitPages }: ConvertOptions = {},
): Promise<ConvertResult> {
  return new Promise((resolve, reject) => {
    const fallbackName =
      splitPages && extensionOf(file.name) === "pdf"
        ? `${file.name.replace(/\.pdf$/i, "")}.zip`
        : markdownName(file.name);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/api/convert`);
    xhr.responseType = "blob";

    const form = new FormData();
    form.append("file", file);
    form.append("engine", engine);
    if (splitPages) form.append("split_pages", "true");

    xhr.upload.onload = () => onUploaded?.();

    xhr.onload = async () => {
      if (xhr.status === 200) {
        resolve({
          blob: xhr.response as Blob,
          filename: filenameFromHeader(
            xhr.getResponseHeader("Content-Disposition"),
            fallbackName,
          ),
        });
        return;
      }
      let detail = "Não foi possível converter o arquivo.";
      try {
        const body = JSON.parse(await (xhr.response as Blob).text());
        if (typeof body.detail === "string") detail = body.detail;
      } catch {
        // corpo não era JSON: mantém a mensagem genérica
      }
      reject(new ConvertError(detail));
    };

    xhr.onerror = () =>
      reject(
        new ConvertError(
          "Não foi possível conectar ao servidor. Verifique se o backend está no ar.",
        ),
      );
    xhr.onabort = () => reject(new ConvertAbortedError());

    if (signal) {
      if (signal.aborted) {
        reject(new ConvertAbortedError());
        return;
      }
      signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }

    xhr.send(form);
  });
}

export interface HistoryItem {
  id: number;
  filename: string;
  output_filename: string;
  engine: Engine;
  /** ISO 8601 em UTC */
  created_at: string;
}

export interface HistoryPage {
  items: HistoryItem[];
  total: number;
  page: number;
  page_size: number;
}

export async function fetchHistory(
  page: number,
  signal?: AbortSignal,
): Promise<HistoryPage> {
  const res = await fetch(`${API_URL}/api/history?page=${page}&page_size=10`, {
    signal,
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Não foi possível carregar o histórico.");
  return (await res.json()) as HistoryPage;
}
