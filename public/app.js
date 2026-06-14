const state = {
  dashboard: null,
  activeView: "today",
  currentCardIndex: 0,
  answerVisible: false,
  searchText: ""
};

const mainPanel = document.querySelector("#mainPanel");
const summaryRail = document.querySelector("#summaryRail");
const todayTemplate = document.querySelector("#todayTemplate");
const searchInput = document.querySelector("#searchInput");

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

searchInput.addEventListener("input", () => {
  state.searchText = searchInput.value.trim().toLowerCase();
  render();
});

document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    searchInput.focus();
    return;
  }

  if (state.activeView !== "today") return;
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    revealAnswer();
  }

  if (["1", "2", "3"].includes(event.key) && state.answerVisible) {
    const grades = { 1: "known", 2: "fuzzy", 3: "unknown" };
    submitGrade(grades[event.key]);
  }
});

await loadDashboard();

async function loadDashboard() {
  state.dashboard = await api("/api/dashboard");
  render();
}

function switchView(view) {
  state.activeView = view;
  state.answerVisible = false;
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  render();
}

function render() {
  if (!state.dashboard) return;
  const views = {
    today: renderToday,
    review: renderReview,
    books: renderBooks,
    weak: renderWeak,
    stats: renderStats,
    settings: renderSettings
  };
  views[state.activeView]();
  renderSummary();
}

function renderToday() {
  const queue = filteredQueue();
  if (!queue.length) {
    mainPanel.innerHTML = `<section class="study-card"><h1>今日清空</h1><p class="empty-state">今天没有待学习单词。可以去词库导入新词，或在设置里提高每日新词目标。</p></section>`;
    return;
  }

  if (state.currentCardIndex >= queue.length) state.currentCardIndex = 0;
  const card = queue[state.currentCardIndex];
  const fragment = todayTemplate.content.cloneNode(true);
  mainPanel.replaceChildren(fragment);

  setText("#cardReason", reasonText(card.queueReason));
  setText("#wordText", card.word);
  setText("#phoneticText", card.phonetic || "暂无音标");
  setText("#partOfSpeech", card.partOfSpeech || "");
  setText("#meaningText", card.meaning || "暂无释义");
  setText("#exampleText", card.example || "暂无例句");
  setText("#exampleTranslation", card.exampleTranslation || "");
  setText("#etymologyText", card.etymology || "暂无词源信息");

  document.querySelector("#revealButton").addEventListener("click", revealAnswer);
  document.querySelector("#speakButton").addEventListener("click", () => speakWord(card.word));
  document.querySelectorAll("[data-grade]").forEach((button) => {
    button.addEventListener("click", () => submitGrade(button.dataset.grade));
  });

  updateAnswerVisibility();
}

