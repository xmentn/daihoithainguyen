import { db } from "./firebase.js";
import {
    collection, onSnapshot, query, orderBy
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const element = (id) => document.getElementById(id);
const STAFF_COLLECTION = "canbo";
const SCHEDULE_COLLECTION = "lichcongtac";

let staffMembers = [];
let schedules = [];
let selectedWeekStart = getMonday(new Date());

initialize();

function initialize() {
    setCurrentDate();

    element("personalStaffSelect").addEventListener("change", renderAll);
    element("personalSearchInput").addEventListener("input", renderList);
    element("personalDateFilter").addEventListener("change", renderList);
    element("personalStatusFilter").addEventListener("change", renderList);
    element("clearPersonalFilterButton").addEventListener("click", clearFilters);

    element("previousWeekButton").addEventListener("click", () => changeWeek(-7));
    element("nextWeekButton").addEventListener("click", () => changeWeek(7));
    element("currentWeekButton").addEventListener("click", () => {
        selectedWeekStart = getMonday(new Date());
        renderWeek();
    });
    element("printPersonalButton").addEventListener("click", () => window.print());

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
        staffMembers = snapshot.docs
            .map(item => ({ id: item.id, ...item.data() }))
            .filter(item => item.hoatDong !== false);

        const select = element("personalStaffSelect");
        const currentValue = select.value;
        select.innerHTML = `<option value="">-- Chọn cán bộ --</option>`;

        staffMembers.forEach(staff => {
            select.insertAdjacentHTML(
                "beforeend",
                `<option value="${staff.id}">${escapeHtml(staff.hoTen)}</option>`
            );
        });

        select.value = currentValue;
        renderAll();
    });
}

function listenToSchedules() {
    const schedulesQuery = query(
        collection(db, SCHEDULE_COLLECTION),
        orderBy("ngay", "asc")
    );

    onSnapshot(schedulesQuery, (snapshot) => {
        schedules = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
        element("personalLoading").classList.add("hidden");
        renderAll();
    });
}

function getSelectedStaff() {
    const id = element("personalStaffSelect").value;
    return staffMembers.find(item => item.id === id);
}

function getPersonalSchedules() {
    const staff = getSelectedStaff();
    if (!staff) return [];

    const normalizedName = normalizeText(staff.hoTen);

    return schedules.filter(schedule =>
        schedule.canBoId === staff.id ||
        (
            !schedule.canBoId &&
            normalizeText(schedule.nguoiThucHien) === normalizedName
        )
    );
}

function renderAll() {
    const staff = getSelectedStaff();
    const name = staff?.hoTen || "Vui lòng chọn cán bộ";

    element("personalListTitle").textContent =
        staff ? `Lịch công tác của ${staff.hoTen}` : "Lịch công tác";

    updateStatistics();
    renderWeek();
    renderList();

    if (!staff) {
        element("personalWeekTitle").textContent = "Vui lòng chọn cán bộ";
    }
}

function updateStatistics() {
    const personalSchedules = getPersonalSchedules();
    const today = getTodayValue();

    element("personalTotal").textContent = personalSchedules.length;
    element("personalToday").textContent =
        personalSchedules.filter(item => item.ngay === today).length;
    element("personalPending").textContent =
        personalSchedules.filter(item => item.trangThai !== "Đã hoàn thành").length;
    element("personalCompleted").textContent =
        personalSchedules.filter(item => item.trangThai === "Đã hoàn thành").length;
}

function renderWeek() {
    const staff = getSelectedStaff();
    const weekEnd = addDays(selectedWeekStart, 6);

    element("personalWeekTitle").textContent = staff
        ? `${staff.hoTen} — Tuần từ ${formatDateObject(selectedWeekStart)} đến ${formatDateObject(weekEnd)}`
        : "Vui lòng chọn cán bộ";

    const grid = element("personalWeekGrid");
    grid.innerHTML = "";

    for (let i = 0; i < 7; i++) {
        const day = addDays(selectedWeekStart, i);
        const dateValue = toDateInputValue(day);

        const daySchedules = getPersonalSchedules()
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
                            <article class="week-event">
                                <div class="week-event-time">${escapeHtml(formatTimeRange(schedule))}</div>
                                <div class="week-event-title">${escapeHtml(schedule.noiDung || "")}</div>
                                <div class="week-event-detail">
                                    ${schedule.diaDiem ? `📍 ${escapeHtml(schedule.diaDiem)}` : ""}
                                </div>
                            </article>
                        `).join("")
                        : `<div class="week-empty">Không có lịch</div>`
                }
            </div>
        `;

        grid.appendChild(column);
    }
}

function renderList() {
    const keyword = normalizeText(element("personalSearchInput").value);
    const selectedDate = element("personalDateFilter").value;
    const selectedStatus = element("personalStatusFilter").value;

    const filtered = getPersonalSchedules()
        .filter(schedule => {
            const searchable = normalizeText(
                `${schedule.noiDung || ""} ${schedule.diaDiem || ""} ${schedule.ghiChu || ""}`
            );

            return (
                (!keyword || searchable.includes(keyword)) &&
                (!selectedDate || schedule.ngay === selectedDate) &&
                (!selectedStatus || schedule.trangThai === selectedStatus)
            );
        })
        .sort(compareSchedules);

    const body = element("personalTableBody");
    body.innerHTML = "";
    element("personalEmptyState").classList.toggle("hidden", filtered.length > 0);

    filtered.forEach(schedule => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td class="time-column">
                ${escapeHtml(formatDate(schedule.ngay))}<br>
                ${escapeHtml(formatTimeRange(schedule))}
            </td>
            <td><strong>${escapeHtml(schedule.noiDung || "")}</strong></td>
            <td>${escapeHtml(schedule.diaDiem || "—")}</td>
            <td>
                <span class="status ${getStatusClass(schedule.trangThai)}">
                    ${escapeHtml(schedule.trangThai || "Chưa thực hiện")}
                </span>
            </td>
            <td>${escapeHtml(schedule.ghiChu || "—")}</td>
        `;
        body.appendChild(row);
    });
}

function clearFilters() {
    element("personalSearchInput").value = "";
    element("personalDateFilter").value = "";
    element("personalStatusFilter").value = "";
    renderList();
}

function changeWeek(days) {
    selectedWeekStart = addDays(selectedWeekStart, days);
    renderWeek();
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