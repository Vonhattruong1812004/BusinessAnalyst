const CONFIRM_STORAGE_KEY = "la-ban-ba.stk3.confirm-records";
const RESPONSE_STORAGE_KEY = "la-ban-ba.stk1.question-responses";
const NEED_STORAGE_KEY = "la-ban-ba.stk2.business-needs";

const recordListEl = document.querySelector("#recordList");
const recordSectionListEl = document.querySelector("#recordSectionList");
const form = document.querySelector("#confirmForm");
const toast = document.querySelector("#stakeholderToast");

const seedRecords = [
  {
    recordId: "rec-risk-rule-summary",
    title: "Tổng hợp quy tắc phê duyệt khoản vay",
    workspace: "Cho vay số",
    topic: "Phê duyệt khoản vay trên 500M",
    status: "Chờ xác nhận",
    sections: [
      {
        id: "context",
        label: "Bối cảnh nghiệp vụ",
        content: "Khoản vay có giá trị cao cần được kiểm soát chặt hơn trước khi tự động duyệt."
      },
      {
        id: "problem",
        label: "Vấn đề hiện tại",
        content: "Ngưỡng chuyển cấp phê duyệt chưa được chuẩn hóa giữa các chi nhánh."
      },
      {
        id: "need",
        label: "Nhu cầu / mong muốn",
        content: "Hệ thống cần xác định hồ sơ nào bắt buộc phê duyệt cấp 2 và ghi nhận lý do."
      },
      {
        id: "rule",
        label: "Quy tắc nghiệp vụ",
        content: "Khoản vay trên 500M hoặc rủi ro cao phải chuyển phê duyệt cấp 2."
      },
      {
        id: "open",
        label: "Câu hỏi còn mở",
        content: "Cần xác minh thêm ai có quyền override và trường hợp nào được ngoại lệ."
      }
    ]
  },
  {
    recordId: "rec-missing-doc-summary",
    title: "Tổng hợp nhu cầu cảnh báo thiếu chứng từ",
    workspace: "Cho vay số",
    topic: "Bổ sung hồ sơ vay",
    status: "Chờ xác nhận",
    sections: [
      {
        id: "context",
        label: "Bối cảnh nghiệp vụ",
        content: "Nhân viên tín dụng thường phải kiểm tra thủ công nhiều nguồn để biết hồ sơ còn thiếu gì."
      },
      {
        id: "problem",
        label: "Vấn đề hiện tại",
        content: "Hồ sơ bị trả lại nhiều lần vì thiếu chứng từ nhưng cảnh báo hiện tại chưa đủ rõ."
      },
      {
        id: "need",
        label: "Nhu cầu / mong muốn",
        content: "Cần hiển thị danh sách chứng từ còn thiếu và hành động tiếp theo cho nhân viên."
      },
      {
        id: "impact",
        label: "Tác động",
        content: "Giảm thời gian xử lý hồ sơ và hạn chế làm phiền khách hàng nhiều lần."
      }
    ]
  }
];

let records = buildRecords();
let confirmations = loadCollection(CONFIRM_STORAGE_KEY, []);
let activeRecordId = records[0]?.recordId || "";

function loadCollection(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return [...fallback];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [...fallback];
  } catch {
    return [...fallback];
  }
}

function saveConfirmations() {
  localStorage.setItem(CONFIRM_STORAGE_KEY, JSON.stringify(confirmations));
}

