// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            // Calculate header height for offset
            const headerHeight = document.querySelector('.header').offsetHeight;
            const targetPosition = targetElement.offsetTop - headerHeight;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// Add active class to current section in navigation
window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-menu a');
    
    let current = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        const headerHeight = document.querySelector('.header').offsetHeight;
        
        if (scrollY >= (sectionTop - headerHeight - 100)) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});

// WhatsApp message customization
function updateWhatsAppLinks() {
    const phoneNumber = '966783112244'; // Replace with actual number
    const defaultMessage = 'مرحبًا، أرغب في الاستفسار عن أسعار حجز شاليه Happiness.';
    
    // Update all WhatsApp links
    document.querySelectorAll('a[href*="whatsapp"]').forEach(link => {
        link.href = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(defaultMessage)}`;
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    updateWhatsAppLinks();
    
    // Add active class to first nav link
    const firstNavLink = document.querySelector('.nav-menu a');
    if (firstNavLink) {
        firstNavLink.classList.add('active');
    }
    
    // Scroll animations
    initScrollAnimations();
    
    // Simple animation for gallery items
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
            }
        });
    }, observerOptions);
    
    // Observe gallery and facility items
    document.querySelectorAll('.gallery-item, .facility-card').forEach(item => {
        observer.observe(item);
    });
});

// Scroll Animations
function initScrollAnimations() {
    const animationObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    });
    
    // Add animation classes to elements
    document.querySelectorAll('section').forEach((section, index) => {
        if (index % 2 === 0) {
            section.classList.add('slide-in-left');
        } else {
            section.classList.add('slide-in-right');
        }
        animationObserver.observe(section);
    });
    
    // Animate cards
    document.querySelectorAll('.facility-card, .gallery-item').forEach(card => {
        card.classList.add('scale-in');
        animationObserver.observe(card);
    });
    
    // Animate headings
    document.querySelectorAll('.section-header').forEach(header => {
        header.classList.add('fade-in');
        animationObserver.observe(header);
    });
}

// Hover effects
function initHoverEffects() {
    // Add hover class to interactive elements
    document.querySelectorAll('.btn, .nav-menu a, .social-icon, .gallery-item, .facility-card').forEach(element => {
        element.addEventListener('mouseenter', () => {
            element.classList.add('hover-active');
        });
        element.addEventListener('mouseleave', () => {
            element.classList.remove('hover-active');
        });
    });
}

// Initialize hover effects
initHoverEffects();

// Lightbox functionality
function initLightbox() {
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightbox-image');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const closeBtn = document.querySelector('.lightbox-close');
    const prevBtn = document.querySelector('.lightbox-prev');
    const nextBtn = document.querySelector('.lightbox-next');
    
    const galleryImages = document.querySelectorAll('.gallery-image-real');
    let currentIndex = 0;
    
    // Open lightbox
    galleryImages.forEach((img, index) => {
        img.addEventListener('click', () => {
            currentIndex = index;
            updateLightbox();
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    });
    
    // Close lightbox
    closeBtn.addEventListener('click', () => {
        lightbox.classList.remove('active');
        document.body.style.overflow = 'auto';
    });
    
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            lightbox.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    });
    
    // Navigation
    prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length;
        updateLightbox();
    });
    
    nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentIndex = (currentIndex + 1) % galleryImages.length;
        updateLightbox();
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;
        
        switch(e.key) {
            case 'Escape':
                lightbox.classList.remove('active');
                document.body.style.overflow = 'auto';
                break;
            case 'ArrowLeft':
                currentIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length;
                updateLightbox();
                break;
            case 'ArrowRight':
                currentIndex = (currentIndex + 1) % galleryImages.length;
                updateLightbox();
                break;
        }
    });
    
    function updateLightbox() {
        const currentImage = galleryImages[currentIndex];
        lightboxImage.src = currentImage.src;
        lightboxImage.alt = currentImage.alt;
        lightboxCaption.textContent = currentImage.parentElement.querySelector('h3').textContent;
    }
}

// Initialize lightbox
initLightbox();

// Dark Mode Toggle
function initDarkMode() {
    const themeToggle = document.querySelector('.theme-toggle');
    const themeIcon = themeToggle.querySelector('i');
    
    // Check for saved theme or prefer-color-scheme
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.body.classList.add('dark-mode');
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    }
    
    // Toggle theme
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        
        if (document.body.classList.contains('dark-mode')) {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
            localStorage.setItem('theme', 'dark');
        } else {
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
            localStorage.setItem('theme', 'light');
        }
    });
}

// Initialize dark mode
initDarkMode();

// Weather API
function initWeather() {
    const apiKey = 'YOUR_API_KEY'; // You need to get a free API key from OpenWeather
    const city = 'Sanaa,YE';
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric&lang=ar`;
    
    // Fallback data in case API fails
    const fallbackData = {
        temp: '25',
        description: 'مشمس جزئياً',
        wind: '10',
        humidity: '45',
        icon: 'fa-sun'
    };
    
    // Update weather display
    function updateWeatherDisplay(data) {
        document.getElementById('weather-temp').textContent = `${Math.round(data.temp)}°C`;
        document.getElementById('weather-desc').textContent = data.description;
        document.getElementById('weather-wind').textContent = data.wind;
        document.getElementById('weather-humidity').textContent = data.humidity;
        
        // Update icon based on weather condition
        const iconElement = document.querySelector('.weather-icon i');
        iconElement.className = `fas ${data.icon}`;
    }
    
    // Try to fetch from API
    fetch(apiUrl)
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            const weatherData = {
                temp: data.main.temp,
                description: data.weather[0].description,
                wind: data.wind.speed,
                humidity: data.main.humidity,
                icon: getWeatherIcon(data.weather[0].id)
            };
            updateWeatherDisplay(weatherData);
        })
        .catch(error => {
            console.log('Using fallback weather data:', error);
            updateWeatherDisplay(fallbackData);
        });
    
    // Map weather condition codes to icons
    function getWeatherIcon(conditionCode) {
        if (conditionCode >= 200 && conditionCode < 300) return 'fa-bolt';
        if (conditionCode >= 300 && conditionCode < 400) return 'fa-cloud-rain';
        if (conditionCode >= 500 && conditionCode < 600) return 'fa-cloud-showers-heavy';
        if (conditionCode >= 600 && conditionCode < 700) return 'fa-snowflake';
        if (conditionCode >= 700 && conditionCode < 800) return 'fa-smog';
        if (conditionCode === 800) return 'fa-sun';
        if (conditionCode > 800) return 'fa-cloud';
        return 'fa-sun';
    }
}

