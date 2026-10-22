'use strict';

const packages = Object.freeze({
    event_20: Object.freeze({ name: 'باقة المناسبات - 20 شخص', category: 'المناسبات', price: 40000, capacity: 20, hours: '10 ص - 10 م', days: null }),
    event_30: Object.freeze({ name: 'باقة المناسبات - 30 شخص', category: 'المناسبات', price: 45000, capacity: 30, hours: '10 ص - 10 م', days: null }),
    event_40: Object.freeze({ name: 'باقة المناسبات - 40 شخص', category: 'المناسبات', price: 50000, capacity: 40, hours: '10 ص - 10 م', days: null }),
    trip_weekend_20: Object.freeze({ name: 'باقة الرحلات - نهاية الأسبوع - 20 شخص', category: 'الرحلات - نهاية الأسبوع', price: 40000, capacity: 20, hours: '9 ص - 9 م', days: Object.freeze([3, 4, 5]) }),
    trip_weekend_30: Object.freeze({ name: 'باقة الرحلات - نهاية الأسبوع - 30 شخص', category: 'الرحلات - نهاية الأسبوع', price: 45000, capacity: 30, hours: '9 ص - 9 م', days: Object.freeze([3, 4, 5]) }),
    trip_weekend_40: Object.freeze({ name: 'باقة الرحلات - نهاية الأسبوع - 40 شخص', category: 'الرحلات - نهاية الأسبوع', price: 50000, capacity: 40, hours: '9 ص - 9 م', days: Object.freeze([3, 4, 5]) }),
    trip_weekday_5: Object.freeze({ name: 'باقة الرحلات - بداية الأسبوع - 5 أشخاص', category: 'الرحلات - بداية الأسبوع', price: 25000, capacity: 5, hours: '9 ص - 9 م', days: Object.freeze([6, 0, 1, 2]) }),
    trip_weekday_20: Object.freeze({ name: 'باقة الرحلات - بداية الأسبوع - 20 شخص', category: 'الرحلات - بداية الأسبوع', price: 32000, capacity: 20, hours: '9 ص - 9 م', days: Object.freeze([6, 0, 1, 2]) }),
    trip_weekday_30: Object.freeze({ name: 'باقة الرحلات - بداية الأسبوع - 30 شخص', category: 'الرحلات - بداية الأسبوع', price: 37000, capacity: 30, hours: '9 ص - 9 م', days: Object.freeze([6, 0, 1, 2]) }),
    trip_weekday_40: Object.freeze({ name: 'باقة الرحلات - بداية الأسبوع - 40 شخص', category: 'الرحلات - بداية الأسبوع', price: 42000, capacity: 40, hours: '9 ص - 9 م', days: Object.freeze([6, 0, 1, 2]) }),
    picnic_tent: Object.freeze({ name: 'باقة المقيل - مجلس الخيمة - 15 شخص', category: 'المقيل', price: 22000, capacity: 15, hours: '2 م - 10 م', days: Object.freeze([6, 0, 1, 2]) }),
    picnic_glass: Object.freeze({ name: 'باقة المقيل - الديوان الزجاجي - 15 شخص', category: 'المقيل', price: 22000, capacity: 15, hours: '2 م - 10 م', days: Object.freeze([6, 0, 1, 2]) })
});

const legacyPackageNames = Object.freeze({
    standard: 'الحجز اليومي',
    family: 'العائلة السعيدة',
    tent: 'مجلس الخيمة',
    glass: 'الديوان الزجاجي'
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

function getDateAvailability(offer, date) {
    const details = packages[offer];
    if (!details) return { available: false, reason: 'الباقة غير معروفة.' };
    if (!isIsoDate(date)) return { available: false, reason: 'التاريخ غير صالح.' };

    if (details.days) {
        const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
        if (!details.days.includes(weekday)) {
            const days = offer.startsWith('trip_weekend')
                ? 'من الأربعاء إلى الجمعة'
                : 'من السبت إلى الثلاثاء';
            return { available: false, reason: `هذه الباقة متاحة ${days} فقط.` };
        }
    }
    return { available: true, reason: '' };
}

function getPackageName(offer) {
    return packages[offer]?.name || legacyPackageNames[offer] || 'باقة غير معروفة';
}

function calculatePrice(offer, adults, children, toddlers) {
    const details = packages[offer];
    if (!details) throw new Error('الباقة غير معروفة.');
    if (![adults, children, toddlers].every((count) => Number.isSafeInteger(count) && count >= 0 && count <= 100)) {
        throw new Error('أعداد الأشخاص غير صالحة.');
    }
    if (adults + children + toddlers > 100) {
        throw new Error('الحد الأقصى لسعة الشاليه 100 شخص.');
    }

    const childUnits = Math.ceil(children / 2);
    const guests = adults + childUnits;
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
    getPackageName,
    getYemenDate,
    isIsoDate,
    packages
};
