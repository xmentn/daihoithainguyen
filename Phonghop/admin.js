import {
  db,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from "./firebase-config.js";

document.addEventListener("DOMContentLoaded", () => {
  // --- XỬ LÝ CHUYỂN TAB ---
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabBtns.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.tab).classList.add("active");
    });
  });

  // --- BIẾN TOÀN CỤC ---
  let currentDelegates = [];
  const delegatesCol = collection(db, "delegates");

  const form = document.getElementById("delegate-form");
  const idInput = document.getElementById("delegate-id");
  const nameInput = document.getElementById("fullname");
  const rankInput = document.getElementById("delegate-rank");
  const formTitle = document.getElementById("form-title");
  const cancelBtn = document.getElementById("cancel-btn");
  const tableDanhSach = document.getElementById("table-danhsach");
  const tableVitri = document.getElementById("table-vitri");

  // --- LOAD DỮ LIỆU VÀ SẮP XẾP ---
  onSnapshot(delegatesCol, (snapshot) => {
    currentDelegates = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const id = docSnap.id;
      currentDelegates.push({ id, ...data });
    });

    currentDelegates.sort((a, b) => {
      const rankA = a.rank !== undefined && a.rank !== null ? a.rank : 9999;
      const rankB = b.rank !== undefined && b.rank !== null ? b.rank : 9999;
      return rankA - rankB;
    });

    tableDanhSach.innerHTML = "";
    tableVitri.innerHTML = "";
    let index = 1;

    currentDelegates.forEach((del) => {
      const displayRank = del.rank !== undefined ? del.rank : "-";

      const tr1 = document.createElement("tr");
      tr1.innerHTML = `
                <td>${index}</td>
                <td style="color:#e67e22; font-weight:bold;">${displayRank}</td>
                <td style="font-weight:bold;">${del.name}</td>
                <td>
                    <button class="btn-edit" data-id="${del.id}">Sửa</button>
                    <button class="btn-delete" data-id="${del.id}">Xóa</button>
                </td>
            `;
      tableDanhSach.appendChild(tr1);

      const tr2 = document.createElement("tr");
      tr2.innerHTML = `
                <td>${index}</td>
                <td style="color:#e67e22; font-weight:bold;">${displayRank}</td>
                <td style="font-weight:bold;">${del.name}</td>
                <td><input type="text" class="seat-input" id="seat-${del.id}" value="${del.seat || ""}" placeholder="Trống"></td>
                <td><button class="btn-update" data-id="${del.id}">Cập nhật</button></td>
            `;
      tableVitri.appendChild(tr2);
      index++;
    });

    document
      .querySelectorAll(".btn-edit")
      .forEach((b) =>
        b.addEventListener("click", (e) => editDelegate(e.target.dataset.id)),
      );
    document
      .querySelectorAll(".btn-delete")
      .forEach((b) =>
        b.addEventListener("click", (e) => deleteDelegate(e.target.dataset.id)),
      );
    document
      .querySelectorAll(".btn-update")
      .forEach((b) =>
        b.addEventListener("click", (e) => updateSeat(e.target.dataset.id)),
      );
  });

  // --- THÊM / SỬA ĐẠI BIỂU ---
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = idInput.value;
    const name = nameInput.value.trim();
    const rank = parseInt(rankInput.value, 10);

    const duplicateRank = currentDelegates.find(
      (d) => d.rank === rank && d.id !== id,
    );

    if (duplicateRank) {
      // Thông báo Trùng Rank bằng SweetAlert
      Swal.fire({
        icon: "warning",
        title: "Trùng Thứ tự (Rank)",
        text: `Rank ${rank} đã được sử dụng cho đồng chí "${duplicateRank.name}". Vui lòng nhập một số Rank khác!`,
        confirmButtonColor: "#f39c12",
        confirmButtonText: "Đã hiểu",
      });
      rankInput.focus();
      return;
    }

    try {
      if (id) {
        await updateDoc(doc(db, "delegates", id), { name: name, rank: rank });
        idInput.value = "";
        formTitle.textContent = "Thêm Đại biểu mới";
        cancelBtn.style.display = "none";
      } else {
        await addDoc(delegatesCol, { name: name, seat: "", rank: rank });
      }
      form.reset();
      // Thông báo lưu thành công nhỏ gọn ở góc
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Đã lưu thông tin!",
        showConfirmButton: false,
        timer: 1500,
      });
    } catch (error) {
      console.error("Lỗi:", error);
    }
  });

  function editDelegate(id) {
    const del = currentDelegates.find((d) => d.id === id);
    if (del) {
      idInput.value = del.id;
      nameInput.value = del.name;
      rankInput.value = del.rank !== undefined ? del.rank : "";
      formTitle.textContent = "Sửa Thông tin Đại biểu";
      cancelBtn.style.display = "inline-block";
    }
  }

  function deleteDelegate(id) {
    // Thông báo xác nhận Xóa Đại biểu bằng SweetAlert
    Swal.fire({
      title: "Xóa đại biểu?",
      text: "Hành động này không thể hoàn tác!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e74c3c",
      cancelButtonColor: "#95a5a6",
      confirmButtonText: "Xóa",
      cancelButtonText: "Hủy",
    }).then(async (result) => {
      if (result.isConfirmed) {
        await deleteDoc(doc(db, "delegates", id));
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "Đã xóa đại biểu!",
          showConfirmButton: false,
          timer: 1500,
        });
      }
    });
  }

  cancelBtn.addEventListener("click", () => {
    form.reset();
    idInput.value = "";
    formTitle.textContent = "Thêm Đại biểu mới";
    cancelBtn.style.display = "none";
  });

  // --- TAB 2: CẬP NHẬT GHẾ ---
  window.updateSeat = async function (id) {
    const seatValue = document
      .getElementById(`seat-${id}`)
      .value.trim()
      .toUpperCase();
    try {
      await updateDoc(doc(db, "delegates", id), { seat: seatValue });
      const btn = document.querySelector(`.btn-update[data-id="${id}"]`);
      const oldBg = btn.style.background;
      btn.style.background = "#27ae60";
      btn.textContent = "Đã lưu";
      setTimeout(() => {
        btn.style.background = oldBg;
        btn.textContent = "Cập nhật";
      }, 1500);
    } catch (error) {
      console.error("Lỗi:", error);
    }
  };

  // --- XÓA TOÀN BỘ GHẾ ---
  const clearAllBtn = document.getElementById("clear-all-seats");
  if (clearAllBtn) {
    clearAllBtn.addEventListener("click", () => {
      // Thông báo xác nhận Xóa toàn bộ ghế bằng SweetAlert
      Swal.fire({
        title: "Xóa toàn bộ vị trí?",
        text: "Sơ đồ sẽ bị làm trống hoàn toàn (danh sách đại biểu vẫn giữ nguyên).",
        icon: "error",
        showCancelButton: true,
        confirmButtonColor: "#c0392b",
        cancelButtonColor: "#95a5a6",
        confirmButtonText: "Đồng ý xóa",
        cancelButtonText: "Hủy thao tác",
      }).then(async (result) => {
        if (result.isConfirmed) {
          clearAllBtn.style.background = "#c0392b";
          clearAllBtn.textContent = "⏳ Đang xóa...";
          const batchPromises = [];
          currentDelegates.forEach((del) => {
            if (del.seat && del.seat.trim() !== "") {
              batchPromises.push(
                updateDoc(doc(db, "delegates", del.id), { seat: "" }),
              );
            }
          });
          try {
            await Promise.all(batchPromises);
            Swal.fire(
              "Thành công!",
              "Đã làm trống toàn bộ vị trí ghế.",
              "success",
            );
          } catch (error) {
            console.error(error);
            Swal.fire("Lỗi", "Đã xảy ra lỗi khi xóa ghế!", "error");
          }
          clearAllBtn.style.background = "#e74c3c";
          clearAllBtn.textContent = "🗑️ Xóa toàn bộ ghế";
        }
      });
    });
  }
});
