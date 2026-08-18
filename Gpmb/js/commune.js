// ======================================================
// COMMUNE.JS
//
// Trang nhập số liệu của đơn vị.
//
// Tài khoản xã chỉ sử dụng unitId
// được lưu trong users/{uid}.
//
// Dữ liệu:
// progress/{unitId}/phases/{phaseId}
//
// ======================================================

import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import {
  showConfirm,
  showToast
} from "./ui-notify.js";

// ======================================================
// BIẾN
// ======================================================

let currentUser = null;

let currentProfile = null;

let previousAreaUnit = "ha";

// ======================================================
// HTML
// ======================================================

const communeLoading = document.getElementById("communeLoading");

const communeApp = document.getElementById("communeApp");

const headerUnitName = document.getElementById("headerUnitName");

const communeUnitName = document.getElementById("communeUnitName");

const communeUnitCode = document.getElementById("communeUnitCode");

const communeUserEmail = document.getElementById("communeUserEmail");

const communeLogoutButton = document.getElementById("communeLogoutButton");

const phaseSelect = document.getElementById("communePhaseSelect");

const progressForm = document.getElementById("progressForm");

// DIỆN TÍCH

const areaUnit = document.getElementById("areaUnit");

const totalArea = document.getElementById("totalArea");

const recoveredArea = document.getElementById("recoveredArea");

const remainingArea = document.getElementById("remainingArea");

const areaPercent = document.getElementById("areaPercent");

// CHIỀU DÀI

const totalLength = document.getElementById("totalLength");

const deliveredLength = document.getElementById("deliveredLength");

const remainingLength = document.getElementById("remainingLength");

const lengthPercent = document.getElementById("lengthPercent");

// HỘ DÂN

const totalHouseholds = document.getElementById("totalHouseholds");

const approvedHouseholds = document.getElementById("approvedHouseholds");

const paidHouseholds = document.getElementById("paidHouseholds");

const handedOverHouseholds = document.getElementById("handedOverHouseholds");

const notAgreedHouseholds = document.getElementById("notAgreedHouseholds");

// SAVE

const progressMessage = document.getElementById("progressMessage");

const lastUpdated = document.getElementById("lastUpdated");

const saveProgressButton = document.getElementById("saveProgressButton");

// ======================================================
// 1. KIỂM TRA USER
// ======================================================

onAuthStateChanged(
  auth,

  async function (user) {
    if (!user) {
      window.location.href = "login.html";

      return;
    }

    try {
      const profileRef = doc(db, "users", user.uid);

      const profileSnap = await getDoc(profileRef);

      if (!profileSnap.exists()) {
        await signOut(auth);

        window.location.href = "login.html";

        return;
      }

      const profile = profileSnap.data();

      // ==============================================
      // CHỈ TÀI KHOẢN ĐƠN VỊ
      // ==============================================

      if (
        profile.role !== "commune" ||
        profile.active === false ||
        !profile.unitId
      ) {
        alert("Tài khoản không có quyền sử dụng trang nhập số liệu.");

        window.location.href = "index.html";

        return;
      }

      currentUser = user;

      currentProfile = profile;

      showUnitInformation();
      communeLoading.style.display = "none";

      communeApp.style.display = "block";

      // ==================================================
      // TẢI DANH MỤC GIAI ĐOẠN TỪ FIRESTORE
      // ==================================================

      const phasesLoaded = await loadProjectPhases();

      // Nếu có ít nhất một giai đoạn
      if (phasesLoaded) {
        // Tải dữ liệu của giai đoạn đầu tiên
        await loadProgressData();
      }
    } catch (error) {
      console.error("Lỗi kiểm tra tài khoản:", error);

      alert("Không thể kiểm tra quyền tài khoản.");

      window.location.href = "index.html";
    }
  },
);

// ======================================================
// 2. HIỂN THỊ THÔNG TIN ĐƠN VỊ
// ======================================================

function showUnitInformation() {
  const name =
    currentProfile.unitName || currentProfile.displayName || "Đơn vị";

  headerUnitName.textContent = name;

  communeUnitName.textContent = name;

  communeUnitCode.textContent = currentProfile.unitCode || "-";

  communeUserEmail.textContent = currentUser.email || "-";
}

// ======================================================
// 3. THAY ĐỔI GIAI ĐOẠN
// ======================================================

phaseSelect.addEventListener(
  "change",

  async function () {
    await loadProgressData();
  },
);
// ======================================================
// TẢI DANH SÁCH GIAI ĐOẠN TỪ FIRESTORE
//
// projectPhases
// ======================================================

