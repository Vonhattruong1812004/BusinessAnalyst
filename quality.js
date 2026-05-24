const REVIEW_STORAGE_KEY = "la-ban-ba.uc7.quality-reviews";
const SET_STORAGE_KEY = "la-ban-ba.uc6.requirement-sets";

const form = document.querySelector("#qualityForm");
const setListEl = document.querySelector("#qualitySetList");
const requirementListEl = document.querySelector("#qualityRequirementList");
const warningListEl = document.querySelector("#qualityWarningList");
const toast = document.querySelector("#qualityToast");

const reviewFields = [
  "reviewId",
  "requirementId",
  "requirementSet",
  "valueScore",
  "riskScore",
  "effortScore",
  "moscow",
  "reviewDecision",
  "reviewer",
  "reviewNote"
];

const ambiguousTerms = [
  "nhanh",
  "dễ dùng",
  "hợp lý",
  "tối ưu",
  "phù hợp",
  "linh hoạt",
  "thân thiện",
  "hiệu quả",
  "ổn định",
  "đơn giản"
];

const fallbackSets = [
  {
    setId: "rs-digital-lending",
    setName: "Requirement set duyệt khoản vay rủi ro",
    analysisMap: "map-digital-lending-risk",
    requirements: [
      {
        requirementId: "req-rule-500m",
        sourceId: "insight:insight-rule-500m",
        requirementCode: "RULE-001",
        requirementType: "RULE",
        requirementTitle: "Khoản vay trên 500M cần phê duyệt cấp 2",
        requirementDescription: "Khi khoản vay có giá trị trên 500M, quy trình phải chuyển hồ sơ sang cấp phê duyệt thứ hai trước khi ra quyết định cuối cùng.",
        rationale: "Rule này kiểm soát rủi ro đối với khoản vay giá trị cao và tạo trace rõ ràng cho audit trail.",
        scope: "Áp dụng cho quy trình xét duyệt hồ sơ vay cá nhân trên kênh số.",
        owner: "BA Linh / SME rủi ro",
        priority: "Must",
        status: "Ready Review",
        version: "v0.1",
        acceptanceCriteria: [
          "Hồ sơ vay trên 500M luôn được gắn trạng thái cần phê duyệt cấp 2.",
          "Người phê duyệt cấp 2 được ghi nhận trong lịch sử xử lý hồ sơ.",
          "Hồ sơ chưa có phê duyệt cấp 2 không được chuyển sang trạng thái phê duyệt cuối cùng."
        ]
      }
    ]
  }
];

const seedReviews = [
  {
    reviewId: "qr-rule-500m",
    requirementSet: "rs-digital-lending",
    requirementId: "req-rule-500m",
    valueScore: "9",
    riskScore: "8",
    effortScore: "4",
    moscow: "Must",
    reviewDecision: "Ready Review",
    reviewer: "BA Linh / QA",
    reviewNote: "Rule có nguồn rõ, AC kiểm thử được, cần PO xác nhận trước baseline.",
    updatedAt: new Date().toISOString()
  }
];

let sets = loadCollection(SET_STORAGE_KEY, fallbackSets);
let reviews = loadCollection(REVIEW_STORAGE_KEY, seedReviews);
let activeSetId = sets[0]?.setId || "";
let activeRequirementId = sets[0]?.requirements?.[0]?.requirementId || "";

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

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
  localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(reviews));
}

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setText(id, value, fallback) {
  document.querySelector(`#${id}`).textContent = value || fallback;
}

function getActiveSet() {
  return sets.find((item) => item.setId === activeSetId) || sets[0] || {};
}

function getActiveRequirement() {
  const set = getActiveSet();
  return (set.requirements || []).find((item) => item.requirementId === activeRequirementId) || (set.requirements || [])[0] || {};
}

function getReview(requirementId = activeRequirementId) {
  return reviews.find((item) => item.requirementId === requirementId && item.requirementSet === activeSetId);
}

