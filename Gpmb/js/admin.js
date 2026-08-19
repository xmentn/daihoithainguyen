// ======================================================
// ADMIN.JS
//
// Chức năng:
// - Kiểm tra quyền Admin
// - Quản lý đơn vị: thêm / sửa / xóa có kiểm soát
// - Cấp / sửa email được phép sử dụng cho từng đơn vị
// - Thu hồi quyền tài khoản cũ khi Admin đổi email
// - Quản lý giai đoạn: thêm / kích hoạt / ngừng sử dụng
// - Sử dụng hệ thống thông báo showConfirm / showToast
// ======================================================

import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

import {
  doc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

import { showConfirm, showToast } from "./ui-notify.js";

// ======================================================
// 1. BIẾN DÙNG CHUNG
// ======================================================

let currentAdmin = null;
let currentAdminProfile = null;
let currentUnits = [];
let currentPhases = [];

// ID đơn vị đang sửa. Không phụ thuộc bắt buộc vào hidden input trong HTML.
let editingUnitId = "";

// ======================================================
// 2. HTML - ADMIN
// ======================================================

const adminLoading = document.getElementById("adminLoading");
const adminApp = document.getElementById("adminApp");
const adminName = document.getElementById("adminName");
const logoutButton = document.getElementById("logoutButton");

// ======================================================
// 3. HTML - ĐƠN VỊ
// ======================================================

const unitForm = document.getElementById("unitForm");
const unitNameInput = document.getElementById("unitName");
const unitCodeInput = document.getElementById("unitCode");
const unitTypeSelect = document.getElementById("unitType");
const unitMessage = document.getElementById("unitMessage");
const saveUnitButton = document.getElementById("saveUnitButton");
const unitTableBody = document.getElementById("unitTableBody");
const unitCount = document.getElementById("unitCount");

// Các phần tử này là tùy chọn. Nếu admin.html đã có thì dùng,
// nếu chưa có thì file JS vẫn hoạt động bình thường.
const unitEditIdInput = document.getElementById("unitEditId");
const unitActiveSelect = document.getElementById("unitActive");
let cancelUnitEditButton = document.getElementById("cancelUnitEditButton");

// ======================================================
// 4. HTML - CẤP QUYỀN TÀI KHOẢN
// ======================================================

const accountModal = document.getElementById("accountModal");
const closeAccountModalButton = document.getElementById("closeAccountModal");
const cancelAccountPermission = document.getElementById(
  "cancelAccountPermission",
);
const accountPermissionForm = document.getElementById("accountPermissionForm");
const accountUnitId = document.getElementById("accountUnitId");
const accountUnitName = document.getElementById("accountUnitName");
const accountEmail = document.getElementById("accountEmail");
const accountEnabled = document.getElementById("accountEnabled");
const accountPermissionMessage = document.getElementById(
  "accountPermissionMessage",
);
const saveAccountPermission = document.getElementById("saveAccountPermission");

// ======================================================
// 5. HTML - QUẢN LÝ GIAI ĐOẠN
// ======================================================

const phaseForm = document.getElementById("phaseForm");
const phaseNameInput = document.getElementById("phaseName");
const phaseCodeInput = document.getElementById("phaseCode");
const phaseOrderInput = document.getElementById("phaseOrder");
const phaseMessage = document.getElementById("phaseMessage");
const savePhaseButton = document.getElementById("savePhaseButton");
const phaseTableBody = document.getElementById("phaseTableBody");
const phaseCount = document.getElementById("phaseCount");

// ======================================================
// 6. CHUẨN BỊ NÚT HỦY SỬA ĐƠN VỊ
// Nếu admin.html chưa có, JS tự tạo để không bắt buộc sửa HTML.
// ======================================================

ensureCancelUnitEditButton();

function ensureCancelUnitEditButton() {
  if (!unitForm || !saveUnitButton) {
    return;
  }

  if (!cancelUnitEditButton) {
    cancelUnitEditButton = document.createElement("button");
    cancelUnitEditButton.type = "button";
    cancelUnitEditButton.id = "cancelUnitEditButton";
    cancelUnitEditButton.className = "admin-secondary-button";
    cancelUnitEditButton.textContent = "Hủy sửa";
    cancelUnitEditButton.style.display = "none";
    cancelUnitEditButton.style.marginLeft = "8px";

    saveUnitButton.insertAdjacentElement("afterend", cancelUnitEditButton);
  }

  cancelUnitEditButton.addEventListener("click", resetUnitForm);
}

// ======================================================
// 7. KIỂM TRA ĐĂNG NHẬP VÀ QUYỀN ADMIN
// ======================================================

onAuthStateChanged(auth, async function (user) {
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

    if (profile.role !== "admin" || profile.active === false) {
      showToast("Bạn không có quyền truy cập trang quản trị.", "error");

      setTimeout(function () {
        window.location.href = "index.html";
      }, 900);

      return;
    }

    currentAdmin = user;
    currentAdminProfile = profile;

    if (adminName) {
      adminName.textContent =
        profile.displayName || user.email || "Quản trị hệ thống";
    }

    if (adminLoading) {
      adminLoading.style.display = "none";
    }

    if (adminApp) {
      adminApp.style.display = "block";
    }

    await loadUnits();
    await loadPhases();
  } catch (error) {
    console.error("Lỗi kiểm tra quyền Admin:", error);

    showToast("Không thể kiểm tra quyền truy cập.", "error");

    setTimeout(function () {
      window.location.href = "index.html";
    }, 1000);
  }
});

