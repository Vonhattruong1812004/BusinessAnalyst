const TRACE_CHANGE_KEY = "la-ban-ba.uc8.trace-change";
const CHANGE_RESPONSE_KEY = "la-ban-ba.stk5.change-responses";

const changeListEl = document.querySelector("#changeList");
const impactListEl = document.querySelector("#impactList");
const form = document.querySelector("#changeResponseForm");
const toast = document.querySelector("#stakeholderToast");

const fallbackChanges = [
  {
    changeId: "cr-biometric-001",
    changeTitle: "Thêm bước xác minh sinh trắc học",
    changeSource: "Risk SME / Compliance",
    changeReason: "Giảm rủi ro gian lận trước khi phê duyệt khoản vay giá trị cao.",
    urgency: "Cao",
    impactScope: "Quy trình nghiệp vụ",
    approvalPath: "SME + PO xác nhận",
    decision: "Cần làm rõ",
    impactNote: "Cần kiểm tra tác động đến rule phê duyệt, trải nghiệm khách hàng, test case và SLA xử lý hồ sơ.",
    impactedRequirements: ["RULE-001 Khoản vay trên 500M cần phê duyệt cấp 2"]
  },
  {
    changeId: "cr-limit-segment-002",
    changeTitle: "Điều chỉnh hạn mức vay theo phân khúc khách hàng",
    changeSource: "Product Owner",
    changeReason: "Tối ưu phê duyệt theo nhóm khách hàng ưu tiên và giảm xử lý thủ công.",
    urgency: "Trung bình",
    impactScope: "Business rule + báo cáo",
    approvalPath: "PO + SME vận hành",
    decision: "Chờ phản hồi",
    impactNote: "Có thể ảnh hưởng đến rule hạn mức, thông báo khách hàng và báo cáo rủi ro.",
    impactedRequirements: ["FR-018 Cảnh báo hồ sơ thiếu chứng từ", "RULE-001 Rule phê duyệt cấp 2"]
  }
];

let changes = loadCollection(TRACE_CHANGE_KEY, fallbackChanges).map(normalizeChange);
let responses = loadCollection(CHANGE_RESPONSE_KEY, []);
let activeChangeId = changes[0]?.changeId || "";

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

function saveResponses() {
  localStorage.setItem(CHANGE_RESPONSE_KEY, JSON.stringify(responses));
}

function normalizeChange(change) {
  return {
    ...change,
    changeTitle: change.changeTitle || "Change Request chưa đặt tên",
    changeSource: change.changeSource || "BA",
    urgency: change.urgency || "Trung bình",
    impactScope: change.impactScope || "Chưa xác định",
    approvalPath: change.approvalPath || "BA xác nhận",
    impactedRequirements: Array.isArray(change.impactedRequirements) ? change.impactedRequirements : []
  };
}

function getActiveChange() {
  return changes.find((item) => item.changeId === activeChangeId) || changes[0];
}

