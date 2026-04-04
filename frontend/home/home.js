// ============================================
// home.js - Version with dynamic loading of units from database
// ============================================

const userState = {
    learnerId: null,
    name: '',
    email: '',
    cefrLevel: '',
    progress: 0
};

let profileTrigger = null;
let profileDropdown = null;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    getLearnerId();
    fetchLearnerData();
    loadUnits(); // NEW: Load units from database
    initProfileDropdown();
    
    // Navigation
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
navItems.forEach(item => {
    item.addEventListener('click', function(e) {
        // Don't prevent navigation if it's a real link
        const href = this.getAttribute('href');
        if (href && href !== '#') {
            // Let the browser handle the link normally
            return;
        }
        
        // Otherwise, default behavior (prevent and handle in JS)
        e.preventDefault();
        navItems.forEach(nav => nav.classList.remove('active'));
        this.classList.add('active');
        
        this.style.transform = 'scale(0.98)';
        setTimeout(() => {
            this.style.transform = '';
        }, 150);
    });
});

    animateCards();
    console.log('EnglishLearn Dashboard loaded successfully!');
});

// ============================================
// LOADING UNITS FROM DATABASE (NEW)
// ============================================

async function loadUnits() {
    const unitsContainer = document.querySelector('.units-section');
    
    unitsContainer.innerHTML = `
        <h2 class="section-title">Learning Units</h2>
        <div class="loading-message">
            <i class="fas fa-spinner fa-spin"></i> Loading units...
        </div>
    `;
    
    try {
        const response = await fetch('http://localhost:8000/api/units/');
        const data = await response.json();
        
        // 🔥 DEBUG: Display complete API response
        console.log("=== API RAW RESPONSE ===");
        console.log(JSON.stringify(data, null, 2));
        
        // 🔥 DEBUG: Search for Time and Schedules specifically
        const timeUnit = data.units?.find(u => u.title === "Time and Schedules");
        console.log("Time and Schedules found:", timeUnit);
        console.log("is_single_subunit:", timeUnit?.is_single_subunit);
        console.log("subunit:", timeUnit?.subunit);
        
        if (data.success && data.units) {
            renderUnits(data.units);
        } else {
            throw new Error(data.error || 'Loading error');
        }
    } catch (error) {
        console.error('Error loading units:', error);
        unitsContainer.innerHTML = `
            <h2 class="section-title">Learning Units</h2>
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                Unable to load units. 
                <button onclick="loadUnits()" style="margin-left: 10px; padding: 5px 10px; cursor: pointer;">
                    Retry
                </button>
            </div>
        `;
    }
}

