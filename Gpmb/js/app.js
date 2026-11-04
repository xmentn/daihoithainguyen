import { auth, db, firebaseReady } from './firebase.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { collection, doc, getDoc, getDocs, setDoc, serverTimestamp, runTransaction, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import {
  UNITS, SECTIONS, FIELDS, STATUS_OPTIONS, computed, formatNumber, formatPercent,
  toNumber, getUnitName, aggregateRows, normalizeRow, statusLabel,
  validateMetricRow, hasRowContent, comparableRow, formatUpdatedAt, asDate
} from './data.js?v=3.1.0';

// V3.1: app.js va data.js duoc dong bo; query version ngan cache JavaScript cu.
const $ = id => document.getElementById(id);
const state = {
  unitId: 'ALL', section: 'gpmb', reports: new Map(),
  user: null, profile: null, editUnitId: null, editorDirty: false,
  baseline: {}, loading: false, toastTimer: null, unsubscribe: null
};
function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined && text !== null) node.textContent = String(text);
  if (className) node.className = className;
  return node;
}
function makeCell(tr, value, className) { const cell=el('td',value,className); tr.appendChild(cell); return cell; }
function option(select, value, label) { const o=el('option',label); o.value=value; select.appendChild(o); }
function toast(message, type='info') {
  const node=$('toast'); node.textContent=message;
  node.className=`notice${type==='error'?' notice-error':''}`; node.hidden=false;
  clearTimeout(state.toastTimer);
  state.toastTimer=setTimeout(()=>{node.hidden=true;},9000);
}
function errorMessage(err) {
  if (!navigator.onLine) return 'Không có kết nối Internet.';
  if (err?.code==='permission-denied') return 'Firestore từ chối ghi. Kiểm tra đã Publish firestore.rules V3 và quyền đơn vị.';
  if (['auth/invalid-credential','auth/wrong-password','auth/user-not-found'].includes(err?.code)) return 'Email hoặc mật khẩu không đúng.';
  if (err?.code==='auth/too-many-requests') return 'Đăng nhập đang bị giới hạn do thử nhiều lần.';
  return err?.message || 'Không thể hoàn thành thao tác.';
}
function hasEditorRights() { return !!state.user && state.profile?.active===true && ['admin','nhaplieu','nhaplieu_xa'].includes(state.profile.role); }
function isAdmin() { return hasEditorRights() && state.profile.role==='admin'; }
function canEdit(id) {
  return hasEditorRights() && UNITS.some(u=>u.id===id) &&
    (state.profile.role!=='nhaplieu_xa' || state.profile.unitId===id);
}
function editableUnits() {
  return state.profile?.role==='nhaplieu_xa' ? UNITS.filter(u=>u.id===state.profile.unitId) : UNITS;
}
function currentReportRows() {
  if (state.unitId!=='ALL') return state.reports.get(state.unitId)?.rows ?? {};
  return aggregateRows(UNITS.map(u=>state.reports.get(u.id)).filter(Boolean));
}
function latestTimeForSection(report, section=state.section) {
  const times=SECTIONS[section].items.map(m=>asDate(report?.rows?.[m.id]?.updatedAt)).filter(Boolean);
  return times.length ? new Date(Math.max(...times.map(d=>d.getTime()))) : null;
}
function hasSectionRows(report, section=state.section) {
  return SECTIONS[section].items.some(m=>hasRowContent(report?.rows?.[m.id]));
}
function statusCell(tr, status, labelOverride) {
  const cell=makeCell(tr);
  const kind=status==='da_hoan_thanh'?' completed':status==='dang_thuc_hien'?' in-progress':status==='chua_thuc_hien'?' missing':' unknown';
  cell.appendChild(el('span', labelOverride || statusLabel(status),`status-pill${kind}`));
  return cell;
}
function renderTable() {
  const section=SECTIONS[state.section]; const rows=currentReportRows();
  $('sectionTitle').textContent=section.title;
  $('metricsBody').replaceChildren();
  for (const metric of section.items) {
    const row=normalizeRow(rows[metric.id]); const calc=computed(row); const tr=el('tr');
    makeCell(tr,metric.number); makeCell(tr,metric.label,'metric-name'); makeCell(tr,metric.unit);
    makeCell(tr,formatNumber(toNumber(row.target)));
    makeCell(tr,formatNumber(calc.completed));
    makeCell(tr,formatNumber(calc.remaining),'value-strong');
    const td=makeCell(tr,formatPercent(calc.percentage),'value-strong');
    if (calc.percentage!==null) {
      const track=el('div',undefined,'progress-track'); const fill=el('div',undefined,'progress-fill');
      fill.style.width=`${Math.min(100,Math.max(0,calc.percentage))}%`;
      track.appendChild(fill); td.appendChild(track);
    }
    const aggregate=state.unitId==='ALL';
    const insufficient=aggregate && row.coverage!==undefined && row.coverage!==UNITS.length;
    statusCell(tr,row.status,insufficient?`Chưa đủ dữ liệu (${row.coverage}/10)`:null);
    const notes=makeCell(tr,row.note?.trim()||'—','note-cell'); notes.title=row.note?.trim()||'';
    const updateCell=makeCell(tr,formatUpdatedAt(row.updatedAt),'update-cell');
    if (aggregate && row.coverage!==undefined) {
      updateCell.appendChild(el('small',`${row.coverage}/10 xã có số liệu`,'coverage-caption'));
      updateCell.title='Lần cập nhật gần nhất của chỉ tiêu trong số 10 xã, phường';
    }
    $('metricsBody').appendChild(tr);
  }
}
function statCard(label,value,caption) {
  const card=el('article',undefined,'stat-card');
  card.append(el('div',label,'stat-label'),el('div',value,'stat-number'),el('div',caption,'stat-caption'));
  return card;
}
function renderStats() {
  const rows=currentReportRows(), section=SECTIONS[state.section], isAll=state.unitId==='ALL';
  const count=UNITS.filter(u=>hasSectionRows(state.reports.get(u.id))).length;
  const hasUnitData=hasSectionRows(state.reports.get(state.unitId));
  const filled=section.items.filter(m=>hasRowContent(rows[m.id])).length;
  const [first,second]=section.keyMetrics.map(id=>section.items.find(m=>m.id===id));
  const calc1=computed(rows[first.id]),calc2=computed(rows[second.id]);
  $('statsCards').replaceChildren(
    statCard('Xã, phường đã cập nhật',isAll?`${count}/10`:(hasUnitData?'Đã có dữ liệu':'Chưa có'),isAll?'Trên toàn tuyến':getUnitName(state.unitId)),
    statCard('Chỉ tiêu có dữ liệu',`${filled}/${section.items.length}`,isAll?'Số liệu tổng hợp từ các xã':'Thông tin hiện có'),
    statCard(first.label,`${formatNumber(calc1.completed)}${calc1.completed===null?'':` ${first.unit}`}`,'Lũy kế tại thời điểm xem'),
    statCard(second.label,`${formatNumber(calc2.completed)}${calc2.completed===null?'':` ${second.unit}`}`,'Các xã có thể cập nhật bất kỳ lúc nào')
  );
  const label=isAll?`Toàn tuyến · ${count}/10 xã, phường có dữ liệu`:`${getUnitName(state.unitId)} · Dữ liệu hiện tại`;
  $('dataCoverage').textContent=`${label} · ${filled}/${section.items.length} chỉ tiêu có thông tin`;
}
function renderOverview() {
  const visible=state.unitId==='ALL'; $('overviewCard').hidden=!visible; if(!visible)return;
  const section=SECTIONS[state.section];
  const [m1,m2]=section.keyMetrics.map(id=>section.items.find(m=>m.id===id));
  $('overviewTitle').textContent=`Tình hình từng xã, phường – ${section.shortTitle}`;
  const header=el('tr');
  for (const label of ['STT','Xã, phường','Tình trạng dữ liệu',`${m1.label} (${m1.unit})`,`${m2.label} (${m2.unit})`,'Tiến độ chỉ tiêu đầu (%)','Cập nhật gần nhất']) header.appendChild(el('th',label));
  $('overviewHead').replaceChildren(header); $('overviewBody').replaceChildren();
  UNITS.forEach((unit,index)=>{
    const report=state.reports.get(unit.id),a=computed(report?.rows?.[m1.id]),b=computed(report?.rows?.[m2.id]);
    const tr=el('tr'); makeCell(tr,index+1); makeCell(tr,unit.name);
    statusCell(tr,'',hasSectionRows(report)?'Đã có dữ liệu':'Chưa có dữ liệu');
    makeCell(tr,formatNumber(a.completed)); makeCell(tr,formatNumber(b.completed));
    makeCell(tr,formatPercent(a.percentage));
    makeCell(tr,formatUpdatedAt(latestTimeForSection(report)));
    $('overviewBody').appendChild(tr);
  });
}
function renderDashboard() {
  $('gpmbTab').classList.toggle('active',state.section==='gpmb');
  $('tdcTab').classList.toggle('active',state.section==='tdc');
  $('gpmbTab').setAttribute('aria-selected',String(state.section==='gpmb'));
  $('tdcTab').setAttribute('aria-selected',String(state.section==='tdc'));
  renderStats(); renderTable(); renderOverview();
}
function startLiveReports() {
  if (!firebaseReady)return;
  if (state.unsubscribe) state.unsubscribe();
  state.loading=true;
  $('refreshBtn').textContent='Đang kết nối...'; $('refreshBtn').disabled=true;
  state.unsubscribe=onSnapshot(collection(db,'progress'),snapshot=>{
    const reports=new Map();
    for(const item of snapshot.docs) if(UNITS.some(u=>u.id===item.id)) reports.set(item.id,item.data());
    state.reports=reports;
    state.loading=false; $('refreshBtn').disabled=false; $('refreshBtn').textContent='↻ Làm mới';
    renderDashboard();
  },err=>{
    state.loading=false; $('refreshBtn').disabled=false; $('refreshBtn').textContent='↻ Làm mới';
    toast(`Không tải được dữ liệu: ${errorMessage(err)}`,'error');
  });
}
async function refreshData() {
  if (!firebaseReady)return;
  try {
    // Luôn nhận dữ liệu đồng bộ khi nhấn Làm mới, kể cả khi kết nối realtime bị gián đoạn.
    const snapshot=await getDocs(collection(db,'progress'));
    state.reports=new Map(snapshot.docs.filter(i=>UNITS.some(u=>u.id===i.id)).map(i=>[i.id,i.data()]));
    renderDashboard(); toast('Đã tải lại dữ liệu mới nhất.');
  } catch (err) { toast(`Không làm mới được: ${errorMessage(err)}`,'error'); }
}
function refreshAuthUI() {
  const signedIn=!!state.user;
  $('loginBtn').hidden=signedIn; $('logoutBtn').hidden=!signedIn;
  $('editBtn').hidden=!hasEditorRights(); $('adminPanelBtn').hidden=!isAdmin();
  const labels={admin:'Quản trị viên',nhaplieu:'Nhập liệu toàn tuyến',nhaplieu_xa:'Nhập liệu xã, phường'};
  $('authLabel').textContent=signedIn?`${state.profile?.displayName||state.user.email} · ${hasEditorRights()?labels[state.profile.role]:'Chưa được cấp quyền nhập liệu'}`:'Khách truy cập · Chế độ xem';
  if (!hasEditorRights()) closeEditor(true);
  if (!isAdmin()) $('usersPanel').hidden=true;
}
function confirmDiscard() { return !state.editorDirty || window.confirm('Có thay đổi chưa lưu. Anh có muốn bỏ những thay đổi này không?'); }
function closeEditor(force=false) {
  if (!force && !confirmDiscard())return;
  $('editorPanel').hidden=true; state.editorDirty=false; state.editUnitId=null; state.baseline={};
}
async function switchSection(section) {
  if (state.section===section || !confirmDiscard())return;
  state.section=section; renderDashboard();
  if (!$('editorPanel').hidden) renderEditorRows();
}
function openEditor() {
  if (!hasEditorRights())return;
  const units=editableUnits(); if(!units.length){toast('Chưa được gán đơn vị hợp lệ.','error');return;}
  state.editUnitId=units.find(u=>u.id===state.unitId)?.id ?? units[0].id;
  $('editUnitSelect').replaceChildren(); units.forEach(u=>option($('editUnitSelect'),u.id,u.name));
  $('editUnitSelect').value=state.editUnitId;
  $('editorPanel').hidden=false; renderEditorRows();
  $('editorPanel').scrollIntoView({behavior:'smooth',block:'start'});
}
function readInputRow(tr) {
  const r={};
  for(const field of FIELDS){
    const input=tr.querySelector(`[data-field="${field}"]`),s=input.value.trim();
    r[field]=input.validity.badInput?NaN:(s===''?null:Number(s));
  }
  r.status=tr.querySelector('[data-field="status"]').value;
  r.note=tr.querySelector('[data-field="note"]').value.trim();
  return r;
}
function updatePreview(tr) {
  const row=readInputRow(tr),calc=computed(row);
  tr.querySelector('[data-computed="remaining"]').textContent=formatNumber(calc.remaining);
  tr.querySelector('[data-computed="percentage"]').textContent=formatPercent(calc.percentage);
  const metric=SECTIONS[state.section].items.find(m=>m.id===tr.dataset.metric);
  const error=validateMetricRow(row,metric); tr.classList.toggle('invalid-row',!!error);
  const feedback=tr.querySelector('[data-feedback]');
  feedback.textContent=error?error.replace(/^Chỉ tiêu [0-9]+ \([^)]+\): /,''):''; feedback.hidden=!error;
  for(const field of FIELDS) tr.querySelector(`[data-field="${field}"]`).setAttribute('aria-invalid',String(!!error));
}
function renderEditorRows() {
  const section=SECTIONS[state.section]; const old=state.reports.get(state.editUnitId)?.rows ?? {};
  state.baseline={}; $('editTitle').textContent=`${section.shortTitle} · cập nhật thường xuyên`;
  $('lastWeekNote').textContent='Chỉ tiêu đã lưu sẽ được điền sẵn. Thời gian cập nhật tính riêng cho từng chỉ tiêu.';
  $('editRows').replaceChildren();
  for(const m of section.items){
    const existing=normalizeRow(old[m.id]); state.baseline[m.id]=existing;
    const tr=el('tr'); tr.dataset.metric=m.id;
    makeCell(tr,m.number);makeCell(tr,m.label,'metric-name');makeCell(tr,m.unit);
    for(const field of FIELDS){
      const td=makeCell(tr),input=el('input'); input.type='number';input.step='any';input.min='0';input.max='1000000000000';
      input.inputMode='decimal';input.dataset.field=field;input.setAttribute('aria-label',`${m.label} - ${field==='target'?'Tổng':'Đã thực hiện'}`);
      input.value=existing[field]===null?'':String(existing[field]);
      input.addEventListener('input',()=>{state.editorDirty=true;updatePreview(tr);});
      td.appendChild(input);
    }
    for(const field of ['remaining','percentage']){const td=makeCell(tr,undefined,'value-strong');td.dataset.computed=field;}
    const statusTd=makeCell(tr),select=el('select');select.dataset.field='status';
    option(select,'','— Chọn trạng thái —');STATUS_OPTIONS.forEach(s=>option(select,s.value,s.label));select.value=existing.status;
    select.addEventListener('change',()=>{state.editorDirty=true;updatePreview(tr);});statusTd.appendChild(select);
    const td=makeCell(tr),note=el('textarea');note.dataset.field='note';note.maxLength=1500;note.value=existing.note;
    note.setAttribute('aria-label',`Ghi chú - ${m.label}`);note.addEventListener('input',()=>{state.editorDirty=true;updatePreview(tr);});
    td.appendChild(note);
    const feedback=el('p','','row-error');feedback.dataset.feedback='';feedback.hidden=true;td.appendChild(feedback);
    makeCell(tr,formatUpdatedAt(existing.updatedAt),'update-cell');
    $('editRows').appendChild(tr);updatePreview(tr);
  }
  state.editorDirty=false;
}
async function saveReport() {
  if(!canEdit(state.editUnitId)){toast('Không có quyền cập nhật xã, phường này.','error');return;}
  const unit=UNITS.find(u=>u.id===state.editUnitId);
  const changed={};
  for(const tr of $('editRows').querySelectorAll('tr[data-metric]')){
    const metric=SECTIONS[state.section].items.find(m=>m.id===tr.dataset.metric),row=readInputRow(tr);
    const error=validateMetricRow(row,metric);
    if(error){updatePreview(tr);tr.scrollIntoView({behavior:'smooth',block:'center'});toast(error,'error');return;}
    if(comparableRow(row)!==comparableRow(state.baseline[metric.id])) changed[metric.id]=row;
  }
  const ids=Object.keys(changed);
  if(!ids.length){toast('Không có chỉ tiêu nào thay đổi để lưu.');return;}
  $('saveBtn').disabled=true;$('saveBtn').textContent='Đang lưu...';
  try {
    const target=doc(db,'progress',unit.id);
    await runTransaction(db,async tx=>{
      const snap=await tx.get(target);
      const old=snap.exists()?snap.data().rows??{}:{};
      for(const id of ids){
        if(comparableRow(old[id])!==comparableRow(state.baseline[id])){
          throw new Error(`Chỉ tiêu ${id} vừa được người khác cập nhật. Vui lòng đóng biểu mẫu, mở lại để kiểm tra trước khi lưu.`);
        }
      }
      const merged={...old};
      for(const id of ids){
        const row=changed[id];
        if(!hasRowContent(row)){delete merged[id];continue;}
        merged[id]={...row,updatedAt:serverTimestamp(),updatedBy:state.user.uid};
      }
      tx.set(target,{unitId:unit.id,rows:merged,updatedAt:serverTimestamp(),updatedBy:state.user.uid});
    });
    closeEditor(true);
    await refreshData();
    toast(`Đã cập nhật ${ids.length} chỉ tiêu của ${unit.name}. Các chỉ tiêu khác giữ nguyên.`);
  }catch(err){toast(`Không lưu được: ${errorMessage(err)}`,'error');}
  finally{$('saveBtn').disabled=false;$('saveBtn').textContent='Lưu thay đổi';}
}
function csvCell(value) {
  const raw=String(value??'');
  const safe=typeof value==='string'&&/^[=+@\-\t\r]/.test(raw)?`'${raw}`:raw;
  return `"${safe.replaceAll('"','""')}"`;
}
function exportCsv() {
  const section=SECTIONS[state.section],rows=currentReportRows();
  const headers=['STT','Chỉ tiêu','Đơn vị','Tổng phải thực hiện','Đã thực hiện','Còn lại','% Hoàn thành','Trạng thái','Khó khăn, vướng mắc, kiến nghị','Thời gian cập nhật','Số xã có số liệu'];
  const lines=section.items.map(m=>{
    const r=normalizeRow(rows[m.id]),calc=computed(r);
    return [m.number,m.label,m.unit,r.target??'',calc.completed??'',calc.remaining??'',
      calc.percentage===null?'':Number(calc.percentage.toFixed(2)),
      state.unitId==='ALL'&&r.coverage!==undefined&&r.coverage!==10?'Chưa đủ dữ liệu':(r.status?statusLabel(r.status):''),
      r.note,formatUpdatedAt(r.updatedAt),state.unitId==='ALL'?(r.coverage??0):''];
  });
  const content='\ufeff'+[headers,...lines].map(line=>line.map(csvCell).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8;'}));
  const a=el('a');a.href=url;a.download=`Tien_do_hien_tai_${state.section}_${state.unitId}.csv`;
  document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
function updateProfileUnitControl() {
  const role = $('profileRole').value;
  const select = $('profileUnit');
  if (role !== 'nhaplieu_xa') {
    select.replaceChildren();
    option(select, 'TINH', 'Nhập liệu toàn tuyến');
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
  const banner=$('siteBanner');
  const fallback=()=>{banner.hidden=true;$('bannerFallback').hidden=false;};
  banner.addEventListener('error',fallback);
  if(banner.complete&&banner.naturalWidth===0)fallback();
  $('gpmbTab').addEventListener('click',()=>switchSection('gpmb'));
  $('tdcTab').addEventListener('click',()=>switchSection('tdc'));
  $('refreshBtn').addEventListener('click',refreshData);
  $('exportBtn').addEventListener('click',exportCsv);
  $('unitSelect').addEventListener('change',event=>{
    if(!confirmDiscard()){event.target.value=state.unitId;return;}
    closeEditor(true);state.unitId=event.target.value;renderDashboard();
  });
  $('loginBtn').addEventListener('click',()=>{$('loginError').hidden=true;$('loginDialog').showModal();});
  $('closeLoginBtn').addEventListener('click',()=>$('loginDialog').close());
  $('loginForm').addEventListener('submit',login);
  $('logoutBtn').addEventListener('click',async()=>{
    if(!confirmDiscard())return;
    await signOut(auth);toast('Đã đăng xuất. Dữ liệu công khai vẫn xem được.');
  });
  $('editBtn').addEventListener('click',openEditor);
  $('closeEditorBtn').addEventListener('click',()=>closeEditor());
  $('saveBtn').addEventListener('click',saveReport);
  $('editUnitSelect').addEventListener('change',event=>{
    if(!confirmDiscard()){event.target.value=state.editUnitId;return;}
    state.editUnitId=event.target.value;renderEditorRows();
  });
  $('adminPanelBtn').addEventListener('click',async()=>{
    $('usersPanel').hidden=false;await renderProfiles();
    $('usersPanel').scrollIntoView({behavior:'smooth',block:'start'});
  });
  $('closeUsersBtn').addEventListener('click',()=>{$('usersPanel').hidden=true;});
  $('userForm').addEventListener('submit',saveProfile);
  $('profileRole').addEventListener('change',updateProfileUnitControl);
}
function init() {
  option($('unitSelect'),'ALL','Toàn tuyến (tự tổng hợp 10 xã, phường)');
  UNITS.forEach(unit=>option($('unitSelect'),unit.id,unit.name));
  updateProfileUnitControl(); attachListeners(); renderDashboard();
  if(!firebaseReady){$('configAlert').hidden=false;$('loginBtn').disabled=true;return;}
  onAuthStateChanged(auth,async user=>{
    state.user=user;state.profile=null;
    if(user){
      try{
        const snap=await getDoc(doc(db,'users',user.uid));
        state.profile=snap.exists()?snap.data():null;
      }catch(err){toast(`Không đọc được phân quyền: ${errorMessage(err)}`,'error');}
    }
    refreshAuthUI();
  });
  startLiveReports();
}
init();
