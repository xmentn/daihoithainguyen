const dangBoRef = database.ref("dang_bo");

const loginSection = document.getElementById("login-section");
const adminSection = document.getElementById("admin-section");
const btnLogin = document.getElementById("btn-login");
const btnLogout = document.getElementById("btn-logout");
const progressForm = document.getElementById("progress-form");
const adminUserInfo = document.getElementById("admin-user-info");

let dangBoCache = {};

document.addEventListener("DOMContentLoaded", () => {
  initAdminData();
});

// Theo dõi trạng thái đăng nhập & Hiển thị thông tin người dùng đăng nhập
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    loginSection.style.display = "none";
    adminSection.style.display = "block";
    // Hiển thị email của phiên đăng nhập hiện tại
    adminUserInfo.innerHTML = `<i class="fa-solid fa-circle-user" style="color: #2ecc71;"></i> Quản trị viên: <b>${user.email}</b>`;
  } else {
    loginSection.style.display = "block";
    adminSection.style.display = "none";
  }
});

// Đăng nhập với thông báo SweetAlert2
btnLogin.addEventListener("click", () => {
  const email = document.getElementById("admin-email").value;
  const password = document.getElementById("admin-password").value;

  if (!email || !password) {
    Swal.fire({
      icon: "warning",
      title: "Thiếu thông tin",
      text: "Vui lòng nhập đầy đủ Email và Mật khẩu!",
      confirmButtonColor: "#3085d6",
    });
    return;
  }

  firebase
    .auth()
    .signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      Swal.fire({
        icon: "success",
        title: "Đăng nhập thành công",
        text: `Chào mừng quay trở lại, ${userCredential.user.email}!`,
        timer: 2000,
        showConfirmButton: false,
      });
    })
    .catch((error) => {
      console.error("Lỗi đăng nhập:", error);
      Swal.fire({
        icon: "error",
        title: "Thất bại",
        text: "Đăng nhập không thành công. Vui lòng kiểm tra lại tài khoản!",
        confirmButtonColor: "#d33",
      });
    });
});

// Đăng xuất với thông báo chuyên nghiệp
btnLogout.addEventListener("click", () => {
  Swal.fire({
    title: "Xác nhận đăng xuất?",
    text: "Bạn sẽ cần đăng nhập lại để chỉnh sửa số liệu!",
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#e74c3c",
    cancelButtonColor: "#95a5a6",
    confirmButtonText: "Đăng xuất",
    cancelButtonText: "Hủy",
  }).then((result) => {
    if (result.isConfirmed) {
      firebase
        .auth()
        .signOut()
        .then(() => {
          Swal.fire({
            icon: "success",
            title: "Đã đăng xuất",
            text: "Phiên đăng nhập quản trị đã kết thúc.",
            timer: 1500,
            showConfirmButton: false,
          });
        });
    }
  });
});

function initAdminData() {
  const adminDropdown = document.getElementById("admin-select-dangbo");
  adminDropdown.innerHTML =
    '<option value="">-- Chọn một Đảng bộ trực thuộc --</option>';
  dangBoCache = {};

  dangBoRef
    .once("value", (snapshot) => {
      snapshot.forEach((childSnapshot) => {
        const key = childSnapshot.key;
        const data = childSnapshot.val();

        dangBoCache[key] = data.ten;

        const option = document.createElement("option");
        option.value = key;
        option.textContent = data.ten;
        adminDropdown.appendChild(option);
      });

      loadProgressTable();
    })
    .catch((err) => {
      console.error("Lỗi khi tải danh sách Đảng bộ:", err);
    });
}

// Lưu dữ liệu với thông báo SweetAlert2
progressForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const dangBoId = document.getElementById("admin-select-dangbo").value;
  const canSoHoa =
    parseInt(document.getElementById("input-can-so-hoa").value) || 0;
  const chinhLy =
    parseInt(document.getElementById("input-chinh-ly").value) || 0;
  const kySo = parseInt(document.getElementById("input-ky-so").value) || 0;
  const phanMem =
    parseInt(document.getElementById("input-phan-mem").value) || 0;

  if (!dangBoId) {
    Swal.fire({
      icon: "warning",
      title: "Chưa chọn đơn vị",
      text: "Vui lòng chọn một Đảng bộ trực thuộc!",
      confirmButtonColor: "#3085d6",
    });
    return;
  }

  const tenDangBo = dangBoCache[dangBoId] || "";

  dangBoRef
    .child(dangBoId)
    .set({
      id: dangBoId,
      ten: tenDangBo,
      tongHoSo: canSoHoa,
      daChinhLy: chinhLy,
      daKySo: kySo,
      daCapNhat: phanMem,
    })
    .then(() => {
      Swal.fire({
        icon: "success",
        title: "Đã lưu dữ liệu",
        text: `Đã cập nhật thành công tiến độ cho ${tenDangBo}.`,
        timer: 2000,
        showConfirmButton: false,
      });
      progressForm.reset();
    })
    .catch((err) => {
      console.error("Ghi dữ liệu thất bại:", err);
      Swal.fire({
        icon: "error",
        title: "Lỗi hệ thống",
        text: "Không thể ghi số liệu lên cơ sở dữ liệu!",
        confirmButtonColor: "#d33",
      });
    });
});

document.getElementById("btn-reset-form").addEventListener("click", () => {
  progressForm.reset();
});

function loadProgressTable() {
  const tableBody = document.getElementById("table-data-body");

  dangBoRef.on("value", (snapshot) => {
    tableBody.innerHTML = "";

    if (!snapshot.exists()) {
      tableBody.innerHTML =
        '<tr><td colspan="6" style="text-align: center;">Chưa có dữ liệu tiến độ nào được ghi nhận.</td></tr>';
      return;
    }

    snapshot.forEach((childSnapshot) => {
      const dbKey = childSnapshot.key;
      const data = childSnapshot.val();
      const tenDangBo = data.ten || `Đảng bộ ${dbKey}`;

      const row = document.createElement("tr");
      row.innerHTML = `
        <td><b>${tenDangBo}</b></td>
        <td>${Number(data.tongHoSo || 0).toLocaleString()}</td>
        <td>${Number(data.daChinhLy || 0).toLocaleString()}</td>
        <td>${Number(data.daKySo || 0).toLocaleString()}</td>
        <td>${Number(data.daCapNhat || 0).toLocaleString()}</td>
        <td style="text-align: center;">
          <button class="btn btn-primary" style="padding: 5px 10px; font-size: 13px;" onclick="editRecord('${dbKey}', ${data.tongHoSo || 0}, ${data.daChinhLy || 0}, ${data.daKySo || 0}, ${data.daCapNhat || 0})">
            Sửa
          </button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  });
}

window.editRecord = function (id, tongHoSo, daChinhLy, daKySo, daCapNhat) {
  document.getElementById("admin-select-dangbo").value = id;
  document.getElementById("input-can-so-hoa").value = tongHoSo;
  document.getElementById("input-chinh-ly").value = daChinhLy;
  document.getElementById("input-ky-so").value = daKySo;
  document.getElementById("input-phan-mem").value = daCapNhat;

  document
    .getElementById("progress-form")
    .scrollIntoView({ behavior: "smooth" });
};
