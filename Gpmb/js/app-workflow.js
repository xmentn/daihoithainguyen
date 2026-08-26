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

            <div class="phase-note">
                Chưa có danh mục quy trình.
            </div>

        `;

    return;
  }

  workflowCards.innerHTML = workflowSteps
    .map(function (step, index) {
      const summary = calculateStepSummary(step.id);

      const rate = summary.rate;

      return `

                        <div
                            class="
                                phase-card
                                workflow-dashboard-card
                            "
                        >

                            <div class="phase-card-header">

                                <div class="workflow-card-heading">

                                    <span class="workflow-card-number">
                                        ${index + 1}
                                    </span>

                                    <h3>
                                        ${escapeHtmlText(step.name)}
                                    </h3>

                                </div>

                            </div>


                            <div class="phase-percent">

                                <strong>
                                    ${
                                      summary.recordCount > 0
                                        ? formatNumber(rate, 1) + "%"
                                        : "—"
                                    }
                                </strong>

                            </div>


                            <div class="progress">

                                <div
                                    class="progress-bar"
                                    style="width:${
                                      summary.recordCount > 0 ? rate : 0
                                    }%;"
                                >
                                </div>

                            </div>


                            <div class="phase-note">

                                ${escapeHtmlText(summary.description)}

                            </div>


                            <div class="phase-note">

                                ${
                                  summary.recordCount > 0
                                    ? summary.recordCount +
                                      " đơn vị đã có số liệu"
                                    : "Chưa có đơn vị nhập số liệu"
                                }

                            </div>

                        </div>

                    `;
    })
    .join("");
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
// 13. BẢNG TIẾN ĐỘ TỪNG ĐƠN VỊ
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
// 14. Ô % CỦA TỪNG ĐƠN VỊ
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
// 15. MÀU TỶ LỆ
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
// 16. THỜI GIAN CẬP NHẬT
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
// 17. RESET
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
}

// ======================================================
// 18. M² → HA
// ======================================================

function m2ToHa(value) {
  return numberValue(value) / 10000;
}

// ======================================================
// 19. TÍNH %
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
