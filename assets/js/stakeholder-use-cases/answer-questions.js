const QUESTION_PACK_KEY = "la-ban-ba.uc3.question-packs";
const RESPONSE_KEY = "la-ban-ba.stk1.question-responses";

const fallbackPacks = [
  {
    packId: "qp-risk-rule",
    packName: "Khai thác quy tắc rủi ro khoản vay",
    workspace: "Cho vay số",
    objective: "Xác định business rule",
    topic: "Điều kiện phê duyệt khoản vay trên 500M",
    elicitationType: "Workshop",
    questions: [
      {
        id: "q-rule-01",
        category: "Business rule",
        text: "Điều kiện nào khiến khoản vay bắt buộc phải chuyển sang phê duyệt cấp 2?",
        priority: "Cao"
      },
      {
        id: "q-data-01",
        category: "Dữ liệu",
        text: "Những dữ liệu nào bắt buộc phải có trước khi áp dụng rule phê duyệt?",
        priority: "Cao"
      },
      {
        id: "q-exception-01",
        category: "Ngoại lệ",
        text: "Trường hợp nào được phép override quyết định tự động?",
        priority: "Cao"
      },
      {
        id: "q-process-01",
        category: "Quy trình",
        text: "Ai là người chịu trách nhiệm xác nhận khi hồ sơ rơi vào vùng rủi ro cao?",
        priority: "Trung bình"
      }
    ]
  },
  {
    packId: "qp-credit-officer",
    packName: "Làm rõ hành trình nhân viên tín dụng",
    workspace: "Cho vay số",
    objective: "Khám phá pain point",
    topic: "Quy trình bổ sung hồ sơ",
    elicitationType: "Phỏng vấn 1-1",
    questions: [
      {
        id: "q-journey-01",
        category: "Quy trình",
        text: "Bước nào trong quy trình xử lý hồ sơ hiện tại thường bị chậm nhất?",
        priority: "Cao"
      },
      {
        id: "q-pain-01",
        category: "Vấn đề",
        text: "Nhân viên tín dụng thường gặp khó khăn gì khi yêu cầu khách hàng bổ sung hồ sơ?",
        priority: "Cao"
      },
      {
        id: "q-report-01",
        category: "Dữ liệu",
        text: "Thông tin nào cần hiển thị để nhân viên biết hồ sơ đang thiếu gì?",
        priority: "Trung bình"
      }
    ]
  }
];

const packListEl = document.querySelector("#packList");
const questionListEl = document.querySelector("#questionList");
const form = document.querySelector("#answerForm");
const toast = document.querySelector("#stakeholderToast");
const generalNote = document.querySelector("#generalNote");
const attachmentInput = document.querySelector("#attachmentInput");

let packs = loadCollection(QUESTION_PACK_KEY, fallbackPacks).map(normalizePack);
let responses = loadCollection(RESPONSE_KEY, []);
let activePackId = packs[0]?.packId || "";

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
  localStorage.setItem(RESPONSE_KEY, JSON.stringify(responses));
}

function normalizePack(pack) {
  return {
    ...pack,
    workspace: pack.workspaceName || pack.workspace || "Cho vay số",
    objective: pack.objective || "Làm rõ nhu cầu kinh doanh",
    questions: Array.isArray(pack.questions) ? pack.questions : []
  };
}

function getActivePack() {
  return packs.find((pack) => pack.packId === activePackId) || packs[0];
}

