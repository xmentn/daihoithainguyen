/* Website GPMB & TĐC V4 — giao diện kế thừa demo, dữ liệu Firebase thực. */
import {auth,db as fs} from './firebase.js';
import {northRender,northInit,northStartPrivate,northHandleAction,northHandleChange,northHandleInput,northHandleSubmit} from './north.js?v=4.2.1';
import {onAuthStateChanged,signInWithEmailAndPassword,signOut} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {collection,doc,getDoc,getDocs,query,orderBy,limit,onSnapshot,serverTimestamp,runTransaction,updateDoc,setDoc,deleteField} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import {UNITS,STAGES,METRICS,METRIC_MAP,STAGE_MAP,STATUS,readRow,validate,percent,fmtNumber,fmtDate as formatDate,isDecimal,asDate} from './data.js';
const stageDefs=STAGES,metricDefs=METRICS,stageById=STAGE_MAP,metricById=METRIC_MAP;
const db={units:UNITS,records:{},history:[]};
const ui={page:'overview',scope:'all',stage:'lap',metric:'gpmb_03',compStage:'lap',compMetric:'gpmb_03',unit:'BAC_KAN',editUnit:'BAC_KAN',editStage:'lap',editMetric:'gpmb_03',overviewKind:'gpmb'};
// Chỉ là lựa chọn giao diện, không ghi vào Firestore và không sửa danh mục chỉ tiêu.
const GPMB_DEFAULT_OVERVIEW=['gpmb_07','gpmb_11','gpmb_14'];
const gpmbOverviewSelected=new Set(GPMB_DEFAULT_OVERVIEW);
let gpmbPickerOpen=false;
let currentUser=null,profile=null,progressUnsubscribe=null,usersUnsubscribe=null,historyUnsubscribe=null,profileUnsubscribe=null;
let profileRows=[],historyLoading=false,legacyDocs=[],loadingProgress=true,serverError='',pending=false;
const $=q=>document.querySelector(q);
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const rnd=(x,n=2)=>Number(x.toFixed(n));
function fmt(v,unit=''){return v==null||!Number.isFinite(Number(v))?'—':fmtNumber(v,unit);}
function fmtDate(v){return formatDate(v);}
function pct(v,t){return percent(v,t);}
function ptxt(x){return x==null?'Chưa có dữ liệu':`${Number(x).toLocaleString('vi-VN',{maximumFractionDigits:1})}%`;}
function colorFor(p){return p==null?'#9aacbc':p>=85?'#119b84':p>=65?'#2b79ce':p>=45?'#da972c':'#d66b63';}
function progress(p,color){return `<div class="bar-track"><div class="bar-fill" style="width:${p==null?0:Math.max(0,Math.min(100,p))}%;--bar:${color||colorFor(p)}"></div></div>`;}
function getRec(unitId,metricId){return db.records[`${unitId}|${metricId}`]||{target:null,value:null,status:'',updatedAt:null,note:'',startDate:'',endDate:''};}
function unitsInScope(scope=ui.scope){return scope==='all'?db.units:db.units.filter(u=>u.id===scope);}
function metricSum(metricId,scope='all'){
  const units=unitsInScope(scope);let target=0,value=0,count=0;
  for(const u of units){const r=getRec(u.id,metricId);if(r.target!==null&&r.value!==null&&Number.isFinite(r.target)&&Number.isFinite(r.value)&&r.target>=0&&r.value>=0&&r.value<=r.target){target+=r.target;value+=r.value;count++;}}
  return {target:count?rnd(target,4):null,value:count?rnd(value,4):null,percent:count&&target>0?rnd(100*value/target,2):null,count,totalUnits:units.length};
}
// Tiến độ công đoạn CHỈ dựa vào chỉ tiêu kết quả được tô vàng trong biểu Excel.
function stageScore(stageId,scope='all'){
 const marker=stageById[stageId]?.milestone;
 return marker?metricSum(marker,scope).percent:null;
}
// Chỉ số tham khảo liên công đoạn để đối chiếu đơn vị, không phải tỷ lệ chốt công đoạn.
function unitScore(id,kind='all'){
 const xs=stageDefs.filter(s=>kind==='all'||s.kind===kind).map(s=>stageScore(s.id,id)).filter(x=>x!=null);
 return xs.length?rnd(xs.reduce((a,b)=>a+b,0)/xs.length,1):null;
}
function latestUnit(id){let t=0;for(const m of metricDefs){const d=asDate(getRec(id,m.id).updatedAt)?.getTime()||0;if(d>t)t=d;}return t?new Date(t):null;}
function lastUpdated(scope='all'){const ts=unitsInScope(scope).map(u=>latestUnit(u.id)?.getTime()||0);const n=Math.max(0,...ts);return n?new Date(n):null;}
function isFresh(id){const t=latestUnit(id)?.getTime();return t!=null&&Date.now()-t<=86400000;}
function timeStatus(v){const t=asDate(v)?.getTime();if(!t)return 'Chưa cập nhật';const hours=Math.max(0,(Date.now()-t)/3600000);return hours<=24?'Trong 24 giờ':`${Math.floor(hours)} giờ trước`;}
function selectOptions(items,selected){return items.map(o=>`<option value="${esc(o.value)}" ${o.value===selected?'selected':''}>${esc(o.name)}</option>`).join('');}
function scopeOptions(selected){return selectOptions([{value:'all',name:'Toàn tuyến (10 xã, phường)'},...db.units.map(u=>({value:u.id,name:u.name}))],selected);}
function stageOptions(selected){return selectOptions(stageDefs.map(s=>({value:s.id,name:s.full})),selected);}
function metricOptions(stageId,selected){return selectOptions(metricDefs.filter(m=>m.stage===stageId).map(m=>({value:m.id,name:`${m.code} · ${m.label}`})),selected);}
function section(title,body,subtitle=''){return `<section class="panel"><div class="panel-toolbar"><div><h2 class="panel-title">${title}</h2>${subtitle?`<p class="subtext">${subtitle}</p>`:''}</div></div>${body}</section>`;}
function pageHead(kicker,title,description,actions=''){return `<div class="page-header"><div><div class="eyebrow">${kicker}</div><h1 class="page-title">${title}</h1><p class="page-desc">${description}</p></div><div class="actions">${actions}</div></div>`;}
function dataNote(){
 if(serverError)return `<div class="demo-note"><span class="note-icon">!</span><div><strong>Lỗi kết nối Firestore:</strong> ${esc(serverError)}. Hãy kiểm tra Rules và Console.</div></div>`;
 if(loadingProgress)return '<div class="info-line" style="margin-bottom:19px">Đang tải số liệu…</div>';
 return ''; // Ẩn thuyết minh về nguồn dữ liệu khi hệ thống hoạt động bình thường.
}
function kpiCard(metricId,title,icon,color,bg,unitId){const m=metricById[metricId],x=metricSum(metricId,unitId);return `<div class="metric-card" style="--accent:${color};--accentbg:${bg}"><div class="metric-head"><div class="metric-tag">${title}</div><div class="metric-symbol">${icon}</div></div><div class="metric-number">${fmt(x.value,m.unit)} <small>${esc(m.unit)}</small></div><div class="metric-bottom"><span>Kế hoạch: ${fmt(x.target,m.unit)} ${esc(m.unit)} · ${x.count}/${x.totalUnits} đơn vị</span><strong>${ptxt(x.percent)}</strong></div>${progress(x.percent,color)}</div>`;}
function stagesProgress(scope,kind=ui.overviewKind){return stageDefs.filter(s=>s.kind===kind).map(s=>{
 const p=stageScore(s.id,scope),m=metricById[s.milestone],total=metricSum(s.milestone,scope);
 return `<div class="stage-row" style="--accent:${s.accent};--accentbg:${s.bg}"><div class="stage-ico">${s.icon}</div><div class="stage-middle"><div class="stage-name">${esc(s.full)}</div><div class="stage-hint">Chỉ tiêu chốt ${m.code}: ${esc(m.label)} · ${total.count}/${total.totalUnits} đơn vị có số liệu</div>${progress(p,s.accent)}</div><div class="stage-score">${ptxt(p)}</div></div>`;
 }).join('');}
