import { db, auth } from "./firebase-config.js";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

window.logoutUser = function () {
  signOut(auth).then(() => {
    window.location.reload();
  });
};

Chart.register(ChartDataLabels);
let scanChart, clChart, pmChart, trendChart, currentStepChart;
let allLogs = [];
let currentFilteredLogs = []; // Lưu trữ các mốc ngày của riêng đợt đang chọn
let debounceTimer; // Bộ đếm thời gian trễ phục vụ thao tác kéo slider

function checkUserStatus() {
  onAuthStateChanged(auth, async (user) => {
    const nameContainer = document.getElementById("admin-name");
    const adminLink = document.getElementById("btn-admin-link");
    const dropdownArea = document.getElementById("user-dropdown-area");
    const dropdownAdminBtn = document.getElementById("dropdown-admin-btn");

    if (user) {
      // Đã đăng nhập: Ẩn nút "Đăng nhập", hiện "Menu tài khoản"
      if (adminLink) {
        adminLink.style.display = "none";
      }
      if (dropdownArea) {
        dropdownArea.style.setProperty("display", "block", "important");
      }
      // Hiển thị tạm email làm tên trong lúc chờ lấy dữ liệu Firestore
      if (nameContainer) {
        nameContainer.innerText = user.email;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          // Cập nhật họ tên đầy đủ nếu có
          if (userDoc.data().fullName && nameContainer) {
            nameContainer.innerText = userDoc.data().fullName;
          }

          // QUAN TRỌNG: Kiểm tra chính xác Role Admin
          if (userDoc.data().role === "admin") {
            if (dropdownAdminBtn) dropdownAdminBtn.style.display = "flex";
          } else {
            // Nếu là tài khoản nhập liệu thì giấu quyền quản trị đi
            if (dropdownAdminBtn) dropdownAdminBtn.style.display = "none";
          }
        }
      } catch (error) {
        console.error("Lỗi lấy thông tin User:", error);
      }
    } else {
      // Chưa đăng nhập: Hiện nút "Đăng nhập", ẩn Menu
      if (dropdownArea) {
        dropdownArea.style.display = "none";
      }
      if (adminLink) {
        adminLink.href = "login.html";
        adminLink.innerHTML = "<i class='fa-solid fa-arrow-right-to-bracket'></i> Đăng nhập";
        adminLink.style.display = "inline-flex";
      }
    }
  });
}

function loadDashboardData() {
  checkUserStatus();

  const historyQuery = query(
    collection(db, "progress_history"),
    orderBy("timestamp", "asc"),
  );

  onSnapshot(historyQuery, (querySnapshot) => {
    allLogs = [];
    const campaignSet = new Set();

    querySnapshot.forEach((docSnap) => {
      const log = docSnap.data();
      log.id = docSnap.id;
      allLogs.push(log);
      if (log.campaignName) campaignSet.add(log.campaignName);
    });

    const selectBox = document.getElementById("select-campaign");
    if (!selectBox) return;
    const currentSelection = selectBox.value;
    selectBox.innerHTML = "";

    if (campaignSet.size === 0) {
      selectBox.innerHTML = "<option value=''>Chưa có đợt dữ liệu nào</option>";
      return;
    }

    campaignSet.forEach((camp) => {
      const opt = document.createElement("option");
      opt.value = camp;
      opt.innerText = camp;
      selectBox.appendChild(opt);
    });

    if (currentSelection && campaignSet.has(currentSelection)) {
      selectBox.value = currentSelection;
    } else {
      selectBox.value = Array.from(campaignSet).pop();
    }

    setupCampaignView(selectBox.value);
  });

  document.getElementById("select-campaign").addEventListener("change", (e) => {
    setupCampaignView(e.target.value);
  });

  // ĐỒNG BỘ: ĐƯA BỘ LẮNG NGHE KHỞI TẠO RA VÙNG TOÀN CỤC AN TOÀN NHẤT
  const slider = document.getElementById("timelineRange");
  if (slider) {
    slider.addEventListener("input", (e) => {
      const index = parseInt(e.target.value);
      if (!currentFilteredLogs || !currentFilteredLogs[index]) return;

      const selectedLog = currentFilteredLogs[index];
      const isLatest = index === currentFilteredLogs.length - 1;

      // Cập nhật nhãn thời gian phản hồi tức thì để người dùng biết đang kéo đến ngày nào
      const statusTxt = document.getElementById("txt-slider-date-status");
      if (statusTxt) {
        statusTxt.innerText = `Đang xem ngày: ${selectedLog.dateLabel} ${isLatest ? "(Mới nhất)" : "(Cũ hơn)"}`;
      }

      // Cơ chế hoãn (Debounce) mượt mà: Dừng hẳn kéo sau 400ms mới dựng lại dữ liệu
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        renderStateData(selectedLog);
      }, 400);
    });
  }
}

