from django.db import models
import uuid

class Learner(models.Model):
    CEFR_CHOICES = [
        ('A1', 'A1 - Débutant'),
        ('A2', 'A2 - Élémentaire'),
        ('B1', 'B1 - Intermédiaire'),
        ('B2', 'B2 - Avancé'),
        ('C1', 'C1 - Autonome'),
       
    ]
    
    learner_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255)  # Stockera le hash
    cefr_level = models.CharField(
        max_length=2, 
        choices=CEFR_CHOICES, 
        default='A1',
        db_column='cefrlevel'
    )
    progress = models.IntegerField(default=0)

    class Meta:
        db_table = 'learner'

    def __str__(self):
        return f"{self.name} ({self.email})"
    

#  STRUCTURE : UNIT → SUBUNIT
# ─────────────────────────────────────────────
 
class Unit(models.Model):
    LEVEL_CHOICES = [
        ('A1', 'A1'), ('A2', 'A2'),
        ('B1', 'B1'), ('B2', 'B2'), ('C1', 'C1'),
    ]
 
    title = models.CharField(max_length=200)
    level = models.CharField(max_length=2, choices=LEVEL_CHOICES)
    order = models.PositiveIntegerField(default=0)
 
    class Meta:
        db_table = 'unit'
        ordering = ['level', 'order']
 
    def __str__(self):
        return f"[{self.level}] {self.title}"
 
 
class SubUnit(models.Model):
    unit  = models.ForeignKey(
        Unit,
        on_delete=models.CASCADE,
        related_name='subunits'
    )
    title = models.CharField(max_length=200)
    order = models.PositiveIntegerField(default=0)
 
    class Meta:
        db_table = 'subunit'
        ordering = ['order']
 
    def __str__(self):
        return f"{self.unit.title} / {self.title}"
 
 
# ─────────────────────────────────────────────
#  READING ACTIVITY
# ─────────────────────────────────────────────
 
class ReadingText(models.Model):
    """
    Plusieurs textes stockés par SubUnit (ForeignKey).
    → Tous stockés en base
    → 1 seul affiché à l'apprenant (le premier is_valid=True)
    Plus tard : grammar, vocabulary... aussi liés à SubUnit.
    """
    sub_unit       = models.ForeignKey(
        SubUnit,
        on_delete=models.CASCADE,
        related_name='reading_texts'   # subunit.reading_texts.all()
    )
    topic          = models.CharField(max_length=300)
    content        = models.TextField()
    is_valid       = models.BooleanField(default=False)
    coverage_score = models.FloatField(null=True, blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)
 
    class Meta:
        db_table = 'reading_text'
 
    def __str__(self):
        return f"{self.topic} ({self.sub_unit})"
 
    @property
    def level(self):
        return self.sub_unit.unit.level
 
 
class ReadingQuestion(models.Model):
    """
    Questions générées pour un ReadingText.
    Générées une seule fois, stockées et réutilisées.
    """
    QUESTION_TYPES = [
        ('true_false',      'True / False'),
        ('multiple_choice', 'Multiple Choice'),
        ('fill_blank',      'Fill in the Blank'),
    ]
 
    text     = models.ForeignKey(
        ReadingText,
        on_delete=models.CASCADE,
        related_name='questions'
    )
    question = models.TextField()
    type     = models.CharField(max_length=20, choices=QUESTION_TYPES)
 
    # true_false      → ["True", "False"]
    # multiple_choice → ["apple", "car", "book", "run"]
    # fill_blank      → null
    choices  = models.JSONField(null=True, blank=True)
    answer   = models.CharField(max_length=255)
 
    class Meta:
        db_table = 'reading_question'
 
    def __str__(self):
        return f"[{self.type}] {self.question[:60]}"
    

    # ─────────────────────────────────────────────
#  TEST DE NIVEAU CEFR
# ─────────────────────────────────────────────

