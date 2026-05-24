const SET_STORAGE_KEY = "la-ban-ba.uc6.requirement-sets";
const MAP_STORAGE_KEY = "la-ban-ba.uc5.analysis-maps";

const form = document.querySelector("#requirementForm");
const setListEl = document.querySelector("#setList");
const sourceListEl = document.querySelector("#sourceList");
const requirementListEl = document.querySelector("#requirementList");
const acceptanceListEl = document.querySelector("#acceptanceList");
const toast = document.querySelector("#requirementToast");

const setFields = ["setId", "setName", "analysisMap"];
const requirementFields = [
  "requirementId",
  "sourceId",
  "requirementCode",
  "requirementType",
  "requirementTitle",
  "requirementDescription",
  "rationale",
  "scope",
  "owner",
  "priority",
  "status",
  "version"
];

const fallbackMaps = [
  {
    mapId: "map-digital-lending-risk",
    mapName: "Phân tích quy trình duyệt khoản vay rủi ro",
    analysisScope: "Luồng đánh giá rủi ro và phê duyệt hồ sơ vay cá nhân",
    currentState: "Hồ sơ vay được kiểm tra thủ công ở nhiều điểm, rule phê duyệt chưa thống nhất và dữ liệu đối soát chưa được chuẩn hóa.",
    futureState: "Chuẩn hóa luồng kiểm tra dữ liệu, áp dụng rule rủi ro theo ngưỡng và tách rõ bước phê duyệt cấp 2.",
    steps: [
      {
        id: "step-approve-level-2",
        name: "Phê duyệt cấp 2",
        actor: "Quản lý phê duyệt",
        input: "Hồ sơ trên 500M hoặc rủi ro cao",
        output: "Quyết định phê duyệt/từ chối",
        painPoint: "Quyền override chưa rõ",
        rule: "Khoản vay trên 500M cần phê duyệt cấp 2",
        exception: "Override quyết định tự động",
        readiness: "Sẵn sàng chuyển UC6"
      }
    ],
    gaps: [
      { id: "gap-override", text: "Chưa rõ quyền override quyết định tự động.", note: "Cần SME/pháp chế xác nhận", status: "Cao" }
    ],
    risks: [
      { id: "risk-data", text: "Dữ liệu đối tác thiếu hoặc phản hồi chậm.", note: "Ảnh hưởng SLA xử lý hồ sơ", status: "Trung bình" }
    ],
    conflicts: [],
    insights: [
      { id: "insight-rule-500m", text: "Khoản vay trên 500M cần phê duyệt cấp 2.", note: "Business rule", status: "Sẵn sàng chuyển UC6" }
    ]
  }
];

const seedSets = [
  {
    setId: "rs-digital-lending",
    setName: "Requirement set duyệt khoản vay rủi ro",
    analysisMap: "map-digital-lending-risk",
    activeRequirementId: "req-rule-500m",
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
        ],
        updatedAt: new Date().toISOString()
      }
    ],
    updatedAt: new Date().toISOString()
  }
];

let maps = loadCollection(MAP_STORAGE_KEY, fallbackMaps);
let sets = loadCollection(SET_STORAGE_KEY, seedSets);
let activeSetId = sets[0]?.setId || createId("rs");
let activeRequirementId = sets[0]?.activeRequirementId || sets[0]?.requirements?.[0]?.requirementId || "";
let selectedSourceId = "";

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

function saveSets() {
  localStorage.setItem(SET_STORAGE_KEY, JSON.stringify(sets));
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
  return sets.find((item) => item.setId === activeSetId) || sets[0];
}

function getActiveRequirement() {
  const set = getActiveSet();
  return set?.requirements?.find((item) => item.requirementId === activeRequirementId) || set?.requirements?.[0];
}

function getMap(id) {
  return maps.find((item) => item.mapId === id) || maps[0] || {};
}

function getMapName(id) {
  return getMap(id).mapName || "Chưa chọn Analysis Map";
}

function fillMapSelect() {
  const select = form.elements.analysisMap;
  select.innerHTML = "";
  maps.forEach((map) => {
    const option = document.createElement("option");
    option.value = map.mapId;
    option.textContent = `${map.mapName || "Analysis Map chưa tên"} · ${(map.steps || []).length} bước`;
    select.appendChild(option);
  });
}

