from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, field_validator

Nivel = Literal["2eso", "3eso", "4eso", "bachillerato"]


# ---------------------------------------------------------------------------
# Request
# ---------------------------------------------------------------------------

class AnalisisRequest(BaseModel):
    oracion: str
    nivel: Nivel = "3eso"

    @field_validator("oracion")
    @classmethod
    def validar_oracion(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("La oración no puede estar vacía.")
        if len(v) > 500:
            raise ValueError("La oración no puede superar los 500 caracteres.")
        return v


# ---------------------------------------------------------------------------
# Morfología (solo Bachillerato)
# ---------------------------------------------------------------------------

class Morfologia(BaseModel):
    genero: Optional[str] = None     # Masc, Fem
    numero: Optional[str] = None     # Sing, Plur
    persona: Optional[str] = None    # 1, 2, 3
    modo: Optional[str] = None       # Ind, Sub, Imp, Inf, Part, Ger
    tiempo: Optional[str] = None     # Pres, Past, Fut, Imp, ...
    caso: Optional[str] = None       # Nom, Acc, Dat


# ---------------------------------------------------------------------------
# Token  (lista plana — para renderizar la oración)
# ---------------------------------------------------------------------------

class Token(BaseModel):
    id: int
    texto: str
    lema: str
    es_puntuacion: bool
    # Respuesta correcta — el frontend la oculta durante el ejercicio
    categoria: str           # "determinante", "sustantivo", "verbo"…
    categoria_color: str     # hex
    morfologia: Optional[Morfologia] = None   # solo bachillerato


# ---------------------------------------------------------------------------
# Grupos  (constituyentes con función sintáctica)
# ---------------------------------------------------------------------------

class Subgrupo(BaseModel):
    token_ids: list[int]
    texto: str
    funcion: str             # "Verbo (núcleo)", "CD", "CC de lugar"…
    nucleo_id: int           # id del token núcleo del subgrupo
    color: str               # hex


class Grupo(BaseModel):
    id: int
    token_ids: list[int]
    texto: str
    funcion: str             # "Sujeto", "Predicado verbal", "Predicado nominal"…
    nucleo_id: int           # id del token núcleo del grupo
    color: str               # hex
    subgrupos: list[Subgrupo] = []


# ---------------------------------------------------------------------------
# Proposiciones  (solo 4º ESO y Bachillerato)
# ---------------------------------------------------------------------------

class Proposicion(BaseModel):
    tipo: str        # "principal" | "coordinada_copulativa" | "subordinada_sustantiva" …
    tipo_es: str     # etiqueta para mostrar al alumno
    token_ids: list[int]
    nexo: Optional[str] = None    # conjunción o relativo que la introduce


# ---------------------------------------------------------------------------
# Response
# ---------------------------------------------------------------------------

class AnalisisResponse(BaseModel):
    oracion: str
    nivel: Nivel
    tipo_oracion: str            # "Oración simple predicativa", etc.
    tokens: list[Token]
    grupos: list[Grupo]
    proposiciones: list[Proposicion] = []   # vacío para 2º/3º ESO