async function loadProjectPhases() {
  phaseSelect.innerHTML = `

        <option value="">
            Đang tải danh sách giai đoạn...
        </option>

    `;

  phaseSelect.disabled = true;

  try {
    // ==============================================
    // CHỈ LẤY GIAI ĐOẠN ĐANG HOẠT ĐỘNG
    // VÀ SẮP XẾP THEO THỨ TỰ
    // ==============================================

    const phaseQuery = query(
      collection(db, "projectPhases"),

      where("active", "==", true),

      orderBy("order", "asc"),
    );

    const snapshot = await getDocs(phaseQuery);

    // ==============================================
    // KHÔNG CÓ GIAI ĐOẠN
    // ==============================================

    if (snapshot.empty) {
      phaseSelect.innerHTML = `

                <option value="">
                    Chưa có giai đoạn hoạt động
                </option>

            `;

      showMessage("Hiện chưa có giai đoạn nào được kích hoạt.", "error");

      return false;
    }

    // ==============================================
    // TẠO OPTIONS
    // ==============================================

    let html = "";

    snapshot.forEach(function (documentSnapshot) {
      const phase = documentSnapshot.data();

      const phaseId = documentSnapshot.id;

      const phaseName = phase.name || phaseId;

      html += `

                    <option value="${escapeHtmlAttribute(phaseId)}">

                        ${escapeHtmlText(phaseName)}

                    </option>

                `;
    });

    phaseSelect.innerHTML = html;

    phaseSelect.disabled = false;

    console.log("Đã tải danh mục giai đoạn:", snapshot.size);

    return true;
  } catch (error) {
    console.error("Lỗi tải danh mục giai đoạn:", error);

    phaseSelect.innerHTML = `

            <option value="">
                Không tải được giai đoạn
            </option>

        `;

    showMessage("Không thể tải danh sách giai đoạn.", "error");

    return false;
  }
}
// ======================================================
// 4. LOAD DỮ LIỆU
// ======================================================

async function loadProgressData() {
  if (!currentProfile) {
    return;
  }

  setProgressLoading(true);

  showMessage("Đang tải số liệu...", "");

  try {
    const phaseId = phaseSelect.value;

    const progressRef = doc(
      db,
      "progress",
      currentProfile.unitId,
      "phases",
      phaseId,
    );

    const progressSnap = await getDoc(progressRef);

    if (!progressSnap.exists()) {
      resetFormData();

      showMessage("Giai đoạn này chưa có số liệu.", "");

      lastUpdated.textContent = "Chưa có dữ liệu được lưu.";

      return;
    }

    const data = progressSnap.data();

    // ==============================================
    // DIỆN TÍCH
    // ==============================================

    const savedAreaUnit = data.areaInputUnit || "ha";

    areaUnit.value = savedAreaUnit;

    previousAreaUnit = savedAreaUnit;

    totalArea.value = formatInputNumber(
      fromM2(numberValue(data.totalAreaM2), savedAreaUnit),
    );

    recoveredArea.value = formatInputNumber(
      fromM2(numberValue(data.recoveredAreaM2), savedAreaUnit),
    );

    // ==============================================
    // CHIỀU DÀI
    // ==============================================

    totalLength.value = numberValue(data.totalLengthKm);

    deliveredLength.value = numberValue(data.deliveredLengthKm);

    // ==============================================
    // HỘ DÂN
    // ==============================================

    totalHouseholds.value = integerValue(data.totalHouseholds);

    approvedHouseholds.value = integerValue(data.approvedHouseholds);

    paidHouseholds.value = integerValue(data.paidHouseholds);

    handedOverHouseholds.value = integerValue(data.handedOverHouseholds);

    notAgreedHouseholds.value = integerValue(data.notAgreedHouseholds);

    calculateDerivedValues();

    showMessage("Đã tải số liệu.", "success");

    showUpdatedTime(data.updatedAt);
  } catch (error) {
    console.error("Lỗi tải số liệu:", error);

    showMessage("Không thể tải số liệu.", "error");
  } finally {
    setProgressLoading(false);
  }
}

// ======================================================
// 5. RESET FORM
// ======================================================

function resetFormData() {
  areaUnit.value = "ha";

  previousAreaUnit = "ha";

  totalArea.value = 0;

  recoveredArea.value = 0;

  totalLength.value = 0;

  deliveredLength.value = 0;

  totalHouseholds.value = 0;

  approvedHouseholds.value = 0;

  paidHouseholds.value = 0;

  handedOverHouseholds.value = 0;

  notAgreedHouseholds.value = 0;

  calculateDerivedValues();
}

// ======================================================
// 6. ĐỔI HA <-> M2
// ======================================================

