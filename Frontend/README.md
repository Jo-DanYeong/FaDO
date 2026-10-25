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
dist/                              # 빌드 결과: 직접 수정하지 않음
```

화면 마크업과 이벤트는 해당 `.jsx`, 스타일은 `css/`, 재사용 가능한 순수 로직은 `core/`·`services/`·편집기 모델에서 수정합니다. 캔버스와 네이티브 dialog처럼 브라우저 API가 필요한 부분만 `ref`와 effect를 사용합니다. UI 값을 바꾸기 위해 `innerHTML`이나 `querySelector`를 사용하지 않습니다.

`public/index.html`은 React를 붙이는 최소 진입 문서입니다. 화면별 HTML 파일을 만들지 않고 `src/pages/`와 `src/components/`의 JSX를 수정합니다. JavaScript 번들 태그는 Webpack이 자동으로 넣습니다. `public/`의 나머지 파일과 `css/`는 개발·운영 빌드에서 같은 경로로 제공하며, 프로젝트 원본 폴더를 개발 서버의 정적 파일 경로로 노출하지 않습니다. 기본 템플릿의 미사용 `404.html`, `favicon.ico`, `icon.png`, `js/`, `img/`는 제거했습니다.

## 기능과 데이터 호환성

- 표정 6개 선택, 128 × 64 OLED 미리보기, 밝기 조절, PNG 저장
- 2.8초 간격 자동 데모, 일시정지, 수동 선택 시 재생 중단
- 라이브러리 이름 검색, 기본·사용자 표정 필터, 복사해서 편집, JSON 내보내기
- 픽셀 편집: 2/4/8px 브러시, 지우개, 되돌리기, 초기화, 이름 지정, 저장·수정·삭제
- 기기 이름·서버 주소 저장, 카메라 좌우 반전, 예시 신뢰도 표시
- 사용자 권한을 받은 로컬 카메라 미리보기와 페이지 이탈 시 스트림 종료
- 반응형 화면, 키보드 조작, 감소된 모션 설정 지원

기존 `localStorage` 키 `fado.workspace.v1`과 픽셀 JSON 형식을 유지했습니다. 이전 버전에서 만든 표정과 설정을 그대로 읽습니다. 수동으로 선택한 표정이 저장되며 자동 데모로 잠시 바뀐 표정은 마지막 수동 선택을 덮어쓰지 않습니다. 브라우저 데이터를 삭제하면 저장한 표정도 삭제되므로 중요한 표정은 JSON으로 내보내 보관해주세요.

스튜디오에서는 숫자 `1`~`6`으로 표정을 선택합니다. 편집기 캔버스에서는 방향키로 이동하고 Space로 그립니다. Esc로 편집기를 닫습니다.

버튼과 숫자 단축키는 같은 표정 선택 함수를 사용합니다. 연속 선택 요청은 순서대로 전송하고, 각 요청이 성공하면 화면과 마지막 선택을 갱신합니다. 실패하면 기존 선택을 유지하고 다음 요청을 처리합니다. 앱을 종료하면 아직 전송하지 않은 대기 요청을 버립니다.

새 표정 ID는 `crypto.randomUUID()`를 우선 사용하고, 사용할 수 없는 HTTP 환경에서는 `getRandomValues()`로 생성합니다. Web Crypto 전체가 없는 환경에서도 로컬 식별자를 생성할 수 있습니다.

## 백엔드 연동 지점

- 표정 선택 API 경로와 요청 형식은 `src/services/api.js`에 정의되어 있습니다. 추가 HTTP·WebSocket 통신 모듈도 `src/services/`에 둡니다.
- `src/features/useExpressionActions.js`의 `select()`가 API 요청 순서와 성공·실패 처리를 관리합니다.
- 서버의 인식 결과를 화면에 반영하려면 `src/core/workspace.js`에 해당 reducer 액션을 추가하고, React 훅에서 `useWorkspace()`의 `dispatch()`로 전달합니다.
- 서버 저장으로 전환할 때는 `src/services/storage.js`와 `src/context/WorkspaceContext.jsx`의 저장 effect를 조정합니다.
- Raspberry Pi 영상으로 전환할 때는 `useCamera.js`와 설정 화면의 영상 컴포넌트를 실제 스트림 규격에 맞게 연결합니다.

현재 표정 인식 수치는 **데모 예시**입니다. 프론트는 표정 ID를 Java API에 전달하며 Raspberry Pi 통신과 실제 OLED 출력은 백엔드에서 처리합니다. 사용자 표정의 픽셀 데이터는 브라우저에 저장되므로 기기에서 사용할 데이터 업로드·동기화는 별도로 연결해야 합니다. 설정의 서버 주소는 저장만 하며 실제 개발 API 연결 주소는 프록시 설정으로 지정합니다. 로컬 카메라 영상은 전송·저장하지 않습니다.

내보내는 JSON은 `version`, `name`, `width`, `height`, `format`, `pixels`를 포함합니다. `pixels`는 왼쪽 위부터 행 단위로 나열된 8,192개의 `0`/`1` 배열(`row-major-binary`)입니다. SSD1306 페이지 단위 바이트 변환과 I²C 전송은 백엔드에서 처리합니다.

## 테스트

`npm test`는 Node 테스트 러너·tsx·jsdom으로 27개 테스트를 실행합니다. React 테스트는 `StrictMode`에서 실제 컴포넌트를 마운트해 버튼·단축키의 API 요청, 연속 선택의 전송 순서, 네트워크·HTTP 오류 처리, 종료 후 대기 요청 정리, 편집·되돌리기·저장·검색, UUID API가 없는 환경의 저장, 설정 폼 유지, 타이머와 카메라 정리를 검증합니다. API는 모의 응답을 사용하고 카메라는 가짜 스트림을 사용하므로 테스트를 위해 실제 서버나 카메라 권한이 필요하지 않습니다.

## 참고

- [React: 기존 프로젝트에 React 추가](https://react.dev/learn/add-react-to-an-existing-project)
- [React: effect 수명과 정리](https://react.dev/reference/react/useEffect)
- [Babel: JSX 자동 런타임](https://babeljs.io/docs/babel-preset-react)
- [MDN: HTTP 환경에서도 사용할 수 있는 getRandomValues](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues)
