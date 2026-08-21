// Tham chiếu Realtime Database các nhánh
const dangBoRef = database.ref("dang_bo");
const tasksRef = database.ref("tasks");
const configRef = database.ref("config/time_settings");
const doiTuongRef = database.ref("danh_muc_doi_tuong"); // Node lưu danh mục Đơn vị/Cá nhân

// Khai báo DOM Elements
const loginSection = document.getElementById("login-section");
const adminSection = document.getElementById("admin-section");
const btnLogin = document.getElementById("btn-login");
const btnLogout = document.getElementById("btn-logout");
const adminUserInfo = document.getElementById("admin-user-info");

// Biến toàn cục
let dangBoCache = {};
let currentRole = "nhap_lieu"; // Mặc định vai trò

// Tài khoản BTC chỉ được xem Quản lý nội bộ ở trang chủ, tuyệt đối không vào admin.html
const VIEW_ONLY_HOME_EMAIL = "btc.tn@gmail.com";

function isViewOnlyHomeAccount(userOrEmail) {
  const email =
    typeof userOrEmail === "string"
      ? userOrEmail
      : userOrEmail && userOrEmail.email
        ? userOrEmail.email
        : "";
  return email.trim().toLowerCase() === VIEW_ONLY_HOME_EMAIL;
}

// =================================================================
// 1. KHỞI TẠO DỮ LIỆU & GÁN SỰ KIỆN KHI TRANG TẢI XONG
// =================================================================
document.addEventListener("DOMContentLoaded", () => {
  initAdminTabs();
  initTcSubTabs(); // Khởi tạo tab con trong Phân hệ 2
  initNoiBoSubTabs(); // Khởi tạo tab con trong Phân hệ 3
  initAdminData();
  setupDropdownChangeEvents();
  initKetNapEvents(); // Khởi tạo xử lý Kết nạp Đảng viên
  initDoiTuongEvents();
  initTaskEvents(); // Khởi tạo xử lý Nhiệm vụ nội bộ
  initAuthEvents(); // Khởi tạo sự kiện Đăng nhập / Đăng xuất an toàn
  initExcelImportExport(); // Khởi tạo sự kiện Import / Export Excel
  initTimeConfigEvents(); // Lắng nghe & cài đặt khung giờ
});

// =================================================================
// 2. CHUYỂN ĐỔI TAB GIỮA CÁC PHÂN HỆ QUẢN TRỊ CHÍNH
// =================================================================
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

function initTcSubTabs() {
  const subBtns = document.querySelectorAll(".sub-tc-tab-btn");
  const subContents = document.querySelectorAll(".tc-subtab-content");

  subBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-tc-tab");

      subBtns.forEach((b) => {
        b.classList.remove("active");
        b.style.borderBottomColor = "transparent";
        b.style.color = "#64748b";
      });

      btn.classList.add("active");
      btn.style.borderBottomColor = "#16a34a";
      btn.style.color = "#16a34a";

      subContents.forEach((c) => {
        if (c.id === target) {
          c.style.display = "block";
        } else {
          c.style.display = "none";
        }
      });
    });
  });
}

// HÀM CHUYỂN SUB-TAB QUẢN LÝ NỘI BỘ TOÀN CỤC (AN TOÀN CHO CẢ ONCLICK HTML & EVENT LISTENER)
window.switchNoiBoSubTab = function (targetId, btnEl) {
  const subBtns = document.querySelectorAll(".sub-noibo-tab-btn");
  const subContents = document.querySelectorAll(".noibo-subtab-content");

  subBtns.forEach((b) => {
    b.classList.remove("active");
    b.style.borderBottomColor = "transparent";
    b.style.color = "#64748b";
  });

  if (btnEl) {
    btnEl.classList.add("active");
    btnEl.style.borderBottomColor = "#cc0000";
    btnEl.style.color = "#cc0000";
  }

  subContents.forEach((c) => {
    if (c.id === targetId) {
      c.style.display = "block";
    } else {
      c.style.display = "none";
    }
  });
};

function initNoiBoSubTabs() {
  const subBtns = document.querySelectorAll(".sub-noibo-tab-btn");
  if (!subBtns.length) return;

  subBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      let target = btn.getAttribute("data-noibo-tab");

      // Nếu không có data-noibo-tab, trích xuất từ thuộc tính onclick
      if (!target) {
        const onclickAttr = btn.getAttribute("onclick");
        if (onclickAttr) {
          const match = onclickAttr.match(
            /switchNoiBoSubTab\(['"]([^'"]+)['"]/,
          );
          if (match) target = match[1];
        }
      }

      if (target) {
        window.switchNoiBoSubTab(target, btn);
      }
    });
  });
}

// =================================================================
// 3. XÁC THỰC VÀ PHÂN QUYỀN TÀI KHOẢN
// =================================================================
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    // CHẶN NGAY theo email: btc.tn@gmail.com không bao giờ được ở lại admin.html.
    // Dùng replace để bấm Back cũng không quay lại trang quản trị vừa bị chặn.
    if (isViewOnlyHomeAccount(user)) {
      window.location.replace("index.html");
      return;
    }

    // Chưa hiển thị khu vực quản trị cho đến khi đọc xong role.
    if (loginSection) loginSection.style.display = "none";
    if (adminSection) adminSection.style.display = "none";

    database
      .ref("users/" + user.uid)
      .once("value")
      .then((snapshot) => {
        const userData = snapshot.val();
        const role = userData ? userData.role : "nhap_lieu";

        // Chặn tiếp theo role để bảo vệ mọi tài khoản chỉ-xem khác có thể tạo sau này.
        if (role === "xem_noi_bo") {
          currentRole = role;
          window.location.replace("index.html");
          return;
        }

        if (adminSection) adminSection.style.display = "block";

        const roleText =
          role === "admin"
            ? "Quản trị viên (Admin)"
            : role === "nhap_lieu_btc"
              ? "Cán bộ Ban Tổ chức (Nhập liệu)"
              : "Cán bộ Nhập liệu (Số hóa)";

        if (adminUserInfo) {
          adminUserInfo.innerHTML = `<i class="fa-solid fa-circle-user" style="color: #2ecc71;"></i> Tài khoản: <b>${user.email}</b> [${roleText}]`;
        }

        applyRolePermissions(role);
        initAdminData();
      })
      .catch((error) => {
        console.error("Lỗi đọc quyền tài khoản:", error);
        if (adminSection) adminSection.style.display = "none";
        if (loginSection) loginSection.style.display = "block";
        Swal.fire("Lỗi", "Không thể xác định quyền của tài khoản.", "error");
      });
  } else {
    if (loginSection) loginSection.style.display = "block";
    if (adminSection) adminSection.style.display = "none";
  }
});

function applyRolePermissions(role) {
  currentRole = role;

  const btnSoHoa = document.querySelector('[data-admin-tab="admin-tab-sohoa"]');
  const btnTcDang = document.querySelector(
    '[data-admin-tab="admin-tab-tcdang"]',
  );
  const btnNoiBo = document.querySelector('[data-admin-tab="admin-tab-noibo"]');
  const timeConfigSection = document.getElementById(
    "admin-time-config-section",
  );

  if (role === "xem_noi_bo") {
    // Phòng vệ bổ sung: role chỉ xem không bao giờ được hiển thị module nhập liệu.
    if (btnSoHoa) btnSoHoa.style.display = "none";
    if (btnTcDang) btnTcDang.style.display = "none";
    if (btnNoiBo) btnNoiBo.style.display = "none";
    if (timeConfigSection) timeConfigSection.style.display = "none";
    if (adminSection) adminSection.style.display = "none";
    return;
  }

  if (role === "admin") {
    if (btnSoHoa) btnSoHoa.style.display = "inline-flex";
    if (btnTcDang) btnTcDang.style.display = "inline-flex";
    if (btnNoiBo) btnNoiBo.style.display = "inline-flex";
    if (timeConfigSection) timeConfigSection.style.display = "block";
  } else if (role === "nhap_lieu_btc") {
    // Tài khoản Ban Tổ chức: Cho phép xem/sửa Phân hệ Quản lý nội bộ
    if (btnSoHoa) btnSoHoa.style.display = "none";
    if (btnTcDang) btnTcDang.style.display = "none";
    if (btnNoiBo) {
      btnNoiBo.style.display = "inline-flex";
      btnNoiBo.click();
    }
    if (timeConfigSection) timeConfigSection.style.display = "none";
  } else {
    if (btnSoHoa) {
      btnSoHoa.style.display = "inline-flex";
      btnSoHoa.click();
    }
    if (btnTcDang) btnTcDang.style.display = "none";
    if (btnNoiBo) btnNoiBo.style.display = "none";
    if (timeConfigSection) timeConfigSection.style.display = "none";
  }
}

