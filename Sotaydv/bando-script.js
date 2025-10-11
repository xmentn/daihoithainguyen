// =================================================================
// KHAI BÁO BIẾN VÀ URL
// =================================================================

// URL để lấy dữ liệu từ Google Sheet (giống như trong các file script khác)
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxfvE3oRILvgdQ7NSmU7m-UjRpyrrQ2qAUWud6qsSXDZg0n0sv9LV1cH40HJaBfa0eznA/exec";

let geojsonLayer; // Biến lưu trữ layer bản đồ

// =================================================================
// KHỞI TẠO BẢN ĐỒ VÀ CÁC THÀNH PHẦN GIAO DIỆN
// =================================================================

// 1. Khởi tạo bản đồ
const map = L.map("map").setView([21.68, 105.85], 10);

// 2. Thêm lớp bản đồ nền
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

// 3. Tạo ô thông tin tùy chỉnh
const info = L.control({ position: "topright" });
info.onAdd = function (map) {
  this._div = L.DomUtil.create("div", "info-box");
  this.update();
  return this._div;
};

// Cập nhật nội dung ô thông tin
info.update = function (props) {
  let content = "<h4>Thông tin đơn vị</h4>";
  if (props && props.ten_xa) {
    const tenXa = props.ten_xa;
    const tongSo = props.tongSoDangVien || 0;
    const daCai = props.soDaCaiDat || 0;
    const tyLe = props.tyLeCaiDat; // Lấy tỷ lệ đã tính sẵn

    content += `<b>${tenXa}</b><br/>`;

    if (tyLe !== undefined) {
      content += `Tỷ lệ cài đặt: <b>${tyLe.toFixed(1)}%</b><br/>`;
      content += `<span>(${daCai.toLocaleString(
        "vi-VN"
      )} / ${tongSo.toLocaleString("vi-VN")} ĐV)</span>`;
    } else {
      content += `<i>Chưa có dữ liệu cài đặt</i>`;
    }
  } else {
    content += "Di chuột lên một xã";
  }
  this._div.innerHTML = content;
};
info.addTo(map);

// =================================================================
// CÁC HÀM XỬ LÝ DỮ LIỆU VÀ TƯƠNG TÁC BẢN ĐỒ
// =================================================================

// 4. Hàm quyết định MÀU SẮC của xã dựa trên tỷ lệ cài đặt
function getColor(percentage) {
  if (percentage === undefined || percentage === null) {
    return "#D3D3D3"; // Màu xám cho các xã chưa có dữ liệu
  }
  if (percentage >= 90) {
    return "#28a745"; // Xanh lá cây
  }
  if (percentage >= 50) {
    return "#ffc107"; // Vàng
  }
  return "#dc3545"; // Đỏ
}

// 5. Hàm tạo kiểu (style) cho mỗi xã
function style(feature) {
  const tyLe = feature.properties.tyLeCaiDat;
  return {
    fillColor: getColor(tyLe),
    weight: 1,
    opacity: 1,
    color: "white",
    fillOpacity: 0.8,
  };
}

// 6. Hàm làm nổi bật xã khi di chuột vào
function highlightFeature(e) {
  const layer = e.target;
  layer.setStyle({
    weight: 3,
    color: "#666",
    dashArray: "",
    fillOpacity: 1,
  });
  layer.bringToFront();
  info.update(layer.feature.properties);
}

// 7. Hàm trả về kiểu cũ khi di chuột ra
function resetHighlight(e) {
  geojsonLayer.resetStyle(e.target);
  info.update();
}

// 8. Gán các sự kiện cho mỗi xã
function onEachFeature(feature, layer) {
  const tenXa = feature.properties.ten_xa || "";
  layer.bindTooltip(tenXa, {
    permanent: true,
    direction: "center",
    className: "commune-label",
  });
  layer.on({
    mouseover: highlightFeature,
    mouseout: resetHighlight,
  });
}

// =================================================================
// LUỒNG CHÍNH: TẢI DỮ LIỆU VÀ VẼ BẢN ĐỒ
// =================================================================

// Sử dụng Promise.all để tải đồng thời cả 2 nguồn dữ liệu
Promise.all([
  fetch("thainguyen.geojson").then((res) => res.json()),
  fetch(`${SCRIPT_URL}?action=getDataCaiDat`).then((res) => res.json()),
])
  .then(([geojson, installationResult]) => {
    // Xử lý dữ liệu cài đặt
    const installationData = installationResult.data;
    const dataMap = new Map();

    installationData.forEach((row) => {
      const tenDonVi = row[1];
      const tongSo = Number(row[2] || 0);
      const daCai = Number(row[3] || 0);
      const tyLe = tongSo > 0 ? (daCai / tongSo) * 100 : 0;

      dataMap.set(tenDonVi, {
        tongSoDangVien: tongSo,
        soDaCaiDat: daCai,
        tyLeCaiDat: tyLe,
      });
    });

    // Gắn dữ liệu cài đặt vào GeoJSON
    geojson.features.forEach((feature) => {
      const tenXa = feature.properties.ten_xa;
      const installInfo = dataMap.get(tenXa);

      if (installInfo) {
        // Gộp các thuộc tính tìm thấy vào properties của feature
        Object.assign(feature.properties, installInfo);
      }
    });

    // Vẽ bản đồ với dữ liệu đã được làm giàu
    geojsonLayer = L.geoJson(geojson, {
      style: style,
      onEachFeature: onEachFeature,
    }).addTo(map);
  })
  .catch((error) => {
    console.error("Lỗi nghiêm trọng khi tải dữ liệu:", error);
    alert(
      "Không thể tải dữ liệu cho bản đồ. Vui lòng kiểm tra lại kết nối và file Google Sheet."
    );
  });

// =================================================================
// CÁC HÀM PHỤ TRỢ (ẨN/HIỆN NHÃN)
// =================================================================

const ZOOM_THRESHOLD = 12;
function toggleLabels() {
  const currentZoom = map.getZoom();
  const mapContainer = document.getElementById("map");
  if (mapContainer) {
    if (currentZoom < ZOOM_THRESHOLD) {
      mapContainer.classList.add("labels-hidden");
    } else {
      mapContainer.classList.remove("labels-hidden");
    }
  }
}
map.on("zoomend", toggleLabels);
toggleLabels(); // Chạy lần đầu
