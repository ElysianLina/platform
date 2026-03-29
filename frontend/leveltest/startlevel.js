document.addEventListener('DOMContentLoaded', function() {
    const startBtn = document.getElementById('startBtn');
    
    startBtn.addEventListener('click', function() {
        // Animation on click
        this.style.transform = 'scale(0.95)';
        
        setTimeout(() => {
            this.style.transform = '';
            
            // Here you would typically navigate to the quiz
            // window.location.href = '/quiz';
            
            // For demo purposes, show an alert
            alert('Starting the level assessment questionnaire...');
        }, 150);
    });
    
    // Optional: Add subtle floating animation to the illustration
    const illustration = document.querySelector('.illustration');
    let floatDirection = 1;
    
    function floatAnimation() {
        const currentTransform = getComputedStyle(illustration).transform;
        illustration.style.transform = `translateY(${Math.sin(Date.now() / 1000) * 5}px)`;
        requestAnimationFrame(floatAnimation);
    }
    
    // Uncomment the line below to enable floating animation
    // floatAnimation();
});