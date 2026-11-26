const menuToggle = document.querySelector('.nav-toggle');
const siteNav = document.getElementById('site-nav');

menuToggle.setAttribute('aria-expanded', 'false');

menuToggle.addEventListener('click', () => {
  const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!isExpanded));
});

siteNav.addEventListener('click', (event) => {
  if (event.target.closest('a')) menuToggle.setAttribute('aria-expanded', 'false');
});

menuToggle.parentElement.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true' && menuToggle.offsetWidth) {
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.focus();
  }
});
