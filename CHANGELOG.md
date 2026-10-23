# 1.0.5

- 마이페이지(API 정보)에서 발급한 일회용 연결 코드를 `apick-subagent login`에 붙여 넣으면 인증키가 자동으로 연결됩니다. 코드는 10분 동안 한 번만 쓸 수 있습니다. API 키를 직접 붙여 넣는 방법도 계속 지원합니다.
- `apick-subagent login`·`logout`을 추가했습니다. 입력은 화면에 보이지 않고, 서버에서 확인한 키만 사용자 폴더에 저장합니다. 코드와 키를 명령행 인자로 받지 않습니다.
- `doctor`가 `key_source`(`saved`·`environment`·`none`)를 보여 주고, `install`은 키가 없으면 연결 코드 발급과 `login`을 안내합니다.
- Paste a one-time connection code from My Page (API info) into `apick-subagent login` and the key is linked automatically. A code works once within 10 minutes. Pasting the API key directly still works.
- Added `apick-subagent login` and `logout`. Input is hidden, only a key verified with the server is saved to the user folder, and codes or keys are never accepted as command arguments.
- `doctor` reports `key_source` (`saved`, `environment` or `none`), and `install` points to the connection code and `login` when no key is set.

# 1.0.4

- 요금 안내 문구를 서버와 맞췄습니다. `README.md`·`README.en.md`·`skill/SKILL.md`와 `apick_dispatch` 도구 설명에서 시행일(2026-11-06)과 소수점 올림 표기를 뺐습니다. 요금과 동작은 바뀌지 않았습니다.
- Pricing notes now match the server: the effective date (2026-11-06) and the rounding note were removed from `README.md`, `README.en.md`, `skill/SKILL.md` and the `apick_dispatch` tool description. Prices and behavior are unchanged.

# 1.0.3

- 요금 안내 문구를 정리했습니다. 성공한 작업만 사용량대로 정산하고 소수점은 올림하며, 2026-11-06부터 AI 사용 작업은 기본요금 5P입니다. 요금과 동작은 바뀌지 않습니다.
- Billing notes now describe only what you are charged: successful work is billed by actual usage, fractions are rounded up, and AI jobs have a 5-point base fee from 2026-11-06. Prices and behaviour are unchanged.

# 1.0.2

- 요금 안내 갱신(에이픽 이용약관 제9조 개정, 2026-11-06 시행): 소수점은 작업마다 올림, 성공 작업 최소 1P, AI 사용 작업 기본요금 5P, 캐시 재사용·`inventory` 1P. 설치비·도입비·구독료는 없습니다. 동작 변경은 없습니다.
- Pricing notes (Terms art. 9, effective 2026-11-06): fractions rounded up per job, 1-point minimum per successful job, 5-point base fee for jobs that use AI, cache reuse and `inventory` 1 point. No installation, setup or subscription fee. No behavior changes.

# 1.0.1

- Codex MCP 자식 프로세스에 APICK_API_KEY 환경변수를 명시적으로 전달합니다.

# 변경 기록

## 1.0.0

- apick-agent 설치형 상품의 Codex·Claude Code 스킬과 로컬 MCP 브리지.
- 작업 공간 파일 직접 수집, 변경분 업로드, 영속 멱등 접수, 근거 검수.
- 사용량 과금·무료 결과 캐시·7일 보관·저장 안 함 안내와 제작 템플릿.
