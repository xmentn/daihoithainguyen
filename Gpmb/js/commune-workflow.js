// ======================================================
// COMMUNE-WORKFLOW.JS
//
// Trang thử nghiệm quy trình GPMB 5 bước.
//
// Chưa nhập dữ liệu.
// Mục tiêu:
// - Kiểm tra tài khoản xã
// - Lấy workflowSteps từ Firestore
// - Hiển thị 5 bước nghiệp vụ
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
  getDocs,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { showConfirm, showToast } from "./ui-notify.js";

// ======================================================
// BIẾN
// ======================================================

let currentUser = null;

let currentProfile = null;

let workflowSteps = [];

let selectedStepId = null;

// ======================================================
// HTML
// ======================================================

const workflowLoading = document.getElementById("workflowLoading");

const workflowApp = document.getElementById("workflowApp");

const workflowHeaderUnitName = document.getElementById(
  "workflowHeaderUnitName",
);

const workflowUnitName = document.getElementById("workflowUnitName");

const workflowUnitCode = document.getElementById("workflowUnitCode");

const workflowUserEmail = document.getElementById("workflowUserEmail");

const workflowStepsContainer = document.getElementById(
  "workflowStepsContainer",
);

const workflowStepNumber = document.getElementById("workflowStepNumber");

const workflowStepTitle = document.getElementById("workflowStepTitle");

const workflowPlaceholderTitle = document.getElementById(
  "workflowPlaceholderTitle",
);

const workflowPlaceholderText = document.getElementById(
  "workflowPlaceholderText",
);

const workflowLogoutButton = document.getElementById("workflowLogoutButton");
const workflowStepBody = document.getElementById("workflowStepBody");
// ======================================================
// 1. KIỂM TRA TÀI KHOẢN
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
        showToast(
          "Tài khoản không có quyền sử dụng trang nhập số liệu.",
          "error",
        );

        setTimeout(function () {
          window.location.href = "index.html";
        }, 1200);

        return;
      }

      currentUser = user;

      currentProfile = profile;

      showUnitInformation();

      // ==============================================
      // TẢI 5 BƯỚC
      // ==============================================

      await loadWorkflowSteps();

      workflowLoading.style.display = "none";

      workflowApp.style.display = "block";
    } catch (error) {
      console.error("Lỗi khởi tạo trang quy trình:", error);

      showToast("Không thể tải trang nhập số liệu.", "error");
    }
  },
);

// ======================================================
// 2. THÔNG TIN ĐƠN VỊ
// ======================================================

function showUnitInformation() {
  const name =
    currentProfile.unitName || currentProfile.displayName || "Đơn vị";

  workflowHeaderUnitName.textContent = name;

  workflowUnitName.textContent = name;

  workflowUnitCode.textContent = currentProfile.unitCode || "-";

  workflowUserEmail.textContent = currentUser.email || "-";
}

// ======================================================
// 3. LOAD WORKFLOW STEPS
//
// Không dùng where + orderBy để tránh phải tạo
// composite index ở bước này.
//
// Ta đọc collection rồi lọc/sắp xếp ở JavaScript.
// ======================================================

async function loadWorkflowSteps() {
  const snapshot = await getDocs(collection(db, "workflowSteps"));

  workflowSteps = [];

  snapshot.forEach(function (documentSnapshot) {
    const data = documentSnapshot.data();

    // Chỉ lấy bước đang hoạt động
    if (data.active === false) {
      return;
    }

    workflowSteps.push({
      id: documentSnapshot.id,

      name: data.name || documentSnapshot.id,

      code: data.code || documentSnapshot.id,

      order: Number(data.order) || 0,
    });
  });

  // ==============================================
  // SẮP XẾP THEO order
  // ==============================================

  workflowSteps.sort(function (a, b) {
    return a.order - b.order;
  });

  console.log("Workflow:", workflowSteps);

  renderWorkflowSteps();

  // ==============================================
  // MẶC ĐỊNH CHỌN BƯỚC ĐẦU
  // ==============================================

  if (workflowSteps.length > 0) {
    selectWorkflowStep(workflowSteps[0].id);
  }
}

// ======================================================
// 4. HIỂN THỊ CÁC BƯỚC
// ======================================================

function renderWorkflowSteps() {
  if (workflowSteps.length === 0) {
    workflowStepsContainer.innerHTML = `

            <div class="workflow-loading-text">
                Chưa có bước nghiệp vụ đang hoạt động.
            </div>

        `;

    return;
  }

  workflowStepsContainer.innerHTML = workflowSteps
    .map(function (step, index) {
      return `

                        <button
                            type="button"
                            class="workflow-step-button"
                            data-step-id="${escapeHtmlAttribute(step.id)}"
                        >

                            <span class="workflow-step-index">
                                ${index + 1}
                            </span>


                            <span class="workflow-step-name">
                                ${escapeHtmlText(step.name)}
                            </span>

                        </button>

                    `;
    })
    .join("");
}

// ======================================================
// 5. CLICK BƯỚC
// ======================================================

workflowStepsContainer.addEventListener(
  "click",

  function (event) {
    const button = event.target.closest("[data-step-id]");

    if (!button) {
      return;
    }

    selectWorkflowStep(button.dataset.stepId);
  },
);

// ======================================================
// 6. CHỌN BƯỚC NGHIỆP VỤ
// ======================================================

function selectWorkflowStep(stepId) {
  const stepIndex = workflowSteps.findIndex(function (item) {
    return item.id === stepId;
  });

  if (stepIndex === -1) {
    return;
  }

  const step = workflowSteps[stepIndex];

  selectedStepId = step.id;

  // ==============================================
  // ACTIVE BUTTON
  // ==============================================

  document.querySelectorAll(".workflow-step-button").forEach(function (button) {
    button.classList.toggle(
      "active",

      button.dataset.stepId === step.id,
    );
  });

  // ==============================================
  // NỘI DUNG
  // ==============================================

  workflowStepNumber.textContent = stepIndex + 1;

  workflowStepTitle.textContent = step.name;
  renderSelectedStep(step);
}
// ======================================================
// HIỂN THỊ NỘI DUNG BƯỚC ĐƯỢC CHỌN
// ======================================================

async function renderSelectedStep(step) {
  if (step.id === "inventory") {
    await renderInventoryForm();

    return;
  }
  if (step.id === "compensation") {
    await renderCompensationForm();

    return;
  }
  if (step.id === "support") {
    await renderSupportForm();

    return;
  }
  if (step.id === "resettlement") {
    await renderResettlementForm();

    return;
  }
  if (step.id === "handover") {
    await renderHandoverForm();

    return;
  }
  // Các bước khác tạm thời chưa làm biểu mẫu
  workflowStepBody.innerHTML = `

        <div class="workflow-placeholder">

            <div class="workflow-placeholder-icon">
                ✓
            </div>

            <h3>
                ${escapeHtmlText("Nhập số liệu " + step.name)}
            </h3>

            <p>
                ${escapeHtmlText(getStepDescription(step.id))}
            </p>

        </div>

    `;
}
// ======================================================
// BIỂU MẪU KIỂM ĐẾM
// ======================================================

