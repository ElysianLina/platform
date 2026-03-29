from django.http import JsonResponse, FileResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import redirect
import json
import os
from .forms import RegisterForm
from .models import Learner , Unit, SubUnit, ReadingText, ReadingQuestion
from django.contrib.auth.hashers import check_password
from django.db.models import Exists, OuterRef 
# ============================================================
# NOUVEAU : Vue pour servir la page d'accueil (home.html)
# Cette vue permet d'accéder à home.html via le serveur Django
# ============================================================
def home_view(request):
    """
    Sert le fichier home.html depuis le dossier frontend/home/
    Accessible via l'URL : http://localhost:8000/ ou http://localhost:8000/home/
    """
    # Chemin absolu vers le fichier home.html
    # On remonte de 3 niveaux : users/views.py -> users/ -> backend/ -> PLATFORM/ -> frontend/home/
    current_dir = os.path.dirname(os.path.abspath(__file__))
    home_path = os.path.join(current_dir, '..', '..', '..', 'frontend', 'home', 'home.html')
    home_path = os.path.normpath(home_path)  # Normalise le chemin
    
    # Vérifier que le fichier existe
    if os.path.exists(home_path):
        return FileResponse(open(home_path, 'rb'))
    else:
        return HttpResponse(f"Fichier home.html non trouvé à : {home_path}", status=404)

@csrf_exempt
def login_api(request):
    """
    API pour connecter un utilisateur existant
    Vérifie l'email et le mot de passe dans la table Learner
    Retourne : learner_id, name, email, cefr_level, progress
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            email = data.get('email')
            password = data.get('password')
            
            # Validation des champs requis
            if not email or not password:
                return JsonResponse({
                    'success': False,
                    'errors': ['Email et mot de passe requis']
                }, status=400)
            
            # Recherche de l'utilisateur dans PostgreSQL
            try:
                learner = Learner.objects.get(email=email)
            except Learner.DoesNotExist:
                return JsonResponse({
                    'success': False,
                    'errors': ['Email ou mot de passe incorrect']
                }, status=401)
            
            # Vérification du mot de passe
            # NOTE : Si tu utilises Django AbstractBaseUser, utilise learner.check_password()
            # Sinon, compare directement si le hash est géré manuellement
            if not check_password(password, learner.password):
                return JsonResponse({
                    'success': False,
                    'errors': ['Email ou mot de passe incorrect']
                }, status=401)
            
            # Connexion réussie - Retourne toutes les infos pour home.html
            return JsonResponse({
                'success': True,
                'message': 'Connexion réussie',
                'learner': {
                    'learner_id': str(learner.learner_id),
                    'name': learner.name,
                    'email': learner.email,
                    'cefr_level': learner.cefr_level,
                    'progress': learner.progress
                }
            })
            
        except json.JSONDecodeError:
            return JsonResponse({
                'success': False,
                'errors': ['Données JSON invalides']
            }, status=400)
        except Exception as e:
            return JsonResponse({
                'success': False,
                'errors': [str(e)]
            }, status=500)
    
    return JsonResponse({
        'success': False,
        'errors': ['Méthode non autorisée']
    }, status=405)

@csrf_exempt
def register_api(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            form = RegisterForm({
                'name': data.get('name'),
                'email': data.get('email'),
                'password': data.get('password'),
                'confirm_password': data.get('confirm_password'),
                'accept_terms': data.get('accept_terms')
            })
            
            if form.is_valid():
                learner = form.save()
                return JsonResponse({
                    'success': True,
                    'message': 'Compte créé avec succès',
                    'learner_id': learner.learner_id,
                    'name': learner.name,
                    'email': learner.email,
                    'cefr_level': learner.cefr_level,
                    'progress': learner.progress
                })
            else:
                errors = []
                for field, error_list in form.errors.items():
                    for error in error_list:
                        errors.append(str(error))
                return JsonResponse({
                    'success': False,
                    'errors': errors
                }, status=400)
                
        except json.JSONDecodeError:
            return JsonResponse({
                'success': False,
                'errors': ['Données invalides']
            }, status=400)
    
    return JsonResponse({
        'success': False,
        'errors': ['Méthode non autorisée']
    }, status=405)


@csrf_exempt
def preferences_api(request):
    """API pour récupérer les préférences de l'utilisateur"""
    if request.method == 'GET':
        learner_id = request.GET.get('learner_id')
        
        if not learner_id:
            return JsonResponse({
                'success': False,
                'errors': ['ID utilisateur manquant']
            }, status=400)
        
        try:
            learner = Learner.objects.get(learner_id=learner_id)
            return JsonResponse({
                'success': True,
                'learner': {
                    'learner_id': learner.learner_id,
                    'name': learner.name,
                    'email': learner.email,
                    'cefr_level': learner.cefr_level,
                    'progress': learner.progress
                }
            })
        except Learner.DoesNotExist:
            return JsonResponse({
                'success': False,
                'errors': ['Utilisateur non trouvé']
            }, status=404)
    
    return JsonResponse({
        'success': False,
        'errors': ['Méthode non autorisée']
    }, status=405)


