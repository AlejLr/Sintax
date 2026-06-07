import React, { useState } from "react";
import SyntaxDiagram from "./SyntaxDiagram.jsx";
import LabelPicker from "./LabelPicker.jsx";

let _grupoId = 0;
let _propId  = 0;

const CON_PROPOSICIONES = new Set(["4eso", "bachillerato"]);

export default function ExerciseView({ tokens, oracion, nivel, onCorregir, onVolver }) {
  const [modo,          setModo]          = useState("categorias");
  const [categorias,    setCategorias]    = useState({});
  const [seleccion,     setSeleccion]     = useState(new Set());
  const [grupos,        setGrupos]        = useState([]);
  const [proposiciones, setProposiciones] = useState([]);

  // picker: null
  //   | { tipo: "categoria",        tokenId }
  //   | { tipo: "funcion",          tokenIds, textos }
  //   | { tipo: "nucleo",           tokenIds, textos, funcion }
  //   | { tipo: "proposicion_tipo", tokenIds, textos }
  const [picker, setPicker] = useState(null);

  const mostrarProp = CON_PROPOSICIONES.has(nivel);

  // ── Clic en token ─────────────────────────────────────────────────────────
  function handleTokenClick(tokenId) {
    if (modo === "categorias") {
      setPicker({ tipo: "categoria", tokenId });
      return;
    }
    setSeleccion((prev) => {
      const next = new Set(prev);
      next.has(tokenId) ? next.delete(tokenId) : next.add(tokenId);
      return next;
    });
  }

  // ── Categoría ─────────────────────────────────────────────────────────────
  function handleCategoria(valor) {
    setCategorias((prev) => ({ ...prev, [picker.tokenId]: valor }));
    setPicker(null);
  }

  // ── Grupos ────────────────────────────────────────────────────────────────
  function handleCrearGrupo() {
    if (seleccion.size === 0) return;
    const tokenIds = [...seleccion].sort((a, b) => a - b);
    const textos   = tokenIds.map((id) => tokens.find((t) => t.id === id)?.texto ?? "");
    setPicker({ tipo: "funcion", tokenIds, textos });
  }

  function handleFuncion(valor) {
    const { tokenIds, textos } = picker;
    setPicker({ tipo: "nucleo", tokenIds, textos, funcion: valor });
  }

  function handleNucleo(nucleoId) {
    const { tokenIds, funcion } = picker;
    setGrupos((prev) => [...prev, { id: ++_grupoId, tokenIds, funcion, nucleoId }]);
    setSeleccion(new Set());
    setPicker(null);
  }

  function eliminarUltimoGrupo() {
    setGrupos((prev) => prev.slice(0, -1));
  }

  // ── Proposiciones ─────────────────────────────────────────────────────────
  function handleCrearProposicion() {
    if (seleccion.size === 0) return;
    const tokenIds = [...seleccion].sort((a, b) => a - b);
    const textos   = tokenIds.map((id) => tokens.find((t) => t.id === id)?.texto ?? "");
    setPicker({ tipo: "proposicion_tipo", tokenIds, textos });
  }

  function handleProposicionTipo(valor) {
    const { tokenIds } = picker;
    setProposiciones((prev) => [...prev, { id: ++_propId, tokenIds, tipo: valor }]);
    setSeleccion(new Set());
    setPicker(null);
  }

  function eliminarUltimaProposicion() {
    setProposiciones((prev) => prev.slice(0, -1));
  }

  // ── Corregir ──────────────────────────────────────────────────────────────
  function handleCorregir() {
    onCorregir({ categorias, grupos, proposiciones });
  }

  const sinPunct      = tokens.filter((t) => !t.es_puntuacion);
  const catAsignadas  = Object.keys(categorias).length;
  const totalPalabras = sinPunct.length;

  return (
    <main style={s.main}>

      {/* Barra superior */}
      <div style={s.topBar}>
        <button style={s.btnOutline} onClick={onVolver}>← Volver</button>
        <span style={s.oracion} className="topbar-oracion">"{oracion}"</span>
        <button style={s.btnPrimary} onClick={handleCorregir}>Corregir →</button>
      </div>

      {/* Panel central */}
      <div style={s.diagramCard} className="diagram-card">

        {/* Controles del modo */}
        <div style={s.modoBar}>
          <div style={s.modoToggle}>
            <button
              style={s.modoBtn(modo === "categorias")}
              onClick={() => { setModo("categorias"); setSeleccion(new Set()); }}
            >
              1 · Categorías
            </button>
            <button
              style={s.modoBtn(modo === "grupos")}
              onClick={() => setModo("grupos")}
            >
              2 · Grupos
            </button>
            {mostrarProp && (
              <button
                style={s.modoBtn(modo === "proposiciones")}
                onClick={() => setModo("proposiciones")}
              >
                3 · Proposiciones
              </button>
            )}
          </div>

          <span style={s.progreso}>
            {catAsignadas}/{totalPalabras} palabras
            {" · "}{grupos.length} grupo{grupos.length !== 1 ? "s" : ""}
            {mostrarProp && ` · ${proposiciones.length} proposición${proposiciones.length !== 1 ? "es" : ""}`}
          </span>

          {modo === "grupos" && grupos.length > 0 && (
            <button style={s.btnDanger} onClick={eliminarUltimoGrupo}>
              Deshacer último grupo
            </button>
          )}
          {modo === "proposiciones" && proposiciones.length > 0 && (
            <button style={s.btnDanger} onClick={eliminarUltimaProposicion}>
              Deshacer última proposición
            </button>
          )}
        </div>

        {/* Instrucción contextual */}
        <p style={s.instruccion}>
          {modo === "categorias"
            ? "Haz clic en una palabra para asignar su categoría gramatical."
            : modo === "grupos"
              ? seleccion.size === 0
                ? "Selecciona las palabras que forman un grupo y pulsa «Crear grupo»."
                : `${seleccion.size} palabra${seleccion.size > 1 ? "s" : ""} seleccionada${seleccion.size > 1 ? "s" : ""}. Añade más o crea el grupo.`
              : seleccion.size === 0
                ? "Selecciona las palabras de cada proposición y pulsa «Crear proposición». Identifica también la proposición principal."
                : `${seleccion.size} palabra${seleccion.size > 1 ? "s" : ""} seleccionada${seleccion.size > 1 ? "s" : ""}. Añade más o crea la proposición.`
          }
        </p>

        {/* Diagrama sintáctico */}
        <SyntaxDiagram
          tokens={tokens}
          categorias={categorias}
          grupos={grupos}
          seleccion={seleccion}
          modo={modo}
          onTokenClick={handleTokenClick}
        />

        {/* Botón crear grupo */}
        {modo === "grupos" && seleccion.size > 0 && (
          <div style={{ textAlign: "center", marginTop: "12px" }}>
            <button style={s.btnPrimary} onClick={handleCrearGrupo}>
              + Crear grupo con {seleccion.size} palabra{seleccion.size > 1 ? "s" : ""}
            </button>
          </div>
        )}

        {/* Botón crear proposición */}
        {modo === "proposiciones" && seleccion.size > 0 && (
          <div style={{ textAlign: "center", marginTop: "12px" }}>
            <button style={s.btnPrimary} onClick={handleCrearProposicion}>
              + Crear proposición con {seleccion.size} palabra{seleccion.size > 1 ? "s" : ""}
            </button>
          </div>
        )}

        {/* Disclaimer */}
        <p style={s.disclaimer}>
          El análisis es generado automáticamente por un modelo estadístico y puede contener errores.
          Úsalo como apoyo, no como referencia definitiva.
        </p>
      </div>

      {/* ── Pickers ─────────────────────────────────────────────────────── */}

      {picker?.tipo === "categoria" && (
        <LabelPicker
          tipo="categoria"
          nivel={nivel}
          tokenTextos={[tokens.find((t) => t.id === picker.tokenId)?.texto ?? ""]}
          onSeleccionar={handleCategoria}
          onCerrar={() => setPicker(null)}
        />
      )}

      {picker?.tipo === "funcion" && (
        <LabelPicker
          tipo="funcion"
          nivel={nivel}
          tokenTextos={picker.textos}
          onSeleccionar={handleFuncion}
          onCerrar={() => setPicker(null)}
        />
      )}

      {picker?.tipo === "proposicion_tipo" && (
        <LabelPicker
          tipo="proposicion"
          nivel={nivel}
          tokenTextos={picker.textos}
          onSeleccionar={handleProposicionTipo}
          onCerrar={() => setPicker(null)}
        />
      )}

      {picker?.tipo === "nucleo" && (
        <div style={s.overlay} onClick={() => setPicker(null)}>
          <div style={s.nucleoPanel} onClick={(e) => e.stopPropagation()}>
            <p style={s.nucleoTitulo}>
              ¿Cuál es el <strong>núcleo</strong> del <em>{picker.funcion}</em>?
            </p>
            <div style={s.nucleoOpciones}>
              {picker.tokenIds.map((id) => {
                const t = tokens.find((tk) => tk.id === id);
                if (!t) return null;
                return (
                  <button key={id} style={s.nucleoBtn} onClick={() => handleNucleo(id)}>
                    {t.texto}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ── Estilos ──────────────────────────────────────────────────────────────────
const s = {
  main: {
    flex: 1,
    padding: "24px 16px 64px",
    maxWidth: "1000px",
    margin: "0 auto",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
  },
  oracion: {
    flex: 1,
    fontSize: "17px",
    fontWeight: 600,
    color: "#475569",
    fontStyle: "italic",
  },
  diagramCard: {
    background: "#fff",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 2px 12px rgba(0,0,0,.08)",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  modoBar: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  modoToggle: {
    display: "flex",
    background: "#F1F5F9",
    borderRadius: "8px",
    padding: "3px",
    gap: "2px",
  },
  modoBtn: (active) => ({
    padding: "7px 18px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: active ? 700 : 500,
    background: active ? "#fff" : "transparent",
    color: active ? "#6366F1" : "#64748B",
    boxShadow: active ? "0 1px 3px rgba(0,0,0,.10)" : "none",
    transition: "all .12s",
  }),
  progreso: {
    fontSize: "13px",
    color: "#94A3B8",
    marginLeft: "auto",
  },
  instruccion: {
    fontSize: "13px",
    color: "#64748B",
    margin: 0,
  },
  btnPrimary: {
    background: "#6366F1",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "10px 24px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    flexShrink: 0,
  },
  btnOutline: {
    background: "#fff",
    color: "#64748B",
    border: "1px solid #E2E8F0",
    borderRadius: "8px",
    padding: "8px 14px",
    fontSize: "14px",
    cursor: "pointer",
    flexShrink: 0,
  },
  btnDanger: {
    background: "none",
    color: "#EF4444",
    border: "1px solid #FECACA",
    borderRadius: "8px",
    padding: "6px 12px",
    fontSize: "12px",
    cursor: "pointer",
    flexShrink: 0,
  },
  disclaimer: {
    fontSize: "11px",
    color: "#94A3B8",
    textAlign: "center",
    marginTop: "4px",
    lineHeight: 1.5,
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 200,
  },
  nucleoPanel: {
    background: "#fff",
    borderRadius: "16px",
    padding: "24px",
    width: "min(460px, 92vw)",
    boxShadow: "0 20px 60px rgba(0,0,0,.18)",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  nucleoTitulo: {
    fontSize: "16px",
    color: "#1E293B",
    lineHeight: 1.5,
    margin: 0,
  },
  nucleoOpciones: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  nucleoBtn: {
    padding: "10px 20px",
    borderRadius: "10px",
    border: "2px solid #6366F1",
    background: "#EEF2FF",
    color: "#6366F1",
    fontSize: "16px",
    fontWeight: 700,
    cursor: "pointer",
  },
};