// Initialize weather
initWeather();

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker registered with scope:', registration.scope);
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    });
}

// FAQ Accordion
function initFAQ() {
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const answer = question.nextElementSibling;
            const isExpanded = question.getAttribute('aria-expanded') === 'true';
            
            // Close all other FAQs
            faqQuestions.forEach(q => {
                if (q !== question) {
                    q.setAttribute('aria-expanded', 'false');
                    q.nextElementSibling.classList.remove('open');
                }
            });
            
            // Toggle current FAQ
            question.setAttribute('aria-expanded', !isExpanded);
            answer.classList.toggle('open', !isExpanded);
        });
    });
}

// Initialize FAQ
initFAQ();

// Parallax Effect for Hero Section
function initParallax() {
    const hero = document.querySelector('.hero');
    const layers = document.querySelectorAll('.hero-parallax-layer');
    
    if (!hero || !layers.length) return;
    
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;
        
        layers.forEach((layer, index) => {
            const speed = (index + 1) * 0.1;
            const yPos = -(rate * speed);
            layer.style.transform = `translate3d(0, ${yPos}px, 0)`;
        });
    });
    
    // Mouse move parallax
    hero.addEventListener('mousemove', (e) => {
        const xAxis = (window.innerWidth / 2 - e.pageX) / 25;
        const yAxis = (window.innerHeight / 2 - e.pageY) / 25;
        
        layers.forEach((layer, index) => {
            const speed = (index + 1) * 0.5;
            layer.style.transform = `translate3d(${xAxis * speed}px, ${yAxis * speed}px, 0)`;
        });
    });
}

// Initialize parallax
initParallax();

// Premium Loading Animation
function initPageLoader() {
    const pageLoader = document.querySelector('.page-loader');
    const progressBar = document.querySelector('.progress-bar');
    
    if (!pageLoader || !progressBar) return;
    
    // Simulate loading progress
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress > 100) progress = 100;
        progressBar.style.width = progress + '%';
        
        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                pageLoader.classList.add('loaded');
                // Trigger entrance animations
                document.querySelectorAll('.fade-in, .slide-in-left, .slide-in-right, .scale-in').forEach(el => {
                    el.classList.add('visible');
                });
            }, 500);
        }
    }, 100);
    
    // Force complete after 3 seconds
    setTimeout(() => {
        clearInterval(interval);
        progressBar.style.width = '100%';
        setTimeout(() => {
            pageLoader.classList.add('loaded');
            document.querySelectorAll('.fade-in, .slide-in-left, .slide-in-right, .scale-in').forEach(el => {
                el.classList.add('visible');
            });
        }, 500);
    }, 3000);
}

// Initialize page loader
initPageLoader();

// Install prompt for PWA
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    // Show install button (optional)
    showInstallPromotion();
});

function showInstallPromotion() {
    // You can add an install button here
    console.log('PWA installation available');
}

function installPWA() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            } else {
                console.log('User dismissed the install prompt');
            }
            deferredPrompt = null;
        });
    }
}

// Mobile menu toggle
function initMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
            menuToggle.setAttribute('aria-expanded', !isExpanded);
            navMenu.classList.toggle('active');
            
            // Change icon
            const icon = menuToggle.querySelector('i');
            if (isExpanded) {
                icon.className = 'fas fa-bars';
            } else {
                icon.className = 'fas fa-times';
            }
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!navMenu.contains(e.target) && !menuToggle.contains(e.target) && navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
                menuToggle.setAttribute('aria-expanded', 'false');
                const icon = menuToggle.querySelector('i');
                icon.className = 'fas fa-bars';
            }
        });
        
        // Close menu when clicking on a link
        navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                menuToggle.setAttribute('aria-expanded', 'false');
                const icon = menuToggle.querySelector('i');
                icon.className = 'fas fa-bars';
            });
        });
    }
}

// Call mobile menu initialization
initMobileMenu();