function ranked(stage='all'){return db.units.map(unit=>({unit,score:stage==='all'?unitScore(unit.id):stageScore(stage,unit.id)})).sort((a,b)=>(b.score??-1)-(a.score??-1));}
function miniRank(rows){return `<ol class="toplist">${rows.map((x,i)=>`<li><span class="list-left"><span class="rank">${i+1}</span><span><span class="list-name">${esc(x.unit.name)}</span><span class="list-meta">${fmtDate(latestUnit(x.unit.id))}</span></span></span><strong style="color:${colorFor(x.score)}">${ptxt(x.score)}</strong></li>`).join('')}</ol>`;}
function barChart(rows){return `<div class="comparison-bars">${rows.map(r=>`<div class="compare-row"><div class="compare-label" title="${esc(r.name)}">${esc(r.name)}</div>${progress(r.percent,colorFor(r.percent))}<div class="compare-value" style="color:${colorFor(r.percent)}">${r.percent==null?'—':ptxt(r.percent)}</div></div>`).join('')}</div>`;}
function updateList(limit=5){const rows=db.units.map(unit=>({unit,iso:latestUnit(unit.id)})).sort((a,b)=>(asDate(b.iso)?.getTime()||0)-(asDate(a.iso)?.getTime()||0));return `<div class="unit-list">${rows.slice(0,limit).map(x=>`<div class="unit-card"><div><strong><span class="status-dot ${isFresh(x.unit.id)?'':'late'}"></span>${esc(x.unit.name)}</strong><p>${fmtDate(x.iso)} · ${timeStatus(x.iso)}</p></div><span class="pill ${isFresh(x.unit.id)?'':'warn'}">${isFresh(x.unit.id)?'Đã cập nhật':'Cần cập nhật'}</span></div>`).join('')}</div>`;}
function mayWrite(id){return !!profile?.active&&(profile.role==='admin'||profile.role==='nhaplieu'||(profile.role==='nhaplieu_xa'&&profile.unitId===id));}
function canEdit(){return !!profile?.active&&['admin','nhaplieu','nhaplieu_xa'].includes(profile.role);}
function isAdmin(){return profile?.active===true&&profile.role==='admin';}
const unitOptionsForWrite=()=>db.units.filter(u=>mayWrite(u.id));
// Các dashboard GPMB thể hiện trực tiếp kết quả của chỉ tiêu được chọn,
// không thay công thức tính tiến độ từng công đoạn ở những trang khác.
function latestMetricDate(metricId,scope){
 const t=Math.max(0,...unitsInScope(scope).map(u=>asDate(getRec(u.id,metricId).updatedAt)?.getTime()||0));
 return t?new Date(t):null;
}
function gpmbFocusCard(m,scope){
 const x=metricSum(m.id,scope),stage=stageById[m.stage];
 const remaining=x.target!==null&&x.value!==null?Math.max(0,rnd(x.target-x.value,4)):null;
 return `<article class="focus-card" style="--focus-accent:${stage.accent};--focus-tint:${stage.bg}">
   <div class="focus-card-top"><span class="focus-stage">${esc(stage.short)}</span><span class="focus-code">${esc(m.code)}</span></div>
   <h3 class="focus-card-title">${esc(m.label)}</h3>
   <div class="focus-value-row">
    <div><div class="focus-small-label">ĐÃ THỰC HIỆN</div><div class="focus-primary-value">${fmt(x.value,m.unit)} <small>${esc(m.unit)}</small></div></div>
    <div class="focus-percent" aria-label="Tỷ lệ hoàn thành: ${ptxt(x.percent)}">${ptxt(x.percent)}</div>
   </div>
   <div class="focus-progress" role="progressbar" aria-label="${esc(m.label)}" aria-valuemin="0" aria-valuemax="100" ${x.percent!=null?`aria-valuenow="${x.percent}"`:''}><span style="width:${x.percent==null?0:Math.max(0,Math.min(100,x.percent))}%"></span></div>
   <div class="focus-values"><div><span>Tổng phải thực hiện</span><strong>${fmt(x.target,m.unit)} ${esc(m.unit)}</strong></div><div><span>Còn lại</span><strong>${fmt(remaining,m.unit)} ${esc(m.unit)}</strong></div></div>
   <div class="focus-card-footer"><span>${x.count}/${x.totalUnits} đơn vị có số liệu</span><span>Cập nhật: ${fmtDate(latestMetricDate(m.id,scope))}</span></div>
  </article>`;
}
function gpmbSelector(){
 const all=metricDefs.filter(m=>stageById[m.stage]?.kind==='gpmb');
 const count=all.filter(m=>gpmbOverviewSelected.has(m.id)).length;
 return `<section class="focus-picker">
   <button class="focus-picker-toggle" type="button" data-action="overview-toggle-picker" aria-expanded="${gpmbPickerOpen}" aria-controls="gpmb-metric-options">
    <span class="picker-toggle-title"><span class="picker-toggle-icon">☑</span> Tùy chọn các chỉ tiêu hiển thị <span class="picker-count">${count}/${all.length}</span></span>
    <span class="picker-toggle-right">${gpmbPickerOpen?'Thu gọn':'Chọn chỉ tiêu'} <span aria-hidden="true">${gpmbPickerOpen?'▴':'▾'}</span></span>
   </button>
   ${gpmbPickerOpen?`<div class="focus-picker-content" id="gpmb-metric-options">
    <div class="focus-picker-actions"><button class="btn btn-soft" type="button" data-action="overview-reset-metrics">3 khâu trọng yếu</button><button class="btn" type="button" data-action="overview-all-metrics">Chọn cả 14 chỉ tiêu</button></div>
    <div class="focus-picker-groups">${stageDefs.filter(s=>s.kind==='gpmb').map(stage=>`
     <fieldset class="focus-picker-group"><legend>${esc(stage.full)}</legend>
     ${all.filter(m=>m.stage===stage.id).map(m=>`<label class="focus-metric-choice"><input type="checkbox" data-overview-metric="${esc(m.id)}" ${gpmbOverviewSelected.has(m.id)?'checked':''}><span><strong>${esc(m.code)}</strong> ${esc(m.label)}</span></label>`).join('')}
     </fieldset>`).join('')}</div>
   </div>`:''}
 </section>`;
}
function renderOverview(){
 const scope=ui.scope,kind=ui.overviewKind;
 const stages=stageDefs.filter(s=>s.kind===kind);
 const header=pageHead('BẢNG ĐIỀU HÀNH TRỰC QUAN','Tổng quan tiến độ toàn tuyến','Theo dõi kết quả giải phóng mặt bằng và tái định cư theo từng xã, phường.',`<button class="btn" data-action="export-csv">⇩ Xuất Excel (CSV)</button><button class="btn" data-action="print">⎙ In báo cáo</button>${canEdit()?'<button class="btn btn-primary" data-action="go-update">＋ Cập nhật số liệu</button>':''}`);
 const tabs=`<div class="work-tabs overview-tabs" role="tablist" aria-label="Hai phần việc chính"><button type="button" class="work-tab ${kind==='gpmb'?'active':''}" role="tab" aria-selected="${kind==='gpmb'}" data-action="overview-kind" data-kind="gpmb">I. GIẢI PHÓNG MẶT BẰNG (BỒI THƯỜNG)</button><button type="button" class="work-tab ${kind==='tdc'?'active':''}" role="tab" aria-selected="${kind==='tdc'}" data-action="overview-kind" data-kind="tdc">II. TÁI ĐỊNH CƯ</button></div>`;
 const scopeFilter=`<div class="filter-row"><label class="label" for="scope">Phạm vi</label><select class="filter-select" id="scope" data-select="scope">${scopeOptions(scope)}</select></div>`;
 if(kind==='gpmb'){
  const chosen=metricDefs.filter(m=>stageById[m.stage]?.kind==='gpmb'&&gpmbOverviewSelected.has(m.id));
  return `${header}${dataNote()}${tabs}
   <div class="section-heading focus-heading"><h2>TIẾN ĐỘ CÁC KHÂU TRỌNG YẾU</h2>${scopeFilter}</div>
   ${gpmbSelector()}
   ${chosen.length?`<div class="focus-grid">${chosen.map(m=>gpmbFocusCard(m,scope)).join('')}</div>`:'<div class="focus-empty">Chưa chọn chỉ tiêu nào. Mở mục <strong>Tùy chọn các chỉ tiêu hiển thị</strong> để chọn nội dung cần xem.</div>'}`;
 }
 // Tái định cư: bảo toàn đầy đủ các dashboard và công thức của phiên bản trước.
 const least=stages.map(s=>({...s,score:stageScore(s.id,scope)})).filter(s=>s.score!=null).sort((a,b)=>a.score-b.score)[0];
 const uu=unitsInScope(scope),fresh=uu.filter(u=>isFresh(u.id)).length;
 const rows=uu.map(u=>({name:u.name,percent:unitScore(u.id,kind)})).sort((a,b)=>(b.percent??-1)-(a.percent??-1));
 return `${header}${dataNote()}${tabs}
  <div class="section-heading"><h2>TÁI ĐỊNH CƯ <span class="hint">· ${stages.length} công đoạn · 11 chỉ tiêu</span></h2>${scopeFilter}</div>
  <div class="metric-grid milestone-grid two">
  ${stages.map(s=>{const m=metricById[s.milestone];return kpiCard(s.milestone,`${s.short.toUpperCase()} · MỐC ${m.code}`,s.icon,s.accent,s.bg,scope);}).join('')}
  </div>
  <div class="panel-grid">
  ${section(`Tiến độ ${stages.length} công đoạn`,stagesProgress(scope,kind),'Chỉ sử dụng tỷ lệ của chỉ tiêu chốt (dòng tô vàng); KHÔNG lấy trung bình các chỉ tiêu thành phần.')}
  ${section('Tín hiệu điều hành',`<div class="insights">
  <div class="insight-box warning"><div class="insight-kicker">Công đoạn cần tập trung</div><div class="insight-big">${least?esc(least.short):'Chưa có dữ liệu'}</div><div class="insight-desc">${least?`Mốc chốt: ${esc(metricById[least.milestone].label)} · ${ptxt(least.score)}.`:'Cần cập nhật số liệu chỉ tiêu chốt của từng công đoạn.'}</div><button class="insight-link" data-action="go-stages" data-stage="${least?.id||stages[0].id}">Phân tích công đoạn →</button></div>
  <div class="insight-box good"><div class="insight-kicker">Tình hình cập nhật trong 24 giờ</div><div class="insight-big">${fresh}/${uu.length} đơn vị</div><div class="insight-desc">${uu.length-fresh} đơn vị chưa có cập nhật trong 24 giờ gần nhất.</div>${canEdit()?'<button class="insight-link" data-action="go-updates">Xem nhật ký →</button>':''}</div>
  <div class="insight-box"><div class="insight-kicker">Dữ liệu gần nhất</div><div class="insight-big" style="font-size:17px">${fmtDate(lastUpdated(scope))}</div><div class="insight-desc">Tổng hợp tự động từ báo cáo xã, phường, không có biểu nhập toàn tuyến.</div></div>
  </div>`,'Chỉ số chốt công đoạn giúp điều hành, không thay thế việc xem chi tiết từng chỉ tiêu.')}
  </div>
  <div class="panel-grid lower-section">
  ${section('Đối chiếu tiến độ giữa địa phương',barChart(rows),'Chỉ số THAM KHẢO: bình quân các tỷ lệ mốc chốt của riêng phần việc đang xem.')}
  ${section('Tình trạng cập nhật',updateList(),'Thời điểm cập nhật chỉ tiêu gần nhất của từng đơn vị.')}
  </div>
  <p class="footer-note">Tỷ lệ một công đoạn = tổng Đã thực hiện / tổng Tổng phải thực hiện của CHỈ TIÊU CHỐT công đoạn đó, trên các đơn vị có dữ liệu. Không cộng số hộ, ha, ngày, km, cọc hoặc tỷ đồng với nhau. Kết quả phải kèm số xã/phường đã cập nhật.</p>`;
}

