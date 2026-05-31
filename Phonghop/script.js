document.addEventListener('DOMContentLoaded', () => {
  // KÉO DỮ LIỆU TỪ DATABASE GIẢ LẬP
  const delegates = JSON.parse(localStorage.getItem('db_delegates')) || [];

  // Hàm tìm tên đại biểu dựa vào mã ghế
  function getDelegateName(seatCode) {
    const found = delegates.find(d => d.seat === seatCode);
    return found ? found.name : '';
  }

  // 1. TẠO BÀN CHỦ TỌA
  const chairmanContainer = document.getElementById('chairman-container');
  const cGroup = document.createElement('div');
  cGroup.className = 'chairman-group';
  const cChairs = document.createElement('div');
  cChairs.className = 'chairman-chairs';
  const cTable = document.createElement('div');
  cTable.className = 'chairman-table';

  // Bảng quy đổi Vị trí ghế thực tế -> Mã V
  // Theo yêu cầu: V5(Trái ngoài), V3(Trái trong), V1(Giữa), V2(Phải trong), V4(Phải ngoài)
  const chairmanMapping = ['V5', 'V3', 'V1', 'V2', 'V4'];

  for (let i = 0; i < 5; i++) {
    const slot = document.createElement('div');
    slot.className = 'chair-slot';

    const seat = document.createElement('div');
    seat.className = 'seat-3d c-seat';

    const seatCode = chairmanMapping[i];
    const delName = getDelegateName(seatCode);

    // Hiển thị nội dung trên ghế
    let htmlContent = `<span class="seat-code">${seatCode}</span>`;
    if (delName) {
      // Tách lấy tên cuối (Ví dụ "Nguyễn Văn An" -> "An") để hiển thị cho vừa ghế
      const shortName = delName.split(' ').pop();
      htmlContent += `<span class="delegate-name">${shortName}</span>`;
      seat.classList.add('has-delegate'); // Đổi màu ghế xanh báo hiệu đã có người ngồi
    }
    seat.innerHTML = htmlContent;

    slot.appendChild(seat);
    cChairs.appendChild(slot);

    const panel = document.createElement('div');
    panel.className = 'table-panel';
    cTable.appendChild(panel);
  }

  cGroup.appendChild(cChairs);
  cGroup.appendChild(cTable);
  chairmanContainer.appendChild(cGroup);

  // 2. TẠO KHÁN PHÒNG
  const TOTAL_ROWS = 11;
  const rowLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
  const leftBlock = document.getElementById('left-block');
  const rightBlock = document.getElementById('right-block');

  function buildAuditoriumBlock(container, isLeftBlock) {
    for (let r = 0; r < TOTAL_ROWS; r++) {
      const rowDiv = document.createElement('div');
      rowDiv.className = 'auditorium-row';

      const tablesContainer = document.createElement('div');
      tablesContainer.className = 'tables-container';

      const numTables = (r < 3) ? 4 : 5;
      const seatsInRow = numTables * 2;

      for (let t = 0; t < numTables; t++) {
        const tableGroup = document.createElement('div');
        tableGroup.className = 'table-group';
        const chairsRow = document.createElement('div');
        chairsRow.className = 'auditorium-chairs';

        for (let c = 0; c < 2; c++) {
          const seat = document.createElement('div');
          seat.className = 'seat-3d a-seat';

          const globalSeatIndex = t * 2 + c;
          let seatNum;

          if (isLeftBlock) {
            seatNum = (seatsInRow - globalSeatIndex) * 2 - 1;
          } else {
            seatNum = (globalSeatIndex + 1) * 2;
          }

          const seatCode = rowLetters[r] + seatNum;
          const delName = getDelegateName(seatCode);

          // Hiển thị nội dung trên ghế
          let htmlContent = `<span class="seat-code">${seatCode}</span>`;
          if (delName) {
            const shortName = delName.split(' ').pop();
            htmlContent += `<span class="delegate-name">${shortName}</span>`;
            seat.classList.add('has-delegate');
          }
          seat.innerHTML = htmlContent;

          chairsRow.appendChild(seat);
        }

        const tableSurface = document.createElement('div');
        tableSurface.className = 'auditorium-table';

        tableGroup.appendChild(tableSurface);
        tableGroup.appendChild(chairsRow);
        tablesContainer.appendChild(tableGroup);
      }

      rowDiv.appendChild(tablesContainer);
      container.appendChild(rowDiv);
    }
  }

  buildAuditoriumBlock(leftBlock, true);
  buildAuditoriumBlock(rightBlock, false);
});