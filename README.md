# Anime.js

A small TypeScript animation library for DOM elements, SVG, and JavaScript objects, with a live playground and four examples. No runtime dependencies. This is an independent implementation for this repository, not the published `animejs` package.

## Develop

Requires Node.js 20+ and npm.

```sh
npm install
npm test          # builds both bundles, emits types, and tests the engine
npm run dev      # builds and serves http://localhost:3000
npm run typecheck
```

`npm start` serves an existing build. After source changes, rebuild and refresh the browser. The development server is for local previews.

## Use

```js
import anime, { animate, stagger } from './dist/anime.js';

const animation = anime({
  targets: '.box',
  translateX: [0, 240],
  rotate: [0, 180],
  backgroundColor: ['#c5f277', '#bba3ef'],
  duration: 1200,
  delay: stagger(100),
  easing: 'easeOutCubic',
  loop: true,
  direction: 'alternate'
});
```

For a script tag, load `dist/anime.min.js`; it exposes `window.anime` with `anime.stagger()` and `anime.easings`. ESM and declaration files are emitted to `dist/`. `animate` is the named equivalent of the default function.

## Targets and properties

Targets accept CSS selectors, a DOM/SVG element, an iterable of targets (including NodeList), or a plain object. No matching targets is a safe no-op. Objects also work outside browsers with `autoplay: false` and `seek(ms)`.

Properties accept a destination value, an array of two or more evenly spaced keyframes, or a function `(target, index, total) => value`. Arrays explicitly set the starting value; scalar destinations read the current value once at construction.

```js
anime({
  targets: document.querySelectorAll('.box'),
  translateY: (_, i) => [0, i * 20],
  opacity: { value: [0, 1], duration: 400, delay: 100, easing: 'linear' }
});

const stats = { score: 0 };
anime({ targets: stats, score: 100, update: () => console.log(stats.score) });
```

Supported transforms: translateX/Y/Z, rotate/X/Y/Z, scale/X/Y/Z, skewX/Y and perspective. Inline transform functions are preserved; computed matrix transforms are retained as a base, with new components appended. Numeric translations use px and rotations use deg. Use explicit matching units for percentages and other measurements. Numeric CSS lengths use px; known unitless CSS properties remain unitless. CSS custom properties are supported with explicit units where needed. SVG attributes such as `cx`, `r`, and `stroke-dashoffset` are supported, as are style properties such as `strokeDashoffset`.

Colors interpolate hex (3/4/6/8 digits) and numeric rgb/rgba forms. Named colors, hsl, complex strings, path morphs and mixed nonzero units are not interpolated; unsupported strings switch at the endpoint. Mixed explicit numeric units throw rather than guessing a conversion. Layout-dependent values such as `auto` need explicit numeric keyframes. Avoid concurrent animations writing the same property.

## Timing and playback

| Option | Default | Behavior |
| --- | --- | --- |
| `duration` | `1000` | Milliseconds per property, excluding delay; number or target function |
| `delay` | `0` | Milliseconds before each property; number or target function |
| `easing` | `easeOutCubic` | Named easing or `(progress) => number`; applied per keyframe segment |
| `autoplay` | `true` | Start using the shared requestAnimationFrame scheduler |
| `loop` | `false` | `true` repeats forever; a positive integer is total iterations |
| `direction` | `normal` | `normal`, `reverse`, or `alternate` |
| `begin`, `update`, `complete` | — | Receive the animation instance; complete fires after all iterations |

Available easings: linear, easeInQuad, easeOutQuad, easeInOutQuad, easeInCubic, easeOutCubic, easeInOutCubic, easeInOutSine, easeOutBack, easeOutElastic. Supply a function for custom easing.

Instance methods `play()`, `pause()`, `restart()`, `reverse()`, `seek(ms)`, and `cancel()` return the instance. `seek` clamps within one iteration, resets the loop position, and does not fire callbacks; `reverse` toggles playback while preserving the displayed value and resets the loop position. `restart` resets and starts playback. `cancel` removes the instance from the scheduler and preserves styles. Read `duration` (including delays), `currentTime`, `progress` (0–100), and `paused`. A zero-duration animation completes on its first frame, including with infinite looping. Paused instances leave the shared scheduler. Time spent in an inactive browser tab counts toward elapsed time when frames resume.

## Stagger

```js
anime({
  targets: '.dot',
  scale: [0.2, 1],
  delay: anime.stagger(80, { grid: [15, 7], from: 'center' }),
  direction: 'alternate',
  loop: true
});
```

`stagger(step, options)` returns a target function. Use a `[start, end]` range to spread values across a group. Options: `start` offset, `from` (`first`, `last`, `center`, or index), `grid: [columns, rows]`, `axis` (`x` or `y`), `direction` (`normal` or `reverse`), and `easing`. Centered grids use Euclidean distance by default. Reuse it for delay, duration, or numeric properties.

## Examples

- `/` — interactive playground with parameters, seek, pause, restart, loop, and copyable code.
- `/examples/stagger.html` — a centered grid wave.
- `/examples/transforms.html` — position, rotation and color.
- `/examples/svg.html` — SVG stroke drawing.
- `/examples/objects.html` — a plain object counter.

Examples respect `prefers-reduced-motion` by starting paused. The library leaves that choice to applications. The playground uses an optional Google Font with system fallbacks; the animation engine requires no network access.

MIT licensed. See [LICENSE](LICENSE).

### Browser checks

With the development server running, open `/tests/browser.html` to run real DOM, SVG, CSS, and script-tag bundle integration checks. The page reports its result and exposes `window.__testResults`. `tests/playground-check.js` can be evaluated in the console on `/` to exercise playground controls. Node tests run independently of a browser.
