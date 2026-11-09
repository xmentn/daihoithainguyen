import { db, auth } from "./firebase-config.js";
import {
  collection,
  addDoc,
  doc,
  setDoc,
  getDoc,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  deleteDoc,
  getDocs,
  limit,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

window.logoutUser = function () {
  signOut(auth).then(() => {
    window.location.href = "login.html";
  });
};

window.showInstructions = function () {
  Swal.fire({
    title: "Hướng dẫn sử dụng",
    html: `
      <div style="text-align: left; font-size: 14px; line-height: 1.6; color: #334155;">
        <p><b>1. Quản lý Đợt số hóa:</b> Thiết lập và điều chỉnh các thông số mục tiêu (m, trang) của từng đợt làm cơ sở tính tỷ lệ hoàn thành.</p>
        <p><b>2. Báo cáo Tiến độ:</b> Nhập liệu lũy kế số lượng thực tế đạt được ở từng hạng mục. Yêu cầu ghi rõ <b>Cán bộ phụ trách báo cáo</b>.</p>
        <p><b>3. Danh mục đơn vị:</b> Đồng bộ danh sách các cơ quan, đơn vị từ tệp Excel theo cấu trúc quy định.</p>
        <p><b>4. Thiết lập thời gian:</b> Quy định khoảng thời gian mở cổng để các đơn vị trực thuộc thực hiện nạp báo cáo số liệu vào hệ thống.</p>
      </div>
    `,
    icon: "info",
    confirmButtonColor: "#0056b3",
    confirmButtonText: "Đã hiểu"
  });
};

let campaignsConfigMap = {};
let latestProgressByCampaignMap = {};
let progressHistoryCache = []; // Lịch sử tải một lần; lọc hiển thị theo dropdown chung.
let editingProgressHadThaoGhim = true; // Không tự thêm field B0 khi chỉ sửa báo cáo lịch sử cũ.

function setupTab4TimeManagement() {
  onSnapshot(doc(db, "campaigns", "lock_config"), (docSnap) => {
    const txtStart = document.getElementById('lock-start-time');
    const txtEnd = document.getElementById('lock-end-time');
    const alertBox = document.getElementById('status-time-alert');

    if (!docSnap.exists() || !alertBox) return;

    const config = docSnap.data();

    if (config.startTime && txtStart) txtStart.value = config.startTime;
    if (config.endTime && txtEnd) txtEnd.value = config.endTime;

    const updateAdminAlertStatus = () => {
      if (!config.startTime || !config.endTime) return;
      const now = new Date();
      const start = new Date(config.startTime);
      const end = new Date(config.endTime);

      if (now < start || now > end) {
        alertBox.style.background = "#fef2f2";
        alertBox.style.border = "1px solid #fecaca";
        alertBox.style.color = "#dc2626";
        alertBox.innerHTML = `<i class="fa-solid fa-circle-lock"></i> HỆ THỐNG ĐANG ĐÓNG (Ngoài khung giờ quy định)`;
      } else {
        alertBox.style.background = "#e6f4ea";
        alertBox.style.border = "1px solid #10b981";
        alertBox.style.color = "#16a34a";
        alertBox.innerHTML = `<i class="fa-solid fa-circle-check"></i> HỆ THỐNG ĐANG MỞ (Thu nhận báo cáo bình thường)`;
      }
    };

    updateAdminAlertStatus();
    if (window.adminTimeInterval) clearInterval(window.adminTimeInterval);
    window.adminTimeInterval = setInterval(updateAdminAlertStatus, 1000);
  });
}

window.saveLockConfig = async function (event) {
  event.preventDefault();
  const sTime = document.getElementById('lock-start-time').value;
  const eTime = document.getElementById('lock-end-time').value;

  try {
    await setDoc(doc(db, "campaigns", "lock_config"), {
      startTime: sTime,
      endTime: eTime,
      updatedAt: new Date().toISOString()
    });

    Swal.fire({
      title: "Cập nhật thành công",
      text: "Đã thiết lập khung giờ và đồng bộ chỉ thị đến tài khoản các đơn vị.",
      icon: "success",
      confirmButtonColor: "#ea580c"
    });
  } catch (error) {
    Swal.fire({
      title: "Lỗi đồng bộ",
      text: "Không thể lưu cấu hình, vui lòng kiểm tra kết nối mạng.",
      icon: "error",
      confirmButtonColor: "#64748b"
    });
  }
};

async function loadCampaignsAdminTable() {
  const campQuery = query(collection(db, "campaigns"), orderBy("timestamp", "desc"));
  const querySnapshot = await getDocs(campQuery);
  const campTableBody = document.getElementById("campaign-table-body");
  if (campTableBody) campTableBody.innerHTML = "";
  campaignsConfigMap = {};

  querySnapshot.forEach((docSnap) => {
    if (docSnap.id === "lock_config") return;
    const camp = docSnap.data();
    const campId = docSnap.id;

    campaignsConfigMap[camp.campaignName] = {
      tongChinhLy: camp.tongChinhLy || 0,
      tongSoCanScan: camp.tongSoCanScan || 0,
    };

    const row = document.createElement("tr");
    row.style.borderBottom = "1px solid #f1f5f9";
    row.innerHTML = `
        <td style="padding: 10px; font-weight: 600; color: #1e293b;">${camp.campaignName}</td>
        <td style="padding: 10px;">${camp.tongChinhLy} m</td>
        <td style="padding: 10px;">${(camp.tongSoCanScan || 0).toLocaleString()} tr</td>
        <td style="padding: 10px; text-align: center; display: flex; gap: 5px; justify-content: center;">
            <button onclick="startEditCamp('${campId}')" style="background: #e0f2fe; color: #0369a1; border: none; padding: 4px 8px; border-radius: 4px; font-weight: 600; cursor: pointer; font-size: 11.5px;">Sửa</button>
            <button onclick="deleteCamp('${campId}', '${camp.campaignName}')" style="background: #fee2e2; color: #b91c1c; border: none; padding: 4px 8px; border-radius: 4px; font-weight: 600; cursor: pointer; font-size: 11.5px;">Xóa</button>
        </td>
      `;
    if (campTableBody) campTableBody.appendChild(row);
  });

  updateCampaignSelectOptions();
}

// Lọc Nhật ký báo cáo theo đúng đợt đang chọn trong biểu mẫu bên trái.
// Chỉ thay đổi bảng hiển thị, không ghi/đụng tới dữ liệu lịch sử trên Firestore.
function renderProgressHistoryByCampaign() {
  const tableBody = document.getElementById("history-table-body");
  if (!tableBody) return;

  const campaignName = document.getElementById("input-campaign-name")?.value || "";
  const status = document.getElementById("history-campaign-status");
  tableBody.innerHTML = "";

  if (!campaignName) {
    if (status) status.textContent = "Chọn đợt số hóa trong biểu mẫu bên trái để xem nhật ký tương ứng.";
    tableBody.innerHTML = '<tr><td colspan="4" style="padding: 24px 12px; text-align: center; color: #64748b;">Vui lòng chọn đợt số hóa để xem nhật ký báo cáo.</td></tr>';
    return;
  }

  const filteredLogs = progressHistoryCache.filter(({ log }) => log.campaignName === campaignName);
  if (status) status.textContent = `Đợt: ${campaignName} — ${filteredLogs.length} lần báo cáo`;

  if (filteredLogs.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="4" style="padding: 24px 12px; text-align: center; color: #64748b;">Đợt số hóa này chưa có báo cáo tiến độ.</td></tr>';
    return;
  }

  filteredLogs.forEach(({ docId, log }) => {
    const row = document.createElement("tr");
    row.style.borderBottom = "1px solid #f1f5f9";
    row.innerHTML = `
        <td style="padding: 10px; font-weight: 600; color: #1e293b;">${log.campaignName || "Chưa rõ"}<br><small style='color:#64748b;font-weight:500;'>${log.dateLabel}</small></td>
        <td style="padding: 10px; font-size: 12px;">${log.officerInCharge || "--"}</td>
        <td style="padding: 10px;">${log.chinhLyDaXong || 0} m</td>
        <td style="padding: 10px; text-align: center; display: flex; gap: 5px; justify-content: center;">
            <button class="btn-edit-action" onclick="startEdit('${docId}')" style="background: #e0f2fe; color: #0369a1; border: none; padding: 4px 8px; border-radius: 4px; font-weight: 600; cursor: pointer; font-size: 11.5px;">Sửa</button>
            <button onclick="deleteProgress('${docId}')" style="background: #fee2e2; color: #b91c1c; border: none; padding: 4px 8px; border-radius: 4px; font-weight: 600; cursor: pointer; font-size: 11.5px;">Xóa</button>
        </td>
      `;
    tableBody.appendChild(row);
  });
}

async function loadProgressHistoryAdminTable() {
  const historyQuery = query(collection(db, "progress_history"), orderBy("timestamp", "desc"));
  const querySnapshot = await getDocs(historyQuery);
  latestProgressByCampaignMap = {};
  progressHistoryCache = [];

  querySnapshot.forEach((docSnap) => {
    const log = docSnap.data();
    // Truy vấn đã sắp xếp mới -> cũ: giữ thông tin bản ghi mới nhất cho tính năng nhập liệu lũy kế.
    if (log.campaignName && !latestProgressByCampaignMap[log.campaignName]) {
      latestProgressByCampaignMap[log.campaignName] = log;
    }
    progressHistoryCache.push({ docId: docSnap.id, log });
  });

  renderProgressHistoryByCampaign();
}

async function syncCurrentStateFromLatestHistory() {
  try {
    const latestQuery = query(
      collection(db, "progress_history"),
      orderBy("timestamp", "desc"),
      limit(1),
    );
    const latestSnapshot = await getDocs(latestQuery);
    if (!latestSnapshot.empty) {
      await setDoc(doc(db, "progress", "current_state"), latestSnapshot.docs[0].data());
    }
  } catch (error) {
    console.error("Lỗi đồng bộ trạng thái hiện tại:", error);
  }
}

async function setupAdminData() {
  const today = new Date();
  if (document.getElementById("input-date")) {
    document.getElementById("input-date").value =
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  }

  // Realtime chỉ giữ cho cấu hình đóng/mở cổng vì đây là tín hiệu nhỏ và cần phản ánh tức thời.
  setupTab4TimeManagement();

  // Hai bảng quản trị chỉ đọc một lần. Sau thao tác tạo/sửa/xóa sẽ chủ động tải lại đúng bảng liên quan.
  try {
    await Promise.all([
      loadCampaignsAdminTable(),
      loadProgressHistoryAdminTable(),
    ]);
  } catch (error) {
    console.error("Lỗi tải dữ liệu quản trị:", error);
  }
}

// Ẩn ô nhập chỉnh lý khi đợt số hóa không có chỉ tiêu chỉnh lý (tongChinhLy = 0).
// Vẫn giữ field chinhLyDaXong = 0 khi lưu để tương thích với dữ liệu cũ.
function updateChinhLyReportFieldVisibility(campaignName) {
  const group = document.getElementById("report-chinhly-group");
  const input = document.getElementById("input-cl-xong");
  if (!group || !input) return;

  const config = campaignsConfigMap[campaignName];
  const noChinhLy = !!config && Number(config.tongChinhLy) === 0;
  const wasHidden = group.style.display === "none";

  group.style.display = noChinhLy ? "none" : "";
  input.required = !noChinhLy;
  if (noChinhLy) {
    input.value = "0";
  } else if (wasHidden) {
    // Khi chuyển từ đợt không chỉnh lý sang đợt có chỉnh lý, không giữ lại số 0 cũ.
    input.value = "";
  }
}

function updateCampaignSelectOptions() {
  const selectBox = document.getElementById("input-campaign-name");
  if (!selectBox) return;
  const savedValue = selectBox.value;
  selectBox.innerHTML = "";
  const campaigns = Object.keys(campaignsConfigMap);

  const defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.innerText = "-- Chọn đợt số hóa dữ liệu --";
  selectBox.appendChild(defaultOpt);

  if (campaigns.length === 0) {
    updateChinhLyReportFieldVisibility("");
    renderProgressHistoryByCampaign();
    return;
  }

  campaigns.forEach((camp) => {
    const opt = document.createElement("option");
    opt.value = camp;
    opt.innerText = camp;
    selectBox.appendChild(opt);
  });

  if (savedValue && campaignsConfigMap[savedValue]) {
    selectBox.value = savedValue;
  }
  updateChinhLyReportFieldVisibility(selectBox.value);
  renderProgressHistoryByCampaign();
}

if (document.getElementById("input-campaign-name")) {
  document.getElementById("input-campaign-name").addEventListener("change", (e) => {
    const campaignName = e.target.value;
    // Không cho chế độ sửa bản ghi của đợt cũ tồn tại khi chuyển sang đợt khác.
    if (document.getElementById("editing-doc-id")?.value) window.resetToCreateMode();
    renderProgressHistoryByCampaign();
    if (document.getElementById("input-cl-xong")) document.getElementById("input-cl-xong").value = "";
    updateChinhLyReportFieldVisibility(campaignName);
    if (!campaignName) return;
    if (document.getElementById("input-sh-thaoghim")) document.getElementById("input-sh-thaoghim").value = "";
    if (document.getElementById("input-sh-scan")) document.getElementById("input-sh-scan").value = "";
    if (document.getElementById("input-sh-chuanhoa")) document.getElementById("input-sh-chuanhoa").value = "";
    if (document.getElementById("input-sh-phanmem")) document.getElementById("input-sh-phanmem").value = "";

    try {
      // Dùng cache đã tải khi mở trang quản trị, không truy vấn Firestore lại mỗi lần đổi dropdown.
      const config = campaignsConfigMap[campaignName] || { tongChinhLy: 0, tongSoCanScan: 0 };
      const chiTieuMet = Number(config.tongChinhLy || 0);
      const chiTieuTrang = Number(config.tongSoCanScan || 0);
      const latestLog = latestProgressByCampaignMap[campaignName];

      if (latestLog) {
        const dataMap = {
          "input-cl-xong": [Number(latestLog.chinhLyDaXong || 0), chiTieuMet],
          "input-sh-thaoghim": [Number(latestLog.soHoaThaoGhim || 0), chiTieuTrang],
          "input-sh-scan": [Number(latestLog.soHoaDaScan || 0), chiTieuTrang],
          "input-sh-bienmuc": [Number(latestLog.soHoaBienMuc || 0), chiTieuTrang],
          "input-sh-chuanhoa": [Number(latestLog.soHoaChuanHoa || 0), chiTieuTrang],
          "input-sh-hieuchinh": [Number(latestLog.soHoaHieuChinh || 0), chiTieuTrang],
          "input-sh-pdf2lop": [Number(latestLog.soHoaPdf2Lop || 0), chiTieuTrang],
          "input-sh-kyso": [Number(latestLog.soHoaKySo || 0), chiTieuTrang],
          "input-sh-nendulieu": [Number(latestLog.soHoaNenDuLieu || 0), chiTieuTrang],
          "input-sh-phanmem": [Number(latestLog.soHoaPhanMem || 0), chiTieuTrang],
          "input-sh-bangiao": [Number(latestLog.soHoaBanGiao || 0), chiTieuTrang],
        };

        for (const [elementId, [actualValue, targetValue]] of Object.entries(dataMap)) {
          if (actualValue >= targetValue && targetValue > 0 && document.getElementById(elementId)) {
            document.getElementById(elementId).value = targetValue;
          }
        }
      }
    } catch (err) {
      console.error("Lỗi tự động điền dữ liệu: ", err);
    }
  });
}

window.saveCampaignConfig = async function (e) {
  e.preventDefault();
  const btn = document.querySelector('#campaignForm button[type="submit"]');
  let origText = "Lưu đợt số hóa";
  if (btn) {
    origText = btn.innerHTML;
    btn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Đang lưu...";
    btn.disabled = true;
  }

  const campId = document.getElementById("editing-camp-id").value;
  const campaignName = document.getElementById("config-campaign-name").value.trim();
  const tongChinhLy = parseFloat(document.getElementById("config-tong-chinhly").value) || 0;
  const tongSoCanScan = parseInt(document.getElementById("config-tong-scan").value) || 0;

  const payload = {
    campaignName,
    tongChinhLy,
    tongSoCanScan,
    timestamp: new Date(),
  };

  try {
    if (campId) {
      await updateDoc(doc(db, "campaigns", campId), payload);
      Swal.fire({ title: "Thành công", text: `Đã cập nhật thông tin đợt: "${campaignName}"`, icon: "success", confirmButtonColor: "#0056b3" });
    } else {
      await addDoc(collection(db, "campaigns"), payload);
      Swal.fire({ title: "Thành công", text: `Đã khởi tạo đợt số hóa mới: "${campaignName}"`, icon: "success", confirmButtonColor: "#0056b3" });
    }
    resetCampForm();
    await loadCampaignsAdminTable();
  } catch (err) {
    Swal.fire({ title: "Lỗi kết nối", text: err.message, icon: "error", confirmButtonColor: "#dc2626" });
  }

  if (btn) {
    btn.innerHTML = origText;
    btn.disabled = false;
  }
};

window.startEditCamp = async (campId) => {
  try {
    const docSnap = await getDoc(doc(db, "campaigns", campId));
    if (docSnap.exists()) {
      const data = docSnap.data();
      document.getElementById("editing-camp-id").value = campId;
      document.getElementById("config-campaign-name").value = data.campaignName;
      document.getElementById("config-tong-chinhly").value = data.tongChinhLy;
      document.getElementById("config-tong-scan").value = data.tongSoCanScan;

      const campTitle = document.getElementById("camp-form-title");
      if (campTitle) campTitle.innerHTML = "<i class='fa-solid fa-wrench' style='color:#d97706;'></i> HIỆU CHỈNH THÔNG TIN ĐỢT";
      const btnCampText = document.getElementById("btn-camp-text");
      if (btnCampText) btnCampText.innerText = "Cập nhật thay đổi";
      const btnCancelCamp = document.getElementById("btn-cancel-camp-edit");
      if (btnCancelCamp) btnCancelCamp.style.display = "inline-flex";
    }
  } catch (e) {
    alert(e.message);
  }
};

window.resetCampForm = () => {
  document.getElementById("editing-camp-id").value = "";
  document.getElementById("campaignForm").reset();
  const campTitle = document.getElementById("camp-form-title");
  if (campTitle) campTitle.innerHTML = "<i class='fa-solid fa-sliders'></i> THIẾT LẬP ĐỢT SỐ HÓA";
  const btnCampText = document.getElementById("btn-camp-text");
  if (btnCampText) btnCampText.innerText = "Lưu đợt số hóa";
  const btnCancelCamp = document.getElementById("btn-cancel-camp-edit");
  if (btnCancelCamp) btnCancelCamp.style.display = "none";
};

window.deleteCamp = async (campId, campName) => {
  Swal.fire({
    title: "Xác nhận xóa?",
    text: `Đồng chí đang thao tác xóa đợt số hóa: "${campName}".`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#dc2626",
    cancelButtonColor: "#64748b",
    confirmButtonText: "Xóa",
    cancelButtonText: "Hủy"
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, "campaigns", campId));
        await loadCampaignsAdminTable();
        Swal.fire({ title: "Đã xóa", text: `Gỡ bỏ thành công đợt "${campName}".`, icon: "success", confirmButtonColor: "#0056b3" });
      } catch (e) {
        Swal.fire({ title: "Lỗi", text: e.message, icon: "error" });
      }
    }
  });
};

