import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import HistoryList from "@/components/HistoryList";

export const metadata: Metadata = {
  title: "Histórico — pdfToMd",
};

export default function HistoryPage() {
  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col items-center px-4 pb-16 pt-12">
        <div className="w-full max-w-[680px]">
          <h1 className="text-3xl font-bold tracking-tight">Histórico</h1>
          <p className="mb-8 mt-2 text-sm text-muted">
            Arquivos já convertidos. Guardamos apenas o nome e a data, nunca o
            conteúdo.
          </p>
          <HistoryList />
        </div>
      </main>
      <Footer />
    </>
  );
}
