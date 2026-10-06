(() => {
  const $ = s => document.querySelector(s), checks = [];
  function check(name, passed) { if (!passed) throw new Error(name); checks.push(name); }
  check('all easing options available', $('#easing').options.length === 6);
  $('[data-preset="object"]').click();
  check('object copy code selects rendered output', $('#code').textContent.includes("document.querySelector('#object-value')"));
  $('#stagger').value = 0; $('#stagger').dispatchEvent(new Event('input'));
  $('#easing').value = 'linear'; $('#easing').dispatchEvent(new Event('input'));
  $('#scrub').value = 500; $('#scrub').dispatchEvent(new Event('input'));
  check('object seek updates output', $('#object-value').textContent === '50%');
  check('seek pauses playback', $('#play').getAttribute('aria-label') === 'Play animation');
  $('#play').click(); check('play resumes', $('#play').getAttribute('aria-label') === 'Pause animation');
  $('#play').click(); check('pause stops', $('#play').getAttribute('aria-label') === 'Play animation');
  $('#loop').click(); check('loop toggles code and state', $('#loop').getAttribute('aria-pressed') === 'false' && $('#code').textContent.includes('loop: false'));
  $('#duration').value = 900; $('#duration').dispatchEvent(new Event('input'));
  check('duration updates code', $('#code').textContent.includes('duration: 900'));
  $('#direction').value = 'reverse'; $('#direction').dispatchEvent(new Event('input'));
  check('direction updates code', $('#code').textContent.includes("direction: 'reverse'"));
  $('#docs-open').click(); check('docs open', $('#docs').open); $('#docs-close').click(); check('docs close', !$('#docs').open);
  $('[data-preset="svg"]').click(); check('SVG tab', !!$('.svg-demo path'));
  $('[data-preset="motion"]').click(); check('transform tab', !!$('.motion-box'));
  $('[data-preset="stagger"]').click(); check('stagger tab', document.querySelectorAll('.dot').length === 105);
  check('no horizontal overflow', document.documentElement.scrollWidth <= innerWidth);
  return JSON.stringify({ passed: checks.length, checks });
})()
