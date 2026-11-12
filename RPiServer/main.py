import asyncio
import re
from contextlib import asynccontextmanager
from io import BytesIO
from pathlib import Path
from fastapi import FastAPI, File, Form, HTTPException, Response, UploadFile
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel
from RPiServer.camera_stream import camera_service, router as camera_router
from RPiServer.expression_display import LocalExpressionDisplay
from RPiServer.yolo_api import router as yolo_router
from RaspberryPi import ImgShow

EXPRESSION_DIR = Path(__file__).resolve().parent / "expressions"
MAX_PNG_BYTES = 1024 * 1024
local_display = LocalExpressionDisplay(EXPRESSION_DIR, ImgShow.show_image)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    camera_service.start_local(local_display)
    try:
        yield
    finally:
        await asyncio.to_thread(camera_service.stop)


app = FastAPI(lifespan=lifespan)
app.state.local_display = local_display
app.include_router(yolo_router)
app.include_router(camera_router)


class ExpressionRequest(BaseModel):
    expressionId: str


@app.get("/health")
def health():
    return {"Service": "RPiServer", "Status": "UP"}


def expression_path(expression_id: str) -> Path:
    if not re.fullmatch(r"[a-zA-Z0-9-]{1,100}", expression_id):
        raise HTTPException(status_code=400, detail="올바르지 않은 표정 ID")
    return EXPRESSION_DIR / f"{expression_id}.png"


@app.post("/expression/image")
def upload_expression_image(
        expressionId: str = Form(...),
        name: str = Form(...),
        file: UploadFile = File(...),
):
    target = expression_path(expressionId)
    if not name.strip() or len(name) > 100:
        raise HTTPException(status_code=400, detail="표정 이름을 확인해주세요")

    data = file.file.read(MAX_PNG_BYTES + 1)
    if not data or len(data) > MAX_PNG_BYTES:
        raise HTTPException(status_code=413, detail="1MB 이하 PNG가 필요합니다")

    try:
        output = BytesIO()
        with Image.open(BytesIO(data)) as raw:
            if raw.format != "PNG" or raw.size != (128, 64):
                raise HTTPException(status_code=400, detail="128 x 64 PNG만 지원합니다")
            with raw.convert("1") as image:
                image.save(output, format="PNG")
        png_bytes = output.getvalue()
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as error:
        raise HTTPException(status_code=400, detail="올바르지 않은 PNG") from error

    with local_display.lock:
        EXPRESSION_DIR.mkdir(parents=True, exist_ok=True)
        target.write_bytes(png_bytes)

    return {"expressionId": expressionId, "name": name.strip(), "saved": True}


@app.post("/expression")
def expression(request: ExpressionRequest):
    target = expression_path(request.expressionId)
    try:
        local_display.show_from_web(target)
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail="저장된 표정 PNG가 없습니다") from error
    return {"expressionId": request.expressionId, "displayed": True}


@app.delete("/expression/image", status_code=204)
def delete_expression_image(expressionId: str):
    target = expression_path(expressionId)
    with local_display.lock:
        if target.is_dir():
            raise HTTPException(status_code=409, detail="PNG 경로에 폴더가 있습니다")
        target.unlink(missing_ok=True)
    return Response(status_code=204)