async function renderInventoryForm() {
  workflowStepBody.innerHTML = `

        <form id="inventoryForm">


            <!-- =========================================
                 1. HỘ DÂN / TỔ CHỨC
            ========================================== -->

            <div class="workflow-form-section">

                <div class="workflow-form-title">

                    <h3>
                        1. Hộ dân / tổ chức phải kiểm đếm
                    </h3>

                    <p>
                        Theo dõi tiến độ kiểm đếm đối với
                        các hộ dân và tổ chức bị ảnh hưởng.
                    </p>

                </div>


                <div class="workflow-form-grid">

                    <div class="form-group">

                        <label for="inventoryTotalHouseholds">
                            Tổng số hộ / tổ chức phải kiểm đếm
                        </label>

                        <input
                            type="number"
                            id="inventoryTotalHouseholds"
                            min="0"
                            step="1"
                            value="0"
                        >

                    </div>


                    <div class="form-group">

                        <label for="inventoryNotifiedHouseholds">
                            Đã thông báo kiểm đếm
                        </label>

                        <input
                            type="number"
                            id="inventoryNotifiedHouseholds"
                            min="0"
                            step="1"
                            value="0"
                        >

                    </div>


                    <div class="form-group">

                        <label for="inventoryCompletedHouseholds">
                            Đã kiểm đếm
                        </label>

                        <input
                            type="number"
                            id="inventoryCompletedHouseholds"
                            min="0"
                            step="1"
                            value="0"
                        >

                    </div>


                    <div class="form-group">

                        <label>
                            Chưa kiểm đếm
                        </label>

                        <input
                            type="text"
                            id="inventoryRemainingHouseholds"
                            value="0"
                            readonly
                        >

                    </div>


                    <div class="form-group">

                        <label>
                            Tỷ lệ hoàn thành
                        </label>

                        <input
                            type="text"
                            id="inventoryHouseholdPercent"
                            value="0%"
                            readonly
                        >

                    </div>

                </div>

            </div>



            <!-- =========================================
                 2. THỬA ĐẤT
            ========================================== -->

            <div class="workflow-form-section">

                <div class="workflow-form-title">

                    <h3>
                        2. Thửa đất
                    </h3>

                    <p>
                        Theo dõi số thửa đất thuộc phạm vi
                        phải kiểm đếm.
                    </p>

                </div>


                <div class="workflow-form-grid">

                    <div class="form-group">

                        <label for="inventoryTotalPlots">
                            Tổng số thửa phải kiểm đếm
                        </label>

                        <input
                            type="number"
                            id="inventoryTotalPlots"
                            min="0"
                            step="1"
                            value="0"
                        >

                    </div>


                    <div class="form-group">

                        <label for="inventoryCompletedPlots">
                            Số thửa đã kiểm đếm
                        </label>

                        <input
                            type="number"
                            id="inventoryCompletedPlots"
                            min="0"
                            step="1"
                            value="0"
                        >

                    </div>


                    <div class="form-group">

                        <label>
                            Số thửa chưa kiểm đếm
                        </label>

                        <input
                            type="text"
                            id="inventoryRemainingPlots"
                            value="0"
                            readonly
                        >

                    </div>


                    <div class="form-group">

                        <label>
                            Tỷ lệ hoàn thành
                        </label>

                        <input
                            type="text"
                            id="inventoryPlotPercent"
                            value="0%"
                            readonly
                        >

                    </div>

                </div>

            </div>



            <!-- =========================================
                 3. DIỆN TÍCH
            ========================================== -->

            <div class="workflow-form-section">

                <div class="workflow-form-title workflow-title-row">

                    <div>

                        <h3>
                            3. Diện tích kiểm đếm
                        </h3>

                        <p>
                            Theo dõi diện tích đã hoàn thành
                            việc kiểm đếm.
                        </p>

                    </div>


                    <div class="workflow-area-unit">

                        <label for="inventoryAreaUnit">
                            Đơn vị
                        </label>

                        <select id="inventoryAreaUnit">

                            <option value="m2">
                                m²
                            </option>

                            <option value="ha">
                                ha
                            </option>

                        </select>

                    </div>

                </div>


                <div class="workflow-form-grid">

                    <div class="form-group">

                        <label for="inventoryTotalArea">
                            Tổng diện tích phải kiểm đếm
                        </label>

                        <input
                            type="number"
                            id="inventoryTotalArea"
                            min="0"
                            step="0.01"
                            value="0"
                        >

                    </div>


                    <div class="form-group">

                        <label for="inventoryCompletedArea">
                            Diện tích đã kiểm đếm
                        </label>

                        <input
                            type="number"
                            id="inventoryCompletedArea"
                            min="0"
                            step="0.01"
                            value="0"
                        >

                    </div>


                    <div class="form-group">

                        <label>
                            Diện tích còn lại
                        </label>

                        <input
                            type="text"
                            id="inventoryRemainingArea"
                            value="0 m²"
                            readonly
                        >

                    </div>


                    <div class="form-group">

                        <label>
                            Tỷ lệ hoàn thành
                        </label>

                        <input
                            type="text"
                            id="inventoryAreaPercent"
                            value="0%"
                            readonly
                        >

                    </div>

                </div>

            </div>



            <!-- =========================================
                 4. PHỐI HỢP
            ========================================== -->

            <div class="workflow-form-section">

                <div class="workflow-form-title">

                    <h3>
                        4. Tình hình phối hợp kiểm đếm
                    </h3>

                </div>


                <div class="workflow-form-grid">

                    <div class="form-group">

                        <label for="inventoryCooperativeHouseholds">
                            Số hộ phối hợp kiểm đếm
                        </label>

                        <input
                            type="number"
                            id="inventoryCooperativeHouseholds"
                            min="0"
                            step="1"
                            value="0"
                        >

                    </div>


                    <div class="form-group">

                        <label for="inventoryUncooperativeHouseholds">
                            Số hộ chưa phối hợp
                        </label>

                        <input
                            type="number"
                            id="inventoryUncooperativeHouseholds"
                            min="0"
                            step="1"
                            value="0"
                        >

                    </div>

                </div>

            </div>



            <!-- =========================================
                 5. GHI CHÚ
            ========================================== -->

            <div class="workflow-form-section">

                <div class="workflow-form-title">

                    <h3>
                        5. Vướng mắc / ghi chú
                    </h3>

                </div>


                <div class="form-group">

                    <textarea
                        id="inventoryNotes"
                        class="workflow-textarea"
                        rows="4"
                        placeholder="Nhập nội dung khó khăn, vướng mắc hoặc thông tin cần lưu ý..."
                    ></textarea>

                </div>

            </div>



            <!-- =========================================
                 SAVE
            ========================================== -->

            <div class="workflow-save-area">

                <div>

                    <div
                        id="inventoryMessage"
                        class="admin-message"
                    ></div>

                    <div
                        id="inventoryUpdatedAt"
                        class="last-updated"
                    >
                        Chưa có dữ liệu được lưu.
                    </div>

                </div>


                <button
                    type="submit"
                    id="inventorySaveButton"
                    class="commune-save-button"
                >
                    Lưu số liệu kiểm đếm
                </button>

            </div>


        </form>

    `;

  // Sau khi form đã xuất hiện:
  bindInventoryEvents();

  // Tải dữ liệu đã có
  await loadInventoryData();
}
// ======================================================
// BIỂU MẪU BỒI THƯỜNG
// ======================================================

async function renderCompensationForm() {
  workflowStepBody.innerHTML = `

        <form id="compensationForm">


            <!-- =========================================
                 1. TIẾN ĐỘ PHƯƠNG ÁN
            ========================================== -->

            <div class="workflow-form-section">

                <div class="workflow-form-title">

                    <h3>
                        1. Tiến độ phương án bồi thường
                    </h3>

                    <p>
                        Theo dõi quá trình lập, công khai và
                        phê duyệt phương án bồi thường.
                    </p>

                </div>


                <div class="workflow-form-grid">

                    <div class="form-group">

                        <label for="compTotalHouseholds">
                            Tổng số hộ / tổ chức phải lập phương án
                        </label>

                        <input
                            type="number"
                            id="compTotalHouseholds"
                            min="0"
                            step="1"
                            value="0"
                        >

                    </div>


                    <div class="form-group">

                        <label for="compPreparedHouseholds">
                            Đã lập phương án
                        </label>

                        <input
                            type="number"
                            id="compPreparedHouseholds"
                            min="0"
                            step="1"
                            value="0"
                        >

                    </div>


                    <div class="form-group">

                        <label for="compPublishedHouseholds">
                            Đã công khai phương án
                        </label>

                        <input
                            type="number"
                            id="compPublishedHouseholds"
                            min="0"
                            step="1"
                            value="0"
                        >

                    </div>


                    <div class="form-group">

                        <label for="compApprovedHouseholds">
                            Đã phê duyệt phương án
                        </label>

                        <input
                            type="number"
                            id="compApprovedHouseholds"
                            min="0"
                            step="1"
                            value="0"
                        >

                    </div>


                    <div class="form-group">

                        <label>
                            Chưa phê duyệt
                        </label>

                        <input
                            type="text"
                            id="compRemainingApproval"
                            value="0"
                            readonly
                        >

                    </div>


                    <div class="form-group">

                        <label>
                            Tỷ lệ phê duyệt
                        </label>

                        <input
                            type="text"
                            id="compApprovalPercent"
                            value="0%"
                            readonly
                        >

                    </div>

                </div>

            </div>



            <!-- =========================================
                 2. CHI TRẢ BỒI THƯỜNG
            ========================================== -->

            <div class="workflow-form-section">

                <div class="workflow-form-title">

                    <h3>
                        2. Chi trả tiền bồi thường
                    </h3>

                    <p>
                        Theo dõi số hộ đã nhận tiền và
                        các trường hợp chưa đồng ý.
                    </p>

                </div>


                <div class="workflow-form-grid">

                    <div class="form-group">

                        <label for="compPaidHouseholds">
                            Số hộ / tổ chức đã nhận tiền
                        </label>

                        <input
                            type="number"
                            id="compPaidHouseholds"
                            min="0"
                            step="1"
                            value="0"
                        >

                    </div>


                    <div class="form-group">

                        <label>
                            Chưa nhận tiền
                        </label>

                        <input
                            type="text"
                            id="compUnpaidHouseholds"
                            value="0"
                            readonly
                        >

                    </div>


                    <div class="form-group">

                        <label for="compNotAgreedHouseholds">
                            Số hộ / tổ chức chưa đồng ý
                        </label>

                        <input
                            type="number"
                            id="compNotAgreedHouseholds"
                            min="0"
                            step="1"
                            value="0"
                        >

                    </div>


                    <div class="form-group">

                        <label>
                            Tỷ lệ đã nhận tiền
                        </label>

                        <input
                            type="text"
                            id="compPaymentPercent"
                            value="0%"
                            readonly
                        >

                    </div>

                </div>

            </div>



            <!-- =========================================
                 3. KINH PHÍ
            ========================================== -->

            <div class="workflow-form-section">

                <div class="workflow-form-title">

                    <h3>
                        3. Kinh phí bồi thường
                    </h3>

                    <p>
                        Đơn vị nhập: triệu đồng.
                        Hệ thống sẽ lưu thống nhất bằng đồng.
                    </p>

                </div>


                <div class="workflow-form-grid">

                    <div class="form-group">

                        <label for="compTotalAmount">
                            Tổng kinh phí dự kiến
                        </label>

                        <input
                            type="number"
                            id="compTotalAmount"
                            min="0"
                            step="0.01"
                            value="0"
                        >

                    </div>


                    <div class="form-group">

                        <label for="compApprovedAmount">
                            Kinh phí đã phê duyệt
                        </label>

                        <input
                            type="number"
                            id="compApprovedAmount"
                            min="0"
                            step="0.01"
                            value="0"
                        >

                    </div>


                    <div class="form-group">

                        <label for="compPaidAmount">
                            Kinh phí đã chi trả
                        </label>

                        <input
                            type="number"
                            id="compPaidAmount"
                            min="0"
                            step="0.01"
                            value="0"
                        >

                    </div>


                    <div class="form-group">

                        <label>
                            Kinh phí còn lại
                        </label>

                        <input
                            type="text"
                            id="compRemainingAmount"
                            value="0 triệu đồng"
                            readonly
                        >

                    </div>

                </div>

            </div>



            <!-- =========================================
                 4. GHI CHÚ
            ========================================== -->

            <div class="workflow-form-section">

                <div class="workflow-form-title">

                    <h3>
                        4. Vướng mắc / ghi chú
                    </h3>

                </div>


                <div class="form-group">

                    <textarea
                        id="compNotes"
                        class="workflow-textarea"
                        rows="4"
                        placeholder="Nhập các trường hợp chưa đồng ý, khó khăn, vướng mắc hoặc nội dung cần lưu ý..."
                    ></textarea>

                </div>

            </div>



            <!-- =========================================
                 SAVE
            ========================================== -->

            <div class="workflow-save-area">

                <div>

                    <div
                        id="compMessage"
                        class="admin-message"
                    ></div>

                    <div
                        id="compUpdatedAt"
                        class="last-updated"
                    >
                        Chưa có dữ liệu được lưu.
                    </div>

                </div>


                <button
                    type="submit"
                    id="compSaveButton"
                    class="commune-save-button"
                >
                    Lưu số liệu bồi thường
                </button>

            </div>


        </form>

    `;

  bindCompensationEvents();

  await loadCompensationData();
}
// ======================================================
// GẮN SỰ KIỆN BỒI THƯỜNG
// ======================================================

