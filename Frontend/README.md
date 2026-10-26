# FaDO React Frontend

FaDO 프로젝트의 React 프론트엔드입니다. React 19, JSX, Context + useReducer, 커스텀 훅을 사용합니다.
## 실행과 빌드

Node.js 24 환경에서 검증했습니다.

```powershell
npm ci
npm start
```

프론트엔드 확인용 개발 서버: `http://127.0.0.1:3000/#studio`

표정 선택은 Java 백엔드의 `POST /api/v1/expression`에 `{ "expressionId": "happy" }` 형식으로 요청합니다. 개발 서버의 `/api` 프록시 대상은 `http://127.0.0.1:8080`이며 `webpack.config.dev.js`에서 변경할 수 있습니다. 운영에서는 같은 사이트 주소에서 `/api`를 Java 백엔드로 연결해야 합니다.

표정을 선택하거나 편집기에서 저장하면 `POST /api/v1/expression/image`에 `multipart/form-data`로 PNG를 자동 저장합니다. 선택할 때는 PNG 저장 성공 후 ID 선택 요청을 보냅니다. 백엔드에 추가할 수신·파일 저장 코드는 [TXT 예제](docs/png-upload-backend.txt)에 있습니다.

사용자 표정을 삭제하면 `DELETE /api/v1/expression/image?expressionId=...`로 서버 PNG를 먼저 삭제합니다. 기존 Java 삭제 메서드는 [삭제 API 수정 TXT](docs/png-delete-backend.txt)에 맞춰 교체해야 합니다.

```powershell
npm test
npm run build
```

`dist/`가 배포 결과입니다. 별도로 구현 중인 백엔드나 정적 웹 서버에서 이 폴더 전체를 제공하면 운영 환경에서 프론트엔드 개발 서버를 실행할 필요가 없습니다. 화면 이동은 `#studio`, `#library`, `#settings`, `#guide`를 사용하므로 별도 라우트 재작성 규칙도 필요하지 않습니다.

Webpack과 Babel로 JSX를 빌드합니다. 페이지와 편집기는 `React.lazy`·`Suspense`로 필요할 때 불러옵니다. `dist/js/app.js`뿐 아니라 해시가 붙은 페이지 청크와 CSS도 함께 배포해야 합니다. 현재 정적 파일 경로는 사이트 루트(`/`) 기준입니다.

## 프로젝트 구조

```text
public/
  index.html                       # 메타데이터, CSS 연결, React 마운트 영역
  icon.svg                         # 사이트·앱 아이콘
  site.webmanifest                 # 웹 앱 메타데이터
  robots.txt                       # 검색 로봇 설정
babel.config.cjs                   # JSX 자동 런타임 설정
webpack.common.js                  # React 진입점, Babel, HTML 생성·정적 파일 복사
src/
  main.jsx                         # createRoot, StrictMode, Provider 연결
  App.jsx                          # 라우트별 페이지와 편집기 조합, 단축키
  components/
    Layout.jsx                     # 사이드바·헤더·모바일 메뉴·본문
    PageHeading.jsx                # 공통 페이지 제목
    ExpressionCard.jsx             # 표정 선택·수정·삭제·내보내기 카드
    BitmapCanvas.jsx               # ref와 effect로 픽셀을 그리는 캔버스
    Icon.jsx                       # 문자열 삽입을 사용하지 않는 SVG 컴포넌트
  context/
    WorkspaceContext.jsx           # useReducer 상태, 저장 데이터 읽기·쓰기
    ToastContext.jsx               # 알림 상태와 타이머 정리
  hooks/
    useHashRoute.js                # 해시 변경 구독, 제목·스크롤 갱신
    useDemo.js                     # 데모 타이머 생성·정리
    useCamera.js                   # 로컬 카메라 요청, 화면 이탈·언마운트 정리
  core/
    workspace.js                   # 순수 reducer, 초기 상태, 조회 함수
    router.js                      # 페이지 이름과 라우트 검증
  pages/
    studio/StudioPage.jsx          # OLED 미리보기, 표정 분포 예시, 자동 데모
    library/LibraryPage.jsx        # 검색·필터·사용자 표정 목록
    settings/SettingsPage.jsx      # 제어 입력 폼, 화면 설정, 카메라 확인
    guide/GuidePage.jsx            # 사용 가이드
  features/
    useExpressionActions.js        # 표정 선택·편집·저장·삭제·내보내기
    editor/
      ExpressionEditor.jsx         # 제어형 dialog, 마우스·터치·키보드 이벤트
      model.js                     # React·DOM에 의존하지 않는 픽셀 편집 모델
  services/
    api.js                         # Java 백엔드에 표정 선택 요청
    png.js                         # 다운로드·업로드 공통 128 × 64 PNG 생성
    storage.js                     # 기존 localStorage 형식과 호환되는 저장 계층
    camera.js                      # 권한 요청, 지연 응답 취소, 스트림 종료
    demo.js                        # 중복 타이머 방지
    export.js                      # PNG·JSON 생성과 다운로드
  data/presets.js                   # 기본 표정 이름·색상·단축키
  utils/
    bitmap.js                      # 기본 비트맵 생성과 캔버스 렌더링
    id.js                          # HTTP 환경에서도 생성 가능한 사용자 표정 ID
css/
  style.css                        # 스타일 진입점
  base.css, layout.css              # 공통 색상·글꼴·레이아웃
  components.css, toast.css         # 공통 UI 스타일
  pages/                           # studio·library·settings·guide 스타일
  editor.css, responsive.css        # 편집기·반응형 스타일
tests/
  react-app.test.jsx               # 실제 React 렌더링과 훅 수명 검증
  workspace.test.mjs                # reducer·검색·라우트·저장·내보내기 검증
  editor-model.test.mjs             # 그리기·지우기·되돌리기 검증
  services.test.mjs                 # 타이머·카메라 요청 취소 검증
  id.test.mjs                       # UUID 및 대체 ID 생성 검증
  png-upload.test.mjs               # PNG 생성 조건·multipart 파일 전송·오류 검증
docs/png-upload-backend.txt          # Java PNG 수신·서버 파일 저장 예제
docs/png-delete-backend.txt          # Java PNG 삭제 메서드 교체 예제
dist/                              # 빌드 결과: 직접 수정하지 않음
```