window.updateData = async (e) => {
  e.preventDefault();
  const btnSave = document.querySelector('#updateForm button[type="submit"]');
  let originalText = "Lưu báo cáo";
  if (btnSave) {
    originalText = btnSave.innerHTML;
    btnSave.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Đang xử lý...";
    btnSave.disabled = true;
  }

  const editingId = document.getElementById("editing-doc-id").value;
  const campaignName = document.getElementById("input-campaign-name").value;
  if (!campaignName) {
    Swal.fire({ title: "Yêu cầu", text: "Vui lòng chọn đợt số hóa.", icon: "warning", confirmButtonColor: "#0056b3" });
    if (btnSave) { btnSave.innerHTML = originalText; btnSave.disabled = false; }
    return;
  }

  const rawDateValue = document.getElementById("input-date").value;
  const dateParts = rawDateValue.split("-");
  const dateLabel = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
  const timestampDate = new Date(rawDateValue + "T12:00:00");
  const officerInCharge = document.getElementById("input-officer").value.trim();

  const config = campaignsConfigMap[campaignName] || { tongChinhLy: 0, tongSoCanScan: 0 };
  const chinhLyDaXong = Number(config.tongChinhLy) === 0
    ? 0
    : (parseFloat(document.getElementById("input-cl-xong").value) || 0);
  const currentStep = parseInt(document.getElementById("input-current-step").value, 10) || 0;
  const thaoGhimInput = document.getElementById("input-sh-thaoghim");
  const thaoGhimRaw = thaoGhimInput?.value.trim() ?? "";
  // Khi sửa dữ liệu đã lưu trước B0, bỏ trống nghĩa là giữ nguyên bản ghi cũ (không ghi thêm B0 = 0).
  const isLegacyEditWithoutThaoGhim = !!editingId && !editingProgressHadThaoGhim && thaoGhimRaw === "";
  const thaoGhimValue = Number(thaoGhimRaw);
  const tongSoCanScan = Number(config.tongSoCanScan);
  if (!thaoGhimInput || (!isLegacyEditWithoutThaoGhim && (
      thaoGhimRaw === "" || !Number.isSafeInteger(thaoGhimValue) || thaoGhimValue < 0 ||
      !Number.isFinite(tongSoCanScan) || tongSoCanScan < 0 ||
      thaoGhimValue > tongSoCanScan)) ||
      (currentStep === -1 && isLegacyEditWithoutThaoGhim)) {
    Swal.fire({
      title: "Số trang tháo ghim không hợp lệ",
      text: "Nhập số nguyên không âm, không vượt quá chỉ tiêu số trang của đợt số hóa.",
      icon: "warning",
      confirmButtonColor: "#0056b3"
    });
    if (btnSave) { btnSave.innerHTML = originalText; btnSave.disabled = false; }
    return;
  }

  const updatePayload = {
    campaignName,
    officerInCharge,
    tongChinhLy: config.tongChinhLy,
    tongSoCanScan: config.tongSoCanScan,
    tongSoCanChuanHoa: config.tongSoCanScan,
    chinhLyDaXong,
    chinhLyConLai: config.tongChinhLy - chinhLyDaXong > 0 ? config.tongChinhLy - chinhLyDaXong : 0,
    ...(!isLegacyEditWithoutThaoGhim ? { soHoaThaoGhim: thaoGhimValue } : {}),
    soHoaDaScan: parseInt(document.getElementById("input-sh-scan").value) || 0,
    soHoaBienMuc: parseInt(document.getElementById("input-sh-bienmuc").value) || 0,
    soHoaChuanHoa: parseInt(document.getElementById("input-sh-chuanhoa").value) || 0,
    soHoaHieuChinh: parseInt(document.getElementById("input-sh-hieuchinh").value) || 0,
    soHoaPdf2Lop: parseInt(document.getElementById("input-sh-pdf2lop").value) || 0,
    soHoaKySo: parseInt(document.getElementById("input-sh-kyso").value) || 0,
    soHoaNenDuLieu: parseInt(document.getElementById("input-sh-nendulieu").value) || 0,
    soHoaPhanMem: parseInt(document.getElementById("input-sh-phanmem").value) || 0,
    soHoaBanGiao: parseInt(document.getElementById("input-sh-bangiao").value) || 0,
    currentStep,
    dateLabel,
    timestamp: timestampDate,
  };

  try {
    if (editingId) {
      await updateDoc(doc(db, "progress_history", editingId), updatePayload);
      await Swal.fire({ title: "Hoàn tất", text: `Cập nhật thông tin ngày ${dateLabel} thành công.`, icon: "success", confirmButtonColor: "#0056b3" });
    } else {
      await addDoc(collection(db, "progress_history"), updatePayload);
      await Swal.fire({ title: "Hoàn tất", text: `Lưu số liệu tiến độ ngày ${dateLabel} thành công.`, icon: "success", confirmButtonColor: "#0056b3" });
    }
    await syncCurrentStateFromLatestHistory();
    window.location.href = "index.html";
  } catch (error) {
    if (btnSave) { btnSave.innerHTML = originalText; btnSave.disabled = false; }
    Swal.fire({ title: "Lỗi lưu trữ", text: error.message, icon: "error" });
  }
};

