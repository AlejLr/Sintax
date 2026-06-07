import SyntaxDiagram from "./SyntaxDiagram.jsx";

// ── Corrección de categorías ─────────────────────────────────────────────────
function corregirCategorias(tokens, categorias) {
  return tokens
    .filter((t) => !t.es_puntuacion)
    .map((t) => {
      const dada     = categorias[t.id];
      const correcta = t.categoria;
      return {
        token: t,
        dada,
        correcta,
        estado: !dada ? "omitida" : dada === correcta ? "correcta" : "incorrecta",
      };
    });
}

// ── Corrección de grupos ─────────────────────────────────────────────────────
function corregirGrupos(gruposAPI, gruposAlumno) {
  return gruposAPI.map((gc) => {
      const setCorrecto = new Set(gc.token_ids);
      const candidato = gruposAlumno
        .map((ga) => ({
          ga,
          solapamiento: ga.tokenIds.filter((id) => setCorrecto.has(id)).length,
        }))
        .sort((a, b) => b.solapamiento - a.solapamiento)[0];

      if (!candidato || candidato.solapamiento === 0) {
        return { gc, ga: null, estado: "omitido" };
      }

      const { ga } = candidato;
      const funcionOk = ga.funcion   === gc.funcion;
      const tokensOk  = [...ga.tokenIds].sort().join(",") === [...gc.token_ids].sort().join(",");
      const nucleoOk  = ga.nucleoId  === gc.nucleo_id;

      const estado = funcionOk && tokensOk && nucleoOk
        ? "correcto"
        : funcionOk
          ? "funcion_ok"
          : "incorrecto";

      return { gc, ga, estado, funcionOk, tokensOk, nucleoOk };
    });
}

// Convierte grupos de la API al formato que acepta SyntaxDiagram
function apiGruposADiagrama(grupos) {
  return grupos.map((g) => ({
    id:        g.id,
    tokenIds:  g.token_ids,
    funcion:   g.funcion,
    nucleoId:  g.nucleo_id,
  }));
}