@csrf_exempt
def save_preferences_api(request):
    """API pour sauvegarder le niveau CEFR de l'utilisateur"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            learner_id = data.get('learner_id')
            cefr_level = data.get('cefr_level')
            
            # Validation
            if not learner_id:
                return JsonResponse({
                    'success': False,
                    'error': 'ID utilisateur manquant'
                }, status=400)
            
            if not cefr_level:
                return JsonResponse({
                    'success': False,
                    'error': 'Niveau CEFR manquant'
                }, status=400)
            
            # Vérifier que le niveau est valide (A1 à C1 uniquement, pas C2)
            valid_levels = ['A1', 'A2', 'B1', 'B2', 'C1']
            if cefr_level.upper() not in valid_levels:
                return JsonResponse({
                    'success': False,
                    'error': f'Niveau CEFR invalide: {cefr_level}'
                }, status=400)
            
            # Récupérer et mettre à jour l'utilisateur
            try:
                learner = Learner.objects.get(learner_id=learner_id)
            except Learner.DoesNotExist:
                return JsonResponse({
                    'success': False,
                    'error': 'Utilisateur non trouvé'
                }, status=404)
            
            # Mettre à jour le niveau CEFR
            learner.cefr_level = cefr_level.upper()
            learner.save()
            
            return JsonResponse({
                'success': True,
                'message': 'Niveau CEFR enregistré avec succès',
                'learner_id': learner.learner_id,
                'cefr_level': learner.cefr_level
            })
            
        except json.JSONDecodeError:
            return JsonResponse({
                'success': False,
                'error': 'Données JSON invalides'
            }, status=400)
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=500)
    
    return JsonResponse({
        'success': False,
        'error': 'Méthode non autorisée'
    }, status=405)


# ============================================================
# MODIFIÉ : get_learner_api - Ajout de l'email dans la réponse
# Nécessaire pour afficher l'email dans le dropdown de profil
# ============================================================
@csrf_exempt
def get_learner_api(request):
    """
    API pour récupérer les données de l'utilisateur connecté
    Utilisée par la page d'accueil (home) pour afficher nom et niveau
    ET maintenant aussi pour le dropdown de profil (email inclus)
    """
    if request.method == 'GET':
        learner_id = request.GET.get('learner_id')
        
        if not learner_id:
            return JsonResponse({
                'success': False,
                'error': 'ID utilisateur manquant'
            }, status=400)
        
        try:
            learner = Learner.objects.get(learner_id=learner_id)
            
            # MODIFIÉ : Ajout explicite de l'email pour le dropdown
            return JsonResponse({
                'success': True,
                'learner': {
                    'learner_id': learner.learner_id,
                    'name': learner.name,                    # Pour "Bienvenue, [nom]!"
                    'email': learner.email,                  # POUR LE DROPDOWN: affichage email
                    'cefr_level': learner.cefr_level,        # Pour "Niveau CEFR: [X]"
                    'progress': learner.progress             # Pour la barre de progression
                }
            })
        except Learner.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Utilisateur non trouvé'
            }, status=404)
    
    return JsonResponse({
        'success': False,
        'error': 'Méthode non autorisée'
    }, status=405)


# ============================================================
# NOUVEAU : logout_api
# API pour gérer la déconnexion depuis le dropdown de profil
# ============================================================
@csrf_exempt
def logout_api(request):
    """
    API pour déconnecter l'utilisateur
    Appelée quand on clique sur "Se déconnecter" dans le dropdown
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            learner_id = data.get('learner_id')
            
            # AJOUT : On peut logger la déconnexion si besoin
            # ou invalider des tokens si tu utilises JWT
            
            return JsonResponse({
                'success': True,
                'message': 'Déconnexion réussie'
            })
        except json.JSONDecodeError:
            return JsonResponse({
                'success': False,
                'error': 'Données invalides'
            }, status=400)
    
    return JsonResponse({
        'success': False,
        'error': 'Méthode non autorisée'
    }, status=405)


# NOUVELLES API POUR CHARGER LES DONNÉES DYNAMIQUEMENT
# ============================================================

