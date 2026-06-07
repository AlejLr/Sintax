from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from .models import AnalisisRequest, AnalisisResponse
from .analyzer import analizar

load_dotenv()

app = FastAPI(title="Sintax API", version="0.1.0")

origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/salud")
def salud():
    return {"estado": "ok"}


@app.post("/analizar", response_model=AnalisisResponse)
def analizar_oracion(req: AnalisisRequest):
    try:
        return analizar(req.oracion, req.nivel)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