// ======================================================
// 8. THÊM / SỬA ĐƠN VỊ
// ======================================================

if (unitForm) {
  unitForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!currentAdmin) {
      showToast("Phiên đăng nhập không hợp lệ.", "error");
      return;
    }

    const editId = editingUnitId || unitEditIdInput?.value?.trim() || "";
    const unitName = unitNameInput?.value.trim() || "";
    let unitCode = unitCodeInput?.value.trim().toUpperCase() || "";
    const unitType = unitTypeSelect?.value || "commune";

    if (!unitName) {
      showUnitMessage("Vui lòng nhập tên đơn vị.", "error");
      unitNameInput?.focus();
      return;
    }

    unitCode = unitCode.replace(/\s+/g, "_").replace(/[^A-Z0-9_-]/g, "");

    if (!unitCode) {
      showUnitMessage("Mã đơn vị không hợp lệ.", "error");
      unitCodeInput?.focus();
      return;
    }

    const oldUnit = editId
      ? currentUnits.find((item) => item.id === editId)
      : null;

    // Nếu admin.html chưa có ô trạng thái thì:
    // - đơn vị mới mặc định active = true
    // - đơn vị sửa giữ nguyên trạng thái cũ.
    const unitActive = unitActiveSelect
      ? unitActiveSelect.value === "true"
      : editId
        ? oldUnit?.active !== false
        : true;

    setUnitLoading(true);

    try {
      // --------------------------------------------------
      // Kiểm tra trùng mã đơn vị
      // --------------------------------------------------
      const codeQuery = query(
        collection(db, "units"),
        where("code", "==", unitCode),
      );

      const codeSnapshot = await getDocs(codeQuery);
      let duplicated = false;

      codeSnapshot.forEach(function (snap) {
        if (snap.id !== editId) {
          duplicated = true;
        }
      });

      if (duplicated) {
        showUnitMessage("Mã đơn vị đã tồn tại.", "error");
        return;
      }

      // --------------------------------------------------
      // SỬA
      // --------------------------------------------------
      if (editId) {
        if (!oldUnit) {
          showToast("Không tìm thấy đơn vị cần sửa.", "error");
          return;
        }

        await updateDoc(doc(db, "units", editId), {
          name: unitName,
          code: unitCode,
          type: unitType,
          active: unitActive,
          updatedAt: serverTimestamp(),
          updatedBy: currentAdmin.uid,
        });

        // Đồng bộ tên/mã/trạng thái và quyền tài khoản sang users/{uid}.
        await syncUnitUserProfiles({
          unitId: editId,
          allowedEmail: oldUnit.loginEmail || "",
          accessEnabled:
            unitActive && oldUnit.accountEnabled === true && !!oldUnit.loginEmail,
          unitName,
          unitCode,
        });

        showToast("Đã cập nhật đơn vị thành công.", "success");
      } else {
        // --------------------------------------------------
        // THÊM
        // --------------------------------------------------
        await addDoc(collection(db, "units"), {
          name: unitName,
          code: unitCode,
          type: unitType,
          active: unitActive,
          loginEmail: "",
          accountEnabled: false,
          createdBy: currentAdmin.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        showToast("Đã thêm đơn vị thành công.", "success");
      }

      resetUnitForm();
      await loadUnits();
    } catch (error) {
      console.error("Lỗi lưu đơn vị:", error);
      showToast("Không thể lưu thông tin đơn vị.", "error");
    } finally {
      setUnitLoading(false);
    }
  });
}

