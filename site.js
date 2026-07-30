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

function normalizePathname(pathname) {
  if (!pathname || pathname === '/') return '/';
  return pathname.replace(/\/+$/, '') || '/';
}

function getStoredRoute() {
  try {
    const stored = sessionStorage.getItem('spa-route');
    sessionStorage.removeItem('spa-route');
    return stored;
  } catch (error) {
    return null;
  }
}

function setActiveRoute(pathname) {
  const normalized = normalizePathname(pathname);
  const key = routes[normalized] ? routes[normalized] : 'home';
  document.querySelectorAll('.page').forEach((page) => page.classList.remove('active'));
  const active = document.getElementById(sections[key]);
  if (active) {
    active.classList.add('active');
  }

  document.querySelectorAll('[data-nav-link]').forEach((link) => {
    const linkPath = normalizePathname(link.getAttribute('href'));
    const isActive = linkPath === normalized || (normalized === '/' && linkPath === '/');
    link.classList.toggle('active', isActive);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function navigate(pathname) {
  const normalized = normalizePathname(pathname);
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
window.addEventListener('load', () => {
  const storedRoute = getStoredRoute();
  const requestedPath = normalizePathname(storedRoute || window.location.pathname);
  const targetPath = requestedPath === '/' || routes[requestedPath] ? requestedPath : '/';

  if (targetPath !== window.location.pathname) {
    window.history.replaceState({}, '', targetPath);
  }

  setActiveRoute(targetPath);
});
setActiveRoute(window.location.pathname);
