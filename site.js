const routes = {
  '/': 'home',
  '/call-support': 'call-support',
  '/insurance-verification': 'insurance-verification',
  '/rcm-billing': 'rcm-billing',
  '/admin-support': 'admin-support',
  '/contact': 'contact'
};

const sections = {
  home: 'page-dental',
  'call-support': 'page-call-support',
  'insurance-verification': 'page-insurance-verification',
  'rcm-billing': 'page-rcm-billing',
  'admin-support': 'page-admin-support',
  contact: 'page-book'
};

function setActiveRoute(pathname) {
  const key = routes[pathname] || 'home';
  document.querySelectorAll('.page').forEach((page) => page.classList.remove('active'));
  const active = document.getElementById(sections[key]);
  if (active) {
    active.classList.add('active');
  }

  document.querySelectorAll('[data-nav-link]').forEach((link) => {
    const isActive = link.getAttribute('href') === pathname || (pathname === '/' && link.getAttribute('href') === '/');
    link.classList.toggle('active', isActive);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function navigate(pathname) {
  const normalized = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
  if (normalized === window.location.pathname) {
    setActiveRoute(normalized);
    return;
  }
  window.history.pushState({}, '', normalized);
  setActiveRoute(normalized);
}

document.addEventListener('click', (event) => {
  const link = event.target.closest('[data-nav-link]');
  if (link) {
    event.preventDefault();
    navigate(link.getAttribute('href'));
  }
});

window.addEventListener('popstate', () => setActiveRoute(window.location.pathname));
window.addEventListener('load', () => setActiveRoute(window.location.pathname));
setActiveRoute(window.location.pathname);
