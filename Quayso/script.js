let namesList = [];

// Xử lý khi chọn file Excel
document.getElementById('excelInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1});
        
        // Lấy cột A, lọc bỏ ô trống
        namesList = jsonData.map(row => row[0]).filter(name => name && name.toString().trim() !== "");
        
        // Đưa vào ô nhập liệu và cập nhật bảng xem trước
        document.getElementById('manualInput').value = namesList.join("\n");
        updatePreview(); // Gọi hàm cập nhật bảng
    };
    reader.readAsArrayBuffer(file);
});

// Hàm cập nhật bảng "Danh sách đã nhập" (Có cột STT)
function updatePreview() {
    const rawText = document.getElementById('manualInput').value;
    namesList = rawText.split('\n').map(n => n.trim()).filter(n => n !== "");

    const previewSection = document.getElementById('previewSection');
    const previewBody = document.getElementById('previewBody');
    const totalCount = document.getElementById('totalCount');

    // Nếu không có tên nào, ẩn bảng đi
    if (namesList.length === 0) {
        previewSection.classList.add('hidden');
        return;
    }

    // Hiển thị bảng và cập nhật dữ liệu
    previewSection.classList.remove('hidden');
    previewBody.innerHTML = "";
    totalCount.innerText = namesList.length;

    namesList.forEach((name, index) => {
        const row = `<tr>
                        <td style="text-align:center;">${index + 1}</td>
                        <td>${name}</td>
                    </tr>`;
        previewBody.innerHTML += row;
    });
}

// Hàm Xóa Danh Sách
function clearList() {
    // 1. Xóa dữ liệu biến
    namesList = [];
    
    // 2. Xóa giao diện input
    document.getElementById('manualInput').value = "";
    document.getElementById('excelInput').value = ""; // Reset file input
    
    // 3. Ẩn các bảng
    document.getElementById('previewSection').classList.add('hidden');
    document.getElementById('resultSection').classList.add('hidden');
    
    // 4. Xóa nội dung bảng
    document.getElementById('previewBody').innerHTML = "";
    document.querySelector("#resultTable tbody").innerHTML = "";
}

// Hàm Bốc Thăm
function processRandomize() {
    // Cập nhật lại danh sách lần cuối từ ô input để chắc chắn
    const rawText = document.getElementById('manualInput').value;
    let finalNames = rawText.split('\n').map(n => n.trim()).filter(n => n !== "");

    if (finalNames.length === 0) {
        alert("Danh sách trống! Vui lòng nhập tên.");
        return;
    }

    // Tạo mảng số từ 1 đến N
    let numbers = [];
    for (let i = 1; i <= finalNames.length; i++) {
        numbers.push(i);
    }

    // Trộn ngẫu nhiên
    shuffleArray(numbers);

    // Hiển thị kết quả
    displayResult(finalNames, numbers);
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function displayResult(names, numbers) {
    const tbody = document.querySelector("#resultTable tbody");
    tbody.innerHTML = ""; 

    for (let i = 0; i < names.length; i++) {
        const row = `<tr>
                        <td style="text-align:center;">${i + 1}</td>
                        <td>${names[i]}</td>
                        <td style="color: #d9534f; font-weight: bold; font-size: 1.1em;">${numbers[i]}</td>
                    </tr>`;
        tbody.innerHTML += row;
    }

    document.getElementById('resultSection').classList.remove('hidden');
}