class Niveau(models.Model):
    """
    Les 6 niveaux CEFR avec leur seuil de réussite.
    Pré-remplis via migration : A1→C2.
    """
    NIVEAU_CHOICES = [
        ('A1', 'A1'), ('A2', 'A2'),
        ('B1', 'B1'), ('B2', 'B2'),
        ('C1', 'C1'), ('C2', 'C2'),
    ]

    id              = models.CharField(max_length=2, primary_key=True, choices=NIVEAU_CHOICES)
    nom             = models.CharField(max_length=50)
    description     = models.TextField(blank=True)
    ordre           = models.PositiveIntegerField()
    seuil_reussite  = models.DecimalField(
        max_digits=4, decimal_places=2,
        default=0.60,
        help_text="Score minimum pour valider ce niveau (ex: 0.60 = 60%)"
    )

    class Meta:
        db_table = 'cefr_niveau'
        ordering = ['ordre']

    def __str__(self):
        return f"{self.id} - {self.nom}"


class TestAudio(models.Model):
    """
    Fichiers audio EXCLUSIVEMENT pour le test de niveau CEFR.
    Un même audio peut être utilisé dans plusieurs questions du test.
    Le champ niveau peut être rempli manuellement (si déjà connu) sinon par cefr_detector.py.
    """
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    fichier         = models.CharField(
        max_length=255,
        help_text="Ex: spontaneous-speech-en-71660.mp3"
    )
    transcription   = models.TextField(
        help_text="Texte transcrit de l'audio"
    )
    niveau_detecte  = models.ForeignKey(
        Niveau,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='test_audios',
        help_text="Peut être rempli manuellement ou automatiquement par cefr_detector.py"
    )
    duree_secondes  = models.PositiveIntegerField(null=True, blank=True)
    sujet           = models.CharField(
        max_length=200, blank=True,
        help_text="Ex: Sleep routine, Technology privacy..."
    )

    class Meta:
        db_table = 'cefr_test_audio'
        ordering = ['niveau_detecte__ordre']

    def __str__(self):
        niveau = self.niveau_detecte_id or '?'
        return f"[{niveau}] {self.sujet or self.fichier}"


class Question(models.Model):
    """
    Banque de questions du test CEFR.
    Couvre grammaire, vocabulaire et listening.
    """
    CATEGORIE_CHOICES = [
        ('grammar',    'Grammaire'),
        ('vocabulary', 'Vocabulaire'),
        ('listening',  'Listening'),
    ]
    TYPE_CHOICES = [
        ('fill_blank',   'Compléter avec propositions (1 ou 2 trous)'),
        ('manual_input', 'Saisie manuelle'),
        ('mcq',          'QCM classique'),
    ]

    id                = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    niveau            = models.ForeignKey(
        Niveau,
        on_delete=models.CASCADE,
        related_name='questions'
    )
    categorie         = models.CharField(
        max_length=20, choices=CATEGORIE_CHOICES,
        help_text="grammar | vocabulary | listening"
    )
    type              = models.CharField(
        max_length=20, choices=TYPE_CHOICES,
        help_text="fill_blank | manual_input | mcq"
    )
    enonce            = models.TextField(
        help_text="Phrase avec ___ pour les trous. Ex: He ___ the newspaper every day."
    )
    reponse_attendue  = models.TextField(
        help_text=(
            "Réponse correcte. Utiliser | comme séparateur :\n"
            "- 1 réponse       : 'reads'\n"
            "- 2 trous         : 'priest|professor'\n"
            "- synonymes       : 'information|data|info'\n"
            "- 2 bonnes rép.   : 'fake news|artificial intelligence'"
        )
    )
    options           = models.JSONField(
        null=True, blank=True,
        help_text="Propositions pour fill_blank et mcq. Ex: ['read','reads','readed','reading']"
    )
    audio             = models.ForeignKey(
        TestAudio,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='questions',
        help_text="Uniquement pour les questions listening"
    )
    ordre_dans_niveau = models.PositiveIntegerField(
        default=1,
        help_text="Ordre d'affichage dans le niveau (1, 2, 3...)"
    )
    points            = models.PositiveIntegerField(default=1)

    class Meta:
        db_table = 'cefr_question'
        ordering = ['niveau__ordre', 'categorie', 'ordre_dans_niveau']

    def __str__(self):
        return f"[{self.niveau_id}][{self.categorie}] {self.enonce[:60]}"

    def corriger(self, reponse_donnee):
        """
        Correction automatique.
        Gère : réponse simple, double trou (|), synonymes acceptés.
        """
        attendues = [r.strip().lower() for r in self.reponse_attendue.split('|')]
        donnees   = [r.strip().lower() for r in reponse_donnee.split('|')]

        if self.type in ('mcq', 'fill_blank') and len(donnees) == 1:
            return donnees[0] in attendues

        return all(d in attendues for d in donnees)


