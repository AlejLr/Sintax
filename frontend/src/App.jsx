import { useState } from "react";
import { useAnalyze } from "./hooks/useAnalyze.js";
import Header from "./components/Header.jsx";
import SentenceInput from "./components/SentenceInput.jsx";
import ExerciseView from "./components/ExerciseView.jsx";
import CorrectionView from "./components/CorrectionView.jsx";
import "./index.css";

export default function App() {
  const [screen, setScreen]   = useState("input");     // "input" | "ejercicio" | "correccion"
  const [nivel, setNivel]     = useState("3eso");
  const [respuesta, setRespuesta] = useState(null);    // respuesta del alumno al corregir

  const { data, loading, slowLoad, error, analizar } = useAnalyze();

  function handleAnalizar(oracion) {
    analizar(oracion, nivel, () => {
      setRespuesta(null);
      setScreen("ejercicio");
    });
  }

  function handleCorregir(respuestaAlumno) {
    setRespuesta(respuestaAlumno);
    setScreen("correccion");
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header nivel={nivel} onNivelChange={setNivel} />

      {screen === "input" && (
        <SentenceInput
          onAnalizar={handleAnalizar}
          loading={loading}
          slowLoad={slowLoad}
          error={error}
        />
      )}

      {screen === "ejercicio" && data && (
        <ExerciseView
          tokens={data.tokens}
          oracion={data.oracion}
          nivel={nivel}
          onCorregir={handleCorregir}
          onVolver={() => setScreen("input")}
        />
      )}

      {screen === "correccion" && data && respuesta && (
        <CorrectionView
          data={data}
          respuesta={respuesta}
          nivel={nivel}
          onReintentar={() => setScreen("ejercicio")}
          onNuevaOracion={() => setScreen("input")}
        />
      )}
    </div>
  );
}
