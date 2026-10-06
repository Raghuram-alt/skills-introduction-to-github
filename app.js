import anime from './dist/anime.js';
const $ = selector => document.querySelector(selector);
const stage = $('#stage');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let current = 'stagger', animation, looping = true, codeText = '';
const labels = { stagger: ['THE RIPPLE EFFECT', '105 elements · endless possibilities'], motion: ['A CHANGE OF PACE', 'Position · rotation · scale'], svg: ['FOLLOW YOUR OWN LINE', 'SVG · stroke drawing'], object: ['EVERY NUMBER HAS A STORY', 'Plain objects · real possibilities'] };
const markup = {
  stagger: '<div class="dot-grid">' + '<div class="dot"></div>'.repeat(105) + '</div>',
  motion: '<div class="motion-box"></div>',
  svg: '<svg class="svg-demo" viewBox="0 0 500 180" aria-label="Animated wave"><path d="M10 90 C70 -60 115 230 185 90 S300 -35 350 90 S440 220 490 90" /></svg>',
  object: '<div class="object-demo"><small>const progress = { value: 0 }</small><strong id="object-value">0<span>%</span></strong></div>'
};
function highlight(code) {
  return code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/('[^']*')|\b(\d+)\b|\b(anime|stagger)\b|\b(true|false|const)\b/g, (text, str, num, fn) => `<span class="token-${str ? 'string' : num ? 'number' : fn ? 'function' : 'keyword'}">${text}</span>`);
}
function updateTransport() {
  if (!animation) return;
  $('#scrub').value = animation.progress * 10;
  $('#time').innerHTML = (animation.currentTime / 1000).toFixed(2) + '<span>s</span>';
  $('#play-icon').textContent = animation.paused ? '▶' : 'Ⅱ';
  $('#play').setAttribute('aria-label', animation.paused ? 'Play animation' : 'Pause animation');
}
function mount() {
  animation?.cancel();
  stage.querySelectorAll(':scope > :not(.stage-caption)').forEach(el => el.remove());
  stage.insertAdjacentHTML('afterbegin', markup[current]);
  $('#demo-label').textContent = labels[current][0];
  $('#target-count').textContent = labels[current][1];
  const duration = Number($('#duration').value), delay = Number($('#stagger').value), easing = $('#easing').value, direction = $('#direction').value;
  $('#duration-output').innerHTML = `${duration} <small>ms</small>`;
  $('#stagger-output').innerHTML = `${delay} <small>ms</small>`;
  let options, properties, target;
  const progress = { value: 0 };
  if (current === 'stagger') {
    target = "'.dot'";
    options = { targets: stage.querySelectorAll('.dot'), scale: [.3, 1], opacity: [.25, 1], rotate: [-35, 0], delay: anime.stagger(delay, { grid: [15, 7], from: 'center' }) };
    properties = "  scale: [0.3, 1],\n  opacity: [0.25, 1],\n  rotate: [-35, 0],\n  delay: anime.stagger(" + delay + ", {\n    grid: [15, 7],\n    from: 'center'\n  }),";
  } else if (current === 'motion') {
    target = "'.motion-box'";
    options = { targets: stage.querySelector('.motion-box'), translateX: [0, Math.max(100, stage.clientWidth * .55)], rotate: [0, 180], scale: [.7, 1.25], borderRadius: ['12px', '27px'], delay };
    properties = `  translateX: [0, ${Math.round(stage.clientWidth * .55)}],\n  rotate: [0, 180],\n  scale: [0.7, 1.25],\n  borderRadius: ['12px', '27px'],\n  delay: ${delay},`;
  } else if (current === 'svg') {
    const path = stage.querySelector('path'), length = Math.ceil(path.getTotalLength());
    path.style.strokeDasharray = String(length);
    target = "'.svg-demo path'";
    options = { targets: path, strokeDashoffset: [length, 0], delay };
    properties = `  strokeDasharray: ${length},\n  strokeDashoffset: [${length}, 0],\n  delay: ${delay},`;
  } else {
    target = 'progress'; options = { targets: progress, value: [0, 100], delay };
    properties = `  value: [0, 100],\n  delay: ${delay},\n  update: () => {\n    output.textContent =\n      Math.round(progress.value) + '%';\n  },`;
  }
  const sync = () => { if (current === 'object') $('#object-value').innerHTML = `${Math.round(progress.value)}<span>%</span>`; updateTransport(); };
  animation = anime({ ...options, duration, easing, direction, loop: looping, autoplay: !reducedMotion, update: sync, complete: sync });
  if (reducedMotion) animation.seek(animation.duration * .55);
  animation.syncView = sync;
  $('#total-time').textContent = (animation.duration / 1000).toFixed(2) + 's';
  codeText = `${current === 'object' ? "const progress = { value: 0 };\nconst output = document.querySelector('#object-value');\n\n" : ''}anime({\n  targets: ${target},\n${properties}\n  duration: ${duration},\n  easing: '${easing}',\n  direction: '${direction}',\n  loop: ${looping}\n});`;
  $('#code').innerHTML = highlight(codeText);
  $('.line-numbers').innerHTML = codeText.split('\n').map((_, i) => i + 1).join('<br>');
  sync();
}
for (const tab of document.querySelectorAll('[data-preset]')) tab.addEventListener('click', () => {
  current = tab.dataset.preset;
  document.querySelectorAll('[data-preset]').forEach(button => button.setAttribute('aria-selected', String(button === tab)));
  mount();
});
$('.tabs').addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const tabs = [...document.querySelectorAll('[data-preset]')];
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (tabs.indexOf(document.activeElement) + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
  tabs[next].focus(); tabs[next].click();
});
$('#play').addEventListener('click', () => { animation.paused ? animation.play() : animation.pause(); updateTransport(); });
$('#reset').addEventListener('click', () => { animation.restart(); updateTransport(); });
$('#loop').addEventListener('click', () => { looping = !looping; $('#loop').classList.toggle('selected', looping); $('#loop').setAttribute('aria-pressed', String(looping)); mount(); });
$('#scrub').addEventListener('input', event => { animation.pause().seek(Number(event.target.value) / 1000 * animation.duration); animation.syncView(); });
for (const id of ['duration', 'easing', 'stagger', 'direction']) $('#' + id).addEventListener('input', mount);
$('#copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(codeText); $('#copy').textContent = 'Copied ✓'; }
  catch { $('#copy').textContent = 'Select code to copy'; const range = document.createRange(); range.selectNodeContents($('#code')); getSelection().removeAllRanges(); getSelection().addRange(range); }
  setTimeout(() => { $('#copy').textContent = 'Copy'; }, 1800);
});
for (const id of ['docs-open', 'quickstart']) $('#' + id).addEventListener('click', () => $('#docs').showModal());
$('#docs-close').addEventListener('click', () => $('#docs').close());
$('#docs').addEventListener('click', event => { if (event.target === $('#docs') && (event.clientX < $('#docs').getBoundingClientRect().left || event.clientX > $('#docs').getBoundingClientRect().right || event.clientY < $('#docs').getBoundingClientRect().top || event.clientY > $('#docs').getBoundingClientRect().bottom)) $('#docs').close(); });
$('.mini-grid').innerHTML = Array.from({ length: 45 }, (_, i) => `<i style="--opacity:${.2 + (1 - Math.abs(22 - i) / 22) * .8}"></i>`).join('');
mount();
