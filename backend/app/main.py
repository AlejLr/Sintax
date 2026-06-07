from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from .models import AnalisisRequest, AnalisisResponse
from .analyzer import analizar, _get_nlp

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    _get_nlp()   # load model at startup so Cloud Run waits until it's ready
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
