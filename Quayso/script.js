let namesList = [];
let spinInterval = null; // Biến để kiểm soát vòng lặp quay
let isSpinning = false;  // Trạng thái đang quay hay dừng

// --- PHẦN XỬ LÝ FILE EXCEL VÀ NHẬP LIỆU (GIỮ NGUYÊN) ---
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
        
        namesList = jsonData.map(row => row[0]).filter(name => name && name.toString().trim() !== "");
        document.getElementById('manualInput').value = namesList.join("\n");
        updatePreview();
    };
    reader.readAsArrayBuffer(file);
});

function updatePreview() {
    const rawText = document.getElementById('manualInput').value;
    namesList = rawText.split('\n').map(n => n.trim()).filter(n => n !== "");

    const previewSection = document.getElementById('previewSection');
    const previewBody = document.getElementById('previewBody');
    const totalCount = document.getElementById('totalCount');

    if (namesList.length === 0) {
        previewSection.classList.add('hidden');
        return;
    }

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

function clearList() {
    if (isSpinning) {
        alert("Đang quay số, vui lòng dừng trước khi xóa!");
        return;
    }
    namesList = [];
    document.getElementById('manualInput').value = "";
    document.getElementById('excelInput').value = "";
    document.getElementById('previewSection').classList.add('hidden');
    document.getElementById('resultSection').classList.add('hidden');
    document.getElementById('previewBody').innerHTML = "";
    document.getElementById('resultBody').innerHTML = "";
}

// --- PHẦN LOGIC QUAY SỐ MỚI ---

function toggleSpin() {
    const btn = document.getElementById('spinBtn');
    
    // Kiểm tra dữ liệu đầu vào
    const rawText = document.getElementById('manualInput').value;
    let finalNames = rawText.split('\n').map(n => n.trim()).filter(n => n !== "");
    
    if (finalNames.length === 0) {
        alert("Danh sách trống! Vui lòng nhập tên.");
        return;
    }

    if (!isSpinning) {
        // --- BẮT ĐẦU QUAY ---
        isSpinning = true;
        
        // 1. Đổi giao diện nút
        btn.innerText = "🛑 DỪNG LẠI";
        btn.classList.add('btn-stop'); // Đổi màu cam/đỏ
        
        // 2. Hiện bảng kết quả (nhưng chưa có số chính thức)
        document.getElementById('resultSection').classList.remove('hidden');
        const resultBody = document.getElementById('resultBody');
        
        // 3. Tạo cấu trúc bảng
        resultBody.innerHTML = "";
        finalNames.forEach((name, index) => {
            const row = `<tr id="row-${index}">
                            <td style="text-align:center;">${index + 1}</td>
                            <td>${name}</td>
                            <td class="spinning-number" id="num-${index}">...</td>
                        </tr>`;
            resultBody.innerHTML += row;
        });

        // 4. Bắt đầu hiệu ứng nhảy số
        // Cứ 50ms sẽ thay đổi số 1 lần để tạo cảm giác đang quay
        spinInterval = setInterval(() => {
            finalNames.forEach((_, index) => {
                const cell = document.getElementById(`num-${index}`);
                // Hiện số ngẫu nhiên giả vờ (để đẹp mắt thôi)
                const randomNum = Math.floor(Math.random() * finalNames.length) + 1; 
                cell.innerText = randomNum;
            });
        }, 50);

    } else {
        // --- DỪNG QUAY VÀ CHỐT SỐ ---
        isSpinning = false;
        clearInterval(spinInterval); // Dừng hiệu ứng nhảy số

        // 1. Đổi lại giao diện nút
        btn.innerText = "🎲 Bắt đầu Quay";
        btn.classList.remove('btn-stop');

        // 2. Tính toán kết quả CHÍNH THỨC (không trùng lặp)
        let numbers = [];
        for (let i = 1; i <= finalNames.length; i++) {
            numbers.push(i);
        }
        shuffleArray(numbers); // Trộn kỹ

        // 3. Cập nhật giao diện lần cuối
        finalNames.forEach((_, index) => {
            const cell = document.getElementById(`num-${index}`);
            cell.innerText = numbers[index]; // Gán số chính thức
            cell.classList.remove('spinning-number');
            cell.classList.add('final-number'); // Hiệu ứng chữ đậm/màu đỏ
        });
    }
}

// Thuật toán tráo bài Fisher-Yates (Giữ nguyên)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}