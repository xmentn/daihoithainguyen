import os
import re
import pdfplumber
from pypdf import PdfReader, PdfWriter

def extract_seri_absolute(pdf_page):
    """Sử dụng pdfplumber để trích xuất text layer chuẩn xác 100% như trên Web"""
    try:
        text_content = pdf_page.extract_text()
        if not text_content:
            return None
            
        # Chuẩn hóa văn bản thành chữ IN HOA
        clean_text = text_content.upper()
        
        # Xóa sạch mọi khoảng trắng, tab, xuống dòng để dồn chuỗi dính liền
        text_no_spaces = re.sub(r'\s+', '', clean_text)
        
        # Tìm cấu trúc chuẩn: 2 chữ cái viết hoa + 7 đến 8 chữ số liên tiếp
        match = re.search(r'([A-Z]{2})(\d{7,8})', text_no_spaces)
        if match:
            return f"{match.group(1)} {match.group(2)}"
    except Exception:
        pass
    return None

def split_and_rename_pdf(input_pdf_path, output_dir):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    print(f"--> Đang đọc cấu trúc file gốc: {input_pdf_path}")
    
    # Sử dụng song song: pdfplumber để đọc chữ, pypdf để cắt trang (giữ dung lượng nhẹ)
    reader_pypdf = PdfReader(input_pdf_path)
    total_pages = len(reader_pypdf.pages)
    total_books = total_pages // 2
    
    print(f"--> Tổng số trang: {total_pages} trang. Tiến hành xử lý {total_books} sổ...")
    print("="*60)

    # Mở file bằng pdfplumber để quét chữ
    with pdfplumber.open(input_pdf_path) as pdf_plumber:
        for i in range(total_books):
            page_1_idx = i * 2
            page_2_idx = page_1_idx + 1
            
            # Lấy trang bìa để quét chữ
            plumber_page1 = pdf_plumber.pages[page_1_idx]
            plumber_page2 = pdf_plumber.pages[page_2_idx]
            
            # Tiến hành nhận diện bằng thư viện mới
            seri_name = extract_seri_absolute(plumber_page1)
            if not seri_name:
                seri_name = extract_seri_absolute(plumber_page2)
                
            # Dự phòng nếu lỗi font nghiêm trọng
            if not seri_name:
                seri_name = f"Khong_Nhan_Dang_Duoc_So_{i+1}"
                
            # Tiến hành cắt và xuất 2 trang đó ra file riêng bằng pypdf
            writer = PdfWriter()
            writer.add_page(reader_pypdf.pages[page_1_idx])
            writer.add_page(reader_pypdf.pages[page_2_idx])
            
            output_filename = f"{seri_name}.pdf"
            output_file_path = os.path.join(output_dir, output_filename)
            
            with open(output_file_path, "wb") as out_file:
                writer.write(out_file)
                
            print(f"[Sổ {i+1}/{total_books}] Kết quả tìm thấy -> {output_filename}")

if __name__ == "__main__":
    FILE_GOC = "bia TNG.pdf" 
    THU_MUC_OUT = "Ket_Qua_Tach_So"
    
    if os.path.exists(FILE_GOC):
        split_and_rename_pdf(FILE_GOC, THU_MUC_OUT)
        print("="*60)
        print(f"HOÀN THÀNH XỬ LÝ! Hãy kiểm tra thư mục '{THU_MUC_OUT}'.")
    else:
        print(f"Lỗi: Không tìm thấy file '{FILE_GOC}'. Hãy chắc chắn file nằm cùng thư mục!")