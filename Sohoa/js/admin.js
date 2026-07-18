import { db, auth } from "./firebase-config.js";
// THAY THẾ CỤM IMPORT FIRESTORE Ở ĐẦU FILE BẰNG KHỐI GỘP CHUẨN NÀY:
import {
  collection,
  addDoc,
  doc,
  setDoc,      // Đã gộp lên đây
  getDoc,
  query,       // Đã gộp lên đây
  orderBy,     // Đã gộp lên đây
  onSnapshot,
  updateDoc,
  deleteDoc,
  getDocs,     // Đã gộp lên đây
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

let campaignsConfigMap = {};

async function setupAdminData() {
  const today = new Date();
  if (document.getElementById("input-date")) {
    document.getElementById("input-date").value =
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  }

  // 1. LẮNG NGHE DANH SÁCH ĐỢT SỐ HÓA
  const campQuery = query(
    collection(db, "campaigns"),
    orderBy("timestamp", "desc"),
  );
  onSnapshot(campQuery, (querySnapshot) => {
    const campTableBody = document.getElementById("campaign-table-body");
    if (campTableBody) campTableBody.innerHTML = "";
    campaignsConfigMap = {};

    querySnapshot.forEach((docSnap) => {
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
  const historyQuery = query(
    collection(db, "progress_history"),
    orderBy("timestamp", "desc"),
  );
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
                <td style="padding: 10px;">${log.chinhLyDaXong || 0} m</td>
                <td style="padding: 10px;">${(log.soZero || log.soDoc || log.soHoaDaScan || 0).toLocaleString()} tr</td>
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

  if (campaigns.length === 0) {
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
}

// KHỐI XỬ LÝ: TỰ ĐỘNG QUÉT VÀ ĐIỀN SỐ LIỆU ĐÃ HOÀN THÀNH 100% (ĐỘC LẬP)
if (document.getElementById("input-campaign-name")) {
  document
    .getElementById("input-campaign-name")
    .addEventListener("change", async (e) => {
      const campaignName = e.target.value;
      if (!campaignName) return;

      // Đưa toàn bộ các ô nhập tiến độ về trạng thái trống trước khi quét dữ liệu mới
      if (document.getElementById("input-cl-xong"))
        document.getElementById("input-cl-xong").value = "";
      if (document.getElementById("input-sh-scan"))
        document.getElementById("input-sh-scan").value = "";
      if (document.getElementById("input-sh-chuanhoa"))
        document.getElementById("input-sh-chuanhoa").value = "";
      if (document.getElementById("input-sh-phanmem"))
        document.getElementById("input-sh-phanmem").value = "";

      try {
        // 1. Truy vấn trực tiếp lấy chỉ tiêu gốc của đợt từ cơ sở dữ liệu
        const campQ = query(
          collection(db, "campaigns"),
          where("campaignName", "==", campaignName),
        );
        const campSnapshot = await getDocs(campQ);

        let chiTieuMet = 0;
        let chiTieuTrang = 0;

        if (!campSnapshot.empty) {
          const campData = campSnapshot.docs[0].data();
          chiTieuMet = Number(campData.tongChinhLy || 0);
          chiTieuTrang = Number(campData.tongSoCanScan || 0);
        } else {
          const fallbackConfig = campaignsConfigMap[campaignName] || {
            tongChinhLy: 0,
            tongSoCanScan: 0,
          };
          chiTieuMet = Number(fallbackConfig.tongChinhLy);
          chiTieuTrang = Number(fallbackConfig.tongSoCanScan);
        }

        // 2. Truy vấn lấy bản ghi lịch sử tiến độ lũy kế mới nhất của đợt này
        const q = query(
          collection(db, "progress_history"),
          where("campaignName", "==", campaignName),
          orderBy("timestamp", "desc"),
        );
        const querySnapshot = await getDocs(q);

        // Thay thế đoạn gán dữ liệu trong sự kiện 'change' của input-campaign-name:
        if (!querySnapshot.empty) {
          const latestLog = querySnapshot.docs[0].data();

          const daChinhLy = Number(latestLog.chinhLyDaXong || 0);
          const daScan = Number(latestLog.soHoaDaScan || 0);
          const daBienMuc = Number(latestLog.soHoaBienMuc || 0);
          const daChuanHoa = Number(latestLog.soHoaChuanHoa || 0);
          const daHieuChinh = Number(latestLog.soHoaHieuChinh || 0);
          const daPdf2Lop = Number(latestLog.soHoaPdf2Lop || 0);
          const daKySo = Number(latestLog.soHoaKySo || 0);
          const daNenDuLieu = Number(latestLog.soHoaNenDuLieu || 0);
          const daPhanMem = Number(latestLog.soHoaPhanMem || 0);
          const daBanGiao = Number(latestLog.soHoaBanGiao || 0);

          // Đối chiếu điều kiện chạm mốc 100% và gán dữ liệu tự động
          if (
            daChinhLy >= chiTieuMet &&
            chiTieuMet > 0 &&
            document.getElementById("input-cl-xong")
          ) {
            document.getElementById("input-cl-xong").value = chiTieuMet;
          }
          if (
            daScan >= chiTieuTrang &&
            chiTieuTrang > 0 &&
            document.getElementById("input-sh-scan")
          ) {
            document.getElementById("input-sh-scan").value = chiTieuTrang;
          }
          if (
            daBienMuc >= chiTieuTrang &&
            chiTieuTrang > 0 &&
            document.getElementById("input-sh-bienmuc")
          ) {
            document.getElementById("input-sh-bienmuc").value = chiTieuTrang;
          }
          if (
            daChuanHoa >= chiTieuTrang &&
            chiTieuTrang > 0 &&
            document.getElementById("input-sh-chuanhoa")
          ) {
            document.getElementById("input-sh-chuanhoa").value = chiTieuTrang;
          }
          if (
            daHieuChinh >= chiTieuTrang &&
            chiTieuTrang > 0 &&
            document.getElementById("input-sh-hieuchinh")
          ) {
            document.getElementById("input-sh-hieuchinh").value = chiTieuTrang;
          }
          if (
            daPdf2Lop >= chiTieuTrang &&
            chiTieuTrang > 0 &&
            document.getElementById("input-sh-pdf2lop")
          ) {
            document.getElementById("input-sh-pdf2lop").value = chiTieuTrang;
          }
          if (
            daKySo >= chiTieuTrang &&
            chiTieuTrang > 0 &&
            document.getElementById("input-sh-kyso")
          ) {
            document.getElementById("input-sh-kyso").value = chiTieuTrang;
          }
          if (
            daNenDuLieu >= chiTieuTrang &&
            chiTieuTrang > 0 &&
            document.getElementById("input-sh-nendulieu")
          ) {
            document.getElementById("input-sh-nendulieu").value = chiTieuTrang;
          }
          if (
            daPhanMem >= chiTieuTrang &&
            chiTieuTrang > 0 &&
            document.getElementById("input-sh-phanmem")
          ) {
            document.getElementById("input-sh-phanmem").value = chiTieuTrang;
          }
          if (
            daBanGiao >= chiTieuTrang &&
            chiTieuTrang > 0 &&
            document.getElementById("input-sh-bangiao")
          ) {
            document.getElementById("input-sh-bangiao").value = chiTieuTrang;
          }
        }
      } catch (err) {
        console.error("Lỗi hệ thống tự động quét dữ liệu: ", err);
      }
    });
}

// ================= TAB 1: THIẾT LẬP ĐỢT SỐ HÓA =================
window.saveCampaignConfig = async function (e) {
  e.preventDefault();
  const btn =
    document.querySelector('#campaignForm button[type="submit"]') ||
    document.querySelector("#campaignForm .btn-save");
  let origText = "Lưu đợt số hóa";
  if (btn) {
    origText = btn.innerHTML;
    btn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Đang lưu...";
    btn.disabled = true;
  }

  const campId = document.getElementById("editing-camp-id").value;
  const campaignName = document
    .getElementById("config-campaign-name")
    .value.trim();
  const tongChinhLy =
    parseFloat(document.getElementById("config-tong-chinhly").value) || 0;
  const tongSoCanScan =
    parseInt(document.getElementById("config-tong-scan").value) || 0;

  const payload = {
    campaignName,
    tongChinhLy,
    tongSoCanScan,
    timestamp: new Date(),
  };

  try {
    if (campId) {
      await updateDoc(doc(db, "campaigns", campId), payload);
      Swal.fire({
        title: "Thành công",
        text: `Đã cập nhật thông tin Đợt số hóa: "${campaignName}"`,
        icon: "success",
        confirmButtonColor: "#0056b3",
      });
    } else {
      await addDoc(collection(db, "campaigns"), payload);
      Swal.fire({
        title: "Thành công",
        text: `Khởi tạo thành công Đợt số hóa mới: "${campaignName}"`,
        icon: "success",
        confirmButtonColor: "#0056b3",
      });
    }
    resetCampForm();
  } catch (err) {
    Swal.fire({
      title: "Lỗi dữ liệu",
      text: err.message,
      icon: "error",
      confirmButtonColor: "#dc2626",
    });
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
      if (campTitle)
        campTitle.innerHTML =
          "<i class='fa-solid fa-wrench' style='color:#d97706;'></i> HIỆU CHỈNH THÔNG TIN ĐỢT";
      const btnCampText = document.getElementById("btn-camp-text");
      if (btnCampText) btnCampText.innerText = "Cập nhật đợt";
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
  if (campTitle)
    campTitle.innerHTML =
      "<i class='fa-solid fa-sliders'></i> THIẾT LẬP ĐỢT SỐ HÓA";
  const btnCampText = document.getElementById("btn-camp-text");
  if (btnCampText) btnCampText.innerText = "Lưu đợt số hóa";
  const btnCancelCamp = document.getElementById("btn-cancel-camp-edit");
  if (btnCancelCamp) btnCancelCamp.style.display = "none";
};

window.deleteCamp = async (campId, campName) => {
  Swal.fire({
    title: "Xác nhận xóa đợt?",
    text: `Đồng chí đang thực hiện xóa đợt số hóa: "${campName}". Tiến độ cũ sẽ không bị ảnh hưởng.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#dc2626",
    cancelButtonColor: "#64748b",
    confirmButtonText: "Đồng ý xóa",
    cancelButtonText: "Hủy bỏ",
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, "campaigns", campId));
        Swal.fire({
          title: "Đã xóa",
          text: `Hệ thống gỡ bỏ thành công đợt "${campName}".`,
          icon: "success",
          confirmButtonColor: "#0056b3",
        });
      } catch (e) {
        Swal.fire({ title: "Lỗi", text: e.message, icon: "error" });
      }
    }
  });
};

// ================= TAB 2: TIẾN ĐỘ THỰC TẾ LŨY KẾ =================
window.updateData = async (e) => {
  e.preventDefault();
  const btnSave =
    document.querySelector('#updateForm button[type="submit"]') ||
    document.querySelector("#updateForm .btn-save");
  let originalText = "Lưu đợt mới";
  if (btnSave) {
    originalText = btnSave.innerHTML;
    btnSave.innerHTML =
      "<i class='fa-solid fa-spinner fa-spin'></i> Đang lưu...";
    btnSave.disabled = true;
  }

  const editingId = document.getElementById("editing-doc-id").value;
  const campaignName = document.getElementById("input-campaign-name").value;
  if (!campaignName) {
    Swal.fire({
      title: "Yêu cầu",
      text: "Vui lòng chọn đợt số hóa dữ liệu trước.",
      icon: "warning",
      confirmButtonColor: "#0056b3",
    });
    if (btnSave) {
      btnSave.innerHTML = originalText;
      btnSave.disabled = false;
    }
    return;
  }

  const rawDateValue = document.getElementById("input-date").value;
  const dateParts = rawDateValue.split("-");
  const dateLabel = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
  const timestampDate = new Date(rawDateValue + "T12:00:00");

  const config = campaignsConfigMap[campaignName] || {
    tongChinhLy: 0,
    tongSoCanScan: 0,
  };
  const chinhLyDaXong =
    parseFloat(document.getElementById("input-cl-xong").value) || 0;
  const currentStep =
    parseInt(document.getElementById("input-current-step").value) || 0;

  const updatePayload = {
    campaignName,
    tongChinhLy: config.tongChinhLy,
    tongSoCanScan: config.tongSoCanScan,
    tongSoCanChuanHoa: config.tongSoCanScan,
    chinhLyDaXong,
    chinhLyConLai:
      config.tongChinhLy - chinhLyDaXong > 0
        ? config.tongChinhLy - chinhLyDaXong
        : 0,

    // Lưu đầy đủ số liệu 9 bước quy trình
    soHoaDaScan: parseInt(document.getElementById("input-sh-scan").value) || 0, // B1[cite: 1]
    soHoaBienMuc:
      parseInt(document.getElementById("input-sh-bienmuc").value) || 0, // B2[cite: 1]
    soHoaChuanHoa:
      parseInt(document.getElementById("input-sh-chuanhoa").value) || 0, // B3[cite: 1]
    soHoaHieuChinh:
      parseInt(document.getElementById("input-sh-hieuchinh").value) || 0, // B4[cite: 1]
    soHoaPdf2Lop:
      parseInt(document.getElementById("input-sh-pdf2lop").value) || 0, // B5[cite: 1]
    soHoaKySo: parseInt(document.getElementById("input-sh-kyso").value) || 0, // B6[cite: 1]
    soHoaNenDuLieu:
      parseInt(document.getElementById("input-sh-nendulieu").value) || 0, // B7[cite: 1]
    soHoaPhanMem:
      parseInt(document.getElementById("input-sh-phanmem").value) || 0, // B8[cite: 1]
    soHoaBanGiao:
      parseInt(document.getElementById("input-sh-bangiao").value) || 0, // B9[cite: 1]

    currentStep,
    dateLabel,
    timestamp: timestampDate,
  };

  try {
    if (editingId) {
      await updateDoc(doc(db, "progress_history", editingId), updatePayload);
      await Swal.fire({
        title: "Thành công",
        text: `Cập nhật lũy kế ngày ${dateLabel} thành công.`,
        icon: "success",
        confirmButtonColor: "#0056b3",
      });
    } else {
      await addDoc(collection(db, "progress_history"), updatePayload);
      await Swal.fire({
        title: "Thành công",
        text: `Ghi nhận số liệu tiến độ ngày ${dateLabel} thành công.`,
        icon: "success",
        confirmButtonColor: "#0056b3",
      });
    }
    await setDoc(doc(db, "progress", "current_state"), updatePayload);
    window.location.href = "index.html";
  } catch (error) {
    if (btnSave) {
      btnSave.innerHTML = originalText;
      btnSave.disabled = false;
    }
    Swal.fire({ title: "Lỗi kết nối", text: error.message, icon: "error" });
  }
};

window.startEdit = async (docId) => {
  try {
    const docSnap = await getDoc(doc(db, "progress_history", docId));
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (typeof window.switchTab === "function")
        window.switchTab("tab-progress");

      document.getElementById("editing-doc-id").value = docId;
      document.getElementById("input-campaign-name").value =
        data.campaignName || "";
      document.getElementById("input-cl-xong").value = data.chinhLyDaXong || 0;

      // Đổ ngược dữ liệu 9 bước lên Form sửa[cite: 1]
      document.getElementById("input-sh-scan").value = data.soHoaDaScan || 0;
      document.getElementById("input-sh-bienmuc").value =
        data.soHoaBienMuc || 0;
      document.getElementById("input-sh-chuanhoa").value =
        data.soHoaChuanHoa || 0;
      document.getElementById("input-sh-hieuchinh").value =
        data.soHoaHieuChinh || 0;
      document.getElementById("input-sh-pdf2lop").value =
        data.soHoaPdf2Lop || 0;
      document.getElementById("input-sh-kyso").value = data.soHoaKySo || 0;
      document.getElementById("input-sh-nendulieu").value =
        data.soHoaNenDuLieu || 0;
      document.getElementById("input-sh-phanmem").value =
        data.soHoaPhanMem || 0;
      document.getElementById("input-sh-bangiao").value =
        data.soHoaBanGiao || 0;

      if (document.getElementById("input-current-step")) {
        document.getElementById("input-current-step").value =
          data.currentStep || 0;
      }

      if (data.timestamp) {
        const t = data.timestamp.toDate();
        document.getElementById("input-date").value =
          `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
      }
      const formTitle = document.getElementById("form-action-title");
      if (formTitle)
        formTitle.innerHTML =
          "<i class='fa-solid fa-wrench' style='color:#d97706;'></i> HIỆU CHỈNH TIẾN ĐỘ BÁO CÁO";
      const btnSubmitText = document.getElementById("btn-submit-text");
      if (btnSubmitText) btnSubmitText.innerText = "Cập nhật thay đổi";
      const btnCancelEdit = document.getElementById("btn-cancel-edit");
      if (btnCancelEdit) btnCancelEdit.style.display = "inline-flex";
      const updateForm = document.getElementById("updateForm");
      if (updateForm) updateForm.scrollIntoView({ behavior: "smooth" });
      if (document.getElementById("input-current-step")) {
        document.getElementById("input-current-step").value =
          data.currentStep || 0;
      }
    }
  } catch (e) {
    alert(e.message);
  }
};

window.resetToCreateMode = () => {
  document.getElementById("editing-doc-id").value = "";

  // Trả tất cả các ô nhập liệu về trống
  document.getElementById("input-cl-xong").value = "";
  document.getElementById("input-sh-scan").value = "";
  document.getElementById("input-sh-bienmuc").value = "";
  document.getElementById("input-sh-chuanhoa").value = "";
  document.getElementById("input-sh-hieuchinh").value = "";
  document.getElementById("input-sh-pdf2lop").value = "";
  document.getElementById("input-sh-kyso").value = "";
  document.getElementById("input-sh-nendulieu").value = "";
  document.getElementById("input-sh-phanmem").value = "";
  document.getElementById("input-sh-bangiao").value = "";

  if (document.getElementById("input-current-step")) {
    document.getElementById("input-current-step").value = 0;
  }
};

window.deleteProgress = async (docId) => {
  Swal.fire({
    title: "Xác nhận xóa tiến độ?",
    text: "Số liệu lịch sử mốc báo cáo này sẽ mất hoàn toàn và không thể khôi phục.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#dc2626",
    cancelButtonColor: "#64748b",
    confirmButtonText: "Đồng ý xóa",
    cancelButtonText: "Hủy bỏ",
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, "progress_history", docId));
        Swal.fire({
          title: "Đã xóa",
          text: "Hệ thống đã thực hiện gỡ bỏ bản ghi tiến độ thành công.",
          icon: "success",
          confirmButtonColor: "#0056b3",
        });
      } catch (e) {
        Swal.fire({ title: "Lỗi kỹ thuật", text: e.message, icon: "error" });
      }
    }
  });
};

// THAY THẾ TOÀN BỘ ĐOẠN KHỞI CHẠY CUỐI FILE js/admin.js BẰNG KHỐI LỆNH NÀY:

function initAdminPage() {
  // CƠ CHẾ DỰ PHÒNG: Tự lưu token vào RAM nếu trình duyệt bật Tracking Prevention chặn Storage
  import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js").then(
    (authModule) => {
      auth.setPersistence(
        authModule.browserSessionPersistence || authModule.inMemoryPersistence
      );
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
          // Gọi kích hoạt nạp toàn bộ cấu trúc dữ liệu đợt số hóa và lịch sử tiến độ
          setupAdminData();
          setTimeout(loadOrganizationUnits, 500);
        } else {
          Swal.fire({
            title: "Từ chối quyền",
            text: "Tài khoản không có quyền quản trị.",
            icon: "error",
          }).then(() => {
            window.location.href = "index.html";
          });
        }
      } catch (err) {
        console.error("Lỗi xác thực quyền: ", err);
      }
    } else {
      window.location.href = "login.html";
    }
  });
}

