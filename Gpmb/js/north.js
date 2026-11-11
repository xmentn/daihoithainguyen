// V4.2.0: Phân hệ Ban Quản lý phía Bắc, cô lập khỏi progress/history của 10 xã, phường.
import { db as fs } from "./firebase.js";
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  limit,
  runTransaction,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { NORTH_ROWS, NORTH_TASKS, NORTH_TASK_MAP } from "./north_data.js";

const state = {
  view: "overview",
  area: "project",
  group: "all",
  status: "all",
  search: "",
  items: {},
  logs: [],
  loading: true,
  error: "",
  historyError: "",
  selected: null,
  busy: false,
};
let context = null,
  unsubscribe = null,
  unsubscribeHistory = null;
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
const areas = {
  project: "DỰ ÁN THÀNH PHẦN 1",
  utility: "CÔNG TRÌNH HẠ TẦNG KỸ THUẬT",
};
const statuses = {
  chua_thuc_hien: "Chưa thực hiện",
  dang_thuc_hien: "Đang thực hiện",
  da_hoan_thanh: "Đã hoàn thành",
};
const isWriter = () => {
  const p = context?.getProfile();
  return (
    !!p?.active &&
    !!context?.getUser() &&
    (p.role === "admin" ||
      (p.role === "nhaplieu_ban" && p.unitId === "BAN_PHIA_BAC"))
  );
};
const isoToday = () => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date())
      .filter((x) => x.type !== "literal")
      .map((x) => [x.type, x.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
};
const dayNumber = (str) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str || "")) return null;
  const t = Date.parse(str + "T12:00:00Z");
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === str
    ? Math.floor(t / 86400000)
    : null;
};
export function northTiming(start, end, today = isoToday()) {
  const a = dayNumber(start),
    b = dayNumber(end),
    n = dayNumber(today);
  if (a === null || b === null || n === null || b < a) return null;
  const total = b - a + 1,
    elapsed = Math.min(total, Math.max(0, n - a + 1)),
    remain = b - n,
    percent = total ? Math.round((elapsed / total) * 1000) / 10 : 0;
  return {
    total,
    elapsed,
    remain,
    percent,
    warning: remain >= 0 && remain / total < 0.2,
    overdue: remain < 0,
  };
}
function rowOf(id) {
  const r = state.items[id];
  return r && !r.cleared ? r : null;
}
function details(id) {
  const r = rowOf(id),
    time = r ? northTiming(r.startDate, r.endDate) : null;
  return { r, time };
}
function statusTag(st) {
  return `<span class="north-badge ${st || "unknown"}">${esc(statuses[st] || "Chưa cập nhật")}</span>`;
}
function dueTag(r, t) {
  if (!r || !t || r.status === "da_hoan_thanh")
    return '<span class="north-muted">—</span>';
  if (t.overdue)
    return `<span class="north-badge overdue">Quá hạn ${-t.remain} ngày</span>`;
  if (t.warning)
    return `<span class="north-badge due">Sắp đến hạn · còn ${t.remain} ngày</span>`;
  return `<span class="north-muted">Còn ${t.remain} ngày</span>`;
}
function completeStats(area) {
  const rows = NORTH_TASKS.filter((x) => !area || x.area === area);
  let filled = 0,
    completed = 0,
    started = 0,
    notStarted = 0,
    due = 0,
    overdue = 0;
  for (const r of rows) {
    const { r: record, time } = details(r.id);
    if (!record) continue;
    filled++;
    if (record.status === "da_hoan_thanh") completed++;
    else if (record.status === "dang_thuc_hien") started++;
    else notStarted++;
    if (record.status !== "da_hoan_thanh" && time) {
      if (time.overdue) overdue++;
      else if (time.warning) due++;
    }
  }
  return {
    total: rows.length,
    filled,
    completed,
    started,
    notStarted,
    due,
    overdue,
    completion: rows.length
      ? Math.round((completed / rows.length) * 1000) / 10
      : 0,
  };
}
function kpi(label, value, caption, icon, style) {
  return `<article class="north-kpi ${style}"><span class="north-kpi-icon">${icon}</span><div><span>${esc(label)}</span><strong>${value}</strong><small>${esc(caption)}</small></div></article>`;
}
function northAlerts() {
  return NORTH_TASKS.map((task) => {
    const { r, time } = details(task.id);
    return { task, r, time };
  })
    .filter(
      (x) =>
        x.r &&
        x.r.status !== "da_hoan_thanh" &&
        x.time &&
        (x.time.warning || x.time.overdue),
    )
    .sort((a, b) => a.time.remain - b.time.remain);
}
function overview() {
  const total = completeStats(),
    one = completeStats("project"),
    two = completeStats("utility"),
    alerts = northAlerts();
  const summary = (area, s, icon) =>
    `<article class="north-summary"><header><span class="north-summary-icon">${icon}</span><div><h3>${esc(areas[area])}</h3><small>${s.total} đầu việc · ${s.filled} đã cập nhật</small></div><strong>${s.completion.toLocaleString("vi-VN")}%</strong></header><div class="north-track"><span style="width:${s.completion}%"></span></div><div class="north-summary-states"><span><b class="green">✓ ${s.completed}</b> hoàn thành</span><span><b class="blue">● ${s.started}</b> đang thực hiện</span><span><b class="slate">○ ${s.notStarted}</b> chưa thực hiện</span></div><button type="button" class="north-link" data-action="north-show-details" data-narea="${area}">Xem chi tiết →</button></article>`;
  return `<div class="north-kpis">${kpi("Tổng đầu việc", total.total, `${total.filled} đầu việc đã cập nhật`, "▤", "blue")}${kpi("Đang thực hiện", total.started, "Đầu việc đang triển khai", "⚙", "cyan")}${kpi("Đã hoàn thành", total.completed, `${total.completion}% tổng đầu việc`, "✓", "green")}${kpi("Sắp đến hạn", total.due + total.overdue, `${total.overdue} quá hạn`, "!", "orange")}</div>
 <div class="north-summaries">${summary("project", one, "▱")}${summary("utility", two, "♜")}</div>
 <div class="north-overview-bottom"><section class="panel north-warning-panel"><header class="north-panel-heading"><h3>⚠ Cảnh báo tiến độ</h3><button type="button" class="north-link" data-action="north-show-warnings">Xem tất cả →</button></header>${
   !alerts.length
     ? '<p class="north-empty">Chưa có đầu việc sắp đến hạn hoặc quá hạn. Cảnh báo sẽ xuất hiện khi có ngày kế hoạch và trạng thái chưa hoàn thành.</p>'
     : `<div class="north-table-wrap"><table class="north-table"><thead><tr><th>STT</th><th>Nội dung công việc</th><th>Nhóm</th><th>Trạng thái</th><th>Thời gian còn lại</th></tr></thead><tbody>${alerts
         .slice(0, 6)
         .map(
           (x, i) =>
             `<tr class="${x.time.overdue ? "north-overdue-row" : "north-due-row"}"><td>${i + 1}</td><td class="north-work">${esc(x.task.label)}</td><td>${esc(areas[x.task.area])}</td><td>${statusTag(x.r.status)}</td><td>${dueTag(x.r, x.time)}</td></tr>`,
         )
         .join("")}</tbody></table></div>`
 }</section>
 <div class="north-guide-col"><section class="panel"><h3>Phân loại trạng thái</h3><p>${statusTag("chua_thuc_hien")} Chưa bắt đầu hoặc chưa được xác nhận triển khai</p><p>${statusTag("dang_thuc_hien")} Đang triển khai</p><p>${statusTag("da_hoan_thanh")} Đã được xác nhận hoàn thành</p></section><section class="panel"><h3>Nguyên tắc cảnh báo</h3><p>Thời gian theo ngày lịch, tính cả ngày bắt đầu và ngày kết thúc.</p><p class="north-alert-explain">Chưa hoàn thành và còn dưới <strong>20%</strong> thời gian kế hoạch: <strong>đỏ, sắp đến hạn</strong>. Quá ngày kết thúc: <strong>quá hạn</strong>.</p></section></div></div>`;
}
function warningDetails() {
  const alerts = northAlerts();
  return `<section class="panel north-all-warnings"><div class="north-panel-heading"><h2>Cảnh báo thời hạn thực hiện</h2><span>${alerts.length} đầu việc cần lưu ý</span></div>${!alerts.length ? '<p class="north-empty">Chưa có đầu việc sắp đến hạn hoặc quá hạn.</p>' : `<div class="north-table-wrap"><table class="north-table"><thead><tr><th>STT</th><th>Nội dung công việc</th><th>Phần việc</th><th>Ngày kết thúc</th><th>Trạng thái</th><th>Cảnh báo</th>${isWriter() ? "<th></th>" : ""}</tr></thead><tbody>${alerts.map((x, i) => `<tr class="${x.time.overdue ? "north-overdue-row" : "north-due-row"}"><td>${i + 1}</td><td class="north-work">${esc(x.task.label)}</td><td>${esc(areas[x.task.area])}</td><td>${esc(x.r.endDate)}</td><td>${statusTag(x.r.status)}</td><td>${dueTag(x.r, x.time)}</td>${isWriter() ? `<td><button type="button" class="btn btn-soft" data-action="north-edit" data-task="${x.task.id}">Cập nhật</button></td>` : ""}</tr>`).join("")}</tbody></table></div>`}</section>`;
}
function filterTasks() {
  return NORTH_ROWS.filter(
    (item) =>
      item.area === state.area &&
      (item.kind !== "task" ||
        ((state.group === "all" || item.group === state.group) &&
          (state.status === "all" ||
            (rowOf(item.id)?.status || "chua_cap_nhat") === state.status) &&
          (!state.search ||
            `${item.label} ${item.code}`
              .toLowerCase()
              .includes(state.search.toLowerCase())))),
  );
}
function table() {
  const availableGroups =
    state.area === "utility"
      ? [
          { id: "II.1", label: "Di chuyển hệ thống điện" },
          { id: "II.2", label: "Di chuyển mạng cáp viễn thông" },
        ]
      : [{ id: "project_bcnckt", label: "Tất cả công việc" }];
  const records = filterTasks();
  const hasFilters =
    state.status !== "all" || state.search || state.group !== "all";
  return `<div class="north-filters"><label>Nhóm hạng mục<select data-north-select="group"><option value="all">Tất cả nhóm</option>${availableGroups.map((x) => `<option value="${x.id}" ${state.group === x.id ? "selected" : ""}>${esc(x.label)}</option>`).join("")}</select></label><label>Trạng thái<select data-north-select="status"><option value="all">Tất cả</option><option value="chua_cap_nhat" ${state.status === "chua_cap_nhat" ? "selected" : ""}>Chưa cập nhật</option>${Object.entries(
    statuses,
  )
    .map(
      ([key, label]) =>
        `<option value="${key}" ${state.status === key ? "selected" : ""}>${label}</option>`,
    )
    .join(
      "",
    )}</select></label><label class="north-search">Tìm kiếm đầu việc<input type="search" data-north-search placeholder="Tên công việc..." value="${esc(state.search)}"></label>${isWriter() ? '<button type="button" class="btn btn-primary" data-action="north-new">＋ Cập nhật đầu việc</button>' : ""}<button type="button" class="btn" data-action="north-export">⇩ Xuất CSV</button></div>
 <div class="north-table-wrap"><table class="north-table north-detail-table"><thead><tr><th>STT</th><th>Nội dung công việc</th><th>Đơn vị</th><th>Ngày bắt đầu</th><th>Ngày kết thúc</th><th>Tổng thời gian</th><th>Đã qua</th><th>Còn lại</th><th>Tỷ lệ thời gian</th><th>Trạng thái</th><th>Cảnh báo</th>${isWriter() ? "<th>Cập nhật</th>" : ""}</tr></thead><tbody>${
   records
     .filter((r) => !hasFilters || r.kind === "task")
     .map((r) => {
       if (r.kind !== "task")
         return `<tr class="north-group north-group-${r.kind}"><td>${esc(r.code)}</td><td colspan="${isWriter() ? 11 : 10}">${esc(r.label)}</td></tr>`;
       const { r: record, time } = details(r.id);
       return `<tr class="${record && record.status !== "da_hoan_thanh" && time?.overdue ? "north-overdue-row" : record && record.status !== "da_hoan_thanh" && time?.warning ? "north-due-row" : ""}"><td class="north-index">${esc(r.code === "-" ? "•" : r.code)}</td><td class="north-work">${esc(r.label)}</td><td>ngày</td><td>${esc(record?.startDate || "—")}</td><td>${esc(record?.endDate || "—")}</td><td>${time ? time.total + " ngày" : "—"}</td><td>${time ? time.elapsed + " ngày" : "—"}</td><td class="${time?.warning ? "north-red" : ""}">${time ? (time.overdue ? "Quá " + -time.remain + " ngày" : time.remain + " ngày") : "—"}</td><td>${time ? time.percent + "%" : "—"}</td><td>${record ? statusTag(record.status) : '<span class="north-badge unknown">Chưa cập nhật</span>'}</td><td>${dueTag(record, time)}</td>${isWriter() ? `<td><button type="button" class="btn btn-soft north-edit" data-action="north-edit" data-task="${r.id}">${record ? "Sửa" : "Nhập"}</button></td>` : ""}</tr>`;
     })
     .join("") ||
   `<tr><td colspan="12">Không có đầu việc phù hợp bộ lọc.</td></tr>`
 }</tbody></table></div>
 
 ${isWriter() ? northHistoryView() : ""}`;
}
function northHistoryView() {
  return `<section class="panel north-history"><h3>Nhật ký cập nhật của Ban Quản lý phía Bắc</h3>${state.historyError ? `<p class="north-red">${esc(state.historyError)}</p>` : ""}${
    !state.logs.length
      ? "<p>Chưa có nhật ký.</p>"
      : `<div class="north-log-list">${state.logs
          .slice(0, 12)
          .map((l) => {
            const item = NORTH_TASK_MAP[l.taskId];
            const d = l.at?.toDate
              ? l.at.toDate().toLocaleString("vi-VN")
              : "—";
            return `<div><strong>${esc(item?.label || l.taskId)}</strong><small>${esc(l.action === "clear" ? "Xóa dữ liệu" : l.action === "create" ? "Nhập mới" : "Cập nhật")} · ${esc(d)}</small></div>`;
          })
          .join("")}</div>`
  }</section>`;
}
function detailSidebar(s) {
  return `<aside class="north-detail-aside"><section class="panel"><h3>▤ Tổng hợp tiến độ</h3><p class="north-side-sub">${esc(areas[state.area])}</p><div class="north-side-stat"><span>▤ Tổng đầu việc</span><strong>${s.total}</strong></div><div class="north-side-stat green"><span>✓ Đã hoàn thành</span><strong>${s.completed}</strong></div><div class="north-side-stat blue"><span>⚙ Đang thực hiện</span><strong>${s.started}</strong></div><div class="north-side-stat red"><span>⚠ Sắp đến hạn / Quá hạn</span><strong>${s.due + s.overdue}</strong></div></section><section class="panel"><h3>Quy ước tính toán & cảnh báo</h3><p>Thời gian kế hoạch = Ngày kết thúc − Ngày bắt đầu + 1 (tính cả hai ngày).</p><p>Ngày đã qua là số ngày lịch đã trôi qua, tối đa bằng tổng thời gian kế hoạch.</p><p class="north-alert-explain">Nếu còn dưới <strong>20%</strong> tổng thời gian và chưa hoàn thành: cảnh báo <strong>đỏ</strong>. Nếu quá ngày kết thúc: <strong>Quá hạn</strong>.</p></section></aside>`;
}
function modal() {
  return `<dialog id="north-editor" class="north-editor"><form id="north-form"><div class="north-modal-head"><div><span>THÔNG TIN TIẾN ĐỘ</span><h2 id="north-editor-title">Cập nhật đầu việc</h2></div><button type="button" class="north-close" data-action="north-close" aria-label="Đóng">×</button></div><div class="north-modal-body"><label>Chọn đầu việc<select id="north-task" required>${NORTH_TASKS.map((r) => `<option value="${r.id}">${esc(r.area === "project" ? "I" : "II")} · ${esc(r.code)} ${esc(r.label)}</option>`).join("")}</select></label><div class="north-date-grid"><label>Ngày bắt đầu<input id="north-start" type="date"></label><label>Ngày kết thúc<input id="north-end" type="date"></label></div><label>Trạng thái<select id="north-status" required>${Object.entries(
    statuses,
  )
    .map(([id, title]) => `<option value="${id}">${esc(title)}</option>`)
    .join(
      "",
    )}</select></label><label>Khó khăn, vướng mắc, kiến nghị<textarea maxlength="1500" rows="3" id="north-note" placeholder="Nhập ghi chú (nếu có)"></textarea></label><div class="north-preview" id="north-preview">Chọn ngày để tính thời gian.</div></div><footer><button type="button" class="btn" data-action="north-close">Hủy bỏ</button><button type="button" class="btn btn-danger" id="north-clear" data-action="north-clear" hidden>Xóa dữ liệu</button><button type="submit" class="btn btn-primary" id="north-submit">Lưu kết quả</button></footer></form></dialog>`;
}
export function northRender() {
  const stats = completeStats(state.area);
  return `<section class="north-page"><div class="north-page-heading"><div class="north-title-group"><span class="north-title-icon" aria-hidden="true">▦</span><div><div class="eyebrow">BAN QUẢN LÝ PHÍA BẮC</div><h1>${state.view === "overview" ? "TỔNG QUAN BAN QUẢN LÝ PHÍA BẮC" : state.view === "detail" ? "CHI TIẾT TIẾN ĐỘ BAN QUẢN LÝ PHÍA BẮC" : "CẢNH BÁO TIẾN ĐỘ BAN QUẢN LÝ PHÍA BẮC"}</h1></div></div><div class="north-heading-actions"><button type="button" class="btn ${state.view === "overview" ? "btn-primary" : ""}" data-action="north-view" data-view="overview">Tổng quan</button><button type="button" class="btn ${state.view === "detail" ? "btn-primary" : ""}" data-action="north-view" data-view="detail">Chi tiết & cập nhật</button><button type="button" class="btn ${state.view === "alerts" ? "btn-primary" : ""}" data-action="north-view" data-view="alerts">Cảnh báo hạn</button></div></div>${state.loading ? '<p class="info-line">Đang tải dữ liệu Ban Quản lý phía Bắc…</p>' : ""}${state.error ? `<p class="demo-note">Lỗi đọc dữ liệu Ban Quản lý phía Bắc: ${esc(state.error)}</p>` : ""}<div class="north-tabs">${Object.entries(
    areas,
  )
    .map(
      ([id, title]) =>
        `<button type="button" class="north-tab ${state.area === id ? "active" : ""}" data-action="north-area" data-narea="${id}">${id === "project" ? "▱" : "♜"} &nbsp;${title}</button>`,
    )
    .join(
      "",
    )}</div>${state.view === "overview" ? overview() : state.view === "alerts" ? warningDetails() : `<div class="north-details-heading"><h2>${esc(areas[state.area])}</h2><div class="north-microstats"><span>${stats.total} đầu việc</span><span>${stats.completed} hoàn thành</span><span class="north-red">${stats.due + stats.overdue} cần lưu ý</span></div></div><div class="north-detail-layout"><div class="north-detail-primary">${table()}</div>${detailSidebar(stats)}</div>`}${isWriter() ? modal() : ""}</section>`;
}
function rerender() {
  context?.redraw();
}
function notify(message, tone = "info") {
  context?.toast(message, tone);
}
export function northInit(args) {
  context = args;
  unsubscribe?.();
  unsubscribe = onSnapshot(
    collection(fs, "north_progress"),
    (s) => {
      state.items = {};
      s.forEach((d) => {
        if (NORTH_TASK_MAP[d.id]) state.items[d.id] = d.data();
      });
      state.loading = false;
      state.error = "";
      if (!document.querySelector("#north-editor")?.open) rerender();
    },
    (e) => {
      state.error = e.message;
      state.loading = false;
      rerender();
    },
  );
}
export function northStartPrivate() {
  unsubscribeHistory?.();
  unsubscribeHistory = null;
  state.logs = [];
  state.historyError = "";
  if (!isWriter()) return;
  unsubscribeHistory = onSnapshot(
    query(collection(fs, "north_history"), orderBy("at", "desc"), limit(40)),
    (s) => {
      state.logs = s.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (!document.querySelector("#north-editor")?.open) rerender();
    },
    (e) => {
      state.historyError = e.message;
      rerender();
    },
  );
}
function openEditor(id) {
  if (!isWriter())
    return notify(
      "Bạn không được phân quyền nhập liệu Ban Quản lý phía Bắc.",
      "error",
    );
  let dlg = document.querySelector("#north-editor");
  if (!dlg) {
    rerender();
    dlg = document.querySelector("#north-editor");
  }
  if (!dlg) return;
  const task =
    NORTH_TASK_MAP[id] || NORTH_TASKS.find((x) => x.area === state.area);
  if (!task) return;
  state.selected = task.id;
  dlg.querySelector("#north-task").value = task.id;
  populateEditor(task.id);
  dlg.showModal();
}
function populateEditor(id) {
  state.selected = id;
  const dlg = document.querySelector("#north-editor");
  if (!dlg) return;
  const task = NORTH_TASK_MAP[id];
  if (!task) return;
  const r = rowOf(id);
  dlg.querySelector("#north-editor-title").textContent = task.label;
  dlg.querySelector("#north-start").value = r?.startDate || "";
  dlg.querySelector("#north-end").value = r?.endDate || "";
  dlg.querySelector("#north-status").value = r?.status || "chua_thuc_hien";
  dlg.querySelector("#north-note").value = r?.note || "";
  dlg.querySelector("#north-clear").hidden = !r;
  updatePreview();
}
function updatePreview() {
  const dlg = document.querySelector("#north-editor");
  if (!dlg) return;
  const t = northTiming(
    dlg.querySelector("#north-start").value,
    dlg.querySelector("#north-end").value,
  );
  const info = dlg.querySelector("#north-preview");
  info.textContent = t
    ? `Tổng thời gian: ${t.total} ngày · Đã qua: ${t.elapsed} ngày · ${t.overdue ? "Quá hạn: " + -t.remain + " ngày" : "Còn: " + t.remain + " ngày"} · ${t.percent}% thời gian đã qua${t.warning ? " · SẮP ĐẾN HẠN" : ""}`
    : "Chưa có ngày kế hoạch. Có thể để trống hai ngày nếu trạng thái Chưa thực hiện.";
  info.classList.toggle("north-preview-alert", !!(t?.overdue || t?.warning));
}
export function northHandleAction(el) {
  const a = el.dataset.action;
  if (!a?.startsWith("north-")) return false;
  if (a === "north-view") {
    state.view = ["overview", "detail", "alerts"].includes(el.dataset.view)
      ? el.dataset.view
      : "overview";
    rerender();
  } else if (a === "north-area") {
    state.area = el.dataset.narea === "utility" ? "utility" : "project";
    state.view = "detail";
    state.group = "all";
    state.search = "";
    state.status = "all";
    rerender();
  } else if (a === "north-show-details") {
    state.view = "detail";
    state.area = el.dataset.narea;
    state.group = "all";
    state.status = "all";
    state.search = "";
    rerender();
  } else if (a === "north-show-warnings") {
    state.view = "alerts";
    rerender();
  } else if (a === "north-new") {
    openEditor(NORTH_TASKS.find((t) => t.area === state.area)?.id);
  } else if (a === "north-edit") {
    openEditor(el.dataset.task);
  } else if (a === "north-close") {
    document.querySelector("#north-editor")?.close();
  } else if (a === "north-clear") {
    clearTask();
  } else if (a === "north-export") {
    exportNorth();
  }
  return true;
}
export function northHandleChange(el) {
  if (el.matches("[data-north-select]")) {
    state[el.dataset.northSelect] = el.value;
    rerender();
    return true;
  }
  if (el.id === "north-task") {
    populateEditor(el.value);
    return true;
  }
  if (el.id === "north-start" || el.id === "north-end") {
    updatePreview();
    return true;
  }
  return false;
}
export function northHandleInput(el) {
  if (el.dataset.northSearch !== undefined) {
    state.search = el.value; // Filter after each search; keep focus/caret
    const begin = el.selectionStart;
    rerender();
    const replacement = document.querySelector("[data-north-search]");
    replacement?.focus();
    try {
      replacement?.setSelectionRange(begin, begin);
    } catch {}
    return true;
  }
  if (el.id === "north-start" || el.id === "north-end") {
    updatePreview();
    return true;
  }
  return false;
}
function checkForm(form) {
  const start = form.querySelector("#north-start").value,
    end = form.querySelector("#north-end").value,
    status = form.querySelector("#north-status").value,
    note = form.querySelector("#north-note").value.trim();
  const t = northTiming(start, end);
  if (!statuses[status]) throw Error("Trạng thái không hợp lệ.");
  if (!t && !(start === "" && end === "" && status === "chua_thuc_hien"))
    throw Error(
      "Cần nhập đủ hai ngày hợp lệ (hoặc để trống cả hai khi Chưa thực hiện); ngày kết thúc không được trước ngày bắt đầu.",
    );
  if (note.length > 1500) throw Error("Ghi chú tối đa 1.500 ký tự.");
  return { startDate: start, endDate: end, status, note, cleared: false };
}
async function writeTask(id, newRow, action) {
  if (!isWriter() || !context?.getUser()?.uid)
    throw Error("Không có quyền ghi dữ liệu Ban Quản lý phía Bắc.");
  if (!NORTH_TASK_MAP[id]) throw Error("Đầu việc không tồn tại trong Sheet 2.");
  const ref = doc(fs, "north_progress", id),
    logRef = doc(collection(fs, "north_history")),
    uid = context.getUser().uid;
  await runTransaction(fs, async (tx) => {
    const previous = await tx.get(ref);
    const old = previous.exists() ? previous.data() : null;
    const shown = state.items[id];
    const oldStamp = old?.updatedAt?.toMillis?.() || 0,
      shownStamp = shown?.updatedAt?.toMillis?.() || 0;
    if (oldStamp !== shownStamp)
      throw Error(
        "Đầu việc đã được cập nhật ở nơi khác. Hãy tải lại trang trước khi lưu.",
      );
    if (action === "clear" && !old)
      throw Error("Đầu việc chưa có dữ liệu để xóa.");
    const row = {
      taskId: id,
      ...newRow,
      updatedAt: serverTimestamp(),
      updatedBy: uid,
      lastHistoryId: logRef.id,
    };
    tx.set(ref, row);
    tx.set(logRef, {
      taskId: id,
      action,
      before: old
        ? {
            startDate: old.startDate,
            endDate: old.endDate,
            status: old.status,
            note: old.note,
            cleared: !!old.cleared,
          }
        : {},
      after: {
        startDate: newRow.startDate,
        endDate: newRow.endDate,
        status: newRow.status,
        note: newRow.note,
        cleared: !!newRow.cleared,
      },
      createdBy: uid,
      at: serverTimestamp(),
    });
  });
}
export async function northHandleSubmit(form) {
  if (form.id !== "north-form") return false;
  if (state.busy) return true;
  const id = state.selected;
  if (!id || !isWriter()) return true;
  let row;
  try {
    row = checkForm(form);
  } catch (e) {
    notify(e.message, "warning");
    return true;
  }
  const old = rowOf(id);
  if (
    old &&
    old.startDate === row.startDate &&
    old.endDate === row.endDate &&
    old.status === row.status &&
    old.note === row.note
  ) {
    notify("Không có thay đổi cần lưu.", "info");
    return true;
  }
  const yes = await context.confirm({
    title: "Xác nhận lưu tiến độ",
    message: "Cập nhật dữ liệu Ban Quản lý phía Bắc và ghi nhật ký?",
    details: `Đầu việc: ${NORTH_TASK_MAP[id].label}\nNgày bắt đầu: ${row.startDate}\nNgày kết thúc: ${row.endDate}\nTrạng thái: ${statuses[row.status]}`,
    accept: "Lưu tiến độ",
  });
  if (!yes) return true;
  state.busy = true;
  try {
    await writeTask(id, row, old ? "update" : "create");
    document.querySelector("#north-editor")?.close();
    notify("Đã lưu tiến độ và nhật ký của Ban Quản lý phía Bắc.", "success");
    rerender();
  } catch (e) {
    console.error(e);
    notify(`Không thể lưu: ${e.message}`, "error");
  } finally {
    state.busy = false;
  }
  return true;
}
async function clearTask() {
  if (state.busy || !isWriter() || !state.selected || !rowOf(state.selected))
    return;
  const id = state.selected;
  const yes = await context.confirm({
    title: "Xác nhận xóa dữ liệu đầu việc",
    message:
      "Đầu việc sẽ trở lại trạng thái chưa có dữ liệu. Nhật ký vẫn được giữ.",
    details: NORTH_TASK_MAP[id]?.label,
    accept: "Xóa dữ liệu",
    tone: "warning",
  });
  if (!yes) return;
  state.busy = true;
  try {
    await writeTask(
      id,
      {
        startDate: "",
        endDate: "",
        status: "chua_thuc_hien",
        note: "",
        cleared: true,
      },
      "clear",
    );
    document.querySelector("#north-editor")?.close();
    notify(
      "Đã xóa dữ liệu hiện hành của đầu việc; nhật ký vẫn được giữ.",
      "success",
    );
    rerender();
  } catch (e) {
    console.error(e);
    notify(`Không thể xóa: ${e.message}`, "error");
  } finally {
    state.busy = false;
  }
}
function csv(v) {
  let s = String(v ?? "");
  if (/^[\s]*[=+@\-\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}
function exportNorth() {
  const headers = [
    "Dòng Excel",
    "Phần việc",
    "Mã",
    "Nội dung công việc",
    "Đơn vị",
    "Ngày bắt đầu",
    "Ngày kết thúc",
    "Tổng số ngày",
    "Đã qua (ngày)",
    "Còn lại (ngày)",
    "Tỷ lệ thời gian (%)",
    "Trạng thái",
    "Cảnh báo",
    "Ghi chú",
  ];
  const data = NORTH_TASKS.map((t) => {
    const { r, time } = details(t.id);
    return [
      t.excelRow,
      areas[t.area],
      t.code,
      t.label,
      "ngày",
      r?.startDate || "",
      r?.endDate || "",
      time?.total ?? "",
      time?.elapsed ?? "",
      time?.remain ?? "",
      time?.percent ?? "",
      r ? statuses[r.status] : "Chưa cập nhật",
      r?.status === "da_hoan_thanh"
        ? ""
        : time?.overdue
          ? "Quá hạn"
          : time?.warning
            ? "Sắp đến hạn"
            : "",
      r?.note || "",
    ];
  });
  const csvText =
    "\ufeffsep=;\r\n" +
    [headers, ...data].map((r) => r.map(csv).join(";")).join("\r\n");
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = "Ban_Quan_Ly_Phia_Bac_Tien_Do.csv";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify("Đã xuất báo cáo tiến độ Ban Quản lý phía Bắc.", "success");
}