@csrf_exempt
@csrf_exempt
def get_units_api(request):
    """
    API pour récupérer les unités avec leurs sous-unités
    → EXCLUT "Other Topics" (textes répétés)
    → Ne récupère que les sous-unités avec AU MOINS UN texte is_valid=True
    → Filtre les doublons par titre (même nom de sous-unité)
    → UNE SEULE sous-unité = lien direct (is_single_subunit: true)
    → PLUSIEURS sous-unités = accordéon (is_single_subunit: false)
    → SKIP les unités sans sous-unités valides
    """
    if request.method == 'GET':
        try:
            # 🔥 FILTRE 1: Exclure "Other Topics" (contient des textes répétés)
            units = Unit.objects.exclude(
                title__icontains='Other Topics'
            ).order_by('level', 'order')
            
            units_data = []
            
            for index, unit in enumerate(units, 1):
                # 🔥 FILTRE 2: Sous-unités avec au moins un texte valide (is_valid=True)
                subunits = SubUnit.objects.filter(
                    unit=unit,
                    reading_texts__is_valid=True
                ).distinct().order_by('order')
                
                # 🔥 FILTRE 3: Ne garder qu'une seule sous-unité par titre (doublons)
                seen_titles = set()
                unique_subunits = []
                for subunit in subunits:
                    if subunit.title not in seen_titles:
                        seen_titles.add(subunit.title)
                        unique_subunits.append(subunit)

                unit_number = str(index).zfill(2)

                # 🔥 CAS 1: AUCUNE SOUS-UNITÉ → SKIP (pas d'affichage)
                if len(unique_subunits) == 0:
                    
                    continue  # Passe à l'unité suivante

                # 🔥 CAS 2: UNE SEULE SOUS-UNITÉ → LIEN DIRECT
                if len(unique_subunits) == 1:
                    sub = unique_subunits[0]
                    units_data.append({
                        'id': unit.id,
                        'title': unit.title,
                        'level': unit.level,
                        'order': unit.order,
                        'display_number': unit_number,
                        'is_single_subunit': True,  # ← Flag pour lien direct
                        'subunit': {  # ← Objet unique (pas tableau)
                            'id': sub.id,
                            'title': sub.title,
                            'code': f"{unit.level}.1",
                            'order': sub.order
                        },
                        'subunits': []  # Tableau vide pour compatibilité
                    })
                
                # 🔥 CAS 3: PLUSIEURS SOUS-UNITÉS → ACCORDÉON CLASSIQUE
                else:
                    subunits_data = []
                    for idx, subunit in enumerate(unique_subunits, 1):
                        subunits_data.append({
                            'id': subunit.id,
                            'title': subunit.title,
                            'order': subunit.order,
                            'code': f"{unit.level}.{idx}"
                        })
                    
                    units_data.append({
                        'id': unit.id,
                        'title': unit.title,
                        'level': unit.level,
                        'order': unit.order,
                        'display_number': unit_number,
                        'is_single_subunit': False,  # ← Flag pour accordéon
                        'subunits': subunits_data  # ← Tableau de sous-unités
                    })
            
            return JsonResponse({
                'success': True,
                'units': units_data
            })
            
        except Exception as e:
            import traceback
           
           
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=500)
    
    return JsonResponse({
        'success': False,
        'error': 'Méthode non autorisée'
    }, status=405)


@csrf_exempt
def get_reading_exercise_api(request):
    """
    API pour récupérer l'exercice de compréhension écrite d'une sous-unité
    → Retourne le PREMIER texte où is_valid=True (un seul par sous-unité)
    """
    if request.method == 'GET':
        try:
            subunit_id = request.GET.get('subunit_id')
            subunit_code = request.GET.get('subunit_code')
            
            # Convertir subunit_code en subunit_id si nécessaire
            if subunit_code and not subunit_id:
                try:
                    parts = subunit_code.split('.')
                    level = parts[0]
                    sub_order = int(parts[1])
                    # Trouver l'unité par level et order
                    unit = Unit.objects.filter(level=level).first()
                    if unit:
                        subunit = SubUnit.objects.filter(unit=unit, order=sub_order).first()
                        if subunit:
                            subunit_id = subunit.id
                except:
                    pass
            
            if not subunit_id:
                return JsonResponse({
                    'success': False,
                    'error': 'ID de sous-unité manquant'
                }, status=400)
            
            # Récupérer la sous-unité
            try:
                subunit = SubUnit.objects.get(id=subunit_id)
            except SubUnit.DoesNotExist:
                return JsonResponse({
                    'success': False,
                    'error': 'Sous-unité non trouvée'
                }, status=404)
            
            # Récupérer UN SEUL texte validé (le premier)
            # → Plusieurs textes stockés, 1 seul affiché (is_valid=True)
            reading_text = ReadingText.objects.filter(
                sub_unit=subunit,
                is_valid=True
            ).first()  # Prend le premier uniquement
            
            if not reading_text:
                return JsonResponse({
                    'success': False,
                    'error': 'Aucun texte validé disponible pour cette sous-unité'
                }, status=404)
            
            # Récupérer les questions associées à ce texte
            questions = reading_text.questions.all().order_by('id')
            questions_data = []
            
            for idx, question in enumerate(questions, 1):
                q_data = {
                    'id': question.id,
                    'number': idx,
                    'question': question.question,
                    'type': question.type,
                    'choices': question.choices or [],
                    'answer': question.answer
                }
                questions_data.append(q_data)
            
            return JsonResponse({
                'success': True,
                'exercise': {
                    'subunit': {
                        'id': subunit.id,
                        'title': subunit.title,
                        'unit_title': subunit.unit.title
                    },
                    'text': {
                        'id': reading_text.id,
                        'topic': reading_text.topic,
                        'content': reading_text.content
                    },
                    'questions': questions_data,
                    'total_questions': len(questions_data)
                }
            })
            
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=500)
    
    return JsonResponse({
        'success': False,
        'error': 'Méthode non autorisée'
    }, status=405)


