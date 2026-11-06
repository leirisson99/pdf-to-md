import { FileIcon, GithubIcon } from "./icons";

const REPO_URL = "https://github.com/sistemaboutiqueartesanais/pdf-to-md";

export default function Header() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex h-[70px] max-w-[920px] items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-ink">
            <FileIcon width={18} height={18} />
          </span>
          <span className="font-mono text-base font-semibold">pdfToMd</span>
        </div>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-10 items-center gap-2 rounded-xl border border-line px-4 text-sm font-medium transition-colors hover:bg-surface"
        >
          <GithubIcon width={18} height={18} />
          GitHub
        </a>
      </div>
    </header>
  );
}
