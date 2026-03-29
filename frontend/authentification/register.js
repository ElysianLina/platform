document.addEventListener('DOMContentLoaded', function() {
    
    const registerForm = document.getElementById('registerForm');
    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const acceptTerms = document.getElementById('acceptTerms');
    const submitBtn = document.getElementById('submitBtn');
    const backBtn = document.getElementById('backBtn');
    const googleBtn = document.getElementById('googleBtn');
    const loginLink = document.getElementById('loginLink');

    

    let isLoading = false;










    
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    function validateForm() {
        let isValid = true;
        
        if (fullNameInput.value.trim().length < 2) {
            fullNameInput.classList.add('error');
            isValid = false;
        } else {
            fullNameInput.classList.remove('error');
            fullNameInput.classList.add('success');
        }

        if (!validateEmail(emailInput.value)) {
            emailInput.classList.add('error');
            isValid = false;
        } else {
            emailInput.classList.remove('error');
            emailInput.classList.add('success');
        }

        if (passwordInput.value.length < 6) {
            passwordInput.classList.add('error');
            isValid = false;
        } else {
            passwordInput.classList.remove('error');
            passwordInput.classList.add('success');
        }

        if (confirmPasswordInput.value !== passwordInput.value || confirmPasswordInput.value === '') {
            confirmPasswordInput.classList.add('error');
            isValid = false;
        } else {
            confirmPasswordInput.classList.remove('error');
            confirmPasswordInput.classList.add('success');
        }

        if (!acceptTerms.checked) {
            showToast('Vous devez accepter les conditions d\'utilisation', 'error');
            isValid = false;
        }

        return isValid;
    }

    [fullNameInput, emailInput, passwordInput, confirmPasswordInput].forEach(input => {
        input.addEventListener('input', function() {
            this.classList.remove('error');
        });
    });

    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (isLoading) return;
        
        if (!validateForm()) {
            if (!acceptTerms.checked) return;
            showToast('Veuillez vérifier vos informations', 'error');
            return;
        }

        isLoading = true;
        submitBtn.disabled = true;
        const originalContent = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="loading"></span>';

        try {
           await registerUser({
    fullName: fullNameInput.value,
    email: emailInput.value,
    password: passwordInput.value
});
            
            showToast('Compte créé avec succès !', 'success');
            
            setTimeout(() => {
                window.location.href = '../preferences/preferences.html';
            }, 1000);
            
        } catch (error) {
            showToast('Cet email est déjà utilisé', 'error');
            submitBtn.innerHTML = originalContent;
            submitBtn.disabled = false;
            isLoading = false;
        }
    });



async function registerUser(data) {
    const response = await fetch('http://127.0.0.1:8000/api/register/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name: data.fullName,
            email: data.email,
            password: data.password,
            confirm_password: data.password,
            accept_terms: true
        })
    });

    const result = await response.json();
    
    if (!response.ok || !result.success) {
        throw new Error(result.errors?.[0] || 'Erreur lors de l\'inscription');
    }

    // Stocker les données utilisateur
    localStorage.setItem('learner_id', result.learner_id);
    localStorage.setItem('learner_name', result.name);
    
    return result;
}







    backBtn.addEventListener('click', function() {
        window.history.back();
    });

    googleBtn.addEventListener('click', function() {
        this.style.transform = 'scale(0.98)';
        setTimeout(() => {
            this.style.transform = '';
            showToast('Inscription avec Google...', 'success');
        }, 150);
    });

    loginLink.addEventListener('click', function(e) {
        e.preventDefault();
        showToast('Redirection vers la connexion...');
    });

    function showToast(message, type = 'info') {
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }

    console.log('EnglishLearn Register Page chargée avec succès!');
});

document.getElementById('loginLink').addEventListener('click', function(e) {
    e.preventDefault();
    window.location.href = 'login.html';
});