function renderStages(){
  const s=stageById[ui.stage];
  let metrics=metricDefs.filter(m=>m.stage===ui.stage);if(!metrics.some(m=>m.id===ui.metric))ui.metric=metrics[0].id;
  const current=metricById[ui.metric];
  const sum=metricSum(current.id),pctAll=sum.percent;
  const rows=db.units.map(u=>({name:u.name,percent:metricSum(current.id,u.id).percent})).sort((a,b)=>(b.percent??-1)-(a.percent??-1));
  const cards=stageDefs.filter(st=>st.kind===s.kind).map(st=>{let p=stageScore(st.id);return `<button class="stage-card ${st.id===s.id?"active":""}" data-action="pick-stage" data-stage="${st.id}"><div class="stage-top"><span class="stage-ico" style="background:${st.bg};color:${st.accent}">${st.icon}</span><span class="number">${ptxt(p)}</span></div><h3>${esc(st.full)}</h3>${progress(p,st.accent)}<div class="detail">${metricDefs.filter(m=>m.stage===st.id).length} chỉ tiêu · Mốc chốt ${metricById[st.milestone].code}</div></button>`;}).join("");
  const lines=metrics.map(m=>{const x=metricSum(m.id);return `<button class="indicator-line ${m.id===current.id?"active":""}" data-action="pick-metric" data-metric="${m.id}"><div><div class="indicator-main"><span class="indicator-code">${m.code}</span>${esc(m.label)}${m.milestone?' <span class="marker-tag">Mốc chốt công đoạn</span>':''}</div><div class="indicator-meta">${fmt(x.value,m.unit)} / ${fmt(x.target,m.unit)} ${esc(m.unit)}</div></div><span class="indicator-right">${ptxt(x.percent)}<small>hoàn thành</small></span></button>`;}).join("");
  return `${pageHead("THEO DÕI CHI TIẾT","Tiến độ theo công đoạn","Chọn một công đoạn rồi chọn chỉ tiêu để thấy các địa phương thực hiện như thế nào.",`<button class="btn btn-primary" data-action="go-update">＋ Cập nhật số liệu</button>`)}${dataNote()}
    <div class="section-heading"><h2>Hai nhóm công việc chính · ${s.kind==='gpmb'?'14 chỉ tiêu GPMB':'11 chỉ tiêu tái định cư'}</h2></div>
    <div class="work-tabs"><button class="work-tab ${s.kind==='gpmb'?'active':''}" data-action="pick-kind" data-kind="gpmb">I. GIẢI PHÓNG MẶT BẰNG · 14 chỉ tiêu</button><button class="work-tab ${s.kind==='tdc'?'active':''}" data-action="pick-kind" data-kind="tdc">II. TÁI ĐỊNH CƯ · 11 chỉ tiêu</button></div>
    <div class="stage-cards">${cards}</div>
    <div class="panel-grid lower-section equal-cols">
      ${section(`Các chỉ tiêu · ${esc(s.short)}`,`<div class="indicator-list">${lines}</div>`,"Chọn từng dòng để phân tích kết quả theo đơn vị.")}
      ${section("So sánh địa phương",`<div class="mini-title" style="margin-bottom:5px">${esc(current.label)}</div><div class="subtext" style="margin-bottom:17px">Toàn tuyến: <strong>${fmt(sum.value,current.unit)} / ${fmt(sum.target,current.unit)} ${esc(current.unit)}</strong> · ${ptxt(pctAll)}</div>${barChart(rows)}<p class="footer-note">So sánh tỷ lệ thực hiện / kế hoạch của cùng một chỉ tiêu, không so sánh giá trị tuyệt đối.</p>`,"Dữ liệu từ bản ghi mới nhất của từng xã, phường.")}
    </div>
    <div class="lower-section">${section(`Bảng tổng hợp · ${esc(s.full)}`,`<div class="table-scroll"><table class="data-table"><thead><tr><th>TT</th><th class="wrap">Chỉ tiêu</th><th>Đơn vị</th><th>Thực hiện</th><th>Kế hoạch</th><th>Có số liệu</th><th>Tỷ lệ</th></tr></thead><tbody>${metrics.map(m=>{let x=metricSum(m.id);return `<tr class="${m.milestone?'milestone-row':''}"><td>${m.code}</td><td class="wrap strong">${esc(m.label)}${m.milestone?' <span class="marker-tag">Mốc chốt</span>':''}</td><td>${esc(m.unit)}</td><td class="strong">${fmt(x.value,m.unit)}</td><td>${fmt(x.target,m.unit)}</td><td>${x.count}/10</td><td><div class="bar-mini">${progress(x.percent)}<strong>${ptxt(x.percent)}</strong></div></td></tr>`;}).join("")}</tbody></table></div>`,"Toàn tuyến · cộng các địa phương trong cùng chỉ tiêu")}</div>`;
}
function renderCompare(){
  const opts=metricDefs.filter(m=>m.stage===ui.compStage);if(!opts.some(m=>m.id===ui.compMetric))ui.compMetric=opts[0].id;
  const m=metricById[ui.compMetric];
  const rows=db.units.map(u=>{const r=getRec(u.id,m.id);return {unit:u,value:r.value,target:r.target,percent:pct(r.value,r.target),updatedAt:r.updatedAt};}).sort((a,b)=>(b.percent??-1)-(a.percent??-1));
  const eligible=rows.filter(x=>x.percent!=null), top=eligible.slice(0,3),bottom=[...eligible].reverse().slice(0,3);
  return `${pageHead("PHÂN TÍCH HIỆU QUẢ","So sánh giữa các địa phương","Xác định đơn vị dẫn đầu, đơn vị cần đôn đốc trong từng chỉ tiêu cụ thể.",`<button class="btn" data-action="export-csv">⇩ Xuất bảng Excel</button>`)}${dataNote()}
    <section class="panel" style="margin-bottom:17px"><div class="field-grid"><div class="field"><label for="compare-stage" class="field-label">Công đoạn</label><select id="compare-stage" class="field-select" data-select="comp-stage">${stageOptions(ui.compStage)}</select></div><div class="field"><label for="compare-metric" class="field-label">Chỉ tiêu so sánh</label><select id="compare-metric" class="field-select" data-select="comp-metric">${metricOptions(ui.compStage,ui.compMetric)}</select></div></div><div class="info-line mt-12">So sánh trên cùng chỉ tiêu <strong>${esc(m.unit)}</strong>. Tỷ lệ = kết quả thực hiện / tổng phải thực hiện của từng đơn vị; không xếp hạng nếu chưa xác lập kế hoạch.</div></section>
    <div class="panel-grid">
      ${section("Biểu đồ tỷ lệ hoàn thành",barChart(rows.map(x=>({name:x.unit.name,percent:x.percent}))),`Chỉ tiêu: ${esc(m.label)}`)}
      ${section("Đơn vị cần chú ý",`<div class="two-cols"><div><h3 class="compact-title" style="color:#118776">Hoàn thành cao</h3>${miniRank(top.map(x=>({unit:x.unit,score:x.percent})))}</div><div><h3 class="compact-title" style="color:#c27a2b">Cần tập trung</h3>${miniRank(bottom.map(x=>({unit:x.unit,score:x.percent})))}</div></div><div class="warn-note">Xếp theo tỷ lệ hoàn thành, không khẳng định nguyên nhân chậm. Cần đối chiếu vướng mắc, tính chất dự án và thời gian được giao chỉ tiêu.</div>`,"Bảng gợi ý đối chiếu, không phải kết quả đánh giá thi đua.")}
    </div>
    <div class="lower-section">${section("Chi tiết kết quả của từng đơn vị",`<div class="table-scroll"><table class="data-table"><thead><tr><th>STT</th><th>Đơn vị</th><th>Đã thực hiện</th><th>Kế hoạch</th><th>Tỷ lệ hoàn thành</th><th>Cập nhật lần cuối</th></tr></thead><tbody>${rows.map((x,i)=>`<tr><td>${i+1}</td><td class="strong">${esc(x.unit.name)}</td><td>${fmt(x.value,m.unit)} ${esc(m.unit)}</td><td>${fmt(x.target,m.unit)} ${esc(m.unit)}</td><td><div class="bar-mini">${progress(x.percent)}<strong>${ptxt(x.percent)}</strong></div></td><td class="muted">${fmtDate(x.updatedAt)}</td></tr>`).join("")}</tbody></table></div>`,"Có thể thay đổi chỉ tiêu để tìm công đoạn các địa phương làm tốt hoặc còn chậm.")}</div>`;
}
function renderUnits(){
 const unit=db.units.find(x=>x.id===ui.unit)||db.units[0];ui.unit=unit.id;
 const cards=stageDefs.map(stage=>{const p=stageScore(stage.id,unit.id);return `<div class="stage-card"><div class="stage-top"><span class="stage-ico" style="color:${stage.accent};background:${stage.bg}">${stage.icon}</span><span class="number">${ptxt(p)}</span></div><h3>${esc(stage.full)}</h3>${progress(p,stage.accent)}<div class="detail">Tỷ lệ chỉ tiêu chốt công đoạn</div></div>`;}).join('');
 const tables=stageDefs.map(stage=>{const ms=metricDefs.filter(m=>m.stage===stage.id),trows=ms.map(m=>{
 const r=getRec(unit.id,m.id),p=pct(r.value,r.target),remaining=r.target!=null&&r.value!=null&&r.value<=r.target?r.target-r.value:null;
 return `<tr class="${m.milestone?'milestone-row':''}"><td>${m.code}</td><td class="wrap strong">${esc(m.label)}${m.milestone?' <span class="marker-tag">Mốc chốt</span>':''}</td><td>${esc(m.unit)}</td><td>${esc(r.startDate||'—')}</td><td>${esc(r.endDate||'—')}</td><td>${fmt(r.target,m.unit)}</td><td>${fmt(r.value,m.unit)}</td><td>${fmt(remaining,m.unit)}</td><td><div class="bar-mini">${progress(p)}<strong>${p==null?'—':ptxt(p)}</strong></div></td><td>${esc(STATUS[r.status]||'—')}</td><td class="muted">${fmtDate(r.updatedAt)}</td><td class="wrap">${esc(r.note||'—')}</td><td>${mayWrite(unit.id)?`<button class="btn btn-soft" data-action="edit-metric" data-unit="${unit.id}" data-metric="${m.id}">Sửa</button>`:''}</td></tr>`;
 }).join('');
 return `<div class="lower-section">${section(`${stage.icon} · ${esc(stage.full)}`,`<div class="table-scroll"><table class="data-table"><thead><tr><th>Mã</th><th class="wrap">Chỉ tiêu</th><th>Đơn vị</th><th>Ngày bắt đầu</th><th>Ngày kết thúc</th><th>Tổng phải thực hiện</th><th>Đã thực hiện</th><th>Còn lại</th><th>% hoàn thành</th><th>Trạng thái</th><th>Thời gian cập nhật</th><th class="wrap">Khó khăn, vướng mắc, kiến nghị</th><th></th></tr></thead><tbody>${trows}</tbody></table></div>`,'Mốc chốt công đoạn được tô vàng; cuộn ngang để xem ngày bắt đầu/kết thúc, trạng thái và thời gian cập nhật.')}</div>`;
 }).join('');
 return `${pageHead('HỒ SƠ TIẾN ĐỘ ĐƠN VỊ','Theo dõi xã, phường','Xem 25 chỉ tiêu theo 5 công đoạn, thời điểm cập nhật riêng từng chỉ tiêu.',mayWrite(unit.id)?`<button class="btn btn-primary" data-action="edit-unit" data-unit="${unit.id}">✎ Cập nhật đơn vị</button>`:'')}${dataNote()}
 <div class="section-heading"><h2>Thông tin địa phương</h2><div class="filter-row"><label class="label">Chọn đơn vị</label><select class="filter-select" data-select="unit">${selectOptions(db.units.map(u=>({value:u.id,name:u.name})),unit.id)}</select></div></div>
 <div class="panel" style="margin-bottom:16px"><div class="quick-kpis"><div><span>Chỉ số chung (tham khảo)</span><strong>${ptxt(unitScore(unit.id))}</strong></div><div><span>Chỉ tiêu đã cập nhật</span><strong>${metricDefs.filter(m=>getRec(unit.id,m.id).target!=null).length}/${metricDefs.length}</strong></div><div><span>Cập nhật gần nhất</span><strong style="font-size:15px;margin-top:6px">${fmtDate(latestUnit(unit.id))}</strong></div></div></div>
 <div class="stage-cards">${cards}</div>${tables}`;
}
function renderUpdate(){
 if(!canEdit())return pageHead('QUẢN LÝ TIẾN ĐỘ','Cần đăng nhập','Chỉ tài khoản nhập liệu và quản trị được cập nhật tiến độ.',`<button class="btn btn-primary" data-action="login">Đăng nhập</button>`);
 const permitted=unitOptionsForWrite();if(!permitted.some(u=>u.id===ui.editUnit))ui.editUnit=permitted[0]?.id||'';
 const u=permitted.find(x=>x.id===ui.editUnit);
 const ms=metricDefs.filter(m=>m.stage===ui.editStage);
 if(!ms.some(m=>m.id===ui.editMetric))ui.editMetric=ms[0].id;
 const m=metricById[ui.editMetric],r=getRec(ui.editUnit,m.id);
 const history=db.history.filter(h=>!u||h.unitId===u.id).slice(0,18);
 const logs=history.length?history.map(h=>{const unit=db.units.find(u=>u.id===h.unitId),hm=metricById[h.metricId],removed=h.action==='delete';return `<div class="journal-item"><div class="journal-date">${fmtDate(h.at)}</div><div><div class="journal-title">${esc(unit?.name||h.unitId)}</div><div class="journal-sub">${esc(hm?.label||h.metricId)} · ${esc(h.note||'')}</div></div><div class="journal-delta ${removed?'journal-removed':''}">${fmt(h.before?.completed,hm?.unit)} → ${removed?'Đã xóa':fmt(h.after?.completed,hm?.unit)}</div></div>`;}).join(''):'<div class="empty">Chưa có nhật ký cập nhật trên Firestore.</div>';
 return `${pageHead('CẬP NHẬT TRỰC TIẾP','Cập nhật số liệu & nhật ký','Mỗi đơn vị có 01 tài liệu tiến độ; sửa từng chỉ tiêu độc lập, cập nhật thời gian máy chủ Firebase.')}${dataNote()}
 <div class="panel-grid update-cols"><section class="panel form-card"><div class="panel-toolbar"><div><h2 class="panel-title">Nhập kết quả thực hiện</h2><p class="subtext">Lưu lũy kế, không nhập lại theo tuần. Cập nhật riêng từng chỉ tiêu.</p></div></div>
 <div class="info-line">Ngày bắt đầu/kết thúc theo từng chỉ tiêu (không bắt buộc); hai giá trị phải thực hiện/đã thực hiện dùng đúng đơn vị tính trong biểu Excel. Các dòng tô vàng là mốc chốt công đoạn. Toàn tuyến tổng hợp tự động từ xã/phường.</div>
 <div class="form-grid"><div class="field wide"><label class="field-label">Xã, phường báo cáo</label><select class="field-select" data-select="edit-unit">${selectOptions(permitted.map(x=>({value:x.id,name:x.name})),ui.editUnit)}</select></div>
 <div class="field wide"><label class="field-label">Nhóm nhiệm vụ / công đoạn</label><select class="field-select" data-select="edit-stage">${stageOptions(ui.editStage)}</select></div>
 <div class="field wide"><label class="field-label">Chỉ tiêu</label><select class="field-select" data-select="edit-metric">${metricOptions(ui.editStage,ui.editMetric)}</select></div></div>
 <form id="update-form"><div class="field-grid"><div class="field"><label class="field-label" for="startDate">Ngày bắt đầu</label><input class="field-input" type="date" id="startDate" value="${esc(r.startDate||'')}"></div>
 <div class="field"><label class="field-label" for="endDate">Ngày kết thúc</label><input class="field-input" type="date" id="endDate" value="${esc(r.endDate||'')}"></div>
 <div class="field"><label class="field-label" for="target">Tổng phải thực hiện (${esc(m.unit)})</label><input class="field-input" type="number" min="0" max="1000000000000" step="${isDecimal(m)?'0.001':'1'}" id="target" required value="${r.target??''}"></div>
 <div class="field"><label class="field-label" for="value">Đã thực hiện (${esc(m.unit)})</label><input class="field-input" type="number" min="0" max="1000000000000" step="${isDecimal(m)?'0.001':'1'}" id="value" value="${r.value??''}" placeholder="Có thể bỏ trống nếu Chưa thực hiện"></div>
 <div class="field wide"><label class="field-label" for="status">Trạng thái</label><select required class="field-select" id="status"><option value="">— Chọn trạng thái —</option>${Object.entries(STATUS).map(([key,label])=>`<option value="${key}" ${key===r.status?'selected':''}>${label}</option>`).join('')}</select></div>
 <div class="field wide"><label class="field-label" for="note">Khó khăn, vướng mắc, kiến nghị</label><textarea maxlength="1500" id="note" class="field-textarea" placeholder="Nêu rõ khó khăn, vướng mắc và đề xuất (nếu có)">${esc(r.note)}</textarea></div></div>
 <div id="form-preview" class="preview-previous">Còn lại: <strong>${r.target!=null&&r.value!=null?fmt(r.target-r.value,m.unit):'—'}</strong> · Hoàn thành: <strong>${ptxt(pct(r.value,r.target))}</strong> · Lần cập nhật: ${fmtDate(r.updatedAt)}</div>
  <div class="form-actions mt-20"><button type="submit" class="btn btn-primary" ${pending?'disabled':''}>✓ ${pending?'Đang xử lý…':'Lưu kết quả cập nhật'}</button><button type="button" class="btn" data-action="go-units">Xem hồ sơ đơn vị</button>
  ${r.target!==null?`<button type="button" class="btn btn-soft" data-action="reset-metric" ${pending?'disabled':''}>↺ Đặt về 0</button><button type="button" class="btn btn-danger btn-outline-danger" data-action="delete-metric" ${pending?'disabled':''}>⌫ Xóa số liệu chỉ tiêu</button>`:''}</div>
  ${r.target!==null?'<p class="form-delete-help">Đặt về 0: giữ chỉ tiêu với kế hoạch và kết quả bằng 0. Xóa số liệu: đưa chỉ tiêu về trạng thái chưa từng nhập; lịch sử cập nhật vẫn được giữ.</p>':''}</form>
 </section>${section('Nhật ký thay đổi gần nhất',logs,'Chỉ người đăng nhập được xem nhật ký; lịch sử tách khỏi dữ liệu hiện hành.')}</div>
 <div class="lower-section">${section('Danh sách đơn vị thuộc tuyến',`<div class="unit-list">${db.units.map(u=>`<div class="unit-card"><div><strong>${esc(u.name)}</strong><p>${fmtDate(latestUnit(u.id))} · ${metricDefs.filter(m=>getRec(u.id,m.id).target!==null).length}/${metricDefs.length} chỉ tiêu có số liệu</p></div>${mayWrite(u.id)?`<button class="btn btn-soft" data-action="edit-unit" data-unit="${u.id}">Cập nhật</button>`:''}</div>`).join('')}</div>`,'Danh mục 10 xã, phường cố định, không thay đổi bằng tài khoản nhập liệu.')}</div>`;
}
function renderManage(){
 if(!isAdmin())return pageHead('BẢO MẬT','Không có quyền','Chỉ tài khoản admin được phép quản lý hồ sơ phân quyền.');
 const rows=profileRows.map(x=>`<tr><td class="wrap"><strong>${esc(x.displayName||'')}</strong><div class="subtext">${esc(x.email||'')}</div><div class="subtext">UID: ${esc(x.id)}</div></td><td>${esc(x.role||'')}</td><td>${esc(x.unitId||'')}</td><td>${x.active?'Hoạt động':'Khóa'}</td><td><button class="btn btn-soft" data-action="choose-user" data-uid="${esc(x.id)}">Sửa quyền</button></td></tr>`).join('');
 return `${pageHead('QUẢN TRỊ HỆ THỐNG','Quản lý phân quyền','Kế thừa tài khoản Firebase Authentication và collection users của các phiên bản trước.')}${dataNote()}
 <div class="form-actions" style="margin-bottom:16px"><button class="btn" data-action="export-json">⇩ Sao lưu dữ liệu hiện hành (JSON)</button></div><div class="panel-grid update-cols"><section class="panel"><div class="panel-toolbar"><h2 class="panel-title">Cấp / cập nhật quyền</h2></div>
 <div class="info-line">Đầu tiên tạo tài khoản email/mật khẩu trong Firebase Console → Authentication → Users. Sau đó sao chép UID và cấp hồ sơ tại đây. Không nhập mật khẩu người dùng vào website.</div>
 <form id="user-form" style="margin-top:17px"><div class="field-grid"><div class="field wide"><label class="field-label">Firebase User UID</label><input id="user-uid" class="field-input" maxlength="128" required placeholder="Dán UID từ Authentication"></div>
 <div class="field wide"><label class="field-label">Email đã tạo trong Authentication</label><input id="user-email" class="field-input" type="email" maxlength="254" required></div><div class="field wide"><label class="field-label">Tên hiển thị</label><input id="user-name" class="field-input" maxlength="100" required></div>
 <div class="field"><label class="field-label">Vai trò</label><select id="user-role" class="field-select"><option value="nhaplieu_xa">nhaplieu_xa – Một xã</option><option value="nhaplieu">nhaplieu – Toàn tuyến</option><option value="nhaplieu_ban">nhaplieu_ban – Ban Quản lý phía Bắc</option><option value="admin">admin – Quản trị</option></select></div><div class="field"><label class="field-label">Đơn vị</label><select id="user-unit" class="field-select">${selectOptions([{value:'TINH',name:'Toàn tuyến'},{value:'BAN_PHIA_BAC',name:'Ban Quản lý phía Bắc'},...UNITS.map(u=>({value:u.id,name:u.name}))],'BAC_KAN')}</select></div><div class="field wide"><label><input type="checkbox" id="user-active" checked> Tài khoản đang hoạt động</label></div></div>
 <div class="form-actions mt-20"><button type="submit" class="btn btn-primary">Lưu hồ sơ phân quyền</button></div></form></section>
 ${section('Các tài khoản đã có',`<div class="table-scroll"><table class="data-table"><thead><tr><th>Tài khoản</th><th>Vai trò</th><th>Đơn vị</th><th>Trạng thái</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan="5">Chưa có hồ sơ</td></tr>'}</tbody></table></div>`,'Không thay đổi Authentication UID; không tự tạo mật khẩu từ trình duyệt.')}</div>
 <div class="lower-section">${section('Dữ liệu cũ V2.1 – chỉ đọc',`<p class="subtext">Các báo cáo theo tuần trong <code>reports</code> được giữ nguyên. Admin có thể chọn từng báo cáo, xem trước và chuyển các chỉ tiêu hợp lệ chưa có trong <code>progress</code>; không tự động chuyển số liệu thử nghiệm hoặc báo cáo TINH.</p><button class="btn" data-action="load-legacy">Đọc danh sách báo cáo cũ (admin)</button><div class="unit-list mt-12">${legacyDocs.map(x=>`<div class="unit-card"><span><strong>${esc(x.id)}</strong><p>${esc(x.unitName||'')} · ${esc(x.period||'')}</p></span>${UNITS.some(u=>u.id===x.unitId)?`<button class="btn btn-soft" data-action="migrate-legacy" data-report="${esc(x.id)}">Kiểm tra và chuyển chỉ tiêu chưa có</button>`:`<span class="pill neutral">Báo cáo toàn tuyến cũ, không chuyển</span>`}</div>`).join('')}</div>`,'Để nhập dữ liệu chính thức, dùng biểu Cập nhật & nhật ký; không sao chép tự động các báo cáo thử.')}</div>`;
}
function render(){
 const lookup={overview:renderOverview,stages:renderStages,compare:renderCompare,units:renderUnits,update:renderUpdate,manage:renderManage,north:northRender};
 const title={overview:'Tổng quan',stages:'Tiến độ công đoạn',compare:'So sánh địa phương',units:'Hồ sơ đơn vị',update:'Cập nhật & nhật ký',manage:'Quản lý phân quyền',north:'Ban Quản lý phía Bắc'};
 $('#main').innerHTML=`<div class="page">${(lookup[ui.page]||renderOverview)()}</div>`;
 $('#topbar-section').textContent=title[ui.page]||'Tổng quan';
 document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.page===ui.page));
 const who=$('#identity');who.textContent=currentUser?(profile?.active?`${profile.displayName||'Người dùng'} · ${profile.role}`:'Tài khoản chưa được cấp quyền'):'Khách truy cập';
 $('#login-btn').hidden=!!currentUser;$('#logout-btn').hidden=!currentUser;
 document.body.classList.toggle('can-write',canEdit());document.body.classList.toggle('is-admin',isAdmin());
 const clock=$('#clock');clock.textContent=new Date().toLocaleDateString('vi-VN',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'});
}
function openPage(page){if((page==='update'&&!canEdit())||(page==='manage'&&!isAdmin())){toast('Bạn không có quyền vào chức năng này.');return;}ui.page=page;render();window.scrollTo({top:0,behavior:'instant'});$('#sidebar').classList.remove('open');}
let toastTimer;
function toast(message,tone='info'){
 const el=$('#toast');if(!el)return;
 const tones={info:'i',success:'✓',error:'!',warning:'!'};
 const selected=Object.hasOwn(tones,tone)?tone:'info';
 el.dataset.tone=selected;
 el.setAttribute('role',selected==='error'?'alert':'status');
 // Không đưa nội dung người dùng nhập trực tiếp vào innerHTML (phòng XSS).
 el.innerHTML=`<span class="toast-icon" aria-hidden="true">${tones[selected]}</span><span class="toast-copy">${esc(message)}</span><button type="button" class="toast-dismiss" aria-label="Đóng thông báo">×</button>`;
 el.classList.add('show');clearTimeout(toastTimer);
 toastTimer=setTimeout(()=>el.classList.remove('show'),5200);
}
$('#toast').addEventListener('click',e=>{
 if(e.target.closest('.toast-dismiss')){clearTimeout(toastTimer);$('#toast').classList.remove('show');}
});

// Hộp thoại xác nhận có nút Hủy/Xác nhận, hỗ trợ Escape và bấm bên ngoài.
let pendingConfirm=null;
const confirmDialog=$('#confirm-dialog');
confirmDialog.addEventListener('close',()=>{
 const resolve=pendingConfirm;pendingConfirm=null;
 if(resolve)resolve(confirmDialog.returnValue==='confirm');
});
confirmDialog.addEventListener('click',e=>{
 if(e.target===confirmDialog)confirmDialog.close('cancel');
});
function askConfirm({title='Xác nhận thao tác',message='Bạn muốn tiếp tục?',details='',accept='Xác nhận',tone='info'}={}){
 if(confirmDialog.open)return Promise.resolve(false);
 $('#confirm-title').textContent=title;
 $('#confirm-message').textContent=message;
 const detail=$('#confirm-details');detail.textContent=details;detail.hidden=!details;
 $('#confirm-accept').textContent=accept;
 $('#confirm-icon').textContent=(tone==='warning'||tone==='danger')?'!':'?';
 confirmDialog.dataset.tone=tone;
 confirmDialog.returnValue='cancel';
 return new Promise(resolve=>{pendingConfirm=resolve;confirmDialog.showModal();});
}
function fileDownload(name,text,mime='text/plain;charset=utf-8'){const b=new Blob([text],{type:mime}),a=document.createElement('a'),url=URL.createObjectURL(b);a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
function csvCell(v){let s=String(v??'');if(/^[\s]*[=+@\-\t\r]/.test(s))s="'"+s;return `"${s.replace(/"/g,'""')}"`;}
function exportCsv(){const rows=[['Mã đơn vị','Xã/phường','Nhóm công việc','Mã chỉ tiêu','Chỉ tiêu','Đơn vị','Ngày bắt đầu','Ngày kết thúc','Tổng phải thực hiện','Đã thực hiện','Còn lại','Hoàn thành (%)','Trạng thái','Cập nhật lần cuối','Khó khăn, vướng mắc, kiến nghị']];
for(const u of db.units)for(const m of metricDefs){const r=getRec(u.id,m.id);rows.push([u.id,u.name,stageById[m.stage].full,m.code,m.label,m.unit,r.startDate||'',r.endDate||'',r.target??'',r.value??'',r.target!=null&&r.value!=null?r.target-r.value:'',pct(r.value,r.target)??'',STATUS[r.status]||'',asDate(r.updatedAt)?fmtDate(r.updatedAt):'',r.note]);}
fileDownload('Tien_do_GPMB_Bac_Kan_Cao_Bang.csv','\ufeffsep=;\r\n'+rows.map(x=>x.map(csvCell).join(';')).join('\r\n'),'text/csv;charset=utf-8');toast('Đã xuất bảng dữ liệu hiện hành.','success');}
function exportJson(){if(!isAdmin())return;const safeRows=Object.fromEntries(Object.entries(db.records).map(([key,r])=>[key,{...r,updatedAt:asDate(r.updatedAt)?.toISOString()||null}]));fileDownload('Sao_luu_tien_do_hien_hanh.json',JSON.stringify({version:'V4',generatedAt:new Date().toISOString(),units:UNITS,records:safeRows,history:db.history},null,2),'application/json;charset=utf-8');toast('Đã tạo bản sao lưu dữ liệu V4 trên máy tính.','success');}
function freshCurrent(){return db.units.map(u=>({unit:u,updatedAt:latestUnit(u.id)}));}
function onFormPreview(form){const t=form.querySelector('#target').value,v=form.querySelector('#value').value;const total=t===''?null:Number(t),done=v===''?null:Number(v);const m=metricById[ui.editMetric];const valid=total!==null&&done!==null&&total>=0&&done>=0&&done<=total;
const remaining=valid?fmt(total-done,m.unit):'—',p=valid?ptxt(pct(done,total)):'—';form.querySelector('#form-preview').innerHTML=`Còn lại: <strong>${remaining}</strong> · Hoàn thành: <strong>${p}</strong> · Lần cập nhật gần nhất: ${fmtDate(getRec(ui.editUnit,ui.editMetric).updatedAt)}`;}
async function saveMetric(unitId,metricId,row,{onlyIfEmpty=false}={}){
 if(!currentUser||!mayWrite(unitId))throw Error('Không có quyền cập nhật xã, phường này.');
 const m=metricById[metricId],err=validate(row,m);if(err)throw Error(err);
 const progressRef=doc(fs,'progress',unitId),logRef=doc(collection(fs,'history'));
 // Chỉ gửi một dòng chỉ tiêu; giao dịch ghi nhật ký cùng lúc với dữ liệu hiện hành.
 await runTransaction(fs,async tx=>{
  const snap=await tx.get(progressRef);const old=snap.exists()?readRow(snap.data().rows?.[metricId]):null;
  if(onlyIfEmpty&&old)throw Error('Chỉ tiêu đã có dữ liệu, từ chối ghi đè.');
  const shown=getRec(unitId,metricId);const beforeStamp=old?.updatedAt?.getTime()||0,shownStamp=shown.updatedAt?.getTime()||0;
  if(beforeStamp!==shownStamp&&!onlyIfEmpty)throw Error('Một người khác đã cập nhật chỉ tiêu này. Hãy tải lại dữ liệu trước khi lưu.');
  const update={target:row.target,completed:row.value,status:row.status,note:row.note,startDate:row.startDate||'',endDate:row.endDate||'',updatedAt:serverTimestamp(),updatedBy:currentUser.uid};
  const meta={updatedAt:serverTimestamp(),updatedBy:currentUser.uid,lastMetricId:metricId,lastHistoryId:logRef.id};
  if(snap.exists())tx.update(progressRef,{...meta,[`rows.${metricId}`]:update});
  else tx.set(progressRef,{unitId,rows:{[metricId]:update},...meta});
  tx.set(logRef,{unitId,metricId,before:{target:old?.target??null,completed:old?.value??null,status:old?.status??'',startDate:old?.startDate||'',endDate:old?.endDate||''},after:{target:row.target,completed:row.value,status:row.status,startDate:row.startDate||'',endDate:row.endDate||''},note:row.note,createdBy:currentUser.uid,at:serverTimestamp()});
 });
}
// V4.1.4: Xóa riêng một chỉ tiêu trong rows, KHÔNG xóa tài liệu progress/{unitId}.
// Luôn ghi lịch sử cùng giao dịch và kiểm tra chống ghi đè nếu có người khác vừa cập nhật.
async function removeMetric(unitId,metricId){
 if(!currentUser||!mayWrite(unitId)||!metricById[metricId])throw Error('Không có quyền xóa chỉ tiêu của đơn vị này.');
 const progressRef=doc(fs,'progress',unitId),logRef=doc(collection(fs,'history'));
 await runTransaction(fs,async tx=>{
  const snap=await tx.get(progressRef),raw=snap.exists()?snap.data().rows?.[metricId]:null;
  if(!raw)throw Error('Chỉ tiêu hiện không còn dữ liệu. Hãy tải lại trang để kiểm tra.');
  const old=readRow(raw),shown=getRec(unitId,metricId);
  if((old.updatedAt?.getTime()||0)!==(shown.updatedAt?.getTime()||0))throw Error('Có người vừa cập nhật chỉ tiêu này. Hãy tải lại và kiểm tra trước khi xóa.');
  tx.update(progressRef,{
   updatedAt:serverTimestamp(),updatedBy:currentUser.uid,
   lastMetricId:metricId,lastHistoryId:logRef.id,
   [`rows.${metricId}`]:deleteField()
  });
  tx.set(logRef,{
   unitId,metricId,action:'delete',
   before:{target:raw.target??null,completed:raw.completed??null,status:raw.status??'',note:raw.note||'',startDate:raw.startDate||'',endDate:raw.endDate||'',updatedAt:raw.updatedAt??null,updatedBy:raw.updatedBy||''},
   after:{},note:'Xóa số liệu hiện hành của chỉ tiêu',createdBy:currentUser.uid,at:serverTimestamp()
  });
 });
}
// Hai thao tác khác nhau: đặt về 0 vẫn tồn tại bản ghi; xóa thì không còn bản ghi hiện hành.
async function onResetOrDeleteMetric(action){
 if(pending)return;
 const unitId=ui.editUnit,metricId=ui.editMetric,m=metricById[metricId],u=UNITS.find(x=>x.id===unitId);
 if(!m||!u||!mayWrite(unitId))return toast('Không có quyền thực hiện tại đơn vị này.','error');
 const old=getRec(unitId,metricId);
 if(old.target===null)return toast('Chỉ tiêu này chưa có dữ liệu để xử lý.','warning');
 const removing=action==='delete';
 const approved=await askConfirm({
  title:removing?'Xác nhận xóa số liệu chỉ tiêu':'Xác nhận đặt chỉ tiêu về 0',
  message:removing?'Số liệu hiện hành của CHỈ TIÊU này sẽ bị xóa khỏi các dashboard. Không xóa các chỉ tiêu khác và không xóa nhật ký.':'Kế hoạch và kết quả sẽ được đặt về 0; trạng thái chuyển thành Chưa thực hiện. Chỉ tiêu vẫn còn trong Firestore.',
  details:`Đơn vị: ${u.name}\nChỉ tiêu: ${m.code} · ${m.label}\nKế hoạch hiện tại: ${fmt(old.target,m.unit)} ${m.unit}\nĐã thực hiện: ${fmt(old.value,m.unit)} ${m.unit}\n\n${removing?'Không thể tự động khôi phục số liệu đã xóa; hãy sao lưu trước khi thực hiện.':'Thao tác được lưu vào nhật ký; không tác động tới chỉ tiêu khác.'}`,
  accept:removing?'Xóa số liệu':'Đặt về 0',tone:removing?'danger':'warning'
 });
 if(!approved)return;
 if(!currentUser||!mayWrite(unitId))return toast('Phiên đăng nhập không còn quyền thực hiện.','error');
 pending=true;
 try{
  if(removing){
   await removeMetric(unitId,metricId);
   delete db.records[`${unitId}|${metricId}`];
   toast('Đã xóa số liệu chỉ tiêu; nhật ký vẫn được lưu trên Firebase.','success');
  }else{
   const zero={target:0,value:0,status:'chua_thuc_hien',note:'',startDate:'',endDate:''};
   if(old.target===0&&old.value===0&&old.status===zero.status&&!old.note&&!old.startDate&&!old.endDate){toast('Chỉ tiêu đã ở giá trị 0, không cần cập nhật.','info');return;}
   await saveMetric(unitId,metricId,zero);
   toast('Đã đưa kế hoạch và kết quả về 0, đồng thời ghi nhật ký.','success');
  }
  render();
 }catch(e){console.error(e);toast(`Không thể ${removing?'xóa':'đặt về 0'}: ${e.message}`,'error');}
 finally{pending=false;render();}
}

