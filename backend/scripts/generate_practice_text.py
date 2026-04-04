"""
generate_practice_text.py
─────────────────────────────────────────────────────────────────────
SERVICE GAI — Génère un nouveau texte de pratique + 10 questions
du même thème que le texte précédent, sauvegarde en base de données.

EMPLACEMENT : backend/scripts/generate_practice_text.py

UTILISATION depuis views.py :
    from scripts.generate_practice_text import generate_and_save_practice

    new_text_id = generate_and_save_practice(
        original_text  = reading_text,   # instance ReadingText
        learner_level  = "A1"
    )
    # Retourne : l'id du nouveau ReadingText sauvegardé en base
─────────────────────────────────────────────────────────────────────
"""

import json
import time
import re
from groq import Groq

GROQ_API_KEY = ""
MODEL_NAME   = "llama-3.3-70b-versatile"   # modèle plus puissant pour la génération

client = Groq(api_key=GROQ_API_KEY)


# ─────────────────────────────────────────────────────────────────
# UTILITAIRES
# ─────────────────────────────────────────────────────────────────

def _call_groq(prompt: str, max_tokens: int = 2000, retries: int = 3) -> str:
    for attempt in range(retries):
        try:
            response = client.chat.completions.create(
                model=MODEL_NAME,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.5,
                max_tokens=max_tokens,
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"  ⚠️  Groq error (attempt {attempt+1}/{retries}): {e}")
            time.sleep(8)
    raise Exception("Groq API unreachable after retries.")


def _extract_json(text: str):
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text  = "\n".join(lines[1:-1])
    return json.loads(text)


def _clean_text(raw: str) -> str:
    """Enlève le markdown bold (**mot**) du texte généré."""
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', raw)
    return text.strip()


# ─────────────────────────────────────────────────────────────────
# ÉTAPE 1 — Générer un nouveau texte du même thème
# ─────────────────────────────────────────────────────────────────

def _generate_text(topic: str, subunit_title: str, learner_level: str) -> tuple[str, str]:
    """
    Génère un nouveau texte de pratique sur le même thème.
    Retourne : (new_topic, new_content)
    """
    prompt = f"""You are an expert English teacher creating reading materials for CEFR level {learner_level} students.

The student just practiced reading a text about: "{topic}" (theme: {subunit_title})

Write a NEW, DIFFERENT reading passage on the SAME THEME but with a different angle or scenario.

Rules:
- Level: CEFR {learner_level} — use simple, clear vocabulary appropriate for this level
- Length: 150-200 words
- Use a different character name or situation than the original
- Do NOT copy sentences from the original text
- Write in a simple, friendly style with short sentences
- Give the new text a SHORT title (max 6 words)

Respond ONLY with valid JSON, no explanation, no markdown backticks:
{{
  "title": "Short Title Here",
  "content": "Full text here. Use \\n\\n to separate paragraphs."
}}"""

    raw  = _call_groq(prompt, max_tokens=800)
    data = _extract_json(raw)

    title   = data.get("title", f"Practice: {topic}")
    content = _clean_text(data.get("content", ""))
    return title, content


# ─────────────────────────────────────────────────────────────────
# ÉTAPE 2 — Générer 10 questions pour ce nouveau texte
# ─────────────────────────────────────────────────────────────────