function bindCompensationEvents() {
  const ids = [
    "compTotalHouseholds",
    "compPreparedHouseholds",
    "compPublishedHouseholds",
    "compApprovedHouseholds",
    "compPaidHouseholds",
    "compNotAgreedHouseholds",

    "compTotalAmount",
    "compApprovedAmount",
    "compPaidAmount",
  ];

  ids.forEach(function (id) {
    const element = document.getElementById(id);

    if (element) {
      element.addEventListener("input", calculateCompensation);
    }
  });

  document
    .getElementById("compensationForm")
    .addEventListener("submit", saveCompensationData);

  calculateCompensation();
}
// ======================================================
// TÍNH TOÁN BỒI THƯỜNG
// ======================================================

function calculateCompensation() {
  const total = getNumber("compTotalHouseholds");

  const approved = getNumber("compApprovedHouseholds");

  const paid = getNumber("compPaidHouseholds");

  // Chưa phê duyệt
  setValue(
    "compRemainingApproval",

    formatNumber(Math.max(0, total - approved)),
  );

  // % phê duyệt
  setValue(
    "compApprovalPercent",

    formatNumber(calculatePercent(approved, total), 1) + "%",
  );

  // Chưa nhận tiền
  setValue(
    "compUnpaidHouseholds",

    formatNumber(Math.max(0, approved - paid)),
  );

  // % nhận tiền trên số đã phê duyệt
  setValue(
    "compPaymentPercent",

    formatNumber(calculatePercent(paid, approved), 1) + "%",
  );

  // ==============================================
  // KINH PHÍ
  // ==============================================

  const approvedAmount = getNumber("compApprovedAmount");

  const paidAmount = getNumber("compPaidAmount");

  setValue(
    "compRemainingAmount",

    formatNumber(Math.max(0, approvedAmount - paidAmount), 2) + " triệu đồng",
  );
}
// ======================================================
// LƯU DỮ LIỆU BỒI THƯỜNG
// ======================================================

async function saveCompensationData(event) {
  event.preventDefault();

  const total = getInteger("compTotalHouseholds");

  const prepared = getInteger("compPreparedHouseholds");

  const published = getInteger("compPublishedHouseholds");

  const approved = getInteger("compApprovedHouseholds");

  const paid = getInteger("compPaidHouseholds");

  const notAgreed = getInteger("compNotAgreedHouseholds");

  const totalAmount = getNumber("compTotalAmount");

  const approvedAmount = getNumber("compApprovedAmount");

  const paidAmount = getNumber("compPaidAmount");

  // ==================================================
  // KIỂM TRA LOGIC NGHIỆP VỤ
  // ==================================================

  if (prepared > total) {
    showToast(
      "Số hộ đã lập phương án không được lớn hơn tổng số hộ phải lập phương án.",
      "warning",
    );

    return;
  }

  if (published > prepared) {
    showToast(
      "Số hộ đã công khai phương án không được lớn hơn số hộ đã lập phương án.",
      "warning",
    );

    return;
  }

  if (approved > published) {
    showToast(
      "Số hộ đã phê duyệt không được lớn hơn số hộ đã công khai phương án.",
      "warning",
    );

    return;
  }

  if (paid > approved) {
    showToast(
      "Số hộ đã nhận tiền không được lớn hơn số hộ đã được phê duyệt.",
      "warning",
    );

    return;
  }

  if (notAgreed > total) {
    showToast("Số hộ chưa đồng ý không được lớn hơn tổng số hộ.", "warning");

    return;
  }

  if (approvedAmount > totalAmount) {
    showToast(
      "Kinh phí đã phê duyệt không được lớn hơn tổng kinh phí dự kiến.",
      "warning",
    );

    return;
  }

  if (paidAmount > approvedAmount) {
    showToast(
      "Kinh phí đã chi trả không được lớn hơn kinh phí đã phê duyệt.",
      "warning",
    );

    return;
  }
  // ======================================================
  // KIỂM TRA LIÊN THÔNG VỚI BƯỚC BÀN GIAO
  //
  // Không cho số hộ đã nhận tiền thấp hơn
  // số hộ đã bàn giao mặt bằng.
  // ======================================================

  try {
    const handoverRef = doc(
      db,
      "progress",
      currentProfile.unitId,
      "steps",
      "handover",
    );

    const handoverSnap = await getDoc(handoverRef);

    if (handoverSnap.exists()) {
      const handoverData = handoverSnap.data();

      const handedOverHouseholds = Math.max(
        0,
        Math.floor(Number(handoverData.handedOverHouseholds || 0)),
      );

      if (paid < handedOverHouseholds) {
        showToast(
          "Không thể lưu: hiện đã có " +
            handedOverHouseholds +
            " hộ bàn giao mặt bằng. " +
            "Số hộ đã nhận tiền không được thấp hơn số hộ đã bàn giao.",
          "warning",
          5000,
        );

        return;
      }
    }
  } catch (error) {
    console.error("Lỗi kiểm tra dữ liệu bàn giao:", error);

    showToast(
      "Không thể kiểm tra tính liên thông với dữ liệu bàn giao.",
      "error",
    );

    return;
  }
  const button = document.getElementById("compSaveButton");

  button.disabled = true;

  button.textContent = "Đang lưu...";

  try {
    const ref = doc(
      db,
      "progress",
      currentProfile.unitId,
      "steps",
      "compensation",
    );

    const oldSnap = await getDoc(ref);

    const payload = {
      unitId: currentProfile.unitId,

      unitName: currentProfile.unitName || "",

      unitCode: currentProfile.unitCode || "",

      stepId: "compensation",

      totalHouseholds: total,

      preparedHouseholds: prepared,

      publishedHouseholds: published,

      approvedHouseholds: approved,

      paidHouseholds: paid,

      notAgreedHouseholds: notAgreed,

      // ======================================
      // KINH PHÍ
      //
      // Form nhập TRIỆU ĐỒNG,
      // Firestore lưu ĐỒNG.
      // ======================================

      totalCompensationVnd: millionToVnd(totalAmount),

      approvedCompensationVnd: millionToVnd(approvedAmount),

      paidCompensationVnd: millionToVnd(paidAmount),

      notes: document.getElementById("compNotes").value.trim(),

      updatedBy: currentUser.uid,

      updatedAt: serverTimestamp(),
    };

    if (!oldSnap.exists()) {
      payload.createdBy = currentUser.uid;

      payload.createdAt = serverTimestamp();
    }

    await setDoc(ref, payload, {
      merge: true,
    });

    showToast("Đã lưu số liệu bồi thường thành công.", "success");

    document.getElementById("compUpdatedAt").textContent =
      "Vừa cập nhật lúc " + new Date().toLocaleString("vi-VN");
  } catch (error) {
    console.error("Lỗi lưu số liệu bồi thường:", error);

    showToast("Không thể lưu số liệu bồi thường.", "error");
  } finally {
    button.disabled = false;

    button.textContent = "Lưu số liệu bồi thường";
  }
}
// ======================================================
// TẢI DỮ LIỆU BỒI THƯỜNG
// ======================================================

async function loadCompensationData() {
  try {
    const ref = doc(
      db,
      "progress",
      currentProfile.unitId,
      "steps",
      "compensation",
    );

    const snapshot = await getDoc(ref);

    if (!snapshot.exists()) {
      calculateCompensation();

      return;
    }

    const data = snapshot.data();

    setInput("compTotalHouseholds", data.totalHouseholds);

    setInput("compPreparedHouseholds", data.preparedHouseholds);

    setInput("compPublishedHouseholds", data.publishedHouseholds);

    setInput("compApprovedHouseholds", data.approvedHouseholds);

    setInput("compPaidHouseholds", data.paidHouseholds);

    setInput("compNotAgreedHouseholds", data.notAgreedHouseholds);

    setInput("compTotalAmount", vndToMillion(data.totalCompensationVnd));

    setInput("compApprovedAmount", vndToMillion(data.approvedCompensationVnd));

    setInput("compPaidAmount", vndToMillion(data.paidCompensationVnd));

    document.getElementById("compNotes").value = data.notes || "";

    calculateCompensation();

    if (data.updatedAt && typeof data.updatedAt.toDate === "function") {
      document.getElementById("compUpdatedAt").textContent =
        "Cập nhật lần cuối: " + data.updatedAt.toDate().toLocaleString("vi-VN");
    }
  } catch (error) {
    console.error("Lỗi tải dữ liệu bồi thường:", error);

    showToast("Không thể tải số liệu bồi thường.", "error");
  }
}
// ======================================================
// GẮN SỰ KIỆN FORM KIỂM ĐẾM
// ======================================================

