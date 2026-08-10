import { Fragment, useState, type ReactNode } from "react";

type CodeLanguage = "shell" | "typescript";
type TokenKind = "plain" | "command" | "keyword" | "option" | "string" | "comment" | "literal";

type CodeBlockProps = {
  code: string;
  language: CodeLanguage;
  label?: string;
  copyLabel: string;
  copiedLabel: string;
  copyFailedLabel: string;
  className?: string;
};

const shellKeywords = new Set([
  "add",
  "call",
  "install",
  "preview",
  "search",
  "show",
  "skill"
]);

const typeScriptKeywords = new Set([
  "await",
  "const",
  "from",
  "import",
  "new",
  "return"
]);

function token(kind: TokenKind, value: string, key: number): ReactNode {
  return kind === "plain"
    ? value
    : <span className={`code-token code-token-${kind}`} key={key}>{value}</span>;
}

function highlightShell(line: string): ReactNode[] {
  const parts = line.match(/\s+|'[^']*'|"(?:\\.|[^"\\])*"|#[^\n]*|--?[A-Za-z0-9][\w-]*|[^\s]+/g) ?? [];
  let sawCommand = false;
  return parts.map((part, index) => {
    if (/^\s+$/.test(part)) return token("plain", part, index);
    if (part.startsWith("#")) return token("comment", part, index);
    if (part.startsWith("'") || part.startsWith('"')) return token("string", part, index);
    if (part.startsWith("-")) return token("option", part, index);
    if (!sawCommand) {
      sawCommand = true;
      return token("command", part, index);
    }
    if (shellKeywords.has(part)) return token("keyword", part, index);
    if (/^(true|false|null|\d+(?:\.\d+)?)$/.test(part)) return token("literal", part, index);
    return token("plain", part, index);
  });
}

function highlightTypeScript(line: string): ReactNode[] {
  const parts = line.match(/\s+|\/\/.*$|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|\b(?:await|const|from|import|new|return|true|false|null|undefined)\b|[^\s]+/g) ?? [];
  return parts.map((part, index) => {
    if (/^\s+$/.test(part)) return token("plain", part, index);
    if (part.startsWith("//")) return token("comment", part, index);
    if (part.startsWith("'") || part.startsWith('"')) return token("string", part, index);
    if (typeScriptKeywords.has(part)) return token("keyword", part, index);
    if (/^(true|false|null|undefined|\d+(?:\.\d+)?)$/.test(part)) {
      return token("literal", part, index);
    }
    return token("plain", part, index);
  });
}

export function CodeBlock({
  code,
  language,
  label,
  copyLabel,
  copiedLabel,
  copyFailedLabel,
  className
}: CodeBlockProps) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const lines = code.split("\n");
  const languageLabel = language === "shell" ? "Shell" : "TypeScript";

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
    window.setTimeout(() => setCopyStatus("idle"), 2500);
  }

  return (
    <figure className={["code-frame", className].filter(Boolean).join(" ")}>
      <figcaption className="code-frame-bar">
        <span className="code-frame-lights" aria-hidden="true"><i /><i /><i /></span>
        <span className="code-frame-label">{label ?? languageLabel}</span>
        <button type="button" className="code-copy-button" onClick={() => void copyCode()}>
          {copyStatus === "copied"
            ? copiedLabel
            : copyStatus === "failed"
              ? copyFailedLabel
              : copyLabel}
        </button>
        <span className="sr-only" role="status" aria-live="polite">
          {copyStatus === "copied" ? copiedLabel : copyStatus === "failed" ? copyFailedLabel : ""}
        </span>
      </figcaption>
      <pre className="code-frame-content" tabIndex={0} aria-label={`${label ?? languageLabel} code`}>
        <code>
          {lines.map((line, index) => (
            <Fragment key={`${index}-${line}`}>
              <span className="code-line">
                {language === "shell" ? highlightShell(line) : highlightTypeScript(line)}
              </span>
              {index < lines.length - 1 ? "\n" : null}
            </Fragment>
          ))}
        </code>
      </pre>
    </figure>
  );
}
