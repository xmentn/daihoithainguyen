import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
    getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, getDoc
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import {
    getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

// =========================================================================
// CẤU HÌNH FIREBASE CHÍNH THỨC - THEO DÕI NHIỆM VỤ VĂN PHÒNG TỈNH ỦY THÁI NGUYÊN
// =========================================================================
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

// Tham chiếu các bộ sưu tập dữ liệu (Collections) trên Firestore
const docsCollectionRef = collection(db, "documents");
const tasksCollectionRef = collection(db, "tasks");
const deptsCollectionRef = collection(db, "departments");

// Các biến toàn cục quản lý trạng thái phiên đăng nhập và bộ nhớ đệm
let currentUserRole = "user";       // Mặc định ban đầu khi chưa tải xong quyền là user xem
let currentUserDept = "";          // Tên cơ quan liên kết của tài khoản đang đăng nhập
let allTasksData = [];             // Bộ nhớ đệm lưu trữ toàn bộ nhiệm vụ từ Firestore để lọc dữ liệu

// Khai báo các phần tử giao diện DOM hệ thống
const loginModal = document.getElementById("login-modal");
const mainApp = document.getElementById("main-app");
const loginForm = document.getElementById("login-form");
const userDisplayInfo = document.getElementById("user-display-info");
const btnLogout = document.getElementById("btn-logout");
const tabAdminBtn = document.getElementById("tab-admin-btn");
const tabStaffBtn = document.getElementById("tab-staff-btn");
const tabButtons = document.querySelectorAll(".tab-navigation .tab-btn");
const subTabButtons = document.querySelectorAll(".sub-tab-btn");

// DOM phân hệ Quản lý văn bản
const documentForm = document.getElementById("document-form");
const docIdInput = document.getElementById("doc-id");
const formTitle = document.getElementById("form-title");
const btnSubmitForm = document.getElementById("btn-submit-form");
const btnCancelEdit = document.getElementById("btn-cancel-edit");
const adminDocList = document.getElementById("admin-doc-list");

// DOM phân hệ Quản lý danh mục đơn vị
const departmentForm = document.getElementById("department-form");
const deptIdInput = document.getElementById("dept-id");
const deptFormTitle = document.getElementById("dept-form-title");
const btnSubmitDept = document.getElementById("btn-submit-dept");
const btnCancelDeptEdit = document.getElementById("btn-cancel-dept-edit");
const adminDeptList = document.getElementById("admin-dept-list");

// DOM phân hệ Giao nhiệm vụ
const taskForm = document.getElementById("task-form");
const taskIdInput = document.getElementById("task-id");
const taskDocSelect = document.getElementById("task-doc-select");
const taskDeptSelect = document.getElementById("task-dept-select");
const taskFormTitle = document.getElementById("task-form-title");
const btnSubmitTask = document.getElementById("btn-submit-task");
const btnCancelTaskEdit = document.getElementById("btn-cancel-task-edit");
const adminTaskList = document.getElementById("admin-task-list");

// DOM phân hệ Báo cáo & Theo dõi ngoài trang chủ
const progressList = document.getElementById("progress-list");
const staffTaskList = document.getElementById("staff-task-list");
const staffDeptNameLabel = document.getElementById("staff-dept-name");
const filterDept = document.getElementById("filter-dept");

// =========================================================================
// 1. HỆ THỐNG THÔNG BÁO NỔI TOAST CHUYÊN NGHIỆP
// =========================================================================
function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;
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

    // Tắt nhanh thông báo khi người dùng click vào nút dấu X
    toast.querySelector(".toast-close").addEventListener("click", () => {
        toast.style.animation = "fadeOut 0.3s ease forwards";
        setTimeout(() => toast.remove(), 300);
    });

    // Tự động dọn dẹp biến mất sau 3.5 giây
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = "fadeOut 0.3s ease forwards";
            setTimeout(() => toast.remove(), 300);
        }
    }, 3500);
}

// =========================================================================
// 2. LOGIC KIỂM SOÁT PHIÊN ĐĂNG NHẬP & PHÂN QUYỀN HÀNH CHÍNH (3 CẤP)
// =========================================================================
if (loginForm) {
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
}

