// Tham chiếu Realtime Database các nhánh
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

// 1. KHỞI TẠO DỮ LIỆU & GÁN SỰ KIỆN KHI TRANG TẢI XONG
document.addEventListener("DOMContentLoaded", () => {
  initAdminTabs();
  initTcSubTabs(); // Khởi tạo tab con trong Phân hệ 2
  initAdminData();
  setupDropdownChangeEvents();
  initKetNapEvents(); // Khởi tạo xử lý Kết nạp Đảng viên
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

// 2.1 CHUYỂN ĐỔI TAB CON TRONG PHÂN HỆ 2 (SỐ LIỆU CHUNG & KẾT NẠP)
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

// 3. THEO DÕI PHIÊN ĐĂNG NHẬP
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

    // Kích hoạt ô tìm kiếm gõ từ khóa cho cả 3 Dropdown nhập liệu
    enableSelect2Search();

    loadProgressTables();
  });
}

// Hàm khởi tạo tìm kiếm cho Dropdown
// Hàm khởi tạo tìm kiếm cho Dropdown (có bắt lỗi an toàn)
function enableSelect2Search() {
  // Kiểm tra xem jQuery và Select2 đã sẵn sàng chưa
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

// 6. XỬ LÝ LƯU DỮ LIỆU - PHÂN HỆ 1: SỐ HÓA HỒ SƠ
const formSoHoa = document.getElementById("form-sohoa");
if (formSoHoa) {
  formSoHoa.addEventListener("submit", (e) => {
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

// 7.1 XỬ LÝ LƯU & CẬP NHẬT TAB CON: KẾT NẠP ĐẢNG VIÊN
// =================================================================
// 7.1 TỰ ĐỘNG TÍNH TOÁN REALTIME & XỬ LÝ KẾT NẠP ĐẢNG VIÊN
// =================================================================
function initKetNapEvents() {
  const formKetNap = document.getElementById("form-ketnap");
  const selectKetNap = document.getElementById("select-dangbo-ketnap");

  // 1. Tự động tính Tỷ lệ %
  function calcTyLe() {
    const chiTieu =
      parseFloat(document.getElementById("ketnap-chi-tieu").value) || 0;
    const tongSo =
      parseFloat(document.getElementById("ketnap-tong-so").value) || 0;
    const tyLeInput = document.getElementById("ketnap-ty-le");

    if (chiTieu > 0) {
      const pct = ((tongSo / chiTieu) * 100).toFixed(2);
      tyLeInput.value = pct + "%";
    } else {
      tyLeInput.value = "0.00%";
    }
  }

  // 2. Tự động tính Tổng HSSV
  function calcHSSV() {
    const hocSinh =
      parseInt(document.getElementById("ketnap-hoc-sinh").value) || 0;
    const sinhVien =
      parseInt(document.getElementById("ketnap-sinh-vien").value) || 0;
    document.getElementById("ketnap-tong-hssv").value = hocSinh + sinhVien;
  }

  // 3. Tự động tính Tổng ĐV Doanh nghiệp
  function calcDN() {
    const dnNhaNuoc =
      parseInt(document.getElementById("ketnap-dn-nha-nuoc").value) || 0;
    const dnNgoaiNN =
      parseInt(document.getElementById("ketnap-dn-ngoai-nn").value) || 0;
    const nldKdc =
      parseInt(document.getElementById("ketnap-nld-kdc").value) || 0;
    const htx = parseInt(document.getElementById("ketnap-htx").value) || 0;

    document.getElementById("ketnap-tong-dn").value =
      dnNhaNuoc + dnNgoaiNN + nldKdc + htx;
  }

  // Bắt sự kiện gõ phím 'input' để tự động tính toán tức thì
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

  // Load số liệu cũ khi chọn Đơn vị từ Dropdown
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
          document.getElementById("ketnap-chi-tieu").value =
            d.chiTieuKetNap || 0;
          document.getElementById("ketnap-tong-so").value = d.daKetNap || 0;
          document.getElementById("ketnap-hoc-sinh").value = d.hocSinh || 0;
          document.getElementById("ketnap-sinh-vien").value = d.sinhVien || 0;
          document.getElementById("ketnap-dn-nha-nuoc").value =
            d.dnNhaNuoc || 0;
          document.getElementById("ketnap-dn-ngoai-nn").value =
            d.dnNgoaiNN || 0;
          document.getElementById("ketnap-nld-kdc").value = d.nldKdc || 0;
          document.getElementById("ketnap-htx").value = d.htx || 0;
          document.getElementById("ketnap-dtts").value = d.dtts || 0;
          document.getElementById("ketnap-ton-giao").value = d.tonGiao || 0;

          // Chạy lại các hàm tính toán tự động
          calcTyLe();
          calcHSSV();
          calcDN();
        }
      });
    });
  }

  // Xử lý Submit Form Lưu thông tin đầy đủ các trường
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
          parseInt(document.getElementById("ketnap-chi-tieu").value) || 0,
        daKetNap:
          parseInt(document.getElementById("ketnap-tong-so").value) || 0,
        hocSinh:
          parseInt(document.getElementById("ketnap-hoc-sinh").value) || 0,
        sinhVien:
          parseInt(document.getElementById("ketnap-sinh-vien").value) || 0,
        tongHSSV:
          parseInt(document.getElementById("ketnap-tong-hssv").value) || 0,
        dnNhaNuoc:
          parseInt(document.getElementById("ketnap-dn-nha-nuoc").value) || 0,
        dnNgoaiNN:
          parseInt(document.getElementById("ketnap-dn-ngoai-nn").value) || 0,
        nldKdc: parseInt(document.getElementById("ketnap-nld-kdc").value) || 0,
        htx: parseInt(document.getElementById("ketnap-htx").value) || 0,
        tongDN: parseInt(document.getElementById("ketnap-tong-dn").value) || 0,
        dtts: parseInt(document.getElementById("ketnap-dtts").value) || 0,
        tonGiao:
          parseInt(document.getElementById("ketnap-ton-giao").value) || 0,
      };

      dangBoRef
        .child(id)
        .update(saveData)
        .then(() => {
          Swal.fire({
            icon: "success",
            title: "Đã lưu thành công",
            text: `Đã cập nhật chi tiết số liệu kết nạp cho ${dangBoCache[id]}.`,
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
    e.target.closest("form").reset();
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

      // Bảng Số hóa
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

      // Bảng Tổ chức đảng & Đảng viên
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

      // Bảng Kết nạp Đảng viên
      // Bảng Kết nạp Đảng viên (Thay thế khối tr3 cũ bằng khối này)
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
          <td style="text-align: right">${Number(data.tonGiao || 0).toLocaleString()}</td>
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
  document.getElementById("sohoa-can-so-hoa").value = canSoHoa;
  document.getElementById("sohoa-chinh-ly").value = chinhLy;
  document.getElementById("sohoa-ky-so").value = kySo;
  document.getElementById("sohoa-phan-mem").value = phanMem;
  document.getElementById("form-sohoa").scrollIntoView({ behavior: "smooth" });
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

window.editKetNapFull = function (id) {
  $("#select-dangbo-ketnap").val(id).trigger("change");
  document.getElementById("form-ketnap").scrollIntoView({ behavior: "smooth" });
};

// =================================================================
// 9. PHÂN HỆ 3: QUẢN LÝ NỘI BỘ - TIẾN ĐỘ NHIỆM VỤ (XỬ LÝ REALTIME)
// =================================================================
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

// Tải danh sách Nhiệm vụ lên bảng Realtime
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
