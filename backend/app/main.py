from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import threading

from .models import AnalisisRequest, AnalisisResponse
from .analyzer import analizar, load_fast_model, load_transformer_model

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Load the fast model synchronously (~1 s) — port opens right after this.
    load_fast_model()
    # 2. Load the transformer in the background (~40 s) without blocking startup.
    threading.Thread(target=load_transformer_model, daemon=True).start()
    yield


app = FastAPI(title="Sintax API", version="0.1.0", lifespan=lifespan)

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
    except MemoryError:
        raise HTTPException(
            status_code=500,
            detail="La oración es demasiado compleja para el analizador. Prueba con una más corta.",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
