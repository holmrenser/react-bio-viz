import type { HitSelection } from "../types";

export const EMPTY_SELECTION: HitSelection = { selectedHitIds: [] };

/** `selection` with `hitId` added, or removed if it was already selected. */
export function toggleHit(selection: HitSelection, hitId: string): HitSelection {
  const ids = selection.selectedHitIds;
  return { ...selection, selectedHitIds: ids.includes(hitId) ? ids.filter((id) => id !== hitId) : [...ids, hitId] };
}
