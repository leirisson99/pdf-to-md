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
 * mostrar o passo "PDF enviado" de forma real.
 */
export function convertPdf(
  file: File,
  engine: Engine,
  { signal, onUploaded }: ConvertOptions = {},
): Promise<ConvertResult> {
  return new Promise((resolve, reject) => {
    const fallbackName = `${file.name.replace(/\.pdf$/i, "")}.md`;
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/api/convert`);
    xhr.responseType = "blob";

    const form = new FormData();
    form.append("file", file);
    form.append("engine", engine);

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
