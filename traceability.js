const TRACE_STORAGE_KEY = "la-ban-ba.uc8.trace-change";
const SET_STORAGE_KEY = "la-ban-ba.uc6.requirement-sets";
const REVIEW_STORAGE_KEY = "la-ban-ba.uc7.quality-reviews";

const form = document.querySelector("#traceForm");
const setListEl = document.querySelector("#traceSetList");
const matrixEl = document.querySelector("#traceMatrix");
const affectedListEl = document.querySelector("#affectedRequirementList");
const changeListEl = document.querySelector("#changeList");
const toast = document.querySelector("#traceToast");

const changeFields = [
  "changeId",
  "changeTitle",
  "changeSource",
  "changeReason",
  "urgency",
  "impactScope",
  "approvalPath",
  "decision",
  "impactNote"
];

const seedSets = [
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

const seedChanges = [
  {
    changeId: "cr-biometric-001",
    requirementSet: "rs-digital-lending",
    changeTitle: "Thêm bước xác minh sinh trắc học",
    changeSource: "Risk SME / Compliance",
    changeReason: "Giảm rủi ro gian lận trước khi phê duyệt khoản vay giá trị cao.",
    urgency: "Cao",
    impactScope: "Quy trình nghiệp vụ",
    approvalPath: "SME + PO xác nhận",
    decision: "Cần làm rõ",
    impactNote: "Cần kiểm tra tác động đến rule phê duyệt, trải nghiệm khách hàng, test case và SLA xử lý hồ sơ.",
    impactedRequirements: ["req-rule-500m"],
    updatedAt: new Date().toISOString()
  }
];

let sets = loadCollection(SET_STORAGE_KEY, seedSets);
let reviews = loadCollection(REVIEW_STORAGE_KEY, seedReviews);
let changes = loadCollection(TRACE_STORAGE_KEY, seedChanges);
let activeSetId = sets[0]?.setId || "";
let activeChangeId = changes.find((item) => item.requirementSet === activeSetId)?.changeId || "";
let selectedImpacts = new Set(getActiveChange()?.impactedRequirements || []);

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

function saveChanges() {
  localStorage.setItem(TRACE_STORAGE_KEY, JSON.stringify(changes));
}

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setText(id, value, fallback = "") {
  document.querySelector(`#${id}`).textContent = value || fallback;
}

function getActiveSet() {
  return sets.find((item) => item.setId === activeSetId) || sets[0] || {};
}

function getSetChanges(setId = activeSetId) {
  return changes.filter((item) => item.requirementSet === setId);
}

function getActiveChange() {
  return changes.find((item) => item.changeId === activeChangeId && item.requirementSet === activeSetId);
}

function getReview(requirementId) {
  return reviews.find((item) => item.requirementSet === activeSetId && item.requirementId === requirementId);
}

function getRequirementById(requirementId) {
  return (getActiveSet().requirements || []).find((item) => item.requirementId === requirementId);
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
  return changeFields.reduce((data, field) => {
    data[field] = form.elements[field].value.trim();
    return data;
  }, {});
}

function setFormData(data = {}) {
  changeFields.forEach((field) => {
    form.elements[field].value = data?.[field] || "";
  });
}

function defaultChange() {
  return {
    changeId: createId("cr"),
    changeTitle: "",
    changeSource: "",
    changeReason: "",
    urgency: "Trung bình",
    impactScope: "Requirement đơn lẻ",
    approvalPath: "BA xác nhận",
    decision: "Cần làm rõ",
    impactNote: ""
  };
}

function sourceLabel(sourceId = "") {
  if (!sourceId) return "Thiếu source";
  const [type, id] = sourceId.split(":");
  const labels = {
    insight: "Insight",
    step: "Process",
    gap: "Gap",
    risk: "Risk",
    conflict: "Conflict"
  };
  return `${labels[type] || "Source"} · ${id || sourceId}`;
}

function buildTraceRows() {
  const requirements = getActiveSet().requirements || [];
  return requirements.map((requirement, index) => {
    const review = getReview(requirement.requirementId);
    const acCount = (requirement.acceptanceCriteria || []).length;
    const hasSource = Boolean(requirement.sourceId);
    const hasReview = Boolean(review);
    const hasTest = acCount >= 2;
    const storyCode = requirement.requirementType === "US"
      ? requirement.requirementCode
      : `US-${String(index + 21).padStart(3, "0")}`;
    const testCode = hasTest ? `TC-${String(index + 12).padStart(3, "0")}` : "Thiếu test";

    return {
      requirement,
      review,
      goal: `Goal-${String(index + 1).padStart(2, "0")}`,
      need: hasSource ? `Need-${String(index + 4).padStart(2, "0")}` : "Cần làm rõ",
      source: sourceLabel(requirement.sourceId),
      story: storyCode,
      test: testCode,
      health: [hasSource, hasReview, hasTest].filter(Boolean).length,
      risk: !hasSource ? "Thiếu source trace" : !hasReview ? "Chưa quality review" : !hasTest ? "Thiếu test link" : "Đã truy vết"
    };
  });
}

function calculateCoverage() {
  const rows = buildTraceRows();
  if (!rows.length) return 0;
  const points = rows.reduce((sum, row) => sum + row.health, 0);
  return Math.round((points / (rows.length * 3)) * 100);
}

function getSelectedRequirements() {
  return [...selectedImpacts].map(getRequirementById).filter(Boolean);
}

function calculateImpactScore() {
  const selected = getSelectedRequirements();
  const data = getFormData();
  const urgencyWeight = {
    "Thấp": 8,
    "Trung bình": 18,
    "Cao": 30,
    "Khẩn cấp": 42
  }[data.urgency] || 18;
  const scopeWeight = {
    "Requirement đơn lẻ": 10,
    "Nhiều requirement": 24,
    "Quy trình nghiệp vụ": 34,
    "Scope / timeline / chi phí": 42
  }[data.impactScope] || 10;
  const priorityWeight = selected.filter((item) => item.priority === "Must").length * 10;
  const baselineWeight = selected.filter((item) => ["Approved", "Baseline", "Ready Review"].includes(item.status)).length * 8;
  return Math.min(100, Math.round(urgencyWeight + scopeWeight + priorityWeight + baselineWeight + selected.length * 7));
}

function impactLevel(score) {
  if (score >= 78) return "Tác động rất cao";
  if (score >= 58) return "Tác động cao";
  if (score >= 34) return "Tác động trung bình";
  if (score > 0) return "Tác động thấp";
  return "Chưa đánh giá";
}

function firstRisk() {
  const rows = buildTraceRows();
  const missingSource = rows.find((row) => !row.requirement.sourceId);
  if (missingSource) return `${missingSource.requirement.requirementCode || "REQ"} chưa có source trace.`;
  const missingReview = rows.find((row) => !row.review);
  if (missingReview) return `${missingReview.requirement.requirementCode || "REQ"} chưa có quality review từ UC7.`;
  const missingTest = rows.find((row) => (row.requirement.acceptanceCriteria || []).length < 2);
  if (missingTest) return `${missingTest.requirement.requirementCode || "REQ"} chưa đủ AC để nối test case.`;
  const score = calculateImpactScore();
  if (score >= 78) return "Change Request có tác động rất cao, nên đi qua Change Control Board.";
  return "Không có cảnh báo truy vết nghiêm trọng.";
}

function aiHint() {
  const selected = getSelectedRequirements();
  if (!selected.length) return "Chọn requirement bị ảnh hưởng để nhận gợi ý vùng tác động.";

  const types = new Set(selected.map((item) => item.requirementType));
  const hints = [];
  if (types.has("RULE")) hints.push("kiểm tra decision log, quyền phê duyệt và business rule liên quan");
  if (types.has("NFR")) hints.push("kiểm tra SLA, tiêu chí đo lường và test hiệu năng/bảo mật");
  if (types.has("FR") || types.has("US")) hints.push("kiểm tra user story, luồng xử lý, UI state và test case");
  if (selected.some((item) => item.priority === "Must")) hints.push("xác nhận lại với PO vì có requirement mức Must");

  return `AI gợi ý BA nên ${hints.join("; ")}.`;
}

function renderSetList() {
  setListEl.innerHTML = "";
  sets.forEach((set) => {
    const currentSetId = activeSetId;
    activeSetId = set.setId;
    const coverage = calculateCoverage();
    activeSetId = currentSetId;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `uc8-record ${set.setId === activeSetId ? "is-active" : ""}`;
    button.innerHTML = `
      <span>${coverage}% trace · ${getSetChanges(set.setId).length} CR</span>
      <strong>${escapeHTML(set.setName || "Bộ yêu cầu chưa tên")}</strong>
      <small>${escapeHTML(set.analysisMap || "Analysis Map")} · ${(set.requirements || []).length} requirement</small>
    `;
    button.addEventListener("click", () => {
      activeSetId = set.setId;
      activeChangeId = getSetChanges()[0]?.changeId || "";
      selectedImpacts = new Set(getActiveChange()?.impactedRequirements || []);
      syncScreen();
    });
    setListEl.appendChild(button);
  });
}

function renderMatrix() {
  const rows = buildTraceRows();
  setText("matrixCount", `${rows.length} requirement`, "0 requirement");
  setText("matrixHealth", `${calculateCoverage()}% độ phủ`, "Chưa có dữ liệu");

  if (!rows.length) {
    matrixEl.innerHTML = `<article class="uc8-empty">Chưa có requirement từ UC6 để truy vết.</article>`;
    return;
  }

  matrixEl.innerHTML = `
    <div class="uc8-matrix-head">Goal</div>
    <div class="uc8-matrix-head">Need / Source</div>
    <div class="uc8-matrix-head">Requirement</div>
    <div class="uc8-matrix-head">Story</div>
    <div class="uc8-matrix-head">Test</div>
    <div class="uc8-matrix-head">Risk</div>
    ${rows.map((row) => `
      <div>${escapeHTML(row.goal)}</div>
      <div>${escapeHTML(row.need)}<small>${escapeHTML(row.source)}</small></div>
      <div>
        <strong>${escapeHTML(row.requirement.requirementCode || row.requirement.requirementType || "REQ")}</strong>
        <small>${escapeHTML(row.requirement.requirementTitle || "Yêu cầu chưa tên")}</small>
      </div>
      <div>${escapeHTML(row.story)}</div>
      <div class="${row.test === "Thiếu test" ? "is-missing" : ""}">${escapeHTML(row.test)}</div>
      <div class="${row.risk === "Đã truy vết" ? "is-good" : "is-risk"}">${escapeHTML(row.risk)}</div>
    `).join("")}
  `;
}

function renderAffectedList() {
  const requirements = getActiveSet().requirements || [];
  setText("affectedCount", `${selectedImpacts.size} đã chọn`, "0 đã chọn");
  affectedListEl.innerHTML = requirements.length
    ? requirements.map((requirement) => {
        const review = getReview(requirement.requirementId);
        const checked = selectedImpacts.has(requirement.requirementId) ? "checked" : "";
        return `
          <label class="uc8-affected-item">
            <input type="checkbox" value="${escapeHTML(requirement.requirementId)}" ${checked} />
            <span>
              <strong>${escapeHTML(requirement.requirementCode || requirement.requirementType || "REQ")} · ${escapeHTML(requirement.requirementTitle || "Yêu cầu chưa tên")}</strong>
              <small>${escapeHTML(requirement.priority || "Priority?")} · ${escapeHTML(requirement.status || "Draft")} · ${review ? escapeHTML(review.reviewDecision) : "Chưa review UC7"}</small>
            </span>
          </label>
        `;
      }).join("")
    : `<article class="uc8-empty">Chưa có requirement để đánh dấu tác động.</article>`;

  affectedListEl.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) {
        selectedImpacts.add(input.value);
      } else {
        selectedImpacts.delete(input.value);
      }
      renderPreview();
      setText("affectedCount", `${selectedImpacts.size} đã chọn`, "0 đã chọn");
    });
  });
}