function setupCampaignView(campaignName) {
  if (!campaignName) return;

  // Lọc danh sách mốc lịch sử báo cáo của đợt được chọn
  currentFilteredLogs = allLogs.filter(
    (log) => log.campaignName === campaignName,
  );
  if (currentFilteredLogs.length === 0) return;

  // Cấu hình thanh trượt dựa theo số lượng mốc ghi nhận thực tế
  const slider = document.getElementById("timelineRange");
  if (slider) {
    const totalSteps = currentFilteredLogs.length - 1;
    slider.min = 0;
    slider.max = totalSteps;
    slider.value = totalSteps;
    slider.disabled = totalSteps <= 0;

    const txtStart = document.getElementById("txt-slider-start");
    const txtEnd = document.getElementById("txt-slider-end");
    const txtStatus = document.getElementById("txt-slider-date-status");

    if (txtStart)
      txtStart.innerText = `Bắt đầu (${currentFilteredLogs[0].dateLabel})`;
    if (txtEnd)
      txtEnd.innerText = `Mới nhất (${currentFilteredLogs[totalSteps].dateLabel})`;
    if (txtStatus)
      txtStatus.innerText = `Đang xem: Mới nhất (${currentFilteredLogs[totalSteps].dateLabel})`;

    // --- ĐOẠN MÃ TỰ ĐỘNG VẼ CÁC VẠCH ĐIỂM ĐÁNH DẤU CHO TỪNG KỲ BÁO CÁO ---
    const datalist = document.getElementById("timeline-ticks");
    if (datalist) {
      datalist.innerHTML = ""; // Xóa các mốc cũ đi để vẽ mốc mới của đợt này
      currentFilteredLogs.forEach((log, index) => {
        const option = document.createElement("option");
        option.value = index;
        option.label = log.dateLabel; // Hiển thị nhãn ngày khi rê chuột vào mốc
        datalist.appendChild(option);
      });
    }
    // -----------------------------------------------------------------
  }

  // Vẽ biểu đồ xu hướng đường dưới cùng trước (Biểu đồ này hiển thị cố định toàn đợt)
  const labels = currentFilteredLogs.map((l) => l.dateLabel || "");
  const scans = currentFilteredLogs.map((l) => l.soHoaDaScan || 0);
  const chuẩnHoas = currentFilteredLogs.map((l) => l.soHoaChuanHoa || 0);
  const phanMems = currentFilteredLogs.map((l) => l.soHoaPhanMem || 0);
  const chinhLys = currentFilteredLogs.map((l) => l.chinhLyDaXong || 0);
  updateTrendChart(labels, scans, chuẩnHoas, phanMems, chinhLys);

  // Đổ số liệu của bản ghi mới nhất lên các ô nhanh và 3 biểu đồ phía trên
  renderStateData(currentFilteredLogs[currentFilteredLogs.length - 1]);
}

