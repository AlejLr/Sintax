"""
Núcleo del análisis sintáctico.
Expone la función `analizar()` y dos funciones de carga de modelos.

Estrategia de degradación progresiva:
  1. `load_fast_model()`  carga es_core_news_lg  (~1 s)  → puerto abierto inmediatamente
  2. `load_transformer_model()` carga es_dep_news_trf (~40 s) en hilo de fondo
  Mientras el transformador carga, las peticiones usan el modelo rápido.
  En cuanto termina, todas las peticiones usan el transformador.
"""
from __future__ import annotations
import spacy
from .models import (
    AnalisisResponse, Token, Morfologia,
    Grupo, Subgrupo, Proposicion, Nivel,
)
from .mappings import (
    CATEGORIA, COLOR_FUNCION, COLOR_CATEGORIA,
    VERBOS_COPULATIVOS, REGIMEN_VERBAL, COORD_TIPO,
)

# ---------------------------------------------------------------------------
# Carga de modelos (degradación progresiva)
# ---------------------------------------------------------------------------

_nlp_fast: spacy.language.Language | None = None  # es_core_news_lg
_nlp_trf:  spacy.language.Language | None = None  # es_dep_news_trf


def load_fast_model() -> None:
    global _nlp_fast
    if _nlp_fast is None:
        _nlp_fast = spacy.load("es_core_news_lg")


def load_transformer_model() -> None:
    global _nlp_trf
    if _nlp_trf is None:
        _nlp_trf = spacy.load("es_dep_news_trf")


def _get_nlp() -> spacy.language.Language:
    """Devuelve el mejor modelo disponible en este momento."""
    if _nlp_trf is not None:
        return _nlp_trf
    return _nlp_fast  # type: ignore[return-value]


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


def _detectar_crv(token: spacy.tokens.Token) -> bool:
    """True si este obl es un CRV (complemento de régimen verbal)."""
    head = token.head
    prep_hijos = [c for c in token.children if c.dep_ == "case"]
    if not prep_hijos:
        return False
    prep = prep_hijos[0].text.lower()
    return prep in REGIMEN_VERBAL.get(head.lemma_.lower(), [])


def _subtree_ids(token: spacy.tokens.Token, excluir_deps: set[str] | None = None) -> list[int]:
    """
    IDs del subárbol de un token, excluyendo ramas completas cuya raíz tenga
    una dep excluida. Traversal recursivo para excluir toda la rama, no solo
    el nodo raíz de la misma.
    """
    excluir_deps = excluir_deps or set()
    ids: list[int] = []

    def _recoger(t: spacy.tokens.Token, es_raiz: bool = False) -> None:
        if not es_raiz and t.dep_ in excluir_deps:
            return
        if not t.is_punct:
            ids.append(t.i)
        for hijo in t.children:
            _recoger(hijo)

    _recoger(token, es_raiz=True)
    return sorted(ids)


# ---------------------------------------------------------------------------
# Capa 2: construcción de grupos
# ---------------------------------------------------------------------------

# Deps que nunca generan un grupo funcional propio dentro del predicado
_DEPS_IGNORAR = frozenset({
    "aux", "aux:pass",
    "cop",
    "nsubj", "nsubj:pass",
    "expl", "expl:impers", "expl:pass",
    "cc", "conj",
    "det", "case", "mark",
    "flat", "flat:name",
    "punct",
    "nummod",
    "amod", "nmod", "nmod:poss",  # CN (no se analizan como grupo independiente aquí)
})

# Deps de proposiciones subordinadas (se excluyen del subtree del predicado principal)
_DEPS_SUBORD = frozenset({"ccomp", "advcl", "acl", "acl:relcl", "relcl"})