function getSourceItems(map) {
  const items = [];

  (map.steps || []).forEach((step) => {
    if (step.readiness === "Sẵn sàng chuyển UC6" || step.rule || step.painPoint) {
      items.push({
        id: `step:${step.id}`,
        kind: "Process step",
        title: step.name || "Bước quy trình",
        text: [step.rule, step.painPoint, step.output].filter(Boolean).join(" · "),
        sourceType: step.rule ? "RULE" : "FR",
        scope: step.actor || map.analysisScope || "",
        rationale: step.painPoint || map.futureState || "",
        raw: step
      });
    }
  });

  (map.insights || []).forEach((item) => {
    items.push({
      id: `insight:${item.id}`,
      kind: item.note || "Insight",
      title: item.text || "Insight",
      text: item.text || "",
      sourceType: item.note === "Business rule" ? "RULE" : "BR",
      scope: map.analysisScope || "",
      rationale: item.note || map.futureState || "",
      raw: item
    });
  });

  (map.gaps || []).forEach((item) => {
    items.push({
      id: `gap:${item.id}`,
      kind: "Gap",
      title: item.text || "Gap",
      text: [item.text, item.note].filter(Boolean).join(" · "),
      sourceType: "FR",
      scope: map.analysisScope || "",
      rationale: "Giải quyết gap được phát hiện trong phân tích nghiệp vụ.",
      raw: item
    });
  });

  (map.risks || []).forEach((item) => {
    items.push({
      id: `risk:${item.id}`,
      kind: "Risk / constraint",
      title: item.text || "Risk",
      text: [item.text, item.note].filter(Boolean).join(" · "),
      sourceType: "NFR",
      scope: map.analysisScope || "",
      rationale: "Giảm rủi ro hoặc đáp ứng ràng buộc nghiệp vụ.",
      raw: item
    });
  });

  (map.conflicts || []).forEach((item) => {
    items.push({
      id: `conflict:${item.id}`,
      kind: "Conflict",
      title: item.text || "Conflict",
      text: [item.text, item.note].filter(Boolean).join(" · "),
      sourceType: "FR",
      scope: map.analysisScope || "",
      rationale: "Conflict cần được xử lý hoặc xác nhận trước khi requirement được baseline.",
      raw: item
    });
  });

  return items;
}

function getSelectedSource() {
  return getSourceItems(getMap(form.elements.analysisMap.value)).find((item) => item.id === selectedSourceId);
}

function getSetFormData() {
  return setFields.reduce((data, field) => {
    data[field] = form.elements[field].value.trim();
    return data;
  }, {});
}

function setSetFormData(data) {
  setFields.forEach((field) => {
    form.elements[field].value = data?.[field] || "";
  });
}

function syncActiveSetMeta() {
  const set = getActiveSet();
  if (!set) return;
  Object.assign(set, getSetFormData(), {
    activeRequirementId,
    updatedAt: new Date().toISOString()
  });
}

function getAcceptanceCriteria() {
  return [...acceptanceListEl.querySelectorAll(".uc6-ac-item")]
    .map((item) => item.querySelector("textarea").value.trim())
    .filter(Boolean);
}

function getRequirementFormData() {
  const data = requirementFields.reduce((item, field) => {
    item[field] = form.elements[field].value.trim();
    return item;
  }, {});
  data.acceptanceCriteria = getAcceptanceCriteria();
  data.updatedAt = new Date().toISOString();
  return data;
}

function setRequirementFormData(data = {}) {
  requirementFields.forEach((field) => {
    form.elements[field].value = data?.[field] || "";
  });
  renderAcceptanceCriteria(data.acceptanceCriteria || []);
}

function createBlankRequirement(source = undefined) {
  const id = createId("req");
  const type = source?.sourceType || "FR";
  return {
    requirementId: id,
    sourceId: source?.id || "",
    requirementCode: `${type}-${String(Date.now()).slice(-3)}`,
    requirementType: type,
    requirementTitle: source?.title || "",
    requirementDescription: source ? buildDescription(type, source) : "",
    rationale: source?.rationale || "",
    scope: source?.scope || "",
    owner: "",
    priority: "Must",
    status: source ? "Draft" : "Need Clarification",
    version: "v0.1",
    acceptanceCriteria: source ? buildAcceptanceCriteria(type, source) : [],
    updatedAt: new Date().toISOString()
  };
}

function buildDescription(type, source) {
  if (type === "RULE") return `Nghiệp vụ cần áp dụng rule: ${source.text || source.title}.`;
  if (type === "NFR") return `Giải pháp cần đáp ứng ràng buộc/rủi ro: ${source.text || source.title}.`;
  if (type === "US") return `Là người dùng liên quan, tôi muốn ${source.title} để xử lý đúng nhu cầu nghiệp vụ.`;
  if (type === "BR") return `Doanh nghiệp cần ${source.title} nhằm đạt được mục tiêu nghiệp vụ đã phân tích.`;
  return `Hệ thống/quy trình cần hỗ trợ: ${source.text || source.title}.`;
}