if (btnLogout) {
    btnLogout.addEventListener("click", () => {
        signOut(auth).then(() => {
            showToast("Đã đăng xuất khỏi hệ thống.", "warning");
            switchTab("progress-tab"); // Đẩy về tab mặc định ngoài trang chủ
        });
    });
}

// Giám sát trạng thái tài khoản thời gian thực (Realtime Auth Listener)
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Truy vấn sâu lấy vai trò quyền (role) và cơ quan được liên kết trong Firestore bảng users
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        currentUserRole = "user";
        currentUserDept = "";

        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            currentUserRole = userData.role || "user";
            currentUserDept = userData.associatedDept || "";
        }

        // Định dạng ẩn toàn bộ các Tab đặc quyền trước khi mở khóa
        tabAdminBtn.classList.add("hidden");
        tabStaffBtn.classList.add("hidden");

        // Tiến hành phân cấp quyền hiển thị tính năng
        if (currentUserRole === "admin") {
            userDisplayInfo.innerHTML = `<i class="fa-solid fa-user-tie"></i> ${user.email} (Quản trị hệ thống)`;
            tabAdminBtn.classList.remove("hidden");
            // Mở thanh bộ lọc cơ quan ngoài trang chính cho Admin xem toàn cục
            if (filterDept && filterDept.parentElement.parentElement) filterDept.parentElement.parentElement.classList.remove("hidden");
        } else if (currentUserRole === "staff") {
            userDisplayInfo.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> ${user.email} (Nhập liệu: ${currentUserDept})`;
            tabStaffBtn.classList.remove("hidden"); // Kích hoạt mở Tab Nhập liệu báo cáo
            if (staffDeptNameLabel) staffDeptNameLabel.innerText = `Đơn vị báo cáo: ${currentUserDept}`;
            // Ẩn thanh bộ lọc đơn vị (vì tài khoản staff bị ép buộc chỉ xem cơ quan mình)
            if (filterDept && filterDept.parentElement.parentElement) filterDept.parentElement.parentElement.classList.add("hidden");
        } else {
            userDisplayInfo.innerHTML = `<i class="fa-solid fa-building"></i> ${user.email} (${currentUserDept || 'Cán bộ xem'})`;
            if (filterDept && filterDept.parentElement.parentElement) filterDept.parentElement.parentElement.classList.add("hidden");
        }

        loginModal.classList.add("hidden");
        mainApp.classList.remove("hidden");

        // Cập nhật lại toàn bộ giao diện bảng theo đúng phạm vi phân quyền dữ liệu mới
        refreshAllDataViews();
    } else {
        loginModal.classList.remove("hidden");
        mainApp.classList.add("hidden");
    }
});

// Hàm điều hướng chuyển đổi giữa các Tab lớn ngoài thanh điều hướng
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

// Hàm điều hướng chuyển đổi giữa các Menu con nằm ngang trong phần quản trị (Sub tabs)
subTabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        const targetSubId = btn.getAttribute("data-subtab");
        document.querySelectorAll(".sub-tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".sub-tab-content").forEach(c => c.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById(targetSubId).classList.add("active");
    });
});

// Điều phối dòng lệnh làm mới dữ liệu lên các bảng đồng loạt
function refreshAllDataViews() {
    if (!auth.currentUser) return;
    renderProgressTable(currentUserRole === "admin" ? filterDept.value : currentUserDept);
    if (currentUserRole === "staff") {
        renderStaffInputTable(currentUserDept);
    }
}

// =========================================================================
// 3. PHÂN HỆ: QUẢN LÝ DANH MỤC HỆ THỐNG VĂN BẢN
// =========================================================================
const qDocs = query(docsCollectionRef, orderBy("createdAt", "desc"));
onSnapshot(qDocs, (snapshot) => {
    if (!adminDocList) return;
    adminDocList.innerHTML = "";
    taskDocSelect.innerHTML = `<option value="">-- Chọn văn bản từ danh mục --</option>`;
    let index = 1;
    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        adminDocList.innerHTML += `
            <tr>
                <td style="text-align: center; font-weight: bold;">${index}</td>
                <td style="font-weight: 600; color: var(--secondary-color);">${data.docNumber}</td>
                <td style="max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${data.docSummary}</td>
                <td style="text-align: center;">
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

if (documentForm) {
    documentForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const docId = docIdInput.value;
        const docNumber = document.getElementById("doc-number").value.trim();
        const docDate = document.getElementById("doc-date").dataset.rawValue || ""; // Lấy chuỗi gốc YYYY-MM-DD từ bộ nhớ đệm
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
            resetSmartDateInput("doc-date");
        } catch (error) { showToast("Thao tác thất bại.", "error"); }
    });
}

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

                const dateEl = document.getElementById("doc-date");
                if (dateEl && data.docDate) {
                    dateEl.dataset.rawValue = data.docDate;
                    const [year, month, day] = data.docDate.split("-");
                    dateEl.type = "text";
                    dateEl.value = `${day}/${month}/${year}`; // Gán định dạng chuỗi ngược để hiển thị chuẩn dd/mm/yyyy
                }

                document.getElementById("doc-summary").value = data.docSummary;
                formTitle.innerHTML = `<i class="fa-solid fa-file-pen"></i> Hiệu chỉnh văn bản ban hành`;
                btnSubmitForm.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Lưu cập nhật`;
                btnSubmitForm.classList.add("btn-update-mode");
                btnCancelEdit.classList.remove("hidden");
            }
        });
    });
}
if (btnCancelEdit) btnCancelEdit.addEventListener("click", () => { documentForm.reset(); clearFormUpdateMode(); resetSmartDateInput("doc-date"); });
function clearFormUpdateMode() { docIdInput.value = ""; formTitle.innerHTML = `<i class="fa-solid fa-file-pen"></i> Cập nhật Danh mục văn bản`; btnSubmitForm.innerHTML = `<i class="fa-solid fa-plus"></i> Thêm văn bản`; btnSubmitForm.classList.remove("btn-update-mode"); btnCancelEdit.classList.add("hidden"); }

// =========================================================================
// 4. PHÂN HỆ: QUẢN LÝ DANH MỤC ĐƠN VỊ CƠ QUAN GIAO VIỆC
// =========================================================================
if (departmentForm) {
    departmentForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const deptId = deptIdInput.value;
        const deptName = document.getElementById("dept-name").value.trim();
        try {
            if (deptId === "") {
                await addDoc(deptsCollectionRef, { deptName, createdAt: new Date() });
                showToast("Đã thêm đơn vị mới vào hệ thống danh mục!");
            } else {
                await updateDoc(doc(db, "departments", deptId), { deptName });
                showToast("Cập nhật thông tin phòng ban thành công!");
                clearDeptFormUpdateMode();
            }
            departmentForm.reset();
        } catch (error) { showToast("Lưu dữ liệu đơn vị thất bại.", "error"); }
    });
}

const qDepts = query(deptsCollectionRef, orderBy("createdAt", "desc"));
onSnapshot(qDepts, (snapshot) => {
    if (!adminDeptList) return;
    adminDeptList.innerHTML = "";
    taskDeptSelect.innerHTML = `<option value="">-- Chọn đơn vị nhận việc --</option>`;
    filterDept.innerHTML = `<option value="">-- Tất cả đơn vị --</option>`;
    let index = 1;
    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        adminDeptList.innerHTML += `
            <tr>
                <td style="text-align: center; font-weight: bold;">${index}</td>
                <td style="font-weight: 500;">${data.deptName}</td>
                <td style="text-align: center;">
                    <div class="action-buttons-cell">
                        <button class="btn-table-edit dept-edit-trigger" data-id="${docSnap.id}"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="btn-table-delete dept-delete-trigger" data-id="${docSnap.id}"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                </td>
            </tr>
        `;
        taskDeptSelect.innerHTML += `<option value="${data.deptName}">${data.deptName}</option>`;
        filterDept.innerHTML += `<option value="${data.deptName}">${data.deptName}</option>`;
        index++;
    });
    attachDeptRowEvents();
});

function attachDeptRowEvents() {
    document.querySelectorAll(".dept-delete-trigger").forEach(btn => {
        btn.addEventListener("click", async () => {
            if (confirm("Bạn có chắc chắn muốn xóa đơn vị này không?")) {
                await deleteDoc(doc(db, "departments", btn.getAttribute("data-id")));
                showToast("Đã xóa đơn vị khỏi hệ thống danh mục.", "warning");
            }
        });
    });
    document.querySelectorAll(".dept-edit-trigger").forEach(btn => {
        btn.addEventListener("click", async () => {
            const deptSnap = await getDoc(doc(db, "departments", btn.getAttribute("data-id")));
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
if (btnCancelDeptEdit) btnCancelDeptEdit.addEventListener("click", () => { departmentForm.reset(); clearDeptFormUpdateMode(); });
function clearDeptFormUpdateMode() { deptIdInput.value = ""; deptFormTitle.innerHTML = `<i class="fa-solid fa-folder-plus"></i> Cập nhật Đơn vị phòng ban`; btnSubmitDept.innerHTML = `<i class="fa-solid fa-plus"></i> Thêm đơn vị`; btnSubmitDept.classList.remove("btn-update-mode"); btnCancelDeptEdit.classList.add("hidden"); }

// =========================================================================
// 5. PHÂN HỆ: PHÁT HÀNH VÀ KHỞI TẠO NHIỆM VỤ (CHỈ QUYỀN ADMIN THỰC HIỆN)
// =========================================================================
if (taskForm) {
    taskForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const taskId = taskIdInput.value;
        const taskContent = document.getElementById("task-content").value.trim();
        const taskDoc = taskDocSelect.value;
        const taskDeadline = document.getElementById("task-deadline").dataset.rawValue || ""; // Đọc chuỗi gốc YYYY-MM-DD để lưu trữ dữ liệu chuẩn
        const taskAssignee = taskDeptSelect.value;
        try {
            if (taskId === "") {
                // Thêm mới: Khởi tạo đính kèm mặc định 3 trường theo dõi tiến độ cho Đơn vị báo cáo
                await addDoc(tasksCollectionRef, {
                    taskContent, taskDoc, taskDeadline, taskAssignee,
                    taskStatus: "Chưa thực hiện", taskResult: "", taskActualDate: "",
                    createdAt: new Date()
                });
                showToast("Đã phát hành và giao nhiệm vụ mới thành công!");
            } else {
                await updateDoc(doc(db, "tasks", taskId), { taskContent, taskDoc, taskDeadline, taskAssignee });
                showToast("Cập nhật thông tin phân công nhiệm vụ thành công!");
                clearTaskFormUpdateMode();
            }
            taskForm.reset();
            resetSmartDateInput("task-deadline");
        } catch (error) { showToast("Lưu thông tin nhiệm vụ thất bại.", "error"); }
    });
}

// Lắng nghe dữ liệu Nhiệm vụ thay đổi Realtime để nạp vào bộ nhớ đệm
const qTasks = query(tasksCollectionRef, orderBy("createdAt", "desc"));
onSnapshot(qTasks, (snapshot) => {
    allTasksData = [];
    snapshot.forEach((docSnap) => {
        allTasksData.push({ id: docSnap.id, ...docSnap.data() });
    });
    // Gọi lệnh điều hướng nạp lại nội dung các bảng tương ứng theo quyền
    refreshAllDataViews();
});

// =========================================================================
// 6. PHÂN HỆ: KẾT XUẤT TAB TIẾN ĐỘ CHÍNH (DÀNH CHO TOÀN CƠ QUAN XEM)
// =========================================================================
function renderProgressTable(deptFilter) {
    if (!progressList) return;
    progressList.innerHTML = "";
    if (adminTaskList) adminTaskList.innerHTML = "";
    let index = 1;

    // Phân cấp dòng lọc dữ liệu: Admin lọc tự do theo ô Chọn - User và Staff bị ép buộc xem đúng cơ quan mình
    let filteredTasks = currentUserRole === "admin"
        ? (deptFilter === "" ? allTasksData : allTasksData.filter(t => t.taskAssignee === deptFilter))
        : allTasksData.filter(t => t.taskAssignee === deptFilter);

    if (filteredTasks.length === 0) {
        progressList.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#94a3b8;">Hệ thống chưa ghi nhận nhiệm vụ nào trong phạm vi tra cứu.</td></tr>`;
        if (adminTaskList) adminTaskList.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#94a3b8;">Trống</td></tr>`;
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    filteredTasks.forEach((task) => {
        const formattedDeadline = formatDateView(task.taskDeadline);
        const formattedActualDate = formatDateView(task.taskActualDate);

        let statusHtml = "";
        if (task.taskStatus === "Đang thực hiện") {
            statusHtml = `<span class="status-text" style="color:#3b82f6; font-weight:600;"><i class="fa-solid fa-spinner fa-spin"></i> Đang thực hiện</span>`;
        }
        // --- ĐOẠN CODE ĐƯỢC CẬP NHẬT CHO TRẠNG THÁI ĐÃ HOÀN THÀNH ---
        else if (task.taskStatus === "Đã hoàn thành") {
            statusHtml = `<span class="status-text" style="color:#10b981; font-weight:600;"><i class="fa-solid fa-circle-check"></i> Đã hoàn thành</span>`;

            // Nếu có đầy đủ ngày hạn và ngày xong thực tế, tiến hành so sánh
            if (task.taskDeadline && task.taskActualDate) {
                const deadlineDate = new Date(task.taskDeadline);
                const actualDate = new Date(task.taskActualDate);

                deadlineDate.setHours(0, 0, 0, 0);
                actualDate.setHours(0, 0, 0, 0);

                // Nếu ngày hoàn thành thực tế lớn hơn ngày hạn
                if (actualDate.getTime() > deadlineDate.getTime()) {
                    statusHtml = `<span class="status-text status-done-overdue" style="color:#ef4444; font-weight:600;"><i class="fa-solid fa-circle-xmark"></i> Đã hoàn thành (quá hạn)</span>`;
                }
            }
        }
        // --- HẾT ĐOẠN CẬP NHẬT ---
        else {
            statusHtml = `<span class="status-text" style="color:#64748b; font-weight:600;"><i class="fa-regular fa-circle"></i> Chưa thực hiện</span>`;

            if (task.taskDeadline) {
                const deadlineDate = new Date(task.taskDeadline);
                deadlineDate.setHours(0, 0, 0, 0);
                const daysLeft = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                if (daysLeft >= 0 && daysLeft <= 3) {
                    statusHtml = `<span class="status-badge near-deadline"><i class="fa-solid fa-triangle-exclamation"></i> Sắp đến hạn (${daysLeft} ngày)</span>`;
                } else if (daysLeft < 0) {
                    statusHtml = `<span class="status-badge" style="background-color:#fee2e2; color:#ef4444; border:1px solid #fca5a5;"><i class="fa-solid fa-circle-exclamation"></i> Trễ hạn (${Math.abs(daysLeft)} ngày)</span>`;
                }
            }
        }

        // --- TÍNH TOÁN MÀU SẮC CHO CỘT NGÀY HOÀN THÀNH THỰC TẾ ---
        const isOverdue = (
            task.taskStatus === "Đã hoàn thành" &&
            task.taskDeadline &&
            task.taskActualDate &&
            new Date(task.taskActualDate).getTime() > new Date(task.taskDeadline).getTime()
        );
        const actualDateColor = isOverdue ? "#ef4444" : "#10b981";

        // Đổ dữ liệu ra bảng Tiến độ ngoài màn hình chính
        progressList.innerHTML += `
            <tr>
                <td style="text-align: center; font-weight: bold;">${index}</td>
                <td style="font-size:0.95rem; color:#1e293b; font-weight: 500;">${task.taskContent}</td>
                <td style="font-weight: 600; color: var(--primary-color);">${task.taskDoc}</td>
                <td style="text-align: center;"><i class="fa-regular fa-calendar-check"></i> ${formattedDeadline}</td>
                <td><span style="background-color:#f1f5f9; padding:4px 8px; border-radius:4px; font-size:0.9rem;"><i class="fa-solid fa-building"></i> ${task.taskAssignee}</span></td>
                <td style="text-align: center;">${statusHtml}</td>
                <td style="font-size:0.9rem; color:#475569;">${task.taskResult || ""}</td>
                <td style="text-align: center; font-weight:600; color:${actualDateColor};">${formattedActualDate}</td>
            </tr>
        `;

        // Đồng thời đổ dữ liệu ra bảng Danh sách phân công công việc trong phân hệ Admin
        if (adminTaskList) {
            adminTaskList.innerHTML += `
                <tr>
                    <td style="text-align: center; font-weight: bold;">${index}</td>
                    <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${task.taskContent}</td>
                    <td>${task.taskAssignee}</td>
                    <td style="text-align: center;">
                        <div class="action-buttons-cell">
                            <button class="btn-table-edit task-edit-trigger" data-id="${task.id}"><i class="fa-solid fa-pen-to-square"></i></button>
                            <button class="btn-table-delete task-delete-trigger" data-id="${task.id}"><i class="fa-solid fa-trash-can"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        }
        index++;
    });
    attachTaskRowEvents();
}

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

                const deadlineEl = document.getElementById("task-deadline");
                if (deadlineEl && data.taskDeadline) {
                    deadlineEl.dataset.rawValue = data.taskDeadline;
                    const [year, month, day] = data.taskDeadline.split("-");
                    deadlineEl.type = "text";
                    deadlineEl.value = `${day}/${month}/${year}`;
                }

                document.getElementById("task-dept-select").value = data.taskAssignee;
                taskFormTitle.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Hiệu chỉnh phân công nhiệm vụ`;
                btnSubmitTask.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Lưu cập nhật`;
                btnSubmitTask.classList.add("btn-update-mode");
                const cancelBtn = document.getElementById("btn-cancel-task-edit");
                if (cancelBtn) cancelBtn.classList.remove("hidden");
            }
        });
    });
}

const cancelTaskBtn = document.getElementById("btn-cancel-task-edit");
if (cancelTaskBtn) cancelTaskBtn.addEventListener("click", () => { taskForm.reset(); clearTaskFormUpdateMode(); resetSmartDateInput("task-deadline"); });
function clearTaskFormUpdateMode() { taskIdInput.value = ""; taskFormTitle.innerHTML = `<i class="fa-solid fa-thumbtack"></i> Khởi tạo Nhiệm vụ mới`; btnSubmitTask.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Giao nhiệm vụ`; btnSubmitTask.classList.remove("btn-update-mode"); const cancelBtn = document.getElementById("btn-cancel-task-edit"); if (cancelBtn) cancelBtn.classList.add("hidden"); }

if (filterDept) {
    filterDept.addEventListener("change", (e) => {
        renderProgressTable(e.target.value);
    });
}

// =========================================================================
// 7. PHÂN HỆ: BẢNG NHẬP LIỆU BÁO CÁO TIẾN ĐỘ (DÀNH RIÊNG CHO QUYỀN STAFF)
// =========================================================================
function renderStaffInputTable(deptName) {
    if (!staffTaskList) return;
    staffTaskList.innerHTML = "";

    // Thực hiện hàm cắt mảng lọc lấy duy nhất các công việc được giao cho Cơ quan mình
    const myTasks = allTasksData.filter(task => task.taskAssignee === deptName);

    if (myTasks.length === 0) {
        staffTaskList.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#94a3b8;">Đơn vị chưa có nhiệm vụ nào được phân công để nhập liệu báo cáo.</td></tr>`;
        return;
    }

    myTasks.forEach((task, i) => {
        const isDone = task.taskStatus === "Đã hoàn thành";
        const dateValue = task.taskActualDate ? formatDateView(task.taskActualDate) : "";

        staffTaskList.innerHTML += `
            <tr>
                <td style="text-align:center; font-weight:bold;">${i + 1}</td>
                <td><strong>${task.taskContent}</strong><br><small style="color:var(--primary-color); font-weight:500;">VB giao: ${task.taskDoc} - Hạn: ${formatDateView(task.taskDeadline)}</small></td>
                <td style="text-align:center;">
                    <select class="status-select" id="status-${task.id}">
                        <option value="Chưa thực hiện" ${task.taskStatus === "Chưa thực hiện" ? "selected" : ""}>Chưa thực hiện</option>
                        <option value="Đang thực hiện" ${task.taskStatus === "Đang thực hiện" ? "selected" : ""}>Đang thực hiện</option>
                        <option value="Đã hoàn thành" ${task.taskStatus === "Đã hoàn thành" ? "selected" : ""}>Đã hoàn thành</option>
                    </select>
                </td>
                <td>
                    <textarea id="result-${task.id}" rows="2" placeholder="Mô tả kết quả công việc, số liệu thực tế đạt được...">${task.taskResult || ""}</textarea>
                </td>
                <td>
                    <div class="date-input-wrapper">
                        <input type="text" 
                               id="date-done-${task.id}" 
                               placeholder="dd/mm/yyyy" 
                               autocomplete="off"
                               value="${dateValue}"
                               data-raw-value="${task.taskActualDate || ""}"
                               ${!isDone ? "disabled" : ""}>
                    </div>
                </td>
                <td style="text-align:center">
                    <button class="btn-save-inline" data-id="${task.id}" title="Lưu thông tin báo cáo">
                        <i class="fa-solid fa-floppy-disk"></i> Lưu
                    </button>
                </td>
            </tr>
        `;
    });

    attachStaffTableInlineEvents(myTasks);
}

// Gán đồng bộ các sự kiện tương tác trực tiếp (inline) trên hàng bảng nhập báo cáo
function attachStaffTableInlineEvents(myTasks) {
    myTasks.forEach(task => {
        const statusSel = document.getElementById(`status-${task.id}`);
        const dateInp = document.getElementById(`date-done-${task.id}`);
        const saveBtn = document.querySelector(`.btn-save-inline[data-id="${task.id}"]`);

        // Kích hoạt ngay cấu trúc quản trị lịch thông minh cho ô ngày hoàn thành mới tạo
        setupSmartDateInput(`date-done-${task.id}`);

        // Sự kiện: Khi thay đổi Tình hình -> Khóa hoặc mở ô nhập Ngày xong tương ứng
        statusSel.addEventListener("change", () => {
            if (statusSel.value === "Đã hoàn thành") {
                dateInp.disabled = false;
            } else {
                dateInp.disabled = true;
                dateInp.value = "";
                dateInp.dataset.rawValue = "";
            }
        });

        // Sự kiện: Khi cán bộ bấm nút Lưu báo cáo từng dòng công việc
        saveBtn.addEventListener("click", async () => {
            const status = statusSel.value;
            const result = document.getElementById(`result-${task.id}`).value.trim();
            const actualDate = dateInp.dataset.rawValue || "";

            // Ràng buộc bảo mật hành chính bắt buộc điền ngày xong nếu báo cáo Hoàn thành
            if (status === "Đã hoàn thành" && !actualDate) {
                showToast("Vui lòng cập nhật Ngày hoàn thành thực tế khi chọn trạng thái Đã hoàn thành!", "warning");
                return;
            }

            try {
                await updateDoc(doc(db, "tasks", task.id), {
                    taskStatus: status,
                    taskResult: result,
                    taskActualDate: actualDate
                });
                showToast("Cập nhật tình hình thực hiện công việc thành công!");
            } catch (e) {
                showToast("Cập nhật dữ liệu báo cáo thất bại.", "error");
            }
        });
    });
}

// =========================================================================
// 8. CÁC HÀM TIỆN ÍCH BỔ TRỢ: ĐỊNH DẠNG LỊCH THÔNG MINH ÉP DD/MM/YYYY
// =========================================================================
function setupSmartDateInput(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    // Khi người dùng chạm con trỏ vào ô nhập -> bật lịch để chọn nhanh
    input.addEventListener("focus", () => {
        input.type = "date";
        if (input.dataset.rawValue) input.value = input.dataset.rawValue;
    });

    // Khi người dùng chọn xong ngày và rời chuột -> biến về ô text và ép đảo chuỗi thành dd/mm/yyyy
    input.addEventListener("blur", () => {
        if (input.value) {
            input.dataset.rawValue = input.value; // Giữ chuỗi gốc YYYY-MM-DD
            const [year, month, day] = input.value.split("-");
            input.type = "text";
            input.value = `${day}/${month}/${year}`;
        } else {
            input.type = "text";
            if (!input.value) input.dataset.rawValue = "";
        }
    });
}

function resetSmartDateInput(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.type = "text";
    input.value = "";
    input.dataset.rawValue = "";
}

function formatDateView(dateStr) {
    if (!dateStr || dateStr.includes("/")) return dateStr || "";
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
}

// Khởi chạy tính năng lịch thông minh cho 2 ô nhập liệu của phân hệ Admin ban đầu
setupSmartDateInput("doc-date");
setupSmartDateInput("task-deadline");