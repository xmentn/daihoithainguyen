import { db, auth } from "./firebase.js";
import { requireAdmin } from "./auth-guard.js";

import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import {
    signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

const COLLECTION_NAME = "canbo";
const element = (id) => document.getElementById(id);

const staffForm = element("staffForm");
const staffIdInput = element("staffId");
const hoTenInput = element("hoTen");
const chucVuInput = element("chucVu");
const emailInput = element("email");
const thuTuInput = element("thuTu");
const hoatDongInput = element("hoatDong");

const staffFormTitle = element("staffFormTitle");
const saveStaffButton = element("saveStaffButton");
const cancelStaffEditButton = element("cancelStaffEditButton");
const message = element("message");
const staffSearchInput = element("staffSearchInput");
const staffTableBody = element("staffTableBody");
const staffLoading = element("staffLoading");
const staffEmptyState = element("staffEmptyState");

let staffMembers = [];
let unsubscribeStaff = null;

startAdminPage();

async function startAdminPage() {
    document.body.classList.add("auth-checking");

    const admin = await requireAdmin();

    showAdminInformation(admin);
    createLogoutButton();

    document.body.classList.remove("auth-checking");

    staffForm.addEventListener("submit", saveStaff);
    cancelStaffEditButton.addEventListener("click", () => resetForm());
    staffSearchInput.addEventListener("input", renderStaff);

    setCurrentDate();
    listenToStaff();
}

function showAdminInformation(admin) {
    const currentDate = element("currentDate");
    const displayName =
        admin.profile.displayName ||
        admin.firebaseUser.email ||
        "Quản trị viên";

    currentDate.innerHTML = `
        <strong>${escapeHtml(displayName)}</strong><br>
        <span id="dateText"></span>
    `;
}

function createLogoutButton() {
    const headerContent = document.querySelector(".header-content");

    const logoutButton = document.createElement("button");
    logoutButton.type = "button";
    logoutButton.className = "header-logout-button";
    logoutButton.textContent = "Đăng xuất";

    logoutButton.addEventListener("click", async () => {
        await signOut(auth);
        window.location.replace("./login.html");
    });

    headerContent.appendChild(logoutButton);
}

function setCurrentDate() {
    const target = element("dateText") || element("currentDate");

    target.textContent = new Intl.DateTimeFormat("vi-VN", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }).format(new Date());
}

function listenToStaff() {
    const staffQuery = query(
        collection(db, COLLECTION_NAME),
        orderBy("thuTu", "asc")
    );

    unsubscribeStaff = onSnapshot(
        staffQuery,
        (snapshot) => {
            staffMembers = snapshot.docs.map((item) => ({
                id: item.id,
                ...item.data()
            }));

            staffLoading.classList.add("hidden");
            updateStatistics();
            renderStaff();
        },
        (error) => {
            console.error(error);
            staffLoading.classList.add("hidden");
            showMessage("Không tải được danh sách cán bộ.", "error");
        }
    );
}

async function saveStaff(event) {
    event.preventDefault();

    const data = {
        hoTen: hoTenInput.value.trim(),
        chucVu: chucVuInput.value.trim(),
        email: emailInput.value.trim(),
        thuTu: Number(thuTuInput.value) || 1,
        hoatDong: hoatDongInput.checked
    };

    if (!data.hoTen) {
        showMessage("Bạn cần nhập họ và tên cán bộ.", "error");
        return;
    }

    saveStaffButton.disabled = true;
    saveStaffButton.textContent = "Đang lưu...";

    try {
        if (staffIdInput.value) {
            await updateDoc(
                doc(db, COLLECTION_NAME, staffIdInput.value),
                {
                    ...data,
                    updatedAt: serverTimestamp()
                }
            );

            showMessage("Đã cập nhật thông tin cán bộ.", "success");
        } else {
            await addDoc(
                collection(db, COLLECTION_NAME),
                {
                    ...data,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                }
            );

            showMessage("Đã thêm cán bộ.", "success");
        }

        resetForm(false);
    } catch (error) {
        console.error(error);
        showMessage(
            "Không thể lưu. Tài khoản có thể không có quyền quản trị.",
            "error"
        );
    } finally {
        saveStaffButton.disabled = false;
        saveStaffButton.textContent = "Lưu cán bộ";
    }
}

