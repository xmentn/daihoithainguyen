// ======================================================
// APP.JS
//
// DASHBOARD TRANG CHỦ
//
// - Danh mục giai đoạn lấy từ projectPhases
// - Dữ liệu tiến độ lấy từ collectionGroup "phases"
// - Chỉ tổng hợp các giai đoạn đang hoạt động
// - Không viết cứng phase1 / phase2 / phase3
//
// ======================================================

import { auth, db } from "./firebase-config.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

import {
  collection,
  collectionGroup,
  query,
  where,
  orderBy,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// ======================================================
// 1. BIẾN DÙNG CHUNG
// ======================================================

// Danh sách giai đoạn lấy từ Firestore
let projectPhases = [];

// Dữ liệu tổng hợp
let phaseData = {
  all: createEmptyData(),
};

// ======================================================
// 2. HTML
// ======================================================

const phaseSelect = document.getElementById("phaseSelect");

const phaseCards = document.getElementById("phaseCards");

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
      console.log("Dashboard: chưa đăng nhập.");

      resetDashboard();

      return;
    }

    // ==================================================
    // ĐÃ ĐĂNG NHẬP
    // ==================================================

    console.log("Dashboard: đang tải dữ liệu Firestore...");

    await loadDashboard();
  },
);

// ======================================================
// 4. TẢI TOÀN BỘ DASHBOARD
// ======================================================

async function loadDashboard() {
  try {
    // ==================================================
    // BƯỚC A:
    // TẢI DANH MỤC GIAI ĐOẠN
    // ==================================================

    await loadProjectPhases();

    // ==================================================
    // BƯỚC B:
    // TẢI SỐ LIỆU TIẾN ĐỘ
    // ==================================================

    await loadProgressData();

    // ==================================================
    // BƯỚC C:
    // HIỂN THỊ
    // ==================================================

    renderDashboard(phaseSelect.value);

    renderPhaseCards();

    console.log("Đã tải Dashboard hoàn chỉnh.");
  } catch (error) {
    console.error("Lỗi tải Dashboard:", error);

    resetDashboard();
  }
}

// ======================================================
// 5. TẢI DANH MỤC GIAI ĐOẠN
//
// projectPhases
// ======================================================

async function loadProjectPhases() {
  const phaseQuery = query(
    collection(db, "projectPhases"),

    where("active", "==", true),

    orderBy("order", "asc"),
  );

  const snapshot = await getDocs(phaseQuery);

  projectPhases = [];

  snapshot.forEach(function (documentSnapshot) {
    const data = documentSnapshot.data();

    projectPhases.push({
      id: documentSnapshot.id,

      name: data.name || documentSnapshot.id,

      code: data.code || documentSnapshot.id,

      order: Number(data.order) || 0,
    });
  });

  console.log("Danh mục giai đoạn:", projectPhases);

  // ==================================================
  // TẠO OBJECT DỮ LIỆU
  // ==================================================

  phaseData = {
    all: createEmptyData(),
  };

  projectPhases.forEach(function (phase) {
    phaseData[phase.id] = createEmptyData();
  });

  // ==================================================
  // CẬP NHẬT SELECT
  // ==================================================

  renderPhaseSelect();
}

// ======================================================
// 6. HIỂN THỊ SELECT GIAI ĐOẠN
// ======================================================

function renderPhaseSelect() {
  if (!phaseSelect) {
    return;
  }

  const previousValue = phaseSelect.value || "all";

  let html = `

        <option value="all">
            Toàn bộ dự án
        </option>

    `;

  projectPhases.forEach(function (phase) {
    html += `

                <option
                    value="${escapeHtmlAttribute(phase.id)}"
                >
                    ${escapeHtmlText(phase.name)}
                </option>

            `;
  });

  phaseSelect.innerHTML = html;

  // ==================================================
  // GIỮ LỰA CHỌN CŨ NẾU VẪN CÒN
  // ==================================================

  const validValues = [
    "all",
    ...projectPhases.map(function (phase) {
      return phase.id;
    }),
  ];

  if (validValues.includes(previousValue)) {
    phaseSelect.value = previousValue;
  } else {
    phaseSelect.value = "all";
  }
}

// ======================================================
// 7. TẢI TOÀN BỘ DỮ LIỆU TIẾN ĐỘ
//
// progress/{unitId}/phases/{phaseId}
// ======================================================

