// Tham chiếu Realtime Database các nhánh
const dangBoRef = database.ref("dang_bo");
const tasksRef = database.ref("tasks");
const configRef = database.ref("config/time_settings");

// Khai báo DOM Elements
const loginSection = document.getElementById("login-section");
const adminSection = document.getElementById("admin-section");
const btnLogin = document.getElementById("btn-login");
const btnLogout = document.getElementById("btn-logout");
const adminUserInfo = document.getElementById("admin-user-info");

// Biến toàn cục
let dangBoCache = {};
let currentRole = "nhap_lieu"; // Mặc định vai trò

// 1. KHỞI TẠO DỮ LIỆU & GÁN SỰ KIỆN KHI TRANG TẢI XONG
document.addEventListener("DOMContentLoaded", () => {
  initAdminTabs();
  initTcSubTabs(); // Khởi tạo tab con trong Phân hệ 2
  initAdminData();
  setupDropdownChangeEvents();
  initKetNapEvents(); // Khởi tạo xử lý Kết nạp Đảng viên
  initAuthEvents(); // Khởi tạo sự kiện Đăng nhập / Đăng xuất an toàn
  initExcelImportExport(); // Khởi tạo sự kiện Import / Export Excel
  initTimeConfigEvents(); // Lắng nghe & cài đặt khung giờ
});

// 2. CHUYỂN ĐỔI TAB GIỮA CÁC PHÂN HỆ QUẢN TRỊ CHÍNH
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

// 3. THEO DÕI PHIÊN ĐĂNG NHẬP VÀ PHÂN QUYỀN GIAO DIỆN
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    if (loginSection) loginSection.style.display = "none";
    if (adminSection) adminSection.style.display = "block";

    // Đọc role của tài khoản đang đăng nhập từ Firebase
    database.ref("users/" + user.uid).once("value", (snapshot) => {
      const userData = snapshot.val();
      const role = userData ? userData.role : "nhap_lieu";

      const roleText =
        role === "admin"
          ? "Quản trị viên (Admin)"
          : "Cán bộ Nhập liệu (Số hóa)";
      if (adminUserInfo) {
        adminUserInfo.innerHTML = `<i class="fa-solid fa-circle-user" style="color: #2ecc71;"></i> Tài khoản: <b>${user.email}</b> [${roleText}]`;
      }

      applyRolePermissions(role);
    });
  } else {
    if (loginSection) loginSection.style.display = "block";
    if (adminSection) adminSection.style.display = "none";
  }
});