window.startEdit = async (docId) => {
  try {
    const docSnap = await getDoc(doc(db, "progress_history", docId));
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (typeof window.switchTab === "function") window.switchTab("tab-progress");

      document.getElementById("editing-doc-id").value = docId;
      editingProgressHadThaoGhim = data.soHoaThaoGhim !== undefined && data.soHoaThaoGhim !== null;
      const thaoGhimInput = document.getElementById("input-sh-thaoghim");
      if (thaoGhimInput) {
        thaoGhimInput.required = editingProgressHadThaoGhim;
        thaoGhimInput.placeholder = editingProgressHadThaoGhim
          ? "Nhập số trang đã tháo ghim..."
          : "Lịch sử cũ chưa theo dõi B0 (có thể để trống)";
      }
      document.getElementById("input-campaign-name").value = data.campaignName || "";
      renderProgressHistoryByCampaign();
      updateChinhLyReportFieldVisibility(data.campaignName || "");
      document.getElementById("input-officer").value = data.officerInCharge || "";
      document.getElementById("input-cl-xong").value = Number(campaignsConfigMap[data.campaignName]?.tongChinhLy) === 0
        ? 0 : (data.chinhLyDaXong || 0);

      document.getElementById("input-sh-thaoghim").value = data.soHoaThaoGhim ?? "";
      document.getElementById("input-sh-scan").value = data.soHoaDaScan || 0;
      document.getElementById("input-sh-bienmuc").value = data.soHoaBienMuc || 0;
      document.getElementById("input-sh-chuanhoa").value = data.soHoaChuanHoa || 0;
      document.getElementById("input-sh-hieuchinh").value = data.soHoaHieuChinh || 0;
      document.getElementById("input-sh-pdf2lop").value = data.soHoaPdf2Lop || 0;
      document.getElementById("input-sh-kyso").value = data.soHoaKySo || 0;
      document.getElementById("input-sh-nendulieu").value = data.soHoaNenDuLieu || 0;
      document.getElementById("input-sh-phanmem").value = data.soHoaPhanMem || 0;
      document.getElementById("input-sh-bangiao").value = data.soHoaBanGiao || 0;

      if (document.getElementById("input-current-step")) document.getElementById("input-current-step").value = data.currentStep || 0;

      if (data.timestamp) {
        const t = data.timestamp.toDate();
        document.getElementById("input-date").value = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
      }
      const formTitle = document.getElementById("form-action-title");
      if (formTitle) formTitle.innerHTML = "<i class='fa-solid fa-wrench' style='color:#d97706;'></i> HIỆU CHỈNH TIẾN ĐỘ BÁO CÁO";
      const btnSubmitText = document.getElementById("btn-submit-text");
      if (btnSubmitText) btnSubmitText.innerText = "Cập nhật thay đổi";
      const btnCancelEdit = document.getElementById("btn-cancel-edit");
      if (btnCancelEdit) btnCancelEdit.style.display = "inline-flex";
      const updateForm = document.getElementById("updateForm");
      if (updateForm) updateForm.scrollIntoView({ behavior: "smooth" });
    }
  } catch (e) {
    alert(e.message);
  }
};

