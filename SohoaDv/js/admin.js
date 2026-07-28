// Tham chiếu Realtime Database
const dangBoRef = database.ref("dang_bo");
const tasksRef = database.ref("tasks");
// Khai báo DOM Elements
const loginSection = document.getElementById("login-section");
const adminSection = document.getElementById("admin-section");
const btnLogin = document.getElementById("btn-login");
const btnLogout = document.getElementById("btn-logout");
const adminUserInfo = document.getElementById("admin-user-info");

// Cache lưu tên đơn vị
let dangBoCache = {};

// 1. Khởi tạo dữ liệu và gán sự kiện khi trang tải xong
document.addEventListener("DOMContentLoaded", () => {
  initAdminTabs();
  initAdminData();
  setupDropdownChangeEvents(); // Gán sự kiện Fill tự động khi chọn Dropdown
});

// 2. Chuyển đổi Tab giữa các phân hệ quản trị
function initAdminTabs() {
  const tabBtns = document.querySelectorAll(".admin-tab-btn");
  const tabContents = document.querySelectorAll(".admin-tab-content");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-admin-tab");

      tabBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      tabContents.forEach((c) => {
        if (c.id === target) {
          c.classList.add("active");
        } else {
          c.classList.remove("active");
        }
      });
    });
  });
}

// 3. Theo dõi phiên đăng nhập
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    loginSection.style.display = "none";
    adminSection.style.display = "block";
    adminUserInfo.innerHTML = `<i class="fa-solid fa-circle-user" style="color: #2ecc71;"></i> Quản trị viên: <b>${user.email}</b>`;
  } else {
    loginSection.style.display = "block";
    adminSection.style.display = "none";
  }
});

// Xử lý Đăng nhập
btnLogin.addEventListener("click", () => {
  const email = document.getElementById("admin-email").value;
  const password = document.getElementById("admin-password").value;

  if (!email || !password) {
    Swal.fire({
      icon: "warning",
      title: "Thiếu thông tin",
      text: "Vui lòng nhập đầy đủ Email và Mật khẩu!",
    });
    return;
  }

  firebase
    .auth()
    .signInWithEmailAndPassword(email, password)
    .then((u) => {
      Swal.fire({
        icon: "success",
        title: "Đăng nhập thành công",
        text: `Chào mừng ${u.user.email}!`,
        timer: 1500,
        showConfirmButton: false,
      });
    })
    .catch(() => {
      Swal.fire({
        icon: "error",
        title: "Thất bại",
        text: "Sai tài khoản hoặc mật khẩu!",
      });
    });
});

// Xử lý Đăng xuất
btnLogout.addEventListener("click", () => {
  Swal.fire({
    title: "Xác nhận đăng xuất?",
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#e74c3c",
    confirmButtonText: "Đăng xuất",
    cancelButtonText: "Hủy",
  }).then((res) => {
    if (res.isConfirmed) {
      firebase.auth().signOut();
    }
  });
});

// 4. Nạp danh sách Đảng bộ vào Dropdown cả 2 phân hệ & Load Bảng
function initAdminData() {
  const selectSoHoa = document.getElementById("select-dangbo-sohoa");
  const selectTcDang = document.getElementById("select-dangbo-tcdang");

  selectSoHoa.innerHTML =
    '<option value="">-- Chọn một Đảng bộ trực thuộc --</option>';
  selectTcDang.innerHTML =
    '<option value="">-- Chọn một Đảng bộ trực thuộc --</option>';
  dangBoCache = {};

  dangBoRef.once("value", (snapshot) => {
    snapshot.forEach((child) => {
      const key = child.key;
      const data = child.val();
      dangBoCache[key] = data.ten;

      const opt1 = document.createElement("option");
      opt1.value = key;
      opt1.textContent = data.ten;
      selectSoHoa.appendChild(opt1);

      const opt2 = document.createElement("option");
      opt2.value = key;
      opt2.textContent = data.ten;
      selectTcDang.appendChild(opt2);
    });

    loadProgressTables();
  });
}