function applyRolePermissions(role) {
  currentRole = role; // Lưu vai trò vào biến toàn cục

  const btnSoHoa = document.querySelector('[data-admin-tab="admin-tab-sohoa"]');
  const btnTcDang = document.querySelector(
    '[data-admin-tab="admin-tab-tcdang"]',
  );
  const btnNoiBo = document.querySelector('[data-admin-tab="admin-tab-noibo"]');
  const timeConfigSection = document.getElementById(
    "admin-time-config-section",
  );

  if (role === "admin") {
    if (btnSoHoa) btnSoHoa.style.display = "inline-flex";
    if (btnTcDang) btnTcDang.style.display = "inline-flex";
    if (btnNoiBo) btnNoiBo.style.display = "inline-flex";
    if (timeConfigSection) timeConfigSection.style.display = "block";
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

// 4. NẠP DANH SÁCH ĐẢNG BỘ VÀO DROPDOWN VÀ BẬT TÌM KIẾM
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

  dangBoRef.once("value", (snapshot) => {
    snapshot.forEach((child) => {
      const key = child.key;
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

// 5. TỰ ĐỘNG FILL DỮ LIỆU CỦA ĐƠN VỊ ĐÃ LƯU KHI CHỌN TỪ DROPDOWN
function setupDropdownChangeEvents() {
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
          document.getElementById("tc-so-tccs-dang").value =
            data.soTccsDang || 0;
          document.getElementById("tc-so-chi-bo").value = data.soChiBo || 0;
          document.getElementById("tc-tong-dang-vien").value =
            data.tongDangVien || 0;
          document.getElementById("tc-dang-vien-chinh-thuc").value =
            data.dvChinhThuc || 0;
          document.getElementById("tc-dang-vien-du-bi").value =
            data.dvDuBi || 0;

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

// 6. XỬ LÝ LƯU DỮ LIỆU - PHÂN HỆ 1: SỐ HÓA HỒ SƠ (CÓ KIỂM TRA THỜI GIAN NHẬP LIỆU)
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

    if (canSoHoa < 0 || chinhLy < 0 || kySo < 0 || phanMem < 0) {
      Swal.fire({
        icon: "error",
        title: "Lỗi",
        text: "Số liệu nhập vào phải lớn hơn hoặc bằng 0!",
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

// 7. XỬ LÝ LƯU DỮ LIỆU - PHÂN HỆ 2: TỔ CHỨC ĐẢNG & ĐẢNG VIÊN
const formTcDang = document.getElementById("form-tcdang");
if (formTcDang) {
  formTcDang.addEventListener("submit", (e) => {
    e.preventDefault();

    const id = document.getElementById("select-dangbo-tcdang").value;
    const soTccsDang =
      parseInt(document.getElementById("tc-so-tccs-dang").value) || 0;
    const soChiBo =
      parseInt(document.getElementById("tc-so-chi-bo").value) || 0;
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

// 7.1 XỬ LÝ KẾT NẠP ĐẢNG VIÊN (TỰ ĐỘNG TÍNH TOÁN & LƯU FORM)
function initKetNapEvents() {
  const formKetNap = document.getElementById("form-ketnap");
  const selectKetNap = document.getElementById("select-dangbo-ketnap");

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

  if (selectKetNap) {
    selectKetNap.addEventListener("change", (e) => {
      const id = e.target.value;
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
    });
  }

  if (formKetNap) {
    formKetNap.addEventListener("submit", (e) => {
      e.preventDefault();

      const id = selectKetNap.value;
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

// 8. ĐỌC REALTIME & NẠP SỐ LIỆU VÀO TẤT CẢ CÁC BẢNG (SỐ HÓA, TCĐ, KẾT NẠP)
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
window.editSoHoa = function (id, canSoHoa, chinhLy, kySo, phanMem) {
  $("#select-dangbo-sohoa").val(id).trigger("change");
  if (document.getElementById("sohoa-can-so-hoa"))
    document.getElementById("sohoa-can-so-hoa").value = canSoHoa;
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
  document
    .getElementById("form-ketnap")
    ?.scrollIntoView({ behavior: "smooth" });
};

// 9. PHÂN HỆ 3: QUẢN LÝ NỘI BỘ - TIẾN ĐỘ NHIỆM VỤ
const formTask = document.getElementById("form-task");
if (formTask) {
  formTask.addEventListener("submit", (e) => {
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

function resetTaskForm() {
  const form = document.getElementById("form-task");
  if (form) form.reset();
  const hiddenInput = document.getElementById("task-id-hidden");
  if (hiddenInput) hiddenInput.value = "";
}

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

// 10. PHÂN HỆ QUẢN LÝ DANH SÁCH ĐẢNG BỘ (THÊM, SỬA, XÓA)
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

    const hiddenKey = document.getElementById("manage-dangbo-key-hidden").value;
    const keyInput = document
      .getElementById("manage-dangbo-key")
      .value.trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
    const nameInput = document
      .getElementById("manage-dangbo-name")
      .value.trim();

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
  document.getElementById("manage-dangbo-key-hidden").value = key;
  document.getElementById("manage-dangbo-key").value = key;
  document.getElementById("manage-dangbo-key").disabled = true;
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

// 11. XỬ LÝ IMPORT / EXCEL CHO ĐẢNG BỘ VÀ KẾT NẠP
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

// 12. LẮNG NGHE & CẤU HÌNH THỜI GIAN NHẬP LIỆU SỐ HÓA
// 12. LẮNG NGHE & CẤU HÌNH THỜI GIAN NHẬP LIỆU SỐ HÓA
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

    // 2. Cập nhật thanh thông báo cho Cán bộ Nhập liệu (Đảng bộ)
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
