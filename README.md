# FaDO | 내 표정을 픽셀로

FaDO는 카메라로 얼굴 표정을 분류하고, 그 표정에 맞는 **128 × 64 픽셀 그림**을 작은 OLED에 띄웁니다. 웹 라이브러리에서 ‘행복해요’를 하트 눈으로 바꿔 두면, 웃는 얼굴이 감지됐을 때 OLED에 그 그림이 나타납니다.

[웹 화면 실행](#1-웹-화면-실행) · [라파 단독 실행](#2-라파-단독-실행) · [OLED 단독 테스트](#oled-단독-테스트) · [웹과 라파 연결](#3-웹과-라파-연결) · [화면 사용법](#4-화면-사용법) · [문제 해결](#5-문제-해결) · [코드와 테스트](#6-코드와-테스트)

| 하고 싶은 일 | 준비물과 실행 순서 |
| --- | --- |
| 웹 화면과 편집기만 사용 | PC에 Node.js 24를 설치하고 [1단계](#1-웹-화면-실행)를 진행합니다. |
| 웹 없이 카메라로 OLED 제어 | Raspberry Pi OS가 설치된 라즈베리 파이, CSI 또는 USB 카메라, SSD1306 SPI OLED, NCNN 모델과 표정 PNG를 준비하고 [2단계](#2-라파-단독-실행)를 진행합니다. |
| 웹에서 인식하고 OLED 제어 | 2단계를 마친 뒤 PC에 Node.js 24와 JDK 21을 준비합니다. [3단계](#3-웹과-라파-연결)에서 Tailscale과 Java를 연결하고 웹을 엽니다. |

## 1. 웹 화면 실행

Git이 설치된 PC에서 저장소를 받습니다. 이미 `FaDO` 폴더가 있으면 이 명령은 건너뜁니다.

```shell
git clone https://github.com/Jo-DanYeong/FaDO.git
```

**IDE 내장 터미널**에서 실행하려면 IDE에서 `FaDO` 폴더를 열고, 터미널에서 아래 명령을 **위에서부터 한 줄씩** 실행합니다. Windows PowerShell에서 `npm.ps1` 실행이 차단되면 같은 터미널에 `cmd.exe`를 입력한 뒤 진행합니다.

```shell
cd Frontend
npm ci
npm start
```

**Windows 명령 프롬프트(CMD)**에서는 시작 메뉴에서 `cmd`를 열고 아래 명령을 한 줄씩 실행합니다. 프로젝트를 다른 위치에 받았다면 첫 줄의 경로를 바꿉니다.

```cmd
cd /d "C:\FaDO\Frontend"
npm ci
npm start
```

`npm ci`는 [package-lock.json](Frontend/package-lock.json)에 기록된 버전대로 패키지를 설치합니다. 처음 받았거나 패키지 목록이 바뀌었을 때 실행합니다. 평소에는 `Frontend` 폴더에서 `npm start`만 실행합니다. 이미 프롬프트에 `C:\FaDO\Frontend>`가 보이면 폴더 이동도 건너뜁니다. [npm 공식 문서](https://docs.npmjs.com/cli/v11/commands/npm-ci/)

**확인** · 서버가 실행되면 브라우저에서 [FaDO 스튜디오](http://127.0.0.1:3000/#studio)를 엽니다. 화면과 표정 편집기는 Java와 라파 연결 없이 사용할 수 있습니다. 종료하려면 서버가 실행 중인 터미널에서 **Ctrl+C**를 누릅니다.

## 2. 라파 단독 실행

라즈베리 파이에도 FaDO 저장소를 내려받습니다. 아래 예시는 저장소가 `~/FaDO`에 있는 경우입니다.

### 카메라·OLED와 파일 준비

1. 라파에 카메라와 **SSD1306 SPI OLED(128 × 64)**를 연결하고 Raspberry Pi OS에서 SPI를 활성화합니다. OLED의 SCK와 MOSI는 라파의 하드웨어 SPI를 사용하고, CS는 BCM 8, DC는 BCM 24, RESET은 BCM 25입니다. [OLED 핀 설정](RaspberryPi/ImgShow.py)
2. 라파의 `FaDO/RPiServer/models/`에 얼굴 탐지용 `face_detector_ncnn_model/`과 표정 분류용 `expression_ncnn_model/`을 복사합니다. 각 폴더에 `model.ncnn.param`, `model.ncnn.bin`, `metadata.yaml`이 필요합니다.
3. `FaDO/RPiServer/expressions/`에 `neutral.png`, `happy.png`, `sad.png`, `angry.png`, `surprised.png`를 넣습니다. 파일은 **128 × 64 PNG**입니다. 이 폴더는 Git에서 제외되어 있어 새 장비에는 기존 파일을 따로 복사해야 합니다. 웹을 연결한 뒤 기본 표정을 하나씩 선택해 PNG를 생성할 수도 있습니다.

<details>
<summary>.pt 파일만 있을 때 NCNN으로 변환하기</summary>

두 `.pt` 파일을 `RPiServer/models/`에 넣고, Ultralytics가 설치된 환경에서 `FaDO` 폴더 기준으로 실행합니다. 변환 후 생성된 NCNN 폴더를 통째로 라파에 복사합니다.

```bash
python -c "from ultralytics import YOLO; YOLO('RPiServer/models/face_detector.pt').export(format='ncnn', imgsz=416, device='cpu')"
python -c "from ultralytics import YOLO; YOLO('RPiServer/models/expression.pt').export(format='ncnn', imgsz=160, device='cpu')"
```

</details>

### Python 환경 준비

라파에서 `FaDO` 폴더를 엽니다. CSI 카메라를 쓸 경우 Raspberry Pi OS에 `python3-picamera2`를 설치합니다. USB 카메라라면 아래에서 Picamera2 설치 줄을 건너뜁니다. 기존 서비스가 이미 사용 중인 가상환경이 있으면 그대로 사용합니다.

```bash
cd ~/FaDO
sudo apt update
sudo apt install -y python3-picamera2
python3 -m venv --system-site-packages .venv
source .venv/bin/activate
python -m pip install -r requirements_raspberryPi.txt
```

### OLED 단독 테스트

[OledTest.py](RaspberryPi/OledTest.py)는 라파 서버와 같은 [ImgShow.py](RaspberryPi/ImgShow.py)로 이미지를 출력합니다. 라파의 OLED 배선과 이미지 표시를 카메라·모델·웹 연결 없이 확인할 수 있습니다.

1. 라파에서 FaDO 서버가 실행 중이면 먼저 종료합니다. systemd로 실행 중이라면 `sudo systemctl stop fado-fastapi.service`를 실행합니다. Uvicorn을 직접 실행했다면 해당 터미널에서 **Ctrl+C**를 누릅니다.
2. 라파 터미널에서 아래 명령을 실행합니다. OLED에 **테두리, 왼쪽 위의 흰 사각형, FaDO OLED TEST 글자**가 보이면 테스트가 성공한 것입니다.

   ```bash
   cd ~/FaDO
   .venv/bin/python -m RaspberryPi.OledTest
   ```

3. 실제 표정 PNG도 확인하려면 이미지 경로를 넣어 실행합니다.

   ```bash
   .venv/bin/python -m RaspberryPi.OledTest RPiServer/expressions/neutral.png
   ```

4. 테스트를 위해 systemd 서비스를 멈췄다면 `sudo systemctl start fado-fastapi.service`로 다시 시작합니다. 처음 실행하는 경우에는 다음 절차로 넘어갑니다.

### 서버 시작과 동작 확인

**직접 실행**하려면 위 가상환경을 활성화한 라파 터미널에서 실행합니다. 기본 카메라는 CSI입니다. USB 카메라는 명령 앞에 `FADO_CAMERA_KIND=usb FADO_CAMERA_INDEX=0`을 붙입니다.

```bash
python -m uvicorn RPiServer.main:app --host 127.0.0.1 --port 8000 --workers 1
```

**이미 systemd 서비스를 사용 중**이라면 대신 기존 서비스를 재시작합니다. 직접 실행과 systemd 실행 중 하나를 사용하고, 카메라와 OLED를 제어하는 서버 워커는 **한 개**로 둡니다.

```bash
sudo systemctl restart fado-fastapi.service
sudo journalctl -u fado-fastapi.service -n 40 --no-pager
```

**확인** · 라파의 다른 터미널에서 아래 명령을 실행합니다. HTTP 200과 `"Status":"UP"`이 나오면 API가 응답하는 상태입니다. 웹과 Java를 켜지 않은 상태에서 OLED에 평온 표정이 먼저 나오고, 얼굴을 비췄을 때 그림이 바뀌면 단독 인식도 동작하는 상태입니다.

```bash
curl -i http://127.0.0.1:8000/health
```

## 3. 웹과 라파 연결

개발 환경의 연결 순서는 **웹 브라우저(3000) → Spring Boot(8080) → Tailscale → 라파 FastAPI**입니다. 아래 순서대로 라파, 네트워크, Java를 먼저 확인한 뒤 웹을 엽니다.

### 3-1. 라파의 Tailscale 주소 확인

1. PC와 라파를 같은 Tailscale 네트워크(tailnet)에 연결합니다. 라파에서 처음 로그인할 때는 `sudo tailscale up`을 실행합니다. [Windows 설치](https://tailscale.com/docs/install/windows) · [Linux 설치](https://tailscale.com/docs/install/linux)
2. 라파에서 `tailscale ip -4`를 실행해 라파의 주소를 확인합니다. 아래 예시의 `100.x.y.z`를 그 주소로 바꿉니다. [Tailscale IP 확인](https://tailscale.com/docs/concepts/ip-and-dns-addresses)
3. 개발 PC의 PowerShell에서 네트워크와 API를 확인합니다. 라파의 80번 포트에서 Nginx가 FastAPI로 요청을 전달하는 구성이라면 아래 주소를 사용합니다.

   ```powershell
   $piAddress = '100.x.y.z'
   tailscale ping $piAddress
   curl.exe -i --max-time 5 "http://$piAddress/health"
   ```

   `tailscale ping`은 라파에 닿는지 확인합니다. `/health`에서 HTTP 200과 `"Status":"UP"`이 와야 Java가 사용할 API 주소도 확인된 것입니다. [Tailscale 연결 점검](https://tailscale.com/docs/how-to/connect-to-devices)

   프록시 없이 Uvicorn을 직접 실행한다면 라파 실행 명령의 `--host`에 라파의 Tailscale IP를 넣습니다. 이 경우 `http://100.x.y.z:8000/health`로 확인합니다.

### 3-2. 라파에 카메라 인증 설정

웹에서 **라파 카메라를 통한 인식**과 **라파 영상 보기**를 사용하려면 라파 서버에 `FADO_CAMERA_USER`와 `FADO_CAMERA_PASSWORD`를 설정합니다.

- **Uvicorn 직접 실행** · 라파에서 서버를 실행할 Bash 터미널에 아래 명령으로 입력한 뒤 Uvicorn을 시작합니다. 이미 실행 중이라면 **Ctrl+C**로 종료하고 같은 터미널에서 다시 시작합니다.

  ```bash
  read -r -p 'Camera username: ' FADO_CAMERA_USER
  read -r -s -p 'Camera password: ' FADO_CAMERA_PASSWORD
  printf '\n'
  export FADO_CAMERA_USER FADO_CAMERA_PASSWORD
  ```

- **systemd 사용** · 기존 서비스의 환경 파일에 두 값을 넣습니다. 환경 파일을 처음 연결한다면 `sudoedit /etc/fado-camera.env`로 파일을 만들고 아래 예시의 값을 바꿉니다.

  ```ini
  FADO_CAMERA_USER=카메라_아이디
  FADO_CAMERA_PASSWORD=카메라_비밀번호
  FADO_CAMERA_KIND=csi
  ```

  `sudo chmod 600 /etc/fado-camera.env`를 실행합니다. `sudo systemctl edit fado-fastapi.service`를 열어 다음 내용을 넣고, `sudo systemctl daemon-reload`와 `sudo systemctl restart fado-fastapi.service`를 차례대로 실행합니다.

  ```ini
  [Service]
  EnvironmentFile=/etc/fado-camera.env
  ```

### 3-3. PC에서 Java와 웹 실행

1. PC의 `Backend/src/main/resources/application.properties`에서 `Raspberry.base-url`을 설정합니다. 앞에서 정상 응답을 확인한 주소의 끝에서 `/health`를 뺍니다. Uvicorn에 직접 연결했다면 포트 `:8000`을 포함합니다.

   ```properties
   spring.application.name=Backend
   Raspberry.base-url=http://100.x.y.z
   Raspberry.camera-user=${FADO_CAMERA_USER:}
   Raspberry.camera-password=${FADO_CAMERA_PASSWORD:}
   ```

2. PC에서 **새 PowerShell 터미널**을 열고 `FaDO` 폴더에서 실행합니다. 인증 창에 라파에 설정한 것과 같은 아이디와 비밀번호를 입력합니다. Linux 또는 macOS에서는 같은 환경 변수를 설정한 뒤 `Backend/`에서 `./gradlew bootRun`을 실행합니다.

   ```powershell
   $camera = Get-Credential -Message '라파 카메라 아이디와 비밀번호'
   $env:FADO_CAMERA_USER = $camera.UserName
   $env:FADO_CAMERA_PASSWORD = $camera.GetNetworkCredential().Password
   cd Backend
   .\gradlew.bat bootRun
   ```

3. Java가 실행되면 다른 PC 터미널에서 `curl.exe -i http://127.0.0.1:8080/api/v1/raspberry/health`를 실행합니다. 응답 본문에 `"status":"UP"`이 나오면 Java가 라파에 연결된 상태입니다.
4. 다른 터미널에서 [1단계의 웹 화면 실행](#1-웹-화면-실행)을 진행합니다. 스튜디오에 **기기 연결됨**이 뜨면 웹까지 연결된 상태입니다. 웹 설정의 **Raspberry Pi 서버 주소**는 메모용입니다. 실제 연결 주소는 Java의 `Raspberry.base-url`에서 바꿉니다.

## 4. 화면 사용법

| 하고 싶은 일 | 화면에서 할 일 |
| --- | --- |
| 라파 카메라로 자동 표시 | 스튜디오가 라파에 연결되면 **라파 카메라**로 시작합니다. 중지한 뒤 다시 쓰려면 **OLED 자동 표시 시작**을 누릅니다. |
| 노트북 카메라로 전환 | **노트북 카메라 켜기**를 누르고 권한을 허용합니다. 첫 영상이 준비되면 자동 표시가 시작됩니다. **노트북 카메라 끄기**를 누르면 라파 카메라로 돌아갑니다. 노트북 카메라를 써도 추론은 라파에서 진행합니다. |
| 한 번만 인식 확인 | 자동 표시 중이라면 **OLED 자동 표시 중지**를 누른 뒤 **카메라 인식 테스트**를 누릅니다. 웹에 인식 결과가 표시됩니다. |
| 라파 실시간 영상 보기 | **설정 → 라파 카메라 인증**에서 아이디와 비밀번호를 입력하고 **카메라 인증 정보 저장**을 누릅니다. 카메라 패널에서 **라파 영상 켜기**를 누릅니다. 인증 정보는 현재 탭에서 유지되고 새로고침하면 지워집니다. |
| 기본 표정 바꾸기 | **라이브러리 → 수정 → 수정 저장**을 선택합니다. 그 표정이 인식될 때 바꾼 그림이 나옵니다. **원본 복원**으로 되돌립니다. |
| 새 그림을 만들어 직접 표시 | **새 표정 만들기 → 표정 추가**로 저장하고, 라이브러리에서 새 표정을 선택해 OLED에 표시합니다. |

자동 인식은 가장 크게 보이는 얼굴의 **행복·평온·슬픔·화남·놀람** 중 하나를 고릅니다. 같은 표정이 두 번 연속 확인되면 그림이 바뀝니다. 최소 신뢰도는 **웹 자동 표시 45%, 라파 단독 표시 55%**입니다. 자동 표시를 시작하거나 얼굴이 감지되지 않으면 평온 표정을 표시합니다.

웹에서 인식 요청을 보내거나 직접 표정을 표시하면 웹 제어가 우선합니다. 마지막 요청 후 **10초**가 지나면 라파가 자체 인식으로 돌아갑니다. 웹의 자동 표시를 중지하거나 페이지를 닫은 경우에도 이 규칙이 적용됩니다.

## 5. 문제 해결

| 증상 | 확인할 항목 |
| --- | --- |
| `npm start`에 `ENOENT` 또는 `npm ci`에 `EUSAGE`가 표시됨 | 터미널을 `FaDO/Frontend`로 이동합니다. 이 폴더에 `package.json`과 `package-lock.json`이 있어야 합니다. |
| 스튜디오에 **기기 미연결** 표시 | 라파의 로컬 `/health`, PC에서 라파 Tailscale 주소의 `/health`, PC의 Java `/api/v1/raspberry/health` 순서로 확인합니다. Java 응답 본문의 `status`가 `UP`인지 확인하세요. |
| `tailscale ping`은 되는데 라파 `/health`가 실패함 | 프록시 구성은 HTTP 80번 포트, 직접 실행은 Tailscale IP에 바인딩한 8000번 포트를 확인합니다. |
| 라파 인식 또는 영상이 `401`, `502`, `503`으로 실패함 | 영상의 `401`은 웹 설정의 인증 정보를, 인식 오류에 라파 `401`이 표시되면 Java 프로세스 환경의 인증 정보를 확인합니다. 인식에서 `503`이 나오면 Java의 인증 환경 변수와 라파 서비스 로그의 카메라·모델 오류를 확인합니다. |
| 얼굴을 비춰도 평온 표정만 나옴 | 웹의 **카메라 인식 테스트**로 얼굴 검출 여부와 신뢰도를 확인합니다. 라파에서 해당 표정의 PNG 파일도 확인합니다. |
| OLED 테스트 패턴이 보이지 않음 | 터미널의 `OLED 테스트 실패` 메시지와 SPI 활성화, OLED 배선을 확인합니다. FaDO 서버를 멈춘 상태에서 테스트합니다. |
| 테스트 패턴은 보이는데 평온 표정이 보이지 않음 | `RPiServer/expressions/neutral.png`가 라파에 있는지 확인합니다. 정상 파일은 128 × 64 PNG입니다. |
| OLED 단독 테스트는 되는데 서버에서 표정이 바뀌지 않음 | 서비스가 다시 실행 중인지 확인한 뒤 라파 로그에서 카메라·모델 오류를 찾습니다. |
| CSI 카메라에서 `libcamera` 오류 | 라파의 가상환경과 Raspberry Pi OS 시스템 Python의 버전이 같은지, 시스템 Python에서 Picamera2를 사용할 수 있는지 확인합니다. |

## 6. 코드와 테스트

| 위치 | 역할 |
| --- | --- |
| [Frontend](Frontend/) | React 화면과 Canvas 픽셀 편집기. 카메라 입력을 전환하고 Java API를 호출합니다. |
| [Backend](Backend/) | Spring Boot API. 웹 요청을 라파에 전달합니다. |
| [RPiServer](RPiServer/) | FastAPI, 카메라 입력, YOLO/NCNN 표정 분류, 라파 단독 표시 제어. |
| [RaspberryPi](RaspberryPi/) | SPI로 SSD1306 OLED에 이미지를 표시합니다. |

관련 코드 · [카메라 전환](Frontend/src/hooks/useCameraRecognition.js) · [웹 표정 기준](Frontend/src/core/expressionRecognition.js) · [라파 단독 표시](RPiServer/expression_display.py) · [OLED 출력](RaspberryPi/ImgShow.py) · [OLED 테스트](RaspberryPi/OledTest.py)

<details>
<summary>개발 참고용 API 경로</summary>

| 기능 | PC의 Spring Boot | 라파의 FastAPI |
| --- | --- | --- |
| 라파 연결 상태 | `GET /api/v1/raspberry/health` | `GET /health` |
| 노트북 카메라 이미지 인식 | `POST /api/v1/detect` | `POST /yolo/predict` |
| 라파 카메라 인식 | `POST /api/v1/raspberry/camera/detect` | `POST /camera/detect` |
| 라파 영상 미리보기 | `GET /api/v1/raspberry/camera/stream` | `GET /camera/stream` |
| 표정 PNG 저장·삭제 | `POST` 또는 `DELETE /api/v1/expression/image` | `POST` 또는 `DELETE /expression/image` |
| OLED에 표정 표시 | `POST /api/v1/expression` | `POST /expression` |

라파의 모델 상태는 `GET /yolo/model-info`, 카메라 상태는 인증을 넣은 `GET /camera/status`에서 확인합니다. 라파가 실행 중이면 `http://127.0.0.1:8000/docs`에서 FastAPI 요청 형식을 확인할 수 있습니다. Spring Boot의 요청과 응답 형식은 [컨트롤러](Backend/src/main/java/backend/server/RaspberryPi/API/)와 [DTO](Backend/src/main/java/backend/server/RaspberryPi/DTO/)에 있습니다.

</details>

프론트엔드 테스트와 배포 빌드는 `Frontend/`에서 실행합니다.

```shell
npm test
npm run build
```

빌드는 `Frontend/dist/`에 생성됩니다. 웹 서버에서 이 폴더 전체를 제공하고 같은 사이트의 `/api`를 Spring Boot에 연결합니다. 실제 카메라와 OLED는 [2단계의 동작 확인](#2-라파-단독-실행)으로 점검합니다.