async function onSaveMetric(form){if(pending)return;const unitId=ui.editUnit,m=metricById[ui.editMetric];if(!m||!mayWrite(unitId))return toast('Không có quyền nhập liệu.');
 const targetStr=form.querySelector('#target').value.trim(),doneStr=form.querySelector('#value').value.trim();
 const row={target:targetStr===''?null:Number(targetStr),value:doneStr===''?null:Number(doneStr),status:form.querySelector('#status').value,note:form.querySelector('#note').value.trim(),startDate:form.querySelector('#startDate').value,endDate:form.querySelector('#endDate').value};
 const error=validate(row,m);if(error)return toast(error);
 const old=getRec(unitId,m.id);if(old.target===row.target&&old.value===row.value&&old.status===row.status&&old.note===row.note&&(old.startDate||'')===row.startDate&&(old.endDate||'')===row.endDate)return toast('Chỉ tiêu chưa thay đổi, không cần lưu.');
 pending=true;const saveButton=form.querySelector('[type=submit]');saveButton.disabled=true;saveButton.textContent='Đang lưu…';
 try{await saveMetric(unitId,m.id,row);toast('Đã lưu chỉ tiêu và nhật ký trên Firebase.','success');render();}
 catch(e){console.error(e);toast(`Không thể lưu: ${e.message}`,'error');}
 finally{pending=false;saveButton.disabled=false;saveButton.textContent='✓ Lưu kết quả cập nhật';}
}
function pickUser(uid){const u=profileRows.find(x=>x.id===uid);if(!u)return;$('#user-uid').value=u.id;$('#user-email').value=u.email||'';$('#user-name').value=u.displayName||'';$('#user-role').value=u.role||'nhaplieu_xa';$('#user-unit').value=u.unitId||'BAC_KAN';$('#user-active').checked=!!u.active;$('#user-form').scrollIntoView({behavior:'smooth'});}
let userSavePending=false;
async function onSaveUser(form){
 if(!isAdmin()||userSavePending)return;
 const uid=form.querySelector('#user-uid').value.trim(),email=form.querySelector('#user-email').value.trim(),name=form.querySelector('#user-name').value.trim(),role=form.querySelector('#user-role').value,unitId=form.querySelector('#user-unit').value,active=form.querySelector('#user-active').checked;
 if(!uid||uid.includes('/')||!email||!name)return toast('UID, email, tên hiển thị chưa hợp lệ.','warning');
 if((role==='nhaplieu_xa'&&!UNITS.some(u=>u.id===unitId))||(role==='nhaplieu_ban'&&unitId!=='BAN_PHIA_BAC')||(role!=='nhaplieu_xa'&&role!=='nhaplieu_ban'&&unitId!=='TINH'))return toast('Vai trò và đơn vị không khớp. Tài khoản toàn tuyến phải có unitId = TINH.','warning');
 if(uid===currentUser.uid&&(!active||role!=='admin'))return toast('Không thể tự khóa hoặc hạ vai trò tài khoản admin đang sử dụng.','error');
 const existing=profileRows.some(u=>u.id===uid);
 const unitName=unitId==='TINH'?'Toàn tuyến':(UNITS.find(u=>u.id===unitId)?.name||unitId);
 const approved=await askConfirm({
  title:existing?'Xác nhận cập nhật phân quyền':'Xác nhận cấp quyền tài khoản',
  message:'Vui lòng kiểm tra hồ sơ trước khi lưu vào Firebase.',
  details:`Tên hiển thị: ${name}\nEmail: ${email}\nVai trò: ${role}\nĐơn vị: ${unitName}\nTrạng thái: ${active?'Hoạt động':'Khóa'}`,
  accept:existing?'Lưu thay đổi':'Cấp quyền'
 });
 if(!approved)return;
 if(!isAdmin())return toast('Phiên quản trị không còn hợp lệ. Vui lòng đăng nhập lại.','error');
 userSavePending=true;
 const button=form.querySelector('button[type="submit"]');if(button)button.disabled=true;
 try{
  await setDoc(doc(fs,'users',uid),{displayName:name,email,role,unitId,active,updatedAt:serverTimestamp()});
  toast(existing?'Đã cập nhật hồ sơ phân quyền.':'Đã cấp quyền tài khoản thành công.','success');
 }catch(e){console.error(e);toast(`Không thể lưu quyền: ${e.message}`,'error');}
 finally{userSavePending=false;if(button)button.disabled=false;}
}
async function loadLegacy(){if(!isAdmin())return;try{const s=await getDocs(query(collection(fs,'reports'),limit(100)));legacyDocs=s.docs.map(d=>({id:d.id,...d.data()}));render();toast(`Đã đọc ${legacyDocs.length} tài liệu báo cáo cũ, không thay đổi số liệu.`,'success');}catch(e){console.error(e);toast(`Không đọc được reports: ${e.message}`,'error');}}
async function migrateLegacyReport(reportId){
 if(!isAdmin())return;
 const report=legacyDocs.find(x=>x.id===reportId);
 if(!report||!UNITS.some(u=>u.id===report.unitId))return toast('Báo cáo này không thuộc 10 xã, phường.');
 const entries=[];
 for(const m of metricDefs){const raw=report.rows?.[m.id];if(!raw)continue;
   const row={target:raw.target??null,value:raw.completed??null,status:raw.status||'',note:raw.note||'',startDate:raw.startDate||'',endDate:raw.endDate||''};
   if(row.target===null&&!row.status&&!row.note)continue;
   const error=validate(row,m);if(error){toast('Dữ liệu báo cáo cũ chưa hợp lệ: '+error);return;}
   if(/thử nghiệm|thử nghi[eệ]m|test/i.test(row.note)){toast('Báo cáo có dấu hiệu dữ liệu thử nghiệm. Không chuyển tự động.');return;}
   entries.push({m,row});
 }
 if(!entries.length)return toast('Không tìm thấy chỉ tiêu hợp lệ trong báo cáo.');
 const preview=entries.map(x=>`${x.m.code} · ${x.m.label}: ${x.row.value??0}/${x.row.target}`).join('\n');
 if(!await askConfirm({
  title:'Xác nhận chuyển dữ liệu báo cáo cũ',
  message:`Chuyển ${entries.length} chỉ tiêu từ ${reportId} sang dữ liệu hiện hành của ${report.unitName}? Chỉ chuyển chỉ tiêu chưa có; không ghi đè dữ liệu hiện hành.`,
  details:`Thời gian cập nhật được ghi là thời điểm chuyển thực tế.\n\n${preview}`,
  accept:'Xác nhận chuyển',tone:'warning'
 }))return;
 if(!isAdmin())return toast('Phiên quản trị không còn hợp lệ.','error');
 let copied=0,skipped=0,failed=0;
 for(const {m,row} of entries){try{await saveMetric(report.unitId,m.id,row,{onlyIfEmpty:true});copied++;}
 catch(e){if(String(e.message).includes('đã có dữ liệu'))skipped++;else {failed++;console.error('Migration:',m.id,e);}}}
 toast(`Đã chuyển ${copied} chỉ tiêu, bỏ qua ${skipped} đã có, ${failed} lỗi. Báo cáo gốc giữ nguyên.`,failed?'warning':'success');
}
function handleAction(el){if(northHandleAction(el))return;const a=el.dataset.action;switch(a){
 case 'export-csv':exportCsv();break;
  case 'export-json':exportJson();break;
  case 'reset-metric':onResetOrDeleteMetric('reset');break;
  case 'delete-metric':onResetOrDeleteMetric('delete');break;
 case 'print':window.print();break;
 case 'login':$('#login-dialog').showModal();break;
 case 'go-update':openPage('update');break;
 case 'go-stages':ui.stage=el.dataset.stage||'lap';ui.metric=metricDefs.find(m=>m.stage===ui.stage).id;openPage('stages');break;
 case 'go-updates':openPage('update');break;
 case 'go-units':ui.unit=ui.editUnit;openPage('units');break;
 case 'overview-kind':ui.overviewKind=el.dataset.kind==='tdc'?'tdc':'gpmb';render();break;
 case 'overview-toggle-picker':gpmbPickerOpen=!gpmbPickerOpen;render();break;
 case 'overview-reset-metrics':gpmbOverviewSelected.clear();GPMB_DEFAULT_OVERVIEW.forEach(id=>gpmbOverviewSelected.add(id));render();break;
 case 'overview-all-metrics':metricDefs.filter(m=>stageById[m.stage]?.kind==='gpmb').forEach(m=>gpmbOverviewSelected.add(m.id));render();break;
 case 'pick-kind':ui.stage=el.dataset.kind==='tdc'?'tdc_design':'lap';ui.metric=metricDefs.find(m=>m.stage===ui.stage).id;render();break;
 case 'pick-stage':ui.stage=el.dataset.stage;ui.metric=metricDefs.find(m=>m.stage===ui.stage).id;render();break;
 case 'pick-metric':ui.metric=el.dataset.metric;render();break;
 case 'edit-unit':if(!mayWrite(el.dataset.unit))return toast('Không có quyền sửa đơn vị này.');ui.editUnit=el.dataset.unit;openPage('update');break;
 case 'edit-metric':if(!mayWrite(el.dataset.unit))return toast('Không có quyền sửa đơn vị này.');ui.editUnit=el.dataset.unit;ui.editMetric=el.dataset.metric;ui.editStage=metricById[ui.editMetric].stage;openPage('update');break;
 case 'choose-user':if(isAdmin())pickUser(el.dataset.uid);break;
 case 'load-legacy':loadLegacy();break;
 case 'migrate-legacy':migrateLegacyReport(el.dataset.report);break;
 }}
