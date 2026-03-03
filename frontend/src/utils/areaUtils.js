// ============================================
// Area Unit Conversion Utility
// All DB values are stored in ACRES.
// This utility converts to/from the user's preferred display unit.
// ============================================

export const AREA_UNITS = [
    { key: "acres", label: "Acres", factor: 1 },
    { key: "cents", label: "Cents", factor: 100 },       // 100 cents = 1 acre (common in Kerala)
    { key: "hectares", label: "Hectares", factor: 0.404686 },  // 1 acre = 0.404686 ha
    { key: "sqm", label: "Square Meters", factor: 4046.86 },   // 1 acre = 4046.86 sqm
    { key: "sqft", label: "Square Feet", factor: 43560 },     // 1 acre = 43560 sqft
];

/** Get the user's preferred unit key from localStorage (default: acres) */
export function getPreferredUnit() {
    return localStorage.getItem("areaUnit") || "acres";
}

/** Save the user's preferred unit key to localStorage */
export function setPreferredUnit(unitKey) {
    localStorage.setItem("areaUnit", unitKey);
}

/** Get the unit object for a given key */
export function getUnitInfo(unitKey) {
    return AREA_UNITS.find(u => u.key === unitKey) || AREA_UNITS[0];
}

/** Convert acres (DB value) → display unit */
export function acresToDisplay(acreValue, unitKey) {
    const unit = getUnitInfo(unitKey);
    return (parseFloat(acreValue) || 0) * unit.factor;
}

/** Convert display unit → acres (for saving to DB) */
export function displayToAcres(displayValue, unitKey) {
    const unit = getUnitInfo(unitKey);
    return (parseFloat(displayValue) || 0) / unit.factor;
}

/** Format a value in the selected unit with the label suffix */
export function formatArea(acreValue, unitKey) {
    const val = acresToDisplay(acreValue, unitKey);
    const unit = getUnitInfo(unitKey);
    return `${val.toFixed(2)} ${unit.label.toLowerCase()}`;
}

/** Short label for the unit (e.g. "ac", "ct", "ha") */
export function shortLabel(unitKey) {
    const map = { acres: "ac", cents: "ct", hectares: "ha", sqm: "m²", sqft: "ft²" };
    return map[unitKey] || unitKey;
}

/** Capitalize and format crop names (handling underscores) */
export function formatCropName(name) {
    if (!name) return "";
    // If it's a crop object, extract the name
    const cropName = typeof name === 'object' ? (name.name || "") : name;
    if (!cropName) return "";

    return cropName
        .split(/[_\s]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
}
