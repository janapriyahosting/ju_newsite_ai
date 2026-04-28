"use client";
import React from "react";

interface AiIconProps {
  size?: number;
  style?: React.CSSProperties;
  className?: string;
  alt?: string;
}

// Brand mark used as the AI persona / NLP-search marker. Replaces the
// previous ✦ glyph everywhere that represents the assistant.
export default function AiIcon({
  size = 24,
  style,
  className,
  alt = "Janapriya AI",
}: AiIconProps) {
  return (
    <img
      src="/jp-ai-logo.png"
      alt={alt}
      width={size}
      height={size}
      className={className}
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
