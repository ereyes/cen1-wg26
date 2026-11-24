'use strict';

const svg = document.querySelector('#drawing');
const resetButton = document.querySelector('#reset');
const status = document.querySelector('#status');
const NS = 'http://www.w3.org/2000/svg';
const SPACING = 20;
let lines = [];
let width = 0;
let height = 0;
let drag = null;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function updateLine(item) {
  item.group.setAttribute('transform', `translate(0 ${item.y})`);
  item.group.setAttribute('aria-valuenow', String(Math.round(item.y)));
  item.group.setAttribute('aria-valuemax', String(Math.floor(height)));
  item.ink.setAttribute('x2', String(width));
  item.hit.setAttribute('x2', String(width));
}

function pointerY(event) {
  const matrix = svg.getScreenCTM();
  if (!matrix) return 0;
  return new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()).y;
}

function finishDrag(event) {
  if (!drag || (event && event.pointerId !== drag.pointerId)) return;
  const current = drag;
  drag = null;
  current.item.group.classList.remove('is-dragging');
  if (current.item.group.hasPointerCapture(current.pointerId)) {
    current.item.group.releasePointerCapture(current.pointerId);
  }
}

function addLine(index) {
  const group = document.createElementNS(NS, 'g');
  group.classList.add('svg-line');
  group.setAttribute('tabindex', '0');
  group.setAttribute('role', 'slider');
  group.setAttribute('aria-label', `Position verticale de la ligne ${index + 1}`);
  group.setAttribute('aria-orientation', 'vertical');
  group.setAttribute('aria-valuemin', '0');
  const ink = document.createElementNS(NS, 'line');
  ink.classList.add('ink');
  const hit = document.createElementNS(NS, 'line');
  hit.classList.add('hit');
  for (const line of [ink, hit]) {
    line.setAttribute('x1', '0');
    line.setAttribute('y1', '0');
    line.setAttribute('y2', '0');
    group.append(line);
  }
  const item = {group, ink, hit, y: (index + 1) * SPACING};
  group.addEventListener('pointerdown', event => {
    if (drag || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    // Déplacer l’objet avant de lui donner le focus et de capturer le pointeur.
    svg.append(group);
    group.focus({preventScroll: true});
    drag = {item, pointerId: event.pointerId, offset: pointerY(event) - item.y};
    group.setPointerCapture(event.pointerId);
    group.classList.add('is-dragging');
  });
  group.addEventListener('pointermove', event => {
    if (!drag || drag.item !== item || event.pointerId !== drag.pointerId) return;
    item.y = clamp(pointerY(event) - drag.offset, 0, height);
    updateLine(item);
  });
  group.addEventListener('pointerup', finishDrag);
  group.addEventListener('pointercancel', finishDrag);
  group.addEventListener('lostpointercapture', finishDrag);
  group.addEventListener('keydown', event => {
    let next;
    const step = event.shiftKey ? SPACING : 1;
    if (event.key === 'ArrowUp') next = item.y - step;
    if (event.key === 'ArrowDown') next = item.y + step;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = height;
    if (next === undefined) return;
    event.preventDefault();
    item.y = clamp(next, 0, height);
    updateLine(item);
  });
  svg.append(group);
  lines.push(item);
}

function resize() {
  width = svg.clientWidth;
  height = svg.clientHeight;
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  const count = Math.floor(height / SPACING);
  while (lines.length < count) addLine(lines.length);
  while (lines.length > count) {
    const item = lines.pop();
    if (drag?.item === item) finishDrag();
    item.group.remove();
  }
  for (const item of lines) {
    item.y = clamp(item.y, 0, height);
    updateLine(item);
  }
}

resetButton.addEventListener('click', () => {
  finishDrag();
  lines.forEach((item, index) => {
    item.y = (index + 1) * SPACING;
    updateLine(item);
    svg.append(item.group);
  });
  status.textContent = 'Les lignes sont à nouveau espacées de 20 pixels.';
});
window.addEventListener('blur', () => finishDrag());
window.addEventListener('resize', resize);
resize();
