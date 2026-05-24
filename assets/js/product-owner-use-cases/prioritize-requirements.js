const SET_STORAGE_KEY = "la-ban-ba.uc6.requirement-sets";
const PO_REVIEW_STORAGE_KEY = "la-ban-ba.po1.package-reviews";
const PO_PRIORITY_STORAGE_KEY = "la-ban-ba.po2.requirement-priorities";

const setListEl = document.querySelector("#setList");
const priorityRequirementListEl = document.querySelector("#priorityRequirementList");
const priorityNoteEl = document.querySelector("#priorityNote");
const toast = document.querySelector("#poToast");

const seedSets = [
  {
    setId: "rs-digital-lending",
    setName: "Requirement set duyệt khoản vay rủi ro",
    requirements: [
      {
        requirementId: "req-rule-500m",
        requirementCode: "RULE-001",
        requirementType: "RULE",
        requirementTitle: "Khoản vay trên 500M cần phê duyệt cấp 2",
        requirementDescription: "Quy trình phải chuyển hồ sơ vay trên 500M sang phê duyệt cấp 2.",
        priority: "Must",
        status: "Ready Review",
        acceptanceCriteria: [
          "Hồ sơ vay trên 500M luôn được gắn trạng thái cần phê duyệt cấp 2.",
          "Người phê duyệt cấp 2 được ghi nhận trong lịch sử xử lý hồ sơ."
        ]
      },
      {
        requirementId: "req-doc-alert",
        requirementCode: "FR-018",
        requirementType: "FR",
        requirementTitle: "Cảnh báo hồ sơ thiếu chứng từ",
        requirementDescription: "Hệ thống hiển thị chứng từ còn thiếu và hành động tiếp theo cho nhân viên tín dụng.",
        priority: "Should",
        status: "Ready Review",
        acceptanceCriteria: [
          "Nhân viên nhìn thấy danh sách chứng từ còn thiếu theo từng hồ sơ.",
          "Mỗi chứng từ thiếu có trạng thái và hướng dẫn bổ sung."
        ]
      },
      {
        requirementId: "req-nfr-sla",
        requirementCode: "NFR-007",
        requirementType: "NFR",
        requirementTitle: "Thời gian phản hồi dưới 2 giây",
        requirementDescription: "Các màn hình chính của quy trình vay số phải phản hồi trong giới hạn SLA đã thống nhất.",
        priority: "Should",
        status: "Need Clarification",
        acceptanceCriteria: ["Cần BA bổ sung điều kiện đo lường rõ ràng cho từng màn hình."]
      }
    ]
  }
];

let sets = loadCollection(SET_STORAGE_KEY, seedSets);
let packageReviews = loadCollection(PO_REVIEW_STORAGE_KEY, []);
let priorityPlans = loadCollection(PO_PRIORITY_STORAGE_KEY, []);
let activeSetId = sets[0]?.setId || "";

function loadCollection(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return [...fallback];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...fallback];
  } catch {
    return [...fallback];
  }
}

