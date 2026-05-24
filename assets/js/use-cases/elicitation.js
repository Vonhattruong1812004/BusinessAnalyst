const RECORD_STORAGE_KEY = "la-ban-ba.uc4.elicitation-records";
const PACK_STORAGE_KEY = "la-ban-ba.uc3.question-packs";
const STAKEHOLDER_STORAGE_KEY = "la-ban-ba.uc2.stakeholders";

const form = document.querySelector("#elicitationForm");
const recordListEl = document.querySelector("#recordList");
const answerListEl = document.querySelector("#answerList");
const decisionListEl = document.querySelector("#decisionList");
const openQuestionListEl = document.querySelector("#openQuestionList");
const actionItemListEl = document.querySelector("#actionItemList");
const toast = document.querySelector("#elicitationToast");

const fields = [
  "recordId",
  "recordName",
  "questionPack",
  "sessionDate",
  "sessionType",
  "stakeholderName",
  "sessionObjective",
  "sessionContext"
];

const insightTypes = [
  "Nhu cầu",
  "Pain point",
  "Business rule",
  "Ngoại lệ",
  "Dữ liệu",
  "Ràng buộc",
  "Giả định",
  "Rủi ro",
  "Decision",
  "Câu hỏi mở",
  "Conflict"
];

const fallbackPacks = [
  {
    packId: "qp-risk-rule",
    packName: "Khai thác quy tắc rủi ro khoản vay",
    stakeholder: "Chị An - SME Rủi ro",
    stakeholderName: "Chị An - SME Rủi ro",
    elicitationType: "Workshop",
    objective: "Xác định business rule",
    questions: [
      createPackQuestion("Business rule", "Điều kiện nào khiến khoản vay bắt buộc phải chuyển sang phê duyệt cấp 2?", "Cao", "Xác định rule chính"),
      createPackQuestion("Dữ liệu", "Những dữ liệu nào bắt buộc phải có trước khi áp dụng rule phê duyệt?", "Cao", "Xác định input"),
      createPackQuestion("Ngoại lệ", "Trường hợp nào được phép override quyết định tự động?", "Cao", "Làm rõ ngoại lệ"),
      createPackQuestion("Quy trình", "Ai là người chịu trách nhiệm xác nhận khi hồ sơ rơi vào vùng rủi ro cao?", "Trung bình", "Làm rõ trách nhiệm"),
      createPackQuestion("Tiêu chí thành công", "BA nên đo rule này bằng chỉ số nào để biết nó vận hành đúng?", "Trung bình", "Xác định tiêu chí đo"),
      createPackQuestion("Follow-up", "Nếu dữ liệu từ đối tác bị thiếu hoặc trễ, quy trình xử lý thay thế là gì?", "Cao", "Đào sâu rủi ro vận hành")
    ]
  }
];

const seedRecords = [
  {
    recordId: "er-risk-workshop",
    recordName: "Workshop làm rõ rule rủi ro",
    questionPack: "qp-risk-rule",
    sessionDate: new Date().toISOString().slice(0, 16),
    sessionType: "Workshop",
    stakeholderName: "Chị An - SME Rủi ro",
    sessionObjective: "Xác định business rule",
    sessionContext: "Buổi workshop tập trung vào ngưỡng phê duyệt, ngoại lệ và trách nhiệm khi khoản vay rơi vào vùng rủi ro cao.",
    answers: [
      createAnswer("q-rule-1", "Business rule", "Điều kiện nào khiến khoản vay bắt buộc phải chuyển sang phê duyệt cấp 2?", "Khoản vay trên 500M hoặc điểm rủi ro cao phải chuyển cấp 2 phê duyệt.", "Business rule", "Rõ", "Cao"),
      createAnswer("q-data-1", "Dữ liệu", "Những dữ liệu nào bắt buộc phải có trước khi áp dụng rule phê duyệt?", "Cần thu nhập, lịch sử tín dụng, phân khúc khách hàng và dữ liệu đối soát từ đối tác.", "Dữ liệu", "Cần làm rõ", "Cao"),
      createAnswer("q-exception-1", "Ngoại lệ", "Trường hợp nào được phép override quyết định tự động?", "SME cần kiểm tra lại với pháp chế trước khi xác nhận quyền override.", "Ngoại lệ", "Cần làm rõ", "Cao")
    ],
    decisions: [
      createMiniItem("Khoản vay trên 500M cần phê duyệt cấp 2.", "Chị An", "Đã xác nhận")
    ],
    openQuestions: [
      createMiniItem("Ai có quyền override quyết định tự động?", "SME rủi ro", "Đang chờ")
    ],
    actionItems: [
      createMiniItem("Gửi policy rủi ro bản mới nhất cho BA.", "SME rủi ro", "Tuần này")
    ],
    updatedAt: new Date().toISOString()
  }
];