function getResponse(changeId) {
  let response = responses.find((item) => item.changeId === changeId);
  if (!response) {
    response = {
      changeId,
      decision: "Đồng ý với thay đổi",
      businessImpact: "Trung bình",
      businessComment: "",
      conditionOrReason: "",
      status: "Chờ phản hồi",
      updatedAt: ""
    };
    responses.push(response);
  }
  return response;
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

function collectResponse(status = "Đang phản hồi") {
  const change = getActiveChange();
  const response = getResponse(change.changeId);
  response.decision = form.elements.changeDecision.value;
  response.businessImpact = form.elements.businessImpact.value;
  response.businessComment = form.elements.businessComment.value.trim();
  response.conditionOrReason = form.elements.conditionOrReason.value.trim();
  response.status = status;
  response.updatedAt = new Date().toISOString();
  saveResponses();
  return response;
}

function calculateScore(response) {
  const decision = Boolean(response.decision);
  const impact = Boolean(response.businessImpact);
  const comment = Boolean(response.businessComment);
  const needsCondition = response.decision !== "Đồng ý với thay đổi" || response.businessImpact === "Cao";
  const condition = !needsCondition || Boolean(response.conditionOrReason);
  const score = Math.round(([decision, impact, comment, condition].filter(Boolean).length / 4) * 100);
  return { decision, impact, comment, condition, needsCondition, score };
}

function markCheck(id, done) {
  document.querySelector(`#${id}`).classList.toggle("is-done", done);
}

function renderList() {
  changeListEl.innerHTML = changes
    .map((change) => {
      const response = getResponse(change.changeId);
      return `
        <button class="stakeholder-pack-card ${change.changeId === activeChangeId ? "is-active" : ""}" type="button" data-change-id="${escapeHTML(change.changeId)}">
          <span>${escapeHTML(response.status || change.decision || "Chờ phản hồi")}</span>
          <strong>${escapeHTML(change.changeTitle)}</strong>
          <small>${escapeHTML(change.urgency)} · ${escapeHTML(change.impactScope)}</small>
        </button>
      `;
    })
    .join("");

  setText("changeCount", `${changes.length} CR`);
}

function renderImpacts(change) {
  const impacts = change.impactedRequirements.length
    ? change.impactedRequirements
    : ["Chưa có requirement cụ thể được BA liên kết"];

  impactListEl.innerHTML = impacts
    .map((item, index) => `
      <article class="impact-chip">
        <span>${String(index + 1).padStart(2, "0")}</span>
        <strong>${escapeHTML(item)}</strong>
      </article>
    `)
    .join("");

  setText("impactCount", `${impacts.length} mục`);
}

function updateSummary() {
  const response = {
    decision: form.elements.changeDecision.value,
    businessImpact: form.elements.businessImpact.value,
    businessComment: form.elements.businessComment.value.trim(),
    conditionOrReason: form.elements.conditionOrReason.value.trim()
  };
  const result = calculateScore(response);

  setText("changeResponseScore", `${result.score}%`);
  setText("changeResponseText", result.score === 100 ? "Có thể gửi phản hồi cho BA." : "Cần bổ sung nhận xét hoặc điều kiện/lý do.");
  markCheck("checkChangeDecision", result.decision);
  markCheck("checkBusinessImpact", result.impact);
  markCheck("checkBusinessComment", result.comment);
  markCheck("checkCondition", result.condition);
}

function renderActiveChange() {
  const change = getActiveChange();
  const response = getResponse(change.changeId);

  form.elements.changeDecision.value = response.decision || "Đồng ý với thay đổi";
  form.elements.businessImpact.value = response.businessImpact || "Trung bình";
  form.elements.businessComment.value = response.businessComment || "";
  form.elements.conditionOrReason.value = response.conditionOrReason || "";

  setText("activeChangeTitle", change.changeTitle);
  setText("activeChangeMeta", `${change.urgency} · ${change.impactScope}`);
  setText("changeTitle", change.changeTitle);
  setText("changeStatus", response.status || change.decision || "Chờ phản hồi");
  setText("changeCode", change.changeId || "CR");
  setText("changeSource", change.changeSource);
  setText("changeUrgency", change.urgency);
  setText("changeReason", change.changeReason || "Chưa có lý do thay đổi.");
  setText("impactScope", change.impactScope);
  setText("approvalPath", change.approvalPath);
  setText("impactNote", change.impactNote || "BA chưa nhập impact note.");
  renderImpacts(change);
  updateSummary();
}

function suggestFeedback() {
  const decision = form.elements.changeDecision.value;
  const impact = form.elements.businessImpact.value;

  if (!form.elements.businessComment.value.trim()) {
    form.elements.businessComment.value = `Theo góc nhìn nghiệp vụ, thay đổi này có mức ảnh hưởng ${impact.toLowerCase()} đến quy trình, người dùng hoặc rule đang vận hành.`;
  }

  if (!form.elements.conditionOrReason.value.trim() && decision !== "Đồng ý với thay đổi") {
    if (decision === "Đồng ý có điều kiện") {
      form.elements.conditionOrReason.value = "Cần có kế hoạch truyền thông, kiểm thử nghiệp vụ và giai đoạn chuyển tiếp trước khi áp dụng chính thức.";
    } else if (decision === "Cần BA làm rõ") {
      form.elements.conditionOrReason.value = "Cần BA làm rõ phạm vi tác động, requirement bị ảnh hưởng và cách đo rủi ro vận hành.";
    } else {
      form.elements.conditionOrReason.value = "Tôi không đồng ý vì thay đổi hiện tại có thể ảnh hưởng đến quy trình hoặc quy tắc nghiệp vụ chưa được kiểm chứng đầy đủ.";
    }
  }

  updateSummary();
  showToast("Đã gợi ý phản hồi change request.");
}

changeListEl.addEventListener("click", (event) => {
  const card = event.target.closest("[data-change-id]");
  if (!card) return;
  collectResponse(getResponse(activeChangeId)?.status || "Đang phản hồi");
  activeChangeId = card.dataset.changeId;
  render();
});

form.addEventListener("input", updateSummary);
form.addEventListener("change", updateSummary);

document.querySelector("#saveChangeDraft").addEventListener("click", () => {
  collectResponse("Đang phản hồi");
  render();
  showToast("Đã lưu nháp phản hồi thay đổi.");
});

document.querySelector("#suggestChangeFeedback").addEventListener("click", suggestFeedback);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const response = collectResponse(form.elements.changeDecision.value);
  render();
  showToast(`Đã gửi phản hồi cho BA: ${response.decision}.`);
});

function render() {
  renderList();
  renderActiveChange();
}

render();
