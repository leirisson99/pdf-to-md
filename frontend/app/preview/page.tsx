import type { Metadata } from "next";
import MarkdownViewer from "@/components/MarkdownViewer";

export const metadata: Metadata = {
  title: "Visualizar — pdfToMd",
};

export default function PreviewPage() {
  return <MarkdownViewer />;
}