function fillSetSelect() {
  const select = form.elements.requirementSet;
  select.innerHTML = "";
  sets.forEach((set) => {
    const option = document.createElement("option");
    option.value = set.setId;
    option.textContent = `${set.setName || "Bộ yêu cầu chưa tên"} · ${(set.requirements || []).length} yêu cầu`;
    select.appendChild(option);
  });
}

function getFormData() {
  return reviewFields.reduce((data, field) => {
    data[field] = form.elements[field].value.trim();
    return data;
  }, {});
}

function setFormData(data = {}) {
  reviewFields.forEach((field) => {
    form.elements[field].value = data?.[field] || "";
  });
}

function defaultReview(requirement = getActiveRequirement()) {
  return {
    reviewId: createId("qr"),
    requirementSet: activeSetId,
    requirementId: requirement.requirementId || "",
    valueScore: inferValue(requirement),
    riskScore: inferRisk(requirement),
    effortScore: "5",
    moscow: requirement.priority || "Should",
    reviewDecision: inferDecision(requirement),
    reviewer: requirement.owner || "",
    reviewNote: "",
    updatedAt: ""
  };
}

function inferValue(requirement) {
  if (requirement.priority === "Must") return "9";
  if (requirement.requirementType === "BR" || requirement.requirementType === "RULE") return "8";
  return "6";
}

function inferRisk(requirement) {
  if (requirement.sourceId?.startsWith("conflict:")) return "9";
  if (requirement.requirementType === "NFR" || requirement.requirementType === "RULE") return "7";
  return "5";
}

function inferDecision(requirement) {
  const quality = inspectRequirement(requirement);
  if (!quality.checks.source || !quality.checks.ac || quality.ambiguous.length) return "Need Clarification";
  return "Ready Review";
}

function inspectRequirement(requirement) {
  const text = [
    requirement.requirementTitle,
    requirement.requirementDescription,
    requirement.rationale,
    requirement.scope,
    ...(requirement.acceptanceCriteria || [])
  ].join(" ").toLowerCase();

  const ambiguous = ambiguousTerms.filter((term) => text.includes(term));
  const ac = requirement.acceptanceCriteria || [];
  const testableAC = ac.filter((item) => /\d|khi|nếu|phải|được|không được|hiển thị|ghi nhận|tính|đo|trả về/i.test(item));
  const checks = {
    source: Boolean(requirement.sourceId),
    description: Boolean(requirement.requirementTitle && requirement.requirementDescription),
    ac: ac.length >= 2,
    testable: ac.length >= 2 && testableAC.length >= 2,
    owner: Boolean(requirement.owner),
    ambiguity: ambiguous.length === 0,
    conflict: !(requirement.sourceId?.startsWith("conflict:") && ["Approved", "Baseline"].includes(requirement.status))
  };

  const score = Math.round((Object.values(checks).filter(Boolean).length / Object.values(checks).length) * 100);
  return { checks, ambiguous, testableAC, score };
}

function calculatePriority(review) {
  const value = Number(review.valueScore || 0);
  const risk = Number(review.riskScore || 0);
  const effort = Number(review.effortScore || 0);
  const moscowWeight = {
    Must: 18,
    Should: 12,
    Could: 7,
    "Won't now": 0
  }[review.moscow] ?? 0;

  return Math.max(0, Math.min(100, Math.round((value * 6) + (risk * 4) + moscowWeight - (effort * 3))));
}

