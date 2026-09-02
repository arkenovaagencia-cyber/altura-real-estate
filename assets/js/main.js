/* ===================================================================
   ALTURA — main.js
   Smooth scroll (Lenis) + animaciones (GSAP/ScrollTrigger) +
   transiciones entre páginas (Barba.js) compartidas por todo el sitio.
=================================================================== */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Conexión a Supabase (proyecto "altura") — se usa en el formulario de contacto,
// el contador de agentes, el catálogo de propiedades y el listado de agentes.
const SUPABASE_URL = 'https://vojacdebepkgxxrueqgl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvamFjZGViZXBrZ3h4cnVlcWdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NDE0MDYsImV4cCI6MjEwMzExNzQwNn0.E7JtG5-Qb1CkxaXNzWlMdmY1zmV50-50VRG3RpUUGsg';

async function supabaseSelect(table, query = ''){
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
  });
  if (!res.ok) throw new Error(`Supabase respondió ${res.status} al consultar ${table}`);
  return res.json();
}
gsap.registerPlugin(ScrollTrigger);

let lenis;

function initLenis(){
  if (reduceMotion) return;
  // Defensivo: si Lenis no llegó a cargar (CDN bloqueado, sin internet, etc.),
  // seguimos sin smooth scroll en vez de romper el resto de la página.
  if (typeof Lenis === 'undefined') {
    console.warn('Lenis no está disponible — se usa el scroll nativo del navegador.');
    return;
  }
  try {
    lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    function raf(time){ lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time)=>{ lenis.raf(time*1000); });
    gsap.ticker.lagSmoothing(0);
  } catch (e) {
    console.warn('No se pudo iniciar Lenis:', e);
  }
}

function killLenis(){
  if (lenis) { lenis.destroy(); lenis = null; }
}

/* ---------- Nav: fondo al hacer scroll ---------- */
function initNavScroll(){
  const nav = document.querySelector('.topnav');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll);
  onScroll();
}

/* ---------- Reveal genérico: cualquier .reveal aparece al entrar en viewport ---------- */
function initReveals(container){
  const els = container.querySelectorAll('.reveal');
  els.forEach((el, i) => {
    ScrollTrigger.create({
      trigger: el, start: 'top 85%',
      onEnter: () => el.classList.add('in'),
      once: true
    });
  });
}

/* ---------- Contadores animados (estadísticas) ---------- */
function initCounters(container){
  container.querySelectorAll('[data-count]').forEach(el => {
    ScrollTrigger.create({
      trigger: el, start: 'top 85%', once: true,
      onEnter: () => {
        // Se lee el valor justo aquí (no antes), para que si vino de Supabase
        // de forma asíncrona, el contador ya tenga el dato real actualizado.
        const target = parseInt(el.dataset.count, 10);
        gsap.to(el, {
          innerText: target, duration: 1.6, ease: 'power2.out', snap: { innerText: 1 },
          onUpdate: function(){ el.innerText = Math.ceil(el.innerText) + (el.dataset.suffix || ''); }
        });
      }
    });
  });
}

/* ---------- Hero parallax genérico (data-parallax en un elemento de fondo) ---------- */
function initParallax(container){
  container.querySelectorAll('[data-parallax]').forEach(el => {
    gsap.to(el, {
      yPercent: parseFloat(el.dataset.parallax) || 15, ease: 'none',
      scrollTrigger: {
        trigger: el.closest('[data-parallax-wrap]') || el.parentElement,
        start: 'top bottom', end: 'bottom top', scrub: true
      }
    });
  });
}