def _construir_grupos(doc: spacy.tokens.Doc, nivel: Nivel) -> list[Grupo]:
    grupos: list[Grupo] = []
    gid = 0

    root = next((t for t in doc if t.dep_ == "ROOT"), None)
    if root is None:
        return grupos

    # ── Detectar estructura copulativa ───────────────────────────────────────
    # Dos casos según qué produzca es_dep_news_trf:
    # (a) ROOT = atributo (ej: "azul"), verbo copulativo como hijo con dep="cop"
    # (b) ROOT = atributo, pero spaCy etiqueta el verbo como dep="aux" en lugar
    #     de "cop" — cubrimos ambos buscando aux con lema copulativo.
    # (c) ROOT = verbo copulativo directamente (menos frecuente en UD español).
    cop = next(
        (c for c in root.children
         if c.dep_ == "cop"
         or (c.dep_ == "aux" and c.lemma_.lower() in VERBOS_COPULATIVOS)),
        None
    )
    root_es_verbo_cop = (
        root.lemma_.lower() in VERBOS_COPULATIVOS and root.pos_ == "VERB"
    )
    es_cop = (cop is not None) or root_es_verbo_cop
    verbo  = cop if cop is not None else root  # el verbo para la gramática escolar

    # Auxiliares (forman parte del núcleo verbal junto con el verbo principal)
    aux_tokens = [c for c in root.children if c.dep_ in ("aux", "aux:pass") and c is not cop]
    ids_nucleo = sorted([verbo.i] + [a.i for a in aux_tokens])

    # ── Sujeto ───────────────────────────────────────────────────────────────
    sujeto_tok = next(
        (c for c in root.children if c.dep_ in ("nsubj", "nsubj:pass")), None
    )
    sujeto_set: set[int] = set()
    if sujeto_tok:
        funcion_suj = "Sujeto paciente" if sujeto_tok.dep_ == "nsubj:pass" else "Sujeto"
        ids_s = _subtree_ids(sujeto_tok)
        sujeto_set = set(ids_s)
        # spaCy a veces adjunta determinantes/adjetivos del SN sujeto directamente
        # al verbo root en lugar de al sustantivo. Los detectamos por posición:
        # cualquier det/amod/nummod hijo del root que aparezca ANTES del núcleo
        # del sujeto pertenece al SN sujeto, no al predicado.
        sujeto_set |= {
            c.i for c in root.children
            if c.dep_ in ("det", "amod", "nummod") and c.i < sujeto_tok.i
        }
        ids_s = sorted(sujeto_set)
        grupos.append(Grupo(
            id=gid, token_ids=ids_s, texto=_texto_span(doc, ids_s),
            funcion=funcion_suj, nucleo_id=sujeto_tok.i,
            color=_color_funcion(funcion_suj), subgrupos=[],
        ))
        gid += 1

    # ── Predicado ─────────────────────────────────────────────────────────────
    tipo_pred = "Predicado nominal" if es_cop else "Predicado verbal"
    ids_pred = _subtree_ids(
        root,
        excluir_deps={"nsubj", "nsubj:pass", "punct"} | _DEPS_SUBORD,
    )
    if root.i not in ids_pred:
        ids_pred = sorted(ids_pred + [root.i])
    # Eliminar tokens del sujeto que spaCy haya adjuntado erróneamente al root
    ids_pred = [i for i in ids_pred if i not in sujeto_set]

    nucleo_sub = Subgrupo(
        token_ids=ids_nucleo,
        texto=_texto_span(doc, ids_nucleo),
        funcion="Núcleo verbal",
        nucleo_id=verbo.i,
        color=_color_funcion("Núcleo verbal"),
    )
    grupos.append(Grupo(
        id=gid, token_ids=ids_pred, texto=_texto_span(doc, ids_pred),
        funcion=tipo_pred, nucleo_id=verbo.i,
        color=_color_funcion(tipo_pred), subgrupos=[nucleo_sub],
    ))
    gid += 1

    # ── Complementos ─────────────────────────────────────────────────────────
    if es_cop:
        if verbo is root:
            # (c) ROOT es el propio verbo copulativo; buscar el atributo entre sus hijos
            atr_tok = next(
                (c for c in root.children if c.dep_ in ("attr", "xcomp", "acomp")),
                None
            )
            if atr_tok:
                ids_atr = [i for i in _subtree_ids(atr_tok, excluir_deps={"punct"})
                           if i not in sujeto_set]
                if ids_atr:
                    grupos.append(Grupo(
                        id=gid, token_ids=ids_atr, texto=_texto_span(doc, ids_atr),
                        funcion="Atributo", nucleo_id=atr_tok.i,
                        color=_color_funcion("Atributo"), subgrupos=[],
                    ))
                    gid += 1
        else:
            # (a)/(b) ROOT es el atributo; su subtree sin sujeto/cop/aux/punt = Atributo
            ids_atr = _subtree_ids(
                root,
                excluir_deps={"nsubj", "nsubj:pass", "cop", "aux", "aux:pass", "punct"},
            )
            ids_atr = [i for i in ids_atr if i not in sujeto_set]
            if ids_atr:
                grupos.append(Grupo(
                    id=gid, token_ids=ids_atr, texto=_texto_span(doc, ids_atr),
                    funcion="Atributo", nucleo_id=root.i,
                    color=_color_funcion("Atributo"), subgrupos=[],
                ))
                gid += 1
    else:
        for hijo in root.children:
            dep = hijo.dep_

            if dep in _DEPS_IGNORAR or dep in _DEPS_SUBORD:
                continue

            if dep == "obj":
                funcion = "CD"
            elif dep == "iobj":
                funcion = "CI"
            elif dep == "obl":
                funcion = "CRV" if _detectar_crv(hijo) else "CC"
            elif dep == "obl:agent":
                funcion = "C. Agente"
            elif dep == "advmod":
                if hijo.lemma_.lower() in ("no", "sí", "tampoco", "también"):
                    continue
                funcion = "CC"
            elif dep == "xcomp":
                funcion = "C. Predicativo"
            else:
                continue

            ids = [i for i in _subtree_ids(hijo) if i not in sujeto_set]
            if not ids:
                continue
            grupos.append(Grupo(
                id=gid, token_ids=ids, texto=_texto_span(doc, ids),
                funcion=funcion, nucleo_id=hijo.i,
                color=_color_funcion(funcion), subgrupos=[],
            ))
            gid += 1

    return grupos