function bindInventoryEvents() {
  const form = document.getElementById("inventoryForm");

  const calculationFields = [
    "inventoryTotalHouseholds",
    "inventoryCompletedHouseholds",

    "inventoryTotalPlots",
    "inventoryCompletedPlots",

    "inventoryTotalArea",
    "inventoryCompletedArea",
  ];

  calculationFields.forEach(function (id) {
    const element = document.getElementById(id);

    if (element) {
      element.addEventListener("input", calculateInventory);
    }
  });

  const areaUnit = document.getElementById("inventoryAreaUnit");

  areaUnit.addEventListener("change", calculateInventory);

  form.addEventListener("submit", saveInventoryData);

  calculateInventory();
}
function calculateInventory() {
  // ==============================================
  // HỘ DÂN
  // ==============================================

  const totalHouseholds = getNumber("inventoryTotalHouseholds");

  const completedHouseholds = getNumber("inventoryCompletedHouseholds");

  const remainingHouseholds = Math.max(
    0,
    totalHouseholds - completedHouseholds,
  );

  setValue("inventoryRemainingHouseholds", formatNumber(remainingHouseholds));

  setValue(
    "inventoryHouseholdPercent",

    formatNumber(calculatePercent(completedHouseholds, totalHouseholds), 1) +
      "%",
  );

  // ==============================================
  // THỬA ĐẤT
  // ==============================================

  const totalPlots = getNumber("inventoryTotalPlots");

  const completedPlots = getNumber("inventoryCompletedPlots");

  setValue(
    "inventoryRemainingPlots",

    formatNumber(Math.max(0, totalPlots - completedPlots)),
  );

  setValue(
    "inventoryPlotPercent",

    formatNumber(calculatePercent(completedPlots, totalPlots), 1) + "%",
  );

  // ==============================================
  // DIỆN TÍCH
  // ==============================================

  const totalArea = getNumber("inventoryTotalArea");

  const completedArea = getNumber("inventoryCompletedArea");

  const unit = document.getElementById("inventoryAreaUnit").value;

  const remainingArea = Math.max(0, totalArea - completedArea);

  setValue(
    "inventoryRemainingArea",

    formatNumber(remainingArea, 2) + " " + (unit === "ha" ? "ha" : "m²"),
  );

  setValue(
    "inventoryAreaPercent",

    formatNumber(calculatePercent(completedArea, totalArea), 1) + "%",
  );
}
// ======================================================
// LƯU KIỂM ĐẾM
// ======================================================

async function saveInventoryData(event) {
  event.preventDefault();

  const saveButton = document.getElementById("inventorySaveButton");

  const areaUnit = document.getElementById("inventoryAreaUnit").value;

  const totalAreaInput = getNumber("inventoryTotalArea");

  const completedAreaInput = getNumber("inventoryCompletedArea");

  const totalHouseholds = getInteger("inventoryTotalHouseholds");

  const notifiedHouseholds = getInteger("inventoryNotifiedHouseholds");

  const completedHouseholds = getInteger("inventoryCompletedHouseholds");

  const totalPlots = getInteger("inventoryTotalPlots");

  const completedPlots = getInteger("inventoryCompletedPlots");
  const cooperativeHouseholds = getInteger("inventoryCooperativeHouseholds");

  const uncooperativeHouseholds = getInteger(
    "inventoryUncooperativeHouseholds",
  );

  // ==============================================
  // KIỂM TRA DỮ LIỆU
  // ==============================================

  if (notifiedHouseholds > totalHouseholds) {
    showToast(
      "Số hộ đã thông báo không được lớn hơn tổng số hộ phải kiểm đếm.",
      "warning",
    );

    return;
  }

  if (completedHouseholds > totalHouseholds) {
    showToast("Số hộ đã kiểm đếm không được lớn hơn tổng số hộ.", "warning");

    return;
  }
  // ==================================================
  // ĐÃ KIỂM ĐẾM KHÔNG THỂ LỚN HƠN ĐÃ THÔNG BÁO
  // ==================================================

  if (completedHouseholds > notifiedHouseholds) {
    showToast(
      "Số hộ đã kiểm đếm không được lớn hơn số hộ đã được thông báo kiểm đếm.",
      "warning",
    );

    return;
  }

  // ==================================================
  // SỐ HỘ PHỐI HỢP KHÔNG ĐƯỢC LỚN HƠN TỔNG SỐ HỘ
  // ==================================================

  if (cooperativeHouseholds > totalHouseholds) {
    showToast(
      "Số hộ phối hợp kiểm đếm không được lớn hơn tổng số hộ.",
      "warning",
    );

    return;
  }

  // ==================================================
  // PHỐI HỢP + CHƯA PHỐI HỢP
  // KHÔNG ĐƯỢC VƯỢT TỔNG SỐ HỘ
  // ==================================================

  if (cooperativeHouseholds + uncooperativeHouseholds > totalHouseholds) {
    showToast(
      "Tổng số hộ phối hợp và chưa phối hợp không được lớn hơn tổng số hộ phải kiểm đếm.",
      "warning",
    );

    return;
  }
  if (completedPlots > totalPlots) {
    showToast(
      "Số thửa đã kiểm đếm không được lớn hơn tổng số thửa.",
      "warning",
    );

    return;
  }

  if (completedAreaInput > totalAreaInput) {
    showToast(
      "Diện tích đã kiểm đếm không được lớn hơn tổng diện tích.",
      "warning",
    );

    return;
  }

  saveButton.disabled = true;

  saveButton.textContent = "Đang lưu...";

  try {
    const inventoryRef = doc(
      db,
      "progress",
      currentProfile.unitId,
      "steps",
      "inventory",
    );

    const oldSnap = await getDoc(inventoryRef);

    const payload = {
      // Đơn vị
      unitId: currentProfile.unitId,

      unitName: currentProfile.unitName || "",

      unitCode: currentProfile.unitCode || "",

      // Bước
      stepId: "inventory",

      // Hộ dân
      totalHouseholds: totalHouseholds,

      notifiedHouseholds: notifiedHouseholds,

      completedHouseholds: completedHouseholds,

      // Thửa đất
      totalPlots: totalPlots,

      completedPlots: completedPlots,

      // Diện tích
      areaInputUnit: areaUnit,

      totalAreaM2: convertAreaToM2(totalAreaInput, areaUnit),

      completedAreaM2: convertAreaToM2(completedAreaInput, areaUnit),

      // Phối hợp
      cooperativeHouseholds: cooperativeHouseholds,

      uncooperativeHouseholds: uncooperativeHouseholds,
      // Ghi chú
      notes: document.getElementById("inventoryNotes").value.trim(),

      // Nhật ký
      updatedBy: currentUser.uid,

      updatedAt: serverTimestamp(),
    };

    if (!oldSnap.exists()) {
      payload.createdBy = currentUser.uid;

      payload.createdAt = serverTimestamp();
    }

    await setDoc(inventoryRef, payload, {
      merge: true,
    });

    showToast("Đã lưu số liệu kiểm đếm thành công.", "success");

    document.getElementById("inventoryUpdatedAt").textContent =
      "Vừa cập nhật lúc " + new Date().toLocaleString("vi-VN");
  } catch (error) {
    console.error("Lỗi lưu số liệu kiểm đếm:", error);

    showToast("Không thể lưu số liệu kiểm đếm.", "error");
  } finally {
    saveButton.disabled = false;

    saveButton.textContent = "Lưu số liệu kiểm đếm";
  }
}
// ======================================================
// BIỂU MẪU HỖ TRỢ
// ======================================================

async function renderSupportForm() {
  workflowStepBody.innerHTML = `

        <form id="supportForm">


            <!-- =========================================
                 1. TIẾN ĐỘ HỖ TRỢ
            ========================================== -->

            <div class="workflow-form-section">

                <div class="workflow-form-title">

                    <h3>
                        1. Tiến độ thực hiện hỗ trợ
                    </h3>

                    <p>
                        Theo dõi các hộ / tổ chức thuộc diện
                        được hưởng chính sách hỗ trợ.
                    </p>

                </div>


                <div class="workflow-form-grid">

                    <div class="form-group">

                        <label for="supportTotalHouseholds">
                            Tổng số hộ / tổ chức thuộc diện hỗ trợ
                        </label>

                        <input
                            type="number"
                            id="supportTotalHouseholds"
                            min="0"
                            step="1"
                            value="0"
                        >

                    </div>


                    <div class="form-group">

                        <label for="supportDeterminedHouseholds">
                            Đã xác định chính sách hỗ trợ
                        </label>

                        <input
                            type="number"
                            id="supportDeterminedHouseholds"
                            min="0"
                            step="1"
                            value="0"
                        >

                    </div>


                    <div class="form-group">

                        <label for="supportApprovedHouseholds">
                            Đã phê duyệt hỗ trợ
                        </label>

                        <input
                            type="number"
                            id="supportApprovedHouseholds"
                            min="0"
                            step="1"
                            value="0"
                        >

                    </div>


                    <div class="form-group">

                        <label for="supportPaidHouseholds">
                            Đã chi trả hỗ trợ
                        </label>

                        <input
                            type="number"
                            id="supportPaidHouseholds"
                            min="0"
                            step="1"
                            value="0"
                        >

                    </div>


                    <div class="form-group">

                        <label>
                            Chưa chi trả
                        </label>

                        <input
                            type="text"
                            id="supportUnpaidHouseholds"
                            value="0"
                            readonly
                        >

                    </div>


                    <div class="form-group">

                        <label>
                            Tỷ lệ đã chi trả
                        </label>

                        <input
                            type="text"
                            id="supportPaymentPercent"
                            value="0%"
                            readonly
                        >

                    </div>

                </div>

            </div>



            <!-- =========================================
                 2. KINH PHÍ
            ========================================== -->

            <div class="workflow-form-section">

                <div class="workflow-form-title">

                    <h3>
                        2. Kinh phí hỗ trợ
                    </h3>

                    <p>
                        Đơn vị nhập: triệu đồng.
                        Hệ thống lưu thống nhất bằng đồng.
                    </p>

                </div>


                <div class="workflow-form-grid">

                    <div class="form-group">

                        <label for="supportTotalAmount">
                            Tổng kinh phí hỗ trợ dự kiến
                        </label>

                        <input
                            type="number"
                            id="supportTotalAmount"
                            min="0"
                            step="0.01"
                            value="0"
                        >

                    </div>


                    <div class="form-group">

                        <label for="supportApprovedAmount">
                            Kinh phí đã phê duyệt
                        </label>

                        <input
                            type="number"
                            id="supportApprovedAmount"
                            min="0"
                            step="0.01"
                            value="0"
                        >

                    </div>


                    <div class="form-group">

                        <label for="supportPaidAmount">
                            Kinh phí đã chi trả
                        </label>

                        <input
                            type="number"
                            id="supportPaidAmount"
                            min="0"
                            step="0.01"
                            value="0"
                        >

                    </div>


                    <div class="form-group">

                        <label>
                            Kinh phí còn lại
                        </label>

                        <input
                            type="text"
                            id="supportRemainingAmount"
                            value="0 triệu đồng"
                            readonly
                        >

                    </div>

                </div>

            </div>



            <!-- =========================================
                 3. VƯỚNG MẮC
            ========================================== -->

            <div class="workflow-form-section">

                <div class="workflow-form-title">

                    <h3>
                        3. Vướng mắc / ghi chú
                    </h3>

                </div>


                <div class="form-group">

                    <textarea
                        id="supportNotes"
                        class="workflow-textarea"
                        rows="4"
                        placeholder="Nhập khó khăn, vướng mắc về chính sách hỗ trợ, chi trả hoặc nội dung cần lưu ý..."
                    ></textarea>

                </div>

            </div>



            <!-- =========================================
                 SAVE
            ========================================== -->

            <div class="workflow-save-area">

                <div>

                    <div
                        id="supportMessage"
                        class="admin-message"
                    ></div>

                    <div
                        id="supportUpdatedAt"
                        class="last-updated"
                    >
                        Chưa có dữ liệu được lưu.
                    </div>

                </div>


                <button
                    type="submit"
                    id="supportSaveButton"
                    class="commune-save-button"
                >
                    Lưu số liệu hỗ trợ
                </button>

            </div>


        </form>

    `;

  bindSupportEvents();

  await loadSupportData();
}
// ======================================================
// SỰ KIỆN FORM HỖ TRỢ
// ======================================================

