BẢN MỞ RỘNG: QUẢN TRỊ CÁN BỘ + LỊCH CÁ NHÂN

1. Giữ nguyên file:
   js/firebase.js

2. Chép các file mới vào dự án:
   index.html
   admin.html
   lichcanhan.html
   css/style.css
   js/app.js
   js/admin.js
   js/personal.js

3. Trong Firebase Firestore Rules, thêm quyền cho collection canbo:

rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /lichcongtac/{document} {
      allow read, create, update, delete: if true;
    }

    match /canbo/{document} {
      allow read, create, update, delete: if true;
    }
  }
}

4. Cách sử dụng:
   - Mở admin.html để thêm cán bộ.
   - Quay lại index.html, ô Cán bộ thực hiện sẽ có danh sách.
   - Mở lichcanhan.html, chọn cán bộ để xem lịch cá nhân.

5. Tương thích lịch cũ:
   - Lịch cũ có trường nguoiThucHien vẫn tiếp tục hiển thị.
   - Khi sửa lịch cũ, hệ thống cố gắng ghép tên với danh sách cán bộ.