document.addEventListener('click',e=>{const nav=e.target.closest('[data-page]');if(nav){openPage(nav.dataset.page);return;}const action=e.target.closest('[data-action]');if(action)handleAction(action);});
document.addEventListener('change',e=>{
 if(northHandleChange(e.target))return;
 if(e.target.matches('[data-overview-metric]')){
  const metricId=e.target.dataset.overviewMetric;
  if(metricById[metricId]&&stageById[metricById[metricId].stage]?.kind==='gpmb'){
   if(e.target.checked)gpmbOverviewSelected.add(metricId);else gpmbOverviewSelected.delete(metricId);
   render();
  }
  return;
 }
 if(e.target.id==='user-role'){const s=$('#user-unit');if(s)s.value=e.target.value==='nhaplieu_xa'?'BAC_KAN':e.target.value==='nhaplieu_ban'?'BAN_PHIA_BAC':'TINH';return;}const sel=e.target.closest('[data-select]');if(!sel)return;switch(sel.dataset.select){case 'scope':ui.scope=sel.value;break;case 'unit':ui.unit=sel.value;break;case 'comp-stage':ui.compStage=sel.value;ui.compMetric=metricDefs.find(m=>m.stage===sel.value).id;break;case 'comp-metric':ui.compMetric=sel.value;break;case 'edit-unit':ui.editUnit=sel.value;break;case 'edit-stage':ui.editStage=sel.value;ui.editMetric=metricDefs.find(m=>m.stage===sel.value).id;break;case 'edit-metric':ui.editMetric=sel.value;break;}render();});
