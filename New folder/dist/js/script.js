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

// Booking calculator and request submission
function initBookingCalculator() {
    const form = document.querySelector('#booking-form');
    if (!form) return;

    const offerInput = document.querySelector('#booking-offer');
    const dateInput = document.querySelector('#booking-date');
    const calendar = document.querySelector('#booking-calendar');
    const calendarMonth = document.querySelector('#calendar-month');
    const calendarDays = document.querySelector('#calendar-days');
    const calendarSelected = document.querySelector('#calendar-selected');
    const previousMonthButton = document.querySelector('#calendar-previous');
    const nextMonthButton = document.querySelector('#calendar-next');
    const adultsInput = document.querySelector('#booking-adults');
    const childrenInput = document.querySelector('#booking-children');
    const toddlersInput = document.querySelector('#booking-toddlers');
    const totalElement = document.querySelector('#booking-total');
    const messageElement = document.querySelector('#booking-message');
    const statusElement = document.querySelector('#booking-status');
    const submitButton = form.querySelector('[type="submit"]');
    const packageDetails = {
        standard: { name: 'الحجز اليومي', price: 40000, capacity: 20, hours: '9 ص - 9 م' },
        family: { name: 'العائلة السعيدة', price: 25000, capacity: 5, hours: '9 ص - 9 م' },
        tent: { name: 'مجلس الخيمة', price: 20000, capacity: 15, hours: '1 م - 10 م' },
        glass: { name: 'الديوان الزجاجي', price: 20000, capacity: 15, hours: '1 م - 10 م' }
    };
    let availableDates = [];
    let calendarDaysByDate = new Map();
    let currentCalendarMonth = null;
    let availabilityRequest = 0;

    function formatBookingDate(date) {
        return new Intl.DateTimeFormat('ar-YE', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC'
        }).format(new Date(`${date}T12:00:00Z`));
    }

    function renderCalendar() {
        if (!currentCalendarMonth) return;
        const monthDates = [...calendarDaysByDate.keys()].filter((date) => date.startsWith(currentCalendarMonth));
        const [year, month] = currentCalendarMonth.split('-').map(Number);
        calendarMonth.textContent = new Intl.DateTimeFormat('ar-YE', {
            year: 'numeric',
            month: 'long',
            timeZone: 'UTC'
        }).format(new Date(Date.UTC(year, month - 1, 1)));
        calendarDays.replaceChildren();

        const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
        const leadingBlankDays = (firstWeekday + 1) % 7;
        for (let index = 0; index < leadingBlankDays; index += 1) {
            const blank = document.createElement('span');
            blank.className = 'calendar-day calendar-day-empty';
            blank.setAttribute('aria-hidden', 'true');
            calendarDays.append(blank);
        }

        monthDates.forEach((date) => {
            const day = calendarDaysByDate.get(date);
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `calendar-day calendar-day-${day.status}`;
            button.textContent = String(Number(date.slice(-2)));
            button.setAttribute('aria-label', `${formatBookingDate(date)} - ${
                day.status === 'available' ? 'متاح' : day.status === 'booked' ? 'محجوز' : day.reason || 'غير متاح'
            }`);
            button.setAttribute('aria-pressed', String(dateInput.value === date));
            if (day.status !== 'available') {
                button.disabled = true;
                button.title = day.status === 'booked' ? 'هذا اليوم محجوز' : (day.reason || 'هذا اليوم غير متاح لهذه الباقة');
            } else {
                button.addEventListener('click', () => {
                    dateInput.value = date;
                    calendarSelected.textContent = `التاريخ المختار: ${formatBookingDate(date)}`;
                    calendarDays.querySelectorAll('.calendar-day-available').forEach((dateButton) => {
                        dateButton.setAttribute('aria-pressed', String(dateButton === button));
                    });
                    statusElement.textContent = '';
                });
            }
            calendarDays.append(button);
        });

        const firstMonth = [...calendarDaysByDate.keys()][0]?.slice(0, 7);
        const lastMonth = [...calendarDaysByDate.keys()].at(-1)?.slice(0, 7);
        previousMonthButton.disabled = !firstMonth || currentCalendarMonth <= firstMonth;
        nextMonthButton.disabled = !lastMonth || currentCalendarMonth >= lastMonth;
    }

    function getDetails() {
        const offer = offerInput.value;
        const adults = Number(adultsInput.value) || 0;
        const children = Number(childrenInput.value) || 0;
        const toddlers = Number(toddlersInput.value) || 0;
        const details = packageDetails[offer];
        const childUnits = Math.ceil(children / 2);
        const extraAdults = Math.max(adults - details.capacity, 0);
        const extraChildren = Math.max(children - (Math.max(details.capacity - adults, 0) * 2), 0);
        const total = details.price + (extraAdults * 500) + (extraChildren * 250);
        return { offer, adults, children, toddlers, total, guests: adults + childUnits, details };
    }

    function updateSummary() {
        const details = getDetails();
        let message = 'كل طفلين من عمر 4 إلى 10 سنوات يُحسبان شخصًا واحدًا، والأطفال دون 4 سنوات مجانًا.';
        if (details.guests > details.details.capacity) message = 'يشمل السعر الإضافات: 500 ريال لكل كبير إضافي و250 ريالًا لكل طفل إضافي؛ ويُحسب كل طفلين شخصًا واحدًا ضمن السعة.';
        if (details.offer === 'standard' && details.guests < 2) message = 'الحد الأدنى للحجز اليومي شخصان.';
        if (!availableDates.length) message = 'لا توجد مواعيد متاحة لهذه الباقة حاليًا.';
        totalElement.textContent = `${details.total.toLocaleString('en-US')} ريال`;
        messageElement.textContent = `${details.details.name} (${details.details.hours}): ${message}`;
    }

    async function loadAvailableDates(clearStatus = true) {
        const requestId = ++availabilityRequest;
        calendar.setAttribute('aria-busy', 'true');
        calendarMonth.textContent = 'جارٍ تحميل المواعيد...';
        calendarDays.replaceChildren();
        if (clearStatus) statusElement.textContent = '';
        try {
            const response = await fetch(`/api/availability?offer=${encodeURIComponent(offerInput.value)}`);
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'تعذر تحميل المواعيد.');
            if (requestId !== availabilityRequest) return;
            availableDates = result.dates;
            calendarDaysByDate = new Map(result.days.map((day) => [day.date, day]));
            const firstAvailableDate = availableDates[0] || result.days[0]?.date;
            if (!currentCalendarMonth || !calendarDaysByDate.has(`${currentCalendarMonth}-01`) &&
                ![...calendarDaysByDate.keys()].some((date) => date.startsWith(currentCalendarMonth))) {
                currentCalendarMonth = firstAvailableDate?.slice(0, 7) || null;
            }
            if (dateInput.value && !availableDates.includes(dateInput.value)) {
                dateInput.value = '';
                calendarSelected.textContent = 'اختر يومًا متاحًا من التقويم.';
            } else if (dateInput.value) {
                calendarSelected.textContent = `التاريخ المختار: ${formatBookingDate(dateInput.value)}`;
            } else {
                calendarSelected.textContent = 'اختر يومًا متاحًا من التقويم.';
            }
            renderCalendar();
        } catch (error) {
            if (requestId !== availabilityRequest) return;
            availableDates = [];
            calendarDaysByDate.clear();
            currentCalendarMonth = null;
            calendarMonth.textContent = 'تعذر تحميل المواعيد';
            previousMonthButton.disabled = true;
            nextMonthButton.disabled = true;
            statusElement.textContent = `${error.message} يرجى تحديث الصفحة أو التواصل معنا.`;
        } finally {
            if (requestId === availabilityRequest) calendar.setAttribute('aria-busy', 'false');
        }
        updateSummary();
    }

    previousMonthButton.addEventListener('click', () => {
        if (!currentCalendarMonth) return;
        const [year, month] = currentCalendarMonth.split('-').map(Number);
        currentCalendarMonth = new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 7);
        renderCalendar();
    });
    nextMonthButton.addEventListener('click', () => {
        if (!currentCalendarMonth) return;
        const [year, month] = currentCalendarMonth.split('-').map(Number);
        currentCalendarMonth = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 7);
        renderCalendar();
    });

    form.addEventListener('input', updateSummary);
    offerInput.addEventListener('change', loadAvailableDates);
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const details = getDetails();
        if (!form.reportValidity()) return;
        if (!dateInput.value || !availableDates.includes(dateInput.value)) {
            statusElement.textContent = 'يرجى اختيار موعد متاح لهذه الباقة.';
            calendar.focus();
            return;
        }
        if (details.offer === 'standard' && details.guests < 2) {
            statusElement.textContent = 'الحد الأدنى للحجز اليومي شخصان.';
            adultsInput.focus();
            return;
        }
        statusElement.textContent = 'جارٍ إرسال طلبك...';
        submitButton.disabled = true;
        try {
            const response = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    offer: details.offer,
                    date: dateInput.value,
                    adults: details.adults,
                    children: details.children,
                    toddlers: details.toddlers,
                    name: document.querySelector('#booking-name').value.trim(),
                    phone: document.querySelector('#booking-phone').value.trim()
                })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'تعذر إرسال طلب الحجز.');
            totalElement.textContent = `${result.booking.total.toLocaleString('en-US')} ريال`;
            const text = `مرحباً، أرسلت طلب حجز إلى شاليه هابينيس.
رقم الطلب: ${result.booking.id}
الباقة: ${details.details.name}
التاريخ: ${formatBookingDate(dateInput.value)}
الاسم: ${document.querySelector('#booking-name').value.trim()}
الكبار: ${details.adults}
الأطفال من 4 إلى 10 سنوات: ${details.children}
الأطفال أقل من 4 سنوات: ${details.toddlers}
السعر التقديري: ${result.booking.total.toLocaleString('en-US')} ريال
الحالة: بانتظار تأكيد الإدارة.`;
            const whatsappLink = document.createElement('a');
            whatsappLink.href = `https://wa.me/967783112244?text=${encodeURIComponent(text)}`;
            whatsappLink.target = '_blank';
            whatsappLink.rel = 'noopener noreferrer';
            whatsappLink.textContent = 'إرسال تفاصيل الطلب عبر واتساب';
            whatsappLink.className = 'booking-whatsapp-link';
            statusElement.textContent = `تم حفظ طلبك رقم ${result.booking.id} وهو بانتظار تأكيد الإدارة. `;
            statusElement.append(whatsappLink);
            await loadAvailableDates(false);
            dateInput.value = '';
        } catch (error) {
            statusElement.textContent = error.message;
            if (error.message.includes('محجوز') || error.message.includes('متاح')) await loadAvailableDates(false);
        } finally {
            submitButton.disabled = false;
        }
    });

    loadAvailableDates();
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