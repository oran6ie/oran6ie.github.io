/* Types for outside.js (the view from the terrace in Algarah, shared with Som's app). */
export type Rect = { x: number; y: number; w: number; h: number };
export type OutsideState = {
  sunAlt: number; sunAz: number; moonAlt: number; moonAz: number;
  moonFraction: number; moonWaxing: boolean; moonPhase?: number;
  weather: string; cloud: number; hour?: number;
};
export type OutsideEvents = { night: boolean; flash: boolean; honk?: boolean; thunder?: boolean };
export type OutsideDraw = (ctx: CanvasRenderingContext2D, st: OutsideState, t: number | undefined, dt: number, animate?: boolean, at?: Rect | null) => OutsideEvents;
export const SCENE: { w: number; h: number };
export const HOME: { name: string; lat: number; lon: number; tz: string };
export function createOutside(view?: Rect, opts?: { eager?: boolean }): OutsideDraw;
export function weatherKind(code: number): string;
export function weatherWords(code: number): string;
export function fetchForecast(): Promise<unknown>;
export function iconURL(code: number, isDay?: boolean): string;

export type WindowConfig = {
  style: 'casement' | 'slider'; glass: Rect; open?: boolean;
  mullion?: { x: number; y: number };
  rail?: { x: number; w: number; travel: number; cols: string[] };
  sill: { x0: number; x1: number; y: number; front: number; avoid?: [number, number][] };
  frame?: { dark: string; mid: string; light: string };
  busy?: () => boolean;
};
export type OutsideWindow = {
  readonly open: boolean; readonly k: number; readonly wet: number; readonly birds: number;
  onChirp: ((scared: boolean) => void) | null;
  setOpen(open: boolean): void;
  update(st: OutsideState, dt: number): void;
  draw(ctx: CanvasRenderingContext2D, st: OutsideState, t: number, P?: number): void;
  hit(x: number, y: number): boolean;
};
export function createWindow(cfg: WindowConfig): OutsideWindow;

export type OutsideSound = {
  start(): void;
  set(o: { open?: number; zoom?: number; curtains?: boolean; muted?: boolean; st?: OutsideState }): void;
  tick(dt: number, ev?: Partial<OutsideEvents>): void;
  chirp(scared?: boolean): void;
};
export function createOutsideSound(): OutsideSound;

export function openView(host: HTMLElement, opts: {
  room: HTMLCanvasElement; roomSize: { w: number; h: number }; glass: Rect; block: Rect; crop: Rect;
  look?: { x: number; y: number }; outside: OutsideDraw; mask: () => CanvasImageSource; win: OutsideWindow;
  front?: (ctx: CanvasRenderingContext2D) => void; dark?: () => CanvasImageSource | null;
  state: () => OutsideState; cardSide?: 'left' | 'right';
  buttons?: { label: string; title?: string; onClick: (el: HTMLButtonElement) => void }[];
  onWindow?: (open: boolean) => void; onZoom?: (k: number) => void;
  onClose?: () => void; reducedMotion?: boolean;
}): () => void;
