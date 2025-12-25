// Dán link Web App bạn copy ở bước 1 vào giữa dấu ngoặc kép bên dưới
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwrD-3TxHnz3h2UEOYVywd_XgwMmi-YTcLSYLP97bfANr3t4QaiQYXKMkLd30fXKEkS/exec";


// --- CÁC BIẾN TOÀN CỤC ---
let currentMode = '';           // Trạng thái hiện tại: 'add' (thêm) hoặc 'edit' (sửa)
let editingDonViOriginal = '';  // Lưu tên đơn vị gốc khi đang sửa (để tìm trong sheet)
let cachedDataList = [];        // Lưu dữ liệu tải về để phục vụ tìm kiếm nhanh & kiểm tra trùng

// --- ÁNH XẠ CÁC PHẦN TỬ HTML (DOM) ---
const dom = {
    donVi: document.getElementById('donVi'),
    soLuong: document.getElementById('soLuong'),
    btnAddNew: document.getElementById('btnAddNew'),
    btnSave: document.getElementById('btnSave'),
    btnCancel: document.getElementById('btnCancel'),
    btnShowMissing: document.getElementById('btnShowMissing'), // Nút xem chưa báo cáo
    searchBox: document.getElementById('searchBox'),
    form: document.getElementById('dataForm'),
    tableBody: document.getElementById('dataTable'),
    totalDisplay: document.getElementById('totalValue')
};

// --- KHỞI TẠO KHI TẢI TRANG ---
document.addEventListener('DOMContentLoaded', () => {
    fetchUnits(); // Tải danh sách đơn vị vào dropdown
    fetchData();  // Tải dữ liệu bảng tổng hợp
});

// ============================================================
// PHẦN 1: XỬ LÝ SỰ KIỆN (EVENTS)
// ============================================================

// 1. Sự kiện nhấn nút THÊM MỚI
dom.btnAddNew.addEventListener('click', () => {
    resetForm();
    toggleInputs(true); // Mở khóa ô nhập liệu
    
    // Điều khiển trạng thái nút
    dom.btnAddNew.disabled = true; 
    dom.btnSave.disabled = false;
    dom.btnCancel.style.display = 'inline-block';
    
    currentMode = 'add';
    dom.donVi.focus();
});

// 2. Sự kiện nhấn nút HỦY
dom.btnCancel.addEventListener('click', () => {
    resetForm();
    toggleInputs(false); // Khóa lại
    
    // Điều khiển trạng thái nút
    dom.btnAddNew.disabled = false;
    dom.btnSave.disabled = true;
    dom.btnCancel.style.display = 'none';
    
    currentMode = '';
});

