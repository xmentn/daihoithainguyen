// Dán link Web App bạn copy ở bước 1 vào giữa dấu ngoặc kép bên dưới
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwrD-3TxHnz3h2UEOYVywd_XgwMmi-YTcLSYLP97bfANr3t4QaiQYXKMkLd30fXKEkS/exec";

// Biến toàn cục
let currentMode = ''; // 'add' hoặc 'edit'
let editingDonViOriginal = ''; 
let cachedDataList = []; // Lưu trữ danh sách dữ liệu để kiểm tra trùng lặp ngay tại máy khách

const dom = {
    donVi: document.getElementById('donVi'),
    soLuong: document.getElementById('soLuong'),
    btnAddNew: document.getElementById('btnAddNew'),
    btnSave: document.getElementById('btnSave'),
    btnCancel: document.getElementById('btnCancel'),
    form: document.getElementById('dataForm'),
    tableBody: document.getElementById('dataTable'),
    totalDisplay: document.getElementById('totalValue')
};

document.addEventListener('DOMContentLoaded', () => {
    fetchUnits();
    fetchData();
});

// --- SỰ KIỆN ---

// 1. Nhấn nút THÊM MỚI
dom.btnAddNew.addEventListener('click', () => {
    resetForm();
    toggleInputs(true);
    
    // Logic nút bấm: Khóa nút Thêm mới, mở nút Lưu/Hủy
    dom.btnAddNew.disabled = true; 
    dom.btnSave.disabled = false;
    dom.btnCancel.style.display = 'inline-block';
    
    currentMode = 'add';
    dom.donVi.focus();
});

// 2. Nhấn nút HỦY
dom.btnCancel.addEventListener('click', () => {
    resetForm();
    toggleInputs(false);
    
    // Logic nút bấm: Mở nút Thêm mới, khóa nút Lưu
    dom.btnAddNew.disabled = false;
    dom.btnSave.disabled = true;
    dom.btnCancel.style.display = 'none';
    
    currentMode = '';
});

