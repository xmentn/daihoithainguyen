from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
import re
import io

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def extract_seri_absolute(pdf_bytes):
    ma_so_seri = "Không tìm thấy"
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        text_content = ""
        for page in reader.pages:
            text_content += page.extract_text() or ""
            
        # Chuyển văn bản thành chữ IN HOA để đồng bộ
        clean_text = text_content.upper()
        
        # Bẻ văn bản thành từng dòng dựa vào dấu xuống dòng
        lines = clean_text.split('\n')
        
        for line in lines:
            line_strip = line.strip()
            # Xóa sạch khoảng trắng trong dòng để kiểm tra dạng AA02465674
            no_space = re.sub(r'\s+', '', line_strip)
            
            # Khớp cấu trúc: 2 chữ cái viết hoa và 7 đến 8 số
            match = re.search(r'([A-Z]{2})(\d{7,8})', no_space)
            if match:
                ma_so_seri = f"{match.group(1)} {match.group(2)}"
                break
    except Exception as e:
        ma_so_seri = f"Lỗi: {str(e)}"

    return {"ma_so_do": ma_so_seri}

@app.post("/upload-pdf/")
async def upload_pdf(file: UploadFile = File(...)):
    try:
        pdf_bytes = await file.read()
        result = extract_seri_absolute(pdf_bytes)
        return {"status": "success", "data": result}
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    # Đổi hẳn sang cổng 9000 để TRÁNH TUYỆT ĐỐI tranh chấp cổng mạng
    uvicorn.run(app, host="127.0.0.1", port=9000)