async function loadProgressData() {
  const progressQuery = collectionGroup(db, "phases");

  const snapshot = await getDocs(progressQuery);

  console.log("Số bản ghi tiến độ:", snapshot.size);

  // Danh sách mã giai đoạn đang hoạt động
  const activePhaseIds = new Set(
    projectPhases.map(function (phase) {
      return phase.id;
    }),
  );

  snapshot.forEach(function (documentSnapshot) {
    // ==================================================
    // CHỈ NHẬN DỮ LIỆU NẰM TRONG progress/
    //
    // Phòng trường hợp sau này có collection
    // "phases" ở vị trí khác.
    // ==================================================

    const documentPath = documentSnapshot.ref.path;

    if (!documentPath.startsWith("progress/")) {
      return;
    }

    const data = documentSnapshot.data();

    const phaseId = data.phaseId || documentSnapshot.id;

    // ==================================================
    // BỎ QUA GIAI ĐOẠN ĐÃ NGỪNG SỬ DỤNG
    // ==================================================

    if (!activePhaseIds.has(phaseId)) {
      return;
    }

    // ==================================================
    // CỘNG VÀO GIAI ĐOẠN
    // ==================================================

    addProgressData(phaseData[phaseId], data);

    // ==================================================
    // CỘNG VÀO TOÀN BỘ DỰ ÁN
    // ==================================================

    addProgressData(phaseData.all, data);
  });

  console.log("Dữ liệu tổng hợp:", phaseData);
}

// ======================================================
// 8. OBJECT RỖNG
// ======================================================

function createEmptyData() {
  return {
    // Diện tích - m²
    totalAreaM2: 0,

    recoveredAreaM2: 0,

    // Chiều dài - km
    totalLengthKm: 0,

    deliveredLengthKm: 0,

    // Hộ dân / tổ chức
    totalHouseholds: 0,

    approvedHouseholds: 0,

    paidHouseholds: 0,

    handedOverHouseholds: 0,

    notAgreedHouseholds: 0,

    // Số bản ghi
    recordCount: 0,
  };
}

// ======================================================
// 9. CỘNG DỮ LIỆU
// ======================================================

function addProgressData(target, source) {
  if (!target) {
    return;
  }

  target.totalAreaM2 += numberValue(source.totalAreaM2);

  target.recoveredAreaM2 += numberValue(source.recoveredAreaM2);

  target.totalLengthKm += numberValue(source.totalLengthKm);

  target.deliveredLengthKm += numberValue(source.deliveredLengthKm);

  target.totalHouseholds += integerValue(source.totalHouseholds);

  target.approvedHouseholds += integerValue(source.approvedHouseholds);

  target.paidHouseholds += integerValue(source.paidHouseholds);

  target.handedOverHouseholds += integerValue(source.handedOverHouseholds);

  target.notAgreedHouseholds += integerValue(source.notAgreedHouseholds);

  target.recordCount++;
}

// ======================================================
// 10. HIỂN THỊ DASHBOARD
// ======================================================

function renderDashboard(phaseKey) {
  const data = phaseData[phaseKey] || createEmptyData();

  // ==================================================
  // DIỆN TÍCH
  // ==================================================

  const totalAreaHa = m2ToHa(data.totalAreaM2);

  const recoveredAreaHa = m2ToHa(data.recoveredAreaM2);

  const remainingAreaHa = Math.max(0, totalAreaHa - recoveredAreaHa);

  const areaRate = calculatePercent(recoveredAreaHa, totalAreaHa);

  setText("totalArea", formatNumber(totalAreaHa, 2));

  setText("recoveredArea", formatNumber(recoveredAreaHa, 2));

  setText("remainingArea", formatNumber(remainingAreaHa, 2));

  setText("areaPercent", formatNumber(areaRate, 1));

  setText("areaProgressText", formatNumber(areaRate, 1) + "%");

  setProgressWidth("areaProgressBar", areaRate);

  // ==================================================
  // CHIỀU DÀI
  // ==================================================

  const remainingLength = Math.max(
    0,
    data.totalLengthKm - data.deliveredLengthKm,
  );

  const lengthRate = calculatePercent(
    data.deliveredLengthKm,
    data.totalLengthKm,
  );

  setText("totalLength", formatNumber(data.totalLengthKm, 3));

  setText("deliveredLength", formatNumber(data.deliveredLengthKm, 3));

  setText("remainingLength", formatNumber(remainingLength, 3));

  setText("lengthPercent", formatNumber(lengthRate, 1));

  setText("lengthProgressText", formatNumber(lengthRate, 1) + "%");

  setProgressWidth("lengthProgressBar", lengthRate);

  // ==================================================
  // HỘ DÂN / TỔ CHỨC
  // ==================================================

  setText("totalHouseholds", formatNumber(data.totalHouseholds, 0));

  setText("approvedHouseholds", formatNumber(data.approvedHouseholds, 0));

  setText("paidHouseholds", formatNumber(data.paidHouseholds, 0));

  setText("handedOverHouseholds", formatNumber(data.handedOverHouseholds, 0));

  setText("notAgreedHouseholds", formatNumber(data.notAgreedHouseholds, 0));
}

