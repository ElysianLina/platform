from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
import os
from django.contrib import admin
from django.urls import path
from users import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.home_view, name='home'),
    path('api/login/', views.login_api, name='login_api'),
    path('api/register/', views.register_api, name='register_api'),
    path('api/preferences/', views.preferences_api, name='preferences_api'),
    path('api/save-preferences/', views.save_preferences_api, name='save_preferences_api'),
    path('api/learner/', views.get_learner_api, name='get_learner_api'),
    path('api/logout/', views.logout_api, name='logout_api'),
    path('api/units/', views.get_units_api, name='get_units_api'),
    path('api/reading-exercise/', views.get_reading_exercise_api, name='get_reading_exercise_api'),
    path('api/submit-exercise/', views.submit_exercise_api, name='submit_exercise_api'),
    path('api/generate-practice/', views.generate_practice_api, name='generate_practice'),
    path('frontend/<str:folder>/<str:filename>', views.serve_frontend, name='serve_frontend'),
    path('frontend/<path:path>', serve, {
    'document_root': os.path.join(str(settings.BASE_DIR), '..', 'frontend')
}),

  
]