// HÀM CHUYÊN TRÁCH ĐỔ SỐ LIỆU VÀ VẼ LẠI BIỂU ĐỒ THEO MỐC GHI NHẬN ĐƯỢC CHỌN
function renderStateData(logRecord) {
  if (!logRecord) return;

  // Đồng bộ trạng thái 9 bước quy trình
  const currentStep = logRecord.currentStep || 0;
  renderWorkflowSteps(currentStep);

  const tongMet = logRecord.tongChinhLy || 0;
  const tongTrang = logRecord.tongSoCanScan || 0;

  const txtTenDot = document.getElementById("show-ten-dot");
  const txtTongMet = document.getElementById("show-tong-met");
  const txtTongTrang = document.getElementById("show-tong-trang");

  if (txtTenDot) txtTenDot.innerText = logRecord.campaignName || "";
  if (txtTongMet) txtTongMet.innerText = tongMet;
  if (txtTongTrang) txtTongTrang.innerText = tongTrang.toLocaleString();

  // -------------------------------------------------------------
  // ĐỌC VÀ TÍNH TOÁN SỐ LIỆU CHI TIẾT CHO CHỈ TIÊU & 9 BƯỚC QUY TRÌNH
  // -------------------------------------------------------------

  // Thẻ Chỉnh lý mét
  const clXong = Number(logRecord.chinhLyDaXong || 0);
  const clConLai = tongMet - clXong;
  const clPercent = tongMet > 0 ? ((clXong / tongMet) * 100).toFixed(1) : 0;
  if (document.getElementById("cl-da-xong"))
    document.getElementById("cl-da-xong").innerText = clXong;
  if (document.getElementById("cl-con-lai"))
    document.getElementById("cl-con-lai").innerText =
      clConLai > 0 ? clConLai.toFixed(1) : 0;
  if (document.getElementById("cl-xong-percent"))
    document.getElementById("cl-xong-percent").innerText = clPercent;
  if (document.getElementById("bar-cl-xong"))
    document.getElementById("bar-cl-xong").style.width = clPercent + "%";

  // Bước 1: Scan tài liệu
  const shScan = Number(logRecord.soHoaDaScan || 0);
  const scanConLai = tongTrang - shScan;
  const scanPercent =
    tongTrang > 0 ? ((shScan / tongTrang) * 100).toFixed(1) : 0;
  if (document.getElementById("sh-da-scan"))
    document.getElementById("sh-da-scan").innerText = shScan.toLocaleString();
  if (document.getElementById("sh-scan-conlai"))
    document.getElementById("sh-scan-conlai").innerText =
      scanConLai > 0 ? scanConLai.toLocaleString() : 0;
  if (document.getElementById("sh-scan-percent"))
    document.getElementById("sh-scan-percent").innerText = scanPercent;
  if (document.getElementById("bar-sh-scan"))
    document.getElementById("bar-sh-scan").style.width = scanPercent + "%";

  // Bước 2: Cắt file & Biên mục hồ sơ
  const shBienMuc = Number(logRecord.soHoaBienMuc || 0);
  const bienMucConLai = tongTrang - shBienMuc;
  const bienMucPercent =
    tongTrang > 0 ? ((shBienMuc / tongTrang) * 100).toFixed(1) : 0;
  if (document.getElementById("sh-da-bienmuc"))
    document.getElementById("sh-da-bienmuc").innerText =
      shBienMuc.toLocaleString();
  if (document.getElementById("sh-bienmuc-conlai"))
    document.getElementById("sh-bienmuc-conlai").innerText =
      bienMucConLai > 0 ? bienMucConLai.toLocaleString() : 0;
  if (document.getElementById("sh-bienmuc-percent"))
    document.getElementById("sh-bienmuc-percent").innerText = bienMucPercent;
  if (document.getElementById("bar-sh-bienmuc"))
    document.getElementById("bar-sh-bienmuc").style.width =
      bienMucPercent + "%";

  // Bước 3: Chuẩn hóa dữ liệu[cite: 1]
  const shChuanHoa = Number(logRecord.soHoaChuanHoa || 0);
  const chuanHoaPercent =
    tongTrang > 0 ? ((shChuanHoa / tongTrang) * 100).toFixed(1) : 0;
  const chuanhoaConLai = tongTrang - shChuanHoa;
  if (document.getElementById("sh-chuan-hoa"))
    document.getElementById("sh-chuan-hoa").innerText =
      shChuanHoa.toLocaleString();
  if (document.getElementById("sh-chuanhoa-percent"))
    document.getElementById("sh-chuanhoa-percent").innerText = chuanHoaPercent;
  if (document.getElementById("bar-sh-chuanhoa"))
    document.getElementById("bar-sh-chuanhoa").style.width =
      chuanHoaPercent + "%";
  if (document.getElementById("sh-chuanhoa-conlai"))
    document.getElementById("sh-chuanhoa-conlai").innerText =
      chuanhoaConLai > 0 ? chuanhoaConLai.toLocaleString() : 0;

  // Bước 4: Hiệu chỉnh dữ liệu[cite: 1]
  const shHieuChinh = Number(logRecord.soHoaHieuChinh || 0);
  const hieuChinhConLai = tongTrang - shHieuChinh;
  const hieuChinhPercent =
    tongTrang > 0 ? ((shHieuChinh / tongTrang) * 100).toFixed(1) : 0;
  if (document.getElementById("sh-da-hieuchinh"))
    document.getElementById("sh-da-hieuchinh").innerText =
      shHieuChinh.toLocaleString();
  if (document.getElementById("sh-hieuchinh-conlai"))
    document.getElementById("sh-hieuchinh-conlai").innerText =
      hieuChinhConLai > 0 ? hieuChinhConLai.toLocaleString() : 0;
  if (document.getElementById("sh-hieuchinh-percent"))
    document.getElementById("sh-hieuchinh-percent").innerText =
      hieuChinhPercent;
  if (document.getElementById("bar-sh-hieuchinh"))
    document.getElementById("bar-sh-hieuchinh").style.width =
      hieuChinhPercent + "%";

  // Bước 5: Chuyển đổi PDF 2 lớp[cite: 1]
  const shPdf2Lop = Number(logRecord.soHoaPdf2Lop || 0);
  const pdf2LopConLai = tongTrang - shPdf2Lop;
  const pdf2LopPercent =
    tongTrang > 0 ? ((shPdf2Lop / tongTrang) * 100).toFixed(1) : 0;
  if (document.getElementById("sh-da-pdf2lop"))
    document.getElementById("sh-da-pdf2lop").innerText =
      shPdf2Lop.toLocaleString();
  if (document.getElementById("sh-pdf2lop-conlai"))
    document.getElementById("sh-pdf2lop-conlai").innerText =
      pdf2LopConLai > 0 ? pdf2LopConLai.toLocaleString() : 0;
  if (document.getElementById("sh-pdf2lop-percent"))
    document.getElementById("sh-pdf2lop-percent").innerText = pdf2LopPercent;
  if (document.getElementById("bar-sh-pdf2lop"))
    document.getElementById("bar-sh-pdf2lop").style.width =
      pdf2LopPercent + "%";

  // Bước 6: Ký số hồ sơ[cite: 1]
  const shKySo = Number(logRecord.soHoaKySo || 0);
  const kySoConLai = tongTrang - shKySo;
  const kySoPercent =
    tongTrang > 0 ? ((shKySo / tongTrang) * 100).toFixed(1) : 0;
  if (document.getElementById("sh-da-kyso"))
    document.getElementById("sh-da-kyso").innerText = shKySo.toLocaleString();
  if (document.getElementById("sh-kyso-conlai"))
    document.getElementById("sh-kyso-conlai").innerText =
      kySoConLai > 0 ? kySoConLai.toLocaleString() : 0;
  if (document.getElementById("sh-kyso-percent"))
    document.getElementById("sh-kyso-percent").innerText = kySoPercent;
  if (document.getElementById("bar-sh-kyso"))
    document.getElementById("bar-sh-kyso").style.width = kySoPercent + "%";

  // Bước 7: Hoàn chỉnh & nén dữ liệu[cite: 1]
  const shNenDuLieu = Number(logRecord.soHoaNenDuLieu || 0);
  const nenDuLieuConLai = tongTrang - shNenDuLieu;
  const nenDuLieuPercent =
    tongTrang > 0 ? ((shNenDuLieu / tongTrang) * 100).toFixed(1) : 0;
  if (document.getElementById("sh-da-nendulieu"))
    document.getElementById("sh-da-nendulieu").innerText =
      shNenDuLieu.toLocaleString();
  if (document.getElementById("sh-nendulieu-conlai"))
    document.getElementById("sh-nendulieu-conlai").innerText =
      nenDuLieuConLai > 0 ? nenDuLieuConLai.toLocaleString() : 0;
  if (document.getElementById("sh-nendulieu-percent"))
    document.getElementById("sh-nendulieu-percent").innerText =
      nenDuLieuPercent;
  if (document.getElementById("bar-sh-nendulieu"))
    document.getElementById("bar-sh-nendulieu").style.width =
      nenDuLieuPercent + "%";

  // Bước 8: Đã đưa lên phần mềm[cite: 1]
  const shPhanMem = Number(logRecord.soHoaPhanMem || 0);
  const pmConLai = tongTrang - shPhanMem;
  const pmPercent =
    tongTrang > 0 ? ((shPhanMem / tongTrang) * 100).toFixed(1) : 0;
  if (document.getElementById("sh-len-phan-mem"))
    document.getElementById("sh-len-phan-mem").innerText =
      shPhanMem.toLocaleString();
  if (document.getElementById("sh-pm-percent"))
    document.getElementById("sh-pm-percent").innerText = pmPercent;
  if (document.getElementById("sh-pm-conlai"))
    document.getElementById("sh-pm-conlai").innerText =
      pmConLai > 0 ? pmConLai.toLocaleString() : 0;
  if (document.getElementById("bar-sh-pm"))
    document.getElementById("bar-sh-pm").style.width = pmPercent + "%";

  // Bước 9: Bàn giao sản phẩm[cite: 1]
  const shBanGiao = Number(logRecord.soHoaBanGiao || 0);
  const banGiaoConLai = tongTrang - shBanGiao;
  const banGiaoPercent =
    tongTrang > 0 ? ((shBanGiao / tongTrang) * 100).toFixed(1) : 0;
  if (document.getElementById("sh-da-bangiao"))
    document.getElementById("sh-da-bangiao").innerText =
      shBanGiao.toLocaleString();
  if (document.getElementById("sh-bangiao-conlai"))
    document.getElementById("sh-bangiao-conlai").innerText =
      banGiaoConLai > 0 ? banGiaoConLai.toLocaleString() : 0;
  if (document.getElementById("sh-bangiao-percent"))
    document.getElementById("sh-bangiao-percent").innerText = banGiaoPercent;
  if (document.getElementById("bar-sh-bangiao"))
    document.getElementById("bar-sh-bangiao").style.width =
      banGiaoPercent + "%";

  // Làm mới cấu trúc đồ họa hiển thị của 3 biểu đồ khuyên trên theo ngày đang chọn
  updateStaticCharts(logRecord, tongMet, tongTrang);
}

