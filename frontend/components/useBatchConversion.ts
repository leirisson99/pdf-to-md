"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ConvertAbortedError, convertPdf, type Engine } from "@/lib/api";
import { isPdf } from "@/lib/formats";
import { type PageEntry, readPages } from "@/lib/pages";

export type ItemStatus = "pending" | "converting" | "done" | "error" | "cancelled";

export interface BatchItem {
  id: string;
  file: File;
  status: ItemStatus;
  result?: { blob: Blob; filename: string };
  /** Conteúdo para visualizar: uma entrada por .md (ou por página, se dividido). */
  pages?: PageEntry[];
  error?: string;
}

/**
 * Converte vários PDFs um por vez (o backend converte em CPU, paralelizar
 * só pioraria). Falha em um arquivo não interrompe os demais.
 */
export function useBatchConversion() {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [running, setRunning] = useState(false);
  const itemsRef = useRef<BatchItem[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const commit = useCallback((next: BatchItem[]) => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  const update = useCallback(
    (id: string, patch: Partial<BatchItem>) =>
      commit(
        itemsRef.current.map((it) => (it.id === id ? { ...it, ...patch } : it)),
      ),
    [commit],
  );

  const run = useCallback(
    async (ids: string[], engine: Engine, splitPages: boolean) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setRunning(true);
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const item = itemsRef.current.find((it) => it.id === id);
        if (!item) continue;
        if (controller.signal.aborted) {
          update(id, { status: "cancelled" });
          continue;
        }
        update(id, { status: "converting", error: undefined });
        try {
          const result = await convertPdf(item.file, engine, {
            signal: controller.signal,
            splitPages: splitPages && isPdf(item.file),
          });
          const pages = await readPages(result);
          update(id, { status: "done", result, pages });
        } catch (err) {
          if (err instanceof ConvertAbortedError) {
            update(id, { status: "cancelled" });
          } else {
            update(id, {
              status: "error",
              error:
                err instanceof Error ? err.message : "Erro inesperado na conversão.",
            });
          }
        }
      }
      setRunning(false);
    },
    [update],
  );

  const start = useCallback(
    (files: File[], engine: Engine, splitPages: boolean) => {
      const next = files.map<BatchItem>((file) => ({
        id: crypto.randomUUID(),
        file,
        status: "pending",
      }));
      commit(next);
      void run(
        next.map((it) => it.id),
        engine,
        splitPages,
      );
    },
    [commit, run],
  );

  const retryFailed = useCallback(
    (engine: Engine, splitPages: boolean) => {
      const ids = itemsRef.current
        .filter((it) => it.status === "error" || it.status === "cancelled")
        .map((it) => it.id);
      commit(
        itemsRef.current.map((it) =>
          ids.includes(it.id) ? { ...it, status: "pending", error: undefined } : it,
        ),
      );
      void run(ids, engine, splitPages);
    },
    [commit, run],
  );

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    commit([]);
    setRunning(false);
  }, [commit]);

  return { items, running, start, retryFailed, cancel, reset };
}