// 5. TỰ ĐỘNG FILL DỮ LIỆU CỦA ĐƠN VỊ ĐÃ LƯU KHI CHỌN TỪ DROPDOWN
function setupDropdownChangeEvents() {
  // 5.1 Fill dữ liệu Phân hệ 1: Số hóa hồ sơ
  const selectSoHoa = document.getElementById("select-dangbo-sohoa");
  if (selectSoHoa) {
    selectSoHoa.addEventListener("change", (e) => {
      const selectedId = e.target.value;
      if (!selectedId) {
        document.getElementById("form-sohoa").reset();
        return;
      }

      dangBoRef.child(selectedId).once("value", (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          document.getElementById("sohoa-can-so-hoa").value =
            data.tongHoSo || 0;
          document.getElementById("sohoa-chinh-ly").value = data.daChinhLy || 0;
          document.getElementById("sohoa-ky-so").value = data.daKySo || 0;
          document.getElementById("sohoa-phan-mem").value = data.daCapNhat || 0;
        } else {
          document.getElementById("sohoa-can-so-hoa").value = 0;
          document.getElementById("sohoa-chinh-ly").value = 0;
          document.getElementById("sohoa-ky-so").value = 0;
          document.getElementById("sohoa-phan-mem").value = 0;
        }
      });
    });
  }

  // 5.2 Fill dữ liệu Phân hệ 2: Tổ chức đảng & Đảng viên
  const selectTcDang = document.getElementById("select-dangbo-tcdang");
  if (selectTcDang) {
    selectTcDang.addEventListener("change", (e) => {
      const selectedId = e.target.value;
      if (!selectedId) {
        document.getElementById("form-tcdang").reset();
        return;
      }

      dangBoRef.child(selectedId).once("value", (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          // Fill số liệu Tổ chức
          document.getElementById("tc-so-tccs-dang").value =
            data.soTccsDang || 0;
          document.getElementById("tc-so-chi-bo").value = data.soChiBo || 0;
          document.getElementById("tc-tong-dang-vien").value =
            data.tongDangVien || 0;
          document.getElementById("tc-dang-vien-chinh-thuc").value =
            data.dvChinhThuc || 0;
          document.getElementById("tc-dang-vien-du-bi").value =
            data.dvDuBi || 0;

          // Fill số liệu Cơ cấu Độ tuổi
          document.getElementById("tc-tuoi-under30").value =
            data.tuoiUnder30 || 0;
          document.getElementById("tc-tuoi-30to45").value =
            data.tuoi30to45 || 0;
          document.getElementById("tc-tuoi-46to60").value =
            data.tuoi46to60 || 0;
          document.getElementById("tc-tuoi-over60").value =
            data.tuoiOver60 || 0;
        } else {
          document.getElementById("tc-so-tccs-dang").value = 0;
          document.getElementById("tc-so-chi-bo").value = 0;
          document.getElementById("tc-tong-dang-vien").value = 0;
          document.getElementById("tc-dang-vien-chinh-thuc").value = 0;
          document.getElementById("tc-dang-vien-du-bi").value = 0;

          document.getElementById("tc-tuoi-under30").value = 0;
          document.getElementById("tc-tuoi-30to45").value = 0;
          document.getElementById("tc-tuoi-46to60").value = 0;
          document.getElementById("tc-tuoi-over60").value = 0;
        }
      });
    });
  }
}
// 6. Xử lý LƯU DỮ LIỆU - Phân hệ 1: Số hóa hồ sơ (Có kiểm tra Logic)
document.getElementById("form-sohoa").addEventListener("submit", (e) => {
  e.preventDefault();

  const id = document.getElementById("select-dangbo-sohoa").value;
  const canSoHoa =
    parseInt(document.getElementById("sohoa-can-so-hoa").value) || 0;
  const chinhLy =
    parseInt(document.getElementById("sohoa-chinh-ly").value) || 0;
  const kySo = parseInt(document.getElementById("sohoa-ky-so").value) || 0;
  const phanMem =
    parseInt(document.getElementById("sohoa-phan-mem").value) || 0;

  if (!id) {
    Swal.fire({
      icon: "warning",
      title: "Chưa chọn đơn vị",
      text: "Vui lòng chọn một Đảng bộ trực thuộc!",
    });
    return;
  }

  // --- KIỂM TRA LOGIC PHÂN HỆ SỐ HÓA ---
  if (canSoHoa < 0 || chinhLy < 0 || kySo < 0 || phanMem < 0) {
    Swal.fire({
      icon: "error",
      title: "Số liệu không hợp lệ",
      text: "Các con số nhập vào phải lớn hơn hoặc bằng 0!",
    });
    return;
  }

  if (chinhLy > canSoHoa) {
    Swal.fire({
      icon: "error",
      title: "Số liệu không hợp lệ",
      text: "Số hồ sơ đã chuẩn hóa không được lớn hơn Tổng số hồ sơ cần số hóa!",
    });
    return;
  }

  if (kySo > chinhLy) {
    Swal.fire({
      icon: "error",
      title: "Số liệu không hợp lệ",
      text: "Số hồ sơ đã ký số không được lớn hơn Số hồ sơ đã chuẩn hóa!",
    });
    return;
  }

  if (phanMem > kySo) {
    Swal.fire({
      icon: "error",
      title: "Số liệu không hợp lệ",
      text: "Số hồ sơ đã đưa lên phần mềm không được lớn hơn Số hồ sơ đã ký số!",
    });
    return;
  }

  // Nếu tất cả điều kiện đều hợp lệ -> Tiến hành lưu
  dangBoRef
    .child(id)
    .update({
      tongHoSo: canSoHoa,
      daChinhLy: chinhLy,
      daKySo: kySo,
      daCapNhat: phanMem,
    })
    .then(() => {
      Swal.fire({
        icon: "success",
        title: "Đã lưu thành công",
        text: `Đã cập nhật tiến độ số hóa cho ${dangBoCache[id]}.`,
        timer: 1500,
        showConfirmButton: false,
      });
    });
});