areaUnit.addEventListener(
  "change",

  function () {
    const newUnit = areaUnit.value;

    const oldUnit = previousAreaUnit;

    if (newUnit === oldUnit) {
      return;
    }

    const currentTotal = numberValue(totalArea.value);

    const currentRecovered = numberValue(recoveredArea.value);

    const totalM2 = toM2(currentTotal, oldUnit);

    const recoveredM2 = toM2(currentRecovered, oldUnit);

    totalArea.value = formatInputNumber(fromM2(totalM2, newUnit));

    recoveredArea.value = formatInputNumber(fromM2(recoveredM2, newUnit));

    previousAreaUnit = newUnit;

    calculateDerivedValues();
  },
);

// ======================================================
// 7. TỰ ĐỘNG TÍNH
// ======================================================

totalArea.addEventListener("input", calculateDerivedValues);

recoveredArea.addEventListener("input", calculateDerivedValues);

totalLength.addEventListener("input", calculateDerivedValues);

deliveredLength.addEventListener("input", calculateDerivedValues);

function calculateDerivedValues() {
  // ==============================================
  // DIỆN TÍCH
  // ==============================================

  const totalAreaValue = numberValue(totalArea.value);

  const recoveredAreaValue = numberValue(recoveredArea.value);

  const areaRemaining = Math.max(0, totalAreaValue - recoveredAreaValue);

  const areaRate = calculatePercent(recoveredAreaValue, totalAreaValue);

  remainingArea.value =
    formatDisplayNumber(areaRemaining) + " " + getAreaUnitLabel();

  areaPercent.value = formatDisplayNumber(areaRate) + "%";

  // ==============================================
  // CHIỀU DÀI
  // ==============================================

  const totalLengthValue = numberValue(totalLength.value);

  const deliveredLengthValue = numberValue(deliveredLength.value);

  const lengthRemaining = Math.max(0, totalLengthValue - deliveredLengthValue);

  const lengthRate = calculatePercent(deliveredLengthValue, totalLengthValue);

  remainingLength.value = formatDisplayNumber(lengthRemaining) + " km";

  lengthPercent.value = formatDisplayNumber(lengthRate) + "%";
}

// ======================================================
// 8. LƯU DỮ LIỆU
// ======================================================

progressForm.addEventListener(
  "submit",

  async function (event) {
    event.preventDefault();

    if (!currentUser || !currentProfile) {
      return;
    }

    // ==============================================
    // ĐỌC SỐ LIỆU
    // ==============================================

    const currentAreaUnit = areaUnit.value;

    const totalAreaValue = numberValue(totalArea.value);

    const recoveredAreaValue = numberValue(recoveredArea.value);

    const totalLengthValue = numberValue(totalLength.value);

    const deliveredLengthValue = numberValue(deliveredLength.value);

    const totalHouseholdsValue = integerValue(totalHouseholds.value);

    const approvedValue = integerValue(approvedHouseholds.value);

    const paidValue = integerValue(paidHouseholds.value);

    const handedOverValue = integerValue(handedOverHouseholds.value);

    const notAgreedValue = integerValue(notAgreedHouseholds.value);

    // ==============================================
    // KIỂM TRA
    // ==============================================

    if (recoveredAreaValue > totalAreaValue) {
      showMessage(
        "Diện tích đã thu hồi không được lớn hơn tổng diện tích.",
        "error",
      );

      return;
    }

    if (deliveredLengthValue > totalLengthValue) {
      showMessage(
        "Chiều dài đã bàn giao không được lớn hơn tổng chiều dài tuyến.",
        "error",
      );

      return;
    }

    const householdValues = [
      approvedValue,
      paidValue,
      handedOverValue,
      notAgreedValue,
    ];

    if (
      householdValues.some(function (value) {
        return value > totalHouseholdsValue;
      })
    ) {
      showMessage(
        "Các số liệu hộ dân/tổ chức không được lớn hơn tổng số bị ảnh hưởng.",
        "error",
      );

      return;
    }

    setProgressLoading(true);

    showMessage("Đang lưu số liệu...", "");

    try {
      const phaseId = phaseSelect.value;

      const progressRef = doc(
        db,
        "progress",
        currentProfile.unitId,
        "phases",
        phaseId,
      );

      // Kiểm tra để giữ createdAt
      const existingSnap = await getDoc(progressRef);

      const payload = {
        unitId: currentProfile.unitId,

        unitName: currentProfile.unitName || "",

        unitCode: currentProfile.unitCode || "",

        phaseId: phaseId,

        // ======================================
        // DIỆN TÍCH
        //
        // Firestore luôn lưu m²
        // để sau này cộng dữ liệu chính xác.
        // ======================================

        areaInputUnit: currentAreaUnit,

        totalAreaM2: toM2(totalAreaValue, currentAreaUnit),

        recoveredAreaM2: toM2(recoveredAreaValue, currentAreaUnit),

        // ======================================
        // CHIỀU DÀI
        // ======================================

        totalLengthKm: totalLengthValue,

        deliveredLengthKm: deliveredLengthValue,

        // ======================================
        // HỘ DÂN
        // ======================================

        totalHouseholds: totalHouseholdsValue,

        approvedHouseholds: approvedValue,

        paidHouseholds: paidValue,

        handedOverHouseholds: handedOverValue,

        notAgreedHouseholds: notAgreedValue,

        // ======================================
        // NHẬT KÝ
        // ======================================

        updatedBy: currentUser.uid,

        updatedAt: serverTimestamp(),
      };

      if (!existingSnap.exists()) {
        payload.createdBy = currentUser.uid;

        payload.createdAt = serverTimestamp();
      }

      await setDoc(progressRef, payload, {
        merge: true,
      });

      calculateDerivedValues();

      showMessage("Đã lưu số liệu thành công.", "success");

      lastUpdated.textContent =
        "Vừa cập nhật lúc " + new Date().toLocaleString("vi-VN");
    } catch (error) {
      console.error("Lỗi lưu số liệu:", error);

      if (error.code === "permission-denied") {
        showMessage("Bạn không có quyền cập nhật dữ liệu này.", "error");
      } else {
        showMessage("Không thể lưu số liệu. Vui lòng thử lại.", "error");
      }
    } finally {
      setProgressLoading(false);
    }
  },
);