function renderChangeList() {
  const setChanges = getSetChanges();
  changeListEl.innerHTML = setChanges.length
    ? setChanges.map((change) => {
        const count = (change.impactedRequirements || []).length;
        return `
          <button class="uc8-change-item ${change.changeId === activeChangeId ? "is-active" : ""}" type="button" data-id="${escapeHTML(change.changeId)}">
            <span>${escapeHTML(change.urgency || "Trung bình")} · ${count} requirement ảnh hưởng</span>
            <strong>${escapeHTML(change.changeTitle || "Change Request chưa tên")}</strong>
            <small>${escapeHTML(change.decision || "Cần làm rõ")} · ${escapeHTML(change.approvalPath || "BA xác nhận")}</small>
          </button>
        `;
      }).join("")
    : `<article class="uc8-empty">Chưa có Change Request cho bộ yêu cầu này.</article>`;

  changeListEl.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      activeChangeId = button.dataset.id;
      selectedImpacts = new Set(getActiveChange()?.impactedRequirements || []);
      syncChangeForm();
    });
  });
}

function renderTraceLens() {
  const rows = buildTraceRows();
  const reviewed = rows.filter((row) => row.review).length;
  const sourceLinked = rows.filter((row) => row.requirement.sourceId).length;
  const testLinked = rows.filter((row) => (row.requirement.acceptanceCriteria || []).length >= 2).length;
  const highImpact = getSetChanges().filter((change) => (change.impactedRequirements || []).length > 1 || ["Cao", "Khẩn cấp"].includes(change.urgency)).length;
  const lens = [
    ["Requirement", rows.length],
    ["Có source trace", sourceLinked],
    ["Đã review UC7", reviewed],
    ["Có test link", testLinked],
    ["Change impact cao", highImpact]
  ];

  document.querySelector("#traceLens").innerHTML = lens
    .map(([label, value]) => `<span>${escapeHTML(label)}<strong>${value}</strong></span>`)
    .join("");
}

