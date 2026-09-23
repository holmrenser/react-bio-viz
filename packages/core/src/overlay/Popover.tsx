import type { ReactNode } from "react";

import {
  Popover as PopoverRoot,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger as PopoverTriggerPrimitive,
} from "../components/ui/popover";

/** @public Opens/closes the popover; wraps shadcn/ui's Radix-based `Popover` root. */
export const Popover = PopoverRoot;
/** @public Wrap the element that should open the popover on click. */
export const PopoverTrigger = PopoverTriggerPrimitive;

/** @public */
export interface PopoverBodyProps {
  /** Rendered as the popover's title, via `PopoverHeader`/`PopoverTitle`, unless `renderHeader` overrides it. */
  header?: ReactNode;
  /** Override how `header` is rendered (default: `PopoverHeader` + `PopoverTitle`). */
  renderHeader?: (header: ReactNode) => ReactNode;
  /** Override how the body content is rendered (default: rendered as-is). */
  renderBody?: (children: ReactNode) => ReactNode;
  children?: ReactNode;
}

/**
 * @public
 * The popover's floating content. Framework-agnostic replacement for the old Bulma-styled
 * popover: built on Radix + Tailwind (compiled away at build time, see the `bio-viz-conventions`
 * skill) instead of `react-popper` + Bulma classes, and with `renderHeader`/`renderBody` override
 * slots so GeneModel/GenomeBrowser/BlastHitDistribution can each customize presentation without a
 * new implementation.
 *
 * @example
 * ```tsx
 * <Popover>
 *   <PopoverTrigger asChild>
 *     <rect data-pan-ignore />
 *   </PopoverTrigger>
 *   <PopoverBody header={feature.id}>{details}</PopoverBody>
 * </Popover>
 * ```
 */
export function PopoverBody({ header, renderHeader, renderBody, children }: PopoverBodyProps) {
  return (
    <PopoverContent>
      {header !== undefined &&
        (renderHeader ? (
          renderHeader(header)
        ) : (
          <PopoverHeader>
            <PopoverTitle>{header}</PopoverTitle>
          </PopoverHeader>
        ))}
      {renderBody ? renderBody(children) : children}
    </PopoverContent>
  );
}
