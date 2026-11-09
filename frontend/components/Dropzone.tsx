"use client";

import { useRef, useState } from "react";
import { MAX_FILE_SIZE_MB } from "@/lib/api";
import { ACCEPT_ATTR, ACCEPTED_LABEL } from "@/lib/formats";
import { UploadIcon } from "./icons";

interface Props {
  onFiles: (files: File[]) => void;
  error?: string | null;
}

export default function Dropzone({ onFiles, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(files: FileList | null) {
    if (files && files.length > 0) onFiles(Array.from(files));
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`flex h-[200px] w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 text-center transition-colors sm:h-[256px] ${
          dragging
            ? "border-accent bg-accent-soft"
            : "border-muted/50 bg-surface hover:border-muted"
        }`}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-inset">
          <UploadIcon width={26} height={26} />
        </span>
        <span className="mt-5 max-w-[16rem] text-lg font-semibold sm:max-w-none">
          Arraste seus arquivos aqui ou clique para selecionar
        </span>
        <span className="mt-2 text-sm text-muted">
          {ACCEPTED_LABEL} · até {MAX_FILE_SIZE_MB} MB cada
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