// ── Corrección de proposiciones ──────────────────────────────────────────────
function corregirProposiciones(propAPI, propAlumno) {
  return propAPI.map((pa) => {
    const setCorrecto = new Set(pa.token_ids);
    const candidato = propAlumno
      .map((ga) => ({
        ga,
        solapamiento: ga.tokenIds.filter((id) => setCorrecto.has(id)).length,
      }))
      .sort((a, b) => b.solapamiento - a.solapamiento)[0];

    if (!candidato || candidato.solapamiento === 0) {
      return { pa, ga: null, estado: "omitida" };
    }

    const { ga } = candidato;
    const tipoOk   = ga.tipo === pa.tipo_es;
    const tokensOk = [...ga.tokenIds].sort().join(",") === [...pa.token_ids].sort().join(",");
    const estado   = tipoOk && tokensOk ? "correcta" : "incorrecta";

    return { pa, ga, estado, tipoOk, tokensOk };
  });
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function CorrectionView({ data, respuesta, nivel, onReintentar, onNuevaOracion }) {
  const { tokens, grupos: gruposAPI, proposiciones: propAPI = [], tipo_oracion } = data;
  const { categorias, grupos: gruposAlumno, proposiciones: propAlumno = [] }     = respuesta;

  const conProp = nivel === "4eso" || nivel === "bachillerato";

  const resultCats   = corregirCategorias(tokens, categorias);
  const resultGrupos = corregirGrupos(gruposAPI, gruposAlumno);
  const resultProps  = conProp ? corregirProposiciones(propAPI, propAlumno) : [];

  const bienCats    = resultCats.filter((r)   => r.estado === "correcta").length;
  const bienGrupos  = resultGrupos.filter((r) => r.estado === "correcto").length;
  const bienProps   = resultProps.filter((r)  => r.estado === "correcta").length;
  const total       = resultCats.length + resultGrupos.length + resultProps.length;
  const bien        = bienCats + bienGrupos + bienProps;
  const pct         = total > 0 ? Math.round((bien / total) * 100) : 0;

  // Categorías correctas (para el diagrama)
  const categoriasCorrectas = Object.fromEntries(
    tokens.filter((t) => !t.es_puntuacion).map((t) => [t.id, t.categoria])
  );

  const gruposDiagrama = apiGruposADiagrama(gruposAPI);

  return (
    <main style={s.main}>

      {/* Puntuación */}
      <div style={s.scoreCard} className="score-card">
        <div style={s.scoreNum(pct)} className="score-num">{pct}%</div>
        <div>
          <p style={s.scoreLabel}>
            {pct === 100 ? "¡Perfecto!" : pct >= 70 ? "¡Muy bien!" : "Sigue practicando"}
          </p>
          <p style={s.scoreDetail}>
            {bien}/{total} respuestas correctas · {tipo_oracion}
          </p>
        </div>
        <div style={s.scoreBtns}>
          <button style={s.btn("outline")} onClick={onReintentar}>Reintentar</button>
          <button style={s.btn("primary")} onClick={onNuevaOracion}>Nueva oración</button>
        </div>
      </div>

      {/* Análisis correcto — diagrama + lista de grupos */}
      <section style={s.card}>
        <h2 style={s.sectionTitle}>Análisis correcto</h2>
        <SyntaxDiagram
          tokens={tokens}
          categorias={categoriasCorrectas}
          grupos={gruposDiagrama}
          seleccion={new Set()}
          onTokenClick={() => {}}
          readOnly
        />

        {/* Lista textual de grupos — siempre visible */}
        {gruposAPI.length > 0 && (
          <div>
            <p style={s.subTitle}>Grupos sintácticos</p>
            <div style={s.grupList}>
              {gruposAPI.map((g) => {
                const textoG = g.token_ids
                  .map((id) => tokens.find((t) => t.id === id)?.texto ?? "")
                  .join(" ");
                const nucleo = tokens.find((t) => t.id === g.nucleo_id);
                return (
                  <div key={g.id} style={s.grupRow(g.color)}>
                    <strong style={{ color: g.color, fontSize: "12px", flexShrink: 0 }}>
                      {g.funcion}
                    </strong>
                    <span style={{ fontSize: "13px", color: "#475569" }}>
                      <em>"{textoG}"</em>
                      {nucleo ? (
                        <span style={{ color: "#94A3B8" }}> · núcleo: {nucleo.texto}</span>
                      ) : null}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {conProp && propAPI.length > 0 && (
          <div>
            <p style={s.subTitle}>Proposiciones</p>
            <div style={s.errorList}>
              {propAPI.map((p, i) => {
                const texto = p.token_ids
                  .map((id) => tokens.find((t) => t.id === id)?.texto ?? "")
                  .join(" ");
                return (
                  <div key={i} style={s.propRow}>
                    <strong style={{ color: "#6366F1", fontSize: "13px" }}>{p.tipo_es}</strong>
                    <span style={{ fontSize: "13px", color: "#475569" }}>
                      <em>"{texto}"</em>{p.nexo ? ` · nexo: ${p.nexo}` : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Detalle de errores */}
      {(resultCats.some((r) => r.estado !== "correcta") ||
        resultGrupos.some((r) => r.estado !== "correcto")) && (
        <section style={s.card}>
          <h2 style={s.sectionTitle}>Errores</h2>

          {/* Categorías incorrectas */}
          {resultCats.filter((r) => r.estado !== "correcta").length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <p style={s.subTitle}>Categorías gramaticales</p>
              <div style={s.errorList}>
                {resultCats
                  .filter((r) => r.estado !== "correcta")
                  .map(({ token, dada, correcta, estado }) => (
                    <div key={token.id} style={s.errorRow(estado)}>
                      <strong style={{ fontSize: "16px" }}>{token.texto}</strong>
                      <span>
                        {estado === "omitida"
                          ? <>No indicado → <b style={{ color: "#10B981" }}>{correcta}</b></>
                          : <><s style={{ color: "#EF4444" }}>{dada}</s>{" → "}<b style={{ color: "#10B981" }}>{correcta}</b></>
                        }
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Grupos incorrectos */}
          {resultGrupos.filter((r) => r.estado !== "correcto").length > 0 && (
            <div>
              <p style={s.subTitle}>Grupos sintácticos</p>
              <div style={s.errorList}>
                {resultGrupos
                  .filter((r) => r.estado !== "correcto")
                  .map(({ gc, ga, estado, funcionOk, tokensOk, nucleoOk }, i) => {
                    const textosCorrecto = gc.token_ids
                      .map((id) => tokens.find((t) => t.id === id)?.texto ?? "")
                      .join(" ");
                    const nucleoCorrecto = tokens.find((t) => t.id === gc.nucleo_id);
                    return (
                      <div key={i} style={s.errorRow(estado === "funcion_ok" ? "incorrecta" : estado)}>
                        <strong style={{ color: "#6366F1" }}>{gc.funcion}</strong>
                        <div style={{ fontSize: "13px", color: "#475569" }}>
                          <div>Correcto: <em>"{textosCorrecto}"</em>{nucleoCorrecto ? ` · núcleo: ${nucleoCorrecto.texto}` : ""}</div>
                          {ga && (
                            <div style={{ marginTop: "3px" }}>
                              Tu respuesta:{" "}
                              {!funcionOk && <span style={{ color: "#EF4444" }}>función incorrecta ({ga.funcion}) </span>}
                              {!tokensOk  && <span style={{ color: "#EF4444" }}>palabras incorrectas </span>}
                              {!nucleoOk  && <span style={{ color: "#EF4444" }}>núcleo incorrecto</span>}
                            </div>
                          )}
                          {!ga && <div style={{ color: "#94A3B8" }}>No creaste este grupo.</div>}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Proposiciones incorrectas (solo 4eso/bachillerato) */}
          {conProp && resultProps.filter((r) => r.estado !== "correcta").length > 0 && (
            <div>
              <p style={s.subTitle}>Proposiciones</p>
              <div style={s.errorList}>
                {resultProps
                  .filter((r) => r.estado !== "correcta")
                  .map(({ pa, ga, estado, tipoOk, tokensOk }, i) => {
                    const textosCorrecto = pa.token_ids
                      .map((id) => tokens.find((t) => t.id === id)?.texto ?? "")
                      .join(" ");
                    return (
                      <div key={i} style={s.errorRow(estado === "omitida" ? "omitido" : "incorrecta")}>
                        <strong style={{ color: "#6366F1" }}>{pa.tipo_es}</strong>
                        <div style={{ fontSize: "13px", color: "#475569" }}>
                          <div>Correcto: <em>"{textosCorrecto}"</em>{pa.nexo ? ` · nexo: ${pa.nexo}` : ""}</div>
                          {ga && (
                            <div style={{ marginTop: "3px" }}>
                              Tu respuesta:{" "}
                              {!tipoOk   && <span style={{ color: "#EF4444" }}>tipo incorrecto ({ga.tipo}) </span>}
                              {!tokensOk && <span style={{ color: "#EF4444" }}>palabras incorrectas</span>}
                            </div>
                          )}
                          {!ga && <div style={{ color: "#94A3B8" }}>No identificaste esta proposición.</div>}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </section>
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
  scoreCard: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    background: "#fff",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 2px 12px rgba(0,0,0,.08)",
    flexWrap: "wrap",
  },
  scoreNum: (pct) => ({
    fontSize: "52px",
    fontWeight: 800,
    lineHeight: 1,
    color: pct === 100 ? "#10B981" : pct >= 70 ? "#6366F1" : "#F59E0B",
    flexShrink: 0,
  }),
  scoreLabel:  { fontSize: "18px", fontWeight: 700, color: "#1E293B" },
  scoreDetail: { fontSize: "14px", color: "#64748B", marginTop: "4px" },
  scoreBtns: {
    display: "flex",
    gap: "10px",
    marginLeft: "auto",
    flexWrap: "wrap",
  },
  btn: (v) => ({
    padding: "10px 20px",
    borderRadius: "10px",
    border: v === "outline" ? "1.5px solid #E2E8F0" : "none",
    background: v === "primary" ? "#6366F1" : "#fff",
    color: v === "primary" ? "#fff" : "#475569",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  }),
  card: {
    background: "#fff",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 2px 12px rgba(0,0,0,.08)",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  sectionTitle: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: ".06em",
    margin: 0,
  },
  subTitle: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#64748B",
    marginBottom: "8px",
  },
  errorList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  grupList: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  grupRow: (color) => ({
    display: "flex",
    alignItems: "baseline",
    gap: "10px",
    padding: "6px 10px",
    borderRadius: "6px",
    background: `${color}0D`,
    borderLeft: `3px solid ${color}`,
    flexWrap: "wrap",
  }),
  propRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    padding: "8px 12px",
    borderRadius: "8px",
    background: "#F8FAFC",
    borderLeft: "3px solid #6366F1",
    flexWrap: "wrap",
  },
  errorRow: (estado) => ({
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    padding: "10px 14px",
    borderRadius: "8px",
    borderLeft: `3px solid ${estado === "omitido" ? "#94A3B8" : "#EF4444"}`,
    background: estado === "omitido" ? "#F8FAFC" : "#FEF2F2",
    fontSize: "14px",
    flexWrap: "wrap",
  }),
};
