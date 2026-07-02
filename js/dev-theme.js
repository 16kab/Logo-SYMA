const DEV_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export function isDevHost(hostname = '') {
  return DEV_HOSTS.has(hostname);
}

export function activateDevTheme({ document = globalThis.document, location = globalThis.location } = {}) {
  if (!document?.body || !isDevHost(location?.hostname)) return false;

  document.body.classList.add('dev-immersive');
  document.body.dataset.experience = 'immersive-gallery';
  return true;
}