function getWarnings(requirement, review) {
  const quality = inspectRequirement(requirement);
  const warnings = [];
  if (!quality.checks.source) warnings.push(["Thiếu source trace", "Requirement chưa liên kết nguồn từ UC5."]);
  if (!quality.checks.description) warnings.push(["Thiếu mô tả", "Cần có tiêu đề và mô tả requirement rõ ràng."]);
  if (!quality.checks.ac) warnings.push(["Thiếu acceptance criteria", "Requirement chưa đủ AC để QA/PO review."]);
  if (!quality.checks.testable) warnings.push(["AC chưa testable", "AC nên có điều kiện kiểm tra hoặc kết quả đo được."]);
  if (!quality.checks.owner) warnings.push(["Thiếu owner", "Cần xác định owner hoặc reviewer."]);
  if (quality.ambiguous.length) warnings.push(["Từ ngữ mơ hồ", `Phát hiện: ${quality.ambiguous.join(", ")}.`]);
  if (!quality.checks.conflict) warnings.push(["Conflict chưa xử lý", "Requirement sinh từ conflict không nên Approved/Baseline."]);
  if (review.reviewDecision !== "Need Clarification" && (!quality.checks.ac || quality.ambiguous.length)) {
    warnings.push(["Decision chưa phù hợp", "Không nên Ready Review/Approved Candidate khi thiếu AC hoặc còn mơ hồ."]);
  }
  return warnings;
}

function renderSetList() {
  setListEl.innerHTML = "";
  sets.forEach((set) => {
    const reviewed = (set.requirements || []).filter((req) => getReview(req.requirementId)).length;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `uc7-record ${set.setId === activeSetId ? "is-active" : ""}`;
    button.innerHTML = `
      <span>${reviewed}/${(set.requirements || []).length} đã review</span>
      <strong>${escapeHTML(set.setName || "Bộ yêu cầu chưa tên")}</strong>
      <small>${escapeHTML(set.analysisMap || "Analysis Map")} · ${(set.requirements || []).length} yêu cầu</small>
    `;
    button.addEventListener("click", () => {
      activeSetId = set.setId;
      activeRequirementId = (set.requirements || [])[0]?.requirementId || "";
      syncScreen();
    });
    setListEl.appendChild(button);
  });
}

function renderRequirementList() {
  const set = getActiveSet();
  const requirements = set.requirements || [];
  requirementListEl.innerHTML = "";
  setText("reviewRequirementCount", `${requirements.length} requirement`, "0 requirement");

  requirements.forEach((requirement) => {
    const review = getReview(requirement.requirementId);
    const quality = inspectRequirement(requirement);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `uc7-requirement-item ${requirement.requirementId === activeRequirementId ? "is-active" : ""}`;
    button.innerHTML = `
      <span>${escapeHTML(requirement.requirementCode || requirement.requirementType || "REQ")}</span>
      <strong>${escapeHTML(requirement.requirementTitle || "Yêu cầu chưa tên")}</strong>
      <small>${quality.score}% quality · ${review ? review.reviewDecision : "Chưa review"}</small>
    `;
    button.addEventListener("click", () => {
      activeRequirementId = requirement.requirementId;
      syncRequirement();
    });
    requirementListEl.appendChild(button);
  });
}

function renderWarnings(requirement, review) {
  const warnings = getWarnings(requirement, review);
  warningListEl.innerHTML = warnings.length
    ? warnings.map(([title, detail]) => `
        <article class="uc7-warning-item">
          <span>${escapeHTML(title)}</span>
          <p>${escapeHTML(detail)}</p>
        </article>
      `).join("")
    : `<article class="uc7-warning-item is-good"><span>Không có cảnh báo nghiêm trọng</span><p>Requirement đủ nền tảng để review tiếp.</p></article>`;
}

function renderLens() {
  const set = getActiveSet();
  const requirements = set.requirements || [];
  const setReviews = reviews.filter((item) => item.requirementSet === activeSetId);
  const rows = [
    ["Tổng requirement", requirements.length],
    ["Đã review", setReviews.length],
    ["Need Clarification", setReviews.filter((item) => item.reviewDecision === "Need Clarification").length],
    ["Ready Review", setReviews.filter((item) => item.reviewDecision === "Ready Review").length],
    ["Approved Candidate", setReviews.filter((item) => item.reviewDecision === "Approved Candidate").length],
    ["Thiếu AC", requirements.filter((item) => (item.acceptanceCriteria || []).length < 2).length]
  ];

  document.querySelector("#qualityLens").innerHTML = rows
    .map(([label, count]) => `<span>${escapeHTML(label)}<strong>${count}</strong></span>`)
    .join("");
}