function bindSupportEvents() {
  const ids = [
    "supportTotalHouseholds",
    "supportDeterminedHouseholds",
    "supportApprovedHouseholds",
    "supportPaidHouseholds",

    "supportTotalAmount",
    "supportApprovedAmount",
    "supportPaidAmount",
  ];

  ids.forEach(function (id) {
    const element = document.getElementById(id);

    if (element) {
      element.addEventListener("input", calculateSupport);
    }
  });

  document
    .getElementById("supportForm")
    .addEventListener("submit", saveSupportData);

  calculateSupport();
}

// ======================================================
// TÍNH TOÁN
// ======================================================

function calculateSupport() {
  const approved = getNumber("supportApprovedHouseholds");

  const paid = getNumber("supportPaidHouseholds");

  // Chưa chi trả
  setValue(
    "supportUnpaidHouseholds",

    formatNumber(Math.max(0, approved - paid)),
  );

  // Tỷ lệ chi trả
  setValue(
    "supportPaymentPercent",

    formatNumber(calculatePercent(paid, approved), 1) + "%",
  );

  // Kinh phí
  const approvedAmount = getNumber("supportApprovedAmount");

  const paidAmount = getNumber("supportPaidAmount");

  setValue(
    "supportRemainingAmount",

    formatNumber(Math.max(0, approvedAmount - paidAmount), 2) + " triệu đồng",
  );
}
// ======================================================
// LƯU DỮ LIỆU HỖ TRỢ
// ======================================================

async function saveSupportData(event) {
  event.preventDefault();

  const total = getInteger("supportTotalHouseholds");

  const determined = getInteger("supportDeterminedHouseholds");

  const approved = getInteger("supportApprovedHouseholds");

  const paid = getInteger("supportPaidHouseholds");

  const totalAmount = getNumber("supportTotalAmount");

  const approvedAmount = getNumber("supportApprovedAmount");

  const paidAmount = getNumber("supportPaidAmount");

  // ==================================================
  // KIỂM TRA LOGIC
  // ==================================================

  if (determined > total) {
    showToast(
      "Số hộ đã xác định chính sách hỗ trợ không được lớn hơn tổng số hộ thuộc diện hỗ trợ.",
      "warning",
    );

    return;
  }

  if (approved > determined) {
    showToast(
      "Số hộ đã phê duyệt hỗ trợ không được lớn hơn số hộ đã xác định chính sách hỗ trợ.",
      "warning",
    );

    return;
  }

  if (paid > approved) {
    showToast(
      "Số hộ đã chi trả hỗ trợ không được lớn hơn số hộ đã được phê duyệt.",
      "warning",
    );

    return;
  }

  if (approvedAmount > totalAmount) {
    showToast(
      "Kinh phí hỗ trợ đã phê duyệt không được lớn hơn tổng kinh phí dự kiến.",
      "warning",
    );

    return;
  }

  if (paidAmount > approvedAmount) {
    showToast(
      "Kinh phí hỗ trợ đã chi trả không được lớn hơn kinh phí đã phê duyệt.",
      "warning",
    );

    return;
  }

  const button = document.getElementById("supportSaveButton");

  button.disabled = true;

  button.textContent = "Đang lưu...";

  try {
    const ref = doc(db, "progress", currentProfile.unitId, "steps", "support");

    const oldSnap = await getDoc(ref);

    const payload = {
      unitId: currentProfile.unitId,

      unitName: currentProfile.unitName || "",

      unitCode: currentProfile.unitCode || "",

      stepId: "support",

      totalHouseholds: total,

      determinedHouseholds: determined,

      approvedHouseholds: approved,

      paidHouseholds: paid,

      totalSupportVnd: millionToVnd(totalAmount),

      approvedSupportVnd: millionToVnd(approvedAmount),

      paidSupportVnd: millionToVnd(paidAmount),

      notes: document.getElementById("supportNotes").value.trim(),

      updatedBy: currentUser.uid,

      updatedAt: serverTimestamp(),
    };

    if (!oldSnap.exists()) {
      payload.createdBy = currentUser.uid;

      payload.createdAt = serverTimestamp();
    }

    await setDoc(ref, payload, {
      merge: true,
    });

    showToast("Đã lưu số liệu hỗ trợ thành công.", "success");

    document.getElementById("supportUpdatedAt").textContent =
      "Vừa cập nhật lúc " + new Date().toLocaleString("vi-VN");
  } catch (error) {
    console.error("Lỗi lưu số liệu hỗ trợ:", error);

    showToast("Không thể lưu số liệu hỗ trợ.", "error");
  } finally {
    button.disabled = false;

    button.textContent = "Lưu số liệu hỗ trợ";
  }
}
// ======================================================
// TẢI DỮ LIỆU HỖ TRỢ
// ======================================================

async function loadSupportData() {
  try {
    const ref = doc(db, "progress", currentProfile.unitId, "steps", "support");

    const snapshot = await getDoc(ref);

    if (!snapshot.exists()) {
      calculateSupport();

      return;
    }

    const data = snapshot.data();

    setInput("supportTotalHouseholds", data.totalHouseholds);

    setInput("supportDeterminedHouseholds", data.determinedHouseholds);

    setInput("supportApprovedHouseholds", data.approvedHouseholds);

    setInput("supportPaidHouseholds", data.paidHouseholds);

    setInput("supportTotalAmount", vndToMillion(data.totalSupportVnd));

    setInput("supportApprovedAmount", vndToMillion(data.approvedSupportVnd));

    setInput("supportPaidAmount", vndToMillion(data.paidSupportVnd));

    document.getElementById("supportNotes").value = data.notes || "";

    calculateSupport();

    if (data.updatedAt && typeof data.updatedAt.toDate === "function") {
      document.getElementById("supportUpdatedAt").textContent =
        "Cập nhật lần cuối: " + data.updatedAt.toDate().toLocaleString("vi-VN");
    }
  } catch (error) {
    console.error("Lỗi tải dữ liệu hỗ trợ:", error);

    showToast("Không thể tải số liệu hỗ trợ.", "error");
  }
}
// ======================================================
// BIỂU MẪU TÁI ĐỊNH CƯ
// ======================================================

