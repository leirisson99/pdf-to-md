"use client";

import { useEffect, useState } from "react";
import { fetchHistory, type HistoryPage } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { AlertIcon } from "./icons";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: HistoryPage };

const ENGINE_LABEL = { fast: "Fast", accurate: "Accurate" } as const;

export default function HistoryList() {
  const [page, setPage] = useState(1);
  const [state, setState] = useState<State>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  function goTo(nextPage: number) {
    setState({ status: "loading" });
    setPage(nextPage);
  }

  function retry() {
    setState({ status: "loading" });
    setReloadKey((k) => k + 1);
  }

  useEffect(() => {
    const controller = new AbortController();
    fetchHistory(page, controller.signal)
      .then((data) => setState({ status: "ready", data }))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setState({
          status: "error",
          message:
            err instanceof TypeError
              ? "Não foi possível conectar ao servidor. Verifique se o backend está no ar."
              : err instanceof Error
                ? err.message
                : "Erro ao carregar o histórico.",
        });
      });
    return () => controller.abort();
  }, [page, reloadKey]);

  if (state.status === "loading") {
    return <p className="py-12 text-center text-sm text-muted">Carregando…</p>;
  }

  if (state.status === "error") {
    return (
      <div
        role="alert"
        className="flex flex-col items-center gap-3 rounded-xl bg-danger-soft px-4 py-8 text-center"
      >
        <AlertIcon width={20} height={20} className="text-danger" />
        <p className="text-sm text-danger">{state.message}</p>
        <button
          type="button"
          onClick={retry}
          className="h-10 rounded-xl border border-line px-4 text-sm font-medium hover:bg-surface"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const { items, total, page_size } = state.data;
  const totalPages = Math.max(1, Math.ceil(total / page_size));

  // Página ficou vazia (ex.: registros removidos): volta para a última existente.
  if (items.length === 0 && total > 0 && page > totalPages) {
    goTo(totalPages);
    return null;
  }

  if (total === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted">
        Nenhuma conversão ainda. Converta um arquivo para vê-lo aqui.
      </p>
    );
  }

  return (
    <div>
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-4 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{item.filename}</p>
              <p className="truncate font-mono text-xs text-muted">
                {item.output_filename}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm">{formatDateTime(item.created_at)}</p>
              <p className="text-xs text-muted">{ENGINE_LABEL[item.engine]}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => goTo(page - 1)}
          className="h-10 rounded-xl border border-line px-4 text-sm font-medium hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
        >
          Anterior
        </button>
        <span className="text-sm text-muted">
          Página {page} de {totalPages} · {total}{" "}
          {total === 1 ? "conversão" : "conversões"}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => goTo(page + 1)}
          className="h-10 rounded-xl border border-line px-4 text-sm font-medium hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