화면 마크업과 이벤트는 해당 `.jsx`, 스타일은 `css/`, 재사용 가능한 순수 로직은 `core/`·`services/`·편집기 모델에서 수정합니다. 캔버스와 네이티브 dialog처럼 브라우저 API가 필요한 부분만 `ref`와 effect를 사용합니다. UI 값을 바꾸기 위해 `innerHTML`이나 `querySelector`를 사용하지 않습니다.

`public/index.html`은 React를 붙이는 최소 진입 문서입니다. 화면별 HTML 파일을 만들지 않고 `src/pages/`와 `src/components/`의 JSX를 수정합니다. JavaScript 번들 태그는 Webpack이 자동으로 넣습니다. `public/`의 나머지 파일과 `css/`는 개발·운영 빌드에서 같은 경로로 제공하며, 프로젝트 원본 폴더를 개발 서버의 정적 파일 경로로 노출하지 않습니다. 기본 템플릿의 미사용 `404.html`, `favicon.ico`, `icon.png`, `js/`, `img/`는 제거했습니다.

## 기능과 데이터 호환성

- 표정 6개 선택, 128 × 64 OLED 미리보기, 밝기 조절, PNG 저장
- 표정 선택·편집 저장 시 PNG 자동 업로드, 요청 순서 보장, 실패 후 재시도
- 사용자 표정 삭제 시 서버 PNG 삭제 후 브라우저 목록·저장 데이터 갱신
- 2.8초 간격 자동 데모, 일시정지, 수동 선택 시 재생 중단
- 라이브러리 이름 검색, 기본·사용자 표정 필터, 복사해서 편집, JSON 내보내기
- 픽셀 편집: 2/4/8px 브러시, 지우개, 되돌리기, 초기화, 이름 지정, 저장·수정·삭제
- 기기 이름·서버 주소 저장, 카메라 좌우 반전, 예시 신뢰도 표시
- 사용자 권한을 받은 로컬 카메라 미리보기와 페이지 이탈 시 스트림 종료
- 반응형 화면, 키보드 조작, 감소된 모션 설정 지원

기존 `localStorage` 키 `fado.workspace.v1`과 픽셀 JSON 형식을 유지했습니다. 이전 버전에서 만든 표정과 설정을 그대로 읽습니다. 수동으로 선택한 표정이 저장되며 자동 데모로 잠시 바뀐 표정은 마지막 수동 선택을 덮어쓰지 않습니다. 브라우저 데이터를 삭제하면 저장한 표정도 삭제되므로 중요한 표정은 JSON으로 내보내 보관해주세요.

