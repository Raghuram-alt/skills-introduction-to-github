/** A dependency-free animation engine. All times are in milliseconds. */
export type Target = Element | Record<string, any>;
export type Targets = string | Target | Iterable<Target>;
export type Ease = (progress: number) => number;
export type Value = number | string;
export type Dynamic<T> = T | ((target: Target, index: number, total: number) => T);
export interface PropertyOptions {
  value: Dynamic<Value | Value[]>;
  duration?: Dynamic<number>;
  delay?: Dynamic<number>;
  easing?: string | Ease;
}
export interface AnimationOptions {
  targets: Targets;
  duration?: Dynamic<number>;
  delay?: Dynamic<number>;
  easing?: string | Ease;
  autoplay?: boolean;
  loop?: boolean | number;
  direction?: 'normal' | 'reverse' | 'alternate';
  begin?: (animation: Animation) => void;
  update?: (animation: Animation) => void;
  complete?: (animation: Animation) => void;
  [property: string]: unknown;
}
export const easings: Record<string, Ease> = {
  linear: t => t,
  easeInQuad: t => t * t,
  easeOutQuad: t => 1 - (1 - t) ** 2,
  easeInOutQuad: t => t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2,
  easeInCubic: t => t ** 3,
  easeOutCubic: t => 1 - (1 - t) ** 3,
  easeInOutCubic: t => t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2,
  easeInOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  easeOutBack: t => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2,
  easeOutElastic: t => t === 0 || t === 1 ? t : 2 ** (-10 * t) * Math.sin((t * 10 - .75) * (2 * Math.PI / 3)) + 1,
};
const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n));
function easing(value: string | Ease = 'easeOutCubic'): Ease {
  if (typeof value === 'function') return value;
  if (!easings[value]) throw new Error(`Unknown easing: ${value}`);
  return easings[value];
}
function resolveValue<T>(value: Dynamic<T>, target: Target, index: number, total: number): T {
  return typeof value === 'function' ? (value as Function)(target, index, total) : value;
}
const reserved = new Set(['targets', 'duration', 'delay', 'easing', 'autoplay', 'loop', 'direction', 'begin', 'update', 'complete']);
const transforms = new Set(['translateX', 'translateY', 'translateZ', 'rotate', 'rotateX', 'rotateY', 'rotateZ', 'scale', 'scaleX', 'scaleY', 'scaleZ', 'skewX', 'skewY', 'perspective']);
const unitless = new Set(['opacity', 'zIndex', 'fontWeight', 'lineHeight', 'flexGrow', 'flexShrink', 'order', 'strokeDashoffset', 'strokeDasharray']);
const svgAttributes = new Set(['cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'width', 'height', 'viewBox', 'd', 'points', 'pathLength']);
const transformStates = new WeakMap<Element, Map<string, string>>();
const isElement = (target: Target): target is HTMLElement | SVGElement => typeof Element !== 'undefined' && target instanceof Element;
function transformState(target: HTMLElement | SVGElement) {
  let state = transformStates.get(target);
  if (!state) {
    state = new Map();
    const initial = target.style.transform || getComputedStyle(target).transform;
    if (initial && initial !== 'none') {
      for (const match of initial.matchAll(/(\w+)\(([^)]+)\)/g)) state.set(match[1], match[2]);
    }
    transformStates.set(target, state);
  }
  return state;
}
function read(target: Target, key: string): Value {
  if (!isElement(target)) return (target as Record<string, any>)[key] ?? 0;
  if (transforms.has(key)) return transformState(target).get(key) ?? (key.startsWith('scale') ? 1 : 0);
  if (key.startsWith('--')) return getComputedStyle(target).getPropertyValue(key).trim() || 0;
  if (target instanceof SVGElement && (svgAttributes.has(key) || target.hasAttribute(key) || !(key in target.style))) return target.getAttribute(key) ?? 0;
  return (getComputedStyle(target) as any)[key] || 0;
}
function write(target: Target, key: string, value: Value) {
  if (!isElement(target)) { (target as Record<string, any>)[key] = value; return; }
  if (transforms.has(key)) {
    const state = transformState(target);
    state.set(key, String(value));
    target.style.transform = [...state].map(([name, val]) => `${name}(${val})`).join(' ');
  } else if (key.startsWith('--')) target.style.setProperty(key, String(value));
  else if (target instanceof SVGElement && (svgAttributes.has(key) || target.hasAttribute(key) || !(key in target.style))) target.setAttribute(key, String(value));
  else (target.style as any)[key] = String(value);
}
function defaultUnit(target: Target, key: string) {
  if (!isElement(target)) return '';
  if (/^(rotate|skew)/.test(key)) return 'deg';
  if (key.startsWith('scale')) return '';
  if (transforms.has(key)) return 'px';
  if (key.startsWith('--') || unitless.has(key) || target instanceof SVGElement) return '';
  return 'px';
}
function color(value: Value): number[] | null {
  const text = String(value).trim();
  if (/^#[\da-f]{3,8}$/i.test(text)) {
    let hex = text.slice(1);
    if (hex.length === 3 || hex.length === 4) hex = [...hex].map(c => c + c).join('');
    if (hex.length !== 6 && hex.length !== 8) return null;
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16), hex.length === 8 ? parseInt(hex.slice(6), 16) / 255 : 1];
  }
  const rgb = text.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/);
  return rgb ? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), rgb[4] === undefined ? 1 : Number(rgb[4])] : null;
}
function interpolate(from: Value, to: Value, unit: string): (t: number) => Value {
  const a = color(from), b = color(to);
  if (a && b) return t => `rgba(${a.slice(0, 3).map((n, i) => Math.round(clamp(n + (b[i] - n) * t, 0, 255))).join(', ')}, ${clamp(a[3] + (b[3] - a[3]) * t)})`;
  const pattern = /^(-?\d*\.?\d+(?:e[+-]?\d+)?)([%a-z]*)$/i;
  const start = String(from).trim().match(pattern), end = String(to).trim().match(pattern);
  if (start && end) {
    const suffix = end[2] || start[2] || unit;
    if (start[2] && end[2] && start[2] !== end[2] && Number(start[1]) !== 0) throw new Error(`Cannot interpolate between ${from} and ${to}: use matching units`);
    return t => { const value = Number(start[1]) + (Number(end[1]) - Number(start[1])) * t; return suffix ? `${value}${suffix}` : value; };
  }
  return t => t < 1 ? from : to;
}
interface Track { target: Target; key: string; delay: number; duration: number; ease: Ease; segments: ((t: number) => Value)[] }
const active = new Set<Animation>();
let frame: number | undefined;
function schedule() {
  if (frame !== undefined || active.size === 0) return;
  if (typeof requestAnimationFrame !== 'function') throw new Error('Autoplay requires requestAnimationFrame. Use autoplay: false and seek() outside a browser.');
  frame = requestAnimationFrame(now => {
    frame = undefined;
    for (const animation of [...active]) animation.tick(now);
    schedule();
  });
}
function timing(n: number, label: string) {
  if (!Number.isFinite(n) || n < 0) throw new Error(`${label} must be a finite non-negative number`);
  return n;
}
export class Animation {
  readonly duration: number;
  currentTime = 0;
  paused = true;
  private tracks: Track[] = [];
  private origin: number | null = null;
  private elapsed = 0;
  private started = false;
  private done = false;
  private iterations: number;
  private reversed: boolean;
  constructor(private options: AnimationOptions) {
    const input = options.targets;
    const targets: Target[] = typeof input === 'string' ? (typeof document === 'undefined' ? [] : [...document.querySelectorAll(input)]) : input && Symbol.iterator in Object(input) ? [...input as Iterable<Target>] : input ? [input as Target] : [];
    const unique = [...new Set(targets)];
    this.iterations = options.loop === true ? Infinity : options.loop === undefined || options.loop === false ? 1 : Math.max(1, Math.floor(timing(options.loop, 'loop')));
    this.reversed = options.direction === 'reverse';
    unique.forEach((target, index) => {
      for (const [key, spec] of Object.entries(options)) {
        if (reserved.has(key)) continue;
        const config: PropertyOptions = spec !== null && typeof spec === 'object' && !Array.isArray(spec) ? spec as PropertyOptions : { value: spec as Dynamic<Value | Value[]> };
        const resolved = resolveValue(config.value, target, index, unique.length);
        const values = Array.isArray(resolved) ? resolved : [read(target, key), resolved];
        if (values.length < 2 || values.some(v => typeof v !== 'string' && typeof v !== 'number')) throw new Error(`Property ${key} needs a value or at least two keyframe values`);
        this.tracks.push({ target, key, delay: timing(resolveValue(config.delay ?? options.delay ?? 0, target, index, unique.length), 'delay'), duration: timing(resolveValue(config.duration ?? options.duration ?? 1000, target, index, unique.length), 'duration'), ease: easing(config.easing ?? options.easing), segments: values.slice(1).map((v, i) => interpolate(values[i], v, defaultUnit(target, key))) });
      }
    });
    this.duration = Math.max(0, ...this.tracks.map(t => t.delay + t.duration));
    this.render(this.reversed ? this.duration : 0);
    if (options.autoplay !== false) this.play();
  }
  get progress() { return this.duration ? this.currentTime / this.duration * 100 : this.done ? 100 : 0; }
  private render(time: number) {
    this.currentTime = time;
    for (const track of this.tracks) {
      const fraction = track.duration === 0 ? (time >= track.delay ? 1 : 0) : clamp((time - track.delay) / track.duration);
      const position = fraction * track.segments.length;
      const index = Math.min(Math.floor(position), track.segments.length - 1);
      write(track.target, track.key, track.segments[index](track.ease(position - index)));
    }
  }
  private isReverse(cycle: number) { return this.reversed !== (this.options.direction === 'alternate' && cycle % 2 === 1); }
  /** Advance a playing animation with an absolute, monotonic timestamp. */
  tick(now: number) {
    if (this.paused) return;
    if (this.origin === null) this.origin = now - this.elapsed;
    this.elapsed = Math.max(0, now - this.origin);
    if (!this.started) { this.started = true; this.options.begin?.(this); }
    const finished = this.duration === 0 || this.elapsed >= this.duration * this.iterations;
    const cycle = finished ? (Number.isFinite(this.iterations) ? this.iterations - 1 : 0) : Math.floor(this.elapsed / this.duration);
    const local = finished ? this.duration : this.elapsed % this.duration;
    this.render(this.isReverse(cycle) ? this.duration - local : local);
    if (finished) { this.pause(); this.done = true; }
    this.options.update?.(this);
    if (finished) this.options.complete?.(this);
  }
  play(): this {
    if (!this.paused) return this;
    if (this.done) return this.restart();
    if (typeof requestAnimationFrame !== 'function') throw new Error('play() requires requestAnimationFrame; use seek() for manual rendering.');
    this.paused = false; this.origin = null; active.add(this); schedule(); return this;
  }
  pause() { this.paused = true; this.origin = null; active.delete(this); return this; }
  restart(): this { this.pause(); this.elapsed = 0; this.started = false; this.done = false; this.render(this.reversed ? this.duration : 0); return this.play(); }
  /** Seek within one iteration; callbacks are not fired. */
  seek(time: number) {
    if (!Number.isFinite(time)) throw new Error('seek time must be finite');
    const local = clamp(time, 0, this.duration);
    this.elapsed = this.reversed ? this.duration - local : local; this.origin = null; this.done = false; this.render(local); return this;
  }
  reverse() { this.reversed = !this.reversed; this.elapsed = this.reversed ? this.duration - this.currentTime : this.currentTime; this.origin = null; this.done = false; return this; }
  /** Release scheduler references. The current visual state is preserved. */
  cancel() { return this.pause(); }
}
export interface StaggerOptions { start?: number; from?: 'first' | 'last' | 'center' | number; grid?: [number, number]; axis?: 'x' | 'y'; direction?: 'normal' | 'reverse'; easing?: string | Ease }
export function stagger(value: number | [number, number], options: StaggerOptions = {}): (target: Target, index: number, total: number) => number {
  if (options.grid && options.grid.some(n => !Number.isInteger(n) || n <= 0)) throw new Error('grid dimensions must be positive integers');
  const ease = easing(options.easing ?? 'linear');
  const cache = new Map<number, number[]>();
  return (_target, index, total) => {
    if (!cache.has(total)) {
      const from = options.from ?? 'first';
      const origin = typeof from === 'number' ? from : from === 'last' ? total - 1 : from === 'center' ? (total - 1) / 2 : 0;
      let distances: number[];
      if (options.grid) {
        const [columns, rows] = options.grid;
        const ox = from === 'center' ? (columns - 1) / 2 : origin % columns;
        const oy = from === 'center' ? (rows - 1) / 2 : Math.floor(origin / columns);
        distances = Array.from({ length: total }, (_, i) => options.axis === 'x' ? Math.abs(i % columns - ox) : options.axis === 'y' ? Math.abs(Math.floor(i / columns) - oy) : Math.hypot(i % columns - ox, Math.floor(i / columns) - oy));
      } else distances = Array.from({ length: total }, (_, i) => Math.abs(i - origin));
      const max = Math.max(0, ...distances);
      cache.set(total, distances.map(d => {
        const normalized = max ? d / max : 0;
        const factor = ease(options.direction === 'reverse' ? 1 - normalized : normalized);
        return (options.start ?? 0) + (Array.isArray(value) ? value[0] + (value[1] - value[0]) * factor : value * max * factor);
      }));
    }
    return cache.get(total)![index];
  };
}
export function animate(options: AnimationOptions) { return new Animation(options); }
const anime = Object.assign(animate, { stagger, easings });
export default anime;