function buildAcceptanceCriteria(type, source) {
  if (type === "RULE") {
    return [
      "Rule được áp dụng đúng khi điều kiện nghiệp vụ xảy ra.",
      "Trường hợp ngoại lệ được ghi nhận và xử lý theo quy trình đã xác nhận."
    ];
  }
  if (type === "NFR") {
    return [
      "Tiêu chí đo lường ràng buộc được xác định rõ.",
      "Kết quả kiểm tra chứng minh ràng buộc được đáp ứng."
    ];
  }
  return [
    "Người dùng/actor thực hiện được luồng nghiệp vụ liên quan.",
    "Kết quả đầu ra đúng với source item đã phân tích ở UC5."
  ];
}

function saveEditorIntoActiveSet() {
  const set = getActiveSet();
  if (!set || !form.elements.requirementId.value) return;

  syncActiveSetMeta();
  const data = getRequirementFormData();
  const index = set.requirements.findIndex((item) => item.requirementId === data.requirementId);
  if (index >= 0) {
    set.requirements[index] = data;
  } else {
    set.requirements.unshift(data);
  }
  set.activeRequirementId = data.requirementId;
  set.updatedAt = new Date().toISOString();
  activeRequirementId = data.requirementId;
}

function renderSetList() {
  setListEl.innerHTML = "";
  sets.forEach((set) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `uc6-record ${set.setId === activeSetId ? "is-active" : ""}`;
    button.innerHTML = `
      <span>${escapeHTML(getMapName(set.analysisMap))}</span>
      <strong>${escapeHTML(set.setName || "Bộ yêu cầu chưa tên")}</strong>
      <small>${set.requirements?.length || 0} yêu cầu</small>
    `;
    button.addEventListener("click", () => {
      saveEditorIntoActiveSet();
      activeSetId = set.setId;
      activeRequirementId = set.activeRequirementId || set.requirements?.[0]?.requirementId || "";
      syncScreen(set);
    });
    setListEl.appendChild(button);
  });
}

function renderSources() {
  const map = getMap(form.elements.analysisMap.value);
  const sources = getSourceItems(map);
  if (selectedSourceId && !sources.some((source) => source.id === selectedSourceId)) {
    selectedSourceId = "";
    form.elements.sourceId.value = "";
  }
  sourceListEl.innerHTML = "";
  setText("sourceCount", `${sources.length} source item`, "0 source item");
  setText("sourceMapName", map.mapName, "Chưa chọn bản đồ phân tích");
  setText("sourceMapMeta", `${map.analysisScope || "Chưa rõ phạm vi"} · ${sources.length} source có thể chuyển yêu cầu`, "Chưa có dữ liệu.");

  sources.forEach((source) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `uc6-source-item ${source.id === selectedSourceId ? "is-active" : ""}`;
    button.innerHTML = `
      <span>${escapeHTML(source.kind)}</span>
      <strong>${escapeHTML(source.title)}</strong>
      <small>${escapeHTML(source.text || "Chưa có mô tả")}</small>
    `;
    button.addEventListener("click", () => {
      selectedSourceId = source.id;
      form.elements.sourceId.value = source.id;
      renderSources();
      renderPreview();
    });
    sourceListEl.appendChild(button);
  });
  renderSelectedSource();
}

function renderSelectedSource() {
  const source = getSelectedSource();
  setText("selectedSourceTitle", source?.title, "Chưa chọn source");
  setText(
    "selectedSourceDetail",
    source ? `${source.kind} · ${source.text || "Không có mô tả chi tiết"}` : "Requirement nên có nguồn rõ từ UC5 trước khi đưa sang review.",
    "Requirement nên có nguồn rõ từ UC5 trước khi đưa sang review."
  );
}

function renderRequirementList() {
  const set = getActiveSet();
  const requirements = set?.requirements || [];
  requirementListEl.innerHTML = "";
  setText("requirementCount", `${requirements.length} yêu cầu`, "0 yêu cầu");

  requirements.forEach((requirement) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `uc6-requirement-item ${requirement.requirementId === activeRequirementId ? "is-active" : ""}`;
    button.innerHTML = `
      <span>${escapeHTML(requirement.requirementCode || requirement.requirementType || "REQ")}</span>
      <strong>${escapeHTML(requirement.requirementTitle || "Yêu cầu chưa tên")}</strong>
      <small>${escapeHTML(requirement.status || "Draft")} · ${requirement.acceptanceCriteria?.length || 0} AC</small>
    `;
    button.addEventListener("click", () => {
      saveEditorIntoActiveSet();
      activeRequirementId = requirement.requirementId;
      set.activeRequirementId = requirement.requirementId;
      setRequirementFormData(requirement);
      renderRequirementList();
      renderPreview();
    });
    requirementListEl.appendChild(button);
  });
  renderSetList();
}