/* ---------- Filtros de catálogo (checkbox UI, sin backend real) ---------- */
function initFilters(container){
  const cards = container.querySelectorAll('[data-status]');
  const statusCheckboxes = container.querySelectorAll('[data-filter-status]');
  const locationSelect = container.querySelector('[data-filter-location]');
  const priceSelect = container.querySelector('[data-filter-price]');
  const bedroomsSelect = container.querySelector('[data-filter-bedrooms]');
  if (!statusCheckboxes.length) return;

  function apply(){
    const activeStatus = Array.from(statusCheckboxes).filter(c => c.checked).map(c => c.dataset.filterStatus);
    const activeLocation = locationSelect ? locationSelect.value : '';
    const [priceMin, priceMax] = (priceSelect && priceSelect.value) ? priceSelect.value.split('-').map(Number) : [null, null];
    const [bedMin, bedMax] = (bedroomsSelect && bedroomsSelect.value) ? bedroomsSelect.value.split('-').map(Number) : [null, null];

    cards.forEach(card => {
      const matchesStatus = activeStatus.length === 0 || activeStatus.includes(card.dataset.status);
      const matchesLocation = !activeLocation || card.dataset.location === activeLocation;
      const cardPrice = parseFloat(card.dataset.price || '0');
      const matchesPrice = priceMin === null || (cardPrice >= priceMin && cardPrice <= priceMax);
      const cardBeds = parseFloat(card.dataset.bedrooms || '0');
      const matchesBedrooms = bedMin === null || (cardBeds >= bedMin && cardBeds <= bedMax);
      const show = matchesStatus && matchesLocation && matchesPrice && matchesBedrooms;
      card.style.display = show ? '' : 'none';
      if (show) card.classList.add('in');
    });
    ScrollTrigger.refresh();
  }

  // Si se llega desde el buscador del hero (index.html?estado=venta&ubicacion=Punta+Cana),
  // pre-selecciona los filtros correspondientes antes de aplicar
  const params = new URLSearchParams(window.location.search);
  const estadoParam = params.get('estado');
  const ubicacionParam = params.get('ubicacion');
  if (estadoParam) {
    statusCheckboxes.forEach(c => { if (c.dataset.filterStatus === estadoParam) c.checked = true; });
  }
  if (ubicacionParam && locationSelect) {
    locationSelect.value = ubicacionParam;
  }

  statusCheckboxes.forEach(c => c.addEventListener('change', apply));
  if (locationSelect) locationSelect.addEventListener('change', apply);
  if (priceSelect) priceSelect.addEventListener('change', apply);
  if (bedroomsSelect) bedroomsSelect.addEventListener('change', apply);
  // Solo aplicamos de inmediato si se llegó con parámetros de búsqueda desde el hero;
  // así el catálogo normal conserva su efecto de aparición al hacer scroll.
  if (estadoParam || ubicacionParam) apply();
}

/* ---------- Animaciones específicas de la Home ---------- */
function initHomeAnimations(container){
  const heroTitle = container.querySelector('#heroTitle');
  if (!heroTitle) return; // no estamos en la home

  // Conecta el contador de "Agentes especializados" al número real de agentes en Supabase
  const agentsStat = container.querySelector('[data-count-source="agents"]');
  if (agentsStat) {
    supabaseSelect('agents', '?select=id')
      .then(rows => { agentsStat.dataset.count = Array.isArray(rows) ? rows.length : agentsStat.dataset.count; })
      .catch(err => console.warn('No se pudo leer el conteo de agentes desde Supabase, se usa el valor de respaldo:', err));
  }

  gsap.set(heroTitle.querySelectorAll('.line span'), { y: '110%' });
  gsap.set('#heroSub, #heroCtas', { opacity: 0 });

  gsap.timeline({ delay: 0.2 })
    .to(heroTitle.querySelectorAll('.line span'), { y: '0%', duration: 1.1, ease: 'power4.out', stagger: 0.12 })
    .to('#heroSub', { opacity: 1, duration: 0.8, ease: 'power2.out' }, '-=0.5')
    .to('#heroCtas', { opacity: 1, duration: 0.8, ease: 'power2.out' }, '-=0.6')
    .to(container.querySelector('#heroSearch'), { opacity: 1, duration: 0.8, ease: 'power2.out' }, '-=0.5');

  const pinImg = container.querySelector('.pin-img');
  if (pinImg) {
    gsap.to(pinImg, {
      scale: 1.25, ease: 'none',
      scrollTrigger: { trigger: container.querySelector('.pin-section'), start: 'top top', end: 'bottom bottom', scrub: true }
    });
  }

  // Scroll horizontal "fusionado": el scroll vertical mueve las tarjetas automáticamente,
  // y en cualquier momento el usuario puede deslizarlas con el dedo/trackpad (mismo elemento,
  // usamos scrollLeft en vez de transform para que ambos mecanismos convivan sin pelear).
  const track = container.querySelector('#hTrack');
  if (track) {
    ScrollTrigger.create({
      trigger: container.querySelector('.h-scroll-wrap'),
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1,
      pin: container.querySelector('.h-scroll-sticky'),
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const maxScroll = track.scrollWidth - track.clientWidth;
        track.scrollLeft = self.progress * maxScroll;
      }
    });
  }
}

