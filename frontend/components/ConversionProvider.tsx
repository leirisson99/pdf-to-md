"use client";

import { createContext, useContext, useMemo, useState } from "react";

export interface Conversion {
  filename: string;
  blob: Blob;
  text: string;
}

interface ConversionContextValue {
  conversion: Conversion | null;
  setConversion: (conversion: Conversion | null) => void;
}

const ConversionContext = createContext<ConversionContextValue | null>(null);

/**
 * Guarda o último resultado apenas em memória no navegador, para que a página
 * de visualização o leia sem nada ser persistido (nem no servidor).
 */
export function ConversionProvider({ children }: { children: React.ReactNode }) {
  const [conversion, setConversion] = useState<Conversion | null>(null);
  const value = useMemo(() => ({ conversion, setConversion }), [conversion]);
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
