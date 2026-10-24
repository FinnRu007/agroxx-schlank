// Kopfleiste, Menü, Bilderwechsel im Hero (alle 5 Sekunden), Vollbildansicht der Galerie
(() => {
  const kopf = document.getElementById('kopf');
  const stand = () => kopf.classList.toggle('scrolled', window.scrollY > 40);
  stand();
  addEventListener('scroll', stand, { passive: true });

  const burger = document.querySelector('.burger');
  const menue = document.getElementById('menue');
  burger.addEventListener('click', () => {
    const offen = menue.classList.toggle('offen');
    burger.setAttribute('aria-expanded', offen);
    kopf.classList.toggle('scrolled', offen || window.scrollY > 40);
  });

  const folien = [...document.querySelectorAll('.folie')];
  if (folien.length > 1) {
    const punkte = [...document.querySelectorAll('.punkte button')];
    const pause = document.querySelector('.pause');
    const bewegung = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    let i = 0, laeuft = bewegung, timer;
    const zeige = (n) => {
      i = (n + folien.length) % folien.length;
      folien.forEach((f, k) => f.classList.toggle('aktiv', k === i));
      punkte.forEach((p, k) => p.classList.toggle('aktiv', k === i));
    };
    const starte = () => { clearInterval(timer); if (laeuft) timer = setInterval(() => zeige(i + 1), 5000); };
    document.querySelectorAll('.pfeil').forEach((b) => b.addEventListener('click', () => { zeige(i + Number(b.dataset.richtung)); starte(); }));
    punkte.forEach((p, k) => p.addEventListener('click', () => { zeige(k); starte(); }));
    pause.textContent = laeuft ? 'Pause' : 'Weiter';
    pause.addEventListener('click', () => { laeuft = !laeuft; pause.textContent = laeuft ? 'Pause' : 'Weiter'; starte(); });
    document.addEventListener('visibilitychange', () => (document.hidden ? clearInterval(timer) : starte()));
    let x0 = null;
    const hero = document.querySelector('.hero');
    hero.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    hero.addEventListener('touchend', (e) => { if (x0 !== null) { const d = e.changedTouches[0].clientX - x0; if (Math.abs(d) > 50) { zeige(i + (d < 0 ? 1 : -1)); starte(); } x0 = null; } });
    starte();
  }

  // Klick auf ein Foto der Galerie: große Ansicht
  const links = [...document.querySelectorAll('a[data-gross]')];
  if (links.length) {
    const dlg = document.createElement('dialog');
    dlg.className = 'gross-bild';
    dlg.innerHTML = '<button aria-label="Schließen">×</button><img alt="">';
    document.body.appendChild(dlg);
    const bild = dlg.querySelector('img');
    let k = 0;
    const offen = (n) => { k = (n + links.length) % links.length; bild.src = links[k].href; bild.alt = links[k].querySelector('img').alt; if (!dlg.open) dlg.showModal(); };
    links.forEach((a, n) => a.addEventListener('click', (e) => { e.preventDefault(); offen(n); }));
    dlg.addEventListener('click', (e) => { if (e.target !== bild) dlg.close(); });
    dlg.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') offen(k + 1); if (e.key === 'ArrowLeft') offen(k - 1); });
  }
})();
