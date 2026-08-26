// ======================================================
// PROGRESS.JS
//
// TRANG CHI TIẾT TIẾN ĐỘ GPMB
//
// Dữ liệu:
// progress/{unitId}/steps/{stepId}
//
// 05 bước:
// 1. inventory
// 2. compensation
// 3. support
// 4. resettlement
// 5. handover
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
// 1. CẤU HÌNH 5 BƯỚC
// ======================================================

const STEP_CONFIG = {
  inventory: {
    title: "Kiểm đếm",

    description: "Theo dõi số hộ / tổ chức đã hoàn thành kiểm đếm.",

    totalLabel: "Tổng số hộ phải kiểm đếm",

    completedLabel: "Đã kiểm đếm",

    remainingLabel: "Chưa kiểm đếm",
  },

  compensation: {
    title: "Bồi thường",

    description: "Theo dõi tiến độ lập và phê duyệt phương án bồi thường.",

    totalLabel: "Tổng hộ phải lập phương án",

    completedLabel: "Đã phê duyệt phương án",

    remainingLabel: "Chưa phê duyệt",
  },

  support: {
    title: "Hỗ trợ",

    description:
      "Theo dõi tiến độ chi trả đối với các trường hợp đã được phê duyệt hỗ trợ.",

    totalLabel: "Đã phê duyệt hỗ trợ",

    completedLabel: "Đã chi trả hỗ trợ",

    remainingLabel: "Chưa chi trả",
  },

  resettlement: {
    title: "Tái định cư",

    description:
      "Theo dõi tiến độ bố trí tái định cư cho các hộ thuộc diện phải bố trí.",

    totalLabel: "Tổng hộ phải bố trí TĐC",

    completedLabel: "Đã bố trí TĐC",

    remainingLabel: "Chưa bố trí",
  },

  handover: {
    title: "Giải phóng mặt bằng / Bàn giao",

    description: "Theo dõi số hộ / tổ chức đã hoàn thành bàn giao mặt bằng.",

    totalLabel: "Tổng hộ / tổ chức ảnh hưởng",

    completedLabel: "Đã bàn giao mặt bằng",

    remainingLabel: "Chưa bàn giao",
  },
};

// ======================================================
// 2. BIẾN TOÀN CỤC
// ======================================================

let currentUser = null;

let currentProfile = null;

let activeStepId = "inventory";

let selectedUnitId = "all";

let unitsData = new Map();

// ======================================================
// 3. DOM
// ======================================================

const progressUnitSelect = document.getElementById("progressUnitSelect");

const progressUpdatedAt = document.getElementById("progressUpdatedAt");

const progressStepTitle = document.getElementById("progressStepTitle");

const progressStepDescription = document.getElementById(
  "progressStepDescription",
);

const progressStepRate = document.getElementById("progressStepRate");

const progressKpi1Label = document.getElementById("progressKpi1Label");

const progressKpi1Value = document.getElementById("progressKpi1Value");

const progressKpi2Label = document.getElementById("progressKpi2Label");

const progressKpi2Value = document.getElementById("progressKpi2Value");

const progressKpi3Label = document.getElementById("progressKpi3Label");

const progressKpi3Value = document.getElementById("progressKpi3Value");

const progressKpiPercent = document.getElementById("progressKpiPercent");

const progressMainBar = document.getElementById("progressMainBar");

const progressUnitCount = document.getElementById("progressUnitCount");

const progressDetailBody = document.getElementById("progressDetailBody");

const progressIssues = document.getElementById("progressIssues");
const progressExtraMetrics = document.getElementById("progressExtraMetrics");
// ======================================================
// 4. THEO DÕI ĐĂNG NHẬP
// ======================================================

onAuthStateChanged(
  auth,

  async function (user) {
    currentUser = user;

    if (!user) {
      currentProfile = null;

      resetProgressPage();

      if (progressUpdatedAt) {
        progressUpdatedAt.textContent = "Đăng nhập để xem dữ liệu";
      }

      return;
    }

    try {
      if (progressUpdatedAt) {
        progressUpdatedAt.textContent = "Đang tải dữ liệu...";
      }

      await loadCurrentProfile();

      await loadProgressData();

      await refreshUnitIdentityFromMaster();

      renderUnitSelect();

      bindEvents();

      renderCurrentView();

      console.log("Trang Tiến độ GPMB: tải dữ liệu thành công.");

      console.log("Dữ liệu các đơn vị:", unitsData);
    } catch (error) {
      console.error("Lỗi tải trang Tiến độ GPMB:", error);

      resetProgressPage();

      if (progressUpdatedAt) {
        progressUpdatedAt.textContent = "Không thể tải dữ liệu";
      }
    }
  },
);