function renderPreview() {
  const coverage = calculateCoverage();
  const score = calculateImpactScore();
  const radar = document.querySelector("#impactRadar");
  radar.style.setProperty("--impact-score", `${score}%`);

  setText("traceCoverageHero", `${coverage}%`, "0%");
  setText("traceCoverageMeta", `${(getActiveSet().requirements || []).length} requirement · ${getSetChanges().length} Change Request`, "Chọn requirement set để xem độ phủ truy vết.");
  setText("traceCoverage", `${coverage}%`, "0%");
  setText("traceCoverageText", coverage >= 80 ? "Requirement set đủ tốt để bàn giao trace." : "Còn thiếu liên kết trước khi baseline.", "Chưa có requirement để truy vết.");
  setText("impactScore", String(score), "0");
  setText("impactLevel", impactLevel(score), "Chưa đánh giá");
  setText("aiImpactHint", aiHint(), "Chọn requirement bị ảnh hưởng để nhận gợi ý vùng tác động.");
  setText("traceRisk", firstRisk(), "Chưa có cảnh báo.");
  renderTraceLens();
}

function syncChangeForm() {
  const change = getActiveChange() || defaultChange();
  setFormData(change);
  selectedImpacts = new Set(change.impactedRequirements || []);
  renderAffectedList();
  renderChangeList();
  renderPreview();
}

