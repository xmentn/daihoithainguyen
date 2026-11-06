// Danh mục cố định kế thừa từ V3.1. Mã gpmb_XX / tdc_XX KHÔNG thay đổi để đọc dữ liệu cũ.
export const UNITS = [
  {id:'BAC_KAN',name:'Phường Bắc Kạn'}, {id:'DUC_XUAN',name:'Phường Đức Xuân'},
  {id:'BANG_VAN',name:'Xã Bằng Vân'}, {id:'CAM_GIANG',name:'Xã Cẩm Giàng'},
  {id:'NGAN_SON',name:'Xã Ngân Sơn'}, {id:'NA_PHAC',name:'Xã Nà Phặc'},
  {id:'PHONG_QUANG',name:'Xã Phong Quang'}, {id:'PHU_THONG',name:'Xã Phủ Thông'},
  {id:'THUONG_MINH',name:'Xã Thượng Minh'}, {id:'THUONG_QUAN',name:'Xã Thượng Quan'}
];
// Mã lưu Firestore bất biến. 04 mục TĐC cũ tdc_01..tdc_04 được lưu trữ
// nguyên trạng nhưng không dùng trong bộ chỉ tiêu mới; các ID trùng ý nghĩa giữ nguyên.
export const STAGES = [
  {id:'lap',kind:'gpmb',icon:'01',name:'Lập, thẩm định phương án',short:'Lập, thẩm định',full:'Công tác lập, thẩm định phương án đền bù, hỗ trợ',milestone:'gpmb_07',accent:'#2c75d5',bg:'#eaf3fe'},
  {id:'phe',kind:'gpmb',icon:'02',name:'Phê duyệt, chi trả',short:'Phê duyệt, chi trả',full:'Công tác phê duyệt, chi trả chi phí đền bù, hỗ trợ',milestone:'gpmb_10',accent:'#14a2a9',bg:'#e7f8f8'},
  {id:'do',kind:'gpmb',icon:'03',name:'Đo đạc, bàn giao mặt bằng',short:'Đo đạc, bàn giao',full:'Công tác đo đạc, bàn giao mặt bằng',milestone:'gpmb_14',accent:'#d59a39',bg:'#fff5e8'},
  {id:'tdc_design',kind:'tdc',icon:'01',name:'Thiết kế, lựa chọn nhà thầu',short:'Chuẩn bị, thiết kế',full:'Lập, thẩm định, phê duyệt thiết kế, lựa chọn nhà thầu thi công',milestone:'tdc_12',accent:'#17a38b',bg:'#e5f7f1'},
  {id:'tdc_build',kind:'tdc',icon:'02',name:'Thi công xây dựng',short:'Thi công xây dựng',full:'Công tác thi công xây dựng',milestone:'tdc_08',accent:'#7562bb',bg:'#f1edff'}
];
const raw = [
  ['gpmb_03','1.1','lap','Trường hợp đã thông báo thu hồi đất','trường hợp'],
  ['gpmb_04','1.2','lap','Hộ đã hoàn thành kiểm đếm','hộ'],
  ['gpmb_05','1.3','lap','Thửa đất đã xác định nguồn gốc','thửa'],
  ['gpmb_06','1.4','lap','Hộ đã lập phương án','hộ'],
  ['gpmb_07','1.5','lap','Hộ có phương án đã niêm yết công khai','hộ'],
  ['gpmb_08','2.1','phe','Hộ đã được phê duyệt phương án','hộ'],
  ['gpmb_09','2.2','phe','Kinh phí bồi thường, hỗ trợ đã phê duyệt','tỷ đồng'],
  ['gpmb_10','2.3','phe','Hộ đã nhận đủ tiền theo phương án được duyệt','hộ'],
  ['gpmb_11','2.4','phe','Kinh phí bồi thường, hỗ trợ đã chi trả','tỷ đồng'],
  ['gpmb_01','3.1','do','Số cọc GPMB đã nhận bàn giao','cọc'],
  ['gpmb_02','3.2','do','Diện tích đã đo đạc, trích đo đầy đủ','ha'],
  ['gpmb_12','3.3','do','Hộ đã bàn giao toàn bộ diện tích phải bàn giao','hộ'],
  ['gpmb_13','3.4','do','Diện tích đã bàn giao có xác nhận','ha'],
  ['gpmb_14','3.5','do','Chiều dài đã bàn giao đủ mặt bằng theo phạm vi thiết kế','km'],
  ['tdc_09','1.1','tdc_design','Lựa chọn nhà thầu tư vấn thiết kế','ngày'],
  ['tdc_10','1.2','tdc_design','Khảo sát, lập thiết kế','ngày'],
  ['tdc_11','1.3','tdc_design','Thẩm định, phê duyệt thiết kế','ngày'],
  ['tdc_12','1.4','tdc_design','Lựa chọn nhà thầu thi công','ngày'],
  ['tdc_13','2.1','tdc_build','San nền','ngày'],
  ['tdc_14','2.2','tdc_build','Đường giao thông','ngày'],
  ['tdc_15','2.3','tdc_build','Hạ tầng kỹ thuật','ngày'],
  ['tdc_05','2.4','tdc_build','Lô đủ điều kiện bố trí tái định cư','lô'],
  ['tdc_07','2.5','tdc_build','Lô đã giao tái định cư tại thực địa','lô'],
  ['tdc_06','2.6','tdc_build','Hộ đã được giao đất tái định cư tại thực địa','hộ'],
  ['tdc_08','2.7','tdc_build','Hộ TĐC đã di chuyển, bàn giao mặt bằng','hộ']
];
export const METRICS = raw.map(([id,code,stage,label,unit])=>({id,code,stage,label,unit,milestone:STAGES.some(s=>s.milestone===id)}));
export const METRIC_MAP = Object.fromEntries(METRICS.map(m=>[m.id,m]));
export const STAGE_MAP = Object.fromEntries(STAGES.map(s=>[s.id,s]));
export const STATUS = {chua_thuc_hien:'Chưa thực hiện',dang_thuc_hien:'Đang thực hiện',da_hoan_thanh:'Đã hoàn thành'};
export function isDecimal(m){return ['ha','km','tỷ đồng'].includes(m.unit);}
export function asDate(x){if(!x)return null;if(typeof x.toDate==='function')return x.toDate(); const d=new Date(x);return Number.isNaN(d.getTime())?null:d;}
export function readRow(raw){if(!raw)return null;const entered=raw.completed??raw.value??null;const value=entered===null&&raw.status==='chua_thuc_hien'&&raw.target!=null?0:entered;return {target:raw.target??null,value,status:raw.status||'',note:raw.note||'',startDate:raw.startDate||'',endDate:raw.endDate||'',updatedAt:asDate(raw.updatedAt),updatedBy:raw.updatedBy||''};}
export function validate(row,metric){
  const t=row.target,v=row.value,s=row.status;const label=metric.label;
  if(!Number.isFinite(t)||t<0||t>1e12)return `${label}: Tổng phải thực hiện phải là số không âm.`;
  if(v!==null&&(!Number.isFinite(v)||v<0||v>1e12))return `${label}: Đã thực hiện phải là số không âm.`;
  if(!isDecimal(metric)&&(!Number.isInteger(t)||(v!==null&&!Number.isInteger(v))))return `${label}: Đơn vị ${metric.unit} phải là số nguyên.`;
  if(v!==null&&v>t)return `${label}: Đã thực hiện không được vượt Tổng phải thực hiện.`;
  if(!Object.hasOwn(STATUS,s))return `${label}: Vui lòng chọn Trạng thái.`;
  if(s==='chua_thuc_hien'&&v!==null&&v!==0)return `${label}: Chưa thực hiện thì Đã thực hiện bằng 0 hoặc để trống.`;
  if(s==='dang_thuc_hien'&&(t<=0||v===null||v>=t))return `${label}: Đang thực hiện yêu cầu Tổng > 0 và Đã thực hiện < Tổng.`;
  if(s==='da_hoan_thanh'&&(t<=0||v===null||v!==t))return `${label}: Đã hoàn thành yêu cầu Đã thực hiện = Tổng > 0.`;
  if(typeof row.note!=='string'||row.note.length>1500)return 'Ghi chú tối đa 1.500 ký tự.';
  const start=row.startDate||'',end=row.endDate||'';
  // HTML input[type=date] trả về YYYY-MM-DD. Kiểm tra bằng UTC,
  // không lấy ngày 00:00 giờ địa phương rồi đổi sang UTC (UTC+7 sẽ lùi 1 ngày).
  const dateOK=d=>{
    if(d==='')return true;
    if(typeof d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d))return false;
    const parsed=new Date(`${d}T12:00:00Z`);
    return !Number.isNaN(parsed.getTime())&&parsed.toISOString().slice(0,10)===d;
  };
  if(!dateOK(start)||!dateOK(end))return `${label}: Ngày bắt đầu/kết thúc không hợp lệ.`;
  if(start&&end&&start>end)return `${label}: Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.`;
  return null;
}
export function percent(value,target){return Number.isFinite(value)&&Number.isFinite(target)&&target>0&&value>=0&&value<=target?100*value/target:null;}
export function fmtNumber(v,unit=''){if(v===null||v===undefined||!Number.isFinite(Number(v)))return '—';return Number(v).toLocaleString('vi-VN',{maximumFractionDigits:isDecimal({unit})?3:0});}
export function fmtDate(v){const d=asDate(v);return d?d.toLocaleString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'Chưa cập nhật';}
