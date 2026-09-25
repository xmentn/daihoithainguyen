import {
  db,
  auth,
  onAuthStateChanged,
  signOut,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from "./firebase-config.js";

document.addEventListener("DOMContentLoaded", () => {
  // ============================================================================
  // 1. XÁC THỰC & ĐĂNG XUẤT
  // ============================================================================
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.replace("index.html");
    }
  });

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      const result = await Swal.fire({
        title: "Đăng xuất quản trị?",
        text: "Bạn sẽ cần đăng nhập lại khi vào trang quản trị lần sau.",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Đăng xuất",
        cancelButtonText: "Hủy",
        confirmButtonColor: "#922b21",
      });

      if (!result.isConfirmed) return;

      try {
        await signOut(auth);
        window.location.replace("index.html");
      } catch (error) {
        console.error("Lỗi đăng xuất Firebase:", error);
        Swal.fire("Không thể đăng xuất", "Vui lòng thử lại.", "error");
      }
    });
  }

  // ============================================================================
  // 2. TAB QUẢN TRỊ - GHI NHỚ TAB ĐANG MỞ
  // ============================================================================
  const tabBtns = [...document.querySelectorAll(".tab-btn")];
  const tabContents = [...document.querySelectorAll(".tab-content")];
  const TAB_STORAGE_KEY = "hall-admin-active-tab";

  function activateTab(tabId, save = true) {
    const target = document.getElementById(tabId);
    const targetBtn = tabBtns.find((btn) => btn.dataset.tab === tabId);
    if (!target || !targetBtn) return;

    tabBtns.forEach((btn) => btn.classList.remove("active"));
    tabContents.forEach((content) => content.classList.remove("active"));

    targetBtn.classList.add("active");
    target.classList.add("active");

    if (save) {
      sessionStorage.setItem(TAB_STORAGE_KEY, tabId);
    }
  }

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => activateTab(btn.dataset.tab));
  });

  const savedTab = sessionStorage.getItem(TAB_STORAGE_KEY);
  if (savedTab && document.getElementById(savedTab)) {
    activateTab(savedTab, false);
  }

  // ============================================================================
  // 3. BIẾN DỮ LIỆU & DOM
  // ============================================================================
  let currentDelegates = [];
  let currentRooms = [];
  let currentConferences = [];
  let selectedConfId = "";
  let currentFilterTab1 = "ALL";
  let currentFilterTab4 = "ALL";
  let lastToday = getLocalDateString();

  const delegatesCol = collection(db, "delegates");
  const roomsCol = collection(db, "rooms");
  const conferencesCol = collection(db, "conferences");

  const tableDanhSach = document.getElementById("table-danhsach");
  const tablePhongHop = document.getElementById("table-phonghop");
  const tableHoiNghi = document.getElementById("table-hoignhi");
  const tableVitri = document.getElementById("table-vitri");
  const selectConf = document.getElementById("select-conference");
  const actionVitriContainer = document.getElementById("action-vitri-container");
  const filterCategoryTab1 = document.getElementById("filter-category");
  const filterCategoryTab4 = document.getElementById("delegate-filter");

  const categoryLabels = {
    "Trung ương": "Đại biểu Trung ương",
    "Thường trực": "Thường trực Tỉnh ủy",
    BTV: "Ủy viên BTV Tỉnh ủy",
    BCH: "Ủy viên BCH Đảng bộ tỉnh",
  };

  // ============================================================================
  // 4. HÀM TIỆN ÍCH
  // ============================================================================
  function getLocalDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatDate(dateString) {
    if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return "—";
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  }

  function isConferenceAvailable(conf) {
    return Boolean(conf?.conferenceDate && conf.conferenceDate >= getLocalDateString());
  }

  function getConferenceStatus(conf) {
    const date = conf?.conferenceDate;
    const today = getLocalDateString();

    if (!date) {
      return { text: "Chưa cập nhật ngày", className: "status-missing" };
    }
    if (date === today) {
      return { text: "Hôm nay", className: "status-today" };
    }
    if (date > today) {
      return { text: "Sắp diễn ra", className: "status-upcoming" };
    }
    return { text: "Đã diễn ra", className: "status-past" };
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function showToast(title, icon = "success") {
    return Swal.fire({
      toast: true,
      position: "top-end",
      icon,
      title,
      showConfirmButton: false,
      timer: 1600,
    });
  }

  function setButtonBusy(button, busy, busyText, normalText) {
    if (!button) return;
    button.disabled = busy;
    button.textContent = busy ? busyText : normalText;
  }

  function renderEmptyRow(tbody, colspan, text) {
    tbody.innerHTML = `<tr><td colspan="${colspan}" class="empty-row">${escapeHtml(text)}</td></tr>`;
  }

  // ============================================================================
  // 5. BỘ LỌC DANH SÁCH ĐẠI BIỂU
  // ============================================================================
  if (filterCategoryTab1) {
    filterCategoryTab1.addEventListener("change", (e) => {
      currentFilterTab1 = e.target.value;
      renderTabDanhSach();
    });
  }

  if (filterCategoryTab4) {
    filterCategoryTab4.addEventListener("change", (e) => {
      currentFilterTab4 = e.target.value;
      renderTabVitri();
    });
  }

  // ============================================================================
  // 6. FIRESTORE REALTIME
  // ============================================================================
  onSnapshot(
    delegatesCol,
    (snapshot) => {
      currentDelegates = [];
      snapshot.forEach((docSnap) => {
        currentDelegates.push({ id: docSnap.id, ...docSnap.data() });
      });
      currentDelegates.sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999));
      renderTabDanhSach();
      if (selectedConfId) renderTabVitri();
    },
    (error) => {
      console.error("Lỗi đọc danh sách đại biểu:", error);
    },
  );

  onSnapshot(
    roomsCol,
    (snapshot) => {
      currentRooms = [];
      snapshot.forEach((docSnap) => {
        currentRooms.push({ id: docSnap.id, ...docSnap.data() });
      });
      currentRooms.sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || ""), "vi"),
      );
      renderRooms();
      populateRoomSelect();
    },
    (error) => {
      console.error("Lỗi đọc danh sách phòng họp:", error);
      renderEmptyRow(
        tablePhongHop,
        3,
        "Không thể tải danh sách phòng họp. Hãy kiểm tra Firestore Security Rules.",
      );
    },
  );

  onSnapshot(
    conferencesCol,
    (snapshot) => {
      currentConferences = [];
      snapshot.forEach((docSnap) => {
        currentConferences.push({ id: docSnap.id, ...docSnap.data() });
      });

      currentConferences.sort((a, b) => {
        const dateA = a.conferenceDate || "";
        const dateB = b.conferenceDate || "";
        if (!dateA && dateB) return -1;
        if (dateA && !dateB) return 1;
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        return String(a.name || "").localeCompare(String(b.name || ""), "vi");
      });

      renderConferences();
      populateSeatConferenceSelect();
      if (selectedConfId) renderTabVitri();
    },
    (error) => {
      console.error("Lỗi đọc danh sách hội nghị:", error);
    },
  );

  // ============================================================================
  // 7. DANH SÁCH TỔNG ĐẠI BIỂU
  // ============================================================================
  function renderTabDanhSach() {
    tableDanhSach.innerHTML = "";
    const visibleDelegates = currentDelegates.filter(
      (del) => currentFilterTab1 === "ALL" || del.category === currentFilterTab1,
    );

    if (visibleDelegates.length === 0) {
      renderEmptyRow(tableDanhSach, 5, "Chưa có đại biểu phù hợp với bộ lọc.");
      return;
    }

    visibleDelegates.forEach((del, index) => {
      const label = categoryLabels[del.category] || "Chưa phân loại";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td style="color:#d46b08;font-weight:700;">${escapeHtml(del.rank ?? "-")}</td>
        <td style="color:#2f80c8;font-weight:650;">${escapeHtml(label)}</td>
        <td style="font-weight:650;">Đ/c ${escapeHtml(del.name)}</td>
        <td>
          <div class="action-buttons">
            <button class="btn-edit edit-del" data-id="${del.id}" type="button">Sửa</button>
            <button class="btn-delete delete-del" data-id="${del.id}" type="button">Xóa</button>
          </div>
        </td>
      `;
      tableDanhSach.appendChild(tr);
    });

    tableDanhSach.querySelectorAll(".edit-del").forEach((button) => {
      button.addEventListener("click", () => editDelegate(button.dataset.id));
    });
    tableDanhSach.querySelectorAll(".delete-del").forEach((button) => {
      button.addEventListener("click", () => deleteDelegate(button.dataset.id));
    });
  }

  const formDel = document.getElementById("delegate-form");
  const idInput = document.getElementById("delegate-id");
  const nameInput = document.getElementById("fullname");
  const rankInput = document.getElementById("delegate-rank");
  const categoryInput = document.getElementById("delegate-category");
  const formTitle = document.getElementById("form-title");
  const cancelBtn = document.getElementById("cancel-btn");

  formDel.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = idInput.value;
    const name = nameInput.value.trim();
    const rank = parseInt(rankInput.value, 10);
    const category = categoryInput.value;

    if (!name || !Number.isInteger(rank) || rank < 1 || !category) return;

    const dup = currentDelegates.find((d) => d.rank === rank && d.id !== id);
    if (dup) {
      await Swal.fire({
        icon: "warning",
        title: "Trùng Rank",
        text: `Rank ${rank} đã thuộc về Đ/c \"${dup.name}\".`,
        confirmButtonText: "Đã hiểu",
      });
      return;
    }

    try {
      if (id) {
        await updateDoc(doc(db, "delegates", id), { name, rank, category });
      } else {
        await addDoc(delegatesCol, { name, rank, category });
      }
      resetDelegateForm();
      await showToast("Đã cập nhật danh sách tổng!");
    } catch (error) {
      console.error("Lỗi lưu đại biểu:", error);
      Swal.fire("Không thể lưu", "Vui lòng kiểm tra kết nối và quyền Firestore.", "error");
    }
  });

  function editDelegate(id) {
    const delegate = currentDelegates.find((item) => item.id === id);
    if (!delegate) return;

    idInput.value = delegate.id;
    nameInput.value = delegate.name || "";
    rankInput.value = delegate.rank ?? "";
    categoryInput.value = delegate.category || "";
    formTitle.textContent = "Sửa Thông tin Đại biểu";
    cancelBtn.classList.remove("is-hidden");
    activateTab("tab-danhsach");
    nameInput.focus();
  }

  async function deleteDelegate(id) {
    const delegate = currentDelegates.find((item) => item.id === id);
    const result = await Swal.fire({
      title: "Xóa đại biểu?",
      text: `Hành động này sẽ xóa vĩnh viễn ${delegate?.name ? `Đ/c \"${delegate.name}\"` : "đại biểu này"} khỏi danh sách tổng.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d94b3d",
      confirmButtonText: "Xóa",
      cancelButtonText: "Hủy",
    });

    if (!result.isConfirmed) return;

    try {
      await deleteDoc(doc(db, "delegates", id));
      await showToast("Đã xóa đại biểu.");
    } catch (error) {
      console.error("Lỗi xóa đại biểu:", error);
      Swal.fire("Không thể xóa", "Vui lòng kiểm tra kết nối và quyền Firestore.", "error");
    }
  }

  function resetDelegateForm() {
    formDel.reset();
    idInput.value = "";
    formTitle.textContent = "Thêm Đại biểu vào Danh sách tổng";
    cancelBtn.classList.add("is-hidden");
  }

  cancelBtn.addEventListener("click", resetDelegateForm);

  // ============================================================================
  // 8. DANH SÁCH PHÒNG HỌP / HỘI TRƯỜNG
  // ============================================================================
  const roomForm = document.getElementById("room-form");
  const roomIdInput = document.getElementById("room-id");
  const roomNameInput = document.getElementById("room-name");
  const roomFormTitle = document.getElementById("room-form-title");
  const roomSaveBtn = document.getElementById("room-save-btn");
  const roomCancelBtn = document.getElementById("room-cancel-btn");

  function renderRooms() {
    tablePhongHop.innerHTML = "";

    if (currentRooms.length === 0) {
      renderEmptyRow(tablePhongHop, 3, "Chưa có Phòng họp / Hội trường nào.");
      return;
    }

    currentRooms.forEach((room, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td style="font-weight:650;">${escapeHtml(room.name || "")}</td>
        <td>
          <div class="action-buttons">
            <button class="btn-edit edit-room" data-id="${room.id}" type="button">Sửa</button>
            <button class="btn-delete delete-room" data-id="${room.id}" type="button">Xóa</button>
          </div>
        </td>
      `;
      tablePhongHop.appendChild(tr);
    });

    tablePhongHop.querySelectorAll(".edit-room").forEach((button) => {
      button.addEventListener("click", () => editRoom(button.dataset.id));
    });
    tablePhongHop.querySelectorAll(".delete-room").forEach((button) => {
      button.addEventListener("click", () => deleteRoom(button.dataset.id));
    });
  }

  roomForm.addEventListener("submit", async (e) => {
    // QUAN TRỌNG: chặn submit mặc định để không reload trang và quay về Tab 1.
    e.preventDefault();

    const roomId = roomIdInput.value;
    const roomName = roomNameInput.value.trim().replace(/\s+/g, " ");
    if (!roomName) return;

    const duplicate = currentRooms.find(
      (room) =>
        room.id !== roomId &&
        String(room.name || "").trim().toLocaleLowerCase("vi") ===
          roomName.toLocaleLowerCase("vi"),
    );

    if (duplicate) {
      await Swal.fire({
        icon: "warning",
        title: "Phòng họp đã tồn tại",
        text: `\"${duplicate.name}\" đã có trong danh sách.`,
        confirmButtonText: "Đã hiểu",
      });
      return;
    }

    const normalText = roomId ? "Lưu thay đổi" : "Thêm Phòng họp";
    setButtonBusy(roomSaveBtn, true, "Đang lưu...", normalText);

    try {
      if (roomId) {
        await updateDoc(doc(db, "rooms", roomId), {
          name: roomName,
          updatedAt: Date.now(),
        });

        // Giữ tên phòng hiển thị trong các hội nghị đã liên kết luôn đồng bộ.
        const affectedConferences = currentConferences.filter(
          (conf) => conf.roomId === roomId,
        );
        await Promise.all(
          affectedConferences.map((conf) =>
            updateDoc(doc(db, "conferences", conf.id), { roomName }),
          ),
        );

        await showToast("Đã cập nhật Phòng họp / Hội trường.");
      } else {
        await addDoc(roomsCol, {
          name: roomName,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        await showToast("Đã thêm Phòng họp / Hội trường.");
      }

      resetRoomForm();
      activateTab("tab-phonghop");
    } catch (error) {
      console.error("Lỗi lưu phòng họp:", error);
      await Swal.fire({
        icon: "error",
        title: "Không thể lưu Phòng họp",
        text: "Vui lòng kiểm tra kết nối Internet và Firestore Security Rules cho collection 'rooms'.",
      });
    } finally {
      setButtonBusy(roomSaveBtn, false, "Đang lưu...", roomIdInput.value ? "Lưu thay đổi" : "Thêm Phòng họp");
    }
  });

  function editRoom(id) {
    const room = currentRooms.find((item) => item.id === id);
    if (!room) return;

    roomIdInput.value = room.id;
    roomNameInput.value = room.name || "";
    roomFormTitle.textContent = "Sửa Phòng họp / Hội trường";
    roomSaveBtn.textContent = "Lưu thay đổi";
    roomCancelBtn.classList.remove("is-hidden");
    activateTab("tab-phonghop");
    roomNameInput.focus();
  }

  async function deleteRoom(id) {
    const room = currentRooms.find((item) => item.id === id);
    if (!room) return;

    const usedBy = currentConferences.filter((conf) => conf.roomId === id);
    const extraText = usedBy.length
      ? ` Phòng này đang được gắn với ${usedBy.length} hội nghị; tên phòng đã lưu trong các hội nghị cũ vẫn được giữ lại.`
      : "";

    const result = await Swal.fire({
      title: "Xóa Phòng họp / Hội trường?",
      text: `Bạn có chắc muốn xóa \"${room.name}\" khỏi danh sách?${extraText}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d94b3d",
      confirmButtonText: "Xóa",
      cancelButtonText: "Hủy",
    });

    if (!result.isConfirmed) return;

    try {
      await deleteDoc(doc(db, "rooms", id));
      if (roomIdInput.value === id) resetRoomForm();
      await showToast("Đã xóa Phòng họp / Hội trường.");
    } catch (error) {
      console.error("Lỗi xóa phòng họp:", error);
      Swal.fire("Không thể xóa", "Vui lòng kiểm tra kết nối và quyền Firestore.", "error");
    }
  }

  function resetRoomForm() {
    roomForm.reset();
    roomIdInput.value = "";
    roomFormTitle.textContent = "Thêm Phòng họp / Hội trường";
    roomSaveBtn.textContent = "Thêm Phòng họp";
    roomSaveBtn.disabled = false;
    roomCancelBtn.classList.add("is-hidden");
  }

  roomCancelBtn.addEventListener("click", resetRoomForm);

  // ============================================================================
  // 9. QUẢN LÝ HỘI NGHỊ
  // ============================================================================
  const confForm = document.getElementById("conf-form");
  const confIdInput = document.getElementById("conf-id");
  const confNameInput = document.getElementById("conf-name");
  const confRoomInput = document.getElementById("conf-room");
  const confDateInput = document.getElementById("conf-date");
  const confFormTitle = document.getElementById("conf-form-title");
  const confSaveBtn = document.getElementById("conf-save-btn");
  const confCancelBtn = document.getElementById("conf-cancel-btn");

  function populateRoomSelect() {
    const selectedValue = confRoomInput.value;
    confRoomInput.innerHTML = '<option value="">-- Chọn Phòng họp / Hội trường --</option>';

    currentRooms.forEach((room) => {
      const option = document.createElement("option");
      option.value = room.id;
      option.textContent = room.name;
      confRoomInput.appendChild(option);
    });

    if (currentRooms.some((room) => room.id === selectedValue)) {
      confRoomInput.value = selectedValue;
    }
  }

  function renderConferences() {
    tableHoiNghi.innerHTML = "";

    if (currentConferences.length === 0) {
      renderEmptyRow(tableHoiNghi, 6, "Chưa có Hội nghị / Cuộc họp nào.");
      return;
    }

    currentConferences.forEach((conf, index) => {
      const status = getConferenceStatus(conf);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td style="font-weight:650;">${escapeHtml(conf.name || "")}</td>
        <td>${escapeHtml(conf.roomName || "—")}</td>
        <td>${escapeHtml(formatDate(conf.conferenceDate))}</td>
        <td><span class="status-badge ${status.className}">${status.text}</span></td>
        <td>
          <div class="action-buttons">
            <button class="btn-edit edit-conf" data-id="${conf.id}" type="button">Sửa</button>
            <button class="btn-delete delete-conf" data-id="${conf.id}" type="button">Xóa</button>
          </div>
        </td>
      `;
      tableHoiNghi.appendChild(tr);
    });

    tableHoiNghi.querySelectorAll(".edit-conf").forEach((button) => {
      button.addEventListener("click", () => editConference(button.dataset.id));
    });
    tableHoiNghi.querySelectorAll(".delete-conf").forEach((button) => {
      button.addEventListener("click", () => deleteConference(button.dataset.id));
    });
  }

  confForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const confId = confIdInput.value;
    const name = confNameInput.value.trim().replace(/\s+/g, " ");
    const roomId = confRoomInput.value;
    const conferenceDate = confDateInput.value;
    const room = currentRooms.find((item) => item.id === roomId);

    if (!name || !roomId || !conferenceDate) return;

    if (!room) {
      await Swal.fire({
        icon: "warning",
        title: "Phòng họp không còn tồn tại",
        text: "Vui lòng chọn lại Phòng họp / Hội trường từ danh sách hiện tại.",
      });
      populateRoomSelect();
      return;
    }

    const normalText = confId ? "Lưu thay đổi" : "Tạo Hội nghị";
    setButtonBusy(confSaveBtn, true, "Đang lưu...", normalText);

    try {
      const payload = {
        name,
        roomId,
        roomName: room.name,
        conferenceDate,
        updatedAt: Date.now(),
      };

      if (confId) {
        await updateDoc(doc(db, "conferences", confId), payload);
        await showToast("Đã cập nhật Hội nghị.");
      } else {
        await addDoc(conferencesCol, {
          ...payload,
          seats: {},
          createdAt: Date.now(),
        });
        await showToast("Đã tạo phiên Hội nghị mới.");
      }

      resetConferenceForm();
      activateTab("tab-hoignhi");
    } catch (error) {
      console.error("Lỗi lưu hội nghị:", error);
      Swal.fire("Không thể lưu Hội nghị", "Vui lòng kiểm tra kết nối và quyền Firestore.", "error");
    } finally {
      setButtonBusy(confSaveBtn, false, "Đang lưu...", confIdInput.value ? "Lưu thay đổi" : "Tạo Hội nghị");
    }
  });

  function editConference(id) {
    const conf = currentConferences.find((item) => item.id === id);
    if (!conf) return;

    confIdInput.value = conf.id;
    confNameInput.value = conf.name || "";
    confDateInput.value = conf.conferenceDate || "";

    populateRoomSelect();
    if (conf.roomId && currentRooms.some((room) => room.id === conf.roomId)) {
      confRoomInput.value = conf.roomId;
    } else {
      confRoomInput.value = "";
    }

    confFormTitle.textContent = "Sửa thông tin Hội nghị";
    confSaveBtn.textContent = "Lưu thay đổi";
    confCancelBtn.classList.remove("is-hidden");
    activateTab("tab-hoignhi");
    confNameInput.focus();
  }

  async function deleteConference(id) {
    const conf = currentConferences.find((item) => item.id === id);
    const result = await Swal.fire({
      title: "Xóa Hội nghị?",
      text: `Toàn bộ sơ đồ xếp chỗ của ${conf?.name ? `\"${conf.name}\"` : "hội nghị này"} sẽ mất.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d94b3d",
      confirmButtonText: "Xóa phiên",
      cancelButtonText: "Hủy",
    });

    if (!result.isConfirmed) return;

    try {
      if (selectedConfId === id) {
        selectedConfId = "";
        actionVitriContainer.classList.add("is-hidden");
      }
      await deleteDoc(doc(db, "conferences", id));
      if (confIdInput.value === id) resetConferenceForm();
      await showToast("Đã xóa Hội nghị.");
    } catch (error) {
      console.error("Lỗi xóa hội nghị:", error);
      Swal.fire("Không thể xóa", "Vui lòng kiểm tra kết nối và quyền Firestore.", "error");
    }
  }

  function resetConferenceForm() {
    confForm.reset();
    confIdInput.value = "";
    confFormTitle.textContent = "Tạo phiên Hội nghị mới";
    confSaveBtn.textContent = "Tạo Hội nghị";
    confSaveBtn.disabled = false;
    confCancelBtn.classList.add("is-hidden");
    populateRoomSelect();
  }

  confCancelBtn.addEventListener("click", resetConferenceForm);

  // ============================================================================
  // 10. XẾP CHỖ - CHỈ HIỂN THỊ HỘI NGHỊ HÔM NAY HOẶC TƯƠNG LAI
  // ============================================================================
  function populateSeatConferenceSelect() {
    const activeConferences = currentConferences
      .filter(isConferenceAvailable)
      .sort((a, b) => {
        if (a.conferenceDate !== b.conferenceDate) {
          return a.conferenceDate.localeCompare(b.conferenceDate);
        }
        return String(a.name || "").localeCompare(String(b.name || ""), "vi");
      });

    if (
      selectedConfId &&
      !activeConferences.some((conf) => conf.id === selectedConfId)
    ) {
      selectedConfId = "";
      actionVitriContainer.classList.add("is-hidden");
    }

    selectConf.innerHTML = '<option value="">-- Vui lòng chọn một Hội nghị --</option>';

    activeConferences.forEach((conf) => {
      const option = document.createElement("option");
      option.value = conf.id;
      option.textContent = `${formatDate(conf.conferenceDate)} — ${conf.roomName || "Chưa có phòng"} — ${conf.name}`;
      option.selected = conf.id === selectedConfId;
      selectConf.appendChild(option);
    });

    if (activeConferences.length === 0) {
      selectConf.innerHTML = '<option value="">-- Không có Hội nghị đang hoặc sắp diễn ra --</option>';
      actionVitriContainer.classList.add("is-hidden");
    }
  }

  selectConf.addEventListener("change", (e) => {
    selectedConfId = e.target.value;
    if (selectedConfId) {
      actionVitriContainer.classList.remove("is-hidden");
      renderTabVitri();
    } else {
      actionVitriContainer.classList.add("is-hidden");
    }
  });

  function renderTabVitri() {
    tableVitri.innerHTML = "";
    const conf = currentConferences.find((item) => item.id === selectedConfId);

    if (!conf || !isConferenceAvailable(conf)) {
      actionVitriContainer.classList.add("is-hidden");
      return;
    }

    const seatsMap = conf.seats || {};
    const visibleDelegates = currentDelegates.filter(
      (del) => currentFilterTab4 === "ALL" || del.category === currentFilterTab4,
    );

    if (visibleDelegates.length === 0) {
      renderEmptyRow(tableVitri, 6, "Chưa có đại biểu phù hợp với bộ lọc.");
      return;
    }

    visibleDelegates.forEach((del, index) => {
      const currentSeat = seatsMap[del.id] || "";
      const label = categoryLabels[del.category] || "-";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td style="color:#d46b08;font-weight:700;">${escapeHtml(del.rank ?? "-")}</td>
        <td style="color:#2f80c8;font-weight:650;">${escapeHtml(label)}</td>
        <td style="font-weight:650;">Đ/c ${escapeHtml(del.name)}</td>
        <td><input type="text" class="seat-input" id="seat-${del.id}" value="${escapeHtml(currentSeat)}" placeholder="Không đi"></td>
        <td><button class="btn-update update-seat-btn" data-id="${del.id}" type="button">Cập nhật</button></td>
      `;
      tableVitri.appendChild(tr);
    });

    tableVitri.querySelectorAll(".update-seat-btn").forEach((button) => {
      button.addEventListener("click", () => updateDelegateSeat(button.dataset.id));
    });
  }

  async function updateDelegateSeat(delegateId) {
    const seatInput = document.getElementById(`seat-${delegateId}`);
    const conf = currentConferences.find((item) => item.id === selectedConfId);
    if (!seatInput || !conf || !isConferenceAvailable(conf)) return;

    const seatValue = seatInput.value.trim().toUpperCase();
    const updatedSeats = { ...(conf.seats || {}) };

    if (seatValue === "") {
      delete updatedSeats[delegateId];
    } else {
      const duplicatedSeat = Object.entries(updatedSeats).find(
        ([id, seat]) => id !== delegateId && String(seat).toUpperCase() === seatValue,
      );
      if (duplicatedSeat) {
        const otherDelegate = currentDelegates.find((d) => d.id === duplicatedSeat[0]);
        await Swal.fire({
          icon: "warning",
          title: "Trùng mã ghế",
          text: `Ghế ${seatValue} đã được xếp cho ${otherDelegate?.name ? `Đ/c ${otherDelegate.name}` : "một đại biểu khác"}.`,
        });
        return;
      }
      updatedSeats[delegateId] = seatValue;
    }

    const button = tableVitri.querySelector(
      `.update-seat-btn[data-id="${delegateId}"]`,
    );
    setButtonBusy(button, true, "Đang lưu...", "Cập nhật");

    try {
      await updateDoc(doc(db, "conferences", selectedConfId), { seats: updatedSeats });
      if (button) {
        button.textContent = "Đã lưu";
        setTimeout(() => {
          if (document.body.contains(button)) {
            button.disabled = false;
            button.textContent = "Cập nhật";
          }
        }, 900);
      }
    } catch (error) {
      console.error("Lỗi cập nhật ghế:", error);
      setButtonBusy(button, false, "Đang lưu...", "Cập nhật");
      Swal.fire("Không thể cập nhật ghế", "Vui lòng kiểm tra kết nối và quyền Firestore.", "error");
    }
  }

  const clearAllSeatsBtn = document.getElementById("clear-all-seats");
  clearAllSeatsBtn.addEventListener("click", async () => {
    const conf = currentConferences.find((item) => item.id === selectedConfId);
    if (!conf) return;

    const result = await Swal.fire({
      title: "Làm trống sơ đồ?",
      text: "Xóa toàn bộ chỗ ngồi đã xếp của hội nghị này?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d94b3d",
      confirmButtonText: "Đồng ý",
      cancelButtonText: "Hủy",
    });

    if (!result.isConfirmed) return;

    try {
      await updateDoc(doc(db, "conferences", selectedConfId), { seats: {} });
      await Swal.fire("Đã xóa!", "Sơ đồ hội nghị hiện tại đã trống.", "success");
    } catch (error) {
      console.error("Lỗi làm trống sơ đồ:", error);
      Swal.fire("Không thể cập nhật", "Vui lòng kiểm tra kết nối và quyền Firestore.", "error");
    }
  });

  // Nếu trang quản trị mở qua 0 giờ, tự loại các hội nghị của ngày hôm trước.
  setInterval(() => {
    const today = getLocalDateString();
    if (today !== lastToday) {
      lastToday = today;
      renderConferences();
      populateSeatConferenceSelect();
    }
  }, 60_000);
});