function syncScreen() {
  form.elements.requirementSet.value = activeSetId;
  renderSetList();
  renderMatrix();
  syncChangeForm();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  setTimeout(() => toast.classList.remove("is-visible"), 2400);
}

form.elements.requirementSet.addEventListener("change", () => {
  activeSetId = form.elements.requirementSet.value;
  activeChangeId = getSetChanges()[0]?.changeId || "";
  selectedImpacts = new Set(getActiveChange()?.impactedRequirements || []);
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
    requirementSet: activeSetId,
    impactedRequirements: [...selectedImpacts],
    updatedAt: new Date().toISOString()
  };
  const index = changes.findIndex((item) => item.changeId === data.changeId);
  if (index >= 0) {
    changes[index] = data;
  } else {
    changes.unshift(data);
  }

  activeChangeId = data.changeId;
  saveChanges();
  renderSetList();
  renderChangeList();
  renderPreview();
  showToast("Đã lưu Change Request.");
});

document.querySelector("#newChange").addEventListener("click", () => {
  activeChangeId = "";
  selectedImpacts = new Set();
  setFormData(defaultChange());
  renderAffectedList();
  renderChangeList();
  renderPreview();
  showToast("Đã tạo form Change Request mới.");
});

fillSetSelect();
syncScreen();