// 7. Xử lý LƯU DỮ LIỆU - Phân hệ 2: Tổ chức đảng & Đảng viên (Có kiểm tra Logic)
document.getElementById("form-tcdang").addEventListener("submit", (e) => {
  e.preventDefault();

  const id = document.getElementById("select-dangbo-tcdang").value;
  const soTccsDang =
    parseInt(document.getElementById("tc-so-tccs-dang").value) || 0;
  const soChiBo = parseInt(document.getElementById("tc-so-chi-bo").value) || 0;
  const tongDangVien =
    parseInt(document.getElementById("tc-tong-dang-vien").value) || 0;
  const dvChinhThuc =
    parseInt(document.getElementById("tc-dang-vien-chinh-thuc").value) || 0;
  const dvDuBi =
    parseInt(document.getElementById("tc-dang-vien-du-bi").value) || 0;

  const tuoiUnder30 =
    parseInt(document.getElementById("tc-tuoi-under30").value) || 0;
  const tuoi30to45 =
    parseInt(document.getElementById("tc-tuoi-30to45").value) || 0;
  const tuoi46to60 =
    parseInt(document.getElementById("tc-tuoi-46to60").value) || 0;
  const tuoiOver60 =
    parseInt(document.getElementById("tc-tuoi-over60").value) || 0;

  if (!id) {
    Swal.fire({
      icon: "warning",
      title: "Chưa chọn đơn vị",
      text: "Vui lòng chọn một Đảng bộ trực thuộc!",
    });
    return;
  }

  // --- KIỂM TRA LOGIC PHÂN HỆ TỔ CHỨC ĐẢNG & ĐẢNG VIÊN ---

  // 1. Kiểm tra số âm
  if (
    soTccsDang < 0 ||
    soChiBo < 0 ||
    tongDangVien < 0 ||
    dvChinhThuc < 0 ||
    dvDuBi < 0 ||
    tuoiUnder30 < 0 ||
    tuoi30to45 < 0 ||
    tuoi46to60 < 0 ||
    tuoiOver60 < 0
  ) {
    Swal.fire({
      icon: "error",
      title: "Số liệu không hợp lệ",
      text: "Tất cả các số liệu nhập vào phải lớn hơn hoặc bằng 0!",
    });
    return;
  }

  // 2. Kiểm tra Đảng viên chính thức / dự bị không được vượt quá tổng số
  if (dvChinhThuc > tongDangVien) {
    Swal.fire({
      icon: "error",
      title: "Số liệu không hợp lệ",
      text: `Số lượng Đảng viên chính thức (${dvChinhThuc}) không được lớn hơn Tổng số Đảng viên (${tongDangVien})!`,
    });
    return;
  }

  if (dvDuBi > tongDangVien) {
    Swal.fire({
      icon: "error",
      title: "Số liệu không hợp lệ",
      text: `Số lượng Đảng viên dự bị (${dvDuBi}) không được lớn hơn Tổng số Đảng viên (${tongDangVien})!`,
    });
    return;
  }

  // 3. Kiểm tra logic: Chính thức + Dự bị phải BẰNG Tổng số Đảng viên
  const sumLoaiDV = dvChinhThuc + dvDuBi;
  if (sumLoaiDV !== tongDangVien) {
    Swal.fire({
      icon: "error",
      title: "Số liệu không khớp",
      html: `Tổng số Đảng viên (<b>${tongDangVien}</b>) không bằng tổng của Đảng viên chính thức (<b>${dvChinhThuc}</b>) + Đảng viên dự bị (<b>${dvDuBi}</b>) = <b>${sumLoaiDV}</b>!`,
    });
    return;
  }

  // 4. Kiểm tra logic: Tổng 4 độ tuổi phải BẰNG Tổng số Đảng viên
  const sumDoTuoi = tuoiUnder30 + tuoi30to45 + tuoi46to60 + tuoiOver60;
  if (sumDoTuoi !== tongDangVien) {
    Swal.fire({
      icon: "error",
      title: "Cơ cấu độ tuổi không khớp",
      html: `Tổng số Đảng viên theo 4 độ tuổi cộng lại (<b>${sumDoTuoi}</b>) không bằng Tổng số Đảng viên hiện có (<b>${tongDangVien}</b>)!<br><br><small>Chi tiết: ${tuoiUnder30} + ${tuoi30to45} + ${tuoi46to60} + ${tuoiOver60} = ${sumDoTuoi}</small>`,
    });
    return;
  }

  // Nếu tất cả logic kiểm tra đều hợp lệ -> Tiến hành lưu lên Firebase
  dangBoRef
    .child(id)
    .update({
      soTccsDang: soTccsDang,
      soChiBo: soChiBo,
      tongDangVien: tongDangVien,
      dvChinhThuc: dvChinhThuc,
      dvDuBi: dvDuBi,
      tuoiUnder30: tuoiUnder30,
      tuoi30to45: tuoi30to45,
      tuoi46to60: tuoi46to60,
      tuoiOver60: tuoiOver60,
    })
    .then(() => {
      Swal.fire({
        icon: "success",
        title: "Đã lưu thành công",
        text: `Đã cập nhật số liệu TCĐ & Đảng viên cho ${dangBoCache[id]}.`,
        timer: 1500,
        showConfirmButton: false,
      });
    });
});