function renderAcceptanceCriteria(items = []) {
  acceptanceListEl.innerHTML = "";
  items.forEach((text) => renderAcceptanceCriterion(text));
  setText("acCount", `${items.length} acceptance criteria`, "0 acceptance criteria");
}

function renderAcceptanceCriterion(text = "") {
  const card = document.createElement("article");
  card.className = "uc6-ac-item";
  card.innerHTML = `
    <textarea rows="2" placeholder="Điều kiện chấp nhận có thể kiểm tra được">${escapeHTML(text)}</textarea>
    <button class="question-remove" type="button" aria-label="Xóa acceptance criteria">×</button>
  `;
  card.querySelector(".question-remove").addEventListener("click", () => {
    card.remove();
    renderPreview();
  });
  card.addEventListener("input", renderPreview);
  acceptanceListEl.appendChild(card);
  setText("acCount", `${getAcceptanceCriteria().length} acceptance criteria`, "0 acceptance criteria");
}

function calculateReadiness(requirement) {
  const statusIsValid = !(
    requirement.sourceId?.startsWith("conflict:") &&
    ["Approved", "Baseline"].includes(requirement.status)
  ) && (requirement.status !== "Ready Review" || requirement.acceptanceCriteria.length >= 2);
  const checks = [
    Boolean(requirement.sourceId),
    Boolean(requirement.requirementTitle && requirement.requirementDescription),
    Boolean(requirement.requirementType),
    requirement.acceptanceCriteria.length >= 2,
    Boolean(requirement.owner),
    statusIsValid
  ];
  return {
    checks,
    score: Math.round((checks.filter(Boolean).length / checks.length) * 100)
  };
}

function markCheck(id, done) {
  document.querySelector(`#${id}`).classList.toggle("is-done", done);
}

function getRiskText(requirement) {
  if (!requirement.sourceId) return "Requirement chưa có source trace từ UC5.";
  if (requirement.sourceId.startsWith("conflict:") && ["Approved", "Baseline"].includes(requirement.status)) {
    return "Requirement sinh từ conflict không nên Approved/Baseline trước khi conflict được xử lý.";
  }
  if (!requirement.requirementDescription) return "Requirement chưa có mô tả đủ rõ.";
  if (requirement.acceptanceCriteria.length < 2) return "Requirement thiếu acceptance criteria để PO/QA review.";
  if (!requirement.owner) return "Requirement chưa có owner hoặc reviewer.";
  if (requirement.status === "Baseline" && requirement.acceptanceCriteria.length < 2) return "Không nên baseline requirement khi thiếu AC.";
  return "Requirement đủ nền tảng để chuyển sang UC7 kiểm tra chất lượng và ưu tiên.";
}

function renderLens(set) {
  const requirements = set?.requirements || [];
  const types = ["BR", "FR", "NFR", "RULE", "US"];
  const rows = [
    ["Tổng yêu cầu", requirements.length],
    ...types.map((type) => [type, requirements.filter((item) => item.requirementType === type).length]),
    ["Thiếu source", requirements.filter((item) => !item.sourceId).length],
    ["Thiếu AC", requirements.filter((item) => (item.acceptanceCriteria || []).length < 2).length]
  ];

  document.querySelector("#requirementLens").innerHTML = rows
    .map(([label, count]) => `<span>${escapeHTML(label)}<strong>${count}</strong></span>`)
    .join("");
}

function renderPreview() {
  syncActiveSetMeta();
  const set = getActiveSet();
  const requirement = getRequirementFormData();
  const readiness = calculateReadiness(requirement);
  const meta = [
    requirement.requirementCode || requirement.requirementType,
    requirement.status,
    requirement.priority
  ].filter(Boolean).join(" · ");

  setText("activeSetName", form.elements.setName.value, "Chưa chọn");
  setText("activeSetMeta", `${getMapName(form.elements.analysisMap.value)} · ${(set?.requirements || []).length} yêu cầu`, "Tạo mới hoặc chọn một bộ yêu cầu bên trái.");
  setText("previewRequirementName", requirement.requirementTitle, "Chưa có yêu cầu");
  setText("previewRequirementMeta", meta, "Chưa có dữ liệu.");
  setText("requirementReadinessScore", `${readiness.score}%`, "0%");
  setText(
    "requirementReadinessText",
    readiness.score >= 80 ? "Đủ nền tảng để đưa sang UC7 review chất lượng." : "Cần bổ sung source, mô tả, AC hoặc owner.",
    "Requirement chưa đủ điều kiện review."
  );
  setText("requirementRisk", getRiskText(requirement), "Chưa có cảnh báo.");

  markCheck("checkSource", readiness.checks[0]);
  markCheck("checkTitle", readiness.checks[1]);
  markCheck("checkType", readiness.checks[2]);
  markCheck("checkAC", readiness.checks[3]);
  markCheck("checkOwner", readiness.checks[4]);
  markCheck("checkStatus", readiness.checks[5]);
  renderLens(set);
  setText("acCount", `${requirement.acceptanceCriteria.length} acceptance criteria`, "0 acceptance criteria");
  renderSelectedSource();
}

