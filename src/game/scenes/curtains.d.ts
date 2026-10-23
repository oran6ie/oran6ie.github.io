export type CurtainPalette = {
  cloth: string[]; print: string[]; rim: string[]; line: string; shadow: string;
  rod: string[]; finial: string[];
};
export type CurtainConfig = {
  top: number; bottom: number;
  rod: { x0: number; x1: number; y: number; h: number; show?: boolean };
  panels: { outer: number; open: number; shut: number }[];
  folds: number;
  speed?: number;
  pal: CurtainPalette;
  print?: (u: number, v: number) => boolean;
  finial?: 'ball' | 'none';
};
export type Curtains = {
  set(shut: boolean, instant?: boolean): void;
  update(dt: number): void;
  draw(g: CanvasRenderingContext2D, ox?: number, oy?: number, P?: number): void;
  readonly k: number;
  breeze: number;
  spans(): [number, number][];
};
export function createCurtains(cfg: CurtainConfig): Curtains;
export function fernPrint(u: number, v: number): boolean;