// Nút làm lại form
document.querySelectorAll(".btn-reset-form").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.target.closest("form").reset();
  });
});

// 8. Đọc Realtime & Nạp số liệu vào Bảng ở cả 2 phân hệ
function loadProgressTables() {
  const tbodySoHoa = document.getElementById("table-sohoa-body");
  const tbodyTcDang = document.getElementById("table-tcdang-body");

  dangBoRef.on("value", (snapshot) => {
    tbodySoHoa.innerHTML = "";
    tbodyTcDang.innerHTML = "";

    if (!snapshot.exists()) return;

    snapshot.forEach((child) => {
      const key = child.key;
      const data = child.val();
      const ten = data.ten || `Đảng bộ ${key}`;

      // 8.1 Render dòng bảng Số hóa
      const tr1 = document.createElement("tr");
      tr1.innerHTML = `
        <td><b>${ten}</b></td>
        <td>${Number(data.tongHoSo || 0).toLocaleString()}</td>
        <td>${Number(data.daChinhLy || 0).toLocaleString()}</td>
        <td>${Number(data.daKySo || 0).toLocaleString()}</td>
        <td>${Number(data.daCapNhat || 0).toLocaleString()}</td>
        <td style="text-align: center;">
          <button class="btn btn-primary" style="padding: 4px 8px; font-size: 12px;" onclick="editSoHoa('${key}', ${data.tongHoSo || 0}, ${data.daChinhLy || 0}, ${data.daKySo || 0}, ${data.daCapNhat || 0})">
            Sửa
          </button>
        </td>
      `;
      tbodySoHoa.appendChild(tr1);

      // 8.2 Render dòng bảng Tổ chức đảng & Đảng viên
      const tr2 = document.createElement("tr");
      tr2.innerHTML = `
        <td><b>${ten}</b></td>
        <td>${Number(data.soTccsDang || 0).toLocaleString()}</td>
        <td>${Number(data.soChiBo || 0).toLocaleString()}</td>
        <td>${Number(data.tongDangVien || 0).toLocaleString()}</td>
        <td>${Number(data.dvChinhThuc || 0).toLocaleString()}</td>
        <td>${Number(data.dvDuBi || 0).toLocaleString()}</td>
        <td style="text-align: center;">
          <button class="btn btn-primary" style="padding: 4px 8px; font-size: 12px; background-color: #16a34a;" onclick="editTcDang('${key}', ${data.soTccsDang || 0}, ${data.soChiBo || 0}, ${data.tongDangVien || 0}, ${data.dvChinhThuc || 0}, ${data.dvDuBi || 0}, ${data.tuoiUnder30 || 0}, ${data.tuoi30to45 || 0}, ${data.tuoi46to60 || 0}, ${data.tuoiOver60 || 0})">
            Sửa
          </button>
        </td>
      `;
      tbodyTcDang.appendChild(tr2);
    });
  });
}

