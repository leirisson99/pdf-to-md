export const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg"] as const;

export const ACCEPTED_EXTENSIONS = [
  "pdf",
  "docx",
  "xlsx",
  "csv",
  "txt",
  ...IMAGE_EXTENSIONS,
] as const;

/** Valor do atributo `accept` dos inputs de arquivo. */
export const ACCEPT_ATTR = ACCEPTED_EXTENSIONS.map((e) => `.${e}`).join(",");

export const ACCEPTED_LABEL = "PDF, DOCX, XLSX, CSV, TXT, PNG ou JPG";

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

export function isPdf(file: File): boolean {
  return extensionOf(file.name) === "pdf";
}

export function isImage(file: File): boolean {
  return (IMAGE_EXTENSIONS as readonly string[]).includes(
    extensionOf(file.name),
  );
}

export function isAccepted(file: File): boolean {
  return (ACCEPTED_EXTENSIONS as readonly string[]).includes(
    extensionOf(file.name),
  );
}

/** "relatorio.xlsx" -> "relatorio.md" */
export function markdownName(name: string): string {
  const dot = name.lastIndexOf(".");
  return `${dot > 0 ? name.slice(0, dot) : name}.md`;
}
