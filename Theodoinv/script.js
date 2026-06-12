import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
    getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, getDoc
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import {
    getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

// Điền cấu hình Firebase chuẩn của bạn vào đây
const firebaseConfig = {

    apiKey: "AIzaSyAHlNWf3jrLqjtCvPvO4YEVKKsGB9BGYCE",

    authDomain: "theo-doi-nhiem-vu-498a9.firebaseapp.com",

    projectId: "theo-doi-nhiem-vu-498a9",

    storageBucket: "theo-doi-nhiem-vu-498a9.firebasestorage.app",

    messagingSenderId: "112714250973",

    appId: "1:112714250973:web:2df446ff42850f859df934"

};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Tham chiếu bộ sưu tập (Collection) trên Firestore
const docsCollectionRef = collection(db, "documents");
const tasksCollectionRef = collection(db, "tasks");
const deptsCollectionRef = collection(db, "departments"); // Bảng mới lưu Danh mục đơn vị

// DOM Elements Hệ thống và Tabs
const loginModal = document.getElementById("login-modal");
const mainApp = document.getElementById("main-app");
const loginForm = document.getElementById("login-form");
const userDisplayInfo = document.getElementById("user-display-info");
const btnLogout = document.getElementById("btn-logout");
const tabAdminBtn = document.getElementById("tab-admin-btn");
const tabButtons = document.querySelectorAll(".tab-navigation .tab-btn");
const subTabButtons = document.querySelectorAll(".sub-tab-btn");

// DOM Quản lý văn bản
const documentForm = document.getElementById("document-form");
const docIdInput = document.getElementById("doc-id");
const formTitle = document.getElementById("form-title");
const btnSubmitForm = document.getElementById("btn-submit-form");
const btnCancelEdit = document.getElementById("btn-cancel-edit");
const adminDocList = document.getElementById("admin-doc-list");

// DOM QUẢN LÝ DANH MỤC ĐƠN VỊ (MỚI THÊM)
const departmentForm = document.getElementById("department-form");
const deptIdInput = document.getElementById("dept-id");
const deptFormTitle = document.getElementById("dept-form-title");
const btnSubmitDept = document.getElementById("btn-submit-dept");
const btnCancelDeptEdit = document.getElementById("btn-cancel-dept-edit");
const adminDeptList = document.getElementById("admin-dept-list");

// DOM Quản lý giao nhiệm vụ
const taskForm = document.getElementById("task-form");
const taskIdInput = document.getElementById("task-id");
const taskDocSelect = document.getElementById("task-doc-select");
const taskDeptSelect = document.getElementById("task-dept-select"); // Thẻ select đơn vị mới
const taskFormTitle = document.getElementById("task-form-title");
const btnSubmitTask = document.getElementById("btn-submit-task");
const btnCancelTaskEdit = document.getElementById("btn-cancel-task-edit");
const adminTaskList = document.getElementById("admin-task-list");
const progressList = document.getElementById("progress-list");
const filterDept = document.getElementById("filter-dept"); // Ô select lọc đơn vị ngoài trang chính
let allTasksData = []; // Biến mảng trung gian để lưu trữ toàn bộ nhiệm vụ phục vụ việc lọc dữ liệu
// ==========================================
// THÔNG BÁO TOAST CHUYÊN NGHIỆP
// ==========================================
function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    let icon = "fa-circle-check";
    if (type === "warning") icon = "fa-circle-exclamation";
    if (type === "error") icon = "fa-circle-xmark";

    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <div class="toast-message">${message}</div>
        <button class="toast-close"><i class="fa-solid fa-xmark"></i></button>
    `;
    container.appendChild(toast);
    toast.querySelector(".toast-close").addEventListener("click", () => {
        toast.style.animation = "fadeOut 0.3s ease forwards";
        setTimeout(() => toast.remove(), 300);
    });
    setTimeout(() => { if (toast.parentNode) { toast.style.animation = "fadeOut 0.3s ease forwards"; setTimeout(() => toast.remove(), 300); } }, 3500);
}

// ==========================================
// XỬ LÝ ĐĂNG NHẬP & PHÂN QUYỀN
// ==========================================
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
        showToast("Đăng nhập hệ thống thành công!");
    } catch (error) {
        showToast("Tài khoản hoặc mật khẩu không chính xác.", "error");
    }
});

btnLogout.addEventListener("click", () => {
    signOut(auth).then(() => {
        showToast("Đã đăng xuất khỏi hệ thống.", "warning");
        switchTab("progress-tab");
    });
});

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        let role = "user";
        if (userDocSnap.exists()) role = userDocSnap.data().role;

        const roleText = role === "admin" ? "Quản trị viên" : "Cán bộ xem";
        userDisplayInfo.innerHTML = `<i class="fa-solid fa-user-tie"></i> ${user.email} (${roleText})`;

        if (role === "admin") tabAdminBtn.classList.remove("hidden");
        else tabAdminBtn.classList.add("hidden");

        loginModal.classList.add("hidden");
        mainApp.classList.remove("hidden");
    } else {
        loginModal.classList.remove("hidden");
        mainApp.classList.add("hidden");
    }
});

tabButtons.forEach(button => {
    button.addEventListener("click", () => { switchTab(button.getAttribute("data-tab")); });
});

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-navigation .tab-btn').forEach(btn => btn.classList.remove('active'));
    if (document.getElementById(tabId)) {
        document.getElementById(tabId).classList.add('active');
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    }
}

// Điều hướng menu con Quản trị
subTabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        const targetSubId = btn.getAttribute("data-subtab");
        document.querySelectorAll(".sub-tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".sub-tab-content").forEach(c => c.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById(targetSubId).classList.add("active");
    });
});

// ==========================================
// 1. NGHIỆP VỤ: QUẢN LÝ HỆ THỐNG VĂN BẢN
// ==========================================
const qDocs = query(docsCollectionRef, orderBy("createdAt", "desc"));
onSnapshot(qDocs, (snapshot) => {
    adminDocList.innerHTML = "";
    taskDocSelect.innerHTML = `<option value="">-- Chọn văn bản từ danh mục --</option>`;
    let index = 1;
    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        adminDocList.innerHTML += `
            <tr>
                <td style="text-align: center; font-weight: bold;">${index}</td>
                <td style="font-weight: 500;">${data.docNumber}</td>
                <td style="max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${data.docSummary}</td>
                <td>
                    <div class="action-buttons-cell">
                        <button class="btn-table-edit doc-edit-trigger" data-id="${docSnap.id}"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="btn-table-delete doc-delete-trigger" data-id="${docSnap.id}"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                </td>
            </tr>
        `;
        taskDocSelect.innerHTML += `<option value="${data.docNumber}">${data.docNumber}</option>`;
        index++;
    });
    attachDocRowEvents();
});

documentForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const docId = docIdInput.value;
    const docNumber = document.getElementById("doc-number").value.trim();
    const docDate = document.getElementById("doc-date").value;
    const docSummary = document.getElementById("doc-summary").value.trim();
    try {
        if (docId === "") {
            await addDoc(docsCollectionRef, { docNumber, docDate, docSummary, createdAt: new Date() });
            showToast("Đã lưu văn bản nhiệm vụ mới thành công!");
        } else {
            await updateDoc(doc(db, "documents", docId), { docNumber, docDate, docSummary });
            showToast("Đã cập nhật thay đổi văn bản thành công!");
            clearFormUpdateMode();
        }
        documentForm.reset();
    } catch (error) { showToast("Thao tác thất bại.", "error"); }
});

function attachDocRowEvents() {
    document.querySelectorAll(".doc-delete-trigger").forEach(btn => {
        btn.addEventListener("click", async () => {
            if (confirm("Bạn có chắc chắn muốn xóa văn bản này không?")) {
                await deleteDoc(doc(db, "documents", btn.getAttribute("data-id")));
                showToast("Đã xóa văn bản khỏi danh mục.", "warning");
            }
        });
    });
    document.querySelectorAll(".doc-edit-trigger").forEach(btn => {
        btn.addEventListener("click", async () => {
            const docSnap = await getDoc(doc(db, "documents", btn.getAttribute("data-id")));
            if (docSnap.exists()) {
                const data = docSnap.data();
                docIdInput.value = docSnap.id;
                document.getElementById("doc-number").value = data.docNumber;
                document.getElementById("doc-date").value = data.docDate;
                document.getElementById("doc-summary").value = data.docSummary;
                formTitle.innerHTML = `<i class="fa-solid fa-file-pen"></i> Hiệu chỉnh văn bản ban hành`;
                btnSubmitForm.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Lưu cập nhật`;
                btnSubmitForm.classList.add("btn-update-mode");
                btnCancelEdit.classList.remove("hidden");
            }
        });
    });
}
btnCancelEdit.addEventListener("click", () => { documentForm.reset(); clearFormUpdateMode(); });
function clearFormUpdateMode() { docIdInput.value = ""; formTitle.innerHTML = `<i class="fa-solid fa-file-pen"></i> Cập nhật Danh mục văn bản`; btnSubmitForm.innerHTML = `<i class="fa-solid fa-plus"></i> Thêm văn bản`; btnSubmitForm.classList.remove("btn-update-mode"); btnCancelEdit.classList.add("hidden"); }


