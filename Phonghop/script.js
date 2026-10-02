import {
  db,
  auth,
  collection,
  doc,
  getDoc,
  onSnapshot,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "./firebase-config.js";

async function getAdminProfile(user) {
  if (!user) return null;

  try {
    const adminSnap = await getDoc(doc(db, "admins", user.uid));

    if (!adminSnap.exists()) return null;

    const adminData = adminSnap.data();
    if (adminData.active !== true) return null;

    return {
      uid: user.uid,
      name: String(adminData.name || "").trim() || "Quản trị viên",
    };
  } catch (error) {
    console.error("Lỗi kiểm tra quyền quản trị:", error);
    return null;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // --- ĐĂNG NHẬP & HIỂN THỊ TÀI KHOẢN QUẢN TRỊ ---
  const adminBtn = document.getElementById("admin-icon");
  const adminAccount = document.getElementById("admin-account");
  const goAdminBtn = document.getElementById("go-admin-btn");
  const homeLogoutBtn = document.getElementById("home-logout-btn");
  const loginModal = document.getElementById("login-modal");
  const closeLogin = document.getElementById("close-login");
  const submitLogin = document.getElementById("submit-login");
  const userIn = document.getElementById("username");
  const passIn = document.getElementById("password");
  const errorMsg = document.getElementById("login-error");

  let currentAdminUser = null;
  let currentAdminProfile = null;
  let authInitialized = false;
  let resolveAuthReady;

  const authReadyPromise = new Promise((resolve) => {
    resolveAuthReady = resolve;
  });

  function renderAdminAccount() {
    if (!adminBtn || !adminAccount) return;

    if (currentAdminUser && currentAdminProfile) {
      adminBtn.textContent = `👤 ${currentAdminProfile.name} ▾`;
      adminAccount.classList.add("is-logged-in");
      adminBtn.setAttribute(
        "aria-label",
        `Tài khoản ${currentAdminProfile.name}`,
      );
    } else {
      adminBtn.textContent = "🔐 Đăng nhập";
      adminAccount.classList.remove("is-logged-in");
      adminBtn.setAttribute("aria-label", "Đăng nhập quản trị");
    }
  }

  onAuthStateChanged(auth, async (user) => {
    currentAdminUser = null;
    currentAdminProfile = null;

    if (user) {
      const adminProfile = await getAdminProfile(user);

      if (adminProfile) {
        currentAdminUser = user;
        currentAdminProfile = adminProfile;
      } else {
        try {
          await signOut(auth);
        } catch (error) {
          console.error("Lỗi đăng xuất tài khoản không có quyền:", error);
        }
      }
    }

    renderAdminAccount();

    if (!authInitialized) {
      authInitialized = true;
      resolveAuthReady(currentAdminUser);
    }
  });

  if (adminBtn) {
    adminBtn.addEventListener("click", async () => {
      if (!authInitialized) {
        await authReadyPromise;
      }

      // Khi đã đăng nhập, dropdown được mở bằng hover/focus từ CSS.
      if (currentAdminUser && currentAdminProfile) return;

      if (loginModal) {
        loginModal.style.display = "flex";
        errorMsg.style.display = "none";
        setTimeout(() => userIn?.focus(), 0);
      }
    });
  }

  if (goAdminBtn) {
    goAdminBtn.addEventListener("click", () => {
      if (currentAdminUser && currentAdminProfile) {
        window.location.href = "admin.html";
      }
    });
  }

  if (homeLogoutBtn) {
    homeLogoutBtn.addEventListener("click", async () => {
      try {
        await signOut(auth);
        currentAdminUser = null;
        currentAdminProfile = null;
        renderAdminAccount();
      } catch (error) {
        console.error("Lỗi đăng xuất Firebase:", error);
      }
    });
  }

  if (closeLogin) {
    closeLogin.addEventListener("click", () => {
      loginModal.style.display = "none";
      errorMsg.style.display = "none";
    });
  }

  async function handleAdminLogin() {
    const email = userIn.value.trim();
    const password = passIn.value;

    errorMsg.style.display = "none";

    if (!email || !password) {
      errorMsg.textContent = "Vui lòng nhập đầy đủ tài khoản và mật khẩu!";
      errorMsg.style.display = "block";
      return;
    }

    submitLogin.textContent = "Đang xác thực...";
    submitLogin.disabled = true;

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const adminProfile = await getAdminProfile(userCredential.user);

      if (!adminProfile) {
        await signOut(auth);
        errorMsg.textContent =
          "Tài khoản này không có quyền quản trị hệ thống!";
        errorMsg.style.display = "block";
        return;
      }

      currentAdminUser = userCredential.user;
      currentAdminProfile = adminProfile;
      renderAdminAccount();

      submitLogin.style.backgroundColor = "#2ecc71";
      submitLogin.textContent = "Thành công!";

      setTimeout(() => {
        loginModal.style.display = "none";
        submitLogin.style.backgroundColor = "";
        submitLogin.textContent = "Đăng nhập";
        submitLogin.disabled = false;
        userIn.value = "";
        passIn.value = "";
      }, 500);
    } catch (error) {
      console.error("Lỗi đăng nhập Firebase:", error.code, error.message);
      errorMsg.textContent = "Tài khoản hoặc mật khẩu không chính xác!";
      errorMsg.style.display = "block";
    } finally {
      // Trường hợp thất bại hoặc không có quyền phải khôi phục nút ngay.
      if (submitLogin.textContent !== "Thành công!") {
        submitLogin.style.backgroundColor = "";
        submitLogin.textContent = "Đăng nhập";
        submitLogin.disabled = false;
      }
    }
  }

  if (submitLogin) {
    submitLogin.addEventListener("click", handleAdminLogin);
  }

  // Cho phép nhấn Enter trong ô mật khẩu để đăng nhập.
  if (passIn) {
    passIn.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleAdminLogin();
      }
    });
  }

  // --- KHÔI PHỤC ĐẦY ĐỦ 11 HÀNG GHẾ HỘI TRƯỜNG (TỪ A ĐẾN K) ---
  const chairmanContainer = document.getElementById("chairman-container");
  const leftBlock = document.getElementById("left-block");
  const rightBlock = document.getElementById("right-block");
  const viewConfSelect = document.getElementById("view-conference-select");
  const headerTitle = document.getElementById("dynamic-header-title");
  const headerSubtitle = document.getElementById("dynamic-header-subtitle");

  function buildAuditoriumMap() {
    const TOTAL_ROWS = 11;
    const rowLetters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"];

    function buildBlock(container, isLeftBlock) {
      rowLetters.forEach((letter, r) => {
        const rowDiv = document.createElement("div");
        rowDiv.className = "auditorium-row";
        const tablesContainer = document.createElement("div");
        tablesContainer.className = "tables-container";

        // Quy tắc cũ: 3 hàng đầu (A,B,C) có 4 bàn, các hàng sau có 5 bàn
        const numTables = r < 3 ? 4 : 5;
        const seatsInRow = numTables * 2;

        // Thêm nhãn tên Hàng ghế ở đầu hàng bên khối tả (trái)
        if (isLeftBlock) {
          const lbl = document.createElement("span");
          lbl.className = "row-label";
          lbl.textContent = `HÀNG ${letter}`;
          rowDiv.appendChild(lbl);
        }

        for (let t = 0; t < numTables; t++) {
          const tableGroup = document.createElement("div");
          tableGroup.className = "table-group";
          const chairsRow = document.createElement("div");
          chairsRow.className = "auditorium-chairs";

          for (let c = 0; c < 2; c++) {
            const seat = document.createElement("div");
            seat.className = "seat-3d a-seat";
            const globalSeatIndex = t * 2 + c;
            let seatNum = isLeftBlock
              ? (seatsInRow - globalSeatIndex) * 2 - 1
              : (globalSeatIndex + 1) * 2;
            const seatCode = letter + seatNum;
            seat.dataset.code = seatCode;
            seat.innerHTML = `<span class="seat-code">${seatCode}</span>`;
            chairsRow.appendChild(seat);
          }
          const tableSurface = document.createElement("div");
          tableSurface.className = "auditorium-table";
          tableGroup.appendChild(tableSurface);
          tableGroup.appendChild(chairsRow);
          tablesContainer.appendChild(tableGroup);
        }
        rowDiv.appendChild(tablesContainer);
        container.appendChild(rowDiv);
      });
    }
    buildBlock(leftBlock, true);
    buildBlock(rightBlock, false);
  }
  buildAuditoriumMap();

  // --- ĐỒNG BỘ DỮ LIỆU & TỰ ĐỘNG TÍNH TOÁN THỐNG KÊ TOÀN DIỆN ---
  let globalDelegates = {};
  let globalConferences = [];
  let activeConfId = "";

  // Tooltip dùng một lớp nổi duy nhất nhưng khi hiển thị sẽ được neo trực tiếp
  // vào chính phần tử ghế. Cách này giữ tooltip đi cùng ghế khi pinch-zoom
  // trên điện thoại/máy tính bảng, tránh sai lệch giữa layout viewport và visual viewport.
  const seatTooltip = document.createElement("div");
  seatTooltip.className = "seat-tooltip";
  seatTooltip.setAttribute("role", "tooltip");
  seatTooltip.setAttribute("aria-hidden", "true");
  document.body.appendChild(seatTooltip);

  // Hiệu ứng phản hồi khi ghế được tap trên thiết bị cảm ứng.
  // Chèn tại đây để bản vá chỉ cần thay script.js, không bắt buộc sửa style.css.
  const tooltipTouchStyle = document.createElement("style");
  tooltipTouchStyle.textContent = `
    .seat-3d.tooltip-active {
      transform: scale(1.15);
      z-index: 10;
    }
  `;
  document.head.appendChild(tooltipTouchStyle);

  let activeTooltipSeat = null;

  function hideSeatTooltip() {
    seatTooltip.classList.remove("is-visible", "is-below");
    seatTooltip.setAttribute("aria-hidden", "true");

    if (activeTooltipSeat) {
      activeTooltipSeat.classList.remove("tooltip-active");
    }
    activeTooltipSeat = null;

    // Đưa tooltip về body khi ẩn để việc render/reset innerHTML của ghế
    // không vô tình xóa phần tử tooltip dùng chung.
    if (seatTooltip.parentElement !== document.body) {
      document.body.appendChild(seatTooltip);
    }
  }

  function positionSeatTooltip(seat) {
    // Tọa độ tooltip không còn được gán bằng left/top theo viewport.
    // CSS sẽ neo tooltip tuyệt đối theo chính ghế; JS chỉ quyết định
    // mở lên trên hay xuống dưới nếu ghế đang sát mép trên vùng nhìn.
    seatTooltip.classList.remove("is-below");

    const seatRect = seat.getBoundingClientRect();
    const tooltipRect = seatTooltip.getBoundingClientRect();
    const visualViewport = window.visualViewport;
    const viewportTop = visualViewport ? visualViewport.offsetTop : 0;
    const viewportHeight = visualViewport
      ? visualViewport.height
      : window.innerHeight;
    const viewportBottom = viewportTop + viewportHeight;
    const gap = 10;
    const padding = 10;

    const roomAbove = seatRect.top - viewportTop;
    const roomBelow = viewportBottom - seatRect.bottom;

    if (
      roomAbove < tooltipRect.height + gap + padding &&
      roomBelow > roomAbove
    ) {
      seatTooltip.classList.add("is-below");
    }
  }

  function showSeatTooltip(seat) {
    const name = String(seat.dataset.tooltipName || "").trim();
    const prefix = String(seat.dataset.tooltipPrefix || "").trim();
    const position = String(seat.dataset.tooltipPosition || "").trim();
    if (!name) return;

    seatTooltip.innerHTML = "";

    if (prefix) {
      const prefixEl = document.createElement("div");
      prefixEl.className = "seat-tooltip-prefix";
      prefixEl.textContent = prefix;
      seatTooltip.appendChild(prefixEl);
    }

    const nameEl = document.createElement("div");
    nameEl.className = "seat-tooltip-name";
    nameEl.textContent = name;
    seatTooltip.appendChild(nameEl);

    if (position) {
      const positionEl = document.createElement("div");
      positionEl.className = "seat-tooltip-position";
      positionEl.textContent = position;
      seatTooltip.appendChild(positionEl);
    }

    // Gắn tooltip trực tiếp vào ghế trước khi đo và hiển thị.
    // Nhờ đó khi người dùng pinch-zoom/pan, tooltip luôn dịch chuyển cùng ghế.
    if (activeTooltipSeat && activeTooltipSeat !== seat) {
      activeTooltipSeat.classList.remove("tooltip-active");
    }

    seat.appendChild(seatTooltip);
    activeTooltipSeat = seat;
    seat.classList.add("tooltip-active");
    seatTooltip.classList.add("is-visible");
    seatTooltip.setAttribute("aria-hidden", "false");
    positionSeatTooltip(seat);
  }

  function setSeatTooltip(seat, delegate, isAgency) {
    const prefix = isAgency ? "" : "Đồng chí";
    const name = String(delegate?.name || "").trim();
    const position = String(delegate?.position || "").trim();

    // Giữ data-tooltip dạng văn bản để chức năng tìm kiếm hiện tại tiếp tục tìm được
    // theo họ tên, cơ quan/chức vụ mà không phải thay đổi thuật toán tìm kiếm.
    seat.dataset.tooltip = [prefix, name, position].filter(Boolean).join("\n");
    seat.dataset.tooltipPrefix = prefix;
    seat.dataset.tooltipName = name;
    seat.dataset.tooltipPosition = position;

    // Cho phép điều khiển bằng bàn phím nhưng không phụ thuộc vào focus để xử lý cảm ứng.
    seat.tabIndex = 0;
    seat.setAttribute("role", "button");
    seat.setAttribute("aria-label", [prefix, name, position].filter(Boolean).join(" - "));

    // Desktop/laptop có chuột.
    seat.onmouseenter = () => showSeatTooltip(seat);
    seat.onmouseleave = () => {
      if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
        hideSeatTooltip();
      }
    };

    // Bàn phím/accessibility.
    seat.onfocus = () => showSeatTooltip(seat);
    seat.onblur = () => {
      // Safari iOS có thể focus/blur rất nhanh sau một lần tap.
      // Không dùng blur để đóng tooltip trên thiết bị cảm ứng.
      if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
        hideSeatTooltip();
      }
    };
  }

  // --------------------------------------------------------------------------
  // HỖ TRỢ TAP TRÊN iPHONE / iPAD
  // Dùng event delegation ở document (capture phase) thay vì phụ thuộc vào
  // mouseenter/click của từng div ghế. Cách này ổn định hơn trên Safari iOS,
  // kể cả khi trang đang pinch-zoom hoặc phần tử con trong ghế nhận sự kiện.
  // --------------------------------------------------------------------------
  function getSeatFromEventTarget(target) {
    if (!(target instanceof Element)) return null;
    return target.closest(".seat-3d[data-tooltip]");
  }

  function activateSeatFromEvent(event) {
    const seat = getSeatFromEventTarget(event.target);
    if (!seat) return false;

    showSeatTooltip(seat);
    return true;
  }

  if ("PointerEvent" in window) {
    document.addEventListener(
      "pointerdown",
      (event) => {
        if (event.pointerType === "touch" || event.pointerType === "pen") {
          activateSeatFromEvent(event);
        }
      },
      true,
    );
  } else {
    // Fallback cho các bản Safari/iOS cũ chưa hỗ trợ PointerEvent đầy đủ.
    document.addEventListener(
      "touchstart",
      (event) => {
        if (event.touches && event.touches.length === 1) {
          activateSeatFromEvent(event);
        }
      },
      { capture: true, passive: true },
    );
  }

  // Click dùng cho desktop và cũng là lớp fallback cuối cùng trên Safari.
  document.addEventListener(
    "click",
    (event) => {
      const seat = getSeatFromEventTarget(event.target);

      if (seat) {
        showSeatTooltip(seat);
        return;
      }

      // Click/tap ra ngoài ghế thì đóng tooltip.
      hideSeatTooltip();
    },
    true,
  );

  // Khi viewport thay đổi do cuộn/zoom, không ẩn tooltip ngay mà chỉ
  // tính lại hướng mở. Vì tooltip đã neo vào ghế nên vị trí vẫn bám chính xác.
  function refreshActiveTooltipPosition() {
    if (activeTooltipSeat && seatTooltip.classList.contains("is-visible")) {
      positionSeatTooltip(activeTooltipSeat);
    }
  }

  window.addEventListener("scroll", refreshActiveTooltipPosition, true);
  window.addEventListener("resize", refreshActiveTooltipPosition);
  if (window.visualViewport) {
    window.visualViewport.addEventListener(
      "scroll",
      refreshActiveTooltipPosition,
    );
    window.visualViewport.addEventListener(
      "resize",
      refreshActiveTooltipPosition,
    );
  }

  onSnapshot(collection(db, "delegates"), (snapshot) => {
    globalDelegates = {};
    snapshot.forEach((docSnap) => {
      globalDelegates[docSnap.id] = docSnap.data();
    });
    if (activeConfId) renderActiveConference();
  });

  function getLocalDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatConferenceDate(dateString) {
    if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return "";
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  }

  function isConferenceAvailable(conf) {
    return Boolean(
      conf?.conferenceDate && conf.conferenceDate >= getLocalDateString(),
    );
  }

  function resetAuditoriumView() {
    activeConfId = "";
    chairmanContainer.innerHTML = "";

    document.querySelectorAll(".a-seat").forEach((seat) => {
      seat.classList.remove(
        "has-delegate",
        "seat-trung-uong",
        "seat-btv",
        "seat-bch",
        "seat-khac",
      );
      seat.removeAttribute("data-tooltip");
      seat.innerHTML = `<span class="seat-code">${seat.dataset.code}</span>`;
    });

    headerTitle.textContent = "SƠ ĐỒ HỘI TRƯỜNG";
    headerSubtitle.textContent = "Hội trường Tỉnh ủy";

    const totalChairsCount = document.querySelectorAll(".a-seat").length;
    document.getElementById("stat-total").textContent = totalChairsCount;
    document.getElementById("stat-selected").textContent = "0";
    document.getElementById("stat-empty").textContent = totalChairsCount;
    document.getElementById("stat-percent").textContent = "0.0%";

    const donutChart = document.getElementById("donut-chart");
    const chartPercentText = document.getElementById("chart-percent-text");
    if (donutChart && chartPercentText) {
      chartPercentText.textContent = "0.0%";
      donutChart.style.background =
        "conic-gradient(#922b21 0% 0%, #f4efe2 0% 100%)";
    }
  }

  function populatePublicConferenceSelect() {
    const availableConferences = globalConferences
      .filter(isConferenceAvailable)
      .sort((a, b) => {
        if (a.conferenceDate !== b.conferenceDate) {
          return a.conferenceDate.localeCompare(b.conferenceDate);
        }
        return String(a.name || "").localeCompare(String(b.name || ""), "vi");
      });

    if (
      activeConfId &&
      !availableConferences.some((conf) => conf.id === activeConfId)
    ) {
      activeConfId = "";
    }

    viewConfSelect.innerHTML = "";

    if (availableConferences.length === 0) {
      viewConfSelect.innerHTML =
        '<option value="">-- Không có Hội nghị đang hoặc sắp diễn ra --</option>';
      resetAuditoriumView();
      return;
    }

    if (!activeConfId) {
      activeConfId = availableConferences[0].id;
    }

    availableConferences.forEach((conf) => {
      const opt = document.createElement("option");
      opt.value = conf.id;
      const roomText = conf.roomName || "Chưa có phòng";
      const dateText = formatConferenceDate(conf.conferenceDate);
      opt.textContent = `${dateText} — ${roomText} — ${conf.name}`;
      opt.selected = conf.id === activeConfId;
      viewConfSelect.appendChild(opt);
    });

    renderActiveConference();
  }

  onSnapshot(collection(db, "conferences"), (snapshot) => {
    globalConferences = [];
    snapshot.forEach((docSnap) => {
      globalConferences.push({ id: docSnap.id, ...docSnap.data() });
    });
    populatePublicConferenceSelect();
  });

  viewConfSelect.addEventListener("change", (e) => {
    activeConfId = e.target.value;
    if (activeConfId) renderActiveConference();
  });

  let lastConferenceFilterDate = getLocalDateString();
  setInterval(() => {
    const today = getLocalDateString();
    if (today !== lastConferenceFilterDate) {
      lastConferenceFilterDate = today;
      populatePublicConferenceSelect();
    }
  }, 60_000);

  function renderActiveConference() {
    const conf = globalConferences.find((c) => c.id === activeConfId);
    if (!conf) return;

    // Đổi tiêu đề Banner đầu trang theo Hội nghị đang chọn
    headerTitle.textContent = conf.name.toUpperCase();
    const subtitleParts = [];
    if (conf.roomName) subtitleParts.push(conf.roomName);
    const formattedDate = formatConferenceDate(conf.conferenceDate);
    if (formattedDate) subtitleParts.push(formattedDate);
    headerSubtitle.textContent =
      subtitleParts.length > 0
        ? subtitleParts.join(" • ")
        : "Hội trường Tỉnh ủy";
    // Reset tất cả ghế khán phòng về trạng thái trống ban đầu
    document.querySelectorAll(".a-seat").forEach((seat) => {
      seat.classList.remove(
        "has-delegate",
        "seat-trung-uong",
        "seat-btv",
        "seat-bch",
        "seat-khac",
      ); // THÊM CÁC CLASS CẦN XÓA Ở ĐÂY
      seat.removeAttribute("data-tooltip");
      seat.innerHTML = `<span class="seat-code">${seat.dataset.code}</span>`;
    });
    const seatsMap = conf.seats || {};
    let selectedCount = 0;

    const chairmanDelegates = [];
    const audienceDelegates = [];

    Object.keys(seatsMap).forEach((delId) => {
      const delInfo = globalDelegates[delId];
      if (delInfo) {
        const seatCode = seatsMap[delId].toUpperCase();
        const item = {
          id: delId,
          name: delInfo.name,
          seat: seatCode,
          category: delInfo.category || "",
          position: delInfo.position || "",
        };
        if (seatCode.startsWith("V")) chairmanDelegates.push(item);
        else audienceDelegates.push(item);
      }
    });

    // 1. ĐỔ GHẾ CHỦ TỌA ĐỘNG (Chẵn Trái - Lẻ Phải)
    chairmanContainer.innerHTML = "";
    const chairmanOrder = ["V4", "V2", "V1", "V3", "V5"];
    const occupiedVCodes = chairmanDelegates.map((d) => d.seat);
    const seatsToShow = chairmanOrder.filter((code) =>
      occupiedVCodes.includes(code),
    );

    if (seatsToShow.length > 0) {
      const cGroup = document.createElement("div");
      cGroup.className = "chairman-group";
      cGroup.style.width = `${seatsToShow.length * 110}px`;
      const cChairs = document.createElement("div");
      cChairs.className = "chairman-chairs";
      cChairs.style.marginBottom = "5px"; // Ép khoảng cách âm để mặt bàn che bớt một phần chân ghế giống hệt hình mẫu
      cChairs.style.position = "relative";
      cChairs.style.zIndex = "1";
      const cTable = document.createElement("div");
      cTable.className = "chairman-table";
      cTable.style.position = "relative";
      cTable.style.zIndex = "2";

      seatsToShow.forEach((seatCode) => {
        selectedCount++;
        const del = chairmanDelegates.find((d) => d.seat === seatCode);
        const slot = document.createElement("div");
        slot.className = "chair-slot";
        const seat = document.createElement("div");
        seat.className = "seat-3d c-seat";
        let shortName = del.name.trim().split(" ").pop();
        shortName =
          shortName.charAt(0).toUpperCase() + shortName.slice(1).toLowerCase();

        const isAgency = del.category === "Sở, ban, ngành";

        // Với nhóm Sở, ban, ngành: không dùng tiền tố "Đ/c" / "Đồng chí".
        seat.innerHTML = isAgency
          ? `<div class="name-row" style="font-weight: bold; font-size: 12px; line-height: 1.1;">${shortName}</div>`
          : `
    <div class="title-row" style="font-size: 11px; opacity: 0.9; margin-bottom: 1px;">Đ/c</div>
    <div class="name-row" style="font-weight: bold; font-size: 12px; line-height: 1.1;">${shortName}</div>`;
        setSeatTooltip(seat, del, isAgency);
        slot.appendChild(seat);
        cChairs.appendChild(slot);
        const panel = document.createElement("div");
        panel.className = "table-panel";
        cTable.appendChild(panel);
      });
      cGroup.appendChild(cChairs);
      cGroup.appendChild(cTable);
      chairmanContainer.appendChild(cGroup);
    }

    // 2. ĐỔ GHẾ KHÁN PHÒNG TỔNG HỢP (PHÂN CHIA MÀU THEO CHỨC VỤ)
    audienceDelegates.forEach((del) => {
      const seatEl = document.querySelector(`[data-code="${del.seat}"]`);
      if (seatEl) {
        selectedCount++;
        let shortName = del.name.trim().split(" ").pop();
        shortName =
          shortName.charAt(0).toUpperCase() + shortName.slice(1).toLowerCase();
        const isAgency = del.category === "Sở, ban, ngành";
        seatEl.innerHTML = `<span class="seat-code">${del.seat}</span><span class="delegate-name">${isAgency ? shortName : `Đ/c ${shortName}`}</span>`;

        // Mặc định thêm class có người ngồi
        seatEl.classList.add("has-delegate");
        setSeatTooltip(seatEl, del, isAgency);

        // Dùng thẳng id đã có thay vì quét lại toàn bộ danh sách theo tên cho từng ghế.
        // Cách này vừa nhanh hơn vừa tránh nhầm nếu có hai đại biểu trùng họ tên.
        const delRawInfo = del.id ? globalDelegates[del.id] : null;

        if (delRawInfo) {
          // SỬA TẠI ĐÂY: Ưu tiên đọc chính xác trường "category" từ Firestore của bạn, sau đó mới đến các trường dự phòng
          const positionText = (
            delRawInfo.category ||
            delRawInfo.position ||
            delRawInfo.role ||
            delRawInfo.type ||
            ""
          ).toLowerCase(); // Đã chuyển chuỗi về chữ viết thường toàn bộ để so sánh chính xác

          // SỬA TẠI ĐÂY: Chuyển toàn bộ từ khóa so sánh bên dưới thành CHỮ VIẾT THƯỜNG để khớp với lệnh .toLowerCase()
          if (
            positionText.includes("trung ương") ||
            positionText.includes("tw")
          ) {
            seatEl.classList.add("seat-trung-uong");
          } else if (
            positionText.includes("btv") ||
            positionText.includes("thường vụ")
          ) {
            seatEl.classList.add("seat-btv");
          } else if (
            positionText.includes("bch") ||
            positionText.includes("ban chấp hành") ||
            positionText.includes("đảng bộ tỉnh")
          ) {
            seatEl.classList.add("seat-bch");
          } else {
            seatEl.classList.add("seat-khac");
          }
        } else {
          // Phòng hờ nếu không tìm thấy thông tin chi tiết thì xếp vào nhóm Đại biểu khác
          seatEl.classList.add("seat-khac");
        }
      }
    });
    // ==========================================================================
    // TỰ ĐỘNG CẬP NHẬT CHỈ SỐ THỐNG KÊ & XOAY BIỂU ĐỒ HÌNH NHẪN (DASHBOARD) Realtime
    // ==========================================================================
    const totalChairsCount =
      document.querySelectorAll(".a-seat").length + seatsToShow.length;
    const emptyCount = totalChairsCount - selectedCount;
    const percent =
      totalChairsCount > 0
        ? ((selectedCount / totalChairsCount) * 100).toFixed(1)
        : 0;

    // Cập nhật giá trị văn bản chữ trên thẻ Sidebar
    document.getElementById("stat-total").textContent = totalChairsCount;
    document.getElementById("stat-selected").textContent = selectedCount;
    document.getElementById("stat-empty").textContent = emptyCount;
    document.getElementById("stat-percent").textContent = `${percent}%`;

    // Cập nhật vòng quay và số liệu trung tâm của biểu đồ hình nhẫn
    const donutChart = document.getElementById("donut-chart");
    const chartPercentText = document.getElementById("chart-percent-text");

    if (donutChart && chartPercentText) {
      chartPercentText.textContent = `${percent}%`;
      // Thiết lập dải quạt: Màu đỏ sẫm (#922b21) đại diện ghế có người và màu trắng ngà (#f4efe2) đại diện ghế trống
      donutChart.style.background = `conic-gradient(#922b21 0% ${percent}%, #f4efe2 ${percent}% 100%)`;
    }
  }

  // --- TÌM KIẾM ĐẠI BIỂU: CHỈ TÌM KHI BẤM NÚT / ENTER ---
  const searchInput = document.getElementById("search-delegate");
  const searchButton = document.getElementById("search-delegate-btn");
  const searchStatus = document.getElementById("search-status");

  function clearSearchHighlight() {
    document.querySelectorAll(".seat-3d.highlight-seat").forEach((seat) => {
      seat.classList.remove("highlight-seat");
    });
  }

  function setSearchStatus(message, type = "") {
    if (!searchStatus) return;
    searchStatus.textContent = message;
    searchStatus.classList.remove("is-found", "is-empty");
    if (type) searchStatus.classList.add(type);
  }

  function findNearestMatchedSeat(matchedSeats) {
    if (matchedSeats.length === 0) return null;

    // Chọn ghế có tâm gần tâm vùng nhìn hiện tại nhất để giảm quãng đường cuộn.
    const viewportCenterX = window.innerWidth / 2;
    const viewportCenterY = window.innerHeight / 2;

    return matchedSeats.reduce((nearest, seat) => {
      const rect = seat.getBoundingClientRect();
      const seatCenterX = rect.left + rect.width / 2;
      const seatCenterY = rect.top + rect.height / 2;
      const distance = Math.hypot(
        seatCenterX - viewportCenterX,
        seatCenterY - viewportCenterY,
      );

      if (!nearest || distance < nearest.distance) {
        return { seat, distance };
      }
      return nearest;
    }, null)?.seat;
  }

  function performSeatSearch() {
    if (!searchInput) return;

    const searchTerm = searchInput.value.toLowerCase().trim();
    clearSearchHighlight();

    if (!searchTerm) {
      setSearchStatus("Vui lòng nhập nội dung cần tìm.", "is-empty");
      searchInput.focus();
      return;
    }

    const matchedSeats = [];

    document.querySelectorAll(".seat-3d").forEach((seat) => {
      const tooltipText = seat.getAttribute("data-tooltip");
      const isMatched =
        tooltipText && tooltipText.toLowerCase().includes(searchTerm);

      if (isMatched) {
        seat.classList.add("highlight-seat");
        matchedSeats.push(seat);
      }
    });

    if (matchedSeats.length === 0) {
      setSearchStatus("Không tìm thấy đại biểu/cơ quan phù hợp.", "is-empty");
      return;
    }

    const nearestSeat = findNearestMatchedSeat(matchedSeats);
    setSearchStatus(
      matchedSeats.length === 1
        ? "Đã tìm thấy 1 vị trí."
        : `Đã tìm thấy ${matchedSeats.length} vị trí; đang trỏ đến vị trí gần nhất.`,
      "is-found",
    );

    nearestSeat?.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center",
    });
  }

  if (searchInput && searchButton) {
    // Khi người dùng gõ/chỉnh lại từ khóa: chỉ xóa kết quả cũ, tuyệt đối không tự tìm hoặc tự cuộn.
    searchInput.addEventListener("input", () => {
      clearSearchHighlight();
      setSearchStatus("");
    });

    searchButton.addEventListener("click", performSeatSearch);

    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        performSeatSearch();
      }
    });
  }
});