// XỬ LÝ SỰ KIỆN ĐĂNG NHẬP / ĐĂNG XUẤT AN TOÀN
function initAuthEvents() {
  if (btnLogin) {
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
          // Tài khoản btc.tn chỉ dùng phiên đăng nhập để xem nội bộ ở Trang chủ.
          // Chuyển ngay, không hiển thị giao diện admin và không chờ popup.
          if (isViewOnlyHomeAccount(u.user)) {
            window.location.replace("index.html");
            return;
          }

          Swal.fire({
            icon: "success",
            title: "Đăng nhập thành công",
            text: `Chào mừng ${u.user.email}!`,
            timer: 1500,
            showConfirmButton: false,
          });
        })
        .catch((err) => {
          console.error("Lỗi đăng nhập:", err);
          Swal.fire({
            icon: "error",
            title: "Thất bại",
            text: "Sai tài khoản hoặc mật khẩu!",
          });
        });
    });
  }

  if (btnLogout) {
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
  }
}

// =================================================================
// 4. NẠP DANH SÁCH ĐẢNG BỘ VÀO DROPDOWN VÀ BẬT TÌM KIẾM
// =================================================================
function initAdminData() {
  const selectSoHoa = $("#select-dangbo-sohoa");
  const selectTcDang = $("#select-dangbo-tcdang");
  const selectKetNap = $("#select-dangbo-ketnap");

  if (selectSoHoa.length)
    selectSoHoa.html(
      '<option value="">-- Chọn một Đảng bộ trực thuộc --</option>',
    );
  if (selectTcDang.length)
    selectTcDang.html(
      '<option value="">-- Chọn một Đảng bộ trực thuộc --</option>',
    );
  if (selectKetNap.length)
    selectKetNap.html(
      '<option value="">-- Chọn một Đảng bộ trực thuộc --</option>',
    );

  dangBoCache = {};
  dangBoCache["tinh_thai_nguyen"] = "ĐẢNG BỘ TỈNH THÁI NGUYÊN";

  // NẠP TÙY CHỌN TỈNH NẾU LÀ ADMIN
  if (currentRole === "admin") {
    const provincialOption = `<option value="tinh_thai_nguyen" style="font-weight: bold; color: #cc0000;">★ ĐẢNG BỘ TỈNH THÁI NGUYÊN (Số liệu tổng)</option>`;
    if (selectTcDang.length) selectTcDang.append(provincialOption);
    if (selectKetNap.length) selectKetNap.append(provincialOption);
  }

  dangBoRef.once("value", (snapshot) => {
    snapshot.forEach((child) => {
      const key = child.key;
      if (key === "tinh_thai_nguyen") return; // Bỏ qua trùng lặp

      const data = child.val();
      dangBoCache[key] = data.ten;

      const optionHtml = `<option value="${key}">${data.ten}</option>`;

      if (selectSoHoa.length) selectSoHoa.append(optionHtml);
      if (selectTcDang.length) selectTcDang.append(optionHtml);
      if (selectKetNap.length) selectKetNap.append(optionHtml);
    });

    enableSelect2Search();
    loadProgressTables();
  });
}

function enableSelect2Search() {
  if (typeof $ === "undefined" || typeof $.fn.select2 === "undefined") {
    console.warn("Select2 chưa được nạp, sử dụng Dropdown mặc định.");
    return;
  }

  const selectIds = [
    "#select-dangbo-sohoa",
    "#select-dangbo-tcdang",
    "#select-dangbo-ketnap",
  ];

  selectIds.forEach((id) => {
    if ($(id).length) {
      $(id).select2({
        placeholder: "-- Chọn hoặc gõ tên Đảng bộ để tìm kiếm --",
        allowClear: true,
        width: "100%",
        language: {
          noResults: function () {
            return "Không tìm thấy Đảng bộ phù hợp";
          },
        },
      });

      $(id)
        .off("select2:select select2:clear")
        .on("select2:select select2:clear", function (e) {
          const event = new Event("change", { bubbles: true });
          this.dispatchEvent(event);
        });
    }
  });
}

// =================================================================
// 5. TỰ ĐỘNG FILL DỮ LIỆU CỦA ĐƠN VỊ ĐÃ LƯU KHI CHỌN TỪ DROPDOWN
// =================================================================
function setupDropdownChangeEvents() {
  const selectSoHoa = document.getElementById("select-dangbo-sohoa");
  if (selectSoHoa) {
    selectSoHoa.addEventListener("change", (e) => {
      const selectedId = e.target.value;
      if (!selectedId) {
        document.getElementById("form-sohoa")?.reset();
        return;
      }

      dangBoRef.child(selectedId).once("value", (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          if (document.getElementById("sohoa-can-so-hoa"))
            document.getElementById("sohoa-can-so-hoa").value =
              data.tongHoSo || 0;
          if (document.getElementById("sohoa-thieu-tai-lieu"))
            document.getElementById("sohoa-thieu-tai-lieu").value =
              data.soHsThieuTaiLieuCoBan || 0;
          if (document.getElementById("sohoa-chinh-ly"))
            document.getElementById("sohoa-chinh-ly").value =
              data.daChinhLy || 0;
          if (document.getElementById("sohoa-ky-so"))
            document.getElementById("sohoa-ky-so").value = data.daKySo || 0;
          if (document.getElementById("sohoa-phan-mem"))
            document.getElementById("sohoa-phan-mem").value =
              data.daCapNhat || 0;
        } else {
          if (document.getElementById("sohoa-can-so-hoa"))
            document.getElementById("sohoa-can-so-hoa").value = 0;
          if (document.getElementById("sohoa-thieu-tai-lieu"))
            document.getElementById("sohoa-thieu-tai-lieu").value = 0;
          if (document.getElementById("sohoa-chinh-ly"))
            document.getElementById("sohoa-chinh-ly").value = 0;
          if (document.getElementById("sohoa-ky-so"))
            document.getElementById("sohoa-ky-so").value = 0;
          if (document.getElementById("sohoa-phan-mem"))
            document.getElementById("sohoa-phan-mem").value = 0;
        }
      });
    });
  }

  const selectTcDang = document.getElementById("select-dangbo-tcdang");
  if (selectTcDang) {
    selectTcDang.addEventListener("change", (e) => {
      const selectedId = e.target.value;
      if (!selectedId) {
        document.getElementById("form-tcdang")?.reset();
        return;
      }

      dangBoRef.child(selectedId).once("value", (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          if (document.getElementById("tc-so-tccs-dang"))
            document.getElementById("tc-so-tccs-dang").value =
              data.soTccsDang || 0;
          if (document.getElementById("tc-so-chi-bo"))
            document.getElementById("tc-so-chi-bo").value = data.soChiBo || 0;
          if (document.getElementById("tc-tong-dang-vien"))
            document.getElementById("tc-tong-dang-vien").value =
              data.tongDangVien || 0;
          if (document.getElementById("tc-dang-vien-chinh-thuc"))
            document.getElementById("tc-dang-vien-chinh-thuc").value =
              data.dvChinhThuc || 0;
          if (document.getElementById("tc-dang-vien-du-bi"))
            document.getElementById("tc-dang-vien-du-bi").value =
              data.dvDuBi || 0;

          if (document.getElementById("tc-tuoi-under30"))
            document.getElementById("tc-tuoi-under30").value =
              data.tuoiUnder30 || 0;
          if (document.getElementById("tc-tuoi-30to45"))
            document.getElementById("tc-tuoi-30to45").value =
              data.tuoi30to45 || 0;
          if (document.getElementById("tc-tuoi-46to60"))
            document.getElementById("tc-tuoi-46to60").value =
              data.tuoi46to60 || 0;
          if (document.getElementById("tc-tuoi-over60"))
            document.getElementById("tc-tuoi-over60").value =
              data.tuoiOver60 || 0;
        } else {
          if (document.getElementById("tc-so-tccs-dang"))
            document.getElementById("tc-so-tccs-dang").value = 0;
          if (document.getElementById("tc-so-chi-bo"))
            document.getElementById("tc-so-chi-bo").value = 0;
          if (document.getElementById("tc-tong-dang-vien"))
            document.getElementById("tc-tong-dang-vien").value = 0;
          if (document.getElementById("tc-dang-vien-chinh-thuc"))
            document.getElementById("tc-dang-vien-chinh-thuc").value = 0;
          if (document.getElementById("tc-dang-vien-du-bi"))
            document.getElementById("tc-dang-vien-du-bi").value = 0;

          if (document.getElementById("tc-tuoi-under30"))
            document.getElementById("tc-tuoi-under30").value = 0;
          if (document.getElementById("tc-tuoi-30to45"))
            document.getElementById("tc-tuoi-30to45").value = 0;
          if (document.getElementById("tc-tuoi-46to60"))
            document.getElementById("tc-tuoi-46to60").value = 0;
          if (document.getElementById("tc-tuoi-over60"))
            document.getElementById("tc-tuoi-over60").value = 0;
        }
      });
    });
  }
}

