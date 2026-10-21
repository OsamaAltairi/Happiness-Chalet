import test from 'node:test';
import assert from 'node:assert/strict';
import {
    calculatePrice,
    getDateAvailability,
    isIsoDate,
    isOfficialHoliday
} from '../booking-rules.js';

test('calculates the daily package with per-person child surcharges', () => {
    assert.deepEqual(calculatePrice('standard', 22, 4, 1), {
        basePrice: 40000,
        extraAdults: 2,
        extraChildren: 4,
        guests: 24,
        total: 42000
    });
});

test('counts two eligible children as one capacity unit and toddlers as free', () => {
    assert.deepEqual(calculatePrice('family', 5, 4, 3), {
        basePrice: 25000,
        extraAdults: 0,
        extraChildren: 4,
        guests: 7,
        total: 26000
    });
});

test('validates minimum daily party size and rejects invalid counts', () => {
    assert.throws(() => calculatePrice('standard', 1, 0, 2), /الحد الأدنى/);
    assert.throws(() => calculatePrice('family', -1, 0, 0), /أعداد الأشخاص/);
});

test('offers run Saturday through Tuesday only', () => {
    assert.equal(getDateAvailability('family', '2026-10-24').available, true);
    assert.equal(getDateAvailability('family', '2026-10-22').available, false);
    assert.equal(getDateAvailability('standard', '2026-10-22').available, true);
});

test('tent and glass offers exclude configured public holidays', () => {
    assert.equal(getDateAvailability('tent', '2027-05-22').available, false);
    assert.equal(getDateAvailability('glass', '2026-10-24', new Set(['2026-10-24'])).available, false);
    assert.equal(getDateAvailability('family', '2027-05-22').available, true);
    assert.equal(isOfficialHoliday('2026-05-01'), true);
    assert.equal(isOfficialHoliday('2026-03-20'), true);
    assert.equal(isOfficialHoliday('2026-05-27'), true);
});

test('validates calendar dates rather than accepting impossible dates', () => {
    assert.equal(isIsoDate('2028-02-29'), true);
    assert.equal(isIsoDate('2027-02-29'), false);
    assert.equal(getDateAvailability('standard', '2027-02-29').available, false);
});
