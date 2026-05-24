const HANDOFF_STORAGE_KEY = "la-ban-ba.uc9.handoff-packages";
const SET_STORAGE_KEY = "la-ban-ba.uc6.requirement-sets";
const PO_REVIEW_STORAGE_KEY = "la-ban-ba.po1.package-reviews";

const packageListEl = document.querySelector("#packageList");
const requirementListEl = document.querySelector("#requirementList");
const form = document.querySelector("#packageReviewForm");
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
      }
    ]
  }
];

const seedPackages = [
  {
    packageId: "hp-digital-lending-v03",
    requirementSet: "rs-digital-lending",
    packageName: "Gói phân tích duyệt khoản vay rủi ro v0.3",
    packageType: "Full Analysis Pack",
    releaseName: "Baseline v0.3",
    handoffStatus: "Ready for review",
    includedScope: "Rule phê duyệt cấp 2, cảnh báo hồ sơ thiếu chứng từ, acceptance criteria và traceability sơ bộ.",
    excludedScope: "Tích hợp sinh trắc học đang là change request cần PO xác nhận trước release.",
    openIssues: "Cần quyết định scope CR xác minh sinh trắc học.",
    updatedAt: new Date().toISOString()
  }
];

let requirementSets = loadCollection(SET_STORAGE_KEY, seedSets);
let packages = loadCollection(HANDOFF_STORAGE_KEY, seedPackages);
let reviews = loadCollection(PO_REVIEW_STORAGE_KEY, []);
let activePackageId = packages[0]?.packageId || "";

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

function saveReviews() {
  localStorage.setItem(PO_REVIEW_STORAGE_KEY, JSON.stringify(reviews));
}

function getActivePackage() {
  return packages.find((item) => item.packageId === activePackageId) || packages[0];
}

function getRequirementSet(packageItem = getActivePackage()) {
  return requirementSets.find((set) => set.setId === packageItem?.requirementSet) || requirementSets[0] || { requirements: [] };
}