// ======================================================
// 9. TẢI DANH SÁCH ĐƠN VỊ
// ======================================================

async function loadUnits() {
  if (!unitTableBody) {
    return;
  }

  unitTableBody.innerHTML = `
    <tr>
      <td colspan="8" class="table-empty">
        Đang tải dữ liệu...
      </td>
    </tr>
  `;

  try {
    const unitQuery = query(collection(db, "units"), orderBy("name", "asc"));
    const snapshot = await getDocs(unitQuery);

    currentUnits = [];

    snapshot.forEach(function (documentSnapshot) {
      currentUnits.push({
        id: documentSnapshot.id,
        ...documentSnapshot.data(),
      });
    });

    renderUnits(currentUnits);
  } catch (error) {
    console.error("Lỗi tải danh sách đơn vị:", error);

    unitTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="table-empty table-error">
          Không tải được danh sách đơn vị.
        </td>
      </tr>
    `;
  }
}

// ======================================================
// 10. HIỂN THỊ DANH SÁCH ĐƠN VỊ
// ======================================================

function renderUnits(units) {
  if (unitCount) {
    unitCount.textContent = units.length;
  }

  if (!unitTableBody) {
    return;
  }

  if (units.length === 0) {
    unitTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="table-empty">
          Chưa có đơn vị nào.
        </td>
      </tr>
    `;

    return;
  }

  unitTableBody.innerHTML = units
    .map(function (unit, index) {
      const loginEmail = unit.loginEmail
        ? escapeHtml(unit.loginEmail)
        : `<span class="account-email-empty">Chưa cấp</span>`;

      const accountStatus =
        unit.accountEnabled === true && unit.loginEmail
          ? `<span class="account-status-enabled">Đã cấp</span>`
          : `<span class="account-status-disabled">Chưa cấp</span>`;

      const unitStatus =
        unit.active !== false
          ? `<span class="status-active">Hoạt động</span>`
          : `<span class="status-inactive">Ngừng hoạt động</span>`;

      return `
        <tr>
          <td>${index + 1}</td>

          <td>
            <strong>${escapeHtml(unit.name)}</strong>
          </td>

          <td>${escapeHtml(unit.code)}</td>

          <td>${getUnitTypeName(unit.type)}</td>

          <td>${loginEmail}</td>

          <td>${accountStatus}</td>

          <td>${unitStatus}</td>

          <td>
            <div class="table-action-group" style="display:flex;gap:6px;flex-wrap:wrap;">
              <button
                type="button"
                class="table-action-button"
                data-action="edit"
                data-unit-id="${escapeHtmlAttribute(unit.id)}"
              >
                Sửa
              </button>

              <button
                type="button"
                class="table-action-button"
                data-action="account"
                data-unit-id="${escapeHtmlAttribute(unit.id)}"
              >
                ${unit.loginEmail ? "Sửa quyền" : "Cấp tài khoản"}
              </button>

              <button
                type="button"
                class="table-action-button danger"
                data-action="delete"
                data-unit-id="${escapeHtmlAttribute(unit.id)}"
                style="border-color:#d64a4a;color:#c63b3b;"
              >
                Xóa
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

// ======================================================
// 11. XỬ LÝ CÁC NÚT THAO TÁC ĐƠN VỊ
// ======================================================

if (unitTableBody) {
  unitTableBody.addEventListener("click", async function (event) {
    const button = event.target.closest("[data-action]");

    if (!button) {
      return;
    }

    const unitId = button.dataset.unitId;
    const action = button.dataset.action;

    if (!unitId) {
      return;
    }

    if (action === "edit") {
      startEditUnit(unitId);
      return;
    }

    if (action === "account") {
      openAccountModal(unitId);
      return;
    }

    if (action === "delete") {
      await deleteUnit(unitId);
    }
  });
}

// ======================================================
// 12. BẮT ĐẦU SỬA ĐƠN VỊ
// ======================================================

function startEditUnit(unitId) {
  const unit = currentUnits.find((item) => item.id === unitId);

  if (!unit) {
    showToast("Không tìm thấy đơn vị.", "error");
    return;
  }

  editingUnitId = unit.id;

  if (unitEditIdInput) {
    unitEditIdInput.value = unit.id;
  }

  if (unitNameInput) {
    unitNameInput.value = unit.name || "";
  }

  if (unitCodeInput) {
    unitCodeInput.value = unit.code || "";
  }

  if (unitTypeSelect) {
    unitTypeSelect.value = unit.type || "commune";
  }

  if (unitActiveSelect) {
    unitActiveSelect.value = unit.active !== false ? "true" : "false";
  }

  if (saveUnitButton) {
    saveUnitButton.textContent = "Cập nhật đơn vị";
  }

  if (cancelUnitEditButton) {
    cancelUnitEditButton.style.display = "inline-flex";
  }

  showUnitMessage(`Đang sửa: ${unit.name || "đơn vị"}`, "");

  unitNameInput?.focus();

  unitForm?.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}

// ======================================================
// 13. HỦY / RESET FORM ĐƠN VỊ
// ======================================================

function resetUnitForm() {
  editingUnitId = "";

  if (unitForm) {
    unitForm.reset();
  }

  if (unitEditIdInput) {
    unitEditIdInput.value = "";
  }

  if (unitTypeSelect) {
    unitTypeSelect.value = "commune";
  }

  if (unitActiveSelect) {
    unitActiveSelect.value = "true";
  }

  if (saveUnitButton) {
    saveUnitButton.textContent = "Thêm đơn vị";
  }

  if (cancelUnitEditButton) {
    cancelUnitEditButton.style.display = "none";
  }

  showUnitMessage("", "");
}

// ======================================================
// 14. XÓA ĐƠN VỊ CÓ KIỂM SOÁT
//
// Chỉ xóa cứng khi đơn vị CHƯA có user và CHƯA có dữ liệu tiến độ.
// Nếu đã phát sinh dữ liệu, không xóa để tránh mồ côi dữ liệu.
// ======================================================

async function deleteUnit(unitId) {
  const unit = currentUnits.find((item) => item.id === unitId);

  if (!unit) {
    showToast("Không tìm thấy đơn vị.", "error");
    return;
  }

  try {
    // Kiểm tra hồ sơ tài khoản đã gắn với đơn vị.
    const usersQuery = query(
      collection(db, "users"),
      where("unitId", "==", unitId),
    );

    const usersSnapshot = await getDocs(usersQuery);

    if (!usersSnapshot.empty) {
      showToast(
        "Đơn vị đã có tài khoản người dùng nên không thể xóa trực tiếp. Hãy thu hồi quyền hoặc chuyển đơn vị sang trạng thái ngừng hoạt động.",
        "warning",
        5200,
      );
      return;
    }

    // Kiểm tra dữ liệu tiến độ.
    const progressSnapshot = await getDocs(
      collection(db, "progress", unitId, "phases"),
    );

    if (!progressSnapshot.empty) {
      showToast(
        "Đơn vị đã có số liệu tiến độ nên không thể xóa trực tiếp. Việc giữ đơn vị giúp bảo toàn lịch sử dữ liệu.",
        "warning",
        5200,
      );
      return;
    }

    const confirmed = await showConfirm({
      title: "Xóa đơn vị",
      message: `Bạn có chắc chắn muốn xóa “${unit.name}”? Thao tác này không thể hoàn tác.`,
      confirmText: "Xóa đơn vị",
      cancelText: "Hủy",
      type: "danger",
    });

    if (!confirmed) {
      return;
    }

    await deleteDoc(doc(db, "units", unitId));

    if (editingUnitId === unitId) {
      resetUnitForm();
    }

    showToast("Đã xóa đơn vị thành công.", "success");
    await loadUnits();
  } catch (error) {
    console.error("Lỗi xóa đơn vị:", error);
    showToast("Không thể xóa đơn vị.", "error");
  }
}

// ======================================================
// 15. MỞ HỘP CẤP / SỬA QUYỀN TÀI KHOẢN
// ======================================================

function openAccountModal(unitId) {
  const unit = currentUnits.find((item) => item.id === unitId);

  if (!unit) {
    showToast("Không tìm thấy đơn vị.", "error");
    return;
  }

  if (!accountModal || !accountUnitId || !accountUnitName || !accountEmail) {
    showToast("Giao diện cấp quyền tài khoản chưa sẵn sàng.", "error");
    return;
  }

  accountUnitId.value = unit.id;
  accountUnitName.textContent = unit.name || "";
  accountEmail.value = unit.loginEmail || "";

  if (accountEnabled) {
    accountEnabled.checked = unit.loginEmail
      ? unit.accountEnabled === true
      : true;
  }

  showAccountMessage("", "");

  accountModal.style.display = "flex";

  setTimeout(function () {
    accountEmail.focus();
  }, 50);
}

// ======================================================
// 16. ĐÓNG HỘP CẤP QUYỀN
// ======================================================

function closeAccountPermissionModal() {
  if (accountModal) {
    accountModal.style.display = "none";
  }

  accountPermissionForm?.reset();

  if (accountUnitId) {
    accountUnitId.value = "";
  }

  showAccountMessage("", "");
}

closeAccountModalButton?.addEventListener(
  "click",
  closeAccountPermissionModal,
);

cancelAccountPermission?.addEventListener(
  "click",
  closeAccountPermissionModal,
);

const modalOverlay = accountModal?.querySelector(".account-modal-overlay");
modalOverlay?.addEventListener("click", closeAccountPermissionModal);

// ======================================================
// 17. LƯU QUYỀN TÀI KHOẢN
//
// Khi Admin đổi email:
// - units/{unitId}.loginEmail đổi sang email mới
// - users của đơn vị có email cũ bị active = false
// - nếu email mới đã có users profile thì profile đó được gắn về đúng unitId
// - nếu email mới chưa có profile thì người dùng đăng ký/xác minh/đăng nhập như trước
// ======================================================

if (accountPermissionForm) {
  accountPermissionForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const unitId = accountUnitId?.value || "";
    const email = normalizeEmail(accountEmail?.value || "");
    const enabled = accountEnabled ? accountEnabled.checked : true;

    if (!unitId) {
      showAccountMessage("Không xác định được đơn vị.", "error");
      return;
    }

    if (!email) {
      showAccountMessage("Vui lòng nhập email được cấp quyền.", "error");
      accountEmail?.focus();
      return;
    }

    if (!isValidEmail(email)) {
      showAccountMessage("Địa chỉ email không hợp lệ.", "error");
      accountEmail?.focus();
      return;
    }

    const unit = currentUnits.find((item) => item.id === unitId);

    if (!unit) {
      showAccountMessage("Không tìm thấy đơn vị.", "error");
      return;
    }

    setAccountLoading(true);

    try {
      // --------------------------------------------------
      // Không cho cùng 1 email được cấp cho 2 đơn vị.
      // --------------------------------------------------
      const emailQuery = query(
        collection(db, "units"),
        where("loginEmail", "==", email),
      );

      const emailSnapshot = await getDocs(emailQuery);
      let duplicated = false;

      emailSnapshot.forEach(function (snap) {
        if (snap.id !== unitId) {
          duplicated = true;
        }
      });

      if (duplicated) {
        showAccountMessage(
          "Email này đã được cấp cho một đơn vị khác.",
          "error",
        );
        return;
      }

      // Không cho vô tình gán email của tài khoản Admin cho đơn vị.
      const emailUserProfiles = await getDocs(
        query(collection(db, "users"), where("email", "==", email)),
      );

      let adminEmailConflict = false;

      emailUserProfiles.forEach(function (snap) {
        const data = snap.data();
        if (data.role === "admin") {
          adminEmailConflict = true;
        }
      });

      if (adminEmailConflict) {
        showAccountMessage(
          "Email này đang thuộc tài khoản quản trị, không thể cấp cho đơn vị.",
          "error",
        );
        return;
      }

      // --------------------------------------------------
      // Cập nhật email được phép trên units.
      // --------------------------------------------------
      await updateDoc(doc(db, "units", unitId), {
        loginEmail: email,
        accountEnabled: enabled,
        updatedAt: serverTimestamp(),
        accountUpdatedBy: currentAdmin.uid,
      });

      // --------------------------------------------------
      // Thu hồi quyền email cũ + kích hoạt email mới nếu đã có profile.
      // --------------------------------------------------
      await syncUnitUserProfiles({
        unitId,
        allowedEmail: email,
        accessEnabled: enabled && unit.active !== false,
        unitName: unit.name || "",
        unitCode: unit.code || "",
      });

      showAccountMessage("Đã lưu quyền tài khoản thành công.", "success");
      showToast("Đã cập nhật quyền tài khoản.", "success");

      await loadUnits();

      setTimeout(function () {
        closeAccountPermissionModal();
      }, 650);
    } catch (error) {
      console.error("Lỗi lưu quyền tài khoản:", error);
      showAccountMessage("Không thể lưu quyền tài khoản.", "error");
    } finally {
      setAccountLoading(false);
    }
  });
}

// ======================================================
// 18. ĐỒNG BỘ QUYỀN TÀI KHOẢN CỦA ĐƠN VỊ
// ======================================================

async function syncUnitUserProfiles({
  unitId,
  allowedEmail,
  accessEnabled,
  unitName,
  unitCode,
}) {
  const normalizedAllowedEmail = normalizeEmail(allowedEmail);

  // --------------------------------------------------
  // A. Tất cả profile hiện đang gắn unitId này:
  // chỉ email đang được Admin cấp mới được active.
  // --------------------------------------------------
  const unitUsersSnapshot = await getDocs(
    query(collection(db, "users"), where("unitId", "==", unitId)),
  );

  const updateTasks = [];

  unitUsersSnapshot.forEach(function (userSnap) {
    const data = userSnap.data();

    if (data.role !== "commune") {
      return;
    }

    const userEmail = normalizeEmail(data.email || "");
    const shouldBeActive =
      accessEnabled === true &&
      !!normalizedAllowedEmail &&
      userEmail === normalizedAllowedEmail;

    updateTasks.push(
      updateDoc(userSnap.ref, {
        active: shouldBeActive,
        unitName: unitName || data.unitName || "",
        unitCode: unitCode || data.unitCode || "",
        updatedAt: serverTimestamp(),
        accessUpdatedBy: currentAdmin.uid,
      }),
    );
  });

  await Promise.all(updateTasks);

  // --------------------------------------------------
  // B. Nếu email mới đã từng có users/{uid} ở nơi khác,
  // Admin đang cấp email đó cho unitId này => chuyển profile về đúng đơn vị.
  // Nếu chưa có profile, không tạo ở đây; login.js sẽ tạo sau khi đăng ký/xác minh.
  // --------------------------------------------------
  if (accessEnabled && normalizedAllowedEmail) {
    const emailSnapshot = await getDocs(
      query(
        collection(db, "users"),
        where("email", "==", normalizedAllowedEmail),
      ),
    );

    const transferTasks = [];

    emailSnapshot.forEach(function (userSnap) {
      const data = userSnap.data();

      if (data.role !== "commune") {
        return;
      }

      transferTasks.push(
        updateDoc(userSnap.ref, {
          unitId,
          unitName: unitName || "",
          unitCode: unitCode || "",
          active: true,
          updatedAt: serverTimestamp(),
          accessUpdatedBy: currentAdmin.uid,
        }),
      );
    });

    await Promise.all(transferTasks);
  }
}

// ======================================================
// 19. KIỂM TRA EMAIL
// ======================================================

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

// ======================================================
// 20. TÊN LOẠI ĐƠN VỊ
// ======================================================

function getUnitTypeName(type) {
  switch (type) {
    case "commune":
      return "Xã";

    case "ward":
      return "Phường";

    default:
      return "Khác";
  }
}

// ======================================================
// 21. CHỐNG CHÈN HTML
// ======================================================

function escapeHtml(value) {
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
// 22. THÔNG BÁO ĐƠN VỊ
// ======================================================

function showUnitMessage(message, type) {
  if (!unitMessage) {
    return;
  }

  unitMessage.textContent = message;
  unitMessage.className = "admin-message";

  if (type) {
    unitMessage.classList.add(type);
  }
}

// ======================================================
// 23. THÔNG BÁO CẤP QUYỀN
// ======================================================

function showAccountMessage(message, type) {
  if (!accountPermissionMessage) {
    return;
  }

  accountPermissionMessage.textContent = message;
  accountPermissionMessage.className = "admin-message";

  if (type) {
    accountPermissionMessage.classList.add(type);
  }
}

// ======================================================
// 24. LOADING ĐƠN VỊ
// ======================================================

function setUnitLoading(isLoading) {
  if (!saveUnitButton) {
    return;
  }

  saveUnitButton.disabled = isLoading;

  if (isLoading) {
    saveUnitButton.textContent = "Đang lưu...";
  } else {
    saveUnitButton.textContent = editingUnitId
      ? "Cập nhật đơn vị"
      : "Thêm đơn vị";
  }
}

// ======================================================
// 25. LOADING CẤP QUYỀN
// ======================================================

function setAccountLoading(isLoading) {
  if (!saveAccountPermission) {
    return;
  }

  saveAccountPermission.disabled = isLoading;
  saveAccountPermission.textContent = isLoading ? "Đang lưu..." : "Lưu quyền";
}

// ======================================================
// 26. QUẢN LÝ GIAI ĐOẠN - THÊM GIAI ĐOẠN
// ======================================================

if (phaseForm) {
  phaseForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const phaseName = phaseNameInput?.value.trim() || "";
    let phaseCode = phaseCodeInput?.value.trim().toLowerCase() || "";
    const phaseOrder = Number(phaseOrderInput?.value);

    if (!phaseName) {
      showPhaseMessage("Vui lòng nhập tên giai đoạn.", "error");
      return;
    }

    if (!phaseCode) {
      showPhaseMessage("Vui lòng nhập mã giai đoạn.", "error");
      return;
    }

    phaseCode = phaseCode.replace(/\s+/g, "").replace(/[^a-z0-9_-]/g, "");

    if (!phaseCode) {
      showPhaseMessage("Mã giai đoạn không hợp lệ.", "error");
      return;
    }

    if (!Number.isInteger(phaseOrder) || phaseOrder < 1) {
      showPhaseMessage("Thứ tự phải là số nguyên lớn hơn 0.", "error");
      return;
    }

    setPhaseLoading(true);

    try {
      const phaseRef = doc(db, "projectPhases", phaseCode);
      const existingPhase = await getDoc(phaseRef);

      if (existingPhase.exists()) {
        showPhaseMessage("Mã giai đoạn này đã tồn tại.", "error");
        return;
      }

      await setDoc(phaseRef, {
        name: phaseName,
        code: phaseCode,
        order: phaseOrder,
        active: true,
        createdBy: currentAdmin.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      showPhaseMessage("Đã thêm giai đoạn thành công.", "success");
      showToast("Đã thêm giai đoạn thành công.", "success");

      phaseForm.reset();
      await loadPhases();
    } catch (error) {
      console.error("Lỗi thêm giai đoạn:", error);
      showPhaseMessage("Không thể thêm giai đoạn.", "error");
    } finally {
      setPhaseLoading(false);
    }
  });
}

// ======================================================
// 27. TẢI DANH SÁCH GIAI ĐOẠN
// ======================================================

async function loadPhases() {
  if (!phaseTableBody) {
    return;
  }

  phaseTableBody.innerHTML = `
    <tr>
      <td colspan="6" class="table-empty">
        Đang tải dữ liệu...
      </td>
    </tr>
  `;

  try {
    const phasesQuery = query(
      collection(db, "projectPhases"),
      orderBy("order", "asc"),
    );

    const snapshot = await getDocs(phasesQuery);

    currentPhases = [];

    snapshot.forEach(function (documentSnapshot) {
      currentPhases.push({
        id: documentSnapshot.id,
        ...documentSnapshot.data(),
      });
    });

    renderPhases(currentPhases);

    if (phaseOrderInput) {
      if (currentPhases.length > 0) {
        const maxOrder = Math.max(
          ...currentPhases.map(function (phase) {
            return Number(phase.order) || 0;
          }),
        );

        phaseOrderInput.value = maxOrder + 1;
      } else {
        phaseOrderInput.value = 1;
      }
    }
  } catch (error) {
    console.error("Lỗi tải giai đoạn:", error);

    phaseTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="table-empty table-error">
          Không tải được danh sách giai đoạn.
        </td>
      </tr>
    `;
  }
}

// ======================================================
// 28. HIỂN THỊ DANH SÁCH GIAI ĐOẠN
// ======================================================

function renderPhases(phases) {
  if (phaseCount) {
    phaseCount.textContent = phases.length;
  }

  if (!phaseTableBody) {
    return;
  }

  if (phases.length === 0) {
    phaseTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="table-empty">
          Chưa có giai đoạn nào.
        </td>
      </tr>
    `;

    return;
  }

  phaseTableBody.innerHTML = phases
    .map(function (phase, index) {
      const status =
        phase.active !== false
          ? `<span class="status-active">Hoạt động</span>`
          : `<span class="status-inactive">Ngừng sử dụng</span>`;

      const actionButton =
        phase.active !== false
          ? `
            <button
              type="button"
              class="phase-status-button phase-disable-button"
              data-phase-action="disable"
              data-phase-id="${escapeHtmlAttribute(phase.id)}"
            >
              Ngừng sử dụng
            </button>
          `
          : `
            <button
              type="button"
              class="phase-status-button phase-enable-button"
              data-phase-action="enable"
              data-phase-id="${escapeHtmlAttribute(phase.id)}"
            >
              Kích hoạt
            </button>
          `;

      return `
        <tr>
          <td>${index + 1}</td>
          <td><strong>${escapeHtml(phase.name)}</strong></td>
          <td>${escapeHtml(phase.code || phase.id)}</td>
          <td>${Number(phase.order) || ""}</td>
          <td>${status}</td>
          <td>${actionButton}</td>
        </tr>
      `;
    })
    .join("");
}

// ======================================================
// 29. KÍCH HOẠT / NGỪNG GIAI ĐOẠN
// ======================================================

if (phaseTableBody) {
  phaseTableBody.addEventListener("click", async function (event) {
    const button = event.target.closest("[data-phase-action]");

    if (!button) {
      return;
    }

    const phaseId = button.dataset.phaseId;
    const action = button.dataset.phaseAction;

    if (!phaseId) {
      return;
    }

    const phase = currentPhases.find((item) => item.id === phaseId);
    const newStatus = action === "enable";

    const confirmed = await showConfirm({
      title: newStatus ? "Kích hoạt giai đoạn" : "Ngừng sử dụng giai đoạn",
      message: newStatus
        ? `Bạn có chắc chắn muốn kích hoạt lại “${phase?.name || phaseId}”?`
        : `“${phase?.name || phaseId}” sẽ không còn xuất hiện trên màn hình nhập liệu. Bạn có muốn tiếp tục?`,
      confirmText: newStatus ? "Kích hoạt" : "Ngừng sử dụng",
      cancelText: "Hủy",
      type: newStatus ? "info" : "warning",
    });

    if (!confirmed) {
      return;
    }

    button.disabled = true;

    try {
      await updateDoc(doc(db, "projectPhases", phaseId), {
        active: newStatus,
        updatedAt: serverTimestamp(),
        updatedBy: currentAdmin.uid,
      });

      showToast(
        newStatus
          ? "Đã kích hoạt giai đoạn."
          : "Đã ngừng sử dụng giai đoạn.",
        "success",
      );

      await loadPhases();
    } catch (error) {
      console.error("Lỗi cập nhật giai đoạn:", error);
      showToast("Không thể cập nhật trạng thái giai đoạn.", "error");
    } finally {
      button.disabled = false;
    }
  });
}

// ======================================================
// 30. MESSAGE GIAI ĐOẠN
// ======================================================

function showPhaseMessage(message, type) {
  if (!phaseMessage) {
    return;
  }

  phaseMessage.textContent = message;
  phaseMessage.className = "admin-message";

  if (type) {
    phaseMessage.classList.add(type);
  }
}

// ======================================================
// 31. LOADING GIAI ĐOẠN
// ======================================================

function setPhaseLoading(isLoading) {
  if (!savePhaseButton) {
    return;
  }

  savePhaseButton.disabled = isLoading;
  savePhaseButton.textContent = isLoading ? "Đang lưu..." : "Thêm giai đoạn";
}

// ======================================================
// 32. ĐĂNG XUẤT ADMIN
// ======================================================

logoutButton?.addEventListener("click", async function () {
  const confirmed = await showConfirm({
    title: "Đăng xuất hệ thống",
    message: "Bạn có chắc chắn muốn kết thúc phiên quản trị hiện tại?",
    confirmText: "Đăng xuất",
    cancelText: "Ở lại",
    type: "warning",
  });

  if (!confirmed) {
    return;
  }

  try {
    logoutButton.disabled = true;
    logoutButton.textContent = "Đang đăng xuất...";

    await signOut(auth);
    window.location.href = "index.html";
  } catch (error) {
    console.error("Lỗi đăng xuất:", error);

    showToast("Không thể đăng xuất. Vui lòng thử lại.", "error");

    logoutButton.disabled = false;
    logoutButton.textContent = "Đăng xuất";
  }
});
