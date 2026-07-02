export async function loadInlineSvg(url, container) {
  const response = await fetch(url);
  const svgText = await response.text();
  container.innerHTML = svgText;
  return container.querySelector('svg');
}

export function recolorSvg(svgElement, color) {
  if (!svgElement) return;
  const targets = svgElement.querySelectorAll('path, text, polygon, circle, rect');
  targets.forEach((el) => {
    el.style.fill = color;
  });
}