function getResponse(packId) {
  let response = responses.find((item) => item.packId === packId);
  if (!response) {
    response = {
      packId,
      status: "Chờ phản hồi",
      generalNote: "",
      attachment: "",
      answers: [],
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

function answerFor(response, questionId) {
  let answer = response.answers.find((item) => item.questionId === questionId);
  if (!answer) {
    answer = {
      questionId,
      status: "Trả lời",
      content: ""
    };
    response.answers.push(answer);
  }
  return answer;
}

function collectCurrentResponse(status = "Đang trả lời") {
  const pack = getActivePack();
  const response = getResponse(pack.packId);

  response.status = status;
  response.generalNote = generalNote.value.trim();
  response.attachment = attachmentInput.value.trim();
  response.updatedAt = new Date().toISOString();
  response.answers = [...questionListEl.querySelectorAll(".answer-card")].map((card) => ({
    questionId: card.dataset.questionId,
    status: card.querySelector("[data-field='status']").value,
    content: card.querySelector("[data-field='content']").value.trim()
  }));

  saveResponses();
  return response;
}

function calculateCompletion(response, pack) {
  const total = pack.questions.length || 1;
  const meaningful = response.answers.filter(
    (answer) => answer.content || answer.status === "Cần BA làm rõ" || answer.status === "Không thuộc phạm vi"
  ).length;
  const answered = response.answers.filter((answer) => answer.content).length;
  const clarify = response.answers.some((answer) => answer.status === "Cần BA làm rõ");
  const outOfScope = response.answers.some((answer) => answer.status === "Không thuộc phạm vi");
  const evidence = Boolean(response.generalNote || response.attachment);

  return {
    score: Math.round((meaningful / total) * 100),
    answered,
    clarify,
    outOfScope,
    evidence
  };
}

function markCheck(id, done) {
  document.querySelector(`#${id}`).classList.toggle("is-done", done);
}

function renderInbox() {
  packListEl.innerHTML = packs
    .map((pack) => {
      const response = getResponse(pack.packId);
      const completion = calculateCompletion(response, pack).score;
      return `
        <button class="stakeholder-pack-card ${pack.packId === activePackId ? "is-active" : ""}" type="button" data-pack-id="${pack.packId}">
          <span>${escapeHTML(response.status)}</span>
          <strong>${escapeHTML(pack.packName)}</strong>
          <small>${escapeHTML(pack.objective)} · ${completion}% hoàn tất</small>
        </button>
      `;
    })
    .join("");

  setText("inboxCount", `${packs.length} bộ`);
}

function renderQuestions(pack, response) {
  questionListEl.innerHTML = pack.questions
    .map((question, index) => {
      const answer = answerFor(response, question.id);
      return `
        <article class="answer-card" data-question-id="${escapeHTML(question.id)}">
          <div class="answer-card-head">
            <span>${String(index + 1).padStart(2, "0")}</span>
            <div>
              <strong>${escapeHTML(question.category || "Câu hỏi")}</strong>
              <small>Ưu tiên: ${escapeHTML(question.priority || "Trung bình")}</small>
            </div>
          </div>
          <p>${escapeHTML(question.text)}</p>
          <label>
            <span>Trạng thái câu trả lời</span>
            <select data-field="status">
              ${["Trả lời", "Cần BA làm rõ", "Không thuộc phạm vi"].map(
                (status) => `<option ${status === answer.status ? "selected" : ""}>${status}</option>`
              ).join("")}
            </select>
          </label>
          <label>
            <span>Nội dung phản hồi</span>
            <textarea data-field="content" rows="4" placeholder="Nhập câu trả lời nghiệp vụ, ví dụ thực tế, rule, ngoại lệ hoặc điều cần BA làm rõ.">${escapeHTML(answer.content)}</textarea>
          </label>
        </article>
      `;
    })
    .join("");
}

function renderActivePack() {
  const pack = getActivePack();
  const response = getResponse(pack.packId);
  const completion = calculateCompletion(response, pack);

  generalNote.value = response.generalNote || "";
  attachmentInput.value = response.attachment || "";

  setText("activePackTitle", pack.packName);
  setText("activePackMeta", `${pack.objective} · ${pack.elicitationType || "Khai thác"} · ${pack.questions.length} câu hỏi`);
  setText("formPackName", pack.packName);
  setText("responseState", response.status);
  setText("workspaceName", pack.workspace);
  setText("objectiveName", pack.objective);
  setText("questionCount", `${pack.questions.length} câu hỏi`);

  renderQuestions(pack, response);
  updateSummary();
}

function updateSummary() {
  const pack = getActivePack();
  const draftResponse = {
    ...getResponse(pack.packId),
    generalNote: generalNote.value.trim(),
    attachment: attachmentInput.value.trim(),
    answers: [...questionListEl.querySelectorAll(".answer-card")].map((card) => ({
      questionId: card.dataset.questionId,
      status: card.querySelector("[data-field='status']").value,
      content: card.querySelector("[data-field='content']").value.trim()
    }))
  };
  const completion = calculateCompletion(draftResponse, pack);

  setText("answerProgress", `${completion.score}% hoàn tất`);
  setText("completionScore", `${completion.score}%`);
  setText(
    "completionText",
    completion.score === 100
      ? "Đã đủ phản hồi để gửi BA."
      : "Còn câu hỏi cần trả lời hoặc đánh dấu trạng thái."
  );

  markCheck("checkAnswered", completion.answered > 0);
  markCheck("checkClarify", completion.clarify || completion.score === 100);
  markCheck("checkScope", completion.outOfScope || completion.score === 100);
  markCheck("checkEvidence", completion.evidence);
}

function polishAnswers() {
  [...questionListEl.querySelectorAll(".answer-card")].forEach((card) => {
    const textarea = card.querySelector("[data-field='content']");
    const status = card.querySelector("[data-field='status']").value;
    if (!textarea.value.trim() && status === "Cần BA làm rõ") {
      textarea.value = "Tôi cần BA giải thích rõ thêm phạm vi câu hỏi này trước khi xác nhận thông tin.";
    }
    if (!textarea.value.trim() && status === "Không thuộc phạm vi") {
      textarea.value = "Nội dung này không thuộc phạm vi trách nhiệm của tôi. BA nên xác minh với stakeholder phù hợp hơn.";
    }
  });
  updateSummary();
  showToast("Đã gợi ý diễn đạt cho các câu cần làm rõ.");
}

packListEl.addEventListener("click", (event) => {
  const card = event.target.closest("[data-pack-id]");
  if (!card) return;
  collectCurrentResponse();
  activePackId = card.dataset.packId;
  render();
});

form.addEventListener("input", updateSummary);
form.addEventListener("change", updateSummary);

document.querySelector("#saveDraft").addEventListener("click", () => {
  collectCurrentResponse("Đang trả lời");
  renderInbox();
  renderActivePack();
  showToast("Đã lưu nháp phản hồi.");
});

document.querySelector("#polishAnswers").addEventListener("click", polishAnswers);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const response = collectCurrentResponse("Đã phản hồi");
  renderInbox();
  renderActivePack();
  showToast(`Đã gửi phản hồi cho BA lúc ${new Date(response.updatedAt).toLocaleTimeString("vi-VN")}.`);
});

function render() {
  renderInbox();
  renderActivePack();
}

render();