def _generate_questions(topic: str, content: str, learner_level: str) -> list[dict]:
    """
    Génère exactement 10 questions de compréhension pour le texte.
    Retourne : liste de dicts { question, type, choices, answer }
    """
    prompt = f"""You are an English teacher creating REAL comprehension questions for CEFR {learner_level} beginner students.

Read this passage about "{topic}":
---
{content[:1500]}
---

Generate exactly 10 comprehension questions:
- 3 TRUE/FALSE questions
- 3 MULTIPLE CHOICE questions (4 options each)
- 4 FILL IN THE BLANK questions

VERY IMPORTANT: Students must READ and UNDERSTAND the text to answer. Never copy sentences directly.

Rules for TRUE/FALSE:
- Write statements requiring understanding, not just finding a word
- Mix True and False answers

Rules for MULTIPLE CHOICE:
- Ask about meaning, feelings, reasons, or general ideas
- Only one correct answer, 3 believable wrong options
- Options must be short (1-4 words)

Rules for FILL IN THE BLANK:
- Write NEW paraphrased sentences summarizing the text
- Never copy sentences directly from the text
- The blank answer must require understanding the text

Respond ONLY with a valid JSON array of exactly 10 objects, no explanation, no markdown backticks:
[
  {{
    "question": "Statement requiring understanding.",
    "type": "true_false",
    "choices": ["True", "False"],
    "answer": "True"
  }},
  {{
    "question": "Question about meaning?",
    "type": "multiple_choice",
    "choices": ["correct answer", "wrong1", "wrong2", "wrong3"],
    "answer": "correct answer"
  }},
  {{
    "question": "New paraphrased sentence with ___ missing.",
    "type": "fill_blank",
    "choices": null,
    "answer": "the missing word"
  }}
]"""

    raw    = _call_groq(prompt, max_tokens=1500)
    result = _extract_json(raw)

    if not isinstance(result, list):
        raise ValueError("Questions response is not a list")

    # Garantir exactement 10 questions
    if len(result) != 10:
        print(f"  ⚠️  {len(result)} questions reçues au lieu de 10 — on utilise ce qu'on a")

    return result[:10]  # max 10


# ─────────────────────────────────────────────────────────────────
# FONCTION PRINCIPALE — Génère + sauvegarde en base
# ─────────────────────────────────────────────────────────────────

def generate_and_save_practice(original_text, learner_level: str = "A1") -> int:
    """
    Génère un nouveau texte de pratique + 10 questions et les sauvegarde en base.

    Paramètres :
        original_text  : instance de ReadingText (le texte que l'apprenant vient de faire)
        learner_level  : niveau CEFR de l'apprenant (ex: "A1")

    Retourne :
        L'id (int) du nouveau ReadingText créé en base.

    Lève une Exception si la génération échoue.
    """
    # Import Django models ici pour éviter les imports circulaires
    from users.models import ReadingText, ReadingQuestion

    topic         = original_text.topic
    subunit       = original_text.sub_unit
    subunit_title = subunit.title

    print(f"\n🤖  Génération d'un texte de pratique GAI...")
    print(f"    Thème original : {topic}")
    print(f"    SubUnit        : {subunit_title}")
    print(f"    Niveau         : {learner_level}")

    # ── Étape 1 : Générer le texte ────────────────────────────────
    print(f"    📝  Génération du texte...")
    new_topic, new_content = _generate_text(topic, subunit_title, learner_level)
    print(f"    ✅  Texte généré : «{new_topic}» ({len(new_content)} caractères)")

    # ── Étape 2 : Générer les questions ──────────────────────────
    print(f"    ❓  Génération des questions...")
    time.sleep(2)  # pause pour éviter le rate limit Groq
    questions = _generate_questions(new_topic, new_content, learner_level)
    print(f"    ✅  {len(questions)} questions générées")

    # ── Étape 3 : Sauvegarder en base ────────────────────────────
    new_reading_text = ReadingText.objects.create(
        sub_unit       = subunit,
        topic          = f"[Practice] {new_topic}",
        content        = new_content,
        is_valid       = True,          # directement valide pour affichage
        coverage_score = None,          # pas de validation dictionnaire ici
    )

    for q in questions:
        ReadingQuestion.objects.create(
            text     = new_reading_text,
            question = q.get("question", ""),
            type     = q.get("type", "fill_blank"),
            choices  = q.get("choices"),
            answer   = q.get("answer", ""),
        )

    print(f"    💾  Sauvegardé en base — ReadingText id={new_reading_text.id}")
    return new_reading_text.id