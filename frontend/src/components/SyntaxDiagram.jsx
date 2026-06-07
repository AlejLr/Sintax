/**
 * SyntaxDiagram — layout (top → bottom):
 *
 *   El   perro  ladra   en   el  jardín    ← words (HTML)
 *   det    N      V      E   det   N       ← category abbreviations
 *
 *   ──────────   ──────────────────────    ← intermediate groups (CD, CI, CC…)
 *       CD               CC                  packed: non-overlapping = same row
 *
 *   ──────────   ─────────────────────────  ← Sujeto + Predicado always last row
 *    Sujeto              Predicado
 *
 * Rules:
 *   - No vertical tick lines, only the horizontal line + label below it
 *   - Sujeto/Predicado in the very last row always
 *   - Other groups packed into minimum rows (interval coloring algorithm)
 *   - Layout recalculates on every render (cheap: O(n²), n ≤ ~10)
 */

import { useRef, useState, useEffect, useCallback } from "react";

// ── Constants ────────────────────────────────────────────────────────────────

const ROW_H       = 34;   // px per bracket row (line + label + padding)
const LINE_Y_OFF  = 10;   // px from top of row to the horizontal line
const LABEL_Y_OFF = 24;   // px from top of row to label baseline

const FUNCIONES_PRINCIPALES = new Set([
  "Sujeto", "Predicado verbal", "Predicado nominal", "Sujeto paciente",
]);

// ── Category abbreviations (Spanish school convention) ───────────────────────

const ABREV = {
  "sustantivo":              "N",
  "nombre propio":           "NP",
  "verbo":                   "V",
  "verbo auxiliar":          "Vaux",
  "adjetivo":                "Adj",
  "adverbio":                "Adv",
  "pronombre":               "Pron",
  "determinante":            "det",
  "preposición":             "E",
  "conjunción coordinante":  "Conj",
  "conjunción subordinante": "Conj",
  "numeral":                 "Núm",
  "interjección":            "Interj",
};

// ── Colors ───────────────────────────────────────────────────────────────────

const FUNCION_COLOR = {
  "Sujeto":                  "#3B82F6",
  "Predicado verbal":        "#8B5CF6",
  "Predicado nominal":       "#A78BFA",
  "CD":                      "#10B981",
  "CI":                      "#F59E0B",
  "CC":                      "#EF4444",
  "CRV":                     "#EC4899",
  "C. Predicativo":          "#14B8A6",
  "Atributo":                "#14B8A6",
  "C. Agente":               "#F97316",
  "CN":                      "#6B7280",
  "Aposición":               "#6B7280",
  "Subordinada sustantiva":  "#10B981",
  "Subordinada adjetiva":    "#84CC16",
  "Subordinada adverbial":   "#EF4444",
  "Oración coordinada":      "#F59E0B",
};

const CAT_COLOR = {
  "sustantivo":              "#3B82F6",
  "nombre propio":           "#1D4ED8",
  "verbo":                   "#8B5CF6",
  "verbo auxiliar":          "#A78BFA",
  "adjetivo":                "#10B981",
  "adverbio":                "#EF4444",
  "pronombre":               "#F59E0B",
  "determinante":            "#64748B",
  "preposición":             "#94A3B8",
  "conjunción coordinante":  "#6B7280",
  "conjunción subordinante": "#6B7280",
  "numeral":                 "#14B8A6",
  "interjección":            "#EC4899",
};

function getFuncionColor(f) { return FUNCION_COLOR[f] ?? "#9CA3AF"; }

// ── Interval-packing layout algorithm ───────────────────────────────────────
// Returns each group annotated with a `rowIdx`.
// Sujeto / Predicado always end up in the last row (together).
// All other groups are packed greedily into as few rows as possible.

