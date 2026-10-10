export function startParticles(container) {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  // CSS animation avoids an always-running JavaScript animation loop.
  for (let i = 0; i < 28; i++) {
    const particle = document.createElement('span');
    particle.className = 'particle';
    particle.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 100}%;--duration:${18 + Math.random() * 20}s;--delay:-${Math.random() * 30}s;--size:${i % 5 === 0 ? 3 : 2}px`;
    container.append(particle);
  }
  const update = () => container.classList.toggle('still', preference.matches);
  update(); preference.addEventListener('change', update);
  return () => { preference.removeEventListener('change', update); container.replaceChildren(); };
}
