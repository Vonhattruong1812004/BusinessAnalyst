const MAP_STORAGE_KEY = "la-ban-ba.uc5.analysis-maps";
const RECORD_STORAGE_KEY = "la-ban-ba.uc4.elicitation-records";

const form = document.querySelector("#analysisForm");
const mapListEl = document.querySelector("#mapList");
const stepListEl = document.querySelector("#processStepList");
const gapListEl = document.querySelector("#gapList");
const riskListEl = document.querySelector("#riskList");
const conflictListEl = document.querySelector("#conflictList");
const insightReadyListEl = document.querySelector("#insightReadyList");
const toast = document.querySelector("#analysisToast");

const fields = [
  "mapId",
  "mapName",
  "elicitationRecord",
  "currentState",
  "futureState",
  "analysisScope",
  "analysisStatus"
];

const fallbackRecords = [
  {
    recordId: "er-risk-workshop",
    recordName: "Workshop làm rõ rule rủi ro",
    sessionType: "Workshop",
    stakeholderName: "Chị An - SME Rủi ro",
    sessionObjective: "Xác định business rule",
    sessionContext: "Buổi workshop tập trung vào ngưỡng phê duyệt, ngoại lệ và trách nhiệm khi khoản vay rơi vào vùng rủi ro cao.",
    answers: [
      {
        id: "ans-rule",
        question: "Điều kiện nào khiến khoản vay bắt buộc phải chuyển sang phê duyệt cấp 2?",
        answer: "Khoản vay trên 500M hoặc điểm rủi ro cao phải chuyển cấp 2 phê duyệt.",
        insightType: "Business rule",
        clarity: "Rõ"
      },
      {
        id: "ans-data",
        question: "Những dữ liệu nào bắt buộc phải có trước khi áp dụng rule phê duyệt?",
        answer: "Cần thu nhập, lịch sử tín dụng, phân khúc khách hàng và dữ liệu đối soát từ đối tác.",
        insightType: "Dữ liệu",
        clarity: "Cần làm rõ"
      },
      {
        id: "ans-exception",
        question: "Trường hợp nào được phép override quyết định tự động?",
        answer: "SME cần kiểm tra lại với pháp chế trước khi xác nhận quyền override.",
        insightType: "Ngoại lệ",
        clarity: "Cần làm rõ"
      }
    ],
    decisions: [
      { text: "Khoản vay trên 500M cần phê duyệt cấp 2.", owner: "Chị An", status: "Đã xác nhận" }
    ],
    openQuestions: [
      { text: "Ai có quyền override quyết định tự động?", owner: "SME rủi ro", status: "Đang chờ" }
    ],
    actionItems: []
  }
];

const seedMaps = [
  {
    mapId: "map-digital-lending-risk",
    mapName: "Phân tích quy trình duyệt khoản vay rủi ro",
    elicitationRecord: "er-risk-workshop",
    currentState: "Hồ sơ vay được kiểm tra thủ công ở nhiều điểm, rule phê duyệt chưa thống nhất và dữ liệu đối soát chưa được chuẩn hóa.",
    futureState: "Chuẩn hóa luồng kiểm tra dữ liệu, áp dụng rule rủi ro theo ngưỡng và tách rõ bước phê duyệt cấp 2.",
    analysisScope: "Luồng đánh giá rủi ro và phê duyệt hồ sơ vay cá nhân",
    analysisStatus: "Đang phân tích",
    steps: [
      createStep("Tiếp nhận hồ sơ vay", "Nhân viên tín dụng", "Thông tin khách hàng, hồ sơ vay", "Hồ sơ đủ điều kiện kiểm tra", "Thiếu dữ liệu đầu vào làm chậm xử lý", "Hồ sơ phải có thông tin định danh và thu nhập", "Hồ sơ thiếu giấy tờ", "CRM, dữ liệu khách hàng", "Sẵn sàng chuyển UC6"),
      createStep("Đối soát dữ liệu rủi ro", "SME rủi ro", "Lịch sử tín dụng, dữ liệu đối tác", "Điểm rủi ro sơ bộ", "Dữ liệu đối tác có thể thiếu hoặc trễ", "Điểm rủi ro cao cần kiểm tra bổ sung", "Dữ liệu đối tác không phản hồi", "Báo cáo tín dụng, dữ liệu đối tác", "Cần làm rõ"),
      createStep("Phê duyệt cấp 2", "Quản lý phê duyệt", "Hồ sơ trên 500M hoặc rủi ro cao", "Quyết định phê duyệt/từ chối", "Quyền override chưa rõ", "Khoản vay trên 500M cần phê duyệt cấp 2", "Override quyết định tự động", "Decision log, audit trail", "Cần làm rõ")
    ],
    gaps: [
      createMiniItem("Chưa rõ quyền override quyết định tự động.", "Cần SME/pháp chế xác nhận", "Cao")
    ],
    risks: [
      createMiniItem("Dữ liệu đối tác thiếu hoặc phản hồi chậm.", "Ảnh hưởng SLA xử lý hồ sơ", "Trung bình")
    ],
    conflicts: [],
    insights: [
      createMiniItem("Khoản vay trên 500M cần phê duyệt cấp 2.", "Business rule", "Sẵn sàng chuyển UC6")
    ],
    updatedAt: new Date().toISOString()
  }
];