function renderUnits(units) {
    const unitsContainer = document.querySelector('.units-section');
    console.log("=== RENDER UNITS ===");
    console.log("Total units received:", units.length);
    
    let html = '<h2 class="section-title">Learning Units</h2>';
    
    if (units.length === 0) {
        html += '<div class="error-message">No units available</div>';
        unitsContainer.innerHTML = html;
        return;
    }
    
    units.forEach((unit, index) => {
        const unitNumber = unit.display_number || String(index + 1).padStart(2, '0');
        
        console.log(`Unit ${index}: ${unit.title}, is_single_subunit: ${unit.is_single_subunit}, subunits: ${unit.subunits?.length || 0}`);
        
        // 🔥🔥🔥 CASE 1: SINGLE SUB-UNIT → DIRECT LINK TO EXERCISE MENU
        if (unit.is_single_subunit === true) {
            const sub = unit.subunit;
            console.log(`  → SINGLE SUBUNIT: ${sub.title}, linking directly to exercise-menu.html`);
            
            html += `
<a href="/frontend/home/exercise-menu.html?subunit=${sub.code}&title=${encodeURIComponent(sub.title)}&subunit_id=${sub.id}"                   class="unit-card single-subunit" 
onclick="localStorage.setItem('currentSubunitId', '${sub.id}'); localStorage.setItem('currentUnitId', '${unit.id}')">                    <div class="unit-header" style="cursor: pointer; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                        <div class="unit-info">
                            <div class="unit-icon" style="background: rgba(255,255,255,0.2); color: white;">${unitNumber}</div>
                            <div class="unit-details">
                                <h3>${unit.title}</h3>
                                <p>${sub.title} • Level ${unit.level}</p>
                            </div>
                        </div>
                        <div class="unit-meta">
                            <span class="progress-badge" style="background: rgba(255,255,255,0.2); color: white;">Click to start</span>
                            <i class="fas fa-arrow-right" style="margin-left: 8px;"></i>
                        </div>
                    </div>
                </a>
            `;
            return; // move to next unit
        }
        
        // 🔥🔥🔥 CASE 2: MULTIPLE SUB-UNITS → CLASSIC ACCORDION
        const visibleSubunits = unit.subunits || [];
        
        if (visibleSubunits.length === 0) {
           
            return;
        }
        
        const subunitsHtml = visibleSubunits.map(sub => `
            <a href="/frontend/home/exercise-menu.html?subunit=${sub.code}&title=${encodeURIComponent(sub.title)}&subunit_id=${sub.id}" 
               class="subunit-card"
               onclick="localStorage.setItem('currentSubunitId', '${sub.id}'); localStorage.setItem('currentUnitId', '${unit.id}')">
                <div class="subunit-icon">
                    <i class="fas fa-${getIconForSubunit(sub.order)}"></i>
                </div>
                <div class="subunit-info">
                    <h4>Sub-unit ${sub.code}</h4>
                    <p>${sub.title}</p>
                </div>
                <div class="subunit-status pending">
                    <i class="fas fa-circle"></i>
                </div>
            </a>
        `).join('');
        
        html += `
            <div class="unit-card" id="unit-${unit.id}">
                <div class="unit-header" onclick="toggleUnit(this)">
                    <div class="unit-info">
                        <div class="unit-icon">${unitNumber}</div>
                        <div class="unit-details">
                            <h3>${unit.title}</h3>
                            <p>Level ${unit.level} - ${visibleSubunits.length} sub-units</p>
                        </div>
                    </div>
                    <div class="unit-meta">
                        <span class="progress-badge" id="badge-${unit.id}">${getCompletedCount(unit.id, visibleSubunits)}/${visibleSubunits.length} completed</span>
                        <i class="fas fa-chevron-down unit-arrow"></i>
                    </div>
                </div>
                <div class="unit-content">
                    <div class="subunits-list">
                        ${subunitsHtml}
                    </div>
                </div>
            </div>
        `;
    });
    
    unitsContainer.innerHTML = html;
    console.log("=== RENDER COMPLETE ===");
}
function getIconForSubunit(order) {
    const icons = ['user-circle', 'handshake', 'users', 'comments', 'star', 'heart'];
    return icons[(order - 1) % icons.length] || 'book';
}

// ============================================
// USER FUNCTIONS (unchanged)
// ============================================

function getLearnerId() {
    const storedId = localStorage.getItem('learner_id');
    const storedName = localStorage.getItem('learner_name');
    const storedEmail = localStorage.getItem('learner_email');
    const storedCefr = localStorage.getItem('learner_cefr_level');
    const storedProgress = localStorage.getItem('learner_progress');
    
    if (storedId && storedName) {
        userState.learnerId = parseInt(storedId);
        userState.name = storedName;
        userState.email = storedEmail || '';
        userState.cefrLevel = storedCefr || '';
        userState.progress = parseInt(storedProgress) || 0;
        
        console.log('Data retrieved from localStorage:', userState);
        return userState.learnerId;
    }
    
    console.error('Not logged in, redirecting to login...');
    window.location.href = '../authentification/login.html';
    return null;
}

async function fetchLearnerData() {
    if (userState.name) {
        updateDashboard();
        updateDropdown();
        return;
    }
    
    if (!userState.learnerId) return;
    
    try {
        const response = await fetch(`http://localhost:8000/api/learner/?learner_id=${userState.learnerId}`);
        const result = await response.json();
        
        if (result.success) {
            userState.name = result.learner.name;
            userState.email = result.learner.email;
            userState.cefrLevel = result.learner.cefr_level;
            userState.progress = result.learner.progress;
            
            localStorage.setItem('learner_name', userState.name);
            localStorage.setItem('learner_email', userState.email);
            localStorage.setItem('learner_cefr_level', userState.cefrLevel);
            localStorage.setItem('learner_progress', userState.progress);
            
            updateDashboard();
            updateDropdown();
        }
    } catch (error) {
        console.error('Error during retrieval:', error);
    }
}

function updateDashboard() {
    const welcomeTitle = document.querySelector('.welcome-title');
    if (welcomeTitle && userState.name) {
        welcomeTitle.textContent = `Welcome, ${userState.name}!`;
    }
    
    const levelBadge = document.querySelector('.level-badge');
    if (levelBadge && userState.cefrLevel) {
        levelBadge.textContent = `CEFR Level: ${userState.cefrLevel}`;
    }
    
    const cefrValue = document.querySelector('.stat-card:nth-child(1) .stat-value');
    if (cefrValue && userState.cefrLevel) {
        cefrValue.textContent = userState.cefrLevel;
    }
    
    const progressValue = document.querySelector('.stat-card:nth-child(2) .stat-value');
    if (progressValue && userState.progress !== undefined) {
        progressValue.textContent = userState.progress + '%';
    }
    
    const avatarInitials = document.getElementById('avatar-initials');
    if (avatarInitials && userState.name) {
        const initials = userState.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        avatarInitials.textContent = initials;
    }
}

