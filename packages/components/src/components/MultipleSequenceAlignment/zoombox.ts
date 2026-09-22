import { immerable, produce } from "immer";

const DEFAULT_PAN_ZOOM = 10;

function clamp(number: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(number, minimum), maximum);
}

function add(a: number, b: number): number {
  return a + b;
}

function subtract(a: number, b: number): number {
  return a - b;
}

type Operator = typeof add | typeof subtract;

export class ZoomBox {
  [immerable] = true;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  constructor({
    xMin = 0,
    xMax,
    yMin = 0,
    yMax,
    x0,
    x1,
    y0,
    y1,
  }: {
    xMin?: number;
    xMax: number;
    yMin?: number;
    yMax: number;
    x0?: number;
    x1?: number;
    y0?: number;
    y1?: number;
  }) {
    this.xMin = xMin;
    this.x0 = typeof x0 !== "undefined" ? x0 : xMin;
    this.xMax = xMax;
    this.x1 = typeof x1 !== "undefined" ? x1 : xMax;
    this.yMin = yMin;
    this.y0 = typeof y0 !== "undefined" ? y0 : yMin;
    this.yMax = yMax;
    this.y1 = typeof y1 !== "undefined" ? y1 : yMax;
  }

  clampX(number: number): number {
    return clamp(number, this.xMin, this.xMax);
  }
  clampY(number: number): number {
    return clamp(number, this.yMin, this.yMax);
  }

  get width(): number {
    return this.x1 - this.x0;
  }

  get height(): number {
    return this.y1 - this.y0;
  }

  get xZoom(): number {
    return this.width / this.xMax;
  }

  get yZoom(): number {
    return this.height / this.yMax;
  }

  _panZoom(
    stepSize: number,
    direction: "x" | "y",
    operator: Operator | [Operator, Operator]
  ) {
    const [operator1, operator2] = Array.isArray(operator)
      ? operator
      : [operator, operator];
    return produce(this, (draft) => {
      const a0 = this.clampX(operator1(this[`${direction}0`], stepSize));
      const a1 = this.clampX(operator2(this[`${direction}1`], stepSize));
      const newSize = a1 - a0;
      const oldSize = direction === "x" ? this.width : this.height;
      if (Math.abs(newSize - oldSize) < 0.001) {
        draft[`${direction}0`] = a0;
        draft[`${direction}1`] = a1;
      } else {
        draft[`${direction}0`] = a1 - oldSize;
        draft[`${direction}1`] = a1;
      }
    });
  }

  panLeft(stepSize: number = DEFAULT_PAN_ZOOM): ZoomBox {
    return this._panZoom(stepSize, "x", subtract);
  }

  panRight(stepSize: number = DEFAULT_PAN_ZOOM) {
    return this._panZoom(stepSize, "x", add);
  }

  panUp(stepSize: number = DEFAULT_PAN_ZOOM) {
    return this._panZoom(stepSize, "y", subtract);
  }

  panDown(stepSize: number = DEFAULT_PAN_ZOOM) {
    return this._panZoom(stepSize, "y", add);
  }

  zoomInX(stepSize: number = DEFAULT_PAN_ZOOM) {
    return this._panZoom(stepSize, "y", [add, subtract]);
  }
  zoomInY(stepSize: number = DEFAULT_PAN_ZOOM) {
    return this._panZoom(stepSize, "y", [add, subtract]);
  }

  zoomOutX(stepSize: number = DEFAULT_PAN_ZOOM) {
    return this._panZoom(stepSize, "x", [subtract, add]);
  }
  zoomOutY(stepSize: number = DEFAULT_PAN_ZOOM) {
    return this._panZoom(stepSize, "y", [subtract, add]);
  }
}
