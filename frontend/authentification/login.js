// ============================================
// login.js - Gestion de la connexion utilisateur
// ============================================

// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', function() {
    
    // Récupération des éléments du DOM
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('togglePassword');
    const rememberMe = document.getElementById('rememberMe');
    const submitBtn = document.getElementById('submitBtn');
    const backBtn = document.getElementById('backBtn');
    const googleBtn = document.getElementById('googleBtn');
    const registerLink = document.getElementById('registerLink');
    const forgotPassword = document.querySelector('.forgot-password');
    const eyeIcon = document.getElementById('eyeIcon');
    
    // État du formulaire
    let isLoading = false;

    // ============================================
    // Icônes SVG pour le toggle mot de passe
    // ============================================
    const eyeSlash = `
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
    `;

    const eyeOpen = `
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
    `;

    // ============================================
    // Toggle afficher/masquer le mot de passe
    // ============================================
    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        // Changer l'icône : œil barré si visible, œil ouvert si caché
        eyeIcon.innerHTML = type === 'password' ? eyeSlash : eyeOpen;
    });

    // ============================================
    // Validation email avec regex
    // ============================================
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // ============================================
    // Validation complète du formulaire
    // ============================================
    function validateForm() {
        let isValid = true;
        
        // Validation email
        if (!validateEmail(emailInput.value)) {
            emailInput.classList.add('error');
            isValid = false;
        } else {
            emailInput.classList.remove('error');
            emailInput.classList.add('success');
        }

        // Validation mot de passe (minimum 6 caractères)
        if (passwordInput.value.length < 6) {
            passwordInput.classList.add('error');
            isValid = false;
        } else {
            passwordInput.classList.remove('error');
            passwordInput.classList.add('success');
        }

        return isValid;
    }

    // ============================================
    // Réinitialiser les erreurs sur saisie
    // ============================================
    [emailInput, passwordInput].forEach(input => {
        input.addEventListener('input', function() {
            this.classList.remove('error');
        });
    });

    // ============================================
    // MODIFIÉ : Soumission du formulaire avec appel API réel au backend
    // Remplace complètement l'ancienne simulation par un vrai appel API
    // ============================================
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (isLoading) return;
        
        if (!validateForm()) {
            showToast('Veuillez vérifier vos informations', 'error');
            return;
        }

        // Désactiver le bouton et montrer le chargement
        isLoading = true;
        submitBtn.disabled = true;
        const originalContent = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="loading"></span>';

        // ============================================
        // NOUVEAU : Appel API réel au backend Django pour authentification
        // Envoie email + password à l'endpoint /api/login/
        // ============================================
        try {
            const response = await fetch('http://localhost:8000/api/login/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: emailInput.value,
                    password: passwordInput.value
                })
            });

            const data = await response.json();

            if (data.success) {
                // ============================================
                // NOUVEAU : Stockage des informations utilisateur dans localStorage
                // Ces données seront utilisées par home.js pour afficher les infos
                // ============================================
                const learner = data.learner;
                
                // Sauvegarder toutes les infos nécessaires pour home.html
                localStorage.setItem('learner_id', learner.learner_id);
                localStorage.setItem('learner_name', learner.name);
                localStorage.setItem('learner_email', learner.email);
                localStorage.setItem('learner_cefr_level', learner.cefr_level);
                localStorage.setItem('learner_progress', learner.progress);
                
                // Si "Se souvenir de moi" est coché, sauvegarder aussi l'email
                if (rememberMe.checked) {
                    localStorage.setItem('rememberedEmail', learner.email);
                } else {
                    localStorage.removeItem('rememberedEmail');
                }

                showToast('Connexion réussie ! Redirection...', 'success');
                
                // ============================================
                // NOUVEAU : Redirection vers home.html après connexion réussie
                // Chemin relatif : de /authentification/ vers /home/
                // ============================================
                setTimeout(() => {
                    window.location.href = '../home/home.html';
                }, 1000);
                
            } else {
                // Erreur d'authentification retournée par le backend
                showToast(data.errors[0] || 'Email ou mot de passe incorrect', 'error');
                submitBtn.innerHTML = originalContent;
                submitBtn.disabled = false;
                isLoading = false;
            }
            
        } catch (error) {
            // ============================================
            // NOUVEAU : Gestion des erreurs réseau/serveur
            // ============================================
            console.error('Erreur de connexion:', error);
            showToast('Erreur de connexion au serveur', 'error');
            submitBtn.innerHTML = originalContent;
            submitBtn.disabled = false;
            isLoading = false;
        }
    });

    // ============================================
    // Bouton retour
    // ============================================
    backBtn.addEventListener('click', function() {
        window.history.back();
    });

    // ============================================
    // Connexion Google (simulation)
    // ============================================
    googleBtn.addEventListener('click', function() {
        this.style.transform = 'scale(0.98)';
        setTimeout(() => {
            this.style.transform = '';
            showToast('Connexion avec Google...', 'success');
            console.log('Redirection vers Google OAuth...');
        }, 150);
    });

    // ============================================
    // MODIFIÉ : Lien créer un compte - Redirection réelle activée
    // ============================================
    registerLink.addEventListener('click', function(e) {
        e.preventDefault();
        showToast('Redirection vers l\'inscription...');
        // MODIFIÉ : Redirection vers la page d'inscription activée
        window.location.href = 'register.html';
    });

    // ============================================
    // Lien mot de passe oublié
    // ============================================
    forgotPassword.addEventListener('click', function(e) {
        e.preventDefault();
        const email = emailInput.value;
        if (validateEmail(email)) {
            showToast(`Email de récupération envoyé à ${email}`, 'success');
        } else {
            showToast('Veuillez entrer votre email', 'error');
            emailInput.focus();
        }
    });

    // ============================================
    // Fonction pour afficher une notification toast
    // ============================================
    function showToast(message, type = 'info') {
        // Supprimer les toasts existants
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        // Animation d'entrée
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        // Animation de sortie
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }

    // ============================================
    // MODIFIÉ : Restaurer l'email sauvegardé (si "Se souvenir de moi" était coché)
    // ============================================
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
        emailInput.value = rememberedEmail;
        rememberMe.checked = true;
    }

    // ============================================
    // Animation des inputs au focus
    // ============================================
    document.querySelectorAll('.form-input').forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.style.transform = 'scale(1.02)';
            this.parentElement.style.transition = 'transform 0.2s';
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.style.transform = 'scale(1)';
        });
    });

    console.log('EnglishLearn Login Page chargée avec succès!');
});