// =================================================================
// 6. XỬ LÝ LƯU DỮ LIỆU - PHÂN HỆ 1: SỐ HÓA HỒ SƠ
// =================================================================
const formSoHoa = document.getElementById("form-sohoa");
if (formSoHoa) {
  formSoHoa.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Kiểm tra khung giờ nhập liệu Số hóa hồ sơ
    const allowed = await isImportTimeAllowed();
    if (!allowed) {
      Swal.fire({
        icon: "error",
        title: "Hệ thống đang khóa!",
        text: "Hiện tại đã hết hoặc chưa đến khung thời gian cho phép nhập liệu Số hóa hồ sơ đảng viên!",
      });
      return;
    }

    const id = document.getElementById("select-dangbo-sohoa").value;
    const canSoHoa =
      parseInt(document.getElementById("sohoa-can-so-hoa")?.value) || 0;
    const thieuTaiLieu =
      parseInt(document.getElementById("sohoa-thieu-tai-lieu")?.value) || 0;
    const chinhLy =
      parseInt(document.getElementById("sohoa-chinh-ly")?.value) || 0;
    const kySo = parseInt(document.getElementById("sohoa-ky-so")?.value) || 0;
    const phanMem =
      parseInt(document.getElementById("sohoa-phan-mem")?.value) || 0;

    if (!id) {
      Swal.fire({
        icon: "warning",
        title: "Chưa chọn đơn vị",
        text: "Vui lòng chọn một Đảng bộ trực thuộc!",
      });
      return;
    }

    if (
      canSoHoa < 0 ||
      thieuTaiLieu < 0 ||
      chinhLy < 0 ||
      kySo < 0 ||
      phanMem < 0
    ) {
      Swal.fire({
        icon: "error",
        title: "Lỗi",
        text: "Số liệu nhập vào phải lớn hơn hoặc bằng 0!",
      });
      return;
    }

    if (thieuTaiLieu > canSoHoa) {
      Swal.fire({
        icon: "error",
        title: "Số liệu không hợp lệ",
        text: 'Số HS thiếu tài liệu cơ bản không được lớn hơn số hồ sơ cần số hóa!',
      });
      return;
    }

    if (chinhLy > canSoHoa || kySo > chinhLy || phanMem > kySo) {
      Swal.fire({
        icon: "error",
        title: "Số liệu không hợp lệ",
        text: "Tiến độ khâu sau không được lớn hơn khâu trước!",
      });
      return;
    }

    dangBoRef
      .child(id)
      .update({
        tongHoSo: canSoHoa,
        soHsThieuTaiLieuCoBan: thieuTaiLieu,
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
}

// =================================================================
// 7. XỬ LÝ LƯU DỮ LIỆU - PHÂN HỆ 2: TỔ CHỨC ĐẢNG & ĐẢNG VIÊN
// =================================================================
const formTcDang = document.getElementById("form-tcdang");
if (formTcDang) {
  formTcDang.addEventListener("submit", (e) => {
    e.preventDefault();

    const id = document.getElementById("select-dangbo-tcdang").value;
    const soTccsDang =
      parseInt(document.getElementById("tc-so-tccs-dang")?.value) || 0;
    const soChiBo =
      parseInt(document.getElementById("tc-so-chi-bo")?.value) || 0;
    const tongDangVien =
      parseInt(document.getElementById("tc-tong-dang-vien")?.value) || 0;
    const dvChinhThuc =
      parseInt(document.getElementById("tc-dang-vien-chinh-thuc")?.value) || 0;
    const dvDuBi =
      parseInt(document.getElementById("tc-dang-vien-du-bi")?.value) || 0;

    const tuoiUnder30 =
      parseInt(document.getElementById("tc-tuoi-under30")?.value) || 0;
    const tuoi30to45 =
      parseInt(document.getElementById("tc-tuoi-30to45")?.value) || 0;
    const tuoi46to60 =
      parseInt(document.getElementById("tc-tuoi-46to60")?.value) || 0;
    const tuoiOver60 =
      parseInt(document.getElementById("tc-tuoi-over60")?.value) || 0;

    if (!id) {
      Swal.fire({
        icon: "warning",
        title: "Chưa chọn đơn vị",
        text: "Vui lòng chọn một Đảng bộ trực thuộc!",
      });
      return;
    }

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
        title: "Lỗi",
        text: "Tất cả các số liệu phải lớn hơn hoặc bằng 0!",
      });
      return;
    }

    if (dvChinhThuc + dvDuBi !== tongDangVien) {
      Swal.fire({
        icon: "error",
        title: "Số liệu không khớp",
        text: `Đảng viên chính thức + Dự bị phải bằng Tổng số Đảng viên (${tongDangVien})!`,
      });
      return;
    }

    if (tuoiUnder30 + tuoi30to45 + tuoi46to60 + tuoiOver60 !== tongDangVien) {
      Swal.fire({
        icon: "error",
        title: "Cơ cấu độ tuổi không khớp",
        text: `Tổng 4 khung độ tuổi phải bằng Tổng số Đảng viên (${tongDangVien})!`,
      });
      return;
    }

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
          text: `Đã cập nhật số liệu cho ${dangBoCache[id]}.`,
          timer: 1500,
          showConfirmButton: false,
        });
      });
  });
}

