from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
import io

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/upload-pdf/")
async def upload_pdf(file: UploadFile = File(...)):
    try:
        pdf_bytes = await file.read()
        reader = PdfReader(io.BytesIO(pdf_bytes))
        
        # Đọc toàn bộ chữ "soi" được trên trang 1
        text_content = reader.pages[0].extract_text() or ""
        
        # --- ĐOẠN KIỂM TRA QUAN TRỌNG ---
        print("\n" + "="*50)
        print("DỮ LIỆU THỰC TẾ PYTHON ĐANG NHÌN THẤY TRÊN FILE CỦA BẠN:")
        print("="*50)
        print(text_content)
        print("="*50 + "\n")
        # --------------------------------
        
        return {"status": "success", "data": {"raw_text_logged_in_terminal": True}}
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)