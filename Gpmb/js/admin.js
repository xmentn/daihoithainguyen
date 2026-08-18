// ======================================================
// ADMIN.JS
//
// - Kiểm tra quyền Admin
// - Quản lý đơn vị
// - Cấp email đăng ký cho từng đơn vị
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

// ======================================================
// BIẾN DÙNG CHUNG
// ======================================================

let currentAdmin = null;

let currentAdminProfile = null;

let currentUnits = [];

// ======================================================
// HTML - ADMIN
// ======================================================

const adminLoading = document.getElementById("adminLoading");

const adminApp = document.getElementById("adminApp");

const adminName = document.getElementById("adminName");

const logoutButton = document.getElementById("logoutButton");

// ======================================================
// HTML - ĐƠN VỊ
// ======================================================

const unitForm = document.getElementById("unitForm");

const unitNameInput = document.getElementById("unitName");

const unitCodeInput = document.getElementById("unitCode");

const unitTypeSelect = document.getElementById("unitType");

const unitMessage = document.getElementById("unitMessage");

const saveUnitButton = document.getElementById("saveUnitButton");

const unitTableBody = document.getElementById("unitTableBody");

const unitCount = document.getElementById("unitCount");

// ======================================================
// HTML - CẤP QUYỀN TÀI KHOẢN
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

// ======================================================
// HTML - QUẢN LÝ GIAI ĐOẠN
// ======================================================

const phaseForm = document.getElementById("phaseForm");

const phaseNameInput = document.getElementById("phaseName");

const phaseCodeInput = document.getElementById("phaseCode");

const phaseOrderInput = document.getElementById("phaseOrder");

const phaseMessage = document.getElementById("phaseMessage");

const savePhaseButton = document.getElementById("savePhaseButton");

const phaseTableBody = document.getElementById("phaseTableBody");

const phaseCount = document.getElementById("phaseCount");

let currentPhases = [];

// ======================================================
// 1. KIỂM TRA ĐĂNG NHẬP VÀ QUYỀN ADMIN
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

      if (profile.role !== "admin" || profile.active === false) {
        alert("Bạn không có quyền truy cập trang quản trị.");

        window.location.href = "index.html";

        return;
      }

      // ==============================================
      // ĐÚNG ADMIN
      // ==============================================

      currentAdmin = user;

      currentAdminProfile = profile;

      adminName.textContent =
        profile.displayName || user.email || "Quản trị hệ thống";

      adminLoading.style.display = "none";

      adminApp.style.display = "block";

      // Tải danh sách đơn vị
      await loadUnits();
      await loadPhases();
    } catch (error) {
      console.error("Lỗi kiểm tra quyền Admin:", error);

      alert("Không thể kiểm tra quyền truy cập.");

      window.location.href = "index.html";
    }
  },
);

// ======================================================
// 2. THÊM ĐƠN VỊ
// ======================================================

