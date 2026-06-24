import { db, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', () => {
  // --- XỬ LÝ CHUYỂN TAB ---
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });

  // --- BIẾN TOÀN CỤC ---
  let currentDelegates = [];
  let currentConferences = [];
  let selectedConfId = "";
  let currentFilterTab1 = "ALL"; // Bộ lọc xem ở Tab 1
  let currentFilterTab3 = "ALL"; // Bộ lọc phục vụ xếp chỗ ở Tab 3 (MỚI THÊM)

  const delegatesCol = collection(db, 'delegates');
  const conferencesCol = collection(db, 'conferences');

  // DOM các bảng, ô nhập và bộ lọc
  const tableDanhSach = document.getElementById('table-danhsach');
  const tableHoiNghi = document.getElementById('table-hoignhi');
  const tableVitri = document.getElementById('table-vitri');
  const selectConf = document.getElementById('select-conference');
  const actionVitriContainer = document.getElementById('action-vitri-container');
  const filterCategoryTab1 = document.getElementById('filter-category'); // Bộ lọc Tab 1
  const filterCategoryTab3 = document.getElementById('delegate-filter');  // Bộ lọc Tab 3 (MỚI THÊM)

  // Nhãn danh nghĩa trang trọng đã được chuẩn hóa theo yêu cầu của bạn
  const categoryLabels = {
    "Trung ương": "Đại biểu Trung ương",
    "Thường trực": "Thường trực Tỉnh ủy",
    "BTV": "Ủy viên BTV Tỉnh ủy",
    "BCH": "Ủy viên BCH Đảng bộ tỉnh"
  };

  // Lắng nghe bộ lọc thay đổi ở Tab 1
  if (filterCategoryTab1) {
    filterCategoryTab1.addEventListener('change', (e) => {
      currentFilterTab1 = e.target.value;
      renderTabDanhSach();
    });
  }

  // Lắng nghe bộ lọc thay đổi ở Tab 3 để lọc danh sách xếp chỗ (MỚI THÊM)
  if (filterCategoryTab3) {
    filterCategoryTab3.addEventListener('change', (e) => {
      currentFilterTab3 = e.target.value;
      renderTabVitri(); // Tải lại bảng xếp chỗ dựa trên đối tượng được lọc
    });
  }

  // --- 1. THEO DÕI REALTIME DANH SÁCH TỔNG ĐẠI BIỂU TỪ FIREBASE ---
  onSnapshot(delegatesCol, (snapshot) => {
    currentDelegates = [];
    snapshot.forEach(docSnap => currentDelegates.push({ id: docSnap.id, ...docSnap.data() }));

    // Tự động sắp xếp theo Rank ưu tiên
    currentDelegates.sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999));

    renderTabDanhSach();
    if (selectedConfId) renderTabVitri();
  });

  // --- 2. THEO DÕI REALTIME DANH SÁCH HỘI NGHỊ TỪ FIREBASE ---
  onSnapshot(conferencesCol, (snapshot) => {
    currentConferences = [];
    selectConf.innerHTML = '<option value="">-- Vui lòng chọn một Hội nghị --</option>';
    tableHoiNghi.innerHTML = '';

    let index = 1;
    snapshot.forEach(docSnap => {
      const conf = { id: docSnap.id, ...docSnap.data() };
      currentConferences.push(conf);

      const opt = document.createElement('option');
      opt.value = conf.id; opt.textContent = conf.name;
      if (conf.id === selectedConfId) opt.selected = true;
      selectConf.appendChild(opt);

      const tr = document.createElement('tr');
      tr.innerHTML = `
                <td>${index++}</td>
                <td style="font-weight:bold; color:#2c3e50;">${conf.name}</td>
                <td><button class="btn-delete delete-conf" data-id="${conf.id}">Xóa phiên</button></td>
            `;
      tableHoiNghi.appendChild(tr);
    });

    document.querySelectorAll('.delete-conf').forEach(b => b.addEventListener('click', (e) => deleteConference(e.target.dataset.id)));
  });

  // HIỂN THỊ TAB 1 (Danh sách tổng)
  function renderTabDanhSach() {
    tableDanhSach.innerHTML = '';
    let displayIndex = 1;

    currentDelegates.forEach((del) => {
      if (currentFilterTab1 !== "ALL" && del.category !== currentFilterTab1) return;

      const tr = document.createElement('tr');
      const label = categoryLabels[del.category] || 'Chưa phân loại';
      tr.innerHTML = `
                <td>${displayIndex++}</td>
                <td style="color:#e67e22; font-weight:bold;">${del.rank ?? '-'}</td>
                <td style="color:#2980b9; font-weight:bold; font-size:13px;">${label}</td>
                <td style="font-weight:bold;">Đ/c ${del.name}</td>
                <td>
                    <button class="btn-edit edit-del" data-id="${del.id}">Sửa</button>
                    <button class="btn-delete delete-del" data-id="${del.id}">Xóa</button>
                </td>
            `;
      tableDanhSach.appendChild(tr);
    });
    document.querySelectorAll('.edit-del').forEach(b => b.addEventListener('click', (e) => editDelegate(e.target.dataset.id)));
    document.querySelectorAll('.delete-del').forEach(b => b.addEventListener('click', (e) => deleteDelegate(e.target.dataset.id)));
  }

  // --- XỬ LÝ KHI CHỌN HỘI NGHỊ Ở TAB 3 ---
  selectConf.addEventListener('change', (e) => {
    selectedConfId = e.target.value;
    if (selectedConfId) {
      actionVitriContainer.style.display = 'block';
      renderTabVitri();
    } else {
      actionVitriContainer.style.display = 'none';
    }
  });

  // HIỂN THỊ TAB 3 (Xếp chỗ hội nghị - ĐÃ THÊM LOGIC LỌC ĐỐI TƯỢNG)
  function renderTabVitri() {
    tableVitri.innerHTML = '';
    const conf = currentConferences.find(c => c.id === selectedConfId);
    const seatsMap = conf?.seats || {};
    let displayIndex = 1;

    currentDelegates.forEach((del) => {
      // ĐOẠN ĐƯỢC NÂNG CẤP: Lọc danh sách hiển thị khi xếp chỗ
      if (currentFilterTab3 !== "ALL" && del.category !== currentFilterTab3) return;

      const currentSeat = seatsMap[del.id] || '';
      const tr = document.createElement('tr');
      const label = categoryLabels[del.category] || '-';
      tr.innerHTML = `
                <td>${displayIndex++}</td>
                <td style="color:#e67e22; font-weight:bold;">${del.rank ?? '-'}</td>
                <td style="color:#2980b9; font-size:12px; font-weight:bold;">${label}</td>
                <td style="font-weight:bold;">Đ/c ${del.name}</td>
                <td><input type="text" class="seat-input" id="seat-${del.id}" value="${currentSeat}" placeholder="Không đi"></td>
                <td><button class="btn-update update-seat-btn" data-id="${del.id}">Cập nhật</button></td>
            `;
      tableVitri.appendChild(tr);
    });
    document.querySelectorAll('.update-seat-btn').forEach(b => b.addEventListener('click', (e) => updateDelegateSeat(e.target.dataset.id)));
  }

  // --- XỬ LÝ LƯU GHẾ CHO HỘI NGHỊ ---
  window.updateDelegateSeat = async function (delegateId) {
    const seatValue = document.getElementById(`seat-${delegateId}`).value.trim().toUpperCase();
    const conf = currentConferences.find(c => c.id === selectedConfId);
    if (!conf) return;

    let updatedSeats = { ...(conf.seats || {}) };
    if (seatValue === "") {
      delete updatedSeats[delegateId];
    } else {
      updatedSeats[delegateId] = seatValue;
    }

    try {
      await updateDoc(doc(db, 'conferences', selectedConfId), { seats: updatedSeats });
      const btn = document.querySelector(`.update-seat-btn[data-id="${delegateId}"]`);
      btn.style.background = '#27ae60'; btn.textContent = 'Đã lưu';
      setTimeout(() => { btn.style.background = '#f39c12'; btn.textContent = 'Cập nhật'; }, 1000);
    } catch (e) { console.error(e); }
  };

  // --- FORM TAB 1: THÊM / SỬA ĐẠI BIỂU TỔNG ---
  const formDel = document.getElementById('delegate-form');
  const idInput = document.getElementById('delegate-id');
  const nameInput = document.getElementById('fullname');
  const rankInput = document.getElementById('delegate-rank');
  const categoryInput = document.getElementById('delegate-category');
  const formTitle = document.getElementById('form-title');
  const cancelBtn = document.getElementById('cancel-btn');

  formDel.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = idInput.value;
    const name = nameInput.value.trim();
    const rank = parseInt(rankInput.value, 10);
    const category = categoryInput.value;

    const dup = currentDelegates.find(d => d.rank === rank && d.id !== id);
    if (dup) {
      Swal.fire({ icon: 'warning', title: 'Trùng Rank', text: `Rank ${rank} đã thuộc về Đ/c "${dup.name}".`, confirmButtonText: 'Đã hiểu' });
      return;
    }
    if (id) {
      await updateDoc(doc(db, 'delegates', id), { name, rank, category });
      idInput.value = ''; formTitle.textContent = 'Thêm Đại biểu mới'; cancelBtn.style.display = 'none';
    } else {
      await addDoc(delegatesCol, { name, rank, category });
    }
    formDel.reset();
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Đã cập nhật danh sách tổng!', showConfirmButton: false, timer: 1500 });
  });

  function editDelegate(id) {
    const d = currentDelegates.find(x => x.id === id);
    if (!d) return;
    idInput.value = d.id; nameInput.value = d.name; rankInput.value = d.rank ?? '';
    categoryInput.value = d.category || '';
    formTitle.textContent = 'Sửa Thông tin Đại biểu'; cancelBtn.style.display = 'inline-block';
  }

  function deleteDelegate(id) {
    Swal.fire({ title: 'Xóa đại biểu?', text: "Hành động này sẽ xóa vĩnh viễn đại biểu khỏi danh sách tổng!", icon: 'warning', showCancelButton: true, confirmButtonColor: '#e74c3c', confirmButtonText: 'Xóa' }).then(async (r) => {
      if (r.isConfirmed) { await deleteDoc(doc(db, 'delegates', id)); }
    });
  }
  cancelBtn.addEventListener('click', () => { formDel.reset(); idInput.value = ''; cancelBtn.style.display = 'none'; });

  // --- FORM TAB 2: TẠO HỘI NGHỊ ---
  const formConf = document.getElementById('conf-form');
  const confNameInput = document.getElementById('conf-name');
  formConf.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = confNameInput.value.trim();
    await addDoc(conferencesCol, { name: name, seats: {}, createdAt: Date.now() });
    formConf.reset();
    Swal.fire({ icon: 'success', title: 'Thành công', text: 'Đã tạo phiên hội nghị mới!', timer: 1500, showConfirmButton: false });
  });

  function deleteConference(id) {
    Swal.fire({ title: 'Xóa Hội nghị?', text: "Toàn bộ sơ đồ xếp chỗ của hội nghị này sẽ mất!", icon: 'error', showCancelButton: true, confirmButtonColor: '#e74c3c', confirmButtonText: 'Xóa phiên' }).then(async (r) => {
      if (r.isConfirmed) {
        if (selectedConfId === id) { selectedConfId = ""; actionVitriContainer.style.display = 'none'; }
        await deleteDoc(doc(db, 'conferences', id));
      }
    });
  }

  // --- XÓA TOÀN BỘ GHẾ TRONG HỘI NGHỊ ĐƯỢC CHỌN ---
  document.getElementById('clear-all-seats').addEventListener('click', () => {
    Swal.fire({ title: 'Làm trống sơ đồ?', text: "Xóa toàn bộ chỗ ngồi đã xếp của hội nghị này?", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Đồng ý' }).then(async (r) => {
      if (r.isConfirmed) {
        await updateDoc(doc(db, 'conferences', selectedConfId), { seats: {} });
        Swal.fire('Đã xóa!', 'Sơ đồ hội nghị hiện tại đã trống.', 'success');
      }
    });
  });
});