window.resetToCreateMode = () => {
  document.getElementById("editing-doc-id").value = "";
  editingProgressHadThaoGhim = true;
  const thaoGhimInput = document.getElementById("input-sh-thaoghim");
  if (thaoGhimInput) {
    thaoGhimInput.required = true;
    thaoGhimInput.placeholder = "Nhập số trang đã tháo ghim...";
  }
  document.getElementById("input-officer").value = "";
  const fields = ["input-cl-xong", "input-sh-thaoghim", "input-sh-scan", "input-sh-bienmuc", "input-sh-chuanhoa", "input-sh-hieuchinh", "input-sh-pdf2lop", "input-sh-kyso", "input-sh-nendulieu", "input-sh-phanmem", "input-sh-bangiao"];
  fields.forEach(id => {
    if (document.getElementById(id)) document.getElementById(id).value = "";
  });
  updateChinhLyReportFieldVisibility(document.getElementById("input-campaign-name")?.value || "");
  if (document.getElementById("input-current-step")) document.getElementById("input-current-step").value = 0;

  const formTitle = document.getElementById("form-action-title");
  if (formTitle) formTitle.innerHTML = "<i class='fa-solid fa-pen-to-square'></i> CẬP NHẬT TIẾN ĐỘ THỰC TẾ LŨY KẾ";
  const btnSubmitText = document.getElementById("btn-submit-text");
  if (btnSubmitText) btnSubmitText.innerText = "Lưu báo cáo";
  const btnCancelEdit = document.getElementById("btn-cancel-edit");
  if (btnCancelEdit) btnCancelEdit.style.display = "none";
};

