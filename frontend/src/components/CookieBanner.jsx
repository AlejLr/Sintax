import { useState } from "react";

const STORAGE_KEY = "cookie-consent";

export default function CookieBanner() {
  const [visible, setVisible] = useState(
    () => localStorage.getItem(STORAGE_KEY) === null
  );

  if (!visible) return null;

  function handleAccept() {
    localStorage.setItem(STORAGE_KEY, "accepted");
    window.enableGA?.();
    setVisible(false);
  }

  function handleDecline() {
    localStorage.setItem(STORAGE_KEY, "declined");
    setVisible(false);
  }

  return (
    <div style={s.bar}>
      <p style={s.text}>
        Usamos analíticas anónimas para saber cuántas personas usan la app.
        No se guardan oraciones ni ningún dato personal.{" "}
        <a
          href="https://policies.google.com/privacy"
          target="_blank"
          rel="noopener noreferrer"
          style={s.link}
        >
          Política de privacidad de Google Analytics
        </a>
        .
      </p>
      <div style={s.actions}>
        <button onClick={handleDecline} style={s.btnSecondary}>Rechazar</button>
        <button onClick={handleAccept}  style={s.btnPrimary}>Aceptar</button>
      </div>
    </div>
  );
}

const s = {
  bar: {
    position:        "fixed",
    bottom:          0,
    left:            0,
    right:           0,
    zIndex:          1000,
    background:      "#1E293B",
    color:           "#F1F5F9",
    padding:         "12px 20px",
    display:         "flex",
    alignItems:      "center",
    justifyContent:  "space-between",
    gap:             "16px",
    flexWrap:        "wrap",
    boxShadow:       "0 -2px 12px rgba(0,0,0,0.2)",
  },
  text: {
    margin:   0,
    fontSize: "13px",
    flex:     1,
    minWidth: "220px",
    lineHeight: 1.5,
  },
  link: {
    color:          "#93C5FD",
    textDecoration: "underline",
  },
  actions: {
    display: "flex",
    gap:     "8px",
    flexShrink: 0,
  },
  btnPrimary: {
    background:   "#3B82F6",
    color:        "#fff",
    border:       "none",
    borderRadius: "6px",
    padding:      "7px 16px",
    fontSize:     "13px",
    fontWeight:   600,
    cursor:       "pointer",
  },
  btnSecondary: {
    background:   "transparent",
    color:        "#94A3B8",
    border:       "1px solid #475569",
    borderRadius: "6px",
    padding:      "7px 16px",
    fontSize:     "13px",
    fontWeight:   600,
    cursor:       "pointer",
  },
};
