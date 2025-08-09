// script.js - PHIÊN BẢN CUỐI CÙNG - SỬA LỖI TRA CỨU MÃ GHẾ

document.addEventListener("DOMContentLoaded", () => {
  // =======================================================================
  // 1. KHAI BÁO BIẾN VÀ CẤU HÌNH
  // =======================================================================
  const apiUrl =
    "https://script.google.com/macros/s/AKfycbyRmKLSovYomChGDJB_OcNGOM8kDEfJ5Xs79Eplki0YAVMlRc5vOxKdHs5Pd5wgjiIe0w/exec?type=sodo";
  const btnKhaiMac = document.getElementById("btnKhaiMac");
  const btnBeMac = document.getElementById("btnBeMac");
  const mainTitle = document.querySelector("h1");
  const tooltip = document.getElementById("tooltip");
  const tooltipImage = document.getElementById("tooltip-image");
  const tooltipName = document.getElementById("tooltip-name");
  const tooltipTitle = document.getElementById("tooltip-title");
  const tooltipDetails = document.getElementById("tooltip-details");
  const tooltipSeatIdEl = document.getElementById("tooltip-seat-id");
  // ✅ CẬP NHẬT LẠI BIẾN NÀY
  const seatingAreas = {
    t1: {
      left: document.getElementById("seating-chart-t1-left"),
      middle: document.getElementById("seating-chart-t1-middle"),
      right: document.getElementById("seating-chart-t1-right"),
    },
    t2: {
      continental: document.getElementById("seating-chart-t2-continental"),
    },
    t3: {
      continental: document.getElementById("seating-chart-t3-continental"),
    },
  };
  const legendContainer = document.querySelector(".legend-grid-container");

  // Cấu hình sơ đồ ghế (giữ nguyên)
  const seatLayoutConfigsT1 = {
    V1: {
      // Hàng A được định nghĩa lại hoàn toàn
      rowLabel: "V1",
      sections: {
        left: [
          { type: "seat", label: 27, prefix: "T1L" },
          { type: "seat", label: 25, prefix: "T1L" },
          { type: "seat", label: 23, prefix: "T1L" },
          { type: "seat", label: 21, prefix: "T1L" },
          { type: "seat", label: 19, prefix: "T1L" },
          { type: "spacer", count: 1 }, // <-- Lối đi giữa ghế 19 và 17
          { type: "seat", label: 17, prefix: "T1L" },
          { type: "seat", label: 15, prefix: "T1L" },
          { type: "seat", label: 13, prefix: "T1L" },
          { type: "seat", label: 11, prefix: "T1L" },
          { type: "seat", label: 9, prefix: "T1L" },
        ],
        middle: [
          { type: "seat", label: 7, prefix: "T1M" },
          { type: "seat", label: 5, prefix: "T1M" },
          { type: "seat", label: 3, prefix: "T1M" },
          { type: "seat", label: 1, prefix: "T1M" },
          { type: "spacer", count: 1 }, // <-- Lối đi giữa ghế 1 và 2
          { type: "seat", label: 2, prefix: "T1M" },
          { type: "seat", label: 4, prefix: "T1M" },
          { type: "seat", label: 6, prefix: "T1M" },
          { type: "seat", label: 8, prefix: "T1M" },
        ],
        right: [
          { type: "seat", label: 10, prefix: "T1R" },
          { type: "seat", label: 12, prefix: "T1R" },
          { type: "seat", label: 14, prefix: "T1R" },
          { type: "seat", label: 16, prefix: "T1R" },
          { type: "seat", label: 18, prefix: "T1R" },
          { type: "spacer", count: 1 }, // <-- Lối đi giữa ghế 18 và 20
          { type: "seat", label: 20, prefix: "T1R" },
          { type: "seat", label: 22, prefix: "T1R" },
          { type: "seat", label: 24, prefix: "T1R" },
          { type: "seat", label: 26, prefix: "T1R" },
          { type: "seat", label: 28, prefix: "T1R" },
        ],
      },
    },
    V2: {
      // Hàng B được cập nhật lại lối đi
      rowLabel: "V2",
      sections: {
        left: [
          { type: "seat", label: 29, prefix: "T1L" },
          { type: "seat", label: 27, prefix: "T1L" },
          { type: "seat", label: 25, prefix: "T1L" },
          { type: "seat", label: 23, prefix: "T1L" },
          { type: "seat", label: 21, prefix: "T1L" },
          { type: "spacer", count: 1 }, // <-- Lối đi giữa ghế 21 và 19
          { type: "seat", label: 19, prefix: "T1L" },
          { type: "seat", label: 17, prefix: "T1L" },
          { type: "seat", label: 15, prefix: "T1L" },
          { type: "seat", label: 13, prefix: "T1L" },
          { type: "seat", label: 11, prefix: "T1L" },
        ],
        middle: [
          { type: "seat", label: 9, prefix: "T1M" },
          { type: "seat", label: 7, prefix: "T1M" },
          { type: "seat", label: 5, prefix: "T1M" },
          { type: "seat", label: 3, prefix: "T1M" },
          { type: "seat", label: 1, prefix: "T1M" },
          { type: "spacer", count: 1 }, // Lối đi giữa ghế 1 và 2 (giữ nguyên)
          { type: "seat", label: 2, prefix: "T1M" },
          { type: "seat", label: 4, prefix: "T1M" },
          { type: "seat", label: 6, prefix: "T1M" },
          { type: "seat", label: 8, prefix: "T1M" },
          { type: "seat", label: 10, prefix: "T1M" },
        ],
        right: [
          { type: "seat", label: 12, prefix: "T1R" },
          { type: "seat", label: 14, prefix: "T1R" },
          { type: "seat", label: 16, prefix: "T1R" },
          { type: "seat", label: 18, prefix: "T1R" },
          { type: "seat", label: 20, prefix: "T1R" },
          { type: "spacer", count: 1 }, // <-- Lối đi giữa ghế 20 và 22
          { type: "seat", label: 22, prefix: "T1R" },
          { type: "seat", label: 24, prefix: "T1R" },
          { type: "seat", label: 26, prefix: "T1R" },
          { type: "seat", label: 28, prefix: "T1R" },
          { type: "seat", label: 30, prefix: "T1R" },
        ],
      },
    },
    A: {
      // Hàng C được định nghĩa lại để TẠO KHOẢNG TRỐNG
      rowLabel: "A",
      sections: {
        left: [
          { type: "seat", label: 33, prefix: "T1L" },
          { type: "seat", label: 31, prefix: "T1L" },
          { type: "seat", label: 29, prefix: "T1L" },
          { type: "seat", label: 27, prefix: "T1L" },
          { type: "seat", label: 25, prefix: "T1L" },
          { type: "seat", label: 23, prefix: "T1L" },
          { type: "seat", label: 21, prefix: "T1L" },
          { type: "seat", label: 19, prefix: "T1L" },
          { type: "seat", label: 17, prefix: "T1L" },
          { type: "seat", label: 15, prefix: "T1L" },
          { type: "spacer", count: 2 }, // <-- Chỗ này tạo khoảng trống cho ghế 17, 15
        ],
        middle: [
          // Dãy giữa giữ nguyên
          { type: "seat", label: 13, prefix: "T1M" },
          { type: "seat", label: 11, prefix: "T1M" },
          { type: "seat", label: 9, prefix: "T1M" },
          { type: "seat", label: 7, prefix: "T1M" },
          { type: "seat", label: 5, prefix: "T1M" },
          { type: "seat", label: 3, prefix: "T1M" },
          { type: "seat", label: 1, prefix: "T1M" },
          { type: "seat", label: 2, prefix: "T1M" },
          { type: "seat", label: 4, prefix: "T1M" },
          { type: "seat", label: 6, prefix: "T1M" },
          { type: "seat", label: 8, prefix: "T1M" },
          { type: "seat", label: 10, prefix: "T1M" },
          { type: "seat", label: 12, prefix: "T1M" },
          { type: "seat", label: 14, prefix: "T1M" },
        ],
        right: [
          { type: "spacer", count: 2 }, // <-- Chỗ này tạo khoảng trống cho ghế 16, 18
          { type: "seat", label: 16, prefix: "T1R" },
          { type: "seat", label: 18, prefix: "T1R" },
          { type: "seat", label: 20, prefix: "T1R" },
          { type: "seat", label: 22, prefix: "T1R" },
          { type: "seat", label: 24, prefix: "T1R" },
          { type: "seat", label: 26, prefix: "T1R" },
          { type: "seat", label: 28, prefix: "T1R" },
          { type: "seat", label: 30, prefix: "T1R" },
          { type: "seat", label: 32, prefix: "T1R" },
          { type: "seat", label: 34, prefix: "T1R" },
        ],
      },
    },
    B: {
      // Hàng D được định nghĩa lại để TẠO KHOẢNG TRỐNG
      rowLabel: "B",
      sections: {
        left: [
          { type: "seat", label: 31, prefix: "T1L" },
          { type: "seat", label: 29, prefix: "T1L" },
          { type: "seat", label: 27, prefix: "T1L" },
          { type: "seat", label: 25, prefix: "T1L" },
          { type: "seat", label: 23, prefix: "T1L" },
          { type: "seat", label: 21, prefix: "T1L" },
          { type: "seat", label: 19, prefix: "T1L" },
          { type: "seat", label: 17, prefix: "T1L" },
          { type: "spacer", count: 2 }, // <-- Chỗ này tạo khoảng trống cho ghế 19, 17
        ],
        middle: [
          // Dãy giữa giữ nguyên
          { type: "seat", label: 15, prefix: "T1M" },
          { type: "seat", label: 13, prefix: "T1M" },
          { type: "seat", label: 11, prefix: "T1M" },
          { type: "seat", label: 9, prefix: "T1M" },
          { type: "seat", label: 7, prefix: "T1M" },
          { type: "seat", label: 5, prefix: "T1M" },
          { type: "seat", label: 3, prefix: "T1M" },
          { type: "seat", label: 1, prefix: "T1M" },
          { type: "seat", label: 2, prefix: "T1M" },
          { type: "seat", label: 4, prefix: "T1M" },
          { type: "seat", label: 6, prefix: "T1M" },
          { type: "seat", label: 8, prefix: "T1M" },
          { type: "seat", label: 10, prefix: "T1M" },
          { type: "seat", label: 12, prefix: "T1M" },
          { type: "seat", label: 14, prefix: "T1M" },
          { type: "seat", label: 16, prefix: "T1M" },
        ],
        right: [
          { type: "spacer", count: 2 }, // <-- Chỗ này tạo khoảng trống cho ghế 18, 20
          { type: "seat", label: 18, prefix: "T1R" },
          { type: "seat", label: 20, prefix: "T1R" },
          { type: "seat", label: 22, prefix: "T1R" },
          { type: "seat", label: 24, prefix: "T1R" },
          { type: "seat", label: 26, prefix: "T1R" },
          { type: "seat", label: 28, prefix: "T1R" },
          { type: "seat", label: 30, prefix: "T1R" },
          { type: "seat", label: 32, prefix: "T1R" },
        ],
      },
    },
    C: {
      rowLabel: "C",
      physicalSeatsInDiagram: { left: 11, middle: 17, right: 11 },
      middleOverall1AtPos: 9,
      maxOddOverallLeft: 39,
      maxEvenOverallRight: 40,
    },
    D: {
      rowLabel: "D",
      physicalSeatsInDiagram: { left: 12, middle: 18, right: 12 },
      middleOverall1AtPos: 9,
      maxOddOverallLeft: 41,
      maxEvenOverallRight: 42,
    },
    E: {
      rowLabel: "E",
      physicalSeatsInDiagram: { left: 13, middle: 18, right: 13 },
      middleOverall1AtPos: 9,
      maxOddOverallLeft: 43,
      maxEvenOverallRight: 44,
    },
    F: {
      rowLabel: "F",
      physicalSeatsInDiagram: { left: 13, middle: 19, right: 13 },
      middleOverall1AtPos: 10,
      maxOddOverallLeft: 45,
      maxEvenOverallRight: 46,
    },
    G: {
      rowLabel: "G",
      physicalSeatsInDiagram: { left: 12, middle: 20, right: 13 },
      middleOverall1AtPos: 10,
      maxOddOverallLeft: 43,
      maxEvenOverallRight: 46,
    },
    H: {
      rowLabel: "H",
      physicalSeatsInDiagram: { left: 12, middle: 21, right: 12 },
      middleOverall1AtPos: 11,
      maxOddOverallLeft: 45,
      maxEvenOverallRight: 46,
    },
    I: {
      rowLabel: "I",
      physicalSeatsInDiagram: { left: 12, middle: 21, right: 13 },
      middleOverall1AtPos: 11,
      maxOddOverallLeft: 45,
      maxEvenOverallRight: 46,
    },
    K: {
      // Hàng L với khoảng trống ở giữa khu vực trung tâm
      rowLabel: "K",
      sections: {
        left: [
          // Dãy trái giữ nguyên

          { type: "seat", label: 33, prefix: "T1L" },
          { type: "seat", label: 31, prefix: "T1L" },
          { type: "spacer", count: 1 },
          { type: "seat", label: 29, prefix: "T1L" },
          { type: "seat", label: 27, prefix: "T1L" },
          { type: "seat", label: 25, prefix: "T1L" },
          { type: "seat", label: 23, prefix: "T1L" },
        ],
        middle: [
          // Vế trái: 11 ghế, đánh số lẻ từ 1 đến 21
          { type: "seat", label: 21, prefix: "T1M" },
          { type: "seat", label: 19, prefix: "T1M" },
          { type: "seat", label: 17, prefix: "T1M" },
          { type: "seat", label: 15, prefix: "T1M" },
          { type: "seat", label: 13, prefix: "T1M" },
          { type: "seat", label: 11, prefix: "T1M" },
          { type: "seat", label: 9, prefix: "T1M" },
          { type: "seat", label: 7, prefix: "T1M" },
          { type: "seat", label: 5, prefix: "T1M" },
          { type: "seat", label: 3, prefix: "T1M" },
          { type: "seat", label: 1, prefix: "T1M" },
          { type: "seat", label: 2, prefix: "T1M" },

          // Khoảng trống rộng bằng 2 ghế, nằm giữa ghế 1 và 2
          { type: "spacer", count: 2 },

          // Vế phải: 10 ghế, đánh số chẵn từ 2 đến 20

          { type: "seat", label: 4, prefix: "T1M" },
          { type: "seat", label: 6, prefix: "T1M" },
          { type: "spacer", count: 2 },
          { type: "seat", label: 8, prefix: "T1M" },
          { type: "seat", label: 10, prefix: "T1M" },
          { type: "seat", label: 12, prefix: "T1M" },
          { type: "seat", label: 14, prefix: "T1M" },
          { type: "seat", label: 16, prefix: "T1M" },
          { type: "seat", label: 18, prefix: "T1M" },
          { type: "seat", label: 20, prefix: "T1M" },
          { type: "seat", label: 22, prefix: "T1M" },
        ],
        right: [
          // Dãy phải giữ nguyên
          { type: "seat", label: 24, prefix: "T1R" },
          { type: "seat", label: 26, prefix: "T1R" },
          { type: "seat", label: 28, prefix: "T1R" },
          { type: "seat", label: 30, prefix: "T1R" },
          { type: "spacer", count: 1 },
          { type: "seat", label: 32, prefix: "T1R" },
          { type: "seat", label: 34, prefix: "T1R" },
        ],
      },
    },
    L: {
      // Hàng M được định nghĩa lại theo cấu trúc mới
      rowLabel: "L",
      sections: {
        left: [
          { type: "seat", label: 25, prefix: "T1L" },
          { type: "seat", label: 23, prefix: "T1L" },
          { type: "spacer", count: 1 },
          { type: "seat", label: 21, prefix: "T1L" },
          { type: "seat", label: 19, prefix: "T1L" },
        ], // Không có ghế ở khu vực bên trái
        middle: [
          // Vế bên trái
          { type: "seat", label: 17, prefix: "T1L" },
          { type: "seat", label: 15, prefix: "T1L" },
          { type: "seat", label: 13, prefix: "T1L" },
          { type: "seat", label: 11, prefix: "T1L" },
          { type: "seat", label: 9, prefix: "T1M" },
          { type: "seat", label: 7, prefix: "T1M" },
          { type: "seat", label: 5, prefix: "T1M" },
          { type: "seat", label: 3, prefix: "T1M" },
          { type: "seat", label: 1, prefix: "T1M" },

          // Khoảng trống ở giữa
          { type: "spacer", count: 7 },

          // Vế bên phải
          { type: "seat", label: 2, prefix: "T1M" },
          { type: "seat", label: 4, prefix: "T1M" },
          { type: "seat", label: 6, prefix: "T1M" },
          { type: "seat", label: 8, prefix: "T1M" },
          { type: "seat", label: 10, prefix: "T1M" },
          { type: "seat", label: 12, prefix: "T1M" },
          { type: "seat", label: 14, prefix: "T1M" },
          { type: "seat", label: 16, prefix: "T1M" },
          { type: "spacer", count: 1 },
        ],
        right: [
          { type: "seat", label: 18, prefix: "T1R" },
          { type: "seat", label: 20, prefix: "T1R" },
          { type: "spacer", count: 1 },
          { type: "seat", label: 22, prefix: "T1R" },
          { type: "seat", label: 24, prefix: "T1R" },
        ], // Không có ghế ở khu vực bên phải
      },
    },
    M: {
      // Hàng N mới thêm
      rowLabel: "M",
      sections: {
        left: [], // Không có ghế ở khu vực bên trái
        middle: [
          // Vế bên trái (9 ghế)
          { type: "seat", label: 17, prefix: "T1M" },
          { type: "seat", label: 15, prefix: "T1M" },
          { type: "seat", label: 13, prefix: "T1M" },
          { type: "seat", label: 11, prefix: "T1M" },
          { type: "seat", label: 9, prefix: "T1M" },
          { type: "seat", label: 7, prefix: "T1M" },
          { type: "seat", label: 5, prefix: "T1M" },
          { type: "seat", label: 3, prefix: "T1M" },
          { type: "seat", label: 1, prefix: "T1M" },

          // Khoảng trống ở giữa
          { type: "spacer", count: 7 },

          // Vế bên phải (9 ghế)
          { type: "seat", label: 2, prefix: "T1M" },
          { type: "seat", label: 4, prefix: "T1M" },
          { type: "seat", label: 6, prefix: "T1M" },
          { type: "seat", label: 8, prefix: "T1M" },
          { type: "seat", label: 10, prefix: "T1M" },
          { type: "seat", label: 12, prefix: "T1M" },
          { type: "seat", label: 14, prefix: "T1M" },
          { type: "seat", label: 16, prefix: "T1M" },
          { type: "seat", label: 18, prefix: "T1M" },
        ],
        right: [], // Không có ghế ở khu vực bên phải
      },
    },
  };

  // ✅ SỬA LỖI: conconst -> const và sắp xếp lại hàng ghế
  const seatLayoutConfigsT2 = {
    N: {
      rowLabel: "N",
      items: [
        { type: "group", seats: 2 },
        { type: "spacer", count: 1 },
        { type: "group", seats: 12 },
        { type: "spacer", count: 1 },
        { type: "group", seats: 22 },
        { type: "spacer", count: 1 },
        { type: "group", seats: 11 },
        { type: "spacer", count: 1 },
        { type: "group", seats: 2 },
      ],
    },
    O: {
      rowLabel: "O",
      items: [
        { type: "group", seats: 2 },
        { type: "spacer", count: 1 },
        { type: "group", seats: 12 },
        { type: "spacer", count: 1 },
        { type: "group", seats: 25 },
        { type: "spacer", count: 1 },
        { type: "group", seats: 12 },
        { type: "group", seats: 2 },
      ],
    },
    P: {
      rowLabel: "P",
      items: [
        { type: "group", seats: 8 },
        { type: "spacer", count: 1 },
        { type: "group", seats: 5 },
        { type: "spacer", count: 1 },
        { type: "group", seats: 8 },
        { type: "spacer", count: 1 },
        { type: "group", seats: 8 },
        { type: "spacer", count: 1 },
        { type: "group", seats: 8 },
        { type: "spacer", count: 1 },
        { type: "group", seats: 5 },
        { type: "spacer", count: 1 },
        { type: "group", seats: 8 },
      ],
    },
  };
  const seatLayoutConfigsT3 = {
    Q: {
      rowLabel: "Q",
      items: [
        { type: "group", seats: 2 },
        { type: "spacer", count: 1 },
        { type: "group", seats: 13 },
        { type: "spacer", count: 1 },
        { type: "group", seats: 24 },
        { type: "spacer", count: 1 },
        { type: "group", seats: 13 },
        { type: "group", seats: 2 },
      ],
    },
    R: {
      rowLabel: "R",
      items: [
        { type: "group", seats: 14 },
        { type: "spacer", count: 1 },
        { type: "group", seats: 7 },
        { type: "spacer", count: 1 },
        { type: "group", seats: 8 },
        { type: "spacer", count: 1 },
        { type: "group", seats: 7 },
        { type: "spacer", count: 1 },
        { type: "group", seats: 14 },
      ],
    },
  };
  const legendConfigs = {
    khaiMac: {
      thuongtruc: "Thường trực Tỉnh ủy",
      banthuongvu: "Ủy viên BTV Tỉnh ủy",
      coquandang: "Đảng bộ CQ Đảng",
      ubndtinh: "Đảng bộ UBND tỉnh",
      congan: "Đảng bộ Công an",
      quandoi: "Đảng bộ Bộ CHQS",
      xaphuong1: "Đảng bộ xã, phường 1",
      xaphuong2: "Đảng bộ xã, phường 2",
      xaphuong3: "Đảng bộ xã, phường 3",
      xaphuong4: "Đảng bộ xã, phường 4",
      daibieumoi: "Đại biểu TW, tỉnh bạn",
      nguyenthuongtruc: "Nguyên Thường trực TU",
      ntv_congan: "Nguyên BTV - Công an",
      ntv_quandoi: "Nguyên BTV - Quân đội",
      ntv_bandang: "Nguyên BTV - Ban Đảng",
      ntv_thanhuy: "Nguyên BTV - Thành ủy",
      nguyenlanhdaohd: "Nguyên Lãnh đạo HĐ, QH",
      nguyenlanhdaoub: "Nguyên Lãnh đạo UBND",
      nguyenthuongtruchdbt: "Nguyên TT HĐND, Bí thư đảng bộ",
      meVN: "Anh hùng, Mẹ VNAH",
      thuky: "Thư ký",
      uyvienubkt: "Ủy viên UBKT",
    },
    beMac: {
      daibieumoi: "Đại biểu Trung ương",
      banthuongvu: "Ủy viên BTV Tỉnh ủy",
      coquandang: "Đảng bộ CQ Đảng",
      ubndtinh: "Đảng bộ UBND tỉnh",
      congan: "Đảng bộ Công an",
      quandoi: "Đảng bộ Bộ CHQS",
      thutruongdonvi: "Thủ trưởng đơn vị",
      uyvienubkt: "Ủy viên UBKT",
      xaphuong1: "Đảng bộ xã, phường 1",
      xaphuong2: "Đảng bộ xã, phường 2",
      xaphuong3: "Đảng bộ xã, phường 3",
      xaphuong4: "Đảng bộ xã, phường 4",
    },
  };

  // =======================================================================
  // 2. CÁC HÀM XỬ LÝ DỮ LIỆU ĐỘNG (CODE MỚI)
  // =======================================================================
  const donViToStatusMap = {
    "Thường trực Tỉnh ủy": "thuongtruc",
    "Ủy viên BTV Tỉnh ủy": "banthuongvu",
    "Nguyên Thường trực TU": "nguyenthuongtruc",
    "Đại biểu Trung ương, tỉnh bạn": "daibieumoi",
    "Nguyên Lãnh đạo HĐ, QH": "nguyenlanhdaohd",
    "Nguyên Lãnh đạo UBND": "nguyenlanhdaoub",
    "Nguyên TT HĐND, Bí thư đảng bộ": "nguyenthuongtruchdbt",
    "Anh hùng, Mẹ VNAH": "meVN",
    "Đảng bộ các cơ quan Đảng tỉnh": "coquandang",
    "Đảng bộ UBND tỉnh": "ubndtinh",
    "Đảng bộ Công an": "congan",
    "Đảng bộ Quân sự": "quandoi",
    "Thư ký": "thuky",
    "Thủ trưởng đơn vị": "thutruongdonvi",
    "Ủy viên UBKT": "uyvienubkt",
    "Xã, phường 1A": "xaphuong1a",
    "Xã, phường 1B": "xaphuong1b",
    "Xã, phường 2A": "xaphuong2a",
    "Xã, phường 2B": "xaphuong2b",
    "Xã, phường 3A": "xaphuong3a",
    "Xã, phường 3B": "xaphuong3b",
    "Xã, phường 4A": "xaphuong4a",
    "Xã, phường 4B": "xaphuong4b",
    "Nguyên Ủy viên BTV - Công an": "ntv_congan",
    "Nguyên Ủy viên BTV - Quân đội": "ntv_quandoi",
    "Nguyên Ủy viên BTV - Ban Đảng": "ntv_bandang",
    "Nguyên Ủy viên BTV - Thành ủy": "ntv_thanhuy",
  };
  /* function getStatusFromDonVi(donVi) {
    for (const key in donViToStatusMap) {
      if (donVi.includes(key)) {
        return donViToStatusMap[key];
      }
    }
    return "daibieumoi";
  }
  */
  function getStatusFromDonVi(groupName) {
    // Đổi tên tham số cho rõ ràng
    if (!groupName) return "daibieumoi"; // Trả về mặc định nếu không có tên nhóm
    for (const key in donViToStatusMap) {
      if (groupName.includes(key)) {
        // Sử dụng groupName để so sánh
        return donViToStatusMap[key];
      }
    }
    return "daibieumoi"; // Mặc định nếu không tìm thấy
  }

  /**
   * Chuẩn hóa mã ghế từ Sheet (A17 -> A-17) và chuyển đổi dữ liệu
   */
  /**
   * Chuẩn hóa mã ghế từ Sheet và chuyển đổi dữ liệu
   * ✅ ĐÃ SỬA LỖI: Cập nhật để xử lý mã hàng ghế V1, V2
   */
  function transformData(delegates) {
    const allSeatData = { khaiMac: [], beMac: [] };

    const normalizeSeatCode = (code) => {
      if (!code || typeof code !== "string") return null;
      let normalized = code.trim().toUpperCase();

      // Nếu mã ghế đã có dấu gạch ngang thì giữ nguyên, không xử lý
      if (normalized.includes("-")) {
        return normalized;
      }

      // Ưu tiên xử lý cho hàng V1 và V2 trước
      if (normalized.startsWith("V1")) {
        const seatNumber = normalized.substring(2); // Lấy phần số ghế sau "V1"
        return `V1-${seatNumber}`;
      }
      if (normalized.startsWith("V2")) {
        const seatNumber = normalized.substring(2); // Lấy phần số ghế sau "V2"
        return `V2-${seatNumber}`;
      }

      // Xử lý cho các hàng chữ cái đơn cũ (A, B, C...)
      if (normalized.length > 1) {
        const firstChar = normalized.charAt(0);
        if (firstChar >= "A" && firstChar <= "Z") {
          const seatNumber = normalized.substring(1); // Lấy phần số ghế sau ký tự đầu
          return `${firstChar}-${seatNumber}`;
        }
      }

      // Nếu không khớp định dạng nào, trả về mã gốc để tránh lỗi
      return normalized;
    };

    delegates.forEach((delegate) => {
      const status = getStatusFromDonVi(delegate.nhomDonVi || delegate.donVi);
      const khaiMacSeat = normalizeSeatCode(delegate.viTriKhaiMac);
      if (khaiMacSeat) {
        allSeatData.khaiMac.push({
          id: khaiMacSeat,
          name: delegate.hoTen,
          title: delegate.donVi,
          details: `Tổ thảo luận: ${delegate.toThaoLuan || "N/A"}`,
          status: status,
          image: "",
        });
      }

      const beMacSeat = normalizeSeatCode(delegate.viTriPhienKhac);
      if (beMacSeat) {
        allSeatData.beMac.push({
          id: beMacSeat,
          name: delegate.hoTen,
          title: delegate.donVi,
          details: `Tổ thảo luận: ${delegate.toThaoLuan || "N/A"}`,
          status: status,
          image: "",
        });
      }
    });
    return allSeatData;
  }

  // =======================================================================
  // 3. CÁC HÀM TIỆN ÍCH VÀ HÀM VẼ (CÓ THAY ĐỔI)
  // =======================================================================
  function calculateFloor1Seats(config) {
    let total = 0;
    for (const rowKey in config) {
      const row = config[rowKey];

      // Cách đếm cũ cho các hàng C, D, E...
      if (row.physicalSeatsInDiagram) {
        total += row.physicalSeatsInDiagram.left || 0;
        total += row.physicalSeatsInDiagram.middle || 0;
        total += row.physicalSeatsInDiagram.right || 0;
      }
      // ✅ Cập nhật: Thêm cách đếm mới cho các hàng A, B, L, M, N
      else if (row.sections) {
        if (row.sections.left && Array.isArray(row.sections.left)) {
          total += row.sections.left.filter(
            (item) => item.type === "seat"
          ).length;
        }
        if (row.sections.middle && Array.isArray(row.sections.middle)) {
          total += row.sections.middle.filter(
            (item) => item.type === "seat"
          ).length;
        }
        if (row.sections.right && Array.isArray(row.sections.right)) {
          total += row.sections.right.filter(
            (item) => item.type === "seat"
          ).length;
        }
      }
    }
    return total;
  }

  // ✅ THAY THẾ HÀM CŨ: Hàm mới để đếm ghế cho tầng 2 và 3
  function calculateSeatsContinental(config) {
    let total = 0;
    for (const rowKey in config) {
      const row = config[rowKey];
      if (row.items && Array.isArray(row.items)) {
        row.items.forEach((item) => {
          if (item.type === "group") {
            total += item.seats || 0;
          }
        });
      }
    }
    return total;
  }
  // ✅ CẬP NHẬT ĐỂ GỌI ĐÚNG HÀM MỚI
  const t1Seats = calculateFloor1Seats(seatLayoutConfigsT1);
  const t2Seats = calculateSeatsContinental(seatLayoutConfigsT2); // Gọi hàm mới
  const t3Seats = calculateSeatsContinental(seatLayoutConfigsT3); // Gọi hàm mới
  document.getElementById("t1-seat-count").innerText = t1Seats;
  document.getElementById("t2-seat-count").innerText = t2Seats;
  document.getElementById("t3-seat-count").innerText = t3Seats;
  // Tính tổng số ghế
  const totalSeatsAllFloors = t1Seats + t2Seats + t3Seats;
  // Hiển thị tổng số ghế ra màn hình
  document.getElementById(
    "total-seat-count-display"
  ).innerText = `Tổng số ghế: ${totalSeatsAllFloors}`;
  function createSpacerDiv(seatEquivalent = 1) {
    const spacer = document.createElement("div");
    spacer.classList.add("seat-spacer");
    let seatWidth = 28,
      individualSeatMargin = 2.5,
      seatHeight = 28;
    const exampleSeat = document.querySelector(".seat");
    if (exampleSeat) {
      const seatElementStyle = window.getComputedStyle(exampleSeat);
      seatWidth = parseFloat(seatElementStyle.width) || seatWidth;
      individualSeatMargin = parseFloat(seatElementStyle.marginLeft);
      seatHeight = parseFloat(seatElementStyle.height) || seatHeight;
      spacer.style.marginLeft = `${individualSeatMargin}px`;
      spacer.style.marginRight = `${individualSeatMargin}px`;
    } else {
      spacer.style.margin = `${individualSeatMargin}px`;
    }
    spacer.style.width = `${seatEquivalent * seatWidth}px`;
    spacer.style.height = `${seatHeight}px`;
    return spacer;
  }
  function calculateContinentalLabels(config) {
    if (
      !config ||
      !config.physicalSeatsInDiagram ||
      typeof config.physicalSeatsInDiagram.middle === "undefined"
    ) {
      return { left: [], middle: [], right: [] };
    }
    if (
      typeof config.middleOverall1AtPos === "undefined" &&
      config.physicalSeatsInDiagram.middle > 0
    ) {
      return { left: [], middle: [], right: [] };
    }
    const { physicalSeatsInDiagram, middleOverall1AtPos, maxOddOverallLeft } =
      config;
    let maxEvenOverallRight = config.maxEvenOverallRight;
    const rowParts = { left: [], middle: [], right: [] };
    let firstOddForLeftBlockNeeded = 1;
    let firstEvenForRightBlockNeeded = 2;
    const middleTotalPhysicalSeats = physicalSeatsInDiagram.middle;
    if (middleTotalPhysicalSeats > 0) {
      if (middleTotalPhysicalSeats % 2 !== 0) {
        const seatsToLeftOf1 = middleOverall1AtPos - 1;
        for (let j = seatsToLeftOf1; j >= 1; j--)
          rowParts.middle.push(2 * j + 1);
        rowParts.middle.push(1);
        firstOddForLeftBlockNeeded =
          seatsToLeftOf1 > 0 &&
          rowParts.middle.length > 0 &&
          typeof rowParts.middle[0] === "number"
            ? rowParts.middle[0] + 2
            : 3;
        const seatsToRightOf1 = middleTotalPhysicalSeats - middleOverall1AtPos;
        let lastEvenInMiddle = 0;
        for (let i = 0; i < seatsToRightOf1; i++) {
          const evenNum = 2 + i * 2;
          rowParts.middle.push(evenNum);
          lastEvenInMiddle = evenNum;
        }
        firstEvenForRightBlockNeeded =
          seatsToRightOf1 > 0 ? lastEvenInMiddle + 2 : 2;
      } else {
        const leftPartCountInMiddle = middleOverall1AtPos;
        const rightPartCountInMiddle =
          middleTotalPhysicalSeats - leftPartCountInMiddle;
        if (leftPartCountInMiddle > 0) {
          for (let i = 0; i < leftPartCountInMiddle; i++)
            rowParts.middle.push(1 + (leftPartCountInMiddle - 1 - i) * 2);
          firstOddForLeftBlockNeeded =
            rowParts.middle.length > 0 && rowParts.middle[0] !== undefined
              ? rowParts.middle[0] + 2
              : 3;
        } else {
          firstOddForLeftBlockNeeded = 1;
        }
        let lastEvenInMiddle = 0;
        if (rightPartCountInMiddle > 0) {
          for (let i = 0; i < rightPartCountInMiddle; i++) {
            const evenNum = 2 + i * 2;
            rowParts.middle.push(evenNum);
            lastEvenInMiddle = evenNum;
          }
          firstEvenForRightBlockNeeded = lastEvenInMiddle + 2;
        } else {
          firstEvenForRightBlockNeeded = 2;
        }
      }
    }
    const leftSeatsCount = physicalSeatsInDiagram.left || 0;
    if (
      maxOddOverallLeft !== undefined &&
      leftSeatsCount > 0 &&
      maxOddOverallLeft > 0
    ) {
      for (let i = 0; i < leftSeatsCount; i++) {
        const oddLabel = maxOddOverallLeft - i * 2;
        if (
          oddLabel < firstOddForLeftBlockNeeded &&
          rowParts.left.length < leftSeatsCount
        )
          break;
        rowParts.left.push(oddLabel);
      }
      rowParts.left.sort((a, b) => b - a);
    }
    const rightSeatsCount = physicalSeatsInDiagram.right || 0;
    if (
      maxEvenOverallRight !== undefined &&
      rightSeatsCount > 0 &&
      maxEvenOverallRight > 0
    ) {
      for (
        let currentEven = firstEvenForRightBlockNeeded;
        currentEven <= maxEvenOverallRight;
        currentEven += 2
      ) {
        if (rowParts.right.length >= rightSeatsCount) break;
        rowParts.right.push(currentEven);
      }
    }
    return rowParts;
  }
  // ✅ HÀM ĐẾM MỚI ĐỂ GỘP NHÓM A/B
  function countCombinedSeatTypes(seatData) {
    if (!seatData) return {};
    const accumulator = {};
    seatData.forEach((currentSeat) => {
      let status = currentSeat.status;
      // Nếu status là nhóm xã phường (ví dụ: xaphuong1a), gộp nó về nhóm chính (xaphuong1)
      if (status.startsWith("xaphuong") && /[ab]$/.test(status)) {
        status = status.slice(0, -1);
      }
      accumulator[status] = (accumulator[status] || 0) + 1;
    });
    return accumulator;
  }

  /**
   * SỬA LỖI TẠI ĐÂY: Hàm createSeatDiv giờ sẽ nhận vào một map tra cứu
   * để tìm thông tin ghế một cách hiệu quả.
   */
  function createSeatDiv(displayText, fullSeatId, activeSeatMap) {
    const seatDiv = document.createElement("div");
    seatDiv.classList.add("seat");
    seatDiv.textContent = displayText;
    seatDiv.dataset.id = fullSeatId;

    // Tách mã ghế đầy đủ (T1L-A-17) thành mã ghế đơn giản (A-17) để tra cứu
    const parts = fullSeatId.split("-");
    const simpleSeatId = `${parts[parts.length - 2]}-${
      parts[parts.length - 1]
    }`;

    const seatInfo = activeSeatMap.get(simpleSeatId);

    if (seatInfo && seatInfo.status) {
      seatDiv.classList.add(seatInfo.status);
    } else {
      seatDiv.classList.add("available");
    }
    return seatDiv;
  }
  function renderSeatsForFloor(
    floorConfigObj,
    rowOrder,
    targetLeft,
    targetMiddle,
    targetRight,
    floorPrefix,
    activeSeatMap
  ) {
    if (!targetLeft || !targetMiddle || !targetRight) return;

    targetLeft.innerHTML = "";
    targetMiddle.innerHTML = "";
    targetRight.innerHTML = "";

    rowOrder.forEach((rowKey) => {
      const config = floorConfigObj[rowKey];
      if (!config) return;

      const leftRowEl = document.createElement("div");
      leftRowEl.classList.add("seat-row");
      const middleRowEl = document.createElement("div");
      middleRowEl.classList.add("seat-row");
      const rightRowEl = document.createElement("div");
      rightRowEl.classList.add("seat-row");

      const leftLabel = document.createElement("div");
      leftLabel.classList.add("row-label");
      const rightLabel = document.createElement("div");
      rightLabel.classList.add("row-label");

      rightRowEl.appendChild(rightLabel);

      leftLabel.innerHTML = "&nbsp;";
      rightLabel.innerHTML = "&nbsp;";

      let hasLeftSeats = false;
      let hasMiddleSeats = false;
      let hasRightSeats = false;

      const populateSeatBlockFromItems = (items, targetRow, defaultPrefix) => {
        if (items && items.length > 0) {
          items.forEach((item) => {
            if (item.type === "seat") {
              const fullPrefix = item.prefix || defaultPrefix;
              targetRow.appendChild(
                createSeatDiv(
                  item.label,
                  `${fullPrefix}-${config.rowLabel}-${item.label}`,
                  activeSeatMap
                )
              );
            } else if (item.type === "spacer") {
              targetRow.appendChild(createSpacerDiv(item.count));
            }
          });
          return true;
        }
        return false;
      };

      if (config.sections) {
        hasLeftSeats = populateSeatBlockFromItems(
          config.sections.left,
          leftRowEl,
          `${floorPrefix}L`
        );
        hasRightSeats = populateSeatBlockFromItems(
          config.sections.right,
          rightRowEl,
          `${floorPrefix}R`
        );

        // Xử lý khu vực giữa phức tạp
        if (config.sections.middle) {
          if (
            config.sections.middle.type === "continental_middle_from_config"
          ) {
            const middleDetailConfig = {
              physicalSeatsInDiagram: { middle: 0, left: 0, right: 0 },
              middleOverall1AtPos: 1,
              ...config.sections.middle.configData,
            };
            const middleLabels =
              calculateContinentalLabels(middleDetailConfig).middle;
            const middleItems = middleLabels.map((label) => ({
              type: "seat",
              label,
              prefix: config.sections.middle.prefix,
            }));
            hasMiddleSeats = populateSeatBlockFromItems(
              middleItems,
              middleRowEl,
              `${floorPrefix}M`
            );
          } else {
            hasMiddleSeats = populateSeatBlockFromItems(
              config.sections.middle,
              middleRowEl,
              `${floorPrefix}M`
            );
          }
        }
        // BỔ SUNG LOGIC CHO TẦNG 2 (HÀNG O, P)
        else if (config.middleBlockDetailConfig) {
          const seatLabelsByPart = calculateContinentalLabels(
            config.middleBlockDetailConfig
          );
          const middleItems = seatLabelsByPart.middle.map((l) => ({
            type: "seat",
            label: l,
          }));
          hasMiddleSeats = populateSeatBlockFromItems(
            middleItems,
            middleRowEl,
            `${floorPrefix}M`
          );
        }
      } else {
        // Xử lý các hàng cấu hình kiểu cũ (E, F, G, H...)
        const seatLabelsByPart = calculateContinentalLabels(config);
        const leftItems = seatLabelsByPart.left.map((l) => ({
          type: "seat",
          label: l,
        }));
        const middleItems = seatLabelsByPart.middle.map((l) => ({
          type: "seat",
          label: l,
        }));
        const rightItems = seatLabelsByPart.right.map((l) => ({
          type: "seat",
          label: l,
        }));

        hasLeftSeats = populateSeatBlockFromItems(
          leftItems,
          leftRowEl,
          `${floorPrefix}L`
        );
        hasMiddleSeats = populateSeatBlockFromItems(
          middleItems,
          middleRowEl,
          `${floorPrefix}M`
        );
        hasRightSeats = populateSeatBlockFromItems(
          rightItems,
          rightRowEl,
          `${floorPrefix}R`
        );
      }

      if (hasLeftSeats || hasMiddleSeats) {
        leftLabel.textContent = config.rowLabel;
      }
      if (hasRightSeats || hasMiddleSeats) {
        rightLabel.textContent = config.rowLabel;
      }

      leftRowEl.appendChild(leftLabel);

      targetLeft.appendChild(leftRowEl);
      targetMiddle.appendChild(middleRowEl);
      targetRight.appendChild(rightRowEl);
    });
  }

  /**
   * ✅ HÀM NÂNG CẤP: Vẽ sơ đồ cho các tầng liền khối có cấu trúc linh hoạt
   * Đọc cấu hình 'items' để vẽ cả nhóm ghế và khoảng trống.
   */
  function renderContinentalFloor(
    floorConfigObj,
    rowOrder,
    targetContainer,
    floorPrefix,
    activeSeatMap
  ) {
    if (!targetContainer) return;

    targetContainer.innerHTML = ""; // Xóa sơ đồ cũ

    rowOrder.forEach((rowKey) => {
      const config = floorConfigObj[rowKey];
      // Kiểm tra xem có 'items' không
      if (!config || !config.items || !Array.isArray(config.items)) return;

      const rowEl = document.createElement("div");
      rowEl.classList.add("seat-row", "continental-row");

      // Thêm nhãn tên hàng vào bên trái
      const leftLabel = document.createElement("div");
      leftLabel.classList.add("row-label");
      leftLabel.textContent = config.rowLabel;
      rowEl.appendChild(leftLabel);

      let seatCounter = 1; // Biến đếm để đánh số ghế tuần tự

      // Lặp qua cấu trúc 'items' của hàng
      config.items.forEach((item) => {
        if (item.type === "group" && item.seats > 0) {
          // Nếu là một nhóm ghế, tạo ra các ghế
          for (let i = 0; i < item.seats; i++) {
            const seatNumber = seatCounter;
            const fullSeatId = `${floorPrefix}-${config.rowLabel}-${seatNumber}`;

            const seatDiv = createSeatDiv(
              seatNumber,
              fullSeatId,
              activeSeatMap
            );
            rowEl.appendChild(seatDiv);
            seatCounter++; // Tăng biến đếm
          }
        } else if (item.type === "spacer" && item.count > 0) {
          // Nếu là khoảng trống, tạo ra spacer
          // Hàm createSpacerDiv đã có sẵn từ code tầng 1
          const spacerDiv = createSpacerDiv(item.count);
          rowEl.appendChild(spacerDiv);
        }
      });

      // Thêm nhãn tên hàng vào bên phải
      const rightLabel = document.createElement("div");
      rightLabel.classList.add("row-label");
      rightLabel.textContent = config.rowLabel;
      rowEl.appendChild(rightLabel);

      targetContainer.appendChild(rowEl);
    });
  }
  function setupTooltips(activeSeatMap) {
    const allSeats = document.querySelectorAll(".seating-section .seat");
    allSeats.forEach((seat) => {
      seat.addEventListener("mouseenter", function (event) {
        const fullSeatId = this.dataset.id;

        // Tách mã ghế đầy đủ thành mã ghế đơn giản để tra cứu
        const parts = fullSeatId.split("-");
        const simpleSeatId = `${parts[parts.length - 2]}-${
          parts[parts.length - 1]
        }`;
        const seatInfo = activeSeatMap.get(simpleSeatId);

        tooltipName.textContent = (seatInfo && seatInfo.name) || "Ghế Trống";
        tooltipTitle.textContent = (seatInfo && seatInfo.title) || "";
        tooltipDetails.textContent = (seatInfo && seatInfo.details) || "";
        tooltipSeatIdEl.textContent = fullSeatId;
        if (seatInfo && seatInfo.image && seatInfo.image !== "") {
          tooltipImage.src = seatInfo.image;
          tooltipImage.style.display = "block";
        } else {
          tooltipImage.src = "";
          tooltipImage.style.display = "none";
        }
        tooltip.style.display = "block";
        const seatRect = this.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;
        let newTop = seatRect.top + scrollY - tooltipRect.height - 10;
        let newLeft =
          seatRect.left + scrollX + seatRect.width / 2 - tooltipRect.width / 2;
        if (newTop < scrollY + 5) {
          newTop = seatRect.bottom + scrollY + 10;
        }
        if (newTop + tooltipRect.height > scrollY + window.innerHeight - 5) {
          newTop = scrollY + 5;
        }
        if (newLeft < scrollX + 5) {
          newLeft = scrollX + 5;
        }
        if (newLeft + tooltipRect.width > scrollX + window.innerWidth - 5) {
          newLeft = scrollX + window.innerWidth - tooltipRect.width - 5;
        }
        tooltip.style.left = `${newLeft}px`;
        tooltip.style.top = `${newTop}px`;
      });
      seat.addEventListener("mouseleave", () => {
        tooltip.style.display = "none";
      });
    });
  }

  // ✅ HÀM CẬP NHẬT CHÚ THÍCH ĐÃ SỬA ĐỔI
  function updateLegendWithCounts(seatData, viewKey) {
    if (!legendContainer) return;
    const currentLegendConfig = legendConfigs[viewKey];
    if (!currentLegendConfig) {
      console.error(`Không tìm thấy cấu hình chú thích cho view: ${viewKey}`);
      legendContainer.innerHTML = "Lỗi tải chú thích.";
      return;
    }
    // Sử dụng hàm đếm mới
    const seatCounts = countCombinedSeatTypes(seatData);
    legendContainer.innerHTML = "";

    for (const status in currentLegendConfig) {
      const text = currentLegendConfig[status];
      const count = seatCounts[status] || 0;
      let swatchHTML = "";

      // Nếu là nhóm xã phường, hiển thị cả 2 màu A và B
      if (status.startsWith("xaphuong")) {
        swatchHTML = `<span class="seat ${status}a"></span><span class="seat ${status}b"></span>`;
      } else {
        swatchHTML = `<span class="seat ${status}"></span>`;
      }

      // Chú ý: class="legend-swatches" được thêm vào
      const legendItemHTML = `<div><div class="legend-swatches">${swatchHTML}</div> ${text} (${count} ghế)</div>`;
      legendContainer.insertAdjacentHTML("beforeend", legendItemHTML);
    }
  }

  // =======================================================================
  // 4. HÀM CHÍNH ĐỂ ĐIỀU KHIỂN & KHỞI TẠO (ĐƯỢC CẬP NHẬT)
  // =======================================================================
  function switchView(viewKey, allSeatData, allSeatMaps) {
    const activeData = allSeatData[viewKey];
    const activeSeatMap = allSeatMaps[viewKey];

    const assignedSeatDisplay = document.getElementById(
      "assigned-seat-count-display"
    );
    if (assignedSeatDisplay) {
      const assignedCount = activeData.length;
      assignedSeatDisplay.textContent = `Tổng số đại biểu, khách mời: ${assignedCount}`;
    }

    if (!activeData || !activeSeatMap) {
      console.error(`Không tìm thấy dữ liệu cho view: ${viewKey}`);
      return;
    }

    const titleText = viewKey === "khaiMac" ? "PHIÊN KHAI MẠC" : "PHIÊN KHÁC";
    mainTitle.textContent = `SƠ ĐỒ BỐ TRÍ CHỖ NGỒI ${titleText}`;
    if (viewKey === "khaiMac") {
      btnKhaiMac.classList.add("active");
      btnBeMac.classList.remove("active");
    } else {
      btnBeMac.classList.add("active");
      btnKhaiMac.classList.remove("active");
    }

    // Xóa sơ đồ cũ
    document
      .querySelectorAll(".seating-section")
      .forEach((sec) => (sec.innerHTML = ""));

    // === ✅ PHẦN THAY ĐỔI LOGIC VẼ SƠ ĐỒ ===

    // 1. Vẽ Tầng 1 (dạng 3 khu)
    const rowOrderT1 = [
      "V1",
      "V2",
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "I",
      "K",
      "L",
      "M",
    ];
    renderSeatsForFloor(
      seatLayoutConfigsT1,
      rowOrderT1,
      seatingAreas.t1.left,
      seatingAreas.t1.middle,
      seatingAreas.t1.right,
      "T1",
      activeSeatMap
    );

    // 2. Vẽ Tầng 2 (dạng liền khối)
    const rowOrderT2 = ["N", "O", "P"];
    renderContinentalFloor(
      seatLayoutConfigsT2,
      rowOrderT2,
      seatingAreas.t2.continental,
      "T2",
      activeSeatMap
    );

    // 3. Vẽ Tầng 3 (dạng liền khối)
    const rowOrderT3 = ["Q", "R"];
    renderContinentalFloor(
      seatLayoutConfigsT3,
      rowOrderT3,
      seatingAreas.t3.continental,
      "T3",
      activeSeatMap
    );

    updateLegendWithCounts(activeData, viewKey);
    setupTooltips(activeSeatMap);
  }
  // ✅ HÀM KHỞI TẠO ĐÃ ĐƯỢC NÂNG CẤP LÊN FETCH
  function initializeApp() {
    mainTitle.textContent = "ĐANG TẢI DỮ LIỆU SƠ ĐỒ...";

    fetch(apiUrl) // Sử dụng fetch hiện đại
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Lỗi HTTP! Trạng thái: ${response.status}`);
        }
        return response.json();
      })
      .then((apiData) => {
        if (!apiData || !apiData.delegates) {
          throw new Error('Dữ liệu API không có "delegates"');
        }

        const allSeatData = transformData(apiData.delegates);

        // Tạo map để tra cứu nhanh
        const allSeatMaps = {
          khaiMac: new Map(allSeatData.khaiMac.map((d) => [d.id, d])),
          beMac: new Map(allSeatData.beMac.map((d) => [d.id, d])),
        };

        btnKhaiMac.addEventListener("click", () =>
          switchView("khaiMac", allSeatData, allSeatMaps)
        );
        btnBeMac.addEventListener("click", () =>
          switchView("beMac", allSeatData, allSeatMaps)
        );

        // Tải view mặc định
        switchView("khaiMac", allSeatData, allSeatMaps);
      })
      .catch((error) => {
        console.error("Lỗi nghiêm trọng khi khởi tạo ứng dụng:", error);
        mainTitle.textContent = "LỖI TẢI DỮ LIỆU";
        alert(
          "Không thể tải dữ liệu sơ đồ ghế ngồi. Vui lòng kiểm tra lại đường truyền hoặc cấu hình API."
        );
      });
  }

  initializeApp();
});