let records = loadCollection(RECORD_STORAGE_KEY, fallbackRecords);
let maps = loadCollection(MAP_STORAGE_KEY, seedMaps);
let activeId = maps[0]?.mapId || createId("map");

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function createStep(name = "", actor = "", input = "", output = "", painPoint = "", rule = "", exception = "", dataTouchpoint = "", readiness = "Cần làm rõ") {
  return {
    id: createId("step"),
    name,
    actor,
    input,
    output,
    painPoint,
    rule,
    exception,
    dataTouchpoint,
    readiness
  };
}

function createMiniItem(text = "", note = "", status = "") {
  return {
    id: createId("item"),
    text,
    note,
    status
  };
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

function saveMaps() {
  localStorage.setItem(MAP_STORAGE_KEY, JSON.stringify(maps));
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

function getActiveMap() {
  return maps.find((item) => item.mapId === activeId) || maps[0];
}

function getRecord(id) {
  return records.find((item) => item.recordId === id) || records[0] || {};
}

function getRecordName(id) {
  return getRecord(id).recordName || "Chưa chọn bản ghi UC4";
}

function fillRecordSelect() {
  const select = form.elements.elicitationRecord;
  select.innerHTML = "";
  records.forEach((record) => {
    const option = document.createElement("option");
    option.value = record.recordId;
    option.textContent = `${record.recordName || "Bản ghi chưa tên"} · ${(record.answers || []).length} ghi nhận`;
    select.appendChild(option);
  });
}

function getFormData() {
  return fields.reduce((data, field) => {
    data[field] = form.elements[field].value.trim();
    return data;
  }, {});
}

function setFormData(data) {
  fields.forEach((field) => {
    form.elements[field].value = data?.[field] || "";
  });
}

function getCurrentSteps() {
  return [...stepListEl.querySelectorAll(".uc5-step-card")].map((card) => ({
    id: card.dataset.id || createId("step"),
    name: card.querySelector("[data-field='name']").value.trim(),
    actor: card.querySelector("[data-field='actor']").value.trim(),
    input: card.querySelector("[data-field='input']").value.trim(),
    output: card.querySelector("[data-field='output']").value.trim(),
    painPoint: card.querySelector("[data-field='painPoint']").value.trim(),
    rule: card.querySelector("[data-field='rule']").value.trim(),
    exception: card.querySelector("[data-field='exception']").value.trim(),
    dataTouchpoint: card.querySelector("[data-field='dataTouchpoint']").value.trim(),
    readiness: card.querySelector("[data-field='readiness']").value
  })).filter((step) => step.name || step.actor || step.input || step.output);
}

function getMiniItems(container) {
  return [...container.querySelectorAll(".uc5-mini-item")].map((item) => ({
    id: item.dataset.id || createId("item"),
    text: item.querySelector("[data-field='text']").value.trim(),
    note: item.querySelector("[data-field='note']").value.trim(),
    status: item.querySelector("[data-field='status']").value.trim()
  })).filter((item) => item.text || item.note || item.status);
}

function getCurrentDetails() {
  return {
    gaps: getMiniItems(gapListEl),
    risks: getMiniItems(riskListEl),
    conflicts: getMiniItems(conflictListEl),
    insights: getMiniItems(insightReadyListEl)
  };
}

function calculateReadiness(data, steps, details) {
  const completeSteps = steps.filter((step) => step.actor && step.input && step.output).length;
  const checks = [
    Boolean(data.elicitationRecord),
    Boolean(data.currentState && data.futureState),
    steps.length >= 3,
    steps.length > 0 && completeSteps / steps.length >= 0.7,
    details.gaps.length + details.risks.length + details.conflicts.length > 0,
    details.insights.some((item) => item.status === "Sẵn sàng chuyển UC6") || steps.some((step) => step.readiness === "Sẵn sàng chuyển UC6")
  ];

  return {
    checks,
    score: Math.round((checks.filter(Boolean).length / checks.length) * 100)
  };
}

function markCheck(id, done) {
  document.querySelector(`#${id}`).classList.toggle("is-done", done);
}

function getRiskText(data, steps, details) {
  if (!data.elicitationRecord) return "Chưa chọn bản ghi UC4 nên bản đồ phân tích thiếu nguồn.";
  if (!data.currentState || !data.futureState) return "Cần mô tả cả current state và future direction trước khi chuyển sang UC6.";
  if (steps.length < 3) return "Process map còn ít bước, dễ bỏ sót actor, input/output hoặc exception.";
  if (details.conflicts.length > 0) return "Có conflict cần xử lý hoặc xác nhận nguồn trước khi đặc tả yêu cầu.";
  if (details.insights.length === 0) return "Chưa có insight nào được đánh dấu để chuyển sang UC6.";
  return "Bản đồ phân tích đã đủ nền tảng để chuyển nhu cầu thành yêu cầu.";
}

function renderMapList() {
  mapListEl.innerHTML = "";
  maps.forEach((map) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `uc5-record ${map.mapId === activeId ? "is-active" : ""}`;
    button.innerHTML = `
      <span>${escapeHTML(map.analysisStatus || "Đang phân tích")}</span>
      <strong>${escapeHTML(map.mapName || "Chưa đặt tên")}</strong>
      <small>${escapeHTML(getRecordName(map.elicitationRecord))} · ${map.steps?.length || 0} bước</small>
    `;
    button.addEventListener("click", () => {
      activeId = map.mapId;
      syncScreen(map);
    });
    mapListEl.appendChild(button);
  });
}

function renderStep(step) {
  const card = document.createElement("article");
  card.className = "uc5-step-card";
  card.dataset.id = step.id || createId("step");
  const readinessOptions = ["Cần làm rõ", "Sẵn sàng chuyển UC6", "Không chuyển"].map((item) => `<option ${item === step.readiness ? "selected" : ""}>${escapeHTML(item)}</option>`).join("");

  card.innerHTML = `
    <div class="uc5-step-head">
      <input data-field="name" type="text" value="${escapeHTML(step.name || "")}" placeholder="Tên bước quy trình" />
      <select data-field="readiness" aria-label="Trạng thái insight">${readinessOptions}</select>
      <button class="question-remove" type="button" aria-label="Xóa bước">×</button>
    </div>
    <div class="uc5-step-grid">
      <label><span>Actor</span><input data-field="actor" type="text" value="${escapeHTML(step.actor || "")}" /></label>
      <label><span>Input</span><textarea data-field="input" rows="2">${escapeHTML(step.input || "")}</textarea></label>
      <label><span>Output</span><textarea data-field="output" rows="2">${escapeHTML(step.output || "")}</textarea></label>
      <label><span>Pain point</span><textarea data-field="painPoint" rows="2">${escapeHTML(step.painPoint || "")}</textarea></label>
      <label><span>Business rule</span><textarea data-field="rule" rows="2">${escapeHTML(step.rule || "")}</textarea></label>
      <label><span>Exception</span><textarea data-field="exception" rows="2">${escapeHTML(step.exception || "")}</textarea></label>
      <label class="span-2"><span>Data touchpoint</span><input data-field="dataTouchpoint" type="text" value="${escapeHTML(step.dataTouchpoint || "")}" /></label>
    </div>
  `;

  card.querySelector(".question-remove").addEventListener("click", () => {
    card.remove();
    renderPreview();
  });
  card.addEventListener("input", renderPreview);
  card.addEventListener("change", renderPreview);
  stepListEl.appendChild(card);
}

function renderSteps(steps = []) {
  stepListEl.innerHTML = "";
  steps.forEach(renderStep);
}

function renderMiniItem(container, item = createMiniItem(), labels = {}) {
  const card = document.createElement("article");
  card.className = "uc5-mini-item";
  card.dataset.id = item.id || createId("item");
  card.innerHTML = `
    <label>
      <span>${escapeHTML(labels.text || "Nội dung")}</span>
      <textarea data-field="text" rows="2">${escapeHTML(item.text || "")}</textarea>
    </label>
    <div class="uc5-mini-row">
      <label>
        <span>${escapeHTML(labels.note || "Ghi chú")}</span>
        <input data-field="note" type="text" value="${escapeHTML(item.note || "")}" />
      </label>
      <label>
        <span>${escapeHTML(labels.status || "Trạng thái")}</span>
        <input data-field="status" type="text" value="${escapeHTML(item.status || "")}" />
      </label>
      <button class="question-remove" type="button" aria-label="Xóa mục">×</button>
    </div>
  `;
  card.querySelector(".question-remove").addEventListener("click", () => {
    card.remove();
    renderPreview();
  });
  card.addEventListener("input", renderPreview);
  container.appendChild(card);
}

function renderMiniItems(container, items, labels) {
  container.innerHTML = "";
  items.forEach((item) => renderMiniItem(container, item, labels));
}

function applyRecordContext(record) {
  setText("sourceRecordName", record.recordName, "Chưa chọn bản ghi");
  const answered = (record.answers || []).filter((item) => item.answer).length;
  setText(
    "sourceRecordMeta",
    `${record.sessionType || "Buổi khai thác"} · ${record.stakeholderName || "Chưa rõ stakeholder"} · ${answered}/${(record.answers || []).length} ghi nhận có câu trả lời`,
    "Chưa có dữ liệu."
  );
}

function buildDraftFromRecord(record) {
  const answers = record.answers || [];
  const rule = answers.find((item) => item.insightType === "Business rule")?.answer || "";
  const data = answers.find((item) => item.insightType === "Dữ liệu")?.answer || "";
  const pain = answers.find((item) => item.insightType === "Pain point")?.answer || "";
  const exception = answers.find((item) => item.insightType === "Ngoại lệ")?.answer || "";
  const conflictAnswers = answers.filter((item) => item.clarity === "Mâu thuẫn");
  const openItems = record.openQuestions || [];

  return {
    currentState: record.sessionContext || "Thông tin hiện tại được tổng hợp từ bản ghi khai thác UC4.",
    futureState: "Chuẩn hóa luồng nghiệp vụ, làm rõ rule, exception và trách nhiệm để chuyển thành yêu cầu ở UC6.",
    steps: [
      createStep("Tiếp nhận thông tin / hồ sơ", record.stakeholderName || "Stakeholder", data || "Thông tin nghiệp vụ đầu vào", "Thông tin đủ để kiểm tra", pain, rule, "", data, "Cần làm rõ"),
      createStep("Phân loại và kiểm tra rule", "Business Analyst / SME", "Thông tin đã ghi nhận", "Rule, pain point, exception được phân loại", pain, rule, exception, data, rule ? "Sẵn sàng chuyển UC6" : "Cần làm rõ"),
      createStep("Xác nhận điểm chưa rõ", "BA và stakeholder", openItems.map((item) => item.text).join("; "), "Danh sách gap, action item, decision cần xác nhận", "", "", exception, "", "Cần làm rõ")
    ],
    gaps: openItems.map((item) => createMiniItem(item.text, item.owner || "Nguồn cần trả lời", item.status || "Đang chờ")),
    risks: answers.filter((item) => item.insightType === "Rủi ro" || item.insightType === "Ràng buộc").map((item) => createMiniItem(item.answer, item.question, item.clarity)),
    conflicts: conflictAnswers.map((item) => createMiniItem(item.answer, item.question, "Cần xử lý")),
    insights: answers.filter((item) => item.clarity === "Rõ" && item.answer).map((item) => createMiniItem(item.answer, item.insightType, "Sẵn sàng chuyển UC6"))
  };
}

function renderProcessLens(steps, details) {
  const ready = steps.filter((step) => step.readiness === "Sẵn sàng chuyển UC6").length;
  const lens = [
    ["Bước quy trình", steps.length],
    ["Bước đủ actor/input/output", steps.filter((step) => step.actor && step.input && step.output).length],
    ["Rule", steps.filter((step) => step.rule).length],
    ["Exception", steps.filter((step) => step.exception).length],
    ["Gap/Risk/Conflict", details.gaps.length + details.risks.length + details.conflicts.length],
    ["Sẵn sàng UC6", ready + details.insights.filter((item) => item.status === "Sẵn sàng chuyển UC6").length]
  ];
  document.querySelector("#processLens").innerHTML = lens
    .map(([label, count]) => `<span>${escapeHTML(label)}<strong>${count}</strong></span>`)
    .join("");
}

function renderPreview() {
  const data = getFormData();
  const steps = getCurrentSteps();
  const details = getCurrentDetails();
  const readiness = calculateReadiness(data, steps, details);
  const meta = [
    getRecordName(data.elicitationRecord),
    data.analysisScope,
    data.analysisStatus
  ].filter(Boolean).join(" · ");

  setText("activeMapName", data.mapName, "Chưa chọn");
  setText("activeMapMeta", meta, "Tạo mới hoặc chọn một bản đồ bên trái.");
  setText("previewMapName", data.mapName, "Chưa đặt tên");
  setText("previewMapMeta", meta, "Chưa có dữ liệu.");
  setText("stepCount", `${steps.length} bước quy trình`, "0 bước quy trình");
  setText("analysisReadinessScore", `${readiness.score}%`, "0%");
  setText(
    "analysisReadinessText",
    readiness.score >= 80 ? "Đủ nền tảng để chuyển sang UC6." : "Cần bổ sung quy trình, gap/risk hoặc insight sẵn sàng.",
    "Chưa đủ nền tảng để chuyển sang UC6."
  );
  setText("analysisRisk", getRiskText(data, steps, details), "Chưa có cảnh báo.");

  markCheck("checkRecord", readiness.checks[0]);
  markCheck("checkState", readiness.checks[1]);
  markCheck("checkSteps", readiness.checks[2]);
  markCheck("checkStepDetail", readiness.checks[3]);
  markCheck("checkGapRisk", readiness.checks[4]);
  markCheck("checkReadyInsight", readiness.checks[5]);
  renderProcessLens(steps, details);
}

function syncScreen(map = getActiveMap()) {
  setFormData(map || {});
  renderSteps(map?.steps || []);
  renderMiniItems(gapListEl, map?.gaps || [], { text: "Gap", note: "Tác động / nguồn", status: "Mức ưu tiên" });
  renderMiniItems(riskListEl, map?.risks || [], { text: "Risk / constraint", note: "Ảnh hưởng", status: "Mức độ" });
  renderMiniItems(conflictListEl, map?.conflicts || [], { text: "Conflict", note: "Nguồn phát sinh", status: "Trạng thái" });
  renderMiniItems(insightReadyListEl, map?.insights || [], { text: "Insight", note: "Loại", status: "Trạng thái" });
  applyRecordContext(getRecord(map?.elicitationRecord));
  renderMapList();
  renderPreview();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  setTimeout(() => toast.classList.remove("is-visible"), 2400);
}

document.querySelector("#newMap").addEventListener("click", () => {
  const record = records[0] || {};
  const map = {
    mapId: createId("map"),
    mapName: "",
    elicitationRecord: record.recordId || "",
    currentState: "",
    futureState: "",
    analysisScope: record.sessionObjective || "",
    analysisStatus: "Đang phân tích",
    steps: [],
    gaps: [],
    risks: [],
    conflicts: [],
    insights: [],
    updatedAt: ""
  };
  maps.unshift(map);
  activeId = map.mapId;
  syncScreen(map);
  showToast("Đã tạo bản đồ phân tích mới.");
});

form.elements.elicitationRecord.addEventListener("change", () => {
  applyRecordContext(getRecord(form.elements.elicitationRecord.value));
  renderPreview();
});

document.querySelector("#draftFromRecord").addEventListener("click", () => {
  const record = getRecord(form.elements.elicitationRecord.value);
  const draft = buildDraftFromRecord(record);
  if (!form.elements.currentState.value) form.elements.currentState.value = draft.currentState;
  if (!form.elements.futureState.value) form.elements.futureState.value = draft.futureState;
  renderSteps(draft.steps);
  renderMiniItems(gapListEl, draft.gaps, { text: "Gap", note: "Tác động / nguồn", status: "Mức ưu tiên" });
  renderMiniItems(riskListEl, draft.risks, { text: "Risk / constraint", note: "Ảnh hưởng", status: "Mức độ" });
  renderMiniItems(conflictListEl, draft.conflicts, { text: "Conflict", note: "Nguồn phát sinh", status: "Trạng thái" });
  renderMiniItems(insightReadyListEl, draft.insights, { text: "Insight", note: "Loại", status: "Trạng thái" });
  renderPreview();
  showToast("Đã tạo nháp phân tích từ UC4.");
});

document.querySelector("#addProcessStep").addEventListener("click", () => {
  renderStep(createStep());
  renderPreview();
});

document.querySelector("#addGap").addEventListener("click", () => {
  renderMiniItem(gapListEl, createMiniItem("", "", "Trung bình"), { text: "Gap", note: "Tác động / nguồn", status: "Mức ưu tiên" });
  renderPreview();
});

document.querySelector("#addRisk").addEventListener("click", () => {
  renderMiniItem(riskListEl, createMiniItem("", "", "Trung bình"), { text: "Risk / constraint", note: "Ảnh hưởng", status: "Mức độ" });
  renderPreview();
});

document.querySelector("#addConflict").addEventListener("click", () => {
  renderMiniItem(conflictListEl, createMiniItem("", "", "Cần xử lý"), { text: "Conflict", note: "Nguồn phát sinh", status: "Trạng thái" });
  renderPreview();
});

document.querySelector("#addInsight").addEventListener("click", () => {
  renderMiniItem(insightReadyListEl, createMiniItem("", "", "Sẵn sàng chuyển UC6"), { text: "Insight", note: "Loại", status: "Trạng thái" });
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

  const details = getCurrentDetails();
  const data = {
    ...getFormData(),
    steps: getCurrentSteps(),
    gaps: details.gaps,
    risks: details.risks,
    conflicts: details.conflicts,
    insights: details.insights,
    updatedAt: new Date().toISOString()
  };

  const index = maps.findIndex((item) => item.mapId === data.mapId);
  if (index >= 0) {
    maps[index] = data;
  } else {
    maps.unshift(data);
  }

  activeId = data.mapId;
  saveMaps();
  syncScreen(data);
  showToast("Đã lưu bản đồ phân tích.");
});

document.querySelector("#discardMapChanges").addEventListener("click", () => {
  syncScreen(getActiveMap());
  showToast("Đã hủy thay đổi chưa lưu.");
});

fillRecordSelect();
syncScreen();
