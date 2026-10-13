/* ============================================================
   app.js — estado, vistas y render del generador de brackets
   ============================================================ */
(() => {
  const STORE = 'dardos-bracket-v1';
  const MAX_PLAYERS = 32;
  const MIN_PLAYERS = 3;
  const DEFAULT_TITLE = 'TORNEO DE DARDOS';

  const $app = document.getElementById('app');
  const $actions = document.getElementById('actions');
  const $champ = document.getElementById('champ');

  /* ---------- Estado ---------- */
  let S = load() || { view: 'setup', title: DEFAULT_TITLE, players: [], results: [] };
  let B = null;           // estructura del bracket (Bracket.build)
  let champShown = false; // overlay del campeón mostrado en esta sesión

  function load() {
    try {
      const raw = localStorage.getItem(STORE);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s || !Array.isArray(s.players) || !Array.isArray(s.results)) return null;
      return s;
    } catch { return null; }
  }
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(S)); } catch { /* sin almacenamiento */ }
  }

  /* ---------- Utilidades ---------- */
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const initials = name => name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  function hue(name) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return h % 360;
  }
  const avatar = (name, extra = '') =>
    `<span class="avatar ${extra}" style="background:hsl(${hue(name)} 62% 42%)">${esc(initials(name))}</span>`;
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  const btn = (id, text, cls = '', attrs = '') =>
    `<button class="btn ${cls}" id="${id}" ${attrs}>${text}</button>`;

  /* ============================================================
     VISTA: CONFIGURACIÓN
     ============================================================ */
  function renderSetup() {
    const n = S.players.length;
    const size = n >= MIN_PLAYERS ? Bracket.bracketSize(n) : null;
    const byes = size ? size - n : 0;

    let info;
    if (n === 0) info = `Añade al menos <b>${MIN_PLAYERS}</b> jugadores.`;
    else if (n < MIN_PLAYERS) info = `<b>${n}</b> jugador${n === 1 ? '' : 'es'} · faltan <b>${MIN_PLAYERS - n}</b> como mínimo.`;
    else info = `<b>${n}</b> jugadores · cuadro de <b>${size}</b>` +
      (byes ? ` · <span class="warn">${byes} pasa${byes === 1 ? '' : 'n'} la primera ronda sin jugar (bye)</span>` : ' · sin byes');
    if (n >= MAX_PLAYERS) info += ` · máximo ${MAX_PLAYERS}`;

    $app.innerHTML = `
      <section class="setup">
        <div class="card">
          <div class="eyebrow">Nuevo torneo</div>
          <h1>Configura el cuadro</h1>

          <label class="field">
            <span>Nombre del torneo</span>
            <input class="input" id="title" maxlength="40" value="${esc(S.title)}" placeholder="${DEFAULT_TITLE}">
          </label>

          <div class="field">
            <span>Jugadores (Enter para añadir · puedes pegar una lista)</span>
            <div class="addrow">
              <input class="input" id="pname" placeholder="Nombre del jugador" autocomplete="off" ${n >= MAX_PLAYERS ? 'disabled' : ''}>
              ${btn('add', 'Añadir', '', n >= MAX_PLAYERS ? 'disabled' : '')}
            </div>
          </div>

          <ol class="plist" id="plist">
            ${S.players.map((p, i) => `
              <li>
                <span class="num">${String(i + 1).padStart(2, '0')}</span>
                ${avatar(p)}
                <span class="name">${esc(p)}</span>
                <button class="x" data-rm="${i}" title="Quitar">×</button>
              </li>`).join('')}
          </ol>
          ${n === 0 ? '<div class="empty">Todavía no hay jugadores.</div>' : ''}

          <div class="info">${info}</div>

          <div class="actions">
            ${btn('shuffle', 'Sortear orden', 'btn-ghost', n < 2 ? 'disabled' : '')}
            ${btn('go', 'Generar cuadro', '', n < MIN_PLAYERS ? 'disabled' : '')}
          </div>
        </div>
      </section>`;

    $actions.innerHTML = S.results.length || S.players.length
      ? btn('reset-all', 'Borrar todo', 'btn-danger btn-sm') : '';

    const $title = document.getElementById('title');
    const $pname = document.getElementById('pname');
    $title.addEventListener('input', () => { S.title = $title.value; save(); });

    const addNames = raw => {
      const names = raw.split(/[\n,;]+/).map(s => s.trim().slice(0, 24)).filter(Boolean);
      for (const nm of names) {
        if (S.players.length >= MAX_PLAYERS) break;
        S.players.push(nm);
      }
      save(); renderSetup();
      document.getElementById('pname')?.focus();
    };
    document.getElementById('add').addEventListener('click', () => { if ($pname.value.trim()) addNames($pname.value); });
    $pname.addEventListener('keydown', e => { if (e.key === 'Enter' && $pname.value.trim()) { e.preventDefault(); addNames($pname.value); } });
    $pname.addEventListener('paste', e => {
      const txt = (e.clipboardData || window.clipboardData).getData('text');
      if (/[\n,;]/.test(txt)) { e.preventDefault(); addNames(txt); }
    });
    $pname.focus();

    document.getElementById('plist').addEventListener('click', e => {
      const b = e.target.closest('[data-rm]');
      if (!b) return;
      S.players.splice(+b.dataset.rm, 1);
      save(); renderSetup();
    });
    document.getElementById('shuffle').addEventListener('click', () => {
      shuffle(S.players); save(); renderSetup();
      document.getElementById('plist').classList.add('shuffling');
    });
    document.getElementById('go').addEventListener('click', () => {
      if (!S.title.trim()) S.title = DEFAULT_TITLE;
      S.results = [];
      S.view = 'bracket';
      save(); render();
    });
    document.getElementById('reset-all')?.addEventListener('click', () => {
      if (!confirm('¿Borrar título, jugadores y resultados?')) return;
      S = { view: 'setup', title: DEFAULT_TITLE, players: [], results: [] };
      save(); render();
    });
  }

  /* ============================================================
     VISTA: BRACKET
     ============================================================ */
  function slotHtml(m, st, si, b) {
    const p = st.p[si];
    const sl = m.slots[si];
    if (p === null) {
      const src = b.matches[sl.match];
      const hint = sl.type === 'winner' ? `GANADOR ${src.label}` : `PERDEDOR ${src.label}`;
      return `<div class="slot tbd" data-slot="${si}"><span class="name">PENDIENTE</span><span class="hint">${hint}</span></div>`;
    }
    if (p === Bracket.BYE) {
      return `<div class="slot bye" data-slot="${si}"><span class="name">BYE</span><span class="hint">exento</span></div>`;
    }
    const name = S.players[p];
    let cls = '';
    if (st.winner !== null) cls = st.winner === p ? 'win' : 'lose';
    else if (isPlayable(st)) cls = 'pick';
    const mark = cls === 'win' ? '<span class="mark">✓</span>' : '';
    return `<div class="slot ${cls}" data-slot="${si}" title="${cls === 'pick' ? 'Marcar como ganador' : ''}">${avatar(name)}<span class="name">${esc(name)}</span>${mark}</div>`;
  }

  /** Un partido se puede decidir si tiene dos jugadores reales y aún no tiene ganador. */
  const isPlayable = st => st.winner === null && typeof st.p[0] === 'number' && typeof st.p[1] === 'number';

  /** Descarta resultados que no eran válidos en el momento de registrarse. */
  function sanitizeResults(b, n) {
    const ok = [];
    for (const r of S.results) {
      const st = Bracket.derive(b, n, ok);
      if (st[r.m] && isPlayable(st[r.m]) && (r.w === 0 || r.w === 1)) ok.push(r);
    }
    if (ok.length !== S.results.length) { S.results = ok; save(); }
  }

  function matchHtml(m, st, b) {
    return `
      <div class="match ${m.bracket === 'F' ? 'final' : ''}" data-id="${m.id}">
        <div class="mlabel">${m.label}</div>
        <div class="slots">${slotHtml(m, st, 0, b)}${slotHtml(m, st, 1, b)}</div>
      </div>`;
  }

  function renderBracket() {
    const n = S.players.length;
    if (n < MIN_PLAYERS) { S.view = 'setup'; save(); return renderSetup(); }
    const size = Bracket.bracketSize(n);
    if (!B || B.size !== size) B = Bracket.build(size);
    sanitizeResults(B, n);
    const st = Bracket.derive(B, n, S.results);
    const k = B.k;
    const cols = Math.max(k + 1, 2 * (k - 1));
    const prog = Bracket.progress(B, st);
    const pod = Bracket.podium(B, st);

    const roundCol = (ids, col) =>
      `<div class="round" style="grid-column:${col}">${ids.map(id => matchHtml(B.matches[id], st[id], B)).join('')}</div>`;

    const wb = B.W.map((ids, r) => roundCol(ids, r + 1)).join('') + roundCol([B.F], cols);
    const lb = B.L.map((ids, r) => roundCol(ids, r + 1)).join('');
    const titleCol = cols >= 2 ? `${cols - 1} / span 2` : '1';

    $app.innerHTML = `
      <div class="bracket-scroll">
        <div class="bracket" style="--cols:${cols}">
          <svg class="links"><path d=""></path></svg>
          <div class="tier tier-w"><span class="tier-label">CUADRO DE GANADORES</span>${wb}</div>
          <div class="band">
            <div class="title-block" style="grid-column:${titleCol}">
              <div class="title-tag"><span class="ico"><svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 4 20 20H4Z" fill="currentColor"/></svg></span><span>DOBLE ELIMINACIÓN</span></div>
              <h1>${esc(S.title || DEFAULT_TITLE)}</h1>
              <div class="pill">BRACKET</div>
              <div class="progress"><b>${prog.done}</b> / ${prog.total} partidos jugados</div>
              ${pod ? `<div class="champ-badge">${avatar(S.players[pod.first])} 🏆 Campeón: ${esc(S.players[pod.first])}</div>` : ''}
            </div>
            <div class="band-arrow"></div>
          </div>
          <div class="tier tier-l"><span class="tier-label">CUADRO DE PERDEDORES</span>${lb}</div>
        </div>
      </div>
      ${scheduleHtml(st, prog)}`;

    $actions.innerHTML = [
      btn('undo', '↶ Deshacer', 'btn-ghost', S.results.length ? '' : 'disabled'),
      S.results.length ? '' : btn('reshuffle', 'Sortear de nuevo', 'btn-ghost'),
      btn('edit', 'Editar jugadores', 'btn-ghost'),
      btn('new', 'Nuevo torneo', 'btn-danger'),
    ].join('');

    // Interacción
    $app.querySelector('.bracket').addEventListener('click', e => {
      const slot = e.target.closest('.slot.pick');
      if (!slot) return;
      const id = +slot.closest('.match').dataset.id;
      const w = +slot.dataset.slot;
      const cur = Bracket.derive(B, n, S.results);
      if (!cur[id] || !isPlayable(cur[id])) return;
      S.results.push({ m: id, w });
      save();
      renderBracket();
      FX.random(e.clientX, e.clientY);
      const stNow = Bracket.derive(B, n, S.results);
      if (stNow[B.F].winner !== null && !champShown) {
        champShown = true;
        setTimeout(showChampion, 700);
      }
    });
    document.getElementById('undo').addEventListener('click', () => {
      S.results.pop(); champShown = false; save(); renderBracket();
    });
    document.getElementById('reshuffle')?.addEventListener('click', () => {
      shuffle(S.players); save(); renderBracket();
    });
    document.getElementById('edit').addEventListener('click', () => {
      if (S.results.length && !confirm('Volver a editar jugadores borrará los resultados. ¿Continuar?')) return;
      S.results = []; S.view = 'setup'; champShown = false; save(); render();
    });
    document.getElementById('new').addEventListener('click', () => {
      if (!confirm('¿Empezar un torneo nuevo? Se borrarán jugadores y resultados.')) return;
      S = { view: 'setup', title: DEFAULT_TITLE, players: [], results: [] };
      B = null; champShown = false; save(); render();
    });

    // Orden de partidos: clic en una fila → salta al partido en el cuadro
    $app.querySelector('.schedule')?.addEventListener('click', e => {
      const row = e.target.closest('[data-id]');
      if (!row) return;
      const el = $app.querySelector(`.match[data-id="${row.dataset.id}"]`);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    });

    drawLinks();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawLinks);
  }

  /** Sección "Orden de partidos": lista cronológica sin los partidos con bye. */
  function scheduleHtml(st, prog) {
    const TIER = { W: 'Ganadores', L: 'Perdedores', F: 'Gran final' };
    const nameOf = (m, s, si) => {
      const p = s.p[si];
      if (p === Bracket.BYE) return '<span class="dim">BYE</span>';
      if (p === null) {
        const src = B.matches[m.slots[si].match];
        return `<span class="dim">${m.slots[si].type === 'winner' ? 'Ganador' : 'Perdedor'} ${src.label}</span>`;
      }
      const cls = s.winner === null ? '' : (s.winner === p ? 'w' : 'l');
      return `<span class="${cls}">${avatar(S.players[p])}${esc(S.players[p])}</span>`;
    };
    let nextFound = false;
    const rows = B.matches.filter(m => !st[m.id].auto).map(m => {
      const s = st[m.id];
      let state, label;
      if (s.winner !== null) { state = 'done'; label = 'Jugado'; }
      else if (isPlayable(s)) { state = nextFound ? 'ready' : 'next'; label = nextFound ? 'Listo' : 'Siguiente'; nextFound = true; }
      else { state = 'wait'; label = 'Pendiente'; }
      return `
        <li class="sch-row ${state}" data-id="${m.id}" title="Ver en el cuadro">
          <span class="sch-label">${m.label}</span>
          <span class="sch-tier">${TIER[m.bracket]}</span>
          <span class="sch-players">${nameOf(m, s, 0)}<em>vs</em>${nameOf(m, s, 1)}</span>
          <span class="sch-state">${label}</span>
        </li>`;
    }).join('');
    const byes = B.matches.length - B.matches.filter(m => !st[m.id].auto).length;
    return `
      <section class="schedule">
        <div class="sch-head">
          <div>
            <div class="eyebrow">Orden de partidos</div>
            <h2>Calendario del torneo</h2>
          </div>
          <div class="sch-meta"><b>${prog.done}</b> / ${prog.total} jugados${byes ? ` · ${byes} pase${byes === 1 ? '' : 's'} automático${byes === 1 ? '' : 's'} por bye` : ''}</div>
        </div>
        <ol class="sch-list">${rows}</ol>
      </section>`;
  }

  /** Dibuja los conectores entre partidos (solo flujo de ganadores). */
  function drawLinks() {
    const br = $app.querySelector('.bracket');
    if (!br || !B) return;
    const svg = br.querySelector('svg.links');
    const path = svg.querySelector('path');
    const R = br.getBoundingClientRect();
    const w = br.scrollWidth, h = br.scrollHeight;
    svg.setAttribute('width', w); svg.setAttribute('height', h);
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    let d = '';
    for (const m of B.matches) {
      m.slots.forEach((sl, si) => {
        if (sl.type !== 'winner') return;
        const src = B.matches[sl.match];
        if (src.bracket !== m.bracket && m.bracket !== 'F') return;
        const se = br.querySelector(`[data-id="${src.id}"] .slots`);
        const te = br.querySelector(`[data-id="${m.id}"] .slot[data-slot="${si}"]`);
        if (!se || !te) return;
        const a = se.getBoundingClientRect(), b = te.getBoundingClientRect();
        const x1 = a.right - R.left, y1 = a.top + a.height / 2 - R.top;
        const x2 = b.left - R.left, y2 = b.top + b.height / 2 - R.top;
        if (src.bracket !== m.bracket) {
          // Final del cuadro de perdedores → gran final: sube por la derecha
          // para no atravesar el título.
          const xr = (b.right - R.left) + 22;
          d += `M${x1.toFixed(1)} ${y1.toFixed(1)}H${xr.toFixed(1)}V${y2.toFixed(1)}H${(b.right - R.left).toFixed(1)}`;
          return;
        }
        const xm = x1 + (x2 - x1) / 2;
        d += `M${x1.toFixed(1)} ${y1.toFixed(1)}H${xm.toFixed(1)}V${y2.toFixed(1)}H${x2.toFixed(1)}`;
      });
    }
    path.setAttribute('d', d);
  }
  window.addEventListener('resize', drawLinks);

  /* ---------- Overlay campeón ---------- */
  function showChampion() {
    const st = Bracket.derive(B, S.players.length, S.results);
    const pod = Bracket.podium(B, st);
    if (!pod) return;
    const name = S.players[pod.first];
    $champ.innerHTML = `
      <div class="champ-card">
        <div class="eyebrow">${esc(S.title || DEFAULT_TITLE)}</div>
        ${avatar(name)}
        <div class="sub">Campeón</div>
        <h2>${esc(name)}</h2>
        <div class="podium">
          <div><small>2º</small>${esc(S.players[pod.second])}</div>
          ${pod.third !== null ? `<div><small>3º</small>${esc(S.players[pod.third])}</div>` : ''}
        </div>
        ${btn('champ-close', 'Ver el cuadro')}
      </div>`;
    $champ.classList.remove('hidden');
    FX.champion();
    document.getElementById('champ-close').addEventListener('click', () => $champ.classList.add('hidden'));
    $champ.addEventListener('click', e => { if (e.target === $champ) $champ.classList.add('hidden'); }, { once: true });
  }

  /* ---------- Router ---------- */
  function render() {
    $champ.classList.add('hidden');
    if (S.view === 'bracket') renderBracket();
    else renderSetup();
  }
  render();
})();
