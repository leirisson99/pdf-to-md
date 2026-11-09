import type { ConvertResult } from "./api";

/** Uma página (ou o documento inteiro) pronta para visualizar. */
export interface PageEntry {
  name: string;
  text: string;
}

export function isZipName(filename: string): boolean {
  return filename.toLowerCase().endsWith(".zip");
}

/**
 * Resultado de conversão -> páginas para exibir. Um .md vira uma única entrada;
 * um .zip (PDF dividido por página) é aberto no navegador.
 */
export async function readPages(result: ConvertResult): Promise<PageEntry[]> {
  if (!isZipName(result.filename)) {
    return [{ name: result.filename, text: await result.blob.text() }];
  }
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(result.blob);
  const names = Object.keys(zip.files)
    .filter((n) => !zip.files[n].dir)
    .sort();
  return Promise.all(
    names.map(async (name) => ({ name, text: await zip.files[name].async("string") })),
  );
}

export function pagesLabel(count: number): string {
  return `${count} ${count === 1 ? "página" : "páginas"}`;
}