/* ---------- Formulario de contacto: guarda también en Supabase (además de enviar el correo) ---------- */
function initContactForm(container){
  const form = container.querySelector('#contactForm');
  if (!form) return;

  form.addEventListener('submit', () => {
    // No usamos preventDefault: el formulario sigue su camino normal hacia FormSubmit
    // (así el correo sigue llegando). Esto solo agrega una copia en la base de datos,
    // sin bloquear ni retrasar el envío del formulario.
    const data = new FormData(form);
    const payload = {
      name: data.get('Nombre') || '',
      email: data.get('Correo') || '',
      phone: data.get('Teléfono') || null,
      reason: data.get('Motivo') || null,
      message: data.get('Mensaje') || null,
    };
    fetch(`${SUPABASE_URL}/rest/v1/contact_messages`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload)
    }).catch(err => console.warn('No se pudo guardar el mensaje en Supabase (el correo sí se envía igual):', err));
  });
}

/* ---------- Catálogo de propiedades: se arma con datos reales de Supabase ---------- */
async function initDynamicCatalog(container){
  const grid = container.querySelector('#propertyGrid');
  if (!grid) return;

  function fmtPrice(price, period){
    const formatted = 'US$ ' + Number(price).toLocaleString('en-US');
    return period ? `${formatted} /${period}` : formatted;
  }

  try {
    const properties = await supabaseSelect('properties', '?select=*&order=name.asc');

    if (!properties.length) {
      grid.innerHTML = '<p style="color:var(--ivory-dim); grid-column:1/-1;">Todavía no hay propiedades cargadas.</p>';
      return;
    }

    grid.innerHTML = properties.map(p => {
      const mediaStyle = p.hero_image_url
        ? `style="background-image:url('${p.hero_image_url}'); background-size:cover; background-position:center;" role="img" aria-label="${p.name}"`
        : '';
      return `
        <a href="propiedad-${p.slug}.html" class="property-card reveal" data-status="${p.status}" data-location="${p.location.split(',')[0].trim()}" data-price="${p.price}" data-bedrooms="${p.bedrooms || 0}">
          <div class="property-media" ${mediaStyle}></div><div class="property-overlay"></div>
          <div class="property-status">${p.status === 'venta' ? 'Venta' : 'Alquiler'}</div>
          <div class="property-info">
            <div class="name">${p.name}</div>
            <div class="loc">${p.location}</div>
            <div class="property-meta"><span>${p.bedrooms || '—'} hab</span><span>${p.bathrooms || '—'} baños</span><span>${p.area_m2 || '—'} m²</span></div>
            <div class="property-price">${fmtPrice(p.price, p.price_period)}</div>
          </div>
        </a>`;
    }).join('');

  } catch (err) {
    console.warn('No se pudieron cargar las propiedades desde Supabase:', err);
    grid.innerHTML = '<p style="color:var(--ivory-dim); grid-column:1/-1;">No se pudo cargar el catálogo en este momento. Intenta recargar la página.</p>';
  }

  // Las tarjetas y sus filtros ya existen en el DOM — ahora sí se activan el
  // efecto de aparición y la lógica de filtrado (antes de esto no tenía sentido).
  initReveals(container);
  initFilters(container);
  setTimeout(() => ScrollTrigger.refresh(), 50);
}

/* ---------- Listado de agentes: se arma con datos reales de Supabase ---------- */
async function initDynamicAgentsList(container){
  const grid = container.querySelector('.agent-grid');
  if (!grid) return;

  try {
    const agents = await supabaseSelect('agents', '?select=*&order=name.asc');

    if (!agents.length) {
      grid.innerHTML = '<p style="color:var(--ivory-dim);">Todavía no hay agentes cargados.</p>';
      return;
    }

    grid.innerHTML = agents.map(a => {
      const photoStyle = a.photo_url
        ? `style="background-image:url('${a.photo_url}'); background-size:cover; background-position:center top;" role="img" aria-label="${a.name}, ${a.role}"`
        : '';
      return `
        <a href="agente-${a.slug}.html" class="agent-card reveal">
          <div class="agent-photo" ${photoStyle}></div><div class="agent-card-overlay"></div>
          <div class="agent-card-info">
            <div class="name">${a.name}</div>
            <div class="role">${a.role || ''}</div>
            <div class="agent-card-stats"><span>${a.sales_count || 0} ventas</span><span>${a.years_experience || 0} años</span></div>
          </div>
        </a>`;
    }).join('');

  } catch (err) {
    console.warn('No se pudieron cargar los agentes desde Supabase:', err);
    grid.innerHTML = '<p style="color:var(--ivory-dim);">No se pudo cargar el equipo en este momento. Intenta recargar la página.</p>';
  }

  initReveals(container);
  setTimeout(() => ScrollTrigger.refresh(), 50);
}

