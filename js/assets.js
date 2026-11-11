// Where a picture lives. On a web server the pictures are ordinary files next
// to the page. The single-file build (START-HERE.html) carries them inside the
// page as data URLs, listed in window.BPS_ASSETS by tools/build.mjs.

const inlined = (typeof window !== 'undefined' && window.BPS_ASSETS) || {};

export const assetUrl = (path) => inlined[path] || path;