# ---------------------------------------------------------------------------
# Capa 3: proposiciones (4º ESO y Bachillerato)
# ---------------------------------------------------------------------------

_TIPO_ES: dict[str, str] = {
    "principal":               "Proposición principal",
    "coordinada_copulativa":   "Coordinada copulativa",
    "coordinada_adversativa":  "Coordinada adversativa",
    "coordinada_disyuntiva":   "Coordinada disyuntiva",
    "coordinada_explicativa":  "Coordinada explicativa",
    "subordinada_sustantiva":  "Subordinada sustantiva",
    "subordinada_adjetiva":    "Subordinada adjetiva",
    "subordinada_adverbial":   "Subordinada adverbial",
    "yuxtapuesta":             "Oración yuxtapuesta",
}


def _detectar_proposiciones(doc: spacy.tokens.Doc) -> list[Proposicion]:
    proposiciones: list[Proposicion] = []

    for token in doc:
        dep  = token.dep_
        nexo: str | None = None

        if dep == "conj":
            cc_tok = next((c for c in token.children if c.dep_ == "cc"), None)
            nexo   = cc_tok.text.lower() if cc_tok else None
            tipo   = f"coordinada_{COORD_TIPO.get(nexo, 'copulativa')}" if nexo else "yuxtapuesta"

        elif dep in ("ccomp", "csubj"):
            mark_tok = next((c for c in token.children if c.dep_ == "mark"), None)
            nexo     = mark_tok.text.lower() if mark_tok else None
            tipo     = "subordinada_sustantiva"

        elif dep == "acl:relcl":
            rel_tok = next(
                (c for c in token.children
                 if c.pos_ == "PRON" and c.dep_ in ("nsubj", "obj", "obl", "ref")),
                None,
            )
            nexo = rel_tok.text.lower() if rel_tok else None
            tipo = "subordinada_adjetiva"

        elif dep == "advcl":
            mark_tok = next((c for c in token.children if c.dep_ == "mark"), None)
            nexo     = mark_tok.text.lower() if mark_tok else None
            tipo     = "subordinada_adverbial"

        elif dep == "parataxis":
            tipo = "yuxtapuesta"

        else:
            continue

        proposiciones.append(Proposicion(
            tipo=tipo,
            tipo_es=_TIPO_ES.get(tipo, tipo),
            token_ids=_subtree_ids(token),
            nexo=nexo,
        ))

    # Proposición principal: todos los tokens que no pertenecen a ninguna secundaria
    secondary_ids: set[int] = {i for p in proposiciones for i in p.token_ids}
    principal_ids = [t.i for t in doc if not t.is_punct and t.i not in secondary_ids]
    if principal_ids:
        proposiciones.insert(0, Proposicion(
            tipo="principal",
            tipo_es=_TIPO_ES["principal"],
            token_ids=principal_ids,
            nexo=None,
        ))

    return proposiciones


# ---------------------------------------------------------------------------
# Clasificación de la oración
# ---------------------------------------------------------------------------

def _tipo_oracion(doc: spacy.tokens.Doc, nivel: Nivel) -> str:
    root = next((t for t in doc if t.dep_ == "ROOT"), None)
    if root is None:
        return "Oración"

    es_cop = (
        any(
            c.dep_ == "cop" or (c.dep_ == "aux" and c.lemma_.lower() in VERBOS_COPULATIVOS)
            for c in root.children
        )
        or root.lemma_.lower() in VERBOS_COPULATIVOS
    )
    es_pasiva    = any(t.dep_ in ("nsubj:pass", "aux:pass") for t in doc)
    es_impersonal = any(t.dep_ == "expl:impers" for t in doc)

    if es_impersonal:
        return "Oración impersonal"
    if es_pasiva:
        return "Oración pasiva"
    if es_cop:
        return "Oración copulativa"
    return "Oración predicativa"


# ---------------------------------------------------------------------------
# Punto de entrada público
# ---------------------------------------------------------------------------

def analizar(oracion: str, nivel: Nivel) -> AnalisisResponse:
    nlp = _get_nlp()
    doc = nlp(oracion)

    tokens      = _extraer_tokens(doc, nivel)
    grupos      = _construir_grupos(doc, nivel)
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