function updateStaticCharts(data, tongMet, tongTrang) {
  const ctxScan = document.getElementById("scanChart")?.getContext("2d");
  const ctxCl = document.getElementById("clChart")?.getContext("2d");
  const ctxPm = document.getElementById("pmChart")?.getContext("2d");
  const ctxCurrentStep = document
    .getElementById("currentStepChart")
    ?.getContext("2d"); // Biểu đồ nhẫn mới[cite: 1]

  if (!ctxScan || !ctxCl) return;

  if (scanChart) scanChart.destroy();
  if (clChart) clChart.destroy();
  if (pmChart) pmChart.destroy();
  if (currentStepChart) currentStepChart.destroy(); // Làm sạch biểu đồ nhẫn cũ nếu có[cite: 1]

  // 1. BIỂU ĐỒ 9 BƯỚC: DẠNG CỘT NGANG ĐA NĂNG THU NHỎ[cite: 1]
  scanChart = new Chart(ctxScan, {
    type: "bar",
    data: {
      labels: [
        "B1: Scan",
        "B2: Biên mục",
        "B3: Chuẩn hóa",
        "B4: Hiệu chỉnh",
        "B5: PDF 2 lớp",
        "B6: Ký số",
        "B7: Nén DL",
        "B8: Lên PM",
        "B9: Bàn giao",
      ],
      datasets: [
        {
          label: "Thực tế thực hiện (Trang)",
          data: [
            data.soHoaDaScan || 0,
            data.soHoaBienMuc || 0,
            data.soHoaChuanHoa || 0,
            data.soHoaHieuChinh || 0,
            data.soHoaPdf2Lop || 0,
            data.soHoaKySo || 0,
            data.soHoaNenDuLieu || 0,
            data.soHoaPhanMem || 0,
            data.soHoaBanGiao || 0,
          ],
          backgroundColor: [
            "#2ecc71",
            "#06b6d4",
            "#9b59b6",
            "#ec4899",
            "#ef4444",
            "#14b8a6",
            "#f59e0b",
            "#e67e22",
            "#10b981",
          ],
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          beginAtZero: true,
          max: tongTrang > 0 ? tongTrang : undefined,
          ticks: { font: { size: 9.5 }, maxRotation: 0 },
        },
        y: {
          grid: { display: false },
          ticks: { font: { size: 9.5, weight: "600" } },
        },
      },
      plugins: {
        legend: { display: false },
        datalabels: {
          anchor: "end",
          align: "right",
          formatter: (v) => (v > 0 ? v.toLocaleString() : "0"),
          font: { weight: "bold", size: 9.5 },
          color: "#334155",
        },
      },
      layout: {
        padding: { top: 5, bottom: 5, left: 0, right: 35 },
      },
    },
  });

  // 2. BIỂU ĐỒ NHẪN DOUGHNUT: TIẾN ĐỘ RIÊNG CỦA BƯỚC ĐANG THỰC HIỆN (THÊM MỚI)[cite: 1]
  if (ctxCurrentStep) {
    const stepNum = data.currentStep || 0;
    const stepsNameMapping = [
      "Chưa bắt đầu",
      "B1: Scan tài liệu",
      "B2: Cắt file & biên mục",
      "B3: Chuẩn hóa dữ liệu",
      "B4: Hiệu chỉnh dữ liệu",
      "B5: Chuyển đổi PDF 2 lớp",
      "B6: Ký số tài liệu",
      "B7: Hoàn chỉnh & nén dữ liệu",
      "B8: Cập nhật lên phần mềm",
      "B9: Bàn giao sản phẩm",
    ];

    // Tự động đổi tiêu đề hộp biểu đồ theo tên khâu đang chạy thực tế[cite: 1]
    const titleContainer = document.getElementById("current-step-chart-title");
    if (titleContainer) {
      titleContainer.innerText =
        stepNum > 0
          ? `Tiến độ ${stepsNameMapping[stepNum]}`
          : "Tiến độ Bước Hiện tại";
    }

    // Bóc tách chính xác số liệu của khâu đang chạy[cite: 1]
    let currentStepVolume = 0;
    if (stepNum === 1) currentStepVolume = data.soHoaDaScan || 0;
    else if (stepNum === 2) currentStepVolume = data.soHoaBienMuc || 0;
    else if (stepNum === 3) currentStepVolume = data.soHoaChuanHoa || 0;
    else if (stepNum === 4) currentStepVolume = data.soHoaHieuChinh || 0;
    else if (stepNum === 5) currentStepVolume = data.soHoaPdf2Lop || 0;
    else if (stepNum === 6) currentStepVolume = data.soHoaKySo || 0;
    else if (stepNum === 7) currentStepVolume = data.soHoaNenDuLieu || 0;
    else if (stepNum === 8) currentStepVolume = data.soHoaPhanMem || 0;
    else if (stepNum === 9) currentStepVolume = data.soHoaBanGiao || 0;

    const remainderVolume =
      tongTrang - currentStepVolume > 0 ? tongTrang - currentStepVolume : 0;

    currentStepChart = new Chart(ctxCurrentStep, {
      type: "doughnut",
      data: {
        labels: ["Đã đạt", "Chưa đạt"],
        datasets: [
          {
            data: [currentStepVolume, remainderVolume],
            backgroundColor: ["#0056b3", "#e2e8f0"], // Màu xanh dương đậm làm chủ đạo cho khâu hành tiến[cite: 1]
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        radius: "100%",
        cutout: "70%", // Độ mỏng mượt tinh tế của vòng nhẫn[cite: 1]
        plugins: {
          legend: { display: false },
          datalabels: {
            formatter: (value) => {
              let total = currentStepVolume + remainderVolume;
              return total > 0
                ? ((value / total) * 100).toFixed(1) + "%"
                : "0%";
            },
            color: (context) =>
              context.dataIndex === 0 ? "#ffffff" : "#475569",
            font: { weight: "bold", size: 10 },
          },
        },
      },
    });
  }

  // 3. BIỂU ĐỒ TRÒN: TỶ LỆ CHỈNH LÝ MÉT TÀI LIỆU (GIỮ NGUYÊN)
  const clXong = data.chinhLyDaXong || 0;
  const clConLai = tongMet - clXong;
  clChart = new Chart(ctxCl, {
    type: "pie",
    data: {
      labels: ["Còn lại sơ bộ", "Đã chỉnh lý xong"],
      datasets: [
        {
          data: [clConLai > 0 ? clConLai : 0, clXong],
          backgroundColor: ["#f27a1a", "#2b78e4"],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      radius: "100%",
      plugins: {
        legend: { display: false },
        datalabels: {
          formatter: (value) => {
            let total = clXong + (clConLai > 0 ? clConLai : 0);
            return total > 0 ? ((value / total) * 100).toFixed(1) + "%" : "0%";
          },
          color: "#ffffff",
          font: { weight: "bold", size: 12 },
        },
      },
    },
  });

  // 4. BIỂU ĐỒ DOUGHNUT: TỶ LỆ ĐƯA LÊN PHẦN MỀM TỔNG THỂ (GIỮ NGUYÊN)
  if (ctxPm) {
    const pmXong = data.soHoaPhanMem || 0;
    const pmConLai = tongTrang - pmXong;
    pmChart = new Chart(ctxPm, {
      type: "doughnut",
      data: {
        labels: ["Đã đưa lên PM", "Chưa đưa lên"],
        datasets: [
          {
            data: [pmXong, pmConLai > 0 ? pmConLai : 0],
            backgroundColor: ["#16a34a", "#cbd5e1"],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        radius: "100%",
        cutout: "65%",
        plugins: {
          legend: { display: false },
          datalabels: {
            formatter: (value) => {
              let total = pmXong + (pmConLai > 0 ? pmConLai : 0);
              return total > 0
                ? ((value / total) * 100).toFixed(1) + "%"
                : "0%";
            },
            color: (context) =>
              context.dataIndex === 0 ? "#ffffff" : "#475569",
            font: { weight: "bold", size: 11 },
          },
        },
      },
    });
  }
}

function updateTrendChart(labels, scans, chuẩnHoas, phanMems, chinhLys) {
  const ctxTrend = document.getElementById("trendChart")?.getContext("2d");
  if (!ctxTrend) return;
  if (trendChart) trendChart.destroy();

  trendChart = new Chart(ctxTrend, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Đã Scan (Trang)",
          data: scans,
          borderColor: "#2ecc71",
          tension: 0.2,
          yAxisID: "y",
        },
        {
          label: "Chuẩn hóa (Trang)",
          data: chuẩnHoas,
          borderColor: "#9b59b6",
          tension: 0.2,
          yAxisID: "y",
        },
        {
          label: "Lên PM (Trang)",
          data: phanMems,
          borderColor: "#e67e22",
          tension: 0.2,
          yAxisID: "y",
        },
        {
          label: "Chỉnh lý (Mét)",
          data: chinhLys,
          borderColor: "#2b78e4",
          tension: 0.2,
          yAxisID: "y1",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          type: "linear",
          position: "left",
          title: { display: true, text: "Số lượng Trang" },
          min: 0,
          max: 450000,
          ticks: {
            stepSize: 50000,
            font: { size: 11 },
          },
          // ĐIỀU CHỈNH ĐẬM ĐƯỜNG KẺ NGANG:
          grid: {
            color: "#cbd5e1", // Đổi sang màu xám đậm giúp đường kẻ ngang rõ nét tuyệt đối
            lineWidth: 1, // Độ dày đường kẻ (để 1 là vừa vặn, không bị thô)
          },
        },
        y1: {
          type: "linear",
          position: "right",
          title: { display: true, text: "Số lượng Mét" },
          min: 0,
          max: 180,
          grid: {
            drawOnChartArea: false, // Giữ nguyên ẩn lưới phụ để không bị đè rối mắt
          },
          ticks: {
            stepSize: 20,
            font: { size: 11 },
          },
        },
      },
      plugins: {
        legend: { position: "bottom" },
        datalabels: { display: false },
      },
    },
  });
}
document.addEventListener("DOMContentLoaded", loadDashboardData);
// HÀM VẼ VÀ ĐỒNG BỘ TIẾN TRÌNH 9 BƯỚC LÊN TRANG CHỦ
function renderWorkflowSteps(currentStep) {
  const container = document.getElementById("workflow-timeline");
  if (!container) return;
  container.innerHTML = "";

  const stepsList = [
    "Scan tài liệu",
    "Cắt file & biên mục",
    "Chuẩn hóa dữ liệu",
    "Hiệu chỉnh dữ liệu",
    "Chuyển đổi PDF 2 lớp",
    "Ký số tài liệu",
    "Hoàn chỉnh, nén dữ liệu",
    "Cập nhật lên phần mềm",
    "Hoàn chỉnh & bàn giao",
  ];

  stepsList.forEach((stepName, index) => {
    const stepNum = index + 1;
    let statusClass = ""; // Chưa thực hiện
    let iconHTML = `<i class="fa-regular fa-circle"></i>`;

    if (stepNum < currentStep) {
      // 1. Bước đã thực hiện xong
      statusClass = "step-completed";
      iconHTML = `<i class="fa-solid fa-circle-check"></i>`;
    } else if (stepNum === currentStep) {
      // 2. Bước đang thực hiện
      statusClass = "step-active";
      iconHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
    } else {
      // 3. Bước chưa thực hiện
      statusClass = "step-waiting";
      iconHTML = `<i class="fa-regular fa-circle" style="opacity: 0.5;"></i>`;
    }

    const stepDiv = document.createElement("div");
    stepDiv.className = `workflow-step ${statusClass}`;
    stepDiv.innerHTML = `
      <div class="step-icon-box" title="Bước ${stepNum}">
        ${iconHTML}
      </div>
      <div class="step-name">B${stepNum}: ${stepName}</div>
    `;
    container.appendChild(stepDiv);
  });
}
// KHỐI LOGIC ĐIỀU KHIỂN HIỆU ỨNG TRƯỢT NGANG CAROUSEL SỐ LIỆU
function initCarouselSlider() {
  const track = document.getElementById("cards-track");
  const slideLeftBtn = document.getElementById("slide-left-btn");
  const slideRightBtn = document.getElementById("slide-right-btn");
  const wrapper = document.getElementById("cards-carousel-wrapper");

  if (!track || !slideLeftBtn || !slideRightBtn || !wrapper) return;

  let currentTranslateX = 0;
  const cardWidth = 270; // 250px chiều rộng Card + 20px Gap khoảng cách giữa các Card

  // Xử lý sự kiện trượt sang phải (Xem thêm bước sau)
  slideRightBtn.addEventListener("click", () => {
    const maxScroll = track.scrollWidth - wrapper.clientWidth;
    if (Math.abs(currentTranslateX) < maxScroll) {
      currentTranslateX -= cardWidth;
      // Không để trượt quá giới hạn cuối cùng
      if (Math.abs(currentTranslateX) > maxScroll) {
        currentTranslateX = -maxScroll;
      }
      track.style.transform = `translateX(${currentTranslateX}px)`;
    }
  });

  // Xử lý sự kiện trượt sang trái (Quay lại các bước trước)
  slideLeftBtn.addEventListener("click", () => {
    if (currentTranslateX < 0) {
      currentTranslateX += cardWidth;
      // Không để trượt quá mốc xuất phát ban đầu
      if (currentTranslateX > 0) {
        currentTranslateX = 0;
      }
      track.style.transform = `translateX(${currentTranslateX}px)`;
    }
  });
}

// Gọi khởi chạy Carousel sau khi DOM đã sẵn sàng
document.addEventListener("DOMContentLoaded", () => {
  // Thêm một khoảng trễ nhỏ để dữ liệu Firebase kịp tải và sinh bố cục rồi mới chạy Slider
  setTimeout(initCarouselSlider, 1000);
});
