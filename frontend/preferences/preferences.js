// État global
const state = {
    currentStep: 1,
    totalSteps: 6,
    reason: '',
    interests: [],
    otherInterest: '',
    learningStyle: '',
    otherLearningStyle: '',
    dailyGoal: '',
    userName: 'Utilisateur',
    otherInterestActive: false,
    otherStyleActive: false,
    levelOption: '',
    cefrLevel: '',
    learnerId: null
};

// Fonction pour récupérer l'ID depuis localStorage
function getLearnerId() {
    const storedId = localStorage.getItem('learner_id');
    if (storedId) {
        state.learnerId = parseInt(storedId);
        console.log('Learner ID récupéré:', state.learnerId);
        return state.learnerId;
    }
    console.warn('Aucun learner_id trouvé dans localStorage');
    return null;
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    getLearnerId();
    
    // Vérifier les paramètres URL (retour du test de niveau)
    const urlParams = new URLSearchParams(window.location.search);
    const stepParam = urlParams.get('step');
    const levelParam = urlParams.get('level');
    
    if (stepParam && stepParam === '6') {
        console.log('Retour du test de niveau, passage à l\'étape 6');
        state.currentStep = 6;
        
        if (levelParam && ['A1', 'A2', 'B1', 'B2', 'C1'].includes(levelParam.toUpperCase())) {
            state.cefrLevel = levelParam.toUpperCase();
            console.log('Niveau détecté:', state.cefrLevel);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }
    
    updateUI();
    document.getElementById('userName').textContent = state.userName;
    document.addEventListener('click', handleGlobalClick);
});

// Gestionnaire de clic global
function handleGlobalClick(event) {
    if (state.currentStep === 2 && state.otherInterestActive) {
        const container = document.getElementById('otherInterestContainer');
        const input = document.getElementById('otherInterestText');
        if (!container.contains(event.target) && input.value.trim() === '') {
            closeOtherInterest();
        }
    }
    
    if (state.currentStep === 3 && state.otherStyleActive) {
        const container = document.getElementById('otherStyleContainer');
        const input = document.getElementById('otherStyleText');
        if (!container.contains(event.target) && input.value.trim() === '') {
            closeOtherStyle();
        }
    }
}

// Navigation
function handleBack() {
    if (state.currentStep > 1) {
        state.currentStep--;
        updateUI();
    }
}

function handleNext() {
    console.log('=== handleNext START ===');
    console.log('Current step:', state.currentStep);
    console.log('Level option:', state.levelOption);
    
    // If we're on step 5
    if (state.currentStep === 5) {
        console.log('We are on step 5, levelOption =', state.levelOption);
        
        // If user chose "unknown" (need help) - REDIRECT TO LEVEL TEST
        if (state.levelOption === 'unknown') {
            console.log('✅ REDIRECTING TO leveltest/startlevel.html');
            window.location.href = '../leveltest/startlevel.html';
            return;
        }
        else if (state.levelOption === 'known') {
            console.log('Navigation to step 6');
            state.currentStep = 6;
            updateUI();
            return;
        }
        else {
            console.log('No level option selected yet');
            alert('Veuillez sélectionner une option');
            return;
        }
    }
    
    // Normal navigation for other steps
    if (state.currentStep < state.totalSteps) {
        state.currentStep++;
        updateUI();
    } 
    else if (state.currentStep === state.totalSteps) {
        finishQuiz();
    }
}

function updateUI() {
    const progress = (state.currentStep / state.totalSteps) * 100;
    const progressBar = document.getElementById('progressBar');
    if (progressBar) progressBar.style.width = `${progress}%`;
    
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        if (state.currentStep > 1) {
            backBtn.classList.add('visible');
        } else {
            backBtn.classList.remove('visible');
        }
    }
    
    document.querySelectorAll('.step').forEach((step, index) => {
        if (index + 1 === state.currentStep) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });
    
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
        if (state.currentStep === state.totalSteps) {
            nextBtn.textContent = 'Terminer';
        } else {
            nextBtn.textContent = 'Continuer';
        }
    }
    
    const currentStepDisplay = document.getElementById('currentStepDisplay');
    if (currentStepDisplay) currentStepDisplay.textContent = state.currentStep;
    
    checkCanProceed();
    restoreSelections();
}

