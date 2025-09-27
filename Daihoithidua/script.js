// script.js - PHIÊN BẢN ĐƠN GIẢN HÓA, BỎ CHỨC NĂNG CHUYỂN ĐỔI PHIÊN

document.addEventListener("DOMContentLoaded", () => {
  // =======================================================================
  // 1. KHAI BÁO BIẾN
  // =======================================================================
  let selectedDelegatesSeats = [];
  const allSeatElementsMap = new Map();
  const apiUrl =
    "https://script.google.com/macros/s/AKfycbx_l8tywltp23EowgIhP_OrIOFeeT34WMjrQpDCvOsY4W3orl3Q42SlaeOFj4GtUIzddQ/exec";

  const mainTitle = document.querySelector("h1.main-title");
  const tooltip = document.getElementById("tooltip");
  const tooltipImage = document.getElementById("tooltip-image");
  const tooltipName = document.getElementById("tooltip-name");
  const tooltipTitle = document.getElementById("tooltip-title");
  const tooltipDetails = document.getElementById("tooltip-details");
  const tooltipSeatIdEl = document.getElementById("tooltip-seat-id");
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

  // >>> PHẦN CẤU HÌNH SƠ ĐỒ GHẾ (SEAT LAYOUT CONFIGS) - KHÔNG THAY ĐỔI <<<
  const seatLayoutConfigsT1 = {
    V1: {
      rowLabel: "V1",
      sections: {
        left: [
          { type: "seat", label: 27, prefix: "T1L" },
          { type: "seat", label: 25, prefix: "T1L" },
          { type: "seat", label: 23, prefix: "T1L" },
          { type: "seat", label: 21, prefix: "T1L" },
          { type: "seat", label: 19, prefix: "T1L" },
          { type: "spacer", count: 1 },
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
          { type: "spacer", count: 1 },
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
          { type: "spacer", count: 1 },
          { type: "seat", label: 20, prefix: "T1R" },
          { type: "seat", label: 22, prefix: "T1R" },
          { type: "seat", label: 24, prefix: "T1R" },
          { type: "seat", label: 26, prefix: "T1R" },
          { type: "seat", label: 28, prefix: "T1R" },
        ],
      },
    },
    V2: {
      rowLabel: "V2",
      sections: {
        left: [
          { type: "seat", label: 29, prefix: "T1L" },
          { type: "seat", label: 27, prefix: "T1L" },
          { type: "seat", label: 25, prefix: "T1L" },
          { type: "seat", label: 23, prefix: "T1L" },
          { type: "seat", label: 21, prefix: "T1L" },
          { type: "spacer", count: 1 },
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
          { type: "spacer", count: 1 },
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
          { type: "spacer", count: 1 },
          { type: "seat", label: 22, prefix: "T1R" },
          { type: "seat", label: 24, prefix: "T1R" },
          { type: "seat", label: 26, prefix: "T1R" },
          { type: "seat", label: 28, prefix: "T1R" },
          { type: "seat", label: 30, prefix: "T1R" },
        ],
      },
    },
    A: {
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
          { type: "spacer", count: 2 },
        ],
        middle: [
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
          { type: "spacer", count: 2 },
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
          { type: "spacer", count: 2 },
        ],
        middle: [
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
          { type: "spacer", count: 2 },
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
      middleOverall1AtPos: 11,
      maxOddOverallLeft: 45,
      maxEvenOverallRight: 44,
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
      physicalSeatsInDiagram: { left: 12, middle: 22, right: 12 },
      middleOverall1AtPos: 11,
      maxOddOverallLeft: 45,
      maxEvenOverallRight: 46,
    },
    K: {
      rowLabel: "K",
      sections: {
        left: [
          { type: "seat", label: 33, prefix: "T1L" },
          { type: "seat", label: 31, prefix: "T1L" },
          { type: "spacer", count: 1 },
          { type: "seat", label: 29, prefix: "T1L" },
          { type: "seat", label: 27, prefix: "T1L" },
          { type: "seat", label: 25, prefix: "T1L" },
          { type: "seat", label: 23, prefix: "T1L" },
          { type: "spacer", count: 2.3 },
        ],
        middle: [
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
          { type: "spacer", count: 1.7 },
          { type: "seat", label: 4, prefix: "T1M" },
          { type: "seat", label: 6, prefix: "T1M" },
          { type: "spacer", count: 1.7 },
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
          { type: "spacer", count: 2.3 },
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
      rowLabel: "L",
      sections: {
        left: [
          { type: "seat", label: 25, prefix: "T1L" },
          { type: "seat", label: 23, prefix: "T1L" },
          { type: "spacer", count: 1 },
          { type: "seat", label: 21, prefix: "T1L" },
          { type: "seat", label: 19, prefix: "T1L" },
          { type: "spacer", count: 4.7 },
        ],
        middle: [
          { type: "seat", label: 17, prefix: "T1L" },
          { type: "seat", label: 15, prefix: "T1L" },
          { type: "seat", label: 13, prefix: "T1L" },
          { type: "seat", label: 11, prefix: "T1L" },
          { type: "seat", label: 9, prefix: "T1M" },
          { type: "seat", label: 7, prefix: "T1M" },
          { type: "seat", label: 5, prefix: "T1M" },
          { type: "seat", label: 3, prefix: "T1M" },
          { type: "seat", label: 1, prefix: "T1M" },
          { type: "spacer", count: 8.7 },
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
          { type: "spacer", count: 4.7 },
          { type: "seat", label: 18, prefix: "T1R" },
          { type: "seat", label: 20, prefix: "T1R" },
          { type: "spacer", count: 1 },
          { type: "seat", label: 22, prefix: "T1R" },
          { type: "seat", label: 24, prefix: "T1R" },
        ],
      },
    },
    M: {
      rowLabel: "M",
      sections: {
        left: [],
        middle: [
          { type: "seat", label: 17, prefix: "T1M" },
          { type: "seat", label: 15, prefix: "T1M" },
          { type: "seat", label: 13, prefix: "T1M" },
          { type: "seat", label: 11, prefix: "T1M" },
          { type: "seat", label: 9, prefix: "T1M" },
          { type: "seat", label: 7, prefix: "T1M" },
          { type: "seat", label: 5, prefix: "T1M" },
          { type: "seat", label: 3, prefix: "T1M" },
          { type: "seat", label: 1, prefix: "T1M" },
          { type: "spacer", count: 8.7 },
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
        right: [],
      },
    },
  };
  const seatLayoutConfigsT2 = {
    N: {
      rowLabel: "N",
      items: [
        { type: "group", seats: 2 },
        { type: "spacer", count: 1 },
        { type: "group", seats: 12 },
        { type: "spacer", count: 1 },
        { type: "group", seats: 11 },
        { type: "center_marker" },
        { type: "group", seats: 11 },
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
        { type: "group", seats: 13 },
        { type: "center_marker" },
        { type: "group", seats: 12 },
        { type: "spacer", count: 1 },
        { type: "group", seats: 12 },
        { type: "spacer", count: 1 },
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
        { type: "group", seats: 4 },
        { type: "center_marker" },
        { type: "group", seats: 4 },
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
        { type: "group", seats: 12 },
        { type: "center_marker" },
        { type: "group", seats: 12 },
        { type: "spacer", count: 1 },
        { type: "group", seats: 13 },
        { type: "spacer", count: 1 },
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
        { type: "group", seats: 4 },
        { type: "center_marker" },
        { type: "group", seats: 4 },
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
      thuongvu: "Ủy viên BTV Tỉnh ủy",
      daibieu_vip: "Đại biểu V1",
      cothiduachinhphu: "Cờ thi đua Chính phủ",
      hiephoidoanhnghiep: "Hiệp hội Doanh nghiệp",
      daibieu_vip2: "Đại biểu V2",
      lanhdaosonganh: "Lãnh đạo các sở, ngành",
      bithuchutichxa: "Bí thư, Chủ tịch xã, phường",
      nguyenthuongtruc: "Nguyên Thường trực TU",
      huanchuonglaodong1: "Huân chương Lao động (đợt 1)",
      huanchuonglaodong2: "Huân chương Lao động (đợt 2)",
      bangkhenthutuong: "Bằng khen Thủ tuóng",
      tongiao: "Chức sắc tôn giáo",
      meVN: "Anh hùng, Mẹ VNAH",
    },
    beMac: {
      daibieumoi: "Đại biểu Trung ương",
      banthuongvu: "Ủy viên BTV Tỉnh ủy",
      ubndtinh: "Đảng bộ UBND tỉnh",
      congan: "Đảng bộ Công an",
      quandoi: "Đảng bộ Bộ CHQS",
    },
  };
  const donViToStatusMap = {
    "Thường trực Tỉnh ủy": "thuongtruc",
    "Ủy viên BTV Tỉnh ủy": "thuongvu",
    "Đại biểu V1": "daibieu_vip",
    "Nguyên Thường trực TU": "nguyenthuongtruc",
    "Đại biểu V2": "daibieu_vip2",
    "Lãnh đạo các sở, ngành": "lanhdaosonganh",
    "Huân chương Lao động (đợt 1)": "huanchuonglaodong1",
    "Huân chương Lao động (đợt 2)": "huanchuonglaodong2",
    "Bằng khen Thủ tuóng": "bangkhenthutuong",
    "Hiệp hội Doanh nghiệp": "hiephoidoanhnghiep",
    "Chức sắc tôn giáo": "tongiao",
    "Anh hùng, Mẹ VNAH": "meVN",
    "Cờ thi đua Chính phủ": "cothiduachinhphu",
    "Bí thư, Chủ tịch xã, phường": "bithuchutichxa",
  };

  // =======================================================================
  // 2. CÁC HÀM TIỆN ÍCH, TÍNH TOÁN VÀ XỬ LÝ DỮ LIỆU
  // =======================================================================

  function getStatusFromDonVi(groupName) {
    if (!groupName) return "daibieumoi";
    for (const key in donViToStatusMap) {
      if (groupName.includes(key)) {
        return donViToStatusMap[key];
      }
    }
    return "daibieumoi";
  }
  function normalizeSeatCode(code) {
    if (!code || typeof code !== "string") return null;
    let normalized = code.trim().toUpperCase();
    if (normalized.includes("-")) {
      return normalized;
    }
    if (normalized.startsWith("V1") || normalized.startsWith("V2")) {
      const prefix = normalized.substring(0, 2);
      const number = normalized.substring(2);
      return `${prefix}-${number}`;
    }
    if (normalized.length > 1) {
      const firstChar = normalized.charAt(0);
      if (firstChar >= "A" && firstChar <= "Z") {
        const seatNumber = normalized.substring(1);
        return `${firstChar}-${seatNumber}`;
      }
    }
    return normalized;
  }

  function transformData(danhsach) {
    return danhsach
      .map((delegate) => {
        const status = getStatusFromDonVi(delegate.nhomDonVi || delegate.donVi);
        const seatCode = normalizeSeatCode(delegate.viTri);

        if (seatCode) {
          return {
            id: seatCode,
            name: delegate.hoTen,
            title: delegate.donVi,
            status: status,
            image: "",
          };
        }
        return null;
      })
      .filter(Boolean);
  }

  function calculateFloor1Seats(config) {
    let total = 0;
    for (const rowKey in config) {
      const row = config[rowKey];
      if (row.physicalSeatsInDiagram) {
        total += row.physicalSeatsInDiagram.left || 0;
        total += row.physicalSeatsInDiagram.middle || 0;
        total += row.physicalSeatsInDiagram.right || 0;
      } else if (row.sections) {
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

  // =======================================================================
  // 3. CÁC HÀM VẼ SƠ ĐỒ VÀ GIAO DIỆN
  // =======================================================================

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
  function countCombinedSeatTypes(seatData) {
    if (!seatData) return {};
    const accumulator = {};
    seatData.forEach((currentSeat) => {
      let status = currentSeat.status;
      if (status.startsWith("xaphuong") && /[ab]$/.test(status)) {
        status = status.slice(0, -1);
      }
      accumulator[status] = (accumulator[status] || 0) + 1;
    });
    return accumulator;
  }
  function createSeatDiv(displayText, fullSeatId, activeSeatMap) {
    const seatDiv = document.createElement("div");
    seatDiv.classList.add("seat");
    seatDiv.textContent = displayText;
    const parts = fullSeatId.split("-");
    const simpleSeatId = `${parts[parts.length - 2]}-${
      parts[parts.length - 1]
    }`;
    seatDiv.dataset.id = simpleSeatId;
    const seatInfo = activeSeatMap.get(simpleSeatId);
    if (seatInfo && seatInfo.status) {
      seatDiv.classList.add(seatInfo.status);
    } else {
      seatDiv.classList.add("available");
    }
    allSeatElementsMap.set(simpleSeatId, seatDiv);
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
        } else if (config.middleBlockDetailConfig) {
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
  function renderContinentalFloor(
    floorConfigObj,
    rowOrder,
    targetContainer,
    floorPrefix,
    activeSeatMap
  ) {
    if (!targetContainer) return;
    targetContainer.innerHTML = "";
    rowOrder.forEach((rowKey) => {
      const config = floorConfigObj[rowKey];
      if (!config || !config.items || !Array.isArray(config.items)) return;
      const rowEl = document.createElement("div");
      rowEl.classList.add("seat-row", "continental-row");
      let leftSideSeatsCount = 0;
      let rightSideSeatsCount = 0;
      let isLeftSideOfMarker = true;
      config.items.forEach((item) => {
        if (item.type === "group") {
          if (isLeftSideOfMarker) {
            leftSideSeatsCount += item.seats;
          } else {
            rightSideSeatsCount += item.seats;
          }
        } else if (
          item.type === "center_aisle" ||
          item.type === "center_marker"
        ) {
          isLeftSideOfMarker = false;
        }
      });
      const leftSideNumbers = [];
      for (let i = 0; i < leftSideSeatsCount; i++) {
        leftSideNumbers.push((leftSideSeatsCount - i) * 2 - 1);
      }
      const rightSideNumbers = [];
      for (let i = 0; i < rightSideSeatsCount; i++) {
        rightSideNumbers.push((i + 1) * 2);
      }
      const leftLabel = document.createElement("div");
      leftLabel.classList.add("row-label");
      leftLabel.textContent = config.rowLabel;
      rowEl.appendChild(leftLabel);
      isLeftSideOfMarker = true;
      let leftSeatIndex = 0;
      let rightSeatIndex = 0;
      config.items.forEach((item) => {
        if (item.type === "group" && item.seats > 0) {
          for (let i = 0; i < item.seats; i++) {
            let seatNumber;
            if (isLeftSideOfMarker) {
              seatNumber = leftSideNumbers[leftSeatIndex];
              leftSeatIndex++;
            } else {
              seatNumber = rightSideNumbers[rightSeatIndex];
              rightSeatIndex++;
            }
            const fullSeatId = `${floorPrefix}-${config.rowLabel}-${seatNumber}`;
            const seatDiv = createSeatDiv(
              seatNumber,
              fullSeatId,
              activeSeatMap
            );
            rowEl.appendChild(seatDiv);
          }
        } else if (item.type === "spacer" && item.count > 0) {
          rowEl.appendChild(createSpacerDiv(item.count));
        } else if (item.type === "center_aisle" && item.count > 0) {
          rowEl.appendChild(createSpacerDiv(item.count));
          isLeftSideOfMarker = false;
        } else if (item.type === "center_marker") {
          isLeftSideOfMarker = false;
        }
      });
      const rightLabel = document.createElement("div");
      rightLabel.classList.add("row-label");
      rightLabel.textContent = config.rowLabel;
      rowEl.appendChild(rightLabel);
      targetContainer.appendChild(rowEl);
    });
  }
  function setupTooltips(activeSeatMap) {
    const allSeats = document.querySelectorAll(".seating-section .seat");
    let activeTooltipSeat = null;

    const showTooltip = (seatElement) => {
      if (activeTooltipSeat && activeTooltipSeat !== seatElement) {
        tooltip.style.display = "none";
      }
      activeTooltipSeat = seatElement;
      const seatId = seatElement.dataset.id;
      if (!seatId) {
        return;
      }
      const seatInfo = activeSeatMap.get(seatId);
      tooltipName.textContent = (seatInfo && seatInfo.name) || "Ghế Trống";
      tooltipTitle.textContent = (seatInfo && seatInfo.title) || "";
      tooltipDetails.textContent = (seatInfo && seatInfo.details) || "";
      tooltipSeatIdEl.textContent = seatId;
      if (seatInfo && seatInfo.image && seatInfo.image !== "") {
        tooltipImage.src = seatInfo.image;
        tooltipImage.style.display = "block";
      } else {
        tooltipImage.src = "";
        tooltipImage.style.display = "none";
      }
      tooltip.style.display = "block";
      const seatRect = seatElement.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      let newTop = seatRect.top + scrollY - tooltipRect.height - 10;
      let newLeft =
        seatRect.left + scrollX + seatRect.width / 2 - tooltipRect.width / 2;
      if (newTop < scrollY + 5) {
        newTop = seatRect.bottom + scrollY + 10;
      }
      if (newLeft < scrollX + 5) {
        newLeft = scrollX + 5;
      }
      if (newLeft + tooltipRect.width > scrollX + window.innerWidth - 5) {
        newLeft = scrollX + window.innerWidth - tooltipRect.width - 5;
      }
      tooltip.style.left = `${newLeft}px`;
      tooltip.style.top = `${newTop}px`;
    };

    const hideTooltip = () => {
      tooltip.style.display = "none";
      activeTooltipSeat = null;
    };

    allSeats.forEach((seat) => {
      seat.addEventListener("mouseenter", (event) => {
        showTooltip(event.currentTarget);
      });
      seat.addEventListener("mouseleave", () => {
        hideTooltip();
      });
      seat.addEventListener("click", (event) => {
        event.stopPropagation();
        showTooltip(event.currentTarget);
      });
    });

    document.addEventListener("click", (event) => {
      if (
        tooltip.style.display === "block" &&
        !event.target.classList.contains("seat")
      ) {
        hideTooltip();
      }
    });
  }

  function updateLegendWithCounts(seatData) {
    if (!legendContainer) return;
    const currentLegendConfig = legendConfigs["khaiMac"];
    if (!currentLegendConfig) {
      console.error(`Không tìm thấy cấu hình chú thích`);
      legendContainer.innerHTML = "Lỗi tải chú thích.";
      return;
    }
    const seatCounts = countCombinedSeatTypes(seatData);
    legendContainer.innerHTML = "";
    for (const status in currentLegendConfig) {
      const text = currentLegendConfig[status];
      const count = seatCounts[status] || 0;
      let swatchHTML = "";
      if (status.startsWith("xaphuong")) {
        swatchHTML = `<span class="seat ${status}a"></span><span class="seat ${status}b"></span>`;
      } else {
        swatchHTML = `<span class="seat ${status}"></span>`;
      }
      const legendItemHTML = `<div><div class="legend-swatches">${swatchHTML}</div> ${text} (${count} ghế)</div>`;
      legendContainer.insertAdjacentHTML("beforeend", legendItemHTML);
    }
  }

  // =======================================================================
  // 4. HÀM CHÍNH ĐỂ ĐIỀU KHIỂN & KHỞI TẠO
  // =======================================================================

  function highlightSelectedSeats() {
    document.querySelectorAll(".seat.highlighted").forEach((seat) => {
      seat.classList.remove("highlighted");
    });
    if (selectedDelegatesSeats.length === 0) return;

    selectedDelegatesSeats.forEach((seatId) => {
      const seatElement = allSeatElementsMap.get(seatId);
      if (seatElement) {
        seatElement.classList.add("highlighted");
      }
    });
  }

  function renderSeatingChart(seatData, seatMap) {
    allSeatElementsMap.clear();

    const assignedSeatDisplay = document.getElementById(
      "assigned-seat-count-display"
    );
    if (assignedSeatDisplay) {
      assignedSeatDisplay.textContent = `Tổng số đại biểu, khách mời: ${seatData.length}`;
    }

    document
      .querySelectorAll(".seating-section")
      .forEach((sec) => (sec.innerHTML = ""));
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
      seatMap
    );

    const rowOrderT2 = ["N", "O", "P"];
    renderContinentalFloor(
      seatLayoutConfigsT2,
      rowOrderT2,
      seatingAreas.t2.continental,
      "T2",
      seatMap
    );

    const rowOrderT3 = ["Q", "R"];
    renderContinentalFloor(
      seatLayoutConfigsT3,
      rowOrderT3,
      seatingAreas.t3.continental,
      "T3",
      seatMap
    );

    updateLegendWithCounts(seatData);
    setupTooltips(seatMap);
    setTimeout(highlightSelectedSeats, 100);
  }

  function initializeApp() {
    // SỬA LỖI: Xóa dòng này để không ghi đè tiêu đề HTML
    // mainTitle.textContent = "ĐANG TẢI DỮ LIỆU SƠ ĐỒ...";
    fetch(apiUrl)
      .then((response) => response.json())
      .then((apiData) => {
        if (!apiData || !apiData.danhsach) {
          throw new Error("Dữ liệu API không hợp lệ hoặc thiếu 'danhsach'");
        }

        // SỬA LỖI: Xóa dòng này để không ghi đè tiêu đề HTML
        // mainTitle.textContent = "SƠ ĐỒ BỐ TRÍ CHỖ NGỒI";

        const t1Seats = calculateFloor1Seats(seatLayoutConfigsT1);
        const t2Seats = calculateSeatsContinental(seatLayoutConfigsT2);
        const t3Seats = calculateSeatsContinental(seatLayoutConfigsT3);
        document.getElementById("t1-seat-count").innerText = t1Seats;
        document.getElementById("t2-seat-count").innerText = t2Seats;
        document.getElementById("t3-seat-count").innerText = t3Seats;
        const totalSeatsAllFloors = t1Seats + t2Seats + t3Seats;
        document.getElementById(
          "total-seat-count-display"
        ).innerText = `Tổng số ghế: ${totalSeatsAllFloors}`;

        const allDelegates = apiData.danhsach || [];
        const seatData = transformData(allDelegates);
        const seatMap = new Map(seatData.map((d) => [d.id, d]));

        const urlParams = new URLSearchParams(window.location.search);
        const seatsQuery = urlParams.get("seats");

        if (seatsQuery) {
          const normalizedSeatsFromURL = new Set(
            seatsQuery.split(",").map((s) => normalizeSeatCode(s))
          );

          selectedDelegatesSeats = allDelegates
            .map((delegate) => normalizeSeatCode(delegate.viTri))
            .filter((seat) => normalizedSeatsFromURL.has(seat));
        }

        renderSeatingChart(seatData, seatMap);
      })
      .catch((error) => {
        console.error("Lỗi nghiêm trọng khi khởi tạo ứng dụng:", error);
        mainTitle.innerHTML = "LỖI TẢI DỮ LIỆU"; // Dùng innerHTML để nhất quán
        alert(
          "Không thể tải dữ liệu sơ đồ ghế ngồi. Vui lòng kiểm tra lại đường truyền hoặc cấu hình API."
        );
      });
  }
  initializeApp();
});
