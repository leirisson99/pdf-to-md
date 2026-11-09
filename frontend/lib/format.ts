export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1).replace(".", ",")} MB`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

/**
 * Corta a prévia sem partir tabelas/blocos no meio: prefere o último parágrafo
 * completo antes do limite e fecha uma cerca de código eventualmente aberta.
 */
export function truncateMarkdown(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const head = text.slice(0, limit);
  const cut = head.lastIndexOf("\n\n");
  let out = cut > limit / 2 ? head.slice(0, cut) : head;
  const fences = out.split("\n").filter((l) => l.trimStart().startsWith("```")).length;
  if (fences % 2 === 1) out += "\n```";
  return `${out}\n\n…`;
}