function buildRecords() {
  const responses = loadCollection(RESPONSE_STORAGE_KEY, []);
  const needs = loadCollection(NEED_STORAGE_KEY, []);
  const generatedFromNeeds = needs
    .filter((need) => need.needName)
    .slice(0, 3)
    .map((need) => ({
      recordId: `rec-from-${need.needId}`,
      title: `BA ghi nhận: ${need.needName}`,
      workspace: "Cho vay số",
      topic: need.needCategory || "Nhu cầu nghiệp vụ",
      status: "Chờ xác nhận",
      sections: [
        { id: "problem", label: "Vấn đề hiện tại", content: need.currentProblem || "Chưa có mô tả vấn đề." },
        { id: "outcome", label: "Kết quả kỳ vọng", content: need.expectedOutcome || "Chưa có kết quả kỳ vọng." },
        { id: "reason", label: "Lý do quan trọng", content: need.businessReason || "Cần làm rõ thêm lý do quan trọng." },
        { id: "example", label: "Ví dụ thực tế", content: need.realExample || "Chưa có ví dụ minh chứng." }
      ]
    }));

  const generatedFromResponses = responses
    .filter((response) => response.status === "Đã phản hồi")
    .slice(0, 2)
    .map((response) => ({
      recordId: `rec-answer-${response.packId}`,
      title: "BA tổng hợp từ câu trả lời khai thác",
      workspace: "Cho vay số",
      topic: "Thông tin Stakeholder đã phản hồi",
      status: "Chờ xác nhận",
      sections: [
        { id: "summary", label: "Tóm tắt phản hồi", content: response.generalNote || "Stakeholder đã gửi phản hồi cho bộ câu hỏi." },
        { id: "evidence", label: "Minh chứng", content: response.attachment || "Chưa có minh chứng đính kèm." }
      ]
    }));

  const merged = [...generatedFromNeeds, ...generatedFromResponses, ...seedRecords];
  const unique = new Map();
  merged.forEach((record) => unique.set(record.recordId, record));
  return [...unique.values()];
}

function getActiveRecord() {
  return records.find((record) => record.recordId === activeRecordId) || records[0];
}

function getConfirmation(recordId) {
  let confirmation = confirmations.find((item) => item.recordId === recordId);
  if (!confirmation) {
    confirmation = {
      recordId,
      decision: "Đã xác nhận",
      feedback: "",
      evidence: "",
      sections: [],
      status: "Chờ xác nhận",
      updatedAt: ""
    };
    confirmations.push(confirmation);
  }
  return confirmation;
}

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

function setText(id, value) {
  document.querySelector(`#${id}`).textContent = value;
}

function sectionDecision(confirmation, sectionId) {
  const found = confirmation.sections.find((item) => item.sectionId === sectionId);
  return found?.decision || "Đúng";
}

function collectConfirmation(status = "Đang xem xét") {
  const record = getActiveRecord();
  const confirmation = getConfirmation(record.recordId);
  confirmation.decision = form.elements.decision.value;
  confirmation.feedback = form.elements.feedback.value.trim();
  confirmation.evidence = form.elements.evidence.value.trim();
  confirmation.status = status;
  confirmation.updatedAt = new Date().toISOString();
  confirmation.sections = [...recordSectionListEl.querySelectorAll(".record-section-card")].map((card) => ({
    sectionId: card.dataset.sectionId,
    decision: card.querySelector("[data-field='sectionDecision']").value
  }));

  saveConfirmations();
  return confirmation;
}

function calculateScore(confirmation, record) {
  const sectionCount = record.sections.length || 1;
  const reviewed = confirmation.sections.filter((item) => item.decision).length;
  const hasFeedback = Boolean(confirmation.feedback || confirmation.evidence);
  const decision = Boolean(confirmation.decision);
  const ready = reviewed === sectionCount && (confirmation.decision === "Đã xác nhận" || hasFeedback);

  return {
    score: Math.round(((reviewed / sectionCount) * 0.7 + (hasFeedback ? 0.15 : 0) + (decision ? 0.15 : 0)) * 100),
    reviewed,
    hasFeedback,
    decision,
    ready
  };
}

function markCheck(id, done) {
  document.querySelector(`#${id}`).classList.toggle("is-done", done);
}

function renderList() {
  recordListEl.innerHTML = records
    .map((record) => {
      const confirmation = getConfirmation(record.recordId);
      return `
        <button class="stakeholder-pack-card ${record.recordId === activeRecordId ? "is-active" : ""}" type="button" data-record-id="${record.recordId}">
          <span>${escapeHTML(confirmation.status || record.status)}</span>
          <strong>${escapeHTML(record.title)}</strong>
          <small>${escapeHTML(record.topic)} · ${record.sections.length} nhóm thông tin</small>
        </button>
      `;
    })
    .join("");

  setText("recordCount", `${records.length} bản`);
}

