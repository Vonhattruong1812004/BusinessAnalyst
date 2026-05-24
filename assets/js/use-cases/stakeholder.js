const STORAGE_KEY = "la-ban-ba.uc2.stakeholders";
const form = document.querySelector("#stakeholderForm");
const listEl = document.querySelector("#stakeholderList");
const toast = document.querySelector("#stakeholderToast");

const fields = [
  "stakeholderId",
  "name",
  "sourceType",
  "role",
  "department",
  "influence",
  "interest",
  "decisionPower",
  "engagementStrategy",
  "needs",
  "informationProvided",
  "openQuestions",
  "communicationPlan",
  "risks"
];

const seedStakeholders = [
  {
    stakeholderId: "st-risk-sme",
    name: "Chị An - SME Rủi ro",
    sourceType: "Con người",
    role: "SME",
    department: "Khối rủi ro",
    influence: "Cao",
    interest: "Cao",
    decisionPower: "Người tư vấn",
    engagementStrategy: "Quản lý sát",
    needs: "Cần quy tắc rủi ro rõ ràng, có ngoại lệ được kiểm soát và có audit trail.",
    informationProvided: "Quy tắc chấm điểm, trường hợp ngoại lệ, ngưỡng phê duyệt, dữ liệu rủi ro.",
    openQuestions: "Ngưỡng rủi ro nào bắt buộc phê duyệt cấp 2? Ai được override quyết định?",
    communicationPlan: "Workshop 60 phút mỗi tuần, xác nhận decision qua email sau workshop.",
    risks: "Lịch SME bận, nhiều ngoại lệ nghiệp vụ chưa được tài liệu hóa.",
    updatedAt: new Date().toISOString()
  },
  {
    stakeholderId: "st-sponsor",
    name: "Anh Minh - Sponsor khối tín dụng",
    sourceType: "Con người",
    role: "Sponsor",
    department: "Khối tín dụng",
    influence: "Cao",
    interest: "Trung bình",
    decisionPower: "Người phê duyệt",
    engagementStrategy: "Duy trì hài lòng",
    needs: "Cần thấy giá trị kinh doanh, rủi ro chính và phạm vi thay đổi trước khi phê duyệt.",
    informationProvided: "Mục tiêu kinh doanh, ranh giới phạm vi, quyết định ưu tiên.",
    openQuestions: "Mức giảm thời gian xử lý tối thiểu cần đạt là bao nhiêu?",
    communicationPlan: "Cập nhật executive summary hàng tuần, xin phê duyệt tại mốc baseline.",
    risks: "Nếu mục tiêu đo lường không rõ, việc phê duyệt baseline có thể chậm.",
    updatedAt: new Date().toISOString()
  }
];

let stakeholders = loadStakeholders();
let activeId = stakeholders[0]?.stakeholderId || createId();

