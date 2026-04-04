// DÁN LINK CSV CỦA GOOGLE SHEET VÀO ĐÂY (Xem hướng dẫn bên dưới để lấy link)
const sheetCSVUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTurnlLoJd0CMT1d2I5DlnRCK2hZC2vG4ew3FNTVQLqw-9MXJFZCanZMxQm6Pk4etFzu7wMhp6wQPw1/pub?gid=0&single=true&output=csv';

const getSeatNumber = (pos) => parseInt(pos.replace(/[^\d]/g, ''));

async function loadSheetData() {
    try {
        if (sheetCSVUrl.includes('2PACX-1vQ...')) {
            renderMeetingRoom([
                { stt: 1, name: "Trịnh Xuân Trường", position: "CT1" },
                { stt: 2, name: "Vương Quốc Tuấn", position: "CT2" },
                { stt: 3, name: "Nguyễn Đăng Bình", position: "T1" },
                { stt: 4, name: "Đinh Quang Tuyên", position: "P1" },
                { stt: 5, name: "Bùi Văn Lượng", position: "T2" },
                { stt: 6, name: "Dương Văn Tiến", position: "P2" }
            ]);
            return;
        }

        const response = await fetch(sheetCSVUrl);
        const csvText = await response.text();
        const data = parseCSV(csvText);
        renderMeetingRoom(data);
    } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
    }
}

function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const cols = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        if (cols.length >= 3) {
            data.push({
                stt: cols[0].replace(/"/g, '').trim(),
                name: cols[1].replace(/"/g, '').trim(),
                position: cols[2].replace(/"/g, '').trim()
            });
        }
    }
    return data;
}

function renderMeetingRoom(data) {
    // 1. Logic Chủ tọa: CT chẵn bên trái màn hình (phải chủ tọa), CT lẻ bên phải màn hình (trái chủ tọa)
    const allCT = data.filter(d => d.position.startsWith('CT')).sort((a, b) => getSeatNumber(a.position) - getSeatNumber(a.position));
    let topSeats = [];
    allCT.forEach(delegate => {
        const num = getSeatNumber(delegate.position);
        if (num === 1) {
            topSeats.push(delegate);
        } else if (num % 2 === 0) {
            topSeats.unshift(delegate);
        } else {
            topSeats.push(delegate);
        }
    });

    // 2. SỬA LỖI ĐẢO BÊN: 
    // Ghế P (Phải chủ tọa) -> Hiển thị ở Cột Trái màn hình
    const leftSeats = data.filter(d => d.position.startsWith('P')).sort((a, b) => getSeatNumber(a.position) - getSeatNumber(b.position));

    // Ghế T (Trái chủ tọa) -> Hiển thị ở Cột Phải màn hình
    const rightSeats = data.filter(d => d.position.startsWith('T')).sort((a, b) => getSeatNumber(a.position) - getSeatNumber(b.position));

    const topContainer = document.getElementById('top-row');
    const leftContainer = document.getElementById('left-col');
    const rightContainer = document.getElementById('right-col');

    topContainer.innerHTML = '';
    leftContainer.innerHTML = '';
    rightContainer.innerHTML = '';

    // 3. SỬA TOOLTIP: Chỉ hiển thị tên đại biểu
    const createSeatHTML = (delegate, typeClass) => `
        <div class="seat-wrapper ${typeClass}" data-name="${delegate.name.toLowerCase()}">
            <div class="tooltip">${delegate.name}</div>
            <div class="chair"></div>
            <div class="desk">
                <div class="nameplate">
                    <div class="position-tag">${delegate.position}</div>
                    <div class="delegate-name">${delegate.name}</div>
                </div>
            </div>
        </div>
    `;

    topSeats.forEach(delegate => topContainer.innerHTML += createSeatHTML(delegate, 'top-seat'));
    leftSeats.forEach(delegate => leftContainer.innerHTML += createSeatHTML(delegate, 'left-seat'));
    rightSeats.forEach(delegate => rightContainer.innerHTML += createSeatHTML(delegate, 'right-seat'));
}

// === TÍNH NĂNG TRA CỨU ===
function searchDelegate() {
    const searchVal = document.getElementById('searchInput').value.toLowerCase().trim();
    if (!searchVal) return;

    document.querySelectorAll('.highlight-seat').forEach(el => el.classList.remove('highlight-seat'));

    const seats = document.querySelectorAll('.seat-wrapper');
    let foundCount = 0;

    seats.forEach(seat => {
        const delegateName = seat.getAttribute('data-name');
        if (delegateName.includes(searchVal)) {
            seat.classList.add('highlight-seat');
            seat.scrollIntoView({ behavior: 'smooth', block: 'center' });
            foundCount++;
        }
    });

    if (foundCount === 0) {
        alert('Không tìm thấy đại biểu có tên: "' + searchVal + '" trong sơ đồ!');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                searchDelegate();
            }
        });
    }
});

loadSheetData();