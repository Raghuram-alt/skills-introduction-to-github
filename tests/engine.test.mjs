import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import anime, { stagger, easings } from '../dist/anime.js';
let next = 0;
const frames = new Map();
globalThis.requestAnimationFrame = fn => { frames.set(++next, fn); return next; };
function frame(time) { const queued = [...frames.values()]; frames.clear(); queued.forEach(fn => fn(time)); }
const instances = [];
function create(options) { const a = anime({ autoplay: false, easing: 'linear', ...options }); instances.push(a); return a; }
afterEach(() => { instances.forEach(a => a.cancel()); instances.length = 0; frame(0); });
test('objects: scalar values, keyframes and explicit units', () => {
  const object = { x: 10, y: 0, width: '10%' };
  const a = create({ targets: object, x: 110, y: [0, 40, 0], width: '30%', duration: 1000 });
  a.seek(500); assert.equal(object.x, 60); assert.equal(object.y, 40); assert.equal(object.width, '20%');
  a.seek(1000); assert.equal(object.x, 110); assert.equal(object.y, 0);
  a.seek(-1); assert.equal(object.x, 10);
});
test('per-target functions and per-property timing', () => {
  const targets = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
  const a = create({ targets, x: (_, i) => (i + 1) * 100, delay: stagger(100), duration: 1000, y: { value: 20, duration: 200, delay: 0 } });
  assert.equal(a.duration, 1100); a.seek(500);
  assert.equal(targets[0].x, 50); assert.equal(targets[1].x, 80); assert.equal(targets[0].y, 20);
});
test('hex and rgba colors interpolate including alpha', () => {
  const target = { color: '#0000' };
  create({ targets: target, color: '#ffffff', duration: 100 }).seek(50);
  assert.equal(target.color, 'rgba(128, 128, 128, 0.5)');
});
test('stagger supports center, grid, range and reverse', () => {
  const center = stagger(100, { from: 'center' });
  assert.deepEqual([0, 1, 2].map(i => center({}, i, 3)), [100, 0, 100]);
  const grid = stagger(50, { grid: [3, 3], from: 'center' });
  assert.equal(grid({}, 4, 9), 0); assert.equal(grid({}, 1, 9), 50);
  const range = stagger([100, 500], { direction: 'reverse' });
  assert.deepEqual([0, 1, 2].map(i => range({}, i, 3)), [500, 300, 100]);
});
test('pause/resume and completion callbacks use the shared scheduler', () => {
  const object = { x: 0 }; const events = [];
  const a = create({ targets: object, x: 100, duration: 100, begin: () => events.push('begin'), complete: () => events.push('complete') });
  a.play(); frame(1000); frame(1040); assert.equal(object.x, 40);
  a.pause(); frame(2000); assert.equal(object.x, 40);
  a.play(); frame(3000); frame(3060); assert.equal(object.x, 100); assert.equal(a.paused, true);
  assert.deepEqual(events, ['begin', 'complete']);
  frame(4000); assert.deepEqual(events, ['begin', 'complete']);
});
test('alternate loops end at the correct endpoint', () => {
  const target = { x: 0 };
  const a = create({ targets: target, x: 100, duration: 100, loop: 2, direction: 'alternate' });
  a.play(); frame(0); frame(100); assert.equal(target.x, 100);
  frame(150); assert.equal(target.x, 50); frame(200); assert.equal(target.x, 0); assert.equal(a.paused, true);
});
test('reverse and seek preserve displayed value on resume', () => {
  const target = { x: 0 };
  const a = create({ targets: target, x: 100, duration: 100 });
  a.seek(60).reverse().play(); frame(0); assert.equal(target.x, 60); frame(30); assert.equal(target.x, 30);
  a.pause().seek(80).play(); frame(100); assert.equal(target.x, 80); frame(180); assert.equal(target.x, 0);
});
test('zero duration and empty targets terminate even with infinite loops', () => {
  const target = { x: 0 };
  const a = create({ targets: target, x: 10, duration: 0, loop: true });
  a.play(); frame(0); assert.equal(target.x, 10); assert.equal(a.paused, true);
  const b = create({ targets: [], loop: true }); b.play(); frame(0); assert.equal(b.paused, true);
});
test('invalid timings, easing and mixed units give actionable errors', () => {
  assert.throws(() => create({ targets: { x: 0 }, x: 1, duration: -1 }), /duration/);
  assert.throws(() => create({ targets: { x: 0 }, x: 1, easing: 'missing' }), /easing/);
  assert.throws(() => create({ targets: { x: '1px' }, x: '10%' }), /matching units/);
  assert.throws(() => stagger(20, { grid: [0, 3] }), /positive integers/);
});
test('all easing endpoints are exact and finite', () => {
  for (const ease of Object.values(easings)) { assert.ok(Math.abs(ease(0)) < 1e-8); assert.ok(Math.abs(ease(1) - 1) < 1e-8); assert.ok(Number.isFinite(ease(.5))); }
});
