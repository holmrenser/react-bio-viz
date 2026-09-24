import type { Tree } from "../types";

/**
 * @public
 * Parses a Newick string into a {@link Tree}. Internal-node labels (typically bootstrap support)
 * become the node's `name`; `:length` suffixes become `length` (0 when absent). Quoted labels
 * (`'a b'`, with `''` as an escaped quote) are unquoted, so names containing Newick's special
 * characters — spaces, pipes and commas in FASTA headers — round-trip through {@link toNewick}.
 */
export function parseNewick(text: string): Tree {
  let i = 0;
  const skipSpace = () => {
    while (i < text.length && /\s/.test(text[i])) i += 1;
  };

  function parseLabel(): string {
    skipSpace();
    const quote = text[i];
    if (quote === "'" || quote === '"') {
      i += 1;
      let label = "";
      while (i < text.length) {
        if (text[i] === quote) {
          if (text[i + 1] === quote) {
            label += quote;
            i += 2;
            continue;
          }
          i += 1;
          break;
        }
        label += text[i];
        i += 1;
      }
      return label;
    }
    const start = i;
    while (i < text.length && !":,();".includes(text[i])) i += 1;
    return text.slice(start, i).trim();
  }

  function parseNode(): Tree {
    const node: Tree = { name: "", length: 0, children: [] };
    skipSpace();
    if (text[i] === "(") {
      i += 1;
      node.children.push(parseNode());
      skipSpace();
      while (text[i] === ",") {
        i += 1;
        node.children.push(parseNode());
        skipSpace();
      }
      if (text[i] === ")") i += 1;
    }
    node.name = parseLabel();
    skipSpace();
    if (text[i] === ":") {
      i += 1;
      const start = i;
      while (i < text.length && !",);".includes(text[i])) i += 1;
      node.length = Number.parseFloat(text.slice(start, i)) || 0;
    }
    return node;
  }

  return parseNode();
}

function quote(name: string): string {
  return /[\s:,;()[\]']/.test(name) ? `'${name.replace(/'/g, "''")}'` : name;
}

/**
 * @public
 * Serializes a {@link Tree} to Newick. Names with Newick's special characters are quoted; a zero
 * branch length on the root is omitted. Pair with {@link applyTreeSelection} to export the tree as
 * displayed (rerooted, reordered).
 */
export function toNewick(tree: Tree): string {
  function write(node: Tree, isRoot: boolean): string {
    const children = node.children.length > 0 ? `(${node.children.map((child) => write(child, false)).join(",")})` : "";
    const length = isRoot && !node.length ? "" : `:${node.length}`;
    return `${children}${quote(node.name)}${length}`;
  }
  return `${write(tree, true)};`;
}
