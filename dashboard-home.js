const galaxyCanvas = document.querySelector("#baGalaxyCanvas");
const galaxyCtx = galaxyCanvas?.getContext("2d");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let galaxyWidth = 0;
let galaxyHeight = 0;
let galaxyStars = [];
let galaxySignals = [];

function galaxyColor(type, alpha = 1) {
  const colors = [
    `rgba(69, 214, 170, ${alpha})`,
    `rgba(107, 223, 242, ${alpha})`,
    `rgba(255, 200, 87, ${alpha})`,
    `rgba(255, 111, 97, ${alpha})`,
    `rgba(167, 139, 250, ${alpha})`
  ];
  return colors[type] || colors[0];
}

function resizeGalaxy() {
  if (!galaxyCanvas || !galaxyCtx) return;

  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  galaxyWidth = window.innerWidth;
  galaxyHeight = window.innerHeight;
  galaxyCanvas.width = Math.floor(galaxyWidth * ratio);
  galaxyCanvas.height = Math.floor(galaxyHeight * ratio);
  galaxyCanvas.style.width = `${galaxyWidth}px`;
  galaxyCanvas.style.height = `${galaxyHeight}px`;
  galaxyCtx.setTransform(ratio, 0, 0, ratio, 0, 0);

  const starCount = Math.max(70, Math.floor((galaxyWidth * galaxyHeight) / 15000));
  galaxyStars = Array.from({ length: starCount }, (_, index) => ({
    x: Math.random() * galaxyWidth,
    y: Math.random() * galaxyHeight,
    vx: (Math.random() - 0.5) * 0.22,
    vy: (Math.random() - 0.5) * 0.22,
    size: Math.random() * 1.8 + 0.5,
    glow: Math.random() * 0.6 + 0.25,
    hue: index % 5
  }));

  galaxySignals = Array.from({ length: 9 }, (_, index) => ({
    x: (galaxyWidth / 10) * (index + 0.7),
    y: Math.random() * galaxyHeight,
    speed: 0.55 + Math.random() * 0.9,
    length: 110 + Math.random() * 180,
    hue: index % 5
  }));
}

function drawGalaxyCard(x, y, label, color) {
  galaxyCtx.save();
  galaxyCtx.translate(x, y);
  galaxyCtx.fillStyle = "rgba(8, 15, 14, 0.52)";
  galaxyCtx.strokeStyle = color;
  galaxyCtx.lineWidth = 1;
  galaxyCtx.beginPath();
  galaxyCtx.roundRect(0, 0, 116, 36, 8);
  galaxyCtx.fill();
  galaxyCtx.stroke();
  galaxyCtx.fillStyle = "rgba(238, 247, 243, 0.72)";
  galaxyCtx.font = "700 10px Inter, sans-serif";
  galaxyCtx.fillText(label, 13, 22);
  galaxyCtx.restore();
}

function animateGalaxy() {
  if (!galaxyCanvas || !galaxyCtx) return;

  galaxyCtx.clearRect(0, 0, galaxyWidth, galaxyHeight);

  const space = galaxyCtx.createLinearGradient(0, 0, galaxyWidth, galaxyHeight);
  space.addColorStop(0, "rgba(69, 214, 170, 0.08)");
  space.addColorStop(0.45, "rgba(107, 223, 242, 0.04)");
  space.addColorStop(1, "rgba(255, 111, 97, 0.055)");
  galaxyCtx.fillStyle = space;
  galaxyCtx.fillRect(0, 0, galaxyWidth, galaxyHeight);

  const core = galaxyCtx.createRadialGradient(galaxyWidth * 0.45, galaxyHeight * 0.42, 0, galaxyWidth * 0.45, galaxyHeight * 0.42, galaxyWidth * 0.58);
  core.addColorStop(0, "rgba(69, 214, 170, 0.08)");
  core.addColorStop(0.38, "rgba(107, 223, 242, 0.04)");
  core.addColorStop(1, "rgba(0, 0, 0, 0)");
  galaxyCtx.fillStyle = core;
  galaxyCtx.fillRect(0, 0, galaxyWidth, galaxyHeight);

  galaxySignals.forEach((signal) => {
    if (!reduceMotion) signal.y += signal.speed;
    if (signal.y - signal.length > galaxyHeight) signal.y = -signal.length;

    const trail = galaxyCtx.createLinearGradient(signal.x, signal.y - signal.length, signal.x, signal.y);
    trail.addColorStop(0, galaxyColor(signal.hue, 0));
    trail.addColorStop(1, galaxyColor(signal.hue, 0.38));
    galaxyCtx.strokeStyle = trail;
    galaxyCtx.lineWidth = 1;
    galaxyCtx.beginPath();
    galaxyCtx.moveTo(signal.x, signal.y - signal.length);
    galaxyCtx.lineTo(signal.x, signal.y);
    galaxyCtx.stroke();
  });

  for (let i = 0; i < galaxyStars.length; i += 1) {
    const star = galaxyStars[i];
    if (!reduceMotion) {
      star.x += star.vx;
      star.y += star.vy;
    }

    if (star.x < -20) star.x = galaxyWidth + 20;
    if (star.x > galaxyWidth + 20) star.x = -20;
    if (star.y < -20) star.y = galaxyHeight + 20;
    if (star.y > galaxyHeight + 20) star.y = -20;

    for (let j = i + 1; j < galaxyStars.length; j += 1) {
      const other = galaxyStars[j];
      const distance = Math.hypot(star.x - other.x, star.y - other.y);
      if (distance < 145) {
        galaxyCtx.strokeStyle = galaxyColor(star.hue, (1 - distance / 145) * 0.13);
        galaxyCtx.lineWidth = 1;
        galaxyCtx.beginPath();
        galaxyCtx.moveTo(star.x, star.y);
        galaxyCtx.lineTo(other.x, other.y);
        galaxyCtx.stroke();
      }
    }

    galaxyCtx.fillStyle = galaxyColor(star.hue, star.glow);
    galaxyCtx.beginPath();
    galaxyCtx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    galaxyCtx.fill();
  }

  const drift = reduceMotion ? 0 : Math.sin(Date.now() * 0.001) * 12;
  drawGalaxyCard(galaxyWidth * 0.09, galaxyHeight * 0.23 + drift, "BR-001 Goal", "rgba(69, 214, 170, 0.52)");
  drawGalaxyCard(galaxyWidth * 0.74, galaxyHeight * 0.27 - drift, "FR-014 Story", "rgba(107, 223, 242, 0.52)");
  drawGalaxyCard(galaxyWidth * 0.18, galaxyHeight * 0.72 - drift, "CR-006 Change", "rgba(255, 200, 87, 0.52)");
  drawGalaxyCard(galaxyWidth * 0.68, galaxyHeight * 0.74 + drift, "QA-021 UAT", "rgba(255, 111, 97, 0.52)");

  requestAnimationFrame(animateGalaxy);
}

if (galaxyCanvas && galaxyCtx) {
  window.addEventListener("resize", resizeGalaxy);
  resizeGalaxy();
  animateGalaxy();
}
