export function isValidTimeZone(timeZone) {
    try {
        new Intl.DateTimeFormat('en-US', { timeZone }).format();
        return true;
    }
    catch {
        return false;
    }
}
export function dateKeyInTimeZone(instant, timeZone) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(instant);
    const part = (type) => parts.find((value) => value.type === type)?.value;
    return `${part('year')}-${part('month')}-${part('day')}`;
}
export function dateOnlyKey(date) {
    return date.toISOString().slice(0, 10);
}
//# sourceMappingURL=property-date.js.map