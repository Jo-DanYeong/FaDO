import board
import busio
import digitalio
from PIL import Image
import adafruit_ssd1306

# 1. 핀 설정 (사용 중인 하드웨어 연결에 맞게 핀 번호 설정)
oled_cs = digitalio.DigitalInOut(board.D8)
oled_dc = digitalio.DigitalInOut(board.D24)
oled_reset = digitalio.DigitalInOut(board.D25)

# 2. SPI 및 디스플레이 객체 초기화 (128x64 픽셀 기준)
spi = busio.SPI(board.SCK, board.MOSI)
WIDTH = 383
HEIGHT = 396  # OLED 디스플레이의 세로가 더 짧다면 32로 변경하세요.
oled = adafruit_ssd1306.SSD1306_SPI(WIDTH, HEIGHT, spi, oled_dc, oled_reset, oled_cs)

# 화면 초기화 (깨끗하게 지우기)
oled.fill(0)
oled.show()

try:
    # 3. 이미지 파일 불러오기 (이미지 파일명을 정확히 입력해주세요)
    # 예: 현재 폴더 안에 있는 'my_image.png' 파일 불러오기
    image_path = "ImgTest.jpg"

    # 이미지를 열고, 디스플레이 크기에 맞게 크기를 조정한 후
    # 1비트 흑백(모노크롬) 이미지로 변환합니다.
    image = Image.open(image_path).resize((WIDTH, HEIGHT)).convert("1")

    # 4. 이미지를 디스플레이에 출력 및 표시
    oled.image(image)
    oled.show()
    print("그림이 OLED 화면에 성공적으로 표시되었습니다!")

except FileNotFoundError:
    print(f"오류: '{image_path}' 파일을 찾을 수 없습니다. 파일명이 맞는지 확인해 주세요.")
