/** Quita delimitadores de fórmula y deja el texto de adentro. Un $ suelto (precio) se conserva. */
export function plainMathText(text: string) {
  return text
    .replace(/\$\$([\s\S]+?)\$\$/g, '$1')
    .replace(/\\\[([\s\S]+?)\\\]/g, '$1')
    .replace(/\\\(([\s\S]+?)\\\)/g, '$1')
    .replace(/(^|[^$\\])\$(?!\$)([^$\n]+?)\$(?!\$)/g, '$1$2')
}
