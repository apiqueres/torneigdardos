/* ============================================================
   bracket.js — lógica pura de doble eliminación (sin DOM)
   ------------------------------------------------------------
   build(size)  → estructura de partidos para un cuadro de `size`
                  jugadores (potencia de 2, mínimo 4).
   derive(...)  → estado calculado (quién juega dónde, ganadores,
                  perdedores) a partir de la lista de resultados.
   Los byes se resuelven solos: un jugador contra BYE avanza.
   ============================================================ */
const Bracket = (() => {
  const BYE = 'BYE';

  /** Tamaño del cuadro: potencia de 2 ≥ n, mínimo 4. */
  function bracketSize(n) {
    let s = 4;
    while (s < n) s *= 2;
    return s;
  }

  /** Posiciones estándar de siembra: [1,8,4,5,2,7,3,6] para 8. */
  function seedPositions(size) {
    let arr = [1, 2];
    while (arr.length < size) {
      const n = arr.length * 2;
      const next = [];
      for (const x of arr) next.push(x, n + 1 - x);
      arr = next;
    }
    return arr;
  }

  /**
   * Construye todos los partidos en orden cronológico (así los ids
   * y etiquetas M1, M2… siguen el orden de juego, como en la referencia).
   */
  function build(size) {
    const k = Math.log2(size);
    const matches = [];
    const add = (bracket, round, slots) => {
      const m = { id: matches.length, bracket, round, slots, label: '' };
      matches.push(m);
      return m.id;
    };
    const seeds = seedPositions(size);

    // Cuadro de ganadores, ronda 1
    const W = [[]];
    for (let i = 0; i < size / 2; i++) {
      W[0].push(add('W', 0, [
        { type: 'seed', seed: seeds[2 * i] },
        { type: 'seed', seed: seeds[2 * i + 1] },
      ]));
    }

    // Cuadro de perdedores, ronda 1: perdedores de W1 emparejados
    const L = [[]];
    for (let i = 0; i < size / 4; i++) {
      L[0].push(add('L', 0, [
        { type: 'loser', match: W[0][2 * i] },
        { type: 'loser', match: W[0][2 * i + 1] },
      ]));
    }
    let prev = L[0];

    for (let r = 1; r < k; r++) {
      // Ganadores, ronda r+1
      W[r] = [];
      for (let i = 0; i < W[r - 1].length / 2; i++) {
        W[r].push(add('W', r, [
          { type: 'winner', match: W[r - 1][2 * i] },
          { type: 'winner', match: W[r - 1][2 * i + 1] },
        ]));
      }
      // Perdedores: ronda de "fusión" (ganadores de la ronda anterior entre sí)
      if (r >= 2) {
        const merge = [];
        for (let i = 0; i < prev.length / 2; i++) {
          merge.push(add('L', L.length, [
            { type: 'winner', match: prev[2 * i] },
            { type: 'winner', match: prev[2 * i + 1] },
          ]));
        }
        L.push(merge);
        prev = merge;
      }
      // Perdedores: ronda de "caída" (ganador LB vs perdedor que baja de WB)
      // Se invierte el orden en rondas alternas para evitar revanchas inmediatas.
      const drops = r % 2 === 1 ? [...W[r]].reverse() : W[r];
      const drop = [];
      for (let i = 0; i < W[r].length; i++) {
        drop.push(add('L', L.length, [
          { type: 'winner', match: prev[i] },
          { type: 'loser', match: drops[i] },
        ]));
      }
      L.push(drop);
      prev = drop;
    }

    // Gran final (sin reset): ganador WB vs ganador LB
    const F = add('F', 0, [
      { type: 'winner', match: W[k - 1][0] },
      { type: 'winner', match: prev[0] },
    ]);

    let n = 1;
    for (const m of matches) m.label = m.bracket === 'F' ? 'FINAL' : 'M' + (n++);

    return { size, k, matches, W, L, F };
  }

  /**
   * Calcula el estado de cada partido.
   * @param b        estructura de build()
   * @param nPlayers número de jugadores reales (índices 0..n-1)
   * @param results  [{m: idPartido, w: 0|1}] en orden cronológico
   * @returns array paralelo a b.matches: {p:[a,b], winner, loser, auto}
   *          donde cada valor es índice de jugador, BYE o null (pendiente)
   */
  function derive(b, nPlayers, results) {
    const res = new Map(results.map(r => [r.m, r.w]));
    const seedPlayer = s => (s <= nPlayers ? s - 1 : BYE);
    const state = b.matches.map(() => ({ p: [null, null], winner: null, loser: null, auto: false }));

    b.matches.forEach((m, i) => {
      const st = state[i];
      st.p = m.slots.map(sl => {
        if (sl.type === 'seed') return seedPlayer(sl.seed);
        const src = state[sl.match];
        return sl.type === 'winner' ? src.winner : src.loser;
      });
      const [a, c] = st.p;
      if (a === BYE && c === BYE) { st.winner = BYE; st.loser = BYE; st.auto = true; }
      else if (a === BYE || c === BYE) {
        // Con un BYE el partido se decide solo: el perdedor es el BYE aunque
        // el rival aún no se conozca; el ganador se fija cuando llegue.
        st.auto = true; st.loser = BYE;
        const other = a === BYE ? c : a;
        if (other !== null) st.winner = other;
      }
      else if (a === null || c === null) return;
      else if (res.has(m.id)) {
        const w = res.get(m.id);
        st.winner = st.p[w];
        st.loser = st.p[1 - w];
      }
    });
    return state;
  }

  /** Partidos "reales" (sin bye) y cuántos se han decidido. */
  function progress(b, state) {
    let total = 0, done = 0;
    b.matches.forEach((m, i) => {
      const st = state[i];
      // Un partido cuenta si en algún momento tendrá dos jugadores reales.
      // Aproximación práctica: los que ya tienen dos reales o los pendientes.
      if (st.auto) return;
      total++;
      if (st.winner !== null) done++;
    });
    return { total, done };
  }

  /** Clasificación final: 1º campeón, 2º subcampeón, 3º perdedor de la final LB. */
  function podium(b, state) {
    const f = state[b.F];
    if (f.winner === null) return null;
    const lbFinalId = b.matches[b.F].slots[1].match;
    const third = state[lbFinalId].loser;
    return { first: f.winner, second: f.loser, third: third === BYE ? null : third };
  }

  return { BYE, bracketSize, seedPositions, build, derive, progress, podium };
})();