function savePriorityPlans() {
  localStorage.setItem(PO_PRIORITY_STORAGE_KEY, JSON.stringify(priorityPlans));
}

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setText(id, value) {
  document.querySelector(`#${id}`).textContent = value;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

function getActiveSet() {
  return sets.find((item) => item.setId === activeSetId) || sets[0] || { requirements: [] };
}

function getReviewForSet(setId) {
  return packageReviews.find((review) => review.requirementSet === setId || review.setId === setId) || {};
}

function getPlan(setId) {
  let plan = priorityPlans.find((item) => item.setId === setId);
  if (!plan) {
    plan = {
      setId,
      status: "Đang ưu tiên",
      priorityNote: "",
      items: [],
      updatedAt: ""
    };
    priorityPlans.push(plan);
  }
  return plan;
}

function normalizeMoscow(value = "") {
  const lower = value.toLowerCase();
  if (lower.includes("must")) return "Must Have";
  if (lower.includes("should")) return "Should Have";
  if (lower.includes("could")) return "Could Have";
  if (lower.includes("won")) return "Won't Have";
  return "Should Have";
}

function getPriorityItem(plan, requirement) {
  let item = plan.items.find((entry) => entry.requirementId === requirement.requirementId);
  if (!item) {
    item = {
      requirementId: requirement.requirementId,
      moscow: normalizeMoscow(requirement.priority),
      value: requirement.priority === "Must" ? 5 : 4,
      risk: requirement.status === "Need Clarification" ? 4 : 3,
      effort: requirement.requirementType === "NFR" ? 4 : 3,
      urgency: requirement.priority === "Must" ? 5 : 3,
      dependency: requirement.status === "Need Clarification" ? 4 : 2,
      bucket: requirement.status === "Need Clarification" ? "Cần BA làm rõ" : "Release này",
      rationale: ""
    };
    plan.items.push(item);
  }
  return item;
}

function calculatePriorityScore(item) {
  const value = Number(item.value || 1);
  const urgency = Number(item.urgency || 1);
  const risk = Number(item.risk || 1);
  const effort = Number(item.effort || 1);
  const dependencyPenalty = Number(item.dependency || 1) * 4;
  const raw = value * 10 + urgency * 8 + risk * 5 + (6 - effort) * 6 - dependencyPenalty;
  return Math.max(5, Math.min(100, Math.round((raw / 141) * 100)));
}

function collectPriorityPlan(status = "Đang ưu tiên") {
  const set = getActiveSet();
  const plan = getPlan(set.setId);
  plan.status = status;
  plan.priorityNote = priorityNoteEl.value.trim();
  plan.updatedAt = new Date().toISOString();
  plan.items = [...priorityRequirementListEl.querySelectorAll("[data-requirement-id]")].map((card) => {
    const item = {
      requirementId: card.dataset.requirementId,
      moscow: card.querySelector("[data-field='moscow']").value,
      value: Number(card.querySelector("[data-field='value']").value),
      risk: Number(card.querySelector("[data-field='risk']").value),
      effort: Number(card.querySelector("[data-field='effort']").value),
      urgency: Number(card.querySelector("[data-field='urgency']").value),
      dependency: Number(card.querySelector("[data-field='dependency']").value),
      bucket: card.querySelector("[data-field='bucket']").value,
      rationale: card.querySelector("[data-field='rationale']").value.trim()
    };
    item.score = calculatePriorityScore(item);
    return item;
  });
  savePriorityPlans();
  return plan;
}

function getSortedRequirements(set, plan) {
  return [...(set.requirements || [])].sort((left, right) => {
    const leftItem = getPriorityItem(plan, left);
    const rightItem = getPriorityItem(plan, right);
    return calculatePriorityScore(rightItem) - calculatePriorityScore(leftItem);
  });
}

function renderSetList() {
  setListEl.innerHTML = sets
    .map((set) => {
      const plan = getPlan(set.setId);
      const review = getReviewForSet(set.setId);
      return `
        <button class="po-package-card ${set.setId === activeSetId ? "is-active" : ""}" type="button" data-set-id="${escapeHTML(set.setId)}">
          <span>${escapeHTML(plan.status || review.decision || "Chờ ưu tiên")}</span>
          <strong>${escapeHTML(set.setName || "Bộ yêu cầu chưa tên")}</strong>
          <small>${(set.requirements || []).length} yêu cầu · ${escapeHTML(review.productValue || "Chưa chấm value")}</small>
        </button>
      `;
    })
    .join("");

  setText("setCount", `${sets.length} bộ`);
}

function renderRequirementCard(requirement, index, plan) {
  const item = getPriorityItem(plan, requirement);
  const score = calculatePriorityScore(item);
  const acText = (requirement.acceptanceCriteria || []).slice(0, 2).join(" · ");
  return `
    <article class="priority-card" data-requirement-id="${escapeHTML(requirement.requirementId)}">
      <div class="priority-card-head">
        <span>${String(index + 1).padStart(2, "0")}</span>
        <div>
          <strong>${escapeHTML(requirement.requirementTitle || "Yêu cầu chưa tên")}</strong>
          <small>${escapeHTML(requirement.requirementCode || requirement.requirementType || "REQ")} · ${escapeHTML(requirement.status || "Draft")}</small>
        </div>
        <mark>${score}</mark>
      </div>

      <p>${escapeHTML(requirement.requirementDescription || "Chưa có mô tả yêu cầu.")}</p>
      <small class="priority-ac">${escapeHTML(acText || "Chưa có acceptance criteria rõ ràng.")}</small>

      <div class="priority-control-grid">
        <label>
          <span>MoSCoW</span>
          <select data-field="moscow">
            ${["Must Have", "Should Have", "Could Have", "Won't Have"].map((value) => `<option ${value === item.moscow ? "selected" : ""}>${value}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>Release bucket</span>
          <select data-field="bucket">
            ${["Release này", "Release sau", "Cần BA làm rõ", "Không ưu tiên"].map((value) => `<option ${value === item.bucket ? "selected" : ""}>${value}</option>`).join("")}
          </select>
        </label>
      </div>

      <div class="priority-slider-grid">
        ${renderRange("value", "Value", item.value)}
        ${renderRange("risk", "Risk", item.risk)}
        ${renderRange("effort", "Effort", item.effort)}
        ${renderRange("urgency", "Urgency", item.urgency)}
        ${renderRange("dependency", "Dependency", item.dependency)}
      </div>

      <label class="priority-rationale">
        <span>Lý do ưu tiên</span>
        <textarea data-field="rationale" rows="3" placeholder="Ghi lý do PO chọn mức ưu tiên này.">${escapeHTML(item.rationale)}</textarea>
      </label>
    </article>
  `;
}

function renderRange(field, label, value) {
  return `
    <label>
      <span>${label}</span>
      <input data-field="${field}" type="range" min="1" max="5" step="1" value="${Number(value || 3)}" />
      <b>${Number(value || 3)}</b>
    </label>
  `;
}

function renderRequirements() {
  const set = getActiveSet();
  const plan = getPlan(set.setId);
  priorityNoteEl.value = plan.priorityNote || "";
  const requirements = getSortedRequirements(set, plan);

  priorityRequirementListEl.innerHTML = requirements.length
    ? requirements.map((requirement, index) => renderRequirementCard(requirement, index, plan)).join("")
    : `<article class="priority-card"><p>Bộ này chưa có requirement để Product Owner ưu tiên.</p></article>`;
}

function calculateSummary() {
  const set = getActiveSet();
  const requirements = set.requirements || [];
  const cards = [...priorityRequirementListEl.querySelectorAll("[data-requirement-id]")];
  const items = cards.map((card) => ({
    requirementId: card.dataset.requirementId,
    moscow: card.querySelector("[data-field='moscow']").value,
    bucket: card.querySelector("[data-field='bucket']").value,
    rationale: card.querySelector("[data-field='rationale']").value.trim(),
    value: Number(card.querySelector("[data-field='value']").value),
    risk: Number(card.querySelector("[data-field='risk']").value),
    effort: Number(card.querySelector("[data-field='effort']").value),
    urgency: Number(card.querySelector("[data-field='urgency']").value),
    dependency: Number(card.querySelector("[data-field='dependency']").value)
  }));
  const total = requirements.length || 1;
  const hasScore = items.length === requirements.length;
  const hasMoscow = items.every((item) => Boolean(item.moscow));
  const hasBucket = items.every((item) => Boolean(item.bucket));
  const needsBa = items.filter((item) => item.bucket === "Cần BA làm rõ");
  const hasBlockingNote = needsBa.length === 0 || Boolean(priorityNoteEl.value.trim() || needsBa.every((item) => item.rationale));
  const completed = Math.round(((hasScore ? 0.3 : 0) + (hasMoscow ? 0.25 : 0) + (hasBucket ? 0.25 : 0) + (hasBlockingNote ? 0.2 : 0)) * 100);

  return {
    items,
    total,
    completed,
    hasScore,
    hasMoscow,
    hasBucket,
    hasBlockingNote,
    must: items.filter((item) => item.moscow === "Must Have").length,
    ready: items.filter((item) => item.bucket === "Release này").length,
    clarify: needsBa.length,
    next: items.filter((item) => item.bucket === "Release sau").length
  };
}

function markCheck(id, done) {
  document.querySelector(`#${id}`).classList.toggle("is-done", done);
}

function updateRangeLabels() {
  priorityRequirementListEl.querySelectorAll("input[type='range']").forEach((input) => {
    input.nextElementSibling.textContent = input.value;
  });
}

function updateSummary() {
  updateRangeLabels();
  const summary = calculateSummary();
  setText("mustCount", String(summary.must));
  setText("readyCount", String(summary.ready));
  setText("clarifyCount", String(summary.clarify));
  setText("currentReleaseCount", `${summary.ready} yêu cầu`);
  setText("nextReleaseCount", `${summary.next} yêu cầu`);
  setText("needsBaCount", `${summary.clarify} yêu cầu`);
  setText("priorityCompletion", `${summary.completed}%`);
  setText("priorityCompletionText", summary.completed === 100 ? "Có thể xác nhận ưu tiên backlog." : "Cần hoàn tất điểm, MoSCoW, bucket hoặc ghi chú.");
  markCheck("checkScored", summary.hasScore);
  markCheck("checkMoscow", summary.hasMoscow);
  markCheck("checkBucket", summary.hasBucket);
  markCheck("checkPriorityNote", summary.hasBlockingNote);
}

function renderActiveSet() {
  const set = getActiveSet();
  const plan = getPlan(set.setId);
  const requirements = set.requirements || [];
  setText("activeSetTitle", set.setName || "Bộ yêu cầu chưa tên");
  setText("priorityMeta", `${requirements.length} yêu cầu · ${plan.status || "Đang ưu tiên"}`);
  setText("setTitle", set.setName || "Bộ yêu cầu chưa tên");
  setText("priorityStatus", plan.status || "Đang ưu tiên");
  renderRequirements();
  updateSummary();
}

function suggestPriority() {
  const set = getActiveSet();
  const plan = getPlan(set.setId);
  (set.requirements || []).forEach((requirement) => {
    const item = getPriorityItem(plan, requirement);
    const text = `${requirement.requirementType || ""} ${requirement.status || ""} ${requirement.priority || ""}`.toLowerCase();
    item.moscow = text.includes("must") || text.includes("rule") ? "Must Have" : text.includes("nfr") ? "Should Have" : normalizeMoscow(requirement.priority);
    item.value = item.moscow === "Must Have" ? 5 : 4;
    item.urgency = item.moscow === "Must Have" ? 5 : 3;
    item.risk = text.includes("clarification") || text.includes("risk") ? 5 : 3;
    item.effort = text.includes("nfr") ? 4 : 3;
    item.dependency = text.includes("clarification") ? 5 : 2;
    item.bucket = text.includes("clarification") ? "Cần BA làm rõ" : item.moscow === "Could Have" ? "Release sau" : "Release này";
    item.rationale = item.rationale || `Ưu tiên dựa trên ${item.moscow}, giá trị sản phẩm và trạng thái ${requirement.status || "BA bàn giao"}.`;
  });

  if (!plan.priorityNote) {
    plan.priorityNote = "PO ưu tiên theo value, risk, urgency và effort. Các mục cần BA làm rõ chưa được đưa vào release hiện tại.";
  }

  plan.updatedAt = new Date().toISOString();
  savePriorityPlans();
  render();
  showToast("Đã gợi ý điểm ưu tiên để PO chỉnh lại.");
}

function render() {
  renderSetList();
  renderActiveSet();
}

setListEl.addEventListener("click", (event) => {
  const card = event.target.closest("[data-set-id]");
  if (!card) return;
  collectPriorityPlan(getPlan(activeSetId)?.status || "Đang ưu tiên");
  activeSetId = card.dataset.setId;
  render();
});

priorityRequirementListEl.addEventListener("input", updateSummary);
priorityRequirementListEl.addEventListener("change", updateSummary);
priorityNoteEl.addEventListener("input", updateSummary);

document.querySelector("#suggestPriority").addEventListener("click", suggestPriority);

document.querySelector("#savePriorityDraft").addEventListener("click", () => {
  collectPriorityPlan("Đang ưu tiên");
  render();
  showToast("Đã lưu nháp ưu tiên yêu cầu.");
});

document.querySelector("#confirmPriority").addEventListener("click", () => {
  const plan = collectPriorityPlan("Đã xác nhận ưu tiên");
  render();
  showToast(`Đã xác nhận ưu tiên cho ${plan.items.length} yêu cầu.`);
});

render();
