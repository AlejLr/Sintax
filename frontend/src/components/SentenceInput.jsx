import { useState } from "react";

const EJEMPLOS = [
  "El perro negro ladra fuerte en el jardín.",
  "María le dio un libro a su hermano.",
  "Los estudiantes que estudian mucho aprueban.",
  "El cielo está muy azul hoy.",
  "Se venden pisos en el centro.",
];

const MAX_PALABRAS = 25;

export default function SentenceInput({ onAnalizar, loading, slowLoad, error }) {
  const [texto, setTexto] = useState("");

  const palabras     = texto.trim() ? texto.trim().split(/\s+/).length : 0;
  const demasiadoLarga = palabras > MAX_PALABRAS;
  const advertencia   = palabras >= 20 && !demasiadoLarga;

  function handleSubmit(e) {
    e.preventDefault();
    if (texto.trim() && !demasiadoLarga) onAnalizar(texto.trim());
  }

  return (
    <main style={s.main}>
      <h1 style={s.titulo}>¿Qué oración quieres analizar?</h1>
      <p style={s.subtitulo}>
        Escribe una oración y practica el análisis sintáctico paso a paso.
      </p>

      <form onSubmit={handleSubmit} style={s.card}>
        <textarea
          style={{
            ...s.textarea,
            borderColor: demasiadoLarga ? "#EF4444" : advertencia ? "#F59E0B" : "#E2E8F0",
          }}
          placeholder="Escribe aquí tu oración en español…"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={300}
          rows={3}
          aria-label="Oración para analizar"
          onFocus={(e) => {
            if (!demasiadoLarga && !advertencia)
              e.target.style.borderColor = "#6366F1";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = demasiadoLarga
              ? "#EF4444"
              : advertencia ? "#F59E0B" : "#E2E8F0";
          }}
        />

        {demasiadoLarga && (
          <p style={s.errorMsg}>
            La oración tiene {palabras} palabras. El analizador funciona mejor con oraciones de hasta {MAX_PALABRAS} palabras.
          </p>
        )}
        {advertencia && !demasiadoLarga && (
          <p style={s.warnMsg}>
            Oración larga ({palabras} palabras). El análisis puede ser menos preciso.
          </p>
        )}
        {error && <p style={s.errorMsg}>{error}</p>}

        <div style={s.row}>
          <button
            type="submit"
            style={s.btn(!texto.trim() || loading || demasiadoLarga)}
            disabled={!texto.trim() || loading || demasiadoLarga}
          >
            {loading
            ? slowLoad ? "Iniciando servidor…" : "Analizando…"
            : "Empezar ejercicio →"}
          </button>
          <span style={{ ...s.chars, color: demasiadoLarga ? "#EF4444" : advertencia ? "#F59E0B" : "#94A3B8" }}>
            {palabras}/{MAX_PALABRAS} palabras
          </span>
        </div>
      </form>

      <p style={s.ejemplosLabel}>O prueba con un ejemplo:</p>
      <div style={s.chips}>
        {EJEMPLOS.map((ej) => (
          <button
            key={ej}
            style={s.chip}
            type="button"
            onClick={() => { setTexto(ej); onAnalizar(ej); }}
          >
            {ej}
          </button>
        ))}
      </div>
    </main>
  );
}

const s = {
  main: {
    maxWidth: "640px",
    margin: "0 auto",
    padding: "64px 16px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  titulo: {
    fontSize: "28px",
    fontWeight: 800,
    color: "#1E293B",
    letterSpacing: "-.02em",
  },
  subtitulo: { fontSize: "16px", color: "#64748B" },
  card: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    background: "#fff",
    borderRadius: "16px",
    padding: "20px",
    boxShadow: "0 2px 12px rgba(0,0,0,.08)",
  },
  textarea: {
    width: "100%",
    border: "2px solid #E2E8F0",
    borderRadius: "10px",
    padding: "12px 14px",
    fontSize: "17px",
    fontFamily: "inherit",
    resize: "vertical",
    outline: "none",
    transition: "border-color .15s",
    lineHeight: 1.6,
    color: "#1E293B",
  },
  errorMsg: {
    color: "#DC2626",
    fontSize: "14px",
    background: "#FEE2E2",
    borderRadius: "8px",
    padding: "8px 12px",
  },
  warnMsg: {
    color: "#92400E",
    fontSize: "14px",
    background: "#FEF3C7",
    borderRadius: "8px",
    padding: "8px 12px",
  },
  row: { display: "flex", alignItems: "center", gap: "12px" },
  btn: (disabled) => ({
    padding: "11px 28px",
    borderRadius: "10px",
    border: "none",
    background: disabled ? "#E2E8F0" : "#6366F1",
    color: disabled ? "#94A3B8" : "#fff",
    fontSize: "15px",
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "background .15s",
  }),
  chars: { fontSize: "12px", color: "#94A3B8", marginLeft: "auto" },
  ejemplosLabel: { fontSize: "13px", color: "#94A3B8", fontWeight: 500 },
  chips: { display: "flex", flexWrap: "wrap", gap: "8px" },
  chip: {
    padding: "6px 14px",
    borderRadius: "20px",
    border: "1px solid #E2E8F0",
    background: "#F8FAFC",
    fontSize: "13px",
    color: "#475569",
    cursor: "pointer",
    textAlign: "left",
    transition: "border-color .12s",
  },
};