unitForm.addEventListener(
  "submit",

  async function (event) {
    event.preventDefault();

    const unitName = unitNameInput.value.trim();

    let unitCode = unitCodeInput.value.trim().toUpperCase();

    const unitType = unitTypeSelect.value;

    // ==============================================
    // KIỂM TRA
    // ==============================================

    if (!unitName) {
      showUnitMessage("Vui lòng nhập tên đơn vị.", "error");

      return;
    }

    if (!unitCode) {
      showUnitMessage("Vui lòng nhập mã đơn vị.", "error");

      return;
    }

    // Chuẩn hóa mã
    unitCode = unitCode.replace(/\s+/g, "_").replace(/[^A-Z0-9_-]/g, "");

    if (!unitCode) {
      showUnitMessage("Mã đơn vị không hợp lệ.", "error");

      return;
    }

    setUnitLoading(true);

    try {
      // ==============================================
      // KIỂM TRA MÃ ĐƠN VỊ ĐÃ TỒN TẠI CHƯA
      // ==============================================

      const codeQuery = query(
        collection(db, "units"),

        where("code", "==", unitCode),
      );

      const codeSnapshot = await getDocs(codeQuery);

      if (!codeSnapshot.empty) {
        showUnitMessage("Mã đơn vị đã tồn tại.", "error");

        return;
      }

      // ==============================================
      // LƯU ĐƠN VỊ
      // ==============================================

      await addDoc(
        collection(db, "units"),

        {
          name: unitName,

          code: unitCode,

          type: unitType,

          active: true,

          // Chưa cấp quyền tài khoản
          loginEmail: "",

          accountEnabled: false,

          createdBy: currentAdmin.uid,

          createdAt: serverTimestamp(),

          updatedAt: serverTimestamp(),
        },
      );

      showUnitMessage("Đã thêm đơn vị thành công.", "success");

      unitForm.reset();

      unitTypeSelect.value = "commune";

      await loadUnits();
    } catch (error) {
      console.error("Lỗi thêm đơn vị:", error);

      showUnitMessage("Không thể thêm đơn vị.", "error");
    } finally {
      setUnitLoading(false);
    }
  },
);

// ======================================================
// 3. TẢI DANH SÁCH ĐƠN VỊ
// ======================================================

async function loadUnits() {
  unitTableBody.innerHTML = `

        <tr>

            <td
                colspan="8"
                class="table-empty"
            >
                Đang tải dữ liệu...
            </td>

        </tr>

    `;

  try {
    const unitQuery = query(
      collection(db, "units"),

      orderBy("name", "asc"),
    );

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

                <td
                    colspan="8"
                    class="table-empty table-error"
                >
                    Không tải được danh sách đơn vị.
                </td>

            </tr>

        `;
  }
}

// ======================================================
// 4. HIỂN THỊ DANH SÁCH ĐƠN VỊ
// ======================================================

function renderUnits(units) {
  unitCount.textContent = units.length;

  if (units.length === 0) {
    unitTableBody.innerHTML = `

            <tr>

                <td
                    colspan="8"
                    class="table-empty"
                >
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
        : `
                            <span class="account-email-empty">
                                Chưa cấp
                            </span>
                        `;

      const accountStatus =
        unit.accountEnabled === true && unit.loginEmail
          ? `
                            <span class="account-status-enabled">
                                Đã cấp
                            </span>
                        `
          : `
                            <span class="account-status-disabled">
                                Chưa cấp
                            </span>
                        `;

      return `

                        <tr>

                            <td>
                                ${index + 1}
                            </td>


                            <td>

                                <strong>
                                    ${escapeHtml(unit.name)}
                                </strong>

                            </td>


                            <td>
                                ${escapeHtml(unit.code)}
                            </td>


                            <td>
                                ${getUnitTypeName(unit.type)}
                            </td>


                            <td>
                                ${loginEmail}
                            </td>


                            <td>
                                ${accountStatus}
                            </td>


                            <td>

                                ${
                                  unit.active !== false
                                    ? `
                                        <span class="status-active">
                                            Hoạt động
                                        </span>
                                      `
                                    : `
                                        <span class="status-inactive">
                                            Ngừng hoạt động
                                        </span>
                                      `
                                }

                            </td>


                            <td>

                                <button
                                    type="button"
                                    class="table-action-button"
                                    data-action="account"
                                    data-unit-id="${unit.id}"
                                >

                                    ${
                                      unit.loginEmail
                                        ? "Sửa quyền"
                                        : "Cấp tài khoản"
                                    }

                                </button>

                            </td>

                        </tr>

                    `;
    })
    .join("");
}

// ======================================================
// 5. CLICK NÚT CẤP TÀI KHOẢN
// ======================================================

unitTableBody.addEventListener(
  "click",

  function (event) {
    const button = event.target.closest("[data-action='account']");

    if (!button) {
      return;
    }

    const unitId = button.dataset.unitId;

    openAccountModal(unitId);
  },
);

