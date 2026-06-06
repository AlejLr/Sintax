# Sintax

Aplicación web de análisis sintáctico del español para estudiantes de ESO y Bachillerato.

> Spanish syntax analysis web app for ESO and Bachillerato students (ages 13–18).

## Flujo principal

1. El estudiante introduce una oración.
2. La app muestra el análisis sintáctico completo (funciones, categorías, árbol de dependencias).
3. Se lanza un ejercicio interactivo en el que el estudiante etiqueta la oración por su cuenta.
4. Al enviar, la app compara su respuesta con el análisis correcto y señala los errores.

> 1. The student enters a Spanish sentence.
> 2. The app displays the full syntactic analysis (functions, categories, dependency tree).
> 3. An interactive exercise starts where the student labels the sentence on their own.
> 4. On submit, the app compares their answer against the correct analysis and highlights mistakes.

## Niveles

| Nivel | Contenido |
| --- | --- |
| 2º–3º ESO | CD, CI, CC, CRV, C. Predicativo, Atributo, C. Agente, oraciones impersonales |
| 4º ESO | Todo lo anterior + oraciones compuestas (yuxtapuestas, coordinadas, subordinadas) |
| Bachillerato | Todo lo anterior + detalle morfológico completo |

## Stack

- **Backend**: Python, FastAPI, spaCy (`es_dep_news_trf`)
- **Frontend**: React + Vite, desplegado en Vercel
- **Backend deploy**: Render.com

## Desarrollo local

```bash
# Backend
cd backend
pip install -r requirements.txt
python -m spacy download es_dep_news_trf
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```