// ==========================================
// 2. NGHIỆP VỤ MỚI: QUẢN LÝ DANH MỤC ĐƠN VỊ
// ==========================================

// Gửi form lưu/sửa Đơn vị lên Firestore
departmentForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const deptId = deptIdInput.value;
    const deptName = document.getElementById("dept-name").value.trim();

    try {
        if (deptId === "") {
            // Thêm mới đơn vị
            await addDoc(deptsCollectionRef, {
                deptName: deptName,
                createdAt: new Date()
            });
            showToast("Đã thêm đơn vị mới vào hệ thống danh mục!");
        } else {
            // Cập nhật sửa đổi đơn vị
            await updateDoc(doc(db, "departments", deptId), {
                deptName: deptName
            });
            showToast("Cập nhật thông tin phòng ban thành công!");
            clearDeptFormUpdateMode();
        }
        departmentForm.reset();
    } catch (error) {
        showToast("Lưu dữ liệu đơn vị thất bại.", "error");
    }
});

// Lắng nghe dữ liệu Đơn vị Realtime và đồng bộ lên ô Chọn Giao việc
// Lắng nghe dữ liệu Đơn vị Realtime và đồng bộ lên các ô chọn
const qDepts = query(deptsCollectionRef, orderBy("createdAt", "desc"));
onSnapshot(qDepts, (snapshot) => {
    adminDeptList.innerHTML = "";
    // Làm mới cả 2 ô chọn select đơn vị
    taskDeptSelect.innerHTML = `<option value="">-- Chọn đơn vị nhận việc --</option>`;
    filterDept.innerHTML = `<option value="">-- Tất cả đơn vị --</option>`;
    let index = 1;

    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const id = docSnap.id;

        adminDeptList.innerHTML += `
            <tr>
                <td style="text-align: center; font-weight: bold;">${index}</td>
                <td style="font-weight: 500;">${data.deptName}</td>
                <td>
                    <div class="action-buttons-cell">
                        <button class="btn-table-edit dept-edit-trigger" data-id="${id}"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="btn-table-delete dept-delete-trigger" data-id="${id}"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                </td>
            </tr>
        `;

        // Đẩy tên đơn vị sang cả 2 ô chọn select
        taskDeptSelect.innerHTML += `<option value="${data.deptName}">${data.deptName}</option>`;
        filterDept.innerHTML += `<option value="${data.deptName}">${data.deptName}</option>`;
        index++;
    });
    attachDeptRowEvents();
});