function renderReview() {
  const queue = state.dashboard.queue;
  const reviewCount = queue.filter((item) => item.queueReason !== "new").length;
  const newCount = queue.filter((item) => item.queueReason === "new").length;
  const rows = queue.map((item) => `
    <tr>
      <td><strong>${escapeHtml(item.word)}</strong></td>
      <td>${escapeHtml(item.meaning)}</td>
      <td><span class="status-pill">${reasonText(item.queueReason)}</span></td>
      <td>${item.progress.dueDate}</td>
    </tr>
  `).join("");

  mainPanel.innerHTML = `
    <h1 class="page-title">复习计划</h1>
    <section class="panel-card">
      <h3>今日任务</h3>
      <div class="grid two-col">
        <div class="metric-row"><span>待复习单词</span><strong>${reviewCount}</strong></div>
        <div class="metric-row"><span>新增单词</span><strong>${newCount}</strong></div>
        <div class="metric-row"><span>预计用时</span><strong>${state.dashboard.estimateMinutes} 分钟</strong></div>
        <div class="metric-row"><span>复习策略</span><strong>到期优先</strong></div>
      </div>
    </section>
    <section class="panel-card" style="margin-top:18px">
      <h3>自动排序队列</h3>
      <table class="table">
        <thead><tr><th>单词</th><th>释义</th><th>原因</th><th>到期日</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="4">今日没有待复习内容</td></tr>`}</tbody>
      </table>
    </section>
  `;
}

function renderBooks() {
  const rows = state.dashboard.books.map((book) => `
    <tr>
      <td><strong>${escapeHtml(book.name)}</strong><br><small>${escapeHtml(book.description)}</small></td>
      <td>${book.total}</td>
      <td>${book.learned} (${book.progressRate}%)</td>
      <td><span class="status-pill">${book.type === "built-in" ? "内置" : "自定义"}</span></td>
    </tr>
  `).join("");

  mainPanel.innerHTML = `
    <h1 class="page-title">词库管理</h1>
    <section class="panel-card">
      <h3>当前词库</h3>
      <table class="table">
        <thead><tr><th>词库名称</th><th>单词总数</th><th>已学进度</th><th>类型</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </section>
    <section class="panel-card" style="margin-top:18px">
      <h3>导入词库</h3>
      <p>粘贴 JSON 数组，字段支持 word、phonetic、meaning、example、exampleTranslation、etymology。</p>
      <div class="form-grid">
        <label class="field">词库名称<input id="importBookName" value="我的自定义词库" /></label>
        <label class="field">JSON 内容<textarea id="importJson" placeholder='[{"word":"focus","meaning":"集中注意力"}]'></textarea></label>
        <button class="secondary" id="importButton">导入</button>
      </div>
    </section>
  `;

  document.querySelector("#importButton").addEventListener("click", importWords);
}

function renderWeak() {
  api("/api/weak-words").then(({ words }) => {
    const rows = words.map((item) => `
      <tr>
        <td><strong>${escapeHtml(item.word)}</strong><br><small>${escapeHtml(item.phonetic)}</small></td>
        <td>${escapeHtml(item.meaning)}</td>
        <td>${item.progress.mistakeCount}</td>
        <td>${item.progress.fuzzyCount}</td>
        <td>${item.progress.dueDate}</td>
      </tr>
    `).join("");

    mainPanel.innerHTML = `
      <h1 class="page-title">错词本</h1>
      <section class="panel-card">
        <h3>薄弱词优先训练</h3>
        <table class="table">
          <thead><tr><th>单词</th><th>中文意思</th><th>错误权重</th><th>模糊次数</th><th>下次复习</th></tr></thead>
          <tbody>${rows || `<tr><td colspan="5">还没有错词。学习时标记“模糊”或“不认识”后会自动加入这里。</td></tr>`}</tbody>
        </table>
      </section>
    `;
  });
}

function renderStats() {
  const stats = state.dashboard.stats;
  mainPanel.innerHTML = `
    <h1 class="page-title">学习统计</h1>
    <div class="grid two-col">
      ${statCard("总共已学单词", stats.learned, "个")}
      ${statCard("今日复习正确率", stats.accuracyToday, "%")}
      ${statCard("连续学习天数", stats.streakDays, "天")}
      ${statCard("薄弱词数量", stats.weak, "个")}
    </div>
    <section class="panel-card" style="margin-top:18px">
      <h3>学习热力图</h3>
      <div class="heatmap">
        ${stats.heatmap.map((day) => `<span class="heat-cell level-${heatLevel(day.count)}" title="${day.date}: ${day.count} 次"></span>`).join("")}
      </div>
    </section>
  `;
}

function renderSettings() {
  const settings = state.dashboard.settings;
  mainPanel.innerHTML = `
    <h1 class="page-title">设置</h1>
    <section class="panel-card">
      <h3>学习设置</h3>
      <div class="form-grid">
        <label class="field">每日新词目标<input id="newWordGoal" type="number" min="0" max="100" value="${settings.newWordGoal}" /></label>
        <label class="field">每日复习上限<input id="reviewLimit" type="number" min="1" max="300" value="${settings.reviewLimit}" /></label>
        <label class="field">提醒时间<input id="reminderTime" type="time" value="${settings.reminderTime}" /></label>
        <label class="field">发音偏好
          <select id="pronunciation">
            <option value="us" ${settings.pronunciation === "us" ? "selected" : ""}>美式发音</option>
            <option value="uk" ${settings.pronunciation === "uk" ? "selected" : ""}>英式发音</option>
          </select>
        </label>
        <button class="primary" id="saveSettings">保存设置</button>
      </div>
    </section>
    <section class="panel-card" style="margin-top:18px">
      <h3>数据备份</h3>
      <div class="button-row">
        <button class="secondary" id="exportButton">导出 JSON</button>
      </div>
    </section>
  `;

  document.querySelector("#saveSettings").addEventListener("click", saveSettings);
  document.querySelector("#exportButton").addEventListener("click", exportData);
}

function renderSummary() {
  const stats = state.dashboard.stats;
  const queue = state.dashboard.queue;
  const completedTarget = state.dashboard.settings.newWordGoal + Math.min(state.dashboard.settings.reviewLimit, stats.due);
  const pct = completedTarget ? Math.min(100, Math.round((stats.reviewedToday / completedTarget) * 100)) : 100;

  summaryRail.innerHTML = `
    <section class="rail-card">
      <h3>今日进度</h3>
      <div class="metric-ring" style="--pct:${pct}"><strong>${pct}%</strong></div>
      <div class="metric-list">
        <div class="metric-row"><span>今日已练</span><strong>${stats.reviewedToday}</strong></div>
        <div class="metric-row"><span>待处理队列</span><strong>${queue.length}</strong></div>
        <div class="metric-row"><span>预计还需</span><strong>${state.dashboard.estimateMinutes} 分钟</strong></div>
      </div>
    </section>
    <section class="rail-card">
      <h3>复习提醒</h3>
      <div class="metric-row"><span>建议完成时间</span><strong>${state.dashboard.settings.reminderTime}</strong></div>
      <p>按到期日和错误权重自动排序，先复习最容易忘的词。</p>
    </section>
    <section class="rail-card">
      <h3>今日方法</h3>
      <p>看见单词后先主动回忆，再揭示答案。不要因为“眼熟”就直接点认识。</p>
    </section>
  `;
}

function filteredQueue() {
  const queue = state.dashboard.queue;
  if (!state.searchText) return queue;
  return queue.filter((item) => {
    const text = `${item.word} ${item.meaning} ${item.example}`.toLowerCase();
    return text.includes(state.searchText);
  });
}

function revealAnswer() {
  if (state.activeView !== "today") return;
  state.answerVisible = true;
  updateAnswerVisibility();
}

function updateAnswerVisibility() {
  const answer = document.querySelector("#answerBlock");
  const actions = document.querySelector("#gradeActions");
  const reveal = document.querySelector("#revealButton");
  const hint = document.querySelector("#recallHint");
  if (!answer) return;
  answer.classList.toggle("hidden", !state.answerVisible);
  actions.classList.toggle("hidden", !state.answerVisible);
  reveal.classList.toggle("hidden", state.answerVisible);
  hint.textContent = state.answerVisible ? "根据刚才的真实回忆程度评分，系统会自动安排下次复习。" : "先在脑中回忆意思，再按 Enter 查看答案。";
}

async function submitGrade(grade) {
  const card = filteredQueue()[state.currentCardIndex];
  if (!card) return;
  state.dashboard = await api("/api/review", {
    method: "POST",
    body: JSON.stringify({ wordId: card.id, grade })
  });
  state.answerVisible = false;
  state.currentCardIndex = 0;
  render();
}

function speakWord(word) {
  if (!("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = state.dashboard.settings.pronunciation === "uk" ? "en-GB" : "en-US";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

async function saveSettings() {
  state.dashboard.settings = await api("/api/settings", {
    method: "POST",
    body: JSON.stringify({
      newWordGoal: Number(document.querySelector("#newWordGoal").value),
      reviewLimit: Number(document.querySelector("#reviewLimit").value),
      reminderTime: document.querySelector("#reminderTime").value,
      pronunciation: document.querySelector("#pronunciation").value
    })
  }).then((result) => result.settings);
  await loadDashboard();
}

async function importWords() {
  const bookName = document.querySelector("#importBookName").value.trim() || "我的自定义词库";
  const raw = document.querySelector("#importJson").value.trim();
  let words;
  try {
    words = JSON.parse(raw);
  } catch {
    alert("JSON 格式不正确");
    return;
  }

  await api("/api/import", {
    method: "POST",
    body: JSON.stringify({ bookName, words })
  });
  await loadDashboard();
  switchView("books");
}

async function exportData() {
  const data = await api("/api/export");
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `debei-words-backup-${state.dashboard.today}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

function statCard(label, value, unit) {
  return `
    <section class="panel-card">
      <span>${label}</span>
      <h2>${value}<small>${unit}</small></h2>
    </section>
  `;
}

function reasonText(reason) {
  return {
    new: "新词",
    weak: "薄弱词",
    due: "到期复习"
  }[reason] ?? "复习";
}

function heatLevel(count) {
  if (count >= 30) return 4;
  if (count >= 16) return 3;
  if (count >= 5) return 2;
  if (count > 0) return 1;
  return 0;
}

function setText(selector, value) {
  const node = document.querySelector(selector);
  if (node) node.textContent = value;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

