import { db } from "./firebase.js";
import {
    collection, addDoc, updateDoc, deleteDoc, doc,
    onSnapshot, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const SCHEDULE_COLLECTION = "lichcongtac";
const STAFF_COLLECTION = "canbo";

const element = (id) => document.getElementById(id);

const scheduleForm = element("scheduleForm");
const scheduleIdInput = element("scheduleId");
const noiDungInput = element("noiDung");
const ngayInput = element("ngay");
const gioBatDauInput = element("gioBatDau");
const gioKetThucInput = element("gioKetThuc");
const diaDiemInput = element("diaDiem");
const canBoIdInput = element("canBoId");
const trangThaiInput = element("trangThai");
const ghiChuInput = element("ghiChu");

const formTitle = element("formTitle");
const saveButton = element("saveButton");
const cancelEditButton = element("cancelEditButton");
const message = element("message");

const searchInput = element("searchInput");
const dateFilter = element("dateFilter");
const staffFilter = element("staffFilter");
const statusFilter = element("statusFilter");
const clearFilterButton = element("clearFilterButton");

const scheduleTableBody = element("scheduleTableBody");
const loading = element("loading");
const emptyState = element("emptyState");

const totalSchedules = element("totalSchedules");
const todaySchedules = element("todaySchedules");
const pendingSchedules = element("pendingSchedules");
const completedSchedules = element("completedSchedules");

const weekTitle = element("weekTitle");
const weekGrid = element("weekGrid");

let schedules = [];
let staffMembers = [];
let selectedWeekStart = getMonday(new Date());

initialize();

function initialize() {
    setCurrentDate();
    ngayInput.value = getTodayValue();

    scheduleForm.addEventListener("submit", saveSchedule);
    cancelEditButton.addEventListener("click", () => resetForm());
    searchInput.addEventListener("input", renderSchedules);
    dateFilter.addEventListener("change", renderSchedules);
    staffFilter.addEventListener("change", renderSchedules);
    statusFilter.addEventListener("change", renderSchedules);
    clearFilterButton.addEventListener("click", clearFilters);

    element("previousWeekButton").addEventListener("click", () => changeWeek(-7));
    element("nextWeekButton").addEventListener("click", () => changeWeek(7));
    element("currentWeekButton").addEventListener("click", () => {
        selectedWeekStart = getMonday(new Date());
        renderWeekView();
    });
    element("printWeekButton").addEventListener("click", () => window.print());

    listenToStaff();
    listenToSchedules();
}

function setCurrentDate() {
    element("currentDate").textContent = new Intl.DateTimeFormat("vi-VN", {
        weekday: "long", day: "2-digit", month: "2-digit", year: "numeric"
    }).format(new Date());
}

function listenToStaff() {
    const staffQuery = query(collection(db, STAFF_COLLECTION), orderBy("thuTu", "asc"));

    onSnapshot(staffQuery, (snapshot) => {
        staffMembers = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
        renderStaffOptions();
        renderSchedules();
        renderWeekView();
    }, (error) => {
        console.error(error);
        showMessage("Không tải được danh sách cán bộ.", "error");
    });
}

function renderStaffOptions() {
    const currentFormValue = canBoIdInput.value;
    const currentFilterValue = staffFilter.value;

    const activeStaff = staffMembers.filter(item => item.hoatDong !== false);

    canBoIdInput.innerHTML = `<option value="">-- Chọn cán bộ --</option>`;
    staffFilter.innerHTML = `<option value="">Tất cả cán bộ</option>`;

    activeStaff.forEach((staff) => {
        const label = staff.chucVu
            ? `${staff.hoTen} - ${staff.chucVu}`
            : staff.hoTen;

        canBoIdInput.insertAdjacentHTML(
            "beforeend",
            `<option value="${staff.id}">${escapeHtml(label)}</option>`
        );

        staffFilter.insertAdjacentHTML(
            "beforeend",
            `<option value="${staff.id}">${escapeHtml(staff.hoTen)}</option>`
        );
    });

    canBoIdInput.value = currentFormValue;
    staffFilter.value = currentFilterValue;
}

function listenToSchedules() {
    const schedulesQuery = query(
        collection(db, SCHEDULE_COLLECTION),
        orderBy("ngay", "asc")
    );

    onSnapshot(schedulesQuery, (snapshot) => {
        schedules = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
        loading.classList.add("hidden");
        updateStatistics();
        renderSchedules();
        renderWeekView();
    }, (error) => {
        console.error(error);
        loading.classList.add("hidden");
        showMessage("Không tải được dữ liệu lịch công tác.", "error");
    });
}

async function saveSchedule(event) {
    event.preventDefault();

    const selectedStaff = staffMembers.find(item => item.id === canBoIdInput.value);

    const data = {
        noiDung: noiDungInput.value.trim(),
        ngay: ngayInput.value,
        gioBatDau: gioBatDauInput.value,
        gioKetThuc: gioKetThucInput.value,
        diaDiem: diaDiemInput.value.trim(),
        canBoId: canBoIdInput.value,
        nguoiThucHien: selectedStaff?.hoTen || "",
        trangThai: trangThaiInput.value,
        ghiChu: ghiChuInput.value.trim()
    };

    if (!data.noiDung || !data.ngay || !data.gioBatDau) {
        showMessage("Bạn cần nhập nội dung, ngày và giờ bắt đầu.", "error");
        return;
    }

    if (data.gioKetThuc && data.gioKetThuc < data.gioBatDau) {
        showMessage("Giờ kết thúc không được nhỏ hơn giờ bắt đầu.", "error");
        return;
    }

    saveButton.disabled = true;
    saveButton.textContent = "Đang lưu...";

    try {
        if (scheduleIdInput.value) {
            await updateDoc(doc(db, SCHEDULE_COLLECTION, scheduleIdInput.value), {
                ...data,
                updatedAt: serverTimestamp()
            });
            showMessage("Đã cập nhật lịch công tác.", "success");
        } else {
            await addDoc(collection(db, SCHEDULE_COLLECTION), {
                ...data,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            showMessage("Đã thêm lịch công tác.", "success");
        }

        resetForm(false);
    } catch (error) {
        console.error(error);
        showMessage("Không thể lưu dữ liệu.", "error");
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Lưu lịch công tác";
    }
}

function renderSchedules() {
    const keyword = normalizeText(searchInput.value);
    const selectedDate = dateFilter.value;
    const selectedStaffId = staffFilter.value;
    const selectedStatus = statusFilter.value;

    const filtered = schedules
        .filter(schedule => {
            const staffName = getScheduleStaffName(schedule);
            const searchable = normalizeText(
                `${schedule.noiDung || ""} ${schedule.diaDiem || ""} ${staffName} ${schedule.ghiChu || ""}`
            );

            const staffMatches =
                !selectedStaffId ||
                schedule.canBoId === selectedStaffId ||
                (
                    !schedule.canBoId &&
                    normalizeText(schedule.nguoiThucHien) ===
                    normalizeText(getStaffName(selectedStaffId))
                );

            return (
                (!keyword || searchable.includes(keyword)) &&
                (!selectedDate || schedule.ngay === selectedDate) &&
                staffMatches &&
                (!selectedStatus || schedule.trangThai === selectedStatus)
            );
        })
        .sort(compareSchedules);

    scheduleTableBody.innerHTML = "";
    emptyState.classList.toggle("hidden", filtered.length > 0);

    filtered.forEach(schedule => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td class="time-column">
                ${escapeHtml(formatDate(schedule.ngay))}<br>
                ${escapeHtml(formatTimeRange(schedule))}
            </td>
            <td>
                <div class="schedule-content-title">${escapeHtml(schedule.noiDung || "")}</div>
                ${schedule.ghiChu ? `<div class="schedule-note">${escapeHtml(schedule.ghiChu)}</div>` : ""}
            </td>
            <td>${escapeHtml(schedule.diaDiem || "—")}</td>
            <td>${escapeHtml(getScheduleStaffName(schedule) || "—")}</td>
            <td>
                <span class="status ${getStatusClass(schedule.trangThai)}">
                    ${escapeHtml(schedule.trangThai || "Chưa thực hiện")}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="edit-button" data-edit-id="${schedule.id}" type="button">Sửa</button>
                    <button class="delete-button" data-delete-id="${schedule.id}" type="button">Xóa</button>
                </div>
            </td>
        `;
        scheduleTableBody.appendChild(row);
    });

    scheduleTableBody.querySelectorAll("[data-edit-id]").forEach(button => {
        button.addEventListener("click", () => startEdit(button.dataset.editId));
    });

    scheduleTableBody.querySelectorAll("[data-delete-id]").forEach(button => {
        button.addEventListener("click", () => removeSchedule(button.dataset.deleteId));
    });
}

function renderWeekView() {
    const weekEnd = addDays(selectedWeekStart, 6);
    weekTitle.textContent =
        `Tuần từ ${formatDateObject(selectedWeekStart)} đến ${formatDateObject(weekEnd)}`;

    weekGrid.innerHTML = "";

    for (let i = 0; i < 7; i++) {
        const day = addDays(selectedWeekStart, i);
        const dateValue = toDateInputValue(day);
        const daySchedules = schedules
            .filter(item => item.ngay === dateValue)
            .sort(compareSchedules);

        const column = document.createElement("div");
        column.className = `week-day ${dateValue === getTodayValue() ? "today" : ""}`;

        column.innerHTML = `
            <div class="week-day-header">
                <span class="week-day-name">${getWeekdayName(day)}</span>
                <span class="week-day-date">${formatDateObject(day)}</span>
            </div>
            <div class="week-day-body">
                ${
                    daySchedules.length
                        ? daySchedules.map(schedule => `
                            <article class="week-event" data-week-id="${schedule.id}">
                                <div class="week-event-time">${escapeHtml(formatTimeRange(schedule))}</div>
                                <div class="week-event-title">${escapeHtml(schedule.noiDung || "")}</div>
                                <div class="week-event-detail">
                                    ${schedule.diaDiem ? `📍 ${escapeHtml(schedule.diaDiem)}<br>` : ""}
                                    ${getScheduleStaffName(schedule) ? `👤 ${escapeHtml(getScheduleStaffName(schedule))}` : ""}
                                </div>
                            </article>
                        `).join("")
                        : `<div class="week-empty">Không có lịch</div>`
                }
            </div>
        `;

        weekGrid.appendChild(column);
    }

    weekGrid.querySelectorAll("[data-week-id]").forEach(item => {
        item.addEventListener("click", () => startEdit(item.dataset.weekId));
    });
}

function startEdit(id) {
    const schedule = schedules.find(item => item.id === id);
    if (!schedule) return;

    scheduleIdInput.value = schedule.id;
    noiDungInput.value = schedule.noiDung || "";
    ngayInput.value = schedule.ngay || "";
    gioBatDauInput.value = schedule.gioBatDau || "";
    gioKetThucInput.value = schedule.gioKetThuc || "";
    diaDiemInput.value = schedule.diaDiem || "";
    canBoIdInput.value = schedule.canBoId || findStaffIdByName(schedule.nguoiThucHien);
    trangThaiInput.value = schedule.trangThai || "Chưa thực hiện";
    ghiChuInput.value = schedule.ghiChu || "";

    formTitle.textContent = "Chỉnh sửa lịch công tác";
    saveButton.textContent = "Cập nhật lịch công tác";
    cancelEditButton.classList.remove("hidden");

    element("scheduleFormPanel").scrollIntoView({ behavior: "smooth" });
}

async function removeSchedule(id) {
    const schedule = schedules.find(item => item.id === id);
    if (!schedule) return;

    if (!confirm(`Bạn có chắc chắn muốn xóa lịch:\n\n${schedule.noiDung}`)) return;

    try {
        await deleteDoc(doc(db, SCHEDULE_COLLECTION, id));
        showMessage("Đã xóa lịch công tác.", "success");
        if (scheduleIdInput.value === id) resetForm(false);
    } catch (error) {
        console.error(error);
        showMessage("Không thể xóa dữ liệu.", "error");
    }
}

function resetForm(clearMessage = true) {
    scheduleForm.reset();
    scheduleIdInput.value = "";
    ngayInput.value = getTodayValue();
    trangThaiInput.value = "Chưa thực hiện";
    formTitle.textContent = "Thêm lịch công tác";
    saveButton.textContent = "Lưu lịch công tác";
    cancelEditButton.classList.add("hidden");
    if (clearMessage) message.classList.add("hidden");
}

function clearFilters() {
    searchInput.value = "";
    dateFilter.value = "";
    staffFilter.value = "";
    statusFilter.value = "";
    renderSchedules();
}

function updateStatistics() {
    const today = getTodayValue();
    totalSchedules.textContent = schedules.length;
    todaySchedules.textContent = schedules.filter(item => item.ngay === today).length;
    pendingSchedules.textContent = schedules.filter(item => item.trangThai !== "Đã hoàn thành").length;
    completedSchedules.textContent = schedules.filter(item => item.trangThai === "Đã hoàn thành").length;
}

function getScheduleStaffName(schedule) {
    if (schedule.canBoId) {
        const staff = staffMembers.find(item => item.id === schedule.canBoId);
        if (staff) return staff.hoTen;
    }
    return schedule.nguoiThucHien || "";
}

function getStaffName(id) {
    return staffMembers.find(item => item.id === id)?.hoTen || "";
}

function findStaffIdByName(name) {
    const normalized = normalizeText(name);
    return staffMembers.find(item => normalizeText(item.hoTen) === normalized)?.id || "";
}

function changeWeek(days) {
    selectedWeekStart = addDays(selectedWeekStart, days);
    renderWeekView();
}

function compareSchedules(a, b) {
    return `${a.ngay || ""} ${a.gioBatDau || ""}`.localeCompare(
        `${b.ngay || ""} ${b.gioBatDau || ""}`
    );
}

function getMonday(date) {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    const day = result.getDay();
    result.setDate(result.getDate() + (day === 0 ? -6 : 1 - day));
    return result;
}

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function getWeekdayName(date) {
    return ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"][date.getDay()];
}

function toDateInputValue(date) {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString().slice(0, 10);
}

function getTodayValue() {
    return toDateInputValue(new Date());
}

function formatDateObject(date) {
    return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit", month: "2-digit", year: "numeric"
    }).format(date);
}

function formatDate(value) {
    if (!value) return "—";
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
}

function formatTimeRange(schedule) {
    if (!schedule.gioBatDau) return "—";
    return schedule.gioKetThuc
        ? `${schedule.gioBatDau} - ${schedule.gioKetThuc}`
        : schedule.gioBatDau;
}

function getStatusClass(status) {
    if (status === "Đã hoàn thành") return "status-completed";
    if (status === "Đang thực hiện") return "status-processing";
    return "status-pending";
}

function normalizeText(value) {
    return String(value || "").normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase().trim();
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function showMessage(text, type) {
    message.textContent = text;
    message.className = type === "success"
        ? "message message-success"
        : "message message-error";

    setTimeout(() => message.classList.add("hidden"), 4500);
}