function attachDeptRowEvents() {
    document.querySelectorAll(".dept-delete-trigger").forEach(btn => {
        btn.addEventListener("click", async () => {
            if (confirm("Bạn có chắc chắn muốn xóa đơn vị này không? Thao tác này không ảnh hưởng đến nhiệm vụ cũ.")) {
                await deleteDoc(doc(db, "departments", btn.getAttribute("data-id")));
                showToast("Đã xóa đơn vị khỏi hệ thống danh mục.", "warning");
            }
        });
    });

    document.querySelectorAll(".dept-edit-trigger").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = btn.getAttribute("data-id");
            const deptSnap = await getDoc(doc(db, "departments", id));
            if (deptSnap.exists()) {
                deptIdInput.value = deptSnap.id;
                document.getElementById("dept-name").value = deptSnap.data().deptName;

                deptFormTitle.innerHTML = `<i class="fa-solid fa-folder-plus"></i> Hiệu chỉnh thông tin Đơn vị`;
                btnSubmitDept.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Lưu cập nhật`;
                btnSubmitDept.classList.add("btn-update-mode");
                btnCancelDeptEdit.classList.remove("hidden");
            }
        });
    });
}

btnCancelDeptEdit.addEventListener("click", () => { departmentForm.reset(); clearDeptFormUpdateMode(); });
function clearDeptFormUpdateMode() { deptIdInput.value = ""; deptFormTitle.innerHTML = `<i class="fa-solid fa-folder-plus"></i> Cập nhật Đơn vị phòng ban`; btnSubmitDept.innerHTML = `<i class="fa-solid fa-plus"></i> Thêm đơn vị`; btnSubmitDept.classList.remove("btn-update-mode"); btnCancelDeptEdit.classList.add("hidden"); }


// ==========================================
// 3. NGHIỆP VỤ: QUẢN LÝ GIAO NHIỆM VỤ
// ==========================================
taskForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const taskId = taskIdInput.value;
    const taskContent = document.getElementById("task-content").value.trim();
    const taskDoc = taskDocSelect.value;
    const taskDeadline = document.getElementById("task-deadline").value;
    const taskAssignee = taskDeptSelect.value; // Lấy từ Select thay vì input text cũ

    try {
        if (taskId === "") {
            await addDoc(tasksCollectionRef, { taskContent, taskDoc, taskDeadline, taskAssignee, createdAt: new Date() });
            showToast("Đã phát hành và giao nhiệm vụ mới thành công!");
        } else {
            await updateDoc(doc(db, "tasks", taskId), { taskContent, taskDoc, taskDeadline, taskAssignee });
            showToast("Cập nhật thông tin phân công nhiệm vụ thành công!");
            clearTaskFormUpdateMode();
        }
        taskForm.reset();
    } catch (error) { showToast("Lưu thông tin nhiệm vụ thất bại.", "error"); }
});

// Lắng nghe danh sách Nhiệm vụ đồng bộ realtime
const qTasks = query(tasksCollectionRef, orderBy("createdAt", "desc"));
onSnapshot(qTasks, (snapshot) => {
    allTasksData = []; // Reset mảng lưu trữ tạm thời

    snapshot.forEach((docSnap) => {
        allTasksData.push({
            id: docSnap.id,
            ...docSnap.data()
        });
    });

    // Thực hiện render giao diện dựa trên bộ lọc hiện tại
    renderTasksTable(filterDept.value);
});

// Hàm kết xuất dữ liệu lên bảng dựa trên giá trị lọc đơn vị
function renderTasksTable(selectedDept = "") {
    progressList.innerHTML = "";
    adminTaskList.innerHTML = "";
    let index = 1;

    // Lọc danh sách nếu người dùng chọn một đơn vị cụ thể
    const filteredTasks = selectedDept === ""
        ? allTasksData
        : allTasksData.filter(task => task.taskAssignee === selectedDept);

    if (filteredTasks.length === 0) {
        progressList.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#94a3b8;">Không có nhiệm vụ nào thuộc phạm vi tìm kiếm.</td></tr>`;
        adminTaskList.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#94a3b8;">Trống</td></tr>`;
        return;
    }

    // Lấy thời mốc thời gian hiện tại (chỉ lấy phần ngày, loại bỏ giờ để tính toán chính xác)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    filteredTasks.forEach((task) => {
        const formattedDeadline = task.taskDeadline ? task.taskDeadline.split('-').reverse().join('/') : '';

        // --- LOGIC TÍNH NGÀY CẬP NHẬT TRẠNG THÁI CẢNH BÁO ---
        let statusHtml = `<span class="status-badge waiting"><i class="fa-regular fa-clock"></i> Chờ tiến độ</span>`;

        if (task.taskDeadline) {
            const deadlineDate = new Date(task.taskDeadline);
            deadlineDate.setHours(0, 0, 0, 0);

            // Tính khoảng cách số mili-giây và quy đổi ra số ngày
            const timeDiff = deadlineDate.getTime() - today.getTime();
            const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

            if (daysLeft >= 0 && daysLeft <= 3) {
                // Nếu thời gian còn lại nằm trong khoảng từ 0 đến 3 ngày
                statusHtml = `<span class="status-badge near-deadline"><i class="fa-solid fa-triangle-exclamation"></i> Sắp đến hạn (${daysLeft} ngày)</span>`;
            } else if (daysLeft < 0) {
                // Nếu đã qua ngày hoàn thành mà chưa xong
                statusHtml = `<span class="status-badge" style="background-color:#fee2e2; color:#ef4444; border:1px solid #fca5a5;"><i class="fa-solid fa-circle-exclamation"></i> Trễ hạn (${Math.abs(daysLeft)} ngày)</span>`;
            }
        }

        // Đổ dữ liệu vào TAB CHÍNH 1: Theo dõi tiến độ cho toàn bộ cơ quan xem
        progressList.innerHTML += `
            <tr>
                <td style="text-align: center; font-weight: bold;">${index}</td>
                <td style="font-weight: 500; color: #1e293b;">${task.taskContent}</td>
                <td style="font-weight: 600; color: var(--primary-color);">${task.taskDoc}</td>
                <td><i class="fa-regular fa-calendar-check"></i> ${formattedDeadline}</td>
                <td><span style="background-color: #f1f5f9; padding: 4px 8px; border-radius:4px; font-size:0.9rem;"><i class="fa-solid fa-building"></i> ${task.taskAssignee}</span></td>
                <td style="text-align: center;">${statusHtml}</td>
            </tr>
        `;

        // Đổ dữ liệu vào TAB QUẢN TRỊ 2 (Menu con: Danh sách đã phân công)
        adminTaskList.innerHTML += `
            <tr>
                <td style="text-align: center; font-weight: bold;">${index}</td>
                <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${task.taskContent}</td>
                <td>${task.taskAssignee}</td>
                <td>
                    <div class="action-buttons-cell">
                        <button class="btn-table-edit task-edit-trigger" data-id="${task.id}"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="btn-table-delete task-delete-trigger" data-id="${task.id}"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                </td>
            </tr>
        `;
        index++;
    });

    attachTaskRowEvents();
}

