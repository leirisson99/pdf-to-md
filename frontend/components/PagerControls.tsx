"use client";

import { ArrowLeftIcon, ArrowRightIcon } from "./icons";

interface Props {
  index: number;
  total: number;
  onChange: (index: number) => void;
  labelPrev?: string;
  labelNext?: string;
}

export default function PagerControls({
  index,
  total,
  onChange,
  labelPrev = "Anterior",
  labelNext = "Próximo",
}: Props) {
  const button =
    "flex h-10 w-10 items-center justify-center rounded-xl border border-line transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={labelPrev}
        disabled={index <= 0}
        onClick={() => onChange(index - 1)}
        className={button}
      >
        <ArrowLeftIcon width={18} height={18} />
      </button>
      <span className="text-sm tabular-nums text-muted">
        {index + 1} / {total}
      </span>
      <button
        type="button"
        aria-label={labelNext}
        disabled={index >= total - 1}
        onClick={() => onChange(index + 1)}
        className={button}
      >
        <ArrowRightIcon width={18} height={18} />
      </button>
    </div>
  );
}