// ======================================================
// 11. HIỂN THỊ CARD CÁC GIAI ĐOẠN
// ======================================================

function renderPhaseCards() {
  if (!phaseCards) {
    return;
  }

  // ==================================================
  // CHƯA CÓ GIAI ĐOẠN
  // ==================================================

  if (projectPhases.length === 0) {
    phaseCards.innerHTML = `

            <div class="phase-card">

                <div class="phase-note">
                    Chưa có giai đoạn đang hoạt động.
                </div>

            </div>

        `;

    return;
  }

  phaseCards.innerHTML = projectPhases
    .map(function (phase) {
      const data = phaseData[phase.id] || createEmptyData();

      const totalAreaHa = m2ToHa(data.totalAreaM2);

      const recoveredAreaHa = m2ToHa(data.recoveredAreaM2);

      const rate = calculatePercent(recoveredAreaHa, totalAreaHa);

      return `

                        <div class="phase-card">

                            <div class="phase-card-header">

                                <h3>
                                    ${escapeHtmlText(phase.name)}
                                </h3>

                            </div>


                            <div class="phase-percent">

                                <strong>
                                    ${formatNumber(rate, 1)}%
                                </strong>

                            </div>


                            <div class="progress">

                                <div
                                    class="progress-bar"
                                    style="width:${rate}%;">
                                </div>

                            </div>


                            <div class="phase-note">

                                Đã thu hồi

                                <strong>
                                    ${formatNumber(recoveredAreaHa, 2)}
                                </strong>

                                /

                                <strong>
                                    ${formatNumber(totalAreaHa, 2)}
                                </strong>

                                ha

                            </div>


                            <div class="phase-note">

                                ${
                                  data.recordCount > 0
                                    ? data.recordCount + " đơn vị đã có số liệu"
                                    : "Chưa có đơn vị nhập số liệu"
                                }

                            </div>

                        </div>

                    `;
    })
    .join("");
}

// ======================================================
// 12. KHI CHỌN GIAI ĐOẠN
// ======================================================

if (phaseSelect) {
  phaseSelect.addEventListener(
    "change",

    function () {
      renderDashboard(phaseSelect.value);
    },
  );
}

// ======================================================
// 13. RESET DASHBOARD
// ======================================================

function resetDashboard() {
  projectPhases = [];

  phaseData = {
    all: createEmptyData(),
  };

  if (phaseSelect) {
    phaseSelect.innerHTML = `

            <option value="all">
                Toàn bộ dự án
            </option>

        `;
  }

  renderDashboard("all");

  renderPhaseCards();
}

// ======================================================
// 14. M² → HA
// ======================================================

function m2ToHa(value) {
  return numberValue(value) / 10000;
}

// ======================================================
// 15. TÍNH %
// ======================================================

function calculatePercent(value, total) {
  if (!total || total <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, (value / total) * 100));
}

// ======================================================
// 16. NUMBER
// ======================================================

function numberValue(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return number;
}

function integerValue(value) {
  return Math.max(0, Math.floor(numberValue(value)));
}

// ======================================================
// 17. FORMAT SỐ
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
// 18. SET TEXT
// ======================================================

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}

// ======================================================
// 19. THANH TIẾN ĐỘ
// ======================================================

function setProgressWidth(id, percent) {
  const element = document.getElementById(id);

  if (element) {
    element.style.width = percent + "%";
  }
}

// ======================================================
// 20. AN TOÀN HTML
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
