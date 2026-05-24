const STORAGE_KEY = "la-ban-ba.uc1.workspaces";
const form = document.querySelector("#workspaceForm");
const listEl = document.querySelector("#workspaceList");
const toast = document.querySelector("#workspaceToast");

const fields = [
  "workspaceId",
  "workspaceName",
  "projectCode",
  "owner",
  "status",
  "shortDescription",
  "context",
  "initialStakeholders",
  "businessProblem",
  "businessNeed",
  "businessGoal",
  "desiredChange",
  "expectedValue",
  "expectedOutcome",
  "kpi",
  "solutionHypothesis",
  "inScope",
  "outScope",
  "assumptions",
  "constraints"
];

const seedWorkspaces = [
  {
    workspaceId: "ws-digital-lending",
    workspaceName: "Cho vay số",
    projectCode: "DL-2026",
    owner: "BA Linh",
    status: "Khám phá",
    shortDescription: "Chuẩn hóa quy trình tiếp nhận, đánh giá và phê duyệt hồ sơ vay cá nhân trên kênh số.",
    context: "Ngân hàng muốn chuẩn hóa quy trình duyệt hồ sơ vay cá nhân trên kênh số.",
    initialStakeholders: "Sponsor khối tín dụng; Business Owner sản phẩm vay; SME rủi ro; đại diện vận hành; pháp chế.",
    businessProblem: "Thời gian duyệt hồ sơ hiện tại còn dài, thông tin phân tán và quy tắc phê duyệt chưa thống nhất.",
    businessNeed: "Doanh nghiệp cần một quy trình duyệt khoản vay rõ ràng, đo được, giảm xử lý thủ công và thống nhất quy tắc rủi ro.",
    businessGoal: "Giảm 30% thời gian duyệt khoản vay trong quý triển khai đầu tiên.",
    desiredChange: "Chuyển từ quy trình xử lý phân tán sang quy trình có bước kiểm tra dữ liệu, chấm điểm rủi ro và phê duyệt rõ ràng.",
    expectedValue: "Giảm thời gian chờ của khách hàng, giảm lỗi vận hành, tăng tính nhất quán khi ra quyết định.",
    expectedOutcome: "Quy trình phê duyệt rõ ràng hơn, giảm thao tác thủ công và cải thiện trải nghiệm khách hàng.",
    kpi: "Thời gian xử lý trung bình; tỷ lệ hồ sơ phải bổ sung; tỷ lệ hồ sơ xử lý đúng SLA.",
    solutionHypothesis: "Có thể cần luồng kiểm tra hồ sơ đầu vào, tích hợp dữ liệu đối tác và rule phê duyệt theo ngưỡng rủi ro.",
    inScope: "Luồng nộp hồ sơ vay; chấm điểm rủi ro; yêu cầu bổ sung hồ sơ; quy trình phê duyệt.",
    outScope: "Hạch toán core banking; hợp đồng đối tác; website marketing; chiến dịch thu hút khách hàng mới.",
    assumptions: "Nguồn dữ liệu đối tác sẵn sàng tích hợp; SME rủi ro tham gia review định kỳ.",
    constraints: "Go-live trong 12 tuần; bắt buộc review tuân thủ; ngân sách tích hợp giới hạn.",
    updatedAt: new Date().toISOString()
  }
];

let workspaces = loadWorkspaces();
let activeId = workspaces[0]?.workspaceId || createId();

function createId() {
  return `ws-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function loadWorkspaces() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [...seedWorkspaces];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...seedWorkspaces];
  } catch {
    return [...seedWorkspaces];
  }
}

function saveWorkspaces() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces));
}

function getActiveWorkspace() {
  return workspaces.find((item) => item.workspaceId === activeId) || workspaces[0];
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

function setText(id, value, fallback) {
  document.querySelector(`#${id}`).textContent = value || fallback;
}

function hasValue(value) {
  return Boolean(value && value.trim());
}

function calculateReadiness(data) {
  const checks = [
    hasValue(data.workspaceName),
    hasValue(data.owner),
    hasValue(data.businessGoal),
    hasValue(data.businessNeed) || hasValue(data.businessProblem),
    hasValue(data.expectedValue) || hasValue(data.expectedOutcome) || hasValue(data.kpi),
    hasValue(data.inScope) && hasValue(data.outScope),
    hasValue(data.context) || hasValue(data.initialStakeholders)
  ];

  return {
    checks,
    score: Math.round((checks.filter(Boolean).length / checks.length) * 100)
  };
}