function renderStaff() {
    const keyword = normalizeText(staffSearchInput.value);

    const filtered = staffMembers.filter((item) => {
        const searchable = normalizeText(
            `${item.hoTen || ""} ${item.chucVu || ""} ${item.email || ""}`
        );

        return !keyword || searchable.includes(keyword);
    });

    staffTableBody.innerHTML = "";
    staffEmptyState.classList.toggle("hidden", filtered.length > 0);

    filtered.forEach((staff, index) => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${escapeHtml(staff.hoTen || "")}</strong></td>
            <td>${escapeHtml(staff.chucVu || "—")}</td>
            <td>${escapeHtml(staff.email || "—")}</td>
            <td>
                <span class="status ${
                    staff.hoatDong !== false
                        ? "status-completed"
                        : "status-inactive"
                }">
                    ${
                        staff.hoatDong !== false
                            ? "Đang hoạt động"
                            : "Ngừng hoạt động"
                    }
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button
                        type="button"
                        class="edit-button"
                        data-edit-id="${staff.id}"
                    >
                        Sửa
                    </button>

                    <button
                        type="button"
                        class="delete-button"
                        data-delete-id="${staff.id}"
                    >
                        Xóa
                    </button>
                </div>
            </td>
        `;

        staffTableBody.appendChild(row);
    });

    staffTableBody
        .querySelectorAll("[data-edit-id]")
        .forEach((button) => {
            button.addEventListener(
                "click",
                () => startEdit(button.dataset.editId)
            );
        });

    staffTableBody
        .querySelectorAll("[data-delete-id]")
        .forEach((button) => {
            button.addEventListener(
                "click",
                () => removeStaff(button.dataset.deleteId)
            );
        });
}

function startEdit(id) {
    const staff = staffMembers.find((item) => item.id === id);

    if (!staff) {
        return;
    }

    staffIdInput.value = staff.id;
    hoTenInput.value = staff.hoTen || "";
    chucVuInput.value = staff.chucVu || "";
    emailInput.value = staff.email || "";
    thuTuInput.value = staff.thuTu || 1;
    hoatDongInput.checked = staff.hoatDong !== false;

    staffFormTitle.textContent = "Chỉnh sửa cán bộ";
    saveStaffButton.textContent = "Cập nhật cán bộ";
    cancelStaffEditButton.classList.remove("hidden");

    window.scrollTo({
        top: 100,
        behavior: "smooth"
    });
}

async function removeStaff(id) {
    const staff = staffMembers.find((item) => item.id === id);

    if (!staff) {
        return;
    }

    const accepted = window.confirm(
        `Bạn có chắc chắn muốn xóa cán bộ:

${staff.hoTen}?`
    );

    if (!accepted) {
        return;
    }

    try {
        await deleteDoc(doc(db, COLLECTION_NAME, id));
        showMessage("Đã xóa cán bộ.", "success");

        if (staffIdInput.value === id) {
            resetForm(false);
        }
    } catch (error) {
        console.error(error);
        showMessage(
            "Không thể xóa. Tài khoản có thể không có quyền quản trị.",
            "error"
        );
    }
}

function resetForm(clearMessage = true) {
    staffForm.reset();
    staffIdInput.value = "";
    thuTuInput.value = 1;
    hoatDongInput.checked = true;

    staffFormTitle.textContent = "Thêm cán bộ";
    saveStaffButton.textContent = "Lưu cán bộ";
    cancelStaffEditButton.classList.add("hidden");

    if (clearMessage) {
        message.classList.add("hidden");
    }
}

function updateStatistics() {
    element("staffCount").textContent = staffMembers.length;
    element("activeStaffCount").textContent =
        staffMembers.filter((item) => item.hoatDong !== false).length;
}

function normalizeText(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
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
    message.className =
        type === "success"
            ? "message message-success"
            : "message message-error";

    window.setTimeout(
        () => message.classList.add("hidden"),
        4500
    );
}

window.addEventListener("beforeunload", () => {
    if (unsubscribeStaff) {
        unsubscribeStaff();
    }
});