// ======================================================
// 5. HỒ SƠ NGƯỜI DÙNG
// ======================================================

async function loadCurrentProfile() {
  if (!currentUser) {
    return;
  }

  const snapshot = await getDoc(doc(db, "users", currentUser.uid));

  if (!snapshot.exists()) {
    currentProfile = null;

    return;
  }

  currentProfile = snapshot.data();
}

// ======================================================
// 6. TẢI TOÀN BỘ progress/.../steps
// ======================================================

async function loadProgressData() {
  unitsData = new Map();

  const snapshot = await getDocs(collectionGroup(db, "steps"));

  snapshot.forEach(function (documentSnapshot) {
    const path = documentSnapshot.ref.path;

    // Chỉ lấy dữ liệu thuộc:
    //
    // progress/{unitId}/steps/{stepId}

    if (!path.startsWith("progress/")) {
      return;
    }

    const parts = path.split("/");

    if (parts.length < 4) {
      return;
    }

    const unitId = parts[1];

    const stepId = documentSnapshot.id;

    if (!STEP_CONFIG[stepId]) {
      return;
    }

    const data = documentSnapshot.data();

    if (!unitsData.has(unitId)) {
      unitsData.set(
        unitId,

        createEmptyUnit(unitId),
      );
    }

    const unit = unitsData.get(unitId);

    // Tên cũ trong progress vẫn dùng làm fallback.
    //
    // Sau đó tên chính thức sẽ được ghi đè
    // từ collection units.

    if (data.unitName) {
      unit.name = data.unitName;
    }

    if (data.unitCode) {
      unit.code = data.unitCode;
    }

    unit.steps[stepId] = data;
  });
}

// ======================================================
// 7. OBJECT ĐƠN VỊ
// ======================================================

function createEmptyUnit(unitId) {
  return {
    id: unitId,

    name: "Đơn vị",

    code: "",

    steps: {
      inventory: null,

      compensation: null,

      support: null,

      resettlement: null,

      handover: null,
    },
  };
}

// ======================================================
// 8. LẤY TÊN/MÃ CHÍNH THỨC TỪ units
// ======================================================

async function refreshUnitIdentityFromMaster() {
  if (!currentUser || !currentProfile) {
    return;
  }

  try {
    // ==================================================
    // ADMIN
    //
    // Admin đọc được toàn bộ danh mục đơn vị.
    // ==================================================

    if (currentProfile.role === "admin") {
      const snapshot = await getDocs(collection(db, "units"));

      snapshot.forEach(function (unitSnapshot) {
        applyUnitMasterData(
          unitSnapshot.id,

          unitSnapshot.data(),
        );
      });

      return;
    }

    // ==================================================
    // TÀI KHOẢN XÃ / PHƯỜNG
    //
    // Đọc document đơn vị của chính tài khoản.
    // ==================================================

    if (!currentProfile.unitId) {
      return;
    }

    const unitSnapshot = await getDoc(doc(db, "units", currentProfile.unitId));

    if (unitSnapshot.exists()) {
      applyUnitMasterData(
        unitSnapshot.id,

        unitSnapshot.data(),
      );
    }
  } catch (error) {
    console.warn("Không thể cập nhật tên đơn vị từ units:", error);
  }
}

// ======================================================
// 9. ÁP TÊN/MÃ ĐƠN VỊ
// ======================================================

function applyUnitMasterData(unitId, data) {
  const unit = unitsData.get(unitId);

  if (!unit) {
    return;
  }

  if (data.name) {
    unit.name = data.name;
  }

  if (data.code) {
    unit.code = data.code;
  }
}

// ======================================================
// 10. TẠO DANH SÁCH ĐƠN VỊ
// ======================================================

function renderUnitSelect() {
  if (!progressUnitSelect) {
    return;
  }

  const units = getSortedUnits();

  progressUnitSelect.innerHTML = `

        <option value="all">
            Toàn bộ dự án
        </option>

    `;

  units.forEach(function (unit) {
    const option = document.createElement("option");

    option.value = unit.id;

    option.textContent = unit.name;

    progressUnitSelect.appendChild(option);
  });

  progressUnitSelect.value = selectedUnitId;
}

