"""
URL configuration for Django_prj project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from users import views

urlpatterns = [
    path('admin/', admin.site.urls),
    
     # AJOUT : URL pour la page d'accueil
    # ============================================================
    path('', views.home_view, name='home'),
   
   # NOUVEAU : URL pour l'API de connexion
    # ============================================================
    path('api/login/', views.login_api, name='login_api'),

    path('api/register/', views.register_api, name='register_api'),
    path('api/preferences/', views.preferences_api, name='preferences_api'),
    path('api/save-preferences/', views.save_preferences_api, name='save_preferences_api'),
    # AJOUT : Nouvelle URL pour récupérer les données du learner sur le dashboard
    path('api/learner/', views.get_learner_api, name='get_learner_api'),
     # AJOUT : Nouvelle URL pour la déconnexion via le dropdown
    # ============================================================
    path('api/logout/', views.logout_api, name='logout_api'),


     # NOUVELLES URLS POUR LES DONNÉES DYNAMIQUES
    # ============================================================
    path('api/units/', views.get_units_api, name='get_units_api'),
    path('api/reading-exercise/', views.get_reading_exercise_api, name='get_reading_exercise_api'),
    path('api/submit-exercise/', views.submit_exercise_api, name='submit_exercise_api'),

     
]