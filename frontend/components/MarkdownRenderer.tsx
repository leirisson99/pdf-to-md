"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Sem rehype-raw: HTML bruto no Markdown NÃO é renderizado (conteúdo de terceiros).
// Imagens ficam desligadas para o navegador não fazer requisições externas.
const components: Components = {
  h1: (p) => <h1 className="mb-4 mt-8 text-3xl font-bold first:mt-0" {...strip(p)} />,
  h2: (p) => (
    <h2 className="mb-3 mt-8 border-b border-line pb-2 text-2xl font-semibold first:mt-0" {...strip(p)} />
  ),
  h3: (p) => <h3 className="mb-2 mt-6 text-xl font-semibold" {...strip(p)} />,
  h4: (p) => <h4 className="mb-2 mt-5 text-lg font-semibold" {...strip(p)} />,
  h5: (p) => <h5 className="mb-2 mt-4 font-semibold" {...strip(p)} />,
  h6: (p) => <h6 className="mb-2 mt-4 font-semibold text-muted" {...strip(p)} />,
  p: (p) => <p className="my-4 leading-7" {...strip(p)} />,
  ul: (p) => <ul className="my-4 list-disc space-y-1 pl-6" {...strip(p)} />,
  ol: (p) => <ol className="my-4 list-decimal space-y-1 pl-6" {...strip(p)} />,
  li: (p) => <li className="leading-7" {...strip(p)} />,
  blockquote: (p) => (
    <blockquote className="my-4 border-l-4 border-accent/60 pl-4 text-muted" {...strip(p)} />
  ),
  hr: () => <hr className="my-8 border-line" />,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent-text underline underline-offset-2 hover:opacity-80"
    >
      {children}
    </a>
  ),
  img: () => null,
  code: (p) => (
    <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[0.9em]" {...strip(p)} />
  ),
  pre: (p) => (
    <pre
      className="my-4 overflow-x-auto rounded-xl border border-line bg-surface p-4 font-mono text-[13px] leading-relaxed [&_code]:bg-transparent [&_code]:p-0"
      {...strip(p)}
    />
  ),
  table: (p) => (
    <div className="my-4 overflow-x-auto rounded-xl border border-line">
      <table className="w-full border-collapse text-sm" {...strip(p)} />
    </div>
  ),
  thead: (p) => <thead className="bg-surface" {...strip(p)} />,
  th: (p) => (
    <th className="border-b border-line px-3 py-2 text-left font-semibold" {...strip(p)} />
  ),
  td: (p) => <td className="border-t border-line px-3 py-2 align-top" {...strip(p)} />,
};

/** Remove a prop `node` do react-markdown antes de espalhar no elemento DOM. */
function strip<T extends { node?: unknown }>(props: T): Omit<T, "node"> {
  const { node: _node, ...rest } = props;
  void _node;
  return rest;
}

export default function MarkdownRenderer({ text }: { text: string }) {
  return (
    <div className="break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