// 3. Sự kiện nhấn nút LƯU (SUBMIT FORM)
dom.form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const donViVal = dom.donVi.value;
    const soLuongVal = dom.soLuong.value;

    if(!donViVal) { 
        Swal.fire('Lỗi', 'Vui lòng chọn đơn vị!', 'error'); 
        return; 
    }

    // --- KIỂM TRA TRÙNG LẶP ---
    // Chỉ kiểm tra khi 'add' HOẶC 'edit' mà người dùng đổi tên đơn vị sang tên khác
    if (currentMode === 'add' || (currentMode === 'edit' && donViVal !== editingDonViOriginal)) {
        // Kiểm tra xem đơn vị này đã có trong danh sách đã tải về chưa
        const isDuplicate = cachedDataList.some(item => item[1] === donViVal); 
        
        if (isDuplicate) {
            Swal.fire({
                title: 'Dữ liệu đã tồn tại!',
                text: `Đơn vị "${donViVal}" đã có trong danh sách. Bạn có muốn ghi đè số liệu mới không?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Đồng ý ghi đè',
                cancelButtonText: 'Hủy bỏ'
            }).then((result) => {
                if (result.isConfirmed) {
                    // Nếu đồng ý ghi đè, gọi hàm submit với mode 'edit'
                    submitData('edit', donViVal, soLuongVal, donViVal);
                }
            });
            return; // Dừng lại chờ người dùng chọn
        }
    }

    // Nếu không trùng, hoặc đang sửa chính nó -> Gửi dữ liệu đi
    submitData(currentMode, donViVal, soLuongVal, editingDonViOriginal);
});

// 4. Sự kiện nhấn nút TÌM ĐƠN VỊ CHƯA BÁO CÁO
dom.btnShowMissing.addEventListener('click', () => {
    const originalText = dom.btnShowMissing.innerHTML;
    dom.btnShowMissing.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Đang tải...';
    dom.btnShowMissing.disabled = true;

    fetch(SCRIPT_URL + "?action=getMissing")
        .then(res => res.json())
        .then(data => {
            dom.btnShowMissing.innerHTML = originalText;
            dom.btnShowMissing.disabled = false;

            if (data.length === 0) {
                Swal.fire('Tuyệt vời!', 'Tất cả các đơn vị đã báo cáo đầy đủ!', 'success');
            } else {
                // Tạo danh sách HTML để hiển thị trong popup
                let listHtml = '<div style="text-align: left; max-height: 300px; overflow-y: auto; border: 1px solid #eee; padding: 10px;"><ul style="list-style-type: decimal; padding-left: 20px;">';
                data.forEach(unit => {
                    listHtml += `<li style="margin-bottom: 5px;">${unit}</li>`;
                });
                listHtml += '</ul></div>';
                
                Swal.fire({
                    title: `Có ${data.length} đơn vị chưa nhập`,
                    html: listHtml,
                    icon: 'info',
                    confirmButtonText: 'Đóng'
                });
            }
        })
        .catch(err => {
            dom.btnShowMissing.innerHTML = originalText;
            dom.btnShowMissing.disabled = false;
            Swal.fire('Lỗi', 'Không thể lấy danh sách. Vui lòng thử lại!', 'error');
            console.error(err);
        });
});

// 5. Sự kiện TÌM KIẾM NHANH (Search Box)
dom.searchBox.addEventListener('keyup', function() {
    const term = this.value.toLowerCase();
    // Lọc dữ liệu từ biến cachedDataList
    const filtered = cachedDataList.filter(row => 
        row[1].toLowerCase().includes(term)
    );
    renderTable(filtered);
});

// ============================================================
// PHẦN 2: CÁC HÀM XỬ LÝ LOGIC (FUNCTIONS)
// ============================================================

/**
 * Hàm gửi dữ liệu lên Google Sheet (Thêm hoặc Sửa)
 */
function submitData(mode, donVi, soLuong, oldDonVi) {
    const originalBtnText = dom.btnSave.innerHTML;
    dom.btnSave.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Đang lưu...';
    dom.btnSave.disabled = true;
    dom.btnCancel.disabled = true;

    // Sử dụng fetch post cors mode (Google script cần return ContentService)
    fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
            action: mode,
            donVi: donVi,
            soLuong: soLuong,
            oldDonVi: oldDonVi
        })
    })
    .then(res => res.json()) // Đọc phản hồi JSON từ server
    .then(response => {
        if (response.result === "success") {
            Swal.fire({
                title: 'Thành công!',
                text: response.msg || 'Dữ liệu đã được lưu.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });

            // Reset form về trạng thái ban đầu
            resetForm();
            toggleInputs(false);
            dom.btnSave.innerHTML = '<i class="fa fa-save"></i> Lưu thông tin';
            dom.btnSave.disabled = true;
            dom.btnCancel.style.display = 'none';
            dom.btnAddNew.disabled = false;
            dom.btnCancel.disabled = false;

            fetchData(); // Tải lại bảng dữ liệu mới nhất
        } else {
            throw new Error(response.msg);
        }
    })
    .catch(err => {
        Swal.fire('Lỗi', 'Có lỗi xảy ra: ' + err.message, 'error');
        dom.btnSave.innerHTML = originalBtnText;
        dom.btnSave.disabled = false;
        dom.btnCancel.disabled = false;
    });
}

/**
 * Hàm xóa dữ liệu
 */
window.deleteItem = function(tenDonVi) {
    Swal.fire({
        title: 'Xác nhận xóa?',
        text: `Bạn có chắc chắn muốn xóa dữ liệu của: ${tenDonVi}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Xóa ngay',
        cancelButtonText: 'Hủy'
    }).then((result) => {
        if (result.isConfirmed) {
            // Hiển thị loading
            Swal.fire({title: 'Đang xóa...', allowOutsideClick: false, didOpen: () => Swal.showLoading()});

            fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'delete', donVi: tenDonVi })
            })
            .then(res => res.json())
            .then(response => {
                if (response.result === "success") {
                    Swal.fire('Đã xóa!', 'Dữ liệu đã được xóa thành công.', 'success');
                    fetchData();
                } else {
                    Swal.fire('Lỗi', response.msg, 'error');
                }
            })
            .catch(err => {
                Swal.fire('Lỗi', 'Không thể kết nối tới máy chủ', 'error');
            });
        }
    });
};

