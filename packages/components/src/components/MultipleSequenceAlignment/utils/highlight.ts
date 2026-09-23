/**
 * Per-column match mask for one sequence against `pattern` (case-insensitive plain substring, or
 * a user-supplied regular expression when `useRegex`). An invalid regex matches nothing rather
 * than throwing — a search box shouldn't be able to crash the canvas.
 */
export function computeHighlightMask(sequence: string, pattern: string, useRegex: boolean): boolean[] {
  const mask = new Array(sequence.length).fill(false);
  if (!pattern) return mask;

  if (useRegex) {
    let regex: RegExp;
    try {
      regex = new RegExp(pattern, "gi");
    } catch {
      return mask;
    }
    let match: RegExpExecArray | null;
    while ((match = regex.exec(sequence))) {
      for (let i = match.index; i < match.index + match[0].length && i < mask.length; i += 1) {
        mask[i] = true;
      }
      if (match[0].length === 0) regex.lastIndex += 1;
    }
    return mask;
  }

  const haystack = sequence.toLowerCase();
  const needle = pattern.toLowerCase();
  if (!needle) return mask;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    for (let i = index; i < index + needle.length; i += 1) mask[i] = true;
    index = haystack.indexOf(needle, index + 1);
  }
  return mask;
}
