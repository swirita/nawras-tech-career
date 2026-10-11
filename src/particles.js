const activeParticles = new WeakMap();

export function startParticles(container) {
  activeParticles.get(container)?.();
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  container.replaceChildren(canvas);
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return () => canvas.remove();
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const colors = ['#16a6c4', '#9380d3', '#dcb25a'];
  let width = 0, height = 0, particles = [], frame = null, lastTime = 0, clearArea = null, disposed = false;

  function updateClearArea() {
    const boxes = [...document.querySelectorAll('.landing .brand img, .landing .hero-title, .landing .name-form')]
      .map(node => node.getBoundingClientRect());
    clearArea = boxes.length ? {
      left: Math.min(...boxes.map(box => box.left)) - 35,
      right: Math.max(...boxes.map(box => box.right)) + 35,
      top: Math.min(...boxes.map(box => box.top)) - 30,
      bottom: Math.max(...boxes.map(box => box.bottom)) + 30,
    } : null;
    if (preference.matches) draw();
  }

  function draw(elapsed = 0) {
    context.clearRect(0, 0, width, height);
    for (const p of particles) {
      p.x = (p.x + p.vx * elapsed + width) % width;
      p.y = (p.y + p.vy * elapsed + height) % height;
      if (clearArea && p.x + p.size > clearArea.left && p.x - p.size < clearArea.right
        && p.y + p.size > clearArea.top && p.y - p.size < clearArea.bottom) continue;
      context.globalAlpha = p.opacity;
      context.fillStyle = p.color;
      context.beginPath();
      context.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }
  function animate(now) {
    if (disposed) return;
    frame = null;
    // Cap large gaps and draw at ~30fps, independent of display refresh rate.
    if (!lastTime || now - lastTime >= 32) {
      draw(lastTime ? Math.min((now - lastTime) / 1000, .08) : 0);
      lastTime = now;
    }
    frame = requestAnimationFrame(animate);
  }
  function updateMotion() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null; lastTime = 0;
    const moving = !preference.matches && !document.hidden;
    canvas.dataset.motion = moving ? 'moving' : 'still';
    draw();
    if (moving) frame = requestAnimationFrame(animate);
  }
  function resize() {
    width = Math.max(1, innerWidth); height = Math.max(1, innerHeight);
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = width <= 600 ? 32 : Math.min(100, Math.max(60, Math.round(width * height / 14000)));
    particles = Array.from({ length: count }, () => {
      const depth = Math.random(); const tint = Math.random();
      return { x: Math.random() * width, y: Math.random() * height,
        size: .7 + depth * 1.7, opacity: .18 + depth * .28,
        color: colors[tint < .58 ? 0 : tint < .92 ? 1 : 2],
        vx: (Math.random() - .5) * (4 + depth * 9), vy: -(3 + depth * 10) };
    });
    canvas.dataset.count = String(count);
    updateClearArea();
    updateMotion();
  }
  resize();
  const observer = new MutationObserver(updateClearArea);
  observer.observe(document.querySelector('#app'), { childList: true });
  document.fonts.ready.then(() => { if (canvas.isConnected) updateClearArea(); });
  window.addEventListener('resize', resize);
  preference.addEventListener('change', updateMotion);
  document.addEventListener('visibilitychange', updateMotion);
  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    if (frame !== null) cancelAnimationFrame(frame);
    window.removeEventListener('resize', resize);
    preference.removeEventListener('change', updateMotion);
    document.removeEventListener('visibilitychange', updateMotion);
    observer.disconnect();
    canvas.remove();
    activeParticles.delete(container);
  };
  activeParticles.set(container, cleanup);
  return cleanup;
}