// ======================================================
// 11. GẮN SỰ KIỆN
// ======================================================

let eventsBound = false;

function bindEvents() {
  if (eventsBound) {
    return;
  }

  eventsBound = true;

  // ==================================================
  // ĐƠN VỊ
  // ==================================================

  if (progressUnitSelect) {
    progressUnitSelect.addEventListener(
      "change",

      function () {
        selectedUnitId = progressUnitSelect.value;

        renderCurrentView();
      },
    );
  }

  // ==================================================
  // 5 TAB
  // ==================================================

  const stepButtons = document.querySelectorAll(".progress-step-tab");

  stepButtons.forEach(function (button) {
    button.addEventListener(
      "click",

      function () {
        const stepId = button.dataset.step;

        if (!STEP_CONFIG[stepId]) {
          return;
        }

        activeStepId = stepId;

        stepButtons.forEach(function (item) {
          item.classList.remove("active");
        });

        button.classList.add("active");

        renderCurrentView();
      },
    );
  });
}

// ======================================================
// 12. HIỂN THỊ TOÀN BỘ VIEW
// ======================================================

function renderCurrentView() {
  const units = getFilteredUnits();

  renderStepHeader();

  renderSummaryKpis(units);

  renderExtraMetrics(units);

  renderDetailTable(units);

  renderIssues(units);

  renderUpdatedTime(units);
}

// ======================================================
// 13. ĐẦU BƯỚC
// ======================================================

function renderStepHeader() {
  const config = STEP_CONFIG[activeStepId];

  if (!config) {
    return;
  }

  if (progressStepTitle) {
    progressStepTitle.textContent = config.title;
  }

  if (progressStepDescription) {
    progressStepDescription.textContent = config.description;
  }

  if (progressKpi1Label) {
    progressKpi1Label.textContent = config.totalLabel;
  }

  if (progressKpi2Label) {
    progressKpi2Label.textContent = config.completedLabel;
  }

  if (progressKpi3Label) {
    progressKpi3Label.textContent = config.remainingLabel;
  }
}

// ======================================================
// 14. KPI TỔNG HỢP
// ======================================================

function renderSummaryKpis(units) {
  let total = 0;

  let completed = 0;

  units.forEach(function (unit) {
    const data = unit.steps[activeStepId];

    if (!data) {
      return;
    }

    const values = getStepValues(
      activeStepId,

      data,
    );

    total += values.total;

    completed += values.completed;
  });

  const remaining = Math.max(0, total - completed);

  const percent = calculatePercent(completed, total);

  setText(progressKpi1Value, formatNumber(total, 0));

  setText(progressKpi2Value, formatNumber(completed, 0));

  setText(progressKpi3Value, formatNumber(remaining, 0));

  setText(progressKpiPercent, formatNumber(percent, 1) + "%");

  setText(progressStepRate, formatNumber(percent, 1) + "%");

  if (progressMainBar) {
    progressMainBar.style.width = clampPercent(percent) + "%";
  }
}

// ======================================================
// 15. LẤY TỔNG / ĐÃ LÀM THEO TỪNG BƯỚC
// ======================================================

function getStepValues(stepId, data) {
  switch (stepId) {
    // ==================================================
    // KIỂM ĐẾM
    // ==================================================

    case "inventory":
      return {
        total: integerValue(data.totalHouseholds),

        completed: integerValue(data.completedHouseholds),
      };

    // ==================================================
    // BỒI THƯỜNG
    // ==================================================

    case "compensation":
      return {
        total: integerValue(data.totalHouseholds),

        completed: integerValue(data.approvedHouseholds),
      };

    // ==================================================
    // HỖ TRỢ
    //
    // Tỷ lệ = đã chi trả / đã phê duyệt
    // ==================================================

    case "support":
      return {
        total: integerValue(data.approvedHouseholds),

        completed: integerValue(data.paidHouseholds),
      };

    // ==================================================
    // TÁI ĐỊNH CƯ
    // ==================================================

    case "resettlement":
      return {
        total: integerValue(data.totalHouseholds),

        completed: integerValue(data.allocatedHouseholds),
      };

    // ==================================================
    // BÀN GIAO
    // ==================================================

    case "handover":
      return {
        total: integerValue(data.totalHouseholds),

        completed: integerValue(data.handedOverHouseholds),
      };

    default:
      return {
        total: 0,

        completed: 0,
      };
  }
}

// ======================================================
// 16. BẢNG CHI TIẾT
// ======================================================