async function renderResettlementForm() {
  workflowStepBody.innerHTML = `

        <form id="resettlementForm">


            <!-- =========================================
                 1. HỘ TÁI ĐỊNH CƯ
            ========================================== -->

            <div class="workflow-form-section">

                <div class="workflow-form-title">

                    <h3>
                        1. Tiến độ bố trí tái định cư
                    </h3>

                    <p>
                        Theo dõi các hộ thuộc diện phải bố trí
                        tái định cư và tiến độ thực hiện.
                    </p>

                </div>


                <div class="workflow-form-grid">

                    <div class="form-group">

                        <label for="resTotalHouseholds">
                            Tổng số hộ phải bố trí tái định cư
                        </label>

                        <input
                            type="number"
                            id="resTotalHouseholds"
                            min="0"
                            step="1"
                            value="0"
                        >

                    </div>


                    <div class="form-group">

                        <label for="resEligibleHouseholds">
                            Đã xác định đủ điều kiện TĐC
                        </label>

                        <input
                            type="number"
                            id="resEligibleHouseholds"
                            min="0"
                            step="1"
                            value="0"
                        >

                    </div>


                    <div class="form-group">

                        <label for="resApprovedHouseholds">
                            Đã phê duyệt phương án TĐC
                        </label>

                        <input
                            type="number"
                            id="resApprovedHouseholds"
                            min="0"
                            step="1"
                            value="0"
                        >

                    </div>


                    <div class="form-group">

                        <label for="resAllocatedHouseholds">
                            Đã bố trí lô đất / nhà TĐC
                        </label>

                        <input
                            type="number"
                            id="resAllocatedHouseholds"
                            min="0"
                            step="1"
                            value="0"
                        >

                    </div>


                    <div class="form-group">

                        <label for="resReceivedHouseholds">
                            Đã nhận đất / nhà TĐC
                        </label>

                        <input
                            type="number"
                            id="resReceivedHouseholds"
                            min="0"
                            step="1"
                            value="0"
                        >

                    </div>


                    <div class="form-group">

                        <label>
                            Chưa được bố trí
                        </label>

                        <input
                            type="text"
                            id="resRemainingHouseholds"
                            value="0"
                            readonly
                        >

                    </div>


                    <div class="form-group">

                        <label>
                            Tỷ lệ đã bố trí TĐC
                        </label>

                        <input
                            type="text"
                            id="resAllocationPercent"
                            value="0%"
                            readonly
                        >

                    </div>


                    <div class="form-group">

                        <label>
                            Tỷ lệ đã nhận đất / nhà
                        </label>

                        <input
                            type="text"
                            id="resReceivedPercent"
                            value="0%"
                            readonly
                        >

                    </div>

                </div>

            </div>



            <!-- =========================================
                 2. QUỸ ĐẤT / LÔ TĐC
            ========================================== -->

            <div class="workflow-form-section">

                <div class="workflow-form-title">

                    <h3>
                        2. Quỹ đất / lô tái định cư
                    </h3>

                    <p>
                        Theo dõi nhu cầu và khả năng bố trí
                        lô đất tái định cư.
                    </p>

                </div>


                <div class="workflow-form-grid">

                    <div class="form-group">

                        <label for="resRequiredLots">
                            Tổng số lô TĐC cần bố trí
                        </label>

                        <input
                            type="number"
                            id="resRequiredLots"
                            min="0"
                            step="1"
                            value="0"
                        >

                    </div>


                    <div class="form-group">

                        <label for="resAllocatedLots">
                            Số lô đã bố trí
                        </label>

                        <input
                            type="number"
                            id="resAllocatedLots"
                            min="0"
                            step="1"
                            value="0"
                        >

                    </div>


                    <div class="form-group">

                        <label>
                            Số lô còn phải bố trí
                        </label>

                        <input
                            type="text"
                            id="resRemainingLots"
                            value="0"
                            readonly
                        >

                    </div>


                    <div class="form-group">

                        <label>
                            Tỷ lệ bố trí lô TĐC
                        </label>

                        <input
                            type="text"
                            id="resLotPercent"
                            value="0%"
                            readonly
                        >

                    </div>

                </div>

            </div>



            <!-- =========================================
                 3. VƯỚNG MẮC
            ========================================== -->

            <div class="workflow-form-section">

                <div class="workflow-form-title">

                    <h3>
                        3. Vướng mắc / ghi chú
                    </h3>

                </div>


                <div class="form-group">

                    <textarea
                        id="resNotes"
                        class="workflow-textarea"
                        rows="4"
                        placeholder="Nhập khó khăn về quỹ đất, hạ tầng khu tái định cư, bố trí lô, trường hợp hộ chưa đồng ý hoặc nội dung cần lưu ý..."
                    ></textarea>

                </div>

            </div>



            <!-- =========================================
                 SAVE
            ========================================== -->

            <div class="workflow-save-area">

                <div>

                    <div
                        id="resMessage"
                        class="admin-message"
                    ></div>

                    <div
                        id="resUpdatedAt"
                        class="last-updated"
                    >
                        Chưa có dữ liệu được lưu.
                    </div>

                </div>


                <button
                    type="submit"
                    id="resSaveButton"
                    class="commune-save-button"
                >
                    Lưu số liệu tái định cư
                </button>

            </div>


        </form>

    `;

  bindResettlementEvents();

  await loadResettlementData();
}
// ======================================================
// SỰ KIỆN FORM TÁI ĐỊNH CƯ
// ======================================================

function bindResettlementEvents() {
  const ids = [
    "resTotalHouseholds",
    "resEligibleHouseholds",
    "resApprovedHouseholds",
    "resAllocatedHouseholds",
    "resReceivedHouseholds",

    "resRequiredLots",
    "resAllocatedLots",
  ];

  ids.forEach(function (id) {
    const element = document.getElementById(id);

    if (element) {
      element.addEventListener("input", calculateResettlement);
    }
  });

  document
    .getElementById("resettlementForm")
    .addEventListener("submit", saveResettlementData);

  calculateResettlement();
}

// ======================================================
// TÍNH TOÁN TÁI ĐỊNH CƯ
// ======================================================

function calculateResettlement() {
  const total = getNumber("resTotalHouseholds");

  const allocated = getNumber("resAllocatedHouseholds");

  const received = getNumber("resReceivedHouseholds");

  // Chưa bố trí
  setValue(
    "resRemainingHouseholds",

    formatNumber(Math.max(0, total - allocated)),
  );

  // Tỷ lệ bố trí
  setValue(
    "resAllocationPercent",

    formatNumber(calculatePercent(allocated, total), 1) + "%",
  );

  // Tỷ lệ đã nhận
  setValue(
    "resReceivedPercent",

    formatNumber(calculatePercent(received, total), 1) + "%",
  );

  // ==============================================
  // LÔ TÁI ĐỊNH CƯ
  // ==============================================

  const requiredLots = getNumber("resRequiredLots");

  const allocatedLots = getNumber("resAllocatedLots");

  setValue(
    "resRemainingLots",

    formatNumber(Math.max(0, requiredLots - allocatedLots)),
  );

  setValue(
    "resLotPercent",

    formatNumber(calculatePercent(allocatedLots, requiredLots), 1) + "%",
  );
}
// ======================================================
// LƯU DỮ LIỆU TÁI ĐỊNH CƯ
// ======================================================

async function saveResettlementData(event) {
  event.preventDefault();

  const total = getInteger("resTotalHouseholds");

  const eligible = getInteger("resEligibleHouseholds");

  const approved = getInteger("resApprovedHouseholds");

  const allocated = getInteger("resAllocatedHouseholds");

  const received = getInteger("resReceivedHouseholds");

  const requiredLots = getInteger("resRequiredLots");

  const allocatedLots = getInteger("resAllocatedLots");

  // ==================================================
  // KIỂM TRA LOGIC
  //
  // Tổng
  //   ≥ đủ điều kiện
  //   ≥ phê duyệt
  //   ≥ bố trí
  //   ≥ đã nhận
  // ==================================================

  if (eligible > total) {
    showToast(
      "Số hộ đủ điều kiện tái định cư không được lớn hơn tổng số hộ phải bố trí tái định cư.",
      "warning",
    );

    return;
  }

  if (approved > eligible) {
    showToast(
      "Số hộ đã phê duyệt phương án tái định cư không được lớn hơn số hộ đủ điều kiện.",
      "warning",
    );

    return;
  }

  if (allocated > approved) {
    showToast(
      "Số hộ đã bố trí lô đất / nhà tái định cư không được lớn hơn số hộ đã được phê duyệt.",
      "warning",
    );

    return;
  }

  if (received > allocated) {
    showToast(
      "Số hộ đã nhận đất / nhà tái định cư không được lớn hơn số hộ đã được bố trí.",
      "warning",
    );

    return;
  }

  if (allocatedLots > requiredLots) {
    showToast(
      "Số lô đã bố trí không được lớn hơn tổng số lô tái định cư cần bố trí.",
      "warning",
    );

    return;
  }

  const button = document.getElementById("resSaveButton");

  button.disabled = true;

  button.textContent = "Đang lưu...";

  try {
    const ref = doc(
      db,
      "progress",
      currentProfile.unitId,
      "steps",
      "resettlement",
    );

    const oldSnap = await getDoc(ref);

    const payload = {
      unitId: currentProfile.unitId,

      unitName: currentProfile.unitName || "",

      unitCode: currentProfile.unitCode || "",

      stepId: "resettlement",

      // HỘ DÂN
      totalHouseholds: total,

      eligibleHouseholds: eligible,

      approvedHouseholds: approved,

      allocatedHouseholds: allocated,

      receivedHouseholds: received,

      // LÔ TĐC
      requiredLots: requiredLots,

      allocatedLots: allocatedLots,

      notes: document.getElementById("resNotes").value.trim(),

      updatedBy: currentUser.uid,

      updatedAt: serverTimestamp(),
    };

    if (!oldSnap.exists()) {
      payload.createdBy = currentUser.uid;

      payload.createdAt = serverTimestamp();
    }

    await setDoc(ref, payload, {
      merge: true,
    });

    showToast("Đã lưu số liệu tái định cư thành công.", "success");

    document.getElementById("resUpdatedAt").textContent =
      "Vừa cập nhật lúc " + new Date().toLocaleString("vi-VN");
  } catch (error) {
    console.error("Lỗi lưu số liệu tái định cư:", error);

    showToast("Không thể lưu số liệu tái định cư.", "error");
  } finally {
    button.disabled = false;

    button.textContent = "Lưu số liệu tái định cư";
  }
}
// ======================================================
// TẢI DỮ LIỆU TÁI ĐỊNH CƯ
// ======================================================

async function loadResettlementData() {
  try {
    const ref = doc(
      db,
      "progress",
      currentProfile.unitId,
      "steps",
      "resettlement",
    );

    const snapshot = await getDoc(ref);

    if (!snapshot.exists()) {
      calculateResettlement();

      return;
    }

    const data = snapshot.data();

    setInput("resTotalHouseholds", data.totalHouseholds);

    setInput("resEligibleHouseholds", data.eligibleHouseholds);

    setInput("resApprovedHouseholds", data.approvedHouseholds);

    setInput("resAllocatedHouseholds", data.allocatedHouseholds);

    setInput("resReceivedHouseholds", data.receivedHouseholds);

    setInput("resRequiredLots", data.requiredLots);

    setInput("resAllocatedLots", data.allocatedLots);

    document.getElementById("resNotes").value = data.notes || "";

    calculateResettlement();

    if (data.updatedAt && typeof data.updatedAt.toDate === "function") {
      document.getElementById("resUpdatedAt").textContent =
        "Cập nhật lần cuối: " + data.updatedAt.toDate().toLocaleString("vi-VN");
    }
  } catch (error) {
    console.error("Lỗi tải dữ liệu tái định cư:", error);

    showToast("Không thể tải số liệu tái định cư.", "error");
  }
}
// ======================================================
// BIỂU MẪU GPMB / BÀN GIAO
// ======================================================

