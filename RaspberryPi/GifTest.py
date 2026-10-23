import time
import board
import busio
import digitalio
from PIL import Image, ImageOps, ImageSequence
import adafruit_ssd1306

# 1. 디스플레이 및 핀 설정
oled_cs = digitalio.DigitalInOut(board.D8)
oled_dc = digitalio.DigitalInOut(board.D24)
oled_reset = digitalio.DigitalInOut(board.D25)

spi = busio.SPI(board.SCK, board.MOSI)
WIDTH = 128
HEIGHT = 64  # 세로가 짧은 모델이면 32로 변경
oled = adafruit_ssd1306.SSD1306_SPI(WIDTH, HEIGHT, spi, oled_dc, oled_reset, oled_cs)

# 2. GIF 파일 불러오기
gif_path = "gkcldhkfpWKf.gif"  # 재생할 GIF 파일명

try:
    gif = Image.open(gif_path)
except FileNotFoundError:
    print(f"에러: {gif_path} 파일을 찾을 수 없습니다.")
    exit()

print("GIF 무한 재생을 시작합니다. 종료하려면 Ctrl+C를 누르세요.")

try:
    while True:  # 무한 반복 재생
        # ImageSequence를 이용해 GIF의 모든 프레임을 순서대로 순회
        for frame in ImageSequence.Iterator(gif):
            start_time = time.time()

            # 3. 비율 유지 크기 조정
            # 이미지의 가로세로 비율을 유지하면서 128x64 박스 안에 맞춥니다.
            resized_frame = ImageOps.contain(frame.convert("RGB"), (WIDTH, HEIGHT))

            # 4. 중앙 배치를 위한 검은색 도화지 생성
            canvas = Image.new("1", (WIDTH, HEIGHT), 0)

            # 정중앙 좌표 계산 후 붙여넣기
            paste_x = (WIDTH - resized_frame.width) // 2
            paste_y = (HEIGHT - resized_frame.height) // 2
            canvas.paste(resized_frame.convert("1"), (paste_x, paste_y))

            # 5. OLED 화면 출력
            oled.image(canvas)
            oled.show()

            # GIF 원본의 프레임 지연 시간(duration)을 가져와 반영 (기본값 40ms)
            duration = frame.info.get('duration', 40) / 1000.0

            # 연산 시간을 제외한 만큼 대기하여 원본 속도 유지
            time.sleep(max(duration - (time.time() - start_time), 0))

except KeyboardInterrupt:
    print("\n재생이 중단되었습니다.")

finally:
    oled.fill(0)
    oled.show()