// =================================================================
// 7.1 XỬ LÝ KẾT NẠP ĐẢNG VIÊN (TỰ ĐỘNG TÍNH TOÁN & LƯU FORM)
// =================================================================
function initKetNapEvents() {
  const formKetNap = document.getElementById("form-ketnap");
  const selectKetNap = $("#select-dangbo-ketnap");

  function calcTyLe() {
    const chiTieu =
      parseFloat(document.getElementById("ketnap-chi-tieu")?.value) || 0;
    const tongSo =
      parseFloat(document.getElementById("ketnap-tong-so")?.value) || 0;
    const tyLeInput = document.getElementById("ketnap-ty-le");

    if (tyLeInput) {
      if (chiTieu > 0) {
        const pct = ((tongSo / chiTieu) * 100).toFixed(2);
        tyLeInput.value = pct + "%";
      } else {
        tyLeInput.value = "0.00%";
      }
    }
  }

  function calcHSSV() {
    const hocSinh =
      parseInt(document.getElementById("ketnap-hoc-sinh")?.value) || 0;
    const sinhVien =
      parseInt(document.getElementById("ketnap-sinh-vien")?.value) || 0;
    const elHssv = document.getElementById("ketnap-tong-hssv");
    if (elHssv) elHssv.value = hocSinh + sinhVien;
  }

  function calcDN() {
    const dnNhaNuoc =
      parseInt(document.getElementById("ketnap-dn-nha-nuoc")?.value) || 0;
    const dnNgoaiNN =
      parseInt(document.getElementById("ketnap-dn-ngoai-nn")?.value) || 0;
    const nldKdc =
      parseInt(document.getElementById("ketnap-nld-kdc")?.value) || 0;
    const htx = parseInt(document.getElementById("ketnap-htx")?.value) || 0;

    const elDn = document.getElementById("ketnap-tong-dn");
    if (elDn) elDn.value = dnNhaNuoc + dnNgoaiNN + nldKdc + htx;
  }

  // HÀM TỰ ĐỘNG NẠP DỮ LIỆU ĐÃ CÓ VÀO FORM
  window.loadKetNapDataToForm = function (id) {
    if (!id) {
      if (formKetNap) formKetNap.reset();
      calcTyLe();
      calcHSSV();
      calcDN();
      return;
    }

    dangBoRef.child(id).once("value", (snapshot) => {
      if (snapshot.exists()) {
        const d = snapshot.val();
        if (document.getElementById("ketnap-chi-tieu"))
          document.getElementById("ketnap-chi-tieu").value =
            d.chiTieuKetNap || 0;
        if (document.getElementById("ketnap-tong-so"))
          document.getElementById("ketnap-tong-so").value = d.daKetNap || 0;
        if (document.getElementById("ketnap-hoc-sinh"))
          document.getElementById("ketnap-hoc-sinh").value = d.hocSinh || 0;
        if (document.getElementById("ketnap-sinh-vien"))
          document.getElementById("ketnap-sinh-vien").value = d.sinhVien || 0;
        if (document.getElementById("ketnap-dn-nha-nuoc"))
          document.getElementById("ketnap-dn-nha-nuoc").value =
            d.dnNhaNuoc || 0;
        if (document.getElementById("ketnap-dn-ngoai-nn"))
          document.getElementById("ketnap-dn-ngoai-nn").value =
            d.dnNgoaiNN || 0;
        if (document.getElementById("ketnap-nld-kdc"))
          document.getElementById("ketnap-nld-kdc").value = d.nldKdc || 0;
        if (document.getElementById("ketnap-htx"))
          document.getElementById("ketnap-htx").value = d.htx || 0;
        if (document.getElementById("ketnap-dtts"))
          document.getElementById("ketnap-dtts").value = d.dtts || 0;

        calcTyLe();
        calcHSSV();
        calcDN();
      }
    });
  };

  document
    .getElementById("ketnap-chi-tieu")
    ?.addEventListener("input", calcTyLe);
  document
    .getElementById("ketnap-tong-so")
    ?.addEventListener("input", calcTyLe);

  document.querySelectorAll(".input-calc-hssv").forEach((el) => {
    el.addEventListener("input", calcHSSV);
  });

  document.querySelectorAll(".input-calc-dn").forEach((el) => {
    el.addEventListener("input", calcDN);
  });

  // ĐĂNG KÝ SỰ KIỆN BẰNG JQUERY CHO SELECT2
  if (selectKetNap.length) {
    selectKetNap.off("change").on("change", (e) => {
      window.loadKetNapDataToForm(e.target.value);
    });
  }

  if (formKetNap) {
    formKetNap.addEventListener("submit", (e) => {
      e.preventDefault();

      const id = selectKetNap.val();
      if (!id) {
        Swal.fire({
          icon: "warning",
          title: "Chưa chọn đơn vị",
          text: "Vui lòng chọn một Đảng bộ trực thuộc!",
        });
        return;
      }

      const saveData = {
        chiTieuKetNap:
          parseInt(document.getElementById("ketnap-chi-tieu")?.value) || 0,
        daKetNap:
          parseInt(document.getElementById("ketnap-tong-so")?.value) || 0,
        hocSinh:
          parseInt(document.getElementById("ketnap-hoc-sinh")?.value) || 0,
        sinhVien:
          parseInt(document.getElementById("ketnap-sinh-vien")?.value) || 0,
        tongHSSV:
          parseInt(document.getElementById("ketnap-tong-hssv")?.value) || 0,
        dnNhaNuoc:
          parseInt(document.getElementById("ketnap-dn-nha-nuoc")?.value) || 0,
        dnNgoaiNN:
          parseInt(document.getElementById("ketnap-dn-ngoai-nn")?.value) || 0,
        nldKdc: parseInt(document.getElementById("ketnap-nld-kdc")?.value) || 0,
        htx: parseInt(document.getElementById("ketnap-htx")?.value) || 0,
        tongDN: parseInt(document.getElementById("ketnap-tong-dn")?.value) || 0,
        dtts: parseInt(document.getElementById("ketnap-dtts")?.value) || 0,
        updatedAt: firebase.database.ServerValue.TIMESTAMP,
      };

      dangBoRef
        .child(id)
        .update(saveData)
        .then(() => {
          Swal.fire({
            icon: "success",
            title: "Đã lưu thành công",
            text: `Đã cập nhật chi tiết số liệu kết nạp thành công!`,
            timer: 1500,
            showConfirmButton: false,
          });
        });
    });
  }

  const btnResetKetNap = document.querySelector(".btn-reset-form-ketnap");
  if (btnResetKetNap) {
    btnResetKetNap.addEventListener("click", () => {
      if (formKetNap) formKetNap.reset();
      calcTyLe();
      calcHSSV();
      calcDN();
    });
  }
}

// Nút làm lại form chung
document.querySelectorAll(".btn-reset-form").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const parentForm = e.target.closest("form");
    if (parentForm) parentForm.reset();
  });
});

// =================================================================
// 8. ĐỌC REALTIME & NẠP SỐ LIỆU VÀO TẤT CẢ CÁC BẢNG
// =================================================================
function loadProgressTables() {
  const tbodySoHoa = document.getElementById("table-sohoa-body");
  const tbodyTcDang = document.getElementById("table-tcdang-body");
  const tbodyKetNap = document.getElementById("table-ketnap-body");

  dangBoRef.on("value", (snapshot) => {
    if (tbodySoHoa) tbodySoHoa.innerHTML = "";
    if (tbodyTcDang) tbodyTcDang.innerHTML = "";
    if (tbodyKetNap) tbodyKetNap.innerHTML = "";

    if (!snapshot.exists()) return;

    let indexKetNap = 1;

    snapshot.forEach((child) => {
      const key = child.key;
      const data = child.val();
      const ten = data.ten || `Đảng bộ ${key}`;

      if (tbodySoHoa) {
        const tr1 = document.createElement("tr");
        tr1.innerHTML = `
          <td><b>${ten}</b></td>
          <td>${Number(data.tongHoSo || 0).toLocaleString()}</td>
          <td>${Number(data.soHsThieuTaiLieuCoBan || 0).toLocaleString()}</td>
          <td>${Number(data.daChinhLy || 0).toLocaleString()}</td>
          <td>${Number(data.daKySo || 0).toLocaleString()}</td>
          <td>${Number(data.daCapNhat || 0).toLocaleString()}</td>
          <td style="text-align: center;">
            <button class="btn btn-primary" style="padding: 4px 8px; font-size: 12px;" onclick="editSoHoa('${key}', ${data.tongHoSo || 0}, ${data.soHsThieuTaiLieuCoBan || 0}, ${data.daChinhLy || 0}, ${data.daKySo || 0}, ${data.daCapNhat || 0})">
              Sửa
            </button>
          </td>
        `;
        tbodySoHoa.appendChild(tr1);
      }

      if (tbodyTcDang) {
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
      }

      if (tbodyKetNap) {
        const chiTieu = Number(data.chiTieuKetNap || 0);
        const daKetNap = Number(data.daKetNap || 0);
        const pct =
          chiTieu > 0 ? ((daKetNap / chiTieu) * 100).toFixed(2) : "0.00";

        const tr3 = document.createElement("tr");
        tr3.innerHTML = `
          <td style="text-align: center">${indexKetNap++}</td>
          <td><b>${ten}</b></td>
          <td style="text-align: right">${chiTieu.toLocaleString()}</td>
          <td style="text-align: right; font-weight: bold; color: #0056b3;">${daKetNap.toLocaleString()}</td>
          <td style="text-align: center; font-weight: bold; color: ${pct >= 100 ? "#16a34a" : "#dc2626"};">${pct}%</td>
          <td style="text-align: right; background: #f0f9ff; font-weight: bold;">${Number(data.tongHSSV || 0).toLocaleString()}</td>
          <td style="text-align: right">${Number(data.hocSinh || 0).toLocaleString()}</td>
          <td style="text-align: right">${Number(data.sinhVien || 0).toLocaleString()}</td>
          <td style="text-align: right; background: #f0fdf4; font-weight: bold;">${Number(data.tongDN || 0).toLocaleString()}</td>
          <td style="text-align: right">${Number(data.dnNhaNuoc || 0).toLocaleString()}</td>
          <td style="text-align: right">${Number(data.dnNgoaiNN || 0).toLocaleString()}</td>
          <td style="text-align: right">${Number(data.nldKdc || 0).toLocaleString()}</td>
          <td style="text-align: right">${Number(data.htx || 0).toLocaleString()}</td>
          <td style="text-align: right">${Number(data.dtts || 0).toLocaleString()}</td>
          <td style="text-align: center;">
            <button class="btn btn-primary" style="padding: 3px 6px; font-size: 11px; background-color: #0284c7;" onclick="editKetNapFull('${key}')">Sửa</button>
          </td>
        `;
        tbodyKetNap.appendChild(tr3);
      }
    });
  });
}

