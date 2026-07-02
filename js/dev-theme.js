export function activateDevTheme({ document = globalThis.document } = {}) {
  if (!document?.body) return false;

  document.body.classList.add('dev-immersive');
  document.body.dataset.experience = 'immersive-gallery';
  return true;
}