function packGroups(grupos, tokens) {
  const getRange = (g) => {
    const ids = g.tokenIds.filter((id) => {
      const t = tokens.find((tk) => tk.id === id);
      return t && !t.es_puntuacion;
    });
    if (ids.length === 0) return null;
    return [Math.min(...ids), Math.max(...ids)];
  };

  const principales = grupos.filter((g) => FUNCIONES_PRINCIPALES.has(g.funcion));
  const intermedios = grupos.filter((g) => !FUNCIONES_PRINCIPALES.has(g.funcion));

  // Sort intermedios by start position for a better packing result
  const sorted = [...intermedios]
    .map((g) => ({ g, range: getRange(g) }))
    .filter((x) => x.range !== null)
    .sort((a, b) => a.range[0] - b.range[0]);

  // Greedy interval coloring
  const rows = []; // rows[i] = [{ g, range }]

  for (const { g, range } of sorted) {
    let placed = false;
    for (const row of rows) {
      const overlaps = row.some(
        ({ range: r }) => r[0] <= range[1] && range[0] <= r[1]
      );
      if (!overlaps) {
        row.push({ g, range });
        placed = true;
        break;
      }
    }
    if (!placed) rows.push([{ g, range }]);
  }

  // Build result: annotate each group with rowIdx
  const result = [];

  rows.forEach((row, rowIdx) => {
    row.forEach(({ g }) => result.push({ ...g, rowIdx }));
  });

  // Principales go after intermedios, packed among themselves
  // (handles duplicate Sujeto/Predicado without crashing or overwriting)
  const principalesRows = [];
  const sortedPrincipales = [...principales]
    .map((g) => ({ g, range: getRange(g) }))
    .filter((x) => x.range !== null)
    .sort((a, b) => a.range[0] - b.range[0]);

  for (const { g, range } of sortedPrincipales) {
    let placed = false;
    for (const row of principalesRows) {
      const overlaps = row.some(
        ({ range: r }) => r[0] <= range[1] && range[0] <= r[1]
      );
      if (!overlaps) {
        row.push({ g, range });
        placed = true;
        break;
      }
    }
    if (!placed) principalesRows.push([{ g, range }]);
  }

  const baseRow = rows.length;
  principalesRows.forEach((row, rowIdx) => {
    row.forEach(({ g }) => result.push({ ...g, rowIdx: baseRow + rowIdx }));
  });

  return result;
}

// ── Hook: measure token positions ────────────────────────────────────────────

