/**
 * Site-wide behaviour: theme toggle, mobile navigation, broken-thumbnail fallback.
 */

// ---- Theme toggle -----------------------------------------------------------
const THEME_KEY = 'datafolio-theme';
const themeBtn = document.querySelector('[data-theme-toggle]');

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeBtn?.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
}
applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');

themeBtn?.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    /* storage unavailable (private mode) — theme still applies for this visit */
  }
});

// ---- Mobile navigation ------------------------------------------------------
const menuBtn = document.querySelector('[data-menu-toggle]');
const menu = document.getElementById('mobile-nav');

function setMenu(open) {
  if (!menuBtn || !menu) return;
  menu.hidden = !open;
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}

menuBtn?.addEventListener('click', () => setMenu(menu.hidden));
menu?.addEventListener('click', (e) => {
  if (e.target instanceof Element && e.target.closest('a')) setMenu(false);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && menu && !menu.hidden) {
    setMenu(false);
    menuBtn.focus();
  }
});
document.addEventListener('click', (e) => {
  if (!menu || menu.hidden) return;
  if (e.target instanceof Element && !e.target.closest('.df-header')) setMenu(false);
});
window.matchMedia('(min-width: 768px)').addEventListener('change', (e) => e.matches && setMenu(false));

// ---- Thumbnail fallback -----------------------------------------------------
// A broken image is hidden so the designed fallback underneath shows instead.
function failThumb(img) {
  img.hidden = true;
}
document.querySelectorAll('img[data-thumb]').forEach((img) => {
  if (img.complete && img.naturalWidth === 0) failThumb(img);
  else img.addEventListener('error', () => failThumb(img), { once: true });
});