function renderSections(record, confirmation) {
  recordSectionListEl.innerHTML = record.sections
    .map((section, index) => `
      <article class="record-section-card" data-section-id="${escapeHTML(section.id)}">
        <div class="answer-card-head">
          <span>${String(index + 1).padStart(2, "0")}</span>
          <div>
            <strong>${escapeHTML(section.label)}</strong>
            <small>BA đã ghi nhận</small>
          </div>
        </div>
        <p>${escapeHTML(section.content)}</p>
        <label>
          <span>Đánh giá của Stakeholder</span>
          <select data-field="sectionDecision">
            ${["Đúng", "Cần chỉnh sửa", "Cần bổ sung", "Chưa chắc chắn"].map(
              (value) => `<option ${value === sectionDecision(confirmation, section.id) ? "selected" : ""}>${value}</option>`
            ).join("")}
          </select>
        </label>
      </article>
    `)
    .join("");
}

function updateSummary() {
  const record = getActiveRecord();
  const draft = {
    ...getConfirmation(record.recordId),
    decision: form.elements.decision.value,
    feedback: form.elements.feedback.value.trim(),
    evidence: form.elements.evidence.value.trim(),
    sections: [...recordSectionListEl.querySelectorAll(".record-section-card")].map((card) => ({
      sectionId: card.dataset.sectionId,
      decision: card.querySelector("[data-field='sectionDecision']").value
    }))
  };
  const result = calculateScore(draft, record);

  setText("confirmScore", `${result.score}%`);
  setText("confirmScoreText", result.ready ? "Có thể gửi xác nhận cho BA." : "Cần đánh giá đủ nhóm thông tin hoặc thêm phản hồi.");
  markCheck("checkDecision", result.decision);
  markCheck("checkSections", result.reviewed === record.sections.length);
  markCheck("checkFeedback", result.hasFeedback || draft.decision === "Đã xác nhận");
  markCheck("checkReady", result.ready);
}

function renderActiveRecord() {
  const record = getActiveRecord();
  const confirmation = getConfirmation(record.recordId);
  form.elements.decision.value = confirmation.decision || "Đã xác nhận";
  form.elements.feedback.value = confirmation.feedback || "";
  form.elements.evidence.value = confirmation.evidence || "";

  setText("activeRecordTitle", record.title);
  setText("activeRecordMeta", `${record.workspace} · ${record.topic}`);
  setText("recordTitle", record.title);
  setText("recordStatus", confirmation.status || record.status);
  setText("workspaceName", record.workspace);
  setText("recordTopic", record.topic);
  renderSections(record, confirmation);
  updateSummary();
}

function suggestFeedback() {
  const decision = form.elements.decision.value;
  if (form.elements.feedback.value.trim()) {
    showToast("Phản hồi hiện tại đã có nội dung.");
    return;
  }

  if (decision === "Đã xác nhận") {
    form.elements.feedback.value = "Tôi xác nhận nội dung BA ghi nhận phù hợp với thực tế nghiệp vụ hiện tại.";
  } else if (decision === "Cần BA chỉnh sửa") {
    form.elements.feedback.value = "Một số nội dung chưa chính xác. BA vui lòng điều chỉnh theo ghi chú ở các nhóm thông tin đã đánh dấu.";
  } else if (decision === "Cần bổ sung thông tin") {
    form.elements.feedback.value = "Cần bổ sung thêm thông tin hoặc minh chứng trước khi dùng nội dung này để phân tích yêu cầu.";
  } else {
    form.elements.feedback.value = "Tôi chưa chắc chắn về nội dung này. BA nên xác minh thêm với SME hoặc nguồn dữ liệu liên quan.";
  }

  updateSummary();
  showToast("Đã gợi ý phản hồi cho BA.");
}

recordListEl.addEventListener("click", (event) => {
  const card = event.target.closest("[data-record-id]");
  if (!card) return;
  collectConfirmation(getConfirmation(activeRecordId)?.status || "Đang xem xét");
  activeRecordId = card.dataset.recordId;
  render();
});

form.addEventListener("input", updateSummary);
form.addEventListener("change", updateSummary);
recordSectionListEl.addEventListener("change", updateSummary);

document.querySelector("#saveConfirmDraft").addEventListener("click", () => {
  collectConfirmation("Đang xem xét");
  render();
  showToast("Đã lưu nháp xác nhận.");
});

document.querySelector("#suggestFeedback").addEventListener("click", suggestFeedback);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const confirmation = collectConfirmation(form.elements.decision.value);
  render();
  showToast(`Đã gửi xác nhận cho BA: ${confirmation.decision}.`);
});

function render() {
  renderList();
  renderActiveRecord();
}

render();
