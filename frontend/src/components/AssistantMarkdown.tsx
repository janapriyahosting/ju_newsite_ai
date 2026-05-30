"use client";
import React, { CSSProperties } from "react";
import ReactMarkdown from "react-markdown";

type Variant = "hero" | "bubble" | "inline";

interface AssistantMarkdownProps {
  text: string;
  variant?: Variant;
  style?: CSSProperties;
}

// Renders assistant replies as markdown so **bold**, lists, and paragraphs
// arrive visually formatted instead of as raw asterisks/hyphens.
export default function AssistantMarkdown({ text, variant = "bubble", style }: AssistantMarkdownProps) {
  const tight = variant === "inline";

  return (
    <div className={`assistant-md assistant-md--${variant}`} style={style}>
      <ReactMarkdown
        components={{
          p: ({ children }) => (
            <p style={{ margin: tight ? 0 : "0 0 0.6em 0" }}>{children}</p>
          ),
          ul: ({ children }) => (
            <ul style={{ margin: "0.25em 0 0.6em 0", paddingLeft: "1.15em" }}>{children}</ul>
          ),
          ol: ({ children }) => (
            <ol style={{ margin: "0.25em 0 0.6em 0", paddingLeft: "1.4em" }}>{children}</ol>
          ),
          li: ({ children }) => (
            <li style={{ margin: "0.18em 0", lineHeight: 1.55 }}>{children}</li>
          ),
          h1: ({ children }) => (
            <strong style={{ display: "block", fontSize: "1.05em", margin: "0.4em 0 0.25em 0" }}>{children}</strong>
          ),
          h2: ({ children }) => (
            <strong style={{ display: "block", fontSize: "1.02em", margin: "0.4em 0 0.2em 0" }}>{children}</strong>
          ),
          h3: ({ children }) => (
            <strong style={{ display: "block", margin: "0.35em 0 0.15em 0" }}>{children}</strong>
          ),
          strong: ({ children }) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
          em: ({ children }) => <em style={{ fontStyle: "italic" }}>{children}</em>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer"
              style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 2 }}>
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code style={{
              background: "rgba(0,0,0,0.06)", padding: "1px 5px", borderRadius: 4,
              fontSize: "0.92em", fontFamily: "ui-monospace,Menlo,monospace",
            }}>{children}</code>
          ),
          hr: () => <hr style={{ border: "none", borderTop: "1px solid currentColor", opacity: 0.18, margin: "0.6em 0" }} />,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