// ======================================================
// 6. MỞ HỘP CẤP QUYỀN
// ======================================================

function openAccountModal(unitId) {
  const unit = currentUnits.find(function (item) {
    return item.id === unitId;
  });

  if (!unit) {
    alert("Không tìm thấy đơn vị.");

    return;
  }

  accountUnitId.value = unit.id;

  accountUnitName.textContent = unit.name || "";

  accountEmail.value = unit.loginEmail || "";

  accountEnabled.checked = unit.accountEnabled === true;

  // Nếu chưa cấp bao giờ
  if (!unit.loginEmail) {
    accountEnabled.checked = true;
  }

  showAccountMessage("", "");

  accountModal.style.display = "flex";

  setTimeout(function () {
    accountEmail.focus();
  }, 50);
}

// ======================================================
// 7. ĐÓNG HỘP
// ======================================================

function closeAccountPermissionModal() {
  accountModal.style.display = "none";

  accountPermissionForm.reset();

  accountUnitId.value = "";

  showAccountMessage("", "");
}

// ======================================================
// CLICK NÚT X
// ======================================================

closeAccountModalButton.addEventListener(
  "click",

  closeAccountPermissionModal,
);

// ======================================================
// CLICK HỦY
// ======================================================

cancelAccountPermission.addEventListener(
  "click",

  closeAccountPermissionModal,
);

// ======================================================
// CLICK NỀN TỐI
// ======================================================

const modalOverlay = accountModal.querySelector(".account-modal-overlay");

modalOverlay.addEventListener(
  "click",

  closeAccountPermissionModal,
);

// ======================================================
// 8. LƯU QUYỀN TÀI KHOẢN
// ======================================================

accountPermissionForm.addEventListener(
  "submit",

  async function (event) {
    event.preventDefault();

    const unitId = accountUnitId.value;

    const email = accountEmail.value.trim().toLowerCase();

    const enabled = accountEnabled.checked;

    if (!unitId) {
      showAccountMessage("Không xác định được đơn vị.", "error");

      return;
    }

    if (!email) {
      showAccountMessage("Vui lòng nhập email được cấp quyền.", "error");

      return;
    }

    if (!isValidEmail(email)) {
      showAccountMessage("Địa chỉ email không hợp lệ.", "error");

      return;
    }

    setAccountLoading(true);

    try {
      // ==============================================
      // KIỂM TRA EMAIL CÓ ĐƯỢC CẤP CHO ĐƠN VỊ KHÁC
      // HAY CHƯA
      // ==============================================

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

      // ==============================================
      // UPDATE FIRESTORE
      // ==============================================

      const unitRef = doc(db, "units", unitId);

      await updateDoc(
        unitRef,

        {
          loginEmail: email,

          accountEnabled: enabled,

          updatedAt: serverTimestamp(),

          accountUpdatedBy: currentAdmin.uid,
        },
      );

      showAccountMessage("Đã lưu quyền tài khoản thành công.", "success");

      // Cập nhật danh sách
      await loadUnits();

      setTimeout(function () {
        closeAccountPermissionModal();
      }, 700);
    } catch (error) {
      console.error("Lỗi lưu quyền tài khoản:", error);

      showAccountMessage("Không thể lưu quyền tài khoản.", "error");
    } finally {
      setAccountLoading(false);
    }
  },
);

// ======================================================
// 9. KIỂM TRA EMAIL
// ======================================================

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ======================================================
// 10. TÊN LOẠI ĐƠN VỊ
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
// 11. CHỐNG CHÈN HTML
// ======================================================

function escapeHtml(value) {
  const div = document.createElement("div");

  div.textContent = value ?? "";

  return div.innerHTML;
}

// ======================================================
// 12. THÔNG BÁO ĐƠN VỊ
// ======================================================

function showUnitMessage(message, type) {
  unitMessage.textContent = message;

  unitMessage.className = "admin-message";

  if (type) {
    unitMessage.classList.add(type);
  }
}

