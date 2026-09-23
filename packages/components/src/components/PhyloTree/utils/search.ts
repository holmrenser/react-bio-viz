/** Case-insensitive substring match, or (with `useRegex`) a user regular expression. An invalid regex matches nothing rather than throwing. */
export function matchesQuery(name: string, query: string, useRegex: boolean): boolean {
  if (!query) return true;
  if (useRegex) {
    try {
      return new RegExp(query, "i").test(name);
    } catch {
      return false;
    }
  }
  return name.toLowerCase().includes(query.toLowerCase());
}
