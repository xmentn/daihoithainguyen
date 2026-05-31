document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('delegate-form');
    const idInput = document.getElementById('delegate-id');
    const nameInput = document.getElementById('fullname');
    const seatInput = document.getElementById('seat-code');
    const tableBody = document.getElementById('table-body');
    const formTitle = document.getElementById('form-title');
    const cancelBtn = document.getElementById('cancel-btn');

    // Lấy dữ liệu từ LocalStorage (Database giả lập)
    let delegates = JSON.parse(localStorage.getItem('db_delegates')) || [];

    function renderTable() {
        tableBody.innerHTML = '';
        delegates.forEach((del, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td style="font-weight:bold;">${del.name}</td>
                <td style="color:#c0392b; font-weight:bold;">${del.seat}</td>
                <td>
                    <button class="btn-edit" onclick="editDelegate(${del.id})">Sửa</button>
                    <button class="btn-delete" onclick="deleteDelegate(${del.id})">Xóa</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = idInput.value;
        const name = nameInput.value.trim();
        const seat = seatInput.value.trim().toUpperCase(); // Chuyển thành chữ hoa (V1, A1...)

        if (id) {
            // Cập nhật (Sửa)
            const index = delegates.findIndex(d => d.id == id);
            delegates[index] = { id: parseInt(id), name, seat };
            idInput.value = '';
            formTitle.textContent = 'Thêm Đại biểu mới';
            cancelBtn.style.display = 'none';
        } else {
            // Thêm mới
            const newId = Date.now(); // Tạo ID ngẫu nhiên bằng thời gian
            delegates.push({ id: newId, name, seat });
        }

        // Lưu vào LocalStorage
        localStorage.setItem('db_delegates', JSON.stringify(delegates));
        form.reset();
        renderTable();
    });

    window.editDelegate = function (id) {
        const del = delegates.find(d => d.id == id);
        idInput.value = del.id;
        nameInput.value = del.name;
        seatInput.value = del.seat;
        formTitle.textContent = 'Sửa thông tin Đại biểu';
        cancelBtn.style.display = 'inline-block';
    }

    window.deleteDelegate = function (id) {
        if (confirm('Bạn có chắc chắn muốn xóa đại biểu này khỏi ghế?')) {
            delegates = delegates.filter(d => d.id != id);
            localStorage.setItem('db_delegates', JSON.stringify(delegates));
            renderTable();
        }
    }

    cancelBtn.addEventListener('click', () => {
        form.reset();
        idInput.value = '';
        formTitle.textContent = 'Thêm Đại biểu mới';
        cancelBtn.style.display = 'none';
    });

    renderTable(); // Hiển thị bảng khi load trang
});