// 3. Nhấn nút LƯU (Quan trọng)
dom.form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const donViVal = dom.donVi.value;
    const soLuongVal = dom.soLuong.value;

    if(!donViVal) { 
        Swal.fire('Lỗi', 'Vui lòng chọn đơn vị!', 'error'); 
        return; 
    }

    // --- LOGIC KIỂM TRA TRÙNG LẶP ---
    // Chỉ kiểm tra khi đang ở chế độ 'add' hoặc khi 'edit' nhưng người dùng đổi tên đơn vị sang tên khác đã tồn tại
    if (currentMode === 'add' || (currentMode === 'edit' && donViVal !== editingDonViOriginal)) {
        const isDuplicate = cachedDataList.some(item => item[1] === donViVal); // item[1] là cột Tên đơn vị
        
        if (isDuplicate) {
            Swal.fire({
                title: 'Đơn vị đã có dữ liệu!',
                text: `Đơn vị "${donViVal}" đã có trong danh sách. Bạn có muốn ghi đè số lượng mới không?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Đồng ý ghi đè',
                cancelButtonText: 'Hủy bỏ'
            }).then((result) => {
                if (result.isConfirmed) {
                    // Nếu đồng ý ghi đè, chuyển mode sang edit để server xử lý update
                    submitData('edit', donViVal, soLuongVal, donViVal); // oldDonVi cũng là chính nó để tìm
                }
            });
            return; // Dừng lại, đợi người dùng chọn ở hộp thoại
        }
    }

    // Nếu không trùng, hoặc đang sửa chính nó -> Gửi luôn
    submitData(currentMode, donViVal, soLuongVal, editingDonViOriginal);
});


// --- HÀM GỬI DỮ LIỆU ---
function submitData(mode, donVi, soLuong, oldDonVi) {
    const originalBtnText = dom.btnSave.innerHTML;
    dom.btnSave.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Đang lưu...';
    dom.btnSave.disabled = true;
    dom.btnCancel.disabled = true;

    fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({
            action: mode,
            donVi: donVi,
            soLuong: soLuong,
            oldDonVi: oldDonVi
        })
    })
    .then(() => {
        // Thông báo thành công chuyên nghiệp
        Swal.fire({
            title: 'Thành công!',
            text: 'Dữ liệu đã được lưu.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
        });

        resetForm();
        toggleInputs(false);
        
        // Trả lại trạng thái nút
        dom.btnSave.innerHTML = '<i class="fa fa-save"></i> Lưu thông tin';
        dom.btnSave.disabled = true;
        dom.btnCancel.style.display = 'none';
        dom.btnAddNew.disabled = false; // Mở lại nút Thêm mới
        dom.btnCancel.disabled = false;

        fetchData(); // Tải lại bảng
    })
    .catch(err => {
        Swal.fire('Lỗi', 'Không thể kết nối tới máy chủ', 'error');
        dom.btnSave.innerHTML = originalBtnText;
        dom.btnSave.disabled = false;
        dom.btnCancel.disabled = false;
    });
}


// --- CÁC HÀM HỖ TRỢ ---

function toggleInputs(enable) {
    dom.donVi.disabled = !enable;
    dom.soLuong.disabled = !enable;
}

function resetForm() {
    dom.form.reset();
    editingDonViOriginal = '';
}

function fetchUnits() {
    fetch(SCRIPT_URL + "?action=getUnits")
        .then(res => res.json())
        .then(data => {
            dom.donVi.innerHTML = '<option value="">-- Chọn đơn vị --</option>';
            data.forEach(item => {
                let op = document.createElement('option');
                op.value = item[0];
                op.text = item[0];
                dom.donVi.add(op);
            });
        });
}

function fetchData() {
    dom.tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center"><i class="fa fa-spinner fa-spin"></i> Đang tải dữ liệu...</td></tr>';
    
    fetch(SCRIPT_URL + "?action=getData")
        .then(res => res.json())
        .then(data => {
            cachedDataList = data; // Lưu vào biến toàn cục để check trùng lặp
            renderTable(data);
        });
}

function renderTable(data) {
    dom.tableBody.innerHTML = '';
    let total = 0;

    if (data.length === 0) {
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
                <button class="btn btn-warning" onclick="startEdit('${dv}', ${sl})">
                    <i class="fa fa-edit"></i>
                </button>
                <button class="btn btn-danger" onclick="deleteItem('${dv}')">
                    <i class="fa fa-trash"></i>
                </button>
            </td>
        `;
        dom.tableBody.appendChild(tr);
    });
    dom.totalDisplay.textContent = total;
}

// Global functions for onClick in HTML
window.startEdit = function(tenDonVi, soLuong) {
    toggleInputs(true);
    
    // Logic nút bấm: Giống Thêm mới, nhưng điền dữ liệu
    dom.btnAddNew.disabled = true;
    dom.btnSave.disabled = false;
    dom.btnCancel.style.display = 'inline-block';

    dom.donVi.value = tenDonVi;
    dom.soLuong.value = soLuong;

    currentMode = 'edit';
    editingDonViOriginal = tenDonVi;

    document.querySelector('.container').scrollIntoView({ behavior: 'smooth' });
};

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
            // Gửi lệnh xóa
            fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                body: JSON.stringify({ action: 'delete', donVi: tenDonVi })
            })
            .then(() => {
                Swal.fire('Đã xóa!', 'Dữ liệu đã được xóa thành công.', 'success');
                fetchData();
            });
        }
    });
};

// Tìm kiếm nhanh
document.getElementById('searchBox').addEventListener('keyup', function() {
    const term = this.value.toLowerCase();
    const filtered = cachedDataList.filter(row => 
        row[1].toLowerCase().includes(term)
    );
    renderTable(filtered);
});