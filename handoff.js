const HANDOFF_STORAGE_KEY = "la-ban-ba.uc9.handoff-packages";
const SET_STORAGE_KEY = "la-ban-ba.uc6.requirement-sets";
const REVIEW_STORAGE_KEY = "la-ban-ba.uc7.quality-reviews";
const TRACE_STORAGE_KEY = "la-ban-ba.uc8.trace-change";

const form = document.querySelector("#handoffForm");
const setListEl = document.querySelector("#handoffSetList");
const checksEl = document.querySelector("#readinessChecks");
const previewEl = document.querySelector("#deliveryPreview");
const riskListEl = document.querySelector("#handoffRiskList");
const signoffEl = document.querySelector("#signoffTimeline");
const toast = document.querySelector("#handoffToast");

const packageFields = [
  "packageId",
  "packageName",
  "packageType",
  "releaseName",
  "handoffStatus",
  "includedScope",
  "excludedScope",
  "openIssues"
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
    reviewNote: "Rule có nguồn rõ, AC kiểm thử được, cần PO xác nhận trước baseline."
  }
];

const seedChanges = [
  {
    changeId: "cr-biometric-001",
    requirementSet: "rs-digital-lending",
    changeTitle: "Thêm bước xác minh sinh trắc học",
    urgency: "Cao",
    decision: "Cần làm rõ",
    impactedRequirements: ["req-rule-500m"]
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
    includedScope: "Business rule phê duyệt cấp 2, acceptance criteria, traceability, change log và phạm vi UAT sơ bộ.",
    excludedScope: "Tích hợp sinh trắc học chỉ nằm ở mức change request cần làm rõ.",
    recipients: ["Product Owner", "Project Manager", "Developer", "QA / Tester"],
    openIssues: "CR xác minh sinh trắc học cần PO và SME xác nhận trước baseline.",
    updatedAt: new Date().toISOString()
  }
];

let sets = loadCollection(SET_STORAGE_KEY, seedSets);
let reviews = loadCollection(REVIEW_STORAGE_KEY, seedReviews);
let changes = loadCollection(TRACE_STORAGE_KEY, seedChanges);
let packages = loadCollection(HANDOFF_STORAGE_KEY, seedPackages);
let activeSetId = sets[0]?.setId || "";
let activePackageId = packages.find((item) => item.requirementSet === activeSetId)?.packageId || "";

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

