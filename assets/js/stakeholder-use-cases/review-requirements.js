const REQUIREMENT_SET_KEY = "la-ban-ba.uc6.requirement-sets";
const REVIEW_STORAGE_KEY = "la-ban-ba.stk4.requirement-reviews";

const requirementListEl = document.querySelector("#requirementList");
const acceptanceListEl = document.querySelector("#acceptanceList");
const form = document.querySelector("#reviewForm");
const toast = document.querySelector("#stakeholderToast");

const fallbackRequirements = [
  {
    requirementId: "req-rule-500m",
    requirementCode: "RULE-001",
    requirementType: "RULE",
    requirementTitle: "Khoản vay trên 500M cần phê duyệt cấp 2",
    requirementDescription: "Khi khoản vay có giá trị trên 500M, quy trình phải chuyển hồ sơ sang cấp phê duyệt thứ hai trước khi ra quyết định cuối cùng.",
    rationale: "Kiểm soát rủi ro đối với khoản vay giá trị cao và tạo trace rõ ràng cho audit trail.",
    scope: "Áp dụng cho quy trình xét duyệt hồ sơ vay cá nhân trên kênh số.",
    priority: "Must",
    status: "Ready Review",
    version: "v0.1",
    acceptanceCriteria: [
      "Hồ sơ vay trên 500M luôn được gắn trạng thái cần phê duyệt cấp 2.",
      "Người phê duyệt cấp 2 được ghi nhận trong lịch sử xử lý hồ sơ.",
      "Hồ sơ chưa có phê duyệt cấp 2 không được chuyển sang trạng thái phê duyệt cuối cùng."
    ]
  },
  {
    requirementId: "req-doc-alert",
    requirementCode: "FR-018",
    requirementType: "FR",
    requirementTitle: "Cảnh báo hồ sơ thiếu chứng từ",
    requirementDescription: "Hệ thống hiển thị danh sách chứng từ còn thiếu và hành động tiếp theo cho nhân viên tín dụng.",
    rationale: "Giảm thời gian xử lý hồ sơ và hạn chế trả hồ sơ nhiều lần cho khách hàng.",
    scope: "Áp dụng cho màn hình xử lý hồ sơ vay cá nhân.",
    priority: "Should",
    status: "Ready Review",
    version: "v0.1",
    acceptanceCriteria: [
      "Nhân viên nhìn thấy danh sách chứng từ còn thiếu theo từng hồ sơ.",
      "Mỗi chứng từ thiếu có trạng thái và hướng dẫn bổ sung.",
      "Hệ thống lưu thời gian gửi yêu cầu bổ sung hồ sơ."
    ]
  }
];

let requirements = loadRequirements();
let reviews = loadCollection(REVIEW_STORAGE_KEY, []);
let activeRequirementId = requirements[0]?.requirementId || "";

function loadCollection(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return [...fallback];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [...fallback];
  } catch {
    return [...fallback];
  }
}

function loadRequirements() {
  const sets = loadCollection(REQUIREMENT_SET_KEY, []);
  const fromSets = sets.flatMap((set) => Array.isArray(set.requirements) ? set.requirements : []);
  return fromSets.length ? fromSets : [...fallbackRequirements];
}

function saveReviews() {
  localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(reviews));
}

function getActiveRequirement() {
  return requirements.find((item) => item.requirementId === activeRequirementId) || requirements[0];
}

