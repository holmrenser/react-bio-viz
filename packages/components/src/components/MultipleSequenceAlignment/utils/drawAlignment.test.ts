import { describe, expect, it, vi } from "vitest";

import { buildColorIndex } from "./colorIndex";
import { drawAlignment } from "./drawAlignment";

function recordingContext() {
  const fills: { color: string; x: number; y: number; w: number; h: number }[] = [];
  const texts: { text: string; x: number; y: number }[] = [];
  let fillStyle = "";
  let putImage: ImageData | null = null;
  const ctx = {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    set fillStyle(value: string) {
      fillStyle = value;
    },
    get fillStyle() {
      return fillStyle;
    },
    font: "",
    textAlign: "",
    textBaseline: "",
    fillRect: (x: number, y: number, w: number, h: number) => fills.push({ color: fillStyle, x, y, w, h }),
    fillText: (text: string, x: number, y: number) => texts.push({ text, x, y }),
    createImageData: (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    putImageData: (image: ImageData) => {
      putImage = image;
    },
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, fills, texts, image: () => putImage };
}

const sequences = ["ACGT", "AAAA", "TTTT"];
const colorIndex = buildColorIndex(sequences, (char) => ({ A: "#ff0000", C: "#00ff00", G: "#0000ff", T: "#ffffff" })[char] ?? "#000000");
const base = { colorIndex, sequences, devicePixelRatio: 1, letterColor: "black" };

describe("drawAlignment", () => {
  it("fills only the visible cells and draws letters when cells are large", () => {
    const { ctx, fills, texts } = recordingContext();
    drawAlignment(ctx, {
      ...base,
      rowOrder: [0, 1, 2],
      window: { x0: 1, x1: 3, y0: 0, y1: 1 },
      width: 40,
      height: 20,
      showLetters: true,
    });
    expect(fills.map((f) => f.color)).toEqual(["#00ff00", "#0000ff"]);
    expect(texts.map((t) => t.text)).toEqual(["C", "G"]);
  });

  it("follows the display row order", () => {
    const { ctx, texts } = recordingContext();
    drawAlignment(ctx, {
      ...base,
      rowOrder: [2, 0, 1],
      window: { x0: 0, x1: 1, y0: 0, y1: 1 },
      width: 20,
      height: 20,
      showLetters: true,
    });
    expect(texts.map((t) => t.text)).toEqual(["T"]);
  });

  it("draws a dot for residues matching the reference", () => {
    const { ctx, texts } = recordingContext();
    drawAlignment(ctx, {
      ...base,
      rowOrder: [1],
      window: { x0: 0, x1: 2, y0: 0, y1: 1 },
      width: 40,
      height: 20,
      showLetters: true,
      reference: "AC",
    });
    expect(texts.map((t) => t.text)).toEqual(["·", "A"]);
  });

  it("merges equal neighbours into one rect when cells are small", () => {
    const { ctx, fills } = recordingContext();
    drawAlignment(ctx, {
      ...base,
      rowOrder: [1],
      window: { x0: 0, x1: 4, y0: 0, y1: 1 },
      width: 12,
      height: 3,
      showLetters: true,
    });
    expect(fills).toHaveLength(1);
    expect(fills[0].w).toBeCloseTo(12);
  });

  it("samples per pixel when cells are smaller than a pixel", () => {
    const { ctx, fills, image } = recordingContext();
    drawAlignment(ctx, {
      ...base,
      rowOrder: [0, 1, 2],
      window: { x0: 0, x1: 4, y0: 0, y1: 3 },
      width: 2,
      height: 1,
      showLetters: true,
    });
    expect(fills).toHaveLength(0);
    const data = image()!.data;
    // Pixel 0's centre falls in column 1 of display row 1 (AAAA), so it is red.
    expect(Array.from(data.slice(0, 4))).toEqual([255, 0, 0, 255]);
  });
});