function markCheck(id, done) {
  const item = document.querySelector(`#${id}`);
  item.classList.toggle("is-done", done);
}

function renderList() {
  listEl.innerHTML = "";

  workspaces.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `uc1-record ${item.workspaceId === activeId ? "is-active" : ""}`;
    button.innerHTML = `
      <span>${item.projectCode || "Không mã"}</span>
      <strong>${item.workspaceName || "Chưa đặt tên"}</strong>
      <small>${item.status || "Khởi tạo"} · ${item.owner || "Chưa có BA"}</small>
    `;
    button.addEventListener("click", () => {
      activeId = item.workspaceId;
      syncScreen(item);
    });
    listEl.appendChild(button);
  });
}

function renderPreview(data) {
  const readiness = calculateReadiness(data);
  const meta = [
    data.projectCode ? `Mã: ${data.projectCode}` : "",
    data.owner ? `Phụ trách: ${data.owner}` : "",
    data.status ? `Trạng thái: ${data.status}` : ""
  ].filter(Boolean).join(" · ");

  setText("activeWorkspaceName", data.workspaceName, "Chưa chọn");
  setText("activeWorkspaceMeta", meta, "Tạo mới hoặc chọn một hồ sơ bên trái.");
  setText("previewName", data.workspaceName, "Chưa đặt tên");
  setText("previewMeta", meta, "Chưa có dữ liệu.");
  setText("readinessScore", `${readiness.score}%`, "0%");
  setText(
    "readinessText",
    readiness.score >= 80 ? "Đủ nền tảng để chuyển sang stakeholder và khai thác yêu cầu." : "Cần bổ sung thông tin nền tảng trước khi đi tiếp.",
    "Chưa đủ thông tin nền tảng."
  );
  setText("previewGoal", data.businessGoal, "Chưa có mục tiêu kinh doanh.");
  setText("previewProblem", data.businessProblem, "Chưa ghi nhận vấn đề kinh doanh.");
  setText("previewNeed", data.businessNeed, "Chưa ghi nhận.");
  setText("previewValue", data.expectedValue, "Chưa ghi nhận.");
  setText("previewChange", data.desiredChange, "Chưa ghi nhận.");
  setText("previewSolution", data.solutionHypothesis, "Chưa ghi nhận.");
  setText("previewInScope", data.inScope, "Chưa xác định.");
  setText("previewOutScope", data.outScope, "Chưa xác định.");

  const risks = [data.assumptions, data.constraints].filter(Boolean).join(" · ");
  setText("previewRisks", risks, "Chưa ghi nhận.");

  markCheck("checkName", readiness.checks[0]);
  markCheck("checkOwner", readiness.checks[1]);
  markCheck("checkGoal", readiness.checks[2]);
  markCheck("checkNeed", readiness.checks[3]);
  markCheck("checkValue", readiness.checks[4]);
  markCheck("checkScope", readiness.checks[5]);
  markCheck("checkContext", readiness.checks[6]);
}

function syncScreen(data = getActiveWorkspace()) {
  setFormData(data);
  renderList();
  renderPreview(data || {});
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  setTimeout(() => toast.classList.remove("is-visible"), 2400);
}

document.querySelector("#newWorkspace").addEventListener("click", () => {
  const workspace = {
    workspaceId: createId(),
    workspaceName: "",
    projectCode: "",
    owner: "",
    status: "Khởi tạo",
    shortDescription: "",
    context: "",
    initialStakeholders: "",
    businessProblem: "",
    businessNeed: "",
    businessGoal: "",
    desiredChange: "",
    expectedValue: "",
    expectedOutcome: "",
    kpi: "",
    solutionHypothesis: "",
    inScope: "",
    outScope: "",
    assumptions: "",
    constraints: "",
    updatedAt: ""
  };

  workspaces.unshift(workspace);
  activeId = workspace.workspaceId;
  syncScreen(workspace);
  showToast("Đã tạo hồ sơ phân tích mới.");
});

form.addEventListener("input", () => {
  renderPreview(getFormData());
});

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

  const index = workspaces.findIndex((item) => item.workspaceId === data.workspaceId);
  if (index >= 0) {
    workspaces[index] = data;
  } else {
    workspaces.unshift(data);
  }

  activeId = data.workspaceId;
  saveWorkspaces();
  syncScreen(data);
  showToast("Đã lưu hồ sơ không gian phân tích.");
});

document.querySelector("#discardChanges").addEventListener("click", () => {
  syncScreen(getActiveWorkspace());
  showToast("Đã hủy thay đổi chưa lưu.");
});

syncScreen();