// Hàm đẩy số liệu cũ lên Form khi sửa (Phân hệ Số hóa)
window.editSoHoa = function (id, canSoHoa, chinhLy, kySo, phanMem) {
  document.getElementById("select-dangbo-sohoa").value = id;
  document.getElementById("sohoa-can-so-hoa").value = canSoHoa;
  document.getElementById("sohoa-chinh-ly").value = chinhLy;
  document.getElementById("sohoa-ky-so").value = kySo;
  document.getElementById("sohoa-phan-mem").value = phanMem;
  document.getElementById("form-sohoa").scrollIntoView({ behavior: "smooth" });
};

// Hàm đẩy số liệu cũ lên Form khi sửa (Phân hệ Tổ chức đảng)
window.editTcDang = function (
  id,
  soTccs,
  soChiBo,
  tongDV,
  dvChinhThuc,
  dvDuBi,
  u30,
  t30to45,
  t46to60,
  o60,
) {
  document.getElementById("select-dangbo-tcdang").value = id;
  document.getElementById("tc-so-tccs-dang").value = soTccs;
  document.getElementById("tc-so-chi-bo").value = soChiBo;
  document.getElementById("tc-tong-dang-vien").value = tongDV;
  document.getElementById("tc-dang-vien-chinh-thuc").value = dvChinhThuc;
  document.getElementById("tc-dang-vien-du-bi").value = dvDuBi;

  document.getElementById("tc-tuoi-under30").value = u30 || 0;
  document.getElementById("tc-tuoi-30to45").value = t30to45 || 0;
  document.getElementById("tc-tuoi-46to60").value = t46to60 || 0;
  document.getElementById("tc-tuoi-over60").value = o60 || 0;

  document.getElementById("form-tcdang").scrollIntoView({ behavior: "smooth" });
};
document.getElementById("form-task").addEventListener("submit", (e) => {
  e.preventDefault();

  const taskId = document.getElementById("task-id-hidden").value;
  const taskName = document.getElementById("task-name").value.trim();
  const assignee = document.getElementById("task-assignee").value.trim();
  const deadline = document.getElementById("task-deadline").value;
  const progress =
    parseInt(document.getElementById("task-progress").value) || 0;
  const status = document.getElementById("task-status").value;
  const note = document.getElementById("task-note").value.trim();

  if (progress < 0 || progress > 100) {
    Swal.fire({
      icon: "error",
      title: "Lỗi",
      text: "Tiến độ phải nằm trong khoảng từ 0% đến 100%!",
    });
    return;
  }

  const taskData = {
    name: taskName,
    assignee: assignee,
    deadline: deadline,
    progress: progress,
    status: status,
    note: note,
    updatedAt: firebase.database.ServerValue.TIMESTAMP,
  };

  if (taskId) {
    // Cập nhật nhiệm vụ cũ
    tasksRef
      .child(taskId)
      .update(taskData)
      .then(() => {
        Swal.fire({
          icon: "success",
          title: "Thành công",
          text: "Đã cập nhật nhiệm vụ!",
          timer: 1500,
          showConfirmButton: false,
        });
        resetTaskForm();
      });
  } else {
    // Tạo mới nhiệm vụ
    tasksRef.push(taskData).then(() => {
      Swal.fire({
        icon: "success",
        title: "Thành công",
        text: "Đã thêm nhiệm vụ mới!",
        timer: 1500,
        showConfirmButton: false,
      });
      resetTaskForm();
    });
  }
});

