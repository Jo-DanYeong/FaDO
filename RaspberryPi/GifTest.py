
import re
import time
from pathlib import Path
from threading import Thread, Condition

import board
import busio
import digitalio
from PIL import Image, ImageOps, ImageSequence, ImageEnhance
import adafruit_ssd1306


WIDTH = 128
HEIGHT = 64
GIF_DIR = Path(__file__).resolve().parent

# 재생 상태
condition = Condition()
current_gif = None
request_id = 0
play_thread = None


def init_oled():
    oled_cs = digitalio.DigitalInOut(board.D8)
    oled_dc = digitalio.DigitalInOut(board.D24)
    oled_reset = digitalio.DigitalInOut(board.D25)

    spi = busio.SPI(board.SCK, board.MOSI)

    oled = adafruit_ssd1306.SSD1306_SPI(
        WIDTH, HEIGHT, spi, oled_dc, oled_reset, oled_cs
    )

    oled.fill(0)
    oled.show()

    return oled


def show_gif(name=""):
    global current_gif, request_id, play_thread

    if not re.fullmatch(r"[a-zA-Z0-9_-]+", name):
        raise ValueError("올바르지 않은 GIF 이름입니다.")

    gif_path = GIF_DIR / f"{name}.gif"

    if not gif_path.is_file():
        raise FileNotFoundError(f"{name}.gif 파일이 없습니다.")

    with condition:
        # 새로운 GIF 재생 요청
        current_gif = gif_path
        request_id += 1

        # 재생 스레드는 한 개만 생성
        if play_thread is None or not play_thread.is_alive():
            play_thread = Thread(
                target=play_gif,
                daemon=True
            )
            play_thread.start()

        # 대기 중인 재생 스레드를 깨움
        condition.notify_all()


def play_gif():
    global current_gif, request_id

    oled = init_oled()

    while True:
        with condition:
            while current_gif is None:
                condition.wait()

            gif_path = current_gif
            my_id = request_id

        try:
            with Image.open(gif_path) as gif:

                # 현재 GIF 무한 반복
                while True:

                    for frame in ImageSequence.Iterator(gif):
                        with condition:
                            if my_id != request_id:
                                break

                        start_time = time.monotonic()

                        # 1. 비율 유지
                        resized = ImageOps.contain(
                            frame.convert("RGB"),
                            (WIDTH, HEIGHT)
                        )

                        # 2. 명암비 강화
                        enhancer = ImageEnhance.Contrast(resized)
                        resized = enhancer.enhance(4.0)

                        # 3. 흑백 캔버스
                        canvas = Image.new(
                            "1", (WIDTH, HEIGHT), 0
                        )

                        # 4. 중앙 정렬
                        x = (WIDTH - resized.width) // 2
                        y = (HEIGHT - resized.height) // 2

                        canvas.paste(
                            resized.convert("1"),
                            (x, y)
                        )

                        # 5. OLED 출력
                        oled.image(canvas)
                        oled.show()

                        # 6. 프레임 시간 계산
                        duration = frame.info.get(
                            "duration",
                            gif.info.get("duration", 40)
                        ) / 1000.0

                        elapsed = time.monotonic() - start_time
                        remaining = max(duration - elapsed, 0)

                        # 새 요청이 오면 대기를 즉시 종료
                        with condition:
                            changed = condition.wait_for(
                                lambda: my_id != request_id,
                                timeout=remaining
                            )

                        if changed:
                            break

                    # 새로운 GIF 요청이 왔는지 확인
                    with condition:
                        if my_id != request_id:
                            break

        except Exception as e:
            print(f"GIF 재생 오류: {e}")

            with condition:
                if my_id == request_id:
                    current_gif = None
                    request_id += 1