function createId() {
  return `st-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function loadStakeholders() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [...seedStakeholders];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...seedStakeholders];
  } catch {
    return [...seedStakeholders];
  }
}

function saveStakeholders() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stakeholders));
}

function getActiveStakeholder() {
  return stakeholders.find((item) => item.stakeholderId === activeId) || stakeholders[0];
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

function getMatrixPosition(data) {
  if (data.influence === "Cao" && data.interest === "Cao") {
    return ["Quản lý sát", "Cần tham gia workshop chính, review quyết định và xác nhận điểm mơ hồ."];
  }
  if (data.influence === "Cao") {
    return ["Duy trì hài lòng", "Cần cập nhật ngắn gọn, xin quyết định tại các mốc quan trọng."];
  }
  if (data.interest === "Cao") {
    return ["Cập nhật thường xuyên", "Cần mời góp ý, phản hồi câu hỏi và xác nhận chi tiết nghiệp vụ."];
  }
  return ["Theo dõi định kỳ", "Cần cập nhật khi có thay đổi ảnh hưởng trực tiếp."];
}

function getRaci(data) {
  const role = data.role;
  const decisionPower = data.decisionPower;
  return {
    r: role === "Product Owner" || role === "SME" ? data.name : "BA",
    a: decisionPower === "Người phê duyệt" ? data.name : "Sponsor / Business Owner",
    c: ["SME", "Compliance / Legal", "Business Owner"].includes(role) ? data.name : "SME liên quan",
    i: ["End User", "Project Manager", "QA / Tester"].includes(role) ? data.name : "Nhóm bị ảnh hưởng"
  };
}

function renderStats() {
  setText("totalStakeholders", String(stakeholders.length), "0");
  setText("decisionMakers", String(stakeholders.filter((item) => item.decisionPower === "Người phê duyệt").length), "0");
  setText("pendingAnswers", String(stakeholders.filter((item) => item.openQuestions).length), "0");
}

function renderList() {
  listEl.innerHTML = "";
  stakeholders.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `uc2-record ${item.stakeholderId === activeId ? "is-active" : ""}`;
    button.innerHTML = `
      <span>${item.sourceType || "Nguồn"}</span>
      <strong>${item.name || "Chưa đặt tên"}</strong>
      <small>${item.role || "Chưa vai trò"} · ${item.influence || "?"}/${item.interest || "?"}</small>
    `;
    button.addEventListener("click", () => {
      activeId = item.stakeholderId;
      syncScreen(item);
    });
    listEl.appendChild(button);
  });
}

function renderPreview(data) {
  const [position, advice] = getMatrixPosition(data);
  const raci = getRaci(data);
  const meta = [
    data.role,
    data.department,
    data.decisionPower
  ].filter(Boolean).join(" · ");

  setText("activeStakeholderName", data.name, "Chưa chọn");
  setText("activeStakeholderMeta", meta, "Tạo mới hoặc chọn một stakeholder bên trái.");
  setText("previewStakeholderName", data.name, "Chưa đặt tên");
  setText("previewStakeholderMeta", meta, "Chưa có dữ liệu.");
  setText("matrixPosition", position, "Chưa xác định");
  setText("matrixAdvice", advice, "Chưa đủ dữ liệu để đề xuất cách cộng tác.");
  setText("raciR", raci.r, "-");
  setText("raciA", raci.a, "-");
  setText("raciC", raci.c, "-");
  setText("raciI", raci.i, "-");
  setText("previewNeeds", data.needs, "Chưa ghi nhận.");
  setText("previewInformation", data.informationProvided, "Chưa ghi nhận.");
  setText("previewQuestions", data.openQuestions, "Chưa ghi nhận.");
  setText("previewCommunication", data.communicationPlan, "Chưa ghi nhận.");
}

function syncScreen(data = getActiveStakeholder()) {
  setFormData(data);
  renderStats();
  renderList();
  renderPreview(data || {});
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  setTimeout(() => toast.classList.remove("is-visible"), 2400);
}

document.querySelector("#newStakeholder").addEventListener("click", () => {
  const stakeholder = {
    stakeholderId: createId(),
    name: "",
    sourceType: "Con người",
    role: "SME",
    department: "",
    influence: "Trung bình",
    interest: "Trung bình",
    decisionPower: "Người cung cấp thông tin",
    engagementStrategy: "Cập nhật thường xuyên",
    needs: "",
    informationProvided: "",
    openQuestions: "",
    communicationPlan: "",
    risks: "",
    updatedAt: ""
  };
  stakeholders.unshift(stakeholder);
  activeId = stakeholder.stakeholderId;
  syncScreen(stakeholder);
  showToast("Đã tạo stakeholder mới.");
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
  const index = stakeholders.findIndex((item) => item.stakeholderId === data.stakeholderId);
  if (index >= 0) {
    stakeholders[index] = data;
  } else {
    stakeholders.unshift(data);
  }

  activeId = data.stakeholderId;
  saveStakeholders();
  syncScreen(data);
  showToast("Đã lưu stakeholder và nguồn thông tin.");
});

document.querySelector("#discardStakeholderChanges").addEventListener("click", () => {
  syncScreen(getActiveStakeholder());
  showToast("Đã hủy thay đổi chưa lưu.");
});

syncScreen();