function checkCanProceed() {
    const nextBtn = document.getElementById('nextBtn');
    let canProceed = false;
    
    switch (state.currentStep) {
        case 1:
            canProceed = state.reason !== '';
            break;
        case 2:
            canProceed = state.interests.length > 0 || state.otherInterest.trim() !== '';
            break;
        case 3:
            if (state.learningStyle === 'autre') {
                canProceed = state.otherLearningStyle.trim() !== '';
            } else {
                canProceed = state.learningStyle !== '';
            }
            break;
        case 4:
            canProceed = state.dailyGoal !== '';
            break;
        case 5:
            canProceed = state.levelOption !== '';
            break;
        case 6:
            canProceed = state.cefrLevel !== '';
            break;
    }
    
    console.log('checkCanProceed - étape:', state.currentStep, 'canProceed:', canProceed);
    if (nextBtn) nextBtn.disabled = !canProceed;
}

// Étape 1: Raison
function selectReason(reason) {
    state.reason = reason;
    document.querySelectorAll('#step1 .option-card').forEach(card => {
        card.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
    checkCanProceed();
    setTimeout(() => {
        if (state.currentStep === 1) handleNext();
    }, 400);
}

// Étape 2: Intérêts
function toggleInterest(interest, event) {
    if (state.otherInterestActive) {
        closeOtherInterest();
    }
    const index = state.interests.indexOf(interest);
    const btn = event.currentTarget;
    if (index > -1) {
        state.interests.splice(index, 1);
        btn.classList.remove('selected');
    } else {
        state.interests.push(interest);
        btn.classList.add('selected');
    }
    checkCanProceed();
}

function toggleOtherInterest(event) {
    event.stopPropagation();
    if (state.otherInterestActive) {
        closeOtherInterest();
    } else {
        openOtherInterest();
    }
}

function openOtherInterest() {
    state.otherInterestActive = true;
    document.getElementById('otherInterestBtn').classList.add('hidden');
    document.getElementById('otherInterestInput').classList.remove('hidden');
    document.getElementById('otherInterestText').focus();
}

function closeOtherInterest() {
    const input = document.getElementById('otherInterestText');
    if (input.value.trim() !== '') {
        return;
    }
    state.otherInterestActive = false;
    state.otherInterest = '';
    document.getElementById('otherInterestBtn').classList.remove('hidden');
    document.getElementById('otherInterestInput').classList.add('hidden');
    checkCanProceed();
}

function updateOtherInterest(value) {
    state.otherInterest = value;
    checkCanProceed();
}

// Étape 3: Style
function selectLearningStyle(style) {
    if (state.otherStyleActive && style !== 'autre') {
        closeOtherStyle();
    }
    state.learningStyle = style;
    if (style !== 'autre') {
        state.otherLearningStyle = '';
    }
    document.querySelectorAll('#step3 .option-row').forEach(row => {
        if (!row.classList.contains('other-btn') && !row.closest('.other-option-container')) {
            row.classList.remove('selected');
        }
    });
    if (style !== 'autre') {
        event.currentTarget.classList.add('selected');
    }
    checkCanProceed();
    if (style !== 'autre') {
        setTimeout(() => {
            if (state.currentStep === 3) handleNext();
        }, 400);
    }
}

function toggleOtherStyle(event) {
    event.stopPropagation();
    if (state.otherStyleActive) {
        closeOtherStyle();
    } else {
        openOtherStyle();
    }
}

function openOtherStyle() {
    state.otherStyleActive = true;
    state.learningStyle = 'autre';
    document.getElementById('otherStyleBtn').classList.add('hidden');
    document.getElementById('otherStyleInput').classList.remove('hidden');
    document.getElementById('otherStyleText').focus();
    document.querySelectorAll('#step3 .option-row').forEach(row => {
        if (!row.classList.contains('other-btn') && !row.closest('.other-option-container')) {
            row.classList.remove('selected');
        }
    });
    checkCanProceed();
}

function closeOtherStyle() {
    const input = document.getElementById('otherStyleText');
    if (input.value.trim() !== '') {
        return;
    }
    state.otherStyleActive = false;
    state.learningStyle = '';
    document.getElementById('otherStyleBtn').classList.remove('hidden');
    document.getElementById('otherStyleInput').classList.add('hidden');
    checkCanProceed();
}

function updateOtherStyle(value) {
    state.otherLearningStyle = value;
    checkCanProceed();
}

// Étape 4: Objectif
function selectDailyGoal(goal) {
    state.dailyGoal = goal;
    document.querySelectorAll('#step4 .option-row').forEach(row => {
        row.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
    checkCanProceed();
    setTimeout(() => {
        if (state.currentStep === 4) handleNext();
    }, 400);
}

// Étape 5: Niveau
function selectLevelOption(option) {
    console.log('selectLevelOption appelé avec:', option);
    state.levelOption = option;
    document.querySelectorAll('#step5 .level-card').forEach(card => {
        card.classList.remove('selected');
    });
    const clickedCard = option === 'known' 
        ? document.querySelector('#step5 .level-card:first-child')
        : document.querySelector('#step5 .level-card:last-child');
    if (clickedCard) {
        clickedCard.classList.add('selected');
    }
    checkCanProceed();
}

// Étape 6: CEFR
function selectCEFRLevel(level, element) {
    console.log('selectCEFRLevel appelé avec:', level);
    state.cefrLevel = level;
    document.querySelectorAll('#step6 .cefr-card-full').forEach(card => {
        card.classList.remove('selected');
    });
    element.classList.add('selected');
    checkCanProceed();
}

// Sauvegarde du niveau
async function saveCefrLevel() {
    if (!state.learnerId) {
        console.error('Impossible de sauvegarder: learner_id manquant');
        return { success: false, error: 'Utilisateur non connecté' };
    }
    
    if (!state.cefrLevel) {
        console.error('Impossible de sauvegarder: niveau CEFR manquant');
        return { success: false, error: 'Niveau CEFR non sélectionné' };
    }
    
    const validLevels = ['A1', 'A2', 'B1', 'B2', 'C1'];
    if (!validLevels.includes(state.cefrLevel.toUpperCase())) {
        return { success: false, error: 'Niveau CEFR invalide' };
    }
    
    try {
        const response = await fetch('http://localhost:8000/api/save-preferences/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                learner_id: state.learnerId,
                cefr_level: state.cefrLevel,
                progress: 10
            })
        });
        
        const result = await response.json();
        console.log('Réponse du serveur:', result);
        return result;
        
    } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        return { success: false, error: error.message };
    }
}