스튜디오에서는 숫자 `1`~`6`으로 표정을 선택합니다. 편집기 캔버스에서는 방향키로 이동하고 Space로 그립니다. Esc로 편집기를 닫습니다.

버튼과 숫자 단축키는 같은 표정 선택 함수를 사용합니다. 선택할 표정의 PNG를 먼저 저장한 뒤 선택 명령을 전송하며, 모두 성공하면 화면과 마지막 선택을 갱신합니다. 실패하면 기존 선택을 유지하고 다음 요청을 처리합니다. 선택·편집 저장·삭제 요청은 하나의 대기열에서 처리하며, 앱을 종료하면 아직 전송하지 않은 대기 요청을 버립니다.

새 표정 ID는 `crypto.randomUUID()`를 우선 사용하고, 사용할 수 없는 HTTP 환경에서는 `getRandomValues()`로 생성합니다. Web Crypto 전체가 없는 환경에서도 로컬 식별자를 생성할 수 있습니다.

## 표정 PNG 자동 저장

별도 업로드 버튼 없이 동작합니다. 기본·사용자 표정을 카드나 숫자 단축키로 선택하면 PNG를 서버에 저장한 다음 ID 선택 요청을 보냅니다. 편집기의 `표정 저장하기`는 새 표정이나 수정한 표정을 브라우저에 먼저 보관하고 PNG를 서버에 자동 저장합니다. 같은 ID를 다시 저장하면 서버 PNG를 갱신합니다. 편집 저장 자체는 ID 선택 명령을 보내지 않습니다.

편집기에서 서버 저장에 실패해도 그린 픽셀은 브라우저에 남습니다. 다시 편집 저장하거나 라이브러리에서 표정을 선택하면 PNG 저장을 재시도합니다. 앱을 켤 때 모든 표정을 일괄 업로드하거나, 그리는 중 매 픽셀 변경을 전송하거나, 자동 데모가 바뀔 때 업로드하는 기능은 없습니다.

`src/services/png.js`가 원본 bitmap을 검정 배경·흰 픽셀의 불투명한 128 × 64 PNG Blob으로 만듭니다. 미리보기의 밝기와 CSS 색상은 이미지에 적용하지 않습니다. `src/services/api.js`의 `uploadExpressionPng()`는 다음 필드를 `FormData`에 넣습니다.

| 필드 | 내용 |
| --- | --- |
| `expressionId` | 기본 표정 ID 또는 `custom-...` |
| `name` | 표정 이름 |
| `file` | `image/png` 파일, `fado-<표정ID>.png` |

파일을 먼저 내려받거나 다시 선택할 필요 없이 메모리에서 생성해 전송합니다. 로컬 PNG 저장도 같은 생성 함수를 사용합니다. multipart의 boundary는 브라우저가 지정하므로 `Content-Type` 헤더를 직접 설정하지 않습니다. [MDN FormData 문서](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest_API/Using_FormData_Objects)

백엔드 수신 예제는 `@RequestParam`으로 ID·이름을 받고 `@RequestPart("file") MultipartFile`로 PNG를 받아 서버 실행 폴더의 `uploads/expressions/`에 저장합니다. 기존 JSON 선택 API와 함께 사용할 수 있습니다. [Spring multipart 문서](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/multipart-forms.html)

삭제 요청은 multipart 본문 없이 `expressionId` 쿼리 매개변수를 사용합니다. 서버는 `<표정ID>.png` 파일만 `Files.deleteIfExists(target)`으로 삭제하고, 파일이 없어도 `204 No Content`를 반환합니다. API 경로 누락으로 인한 404나 서버·네트워크 오류는 실패로 처리하며 로컬 표정을 보존합니다. 삭제는 앞선 업로드·선택 작업 뒤에 순서대로 실행하며 중복 삭제는 막습니다. 서버 삭제 성공 후에만 브라우저 상태와 localStorage에서 사용자 표정을 제거합니다. PC에 따로 내려받은 PNG나 Raspberry Pi의 파일은 이 API의 삭제 대상이 아닙니다.

### 자동 실행을 연결하는 위치

화면 버튼의 `onClick`에만 연결된 기능을 자동 실행하려면, 해당 작업이 완료되는 액션 안에서 호출합니다. 이 프로젝트에서는 `src/features/useExpressionActions.js`가 그 지점입니다.

