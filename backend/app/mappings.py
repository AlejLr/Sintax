"""
Tablas de traducción: etiquetas Universal Dependencies → gramática española escolar.
Fuente: currículo LOE/LOMLOE, Real Academia Española.
"""

# UD POS → categoría gramatical española
CATEGORIA: dict[str, str] = {
    "NOUN":  "sustantivo",
    "PROPN": "nombre propio",
    "VERB":  "verbo",
    "AUX":   "verbo auxiliar",
    "ADJ":   "adjetivo",
    "ADV":   "adverbio",
    "PRON":  "pronombre",
    "DET":   "determinante",
    "ADP":   "preposición",
    "CCONJ": "conjunción coordinante",
    "SCONJ": "conjunción subordinante",
    "NUM":   "numeral",
    "INTJ":  "interjección",
    "PUNCT": "puntuación",
    "SYM":   "símbolo",
    "X":     "otra categoría",
}

# UD dep label → función sintáctica española
FUNCION: dict[str, str] = {
    "nsubj":       "Sujeto",
    "nsubj:pass":  "Sujeto paciente",
    "csubj":       "Sujeto oracional",
    "obj":         "CD",
    "iobj":        "CI",
    "obl":         "CC",
    "obl:agent":   "C. Agente",
    "advmod":      "CC",
    "amod":        "CN adjetivo",
    "nmod":        "CN",
    "nmod:poss":   "CN posesivo",
    "appos":       "Aposición",
    "det":         "Determinante",
    "case":        "Preposición",
    "mark":        "Nexo",
    "cc":          "Nexo coordinante",
    "conj":        "Elemento coordinado",
    "aux":         "Verbo auxiliar",
    "aux:pass":    "Auxiliar pasiva",
    "cop":         "Cópula",
    "xcomp":       "C. Predicativo",
    "ccomp":       "Subordinada sustantiva",
    "advcl":       "Subordinada adverbial",
    "acl":         "Subordinada adjetiva",
    "acl:relcl":   "Subordinada de relativo",
    "expl":        "Pronombre",
    "expl:pass":   "Se pasivo",
    "expl:impers": "Se impersonal",
    "flat":        "Nombre propio",
    "flat:name":   "Nombre propio",
    "nummod":      "Numeral",
    "vocative":    "Vocativo",
    "punct":       "Puntuación",
    "root":        "Núcleo verbal",
    "ROOT":        "Núcleo verbal",
}

# Colores por función (hex) — coherentes con el diseño del frontend
COLOR_FUNCION: dict[str, str] = {
    "Sujeto":                   "#3B82F6",  # azul
    "Sujeto paciente":          "#60A5FA",
    "Predicado verbal":         "#8B5CF6",  # morado
    "Predicado nominal":        "#A78BFA",
    "Núcleo verbal":            "#8B5CF6",
    "CD":                       "#10B981",  # verde
    "CI":                       "#F59E0B",  # ámbar
    "CC":                       "#EF4444",  # rojo
    "C. Agente":                "#F97316",  # naranja
    "CRV":                      "#EC4899",  # rosa
    "C. Predicativo":           "#14B8A6",  # teal
    "Atributo":                 "#14B8A6",
    "Cópula":                   "#C4B5FD",
    "Verbo auxiliar":           "#C4B5FD",
    "Subordinada sustantiva":   "#10B981",
    "Subordinada adjetiva":     "#84CC16",
    "Subordinada de relativo":  "#84CC16",
    "Subordinada adverbial":    "#EF4444",
    "CN":                       "#6B7280",  # gris
    "CN adjetivo":              "#6B7280",
    "Determinante":             "#94A3B8",
    "Preposición":              "#CBD5E1",
    "Nexo":                     "#9CA3AF",
    "Aposición":                "#6B7280",
    "Puntuación":               "#E2E8F0",
}

COLOR_CATEGORIA: dict[str, str] = {
    "sustantivo":              "#3B82F6",
    "nombre propio":           "#1D4ED8",
    "verbo":                   "#8B5CF6",
    "verbo auxiliar":          "#C4B5FD",
    "adjetivo":                "#10B981",
    "adverbio":                "#EF4444",
    "pronombre":               "#F59E0B",
    "determinante":            "#94A3B8",
    "preposición":             "#CBD5E1",
    "conjunción coordinante":  "#9CA3AF",
    "conjunción subordinante": "#9CA3AF",
    "numeral":                 "#14B8A6",
    "interjección":            "#EC4899",
    "puntuación":              "#E2E8F0",
}

# Verbos copulativos en español
VERBOS_COPULATIVOS = {"ser", "estar", "parecer", "resultar", "semejar", "quedarse", "volverse"}

# Verbos con régimen preposicional fijo más comunes (verbo → preposición(es))
# Permite distinguir CC de CRV
REGIMEN_VERBAL: dict[str, list[str]] = {
    "contar":    ["con"],
    "depender":  ["de"],
    "hablar":    ["de", "sobre", "con"],
    "pensar":    ["en", "de"],
    "acordarse": ["de"],
    "olvidarse": ["de"],
    "fijarse":   ["en"],
    "confiar":   ["en"],
    "insistir":  ["en"],
    "consistir": ["en"],
    "tratarse":  ["de"],
    "referirse": ["a"],
    "dedicarse": ["a"],
    "atreverse": ["a"],
    "negarse":   ["a"],
    "oponerse":  ["a"],
    "carecer":   ["de"],
    "disponer":  ["de"],
    "disfrutar": ["de"],
    "enterarse": ["de"],
    "arrepentirse": ["de"],
    "quejarse":  ["de"],
}

# Conjunciones coordinantes por tipo
COORD_TIPO: dict[str, str] = {
    "y": "copulativa", "e": "copulativa", "ni": "copulativa",
    "o": "disyuntiva", "u": "disyuntiva",
    "pero": "adversativa", "sino": "adversativa", "mas": "adversativa",
    "aunque": "adversativa", "sin embargo": "adversativa",
    "es decir": "explicativa", "o sea": "explicativa", "esto es": "explicativa",
    "pues": "explicativa",
}