const namespaceAnimations = {
  home: initHomeAnimations,
  contacto: initContactForm,
  propiedades: initDynamicCatalog,
  agentes: initDynamicAgentsList
};

/* ---------- Botón flotante de WhatsApp (aparece en todas las páginas) ---------- */
function initWhatsAppButton(){
  if (document.querySelector('.wa-float')) return; // evita duplicados si Barba re-ejecuta esto
  const phone = '18095550123'; // mismo número que aparece en el footer — cámbialo aquí y se actualiza en todo el sitio
  const message = encodeURIComponent('Hola, vengo desde el sitio de ALTURA y me gustaría más información.');
  const btn = document.createElement('a');
  btn.href = `https://wa.me/${phone}?text=${message}`;
  btn.target = '_blank';
  btn.rel = 'noopener';
  btn.className = 'wa-float';
  btn.setAttribute('aria-label', 'Escribir por WhatsApp');
  btn.innerHTML = `<svg viewBox="0 0 32 32" width="28" height="28" fill="currentColor"><path d="M16.004 3C9.377 3 4 8.373 4 15c0 2.34.65 4.53 1.78 6.4L4 29l7.78-1.74A11.94 11.94 0 0 0 16.004 27C22.63 27 28 21.627 28 15S22.63 3 16.004 3Zm6.98 16.55c-.29.82-1.44 1.5-2.35 1.7-.63.13-1.45.24-4.21-.9-3.53-1.46-5.8-5.04-5.98-5.27-.17-.24-1.43-1.9-1.43-3.63s.9-2.57 1.22-2.93c.29-.32.63-.4.85-.4h.6c.19 0 .45-.07.7.54.29.7.98 2.41 1.06 2.58.09.17.14.36.03.58-.11.23-.17.36-.34.56-.17.2-.36.44-.51.6-.17.17-.35.35-.15.7.19.35.86 1.42 1.85 2.3 1.27 1.13 2.34 1.49 2.69 1.66.35.17.55.14.76-.08.21-.23.87-1.01 1.1-1.36.23-.34.46-.29.77-.17.31.11 1.99.94 2.33 1.11.34.17.57.26.65.4.09.14.09.79-.19 1.61Z"/></svg>`;
  document.body.appendChild(btn);
}

/* ---------- Calculadora de hipoteca ---------- */
function initMortgageCalc(container){
  const calc = container.querySelector('.mortgage-calc');
  if (!calc) return;
  const price = parseFloat(calc.dataset.price);
  const downInput = calc.querySelector('[data-mc="down"]');
  const rateInput = calc.querySelector('[data-mc="rate"]');
  const yearsInput = calc.querySelector('[data-mc="years"]');
  const downLabel = calc.querySelector('[data-mc-label="down"]');
  const rateLabel = calc.querySelector('[data-mc-label="rate"]');
  const yearsLabel = calc.querySelector('[data-mc-label="years"]');
  const resultEl = calc.querySelector('[data-mc-result]');

  function fmt(n){ return 'US$ ' + Math.round(n).toLocaleString('en-US'); }

  function update(){
    const downPct = parseFloat(downInput.value);
    const rate = parseFloat(rateInput.value) / 100 / 12;
    const months = parseFloat(yearsInput.value) * 12;
    const loan = price * (1 - downPct / 100);
    const payment = rate === 0 ? loan / months : (loan * rate) / (1 - Math.pow(1 + rate, -months));

    downLabel.textContent = downPct + '%';
    rateLabel.textContent = rateInput.value + '%';
    yearsLabel.textContent = yearsInput.value + ' años';
    resultEl.textContent = fmt(payment) + ' /mes';
  }

  [downInput, rateInput, yearsInput].forEach(el => el.addEventListener('input', update));
  update();
}

