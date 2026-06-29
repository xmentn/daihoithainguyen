import { db } from "./firebase-config.js";
import {
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

window.updateData = async (e) => {
  e.preventDefault();

  const chinhLyDaXong = parseFloat(
    document.getElementById("input-cl-xong").value,
  );
  const chinhLyConLai = parseFloat(
    document.getElementById("input-cl-conlai").value,
  );
  const soHoaDaScan = parseInt(document.getElementById("input-sh-scan").value);
  const soHoaChuanHoa = parseInt(
    document.getElementById("input-sh-chuanhoa").value,
  );

  try {
    // Cập nhật tài liệu "current_state" trong bộ sưu tập "progress"
    await updateDoc(doc(db, "progress", "current_state"), {
      chinhLyDaXong,
      chinhLyConLai,
      soHoaDaScan,
      soHoaChuanHoa,
      lastUpdated: new Date(),
    });
    alert("Cập nhật số liệu thành công!");
  } catch (error) {
    alert("Lỗi cập nhật: " + error.message);
  }
};