// Hàm gán lại dữ liệu cũ khi click nút Sửa
window.editSoHoa = function (
  id,
  canSoHoa,
  thieuTaiLieu,
  chinhLy,
  kySo,
  phanMem,
) {
  $("#select-dangbo-sohoa").val(id).trigger("change");
  if (document.getElementById("sohoa-can-so-hoa"))
    document.getElementById("sohoa-can-so-hoa").value = canSoHoa;
  if (document.getElementById("sohoa-thieu-tai-lieu"))
    document.getElementById("sohoa-thieu-tai-lieu").value = thieuTaiLieu;
  if (document.getElementById("sohoa-chinh-ly"))
    document.getElementById("sohoa-chinh-ly").value = chinhLy;
  if (document.getElementById("sohoa-ky-so"))
    document.getElementById("sohoa-ky-so").value = kySo;
  if (document.getElementById("sohoa-phan-mem"))
    document.getElementById("sohoa-phan-mem").value = phanMem;
  document.getElementById("form-sohoa")?.scrollIntoView({ behavior: "smooth" });
};

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
  $("#select-dangbo-tcdang").val(id).trigger("change");
  if (document.getElementById("tc-so-tccs-dang"))
    document.getElementById("tc-so-tccs-dang").value = soTccs;
  if (document.getElementById("tc-so-chi-bo"))
    document.getElementById("tc-so-chi-bo").value = soChiBo;
  if (document.getElementById("tc-tong-dang-vien"))
    document.getElementById("tc-tong-dang-vien").value = tongDV;
  if (document.getElementById("tc-dang-vien-chinh-thuc"))
    document.getElementById("tc-dang-vien-chinh-thuc").value = dvChinhThuc;
  if (document.getElementById("tc-dang-vien-du-bi"))
    document.getElementById("tc-dang-vien-du-bi").value = dvDuBi;

  if (document.getElementById("tc-tuoi-under30"))
    document.getElementById("tc-tuoi-under30").value = u30 || 0;
  if (document.getElementById("tc-tuoi-30to45"))
    document.getElementById("tc-tuoi-30to45").value = t30to45 || 0;
  if (document.getElementById("tc-tuoi-46to60"))
    document.getElementById("tc-tuoi-46to60").value = t46to60 || 0;
  if (document.getElementById("tc-tuoi-over60"))
    document.getElementById("tc-tuoi-over60").value = o60 || 0;

  document
    .getElementById("form-tcdang")
    ?.scrollIntoView({ behavior: "smooth" });
};

window.editKetNapFull = function (id) {
  $("#select-dangbo-ketnap").val(id).trigger("change");

  if (typeof window.loadKetNapDataToForm === "function") {
    window.loadKetNapDataToForm(id);
  }

  document
    .getElementById("form-ketnap")
    ?.scrollIntoView({ behavior: "smooth" });
};

// =================================================================
// 9. QUẢN LÝ DANH MỤC ĐƠN VỊ / CÁ NHÂN & BỘ LỌC DROPDOWN
// =================================================================
let doiTuongListCache = []; // Mảng lưu toàn bộ danh mục đối tượng

// 9.1 Hàm render lại Dropdown chọn chủ trì theo radio filter (Tất cả / Đơn vị / Cá nhân)
window.renderAssigneeDropdown = function () {
  const selectAssignee =
    document.getElementById("task-assignee-select") ||
    document.getElementById("task-assignee");
  if (!selectAssignee) return;

  const selectedVal = selectAssignee.value;
  const filterType =
    document.querySelector('input[name="filter-assignee-type"]:checked')
      ?.value || "ALL";

  selectAssignee.innerHTML =
    '<option value="">-- Chọn Đơn vị / Cá nhân --</option>';

  doiTuongListCache.forEach((d) => {
    if (filterType === "ALL" || d.loai === filterType) {
      const opt = document.createElement("option");
      opt.value = `[${d.ma}] ${d.ten}`;
      opt.textContent = `[${d.ma}] ${d.ten} (${d.loai})`;
      selectAssignee.appendChild(opt);
    }
  });

  if (selectedVal) {
    selectAssignee.value = selectedVal;
  }
};

// 9.2 Khởi tạo sự kiện Form Đơn vị / Cá nhân (Thêm mới, Sinh mã tự động, Reset)
function initDoiTuongEvents() {
  const dtLoai = document.getElementById("dt-loai");
  const dtMa = document.getElementById("dt-ma");
  const lblMa = document.getElementById("lbl-dt-ma");
  const lblTen = document.getElementById("lbl-dt-ten");
  const formDoiTuong = document.getElementById("form-doi-tuong");

  function generateAutoCode(loai) {
    const prefix = loai === "Cơ quan, đơn vị" ? "DV" : "CN";
    doiTuongRef.once("value", (snapshot) => {
      let count = 1;
      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          const val = child.val();
          if (val && val.loai === loai) {
            count++;
          }
        });
      }
      const codeStr = prefix + String(count).padStart(3, "0");
      const hiddenKeyEl = document.getElementById("dt-key-hidden");
      if (dtMa && (!hiddenKeyEl || !hiddenKeyEl.value)) {
        dtMa.value = codeStr;
      }
    });
  }

  if (dtLoai) {
    dtLoai.addEventListener("change", (e) => {
      const isDonVi = e.target.value === "Cơ quan, đơn vị";
      if (lblMa)
        lblMa.innerText = isDonVi
          ? "Mã đơn vị (Tự động):"
          : "Mã cá nhân (Tự động):";
      if (lblTen)
        lblTen.innerHTML = isDonVi
          ? 'Tên cơ quan, đơn vị <span style="color:red;">*</span>:'
          : 'Tên cá nhân <span style="color:red;">*</span>:';
      generateAutoCode(e.target.value);
    });
    generateAutoCode(dtLoai.value);
  }

  if (formDoiTuong) {
    formDoiTuong.addEventListener("submit", (e) => {
      e.preventDefault();

      const hiddenKey = document.getElementById("dt-key-hidden")?.value;
      const loai = dtLoai ? dtLoai.value : "Cơ quan, đơn vị";
      const ma = dtMa ? dtMa.value.trim().toUpperCase() : "";
      const ten = document.getElementById("dt-ten")?.value.trim();
      const ghiChu = document.getElementById("dt-ghi-chu")?.value.trim();

      if (!ma || !ten) {
        Swal.fire("Lỗi", "Vui lòng nhập đầy đủ thông tin!", "warning");
        return;
      }

      const payload = {
        loai: loai,
        ma: ma,
        ten: ten,
        ghiChu: ghiChu,
        updatedAt: firebase.database.ServerValue.TIMESTAMP,
      };

      if (hiddenKey) {
        doiTuongRef
          .child(hiddenKey)
          .update(payload)
          .then(() => {
            Swal.fire({
              icon: "success",
              title: "Cập nhật thành công!",
              timer: 1200,
              showConfirmButton: false,
            });
            resetDoiTuongForm();
          });
      } else {
        doiTuongRef
          .child(ma)
          .set(payload)
          .then(() => {
            Swal.fire({
              icon: "success",
              title: "Thêm thành công!",
              timer: 1200,
              showConfirmButton: false,
            });
            resetDoiTuongForm();
          });
      }
    });
  }

  document
    .getElementById("btn-reset-dt-form")
    ?.addEventListener("click", resetDoiTuongForm);
}

function resetDoiTuongForm() {
  const form = document.getElementById("form-doi-tuong");
  if (form) form.reset();
  const hiddenKeyEl = document.getElementById("dt-key-hidden");
  if (hiddenKeyEl) hiddenKeyEl.value = "";
  const dtLoai = document.getElementById("dt-loai");
  if (dtLoai) {
    dtLoai.dispatchEvent(new Event("change"));
  }
}

// 9.3 Lắng nghe Realtime Danh mục Đơn vị / Cá nhân
doiTuongRef.on(
  "value",
  (snapshot) => {
    doiTuongListCache = []; // Xóa cache cũ

    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        const key = child.key;
        const d = child.val() || {};
        d.key = key;
        doiTuongListCache.push(d); // Lưu toàn bộ vào cache
      });
    }

    // Thay vì vẽ thẳng, ta gọi hàm vẽ bảng và truyền dữ liệu cache vào
    renderDoiTuongTable();
    renderAssigneeDropdown(); // Cập nhật dropdown ở form Giao nhiệm vụ
  },
  (error) => {
    console.error("Lỗi đọc danh_muc_doi_tuong:", error);
  },
);