async function renderHandoverForm() {
  workflowStepBody.innerHTML = `

        <form id="handoverForm">


            <!-- =========================================
                 1. DIỆN TÍCH
            ========================================== -->

            <div class="workflow-form-section">

                <div class="workflow-form-title workflow-title-row">

                    <div>
                        <h3>
                            1. Diện tích giải phóng mặt bằng
                        </h3>

                        <p>
                            Theo dõi tổng diện tích cần thu hồi
                            và diện tích đã hoàn thành GPMB.
                        </p>
                    </div>


                    <div class="workflow-area-unit">

                        <label for="handoverAreaUnit">
                            Đơn vị
                        </label>

                        <select id="handoverAreaUnit">

                            <option value="m2">
                                m²
                            </option>

                            <option value="ha">
                                ha
                            </option>

                        </select>

                    </div>

                </div>


                <div class="workflow-form-grid">

                    <div class="form-group">

                        <label for="handoverTotalArea">
                            Tổng diện tích cần thu hồi
                        </label>

                        <input
                            type="number"
                            id="handoverTotalArea"
                            min="0"
                            step="0.01"
                            value="0"
                        >

                    </div>


                    <div class="form-group">

                        <label for="handoverRecoveredArea">
                            Diện tích đã thu hồi / GPMB
                        </label>

                        <input
                            type="number"
                            id="handoverRecoveredArea"
                            min="0"
                            step="0.01"
                            value="0"
                        >

                    </div>


                    <div class="form-group">

                        <label>
                            Diện tích còn lại
                        </label>

                        <input
                            type="text"
                            id="handoverRemainingArea"
                            value="0 m²"
                            readonly
                        >

                    </div>


                    <div class="form-group">

                        <label>
                            Tỷ lệ hoàn thành
                        </label>

                        <input
                            type="text"
                            id="handoverAreaPercent"
                            value="0%"
                            readonly
                        >

                    </div>

                </div>

            </div>



            <!-- =========================================
                 2. CHIỀU DÀI TUYẾN
            ========================================== -->

            <div class="workflow-form-section">

                <div class="workflow-form-title">

                    <h3>
                        2. Chiều dài tuyến
                    </h3>

                    <p>
                        Đơn vị tính: km.
                    </p>

                </div>


                <div class="workflow-form-grid">

                    <div class="form-group">

                        <label for="handoverTotalLength">
                            Tổng chiều dài tuyến
                        </label>

                        <input
                            type="number"
                            id="handoverTotalLength"
                            min="0"
                            step="0.001"
                            value="0"
                        >

                    </div>


                    <div class="form-group">

                        <label for="handoverDeliveredLength">
                            Chiều dài đã bàn giao mặt bằng
                        </label>

                        <input
                            type="number"
                            id="handoverDeliveredLength"
                            min="0"
                            step="0.001"
                            value="0"
                        >

                    </div>


                    <div class="form-group">

                        <label>
                            Chiều dài còn vướng
                        </label>

                        <input
                            type="text"
                            id="handoverRemainingLength"
                            value="0 km"
                            readonly
                        >

                    </div>


                    <div class="form-group">

                        <label>
                            Tỷ lệ hoàn thành
                        </label>

                        <input
                            type="text"
                            id="handoverLengthPercent"
                            value="0%"
                            readonly
                        >

                    </div>

                </div>

            </div>



            <!-- =========================================
                 3. HỘ DÂN / TỔ CHỨC
            ========================================== -->

            <div class="workflow-form-section">

                <div class="workflow-form-title">

                    <h3>
                        3. Hộ dân / tổ chức bị ảnh hưởng
                    </h3>

                    <p>
                        Theo dõi kết quả chi trả và bàn giao mặt bằng.
                    </p>

                </div>


                <div class="workflow-form-grid">

                    <div class="form-group">

                        <label for="handoverTotalHouseholds">
                            Tổng số hộ / tổ chức ảnh hưởng
                        </label>

                        <input
                            type="number"
                            id="handoverTotalHouseholds"
                            min="0"
                            step="1"
                            value="0"
                        >

                    </div>


                    <div class="form-group">

                        <label for="handoverPaidHouseholds">
                            Đã nhận tiền
                        </label>
<input
    type="text"
    id="handoverPaidHouseholds"
    value="0"
    readonly
>

                    </div>


                    <div class="form-group">

                        <label for="handoverCompletedHouseholds">
                            Đã bàn giao mặt bằng
                        </label>

                        <input
                            type="number"
                            id="handoverCompletedHouseholds"
                            min="0"
                            step="1"
                            value="0"
                        >

                    </div>


                    <div class="form-group">

                        <label>
                            Chưa bàn giao
                        </label>

                        <input
                            type="text"
                            id="handoverRemainingHouseholds"
                            value="0"
                            readonly
                        >

                    </div>


                    <div class="form-group">

                        <label for="handoverNotAgreedHouseholds">
                            Chưa đồng ý
                        </label>

                <input
    type="text"
    id="handoverNotAgreedHouseholds"
    value="0"
    readonly
>

                    </div>


                    <div class="form-group">

                        <label>
                            Tỷ lệ hộ đã bàn giao
                        </label>

                        <input
                            type="text"
                            id="handoverHouseholdPercent"
                            value="0%"
                            readonly
                        >

                    </div>

                </div>

            </div>



            <!-- =========================================
                 4. ĐIỂM CÒN VƯỚNG
            ========================================== -->

            <div class="workflow-form-section">

                <div class="workflow-form-title">

                    <h3>
                        4. Các vị trí còn vướng
                    </h3>

                </div>


                <div class="workflow-form-grid">

                    <div class="form-group">

                        <label for="handoverObstructionLocations">
                            Số vị trí còn vướng mặt bằng
                        </label>

                        <input
                            type="number"
                            id="handoverObstructionLocations"
                            min="0"
                            step="1"
                            value="0"
                        >

                    </div>

                </div>

            </div>



            <!-- =========================================
                 5. GHI CHÚ
            ========================================== -->

            <div class="workflow-form-section">

                <div class="workflow-form-title">

                    <h3>
                        5. Vướng mắc / ghi chú
                    </h3>

                </div>


                <div class="form-group">

                    <textarea
                        id="handoverNotes"
                        class="workflow-textarea"
                        rows="4"
                        placeholder="Nhập các vị trí còn vướng, nguyên nhân chưa bàn giao hoặc nội dung cần lưu ý..."
                    ></textarea>

                </div>

            </div>



            <!-- =========================================
                 SAVE
            ========================================== -->

            <div class="workflow-save-area">

                <div>

                    <div
                        id="handoverUpdatedAt"
                        class="last-updated"
                    >
                        Chưa có dữ liệu được lưu.
                    </div>

                </div>


                <button
                    type="submit"
                    id="handoverSaveButton"
                    class="commune-save-button"
                >
                    Lưu số liệu GPMB / bàn giao
                </button>

            </div>


        </form>

    `;

  bindHandoverEvents();

  await loadHandoverData();
}
// ======================================================
// SỰ KIỆN FORM GPMB / BÀN GIAO
// ======================================================

function bindHandoverEvents() {
  const ids = [
    "handoverTotalArea",
    "handoverRecoveredArea",

    "handoverTotalLength",
    "handoverDeliveredLength",

    "handoverTotalHouseholds",
    "handoverPaidHouseholds",
    "handoverCompletedHouseholds",
    "handoverNotAgreedHouseholds",
  ];

  ids.forEach(function (id) {
    const element = document.getElementById(id);

    if (element) {
      element.addEventListener("input", calculateHandover);
    }
  });

  document
    .getElementById("handoverAreaUnit")
    .addEventListener("change", calculateHandover);

  document
    .getElementById("handoverForm")
    .addEventListener("submit", saveHandoverData);

  calculateHandover();
}

// ======================================================
// TÍNH TOÁN
// ======================================================

function calculateHandover() {
  // ==================================================
  // DIỆN TÍCH
  // ==================================================

  const totalArea = getNumber("handoverTotalArea");

  const recoveredArea = getNumber("handoverRecoveredArea");

  const areaUnit = document.getElementById("handoverAreaUnit").value;

  const remainingArea = Math.max(0, totalArea - recoveredArea);

  setValue(
    "handoverRemainingArea",

    formatNumber(remainingArea, 2) + " " + (areaUnit === "ha" ? "ha" : "m²"),
  );

  setValue(
    "handoverAreaPercent",

    formatNumber(calculatePercent(recoveredArea, totalArea), 1) + "%",
  );

  // ==================================================
  // CHIỀU DÀI
  // ==================================================

  const totalLength = getNumber("handoverTotalLength");

  const deliveredLength = getNumber("handoverDeliveredLength");

  setValue(
    "handoverRemainingLength",

    formatNumber(Math.max(0, totalLength - deliveredLength), 3) + " km",
  );

  setValue(
    "handoverLengthPercent",

    formatNumber(calculatePercent(deliveredLength, totalLength), 1) + "%",
  );

  // ==================================================
  // HỘ DÂN
  // ==================================================

  const totalHouseholds = getNumber("handoverTotalHouseholds");

  const completedHouseholds = getNumber("handoverCompletedHouseholds");

  setValue(
    "handoverRemainingHouseholds",

    formatNumber(Math.max(0, totalHouseholds - completedHouseholds)),
  );

  setValue(
    "handoverHouseholdPercent",

    formatNumber(calculatePercent(completedHouseholds, totalHouseholds), 1) +
      "%",
  );
}
// ======================================================
// LƯU DỮ LIỆU GPMB / BÀN GIAO
// ======================================================

