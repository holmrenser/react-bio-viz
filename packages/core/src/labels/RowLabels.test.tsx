import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RowLabels } from "./RowLabels";

const rows = ["alpha", "beta", "gamma", "delta"].map((label) => ({ id: `id-${label}`, label }));
const base = { rows, rowHeight: 20, offsetY: 0, width: 120, height: 80 };

function rowElement(index: number): HTMLElement {
  return document.querySelector(`[data-row-index="${index}"]`) as HTMLElement;
}

describe("RowLabels", () => {
  it("renders only rows inside the visible window", () => {
    const many = Array.from({ length: 500 }, (_, i) => ({ id: String(i), label: `row ${i}` }));
    render(<RowLabels {...base} rows={many} offsetY={-200 * 20} />);
    expect(screen.getByText("row 200")).toBeTruthy();
    expect(screen.queryByText("row 0")).toBeNull();
    expect(document.querySelectorAll("[data-row-index]").length).toBeLessThan(10);
  });

  it("reports a click, with modifiers, when the pointer is released without dragging", () => {
    const onRowClick = vi.fn();
    render(<RowLabels {...base} onRowClick={onRowClick} />);
    fireEvent.pointerDown(rowElement(2), { button: 0, clientX: 5, clientY: 50 });
    fireEvent.pointerUp(rowElement(2).parentElement!, { clientX: 5, clientY: 50, shiftKey: true });
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick.mock.calls[0][0]).toBe(2);
    expect(onRowClick.mock.calls[0][1].shiftKey).toBe(true);
  });

  it("renames inline on double-click and commits on Enter", () => {
    const onRename = vi.fn();
    render(<RowLabels {...base} onRename={onRename} />);
    fireEvent.doubleClick(screen.getByText("beta"));
    const input = screen.getByLabelText("New name");
    fireEvent.change(input, { target: { value: "  renamed " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onRename).toHaveBeenCalledWith("id-beta", "renamed");
  });

  it("does not report a rename that leaves the name unchanged", () => {
    const onRename = vi.fn();
    render(<RowLabels {...base} onRename={onRename} />);
    fireEvent.doubleClick(screen.getByText("beta"));
    fireEvent.keyDown(screen.getByLabelText("New name"), { key: "Enter" });
    expect(onRename).not.toHaveBeenCalled();
  });

  it("offers remove on the hovered row", () => {
    const onRemove = vi.fn();
    render(<RowLabels {...base} hoverIndex={1} onRemove={onRemove} />);
    fireEvent.click(screen.getByLabelText("Remove beta"));
    expect(onRemove).toHaveBeenCalledWith("id-beta");
  });

  it("drags a row to a new position, previewing live and committing once on drop", () => {
    const onReorder = vi.fn();
    const onReorderPreview = vi.fn();
    render(<RowLabels {...base} onReorder={onReorder} onReorderPreview={onReorderPreview} />);
    const container = rowElement(0).parentElement!;
    fireEvent.pointerDown(rowElement(0), { button: 0, clientX: 5, clientY: 10 });
    fireEvent.pointerMove(container, { clientX: 5, clientY: 30 });
    fireEvent.pointerMove(container, { clientX: 5, clientY: 70 });
    expect(onReorderPreview).toHaveBeenLastCalledWith({ from: 0, to: 3 });
    expect(onReorder).not.toHaveBeenCalled();
    fireEvent.pointerUp(container, { clientX: 5, clientY: 70 });
    expect(onReorder).toHaveBeenCalledWith(0, 3);
    expect(onReorderPreview).toHaveBeenLastCalledWith(null);
  });

  it("hides label text when rows are too thin to read", () => {
    render(<RowLabels {...base} rowHeight={3} />);
    expect(screen.queryByText("alpha")).toBeNull();
  });
});