/* ---------- Tour virtual 360° (Pannellum) — funciona sin importar cómo se llegue a la página ---------- */
function initTourModal(container){
  const openBtn = container.querySelector('#openTourBtn');
  const closeBtn = document.getElementById('closeTourBtn');
  const modal = document.getElementById('tourModal');
  if (!openBtn || !modal) return;

  let viewer = null;
  const newOpenBtn = openBtn.cloneNode(true); // evita listeners duplicados si esto corre más de una vez
  openBtn.parentNode.replaceChild(newOpenBtn, openBtn);

  // Carga Pannellum (CSS + JS) solo la primera vez que alguien hace clic —
  // así el 99% de las visitas (que nunca abren el tour) no pagan ese peso.
  function loadPannellumThen(callback){
    if (typeof pannellum !== 'undefined') { callback(); return; }
    if (!document.querySelector('link[href*="pannellum.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'assets/js/vendor/pannellum.css';
      document.head.appendChild(link);
    }
    const script = document.createElement('script');
    script.src = 'assets/js/vendor/pannellum.js';
    script.onload = callback;
    document.head.appendChild(script);
  }

  newOpenBtn.addEventListener('click', (e) => {
    e.preventDefault();
    modal.classList.add('open');
    loadPannellumThen(() => {
      if (!viewer) {
        viewer = pannellum.viewer('panorama', {
          type: 'equirectangular',
          panorama: 'https://pannellum.org/images/alma.jpg',
          autoLoad: true,
          compass: false
        });
      }
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });
}

/* ---------- Menú móvil (hamburguesa) ---------- */
function initMobileMenu(){
  const btn = document.getElementById('hamburgerBtn');
  const menu = document.getElementById('mobileMenu');
  const desktopLinks = document.querySelector('.topnav .links');
  if (!btn || !menu || !desktopLinks) return;

  // Reconstruye el contenido cada vez, para que el link "activo" siempre
  // refleje la página actual (incluso después de navegar con Barba).
  menu.innerHTML = '';
  desktopLinks.querySelectorAll('a').forEach(a => {
    const clone = a.cloneNode(true);
    clone.addEventListener('click', closeMenu);
    menu.appendChild(clone);
  });
  const cta = document.createElement('a');
  cta.href = 'contacto.html';
  cta.className = 'btn btn-fill';
  cta.textContent = 'Agendar cita';
  cta.addEventListener('click', closeMenu);
  menu.appendChild(cta);

  function openMenu(){
    menu.classList.add('open');
    btn.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeMenu(){
    menu.classList.remove('open');
    btn.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  // Evita listeners duplicados si esto corre más de una vez
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  newBtn.addEventListener('click', () => {
    menu.classList.contains('open') ? closeMenu() : openMenu();
  });
}

function initPageAnimations(container){
  initNavScroll();
  initReveals(container);
  initCounters(container);
  initParallax(container);
  // initFilters ya no se llama aquí de forma genérica: en la página de
  // propiedades, initDynamicCatalog la llama una sola vez, después de que
  // las tarjetas reales (traídas de Supabase) ya existen en el DOM.
  initWhatsAppButton();
  initMortgageCalc(container);
  initTourModal(container);
  initMobileMenu();

  const ns = container.getAttribute && container.getAttribute('data-barba-namespace');
  if (ns && namespaceAnimations[ns]) namespaceAnimations[ns](container);

  setTimeout(() => ScrollTrigger.refresh(), 50);
}

/* ---------- Loader simple entre páginas ---------- */
function showLoader(){
  const l = document.querySelector('.page-loader');
  if (l) gsap.to(l, { autoAlpha: 1, duration: 0.35, ease: 'power2.inOut' });
}
function hideLoader(){
  const l = document.querySelector('.page-loader');
  if (l) gsap.to(l, { autoAlpha: 0, duration: 0.5, ease: 'power2.inOut', delay: 0.1 });
}

/* ---------- Barba.js: transición entre páginas manteniendo la sensación de scroll ---------- */
document.addEventListener('DOMContentLoaded', () => {
  try {
    initLenis();
    const initialContainer = document.querySelector('[data-barba="container"]') || document.body;
    initPageAnimations(initialContainer);

    // Asegura que la pantalla de carga esté oculta en la carga inicial de la página
    const initialLoader = document.querySelector('.page-loader');
    if (initialLoader) gsap.set(initialLoader, { autoAlpha: 0 });
  } catch (e) {
    console.warn('Error iniciando animaciones:', e);
  }

  if (typeof barba === 'undefined') return;

  barba.init({
    transitions: [{
      name: 'default-fade',
      async leave(data){
        showLoader();
        // Mata todas las animaciones/pines de la página que se va, para que no queden
        // duplicados ni "fantasmas" al volver a visitarla
        ScrollTrigger.getAll().forEach(st => st.kill());
        killLenis();
        await gsap.to(data.current.container, { autoAlpha: 0, y: -20, duration: 0.45, ease: 'power2.inOut' }).then();
      },
      enter(data){
        window.scrollTo(0, 0);
        gsap.set(data.next.container, { autoAlpha: 0, y: 20 });
        initLenis();
        gsap.to(data.next.container, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out', onComplete: hideLoader });
      }
    }]
  });

  barba.hooks.after((data) => {
    initPageAnimations(data.next.container);
    document.querySelectorAll('.topnav .links a').forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === window.location.pathname.split('/').pop());
    });
  });
});