function syncScreen(set = getActiveSet()) {
  setSetFormData(set || {});
  activeRequirementId = set?.activeRequirementId || set?.requirements?.[0]?.requirementId || "";
  const requirement = set?.requirements?.find((item) => item.requirementId === activeRequirementId) || set?.requirements?.[0] || createBlankRequirement();
  activeRequirementId = requirement.requirementId;
  selectedSourceId = requirement.sourceId || "";
  setRequirementFormData(requirement);
  renderSources();
  renderRequirementList();
  renderSetList();
  renderPreview();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  setTimeout(() => toast.classList.remove("is-visible"), 2400);
}

document.querySelector("#newSet").addEventListener("click", () => {
  saveEditorIntoActiveSet();
  const map = maps[0] || {};
  const requirement = createBlankRequirement();
  const set = {
    setId: createId("rs"),
    setName: "",
    analysisMap: map.mapId || "",
    activeRequirementId: requirement.requirementId,
    requirements: [requirement],
    updatedAt: ""
  };
  sets.unshift(set);
  activeSetId = set.setId;
  activeRequirementId = requirement.requirementId;
  syncScreen(set);
  showToast("Đã tạo bộ yêu cầu mới.");
});

form.elements.analysisMap.addEventListener("change", () => {
  selectedSourceId = "";
  form.elements.sourceId.value = "";
  renderSources();
  renderPreview();
});

document.querySelector("#draftRequirement").addEventListener("click", () => {
  const source = getSelectedSource();
  if (!source) {
    showToast("Hãy chọn một source item từ UC5 trước.");
    return;
  }
  const draft = createBlankRequirement(source);
  setRequirementFormData({
    ...getRequirementFormData(),
    ...draft,
    requirementId: form.elements.requirementId.value || draft.requirementId
  });
  renderPreview();
  showToast("Đã tạo nháp requirement từ source UC5.");
});

document.querySelector("#newRequirement").addEventListener("click", () => {
  saveEditorIntoActiveSet();
  const source = getSelectedSource();
  const requirement = createBlankRequirement(source);
  const set = getActiveSet();
  set.requirements.unshift(requirement);
  set.activeRequirementId = requirement.requirementId;
  activeRequirementId = requirement.requirementId;
  setRequirementFormData(requirement);
  renderRequirementList();
  renderPreview();
  showToast("Đã thêm yêu cầu mới.");
});

document.querySelector("#deleteRequirement").addEventListener("click", () => {
  const set = getActiveSet();
  if (!set || set.requirements.length <= 1) {
    showToast("Cần giữ ít nhất một yêu cầu trong bộ yêu cầu.");
    return;
  }

  set.requirements = set.requirements.filter((item) => item.requirementId !== activeRequirementId);
  const nextRequirement = set.requirements[0];
  activeRequirementId = nextRequirement.requirementId;
  set.activeRequirementId = activeRequirementId;
  setRequirementFormData(nextRequirement);
  renderRequirementList();
  renderPreview();
  showToast("Đã xóa yêu cầu hiện tại.");
});

document.querySelector("#addAcceptanceCriterion").addEventListener("click", () => {
  renderAcceptanceCriterion("");
  renderPreview();
});

form.addEventListener("input", renderPreview);
form.addEventListener("change", renderPreview);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  saveEditorIntoActiveSet();
  const set = getActiveSet();
  Object.assign(set, getSetFormData(), {
    activeRequirementId,
    updatedAt: new Date().toISOString()
  });

  saveSets();
  syncScreen(set);
  showToast("Đã lưu bộ yêu cầu.");
});

document.querySelector("#discardRequirementChanges").addEventListener("click", () => {
  syncScreen(getActiveSet());
  showToast("Đã hủy thay đổi chưa lưu.");
});

fillMapSelect();
syncScreen();