async function saveHandoverData(event) {
  event.preventDefault();

  const areaUnit = document.getElementById("handoverAreaUnit").value;

  const totalArea = getNumber("handoverTotalArea");

  const recoveredArea = getNumber("handoverRecoveredArea");

  const totalLength = getNumber("handoverTotalLength");

  const deliveredLength = getNumber("handoverDeliveredLength");

  const totalHouseholds = getInteger("handoverTotalHouseholds");

  const paidHouseholds = getInteger("handoverPaidHouseholds");

  const handedOverHouseholds = getInteger("handoverCompletedHouseholds");

  const notAgreedHouseholds = getInteger("handoverNotAgreedHouseholds");

  // ==================================================
  // KIỂM TRA LOGIC
  // ==================================================

  if (recoveredArea > totalArea) {
    showToast(
      "Diện tích đã thu hồi không được lớn hơn tổng diện tích cần thu hồi.",
      "warning",
    );

    return;
  }

  if (deliveredLength > totalLength) {
    showToast(
      "Chiều dài đã bàn giao không được lớn hơn tổng chiều dài tuyến.",
      "warning",
    );

    return;
  }

  if (paidHouseholds > totalHouseholds) {
    showToast(
      "Số hộ đã nhận tiền không được lớn hơn tổng số hộ / tổ chức ảnh hưởng.",
      "warning",
    );

    return;
  }

  if (handedOverHouseholds > paidHouseholds) {
    showToast(
      "Số hộ đã bàn giao mặt bằng không được lớn hơn số hộ đã nhận tiền.",
      "warning",
    );

    return;
  }

  if (notAgreedHouseholds > totalHouseholds) {
    showToast(
      "Số hộ chưa đồng ý không được lớn hơn tổng số hộ / tổ chức ảnh hưởng.",
      "warning",
    );

    return;
  }

  if (paidHouseholds + notAgreedHouseholds > totalHouseholds) {
    showToast(
      "Tổng số hộ đã nhận tiền và chưa đồng ý không được lớn hơn tổng số hộ / tổ chức ảnh hưởng.",
      "warning",
    );

    return;
  }

  const button = document.getElementById("handoverSaveButton");

  button.disabled = true;

  button.textContent = "Đang lưu...";

  try {
    const ref = doc(db, "progress", currentProfile.unitId, "steps", "handover");

    const oldSnap = await getDoc(ref);

    const payload = {
      unitId: currentProfile.unitId,

      unitName: currentProfile.unitName || "",

      unitCode: currentProfile.unitCode || "",

      stepId: "handover",

      // ======================================
      // DIỆN TÍCH
      // LUÔN LƯU FIRESTORE BẰNG m²
      // ======================================

      areaInputUnit: areaUnit,

      totalAreaM2: convertAreaToM2(totalArea, areaUnit),

      recoveredAreaM2: convertAreaToM2(recoveredArea, areaUnit),

      // ======================================
      // CHIỀU DÀI
      // ======================================

      totalLengthKm: totalLength,

      deliveredLengthKm: deliveredLength,

      // ======================================
      // HỘ DÂN / TỔ CHỨC
      // ======================================

      totalHouseholds: totalHouseholds,

      paidHouseholds: paidHouseholds,

      handedOverHouseholds: handedOverHouseholds,

      notAgreedHouseholds: notAgreedHouseholds,

      // VỊ TRÍ CÒN VƯỚNG
      obstructionLocations: getInteger("handoverObstructionLocations"),

      notes: document.getElementById("handoverNotes").value.trim(),

      updatedBy: currentUser.uid,

      updatedAt: serverTimestamp(),
    };

    if (!oldSnap.exists()) {
      payload.createdBy = currentUser.uid;

      payload.createdAt = serverTimestamp();
    }

    await setDoc(ref, payload, {
      merge: true,
    });

    showToast("Đã lưu số liệu GPMB / bàn giao thành công.", "success");

    document.getElementById("handoverUpdatedAt").textContent =
      "Vừa cập nhật lúc " + new Date().toLocaleString("vi-VN");
  } catch (error) {
    console.error("Lỗi lưu số liệu GPMB / bàn giao:", error);

    showToast("Không thể lưu số liệu GPMB / bàn giao.", "error");
  } finally {
    button.disabled = false;

    button.textContent = "Lưu số liệu GPMB / bàn giao";
  }
}
// ======================================================
// TẢI DỮ LIỆU GPMB / BÀN GIAO
// ======================================================

async function loadHandoverData() {
  try {
    const ref = doc(db, "progress", currentProfile.unitId, "steps", "handover");

    const snapshot = await getDoc(ref);

    if (!snapshot.exists()) {
      calculateHandover();

      return;
    }

    const data = snapshot.data();

    const areaUnit = data.areaInputUnit || "m2";

    document.getElementById("handoverAreaUnit").value = areaUnit;

    setInput(
      "handoverTotalArea",

      convertM2ToArea(Number(data.totalAreaM2 || 0), areaUnit),
    );

    setInput(
      "handoverRecoveredArea",

      convertM2ToArea(Number(data.recoveredAreaM2 || 0), areaUnit),
    );

    setInput("handoverTotalLength", data.totalLengthKm);

    setInput("handoverDeliveredLength", data.deliveredLengthKm);

    setInput("handoverTotalHouseholds", data.totalHouseholds);

    setInput("handoverPaidHouseholds", data.paidHouseholds);

    setInput("handoverCompletedHouseholds", data.handedOverHouseholds);

    setInput("handoverNotAgreedHouseholds", data.notAgreedHouseholds);

    setInput("handoverObstructionLocations", data.obstructionLocations);

    document.getElementById("handoverNotes").value = data.notes || "";
    // ======================================================
    // LẤY SỐ HỘ ĐÃ NHẬN TIỀN VÀ CHƯA ĐỒNG Ý
    // TỪ BƯỚC BỒI THƯỜNG
    // ======================================================

    const compensationRef = doc(
      db,
      "progress",
      currentProfile.unitId,
      "steps",
      "compensation",
    );

    const compensationSnap = await getDoc(compensationRef);

    if (compensationSnap.exists()) {
      const compensationData = compensationSnap.data();

      setInput("handoverPaidHouseholds", compensationData.paidHouseholds || 0);

      setInput(
        "handoverNotAgreedHouseholds",
        compensationData.notAgreedHouseholds || 0,
      );
    }

    calculateHandover();

    if (data.updatedAt && typeof data.updatedAt.toDate === "function") {
      document.getElementById("handoverUpdatedAt").textContent =
        "Cập nhật lần cuối: " + data.updatedAt.toDate().toLocaleString("vi-VN");
    }
  } catch (error) {
    console.error("Lỗi tải dữ liệu GPMB / bàn giao:", error);

    showToast("Không thể tải số liệu GPMB / bàn giao.", "error");
  }
}
// ======================================================
// 7. MÔ TẢ TỪNG BƯỚC
// ======================================================

function getStepDescription(stepId) {
  switch (stepId) {
    case "inventory":
      return "Theo dõi tình hình kiểm đếm hộ dân, tổ chức, thửa đất và diện tích bị ảnh hưởng.";

    case "compensation":
      return "Theo dõi việc lập, công khai, phê duyệt phương án và chi trả tiền bồi thường.";

    case "support":
      return "Theo dõi chính sách hỗ trợ, kinh phí hỗ trợ và tình hình chi trả cho các hộ đủ điều kiện.";

    case "resettlement":
      return "Theo dõi các hộ thuộc diện tái định cư, phương án bố trí và tình trạng nhận đất hoặc nhà tái định cư.";

    case "handover":
      return "Theo dõi diện tích, chiều dài tuyến và số hộ đã hoàn tất bàn giao mặt bằng.";

    default:
      return "Nhập và cập nhật số liệu của bước nghiệp vụ này.";
  }
}
async function loadInventoryData() {
  try {
    const inventoryRef = doc(
      db,
      "progress",
      currentProfile.unitId,
      "steps",
      "inventory",
    );

    const snapshot = await getDoc(inventoryRef);

    if (!snapshot.exists()) {
      calculateInventory();

      return;
    }

    const data = snapshot.data();

    setInput("inventoryTotalHouseholds", data.totalHouseholds);

    setInput("inventoryNotifiedHouseholds", data.notifiedHouseholds);

    setInput("inventoryCompletedHouseholds", data.completedHouseholds);

    setInput("inventoryTotalPlots", data.totalPlots);

    setInput("inventoryCompletedPlots", data.completedPlots);

    setInput("inventoryCooperativeHouseholds", data.cooperativeHouseholds);

    setInput("inventoryUncooperativeHouseholds", data.uncooperativeHouseholds);

    document.getElementById("inventoryNotes").value = data.notes || "";

    // ==============================================
    // DIỆN TÍCH
    // ==============================================

    const unit = data.areaInputUnit || "m2";

    document.getElementById("inventoryAreaUnit").value = unit;

    setInput(
      "inventoryTotalArea",

      convertM2ToArea(Number(data.totalAreaM2 || 0), unit),
    );

    setInput(
      "inventoryCompletedArea",

      convertM2ToArea(Number(data.completedAreaM2 || 0), unit),
    );

    calculateInventory();

    if (data.updatedAt && typeof data.updatedAt.toDate === "function") {
      document.getElementById("inventoryUpdatedAt").textContent =
        "Cập nhật lần cuối: " + data.updatedAt.toDate().toLocaleString("vi-VN");
    }
  } catch (error) {
    console.error("Lỗi tải dữ liệu kiểm đếm:", error);

    showToast("Không thể tải số liệu kiểm đếm.", "error");
  }
}
// ======================================================
// 8. ĐĂNG XUẤT
// ======================================================

workflowLogoutButton.addEventListener(
  "click",

  async function () {
    const confirmed = await showConfirm({
      title: "Đăng xuất hệ thống",

      message: "Bạn có chắc chắn muốn kết thúc phiên làm việc hiện tại?",

      confirmText: "Đăng xuất",

      cancelText: "Ở lại",

      type: "warning",
    });

    if (!confirmed) {
      return;
    }

    try {
      await signOut(auth);

      window.location.href = "index.html";
    } catch (error) {
      console.error("Lỗi đăng xuất:", error);

      showToast("Không thể đăng xuất.", "error");
    }
  },
);

// ======================================================
// 9. AN TOÀN HTML
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
function getNumber(id) {
  const element = document.getElementById(id);

  const value = Number(element?.value || 0);

  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function getInteger(id) {
  return Math.floor(getNumber(id));
}

function setInput(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.value = value ?? 0;
  }
}

function setValue(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.value = value;
  }
}

function calculatePercent(value, total) {
  if (total <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, (value / total) * 100));
}

function formatNumber(value, digits = 0) {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: digits,
  }).format(Number(value) || 0);
}

function convertAreaToM2(value, unit) {
  return unit === "ha" ? value * 10000 : value;
}

function convertM2ToArea(value, unit) {
  return unit === "ha" ? value / 10000 : value;
}
// ======================================================
// TRIỆU ĐỒNG ↔ ĐỒNG
// ======================================================

function millionToVnd(value) {
  return Math.round((Number(value) || 0) * 1000000);
}

function vndToMillion(value) {
  return (Number(value) || 0) / 1000000;
}