// KHỞI CHẠY NGAY LẬP TỨC KHÔNG PHỤ THUỘC LUỒNG ĐỂ TRÁNH BỊ CHẶN TRẠNG THÁI
initAdminPage();

document.addEventListener("DOMContentLoaded", initAdminPage);

// 1. HÀM ĐỌC FILE EXCEL VÀ ĐẨY LÊN FIREBASE KHỚP THEO 2 CỘT (STT, TÊN ĐƠN VỊ)
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

      // Chuyển sheet sang dạng mảng mảng (Array of Arrays) để dễ kiểm soát hàng
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Lọc bỏ hàng tiêu đề đầu tiên, chỉ lấy từ hàng thứ 2
      const unitRows = rawRows.slice(1).filter(row => row && row[1]);

      if (unitRows.length === 0) {
        Swal.fire("Thông báo", "File Excel trống hoặc không đúng định dạng (Cột 2 phải là Tên đơn vị)!", "warning");
        return;
      }

      Swal.fire({
        title: 'Đang xử lý dữ liệu...',
        text: `Đang nạp ${unitRows.length} đơn vị lên hệ thống`,
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });

      // Thực hiện vòng lặp nạp hàng loạt đơn vị vào collection 'organization_units'
      for (const row of unitRows) {
        const stt = parseInt(row[0]) || 0;
        const unitName = String(row[1]).trim();

        // Tạo slug/id sạch từ tên để làm ID tài liệu
        const unitId = "unit_" + stt;

        await setDoc(doc(db, "organization_units", unitId), {
          stt: stt,
          unitName: unitName,
          createdAt: new Date()
        });
      }

      Swal.fire("Thành công", `Đã cập nhật thành công ${unitRows.length} đơn vị trực thuộc lên Firebase!`, "success");
      loadOrganizationUnits(); // Tải lại bảng danh sách đơn vị công khai

    } catch (error) {
      console.error("Lỗi đọc Excel: ", error);
      Swal.fire("Lỗi", "Không thể đọc dữ liệu file Excel, vui lòng kiểm tra lại cấu trúc file!", "error");
    }
  };
  reader.readAsArrayBuffer(file);
};