class Test(models.Model):
    """
    Session de test CEFR d'un apprenant.
    scores_par_niveau stocke le % obtenu à chaque niveau.
    La logique des 60% est appliquée dans calculer_niveau_final().
    """
    STATUT_CHOICES = [
        ('en_cours',  'En cours'),
        ('termine',   'Terminé'),
        ('abandonne', 'Abandonné'),
    ]

    id                = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    learner           = models.ForeignKey(
        Learner,
        on_delete=models.CASCADE,
        related_name='cefr_tests'
    )
    date_debut        = models.DateTimeField(auto_now_add=True)
    date_fin          = models.DateTimeField(null=True, blank=True)
    niveau_final      = models.ForeignKey(
        Niveau,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='tests_termines',
        help_text="Résultat calculé à la fin du test"
    )
    score_final       = models.DecimalField(
        max_digits=5, decimal_places=2,
        null=True, blank=True,
        help_text="Score global en %"
    )
    scores_par_niveau = models.JSONField(
        default=dict,
        help_text='Ex: {"A1": 100, "A2": 80, "B1": 60, "B2": 40, "C1": 20, "C2": 0}'
    )
    statut            = models.CharField(
        max_length=20, choices=STATUT_CHOICES,
        default='en_cours'
    )

    class Meta:
        db_table = 'cefr_test'
        ordering = ['-date_debut']

    def __str__(self):
        return f"Test {self.learner.name} ({self.learner.learner_id}) → {self.niveau_final_id or 'en cours'}"

    def calculer_niveau_final(self):
        """
        Niveau final = dernier niveau où score >= seuil_reussite.
        Ex : A1=100%, A2=80%, B1=60%, B2=40% → niveau final = B1
        """
        niveaux = Niveau.objects.order_by('ordre')
        niveau_final = niveaux.first()

        for niveau in niveaux:
            score        = self.scores_par_niveau.get(niveau.id, 0)
            seuil        = float(niveau.seuil_reussite) * 100
            if score >= seuil:
                niveau_final = niveau
            else:
                break

        return niveau_final


class Reponse(models.Model):
    """
    Réponse donnée par l'apprenant pour chaque question du test.
    La correction est automatique à la sauvegarde.
    """
    id                = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    test              = models.ForeignKey(Test, on_delete=models.CASCADE, related_name='reponses')
    question          = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='reponses')
    reponse_donnee    = models.TextField()
    est_correcte      = models.BooleanField(default=False)
    points_obtenus    = models.PositiveIntegerField(default=0)
    temps_reponse_sec = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="Temps pris pour répondre en secondes (optionnel)"
    )

    class Meta:
        db_table        = 'cefr_reponse'
        unique_together = ['test', 'question']

    def __str__(self):
        statut = '✓' if self.est_correcte else '✗'
        return f"{self.test} | {self.question.enonce[:30]} | {statut}"

    def save(self, *args, **kwargs):
        """Auto-correction à la sauvegarde."""
        self.est_correcte   = self.question.corriger(self.reponse_donnee)
        self.points_obtenus = self.question.points if self.est_correcte else 0
        super().save(*args, **kwargs)