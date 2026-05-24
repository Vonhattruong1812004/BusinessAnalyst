const canvas = document.querySelector("#signalCanvas");
const ctx = canvas.getContext("2d");
const authPanel = document.querySelector(".auth-panel");
const tabs = document.querySelectorAll("[data-auth-tab]");
const forms = document.querySelectorAll(".auth-form");
const passwordToggles = document.querySelectorAll("[data-toggle-password]");
const scrollButtons = document.querySelectorAll("[data-scroll-auth]");
const toast = document.querySelector("#toast");
const aiPhrase = document.querySelector("#aiPhrase");
const ACTOR_DASHBOARDS = {
  ba: {
    label: "Business Analyst",
    url: "./pages/actors/business-analyst.html"
  },
  stakeholder: {
    label: "Stakeholder",
    url: "./pages/actors/stakeholder.html"
  }
};

const phrases = [
  "Sẵn sàng phân tích yêu cầu",
  "Đang kiểm tra traceability",
  "AI Copilot chờ lệnh của BA",
  "Gợi ý câu hỏi stakeholder",
  "Chuẩn hóa user story"
];

let width = 0;
let height = 0;
let particles = [];
let traces = [];
let phraseIndex = 0;
let toastTimer;

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  buildScene();
}

function buildScene() {
  const count = Math.max(38, Math.floor((width * height) / 28000));
  particles = Array.from({ length: count }, (_, index) => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.38,
    vy: (Math.random() - 0.5) * 0.38,
    size: Math.random() * 1.9 + 0.8,
    hue: index % 5
  }));

  traces = Array.from({ length: 7 }, (_, index) => ({
    x: (width / 8) * (index + 0.8),
    y: Math.random() * height,
    speed: 0.8 + Math.random() * 1.2,
    length: 90 + Math.random() * 160,
    color: index % 3
  }));
}

function particleColor(type, alpha = 1) {
  const colors = [
    `rgba(69, 214, 170, ${alpha})`,
    `rgba(107, 223, 242, ${alpha})`,
    `rgba(255, 200, 87, ${alpha})`,
    `rgba(255, 111, 97, ${alpha})`,
    `rgba(167, 139, 250, ${alpha})`
  ];
  return colors[type] || colors[0];
}

function drawRequirementCard(x, y, label, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(8, 15, 14, 0.58)";
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  roundRect(ctx, 0, 0, 118, 38, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(238, 247, 243, 0.76)";
  ctx.font = "700 10px Inter, sans-serif";
  ctx.fillText(label, 14, 23);
  ctx.restore();
}

function roundRect(context, x, y, rectWidth, rectHeight, radius) {
  const r = Math.min(radius, rectWidth / 2, rectHeight / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + rectWidth, y, x + rectWidth, y + rectHeight, r);
  context.arcTo(x + rectWidth, y + rectHeight, x, y + rectHeight, r);
  context.arcTo(x, y + rectHeight, x, y, r);
  context.arcTo(x, y, x + rectWidth, y, r);
  context.closePath();
}

function animateScene() {
  ctx.clearRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "rgba(69, 214, 170, 0.08)");
  gradient.addColorStop(0.48, "rgba(107, 223, 242, 0.04)");
  gradient.addColorStop(1, "rgba(255, 111, 97, 0.05)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  traces.forEach((trace) => {
    trace.y += trace.speed;
    if (trace.y - trace.length > height) trace.y = -trace.length;

    const traceGradient = ctx.createLinearGradient(trace.x, trace.y - trace.length, trace.x, trace.y);
    traceGradient.addColorStop(0, particleColor(trace.color, 0));
    traceGradient.addColorStop(1, particleColor(trace.color, 0.42));
    ctx.strokeStyle = traceGradient;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(trace.x, trace.y - trace.length);
    ctx.lineTo(trace.x, trace.y);
    ctx.stroke();
  });

  for (let i = 0; i < particles.length; i += 1) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;

    if (p.x < -20) p.x = width + 20;
    if (p.x > width + 20) p.x = -20;
    if (p.y < -20) p.y = height + 20;
    if (p.y > height + 20) p.y = -20;

    for (let j = i + 1; j < particles.length; j += 1) {
      const q = particles[j];
      const dx = p.x - q.x;
      const dy = p.y - q.y;
      const distance = Math.hypot(dx, dy);

      if (distance < 150) {
        ctx.strokeStyle = particleColor(p.hue, (1 - distance / 150) * 0.16);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
      }
    }

    ctx.fillStyle = particleColor(p.hue, 0.85);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }

  const shift = Math.sin(Date.now() * 0.001) * 14;
  drawRequirementCard(width * 0.1, height * 0.22 + shift, "BR-001 Goal", "rgba(69, 214, 170, 0.55)");
  drawRequirementCard(width * 0.74, height * 0.28 - shift, "FR-014 Story", "rgba(107, 223, 242, 0.55)");
  drawRequirementCard(width * 0.18, height * 0.72 - shift, "CR-006 Change", "rgba(255, 200, 87, 0.55)");
  drawRequirementCard(width * 0.69, height * 0.74 + shift, "QA-021 UAT", "rgba(255, 111, 97, 0.55)");

  requestAnimationFrame(animateScene);
}

