export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export interface ZipEntry {
  name: string;
  blob: Blob;
}

/** Gera um .zip no navegador; nomes repetidos ganham sufixo " (2)", " (3)"... */
export async function downloadZip(
  entries: ZipEntry[],
  zipName: string,
): Promise<void> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const used = new Set<string>();
  for (const { name, blob } of entries) {
    let unique = name;
    const dot = name.lastIndexOf(".");
    const base = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : "";
    for (let n = 2; used.has(unique); n++) unique = `${base} (${n})${ext}`;
    used.add(unique);
    zip.file(unique, blob);
  }
  downloadBlob(await zip.generateAsync({ type: "blob" }), zipName);
}