let stakeholders = loadCollection(STAKEHOLDER_STORAGE_KEY, []);
let packs = normalizePacks(loadCollection(PACK_STORAGE_KEY, fallbackPacks));
let records = loadCollection(RECORD_STORAGE_KEY, seedRecords);
let activeId = records[0]?.recordId || createId("er");

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function createPackQuestion(category, text, priority, intent) {
  return {
    id: createId("q"),
    category,
    text,
    priority,
    intent
  };
}

function createAnswer(questionId = createId("q"), category = "Nhu cầu", question = "", answer = "", insightType = "Nhu cầu", clarity = "Cần làm rõ", priority = "Trung bình") {
  return {
    id: createId("ans"),
    questionId,
    category,
    question,
    answer,
    insightType,
    clarity,
    priority
  };
}

function createMiniItem(text = "", owner = "", status = "") {
  return {
    id: createId("mini"),
    text,
    owner,
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

function normalizePacks(items) {
  return items.map((item) => ({
    ...item,
    packId: item.packId || item.id || createId("qp"),
    packName: item.packName || item.name || "Bộ câu hỏi chưa đặt tên",
    stakeholderName: item.stakeholderName || resolveStakeholderName(item.stakeholder) || "Stakeholder chưa rõ",
    objective: item.objective || "Làm rõ nhu cầu kinh doanh",
    elicitationType: item.elicitationType || "Phỏng vấn 1-1",
    questions: Array.isArray(item.questions) ? item.questions : []
  }));
}

function resolveStakeholderName(idOrName = "") {
  const stakeholder = stakeholders.find((item) => item.stakeholderId === idOrName);
  return stakeholder?.name || idOrName;
}

function saveRecords() {
  localStorage.setItem(RECORD_STORAGE_KEY, JSON.stringify(records));
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

function getActiveRecord() {
  return records.find((item) => item.recordId === activeId) || records[0];
}

function getPack(id) {
  return packs.find((item) => item.packId === id) || packs[0] || {};
}

function getPackName(id) {
  return getPack(id).packName || "Chưa chọn bộ câu hỏi";
}

function fillPackSelect() {
  const select = form.elements.questionPack;
  select.innerHTML = "";
  packs.forEach((pack) => {
    const option = document.createElement("option");
    option.value = pack.packId;
    option.textContent = `${pack.packName} · ${pack.questions.length} câu hỏi`;
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

function getCurrentAnswers() {
  return [...answerListEl.querySelectorAll(".uc4-answer-card")].map((card) => ({
    id: card.dataset.id || createId("ans"),
    questionId: card.dataset.questionId || createId("q"),
    category: card.dataset.category || "Nhu cầu",
    priority: card.dataset.priority || "Trung bình",
    question: card.querySelector("[data-field='question']").value.trim(),
    answer: card.querySelector("[data-field='answer']").value.trim(),
    insightType: card.querySelector("[data-field='insightType']").value,
    clarity: card.querySelector("[data-field='clarity']").value
  })).filter((item) => item.question || item.answer);
}

function getMiniItems(container) {
  return [...container.querySelectorAll(".uc4-mini-item")].map((item) => ({
    id: item.dataset.id || createId("mini"),
    text: item.querySelector("[data-field='text']").value.trim(),
    owner: item.querySelector("[data-field='owner']").value.trim(),
    status: item.querySelector("[data-field='status']").value.trim()
  })).filter((item) => item.text || item.owner || item.status);
}

function getCurrentDetails() {
  return {
    decisions: getMiniItems(decisionListEl),
    openQuestions: getMiniItems(openQuestionListEl),
    actionItems: getMiniItems(actionItemListEl)
  };
}

function calculateClarity(data, answers, details) {
  const answered = answers.filter((item) => item.answer).length;
  const clear = answers.filter((item) => item.clarity === "Rõ").length;
  const insights = new Set(answers.filter((item) => item.answer).map((item) => item.insightType));
  const checks = [
    Boolean(data.questionPack),
    answered >= 3,
    insights.size >= 2,
    details.decisions.length + details.openQuestions.length + details.actionItems.length > 0,
    answers.some((item) => item.clarity === "Mâu thuẫn") || answers.every((item) => item.clarity !== "Mâu thuẫn")
  ];
  const baseScore = checks.filter(Boolean).length / checks.length;
  const clarityBoost = answers.length ? clear / answers.length : 0;

  return {
    checks,
    score: Math.round(((baseScore * 0.72) + (clarityBoost * 0.28)) * 100)
  };
}

function markCheck(id, done) {
  document.querySelector(`#${id}`).classList.toggle("is-done", done);
}

function getRiskText(data, answers, details) {
  if (!data.questionPack) return "Chưa chọn bộ câu hỏi từ UC3 nên buổi khai thác thiếu cấu trúc.";
  if (!answers.some((item) => item.answer)) return "Chưa ghi câu trả lời, record chưa thể dùng cho phân tích.";
  if (answers.some((item) => item.clarity === "Mâu thuẫn")) return "Có thông tin mâu thuẫn, BA cần xử lý trước khi chuyển sang phân tích.";
  if (details.openQuestions.length > 0) return "Còn câu hỏi mở, cần theo dõi trạng thái xử lý sau buổi khai thác.";
  if (details.decisions.length === 0) return "Chưa có decision nào được ghi nhận, cần xác nhận nếu buổi họp có quyết định.";
  return "Bản ghi đã đủ nền tảng để chuyển sang phân tích quy trình và yêu cầu.";
}

function renderRecordList() {
  recordListEl.innerHTML = "";
  records.forEach((record) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `uc4-record ${record.recordId === activeId ? "is-active" : ""}`;
    button.innerHTML = `
      <span>${escapeHTML(record.sessionType || "Buổi khai thác")}</span>
      <strong>${escapeHTML(record.recordName || "Chưa đặt tên")}</strong>
      <small>${escapeHTML(getPackName(record.questionPack))} · ${record.answers?.length || 0} câu trả lời</small>
    `;
    button.addEventListener("click", () => {
      activeId = record.recordId;
      syncScreen(record);
    });
    recordListEl.appendChild(button);
  });
}

function renderAnswer(answer) {
  const card = document.createElement("article");
  card.className = "uc4-answer-card";
  card.dataset.id = answer.id || createId("ans");
  card.dataset.questionId = answer.questionId || createId("q");
  card.dataset.category = answer.category || "Nhu cầu";
  card.dataset.priority = answer.priority || "Trung bình";

  const insightOptions = insightTypes.map((item) => `<option ${item === answer.insightType ? "selected" : ""}>${escapeHTML(item)}</option>`).join("");
  const clarityOptions = ["Rõ", "Cần làm rõ", "Mâu thuẫn"].map((item) => `<option ${item === answer.clarity ? "selected" : ""}>${escapeHTML(item)}</option>`).join("");

  card.innerHTML = `
    <div class="uc4-answer-meta">
      <span>${escapeHTML(answer.category || "Câu hỏi")}</span>
      <strong>${escapeHTML(answer.priority || "Trung bình")}</strong>
      <button class="question-remove" type="button" aria-label="Xóa câu trả lời">×</button>
    </div>
    <label>
      <span>Câu hỏi</span>
      <textarea data-field="question" rows="2">${escapeHTML(answer.question || "")}</textarea>
    </label>
    <label>
      <span>Câu trả lời / ghi nhận</span>
      <textarea data-field="answer" rows="4">${escapeHTML(answer.answer || "")}</textarea>
    </label>
    <div class="uc4-answer-controls">
      <label>
        <span>Loại thông tin</span>
        <select data-field="insightType">${insightOptions}</select>
      </label>
      <label>
        <span>Mức rõ ràng</span>
        <select data-field="clarity">${clarityOptions}</select>
      </label>
    </div>
  `;

  card.querySelector(".question-remove").addEventListener("click", () => {
    card.remove();
    renderPreview();
  });
  card.addEventListener("input", renderPreview);
  card.addEventListener("change", renderPreview);
  answerListEl.appendChild(card);
}

function renderAnswers(answers = []) {
  answerListEl.innerHTML = "";
  answers.forEach(renderAnswer);
}

function renderMiniItem(container, item = createMiniItem(), labels = {}) {
  const card = document.createElement("article");
  card.className = "uc4-mini-item";
  card.dataset.id = item.id || createId("mini");
  card.innerHTML = `
    <label>
      <span>${escapeHTML(labels.text || "Nội dung")}</span>
      <textarea data-field="text" rows="2">${escapeHTML(item.text || "")}</textarea>
    </label>
    <div class="uc4-mini-row">
      <label>
        <span>${escapeHTML(labels.owner || "Người phụ trách")}</span>
        <input data-field="owner" type="text" value="${escapeHTML(item.owner || "")}" />
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

function answersFromPack(pack) {
  return (pack.questions || []).map((question) => createAnswer(
    question.id,
    question.category,
    question.text,
    "",
    mapCategoryToInsight(question.category),
    "Cần làm rõ",
    question.priority
  ));
}

function mapCategoryToInsight(category = "") {
  if (category.includes("rule")) return "Business rule";
  if (category.includes("Dữ liệu")) return "Dữ liệu";
  if (category.includes("Ngoại lệ")) return "Ngoại lệ";
  if (category.includes("Vấn đề")) return "Pain point";
  if (category.includes("Ràng buộc")) return "Ràng buộc";
  if (category.includes("Follow")) return "Câu hỏi mở";
  return "Nhu cầu";
}

function applyPackContext(pack) {
  if (!pack.packId) return;
  form.elements.sessionType.value = pack.elicitationType || "Phỏng vấn 1-1";
  form.elements.stakeholderName.value = pack.stakeholderName || pack.stakeholder || "";
  form.elements.sessionObjective.value = pack.objective || "";
  setText("sourcePackName", pack.packName, "Chưa chọn bộ câu hỏi");
  setText("sourcePackMeta", `${pack.questions.length} câu hỏi · ${pack.objective || "Chưa rõ mục tiêu"}`, "Chưa có dữ liệu.");
}

function renderInsightList(answers) {
  const counts = insightTypes.map((type) => ({
    type,
    count: answers.filter((item) => item.answer && item.insightType === type).length
  })).filter((item) => item.count > 0);

  const insightList = document.querySelector("#insightList");
  insightList.innerHTML = counts.length
    ? counts.map((item) => `<span>${escapeHTML(item.type)}<strong>${item.count}</strong></span>`).join("")
    : "<p>Chưa có thông tin được phân loại.</p>";
}

function renderPreview() {
  const data = getFormData();
  const answers = getCurrentAnswers();
  const details = getCurrentDetails();
  const clarity = calculateClarity(data, answers, details);
  const meta = [
    getPackName(data.questionPack),
    data.stakeholderName,
    data.sessionType
  ].filter(Boolean).join(" · ");

  setText("activeRecordName", data.recordName, "Chưa chọn");
  setText("activeRecordMeta", meta, "Tạo mới hoặc chọn một bản ghi bên trái.");
  setText("previewRecordName", data.recordName, "Chưa đặt tên");
  setText("previewRecordMeta", meta, "Chưa có dữ liệu.");
  setText("answerCount", `${answers.filter((item) => item.answer).length}/${answers.length} câu trả lời`, "0 câu trả lời");
  setText("clarityScore", `${clarity.score}%`, "0%");
  setText(
    "clarityText",
    clarity.score >= 80 ? "Đủ rõ để chuyển sang phân tích quy trình và yêu cầu." : "Cần bổ sung câu trả lời, decision hoặc câu hỏi mở.",
    "Chưa đủ thông tin để dùng cho bước phân tích."
  );
  setText("elicitationRisk", getRiskText(data, answers, details), "Chưa có cảnh báo.");

  markCheck("checkPack", clarity.checks[0]);
  markCheck("checkAnswers", clarity.checks[1]);
  markCheck("checkInsights", clarity.checks[2]);
  markCheck("checkOpenItems", clarity.checks[3]);
  markCheck("checkConflicts", clarity.checks[4]);
  renderInsightList(answers);
}

function syncScreen(record = getActiveRecord()) {
  setFormData(record || {});
  renderAnswers(record?.answers || []);
  renderMiniItems(decisionListEl, record?.decisions || [], {
    text: "Quyết định",
    owner: "Người quyết định",
    status: "Trạng thái"
  });
  renderMiniItems(openQuestionListEl, record?.openQuestions || [], {
    text: "Câu hỏi mở",
    owner: "Người cần trả lời",
    status: "Trạng thái"
  });
  renderMiniItems(actionItemListEl, record?.actionItems || [], {
    text: "Việc cần làm",
    owner: "Người phụ trách",
    status: "Hạn / trạng thái"
  });
  applyPackContext(getPack(record?.questionPack));
  renderRecordList();
  renderPreview();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  setTimeout(() => toast.classList.remove("is-visible"), 2400);
}

document.querySelector("#newRecord").addEventListener("click", () => {
  const pack = packs[0] || {};
  const record = {
    recordId: createId("er"),
    recordName: "",
    questionPack: pack.packId || "",
    sessionDate: new Date().toISOString().slice(0, 16),
    sessionType: pack.elicitationType || "Phỏng vấn 1-1",
    stakeholderName: pack.stakeholderName || pack.stakeholder || "",
    sessionObjective: pack.objective || "",
    sessionContext: "",
    answers: answersFromPack(pack),
    decisions: [],
    openQuestions: [],
    actionItems: [],
    updatedAt: ""
  };
  records.unshift(record);
  activeId = record.recordId;
  syncScreen(record);
  showToast("Đã tạo bản ghi khai thác mới.");
});

form.elements.questionPack.addEventListener("change", () => {
  const pack = getPack(form.elements.questionPack.value);
  applyPackContext(pack);
  renderAnswers(answersFromPack(pack));
  renderPreview();
});

document.querySelector("#reloadPackQuestions").addEventListener("click", () => {
  const pack = getPack(form.elements.questionPack.value);
  renderAnswers(answersFromPack(pack));
  applyPackContext(pack);
  renderPreview();
  showToast("Đã nạp lại câu hỏi từ UC3.");
});

document.querySelector("#addEmergentAnswer").addEventListener("click", () => {
  renderAnswer(createAnswer(createId("q"), "Phát sinh", "", "", "Câu hỏi mở", "Cần làm rõ", "Trung bình"));
  renderPreview();
});

document.querySelector("#addDecision").addEventListener("click", () => {
  renderMiniItem(decisionListEl, createMiniItem("", "", "Chưa xác nhận"), {
    text: "Quyết định",
    owner: "Người quyết định",
    status: "Trạng thái"
  });
  renderPreview();
});

document.querySelector("#addOpenQuestion").addEventListener("click", () => {
  renderMiniItem(openQuestionListEl, createMiniItem("", "", "Đang chờ"), {
    text: "Câu hỏi mở",
    owner: "Người cần trả lời",
    status: "Trạng thái"
  });
  renderPreview();
});

document.querySelector("#addActionItem").addEventListener("click", () => {
  renderMiniItem(actionItemListEl, createMiniItem("", "", ""), {
    text: "Việc cần làm",
    owner: "Người phụ trách",
    status: "Hạn / trạng thái"
  });
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
    answers: getCurrentAnswers(),
    decisions: details.decisions,
    openQuestions: details.openQuestions,
    actionItems: details.actionItems,
    updatedAt: new Date().toISOString()
  };

  const index = records.findIndex((item) => item.recordId === data.recordId);
  if (index >= 0) {
    records[index] = data;
  } else {
    records.unshift(data);
  }

  activeId = data.recordId;
  saveRecords();
  syncScreen(data);
  showToast("Đã lưu bản ghi khai thác.");
});

document.querySelector("#discardRecordChanges").addEventListener("click", () => {
  syncScreen(getActiveRecord());
  showToast("Đã hủy thay đổi chưa lưu.");
});

fillPackSelect();
syncScreen();