// 2. HÀM TẢI VÀ HIỂN THỊ DANH SÁCH ĐƠN VỊ HIỆN CÓ TRÊN FIREBASE
async function loadOrganizationUnits() {
  const tbody = document.getElementById("units-table-body");
  if (!tbody) return;

  try {
    const q = query(collection(db, "organization_units"), orderBy("stt", "asc"));
    const querySnapshot = await getDocs(q);

    tbody.innerHTML = "";
    if (querySnapshot.empty) {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #94a3b8;">Chưa có đơn vị nào được nạp. Vui lòng chọn file Excel để upload.</td></tr>`;
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
    console.error("Lỗi tải đơn vị: ", error);
  }
}

// 3. HÀM XÓA ĐƠN VỊ LẺ KHI CẦN THIẾT
window.deleteUnit = async function (id) {
  const result = await Swal.fire({
    title: 'Xác nhận xóa?',
    text: "Hành động này không thể hoàn tác!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Đồng ý xóa'
  });

  if (result.isConfirmed) {
    await deleteDoc(doc(db, "organization_units", id));
    Swal.fire('Đã xóa!', 'Đơn vị đã được gỡ bỏ khỏi hệ thống.', 'success');
    loadOrganizationUnits();
  }
};

// Tự động tải danh sách đơn vị khi mở trang admin
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(loadOrganizationUnits, 1500);
});