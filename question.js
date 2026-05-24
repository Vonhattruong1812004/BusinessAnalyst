const PACK_STORAGE_KEY = "la-ban-ba.uc3.question-packs";
const WORKSPACE_STORAGE_KEY = "la-ban-ba.uc1.workspaces";
const STAKEHOLDER_STORAGE_KEY = "la-ban-ba.uc2.stakeholders";

const form = document.querySelector("#questionPackForm");
const listEl = document.querySelector("#packList");
const questionListEl = document.querySelector("#questionList");
const toast = document.querySelector("#questionToast");

const fields = [
  "packId",
  "packName",
  "workspace",
  "stakeholder",
  "elicitationType",
  "objective",
  "topic",
  "knownContext",
  "informationGaps",
  "constraints"
];

const fallbackWorkspaces = [
  {
    workspaceId: "ws-digital-lending",
    workspaceName: "Cho vay số",
    projectCode: "DL-2026"
  }
];

const fallbackStakeholders = [
  {
    stakeholderId: "st-risk-sme",
    name: "Chị An - SME Rủi ro",
    role: "SME",
    department: "Khối rủi ro",
    informationProvided: "Quy tắc chấm điểm, trường hợp ngoại lệ, ngưỡng phê duyệt, dữ liệu rủi ro.",
    openQuestions: "Ngưỡng rủi ro nào bắt buộc phê duyệt cấp 2? Ai được override quyết định?"
  },
  {
    stakeholderId: "st-sponsor",
    name: "Anh Minh - Sponsor khối tín dụng",
    role: "Sponsor",
    department: "Khối tín dụng",
    informationProvided: "Mục tiêu kinh doanh, ranh giới phạm vi, quyết định ưu tiên.",
    openQuestions: "Mức giảm thời gian xử lý tối thiểu cần đạt là bao nhiêu?"
  }
];

const questionCategories = [
  "Mục tiêu",
  "Vấn đề",
  "Quy trình",
  "Dữ liệu",
  "Business rule",
  "Ngoại lệ",
  "Ràng buộc",
  "Ưu tiên",
  "Tiêu chí thành công",
  "Follow-up"
];

const seedPacks = [
  {
    packId: "qp-risk-rule",
    packName: "Khai thác quy tắc rủi ro khoản vay",
    workspace: "ws-digital-lending",
    stakeholder: "st-risk-sme",
    elicitationType: "Workshop",
    objective: "Xác định business rule",
    topic: "Điều kiện phê duyệt khoản vay trên 500M",
    knownContext: "Quy trình cho vay số cần chuẩn hóa ngưỡng phê duyệt, ngoại lệ và audit trail.",
    informationGaps: "Chưa rõ ngưỡng rủi ro, người có quyền override, dữ liệu đầu vào và cách xử lý ngoại lệ.",
    constraints: "Workshop 60 phút, cần tránh câu hỏi dẫn dắt và phải xác nhận decision sau buổi họp.",
    questions: [
      createQuestion("Business rule", "Điều kiện nào khiến khoản vay bắt buộc phải chuyển sang phê duyệt cấp 2?", "Cao", "Xác định rule chính"),
      createQuestion("Dữ liệu", "Những dữ liệu nào bắt buộc phải có trước khi áp dụng rule phê duyệt?", "Cao", "Xác định input"),
      createQuestion("Ngoại lệ", "Trường hợp nào được phép override quyết định tự động?", "Cao", "Làm rõ ngoại lệ"),
      createQuestion("Quy trình", "Ai là người chịu trách nhiệm xác nhận khi hồ sơ rơi vào vùng rủi ro cao?", "Trung bình", "Làm rõ trách nhiệm"),
      createQuestion("Tiêu chí thành công", "BA nên đo rule này bằng chỉ số nào để biết nó vận hành đúng?", "Trung bình", "Xác định tiêu chí đo"),
      createQuestion("Follow-up", "Nếu dữ liệu từ đối tác bị thiếu hoặc trễ, quy trình xử lý thay thế là gì?", "Cao", "Đào sâu rủi ro vận hành")
    ],
    updatedAt: new Date().toISOString()
  }
];