// Clavier
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !document.getElementById('nextBtn').disabled) {
        if (document.activeElement.tagName === 'INPUT') {
            return;
        }
        handleNext();
    }
    if (e.key === 'Escape') {
        if (state.otherInterestActive) closeOtherInterest();
        if (state.otherStyleActive) closeOtherStyle();
    }
});

function restoreSelections() {
    if (state.reason) {
        const cards = document.querySelectorAll('#step1 .option-card');
        const reasonMap = ['voyage', 'travail', 'etudes', 'culture', 'communication'];
        const index = reasonMap.indexOf(state.reason);
        if (index > -1 && cards[index]) cards[index].classList.add('selected');
    }
    
    state.interests.forEach(interest => {
        const buttons = document.querySelectorAll('#step2 .option-row');
        const interestMap = ['voyage-tourisme', 'business', 'cinema', 'musique', 'sport'];
        const index = interestMap.indexOf(interest);
        if (index > -1 && buttons[index]) buttons[index].classList.add('selected');
    });
    
    if (state.otherInterestActive || state.otherInterest.trim() !== '') {
        const otherBtn = document.getElementById('otherInterestBtn');
        const otherInput = document.getElementById('otherInterestInput');
        const otherText = document.getElementById('otherInterestText');
        if (otherBtn) otherBtn.classList.add('hidden');
        if (otherInput) otherInput.classList.remove('hidden');
        if (otherText) otherText.value = state.otherInterest;
        state.otherInterestActive = true;
    } else {
        const otherBtn = document.getElementById('otherInterestBtn');
        const otherInput = document.getElementById('otherInterestInput');
        if (otherBtn) otherBtn.classList.remove('hidden');
        if (otherInput) otherInput.classList.add('hidden');
        state.otherInterestActive = false;
    }
    
    if (state.learningStyle && state.learningStyle !== 'autre') {
        const buttons = document.querySelectorAll('#step3 .option-row');
        const styleMap = ['video', 'texte', 'audio'];
        const index = styleMap.indexOf(state.learningStyle);
        if (index > -1 && buttons[index]) buttons[index].classList.add('selected');
    }
    
    if (state.otherStyleActive || (state.learningStyle === 'autre' && state.otherLearningStyle.trim() !== '')) {
        const otherBtn = document.getElementById('otherStyleBtn');
        const otherInput = document.getElementById('otherStyleInput');
        const otherText = document.getElementById('otherStyleText');
        if (otherBtn) otherBtn.classList.add('hidden');
        if (otherInput) otherInput.classList.remove('hidden');
        if (otherText) otherText.value = state.otherLearningStyle;
        state.otherStyleActive = true;
    } else {
        const otherBtn = document.getElementById('otherStyleBtn');
        const otherInput = document.getElementById('otherStyleInput');
        if (otherBtn) otherBtn.classList.remove('hidden');
        if (otherInput) otherInput.classList.add('hidden');
        state.otherStyleActive = false;
    }
    
    if (state.dailyGoal) {
        const buttons = document.querySelectorAll('#step4 .option-row');
        const goalMap = ['5min', '10min', '15min', '25min'];
        const index = goalMap.indexOf(state.dailyGoal);
        if (index > -1 && buttons[index]) buttons[index].classList.add('selected');
    }
    
    if (state.levelOption) {
        const levelCards = document.querySelectorAll('#step5 .level-card');
        if (state.levelOption === 'known' && levelCards[0]) {
            levelCards[0].classList.add('selected');
        } else if (state.levelOption === 'unknown' && levelCards[1]) {
            levelCards[1].classList.add('selected');
        }
    }
    
    if (state.cefrLevel) {
        const cefrCards = document.querySelectorAll('#step6 .cefr-card-full');
        cefrCards.forEach(card => {
            if (card.getAttribute('data-level') === state.cefrLevel) {
                card.classList.add('selected');
            }
        });
    }
}

async function finishQuiz() {
    const finalData = {
        reason: state.reason,
        interests: [...state.interests],
        learningStyle: state.learningStyle === 'autre' ? state.otherLearningStyle : state.learningStyle,
        dailyGoal: state.dailyGoal,
        levelOption: state.levelOption,
        cefrLevel: state.cefrLevel
    };
    
    if (state.otherInterest.trim()) {
        finalData.interests.push(state.otherInterest);
    }
    
    console.log('Préférences finales:', finalData);
    
    if (state.learnerId && state.cefrLevel) {
        const result = await saveCefrLevel();
        
        if (result.success) {
            alert('Votre niveau ' + result.cefr_level + ' a été enregistré avec succès !');
            window.location.href = '../home/home.html';
        } else {
            alert('Erreur lors de l\'enregistrement: ' + (result.error || 'Erreur inconnue'));
        }
    } else {
        window.location.href = '../home/home.html';
    }
}