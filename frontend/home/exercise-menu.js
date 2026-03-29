// Get URL parameters
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        subunit: params.get('subunit') || '1.1',
        title: params.get('title') || 'Introducing Yourself',
        subunitId: params.get('subunit_id') || ''
    };
}

// Update page with subunit info
document.addEventListener('DOMContentLoaded', function() {
    const { subunit, title, subunitId } = getUrlParams();
    
    // Update subunit badge and title
    const subunitIdEl = document.getElementById('subunit-id');
    const subunitTitleEl = document.getElementById('subunit-title');
    
    if (subunitIdEl) subunitIdEl.textContent = subunit;
    if (subunitTitleEl) subunitTitleEl.textContent = title;
    
    // Store in localStorage for exercise page
    localStorage.setItem('currentSubunit', subunit);
    localStorage.setItem('currentSubunitTitle', title);
    if (subunitId) {
        localStorage.setItem('currentSubunitId', subunitId);
    }
    
    // Update links to include subunit info
    const comprehensionLink = document.getElementById('comprehension-ecrite');
    if (comprehensionLink) {
        comprehensionLink.href = `comprehension-ecrite.html?subunit=${subunit}&title=${encodeURIComponent(title)}`;
    }
    
    // ===== CORRECT ACTIVE MENU =====
    // Remove 'active' from all nav-item
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add 'active' to Home
    const homeLink = document.querySelector('.sidebar-nav a[href="home.html"]');
    if (homeLink) {
        homeLink.classList.add('active');
    }
    // ==================================
});