- `save(expression)`: `dispatch({ type: 'save-expression', expression })`로 로컬 데이터를 보존한 다음 대기열에서 `await uploadExpressionPng(expression)`을 실행합니다. App은 저장 액션 호출 후 편집기를 닫습니다.
- `select(id)`: ID로 표정 객체를 찾고 대기열에서 `await uploadExpressionPng(expression)` → `await sendExpression(id)` → 선택 상태 변경 순서로 실행합니다.
- `enqueue()`: 저장·선택·삭제가 동시에 서버 파일을 바꾸지 않도록 Promise 대기열을 유지합니다. 앞선 작업이 실패해도 다음 작업을 이어서 처리합니다.
- `ExpressionCard.jsx`, `StudioPage.jsx`: 업로드 버튼을 제거하고 저장 중 상태를 표시합니다. PNG를 내 컴퓨터에 내려받는 버튼은 유지합니다.

`useEffect`로 모든 상태 변경을 감시해 전송하지 않고, 사용자의 저장·선택 이벤트에서 호출합니다. 검색·밝기 변경이나 데모 때문에 같은 PNG가 의도치 않게 저장되는 것을 피할 수 있습니다.

## 백엔드 연동 지점

- 표정 선택 API 경로와 요청 형식은 `src/services/api.js`에 정의되어 있습니다. 추가 HTTP·WebSocket 통신 모듈도 `src/services/`에 둡니다.
- `src/features/useExpressionActions.js`의 `select()`가 API 요청 순서와 성공·실패 처리를 관리합니다.
- 서버의 인식 결과를 화면에 반영하려면 `src/core/workspace.js`에 해당 reducer 액션을 추가하고, React 훅에서 `useWorkspace()`의 `dispatch()`로 전달합니다.
- 서버 저장으로 전환할 때는 `src/services/storage.js`와 `src/context/WorkspaceContext.jsx`의 저장 effect를 조정합니다.
- Raspberry Pi 영상으로 전환할 때는 `useCamera.js`와 설정 화면의 영상 컴포넌트를 실제 스트림 규격에 맞게 연결합니다.

현재 표정 인식 수치는 **데모 예시**입니다. 프론트는 사용자의 선택·편집 저장 시 표정 PNG를 Java API에 자동 저장하고, 표정 선택 시에는 ID 명령도 전달합니다. 수신 예제를 백엔드에 추가해야 하며, Raspberry Pi로의 재전송과 실제 OLED 출력은 백엔드에서 처리해야 합니다. 설정의 서버 주소는 저장만 하며 실제 개발 API 연결 주소는 프록시 설정으로 지정합니다. 로컬 카메라 영상은 전송·저장하지 않습니다.

내보내는 JSON은 `version`, `name`, `width`, `height`, `format`, `pixels`를 포함합니다. `pixels`는 왼쪽 위부터 행 단위로 나열된 8,192개의 `0`/`1` 배열(`row-major-binary`)입니다. SSD1306 페이지 단위 바이트 변환과 I²C 전송은 백엔드에서 처리합니다.

## 테스트

`npm test`는 Node 테스트 러너·tsx·jsdom으로 44개 테스트를 실행합니다. React 테스트는 `StrictMode`에서 실제 컴포넌트를 마운트해 선택 전 PNG 저장 순서, 편집 저장·수정 시 자동 업로드, 실패 시 로컬 보존과 재시도, 여러 저장·선택·삭제 요청의 순서, 이전 선택 응답이 새 편집 저장의 미리보기를 덮어쓰지 않는지, 앱 종료 후 대기 요청 정리, 편집·되돌리기·저장·검색, UUID API가 없는 환경의 저장, 설정 폼 유지, 타이머와 카메라 정리를 검증합니다. PNG 테스트는 이미지 크기·픽셀 좌표·배경 합성, multipart 파일·메타데이터, 삭제 요청 형식과 오류를 검증합니다. canvas 인코딩과 API는 모의 처리하고 카메라는 가짜 스트림을 사용하므로 테스트를 위해 실제 서버나 카메라 권한이 필요하지 않습니다.

## 참고

- [React: 기존 프로젝트에 React 추가](https://react.dev/learn/add-react-to-an-existing-project)
- [React: effect 수명과 정리](https://react.dev/reference/react/useEffect)
- [Babel: JSX 자동 런타임](https://babeljs.io/docs/babel-preset-react)
- [MDN: HTTP 환경에서도 사용할 수 있는 getRandomValues](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues)
