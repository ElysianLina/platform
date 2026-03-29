// ============================================
// comprehension-ecrite.js - Dynamic loading from database
// → One text per sub-unit (the first is_valid=True)
// ============================================

let currentExercise = null;

// Get subunit info from URL or localStorage
function getSubunitInfo() {
    const params = new URLSearchParams(window.location.search);
    return {
        subunit: params.get('subunit') || localStorage.getItem('currentSubunit') || '1.1',
        subunitId: params.get('subunit_id') || localStorage.getItem('currentSubunitId'),
        title: params.get('title') || localStorage.getItem('currentSubunitTitle') || 'Introducing Yourself'
    };
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    const { subunit, subunitId, title } = getSubunitInfo();
    
    // Update page title
    const pageTitleEl = document.getElementById('page-title');
    if (pageTitleEl) pageTitleEl.textContent = title;
    
    // Update back link
    const backLink = document.getElementById('back-link');
    if (backLink) {
        backLink.href = `exercise-menu.html?subunit=${subunit}&title=${encodeURIComponent(title)}`;
    }
    
    // Load exercise from database (one validated text only)
    loadExercise(subunitId, subunit);
    
    // Form submission
    const form = document.getElementById('exercise-form');
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
});

// ============================================
// EXERCISE LOADING (one validated text per sub-unit)
// ============================================

