/**
 * The data the components take in are the [betula](https://holmrenser.github.io/betula/) schemas,
 * shared with picea, acacia, blastserver and iqtreeserver, so their JSON renders as-is. Only the
 * types are used (`betula-schema` is a type-only dependency, inlined into the published
 * declarations); to validate untrusted input, call `parse` from `betula-schema` yourself.
 */
export * from "./types";
export { alignmentSequences } from "./alignmentSequences";
