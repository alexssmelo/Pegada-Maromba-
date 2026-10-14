/* Boneco com as medidas + faixas de referência (circunferência abdominal e relação cintura/quadril). Usado no painel e no app do aluno. */
(function () {
  const MEDIDAS = [['pescoco', 'Pescoço'], ['ombro', 'Ombro'], ['peito', 'Peito / tórax'], ['braco', 'Braço direito'], ['bracoE', 'Braço esquerdo'], ['antebraco', 'Antebraço direito'], ['antebracoE', 'Antebraço esquerdo'],
    ['cintura', 'Cintura'], ['abdomen', 'Abdômen'], ['quadril', 'Quadril'], ['coxa', 'Coxa direita'], ['coxaE', 'Coxa esquerda'], ['panturrilha', 'Panturrilha direita'], ['panturrilhaE', 'Panturrilha esquerda']];
  // [chave, nome curto, lado do texto, y do texto, ponto no corpo]
  const PTS = [['ombro', 'Ombro', 'L', 66, [178, 70]], ['braco', 'Braço D', 'L', 104, [158, 106]], ['cintura', 'Cintura', 'L', 142, [181, 158]], ['antebraco', 'Antebraço D', 'L', 180, [138, 172]],
    ['quadril', 'Quadril', 'L', 226, [182, 230]], ['coxa', 'Coxa D', 'L', 288, [200, 275]], ['panturrilha', 'Pant. D', 'L', 358, [196, 355]],
    ['pescoco', 'Pescoço', 'R', 44, [220, 52]], ['peito', 'Peito', 'R', 90, [246, 98]], ['bracoE', 'Braço E', 'R', 124, [282, 106]], ['abdomen', 'Abdômen', 'R', 164, [252, 186]],
    ['antebracoE', 'Antebraço E', 'R', 200, [302, 172]], ['coxaE', 'Coxa E', 'R', 288, [240, 275]], ['panturrilhaE', 'Pant. E', 'R', 358, [244, 355]]];
  const n = v => { const x = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isNaN(x) ? null : x; };
  const f = v => v.toFixed(1).replace('.', ',');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function svg(m, ant) {
    m = m || {}; const am = (ant && ant.medidas) || {};
    const leg = (l, y, v, dv, sx) => { const a = sx === 'L' ? 'start' : 'end', x = sx === 'L' ? 2 : 438;
      return `<text x="${x}" y="${y}" text-anchor="${a}" font-size="11" fill="var(--muted,#667)">${esc(l)}</text><text x="${x}" y="${y + 15}" text-anchor="${a}" font-size="14" font-weight="700" fill="var(--ink,#111)">${f(v)} cm${dv != null && Math.abs(dv) >= 0.05 ? `<tspan font-size="10" font-weight="400" fill="var(--muted,#667)"> (${dv > 0 ? '+' : '−'}${f(Math.abs(dv))})</tspan>` : ''}</text>`; };
    let t = '';
    PTS.forEach(([k, l, sx, y, [ax, ay]]) => { const v = n(m[k]); if (v == null) return; const p = n(am[k]);
      t += `<line x1="${sx === 'L' ? 104 : 340}" y1="${y + 9}" x2="${ax}" y2="${ay}" stroke="var(--muted,#667)" stroke-width="1" stroke-dasharray="3 3"/><circle cx="${ax}" cy="${ay}" r="3.5" fill="var(--accent,#c62828)"/>` + leg(l, y, v, p != null ? v - p : null, sx); });
    const limb = (pts, w) => `<polyline points="${pts}" fill="none" stroke="var(--line,#d9d6e6)" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
    return `<svg viewBox="0 0 440 420" role="img" aria-label="Medidas no corpo" style="width:100%;max-width:440px;display:block;margin:8px auto">
      <g>${limb('172,72 144,140 132,205', 22)}${limb('268,72 296,140 308,205', 22)}${limb('198,236 194,320 192,405', 34)}${limb('242,236 246,320 248,405', 34)}
      <path d="M178 66 C200 58 240 58 262 66 L266 130 L254 190 L258 238 L182 238 L186 190 L174 130 Z" fill="var(--line,#d9d6e6)"/><rect x="212" y="46" width="16" height="16" rx="6" fill="var(--line,#d9d6e6)"/><circle cx="220" cy="28" r="19" fill="var(--line,#d9d6e6)"/></g>${t}</svg>`;
  }
  // faixas de referência (Heyward & Stolarczyk / OMS) — orientação geral, não é diagnóstico
  const RCQ = { M: [[.83, .88, .94], [.84, .91, .96], [.88, .95, 1], [.9, .96, 1.02], [.91, .98, 1.03]], F: [[.71, .77, .82], [.72, .78, .84], [.73, .79, .87], [.74, .81, .88], [.76, .83, .9]] };
  function riscos(a, idade) {
    const m = (a && a.medidas) || {}, sexo = a && a.sexo === 'F' ? 'F' : 'M', out = [];
    const ab = n(m.abdomen) != null ? n(m.abdomen) : n(m.cintura);
    if (ab != null) { const lo = sexo === 'F' ? 80 : 94, hi = sexo === 'F' ? 88 : 102; const c = ab < lo ? ['Baixo', 'ok'] : ab < hi ? ['Aumentado', 'aviso'] : ['Muito aumentado', 'up'];
      out.push({ t: 'Circunferência abdominal', v: f(ab) + ' cm', c: c[0], cl: c[1], ref: `Baixo < ${lo} cm · Aumentado ${lo}–${hi - 1} cm · Muito aumentado ≥ ${hi} cm` }); }
    const ci = n(m.cintura), qu = n(m.quadril);
    if (ci != null && qu) { const r = ci / qu, i = idade == null ? 2 : Math.max(0, Math.min(4, Math.floor(idade / 10) - 2)), [a1, a2, a3] = RCQ[sexo][i];
      const c = r < a1 ? ['Baixo', 'ok'] : r <= a2 ? ['Moderado', 'ok'] : r <= a3 ? ['Alto', 'aviso'] : ['Muito alto', 'up'];
      out.push({ t: 'Relação cintura/quadril', v: r.toFixed(2).replace('.', ','), c: c[0], cl: c[1], ref: `Para a sua faixa de idade: baixo < ${String(a1).replace('.', ',')} · moderado até ${String(a2).replace('.', ',')} · alto até ${String(a3).replace('.', ',')} · acima disso, muito alto` }); }
    return out;
  }
  function riscosHtml(a, idade) {
    const r = riscos(a, idade); if (!r.length) return '';
    return r.map(x => `<div style="margin:8px 0"><div class="muted">${esc(x.t)}</div><div><b style="font-size:1.4rem">${esc(x.v)}</b> <span class="pill ${x.cl === 'ok' ? 'on' : x.cl}">${esc(x.c)}</span></div><div class="muted" style="font-size:.8rem">${esc(x.ref)}</div></div>`).join('') + '<p class="muted" style="font-size:.8rem">Faixas de referência gerais, não são diagnóstico.</p>';
  }
  window.Corpo = { MEDIDAS, svg, riscos, riscosHtml };
})();