// ======================================================
// 13. THÔNG BÁO CẤP QUYỀN
// ======================================================

function showAccountMessage(message, type) {
  accountPermissionMessage.textContent = message;

  accountPermissionMessage.className = "admin-message";

  if (type) {
    accountPermissionMessage.classList.add(type);
  }
}

// ======================================================
// 14. LOADING THÊM ĐƠN VỊ
// ======================================================

function setUnitLoading(isLoading) {
  saveUnitButton.disabled = isLoading;

  saveUnitButton.textContent = isLoading ? "Đang lưu..." : "Thêm đơn vị";
}

// ======================================================
// 15. LOADING CẤP QUYỀN
// ======================================================

function setAccountLoading(isLoading) {
  saveAccountPermission.disabled = isLoading;

  saveAccountPermission.textContent = isLoading ? "Đang lưu..." : "Lưu quyền";
}

// ======================================================
// QUẢN LÝ GIAI ĐOẠN
// ======================================================

// ======================================================
// 1. THÊM GIAI ĐOẠN
// ======================================================

phaseForm.addEventListener(
  "submit",

  async function (event) {
    event.preventDefault();

    const phaseName = phaseNameInput.value.trim();

    let phaseCode = phaseCodeInput.value.trim().toLowerCase();

    const phaseOrder = Number(phaseOrderInput.value);

    // ==============================================
    // KIỂM TRA
    // ==============================================

    if (!phaseName) {
      showPhaseMessage("Vui lòng nhập tên giai đoạn.", "error");

      return;
    }

    if (!phaseCode) {
      showPhaseMessage("Vui lòng nhập mã giai đoạn.", "error");

      return;
    }

    // ==============================================
    // CHUẨN HÓA MÃ
    //
    // VD:
    // Phase 1 → phase1
    // giai-doan-1 → giai-doan-1
    // ==============================================

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
      // ==============================================
      // DOCUMENT ID CHÍNH LÀ MÃ GIAI ĐOẠN
      //
      // projectPhases/phase1
      // ==============================================

      const phaseRef = doc(db, "projectPhases", phaseCode);

      const existingPhase = await getDoc(phaseRef);

      if (existingPhase.exists()) {
        showPhaseMessage("Mã giai đoạn này đã tồn tại.", "error");

        return;
      }

      // ==============================================
      // LƯU FIRESTORE
      // ==============================================

      await setDoc(
        phaseRef,

        {
          name: phaseName,

          code: phaseCode,

          order: phaseOrder,

          active: true,

          createdBy: currentAdmin.uid,

          createdAt: serverTimestamp(),

          updatedAt: serverTimestamp(),
        },
      );

      showPhaseMessage("Đã thêm giai đoạn thành công.", "success");

      phaseForm.reset();

      // Tự tăng thứ tự tiếp theo
      phaseOrderInput.value = currentPhases.length + 2;

      await loadPhases();
    } catch (error) {
      console.error("Lỗi thêm giai đoạn:", error);

      showPhaseMessage("Không thể thêm giai đoạn.", "error");
    } finally {
      setPhaseLoading(false);
    }
  },
);

// ======================================================
// 2. TẢI DANH SÁCH GIAI ĐOẠN
// ======================================================

