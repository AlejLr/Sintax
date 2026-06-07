import React from "react";

// ── Opciones disponibles ────────────────────────────────────────────────────

const CATEGORIAS = [
  { value: "sustantivo",              color: "#3B82F6" },
  { value: "nombre propio",           color: "#1D4ED8" },
  { value: "verbo",                   color: "#8B5CF6" },
  { value: "verbo auxiliar",          color: "#A78BFA" },
  { value: "adjetivo",                color: "#10B981" },
  { value: "adverbio",                color: "#EF4444" },
  { value: "pronombre",               color: "#F59E0B" },
  { value: "determinante",            color: "#64748B" },
  { value: "preposición",             color: "#94A3B8" },
  { value: "conjunción coordinante",  color: "#6B7280" },
  { value: "conjunción subordinante", color: "#6B7280" },
  { value: "numeral",                 color: "#14B8A6" },
  { value: "interjección",            color: "#EC4899" },
];

const FUNCIONES_BASE = [
  { value: "Sujeto",           color: "#3B82F6" },
  { value: "Predicado verbal", color: "#8B5CF6" },
  { value: "Predicado nominal",color: "#A78BFA" },
  { value: "CD",               color: "#10B981" },
  { value: "CI",               color: "#F59E0B" },
  { value: "CC",               color: "#EF4444" },
  { value: "CRV",              color: "#EC4899" },
  { value: "C. Predicativo",   color: "#14B8A6" },
  { value: "Atributo",         color: "#14B8A6" },
  { value: "C. Agente",        color: "#F97316" },
  { value: "CN",               color: "#6B7280" },
  { value: "Aposición",        color: "#6B7280" },
];

const FUNCIONES_AVANZADAS = [
  { value: "Subordinada sustantiva",  color: "#10B981" },
  { value: "Subordinada adjetiva",    color: "#84CC16" },
  { value: "Subordinada adverbial",   color: "#EF4444" },
  { value: "Oración coordinada",      color: "#F59E0B" },
];

const PROPOSICION_TIPOS = [
  { value: "Proposición principal",  color: "#6366F1" },
  { value: "Coordinada copulativa",  color: "#F59E0B" },
  { value: "Coordinada adversativa", color: "#EF4444" },
  { value: "Coordinada disyuntiva",  color: "#10B981" },
  { value: "Coordinada explicativa", color: "#6B7280" },
  { value: "Oración yuxtapuesta",    color: "#94A3B8" },
  { value: "Subordinada sustantiva", color: "#10B981" },
  { value: "Subordinada adjetiva",   color: "#84CC16" },
  { value: "Subordinada adverbial",  color: "#EF4444" },
];

function funcionesPorNivel(nivel) {
  if (nivel === "4eso" || nivel === "bachillerato") {
    return [...FUNCIONES_BASE, ...FUNCIONES_AVANZADAS];
  }
  return FUNCIONES_BASE;
}

// ── Componente ──────────────────────────────────────────────────────────────

export default function LabelPicker({ tipo, nivel, tokenTextos, onSeleccionar, onCerrar }) {
  const opciones = tipo === "categoria"   ? CATEGORIAS
                 : tipo === "proposicion" ? PROPOSICION_TIPOS
                 : funcionesPorNivel(nivel);
  const titulo   = tipo === "categoria"   ? "Categoría gramatical"
                 : tipo === "proposicion" ? "Tipo de proposición"
                 : "Función sintáctica";

  return (
    <div style={s.overlay} onClick={onCerrar}>
      <div style={s.panel} onClick={(e) => e.stopPropagation()}>
        <div style={s.header}>
          <span style={s.titulo}>{titulo}</span>
          {tokenTextos && (
            <span style={s.tokens}>
              "{tokenTextos.join(" ")}"
            </span>
          )}
          <button style={s.cerrar} onClick={onCerrar} aria-label="Cerrar">✕</button>
        </div>

        <div style={s.grid}>
          {opciones.map((op) => (
            <button
              key={op.value}
              style={s.opcion(op.color)}
              onClick={() => onSeleccionar(op.value)}
            >
              <span style={s.dot(op.color)} />
              {op.value}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 200,
  },
  panel: {
    background: "#fff",
    borderRadius: "16px",
    padding: "20px",
    width: "min(520px, 92vw)",
    maxHeight: "80vh",
    overflowY: "auto",
    boxShadow: "0 20px 60px rgba(0,0,0,.18)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "16px",
    flexWrap: "wrap",
  },
  titulo: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#1E293B",
    flexShrink: 0,
  },
  tokens: {
    fontSize: "14px",
    color: "#6366F1",
    fontWeight: 600,
    flex: 1,
  },
  cerrar: {
    marginLeft: "auto",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "18px",
    color: "#94A3B8",
    padding: "4px",
    lineHeight: 1,
    flexShrink: 0,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
    gap: "8px",
  },
  opcion: (color) => ({
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 14px",
    borderRadius: "8px",
    border: `1.5px solid ${color}30`,
    background: `${color}10`,
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 600,
    color: "#1E293B",
    textAlign: "left",
    transition: "all .12s",
  }),
  dot: (color) => ({
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: color,
    flexShrink: 0,
  }),
};
