"""
Núcleo del análisis sintáctico.
Carga el modelo spaCy una sola vez y expone la función `analizar()`.
"""
from __future__ import annotations
import spacy
from .models import (
    AnalisisResponse, Token, Morfologia,
    Grupo, Subgrupo, Proposicion, Nivel,
)
from .mappings import (
    CATEGORIA, FUNCION, COLOR_FUNCION, COLOR_CATEGORIA,
    VERBOS_COPULATIVOS, REGIMEN_VERBAL, COORD_TIPO,
)

# ---------------------------------------------------------------------------
# Carga del modelo (singleton)
# ---------------------------------------------------------------------------

_nlp: spacy.language.Language | None = None


def _get_nlp() -> spacy.language.Language:
    global _nlp
    if _nlp is None:
        _nlp = spacy.load("es_dep_news_trf")
    return _nlp


# ---------------------------------------------------------------------------
# Helpers de morfología
# ---------------------------------------------------------------------------

def _morfologia(token: spacy.tokens.Token) -> Morfologia:
    m = token.morph
    return Morfologia(
        genero=m.get("Gender")[0] if m.get("Gender") else None,
        numero=m.get("Number")[0] if m.get("Number") else None,
        persona=m.get("Person")[0] if m.get("Person") else None,
        modo=m.get("VerbForm")[0] if m.get("VerbForm") else None,
        tiempo=m.get("Tense")[0] if m.get("Tense") else None,
        caso=m.get("Case")[0] if m.get("Case") else None,
    )


# ---------------------------------------------------------------------------
# Capa 1: tokens planos
# ---------------------------------------------------------------------------

def _extraer_tokens(doc: spacy.tokens.Doc, nivel: Nivel) -> list[Token]:
    tokens = []
    for t in doc:
        categoria = CATEGORIA.get(t.pos_, "otra categoría")
        tokens.append(Token(
            id=t.i,
            texto=t.text,
            lema=t.lemma_,
            es_puntuacion=t.is_punct,
            categoria=categoria,
            categoria_color=COLOR_CATEGORIA.get(categoria, "#9CA3AF"),
            morfologia=_morfologia(t) if nivel == "bachillerato" else None,
        ))
    return tokens


# ---------------------------------------------------------------------------
# Helpers de grupos
# ---------------------------------------------------------------------------

def _texto_span(doc: spacy.tokens.Doc, ids: list[int]) -> str:
    return " ".join(doc[i].text for i in ids if not doc[i].is_punct)


def _color_funcion(funcion: str) -> str:
    return COLOR_FUNCION.get(funcion, "#9CA3AF")


def _es_copulativa(token: spacy.tokens.Token) -> bool:
    return token.lemma_.lower() in VERBOS_COPULATIVOS


def _detectar_crv(token: spacy.tokens.Token) -> bool:
    """Devuelve True si este obl es un CRV (complemento de régimen verbal)."""
    head = token.head
    prep_hijos = [c for c in token.children if c.dep_ == "case"]
    if not prep_hijos:
        return False
    prep = prep_hijos[0].text.lower()
    return prep in REGIMEN_VERBAL.get(head.lemma_.lower(), [])


def _subtree_ids(token: spacy.tokens.Token, excluir_deps: set[str] | None = None) -> list[int]:
    """
    IDs del subárbol de un token, excluyendo ramas completas cuya raíz tenga
    una dep excluida. Usar token.subtree plano no es suficiente porque excluir
    'nsubj' no excluye los hijos de ese nodo (e.g. el determinante del sujeto).
    """
    excluir_deps = excluir_deps or set()
    ids: list[int] = []

    def _recoger(t: spacy.tokens.Token, es_raiz: bool = False) -> None:
        if not es_raiz and t.dep_ in excluir_deps:
            return  # excluir este nodo y toda su rama
        if not t.is_punct:
            ids.append(t.i)
        for hijo in t.children:
            _recoger(hijo)

    _recoger(token, es_raiz=True)
    return sorted(ids)


# ---------------------------------------------------------------------------
# Capa 2: construcción de grupos
# ---------------------------------------------------------------------------

