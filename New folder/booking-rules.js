'use strict';

const packages = Object.freeze({
    standard: Object.freeze({ name: 'الحجز اليومي', price: 40000, capacity: 20, hours: '9 ص - 9 م' }),
    family: Object.freeze({ name: 'العائلة السعيدة', price: 25000, capacity: 5, hours: '9 ص - 9 م' }),
    tent: Object.freeze({ name: 'مجلس الخيمة', price: 20000, capacity: 15, hours: '1 م - 10 م' }),
    glass: Object.freeze({ name: 'الديوان الزجاجي', price: 20000, capacity: 15, hours: '1 م - 10 م' })
});

const offerWeekdays = new Set([0, 1, 2, 6]);
const fixedHolidays = new Set(['05-01', '05-22', '09-26', '10-14', '11-30']);
const hijriDateFormatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
    day: 'numeric',
    month: 'numeric',
    timeZone: 'UTC'
});

function getYemenDate(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Aden',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return `${values.year}-${values.month}-${values.day}`;
}

function isIsoDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function isOfficialHoliday(date, additionalHolidays = new Set()) {
    if (additionalHolidays.has(date)) return true;
    const monthDay = date.slice(5);
    if (fixedHolidays.has(monthDay)) return true;

    const parts = hijriDateFormatter.formatToParts(new Date(`${date}T12:00:00.000Z`));
    const hijri = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    const month = Number(hijri.month);
    const day = Number(hijri.day);
    return (month === 1 && day === 1) ||
        (month === 10 && day >= 1 && day <= 3) ||
        (month === 12 && day >= 10 && day <= 13);
}

function getDateAvailability(offer, date, additionalHolidays = new Set()) {
    if (!packages[offer]) return { available: false, reason: 'الباقة غير معروفة.' };
    if (!isIsoDate(date)) return { available: false, reason: 'التاريخ غير صالح.' };

    const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
    if (offer !== 'standard' && !offerWeekdays.has(weekday)) {
        return { available: false, reason: 'العروض متاحة من السبت إلى الثلاثاء فقط.' };
    }
    if ((offer === 'tent' || offer === 'glass') && isOfficialHoliday(date, additionalHolidays)) {
        return { available: false, reason: 'لا يسري العرض في الإجازات الرسمية والأعياد.' };
    }
    return { available: true, reason: '' };
}

function calculatePrice(offer, adults, children, toddlers) {
    const details = packages[offer];
    if (!details) throw new Error('الباقة غير معروفة.');
    if (![adults, children, toddlers].every((count) => Number.isSafeInteger(count) && count >= 0 && count <= 100)) {
        throw new Error('أعداد الأشخاص غير صالحة.');
    }

    const childUnits = Math.ceil(children / 2);
    const guests = adults + childUnits;
    if (offer === 'standard' && guests < 2) throw new Error('الحد الأدنى للحجز اليومي شخصان.');

    const extraAdults = Math.max(adults - details.capacity, 0);
    const includedCapacityForChildren = Math.max(details.capacity - adults, 0);
    const extraChildren = Math.max(children - (includedCapacityForChildren * 2), 0);
    return {
        basePrice: details.price,
        extraAdults,
        extraChildren,
        guests,
        total: details.price + (extraAdults * 500) + (extraChildren * 250)
    };
}

export {
    calculatePrice,
    getDateAvailability,
    getYemenDate,
    isIsoDate,
    isOfficialHoliday,
    packages
};
