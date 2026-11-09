"use client";

import { useEffect, useRef } from "react";
import DocumentView from "./DocumentView";
import { CloseIcon } from "./icons";
import PagerControls from "./PagerControls";

/** Um item navegável: um .md, ou uma página de um PDF dividido. */
export interface PreviewEntry {
  key: string;
  name: string;
  text: string;
}

interface Props {
  entries: PreviewEntry[];
  currentKey: string;
  onChange: (key: string) => void;
  onClose: () => void;
}

export default function BatchPreviewDialog({
  entries,
  currentKey,
  onChange,
  onClose,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const index = entries.findIndex((e) => e.key === currentKey);
  const entry = entries[index];

  // Modal nativo: Esc fecha, foco fica preso e a página atrás fica inerte.
  useEffect(() => {
    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    if (dialog && !dialog.open) dialog.showModal();
    return () => previouslyFocused?.focus();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-label={entry ? `Visualizar ${entry.name}` : "Visualizar arquivo"}
      className="m-0 h-dvh max-h-none w-dvw max-w-none bg-background p-0 text-foreground backdrop:bg-black/70"
    >
      {entry && (
        <DocumentView
          key={entry.key}
          filename={entry.name}
          text={entry.text}
          leading={
            <button
              type="button"
              aria-label="Fechar"
              onClick={() => dialogRef.current?.close()}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-line transition-colors hover:bg-surface"
            >
              <CloseIcon width={18} height={18} />
            </button>
          }
          extraControls={
            entries.length > 1 && (
              <PagerControls
                index={index}
                total={entries.length}
                onChange={(i) => onChange(entries[i].key)}
                labelPrev="Anterior"
                labelNext="Próximo"
              />
            )
          }
        />
      )}
    </dialog>
  );
}
