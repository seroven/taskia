export function stripDrewPhrase(speak: string): string {
  return speak.replace(/te lo dibuj[eé] en la pizarra\.?\s*/gi, '').trim()
}

/** Quita delimitadores de fórmula ($3x$, $$…$$, \(…\)) y deja el texto de adentro. */
export function stripMathDelimiters(text: string): string {
  return text
    .replace(/\$\$([\s\S]+?)\$\$/g, '$1')
    .replace(/\\\[([\s\S]+?)\\\]/g, '$1')
    .replace(/\\\(([\s\S]+?)\\\)/g, '$1')
    .replace(/(^|[^$\\])\$(?!\$)([^$\n]+?)\$(?!\$)/g, '$1$2')
}
