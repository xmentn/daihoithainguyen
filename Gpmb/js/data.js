export const PROVINCE = { id: 'TINH', name: 'Báo cáo cấp tỉnh', type: 'Tỉnh' };

export const UNITS = [
  { id: 'BAC_KAN', name: 'Phường Bắc Kạn', type: 'Phường' },
  { id: 'DUC_XUAN', name: 'Phường Đức Xuân', type: 'Phường' },
  { id: 'BANG_VAN', name: 'Xã Bằng Vân', type: 'Xã' },
  { id: 'CAM_GIANG', name: 'Xã Cẩm Giàng', type: 'Xã' },
  { id: 'NGAN_SON', name: 'Xã Ngân Sơn', type: 'Xã' },
  { id: 'NA_PHAC', name: 'Xã Nà Phặc', type: 'Xã' },
  { id: 'PHONG_QUANG', name: 'Xã Phong Quang', type: 'Xã' },
  { id: 'PHU_THONG', name: 'Xã Phủ Thông', type: 'Xã' },
  { id: 'THUONG_MINH', name: 'Xã Thượng Minh', type: 'Xã' },
  { id: 'THUONG_QUAN', name: 'Xã Thượng Quan', type: 'Xã' }
];

export const SECTIONS = {
  gpmb: {
    title: 'I. GIẢI PHÓNG MẶT BẰNG',
    shortTitle: 'Giải phóng mặt bằng',
    keyMetrics: ['gpmb_13', 'gpmb_14', 'gpmb_12'],
    items: [
      ['Số cọc GPMB đã nhận bàn giao', 'cọc'],
      ['Diện tích đã đo đạc, trích đo đầy đủ', 'ha'],
      ['Trường hợp đã thông báo thu hồi đất', 'trường hợp'],
      ['Hộ đã hoàn thành kiểm đếm', 'hộ'],
      ['Thửa đất đã xác định nguồn gốc', 'thửa'],
      ['Hộ đã lập phương án', 'hộ'],
      ['Hộ có phương án đã niêm yết công khai', 'hộ'],
      ['Hộ đã được phê duyệt phương án', 'hộ'],
      ['Kinh phí bồi thường, hỗ trợ đã phê duyệt', 'tỷ đồng'],
      ['Hộ đã nhận đủ tiền theo phương án được duyệt', 'hộ'],
      ['Kinh phí bồi thường, hỗ trợ đã chi trả', 'tỷ đồng'],
      ['Hộ đã bàn giao toàn bộ diện tích phải bàn giao', 'hộ'],
      ['Diện tích đã bàn giao có xác nhận', 'ha'],
      ['Chiều dài đã bàn giao đủ mặt bằng theo phạm vi thiết kế', 'km']
    ].map(([label, unit], index) => ({
      id: `gpmb_${String(index + 1).padStart(2, '0')}`,
      number: index + 1,
      label, unit
    }))
  },
  tdc: {
    title: 'II. BỐ TRÍ TÁI ĐỊNH CƯ',
    shortTitle: 'Bố trí tái định cư',
    keyMetrics: ['tdc_05', 'tdc_06', 'tdc_08'],
    items: [
      ['Khu đã phê duyệt quy hoạch', 'khu'],
      ['Khu đã phê duyệt dự án', 'khu'],
      ['Khu đã hoàn thành hạ tầng', 'khu'],
      ['Khu đã nghiệm thu, bàn giao hạ tầng', 'khu'],
      ['Lô đủ điều kiện bố trí tái định cư', 'lô'],
      ['Hộ đã được giao đất tái định cư tại thực địa', 'hộ'],
      ['Lô đã giao tái định cư tại thực địa', 'lô'],
      ['Hộ TĐC đã di chuyển, bàn giao mặt bằng', 'hộ']
    ].map(([label, unit], index) => ({
      id: `tdc_${String(index + 1).padStart(2, '0')}`,
      number: index + 1,
      label, unit
    }))
  }
};