function updateDropdown() {
    const dropdownAvatarInitials = document.getElementById('dropdown-avatar-initials');
    const dropdownName = document.getElementById('dropdown-name');
    const dropdownEmail = document.getElementById('dropdown-email');
    
    if (userState.name) {
        const initials = userState.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        if (dropdownAvatarInitials) dropdownAvatarInitials.textContent = initials;
        if (dropdownName) dropdownName.textContent = userState.name;
    }
    
    if (userState.email) {
        if (dropdownEmail) dropdownEmail.textContent = userState.email;
    }
}

// ============================================
// PROFILE DROPDOWN (unchanged)
// ============================================

function initProfileDropdown() {
    profileTrigger = document.getElementById('profile-trigger');
    profileDropdown = document.getElementById('profile-dropdown');
    
    if (!profileTrigger || !profileDropdown) return;
    
    profileTrigger.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleDropdown();
    });
    
    const dropdownItems = profileDropdown.querySelectorAll('.dropdown-item');
    dropdownItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const action = this.getAttribute('data-action');
            handleDropdownAction(action);
        });
    });
    
    document.addEventListener('click', function(e) {
        if (profileDropdown.classList.contains('show') && 
            !profileDropdown.contains(e.target) && 
            !profileTrigger.contains(e.target)) {
            closeDropdown();
        }
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && profileDropdown.classList.contains('show')) {
            closeDropdown();
        }
    });
}

function toggleDropdown() {
    const isOpen = profileDropdown.classList.contains('show');
    if (isOpen) {
        closeDropdown();
    } else {
        openDropdown();
    }
}

function openDropdown() {
    profileDropdown.classList.add('show');
    profileTrigger.classList.add('active');
}

function closeDropdown() {
    profileDropdown.classList.remove('show');
    profileTrigger.classList.remove('active');
}

function handleDropdownAction(action) {
    closeDropdown();
    
    switch(action) {
        case 'profile':
            showNotification('Redirecting to My Profile...');
            break;
        case 'settings':
            showNotification('Redirecting to Settings...');
            break;
        case 'logout':
            logout();
            break;
    }
}

async function logout() {
    try {
        const response = await fetch('http://localhost:8000/api/logout/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ learner_id: userState.learnerId })
        });
        
        localStorage.removeItem('learner_id');
        localStorage.removeItem('learner_name');
        localStorage.removeItem('learner_email');
        localStorage.removeItem('learner_cefr_level');
        localStorage.removeItem('learner_progress');
        localStorage.removeItem('currentSubunitId');
        
        window.location.href = '/frontend/authentification/login.html';
    } catch (error) {
        console.error('Network error:', error);
        localStorage.clear();
        window.location.href = '/frontend/authentification/login.html';
    }
}

// ============================================
// UTILITIES (unchanged)
// ============================================

function toggleUnit(header) {
    const unitCard = header.parentElement;
    if (unitCard.classList.contains('locked')) return;

    const isOpen = unitCard.classList.contains('open');

    // Close ALL open units (including this one)
    document.querySelectorAll('.unit-card').forEach(card => {
        card.classList.remove('open');
        const content = card.querySelector('.unit-content');
        if (content) {
            content.style.maxHeight = '0';
            content.style.overflowY = 'hidden';
            content.style.overflowX = 'hidden';
            content.style.padding = '0 24px';
        }
    });

    // If it was closed, open it
    if (!isOpen) {
        const content = unitCard.querySelector('.unit-content');
        if (!content) return;
        unitCard.classList.add('open');
        content.style.maxHeight = '400px';
        content.style.overflowY = 'auto';
        content.style.overflowX = 'hidden';
        content.style.padding = '0 24px 24px 24px';
    }
}

function animateCards() {
    const cards = document.querySelectorAll('.stat-card, .unit-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `<i class="fas fa-info-circle"></i><span>${message}</span>`;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function getCompletedCount(unitId, subunits) {
    const completed = JSON.parse(localStorage.getItem('completedSubunits') || '[]');
    return subunits.filter(sub => 
        completed.includes('unit_' + unitId + '_sub_' + sub.id)
    ).length;
}
