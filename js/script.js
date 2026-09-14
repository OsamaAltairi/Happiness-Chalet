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
let activeSectionTicking = false;

function updateActiveSection() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-menu a');
    
    let current = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        const headerHeight = document.querySelector('.header').offsetHeight;
        
        if (window.scrollY >= (sectionTop - headerHeight - 100)) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
        } else {
            link.removeAttribute('aria-current');
        }
    });
    activeSectionTicking = false;
}

window.addEventListener('scroll', () => {
    if (!activeSectionTicking) {
        window.requestAnimationFrame(updateActiveSection);
        activeSectionTicking = true;
    }
}, { passive: true });

// WhatsApp message customization
function updateWhatsAppLinks() {
    const phoneNumber = '967783112244';
    const defaultMessage = 'مرحبًا، أرغب في الاستفسار عن أسعار حجز شاليه Happiness.';
    
    // Update all WhatsApp links
    document.querySelectorAll('a[href*="wa.me"]').forEach(link => {
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

// Booking price calculator and WhatsApp handoff
function initBookingCalculator() {
    const form = document.querySelector('#booking-form');
    if (!form) return;

    const offerInput = document.querySelector('#booking-offer');
    const dateInput = document.querySelector('#booking-date');
    const adultsInput = document.querySelector('#booking-adults');
    const childrenInput = document.querySelector('#booking-children');
    const toddlersInput = document.querySelector('#booking-toddlers');
    const totalElement = document.querySelector('#booking-total');
    const messageElement = document.querySelector('#booking-message');
    const today = new Date();
    const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
    dateInput.min = localToday.toISOString().split('T')[0];

    function getDetails() {
        const offer = offerInput.value;
        const adults = Math.max(Number(adultsInput.value) || 0, 0);
        const children = Math.max(Number(childrenInput.value) || 0, 0);
        const toddlers = Math.max(Number(toddlersInput.value) || 0, 0);
        const childUnits = Math.ceil(children / 2);
        const capacity = offer === 'family' ? 5 : 20;
        const basePrice = offer === 'family' ? 25000 : 40000;
        const extraAdults = Math.max(adults - capacity, 0);
        const extraChildren = Math.max(childUnits - Math.max(capacity - adults, 0), 0);
        const total = basePrice + (extraAdults * 1000) + (extraChildren * 500);
        const date = dateInput.value ? new Date(`${dateInput.value}T12:00:00`) : null;
        const familyDay = date && [0, 1, 2, 6].includes(date.getDay());
        return { offer, adults, children, toddlers, total, guests: adults + childUnits, date, familyDay };
    }

    function updateSummary() {
        const details = getDetails();
        const offerName = details.offer === 'family' ? 'العائلة السعيدة' : 'الحجز اليومي';
        let message = 'الأطفال الأقل من 4 سنوات مجاناً.';
        if (details.guests < 2) message = 'يرجى إدخال شخصين على الأقل للحجز.';
        if (details.offer === 'family' && details.date && !details.familyDay) message = 'العرض متاح أيام السبت والأحد والإثنين والثلاثاء.';
        if (details.guests > (details.offer === 'family' ? 5 : 20)) message = 'تمت إضافة تكلفة الأشخاص الزائدين إلى السعر التقديري.';
        totalElement.textContent = `${details.total.toLocaleString('en-US')} ريال`;
        messageElement.textContent = `${offerName}: ${message}`;
    }

    form.addEventListener('input', updateSummary);
    form.addEventListener('change', updateSummary);
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const details = getDetails();
        if (!details.date) {
            messageElement.textContent = 'يرجى اختيار تاريخ الحجز أولاً.';
            dateInput.focus();
            return;
        }
        if (details.guests < 2) {
            messageElement.textContent = 'يرجى إدخال شخصين على الأقل للحجز.';
            adultsInput.focus();
            return;
        }
        if (details.offer === 'family' && !details.familyDay) {
            messageElement.textContent = 'يرجى اختيار يوم مناسب لعرض العائلة السعيدة.';
            dateInput.focus();
            return;
        }
        const offerName = details.offer === 'family' ? 'العائلة السعيدة' : 'الحجز اليومي';
        const text = `مرحباً، أرغب في حجز شاليه هابينيس.
العرض: ${offerName}
التاريخ: ${details.date.toLocaleDateString('ar-YE')}
الكبار: ${details.adults}
الأطفال من 4 إلى 10 سنوات: ${details.children}
الأطفال أقل من 4 سنوات: ${details.toddlers}
السعر التقديري: ${details.total.toLocaleString('en-US')} ريال`;
        window.open(`https://wa.me/967783112244?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    });

    updateSummary();
}

initBookingCalculator();

// Scroll Animations
function initScrollAnimations() {
    const animationObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('visible');
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -100px 0px' });

    document.querySelectorAll('section').forEach((section, index) => {
        section.classList.add(index % 2 === 0 ? 'slide-in-left' : 'slide-in-right');
        animationObserver.observe(section);
    });
    document.querySelectorAll('.facility-card, .gallery-item').forEach(card => {
        card.classList.add('scale-in');
        animationObserver.observe(card);
    });
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

// Gallery category filters
function initGalleryFilters() {
    const filters = document.querySelectorAll('.gallery-filter');
    const items = document.querySelectorAll('.gallery-item[data-category]');
    if (!filters.length || !items.length) return;

    filters.forEach(filter => {
        filter.addEventListener('click', () => {
            const selectedFilter = filter.dataset.filter;
            filters.forEach(button => {
                const isActive = button === filter;
                button.classList.toggle('active', isActive);
                button.setAttribute('aria-pressed', String(isActive));
            });
            items.forEach(item => {
                const matches = selectedFilter === 'all' || item.dataset.category.split(' ').includes(selectedFilter);
                item.classList.toggle('is-hidden', !matches);
            });
        });
    });
}

initGalleryFilters();

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

// Weather API
function initWeather() {
    const apiKey = '';
    const city = 'Sanaa,YE';
    
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

    if (!apiKey) {
        updateWeatherDisplay(fallbackData);
        return;
    }

    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric&lang=ar`;
    
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
        navigator.serviceWorker.register('./sw.js')
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
    
    if (!hero || !layers.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let parallaxTicking = false;
    
    window.addEventListener('scroll', () => {
        if (parallaxTicking) return;
        parallaxTicking = true;
        window.requestAnimationFrame(() => {
            const scrolled = window.pageYOffset;
            const rate = scrolled * -0.5;

            layers.forEach((layer, index) => {
                const speed = (index + 1) * 0.1;
                const yPos = -(rate * speed);
                layer.style.transform = `translate3d(0, ${yPos}px, 0)`;
            });
            parallaxTicking = false;
        });
    }, { passive: true });
    
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
    
    const finishLoading = () => {
        progressBar.style.width = '100%';
        window.setTimeout(() => {
            pageLoader.classList.add('loaded');
        }, 150);
    };

    if (document.readyState === 'complete') {
        finishLoading();
    } else {
        window.addEventListener('load', finishLoading, { once: true });
        window.setTimeout(finishLoading, 1200);
    }
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