function renderDetailTable(units) {
  if (!progressDetailBody) {
    return;
  }

  const rows = [];

  units.forEach(function (unit) {
    const data = unit.steps[activeStepId];

    if (!data) {
      return;
    }

    rows.push({
      unit: unit,

      data: data,
    });
  });

  if (progressUnitCount) {
    progressUnitCount.textContent = rows.length + " đơn vị";
  }

  if (rows.length === 0) {
    progressDetailBody.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    class="workflow-table-empty"
                >
                    Chưa có số liệu cho bước này.
                </td>

            </tr>

        `;

    return;
  }

  progressDetailBody.innerHTML = rows
    .map(function (item, index) {
      const values = getStepValues(
        activeStepId,

        item.data,
      );

      const remaining = Math.max(
        0,

        values.total - values.completed,
      );

      const percent = calculatePercent(
        values.completed,

        values.total,
      );

      const issue = buildIssueText(
        activeStepId,

        item.data,
      );

      return `

                        <tr>

                            <td>
                                ${index + 1}
                            </td>


                            <td>

                                <strong>
                                    ${escapeHtmlText(item.unit.name)}
                                </strong>

                                <div class="workflow-unit-code">

                                    ${escapeHtmlText(item.unit.code || "")}

                                </div>

                            </td>


                            <td>

                                ${formatNumber(values.total, 0)}

                            </td>


                            <td>

                                <strong
                                    style="color:#159a57;"
                                >

                                    ${formatNumber(values.completed, 0)}

                                </strong>

                            </td>


                            <td>

                                ${formatNumber(remaining, 0)}

                            </td>


                            <td>

                                <span
                                    class="
                                        workflow-rate-badge
                                        ${getRateClass(percent)}
                                    "
                                >

                                    ${formatNumber(percent, 1)}%

                                </span>

                            </td>


                            <td>

                                ${issue ? escapeHtmlText(issue) : "—"}

                            </td>

                        </tr>

                    `;
    })
    .join("");
}

// ======================================================
// 17. VƯỚNG MẮC
// ======================================================

function renderIssues(units) {
  if (!progressIssues) {
    return;
  }

  const items = [];

  units.forEach(function (unit) {
    const data = unit.steps[activeStepId];

    if (!data) {
      return;
    }

    const issue = buildIssueText(
      activeStepId,

      data,
    );

    if (!issue) {
      return;
    }

    items.push({
      unit: unit,

      issue: issue,
    });
  });

  if (items.length === 0) {
    progressIssues.innerHTML = `

            <div class="workflow-table-empty">

                Không có vướng mắc được ghi nhận
                ở bước này.

            </div>

        `;

    return;
  }

  progressIssues.innerHTML = items
    .map(function (item) {
      return `

                        <div class="progress-issue-item">

                            <strong>

                                ${escapeHtmlText(item.unit.name)}

                            </strong>


                            <p>

                                ${escapeHtmlText(item.issue)}

                            </p>

                        </div>

                    `;
    })
    .join("");
}

// ======================================================
// 18. TẠO NỘI DUNG VƯỚNG MẮC
// ======================================================

function buildIssueText(stepId, data) {
  const parts = [];

  // ==================================================
  // GHI CHÚ DO ĐƠN VỊ NHẬP
  // ==================================================

  const notes = String(data.notes || "").trim();

  // ==================================================
  // KIỂM ĐẾM
  // ==================================================

  if (stepId === "inventory") {
    const uncooperative = integerValue(data.uncooperativeHouseholds);

    if (uncooperative > 0) {
      parts.push(uncooperative + " hộ chưa phối hợp kiểm đếm");
    }
  }

  // ==================================================
  // BỒI THƯỜNG
  // ==================================================

  if (stepId === "compensation") {
    const notAgreed = integerValue(data.notAgreedHouseholds);

    if (notAgreed > 0) {
      parts.push(notAgreed + " hộ / tổ chức chưa đồng ý");
    }
  }

  // ==================================================
  // HỖ TRỢ
  // ==================================================

  if (stepId === "support") {
    const approved = integerValue(data.approvedHouseholds);

    const paid = integerValue(data.paidHouseholds);

    const remaining = Math.max(0, approved - paid);

    if (remaining > 0) {
      parts.push(remaining + " hộ chưa được chi trả hỗ trợ");
    }
  }

  // ==================================================
  // TÁI ĐỊNH CƯ
  // ==================================================

  if (stepId === "resettlement") {
    const total = integerValue(data.totalHouseholds);

    const allocated = integerValue(data.allocatedHouseholds);

    const remainingHouseholds = Math.max(0, total - allocated);

    if (remainingHouseholds > 0) {
      parts.push(remainingHouseholds + " hộ chưa được bố trí tái định cư");
    }

    const requiredLots = integerValue(data.requiredLots);

    const allocatedLots = integerValue(data.allocatedLots);

    const remainingLots = Math.max(0, requiredLots - allocatedLots);

    if (remainingLots > 0) {
      parts.push(remainingLots + " lô tái định cư còn phải bố trí");
    }
  }

  // ==================================================
  // GPMB / BÀN GIAO
  // ==================================================

  if (stepId === "handover") {
    const total = integerValue(data.totalHouseholds);

    const handedOver = integerValue(data.handedOverHouseholds);

    const remaining = Math.max(0, total - handedOver);

    if (remaining > 0) {
      parts.push(remaining + " hộ / tổ chức chưa bàn giao mặt bằng");
    }

    const obstructionLocations = integerValue(data.obstructionLocations);

    if (obstructionLocations > 0) {
      parts.push(obstructionLocations + " vị trí còn vướng mặt bằng");
    }
  }

  // ==================================================
  // GHI CHÚ THỦ CÔNG
  // ==================================================

  if (notes) {
    parts.push(notes);
  }

  return parts.join("; ");
}

// ======================================================
// 19. THỜI GIAN CẬP NHẬT
// ======================================================

function renderUpdatedTime(units) {
  if (!progressUpdatedAt) {
    return;
  }

  let latestDate = null;

  units.forEach(function (unit) {
    const data = unit.steps[activeStepId];

    if (!data || !data.updatedAt) {
      return;
    }

    let date = null;

    if (typeof data.updatedAt.toDate === "function") {
      date = data.updatedAt.toDate();
    }

    if (!date) {
      return;
    }

    if (!latestDate || date > latestDate) {
      latestDate = date;
    }
  });

  if (!latestDate) {
    progressUpdatedAt.textContent = "Chưa có dữ liệu cập nhật";

    return;
  }

  progressUpdatedAt.textContent =
    "Cập nhật gần nhất: " + latestDate.toLocaleString("vi-VN");
}

// ======================================================
// 20. DANH SÁCH ĐƠN VỊ ĐƯỢC LỌC
// ======================================================

function getFilteredUnits() {
  const units = getSortedUnits();

  if (selectedUnitId === "all") {
    return units;
  }

  return units.filter(function (unit) {
    return unit.id === selectedUnitId;
  });
}
// ======================================================
// CÁC CHỈ TIÊU CHI TIẾT
// ======================================================

function renderExtraMetrics(units) {
  if (!progressExtraMetrics) {
    return;
  }

  const metrics = getExtraMetrics(units, activeStepId);

  if (!metrics || metrics.length === 0) {
    progressExtraMetrics.innerHTML = `

            <div class="progress-extra-empty">
                Chưa có chỉ tiêu chi tiết.
            </div>

        `;

    return;
  }

  progressExtraMetrics.innerHTML = metrics
    .map(function (metric) {
      const className = metric.className || "";

      return `

                        <div
                            class="
                                progress-extra-card
                                ${className}
                            "
                        >

                            <span>
                                ${escapeHtmlText(metric.label)}
                            </span>

                            <strong>
                                ${escapeHtmlText(metric.value)}
                            </strong>

                        </div>

                    `;
    })
    .join("");
}
// ======================================================
// TÍNH CÁC CHỈ TIÊU CHI TIẾT THEO BƯỚC
// ======================================================

function getExtraMetrics(units, stepId) {
  switch (stepId) {
    case "inventory":
      return getInventoryExtraMetrics(units);

    case "compensation":
      return getCompensationExtraMetrics(units);

    case "support":
      return getSupportExtraMetrics(units);

    case "resettlement":
      return getResettlementExtraMetrics(units);

    case "handover":
      return getHandoverExtraMetrics(units);

    default:
      return [];
  }
}
function getInventoryExtraMetrics(units) {
  let notifiedHouseholds = 0;

  let totalPlots = 0;

  let completedPlots = 0;

  let totalAreaM2 = 0;

  let completedAreaM2 = 0;

  let uncooperativeHouseholds = 0;

  units.forEach(function (unit) {
    const data = unit.steps.inventory;

    if (!data) {
      return;
    }

    notifiedHouseholds += integerValue(data.notifiedHouseholds);

    totalPlots += integerValue(data.totalPlots);

    completedPlots += integerValue(data.completedPlots);

    totalAreaM2 += numberValue(data.totalAreaM2);

    completedAreaM2 += numberValue(data.completedAreaM2);

    uncooperativeHouseholds += integerValue(data.uncooperativeHouseholds);
  });

  return [
    {
      label: "Đã thông báo kiểm đếm",

      value: formatNumber(notifiedHouseholds, 0) + " hộ",
    },

    {
      label: "Tổng số thửa phải kiểm đếm",

      value: formatNumber(totalPlots, 0) + " thửa",
    },

    {
      label: "Số thửa đã kiểm đếm",

      value: formatNumber(completedPlots, 0) + " thửa",

      className: "success",
    },

    {
      label: "Tổng diện tích phải kiểm đếm",

      value: formatArea(totalAreaM2),
    },

    {
      label: "Diện tích đã kiểm đếm",

      value: formatArea(completedAreaM2),

      className: "success",
    },

    {
      label: "Hộ chưa phối hợp kiểm đếm",

      value: formatNumber(uncooperativeHouseholds, 0) + " hộ",

      className: uncooperativeHouseholds > 0 ? "danger" : "success",
    },
  ];
}
function getCompensationExtraMetrics(units) {
  let prepared = 0;

  let published = 0;

  let approved = 0;

  let paid = 0;

  let notAgreed = 0;

  let totalVnd = 0;

  let approvedVnd = 0;

  let paidVnd = 0;

  units.forEach(function (unit) {
    const data = unit.steps.compensation;

    if (!data) {
      return;
    }

    prepared += integerValue(data.preparedHouseholds);

    published += integerValue(data.publishedHouseholds);

    approved += integerValue(data.approvedHouseholds);

    paid += integerValue(data.paidHouseholds);

    notAgreed += integerValue(data.notAgreedHouseholds);

    totalVnd += numberValue(data.totalCompensationVnd);

    approvedVnd += numberValue(data.approvedCompensationVnd);

    paidVnd += numberValue(data.paidCompensationVnd);
  });

  return [
    {
      label: "Đã lập phương án",

      value: formatNumber(prepared, 0) + " hộ",
    },

    {
      label: "Đã công khai phương án",

      value: formatNumber(published, 0) + " hộ",
    },

    {
      label: "Đã nhận tiền",

      value: formatNumber(paid, 0) + " hộ",

      className: "success",
    },

    {
      label: "Chưa đồng ý",

      value: formatNumber(notAgreed, 0) + " hộ",

      className: notAgreed > 0 ? "danger" : "success",
    },

    {
      label: "Tổng kinh phí bồi thường dự kiến",

      value: formatMoneyVnd(totalVnd),
    },

    {
      label: "Kinh phí đã phê duyệt",

      value: formatMoneyVnd(approvedVnd),
    },

    {
      label: "Kinh phí đã chi trả",

      value: formatMoneyVnd(paidVnd),

      className: "success",
    },
  ];
}
function getSupportExtraMetrics(units) {
  let total = 0;

  let determined = 0;

  let approved = 0;

  let paid = 0;

  let totalVnd = 0;

  let approvedVnd = 0;

  let paidVnd = 0;

  units.forEach(function (unit) {
    const data = unit.steps.support;

    if (!data) {
      return;
    }

    total += integerValue(data.totalHouseholds);

    determined += integerValue(data.determinedHouseholds);

    approved += integerValue(data.approvedHouseholds);

    paid += integerValue(data.paidHouseholds);

    totalVnd += numberValue(data.totalSupportVnd);

    approvedVnd += numberValue(data.approvedSupportVnd);

    paidVnd += numberValue(data.paidSupportVnd);
  });

  return [
    {
      label: "Tổng hộ / tổ chức thuộc diện hỗ trợ",

      value: formatNumber(total, 0) + " hộ",
    },

    {
      label: "Đã xác định chính sách hỗ trợ",

      value: formatNumber(determined, 0) + " hộ",
    },

    {
      label: "Đã phê duyệt hỗ trợ",

      value: formatNumber(approved, 0) + " hộ",
    },

    {
      label: "Đã chi trả hỗ trợ",

      value: formatNumber(paid, 0) + " hộ",

      className: "success",
    },

    {
      label: "Tổng kinh phí hỗ trợ",

      value: formatMoneyVnd(totalVnd),
    },

    {
      label: "Kinh phí đã phê duyệt",

      value: formatMoneyVnd(approvedVnd),
    },

    {
      label: "Kinh phí đã chi trả",

      value: formatMoneyVnd(paidVnd),

      className: "success",
    },
  ];
}
function getResettlementExtraMetrics(units) {
  let eligible = 0;

  let approved = 0;

  let allocated = 0;

  let received = 0;

  let requiredLots = 0;

  let allocatedLots = 0;

  units.forEach(function (unit) {
    const data = unit.steps.resettlement;

    if (!data) {
      return;
    }

    eligible += integerValue(data.eligibleHouseholds);

    approved += integerValue(data.approvedHouseholds);

    allocated += integerValue(data.allocatedHouseholds);

    received += integerValue(data.receivedHouseholds);

    requiredLots += integerValue(data.requiredLots);

    allocatedLots += integerValue(data.allocatedLots);
  });

  const remainingLots = Math.max(0, requiredLots - allocatedLots);

  return [
    {
      label: "Đã xác định đủ điều kiện TĐC",

      value: formatNumber(eligible, 0) + " hộ",
    },

    {
      label: "Đã phê duyệt phương án TĐC",

      value: formatNumber(approved, 0) + " hộ",
    },

    {
      label: "Đã bố trí lô đất / nhà TĐC",

      value: formatNumber(allocated, 0) + " hộ",
    },

    {
      label: "Đã nhận đất / nhà TĐC",

      value: formatNumber(received, 0) + " hộ",

      className: "success",
    },

    {
      label: "Tổng số lô TĐC cần bố trí",

      value: formatNumber(requiredLots, 0) + " lô",
    },

    {
      label: "Số lô đã bố trí",

      value: formatNumber(allocatedLots, 0) + " lô",

      className: "success",
    },

    {
      label: "Số lô còn phải bố trí",

      value: formatNumber(remainingLots, 0) + " lô",

      className: remainingLots > 0 ? "warning" : "success",
    },
  ];
}
// ======================================================
// CHỈ TIÊU CHI TIẾT - GPMB / BÀN GIAO
//
// NGUYÊN TẮC:
// - Diện tích, chiều dài, hộ bàn giao:
//       lấy từ handover
//
// - Đã nhận tiền, chưa đồng ý:
//       lấy trực tiếp từ compensation
//
// Không dùng bản sao paidHouseholds /
// notAgreedHouseholds trong handover.
// ======================================================

function getHandoverExtraMetrics(units) {
  let totalAreaM2 = 0;

  let recoveredAreaM2 = 0;

  let totalLengthKm = 0;

  let deliveredLengthKm = 0;

  let paidHouseholds = 0;

  let notAgreedHouseholds = 0;

  let obstructionLocations = 0;

  units.forEach(function (unit) {
    const handover = unit.steps.handover;

    const compensation = unit.steps.compensation;

    // ==========================================
    // DỮ LIỆU BÀN GIAO
    // ==========================================

    if (handover) {
      totalAreaM2 += numberValue(handover.totalAreaM2);

      recoveredAreaM2 += numberValue(handover.recoveredAreaM2);

      totalLengthKm += numberValue(handover.totalLengthKm);

      deliveredLengthKm += numberValue(handover.deliveredLengthKm);

      obstructionLocations += integerValue(handover.obstructionLocations);
    }

    // ==========================================
    // NGUỒN DUY NHẤT:
    // BỒI THƯỜNG
    // ==========================================

    if (compensation) {
      paidHouseholds += integerValue(compensation.paidHouseholds);

      notAgreedHouseholds += integerValue(compensation.notAgreedHouseholds);
    }
  });

  // ==============================================
  // PHẦN CÒN LẠI
  // ==============================================

  const remainingAreaM2 = Math.max(0, totalAreaM2 - recoveredAreaM2);

  const remainingLengthKm = Math.max(0, totalLengthKm - deliveredLengthKm);

  return [
    {
      label: "Tổng diện tích cần thu hồi",

      value: formatArea(totalAreaM2),
    },

    {
      label: "Diện tích đã GPMB",

      value: formatArea(recoveredAreaM2),

      className: "success",
    },

    {
      label: "Diện tích còn lại",

      value: formatArea(remainingAreaM2),

      className: remainingAreaM2 > 0 ? "warning" : "success",
    },

    {
      label: "Tổng chiều dài tuyến",

      value: formatNumber(totalLengthKm, 3) + " km",
    },

    {
      label: "Chiều dài đã bàn giao",

      value: formatNumber(deliveredLengthKm, 3) + " km",

      className: "success",
    },

    {
      label: "Chiều dài còn vướng",

      value: formatNumber(remainingLengthKm, 3) + " km",

      className: remainingLengthKm > 0 ? "warning" : "success",
    },

    {
      label: "Đã nhận tiền bồi thường",

      value: formatNumber(paidHouseholds, 0) + " hộ",

      className: "success",
    },

    {
      label: "Chưa đồng ý",

      value: formatNumber(notAgreedHouseholds, 0) + " hộ",

      className: notAgreedHouseholds > 0 ? "danger" : "success",
    },

    {
      label: "Vị trí còn vướng mặt bằng",

      value: formatNumber(obstructionLocations, 0) + " vị trí",

      className: obstructionLocations > 0 ? "danger" : "success",
    },
  ];
}
// ======================================================
// 21. SẮP XẾP ĐƠN VỊ TIẾNG VIỆT
// ======================================================

function getSortedUnits() {
  return Array.from(unitsData.values()).sort(function (a, b) {
    return String(a.name || "").localeCompare(
      String(b.name || ""),

      "vi",

      {
        sensitivity: "base",
      },
    );
  });
}

// ======================================================
// 22. RESET
// ======================================================

function resetProgressPage() {
  selectedUnitId = "all";

  activeStepId = "inventory";

  unitsData = new Map();

  if (progressUnitSelect) {
    progressUnitSelect.innerHTML = `

            <option value="all">
                Toàn bộ dự án
            </option>

        `;
  }

  setText(progressKpi1Value, "0");

  setText(progressKpi2Value, "0");

  setText(progressKpi3Value, "0");

  setText(progressKpiPercent, "0%");

  setText(progressStepRate, "0%");

  if (progressMainBar) {
    progressMainBar.style.width = "0%";
  }

  if (progressUnitCount) {
    progressUnitCount.textContent = "0 đơn vị";
  }

  if (progressDetailBody) {
    progressDetailBody.innerHTML = `

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

  if (progressIssues) {
    progressIssues.innerHTML = `

            <div class="workflow-table-empty">

                Đăng nhập để xem dữ liệu.

            </div>

        `;
  }
}

// ======================================================
// 23. TÍNH %
// ======================================================

function calculatePercent(completed, total) {
  const safeCompleted = numberValue(completed);

  const safeTotal = numberValue(total);

  if (safeTotal <= 0) {
    return 0;
  }

  return clampPercent((safeCompleted / safeTotal) * 100);
}

// ======================================================
// 24. CLAMP %
// ======================================================

function clampPercent(value) {
  return Math.min(
    100,

    Math.max(
      0,

      numberValue(value),
    ),
  );
}

// ======================================================
// 25. NUMBER
// ======================================================

function numberValue(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(0, number);
}

// ======================================================
// 26. INTEGER
// ======================================================

function integerValue(value) {
  return Math.floor(numberValue(value));
}

// ======================================================
// 27. FORMAT SỐ
// ======================================================

function formatNumber(value, digits = 1) {
  return new Intl.NumberFormat(
    "vi-VN",

    {
      minimumFractionDigits: 0,

      maximumFractionDigits: digits,
    },
  ).format(numberValue(value));
}

// ======================================================
// 28. MÀU BADGE
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
// 29. SET TEXT
// ======================================================

function setText(element, value) {
  if (!element) {
    return;
  }

  element.textContent = value;
}

// ======================================================
// 30. ESCAPE HTML
// ======================================================

function escapeHtmlText(value) {
  const div = document.createElement("div");

  div.textContent = value ?? "";

  return div.innerHTML;
}
// ======================================================
// FORMAT DIỆN TÍCH
// ======================================================

function formatArea(valueM2) {
  const value = numberValue(valueM2);

  if (value >= 10000) {
    return formatNumber(value / 10000, 2) + " ha";
  }

  return formatNumber(value, 2) + " m²";
}

// ======================================================
// FORMAT TIỀN
// ======================================================

function formatMoneyVnd(value) {
  const vnd = numberValue(value);

  const million = vnd / 1000000;

  if (million >= 1000) {
    return formatNumber(million / 1000, 2) + " tỷ đồng";
  }

  return formatNumber(million, 2) + " triệu đồng";
}
