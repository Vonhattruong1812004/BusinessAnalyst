const NEED_STORAGE_KEY = "la-ban-ba.stk2.business-needs";

const form = document.querySelector("#needForm");
const needListEl = document.querySelector("#needList");
const toast = document.querySelector("#stakeholderToast");

const fields = [
  "needId",
  "needName",
  "needCategory",
  "currentProblem",
  "expectedOutcome",
  "businessReason",
  "realExample",
  "impactLevel",
  "urgencyLevel",
  "evidence"
];

const seedNeeds = [
  {
    needId: "need-missing-doc-alert",
    needName: "Cảnh báo hồ sơ thiếu chứng từ",
    needCategory: "Vận hành",
    currentProblem: "Nhân viên tín dụng phải kiểm tra thủ công nhiều màn hình để biết hồ sơ còn thiếu chứng từ nào.",
    expectedOutcome: "Hệ thống hiển thị rõ danh sách chứng từ còn thiếu và gợi ý hành động tiếp theo cho từng hồ sơ.",
    businessReason: "Giảm thời gian xử lý hồ sơ và hạn chế trả hồ sơ nhiều lần cho khách hàng.",
    realExample: "Hồ sơ vay mua xe bị trả lại 2 lần vì thiếu sao kê thu nhập nhưng nhân viên không nhận được cảnh báo rõ.",
    impactLevel: "Cao",
    urgencyLevel: "Cần trong tháng này",
    evidence: "Quy trình bổ sung hồ sơ v2",
    status: "Chờ BA xem xét",
    updatedAt: new Date().toISOString()
  }
];

let needs = loadNeeds();
let activeNeedId = needs[0]?.needId || createId();

function createId() {
  return `need-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function loadNeeds() {
  const raw = localStorage.getItem(NEED_STORAGE_KEY);
  if (!raw) return [...seedNeeds];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...seedNeeds];
  } catch {
    return [...seedNeeds];
  }
}

function saveNeeds() {
  localStorage.setItem(NEED_STORAGE_KEY, JSON.stringify(needs));
}

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

function getActiveNeed() {
  return needs.find((need) => need.needId === activeNeedId) || needs[0];
}

function getFormData(status = "Đang soạn") {
  const data = fields.reduce((result, field) => {
    result[field] = form.elements[field].value.trim();
    return result;
  }, {});

  return {
    ...data,
    needId: data.needId || createId(),
    status,
    updatedAt: new Date().toISOString()
  };
}

function setFormData(need) {
  fields.forEach((field) => {
    form.elements[field].value = need?.[field] || "";
  });
}

function upsertNeed(status = "Đang soạn") {
  const data = getFormData(status);
  const index = needs.findIndex((need) => need.needId === data.needId);

  if (index >= 0) {
    needs[index] = data;
  } else {
    needs.unshift(data);
  }

  activeNeedId = data.needId;
  saveNeeds();
  return data;
}

function calculateScore(need) {
  const checks = {
    name: Boolean(need.needName),
    problem: Boolean(need.currentProblem),
    outcome: Boolean(need.expectedOutcome),
    impact: Boolean(need.impactLevel || need.urgencyLevel || need.businessReason),
    evidence: Boolean(need.realExample || need.evidence)
  };
  const score = Math.round((Object.values(checks).filter(Boolean).length / Object.keys(checks).length) * 100);
  return { checks, score };
}

function markCheck(id, done) {
  document.querySelector(`#${id}`).classList.toggle("is-done", done);
}

function setText(id, value) {
  document.querySelector(`#${id}`).textContent = value;
}

function renderList() {
  needListEl.innerHTML = needs
    .map((need) => {
      const { score } = calculateScore(need);
      return `
        <button class="stakeholder-pack-card ${need.needId === activeNeedId ? "is-active" : ""}" type="button" data-need-id="${need.needId}">
          <span>${escapeHTML(need.status || "Đang soạn")}</span>
          <strong>${escapeHTML(need.needName || "Nhu cầu chưa đặt tên")}</strong>
          <small>${escapeHTML(need.needCategory || "Chưa phân loại")} · ${score}% rõ</small>
        </button>
      `;
    })
    .join("");
}