function switchTab(name) {
  tabs.forEach((tab) => {
    const active = tab.dataset.authTab === name;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });

  forms.forEach((form) => {
    const active = form.id === `${name}-form`;
    form.classList.toggle("is-active", active);
    form.hidden = !active;
  });
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3200);
}

function getSelectedActor(form) {
  const actorValue = new FormData(form).get("actor") || "ba";
  return ACTOR_DASHBOARDS[actorValue] || ACTOR_DASHBOARDS.ba;
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => switchTab(tab.dataset.authTab));
});

passwordToggles.forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const input = toggle.closest(".password-field").querySelector("input");
    const nextType = input.type === "password" ? "text" : "password";
    input.type = nextType;
    toggle.setAttribute("aria-label", nextType === "password" ? "Hiện mật khẩu" : "Ẩn mật khẩu");
    toggle.textContent = nextType === "password" ? "◐" : "●";
  });
});

forms.forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.classList.remove("shake");
      void form.offsetWidth;
      form.classList.add("shake");
      form.reportValidity();
      return;
    }

    const isRegister = form.id === "register-form";
    const actor = getSelectedActor(form);
    showToast(isRegister ? `Tài khoản demo đã được tạo. Đang mở ${actor.label}.` : `Đăng nhập demo thành công. Đang mở ${actor.label}.`);
    setTimeout(() => {
      window.location.assign(actor.url);
    }, 500);
  });
});

scrollButtons.forEach((button) => {
  button.addEventListener("click", () => {
    authPanel.scrollIntoView({ behavior: "smooth", block: "center" });
    authPanel.animate(
      [
        { transform: "translateY(0) scale(1)" },
        { transform: "translateY(-5px) scale(1.012)" },
        { transform: "translateY(0) scale(1)" }
      ],
      { duration: 460, easing: "cubic-bezier(.2,.8,.2,1)" }
    );
  });
});

window.addEventListener("mousemove", (event) => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const x = (event.clientX / window.innerWidth - 0.5) * 10;
  const y = (event.clientY / window.innerHeight - 0.5) * 10;
  document.documentElement.style.setProperty("--tilt-x", `${x}px`);
  document.documentElement.style.setProperty("--tilt-y", `${y}px`);
  authPanel.style.transform = `translate3d(${x * -0.35}px, ${y * -0.35}px, 0)`;
});

setInterval(() => {
  phraseIndex = (phraseIndex + 1) % phrases.length;
  aiPhrase.animate([{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "translateY(0)" }], {
    duration: 320,
    easing: "ease"
  });
  aiPhrase.textContent = phrases[phraseIndex];
}, 2400);

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
animateScene();