document.addEventListener('input',e=>{if(northHandleInput(e.target))return;if(e.target.closest('#update-form')&&['target','value'].includes(e.target.id)){const f=e.target.closest('#update-form');onFormPreview(f);}});
document.addEventListener('submit',e=>{if(e.target.id==='north-form'){e.preventDefault();northHandleSubmit(e.target);return;}if(e.target.id==='update-form'){e.preventDefault();onSaveMetric(e.target);}if(e.target.id==='user-form'){e.preventDefault();onSaveUser(e.target);}});
$('#mobile-menu').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
$('#login-btn').addEventListener('click',()=>$('#login-dialog').showModal());
$('#logout-btn').addEventListener('click',async()=>{try{await signOut(auth);toast('Đã đăng xuất.','success');}catch(e){toast(e.message);}});
$('#login-form').addEventListener('submit',async e=>{e.preventDefault();const f=e.target,btn=f.querySelector('[type=submit]');btn.disabled=true;try{await signInWithEmailAndPassword(auth,f.elements.namedItem('email').value.trim(),f.elements.namedItem('password').value);f.elements.namedItem('password').value='';$('#login-dialog').close();}catch(err){console.error(err);toast('Không đăng nhập được. Kiểm tra email và mật khẩu.','error');}finally{btn.disabled=false;}});
function subscribeProgress(){progressUnsubscribe?.();progressUnsubscribe=onSnapshot(collection(fs,'progress'),snapshot=>{loadingProgress=false;serverError='';db.records={};snapshot.forEach(d=>{if(!UNITS.some(u=>u.id===d.id))return;for(const [key,raw] of Object.entries(d.data().rows||{})){if(!metricById[key])continue;const row=readRow(raw);if(row)db.records[`${d.id}|${key}`]=row;}});
 // Không xóa biểu mẫu đang gõ vì dữ liệu của xã khác vừa đồng bộ.
 const active=document.activeElement;if(ui.page==='update'&&active?.closest('#update-form'))return;render();},err=>{loadingProgress=false;serverError=err.message;console.error(err);render();});}