// Nút làm mới Form Nhiệm vụ
document
  .querySelector(".btn-reset-task-form")
  .addEventListener("click", resetTaskForm);

function resetTaskForm() {
  document.getElementById("form-task").reset();
  document.getElementById("task-id-hidden").value = "";
}

// Tải danh sách Nhiệm vụ lên bảng Admin Realtime
tasksRef.on("value", (snapshot) => {
  const tbody = document.getElementById("table-task-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!snapshot.exists()) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#94a3b8;">Chưa có nhiệm vụ nào được tạo.</td></tr>`;
    return;
  }

  let index = 1;
  snapshot.forEach((child) => {
    const key = child.key;
    const task = child.val();

    let badgeColor = "#0284c7";
    if (task.status === "Đã hoàn thành") badgeColor = "#16a34a";
    if (task.status === "Chậm tiến độ") badgeColor = "#dc2626";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="text-align: center">${index++}</td>
      <td><b>${task.name}</b></td>
      <td>${task.assignee}</td>
      <td style="text-align: center">${task.deadline || "—"}</td>
      <td style="text-align: center; font-weight: bold; color: ${badgeColor}">${task.progress}%</td>
      <td style="text-align: center"><span style="background:${badgeColor}; color:#fff; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:bold;">${task.status}</span></td>
      <td>${task.note || "—"}</td>
      <td style="text-align: center;">
        <button class="btn btn-primary" style="padding: 3px 6px; font-size: 11px;" onclick="editTask('${key}')">Sửa</button>
        <button class="btn btn-danger" style="padding: 3px 6px; font-size: 11px;" onclick="deleteTask('${key}')">Xóa</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
});

// Hàm Sửa & Xóa Nhiệm vụ
window.editTask = function (key) {
  tasksRef.child(key).once("value", (snapshot) => {
    if (snapshot.exists()) {
      const task = snapshot.val();
      document.getElementById("task-id-hidden").value = key;
      document.getElementById("task-name").value = task.name || "";
      document.getElementById("task-assignee").value = task.assignee || "";
      document.getElementById("task-deadline").value = task.deadline || "";
      document.getElementById("task-progress").value = task.progress || 0;
      document.getElementById("task-status").value =
        task.status || "Đang thực hiện";
      document.getElementById("task-note").value = task.note || "";
      document
        .getElementById("form-task")
        .scrollIntoView({ behavior: "smooth" });
    }
  });
};

window.deleteTask = function (key) {
  Swal.fire({
    title: "Xác nhận xóa?",
    text: "Nhiệm vụ này sẽ bị xóa khỏi hệ thống!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#dc2626",
    confirmButtonText: "Xóa ngay",
    cancelButtonText: "Hủy",
  }).then((res) => {
    if (res.isConfirmed) {
      tasksRef.child(key).remove();
    }
  });
};