window.deleteProgress = async (docId) => {
  Swal.fire({
    title: "Xác nhận xóa?",
    text: "Dữ liệu bản ghi này sẽ bị gỡ bỏ khỏi hệ thống.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#dc2626",
    cancelButtonColor: "#64748b",
    confirmButtonText: "Xóa",
    cancelButtonText: "Hủy"
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, "progress_history", docId));
        await syncCurrentStateFromLatestHistory();
        await loadProgressHistoryAdminTable();
        Swal.fire({ title: "Hoàn tất", text: "Đã xóa bản ghi tiến độ.", icon: "success", confirmButtonColor: "#0056b3" });
      } catch (e) {
        Swal.fire({ title: "Lỗi hệ thống", text: e.message, icon: "error" });
      }
    }
  });
};

function initAdminPage() {
  import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js").then((authModule) => {
    auth.setPersistence(authModule.browserSessionPersistence || authModule.inMemoryPersistence);
  }
  );

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const nameContainer = document.getElementById("admin-name");
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().role === "admin") {
          if (userDoc.data().fullName && nameContainer) {
            nameContainer.innerHTML = `<i class='fa-solid fa-user-shield'></i> Xin chào, ${userDoc.data().fullName}`;
          }
          setupAdminData();
          setTimeout(loadOrganizationUnits, 500);
        } else {
          Swal.fire({ title: "Từ chối truy cập", text: "Tài khoản không có quyền quản trị hệ thống.", icon: "error" }).then(() => {
            window.location.href = "index.html";
          });
        }
      } catch (err) {
        console.error("Lỗi xác thực: ", err);
      }
    } else {
      window.location.href = "login.html";
    }
  });
}

