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
  if (campaigns.length === 0) {
    selectBox.innerHTML = "<option value=''>-- Hãy tạo Đợt ở Tab 1 --</option>";
    return;
  }

  // Thêm tùy chọn mặc định rỗng để kích hoạt sự kiện change rõ ràng hơn
  const defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.innerText = "-- Chọn đợt số hóa dữ liệu --";
  selectBox.appendChild(defaultOpt);

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

// BỔ SUNG: LOGIC TỰ ĐỘNG ĐIỀN SỐ LIỆU ĐÃ HOÀN THÀNH 100% CỦA BÁO CÁO GẦN NHẤT
if (document.getElementById("input-campaign-name")) {
  document
    .getElementById("input-campaign-name")
    .addEventListener("change", async (e) => {
      const campaignName = e.target.value;
      if (!campaignName) return;

      // Reset các ô nhập về trống trước để đón dữ liệu mới
      document.getElementById("input-cl-xong").value = "";
      document.getElementById("input-sh-scan").value = "";
      document.getElementById("input-sh-chuanhoa").value = "";
      document.getElementById("input-sh-phanmem").value = "";

      try {
        const q = query(
          collection(db, "progress_history"),
          where("campaignName", "==", campaignName),
          orderBy("timestamp", "desc"),
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const latestLog = querySnapshot.docs[0].data();
          const config = campaignsConfigMap[campaignName] || {
            tongChinhLy: 0,
            tongSoCanScan: 0,
          };

          // ÉP KIỂU SỐ TƯỜNG MINH ĐỂ ĐẢM BẢO PHÉP SO SÁNH CHÍNH XÁC 100%
          const chiTieuMet = Number(config.tongChinhLy);
          const chiTieuTrang = Number(config.tongSoCanScan);

          const daChinhLy = Number(latestLog.chinhLyDaXong || 0);
          const daScan = Number(latestLog.soHoaDaScan || 0);
          const daChuanHoa = Number(latestLog.soHoaChuanHoa || 0);
          const daPhanMem = Number(latestLog.soHoaPhanMem || 0);

          // 1. Kiểm tra khâu chỉnh lý mét
          if (daChinhLy >= chiTieuMet && chiTieuMet > 0) {
            document.getElementById("input-cl-xong").value = chiTieuMet;
          }

          // 2. Kiểm tra khâu đã scan trang (Ví dụ: 430000 >= 430000)
          if (daScan >= chiTieuTrang && chiTieuTrang > 0) {
            document.getElementById("input-sh-scan").value = chiTieuTrang;
          }

          // 3. Kiểm tra khâu biên mục & chuẩn hóa trang
          if (daChuanHoa >= chiTieuTrang && chiTieuTrang > 0) {
            document.getElementById("input-sh-chuanhoa").value = chiTieuTrang;
          }

          // 4. Kiểm tra khâu đưa lên phần mềm trang
          if (daPhanMem >= chiTieuTrang && chiTieuTrang > 0) {
            document.getElementById("input-sh-phanmem").value = chiTieuTrang;
          }
        }
      } catch (err) {
        console.error("Lỗi tự động quét điền số liệu 100%: ", err);
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
    btnSave.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i>...";
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
    soHoaDaScan: parseInt(document.getElementById("input-sh-scan").value) || 0,
    soHoaChuanHoa:
      parseInt(document.getElementById("input-sh-chuanhoa").value) || 0,
    soHoaPhanMem:
      parseInt(document.getElementById("input-sh-phanmem").value) || 0,
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
      document.getElementById("input-sh-scan").value = data.soHoaDaScan || 0;
      document.getElementById("input-sh-chuanhoa").value =
        data.soHoaChuanHoa || 0;
      document.getElementById("input-sh-phanmem").value =
        data.soHoaPhanMem || 0;

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
    }
  } catch (e) {
    alert(e.message);
  }
};

window.resetToCreateMode = () => {
  document.getElementById("editing-doc-id").value = "";
  const formTitle = document.getElementById("form-action-title");
  if (formTitle) formTitle.innerHTML = "CẬP NHẬT TIẾN ĐỘ THỰC TẾ LŨY KẾ";
  const btnSubmitText = document.getElementById("btn-submit-text");
  if (btnSubmitText) btnSubmitText.innerText = "Lưu đợt mới";
  const btnCancelEdit = document.getElementById("btn-cancel-edit");
  if (btnCancelEdit) btnCancelEdit.style.display = "none";
  const updateForm = document.getElementById("updateForm");
  if (updateForm) updateForm.reset();
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

function initAdminPage() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const nameContainer = document.getElementById("admin-name");
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists() && userDoc.data().role === "admin") {
        if (userDoc.data().fullName && nameContainer) {
          nameContainer.innerHTML = `<i class='fa-solid fa-user-shield'></i> Xin chào, ${userDoc.data().fullName}`;
        }
        setupAdminData();
      } else {
        Swal.fire({
          title: "Từ chối quyền",
          text: "Tài khoản không có quyền quản trị.",
          icon: "error",
        }).then(() => {
          window.location.href = "index.html";
        });
      }
    } else {
      window.location.href = "login.html";
    }
  });
}

document.addEventListener("DOMContentLoaded", initAdminPage);
