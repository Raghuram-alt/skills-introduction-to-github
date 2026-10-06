import anime from '../dist/anime.js';
const type = document.body.dataset.example;
const stage = document.querySelector('.stage');
const output = document.querySelector('#example-code');
let options, code;
if (type === 'stagger') {
  stage.innerHTML = '<div class="dot-grid">' + '<div class="dot"></div>'.repeat(105) + '</div>';
  options = { targets: '.dot', scale: [.2, 1], opacity: [.25, 1], delay: anime.stagger(80, { grid: [15, 7], from: 'center' }) };
  code = `anime({\n  targets: '.dot',\n  scale: [0.2, 1],\n  opacity: [0.25, 1],\n  delay: anime.stagger(80, { grid: [15, 7], from: 'center' }),`;
} else if (type === 'transforms') {
  stage.innerHTML = '<div class="motion-box"></div>';
  options = { targets: '.motion-box', translateX: [0, stage.clientWidth * .55], rotate: [0, 180], backgroundColor: ['#e8aa91', '#c5f277'] };
  code = `anime({\n  targets: '.motion-box',\n  translateX: [0, ${Math.round(stage.clientWidth * .55)}],\n  rotate: [0, 180],\n  backgroundColor: ['#e8aa91', '#c5f277'],`;
} else if (type === 'svg') {
  stage.innerHTML = '<svg class="svg-demo" viewBox="0 0 500 180" aria-label="Animated SVG wave"><path d="M10 90 C70 -60 115 230 185 90 S300 -35 350 90 S440 220 490 90" /></svg>';
  const path = stage.querySelector('path'), length = path.getTotalLength();
  path.style.strokeDasharray = length;
  options = { targets: path, strokeDashoffset: [length, 0] };
  code = `const path = document.querySelector('path');\nconst length = path.getTotalLength();\npath.style.strokeDasharray = length;\n\nanime({\n  targets: path,\n  strokeDashoffset: [length, 0],`;
} else {
  stage.innerHTML = '<div class="object-demo"><small>progress.value</small><strong id="output">0%</strong></div>';
  const progress = { value: 0 };
  options = { targets: progress, value: [0, 100], update: () => { document.querySelector('#output').textContent = Math.round(progress.value) + '%'; } };
  code = `const progress = { value: 0 };\nconst output = document.querySelector('#output');\n\nanime({\n  targets: progress,\n  value: [0, 100],\n  update: () => {\n    output.textContent = Math.round(progress.value) + '%';\n  },`;
}
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const animation = anime({ ...options, duration: 1800, easing: 'easeInOutSine', loop: true, direction: 'alternate', autoplay: !reduced });
output.textContent = "import anime from '../dist/anime.js';\n\n" + code + "\n  duration: 1800,\n  easing: 'easeInOutSine',\n  loop: true,\n  direction: 'alternate'\n});";
const toggle = document.querySelector('#toggle');
function sync() { toggle.textContent = animation.paused ? 'Play animation' : 'Pause animation'; }
toggle.addEventListener('click', () => { animation.paused ? animation.play() : animation.pause(); sync(); });
document.querySelector('#restart').addEventListener('click', () => { animation.restart(); sync(); });
sync();