function getReview(packageId) {
  let review = reviews.find((item) => item.packageId === packageId);
  if (!review) {
    review = {
      packageId,
      decision: "Sẵn sàng ưu tiên",
      productValue: "Cao",
      reviewNote: "",
      riskNote: "",
      status: "Chờ PO rà soát",
      requirementReviews: [],
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

function requirementDecision(review, requirementId) {
  const found = review.requirementReviews.find((item) => item.requirementId === requirementId);
  return found?.decision || "Phù hợp";
}

function requirementNote(review, requirementId) {
  const found = review.requirementReviews.find((item) => item.requirementId === requirementId);
  return found?.note || "";
}

function collectReview(status = "Đang rà soát") {
  const packageItem = getActivePackage();
  const review = getReview(packageItem.packageId);
  review.decision = form.elements.reviewDecision.value;
  review.productValue = form.elements.productValue.value;
  review.reviewNote = form.elements.reviewNote.value.trim();
  review.riskNote = form.elements.riskNote.value.trim();
  review.status = status;
  review.updatedAt = new Date().toISOString();
  review.requirementReviews = [...requirementListEl.querySelectorAll(".po-requirement-card")].map((card) => ({
    requirementId: card.dataset.requirementId,
    decision: card.querySelector("[data-field='requirementDecision']").value,
    note: card.querySelector("[data-field='requirementNote']").value.trim()
  }));
  saveReviews();
  return review;
}

function calculateScore(review, requirements) {
  const total = requirements.length || 1;
  const reviewed = review.requirementReviews.filter((item) => item.decision).length;
  const hasBlockingDecision = review.decision !== "Sẵn sàng ưu tiên" ||
    review.requirementReviews.some((item) => item.decision !== "Phù hợp");
  const hasNote = Boolean(review.reviewNote || review.riskNote || review.requirementReviews.some((item) => item.note));
  const ready = Boolean(review.decision && review.productValue) && reviewed === total && (!hasBlockingDecision || hasNote);
  const score = Math.round(((review.decision ? 0.2 : 0) + (review.productValue ? 0.2 : 0) + ((reviewed / total) * 0.4) + (!hasBlockingDecision || hasNote ? 0.2 : 0)) * 100);
  return { total, reviewed, hasBlockingDecision, hasNote, ready, score };
}

function markCheck(id, done) {
  document.querySelector(`#${id}`).classList.toggle("is-done", done);
}

function renderPackageList() {
  packageListEl.innerHTML = packages
    .map((packageItem) => {
      const review = getReview(packageItem.packageId);
      const set = getRequirementSet(packageItem);
      return `
        <button class="po-package-card ${packageItem.packageId === activePackageId ? "is-active" : ""}" type="button" data-package-id="${escapeHTML(packageItem.packageId)}">
          <span>${escapeHTML(review.status || packageItem.handoffStatus || "Chờ PO rà soát")}</span>
          <strong>${escapeHTML(packageItem.packageName || "Gói yêu cầu chưa tên")}</strong>
          <small>${escapeHTML(packageItem.releaseName || "Chưa release")} · ${(set.requirements || []).length} yêu cầu</small>
        </button>
      `;
    })
    .join("");

  setText("packageCount", `${packages.length} gói`);
}

function renderRequirements(requirements, review) {
  requirementListEl.innerHTML = requirements.length
    ? requirements.map((requirement, index) => `
        <article class="po-requirement-card" data-requirement-id="${escapeHTML(requirement.requirementId)}">
          <div class="po-card-head">
            <span>${String(index + 1).padStart(2, "0")}</span>
            <div>
              <strong>${escapeHTML(requirement.requirementTitle || "Yêu cầu chưa tên")}</strong>
              <small>${escapeHTML(requirement.requirementCode || requirement.requirementType || "REQ")} · ${escapeHTML(requirement.priority || "Chưa ưu tiên")} · ${escapeHTML(requirement.status || "Draft")}</small>
            </div>
          </div>
          <p>${escapeHTML(requirement.requirementDescription || "Chưa có mô tả yêu cầu.")}</p>
          <div class="po-ac-list">
            ${(requirement.acceptanceCriteria || []).map((item) => `<small>${escapeHTML(item)}</small>`).join("")}
          </div>
          <label>
            <span>Đánh giá của Product Owner</span>
            <select data-field="requirementDecision">
              ${["Phù hợp", "Cần làm rõ", "Không thuộc phạm vi sản phẩm", "Cần tách nhỏ", "Có rủi ro cao"].map(
                (value) => `<option ${value === requirementDecision(review, requirement.requirementId) ? "selected" : ""}>${value}</option>`
              ).join("")}
            </select>
          </label>
          <label>
            <span>Ghi chú riêng</span>
            <textarea data-field="requirementNote" rows="3" placeholder="Ghi chú nếu requirement cần BA làm rõ, tách nhỏ hoặc chỉnh scope.">${escapeHTML(requirementNote(review, requirement.requirementId))}</textarea>
          </label>
        </article>
      `).join("")
    : `<article class="po-requirement-card"><p>Gói này chưa có requirement để PO rà soát.</p></article>`;
}

function updateSummary() {
  const packageItem = getActivePackage();
  const requirements = getRequirementSet(packageItem).requirements || [];
  const draft = {
    ...getReview(packageItem.packageId),
    decision: form.elements.reviewDecision.value,
    productValue: form.elements.productValue.value,
    reviewNote: form.elements.reviewNote.value.trim(),
    riskNote: form.elements.riskNote.value.trim(),
    requirementReviews: [...requirementListEl.querySelectorAll(".po-requirement-card[data-requirement-id]")].map((card) => ({
      requirementId: card.dataset.requirementId,
      decision: card.querySelector("[data-field='requirementDecision']").value,
      note: card.querySelector("[data-field='requirementNote']").value.trim()
    }))
  };
  const result = calculateScore(draft, requirements);

  setText("reviewScore", `${result.score}%`);
  setText("reviewScoreText", result.ready ? "Có thể gửi kết quả review cho BA." : "Cần đánh giá đủ requirement hoặc thêm ghi chú cho điểm chưa sẵn sàng.");
  setText("requirementProgress", `${result.total ? Math.round((result.reviewed / result.total) * 100) : 100}% đã đánh giá`);
  markCheck("checkDecision", Boolean(draft.decision));
  markCheck("checkValue", Boolean(draft.productValue));
  markCheck("checkRequirements", result.reviewed === result.total);
  markCheck("checkNote", !result.hasBlockingDecision || result.hasNote);
}

function renderActivePackage() {
  const packageItem = getActivePackage();
  const set = getRequirementSet(packageItem);
  const requirements = set.requirements || [];
  const review = getReview(packageItem.packageId);

  form.elements.reviewDecision.value = review.decision || "Sẵn sàng ưu tiên";
  form.elements.productValue.value = review.productValue || "Cao";
  form.elements.reviewNote.value = review.reviewNote || "";
  form.elements.riskNote.value = review.riskNote || "";

  setText("activePackageTitle", packageItem.packageName || "Gói yêu cầu chưa tên");
  setText("activePackageMeta", `${packageItem.releaseName || "Chưa release"} · ${requirements.length} yêu cầu`);
  setText("packageTitle", packageItem.packageName || "Gói yêu cầu chưa tên");
  setText("packageStatus", review.status || packageItem.handoffStatus || "Chờ PO rà soát");
  setText("releaseName", packageItem.releaseName || "Chưa đặt release");
  setText("packageType", packageItem.packageType || "Requirement Package");
  setText("requirementTotal", String(requirements.length));
  setText("includedScope", packageItem.includedScope || "Chưa có phạm vi bao gồm.");
  setText("excludedScope", packageItem.excludedScope || packageItem.openIssues || "Chưa có phạm vi loại trừ hoặc open issue.");
  renderRequirements(requirements, review);
  updateSummary();
}

function suggestReview() {
  const decision = form.elements.reviewDecision.value;
  if (!form.elements.reviewNote.value.trim() && decision !== "Sẵn sàng ưu tiên") {
    if (decision === "Cần BA làm rõ") {
      form.elements.reviewNote.value = "PO cần BA làm rõ thêm giá trị sản phẩm, phạm vi hoặc acceptance criteria trước khi chuyển sang bước ưu tiên.";
    } else if (decision === "Cần chỉnh sửa phạm vi") {
      form.elements.reviewNote.value = "Một số yêu cầu chưa khớp phạm vi sản phẩm/release hiện tại. BA vui lòng cập nhật scope và tách phần ngoài phạm vi.";
    } else if (decision === "Tạm hoãn") {
      form.elements.reviewNote.value = "Gói yêu cầu nên tạm hoãn vì chưa đủ dữ liệu quyết định value, effort hoặc dependency.";
    } else {
      form.elements.reviewNote.value = "PO từ chối gói yêu cầu ở trạng thái hiện tại vì chưa đủ rõ giá trị, phạm vi hoặc độ sẵn sàng backlog.";
    }
  }

  if (!form.elements.riskNote.value.trim()) {
    form.elements.riskNote.value = "Cần theo dõi rủi ro scope creep, phụ thuộc stakeholder và khả năng kiểm thử acceptance criteria.";
  }

  updateSummary();
  showToast("Đã gợi ý phản hồi review cho BA.");
}

packageListEl.addEventListener("click", (event) => {
  const card = event.target.closest("[data-package-id]");
  if (!card) return;
  collectReview(getReview(activePackageId)?.status || "Đang rà soát");
  activePackageId = card.dataset.packageId;
  render();
});

form.addEventListener("input", updateSummary);
form.addEventListener("change", updateSummary);
requirementListEl.addEventListener("input", updateSummary);
requirementListEl.addEventListener("change", updateSummary);

document.querySelector("#saveReviewDraft").addEventListener("click", () => {
  collectReview("Đang rà soát");
  render();
  showToast("Đã lưu nháp review gói yêu cầu.");
});

document.querySelector("#suggestReview").addEventListener("click", suggestReview);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const review = collectReview(form.elements.reviewDecision.value);
  render();
  showToast(`Đã gửi kết quả review cho BA: ${review.decision}.`);
});

function render() {
  renderPackageList();
  renderActivePackage();
}

render();