function updateSummary() {
  const data = getFormData(form.elements.needId.value ? getActiveNeed()?.status || "Đang soạn" : "Đang soạn");
  const { checks, score } = calculateScore(data);

  setText("activeNeedTitle", data.needName || "Nhu cầu chưa đặt tên");
  setText("activeNeedMeta", `${data.needCategory || "Chưa phân loại"} · ${data.impactLevel || "Chưa đánh giá tác động"}`);
  setText("formNeedName", data.needName || "Nhu cầu mới");
  setText("needStatus", data.status || "Đang soạn");
  setText("needScore", `${score}%`);
  setText("needScoreText", score >= 80 ? "Đã đủ rõ để gửi BA xem xét." : "Cần bổ sung thêm bối cảnh, mong muốn hoặc ví dụ.");

  markCheck("checkNeedName", checks.name);
  markCheck("checkProblem", checks.problem);
  markCheck("checkOutcome", checks.outcome);
  markCheck("checkImpact", checks.impact);
  markCheck("checkEvidence", checks.evidence);
}

function renderActiveNeed() {
  const need = getActiveNeed();
  setFormData(need);
  updateSummary();
}

function createNewNeed() {
  const blank = {
    needId: createId(),
    needName: "",
    needCategory: "Quy trình",
    currentProblem: "",
    expectedOutcome: "",
    businessReason: "",
    realExample: "",
    impactLevel: "Trung bình",
    urgencyLevel: "Cần trong quý này",
    evidence: "",
    status: "Đang soạn",
    updatedAt: new Date().toISOString()
  };

  needs.unshift(blank);
  activeNeedId = blank.needId;
  saveNeeds();
  render();
  showToast("Đã tạo nhu cầu mới.");
}

function structureNeed() {
  const problem = form.elements.currentProblem.value.trim();
  const outcome = form.elements.expectedOutcome.value.trim();
  const reason = form.elements.businessReason.value.trim();

  if (problem && !reason) {
    form.elements.businessReason.value = "Nhu cầu này quan trọng vì vấn đề hiện tại đang ảnh hưởng đến hiệu quả vận hành, khả năng kiểm soát hoặc trải nghiệm người dùng.";
  }

  if (problem && !outcome) {
    form.elements.expectedOutcome.value = "Stakeholder mong muốn hệ thống/quy trình hỗ trợ rõ ràng hơn để giảm thao tác thủ công và giúp người dùng xử lý đúng ngay từ đầu.";
  }

  if (!form.elements.needName.value.trim() && problem) {
    form.elements.needName.value = "Làm rõ nhu cầu nghiệp vụ cần BA phân tích";
  }

  updateSummary();
  showToast("Đã gợi ý cấu trúc mô tả nhu cầu.");
}

needListEl.addEventListener("click", (event) => {
  const card = event.target.closest("[data-need-id]");
  if (!card) return;
  upsertNeed(getActiveNeed()?.status || "Đang soạn");
  activeNeedId = card.dataset.needId;
  render();
});

document.querySelector("#newNeed").addEventListener("click", () => {
  upsertNeed(getActiveNeed()?.status || "Đang soạn");
  createNewNeed();
});

document.querySelector("#saveNeedDraft").addEventListener("click", () => {
  upsertNeed("Đang soạn");
  render();
  showToast("Đã lưu nháp nhu cầu.");
});

document.querySelector("#structureNeed").addEventListener("click", structureNeed);

form.addEventListener("input", updateSummary);
form.addEventListener("change", updateSummary);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const need = upsertNeed("Chờ BA xem xét");
  render();
  showToast(`Đã gửi nhu cầu "${need.needName || "chưa đặt tên"}" cho BA.`);
});

function render() {
  renderList();
  renderActiveNeed();
}

render();