export const ALL_METRICS = [...SECTIONS.gpmb.items, ...SECTIONS.tdc.items];
export const FIELDS = ['target', 'completed'];
export const STATUSES = {
  chua_thuc_hien: 'Chưa thực hiện',
  dang_thuc_hien: 'Đang thực hiện',
  da_hoan_thanh: 'Đã hoàn thành'
};
export const STATUS_OPTIONS = Object.entries(STATUSES).map(([value, label]) => ({ value, label }));

export function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function statusLabel(value) {
  return STATUSES[value] ?? '—';
}

/** Tương thích đọc các bản ghi cũ V1. Khi lưu V2 sẽ chỉ ghi schema mới. */
export function normalizeRow(raw = {}) {
  if (raw == null || typeof raw !== 'object') return { target: null, completed: null, status: '', note: '' };
  if ('completed' in raw || 'status' in raw) {
    return {
      target: raw.target ?? null,
      completed: raw.completed ?? null,
      status: raw.status ?? '',
      note: raw.note ?? ''
    };
  }
  const target = toNumber(raw.target);
  const a = [raw.previous, raw.incurred, raw.adjustment].map(toNumber);
  const completed = a.some(v => v !== null) ? a.reduce((sum, v) => sum + (v ?? 0), 0) : null;
  let status = '';
  if (target !== null) {
    if (completed === null || completed === 0) status = 'chua_thuc_hien';
    else if (completed === target && target > 0) status = 'da_hoan_thanh';
    else status = 'dang_thuc_hien';
  }
  return { target, completed, status, note: raw.note ?? '' };
}

export function computed(raw = {}) {
  const row = normalizeRow(raw);
  const target = toNumber(row.target);
  const entered = toNumber(row.completed);
  const completed = entered ?? (target !== null && row.status === 'chua_thuc_hien' ? 0 : null);
  // Không hiển thị số âm hoặc phần trăm > 100% từ dữ liệu sai.
  const valid = target !== null && target >= 0 &&
    completed !== null && completed >= 0 && completed <= target;
  const remaining = valid ? target - completed : null;
  const percentage = valid && target > 0 ? completed / target * 100 : null;
  return { completed, remaining, percentage };
}

/** Trả về chuỗi lỗi, hoặc null nếu hợp lệ. Dùng chung khi nhập và kiểm thử. */
export function validateMetricRow(raw, metric = { number: '', label: 'Chỉ tiêu' }) {
  const row = normalizeRow(raw);
  const prefix = `Chỉ tiêu ${metric.number} (${metric.label})`;
  const target = row.target;
  const done = row.completed;
  const status = row.status;
  if (typeof row.note !== 'string' || row.note.length > 1500)
    return `${prefix}: ghi chú không được vượt 1.500 ký tự.`;
  for (const [name, value] of [['Tổng phải thực hiện', target], ['Đã thực hiện', done]]) {
    if (value !== null && (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1e12))
      return `${prefix}: ${name} phải là số không âm hợp lệ.`;
  }
  if (!(status === '' || Object.hasOwn(STATUSES, status)))
    return `${prefix}: trạng thái không hợp lệ.`;
  if (target === null && done === null && status === '') return null; // Chưa nhập, hoặc chỉ ghi chú.
  if (target === null) return `${prefix}: cần nhập Tổng phải thực hiện trước.`;
  if (!status) return `${prefix}: cần chọn Trạng thái.`;
  if (done !== null && done > target)
    return `${prefix}: Đã thực hiện không được lớn hơn Tổng phải thực hiện.`;
  if (status === 'chua_thuc_hien' && done !== null && done !== 0)
    return `${prefix}: Chưa thực hiện thì Đã thực hiện phải trống hoặc bằng 0.`;
  if (status === 'dang_thuc_hien') {
    if (target <= 0) return `${prefix}: Đang thực hiện yêu cầu Tổng phải thực hiện lớn hơn 0.`;
    if (done === null) return `${prefix}: Đang thực hiện cần nhập Đã thực hiện (có thể bằng 0).`;
    if (done === target) return `${prefix}: tiến độ đã đạt 100%, hãy chuyển sang Đã hoàn thành.`;
  }
  if (status === 'da_hoan_thanh' && (target <= 0 || done === null || done !== target))
    return `${prefix}: Đã hoàn thành yêu cầu Tổng phải thực hiện lớn hơn 0 và Đã thực hiện bằng Tổng phải thực hiện.`;
  return null;
}

