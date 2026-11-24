'use strict';

const canvas = document.querySelector('#drawing');
const ctx = canvas.getContext('2d');
const motionButton = document.querySelector('#motion');
const motionNote = document.querySelector('#motion-note');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const SPACING = 20;
const pointer = {x: 0, y: 0, inside: false};
let width = 0;
let height = 0;
let frame = null;
let previousTime = 0;
let phase = 0;
let strength = 0;
let paused = reducedMotion.matches;

function draw() {
  ctx.clearRect(0, 0, width, height);
  ctx.lineWidth = 1;
  for (let baseY = SPACING; baseY <= height; baseY += SPACING) {
    const proximity = Math.exp(-(((baseY - pointer.y) / 85) ** 2));
    const amplitude = 28 * strength * proximity;
    ctx.strokeStyle = amplitude > 0.6 ? '#087856' : '#a2adb7';
    ctx.beginPath();
    if (amplitude < 0.01) {
      ctx.moveTo(0, baseY);
      ctx.lineTo(width, baseY);
    } else {
      for (let x = 0; x < width; x += 4) {
        const envelope = Math.exp(-(((x - pointer.x) / 260) ** 2));
        const y = baseY + amplitude * envelope * Math.sin(x * 0.035 - phase);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      const edgeEnvelope = Math.exp(-(((width - pointer.x) / 260) ** 2));
      ctx.lineTo(width, baseY + amplitude * edgeEnvelope * Math.sin(width * 0.035 - phase));
    }
    ctx.stroke();
  }
}

function animate(time) {
  frame = null;
  const dt = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 1 / 60;
  previousTime = time;
  const target = pointer.inside ? 1 : 0;
  strength += (target - strength) * (1 - Math.exp(-dt * 9));
  if (!pointer.inside && strength < 0.001) strength = 0;
  phase += dt * 4.8;
  draw();
  if (!paused && !document.hidden && (pointer.inside || strength > 0)) {
    frame = requestAnimationFrame(animate);
  } else previousTime = 0;
}

function start() {
  if (!paused && !document.hidden && frame === null) frame = requestAnimationFrame(animate);
}

function stop() {
  if (frame !== null) cancelAnimationFrame(frame);
  frame = null;
  previousTime = 0;
}

function resize() {
  width = canvas.clientWidth;
  height = canvas.clientHeight;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}

function move(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = event.clientX - rect.left;
  pointer.y = event.clientY - rect.top;
  pointer.inside = true;
  if (paused) {
    // Une déformation fixe reste explorable sans animation temporelle.
    strength = 1;
    draw();
  } else start();
}

function leave() {
  pointer.inside = false;
  if (paused) { strength = 0; draw(); }
  else start();
}

function updateButton() {
  motionButton.setAttribute('aria-pressed', String(paused));
  motionButton.textContent = paused ? 'Animer l’onde' : 'Figer l’animation';
}

motionButton.addEventListener('click', () => {
  paused = !paused;
  updateButton();
  if (paused) stop();
  else if (pointer.inside || strength > 0) start();
});
canvas.addEventListener('pointerenter', move);
canvas.addEventListener('pointermove', move);
canvas.addEventListener('pointerdown', move);
canvas.addEventListener('pointerleave', leave);
canvas.addEventListener('pointercancel', leave);
canvas.addEventListener('pointerup', event => { if (event.pointerType !== 'mouse') leave(); });
window.addEventListener('blur', leave);
window.addEventListener('resize', resize);
// Le DPR peut changer lors d’un passage d’un écran à l’autre.
function watchResolution() {
  const query = matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
  query.addEventListener('change', () => { resize(); watchResolution(); }, {once: true});
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { stop(); pointer.inside = false; strength = 0; }
  else draw();
});
reducedMotion.addEventListener('change', event => {
  paused = event.matches;
  updateButton();
  if (paused) stop(); else if (pointer.inside || strength > 0) start();
  motionNote.textContent = paused ? 'Réduction des animations : onde figée.' : 'Animation autorisée.';
});
if (paused) motionNote.textContent = 'Réduction des animations : onde figée.';
updateButton();
watchResolution();
resize();