let workspaces = loadCollection(WORKSPACE_STORAGE_KEY, fallbackWorkspaces);
let stakeholders = loadCollection(STAKEHOLDER_STORAGE_KEY, fallbackStakeholders);
let packs = loadCollection(PACK_STORAGE_KEY, seedPacks);
let activeId = packs[0]?.packId || createId("qp");

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function createQuestion(category = "Mục tiêu", text = "", priority = "Trung bình", intent = "") {
  return {
    id: createId("q"),
    category,
    text,
    priority,
    intent
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

function savePacks() {
  localStorage.setItem(PACK_STORAGE_KEY, JSON.stringify(packs));
}

function getActivePack() {
  return packs.find((item) => item.packId === activeId) || packs[0];
}

function getWorkspaceName(id) {
  const workspace = workspaces.find((item) => item.workspaceId === id);
  return workspace?.workspaceName || workspace?.projectCode || "Chưa chọn không gian";
}

function getStakeholder(id) {
  return stakeholders.find((item) => item.stakeholderId === id) || stakeholders[0] || {};
}

function getStakeholderName(id) {
  const stakeholder = getStakeholder(id);
  return stakeholder.name || "Chưa chọn stakeholder";
}

function setText(id, value, fallback) {
  document.querySelector(`#${id}`).textContent = value || fallback;
}

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fillSelect(selectId, items, getValue, getLabel) {
  const select = document.querySelector(`#${selectId}`);
  select.innerHTML = "";
  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = getValue(item);
    option.textContent = getLabel(item);
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

function getCurrentQuestions() {
  return [...questionListEl.querySelectorAll(".uc3-question-card")].map((card) => ({
    id: card.dataset.id || createId("q"),
    category: card.querySelector("[data-field='category']").value,
    priority: card.querySelector("[data-field='priority']").value,
    text: card.querySelector("[data-field='text']").value.trim(),
    intent: card.querySelector("[data-field='intent']").value.trim()
  })).filter((item) => item.text);
}

function calculateReadiness(data, questions) {
  const categories = new Set(questions.map((item) => item.category));
  const checks = [
    Boolean(data.stakeholder),
    Boolean(data.objective),
    Boolean(data.knownContext || data.informationGaps || data.topic),
    questions.length >= 6,
    categories.size >= 4,
    questions.some((item) => item.category === "Follow-up")
  ];

  return {
    checks,
    score: Math.round((checks.filter(Boolean).length / checks.length) * 100)
  };
}

function markCheck(id, done) {
  document.querySelector(`#${id}`).classList.toggle("is-done", done);
}

function getRiskText(data, questions) {
  if (!data.stakeholder) return "Chưa chọn stakeholder nên câu hỏi có thể bị chung chung.";
  if (!data.objective) return "Chưa có mục tiêu buổi hỏi nên BA khó kiểm soát trọng tâm.";
  if (questions.length < 6) return "Số lượng câu hỏi còn ít, dễ bỏ sót pain point, rule hoặc ngoại lệ.";
  if (!questions.some((item) => item.category === "Follow-up")) return "Chưa có câu hỏi đào sâu, buổi hỏi có thể dừng ở mức bề mặt.";
  return "Bộ câu hỏi đã đủ nền tảng để BA dùng trong bước thu thập thông tin.";
}

function renderSelects() {
  fillSelect(
    "workspace",
    workspaces,
    (item) => item.workspaceId,
    (item) => `${item.workspaceName || "Không gian chưa tên"}${item.projectCode ? ` · ${item.projectCode}` : ""}`
  );
  fillSelect(
    "stakeholder",
    stakeholders,
    (item) => item.stakeholderId,
    (item) => `${item.name || "Stakeholder chưa tên"}${item.role ? ` · ${item.role}` : ""}`
  );
}

function renderList() {
  listEl.innerHTML = "";
  packs.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `uc3-record ${item.packId === activeId ? "is-active" : ""}`;
    button.innerHTML = `
      <span>${escapeHTML(item.objective || "Mục tiêu khai thác")}</span>
      <strong>${escapeHTML(item.packName || "Chưa đặt tên")}</strong>
      <small>${escapeHTML(getStakeholderName(item.stakeholder))} · ${item.questions?.length || 0} câu hỏi</small>
    `;
    button.addEventListener("click", () => {
      activeId = item.packId;
      syncScreen(item);
    });
    listEl.appendChild(button);
  });
}

function renderQuestion(question) {
  const card = document.createElement("article");
  card.className = "uc3-question-card";
  card.dataset.id = question.id || createId("q");

  const categoryOptions = questionCategories.map((item) => `<option ${item === question.category ? "selected" : ""}>${escapeHTML(item)}</option>`).join("");
  const priorityOptions = ["Cao", "Trung bình", "Thấp"].map((item) => `<option ${item === question.priority ? "selected" : ""}>${escapeHTML(item)}</option>`).join("");

  card.innerHTML = `
    <div class="uc3-question-meta">
      <select data-field="category" aria-label="Nhóm câu hỏi">${categoryOptions}</select>
      <select data-field="priority" aria-label="Mức ưu tiên">${priorityOptions}</select>
      <button class="question-remove" type="button" aria-label="Xóa câu hỏi">×</button>
    </div>
    <label>
      <span>Câu hỏi</span>
      <textarea data-field="text" rows="3">${escapeHTML(question.text || "")}</textarea>
    </label>
    <label>
      <span>Mục đích câu hỏi</span>
      <input data-field="intent" type="text" value="${escapeHTML(question.intent || "")}" />
    </label>
  `;

  card.querySelector(".question-remove").addEventListener("click", () => {
    card.remove();
    renderPreview(getFormData(), getCurrentQuestions());
  });
  card.addEventListener("input", () => renderPreview(getFormData(), getCurrentQuestions()));
  card.addEventListener("change", () => renderPreview(getFormData(), getCurrentQuestions()));
  questionListEl.appendChild(card);
}

function renderQuestions(questions = []) {
  questionListEl.innerHTML = "";
  questions.forEach(renderQuestion);
  renderPreview(getFormData(), questions);
}

function renderLens(questions) {
  const categories = questionCategories.map((category) => ({
    category,
    count: questions.filter((item) => item.category === category).length
  })).filter((item) => item.count > 0);

  const lensEl = document.querySelector("#lensList");
  lensEl.innerHTML = categories.length
    ? categories.map((item) => `<span>${escapeHTML(item.category)}<strong>${item.count}</strong></span>`).join("")
    : "<p>Chưa có nhóm câu hỏi.</p>";
}

function renderPreview(data, questions = getCurrentQuestions()) {
  const readiness = calculateReadiness(data, questions);
  const meta = [
    getWorkspaceName(data.workspace),
    getStakeholderName(data.stakeholder),
    data.elicitationType
  ].filter(Boolean).join(" · ");

  setText("activePackName", data.packName, "Chưa chọn");
  setText("activePackMeta", meta, "Tạo mới hoặc chọn một bộ câu hỏi bên trái.");
  setText("previewPackName", data.packName, "Chưa đặt tên");
  setText("previewPackMeta", meta, "Chưa có dữ liệu.");
  setText("questionCount", `${questions.length} câu hỏi`, "0 câu hỏi");
  setText("questionReadinessScore", `${readiness.score}%`, "0%");
  setText(
    "questionReadinessText",
    readiness.score >= 80 ? "Đủ nền tảng để chuyển sang UC4 và bắt đầu khai thác." : "Cần bổ sung mục tiêu, ngữ cảnh hoặc câu hỏi đào sâu.",
    "Chưa đủ dữ liệu để bước vào khai thác."
  );
  setText("previewRisk", getRiskText(data, questions), "Chưa có cảnh báo.");

  markCheck("checkStakeholder", readiness.checks[0]);
  markCheck("checkObjective", readiness.checks[1]);
  markCheck("checkContext", readiness.checks[2]);
  markCheck("checkEnoughQuestions", readiness.checks[3]);
  markCheck("checkCategories", readiness.checks[4]);
  markCheck("checkFollowUp", readiness.checks[5]);
  renderLens(questions);
}

function syncScreen(data = getActivePack()) {
  setFormData(data);
  renderList();
  renderQuestions(data?.questions || []);
  renderPreview(data || {}, data?.questions || []);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  setTimeout(() => toast.classList.remove("is-visible"), 2400);
}

function buildGeneratedQuestions(data) {
  const stakeholder = getStakeholder(data.stakeholder);
  const role = stakeholder.role || "stakeholder";
  const topic = data.topic || data.objective || "chủ đề đang phân tích";
  const information = stakeholder.informationProvided || "tri thức nghiệp vụ liên quan";
  const gap = data.informationGaps || "những điểm BA chưa rõ";

  return [
    createQuestion("Mục tiêu", `Với vai trò ${role}, anh/chị kỳ vọng điều gì khi xử lý ${topic}?`, "Cao", "Làm rõ kết quả mong muốn"),
    createQuestion("Vấn đề", `Vấn đề lớn nhất hiện tại liên quan đến ${topic} là gì và tác động đến ai?`, "Cao", "Tìm pain point"),
    createQuestion("Quy trình", `Hiện tại quy trình đang diễn ra theo các bước nào từ lúc bắt đầu đến khi hoàn tất?`, "Cao", "Bóc tách current state"),
    createQuestion("Dữ liệu", `Những dữ liệu, biểu mẫu hoặc báo cáo nào đang được dùng để ra quyết định?`, "Trung bình", `Khai thác nguồn thông tin: ${information}`),
    createQuestion("Business rule", `Có rule, ngưỡng, điều kiện hoặc chính sách nào bắt buộc phải tuân thủ không?`, "Cao", "Tìm business rule"),
    createQuestion("Ngoại lệ", `Trường hợp ngoại lệ nào thường xảy ra và hiện tại được xử lý như thế nào?`, "Cao", "Làm rõ exception flow"),
    createQuestion("Ràng buộc", `Có ràng buộc nào về thời gian, pháp lý, dữ liệu, hệ thống hoặc nhân sự không?`, "Trung bình", "Xác định constraint"),
    createQuestion("Ưu tiên", `Nếu phải chọn phần quan trọng nhất để xử lý trước, anh/chị sẽ ưu tiên điểm nào và vì sao?`, "Trung bình", "Hỗ trợ ưu tiên yêu cầu"),
    createQuestion("Tiêu chí thành công", `Sau khi thay đổi được triển khai, chỉ số nào chứng minh vấn đề đã được giải quyết?`, "Cao", "Xác định acceptance/value criteria"),
    createQuestion("Follow-up", `Về ${gap}, điều gì sẽ xảy ra nếu dữ liệu thiếu, quyết định chậm hoặc stakeholder không thống nhất?`, "Cao", "Đào sâu rủi ro và giả định")
  ];
}

document.querySelector("#newPack").addEventListener("click", () => {
  const pack = {
    packId: createId("qp"),
    packName: "",
    workspace: workspaces[0]?.workspaceId || "",
    stakeholder: stakeholders[0]?.stakeholderId || "",
    elicitationType: "Phỏng vấn 1-1",
    objective: "Làm rõ nhu cầu kinh doanh",
    topic: "",
    knownContext: "",
    informationGaps: "",
    constraints: "",
    questions: [],
    updatedAt: ""
  };
  packs.unshift(pack);
  activeId = pack.packId;
  syncScreen(pack);
  showToast("Đã tạo bộ câu hỏi mới.");
});

document.querySelector("#generateQuestions").addEventListener("click", () => {
  const data = getFormData();
  const generated = buildGeneratedQuestions(data);
  renderQuestions(generated);
  showToast("AI Copilot đã tạo bản nháp câu hỏi để BA chỉnh sửa.");
});

document.querySelector("#addQuestion").addEventListener("click", () => {
  renderQuestion(createQuestion("Follow-up", "", "Trung bình", ""));
  renderPreview(getFormData(), getCurrentQuestions());
});

form.addEventListener("input", () => renderPreview(getFormData(), getCurrentQuestions()));
form.addEventListener("change", () => renderPreview(getFormData(), getCurrentQuestions()));

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const data = {
    ...getFormData(),
    questions: getCurrentQuestions(),
    updatedAt: new Date().toISOString()
  };

  const index = packs.findIndex((item) => item.packId === data.packId);
  if (index >= 0) {
    packs[index] = data;
  } else {
    packs.unshift(data);
  }

  activeId = data.packId;
  savePacks();
  syncScreen(data);
  showToast("Đã lưu bộ câu hỏi.");
});

document.querySelector("#discardPackChanges").addEventListener("click", () => {
  syncScreen(getActivePack());
  showToast("Đã hủy thay đổi chưa lưu.");
});

renderSelects();
syncScreen();