function markCheck(id, done) {
  document.querySelector(`#${id}`).classList.toggle("is-done", done);
}

function renderPreview() {
  const requirement = getActiveRequirement();
  const review = getFormData();
  const quality = inspectRequirement(requirement);
  const priority = calculatePriority(review);
  const warnings = getWarnings(requirement, review);
  const decisionValid = !(review.reviewDecision !== "Need Clarification" && warnings.some(([title]) => ["Thiếu acceptance criteria", "Từ ngữ mơ hồ", "Decision chưa phù hợp"].includes(title)));

  setText("activeRequirementName", requirement.requirementTitle, "Chưa chọn");
  setText("activeRequirementMeta", `${requirement.requirementCode || requirement.requirementType || "REQ"} · ${review.reviewDecision || "Chưa review"}`, "Chọn requirement để kiểm tra chất lượng.");
  setText("selectedRequirementTitle", requirement.requirementTitle, "Chưa chọn requirement");
  setText(
    "selectedRequirementDetail",
    `${requirement.requirementType || "REQ"} · ${requirement.status || "Draft"} · ${(requirement.acceptanceCriteria || []).length} AC`,
    "Chọn requirement để xem cảnh báo chất lượng và điểm ưu tiên."
  );
  setText("qualityScore", `${quality.score}%`, "0%");
  setText("qualityScoreText", quality.score >= 80 ? "Requirement đủ nền tảng để review." : "Requirement cần làm rõ trước khi review.", "Chưa có requirement để kiểm tra.");
  setText("priorityScore", String(priority), "0");
  setText(
    "priorityText",
    priority >= 75 ? "Ưu tiên cao." : priority >= 45 ? "Ưu tiên trung bình." : "Ưu tiên thấp hoặc cần xem xét.",
    "Chưa có điểm ưu tiên."
  );
  setText("qualityRisk", warnings[0]?.[1], "Không có cảnh báo nghiêm trọng.");

  markCheck("checkTrace", quality.checks.source);
  markCheck("checkDescription", quality.checks.description);
  markCheck("checkACQuality", quality.checks.ac && quality.checks.testable);
  markCheck("checkOwnerQuality", quality.checks.owner);
  markCheck("checkAmbiguity", quality.checks.ambiguity);
  markCheck("checkDecision", decisionValid);
  renderWarnings(requirement, review);
  renderLens();
}

function syncRequirement() {
  const requirement = getActiveRequirement();
  const review = getReview(requirement.requirementId) || defaultReview(requirement);
  setFormData(review);
  renderRequirementList();
  renderPreview();
}

function syncScreen() {
  form.elements.requirementSet.value = activeSetId;
  renderSetList();
  renderRequirementList();
  syncRequirement();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  setTimeout(() => toast.classList.remove("is-visible"), 2400);
}

form.elements.requirementSet.addEventListener("change", () => {
  activeSetId = form.elements.requirementSet.value;
  activeRequirementId = (getActiveSet().requirements || [])[0]?.requirementId || "";
  syncScreen();
});

form.addEventListener("input", renderPreview);
form.addEventListener("change", renderPreview);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const data = {
    ...getFormData(),
    updatedAt: new Date().toISOString()
  };
  const index = reviews.findIndex((item) => item.reviewId === data.reviewId);
  if (index >= 0) {
    reviews[index] = data;
  } else {
    reviews.unshift(data);
  }

  saveReviews();
  renderSetList();
  renderRequirementList();
  renderPreview();
  showToast("Đã lưu Quality Review.");
});

document.querySelector("#resetReview").addEventListener("click", () => {
  syncRequirement();
  showToast("Đã hoàn tác thay đổi chưa lưu.");
});

fillSetSelect();
syncScreen();
