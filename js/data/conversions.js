// ============================================
// UNIT HUNTER — Unit Conversion Definitions
// ============================================

export const CONVERSION_CATEGORIES = {
  length: {
    id: 'length',
    name: 'Length (meter)',
    baseUnit: 'm',
    unlockLevel: 1,
    units: {
      nm: { name: 'Nanometers',  factor: 1e-9,  abbr: 'nm' },
      µm: { name: 'Micrometers', factor: 1e-6,  abbr: 'µm' },
      mm: { name: 'Millimeters', factor: 0.001,  abbr: 'mm' },
      cm: { name: 'Centimeters', factor: 0.01,   abbr: 'cm' },
      m:  { name: 'Meters',      factor: 1,      abbr: 'm' },
      km: { name: 'Kilometers',  factor: 1000,   abbr: 'km' }
    }
  },
  mass: {
    id: 'mass',
    name: 'Mass (kilogram)',
    baseUnit: 'kg',
    unlockLevel: 1,
    units: {
      µg: { name: 'Micrograms', factor: 1e-9,  abbr: 'µg' },
      mg: { name: 'Milligrams', factor: 1e-6,  abbr: 'mg' },
      g:  { name: 'Grams',      factor: 0.001, abbr: 'g' },
      kg: { name: 'Kilograms',  factor: 1,     abbr: 'kg' }
    }
  },
  time: {
    id: 'time',
    name: 'Time (second)',
    baseUnit: 's',
    unlockLevel: 1,
    units: {
      µs: { name: 'Microseconds', factor: 1e-6, abbr: 'µs' },
      ms: { name: 'Milliseconds', factor: 1e-3, abbr: 'ms' },
      s:  { name: 'Seconds',      factor: 1,    abbr: 's' },
      ks: { name: 'Kiloseconds',  factor: 1e3,  abbr: 'ks' }
    }
  },
  current: {
    id: 'current',
    name: 'Electric Current (ampere)',
    baseUnit: 'A',
    unlockLevel: 1,
    units: {
      µA: { name: 'Microamperes', factor: 1e-6, abbr: 'µA' },
      mA: { name: 'Milliamperes', factor: 0.001, abbr: 'mA' },
      A:  { name: 'Amperes',      factor: 1,      abbr: 'A' },
      kA: { name: 'Kiloamperes',  factor: 1000,   abbr: 'kA' }
    }
  },
  temperature: {
    id: 'temperature',
    name: 'Temperature (kelvin)',
    baseUnit: 'K',
    unlockLevel: 1,
    units: {
      mK: { name: 'Millikelvin', factor: 1e-3, abbr: 'mK' },
      K:  { name: 'Kelvin',      factor: 1,    abbr: 'K' },
      kK: { name: 'Kilokelvin',  factor: 1e3,  abbr: 'kK' }
    }
  },
  amount: {
    id: 'amount',
    name: 'Amount of Substance (mole)',
    baseUnit: 'mol',
    unlockLevel: 1,
    units: {
      µmol: { name: 'Micromoles', factor: 1e-6, abbr: 'µmol' },
      mmol: { name: 'Millimoles', factor: 1e-3, abbr: 'mmol' },
      mol:  { name: 'Moles',      factor: 1,      abbr: 'mol' },
      kmol: { name: 'Kilomoles',  factor: 1000,   abbr: 'kmol' }
    }
  },
  luminous: {
    id: 'luminous',
    name: 'Luminous Intensity (candela)',
    baseUnit: 'cd',
    unlockLevel: 1,
    units: {
      mcd: { name: 'Millicandelas', factor: 0.001, abbr: 'mcd' },
      cd:  { name: 'Candelas',      factor: 1,      abbr: 'cd' },
      kcd: { name: 'Kilocandelas',  factor: 1000,   abbr: 'kcd' }
    }
  }
};

// Scale magnitude for keeping SI-prefix conversions readable.
export function getUnitScaleMagnitude(unit, categoryId) {
  const cat = CONVERSION_CATEGORIES[categoryId];
  if (!cat) return 0;
  const u = cat.units[unit];
  if (!u || !u.factor) return 0;
  return Math.log10(u.factor || 1);
}

// General linear conversion
export function convertLinear(value, fromFactor, toFactor) {
  return value * fromFactor / toFactor;
}

// Round to a reasonable number of decimal places
export function roundForDisplay(value) {
  if (value === 0) return 0;
  const abs = Math.abs(value);
  if (abs >= 1000) return Math.round(value);
  if (abs >= 100) return Math.round(value * 10) / 10;
  if (abs >= 1) return Math.round(value * 100) / 100;
  if (abs >= 0.01) return Math.round(value * 1000) / 1000;
  return Math.round(value * 10000) / 10000;
}

// Get all unlocked categories for a given level
export function getUnlockedCategories(level) {
  return Object.values(CONVERSION_CATEGORIES)
    .filter(cat => cat.unlockLevel <= level)
    .map(cat => cat.id);
}