/**
 * Hàm bắt đầu chế độ Sửa (được gọi từ nút Sửa trên bảng)
 */
window.startEdit = function(tenDonVi, soLuong) {
    toggleInputs(true);
    
    // Logic nút bấm: Giống như Thêm mới
    dom.btnAddNew.disabled = true;
    dom.btnSave.disabled = false;
    dom.btnCancel.style.display = 'inline-block';

    // Điền dữ liệu cũ vào form
    dom.donVi.value = tenDonVi;
    dom.soLuong.value = soLuong;

    // Thiết lập trạng thái
    currentMode = 'edit';
    editingDonViOriginal = tenDonVi;

    // Cuộn màn hình lên đầu
    document.querySelector('.container').scrollIntoView({ behavior: 'smooth' });
};

/**
 * Hàm tải danh sách đơn vị để đổ vào Dropdown
 */
function fetchUnits() {
    fetch(SCRIPT_URL + "?action=getUnits")
        .then(res => res.json())
        .then(data => {
            dom.donVi.innerHTML = '<option value="">-- Chọn đơn vị --</option>';
            data.forEach(item => {
                let op = document.createElement('option');
                op.value = item[0]; // Cột đầu tiên là Tên đơn vị
                op.text = item[0];
                dom.donVi.add(op);
            });
        })
        .catch(err => console.error("Lỗi tải danh sách đơn vị:", err));
}

/**
 * Hàm tải dữ liệu bảng tổng hợp
 */
function fetchData() {
    dom.tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center"><i class="fa fa-spinner fa-spin"></i> Đang tải dữ liệu...</td></tr>';
    
    fetch(SCRIPT_URL + "?action=getData")
        .then(res => res.json())
        .then(data => {
            cachedDataList = data; // Lưu vào biến toàn cục
            renderTable(data);     // Vẽ bảng
        })
        .catch(err => {
            console.error(err);
            dom.tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red;">Lỗi tải dữ liệu</td></tr>';
        });
}

/**
 * Hàm vẽ bảng dữ liệu ra HTML
 */
function renderTable(data) {
    dom.tableBody.innerHTML = '';
    let total = 0;

    if (!data || data.length === 0) {
        dom.tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center">Chưa có dữ liệu</td></tr>';
        dom.totalDisplay.textContent = 0;
        return;
    }

    data.forEach(row => {
        const stt = row[0];
        const dv = row[1];
        const sl = parseInt(row[2]) || 0;
        total += sl;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${stt}</td>
            <td>${dv}</td>
            <td>${sl}</td>
            <td>
                <button class="btn btn-warning" onclick="startEdit('${dv}', ${sl})" title="Sửa">
                    <i class="fa fa-edit"></i> Sửa
                </button>
                <button class="btn btn-danger" onclick="deleteItem('${dv}')" title="Xóa">
                    <i class="fa fa-trash"></i> Xóa
                </button>
            </td>
        `;
        dom.tableBody.appendChild(tr);
    });

    // Cập nhật tổng số
    dom.totalDisplay.textContent = total;
}

/**
 * Hàm bật/tắt các ô nhập liệu
 */
function toggleInputs(enable) {
    dom.donVi.disabled = !enable;
    dom.soLuong.disabled = !enable;
}

/**
 * Hàm xóa trắng form và biến tạm
 */
function resetForm() {
    dom.form.reset();
    editingDonViOriginal = '';
}