def _construir_grupos(doc: spacy.tokens.Doc, nivel: Nivel) -> list[Grupo]:
    """
    TODO: implementación completa.
    Por ahora devuelve el esqueleto correcto con los grupos principales
    (Sujeto y Predicado) detectados desde el ROOT.
    Los subgrupos (CD, CI, CC…) se implementarán en la siguiente iteración.
    """
    grupos: list[Grupo] = []
    root = next((t for t in doc if t.dep_ == "ROOT"), None)
    if root is None:
        return grupos

    deps_subordinadas = {"ccomp", "xcomp", "advcl", "acl", "acl:relcl", "relcl"}

    # ---- Sujeto ----
    sujeto = next((c for c in root.children if c.dep_ in ("nsubj", "nsubj:pass")), None)
    if sujeto:
        ids_sujeto = _subtree_ids(sujeto)
        grupos.append(Grupo(
            id=0,
            token_ids=ids_sujeto,
            texto=_texto_span(doc, ids_sujeto),
            funcion="Sujeto",
            nucleo_id=sujeto.i,
            color=_color_funcion("Sujeto"),
            subgrupos=[],   # TODO: CN, determinante, adjetivos del SN
        ))

    # ---- Predicado ----
    tipo_pred = "Predicado nominal" if _es_copulativa(root) else "Predicado verbal"
    ids_pred = _subtree_ids(
        root,
        excluir_deps={"nsubj", "nsubj:pass", "punct"} | deps_subordinadas,
    )
    # Incluir al propio root si no está ya
    if root.i not in ids_pred:
        ids_pred = sorted(ids_pred + [root.i])

    subgrupos_pred = _construir_subgrupos(doc, root, nivel)

    grupos.append(Grupo(
        id=1,
        token_ids=ids_pred,
        texto=_texto_span(doc, ids_pred),
        funcion=tipo_pred,
        nucleo_id=root.i,
        color=_color_funcion(tipo_pred),
        subgrupos=subgrupos_pred,
    ))

    return grupos


def _construir_subgrupos(
    doc: spacy.tokens.Doc,
    root: spacy.tokens.Token,
    nivel: Nivel,
) -> list[Subgrupo]:
    """
    TODO: implementación completa.
    Detecta CD, CI, CC, CRV, Atributo, C. Predicativo, C. Agente.
    Por ahora devuelve el núcleo verbal como único subgrupo.
    """
    subgrupos: list[Subgrupo] = []

    # Núcleo verbal (siempre presente)
    subgrupos.append(Subgrupo(
        token_ids=[root.i],
        texto=root.text,
        funcion="Núcleo verbal",
        nucleo_id=root.i,
        color=_color_funcion("Núcleo verbal"),
    ))

    # TODO: iterar sobre los hijos del root y construir subgrupos para:
    #   obj      → CD
    #   iobj     → CI
    #   obl      → CC o CRV (usar _detectar_crv)
    #   obl:agent → C. Agente
    #   aux/cop  → auxiliares
    #   attr     → Atributo (si _es_copulativa)
    #   xcomp    → C. Predicativo o subordinada
    #   advmod   → CC

    return subgrupos


# ---------------------------------------------------------------------------
# Capa 3: proposiciones (4º ESO y Bachillerato)
# ---------------------------------------------------------------------------

def _detectar_proposiciones(doc: spacy.tokens.Doc) -> list[Proposicion]:
    """
    TODO: implementación completa.
    Detecta proposiciones coordinadas, subordinadas sustantivas,
    adjetivas y adverbiales, y yuxtapuestas.
    """
    proposiciones: list[Proposicion] = []

    # TODO: implementar detección de:
    #   - Proposición principal
    #   - Coordinadas (conj + cc → tipo por COORD_TIPO)
    #   - Subordinadas sustantivas (ccomp, xcomp, csubj)
    #   - Subordinadas adjetivas / de relativo (acl:relcl)
    #   - Subordinadas adverbiales (advcl)
    #   - Yuxtapuestas (múltiples ROOT o parataxis sin cc)

    return proposiciones


# ---------------------------------------------------------------------------
# Clasificación de la oración
# ---------------------------------------------------------------------------

def _tipo_oracion(doc: spacy.tokens.Doc, nivel: Nivel) -> str:
    """
    TODO: clasificación completa según nivel.
    Devuelve una etiqueta legible para el alumno.
    """
    root = next((t for t in doc if t.dep_ == "ROOT"), None)
    if root is None:
        return "Oración"

    es_copulativa = _es_copulativa(root)
    es_pasiva = any(t.dep_ in ("nsubj:pass", "aux:pass") for t in doc)
    es_impersonal = any(t.dep_ == "expl:impers" for t in doc)

    if es_impersonal:
        return "Oración impersonal"
    if es_pasiva:
        return "Oración pasiva"
    if es_copulativa:
        return "Oración copulativa"
    return "Oración predicativa"


# ---------------------------------------------------------------------------
# Punto de entrada público
# ---------------------------------------------------------------------------

def analizar(oracion: str, nivel: Nivel) -> AnalisisResponse:
    nlp = _get_nlp()
    doc = nlp(oracion)

    tokens = _extraer_tokens(doc, nivel)
    grupos = _construir_grupos(doc, nivel)
    proposiciones = (
        _detectar_proposiciones(doc)
        if nivel in ("4eso", "bachillerato")
        else []
    )

    return AnalisisResponse(
        oracion=oracion,
        nivel=nivel,
        tipo_oracion=_tipo_oracion(doc, nivel),
        tokens=tokens,
        grupos=grupos,
        proposiciones=proposiciones,
    )
