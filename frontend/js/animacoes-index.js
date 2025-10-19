// Index Page Animations
document.addEventListener('DOMContentLoaded', function() {
    // Intersection Observer for scroll-triggered animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
                
                // For sections with multiple children, animate them with stagger
                if (entry.target.classList.contains('solution-grid')) {
                    const cards = entry.target.querySelectorAll('.solution-card');
                    cards.forEach((card, index) => {
                        setTimeout(() => {
                            card.classList.add('animate');
                        }, index * 200);
                    });
                }
                
                if (entry.target.classList.contains('events-container')) {
                    const eventCards = entry.target.querySelectorAll('.event-card');
                    const eventImage = entry.target.querySelector('.event-image-display');
                    
                    eventCards.forEach((card, index) => {
                        setTimeout(() => {
                            card.classList.add('animate');
                        }, index * 150);
                    });
                    
                    if (eventImage) {
                        setTimeout(() => {
                            eventImage.classList.add('animate');
                        }, 600);
                    }
                }
                
                if (entry.target.classList.contains('plans-grid')) {
                    const planCards = entry.target.querySelectorAll('.plan-card');
                    planCards.forEach((card, index) => {
                        setTimeout(() => {
                            card.classList.add('animate');
                        }, index * 200);
                    });
                }
            }
        });
    }, observerOptions);

    // Observe elements for animation
    const animatedElements = [
        '.solution-grid',
        '.events-container', 
        '.plans-grid',
        '.contact-form'
    ];

    animatedElements.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            observer.observe(element);
        });
    });

    // Add smooth scrolling to navigation links
    const navLinks = document.querySelectorAll('a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Add floating animation to buttons
    const buttons = document.querySelectorAll('.btn-primary, .btn-blue');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.animation = 'float 2s ease-in-out infinite';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.animation = '';
        });
    });

    // Popular plan card hover effect (pulse animation removed)
    const popularCard = document.querySelector('.plan-card.popular');
    if (popularCard) {
        // Pulse animation removed as requested
    }

    // Enhanced event card interactions
    const eventCards = document.querySelectorAll('.event-card');
    eventCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateX(10px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            if (!this.classList.contains('active')) {
                this.style.transform = 'translateX(0) scale(1)';
            }
        });
    });

    // Add parallax effect to hero section
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const heroImage = document.querySelector('.hero-image');
        
        if (heroImage) {
            const rate = scrolled * -0.5;
            heroImage.style.transform = `translateY(${rate}px)`;
        }
    });

    // Add stagger animation to contact form fields
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        const formFields = contactForm.querySelectorAll('input, select, textarea, button');
        
        const formObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    formFields.forEach((field, index) => {
                        setTimeout(() => {
                            field.style.opacity = '1';
                            field.style.transform = 'translateY(0)';
                        }, index * 100);
                    });
                }
            });
        }, observerOptions);
        
        // Initially hide form fields
        formFields.forEach(field => {
            field.style.opacity = '0';
            field.style.transform = 'translateY(20px)';
            field.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        });
        
        formObserver.observe(contactForm);
    }
});