// HÀM MỚI: Xử lý vẽ bảng dựa trên bộ lọc và từ khóa tìm kiếm
window.renderDoiTuongTable = function () {
  const tbody = document.getElementById("table-doi-tuong-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  // Lấy giá trị của bộ lọc radio hiện tại
  const filterType =
    document.querySelector('input[name="filter-table-doi-tuong"]:checked')
      ?.value || "ALL";

  // Lấy giá trị từ khóa tìm kiếm (chuyển về chữ thường để so sánh)
  const searchInput = document.getElementById("search-doi-tuong");
  const keyword = searchInput ? searchInput.value.trim().toLowerCase() : "";

  // Lọc dữ liệu từ mảng cache kết hợp cả 2 điều kiện
  const filteredData = doiTuongListCache.filter((d) => {
    // 1. Kiểm tra điều kiện Loại (Radio)
    const matchType = filterType === "ALL" || d.loai === filterType;

    // 2. Kiểm tra điều kiện Từ khóa (Khớp với Tên hoặc Mã)
    const ten = (d.ten || "").toLowerCase();
    const ma = (d.ma || "").toLowerCase();
    const matchKeyword =
      !keyword || ten.includes(keyword) || ma.includes(keyword);

    // Bắt buộc phải thỏa mãn cả 2 điều kiện mới hiển thị
    return matchType && matchKeyword;
  });

  // Nếu mảng rỗng (không có dữ liệu)
  if (filteredData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding: 15px;">Không tìm thấy dữ liệu phù hợp.</td></tr>`;
    return;
  }

  let index = 1;
  filteredData.forEach((d) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="text-align: center;">${index++}</td>
      <td style="text-align: center;">
        <span style="background:${d.loai === "Cơ quan, đơn vị" ? "#e0f2fe" : "#fef3c7"}; color:${d.loai === "Cơ quan, đơn vị" ? "#0369a1" : "#b45309"}; padding:2px 8px; border-radius:4px; font-weight:bold; font-size:11px;">
          ${d.loai || "—"}
        </span>
      </td>
      <td style="text-align: center;"><code>${d.ma || d.key}</code></td>
      <td><b>${d.ten || "—"}</b></td>
      <td>${d.ghiChu || "—"}</td>
      <td style="text-align: center;">
        <button class="btn btn-primary" style="padding: 3px 6px; font-size: 11px; background-color: #16a34a;" onclick="editDoiTuong('${d.key}')">Sửa</button>
        <button class="btn btn-danger" style="padding: 3px 6px; font-size: 11px;" onclick="deleteDoiTuong('${d.key}')">Xóa</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
};

// 9.4 Sự kiện Sửa / Xóa Danh mục Đơn vị / Cá nhân
window.editDoiTuong = function (key) {
  doiTuongRef.child(key).once("value", (snapshot) => {
    if (snapshot.exists()) {
      const d = snapshot.val();
      if (document.getElementById("dt-key-hidden"))
        document.getElementById("dt-key-hidden").value = key;
      if (document.getElementById("dt-loai"))
        document.getElementById("dt-loai").value = d.loai || "Cơ quan, đơn vị";
      if (document.getElementById("dt-ma"))
        document.getElementById("dt-ma").value = d.ma || key;
      if (document.getElementById("dt-ten"))
        document.getElementById("dt-ten").value = d.ten || "";
      if (document.getElementById("dt-ghi-chu"))
        document.getElementById("dt-ghi-chu").value = d.ghiChu || "";
      document
        .getElementById("form-doi-tuong")
        ?.scrollIntoView({ behavior: "smooth" });
    }
  });
};

window.deleteDoiTuong = function (key) {
  Swal.fire({
    title: "Xác nhận xóa?",
    text: "Xóa danh mục này có thể ảnh hưởng đến lịch sử giao nhiệm vụ!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#dc2626",
    confirmButtonText: "Xóa ngay",
    cancelButtonText: "Hủy",
  }).then((res) => {
    if (res.isConfirmed) {
      doiTuongRef.child(key).remove();
    }
  });
};

// 9.5 Gán sự kiện thay đổi Radio Filter
document.addEventListener("change", (e) => {
  if (e.target && e.target.name === "filter-assignee-type") {
    renderAssigneeDropdown();
  }
  // Bổ sung lắng nghe sự kiện cho bộ lọc của bảng danh sách
  if (e.target && e.target.name === "filter-table-doi-tuong") {
    renderDoiTuongTable();
  }
});
document.getElementById("search-doi-tuong")?.addEventListener("input", () => {
  renderDoiTuongTable();
});
// ===== HỖ TRỢ TÍNH NGÀY NHIỆM VỤ (KHÔNG BỊ LỆCH DO MÚI GIỜ) =====
function parseAdminTaskDateOnly(dateValue) {
  if (!dateValue) return null;
  const match = String(dateValue).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const y = Number(match[1]);
    const m = Number(match[2]);
    const d = Number(match[3]);
    const date = new Date(y, m - 1, d);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function adminTaskTimestampToLocalDate(timestampValue) {
  if (!timestampValue) return null;
  const raw = typeof timestampValue === "number" ? timestampValue : Number(timestampValue);
  const date = Number.isFinite(raw) ? new Date(raw) : new Date(timestampValue);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function adminTaskDayNumber(date) {
  if (!date) return null;
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
}

function adminTaskDiffDays(fromDate, toDate) {
  const fromDay = adminTaskDayNumber(fromDate);
  const toDay = adminTaskDayNumber(toDate);
  if (fromDay === null || toDay === null) return null;
  return Math.round(toDay - fromDay);
}

// =================================================================
// 10. PHÂN HỆ 3: QUẢN LÝ NỘI BỘ - TIẾN ĐỘ NHIỆM VỤ (CÓ NGUỒN/CĂN CỨ & XÓA)
// =================================================================
function initTaskEvents() {
  const formTask = document.getElementById("form-task");
  if (formTask) {
    formTask.addEventListener("submit", (e) => {
      e.preventDefault();

      const taskId = document.getElementById("task-id-hidden")?.value;
      const taskName = document.getElementById("task-name")?.value.trim();
      const assigneeSelect =
        document.getElementById("task-assignee-select") ||
        document.getElementById("task-assignee");
      const assignee = assigneeSelect ? assigneeSelect.value.trim() : "";
      const startDate = document.getElementById("task-start-date")?.value || "";
      const deadline = document.getElementById("task-deadline")?.value || "";
      const source = document.getElementById("task-source")?.value.trim() || "";
      const product =
        document.getElementById("task-product")?.value.trim() || "";
      const progress =
        parseInt(document.getElementById("task-progress")?.value) || 0;
      const status =
        document.getElementById("task-status")?.value || "Đang thực hiện";
      const note = document.getElementById("task-note")?.value.trim() || "";

      if (!assignee) {
        Swal.fire(
          "Chưa chọn chủ trì",
          "Vui lòng chọn Đơn vị / Cá nhân chủ trì!",
          "warning",
        );
        return;
      }

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
        startDate: startDate,
        deadline: deadline,
        source: source,
        product: product,
        progress: progress,
        status: status,
        note: note,
        updatedAt: firebase.database.ServerValue.TIMESTAMP,
      };

      if (taskId) {
        // Đọc trạng thái cũ để chỉ ghi completedAt đúng lúc chuyển sang Đã hoàn thành.
        tasksRef
          .child(taskId)
          .once("value")
          .then((snapshot) => {
            const oldTask = snapshot.val() || {};
            const oldStatus = oldTask.status || "Đang thực hiện";

            if (status === "Đã hoàn thành") {
              if (oldStatus !== "Đã hoàn thành" || !oldTask.completedAt) {
                taskData.completedAt = firebase.database.ServerValue.TIMESTAMP;
              }
            } else if (oldStatus === "Đã hoàn thành" || oldTask.completedAt) {
              taskData.completedAt = null;
            }

            return tasksRef.child(taskId).update(taskData);
          })
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
        if (status === "Đã hoàn thành") {
          taskData.completedAt = firebase.database.ServerValue.TIMESTAMP;
        }
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
  }

  const btnResetTask = document.querySelector(".btn-reset-task-form");
  if (btnResetTask) btnResetTask.addEventListener("click", resetTaskForm);
}

function resetTaskForm() {
  const form = document.getElementById("form-task");
  if (form) form.reset();

  const hiddenInput = document.getElementById("task-id-hidden");
  if (hiddenInput) hiddenInput.value = "";

  const defaultRadio = document.querySelector(
    'input[name="filter-assignee-type"][value="ALL"]',
  );
  if (defaultRadio) {
    defaultRadio.checked = true;
    renderAssigneeDropdown();
  }
}

tasksRef.on("value", (snapshot) => {
  const tbody = document.getElementById("table-task-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!snapshot.exists()) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; color:#94a3b8;">Chưa có nhiệm vụ nào được tạo.</td></tr>`;
    return;
  }

  let index = 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  snapshot.forEach((child) => {
    const key = child.key;
    const task = child.val();

    let statusText = task.status || "Đang thực hiện";
    let badgeColor = "#0284c7";
    const deadlineDate = parseAdminTaskDateOnly(task.deadline);
    const diffDays = deadlineDate ? adminTaskDiffDays(today, deadlineDate) : null;

    if (task.status === "Đã hoàn thành") {
      badgeColor = "#16a34a";
      const completedDate = adminTaskTimestampToLocalDate(
        task.completedAt || task.updatedAt,
      );
      const overdueAtCompletion =
        deadlineDate && completedDate
          ? adminTaskDiffDays(deadlineDate, completedDate)
          : null;
      statusText =
        overdueAtCompletion !== null && overdueAtCompletion > 0
          ? `Đã hoàn thành (Quá hạn ${overdueAtCompletion} ngày)`
          : "Đã hoàn thành";
    } else if (task.status === "Chậm tiến độ") {
      badgeColor = "#dc2626";
      statusText =
        diffDays !== null && diffDays < 0
          ? `Quá hạn ${Math.abs(diffDays)} ngày`
          : "Chậm tiến độ";
    } else if (diffDays !== null) {
      if (diffDays < 0) {
        badgeColor = "#dc2626";
        statusText = `Quá hạn ${Math.abs(diffDays)} ngày`;
      } else if (diffDays <= 3) {
        badgeColor = "#ea580c";
        statusText = `Đang thực hiện (Còn ${diffDays} ngày)`;
      } else if (diffDays <= 7) {
        badgeColor = "#ca8a04";
        statusText = `Đang thực hiện (Còn ${diffDays} ngày)`;
      } else {
        badgeColor = "#0284c7";
        statusText = `Đang thực hiện (Còn ${diffDays} ngày)`;
      }
    }
    const cleanAssignee = (task.assignee || "—").replace(/^\[[^\]]+\]\s*/, "");
    const tr = document.createElement("tr");
    tr.innerHTML = `
<td style="text-align: center">${index++}</td>
  <td><b>${task.name || "—"}</b></td>
  <td><i class="fa-solid fa-user-check" style="color:#0284c7;"></i> ${cleanAssignee}</td>
      <td style="text-align: center">${task.startDate || "—"}</td>
      <td style="text-align: center">${task.deadline || "—"}</td>
      <td><span style="color:#475569; font-style:italic;">${task.source || "—"}</span></td>
      <td>${task.product || "—"}</td>
      <td style="text-align: center; font-weight: bold; color: ${badgeColor}">${task.progress || 0}%</td>
      <td style="text-align: center">
        <span style="background:${badgeColor}; color:#fff; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:bold; display:inline-block;">
          ${statusText}
        </span>
      </td>
      <td>${task.note || "—"}</td>
      <td style="text-align: center;">
        <button class="btn btn-primary" style="padding: 3px 6px; font-size: 11px;" onclick="editTask('${key}')">Sửa</button>
        <button class="btn btn-danger" style="padding: 3px 6px; font-size: 11px;" onclick="deleteTask('${key}')">Xóa</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
});

window.editTask = function (key) {
  tasksRef.child(key).once("value", (snapshot) => {
    if (snapshot.exists()) {
      const task = snapshot.val();
      if (document.getElementById("task-id-hidden"))
        document.getElementById("task-id-hidden").value = key;
      if (document.getElementById("task-name"))
        document.getElementById("task-name").value = task.name || "";

      const defaultRadio = document.querySelector(
        'input[name="filter-assignee-type"][value="ALL"]',
      );
      if (defaultRadio) {
        defaultRadio.checked = true;
        renderAssigneeDropdown();
      }

      const assigneeSelect =
        document.getElementById("task-assignee-select") ||
        document.getElementById("task-assignee");
      if (assigneeSelect) assigneeSelect.value = task.assignee || "";

      if (document.getElementById("task-start-date"))
        document.getElementById("task-start-date").value = task.startDate || "";
      if (document.getElementById("task-deadline"))
        document.getElementById("task-deadline").value = task.deadline || "";
      if (document.getElementById("task-source"))
        document.getElementById("task-source").value = task.source || "";
      if (document.getElementById("task-product"))
        document.getElementById("task-product").value = task.product || "";
      if (document.getElementById("task-progress"))
        document.getElementById("task-progress").value = task.progress || 0;
      if (document.getElementById("task-status"))
        document.getElementById("task-status").value =
          task.status || "Đang thực hiện";
      if (document.getElementById("task-note"))
        document.getElementById("task-note").value = task.note || "";

      document
        .getElementById("form-task")
        ?.scrollIntoView({ behavior: "smooth" });
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

// =================================================================
// 11. PHÂN HỆ QUẢN LÝ DANH SÁCH ĐẢNG BỘ (THÊM, SỬA, XÓA)
// =================================================================
dangBoRef.on("value", (snapshot) => {
  const tbody = document.getElementById("table-manage-dangbo-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!snapshot.exists()) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#94a3b8;">Chưa có Đảng bộ nào trong cơ sở dữ liệu.</td></tr>`;
    return;
  }

  let index = 1;
  snapshot.forEach((child) => {
    const key = child.key;
    const data = child.val();
    const ten = data.ten || "Chưa đặt tên";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="text-align: center;">${index++}</td>
      <td><code>${key}</code></td>
      <td><b>${ten}</b></td>
      <td style="text-align: center;">
        <button class="btn btn-primary" style="padding: 3px 6px; font-size: 11px; background-color: #9333ea;" onclick="editManageDangBo('${key}', '${ten}')">Sửa</button>
        <button class="btn btn-danger" style="padding: 3px 6px; font-size: 11px;" onclick="deleteManageDangBo('${key}', '${ten}')">Xóa</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
});

const formManageDangBo = document.getElementById("form-manage-dangbo");
if (formManageDangBo) {
  formManageDangBo.addEventListener("submit", (e) => {
    e.preventDefault();

    const hiddenKey = document.getElementById(
      "manage-dangbo-key-hidden",
    )?.value;
    const keyInput = document
      .getElementById("manage-dangbo-key")
      ?.value.trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
    const nameInput = document
      .getElementById("manage-dangbo-name")
      ?.value.trim();

    if (!keyInput || !nameInput) {
      Swal.fire({
        icon: "warning",
        title: "Thiếu thông tin",
        text: "Vui lòng nhập đầy đủ Mã và Tên Đảng bộ!",
      });
      return;
    }

    if (hiddenKey) {
      dangBoRef
        .child(hiddenKey)
        .update({ ten: nameInput })
        .then(() => {
          Swal.fire({
            icon: "success",
            title: "Cập nhật thành công",
            text: `Đã đổi tên Đảng bộ thành "${nameInput}"`,
            timer: 1500,
            showConfirmButton: false,
          });
          resetManageDangBoForm();
          initAdminData();
        });
    } else {
      dangBoRef.child(keyInput).once("value", (snap) => {
        if (snap.exists()) {
          Swal.fire({
            icon: "error",
            title: "Mã bị trùng",
            text: `Mã Đảng bộ "${keyInput}" đã tồn tại trên hệ thống!`,
          });
        } else {
          dangBoRef
            .child(keyInput)
            .set({ ten: nameInput })
            .then(() => {
              Swal.fire({
                icon: "success",
                title: "Thêm thành công",
                text: `Đã thêm Đảng bộ "${nameInput}"`,
                timer: 1500,
                showConfirmButton: false,
              });
              resetManageDangBoForm();
              initAdminData();
            });
        }
      });
    }
  });
}

const btnResetDangBo = document.getElementById("btn-reset-dangbo-form");
if (btnResetDangBo) {
  btnResetDangBo.addEventListener("click", resetManageDangBoForm);
}

function resetManageDangBoForm() {
  if (formManageDangBo) formManageDangBo.reset();
  const hiddenKey = document.getElementById("manage-dangbo-key-hidden");
  const keyInput = document.getElementById("manage-dangbo-key");
  if (hiddenKey) hiddenKey.value = "";
  if (keyInput) keyInput.disabled = false;
}

window.editManageDangBo = function (key, ten) {
  if (document.getElementById("manage-dangbo-key-hidden"))
    document.getElementById("manage-dangbo-key-hidden").value = key;
  if (document.getElementById("manage-dangbo-key")) {
    document.getElementById("manage-dangbo-key").value = key;
    document.getElementById("manage-dangbo-key").disabled = true;
  }
  if (document.getElementById("manage-dangbo-name"))
    document.getElementById("manage-dangbo-name").value = ten;
  document
    .getElementById("form-manage-dangbo")
    ?.scrollIntoView({ behavior: "smooth" });
};

window.deleteManageDangBo = function (key, ten) {
  Swal.fire({
    title: `Xác nhận xóa "${ten}"?`,
    text: "Tất cả số liệu liên quan của Đảng bộ này sẽ bị xóa vĩnh viễn!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#dc2626",
    confirmButtonText: "Xóa ngay",
    cancelButtonText: "Hủy",
  }).then((res) => {
    if (res.isConfirmed) {
      dangBoRef
        .child(key)
        .remove()
        .then(() => {
          Swal.fire({
            icon: "success",
            title: "Đã xóa",
            text: `Đã xóa thành công ${ten}`,
            timer: 1500,
            showConfirmButton: false,
          });
          initAdminData();
        });
    }
  });
};

// =================================================================
// 12. XỬ LÝ IMPORT / EXCEL CHO ĐẢNG BỘ VÀ KẾT NẠP
// =================================================================
function initExcelImportExport() {
  const btnExportDangBo = document.getElementById("btn-export-dangbo-excel");
  if (btnExportDangBo) {
    btnExportDangBo.addEventListener("click", () => {
      dangBoRef.once("value", (snapshot) => {
        if (!snapshot.exists()) {
          Swal.fire("Thông báo", "Chưa có dữ liệu Đảng bộ để xuất!", "warning");
          return;
        }

        const excelData = [["STT", "Mã đảng bộ", "Tên đảng bộ"]];
        let stt = 1;

        snapshot.forEach((child) => {
          excelData.push([stt++, child.key, child.val().ten || ""]);
        });

        const worksheet = XLSX.utils.aoa_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "DanhSachDangBo");

        worksheet["!cols"] = [{ wch: 8 }, { wch: 20 }, { wch: 40 }];

        XLSX.writeFile(workbook, "Danh_sach_Dang_bo.xlsx");
      });
    });
  }

  const excelImportInput = document.getElementById("excel-import-input");
  if (excelImportInput) {
    excelImportInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function (evt) {
        try {
          const data = new Uint8Array(evt.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          let updatePromises = [];
          let successCount = 0;

          const parseNum = (val) => {
            const n = Number(val);
            return isNaN(n) ? 0 : Math.max(0, Math.round(n));
          };

          for (let i = 7; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length < 2) continue;

            const maDB = row[1] ? String(row[1]).trim() : "";
            if (
              !maDB ||
              maDB === "Mã ĐB" ||
              maDB === "TT" ||
              maDB.toLowerCase() === "tổng cộng"
            )
              continue;

            const updateData = {
              tongDangVien: parseNum(row[3]),
              chiTieuKetNap: parseNum(row[4]),
              daKetNap: parseNum(row[5]),
              tongHSSV: parseNum(row[7]),
              hocSinh: parseNum(row[8]),
              sinhVien: parseNum(row[9]),
              tongDN: parseNum(row[10]),
              dnNhaNuoc: parseNum(row[11]),
              dnNgoaiNN: parseNum(row[12]),
              nldKdc: parseNum(row[13]),
              htx: parseNum(row[14]),
              dtts: parseNum(row[15]),
              updatedAt: firebase.database.ServerValue.TIMESTAMP,
            };

            const p = dangBoRef
              .child(maDB)
              .update(updateData)
              .then(() => {
                successCount++;
              });

            updatePromises.push(p);
          }

          Promise.all(updatePromises).then(() => {
            Swal.fire({
              icon: "success",
              title: "Nhập dữ liệu thành công!",
              text: `Đã cập nhật dữ liệu Kết nạp cho ${successCount} Đảng bộ theo Mã ĐB.`,
            });
            excelImportInput.value = "";
          });
        } catch (error) {
          console.error(error);
          Swal.fire(
            "Lỗi",
            "Không thể đọc file Excel. Vui lòng kiểm tra lại cấu trúc file!",
            "error",
          );
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }
}

// =================================================================
// 13. LẮNG NGHE & CẤU HÌNH THỜI GIAN NHẬP LIỆU SỐ HÓA
// =================================================================
function initTimeConfigEvents() {
  configRef.on("value", (snapshot) => {
    const statusDiv = document.getElementById("time-config-status");
    const userNoticeDiv = document.getElementById("user-time-notice");

    if (!snapshot.exists()) {
      if (statusDiv)
        statusDiv.innerHTML = `<span style="color: #dc2626;"><i class="fa-solid fa-circle-exclamation"></i> Chưa thiết lập khung thời gian nhập liệu.</span>`;
      if (userNoticeDiv) {
        userNoticeDiv.style.display = "block";
        userNoticeDiv.style.background = "#fef2f2";
        userNoticeDiv.style.border = "1px solid #fca5a5";
        userNoticeDiv.style.color = "#991b1b";
        userNoticeDiv.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <b>Thông báo:</b> Hệ thống chưa thiết lập khung thời gian nhập liệu.`;
      }
      return;
    }

    const data = snapshot.val();
    const startStr = data.startTime
      ? new Date(data.startTime).toLocaleString("vi-VN")
      : "—";
    const endStr = data.endTime
      ? new Date(data.endTime).toLocaleString("vi-VN")
      : "—";

    if (document.getElementById("config-time-start")) {
      document.getElementById("config-time-start").value = data.startTime || "";
    }
    if (document.getElementById("config-time-end")) {
      document.getElementById("config-time-end").value = data.endTime || "";
    }

    const now = new Date().getTime();
    const start = new Date(data.startTime).getTime();
    const end = new Date(data.endTime).getTime();

    const isOpening = now >= start && now <= end;

    // 1. Cập nhật trạng thái hiển thị cho Admin
    if (isOpening) {
      if (statusDiv)
        statusDiv.innerHTML = `<span style="color: #16a34a;"><i class="fa-solid fa-lock-open"></i> Hệ thống ĐANG MỞ nhập liệu từ <b>${startStr}</b> đến <b>${endStr}</b>.</span>`;
    } else {
      if (statusDiv)
        statusDiv.innerHTML = `<span style="color: #dc2626;"><i class="fa-solid fa-lock"></i> Hệ thống ĐÃ KHÓA nhập liệu. Khung giờ cho phép: từ <b>${startStr}</b> đến <b>${endStr}</b>.</span>`;
    }

    // 2. Cập nhật thanh thông báo cho Cán bộ Nhập liệu
    if (userNoticeDiv) {
      userNoticeDiv.style.display = "block";
      if (isOpening) {
        userNoticeDiv.style.background = "#f0fdf4";
        userNoticeDiv.style.border = "1px solid #86efac";
        userNoticeDiv.style.color = "#166534";
        userNoticeDiv.innerHTML = `<i class="fa-solid fa-clock"></i> <b>Khung thời gian cho phép nhập liệu:</b> Từ <b style="color: #15803d;">${startStr}</b> đến <b style="color: #15803d;">${endStr}</b> (Hệ thống đang MỞ).`;
      } else {
        userNoticeDiv.style.background = "#fef2f2";
        userNoticeDiv.style.border = "1px solid #fca5a5";
        userNoticeDiv.style.color = "#991b1b";
        userNoticeDiv.innerHTML = `<i class="fa-solid fa-lock"></i> <b>Khung thời gian cho phép nhập liệu:</b> Từ <b>${startStr}</b> đến <b>${endStr}</b> <span style="color: #dc2626; font-weight: bold;">(Hệ thống đang KHÓA)</span>.`;
      }
    }
  });

  const formTimeConfig = document.getElementById("form-time-config");
  if (formTimeConfig) {
    formTimeConfig.addEventListener("submit", (e) => {
      e.preventDefault();
      const startTime = document.getElementById("config-time-start").value;
      const endTime = document.getElementById("config-time-end").value;

      if (new Date(startTime).getTime() >= new Date(endTime).getTime()) {
        Swal.fire(
          "Lỗi thời gian",
          "Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc!",
          "error",
        );
        return;
      }

      configRef
        .set({
          startTime: startTime,
          endTime: endTime,
          updatedAt: firebase.database.ServerValue.TIMESTAMP,
        })
        .then(() => {
          Swal.fire(
            "Thành công",
            "Đã cập nhật khung thời gian nhập liệu Số hóa hồ sơ!",
            "success",
          );
        })
        .catch((error) => {
          console.error("Lỗi ghi dữ liệu config:", error);
          Swal.fire("Lỗi", "Không thể lưu cài đặt: " + error.message, "error");
        });
    });
  }
}

// Hàm bổ trợ kiểm tra xem thời gian hiện tại có nằm trong thời gian nhập liệu hay không
async function isImportTimeAllowed() {
  if (currentRole === "admin") return true; // Admin không bị giới hạn

  const snapshot = await configRef.once("value");
  if (!snapshot.exists()) return false;

  const data = snapshot.val();
  if (!data.startTime || !data.endTime) return false;

  const now = new Date().getTime();
  const start = new Date(data.startTime).getTime();
  const end = new Date(data.endTime).getTime();

  return now >= start && now <= end;
}
