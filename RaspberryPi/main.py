import board
import busio
import digitalio
from PIL import Image, ImageDraw, ImageFont
import adafruit_ssd1306

# 1. SPI 통신 및 핀 설정 (배선도와 일치해야 합니다)
spi = busio.SPI(board.SCK, board.MOSI)
dc = digitalio.DigitalInOut(board.D24)   # 물리적 18번 핀
rst = digitalio.DigitalInOut(board.D25)  # 물리적 22번 핀
cs = digitalio.DigitalInOut(board.D8)    # 물리적 24번 핀

# 2. OLED 디스플레이 초기화 (128x64 해상도 기준)
# 화면이 잘리거나 깨진다면 디스플레이의 해상도에 맞게 크기를 변경해주세요.
WIDTH = 128
HEIGHT = 64
oled = adafruit_ssd1306.SSD1306_SPI(
    WIDTH, HEIGHT, spi, dc, rst, cs
)

# 3. 화면 지우기 (초기화)
oled.fill(0)
oled.show()

# 4. PIL 라이브러리로 그림 이미지 생성 (1비트 흑백 모드)
image = Image.new("1", (oled.width, oled.height))
draw = ImageDraw.Draw(image)

# 5. 화면에 그릴 텍스트와 사각형 설정
font = ImageFont.load_default()

# 테두리 사각형
draw.rectangle(
    (0, 0, oled.width - 1, oled.height - 1),
    outline=255,
    fill=0
)

# 텍스트 출력
draw.text((10, 15), "Raspberry Pi 4", font=font, fill=255)
draw.text((10, 35), "OLED SPI Test!", font=font, fill=255)

# 6. 이미지를 디스플레이로 전송하여 출력
oled.image(image)
oled.show()

print("OLED 화면에 텍스트가 성공적으로 출력되었습니다!")