function useTokenPositions(tokenRefs, containerRef, deps) {
  const [pos, setPos] = useState({});

  const measure = useCallback(() => {
    if (!containerRef.current) return;
    const cRect = containerRef.current.getBoundingClientRect();
    const next  = {};
    for (const [id, el] of Object.entries(tokenRefs.current)) {
      if (!el) continue;
      const r    = el.getBoundingClientRect();
      next[id]   = {
        left:  r.left  - cRect.left,
        right: r.right - cRect.left,
        cx:    (r.left + r.right) / 2 - cRect.left,
      };
    }
    setPos(next);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, measure]);

  useEffect(() => {
    const obs = new ResizeObserver(measure);
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [measure, containerRef]);

  return pos;
}

// ── Single bracket (horizontal line + label, no vertical ticks) ───────────────

function Bracket({ grupo, pos, tokens, rowIdx }) {
  const nonPunct = grupo.tokenIds
    .filter((id) => { const t = tokens.find((tk) => tk.id === id); return t && !t.es_puntuacion && pos[id]; })
    .sort((a, b) => a - b);

  if (nonPunct.length === 0) return null;

  const p1    = pos[nonPunct[0]];
  const p2    = pos[nonPunct[nonPunct.length - 1]];
  if (!p1 || !p2) return null;

  const color  = FUNCION_COLOR[grupo.funcion] ?? "#9CA3AF";
  const x1     = p1.left  + 2;
  const x2     = p2.right - 2;
  const cx     = (x1 + x2) / 2;
  const yBase  = rowIdx * ROW_H;
  const lineY  = yBase + LINE_Y_OFF;
  const labelY = yBase + LABEL_Y_OFF;

  const nucleo = tokens.find((t) => t.id === grupo.nucleoId);
  const label  = nucleo
    ? `${grupo.funcion} · núcleo: ${nucleo.texto}`
    : grupo.funcion;

  return (
    <g>
      <line
        x1={x1} y1={lineY}
        x2={x2} y2={lineY}
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <text
        x={cx}
        y={labelY}
        textAnchor="middle"
        fontSize={11}
        fontWeight="700"
        fill={color}
        fontFamily="Inter, system-ui, sans-serif"
      >
        {label}
      </text>
    </g>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SyntaxDiagram({
  tokens,
  categorias,       // { [tokenId]: string }
  grupos,           // [{ id, tokenIds, funcion, nucleoId }]
  seleccion,        // Set<number>
  onTokenClick,
  readOnly = false,
}) {
  const containerRef = useRef(null);
  const tokenRefs    = useRef({});
  const [svgW, setSvgW] = useState(0);

  const pos = useTokenPositions(
    tokenRefs, containerRef,
    [tokens, grupos, categorias]
  );

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(() => setSvgW(containerRef.current.offsetWidth));
    obs.observe(containerRef.current);
    setSvgW(containerRef.current.offsetWidth);
    return () => obs.disconnect();
  }, []);

  // Pack groups into rows; recalculates whenever grupos changes
  const gruposConFila = packGroups(grupos, tokens);
  const numRows       = gruposConFila.length > 0
    ? Math.max(...gruposConFila.map((g) => g.rowIdx)) + 1
    : 0;
  const svgH = numRows * ROW_H + 8;

  return (
    <div ref={containerRef} style={{ overflowX: "auto" }}>

      {/* ── Token row ── */}
      <div style={s.tokenRow}>
        {tokens.map((t) => {
          if (t.es_puntuacion) {
            return <span key={t.id} style={s.punct}>{t.texto}</span>;
          }

          const cat   = categorias[t.id] ?? null;
          const abrev = cat ? (ABREV[cat] ?? cat.slice(0, 4)) : null;
          const color = cat ? (CAT_COLOR[cat] ?? "#9CA3AF") : null;
          const sel   = seleccion instanceof Set && seleccion.has(t.id);
          const enG   = grupos.some((g) => g.tokenIds.includes(t.id));

          return (
            <div
              key={t.id}
              ref={(el) => { tokenRefs.current[t.id] = el; }}
              style={s.tokenWrap}
            >
              <div
                role={readOnly ? undefined : "button"}
                tabIndex={readOnly ? undefined : 0}
                aria-label={`${t.texto}${cat ? `, ${cat}` : ""}`}
                style={s.word(color, sel, enG, readOnly)}
                onClick={() => !readOnly && onTokenClick(t.id)}
                onKeyDown={(e) => !readOnly && e.key === "Enter" && onTokenClick(t.id)}
              >
                {t.texto}
              </div>
              <span style={s.catLabel(color)}>
                {abrev ?? (readOnly ? "?" : "—")}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── SVG brackets (below sentence) ── */}
      {numRows > 0 && (
        <svg
          width={svgW}
          height={svgH}
          style={{ display: "block", overflow: "visible" }}
          aria-hidden="true"
        >
          {gruposConFila.map((g) => (
            <Bracket
              key={g.id}
              grupo={g}
              pos={pos}
              tokens={tokens}
              rowIdx={g.rowIdx}
            />
          ))}
        </svg>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  tokenRow: {
    display:    "flex",
    flexWrap:   "nowrap",
    alignItems: "flex-start",
    gap:        "12px",
    padding:    "8px",
  },
  tokenWrap: {
    display:       "flex",
    flexDirection: "column",
    alignItems:    "center",
    gap:           "5px",
  },
  word: (color, sel, enG, readOnly) => ({
    fontSize:     "22px",
    fontWeight:   700,
    color:        color ?? "#1E293B",
    padding:      "4px 6px",
    borderRadius: "6px",
    cursor:       readOnly ? "default" : "pointer",
    userSelect:   "none",
    background:   sel  ? "#EEF2FF"
                : enG  ? (color ? `${color}14` : "#F8FAFC")
                       : "transparent",
    outline:      sel ? "2px solid #6366F1"
                : enG && color ? `2px solid ${color}40`
                : "2px solid transparent",
    transition:   "all .12s",
    whiteSpace:   "nowrap",
  }),
  catLabel: (color) => ({
    fontSize:   "12px",
    fontWeight: 600,
    color:      color ?? "#CBD5E1",
    fontStyle:  color ? "normal" : "italic",
    lineHeight: 1,
  }),
  punct: {
    fontSize:   "22px",
    fontWeight: 700,
    color:      "#CBD5E1",
    paddingTop: "4px",
    userSelect: "none",
    alignSelf:  "flex-start",
  },
};
