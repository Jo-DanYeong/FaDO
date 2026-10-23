import board
import busio
import digitalio
from PIL import Image, ImageOps
import adafruit_ssd1306

# 1. 핀 설정
oled_cs = digitalio.DigitalInOut(board.D8)
oled_dc = digitalio.DigitalInOut(board.D24)
oled_reset = digitalio.DigitalInOut(board.D25)

# 2. SPI 및 디스플레이 객체 초기화 (하드웨어 한계인 128x64 고정)
spi = busio.SPI(board.SCK, board.MOSI)
WIDTH = 128
HEIGHT = 64
oled = adafruit_ssd1306.SSD1306_SPI(WIDTH, HEIGHT, spi, oled_dc, oled_reset, oled_cs)

# 화면 초기화
oled.fill(0)
oled.show()

try:
    image_path = "hachiware.jpeg"

    # 3. 이미지 원본 불러오기
    raw_image = Image.open(image_path)

    # 4. 비율 유지형 크기 조정 (Pillow의 ImageOps.contain 기능 사용)
    # 이미지의 가로세로 비율을 유지하면서 128x64 박스 안에 들어가도록 최대 크기로 맞춥니다.
    resized_image = ImageOps.contain(raw_image, (WIDTH, HEIGHT))

    # 5. 중앙 배치를 위한 도화지(배경) 생성
    # 128x64 크기의 완전한 검은색(0) 바탕을 만듭니다.
    canvas = Image.new("1", (WIDTH, HEIGHT), 0)

    # 크기가 조절된 이미지를 검은색 바탕의 정중앙 좌표 계산하여 붙여넣습니다.
    paste_x = (WIDTH - resized_image.width) // 2
    paste_y = (HEIGHT - resized_image.height) // 2
    canvas.paste(resized_image.convert("1"), (paste_x, paste_y))

    # 6. 최종 이미지를 디스플레이에 출력
    oled.image(canvas)
    oled.show()
    print("비율에 맞게 정중앙에 그림이 표시되었습니다!")

except FileNotFoundError:
    print(f"오류: '{image_path}' 파일을 찾을 수 없습니다. 파일명이 맞는지 확인해 주세요.")
