'use strict';

const loginForm = document.querySelector('#login-form');
const messageElement = document.querySelector('#message');
const bookingsElement = document.querySelector('#bookings');
const logoutButton = document.querySelector('#logout-button');

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        credentials: 'same-origin',
        ...options,
        headers: {
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            ...options.headers
        }
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'تعذر تنفيذ الطلب.');
    return result;
}

function addDetail(list, label, value) {
    const row = document.createElement('div');
    const term = document.createElement('dt');
    const detail = document.createElement('dd');
    term.textContent = label;
    detail.textContent = value;
    row.append(term, detail);
    list.append(row);
}

function renderBooking(booking) {
    const card = document.createElement('article');
    card.className = 'booking';
    const heading = document.createElement('h2');
    heading.textContent = `طلب رقم ${booking.id} - ${booking.packageName}`;
    const details = document.createElement('dl');
    const date = new Intl.DateTimeFormat('ar-YE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC'
    }).format(new Date(`${booking.date}T12:00:00Z`));
    addDetail(details, 'التاريخ', date);
    addDetail(details, 'العميل', booking.name);
    addDetail(details, 'الهاتف', booking.phone);
    addDetail(details, 'عدد الكبار', String(booking.adults));
    addDetail(details, 'الأطفال 4-10 سنوات', String(booking.children));
    addDetail(details, 'الأطفال دون 4 سنوات', String(booking.toddlers));
    addDetail(details, 'المبلغ التقديري', `${booking.total.toLocaleString('en-US')} ريال`);
    addDetail(details, 'الحالة', {
        pending: 'بانتظار التأكيد',
        confirmed: 'مؤكد',
        rejected: 'مرفوض'
    }[booking.status]);
    const actions = document.createElement('div');
    actions.className = 'booking-actions';
    let phoneDigits = booking.phone.replace(/\D/g, '');
    if (phoneDigits.startsWith('00')) phoneDigits = phoneDigits.slice(2);
    if (phoneDigits.startsWith('0')) phoneDigits = `967${phoneDigits.slice(1)}`;
    else if (phoneDigits.length === 9) phoneDigits = `967${phoneDigits}`;
    const whatsapp = document.createElement('a');
    const statusMessage = {
        pending: 'وصلنا طلبك وهو بانتظار مراجعة الإدارة.',
        confirmed: 'تم تأكيد حجزك.',
        rejected: 'نعتذر، لم نتمكن من قبول طلب الحجز.'
    }[booking.status];
    const whatsappText = `مرحبًا ${booking.name}، ${statusMessage}
طلب حجز شاليه هابينيس رقم ${booking.id}
الباقة: ${booking.packageName}
التاريخ: ${date}
السعر: ${booking.total.toLocaleString('en-US')} ريال`;
    whatsapp.href = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(whatsappText)}`;
    whatsapp.target = '_blank';
    whatsapp.rel = 'noopener noreferrer';
    whatsapp.className = 'whatsapp';
    whatsapp.textContent = 'مراسلة العميل عبر واتساب';
    actions.append(whatsapp);

    if (booking.status === 'pending') {
        const confirmButton = document.createElement('button');
        confirmButton.type = 'button';
        confirmButton.textContent = 'تأكيد الحجز';
        confirmButton.addEventListener('click', () => updateBooking(booking.id, 'confirmed'));
        const rejectButton = document.createElement('button');
        rejectButton.type = 'button';
        rejectButton.className = 'reject';
        rejectButton.textContent = 'رفض الطلب';
        rejectButton.addEventListener('click', () => updateBooking(booking.id, 'rejected'));
        actions.prepend(confirmButton, rejectButton);
    }
    card.append(heading, details, actions);
    return card;
}

async function loadBookings() {
    const result = await apiRequest('/api/admin/bookings');
    bookingsElement.replaceChildren();
    if (!result.bookings.length) {
        bookingsElement.textContent = 'لا توجد طلبات حجز حتى الآن.';
        return;
    }
    result.bookings.forEach((booking) => bookingsElement.append(renderBooking(booking)));
}

async function updateBooking(id, status) {
    messageElement.className = 'notice';
    messageElement.textContent = 'جارٍ تحديث حالة الطلب...';
    try {
        await apiRequest(`/api/admin/bookings/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
        messageElement.textContent = status === 'confirmed' ? 'تم تأكيد الحجز.' : 'تم رفض الطلب وإتاحة الموعد مجددًا.';
        await loadBookings();
    } catch (error) {
        messageElement.className = 'error';
        messageElement.textContent = error.message;
    }
}

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    messageElement.className = '';
    messageElement.textContent = 'جارٍ تسجيل الدخول...';
    try {
        await apiRequest('/api/admin/login', {
            method: 'POST',
            body: JSON.stringify({ password: loginForm.elements.password.value })
        });
        loginForm.hidden = true;
        logoutButton.hidden = false;
        messageElement.textContent = '';
        await loadBookings();
    } catch (error) {
        messageElement.className = 'error';
        messageElement.textContent = error.message;
    }
});

logoutButton.addEventListener('click', async () => {
    try {
        await apiRequest('/api/admin/logout', { method: 'POST' });
        loginForm.hidden = false;
        logoutButton.hidden = true;
        bookingsElement.replaceChildren();
        messageElement.textContent = 'تم تسجيل الخروج.';
    } catch (error) {
        messageElement.className = 'error';
        messageElement.textContent = error.message;
    }
});

apiRequest('/api/admin/session')
    .then(({ authenticated }) => {
        if (!authenticated) return;
        loginForm.hidden = true;
        logoutButton.hidden = false;
        return loadBookings();
    })
    .catch((error) => {
        messageElement.className = 'error';
        messageElement.textContent = error.message;
    });
