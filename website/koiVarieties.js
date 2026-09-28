// Koi variety registry (same plain-module style as the other drawing
// modules). ADDING A TYPE: append one frozen entry below and reference
// its key in main.js's school list, no other file changes needed.
// Blending math stays linear: canvas interpolates the body stops in
// RGBA, patches are flat inks.
//
// @typedef {Object} KoiVariety
// @property {string} label
// @property {Array<[number, string]>} body - head→tail gradient stops
// @property {Array<[number, number, number]>} inks - patch colors, round-robined
// @property {number} patchCount
function frozen(entry) {
    entry.body.forEach(stop => Object.freeze(stop));
    entry.inks.forEach(ink => Object.freeze(ink));
    return Object.freeze(entry);
}

export const KOI_VARIETIES = Object.freeze({
    sanke: frozen({
        label: "Sanke",
        body: [[0, "#fdfbf4"], [0.5, "#f6f0e1"], [1, "#e7dbc4"]],
        inks: [[12, 12, 14], [198, 47, 36]], // sumi black, hi red
        patchCount: 8,
    }),
    kohaku: frozen({
        label: "Kohaku",
        body: [[0, "#fdfbf4"], [0.5, "#f6f0e1"], [1, "#e7dbc4"]],
        inks: [[198, 47, 36]], // hi red only
        patchCount: 6,
    }),
    yamabuki: frozen({
        label: "Yamabuki (orange)",
        body: [[0, "#f5a83c"], [0.5, "#f08a24"], [1, "#cf6414"]],
        inks: [[58, 28, 8], [248, 246, 240]], // dark brown-black, shiroji white
        patchCount: 7,
    }),
    showa: frozen({
        label: "Showa (dark)",
        body: [[0, "#2e2e34"], [0.5, "#3b3b42"], [1, "#17171b"]],
        inks: [[198, 47, 36], [248, 246, 240]], // hi red, shiroji white
        patchCount: 8,
    }),
    hi_utsuri: frozen({
        label: "Hi Utsuri",
        body: [[0, "#232327"], [0.5, "#2f2f36"], [1, "#101013"]],
        inks: [[214, 66, 28]], // deep hi orange-red only
        patchCount: 7,
    }),
});

const warnedKeys = new Set();

// Pure lookup with safe fallback. Unknown keys warn once (fail-visible)
// instead of silently rendering the wrong fish.
export function varietyOf(key) {
    let entry = KOI_VARIETIES[key];
    if (!entry) {
        if (key !== undefined && !warnedKeys.has(key)) {
            warnedKeys.add(key);
            console.warn(`[koi] unknown variety "${key}", falling back to sanke`);
        }
        entry = KOI_VARIETIES.sanke;
    }
    return entry;
}

// Resolve the palette for a chain. The single place that reads the
// (stringly-typed) chain.variety field, so callers never repeat the
// lookup-or-fallback logic. Returns { key, variety }.
export function resolveVariety(chain) {
    let key = chain?.variety ?? "sanke";
    return { key, variety: varietyOf(key) };
}
