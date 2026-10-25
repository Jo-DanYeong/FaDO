from fastapi import FastAPI
from pydantic import BaseModel
from RaspberryPi import ImgTest, GifTest

app = FastAPI()
class ExpressionRequest(BaseModel):
    expressionId: str

@app.get("/health")
def health():
    return {"Service": "RPiServer", "Status": "UP"}

@app.post("/expression")
def expression(request: ExpressionRequest):
    print(f"받은 id : {request.expressionId}")
    if request.expressionId == "happy":
        ImgTest.show_image()
        return {
            "message": "테스트 이미지 출력 완료",
            "expressionId": request.expressionId,
        }
    return {
        "message": "테스트 이미지 출력 안함",
        "expressionId": request.expressionId,
    }

@app.post("/gif/{name}")
def change_gif(name: str, HTTPException=None):
    try:
        GifTest.show_gif(name)

        return {
            "status": "accepted",
            "gif": name
        }

    except ValueError as e:
        from fastapi import HTTPException
        raise HTTPException(400, str(e))

    except FileNotFoundError as e:
        raise HTTPException(404, str(e))