function getReview(requirementId) {
  let review = reviews.find((item) => item.requirementId === requirementId);
  if (!review) {
    review = {
      requirementId,
      decision: "Đồng ý",
      note: "",
      evidence: "",
      status: "Chờ rà soát",
      acReviews: [],
      updatedAt: ""
    };
    reviews.push(review);
  }
  return review;
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

function acDecision(review, index) {
  const found = review.acReviews.find((item) => item.index === index);
  return found?.decision || "Đúng";
}

function acNote(review, index) {
  const found = review.acReviews.find((item) => item.index === index);
  return found?.note || "";
}

function collectReview(status = "Đang rà soát") {
  const requirement = getActiveRequirement();
  const review = getReview(requirement.requirementId);
  review.decision = form.elements.reviewDecision.value;
  review.note = form.elements.reviewNote.value.trim();
  review.evidence = form.elements.reviewEvidence.value.trim();
  review.status = status;
  review.updatedAt = new Date().toISOString();
  review.acReviews = [...acceptanceListEl.querySelectorAll(".acceptance-card")].map((card, index) => ({
    index,
    decision: card.querySelector("[data-field='acDecision']").value,
    note: card.querySelector("[data-field='acNote']").value.trim()
  }));

  saveReviews();
  return review;
}

function calculateScore(review, requirement) {
  const acCount = requirement.acceptanceCriteria?.length || 0;
  const reviewedCount = review.acReviews.filter((item) => item.decision).length;
  const acDone = acCount === 0 || reviewedCount === acCount;
  const needsNote = review.decision !== "Đồng ý" || review.acReviews.some((item) => item.decision !== "Đúng");
  const hasNote = Boolean(review.note || review.evidence || review.acReviews.some((item) => item.note));
  const ready = Boolean(review.decision) && acDone && (!needsNote || hasNote);
  const score = Math.round(((Boolean(review.decision) ? 0.25 : 0) + (acDone ? 0.45 : 0) + (!needsNote || hasNote ? 0.3 : 0)) * 100);

  return { acCount, reviewedCount, acDone, needsNote, hasNote, ready, score };
}

function markCheck(id, done) {
  document.querySelector(`#${id}`).classList.toggle("is-done", done);
}

function renderList() {
  requirementListEl.innerHTML = requirements
    .map((requirement) => {
      const review = getReview(requirement.requirementId);
      return `
        <button class="stakeholder-pack-card ${requirement.requirementId === activeRequirementId ? "is-active" : ""}" type="button" data-requirement-id="${requirement.requirementId}">
          <span>${escapeHTML(review.status || requirement.status || "Chờ rà soát")}</span>
          <strong>${escapeHTML(requirement.requirementTitle || "Yêu cầu chưa tên")}</strong>
          <small>${escapeHTML(requirement.requirementCode || requirement.requirementType || "REQ")} · ${escapeHTML(requirement.priority || "Chưa ưu tiên")}</small>
        </button>
      `;
    })
    .join("");

  setText("requirementCount", `${requirements.length} yêu cầu`);
}

function renderAcceptanceCriteria(requirement, review) {
  const criteria = requirement.acceptanceCriteria || [];
  acceptanceListEl.innerHTML = criteria.length
    ? criteria.map((criterion, index) => `
        <article class="acceptance-card" data-index="${index}">
          <div class="answer-card-head">
            <span>${String(index + 1).padStart(2, "0")}</span>
            <div>
              <strong>Acceptance criteria</strong>
              <small>Tiêu chí cần Stakeholder rà soát</small>
            </div>
          </div>
          <p>${escapeHTML(criterion)}</p>
          <label>
            <span>Đánh giá tiêu chí</span>
            <select data-field="acDecision">
              ${["Đúng", "Cần chỉnh sửa", "Cần làm rõ", "Không đúng nghiệp vụ"].map(
                (value) => `<option ${value === acDecision(review, index) ? "selected" : ""}>${value}</option>`
              ).join("")}
            </select>
          </label>
          <label>
            <span>Ghi chú riêng cho tiêu chí</span>
            <textarea data-field="acNote" rows="3" placeholder="Ghi chú nếu tiêu chí chưa đúng, thiếu điều kiện đo hoặc cần BA làm rõ.">${escapeHTML(acNote(review, index))}</textarea>
          </label>
        </article>
      `).join("")
    : `<article class="acceptance-card"><p>Yêu cầu này chưa có acceptance criteria để rà soát.</p></article>`;
}

function updateSummary() {
  const requirement = getActiveRequirement();
  const draft = {
    ...getReview(requirement.requirementId),
    decision: form.elements.reviewDecision.value,
    note: form.elements.reviewNote.value.trim(),
    evidence: form.elements.reviewEvidence.value.trim(),
    acReviews: [...acceptanceListEl.querySelectorAll(".acceptance-card[data-index]")].map((card, index) => ({
      index,
      decision: card.querySelector("[data-field='acDecision']").value,
      note: card.querySelector("[data-field='acNote']").value.trim()
    }))
  };
  const result = calculateScore(draft, requirement);

  setText("reviewScore", `${result.score}%`);
  setText("reviewScoreText", result.ready ? "Có thể gửi review cho BA." : "Cần đánh giá AC hoặc thêm ghi chú cho điểm chưa đồng ý.");
  setText("acProgress", `${result.acCount ? Math.round((result.reviewedCount / result.acCount) * 100) : 100}% đã đánh giá`);
  markCheck("checkReviewDecision", Boolean(draft.decision));
  markCheck("checkRequirementRead", true);
  markCheck("checkAcReviewed", result.acDone);
  markCheck("checkReviewNote", !result.needsNote || result.hasNote);
}

function renderActiveRequirement() {
  const requirement = getActiveRequirement();
  const review = getReview(requirement.requirementId);
  form.elements.reviewDecision.value = review.decision || "Đồng ý";
  form.elements.reviewNote.value = review.note || "";
  form.elements.reviewEvidence.value = review.evidence || "";

  setText("activeRequirementTitle", requirement.requirementTitle || "Yêu cầu chưa tên");
  setText("activeRequirementMeta", `${requirement.requirementCode || "REQ"} · ${requirement.status || "Ready Review"}`);
  setText("requirementTitle", requirement.requirementTitle || "Yêu cầu chưa tên");
  setText("requirementStatus", review.status || requirement.status || "Chờ rà soát");
  setText("requirementCode", requirement.requirementCode || "REQ");
  setText("requirementType", requirement.requirementType || "Requirement");
  setText("requirementVersion", requirement.version || "v0.1");
  setText("requirementDescription", requirement.requirementDescription || "Chưa có mô tả.");
  setText("requirementRationale", requirement.rationale || "Chưa có lý do nghiệp vụ.");
  setText("requirementScope", requirement.scope || "Chưa xác định phạm vi.");

  renderAcceptanceCriteria(requirement, review);
  updateSummary();
}

function suggestReview() {
  const decision = form.elements.reviewDecision.value;
  const currentNote = form.elements.reviewNote.value.trim();
  if (currentNote) {
    showToast("Ghi chú review hiện tại đã có nội dung.");
    return;
  }

  if (decision === "Đồng ý") {
    form.elements.reviewNote.value = "Tôi đồng ý với nội dung yêu cầu và acceptance criteria theo góc nhìn nghiệp vụ.";
  } else if (decision === "Cần chỉnh sửa") {
    form.elements.reviewNote.value = "Một số nội dung yêu cầu hoặc acceptance criteria cần chỉnh sửa để phản ánh đúng nghiệp vụ thực tế.";
  } else if (decision === "Cần làm rõ") {
    form.elements.reviewNote.value = "Cần BA làm rõ thêm phạm vi, ngoại lệ hoặc điều kiện đo trước khi tôi xác nhận yêu cầu.";
  } else {
    form.elements.reviewNote.value = "Tôi chưa đồng ý với yêu cầu này vì nội dung hiện tại chưa phù hợp với nghiệp vụ thực tế.";
  }

  updateSummary();
  showToast("Đã gợi ý phản hồi review cho BA.");
}

requirementListEl.addEventListener("click", (event) => {
  const card = event.target.closest("[data-requirement-id]");
  if (!card) return;
  collectReview(getReview(activeRequirementId)?.status || "Đang rà soát");
  activeRequirementId = card.dataset.requirementId;
  render();
});

form.addEventListener("input", updateSummary);
form.addEventListener("change", updateSummary);
acceptanceListEl.addEventListener("input", updateSummary);
acceptanceListEl.addEventListener("change", updateSummary);

document.querySelector("#saveReviewDraft").addEventListener("click", () => {
  collectReview("Đang rà soát");
  render();
  showToast("Đã lưu nháp review yêu cầu.");
});

document.querySelector("#suggestReview").addEventListener("click", suggestReview);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const review = collectReview(form.elements.reviewDecision.value);
  render();
  showToast(`Đã gửi review cho BA: ${review.decision}.`);
});

function render() {
  renderList();
  renderActiveRequirement();
}

render();
