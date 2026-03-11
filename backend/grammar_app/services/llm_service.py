import json
import openai
from django.conf import settings
class LLMQuestionGenerator:
    def __init__(self):
        openai.api_key = settings.OPENAI_API_KEY    
    def generate_questions(self, lesson_content, cefr_level,num_questions=5):
        prompt = f"""
Tu es un professeur d'anglais.Génère {num_questions} 
questions niveau {cefr_level}.COURS:{lesson_content}
Format JSON :
[{{
    "type": "true_false",
    "question": "...",
    "correct_answer": true/false,
    "explanation": "..."
  }}]
Réponds uniquement en JSON."""
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "user", "content": prompt}
            ],
            temperature=0.7 )      
        content = response.choices[0].message.content
        return json.loads(content)
    
