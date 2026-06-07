const NIVELES = [
  { value: "2eso", label: "2º ESO" },
  { value: "3eso", label: "3º ESO" },
  { value: "4eso", label: "4º ESO" },
  { value: "bachillerato", label: "Bachillerato" },
];

export default function Header({ nivel, onNivelChange }) {
  return (
    <header style={s.header} className="header-inner">
      <div style={s.logo}>
        <span style={s.logoText}>Sintax</span>
        <span style={s.logoSub} className="hide-mobile">análisis sintáctico</span>
      </div>

      <div style={s.selector} role="group" aria-label="Nivel educativo">
        {NIVELES.map((n) => (
          <button
            key={n.value}
            style={s.nivelBtn(nivel === n.value)}
            className="nivel-btn"
            onClick={() => onNivelChange(n.value)}
          >
            {n.label}
          </button>
        ))}
      </div>
    </header>
  );
}

const s = {
  header: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    background: "#fff",
    borderBottom: "1px solid #E2E8F0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
    height: "60px",
    boxShadow: "0 1px 4px rgba(0,0,0,.06)",
  },
  logo: {
    display: "flex",
    alignItems: "baseline",
    gap: "10px",
  },
  logoText: {
    fontSize: "22px",
    fontWeight: 800,
    color: "#6366F1",
    letterSpacing: "-.02em",
  },
  logoSub: {
    fontSize: "13px",
    color: "#94A3B8",
    fontWeight: 400,
  },
  selector: {
    display: "flex",
    background: "#F1F5F9",
    borderRadius: "10px",
    padding: "4px",
    gap: "2px",
  },
  nivelBtn: (active) => ({
    padding: "6px 14px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: "13px",
    fontWeight: active ? 700 : 500,
    background: active ? "#fff" : "transparent",
    color: active ? "#6366F1" : "#64748B",
    boxShadow: active ? "0 1px 4px rgba(0,0,0,.10)" : "none",
    transition: "all .15s",
  }),
};