async function loadExercise(subunitId, subunitCode) {
    const readingContainer = document.getElementById('reading-text');
    const questionsContainer = document.querySelector('.questions-form');
    const totalEl = document.getElementById('total-q');
    
    // Show loading
    readingContainer.innerHTML = '<div class="loading-message"><i class="fas fa-spinner fa-spin"></i> Loading text...</div>';
    questionsContainer.innerHTML = '<div class="loading-message"><i class="fas fa-spinner fa-spin"></i> Loading questions...</div>';
    
    try {
        // Build URL with subunit_id or subunit_code
        let url = 'http://localhost:8000/api/reading-exercise/?';
        if (subunitId) {
            url += `subunit_id=${subunitId}`;
        } else {
            url += `subunit_code=${subunitCode}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success && data.exercise) {
            currentExercise = data.exercise;
            if (totalEl) totalEl.textContent = data.exercise.total_questions;
            renderExercise(data.exercise);
        } else {
            throw new Error(data.error || 'Loading error');
        }
    } catch (error) {
        console.error('Error loading exercise:', error);
        readingContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                Unable to load exercise.<br>
                <small>${error.message}</small><br>
                <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; cursor: pointer;">
                    Retry
                </button>
            </div>
        `;
        questionsContainer.innerHTML = '';
    }
}

function renderExercise(exercise) {
    // Render text
    const readingContainer = document.getElementById('reading-text');
    readingContainer.innerHTML = `
        <h3>${exercise.text.topic}</h3>
        ${exercise.text.content.split('\n\n').map(p => `<p>${p.trim()}</p>`).join('')}
    `;
    
    // Render questions
    const questionsContainer = document.querySelector('.questions-form');
    
    // Group questions by type
    const trueFalseQuestions = exercise.questions.filter(q => q.type === 'true_false');
    const mcQuestions = exercise.questions.filter(q => q.type === 'multiple_choice');
    const fillBlankQuestions = exercise.questions.filter(q => q.type === 'fill_blank');
    
    let html = '';
    let questionCounter = 1;
    
    // True/False Section
    if (trueFalseQuestions.length > 0) {
        html += `
            <div class="question-group">
                <h3 class="group-title">A. True or False</h3>
                <p class="group-instruction">Read the statements and check True or False</p>
        `;
        
        trueFalseQuestions.forEach(q => {
            html += createTrueFalseQuestion(q, questionCounter++);
        });
        
        html += '</div>';
    }
    
    // Multiple Choice Section
    if (mcQuestions.length > 0) {
        html += `
            <div class="question-group">
                <h3 class="group-title">B. Multiple Choice</h3>
                <p class="group-instruction">Choose the correct answer</p>
        `;
        
        mcQuestions.forEach(q => {
            html += createMultipleChoiceQuestion(q, questionCounter++);
        });
        
        html += '</div>';
    }
    
    // Fill in the Blank Section
    if (fillBlankQuestions.length > 0) {
        html += `
            <div class="question-group">
                <h3 class="group-title">C. Fill in the Blanks</h3>
                <p class="group-instruction">Write the correct answer in the empty space</p>
        `;
        
        fillBlankQuestions.forEach(q => {
            html += createFillBlankQuestion(q, questionCounter++);
        });
        
        html += '</div>';
    }
    
        // Submit buttons
    html += `
        <div class="submit-section">
            <button type="submit" class="submit-btn">
                <i class="fas fa-check-circle"></i>
                Check my answers
            </button>
            <button type="button" class="submit-btn secondary" onclick="generateAdditionalExercise()">
                <i class="fas fa-plus-circle"></i>
                Add another exercise
            </button>
        </div>
    `;
    
    questionsContainer.innerHTML = html;
    
    // Re-attach progress tracking events
    trackProgress();
}

function createTrueFalseQuestion(question, number) {
    return `
        <div class="question-card" data-question="${number}" data-question-id="${question.id}">
            <div class="question-number">${number}</div>
            <div class="question-content">
                <p class="question-text">${question.question}</p>
                <div class="true-false-options">
                    <label class="tf-option">
                        <input type="radio" name="q${question.id}" value="true" data-question-id="${question.id}">
                        <span class="tf-label true">True</span>
                    </label>
                    <label class="tf-option">
                        <input type="radio" name="q${question.id}" value="false" data-question-id="${question.id}">
                        <span class="tf-label false">False</span>
                    </label>
                </div>
            </div>
        </div>
    `;
}

function createMultipleChoiceQuestion(question, number) {
    const choicesHtml = question.choices.map((choice, idx) => {
        const letter = String.fromCharCode(97 + idx);
        return `
            <label class="mc-option">
                <input type="radio" name="q${question.id}" value="${letter}" data-question-id="${question.id}">
                <span class="mc-label">${letter.toUpperCase()}. ${choice}</span>
            </label>
        `;
    }).join('');
    
    return `
        <div class="question-card" data-question="${number}" data-question-id="${question.id}">
            <div class="question-number">${number}</div>
            <div class="question-content">
                <p class="question-text">${question.question}</p>
                <div class="mc-options">
                    ${choicesHtml}
                </div>
            </div>
        </div>
    `;
}

function createFillBlankQuestion(question, number) {
    // Replace _____ with input
    const questionText = question.question.replace(
        /_{3,}/g, 
        `<input type="text" class="blank-input" name="q${question.id}" data-question-id="${question.id}" placeholder="Your answer...">`
    );
    
    return `
        <div class="question-card" data-question="${number}" data-question-id="${question.id}">
            <div class="question-number">${number}</div>
            <div class="question-content">
                <p class="question-text fill-blank">${questionText}</p>
            </div>
        </div>
    `;
}

// ============================================
// PROGRESS TRACKING
// ============================================

function trackProgress() {
    const inputs = document.querySelectorAll('input[type="radio"], input[type="text"]');
    const progressText = document.getElementById('current-q');
    const progressFill = document.getElementById('progress-fill');
    
    if (!currentExercise) return;
    
    const totalQuestions = currentExercise.questions.length;
    
    inputs.forEach(input => {
        input.addEventListener('change', updateProgress);
        input.addEventListener('input', updateProgress);
    });
    
    function updateProgress() {
        let answered = 0;
        const checkedInputs = new Set();
        
        inputs.forEach(input => {
            if (input.type === 'radio' && input.checked) {
                checkedInputs.add(input.name);
            } else if (input.type === 'text' && input.value.trim() !== '') {
                checkedInputs.add(input.name);
            }
        });
        
        answered = checkedInputs.size;
        
        if (progressText) progressText.textContent = Math.min(answered + 1, totalQuestions);
        if (progressFill) progressFill.style.width = `${(answered / totalQuestions) * 100}%`;
    }
}

// ============================================
// SUBMITTING ANSWERS
// ============================================

async function handleSubmit(e) {
    e.preventDefault();
    
    if (!currentExercise) {
        showNotification('Exercise not loaded');
        return;
    }
    
    // Collect answers
    const answers = {};
    let answeredCount = 0;
    
    currentExercise.questions.forEach(q => {
        let answer = null;
        
        if (q.type === 'true_false' || q.type === 'multiple_choice') {
            const selected = document.querySelector(`input[name="q${q.id}"]:checked`);
            if (selected) {
                answer = selected.value;
                answeredCount++;
            }
        } else if (q.type === 'fill_blank') {
            const input = document.querySelector(`input[name="q${q.id}"]`);
            if (input && input.value.trim()) {
                answer = input.value.trim();
                answeredCount++;
            }
        }
        
        if (answer !== null) {
            answers[q.id] = answer;
        }
    });
    
    // Check that all questions are answered
    if (answeredCount < currentExercise.questions.length) {
        showNotification(`Please answer all questions (${answeredCount}/${currentExercise.questions.length})`);
        return;
    }
    
    // Send to backend for correction
    try {
        const learnerId = localStorage.getItem('learner_id');
        
        const response = await fetch('http://localhost:8000/api/submit-exercise/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                exercise_id: currentExercise.text.id,
                answers: answers,
                learner_id: learnerId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showResults(result);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Submission error:', error);
        showNotification('Error during correction: ' + error.message);
    }
}

function showResults(result) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'results-modal';
    
    let resultsArray = Array.isArray(result.results) ? result.results : Object.values(result.results);
    
    // Group by type
    const byType = { true_false: [], multiple_choice: [], fill_blank: [] };
    
    currentExercise.questions.forEach((q, idx) => {
        const r = resultsArray.find(res => String(res.question_id) === String(q.id));
        if (r) {
            byType[q.type].push({ ...r, originalOrder: idx + 1 });
        }
    });
    
    // Display order: true_false, multiple_choice, fill_blank
    const orderedResults = [
        ...byType.true_false,
        ...byType.multiple_choice, 
        ...byType.fill_blank
    ];
    
    // Reassign numbers 1-10 in new order
    const finalResults = orderedResults.map((r, idx) => ({
        ...r,
        displayNum: idx + 1
    }));
    
    const resultsHtml = finalResults.map((r) => {
        if (r.correct) {
            return `
                <div class="result-item correct">
                    <span class="result-num">${r.displayNum}</span>
                    <span class="result-text">Correct - ${r.correct_answer}</span>
                </div>
            `;
        } else {
            return `
                <div class="result-item incorrect">
                    <span class="result-num">${r.displayNum}</span>
                    <span class="result-text">Incorrect - Correct answer: <strong>${r.correct_answer}</strong></span>
                </div>
            `;
        }
    }).join('');
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Results</h2>
                <button class="close-modal" onclick="closeResults()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="score-circle">
                    <span class="score-number">${result.score}</span>%
                </div>
                <p>${result.correct_count}/${result.total} correct</p>
                <div class="results-list">${resultsHtml}</div>
                <div class="modal-actions">
                    <button class="btn-secondary" onclick="closeResults()">Try Again</button>
                    <a href="home.html" class="btn-primary">Home</a>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    resultsArray.forEach(r => {
        const card = document.querySelector(`[data-question-id="${r.question_id}"]`)?.closest('.question-card');
        if (card) card.classList.add(r.correct ? 'correct' : 'incorrect');
    });
}
function closeResults() {
    const modal = document.getElementById('results-modal');
    if (modal) modal.remove();
}

// ============================================
// ADDITIONAL EXERCISE GENERATION
// → TO BE IMPLEMENTED LATER, DO NOT TOUCH
// ============================================

function generateAdditionalExercise() {
    // TODO: Implement later
    // For now, display a message or do nothing
    console.log('Additional exercise generation - To be implemented later');
    showNotification('Feature coming soon...');
}

// ============================================
// NOTIFICATIONS
// ============================================

function showNotification(message) {
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <i class="fas fa-info-circle"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}