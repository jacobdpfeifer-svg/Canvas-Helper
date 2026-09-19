import type { ReactNode } from "react";

/**
 * Tiny renderer for the legal drafts (headings, paragraphs, lists, tables,
 * bold/italic/code). Links render as plain text: nothing in the terms sheet
 * navigates. Not a general Markdown engine.
 */
export function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;
  const flushPara = (buf: string[]) => {
    if (buf.length) out.push(<p key={key++}>{inline(buf.join(" "))}</p>);
    buf.length = 0;
  };
  const para: string[] = [];
  while (i < lines.length) {
    const line = lines[i];
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      flushPara(para);
      const level = h[1].length;
      const content = inline(h[2]);
      out.push(level <= 1 ? <h2 key={key++}>{content}</h2> : level === 2 ? <h3 key={key++}>{content}</h3> : <h4 key={key++}>{content}</h4>);
      i++;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      flushPara(para);
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && (/^\s*[-*]\s+/.test(lines[i]) || /^\s*\d+\.\s+/.test(lines[i]))) {
        items.push(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ""));
        i++;
      }
      const els = items.map((it, n) => <li key={n}>{inline(it)}</li>);
      out.push(ordered ? <ol key={key++}>{els}</ol> : <ul key={key++}>{els}</ul>);
      continue;
    }
    if (/^\|/.test(line)) {
      flushPara(para);
      const rows: string[][] = [];
      while (i < lines.length && /^\|/.test(lines[i])) {
        const cells = lines[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        if (!cells.every((c) => /^:?-+:?$/.test(c))) rows.push(cells);
        i++;
      }
      const [head, ...body] = rows;
      out.push(
        <table key={key++}>
          {head && (
            <thead>
              <tr>
                {head.map((c, n) => (
                  <th key={n}>{inline(c)}</th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {body.map((r, rn) => (
              <tr key={rn}>
                {r.map((c, n) => (
                  <td key={n}>{inline(c)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
      continue;
    }
    if (!line.trim()) {
      flushPara(para);
      i++;
      continue;
    }
    para.push(line.trim());
    i++;
  }
  flushPara(para);
  return <div className="markdown">{out}</div>;
}

function inline(text: string): ReactNode[] {
  // links → their text; then **bold**, *italic*, `code`
  const stripped = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  const parts: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(stripped))) {
    if (m.index > last) parts.push(stripped.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) parts.push(<strong key={k++}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("`")) parts.push(<code key={k++}>{tok.slice(1, -1)}</code>);
    else parts.push(<em key={k++}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < stripped.length) parts.push(stripped.slice(last));
  return parts;
}
