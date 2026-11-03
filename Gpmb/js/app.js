import { auth, db, firebaseReady } from './firebase.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {
  collection, doc, getDoc, getDocs, query, where, setDoc, deleteDoc,
  serverTimestamp, runTransaction
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import {
  PROVINCE, UNITS, SECTIONS, FIELDS, STATUS_OPTIONS, computed, formatNumber, formatPercent,
  toNumber, isoWeek, previousWeek, getUnitName, aggregateRows, normalizeRow,
  statusLabel, validateMetricRow, normalizeReportRowsForWrite
} from './data.js';

const $ = id => document.getElementById(id);
const state = {
  period: isoWeek(), unitId: 'ALL', section: 'gpmb', reports: new Map(),
  user: null, profile: null, editUnitId: null, editorDirty: false,
  loading: false, requestId: 0, toastTimer: null
};

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined && text !== null) node.textContent = String(text);
  if (className) node.className = className;
  return node;
}
function makeCell(tr, text, className) {
  const td = el('td', text, className);
  tr.appendChild(td);
  return td;
}
function option(select, value, label) {
  const item = el('option', label);
  item.value = value;
  select.appendChild(item);
}
function toast(message, type = 'info') {
  const node = $('toast');
  node.textContent = message;
  node.className = `notice${type === 'error' ? ' notice-error' : ''}`;
  node.hidden = false;
  if (state.toastTimer) clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => { node.hidden = true; }, 8500);
}
function errorMessage(error) {
  if (!navigator.onLine) return 'Không có kết nối mạng. Vui lòng kiểm tra Internet.';
  const code = error?.code ?? '';
  if (code === 'permission-denied') return 'Firestore từ chối quyền ghi. Kiểm tra đã Publish file firestore.rules V2.1 và quyền tài khoản.';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') return 'Email hoặc mật khẩu không đúng.';
  if (code === 'auth/too-many-requests') return 'Đăng nhập bị giới hạn tạm thời do nhiều lần thử. Vui lòng thử lại sau.';
  if (code === 'auth/invalid-email') return 'Địa chỉ email không hợp lệ.';
  if (code === 'auth/network-request-failed') return 'Không thể kết nối đến Firebase Authentication.';
  return error?.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
}
function hasEditorRights() {
  return state.user && state.profile?.active === true && ['admin', 'nhaplieu', 'nhaplieu_xa'].includes(state.profile.role);
}
function isAdmin() { return hasEditorRights() && state.profile.role === 'admin'; }
function canEdit(unitId) {
  if (!hasEditorRights()) return false;
  return state.profile.role !== 'nhaplieu_xa' || (unitId !== 'TINH' && unitId === state.profile.unitId);
}
function editableUnits() {
  return state.profile?.role === 'nhaplieu_xa'
    ? UNITS.filter(unit => unit.id === state.profile.unitId)
    : [PROVINCE, ...UNITS];
}
function currentReportRows() {
  if (state.unitId === 'ALL') {
    const reports = UNITS.map(unit => state.reports.get(unit.id)).filter(Boolean);
    return aggregateRows(reports);
  }
  return state.reports.get(state.unitId)?.rows ?? {};
}
function createNumberCell(tr, value, strong = false) {
  return makeCell(tr, formatNumber(value), strong ? 'value-strong' : '');
}
function statusCell(tr, status) {
  const td = makeCell(tr);
  const kind = status === 'da_hoan_thanh' ? ' completed'
    : status === 'dang_thuc_hien' ? ' in-progress'
      : status === 'chua_thuc_hien' ? ' missing' : ' unknown';
  td.appendChild(el('span', statusLabel(status), `status-pill${kind}`));
  return td;
}
function renderTable() {
  const section = SECTIONS[state.section];
  const rows = currentReportRows();
  $('sectionTitle').textContent = section.title;
  const body = $('metricsBody');
  body.replaceChildren();
  for (const metric of section.items) {
    const row = normalizeRow(rows[metric.id]);
    const derived = computed(row);
    const tr = el('tr');
    makeCell(tr, metric.number);
    makeCell(tr, metric.label, 'metric-name');
    makeCell(tr, metric.unit);
    createNumberCell(tr, toNumber(row.target));
    createNumberCell(tr, derived.completed);
    createNumberCell(tr, derived.remaining);
    const td = makeCell(tr, formatPercent(derived.percentage), 'value-strong');
    if (derived.percentage !== null) {
      const track = el('div', undefined, 'progress-track');
      const fill = el('div', undefined, 'progress-fill');
      fill.style.width = `${Math.min(100, Math.max(0, derived.percentage))}%`;
      track.appendChild(fill);
      td.appendChild(track);
    }
    statusCell(tr, row.status);
    const note = makeCell(tr, row.note?.trim() || '—', 'note-cell');
    note.title = row.note?.trim() || '';
    body.appendChild(tr);
  }
}
function statCard(label, value, description) {
  const card = el('article', undefined, 'stat-card');
  card.append(el('div', label, 'stat-label'), el('div', value, 'stat-number'), el('div', description, 'stat-caption'));
  return card;
}
function renderStats() {
  const section = SECTIONS[state.section];
  const rows = currentReportRows();
  const isAll = state.unitId === 'ALL';
  const report = state.reports.get(state.unitId);
  const count = isAll ? UNITS.filter(unit => state.reports.has(unit.id)).length : Number(!!report);
  const filled = section.items.filter(metric => {
    const row = rows[metric.id] && normalizeRow(rows[metric.id]);
    return row && (FIELDS.some(field => toNumber(row[field]) !== null) || !!row.status || !!row.note?.trim());
  }).length;
  const metric1 = section.items.find(item => item.id === section.keyMetrics[0]);
  const metric2 = section.items.find(item => item.id === section.keyMetrics[1]);
  const metric3 = section.items.find(item => item.id === section.keyMetrics[2]);
  const first = computed(rows[metric1.id]);
  const second = computed(rows[metric2.id]);
  const third = computed(rows[metric3.id]);
  const cards = [
    statCard('Đơn vị đã có báo cáo', isAll ? `${count}/10` : count ? 'Đã báo cáo' : 'Chưa có', isAll ? 'Trong 10 xã, phường' : getUnitName(state.unitId)),
    statCard('Chỉ tiêu đã cập nhật', `${filled}/${section.items.length}`, 'Chỉ tiêu có dữ liệu hoặc kiến nghị'),
    statCard(metric1.label, `${formatNumber(first.completed)} ${first.completed !== null ? metric1.unit : ''}`, 'Đã thực hiện lũy kế đến kỳ này'),
    statCard(metric2.label, `${formatNumber(second.completed)} ${second.completed !== null ? metric2.unit : ''}`, third.completed === null ? 'Theo báo cáo hiện có' : `${metric3.label}: ${formatNumber(third.completed)} ${metric3.unit}`)
  ];
  $('statsCards').replaceChildren(...cards);
  const scope = state.unitId === 'ALL' ? `Tổng hợp ${count}/10 xã, phường đã có báo cáo` : getUnitName(state.unitId);
  $('dataCoverage').textContent = `${scope} · Kỳ ${state.period} · ${filled}/${section.items.length} chỉ tiêu có thông tin`;
}
function renderOverview() {
  const visible = state.unitId === 'ALL';
  $('overviewCard').hidden = !visible;
  if (!visible) return;
  const section = SECTIONS[state.section];
  const [key1, key2] = section.keyMetrics;
  const metric1 = section.items.find(item => item.id === key1);
  const metric2 = section.items.find(item => item.id === key2);
  $('overviewTitle').textContent = `Tình hình từng xã, phường – ${section.shortTitle}`;
  const headerRow = el('tr');
  for (const title of ['STT', 'Xã, phường', 'Tình trạng báo cáo', `${metric1.label} (${metric1.unit})`, `${metric2.label} (${metric2.unit})`, 'Tiến độ chỉ tiêu đầu (%)']) {
    headerRow.appendChild(el('th', title));
  }
  $('overviewHead').replaceChildren(headerRow);
  const body = $('overviewBody');
  body.replaceChildren();
  UNITS.forEach((unit, index) => {
    const report = state.reports.get(unit.id);
    const row1 = report?.rows?.[key1] ?? {};
    const row2 = report?.rows?.[key2] ?? {};
    const first = computed(row1);
    const second = computed(row2);
    const percentage = first.percentage;
    const tr = el('tr');
    makeCell(tr, index + 1);
    makeCell(tr, unit.name);
    const status = makeCell(tr);
    status.appendChild(el('span', report ? 'Đã có báo cáo' : 'Chưa báo cáo', `status-pill${report ? '' : ' missing'}`));
    makeCell(tr, formatNumber(first.completed));
    makeCell(tr, formatNumber(second.completed));
    makeCell(tr, formatPercent(percentage));
    body.appendChild(tr);
  });
}
function renderDashboard() {
  $('gpmbTab').classList.toggle('active', state.section === 'gpmb');
  $('tdcTab').classList.toggle('active', state.section === 'tdc');
  $('gpmbTab').setAttribute('aria-selected', String(state.section === 'gpmb'));
  $('tdcTab').setAttribute('aria-selected', String(state.section === 'tdc'));
  renderStats();
  renderTable();
  renderOverview();
}
async function loadReports() {
  if (!firebaseReady) { renderDashboard(); return; }
  const requestId = ++state.requestId;
  const requestedPeriod = state.period;
  state.loading = true;
  $('refreshBtn').disabled = true;
  $('refreshBtn').textContent = 'Đang tải...';
  try {
    const results = await getDocs(query(collection(db, 'reports'), where('period', '==', requestedPeriod)));
    // Khi đổi tuần liên tiếp, bỏ kết quả của yêu cầu cũ đến muộn.
    if (requestId !== state.requestId) return;
    state.reports = new Map(results.docs.map(item => [item.data().unitId, item.data()]));
    renderDashboard();
  } catch (error) {
    if (requestId !== state.requestId) return;
    state.reports = new Map();
    renderDashboard();
    toast(`Không tải được số liệu: ${errorMessage(error)}`, 'error');
  } finally {
    if (requestId === state.requestId) {
      state.loading = false;
      $('refreshBtn').disabled = false;
      $('refreshBtn').textContent = '↻ Làm mới';
    }
  }
}