export function formatNumber(value) {
  return value === null || value === undefined || !Number.isFinite(value)
    ? '—'
    : value.toLocaleString('vi-VN', { maximumFractionDigits: 6 });
}
export function formatPercent(value) {
  return value === null || value === undefined || !Number.isFinite(value)
    ? '—' : `${value.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%`;
}

export function isoWeek(date = new Date()) {
  const copy = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  copy.setUTCDate(copy.getUTCDate() + 4 - (copy.getUTCDay() || 7));
  const year = copy.getUTCFullYear();
  const first = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil((((copy - first) / 86400000) + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function previousWeek(period) {
  const match = /^(\d{4})-W(\d{2})$/.exec(period);
  if (!match) throw new Error('Kỳ báo cáo không hợp lệ.');
  const year = Number(match[1]);
  const week = Number(match[2]);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const day = jan4.getUTCDay() || 7;
  const mondayPrev = new Date(Date.UTC(year, 0, 4 - day + 1 + (week - 2) * 7));
  return isoWeek(mondayPrev);
}

export function getUnitName(unitId) {
  return [PROVINCE, ...UNITS].find(unit => unit.id === unitId)?.name ?? unitId;
}

/** Tổng hợp theo cùng chỉ tiêu / cùng đơn vị đo, chỉ lấy xã có báo cáo. */
export function aggregateRows(reports) {
  const rows = {};
  for (const metric of ALL_METRICS) {
    const sourceRows = reports.map(report => ({
      unitId: report.unitId,
      row: report.rows?.[metric.id]
    })).filter(entry => entry.row).map(entry => ({...entry, row: normalizeRow(entry.row)}));
    if (!sourceRows.length) continue;
    const output = { target: null, completed: null, status: '', note: '' };
    for (const field of FIELDS) {
      const numbers = sourceRows.map(({ row }) => field === 'completed' ? computed(row).completed : toNumber(row[field]))
        .filter(value => value !== null);
      output[field] = numbers.length ? numbers.reduce((a, b) => a + b, 0) : null;
    }
    const statuses = sourceRows.map(({ row }) => row.status).filter(Boolean);
    if (statuses.length) {
      output.status = statuses.every(s => s === 'da_hoan_thanh') ? 'da_hoan_thanh'
        : statuses.every(s => s === 'chua_thuc_hien') ? 'chua_thuc_hien'
          : 'dang_thuc_hien';
    }
    output.note = sourceRows.filter(({ row }) => row.note?.trim())
      .map(({ unitId, row }) => `${getUnitName(unitId)}: ${row.note.trim()}`)
      .join(' | ');
    rows[metric.id] = output;
  }
  return rows;
}

/** Chỉ ghi schema V2. V1 được chuyển đổi khi cập nhật mà không xóa nội dung tab còn lại. */
export function normalizeReportRowsForWrite(rows = {}) {
  const result = {};
  for (const metric of ALL_METRICS) {
    if (!(metric.id in rows)) continue;
    const row = normalizeRow(rows[metric.id]);
    const error = validateMetricRow(row, metric);
    if (error) throw new Error(`Bản ghi cũ cần đối chiếu trước khi chuyển đổi. ${error}`);
    result[metric.id] = row;
  }
  return result;
}