document.addEventListener("DOMContentLoaded", initAdminPage);

// Cache danh mục: giữ nguyên document ID để các dữ liệu liên kết với đơn vị không bị ảnh hưởng.
let adminOrganizationUnits = [];

function validUnitStt(value) {
  if (typeof value === "string" && !/^0*[1-9]\d*$/.test(value.trim())) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function normalizeUnitName(value) {
  return String(value || "").normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("vi");
}

function escapeUnitText(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

// Nhập Excel chỉ thêm mới. Kiểm tra toàn bộ tệp và danh mục hiện có TRƯỚC KHI ghi.
window.handleExcelUpload = function (event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const fileNameDisplay = document.getElementById("file-name-display");
  if (fileNameDisplay) fileNameDisplay.innerText = file.name;

  const reader = new FileReader();
  reader.onload = async function (readEvent) {
    try {
      const data = new Uint8Array(readEvent.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const unitRows = rawRows.slice(1).map((row, index) => ({
        excelRow: index + 2,
        stt: validUnitStt(row?.[0]),
        rawStt: row?.[0],
        unitName: String(row?.[1] ?? "").trim()
      })).filter((row) => row.unitName || String(row.rawStt ?? "").trim());

      if (unitRows.length === 0) {
        await Swal.fire("Lỗi dữ liệu", "Tệp không có đơn vị hợp lệ (cột 1: STT, cột 2: Tên đơn vị).", "warning");
        return;
      }
      // Firestore hỗ trợ tối đa 500 thao tác/batch. Danh mục hiện tại có khoảng 92 đơn vị.
      if (unitRows.length > 450) {
        await Swal.fire("Tệp quá lớn", "Vui lòng chia danh sách thành các tệp tối đa 450 đơn vị để nhập an toàn.", "warning");
        return;
      }

      const existing = await getDocs(collection(db, "organization_units"));
      const occupiedStt = new Set();
      const occupiedNames = new Set();
      existing.forEach((unitDoc) => {
        const info = unitDoc.data();
        const number = validUnitStt(info.stt);
        if (number !== null) occupiedStt.add(number);
        occupiedNames.add(normalizeUnitName(info.unitName));
      });
      const incomingStt = new Set();
      const incomingNames = new Set();
      for (const row of unitRows) {
        if (!row.unitName) {
          await Swal.fire("Thiếu tên đơn vị", `Dòng ${row.excelRow}: Chưa có tên đơn vị tại cột 2. Chưa có dữ liệu nào được ghi.`, "warning");
          return;
        }
        if (row.stt === null) {
          await Swal.fire("STT không hợp lệ", `Dòng ${row.excelRow}: STT phải là số nguyên dương. Chưa có dữ liệu nào được ghi.`, "warning");
          return;
        }
        if (occupiedStt.has(row.stt) || incomingStt.has(row.stt)) {
          await Swal.fire("Trùng STT", `Dòng ${row.excelRow}: STT ${row.stt} đã được sử dụng. Chưa có dữ liệu nào được ghi.`, "warning");
          return;
        }
        const nameKey = normalizeUnitName(row.unitName);
        if (occupiedNames.has(nameKey) || incomingNames.has(nameKey)) {
          await Swal.fire("Trùng đơn vị", `Dòng ${row.excelRow}: ${row.unitName} đã có trong danh mục hoặc trong tệp. Chưa có dữ liệu nào được ghi.`, "warning");
          return;
        }
        incomingStt.add(row.stt);
        incomingNames.add(nameKey);
      }

      const batch = writeBatch(db);
      unitRows.forEach((row) => {
        batch.set(doc(collection(db, "organization_units")), {
          stt: row.stt,
          unitName: row.unitName,
          createdAt: new Date()
        });
      });
      await batch.commit();
      await loadOrganizationUnits();
      await Swal.fire("Hoàn tất", `Đã thêm ${unitRows.length} đơn vị, STT không trùng nhau.`, "success");
    } catch (error) {
      console.error("Lỗi nhập danh mục Excel:", error);
      await Swal.fire("Không thể nhập danh mục", "Đã xảy ra lỗi khi đọc tệp hoặc ghi Firestore. Vui lòng kiểm tra kết nối và thử lại.", "error");
    } finally {
      // Cho phép người dùng chọn lại đúng cùng một tệp khi cần.
      if (event.target) event.target.value = "";
    }
  };
  reader.onerror = () => {
    Swal.fire("Lỗi tệp", "Không thể đọc tệp Excel đã chọn.", "error");
    if (event.target) event.target.value = "";
  };
  reader.readAsArrayBuffer(file);
};

async function loadOrganizationUnits() {
  const tbody = document.getElementById("units-table-body");
  if (!tbody) return;

  try {
    // Không dùng orderBy phía server: vẫn đọc được các bản ghi cũ bị thiếu field stt.
    const snapshot = await getDocs(collection(db, "organization_units"));
    adminOrganizationUnits = snapshot.docs.map((unitDoc) => ({
      id: unitDoc.id,
      stt: validUnitStt(unitDoc.data().stt),
      rawStt: unitDoc.data().stt,
      unitName: String(unitDoc.data().unitName || "")
    }));
    adminOrganizationUnits.sort((a, b) =>
      (a.stt ?? Number.MAX_SAFE_INTEGER) - (b.stt ?? Number.MAX_SAFE_INTEGER) ||
      a.unitName.localeCompare(b.unitName, "vi") || a.id.localeCompare(b.id)
    );

    tbody.innerHTML = "";
    const statusBox = document.getElementById("unit-order-status");
    if (adminOrganizationUnits.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #94a3b8;">Hệ thống chưa ghi nhận đơn vị nào. Vui lòng cập nhật.</td></tr>';
      if (statusBox) statusBox.style.display = "none";
      return;
    }

    const seenStt = new Set();
    const conflictingStt = new Set();
    for (const unit of adminOrganizationUnits) {
      if (unit.stt === null) continue;
      if (seenStt.has(unit.stt)) conflictingStt.add(unit.stt);
      seenStt.add(unit.stt);
    }
    const invalidCount = adminOrganizationUnits.filter((unit) => unit.stt === null).length;
    if (statusBox) {
      statusBox.style.display = conflictingStt.size || invalidCount ? "block" : "none";
      if (conflictingStt.size || invalidCount) {
        statusBox.textContent = `Dữ liệu cũ cần rà soát: ${conflictingStt.size} STT bị trùng, ${invalidCount} STT trống/sai định dạng. Bấm Sửa để điều chỉnh, hệ thống không tự thay đổi dữ liệu đã lưu.`;
      }
    }

    for (const unit of adminOrganizationUnits) {
      const isConflict = unit.stt === null || conflictingStt.has(unit.stt);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="text-align: center; font-weight: 700; ${isConflict ? "color: #b45309;" : ""}" title="${isConflict ? "STT cần rà soát" : ""}">
          ${unit.stt ?? "Chưa có"}${isConflict ? ' <i class="fa-solid fa-triangle-exclamation" aria-label="STT cần rà soát"></i>' : ""}
        </td>
        <td style="font-weight: 600; color: #1e293b;">${escapeUnitText(unit.unitName)}</td>
        <td style="text-align: center; white-space: nowrap;">
          <button type="button" class="modern-btn-secondary" data-unit-action="edit" style="color: #0369a1; border-color: #bae6fd; background: #e0f2fe; padding: 4px 10px; height: auto; font-size: 12px;">
            <i class="fa-solid fa-pen"></i> Sửa
          </button>
          <button type="button" class="modern-btn-secondary" data-unit-action="delete" style="color: #e53e3e; border-color: #fed7d7; background: #fff5f5; padding: 4px 10px; height: auto; font-size: 12px; margin-left: 5px;">
            <i class="fa-solid fa-trash-can"></i> Xóa
          </button>
        </td>`;
      tr.querySelector('[data-unit-action="edit"]').addEventListener("click", () => window.editUnit(unit.id));
      tr.querySelector('[data-unit-action="delete"]').addEventListener("click", () => window.deleteUnit(unit.id));
      tbody.appendChild(tr);
    }
  } catch (error) {
    console.error("Lỗi tải danh mục đơn vị:", error);
    tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #b91c1c;">Không tải được danh mục đơn vị. Vui lòng kiểm tra kết nối.</td></tr>';
  }
}

window.editUnit = async function (id) {
  const unit = adminOrganizationUnits.find((item) => item.id === id);
  if (!unit) {
    await Swal.fire("Không tìm thấy đơn vị", "Hãy tải lại trang quản trị và thử lại.", "warning");
    return;
  }

  const result = await Swal.fire({
    title: "Sửa thông tin đơn vị",
    html: `
      <div style="text-align: left; font-size: 13px; color: #334155;">
        <label for="edit-unit-stt" style="display:block; font-weight:700; margin: 8px 0 5px;">STT ưu tiên (số nguyên dương)</label>
        <input id="edit-unit-stt" type="number" min="1" step="1" class="swal2-input" style="width:100%; margin:0; box-sizing:border-box;" />
        <label for="edit-unit-name" style="display:block; font-weight:700; margin: 15px 0 5px;">Tên cơ quan, đơn vị, địa phương</label>
        <input id="edit-unit-name" type="text" class="swal2-input" style="width:100%; margin:0; box-sizing:border-box;" />
        <p style="margin: 10px 0 0; color:#64748b; line-height:1.6;">Nếu STT đã được đơn vị khác sử dụng, hai đơn vị sẽ hoán đổi STT. Không thay đổi mã đơn vị hoặc số liệu báo cáo.</p>
      </div>`,
    didOpen: () => {
      document.getElementById("edit-unit-stt").value = unit.stt ?? "";
      document.getElementById("edit-unit-name").value = unit.unitName;
    },
    showCancelButton: true,
    confirmButtonText: "Lưu thay đổi",
    cancelButtonText: "Hủy",
    confirmButtonColor: "#0056b3",
    showLoaderOnConfirm: true,
    preConfirm: async () => {
      const sttRaw = document.getElementById("edit-unit-stt").value.trim();
      const desiredStt = sttRaw ? validUnitStt(sttRaw) : null;
      const desiredName = document.getElementById("edit-unit-name").value.trim();
      if (desiredStt === null) {
        Swal.showValidationMessage("STT phải là số nguyên dương và không được để trống.");
        return false;
      }
      if (!desiredName) {
        Swal.showValidationMessage("Vui lòng nhập tên đơn vị.");
        return false;
      }

      try {
        // Đọc lại trước khi ghi nhằm phát hiện thay đổi từ phiên đăng nhập khác.
        const fresh = await getDocs(collection(db, "organization_units"));
        const records = fresh.docs.map((snap) => ({ id: snap.id, ref: snap.ref, ...snap.data() }));
        const old = records.find((item) => item.id === id);
        if (!old) {
          Swal.showValidationMessage("Đơn vị đã bị xóa. Vui lòng tải lại danh sách.");
          return false;
        }
        const nameExists = records.some((item) =>
          item.id !== id && normalizeUnitName(item.unitName) === normalizeUnitName(desiredName)
        );
        if (nameExists) {
          Swal.showValidationMessage("Tên đơn vị này đã tồn tại.");
          return false;
        }

        const otherUnits = records.filter((item) => item.id !== id);
        const targetOccupants = otherUnits.filter((item) => validUnitStt(item.stt) === desiredStt);
        if (targetOccupants.length > 1) {
          Swal.showValidationMessage(`STT ${desiredStt} đang bị trùng trong dữ liệu cũ. Hãy xử lý các đơn vị trùng STT trước.`);
          return false;
        }
        if (targetOccupants.length === 1) {
          const oldStt = validUnitStt(old.stt);
          const oldSttIsUnique = oldStt !== null &&
            !otherUnits.some((item) => validUnitStt(item.stt) === oldStt);
          if (!oldSttIsUnique) {
            Swal.showValidationMessage("STT hiện tại của đơn vị đang bị trùng/không hợp lệ. Hãy đặt STT chưa được sử dụng để xử lý trước khi hoán đổi.");
            return false;
          }
          const batch = writeBatch(db);
          batch.update(old.ref, { stt: desiredStt, unitName: desiredName });
          batch.update(targetOccupants[0].ref, { stt: oldStt });
          await batch.commit();
        } else {
          await updateDoc(old.ref, { stt: desiredStt, unitName: desiredName });
        }
        return true;
      } catch (error) {
        console.error("Lỗi cập nhật thông tin đơn vị:", error);
        Swal.showValidationMessage("Không thể lưu thay đổi. Kiểm tra kết nối Firestore và thử lại.");
        return false;
      }
    }
  });

  if (result.isConfirmed) {
    await loadOrganizationUnits();
    await Swal.fire({ title: "Đã cập nhật", text: "Thông tin đơn vị và thứ tự hiển thị đã được cập nhật.", icon: "success", confirmButtonColor: "#0056b3" });
  }
};

window.deleteUnit = async function (id) {
  const result = await Swal.fire({
    title: "Xác nhận xóa?",
    text: "Thao tác gỡ bỏ này không thể hoàn tác.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: "Đồng ý",
    cancelButtonText: "Hủy"
  });
  if (result.isConfirmed) {
    try {
      await deleteDoc(doc(db, "organization_units", id));
      await Swal.fire("Hoàn tất", "Đã gỡ thông tin cơ quan, đơn vị.", "success");
      await loadOrganizationUnits();
    } catch (error) {
      console.error("Lỗi xóa đơn vị:", error);
      await Swal.fire("Lỗi", "Không thể xóa đơn vị. Kiểm tra quyền và kết nối Firestore.", "error");
    }
  }
};
