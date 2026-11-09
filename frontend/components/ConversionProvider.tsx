"use client";

import type { PageEntry } from "@/lib/pages";
import { createContext, useContext, useMemo, useState } from "react";

export interface Conversion {
  filename: string;
  /** Arquivo baixável: o .md, ou o .zip quando o PDF foi dividido por página. */
  blob: Blob;
  pages: PageEntry[];
}

export type ViewMode = "formatted" | "raw";

interface ConversionContextValue {
  conversion: Conversion | null;
  setConversion: (conversion: Conversion | null) => void;
  /** Modo de visualização, compartilhado entre a prévia, a tela cheia e o lote. */
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

const ConversionContext = createContext<ConversionContextValue | null>(null);

/**
 * Guarda o último resultado apenas em memória no navegador, para que a página
 * de visualização o leia sem nada ser persistido (nem no servidor).
 */
export function ConversionProvider({ children }: { children: React.ReactNode }) {
  const [conversion, setConversion] = useState<Conversion | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("formatted");
  const value = useMemo(
    () => ({ conversion, setConversion, viewMode, setViewMode }),
    [conversion, viewMode],
  );
  return (
    <ConversionContext.Provider value={value}>
      {children}
    </ConversionContext.Provider>
  );
}

export function useConversion(): ConversionContextValue {
  const ctx = useContext(ConversionContext);
  if (!ctx) throw new Error("useConversion fora de ConversionProvider");
  return ctx;
}