function refreshAuthUI() {
  const signedIn = !!state.user;
  $('loginBtn').hidden = signedIn;
  $('logoutBtn').hidden = !signedIn;
  $('editBtn').hidden = !hasEditorRights();
  $('adminPanelBtn').hidden = !isAdmin();
  $('deleteReportBtn').hidden = !isAdmin() || !state.editUnitId || !state.reports.has(state.editUnitId);
  const roleLabel = { admin: 'Quản trị viên', nhaplieu: 'Nhập liệu tỉnh và xã', nhaplieu_xa: 'Nhập liệu xã, phường' };
  $('authLabel').textContent = signedIn
    ? `${state.profile?.displayName || state.user.email} · ${hasEditorRights() ? roleLabel[state.profile.role] : 'Chưa được cấp quyền nhập liệu'}`
    : 'Khách truy cập · Chế độ xem';
  if (!hasEditorRights()) closeEditor(true);
  if (!isAdmin()) $('usersPanel').hidden = true;
}
function confirmDiscard() { return !state.editorDirty || window.confirm('Dữ liệu nhập chưa lưu. Anh có muốn bỏ những thay đổi này không?'); }
async function switchSection(section) {
  if (state.section === section || !confirmDiscard()) return;
  state.section = section;
  renderDashboard();
  if (!$('editorPanel').hidden) await renderEditorRows();
}
function closeEditor(force = false) {
  if (!force && !confirmDiscard()) return;
  $('editorPanel').hidden = true;
  state.editorDirty = false;
  state.editUnitId = null;
  $('deleteReportBtn').hidden = true;
}
async function openEditor() {
  if (!hasEditorRights()) return;
  const units = editableUnits();
  if (!units.length) { toast('Tài khoản chưa được gán đơn vị hợp lệ.', 'error'); return; }
  const selected = units.find(unit => unit.id === state.unitId);
  state.editUnitId = selected?.id ?? units[0].id;
  const input = $('editUnitSelect');
  input.replaceChildren();
  units.forEach(unit => option(input, unit.id, unit.name));
  input.value = state.editUnitId;
  $('editorPanel').hidden = false;
  $('deleteReportBtn').hidden = !isAdmin() || !state.reports.has(state.editUnitId);
  await renderEditorRows();
  $('editorPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function readInputRow(tr) {
  const result = {};
  for (const field of FIELDS) {
    const input = tr.querySelector(`[data-field="${field}"]`);
    const value = input.value.trim();
    result[field] = input.validity.badInput ? NaN : value === '' ? null : Number(value);
  }
  result.status = tr.querySelector('[data-field="status"]').value;
  result.note = tr.querySelector('[data-field="note"]').value.trim();
  return result;
}
function updatePreview(tr) {
  const row = readInputRow(tr);
  const result = computed(row);
  tr.querySelector('[data-computed="remaining"]').textContent = formatNumber(result.remaining);
  tr.querySelector('[data-computed="percentage"]').textContent = formatPercent(result.percentage);
  const metric = SECTIONS[state.section].items.find(item => item.id === tr.dataset.metric);
  const error = validateMetricRow(row, metric);
  tr.classList.toggle('invalid-row', !!error);
  const feedback = tr.querySelector('[data-feedback]');
  feedback.textContent = error ? error.replace(/^Chỉ tiêu [0-9]+ \([^)]+\): /, '') : '';
  feedback.hidden = !error;
  for (const field of FIELDS) {
    const input = tr.querySelector(`[data-field="${field}"]`);
    input.setAttribute('aria-invalid', String(!!error));
  }
}
async function renderEditorRows() {
  const unitId = state.editUnitId;
  const period = state.period;
  const sectionId = state.section;
  $('deleteReportBtn').hidden = !isAdmin() || !state.reports.has(unitId);
  const currentRows = state.reports.get(unitId)?.rows ?? {};
  const body = $('editRows');
  body.replaceChildren();
  $('editTitle').textContent = `${SECTIONS[sectionId].shortTitle} · ${period}`;
  $('lastWeekNote').textContent = 'Đang kiểm tra báo cáo tuần trước...';
  let previousRows = {};
  try {
    const prevPeriod = previousWeek(period);
    const prev = await getDoc(doc(db, 'reports', `${prevPeriod}_${unitId}`));
    previousRows = prev.exists() ? prev.data().rows ?? {} : {};
    $('lastWeekNote').textContent = prev.exists()
      ? `Có báo cáo tuần ${prevPeriod} để tham khảo. Dữ liệu gợi ý được phép sửa.`
      : `Chưa có báo cáo tuần ${prevPeriod}.`;
  } catch (error) {
    $('lastWeekNote').textContent = 'Không truy xuất được báo cáo tuần trước; anh vẫn có thể nhập trực tiếp.';
  }
  if (state.editUnitId !== unitId || state.period !== period || state.section !== sectionId || $('editorPanel').hidden) return;
  for (const metric of SECTIONS[sectionId].items) {
    const existing = currentRows[metric.id];
    const previous = previousRows[metric.id] ? normalizeRow(previousRows[metric.id]) : null;
    const values = existing ? normalizeRow(existing) : previous
      ? { ...previous, note: '' } : { target: null, completed: null, status: '', note: '' };
    const tr = el('tr');
    tr.dataset.metric = metric.id;
    makeCell(tr, metric.number);
    makeCell(tr, metric.label, 'metric-name');
    makeCell(tr, metric.unit);
    for (const field of FIELDS) {
      const td = makeCell(tr);
      const input = el('input');
      input.type = 'number';
      input.step = 'any';
      input.min = '0';
      input.max = '1000000000000';
      input.inputMode = 'decimal';
      input.dataset.field = field;
      input.setAttribute('aria-label', `${metric.label} - ${field === 'target' ? 'Tổng phải thực hiện' : 'Đã thực hiện'}`);
      input.value = values[field] === null || values[field] === undefined ? '' : String(values[field]);
      input.addEventListener('input', () => { state.editorDirty = true; updatePreview(tr); });
      td.appendChild(input);
    }
    for (const key of ['remaining', 'percentage']) {
      const cell = makeCell(tr, undefined, 'value-strong');
      cell.dataset.computed = key;
    }
    const statusTd = makeCell(tr);
    const select = el('select');
    select.dataset.field = 'status';
    select.setAttribute('aria-label', `Trạng thái - ${metric.label}`);
    option(select, '', '— Chọn trạng thái —');
    STATUS_OPTIONS.forEach(item => option(select, item.value, item.label));
    select.value = values.status;
    select.addEventListener('change', () => { state.editorDirty = true; updatePreview(tr); });
    statusTd.appendChild(select);
    const noteCell = makeCell(tr);
    const note = el('textarea');
    note.dataset.field = 'note';
    note.maxLength = 1500;
    note.value = values.note ?? '';
    note.setAttribute('aria-label', `Ghi chú - ${metric.label}`);
    note.addEventListener('input', () => { state.editorDirty = true; updatePreview(tr); });
    noteCell.appendChild(note);
    const feedback = el('p', '', 'row-error');
    feedback.dataset.feedback = '';
    feedback.hidden = true;
    noteCell.appendChild(feedback);
    body.appendChild(tr);
    updatePreview(tr);
  }
  state.editorDirty = false;
}
async function saveReport() {
  if (!canEdit(state.editUnitId)) { toast('Tài khoản không có quyền nhập liệu cho đơn vị này.', 'error'); return; }
  const unit = [PROVINCE, ...UNITS].find(item => item.id === state.editUnitId);
  if (!unit) { toast('Đơn vị không hợp lệ.', 'error'); return; }
  const rows = {};
  for (const tr of $('editRows').querySelectorAll('tr[data-metric]')) {
    const metric = SECTIONS[state.section].items.find(item => item.id === tr.dataset.metric);
    const row = readInputRow(tr);
    const error = validateMetricRow(row, metric);
    if (error) {
      updatePreview(tr);
      tr.querySelector('[data-field="note"]').closest('td').scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast(error, 'error');
      return;
    }
    // Chỉ gửi dòng có số liệu/trạng thái/ghi chú, không ghi 14 dòng rỗng.
    // Các dòng chưa nhập được xem là chưa có thông tin, không phải tiến độ 0%.
    if (row.target !== null || row.completed !== null || row.status !== '' || row.note.trim() !== '') {
      rows[metric.id] = row;
    }
  }
  const period = state.period;
  const reportId = `${period}_${unit.id}`;
  $('saveBtn').disabled = true;
  $('saveBtn').textContent = 'Đang lưu...';
  try {
    const target = doc(db, 'reports', reportId);
    await runTransaction(db, async transaction => {
      const snapshot = await transaction.get(target);
      // Giữ số liệu ở tab còn lại và chuyển định dạng V1 (nếu còn).
      const oldRows = snapshot.exists() ? normalizeReportRowsForWrite(snapshot.data().rows ?? {}) : {};
      // Thay toàn bộ dữ liệu của TAB đang nhập; giữ nguyên TAB còn lại.
      // Xóa dòng cũ khi người dùng xóa hết nội dung dòng đó.
      for (const metric of SECTIONS[state.section].items) delete oldRows[metric.id];
      const mergedRows = { ...oldRows, ...rows };
      if (!Object.keys(mergedRows).length) {
        throw new Error('Báo cáo chưa có chỉ tiêu hoặc ghi chú nào để lưu.');
      }
      transaction.set(target, {
        unitId: unit.id,
        unitName: unit.name,
        period,
        rows: mergedRows,
        updatedBy: state.user.uid,
        updatedAt: serverTimestamp()
      });
    });
    state.editorDirty = false;
    closeEditor(true);
    await loadReports();
    toast(`Đã lưu ${SECTIONS[state.section].shortTitle.toLowerCase()} của ${unit.name}, kỳ ${period}.`);
  } catch (error) {
    toast(`Không lưu được báo cáo: ${errorMessage(error)}`, 'error');
  } finally {
    $('saveBtn').disabled = false;
    $('saveBtn').textContent = 'Lưu báo cáo';
  }
}
async function deleteSelectedReport() {
  if (!isAdmin() || !state.editUnitId || !state.reports.has(state.editUnitId)) return;
  const unitName = getUnitName(state.editUnitId);
  if (!window.confirm(`XÓA TOÀN BỘ báo cáo (cả GPMB và tái định cư) của ${unitName}, kỳ ${state.period}? Thao tác này không thể hoàn tác.`)) return;
  try {
    await deleteDoc(doc(db, 'reports', `${state.period}_${state.editUnitId}`));
    closeEditor(true);
    await loadReports();
    toast(`Đã xóa báo cáo kỳ ${state.period} của ${unitName}.`);
  } catch (error) { toast(`Không thể xóa báo cáo: ${errorMessage(error)}`, 'error'); }
}
function csvCell(value) {
  const raw = String(value ?? '');
  // Không để nội dung ghi chú công khai trở thành công thức khi mở CSV trong Excel.
  const safe = typeof value === 'string' && /^[=+@\-\t\r]/.test(raw) ? `\'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}
function exportCsv() {
  const section = SECTIONS[state.section];
  const rows = currentReportRows();
  const headers = ['STT', 'Chỉ tiêu', 'Đơn vị', 'Tổng phải thực hiện', 'Đã thực hiện', 'Còn lại', '% Hoàn thành', 'Trạng thái', 'Khó khăn, vướng mắc, kiến nghị'];
  const data = section.items.map(metric => {
    const row = normalizeRow(rows[metric.id]);
    const result = computed(row);
    return [metric.number, metric.label, metric.unit, row.target ?? '', result.completed ?? '', result.remaining ?? '',
      result.percentage === null ? '' : Number(result.percentage.toFixed(2)), statusLabel(row.status) === '—' ? '' : statusLabel(row.status), row.note ?? ''];
  });
  const fileText = '\ufeff' + [headers, ...data].map(row => row.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([fileText], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = el('a');
  anchor.href = url;
  anchor.download = `Bao_cao_${state.section}_${state.unitId}_${state.period}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
function updateProfileUnitControl() {
  const role = $('profileRole').value;
  const select = $('profileUnit');
  if (role !== 'nhaplieu_xa') {
    select.replaceChildren();
    option(select, 'TINH', 'Không giới hạn theo xã');
    select.disabled = true;
  } else {
    const old = select.value;
    select.replaceChildren();
    UNITS.forEach(unit => option(select, unit.id, unit.name));
    if (UNITS.some(unit => unit.id === old)) select.value = old;
    select.disabled = false;
  }
}
async function renderProfiles() {
  if (!isAdmin()) return;
  const body = $('usersBody');
  body.replaceChildren();
  const loadingRow = el('tr');
  const loadingCell = makeCell(loadingRow, 'Đang tải danh sách phân quyền...');
  loadingCell.colSpan = 6;
  body.appendChild(loadingRow);
  try {
    const profiles = await getDocs(collection(db, 'users'));
    body.replaceChildren();
    for (const snapshot of profiles.docs) {
      const profile = snapshot.data();
      const tr = el('tr');
      const info = makeCell(tr);
      info.append(el('strong', profile.displayName ?? ''), el('div', profile.email ?? '', 'muted'));
      makeCell(tr, snapshot.id);
      makeCell(tr, profile.role ?? '');
      makeCell(tr, getUnitName(profile.unitId ?? ''));
      const tdStatus = makeCell(tr);
      tdStatus.appendChild(el('span', profile.active ? 'Hoạt động' : 'Tạm khóa', `status-pill${profile.active ? '' : ' missing'}`));
      const actions = makeCell(tr);
      const button = el('button', 'Sửa', 'btn btn-outline');
      button.type = 'button';
      button.addEventListener('click', () => {
        $('profileUid').value = snapshot.id;
        $('profileName').value = profile.displayName ?? '';
        $('profileEmail').value = profile.email ?? '';
        $('profileRole').value = profile.role ?? 'nhaplieu_xa';
        updateProfileUnitControl();
        if (profile.role === 'nhaplieu_xa') $('profileUnit').value = profile.unitId;
        $('profileActive').checked = profile.active === true;
        $('userForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      actions.appendChild(button);
      body.appendChild(tr);
    }
    if (profiles.empty) {
      const empty = el('tr');
      const cell = makeCell(empty, 'Chưa có tài khoản nào được phân quyền.');
      cell.colSpan = 6;
      body.appendChild(empty);
    }
  } catch (error) { toast(`Không tải được danh sách tài khoản: ${errorMessage(error)}`, 'error'); }
}
async function saveProfile(event) {
  event.preventDefault();
  if (!isAdmin()) { toast('Chỉ quản trị viên được phân quyền.', 'error'); return; }
  const uid = $('profileUid').value.trim();
  const role = $('profileRole').value;
  const unitId = role === 'nhaplieu_xa' ? $('profileUnit').value : 'TINH';
  if (!uid || uid.includes('/')) { toast('UID không hợp lệ.', 'error'); return; }
  if (role === 'nhaplieu_xa' && !UNITS.some(unit => unit.id === unitId)) {
    toast('Hãy chọn một xã hoặc phường.', 'error'); return;
  }
  if (uid === state.user.uid && (!$('profileActive').checked || role !== 'admin')) {
    if (!window.confirm('Anh đang thay đổi hoặc tắt quyền admin của chính mình. Tiếp tục?')) return;
  }
  try {
    await setDoc(doc(db, 'users', uid), {
      displayName: $('profileName').value.trim(),
      email: $('profileEmail').value.trim(),
      role,
      unitId,
      active: $('profileActive').checked,
      updatedAt: serverTimestamp()
    }, { merge: true });
    toast(`Đã lưu phân quyền cho UID ${uid}.`);
    $('userForm').reset();
    updateProfileUnitControl();
    await renderProfiles();
    if (uid === state.user.uid) {
      const self = await getDoc(doc(db, 'users', state.user.uid));
      state.profile = self.exists() ? self.data() : null;
      refreshAuthUI();
    }
  } catch (error) { toast(`Không thể lưu phân quyền: ${errorMessage(error)}`, 'error'); }
}
async function login(event) {
  event.preventDefault();
  const button = $('loginSubmitBtn');
  button.disabled = true;
  button.textContent = 'Đang đăng nhập...';
  $('loginError').hidden = true;
  try {
    await signInWithEmailAndPassword(auth, $('emailInput').value.trim(), $('passwordInput').value);
    $('loginDialog').close();
    $('passwordInput').value = '';
  } catch (error) {
    $('loginError').textContent = errorMessage(error);
    $('loginError').hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = 'Đăng nhập';
  }
}
function attachListeners() {
  const banner = $('siteBanner');
  const showBannerFallback = () => {
    banner.hidden = true;
    $('bannerFallback').hidden = false;
  };
  banner.addEventListener('error', showBannerFallback);
  // Ảnh có thể lỗi trước khi JS module hoàn thành tải.
  if (banner.complete && banner.naturalWidth === 0) showBannerFallback();
  $('gpmbTab').addEventListener('click', () => switchSection('gpmb'));
  $('tdcTab').addEventListener('click', () => switchSection('tdc'));
  $('refreshBtn').addEventListener('click', () => loadReports());
  $('exportBtn').addEventListener('click', exportCsv);
  $('weekSelect').addEventListener('change', async event => {
    if (!event.target.value) { event.target.value = state.period; return; }
    if (!confirmDiscard()) { event.target.value = state.period; return; }
    const requested = event.target.value;
    if (!/^\d{4}-W\d{2}$/.test(requested)) { toast('Tuần báo cáo không hợp lệ.', 'error'); return; }
    closeEditor(true);
    state.period = requested;
    await loadReports();
  });
  $('unitSelect').addEventListener('change', event => {
    if (!confirmDiscard()) { event.target.value = state.unitId; return; }
    closeEditor(true);
    state.unitId = event.target.value;
    renderDashboard();
  });
  $('loginBtn').addEventListener('click', () => { $('loginError').hidden = true; $('loginDialog').showModal(); });
  $('closeLoginBtn').addEventListener('click', () => $('loginDialog').close());
  $('loginForm').addEventListener('submit', login);
  $('logoutBtn').addEventListener('click', async () => {
    if (!confirmDiscard()) return;
    await signOut(auth);
    toast('Đã đăng xuất. Anh vẫn có thể xem dữ liệu công khai.');
  });
  $('editBtn').addEventListener('click', openEditor);
  $('closeEditorBtn').addEventListener('click', () => closeEditor());
  $('saveBtn').addEventListener('click', saveReport);
  $('deleteReportBtn').addEventListener('click', deleteSelectedReport);
  $('editUnitSelect').addEventListener('change', async event => {
    if (!confirmDiscard()) { event.target.value = state.editUnitId; return; }
    state.editUnitId = event.target.value;
    await renderEditorRows();
  });
  $('adminPanelBtn').addEventListener('click', async () => {
    $('usersPanel').hidden = false;
    await renderProfiles();
    $('usersPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('closeUsersBtn').addEventListener('click', () => { $('usersPanel').hidden = true; });
  $('userForm').addEventListener('submit', saveProfile);
  $('profileRole').addEventListener('change', updateProfileUnitControl);
}
function init() {
  $('weekSelect').value = state.period;
  option($('unitSelect'), 'ALL', 'Tất cả 10 xã, phường (tổng hợp)');
  option($('unitSelect'), PROVINCE.id, PROVINCE.name + ' (riêng)');
  UNITS.forEach(unit => option($('unitSelect'), unit.id, unit.name));
  updateProfileUnitControl();
  attachListeners();
  renderDashboard();
  if (!firebaseReady) {
    $('configAlert').hidden = false;
    $('loginBtn').disabled = true;
    return;
  }
  onAuthStateChanged(auth, async user => {
    state.user = user;
    state.profile = null;
    if (user) {
      try {
        const snapshot = await getDoc(doc(db, 'users', user.uid));
        state.profile = snapshot.exists() ? snapshot.data() : null;
      } catch (error) { toast(`Không đọc được phân quyền: ${errorMessage(error)}`, 'error'); }
    }
    refreshAuthUI();
  });
  loadReports();
}
init();
