"use client";

import { useState } from "react";
import { PatternDiagram } from "@/components/academy/pattern-diagram";

type Props = {
  src: string;
  alt: string;
  slug: string;
  /** Class applied to the <img> element */
  imgClassName?: string;
};

export function LessonImage({ src, alt, slug, imgClassName }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="mt-4 w-full rounded-xl border border-border/60 bg-card/50 p-4">
        <PatternDiagram slug={slug} />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={imgClassName ?? "mt-4 w-full rounded-xl object-cover max-h-60"}
      onError={() => setFailed(true)}
    />
  );
}