async function loadPhases() {
  if (!phaseTableBody) {
    return;
  }

  phaseTableBody.innerHTML = `

        <tr>

            <td
                colspan="6"
                class="table-empty"
            >
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

    // Nếu có dữ liệu thì gợi ý số thứ tự kế tiếp
    if (currentPhases.length > 0) {
      const maxOrder = Math.max(
        ...currentPhases.map(function (phase) {
          return Number(phase.order) || 0;
        }),
      );

      phaseOrderInput.value = maxOrder + 1;
    }
  } catch (error) {
    console.error("Lỗi tải giai đoạn:", error);

    phaseTableBody.innerHTML = `

            <tr>

                <td
                    colspan="6"
                    class="table-empty table-error"
                >
                    Không tải được danh sách giai đoạn.
                </td>

            </tr>

        `;
  }
}

// ======================================================
// 3. HIỂN THỊ DANH SÁCH
// ======================================================

function renderPhases(phases) {
  phaseCount.textContent = phases.length;

  if (phases.length === 0) {
    phaseTableBody.innerHTML = `

            <tr>

                <td
                    colspan="6"
                    class="table-empty"
                >
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
          ? `
                            <span class="status-active">
                                Hoạt động
                            </span>
                          `
          : `
                            <span class="status-inactive">
                                Ngừng sử dụng
                            </span>
                          `;

      const actionButton =
        phase.active !== false
          ? `
                            <button
                                type="button"
                                class="
                                    phase-status-button
                                    phase-disable-button
                                "
                                data-phase-action="disable"
                                data-phase-id="${phase.id}"
                            >
                                Ngừng sử dụng
                            </button>
                          `
          : `
                            <button
                                type="button"
                                class="
                                    phase-status-button
                                    phase-enable-button
                                "
                                data-phase-action="enable"
                                data-phase-id="${phase.id}"
                            >
                                Kích hoạt
                            </button>
                          `;

      return `

                        <tr>

                            <td>
                                ${index + 1}
                            </td>


                            <td>

                                <strong>
                                    ${escapeHtml(phase.name)}
                                </strong>

                            </td>


                            <td>
                                ${escapeHtml(phase.code || phase.id)}
                            </td>


                            <td>
                                ${Number(phase.order) || ""}
                            </td>


                            <td>
                                ${status}
                            </td>


                            <td>
                                ${actionButton}
                            </td>

                        </tr>

                    `;
    })
    .join("");
}

// ======================================================
// 4. KÍCH HOẠT / NGỪNG GIAI ĐOẠN
// ======================================================

phaseTableBody.addEventListener(
  "click",

  async function (event) {
    const button = event.target.closest("[data-phase-action]");

    if (!button) {
      return;
    }

    const phaseId = button.dataset.phaseId;

    const action = button.dataset.phaseAction;

    if (!phaseId) {
      return;
    }

    const newStatus = action === "enable";

    const message = newStatus
      ? "Bạn có chắc chắn muốn kích hoạt lại giai đoạn này?"
      : "Bạn có chắc chắn muốn ngừng sử dụng giai đoạn này?";

    if (!confirm(message)) {
      return;
    }

    button.disabled = true;

    try {
      const phaseRef = doc(db, "projectPhases", phaseId);

      await updateDoc(
        phaseRef,

        {
          active: newStatus,

          updatedAt: serverTimestamp(),

          updatedBy: currentAdmin.uid,
        },
      );

      await loadPhases();
    } catch (error) {
      console.error("Lỗi cập nhật giai đoạn:", error);

      alert("Không thể cập nhật trạng thái giai đoạn.");
    } finally {
      button.disabled = false;
    }
  },
);

// ======================================================
// 5. MESSAGE
// ======================================================

function showPhaseMessage(message, type) {
  phaseMessage.textContent = message;

  phaseMessage.className = "admin-message";

  if (type) {
    phaseMessage.classList.add(type);
  }
}

// ======================================================
// 6. LOADING
// ======================================================

function setPhaseLoading(isLoading) {
  savePhaseButton.disabled = isLoading;

  savePhaseButton.textContent = isLoading ? "Đang lưu..." : "Thêm giai đoạn";
}
// ======================================================
// 16. ĐĂNG XUẤT
// ======================================================

logoutButton.addEventListener(
  "click",

  async function () {
    const confirmed = confirm("Bạn có chắc chắn muốn đăng xuất?");

    if (!confirmed) {
      return;
    }

    try {
      await signOut(auth);

      window.location.href = "index.html";
    } catch (error) {
      console.error("Lỗi đăng xuất:", error);
    }
  },
);
