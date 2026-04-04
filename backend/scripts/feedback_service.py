"""
feedback_service.py
─────────────────────────────────────────────────────────────────────
Module GAI : génère un feedback personnalisé pour chaque mauvaise
réponse de l'apprenant, en langage simple adapté au niveau A1.

Utilisation depuis views.py :
    from scripts.feedback_service import generate_feedback
    feedback = generate_feedback(text_content, wrong_answers, learner_level)
─────────────────────────────────────────────────────────────────────
"""

import json
import time
from groq import Groq

# ── CONFIG ────────────────────────────────────────────────────────
GROQ_API_KEY = ""
MODEL_NAME   = "llama-3.1-8b-instant"
# ──────────────────────────────────────────────────────────────────

client = Groq(api_key=GROQ_API_KEY)


def call_groq(prompt: str, retries: int = 3) -> str:
    """Appel API Groq avec retry automatique."""
    for attempt in range(retries):
        try:
            response = client.chat.completions.create(
                model=MODEL_NAME,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.4,
                max_tokens=1000,
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"  ⚠️  Groq error (attempt {attempt+1}/{retries}): {e}")
            time.sleep(5)
    raise Exception("❌ Groq API unreachable.")


def extract_json(text: str):
    """Extrait le JSON depuis la réponse (enlève les backticks markdown)."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text  = "\n".join(lines[1:-1])
    return json.loads(text)


def generate_feedback(
    text_content: str,
    wrong_answers: list[dict],
    learner_level: str = "A1"
) -> dict:
    """
    Génère un feedback personnalisé pour chaque mauvaise réponse.

    Paramètres :
        text_content   : le texte de l'exercice
        wrong_answers  : liste de dicts avec les clés :
                           - question_id  (int)
                           - question     (str)
                           - type         (true_false | multiple_choice | fill_blank)
                           - learner_answer (str)
                           - correct_answer (str)
        learner_level  : niveau CEFR de l'apprenant (A1, A2, B1...)

    Retourne :
        { question_id: "feedback text", ... }
    """
    if not wrong_answers:
        return {}

    # Construire la liste des erreurs pour le prompt
    errors_text = ""
    for i, err in enumerate(wrong_answers, 1):
        errors_text += f"""
Error {i}:
- Question: {err['question']}
- Type: {err['type']}
- Learner answered: {err['learner_answer']}
- Correct answer: {err['correct_answer']}
"""

    prompt = f"""You are a kind English teacher helping a {learner_level} beginner student.

The student read this passage:
---
{text_content[:1200]}
---

The student made these mistakes:
{errors_text}

For EACH mistake, write a short, encouraging feedback (2-3 sentences max).
Rules:
- Use VERY simple English (A1 level: short sentences, basic vocabulary)
- Be encouraging, never negative
- Explain WHY the correct answer is right (refer to the text when possible)
- For fill_blank: give a hint about the meaning of the missing word
- For true_false: explain what the text actually says
- For multiple_choice: explain why the correct option fits best

Respond ONLY with a valid JSON object, no explanation, no markdown:
{{
  "error_1": "Your feedback for error 1 here.",
  "error_2": "Your feedback for error 2 here.",
  ...
}}
"""

    raw      = call_groq(prompt)
    feedback_raw = extract_json(raw)

    # Mapper les feedbacks aux question_ids
    result = {}
    for i, err in enumerate(wrong_answers, 1):
        key      = f"error_{i}"
        feedback = feedback_raw.get(key, "")
        if feedback:
            result[err['question_id']] = feedback

    return result


def generate_global_feedback(score_percent: int, learner_level: str = "A1") -> str:
    """
    Génère un message global d'encouragement basé sur le score.
    Rapide — pas d'appel API, messages pré-définis selon le score.
    """
    if score_percent >= 90:
        return "Excellent work! You understood the text very well. Keep it up!"
    elif score_percent >= 70:
        return "Good job! You understood most of the text. Review the mistakes to improve."
    elif score_percent >= 50:
        return "Nice try! You understood some parts. Read the text again and try once more."
    else:
        return "Don't give up! Reading takes practice. Read the text slowly and try again."