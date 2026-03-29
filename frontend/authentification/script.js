// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', function() {
    
    // Récupération des éléments
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const googleBtn = document.getElementById('googleBtn');

    // Fonction de navigation simulée
    function navigateTo(path) {
        console.log(`Navigation vers: ${path}`);
        // Simulation de navigation - dans une vraie app, utiliser:
        // window.location.href = path;
        // ou
        // history.pushState(null, null, path);
        
        // Pour la démo, on affiche une alerte
        const pageName = path === '/login' ? 'la page de connexion' : 'la page d\'inscription';
        
        // Créer une notification toast au lieu d'alert
        showToast(`Redirection vers ${pageName}...`);
    }

    // Fonction pour afficher une notification toast
    function showToast(message) {
        // Créer l'élément toast
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            background-color: #1f2937;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 1000;
            opacity: 0;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        // Animation d'entrée
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%) translateY(0)';
        }, 10);

        // Animation de sortie
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(100px)';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 2000);
    }

    // Événement: Se connecter
    loginBtn.addEventListener('click', function() {
        // Ajouter un effet visuel au clic
        this.style.transform = 'scale(0.98)';
        setTimeout(() => {
            this.style.transform = '';
            navigateTo('/login');
        }, 150);
    });

    // Événement: Créer un compte
    registerBtn.addEventListener('click', function() {
        this.style.transform = 'scale(0.98)';
        setTimeout(() => {
            this.style.transform = '';
            navigateTo('/register');
        }, 150);
    });

    // Événement: Connexion Google
    googleBtn.addEventListener('click', function() {
        this.style.transform = 'scale(0.98)';
        setTimeout(() => {
            this.style.transform = '';
            showToast('Connexion avec Google (Fonctionnalité de démonstration)');
        }, 150);
    });

    // Effet de hover sur les cartes de fonctionnalités
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
            this.style.transition = 'all 0.2s ease';
        });

        card.addEventListener('mouseleave', function() {
            this.style.transform = '';
            this.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
        });
    });

    // Animation au scroll (si la page est plus longue)
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observer les éléments pour animation
    document.querySelectorAll('.feature-card').forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = `opacity 0.5s ease ${index * 0.1}s, transform 0.5s ease ${index * 0.1}s`;
        observer.observe(el);
    });

    // Effet parallax subtil sur le fond
    document.addEventListener('mousemove', (e) => {
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        
        document.body.style.background = `
            linear-gradient(
                ${135 + (x * 10)}deg, 
                #eff6ff 0%, 
                #e0e7ff ${50 + (y * 10)}%, 
                #f3e8ff 100%
            )
        `;
    });

    console.log('EnglishLearn Auth Page chargée avec succès!');
});