@csrf_exempt
def submit_exercise_api(request):
    """
    API pour soumettre les réponses et les corriger
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            exercise_id = data.get('exercise_id')
            answers = data.get('answers', {})
            learner_id = data.get('learner_id')
            
            if not exercise_id or not answers:
                return JsonResponse({
                    'success': False,
                    'error': 'Données manquantes'
                }, status=400)
            
            try:
                reading_text = ReadingText.objects.get(id=exercise_id)
            except ReadingText.DoesNotExist:
                return JsonResponse({
                    'success': False,
                    'error': 'Exercice non trouvé'
                }, status=404)
            
            results = []
            correct_count = 0
            total = len(answers)
            
            for question_id, user_answer in answers.items():
                try:
                    question = ReadingQuestion.objects.get(id=question_id, text=reading_text)
                    
                    correct = False
                    user_ans = str(user_answer).strip()
                    correct_ans = str(question.answer).strip()
                    
                    # Variables pour l'affichage
                    correct_answer_display = correct_ans  # Par défaut: valeur brute
                    user_answer_display = user_ans
                    
                    if question.type == 'true_false':
                        # Comparer true/false (insensible à la casse)
                        correct = user_ans.lower() == correct_ans.lower()
                        # Formater pour l'affichage
                        correct_answer_display = "Vrai" if correct_ans.lower() == 'true' else "Faux"
                        user_answer_display = "Vrai" if user_ans.lower() == 'true' else "Faux"
                        
                    elif question.type == 'multiple_choice':
                        letter_map = {'a': 0, 'b': 1, 'c': 2, 'd': 3}
                        
                        # Traiter la réponse de l'utilisateur
                        if question.choices and user_ans.lower() in letter_map:
                            idx = letter_map[user_ans.lower()]
                            if idx < len(question.choices):
                                user_value = question.choices[idx].strip()
                                user_answer_display = f"{user_ans.upper()}. {user_value}"
                                # Comparer avec la réponse attendue
                                correct = user_value.lower() == correct_ans.lower()
                        else:
                            correct = user_ans.lower() == correct_ans.lower()
                        
                        # Trouver la lettre de la bonne réponse
                        if question.choices:
                            for idx, choice in enumerate(question.choices):
                                if choice.strip().lower() == correct_ans.lower():
                                    letter = chr(97 + idx)  # 0->a, 1->b, etc.
                                    correct_answer_display = f"{letter.upper()}. {choice.strip()}"
                                    break
                        
                    else:  # fill_blank
                        # Comparaison insensible à la casse
                        correct = user_ans.lower() == correct_ans.lower()
                        correct_answer_display = correct_ans
                    
                    if correct:
                        correct_count += 1
                    
                    results.append({
                        'question_id': question_id,
                        'correct': correct,
                        'user_answer': user_answer_display,  # Formaté: "B. Lyon"
                        'correct_answer': correct_answer_display  # Formaté: "B. Lyon"
                    })
                    
                except ReadingQuestion.DoesNotExist:
                    continue
            
            score = round((correct_count / total) * 100) if total > 0 else 0
            
            return JsonResponse({
                'success': True,
                'score': score,
                'correct_count': correct_count,
                'total': total,
                'results': results
            })
            
        except json.JSONDecodeError:
            return JsonResponse({
                'success': False,
                'error': 'Données JSON invalides'
            }, status=400)
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=500)
    
    return JsonResponse({
        'success': False,
        'error': 'Méthode non autorisée'
    }, status=405)