function savePackages() {
  localStorage.setItem(HANDOFF_STORAGE_KEY, JSON.stringify(packages));
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

function getSetPackages(setId = activeSetId) {
  return packages.filter((item) => item.requirementSet === setId);
}

function getActivePackage() {
  return packages.find((item) => item.packageId === activePackageId && item.requirementSet === activeSetId);
}

function getSetReviews(setId = activeSetId) {
  return reviews.filter((item) => item.requirementSet === setId);
}

function getSetChanges(setId = activeSetId) {
  return changes.filter((item) => item.requirementSet === setId);
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

function getRecipients() {
  return [...form.querySelectorAll('input[name="recipients"]:checked')].map((item) => item.value);
}

function setRecipients(recipients = []) {
  form.querySelectorAll('input[name="recipients"]').forEach((input) => {
    input.checked = recipients.includes(input.value);
  });
}

function getFormData() {
  return packageFields.reduce((data, field) => {
    data[field] = form.elements[field].value.trim();
    return data;
  }, {});
}

function setFormData(data = {}) {
  packageFields.forEach((field) => {
    form.elements[field].value = data?.[field] || "";
  });
  setRecipients(data.recipients || ["Product Owner", "Project Manager", "Developer", "QA / Tester"]);
}

function defaultPackage() {
  const set = getActiveSet();
  return {
    packageId: createId("hp"),
    packageName: `${set.setName || "Gói phân tích"} · Handoff`,
    packageType: "Full Analysis Pack",
    releaseName: "Baseline v0.1",
    handoffStatus: "Draft",
    includedScope: buildIncludedScope(),
    excludedScope: "",
    openIssues: buildOpenIssueText(),
    recipients: ["Product Owner", "Project Manager", "Developer", "QA / Tester"]
  };
}

function calculateTraceCoverage(setId = activeSetId) {
  const set = sets.find((item) => item.setId === setId) || {};
  const requirements = set.requirements || [];
  if (!requirements.length) return 0;

  const reviewed = getSetReviews(setId);
  const points = requirements.reduce((sum, requirement) => {
    const hasSource = Boolean(requirement.sourceId);
    const hasReview = reviewed.some((item) => item.requirementId === requirement.requirementId);
    const hasAC = (requirement.acceptanceCriteria || []).length >= 2;
    return sum + [hasSource, hasReview, hasAC].filter(Boolean).length;
  }, 0);

  return Math.round((points / (requirements.length * 3)) * 100);
}

function buildReadinessChecks() {
  const set = getActiveSet();
  const requirements = set.requirements || [];
  const setReviews = getSetReviews();
  const setChanges = getSetChanges();
  const formData = getFormData();
  const recipients = getRecipients();
  const sourceCount = requirements.filter((item) => item.sourceId).length;
  const acCount = requirements.filter((item) => (item.acceptanceCriteria || []).length >= 2).length;
  const readyReviewCount = setReviews.filter((item) => ["Ready Review", "Approved Candidate"].includes(item.reviewDecision)).length;
  const unresolvedCR = setChanges.filter((item) => ["Cần làm rõ", "Đưa vào backlog"].includes(item.decision));

  return [
    {
      id: "scope",
      title: "Có phạm vi bàn giao",
      detail: "Gói cần ghi rõ included scope và excluded scope.",
      done: Boolean(formData.includedScope)
    },
    {
      id: "source",
      title: "Requirement có source trace",
      detail: `${sourceCount}/${requirements.length} requirement có nguồn gốc.`,
      done: requirements.length > 0 && sourceCount === requirements.length
    },
    {
      id: "quality",
      title: "Đã quality review",
      detail: `${setReviews.length}/${requirements.length} requirement đã qua UC7.`,
      done: requirements.length > 0 && setReviews.length >= requirements.length
    },
    {
      id: "acceptance",
      title: "Có acceptance criteria",
      detail: `${acCount}/${requirements.length} requirement đủ AC để QA dùng làm test basis.`,
      done: requirements.length > 0 && acCount === requirements.length
    },
    {
      id: "trace",
      title: "Traceability đủ an toàn",
      detail: `${calculateTraceCoverage()}% độ phủ truy vết từ UC8.`,
      done: calculateTraceCoverage() >= 80
    },
    {
      id: "change",
      title: "Change log được kiểm soát",
      detail: unresolvedCR.length ? `${unresolvedCR.length} CR còn cần làm rõ.` : "Không có CR mở nghiêm trọng.",
      done: unresolvedCR.length === 0
    },
    {
      id: "recipients",
      title: "Có người nhận bàn giao",
      detail: `${recipients.length} bên nhận đã chọn.`,
      done: recipients.length >= 3
    },
    {
      id: "signoff",
      title: "Có điều kiện sign-off",
      detail: formData.openIssues ? "Đã ghi open issue hoặc điều kiện xác nhận." : "Cần ghi điều kiện sign-off nếu chưa baseline.",
      done: Boolean(formData.openIssues) || formData.handoffStatus === "Baselined"
    },
    {
      id: "ready",
      title: "Yêu cầu sẵn sàng review",
      detail: `${readyReviewCount}/${requirements.length} requirement đạt Ready Review/Approved Candidate.`,
      done: requirements.length > 0 && readyReviewCount >= requirements.length
    }
  ];
}

function readinessScore() {
  const checks = buildReadinessChecks();
  if (!checks.length) return 0;
  return Math.round((checks.filter((item) => item.done).length / checks.length) * 100);
}

function readinessLabel(score) {
  if (score >= 90) return "Sẵn sàng baseline.";
  if (score >= 70) return "Đủ tốt để review bàn giao.";
  if (score >= 45) return "Cần xử lý thêm trước khi bàn giao.";
  return "Chưa sẵn sàng bàn giao.";
}

function buildIncludedScope() {
  const set = getActiveSet();
  const requirements = set.requirements || [];
  const types = [...new Set(requirements.map((item) => item.requirementType || "REQ"))];
  return [
    set.setName || "Requirement set",
    `${requirements.length} requirement`,
    types.join(", "),
    "acceptance criteria, traceability và change log liên quan"
  ].filter(Boolean).join(" · ");
}

function buildOpenIssueText() {
  const risks = buildRisks();
  return risks.length ? risks.map((item) => item.detail).join("\n") : "Không có open issue nghiêm trọng.";
}

function buildRisks() {
  const set = getActiveSet();
  const requirements = set.requirements || [];
  const setReviews = getSetReviews();
  const setChanges = getSetChanges();
  const risks = [];
  const missingSource = requirements.filter((item) => !item.sourceId);
  const missingAC = requirements.filter((item) => (item.acceptanceCriteria || []).length < 2);
  const missingReview = requirements.filter((requirement) => !setReviews.some((item) => item.requirementId === requirement.requirementId));
  const unresolvedCR = setChanges.filter((item) => ["Cần làm rõ", "Đưa vào backlog"].includes(item.decision));

  if (missingSource.length) risks.push({ title: "Thiếu source trace", detail: `${missingSource.length} requirement chưa có nguồn gốc rõ ràng.` });
  if (missingAC.length) risks.push({ title: "Thiếu acceptance criteria", detail: `${missingAC.length} requirement chưa đủ AC cho QA.` });
  if (missingReview.length) risks.push({ title: "Chưa quality review", detail: `${missingReview.length} requirement chưa qua UC7.` });
  if (calculateTraceCoverage() < 80) risks.push({ title: "Traceability thấp", detail: `Độ phủ truy vết hiện là ${calculateTraceCoverage()}%.` });
  if (unresolvedCR.length) risks.push({ title: "CR chưa đóng", detail: `${unresolvedCR.length} Change Request vẫn cần xử lý trước baseline.` });

  return risks;
}

function packageStats() {
  const requirements = getActiveSet().requirements || [];
  const acTotal = requirements.reduce((sum, item) => sum + (item.acceptanceCriteria || []).length, 0);
  return {
    requirements: requirements.length,
    acTotal,
    reviews: getSetReviews().length,
    changes: getSetChanges().length,
    traceCoverage: calculateTraceCoverage(),
    recipients: getRecipients().length
  };
}

function aiHint() {
  const score = readinessScore();
  const risks = buildRisks();
  const data = getFormData();
  if (score >= 90) return "AI gợi ý: gói này có thể chuyển sang sign-off, BA chỉ cần xác nhận người phê duyệt cuối cùng.";
  if (!data.includedScope) return "AI gợi ý: bổ sung phạm vi bàn giao trước, vì đây là điều kiện đầu tiên để PO/PM hiểu đúng scope.";
  if (risks.length) return `AI phát hiện điểm cần xử lý trước bàn giao: ${risks[0].detail}`;
  return "AI gợi ý: kiểm tra lại recipient map và open issue trước khi gửi gói bàn giao.";
}

function renderSetList() {
  setListEl.innerHTML = "";
  sets.forEach((set) => {
    const currentSetId = activeSetId;
    activeSetId = set.setId;
    const score = readinessScore();
    activeSetId = currentSetId;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `uc9-record ${set.setId === activeSetId ? "is-active" : ""}`;
    button.innerHTML = `
      <span>${score}% ready · ${getSetPackages(set.setId).length} package</span>
      <strong>${escapeHTML(set.setName || "Gói phân tích chưa tên")}</strong>
      <small>${escapeHTML(set.analysisMap || "Analysis Map")} · ${(set.requirements || []).length} requirement</small>
    `;
    button.addEventListener("click", () => {
      activeSetId = set.setId;
      activePackageId = getSetPackages()[0]?.packageId || "";
      syncScreen();
    });
    setListEl.appendChild(button);
  });
}

function renderReadiness() {
  const checks = buildReadinessChecks();
  checksEl.innerHTML = checks.map((item) => `
    <article class="uc9-check ${item.done ? "is-done" : ""}">
      <span>${item.done ? "OK" : "!"}</span>
      <strong>${escapeHTML(item.title)}</strong>
      <small>${escapeHTML(item.detail)}</small>
    </article>
  `).join("");
}

function renderPreview() {
  const data = getFormData();
  const stats = packageStats();
  previewEl.innerHTML = `
    <article>
      <span>Package</span>
      <strong>${escapeHTML(data.packageName || "Gói bàn giao chưa tên")}</strong>
      <small>${escapeHTML(data.packageType || "Full Analysis Pack")} · ${escapeHTML(data.releaseName || "Chưa đặt baseline")}</small>
    </article>
    <article>
      <span>Nội dung</span>
      <strong>${stats.requirements} requirement · ${stats.acTotal} AC</strong>
      <small>${stats.reviews} review · ${stats.changes} change log · ${stats.traceCoverage}% trace</small>
    </article>
    <article>
      <span>Người nhận</span>
      <strong>${stats.recipients} bên nhận</strong>
      <small>${escapeHTML(getRecipients().join(", ") || "Chưa chọn")}</small>
    </article>
  `;
}

function renderRisks() {
  const risks = buildRisks();
  riskListEl.innerHTML = risks.length
    ? risks.map((item) => `
        <article class="uc9-risk">
          <strong>${escapeHTML(item.title)}</strong>
          <small>${escapeHTML(item.detail)}</small>
        </article>
      `).join("")
    : `<article class="uc9-risk is-good"><strong>Không có rủi ro nghiêm trọng</strong><small>Gói phân tích đủ nền tảng để chuyển sang review/sign-off.</small></article>`;
}

function renderSignoff() {
  const recipients = getRecipients();
  const status = form.elements.handoffStatus.value;
  signoffEl.innerHTML = recipients.length
    ? recipients.map((recipient, index) => {
        const done = status === "Baselined" || (status === "Waiting sign-off" && index < 2);
        return `
          <article class="uc9-signoff ${done ? "is-done" : ""}">
            <span>${index + 1}</span>
            <strong>${escapeHTML(recipient)}</strong>
            <small>${done ? "Đã xác nhận" : "Chờ xác nhận"}</small>
          </article>
        `;
      }).join("")
    : `<article class="uc9-risk"><strong>Chưa có người nhận</strong><small>BA cần chọn tối thiểu PO, PM, Dev hoặc QA.</small></article>`;
}

function renderSummary() {
  const score = readinessScore();
  setText("readinessHero", `${score}%`, "0%");
  setText("readinessHeroMeta", `${(getActiveSet().requirements || []).length} requirement · ${getSetPackages().length} package`, "Chọn requirement set để kiểm tra mức sẵn sàng bàn giao.");
  setText("readinessScore", `${score}%`, "0%");
  setText("readinessSummary", `${score}%`, "0%");
  setText("readinessText", readinessLabel(score), "Chưa có dữ liệu để bàn giao.");
  setText("recipientCount", `${getRecipients().length} bên nhận`, "0 bên nhận");
  setText("aiHandoffHint", aiHint(), "AI sẽ tóm tắt thiếu sót khi BA chọn requirement set.");
  renderReadiness();
  renderPreview();
  renderRisks();
  renderSignoff();
}

function syncPackageForm() {
  const handoffPackage = getActivePackage() || defaultPackage();
  setFormData(handoffPackage);
  renderSummary();
}

function syncScreen() {
  form.elements.requirementSet.value = activeSetId;
  renderSetList();
  syncPackageForm();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  setTimeout(() => toast.classList.remove("is-visible"), 2400);
}

form.elements.requirementSet.addEventListener("change", () => {
  activeSetId = form.elements.requirementSet.value;
  activePackageId = getSetPackages()[0]?.packageId || "";
  syncScreen();
});

form.addEventListener("input", renderSummary);
form.addEventListener("change", renderSummary);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const data = {
    ...getFormData(),
    requirementSet: activeSetId,
    recipients: getRecipients(),
    readinessScore: readinessScore(),
    updatedAt: new Date().toISOString()
  };
  const index = packages.findIndex((item) => item.packageId === data.packageId);
  if (index >= 0) {
    packages[index] = data;
  } else {
    packages.unshift(data);
  }

  activePackageId = data.packageId;
  savePackages();
  renderSetList();
  renderSummary();
  showToast("Đã lưu gói bàn giao.");
});

document.querySelector("#newPackage").addEventListener("click", () => {
  activePackageId = "";
  setFormData(defaultPackage());
  renderSummary();
  showToast("Đã tạo form gói bàn giao mới.");
});

fillSetSelect();
syncScreen();