// Bắt sự kiện khi người dùng thay đổi lựa chọn ở Bộ lọc Đơn vị
filterDept.addEventListener("change", (e) => {
    renderTasksTable(e.target.value);
});
function attachTaskRowEvents() {
    document.querySelectorAll(".task-delete-trigger").forEach(btn => {
        btn.addEventListener("click", async () => {
            if (confirm("Bạn có chắc chắn muốn hủy bỏ và xóa nhiệm vụ được giao này không?")) {
                await deleteDoc(doc(db, "tasks", btn.getAttribute("data-id")));
                showToast("Đã xóa bỏ phân công nhiệm vụ.", "warning");
            }
        });
    });
    document.querySelectorAll(".task-edit-trigger").forEach(btn => {
        btn.addEventListener("click", async () => {
            const taskSnap = await getDoc(doc(db, "tasks", btn.getAttribute("data-id")));
            if (taskSnap.exists()) {
                const data = taskSnap.data();
                taskIdInput.value = taskSnap.id;
                document.getElementById("task-content").value = data.taskContent;
                document.getElementById("task-doc-select").value = data.taskDoc;
                document.getElementById("task-deadline").value = data.taskDeadline;
                document.getElementById("task-dept-select").value = data.taskAssignee; // Gán giá trị vào Select

                taskFormTitle.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Hiệu chỉnh phân công nhiệm vụ`;
                btnSubmitTask.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Lưu cập nhật`;
                btnSubmitTask.classList.add("btn-update-mode");
                btnCancelTaskEdit.classList.remove("hidden");
            }
        });
    });
}
btnCancelTaskEdit.addEventListener("click", () => { taskForm.reset(); clearTaskFormUpdateMode(); });
function clearTaskFormUpdateMode() { taskIdInput.value = ""; taskFormTitle.innerHTML = `<i class="fa-solid fa-thumbtack"></i> Khởi tạo Nhiệm vụ mới`; btnSubmitTask.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Giao nhiệm vụ`; btnSubmitTask.classList.remove("btn-update-mode"); btnCancelTaskEdit.classList.add("hidden"); }