function resetPrivate(){usersUnsubscribe?.();historyUnsubscribe?.();usersUnsubscribe=null;historyUnsubscribe=null;profileRows=[];db.history=[];}
function startPrivate(){resetPrivate();if(!profile?.active)return;
 historyUnsubscribe=onSnapshot(query(collection(fs,'history'),orderBy('at','desc'),limit(60)),s=>{db.history=s.docs.map(d=>({id:d.id,...d.data()}));if(ui.page==='update')render();},e=>console.warn('History:',e));
 if(isAdmin())usersUnsubscribe=onSnapshot(collection(fs,'users'),s=>{profileRows=s.docs.map(d=>({id:d.id,...d.data()}));if(ui.page==='manage')render();},e=>console.warn('Users:',e));}
northInit({getUser:()=>currentUser,getProfile:()=>profile,toast,confirm:askConfirm,redraw:()=>{if(ui.page==='north')render();}});
onAuthStateChanged(auth,user=>{currentUser=user;profileUnsubscribe?.();profileUnsubscribe=null;profile=null;resetPrivate();if(!user){northStartPrivate();if(['update','manage'].includes(ui.page))ui.page='overview';render();return;}
 profileUnsubscribe=onSnapshot(doc(fs,'users',user.uid),s=>{profile=s.exists()?s.data():null;if(profile?.role==='nhaplieu_xa'&&profile.unitId)ui.editUnit=profile.unitId;if(!canEdit()&&['update','manage'].includes(ui.page))ui.page='overview';if(!isAdmin()&&ui.page==='manage')ui.page='overview';startPrivate();northStartPrivate();render();},e=>{profile=null;console.error(e);toast('Không đọc được hồ sơ phân quyền.');render();});});
subscribeProgress();render();
