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
  where,
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

async function setupAdminData() {
  const today = new Date();
  if (document.getElementById("input-date")) {
    document.getElementById("input-date").value =
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  }

  setupTab4TimeManagement();

  // 1. LẮNG NGHE DANH SÁCH ĐỢT SỐ HÓA
  const campQuery = query(collection(db, "campaigns"), orderBy("timestamp", "desc"));
  onSnapshot(campQuery, (querySnapshot) => {
    const campTableBody = document.getElementById("campaign-table-body");
    if (campTableBody) campTableBody.innerHTML = "";
    campaignsConfigMap = {};

    querySnapshot.forEach((docSnap) => {
      if (docSnap.id === "lock_config") return; // Bỏ qua bản ghi thời gian
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
  });

  // 2. LẮNG NGHE LỊCH SỬ TIẾN ĐỘ
  const historyQuery = query(collection(db, "progress_history"), orderBy("timestamp", "desc"));
  onSnapshot(historyQuery, (querySnapshot) => {
    const tableBody = document.getElementById("history-table-body");
    if (tableBody) tableBody.innerHTML = "";

    querySnapshot.forEach((docSnap) => {
      const log = docSnap.data();
      const docId = docSnap.id;

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
      if (tableBody) tableBody.appendChild(row);
    });
  });
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

  if (campaigns.length === 0) return;

  campaigns.forEach((camp) => {
    const opt = document.createElement("option");
    opt.value = camp;
    opt.innerText = camp;
    selectBox.appendChild(opt);
  });

  if (savedValue && campaignsConfigMap[savedValue]) {
    selectBox.value = savedValue;
  }
}

if (document.getElementById("input-campaign-name")) {
  document.getElementById("input-campaign-name").addEventListener("change", async (e) => {
    const campaignName = e.target.value;
    if (!campaignName) return;

    if (document.getElementById("input-cl-xong")) document.getElementById("input-cl-xong").value = "";
    if (document.getElementById("input-sh-scan")) document.getElementById("input-sh-scan").value = "";
    if (document.getElementById("input-sh-chuanhoa")) document.getElementById("input-sh-chuanhoa").value = "";
    if (document.getElementById("input-sh-phanmem")) document.getElementById("input-sh-phanmem").value = "";

    try {
      const campQ = query(collection(db, "campaigns"), where("campaignName", "==", campaignName));
      const campSnapshot = await getDocs(campQ);

      let chiTieuMet = 0;
      let chiTieuTrang = 0;

      if (!campSnapshot.empty) {
        const campData = campSnapshot.docs[0].data();
        chiTieuMet = Number(campData.tongChinhLy || 0);
        chiTieuTrang = Number(campData.tongSoCanScan || 0);
      } else {
        const fallbackConfig = campaignsConfigMap[campaignName] || { tongChinhLy: 0, tongSoCanScan: 0 };
        chiTieuMet = Number(fallbackConfig.tongChinhLy);
        chiTieuTrang = Number(fallbackConfig.tongSoCanScan);
      }

      const q = query(collection(db, "progress_history"), where("campaignName", "==", campaignName), orderBy("timestamp", "desc"));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const latestLog = querySnapshot.docs[0].data();

        const dataMap = {
          "input-cl-xong": [Number(latestLog.chinhLyDaXong || 0), chiTieuMet],
          "input-sh-scan": [Number(latestLog.soHoaDaScan || 0), chiTieuTrang],
          "input-sh-bienmuc": [Number(latestLog.soHoaBienMuc || 0), chiTieuTrang],
          "input-sh-chuanhoa": [Number(latestLog.soHoaChuanHoa || 0), chiTieuTrang],
          "input-sh-hieuchinh": [Number(latestLog.soHoaHieuChinh || 0), chiTieuTrang],
          "input-sh-pdf2lop": [Number(latestLog.soHoaPdf2Lop || 0), chiTieuTrang],
          "input-sh-kyso": [Number(latestLog.soHoaKySo || 0), chiTieuTrang],
          "input-sh-nendulieu": [Number(latestLog.soHoaNenDuLieu || 0), chiTieuTrang],
          "input-sh-phanmem": [Number(latestLog.soHoaPhanMem || 0), chiTieuTrang],
          "input-sh-bangiao": [Number(latestLog.soHoaBanGiao || 0), chiTieuTrang]
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
  const chinhLyDaXong = parseFloat(document.getElementById("input-cl-xong").value) || 0;
  const currentStep = parseInt(document.getElementById("input-current-step").value) || 0;

  const updatePayload = {
    campaignName,
    officerInCharge,
    tongChinhLy: config.tongChinhLy,
    tongSoCanScan: config.tongSoCanScan,
    tongSoCanChuanHoa: config.tongSoCanScan,
    chinhLyDaXong,
    chinhLyConLai: config.tongChinhLy - chinhLyDaXong > 0 ? config.tongChinhLy - chinhLyDaXong : 0,
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
    await setDoc(doc(db, "progress", "current_state"), updatePayload);
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
      document.getElementById("input-campaign-name").value = data.campaignName || "";
      document.getElementById("input-officer").value = data.officerInCharge || "";
      document.getElementById("input-cl-xong").value = data.chinhLyDaXong || 0;

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
  document.getElementById("input-officer").value = "";
  const fields = ["input-cl-xong", "input-sh-scan", "input-sh-bienmuc", "input-sh-chuanhoa", "input-sh-hieuchinh", "input-sh-pdf2lop", "input-sh-kyso", "input-sh-nendulieu", "input-sh-phanmem", "input-sh-bangiao"];
  fields.forEach(id => {
    if (document.getElementById(id)) document.getElementById(id).value = "";
  });
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

window.handleExcelUpload = function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const fileNameDisplay = document.getElementById("file-name-display");
  if (fileNameDisplay) fileNameDisplay.innerText = file.name;

  const reader = new FileReader();
  reader.onload = async function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const unitRows = rawRows.slice(1).filter(row => row && row[1]);

      if (unitRows.length === 0) {
        Swal.fire("Lỗi dữ liệu", "Tệp trống hoặc sai định dạng (Cột 2 phải là Tên cơ quan, đơn vị).", "warning");
        return;
      }

      Swal.fire({
        title: 'Đang xử lý...',
        text: `Nạp thông tin ${unitRows.length} đơn vị vào cơ sở dữ liệu.`,
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });

      for (const row of unitRows) {
        const stt = parseInt(row[0]) || 0;
        const unitName = String(row[1]).trim();
        await addDoc(collection(db, "organization_units"), {
          stt: stt,
          unitName: unitName,
          createdAt: new Date()
        });
      }

      Swal.fire("Hoàn tất", `Cập nhật thành công danh mục ${unitRows.length} đơn vị.`, "success");
      loadOrganizationUnits();

    } catch (error) {
      console.error("Lỗi đọc Excel: ", error);
      Swal.fire("Lỗi hệ thống", "Không thể trích xuất dữ liệu, kiểm tra lại cấu trúc tệp Excel.", "error");
    }
  };
  reader.readAsArrayBuffer(file);
};

async function loadOrganizationUnits() {
  const tbody = document.getElementById("units-table-body");
  if (!tbody) return;

  try {
    const q = query(collection(db, "organization_units"), orderBy("stt", "asc"));
    const querySnapshot = await getDocs(q);

    tbody.innerHTML = "";
    if (querySnapshot.empty) {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #94a3b8;">Hệ thống chưa ghi nhận đơn vị nào. Vui lòng cập nhật.</td></tr>`;
      return;
    }

    querySnapshot.forEach((docSnap) => {
      const u = docSnap.data();
      const id = docSnap.id;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="text-align: center; font-weight: 600;">${u.stt}</td>
        <td style="font-weight: 600; color: #1e293b;">${u.unitName}</td>
        <td style="text-align: center;">
          <button class="modern-btn-secondary" onclick="deleteUnit('${id}')" style="color: #e53e3e; border-color: #fed7d7; background: #fff5f5; padding: 4px 10px; height: auto; font-size: 12px;">
            <i class="fa-solid fa-trash-can"></i> Xóa
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error("Lỗi tải danh mục: ", error);
  }
}

window.deleteUnit = async function (id) {
  const result = await Swal.fire({
    title: 'Xác nhận xóa?',
    text: "Thao tác gỡ bỏ này không thể hoàn tác.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Đồng ý',
    cancelButtonText: 'Hủy'
  });

  if (result.isConfirmed) {
    await deleteDoc(doc(db, "organization_units", id));
    Swal.fire('Hoàn tất', 'Đã gỡ thông tin cơ quan, đơn vị.', 'success');
    loadOrganizationUnits();
  }
};