// ======================================================
// APP-WORKFLOW.JS
//
// DASHBOARD QUY TRÌNH GPMB
//
// Dữ liệu:
// progress/{unitId}/steps/{stepId}
//
// 05 bước:
// - inventory
// - compensation
// - support
// - resettlement
// - handover
// ======================================================

import { auth, db } from "./firebase-config.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

import {
  doc,
  getDoc,
  collection,
  collectionGroup,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// ======================================================
// 1. BIẾN DÙNG CHUNG
// ======================================================

let workflowSteps = [];

let unitsData = new Map();

let latestUpdatedTime = null;
let currentDashboardUser = null;
// ======================================================
// 2. HTML
// ======================================================

const workflowCards = document.getElementById("workflowCards");

const unitProgressBody = document.getElementById("unitProgressBody");

const unitCountText = document.getElementById("unitCountText");

const dashboardUpdatedAt = document.getElementById("dashboardUpdatedAt");

const dashboardAlerts = document.getElementById("dashboardAlerts");

const unitRanking = document.getElementById("unitRanking");

// ======================================================
// 3. THEO DÕI ĐĂNG NHẬP
// ======================================================

onAuthStateChanged(
  auth,

  async function (user) {
    // ==================================================
    // CHƯA ĐĂNG NHẬP
    // ==================================================

    if (!user) {
      console.log("Dashboard Workflow: chưa đăng nhập.");

      resetDashboard();
      currentDashboardUser = null;
      if (dashboardUpdatedAt) {
        dashboardUpdatedAt.textContent = "Đăng nhập để xem dữ liệu";
      }

      return;
    }

    // ==================================================
    // ĐÃ ĐĂNG NHẬP
    // ==================================================

    console.log("Dashboard Workflow: đang tải dữ liệu...");
    currentDashboardUser = user;
    await loadDashboard();
  },
);

// ======================================================
// 4. TẢI TOÀN BỘ DASHBOARD
// ======================================================

async function loadDashboard() {
  try {
    if (dashboardUpdatedAt) {
      dashboardUpdatedAt.textContent = "Đang tải dữ liệu...";
    }

    // ==============================================
    // A. DANH MỤC 5 BƯỚC
    // ==============================================

    await loadWorkflowSteps();

    // ==============================================
    // B. DỮ LIỆU CÁC ĐƠN VỊ
    // ==============================================

    await loadProgressSteps();
    await refreshUnitIdentityFromMaster();

    // ==============================================
    // C. HIỂN THỊ
    // ==============================================

    renderMainDashboard();

    renderWorkflowCards();

    renderDashboardAlerts();

    renderUnitRanking();

    renderUnitTable();

    renderUpdatedTime();

    console.log("Dashboard Workflow: tải hoàn chỉnh.");

    console.log("Dữ liệu đơn vị:", unitsData);
  } catch (error) {
    console.error("Lỗi tải Dashboard Workflow:", error);

    resetDashboard();

    if (dashboardUpdatedAt) {
      dashboardUpdatedAt.textContent = "Không thể tải dữ liệu";
    }
  }
}

// ======================================================
// 5. TẢI DANH MỤC WORKFLOW
// ======================================================

async function loadWorkflowSteps() {
  const snapshot = await getDocs(collection(db, "workflowSteps"));

  workflowSteps = [];

  snapshot.forEach(function (documentSnapshot) {
    const data = documentSnapshot.data();

    // Bỏ bước ngừng sử dụng
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

  workflowSteps.sort(function (a, b) {
    return a.order - b.order;
  });

  console.log("Danh mục workflow:", workflowSteps);
}

// ======================================================
// 6. TẢI TẤT CẢ DỮ LIỆU STEPS
//
// progress/{unitId}/steps/{stepId}
// ======================================================

async function loadProgressSteps() {
  unitsData = new Map();

  latestUpdatedTime = null;

  const snapshot = await getDocs(collectionGroup(db, "steps"));

  console.log("Số document steps:", snapshot.size);

  const allowedStepIds = new Set(
    workflowSteps.map(function (step) {
      return step.id;
    }),
  );

  snapshot.forEach(function (documentSnapshot) {
    // ==============================================
    // CHỈ LẤY progress/.../steps/...
    // ==============================================

    const documentPath = documentSnapshot.ref.path;

    if (!documentPath.startsWith("progress/")) {
      return;
    }

    const data = documentSnapshot.data();

    const stepId = data.stepId || documentSnapshot.id;

    // ==============================================
    // BỎ BƯỚC KHÔNG CÒN HOẠT ĐỘNG
    // ==============================================

    if (!allowedStepIds.has(stepId)) {
      return;
    }

    // ==============================================
    // UNIT ID
    // ==============================================

    const pathParts = documentPath.split("/");

    const unitId = data.unitId || pathParts[1];

    if (!unitId) {
      return;
    }

    // ==============================================
    // CHUẨN BỊ OBJECT ĐƠN VỊ
    // ==============================================

    if (!unitsData.has(unitId)) {
      unitsData.set(unitId, createEmptyUnit(unitId));
    }

    const unit = unitsData.get(unitId);

    // ==============================================
    // TÊN / MÃ ĐƠN VỊ
    // ==============================================

    if (data.unitName) {
      unit.name = data.unitName;
    }

    if (data.unitCode) {
      unit.code = data.unitCode;
    }

    // ==============================================
    // LƯU DỮ LIỆU BƯỚC
    // ==============================================

    unit.steps[stepId] = data;

    unit.hasSteps.add(stepId);

    // ==============================================
    // THỜI GIAN CẬP NHẬT MỚI NHẤT
    // ==============================================

    updateLatestTimestamp(data.updatedAt);
  });
}
// ======================================================
// LẤY TÊN / MÃ ĐƠN VỊ TỪ COLLECTION units
//
// units/{unitId} là nguồn chính thức về:
// - tên đơn vị
// - mã đơn vị
//
// progress/.../steps chỉ chứa số liệu nghiệp vụ.
// ======================================================

async function refreshUnitIdentityFromMaster() {
  if (!currentDashboardUser) {
    return;
  }

  try {
    // ==============================================
    // ĐỌC HỒ SƠ NGƯỜI ĐANG ĐĂNG NHẬP
    // ==============================================

    const profileSnap = await getDoc(
      doc(db, "users", currentDashboardUser.uid),
    );

    if (!profileSnap.exists()) {
      return;
    }

    const profile = profileSnap.data();

    // ==============================================
    // ADMIN
    //
    // Admin có quyền đọc toàn bộ units,
    // nên cập nhật tên/mã của tất cả đơn vị.
    // ==============================================

    if (profile.role === "admin") {
      const unitsSnapshot = await getDocs(collection(db, "units"));

      unitsSnapshot.forEach(function (unitSnapshot) {
        applyUnitMasterData(unitSnapshot.id, unitSnapshot.data());
      });

      return;
    }

    // ==============================================
    // TÀI KHOẢN XÃ / PHƯỜNG
    //
    // Đọc đúng document đơn vị của tài khoản.
    // ==============================================

    if (!profile.unitId) {
      return;
    }

    const unitSnap = await getDoc(doc(db, "units", profile.unitId));

    if (!unitSnap.exists()) {
      return;
    }

    applyUnitMasterData(unitSnap.id, unitSnap.data());
  } catch (error) {
    console.warn("Không thể đồng bộ tên đơn vị từ units:", error);
  }
}

// ======================================================
// ÁP DỤNG TÊN / MÃ ĐƠN VỊ CHÍNH THỨC
// ======================================================

function applyUnitMasterData(unitId, masterData) {
  const unit = unitsData.get(unitId);

  // Đơn vị chưa có số liệu thì hiện tại
  // chưa cần đưa vào bảng tiến độ.
  if (!unit) {
    return;
  }

  if (masterData.name) {
    unit.name = masterData.name;
  }

  if (masterData.code) {
    unit.code = masterData.code;
  }

  // Chuẩn bị sẵn cho bước tiếp theo:
  // kiểm soát đơn vị hoạt động / thử nghiệm.

  unit.active = masterData.active !== false;

  unit.isTest = masterData.isTest === true;
}
// ======================================================
// 7. OBJECT RỖNG CHO MỘT ĐƠN VỊ
// ======================================================

function createEmptyUnit(unitId) {
  return {
    id: unitId,

    name: "Đơn vị",

    code: "",

    active: true,

    isTest: false,

    steps: {
      inventory: null,

      compensation: null,

      support: null,

      resettlement: null,

      handover: null,
    },

    hasSteps: new Set(),
  };
}

// ======================================================
// 8. DASHBOARD KPI CHÍNH
// ======================================================

function renderMainDashboard() {
  let totalAreaM2 = 0;

  let recoveredAreaM2 = 0;

  let totalLengthKm = 0;

  let deliveredLengthKm = 0;

  let totalHouseholds = 0;

  let approvedHouseholds = 0;

  let paidHouseholds = 0;

  let handedOverHouseholds = 0;

  let notAgreedHouseholds = 0;

  unitsData.forEach(function (unit) {
    const compensation = unit.steps.compensation;

    const handover = unit.steps.handover;

    // ==============================================
    // DIỆN TÍCH + CHIỀU DÀI
    //
    // CHỈ LẤY TỪ BƯỚC BÀN GIAO
    // ==============================================

    if (handover) {
      totalAreaM2 += numberValue(handover.totalAreaM2);

      recoveredAreaM2 += numberValue(handover.recoveredAreaM2);

      totalLengthKm += numberValue(handover.totalLengthKm);

      deliveredLengthKm += numberValue(handover.deliveredLengthKm);

      totalHouseholds += integerValue(handover.totalHouseholds);

      handedOverHouseholds += integerValue(handover.handedOverHouseholds);
    }

    // ==============================================
    // PHÊ DUYỆT + NHẬN TIỀN + CHƯA ĐỒNG Ý
    //
    // NGUỒN DUY NHẤT: BỒI THƯỜNG
    // ==============================================

    if (compensation) {
      approvedHouseholds += integerValue(compensation.approvedHouseholds);

      paidHouseholds += integerValue(compensation.paidHouseholds);

      notAgreedHouseholds += integerValue(compensation.notAgreedHouseholds);
    }
  });

  // ==================================================
  // DIỆN TÍCH
  // ==================================================

  const totalAreaHa = m2ToHa(totalAreaM2);

  const recoveredAreaHa = m2ToHa(recoveredAreaM2);

  const remainingAreaHa = Math.max(0, totalAreaHa - recoveredAreaHa);

  const areaPercent = calculatePercent(recoveredAreaM2, totalAreaM2);

  setText("totalArea", formatNumber(totalAreaHa, 2));

  setText("recoveredArea", formatNumber(recoveredAreaHa, 2));

  setText("remainingArea", formatNumber(remainingAreaHa, 2));

  setText("areaPercent", formatNumber(areaPercent, 1));

  setText("areaProgressText", formatNumber(areaPercent, 1) + "%");

  setProgressWidth("areaProgressBar", areaPercent);

  // ==================================================
  // CHIỀU DÀI
  // ==================================================

  const remainingLength = Math.max(0, totalLengthKm - deliveredLengthKm);

  const lengthPercent = calculatePercent(deliveredLengthKm, totalLengthKm);

  setText("totalLength", formatNumber(totalLengthKm, 3));

  setText("deliveredLength", formatNumber(deliveredLengthKm, 3));

  setText("remainingLength", formatNumber(remainingLength, 3));

  setText("lengthPercent", formatNumber(lengthPercent, 1));

  setText("lengthProgressText", formatNumber(lengthPercent, 1) + "%");

  setProgressWidth("lengthProgressBar", lengthPercent);

  // ==================================================
  // HỘ DÂN
  // ==================================================

  setText("totalHouseholds", formatNumber(totalHouseholds, 0));

  setText("approvedHouseholds", formatNumber(approvedHouseholds, 0));

  setText("paidHouseholds", formatNumber(paidHouseholds, 0));

  setText("handedOverHouseholds", formatNumber(handedOverHouseholds, 0));

  setText("notAgreedHouseholds", formatNumber(notAgreedHouseholds, 0));
}

// ======================================================
// 9. 5 CARD TIẾN ĐỘ QUY TRÌNH
// ======================================================

function renderWorkflowCards() {
  if (!workflowCards) {
    return;
  }

  if (workflowSteps.length === 0) {
    workflowCards.innerHTML = `
      <div class="phase-note workflow-process-empty">
        Chưa có danh mục quy trình.
      </div>
    `;

    return;
  }

  workflowCards.innerHTML = workflowSteps
    .map(function (step, index) {
      const summary = calculateStepSummary(step.id);
      const visual = getWorkflowStepVisual(step.id);
      const hasData = summary.recordCount > 0;
      const rate = hasData ? Math.min(100, Math.max(0, summary.rate)) : 0;
      const rateText = hasData ? formatNumber(rate, 1) + "%" : "—";
      const countText = hasData
        ? summary.recordCount + " đơn vị đã có số liệu"
        : "Chưa có đơn vị nhập số liệu";

      return `
        <article
          class="workflow-process-card ${visual.className}"
          data-workflow-step="${escapeHtmlText(step.id)}"
        >
          <div class="workflow-process-topline">
            <div class="workflow-process-identity">
              <span class="workflow-process-number">${index + 1}</span>

              <span class="workflow-process-icon" aria-hidden="true">
                ${visual.icon}
              </span>

              <div class="workflow-process-name">
                <span>Bước ${index + 1}</span>
                <h3>${escapeHtmlText(step.name)}</h3>
              </div>
            </div>

            <span class="workflow-process-status ${hasData ? "has-data" : "no-data"}">
              ${hasData ? "Đang theo dõi" : "Chưa có dữ liệu"}
            </span>
          </div>

          <div class="workflow-process-main">
            <div
              class="workflow-process-ring"
              style="--workflow-rate:${rate};"
              role="img"
              aria-label="Tỷ lệ hoàn thành ${rateText}"
            >
              <div class="workflow-process-ring-inner">
                <strong>${rateText}</strong>
                <span>hoàn thành</span>
              </div>
            </div>

            <div class="workflow-process-copy">
              <p>${escapeHtmlText(summary.description)}</p>

              <div class="workflow-process-mini-progress" aria-hidden="true">
                <span style="width:${rate}%;"></span>
              </div>

              <div class="workflow-process-meta">
                <span class="workflow-process-dot"></span>
                <span>${escapeHtmlText(countText)}</span>
              </div>
            </div>
          </div>

          ${
            index < workflowSteps.length - 1
              ? `<span class="workflow-process-connector" aria-hidden="true">→</span>`
              : ""
          }
        </article>
      `;
    })
    .join("");
}

// ======================================================
// GIAO DIỆN RIÊNG CHO 05 BƯỚC NGHIỆP VỤ
//
// Chỉ phục vụ hiển thị. Không thay đổi dữ liệu,
// công thức tính hoặc cấu trúc Firestore.
// ======================================================

function getWorkflowStepVisual(stepId) {
  const visuals = {
    inventory: {
      className: "step-inventory",
      icon: `
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M9 3h6l1 2h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3l1-2Zm1.2 2-.5 1h4.6l-.5-1h-3.6ZM7 10h10v2H7v-2Zm0 4h7v2H7v-2Z" />
        </svg>
      `,
    },
    compensation: {
      className: "step-compensation",
      icon: `
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M6 2h9l4 4v16H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm8 2v4h4M8 12h8v2H8v-2Zm0 4h5v2H8v-2Zm10.7-4.7 1.4 1.4-5.8 5.8-2.8-2.8 1.4-1.4 1.4 1.4 4.4-4.4Z" />
        </svg>
      `,
    },
    support: {
      className: "step-support",
      icon: `
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M12 21s-7-4.4-9.3-8.4C.9 9.5 2.4 5.5 6 5.1c2-.2 3.6.8 4.5 2.1.9-1.3 2.5-2.3 4.5-2.1 3.6.4 5.1 4.4 3.3 7.5C16 16.6 12 21 12 21Zm-1-9H8v2h3v3h2v-3h3v-2h-3V9h-2v3Z" />
        </svg>
      `,
    },
    resettlement: {
      className: "step-resettlement",
      icon: `
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="m12 3 9 7-1.2 1.6L18 10.2V21h-5v-6h-2v6H6V10.2l-1.8 1.4L3 10l9-7Zm0 2.5L8 8.6V19h1v-6h6v6h1V8.6l-4-3.1Z" />
        </svg>
      `,
    },
    handover: {
      className: "step-handover",
      icon: `
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M7.2 7.3 10 10.1 8.6 11.5 5.8 8.7 3 11.5l4.9 4.9a3 3 0 0 0 4.2 0l1-1 1 1a3 3 0 0 0 4.2 0L21 13.7l-1.4-1.4-2.7 2.7a1 1 0 0 1-1.4 0l-2.4-2.4 3.5-3.5a2.5 2.5 0 0 0-3.5 0l-.6.6-2.8-2.8a3.5 3.5 0 0 0-5 0L3.6 8l1.4 1.4 1.1-1.1a1.5 1.5 0 0 1 2.1 0Zm4.2 4.2 3.1 3.1-1 1-3.1-3.1 1-1Z" />
        </svg>
      `,
    },
  };

  return (
    visuals[stepId] || {
      className: "step-default",
      icon: `
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1 14-4-4 1.4-1.4 2.6 2.6 4.6-4.6L17 10l-6 6Z" />
        </svg>
      `,
    }
  );
}

// ======================================================
// 10. TÍNH TỔNG HỢP CHO 1 BƯỚC
// ======================================================

function calculateStepSummary(stepId) {
  let numerator = 0;

  let denominator = 0;

  let recordCount = 0;

  unitsData.forEach(function (unit) {
    const data = unit.steps[stepId];

    if (!data) {
      return;
    }

    recordCount++;

    const values = getStepRateValues(stepId, data);

    numerator += values.numerator;

    denominator += values.denominator;
  });

  return {
    rate: calculatePercent(numerator, denominator),

    numerator: numerator,

    denominator: denominator,

    recordCount: recordCount,

    description: getStepSummaryText(stepId, numerator, denominator),
  };
}

// ======================================================
// 11. TỬ SỐ / MẪU SỐ CỦA TỪNG BƯỚC
// ======================================================

function getStepRateValues(stepId, data) {
  switch (stepId) {
    // ==============================================
    // KIỂM ĐẾM
    // Đã kiểm đếm / phải kiểm đếm
    // ==============================================

    case "inventory":
      return {
        numerator: integerValue(data.completedHouseholds),

        denominator: integerValue(data.totalHouseholds),
      };

    // ==============================================
    // BỒI THƯỜNG
    // Đã phê duyệt / phải lập phương án
    // ==============================================

    case "compensation":
      return {
        numerator: integerValue(data.approvedHouseholds),

        denominator: integerValue(data.totalHouseholds),
      };

    // ==============================================
    // HỖ TRỢ
    // Đã chi trả / đã phê duyệt
    // ==============================================

    case "support":
      return {
        numerator: integerValue(data.paidHouseholds),

        denominator: integerValue(data.approvedHouseholds),
      };

    // ==============================================
    // TÁI ĐỊNH CƯ
    // Đã bố trí / tổng phải bố trí
    // ==============================================

    case "resettlement":
      return {
        numerator: integerValue(data.allocatedHouseholds),

        denominator: integerValue(data.totalHouseholds),
      };

    // ==============================================
    // BÀN GIAO
    // Đã bàn giao / tổng hộ ảnh hưởng
    // ==============================================

    case "handover":
      return {
        numerator: integerValue(data.handedOverHouseholds),

        denominator: integerValue(data.totalHouseholds),
      };

    default:
      return {
        numerator: 0,

        denominator: 0,
      };
  }
}

// ======================================================
// 12. MÔ TẢ CARD BƯỚC
// ======================================================

function getStepSummaryText(stepId, numerator, denominator) {
  if (denominator <= 0) {
    return "Chưa có dữ liệu tổng hợp";
  }

  const completed = formatNumber(numerator, 0);

  const total = formatNumber(denominator, 0);

  switch (stepId) {
    case "inventory":
      return "Đã kiểm đếm " + completed + " / " + total + " hộ";

    case "compensation":
      return "Đã phê duyệt " + completed + " / " + total + " hộ";

    case "support":
      return "Đã chi trả " + completed + " / " + total + " hộ đã phê duyệt";

    case "resettlement":
      return "Đã bố trí " + completed + " / " + total + " hộ";

    case "handover":
      return "Đã bàn giao " + completed + " / " + total + " hộ";

    default:
      return "";
  }
}

// ======================================================
// 13. ĐIỂM NGHẼN / CẢNH BÁO
//
// Chỉ đọc và tổng hợp từ dữ liệu hiện có:
// - inventory.uncooperativeHouseholds
// - compensation.notAgreedHouseholds
// - handover.obstructionLocations
// - notes của từng bước
// - tỷ lệ từng bước dưới 50%
//
// Không ghi thêm dữ liệu và không thay đổi công thức nghiệp vụ.
// ======================================================

function renderDashboardAlerts() {
  if (!dashboardAlerts) {
    return;
  }

  let uncooperativeHouseholds = 0;
  let notAgreedHouseholds = 0;
  let obstructionLocations = 0;
  let noteCount = 0;

  const lowProgressUnits = new Set();

  unitsData.forEach(function (unit) {
    const inventory = unit.steps.inventory;
    const compensation = unit.steps.compensation;
    const handover = unit.steps.handover;

    if (inventory) {
      uncooperativeHouseholds += integerValue(
        inventory.uncooperativeHouseholds,
      );
    }

    if (compensation) {
      // Dùng cùng nguồn với KPI "Chưa đồng ý" trên trang chủ.
      notAgreedHouseholds += integerValue(
        compensation.notAgreedHouseholds,
      );
    }

    if (handover) {
      obstructionLocations += integerValue(handover.obstructionLocations);
    }

    workflowSteps.forEach(function (step) {
      const data = unit.steps[step.id];

      if (!data) {
        return;
      }

      const note = String(data.notes || "").trim();

      if (note) {
        noteCount++;
      }

      const values = getStepRateValues(step.id, data);

      if (values.denominator <= 0) {
        return;
      }

      const rate = calculatePercent(values.numerator, values.denominator);

      if (rate < 50) {
        lowProgressUnits.add(unit.id);
      }
    });
  });

  const items = [];

  if (notAgreedHouseholds > 0) {
    items.push({
      type: "danger",
      value: formatNumber(notAgreedHouseholds, 0),
      title: "hộ / tổ chức chưa đồng ý",
      description: "Theo số liệu đang cập nhật tại bước Bồi thường.",
    });
  }

  if (obstructionLocations > 0) {
    items.push({
      type: "warning",
      value: formatNumber(obstructionLocations, 0),
      title: "vị trí còn vướng",
      description: "Theo số liệu bước GPMB / Bàn giao.",
    });
  }

  if (uncooperativeHouseholds > 0) {
    items.push({
      type: "warning",
      value: formatNumber(uncooperativeHouseholds, 0),
      title: "hộ chưa phối hợp kiểm đếm",
      description: "Cần tiếp tục theo dõi tại bước Kiểm đếm.",
    });
  }

  if (lowProgressUnits.size > 0) {
    items.push({
      type: "info",
      value: formatNumber(lowProgressUnits.size, 0),
      title: "đơn vị có bước đạt dưới 50%",
      description: "Tính trên các bước có số liệu và có mẫu số lớn hơn 0.",
    });
  }

  if (noteCount > 0) {
    items.push({
      type: "note",
      value: formatNumber(noteCount, 0),
      title: "ghi chú / vướng mắc có nội dung",
      description: "Tổng số ghi chú đang có trong 05 bước nghiệp vụ.",
    });
  }

  if (items.length === 0) {
    dashboardAlerts.innerHTML = `
      <div class="home-alert-clear">
        <span class="home-alert-clear-icon" aria-hidden="true">✓</span>
        <div>
          <strong>Chưa ghi nhận cảnh báo từ các chỉ tiêu hiện có</strong>
          <p>Các số liệu cảnh báo sẽ tự động xuất hiện khi đơn vị cập nhật.</p>
        </div>
      </div>
    `;

    return;
  }

  dashboardAlerts.innerHTML = items
    .slice(0, 5)
    .map(function (item) {
      return `
        <div class="home-alert-item alert-${item.type}">
          <span class="home-alert-icon" aria-hidden="true">
            ${getDashboardAlertIcon(item.type)}
          </span>

          <div class="home-alert-copy">
            <div class="home-alert-heading">
              <strong>${escapeHtmlText(item.value)}</strong>
              <span>${escapeHtmlText(item.title)}</span>
            </div>
            <p>${escapeHtmlText(item.description)}</p>
          </div>
        </div>
      `;
    })
    .join("");
}

function getDashboardAlertIcon(type) {
  if (type === "danger") {
    return `
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M12 3 1.8 20.5h20.4L12 3Zm0 5.3c.7 0 1.2.5 1.2 1.2v4.3a1.2 1.2 0 1 1-2.4 0V9.5c0-.7.5-1.2 1.2-1.2Zm0 9.2a1.35 1.35 0 1 1 0-2.7 1.35 1.35 0 0 1 0 2.7Z"/>
      </svg>
    `;
  }

  if (type === "warning") {
    return `
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M12 2 22 20H2L12 2Zm0 5.2-5.7 10h11.4L12 7.2Zm-1 3.1h2v4.1h-2v-4.1Zm0 5.5h2v2h-2v-2Z"/>
      </svg>
    `;
  }

  if (type === "note") {
    return `
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M5 3h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-7l-5 4v-4H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2 5v2h10V8H7Zm0 4v2h7v-2H7Z"/>
      </svg>
    `;
  }

  return `
    <svg viewBox="0 0 24 24" focusable="false">
      <path d="M11 17h2v-6h-2v6Zm0-8h2V7h-2v2Zm1-7a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z"/>
    </svg>
  `;
}

// ======================================================
// 14. XẾP HẠNG TIẾN ĐỘ BÀN GIAO
//
// Không tạo "điểm tiến độ tổng hợp" mới.
// Xếp hạng chỉ dựa trên một chỉ tiêu đã có:
// handedOverHouseholds / totalHouseholds của bước handover.
// ======================================================

function renderUnitRanking() {
  if (!unitRanking) {
    return;
  }

  const ranking = [];

  unitsData.forEach(function (unit) {
    const handover = unit.steps.handover;

    if (!handover) {
      return;
    }

    const values = getStepRateValues("handover", handover);

    if (values.denominator <= 0) {
      return;
    }

    ranking.push({
      unit: unit,
      completed: values.numerator,
      total: values.denominator,
      rate: calculatePercent(values.numerator, values.denominator),
    });
  });

  ranking.sort(function (a, b) {
    if (b.rate !== a.rate) {
      return b.rate - a.rate;
    }

    return String(a.unit.name || "").localeCompare(
      String(b.unit.name || ""),
      "vi",
      { sensitivity: "base" },
    );
  });

  if (ranking.length === 0) {
    unitRanking.innerHTML = `
      <div class="home-insight-empty">
        Chưa có số liệu bàn giao để xếp hạng.
      </div>
    `;

    return;
  }

  unitRanking.innerHTML = ranking
    .slice(0, 5)
    .map(function (item, index) {
      const position = index + 1;
      const rankClass = position <= 3 ? "rank-" + position : "rank-other";

      return `
        <div class="home-ranking-item ${rankClass}">
          <span class="home-rank-number">${position}</span>

          <div class="home-rank-main">
            <div class="home-rank-row">
              <div class="home-rank-name">
                <strong>${escapeHtmlText(item.unit.name)}</strong>
                <span>${escapeHtmlText(item.unit.code || "")}</span>
              </div>

              <strong class="home-rank-rate">
                ${formatNumber(item.rate, 1)}%
              </strong>
            </div>

            <div class="home-rank-progress" aria-hidden="true">
              <span style="width:${Math.min(100, Math.max(0, item.rate))}%;"></span>
            </div>

            <div class="home-rank-meta">
              Đã bàn giao ${formatNumber(item.completed, 0)} /
              ${formatNumber(item.total, 0)} hộ / tổ chức
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

// ======================================================
// 15. BẢNG TIẾN ĐỘ TỪNG ĐƠN VỊ
// ======================================================

function renderUnitTable() {
  if (!unitProgressBody) {
    return;
  }

  const units = Array.from(unitsData.values());

  // ==============================================
  // SẮP XẾP THEO TÊN TIẾNG VIỆT
  // ==============================================

  units.sort(function (a, b) {
    return String(a.name || "").localeCompare(String(b.name || ""), "vi", {
      sensitivity: "base",
    });
  });

  if (unitCountText) {
    unitCountText.textContent = units.length + " đơn vị";
  }

  if (units.length === 0) {
    unitProgressBody.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    class="workflow-table-empty"
                >
                    Chưa có đơn vị nhập số liệu.
                </td>

            </tr>

        `;

    return;
  }

  unitProgressBody.innerHTML = units
    .map(function (unit, index) {
      return `

                        <tr>

                            <td>
                                ${index + 1}
                            </td>


                            <td>

                                <strong>
                                    ${escapeHtmlText(unit.name)}
                                </strong>

                                <div class="workflow-unit-code">
                                    ${escapeHtmlText(unit.code || "")}
                                </div>

                            </td>


                            ${renderUnitRateCell(unit, "inventory")}


                            ${renderUnitRateCell(unit, "compensation")}


                            ${renderUnitRateCell(unit, "support")}


                            ${renderUnitRateCell(unit, "resettlement")}


                            ${renderUnitRateCell(unit, "handover")}

                        </tr>

                    `;
    })
    .join("");
}

// ======================================================
// 16. Ô % CỦA TỪNG ĐƠN VỊ
// ======================================================

function renderUnitRateCell(unit, stepId) {
  const data = unit.steps[stepId];

  if (!data) {
    return `

            <td>

                <span
                    class="
                        workflow-rate-badge
                        is-empty
                    "
                >
                    Chưa có
                </span>

            </td>

        `;
  }

  const values = getStepRateValues(stepId, data);

  const rate = calculatePercent(values.numerator, values.denominator);

  const className = getRateClass(rate);

  return `

        <td>

            <span
                class="
                    workflow-rate-badge
                    ${className}
                "
            >
                ${formatNumber(rate, 1)}%
            </span>

        </td>

    `;
}

// ======================================================
// 17. MÀU TỶ LỆ
// ======================================================

function getRateClass(rate) {
  if (rate >= 80) {
    return "is-good";
  }

  if (rate >= 50) {
    return "is-medium";
  }

  return "is-low";
}

// ======================================================
// 18. THỜI GIAN CẬP NHẬT
// ======================================================

function updateLatestTimestamp(timestamp) {
  if (!timestamp) {
    return;
  }

  let time = null;

  if (typeof timestamp.toDate === "function") {
    time = timestamp.toDate();
  }

  if (!time) {
    return;
  }

  if (!latestUpdatedTime || time > latestUpdatedTime) {
    latestUpdatedTime = time;
  }
}

function renderUpdatedTime() {
  if (!dashboardUpdatedAt) {
    return;
  }

  if (!latestUpdatedTime) {
    dashboardUpdatedAt.textContent = "Chưa có dữ liệu cập nhật";

    return;
  }

  dashboardUpdatedAt.textContent =
    "Cập nhật gần nhất: " + latestUpdatedTime.toLocaleString("vi-VN");
}

// ======================================================
// 19. RESET
// ======================================================

function resetDashboard() {
  unitsData = new Map();

  workflowSteps = [];

  latestUpdatedTime = null;

  // ==============================================
  // KPI
  // ==============================================

  const zeroIds = [
    "totalArea",
    "recoveredArea",
    "remainingArea",
    "areaPercent",

    "totalLength",
    "deliveredLength",
    "remainingLength",
    "lengthPercent",

    "totalHouseholds",
    "approvedHouseholds",
    "paidHouseholds",
    "handedOverHouseholds",
    "notAgreedHouseholds",
  ];

  zeroIds.forEach(function (id) {
    setText(id, "0");
  });

  setText("areaProgressText", "0%");

  setText("lengthProgressText", "0%");

  setProgressWidth("areaProgressBar", 0);

  setProgressWidth("lengthProgressBar", 0);

  // ==============================================
  // WORKFLOW
  // ==============================================

  if (workflowCards) {
    workflowCards.innerHTML = `

            <div class="phase-note">
                Đăng nhập để xem dữ liệu.
            </div>

        `;
  }

  // ==============================================
  // TABLE
  // ==============================================

  if (unitCountText) {
    unitCountText.textContent = "0 đơn vị";
  }

  if (unitProgressBody) {
    unitProgressBody.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    class="workflow-table-empty"
                >
                    Đăng nhập để xem dữ liệu.
                </td>

            </tr>

        `;
  }

  if (dashboardAlerts) {
    dashboardAlerts.innerHTML = `
      <div class="home-insight-empty">Đăng nhập để xem dữ liệu.</div>
    `;
  }

  if (unitRanking) {
    unitRanking.innerHTML = `
      <div class="home-insight-empty">Đăng nhập để xem dữ liệu.</div>
    `;
  }
}

// ======================================================
// 20. M² → HA
// ======================================================

function m2ToHa(value) {
  return numberValue(value) / 10000;
}

// ======================================================
// 21. TÍNH %
// ======================================================

function calculatePercent(value, total) {
  const safeValue = numberValue(value);

  const safeTotal = numberValue(total);

  if (safeTotal <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, (safeValue / safeTotal) * 100));
}

// ======================================================
// 20. NUMBER
// ======================================================

function numberValue(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(0, number);
}

function integerValue(value) {
  return Math.floor(numberValue(value));
}

// ======================================================
// 21. FORMAT SỐ
// ======================================================

function formatNumber(value, digits = 1) {
  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 0,

    maximumFractionDigits: digits,
  }).format(numberValue(value));
}

// ======================================================
// 22. SET TEXT
// ======================================================

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}

// ======================================================
// 23. THANH TIẾN ĐỘ
// ======================================================

function setProgressWidth(id, percent) {
  const element = document.getElementById(id);

  if (element) {
    element.style.width =
      Math.min(100, Math.max(0, numberValue(percent))) + "%";
  }
}

// ======================================================
// 24. AN TOÀN HTML
// ======================================================

function escapeHtmlText(value) {
  const div = document.createElement("div");

  div.textContent = value ?? "";

  return div.innerHTML;
}