// ======================================================
// 9. ĐĂNG XUẤT
// ======================================================
// ======================================================
// ĐĂNG XUẤT
// ======================================================

communeLogoutButton.addEventListener(
  "click",

  async function () {


    const confirmed =
      await showConfirm({

        title:
          "Đăng xuất hệ thống",

        message:
          "Bạn có chắc chắn muốn kết thúc phiên làm việc hiện tại?",

        confirmText:
          "Đăng xuất",

        cancelText:
          "Ở lại",

        type:
          "warning"

      });


    if (!confirmed) {

      return;

    }


    try {

      communeLogoutButton.disabled =
        true;


      communeLogoutButton.textContent =
        "Đang đăng xuất...";


      await signOut(auth);


      window.location.href =
        "index.html";

    }

    catch (error) {

      console.error(
        "Lỗi đăng xuất:",
        error
      );


      showToast(
        "Không thể đăng xuất. Vui lòng thử lại.",
        "error"
      );


      communeLogoutButton.disabled =
        false;


      communeLogoutButton.textContent =
        "Đăng xuất";

    }

  }
);

// ======================================================
// HÀM CHUYỂN DIỆN TÍCH
// ======================================================

function toM2(value, unit) {
  if (unit === "ha") {
    return value * 10000;
  }

  return value;
}

function fromM2(value, unit) {
  if (unit === "ha") {
    return value / 10000;
  }

  return value;
}

function getAreaUnitLabel() {
  return areaUnit.value === "ha" ? "ha" : "m²";
}

// ======================================================
// HÀM TÍNH %
// ======================================================

function calculatePercent(value, total) {
  if (!total || total <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, (value / total) * 100));
}

// ======================================================
// XỬ LÝ SỐ
// ======================================================

function numberValue(value) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return 0;
  }

  return number;
}

function integerValue(value) {
  return Math.max(0, Math.floor(numberValue(value)));
}

// ======================================================
// FORMAT
// ======================================================

function formatDisplayNumber(value) {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatInputNumber(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Number(value.toFixed(4));
}
// ======================================================
// AN TOÀN HTML
// ======================================================

function escapeHtmlText(value) {
  const div = document.createElement("div");

  div.textContent = value ?? "";

  return div.innerHTML;
}

function escapeHtmlAttribute(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
// ======================================================
// HIỂN THỊ THỜI GIAN
// ======================================================

function showUpdatedTime(timestamp) {
  if (timestamp && typeof timestamp.toDate === "function") {
    lastUpdated.textContent =
      "Cập nhật lần cuối: " + timestamp.toDate().toLocaleString("vi-VN");
  } else {
    lastUpdated.textContent = "Đã có dữ liệu.";
  }
}

// ======================================================
// MESSAGE
// ======================================================

function showMessage(message, type) {
  progressMessage.textContent = message;

  progressMessage.className = "admin-message";

  if (type) {
    progressMessage.classList.add(type);
  }
}

// ======================================================
// LOADING
// ======================================================

function setProgressLoading(loading) {
  saveProgressButton.disabled = loading;

  saveProgressButton.textContent = loading ? "Đang xử lý..." : "Lưu số liệu";
}
