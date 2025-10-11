// =================================================================
// KHAI BÁO BIẾN VÀ URL
// =================================================================

const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxfvE3oRILvgdQ7NSmU7m-UjRpyrrQ2qAUWud6qsSXDZg0n0sv9LV1cH40HJaBfa0eznA/exec";

let geojsonLayer;

// =================================================================
// KHỞI TẠO BẢN ĐỒ VÀ CÁC THÀNH PHẦN GIAO DIỆN
// =================================================================

const map = L.map("map").setView([21.68, 105.85], 10);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

const info = L.control({ position: "topright" });
info.onAdd = function (map) {
  this._div = L.DomUtil.create("div", "info-box");
  this.update();
  return this._div;
};

info.update = function (props) {
  let content = "<h4>Thông tin đơn vị</h4>";
  if (props && props.ten_xa) {
    const tenXa = props.ten_xa;
    const tongSo = props.tongSoDangVien || 0;
    const daCai = props.soDaCaiDat || 0;
    const tyLe = props.tyLeCaiDat;

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

// === BẮT ĐẦU THÊM CHÚ THÍCH (LEGEND) ===
const legend = L.control({ position: "bottomright" });

legend.onAdd = function (map) {
  const div = L.DomUtil.create("div", "info-box legend");
  const grades = [90, 50, 0];
  const labels = ["&ge; 90%", "50% &ndash; < 90%", "< 50%", "Chưa có dữ liệu"];
  const colors = ["#28a745", "#ffc107", "#dc3545", "#D3D3D3"];

  div.innerHTML = "<strong>Tỷ lệ cài đặt</strong><br>";

  for (let i = 0; i < grades.length; i++) {
    div.innerHTML +=
      '<i style="background:' + colors[i] + '"></i> ' + labels[i] + "<br>";
  }
  div.innerHTML += '<i style="background:' + colors[3] + '"></i> ' + labels[3];

  return div;
};

legend.addTo(map);
// === KẾT THÚC THÊM CHÚ THÍCH ===

// =================================================================
// CÁC HÀM XỬ LÝ DỮ LIỆU VÀ TƯƠNG TÁC BẢN ĐỒ
// =================================================================

function getColor(percentage) {
  if (percentage === undefined || percentage === null) {
    return "#D3D3D3";
  }
  if (percentage >= 90) {
    return "#28a745";
  }
  if (percentage >= 50) {
    return "#ffc107";
  }
  return "#dc3545";
}

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

function resetHighlight(e) {
  geojsonLayer.resetStyle(e.target);
  info.update();
}

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

Promise.all([
  fetch("thainguyen.geojson").then((res) => res.json()),
  fetch(`${SCRIPT_URL}?action=getDataCaiDat`).then((res) => res.json()),
])
  .then(([geojson, installationResult]) => {
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

    geojson.features.forEach((feature) => {
      const tenXa = feature.properties.ten_xa;
      const installInfo = dataMap.get(tenXa);

      if (installInfo) {
        Object.assign(feature.properties, installInfo);
      }
    });

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
toggleLabels();
