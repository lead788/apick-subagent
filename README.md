# 에이픽 서브에이전트

Codex·Claude Code에서 대량 자료의 조사·추출·요약·비교를 위임합니다. apick.app 스킬 마켓의 **apick-agent** 상품에 연결되는 설치 패키지입니다.

## 설치

각 프로젝트에 전달할 지시문과 운영체제별 키 설정은 [프로젝트별 연동 지침](https://github.com/lead788/apick-subagent/blob/main/docs/project-integration.md)을 참고하세요.

Node.js 22.17 이상에서 프로젝트 폴더를 열고 실행합니다.

```sh
npm install -g apick-subagent
apick-subagent install
```

이어서 인증키를 연결합니다. [apick.app 마이페이지](https://apick.app/my_page) > API 정보에서 **연결 코드 발급**을 누르고, 아래 명령을 실행한 뒤 코드를 붙여 넣고 Enter를 누릅니다. 인증키가 자동으로 이 PC의 사용자 폴더(`.apick-subagent/credentials.json`)에 저장됩니다.

```sh
apick-subagent login
```

연결 코드는 10분 동안 한 번만 쓸 수 있습니다. 새로 발급하면 이전 코드는 쓸 수 없습니다. 같은 자리에 API 키를 직접 붙여 넣어도 됩니다. 입력은 화면에 보이지 않고, 서버에서 확인한 키만 저장하므로 잘못된 값은 남지 않습니다.

저장된 키는 로그아웃으로 지울 수 있습니다. 다른 계정으로 바꾸려면 `login`을 다시 실행하세요.

```sh
apick-subagent logout
```

Codex·Claude Code를 다시 시작한 뒤 연결을 확인합니다.

```sh
apick-subagent doctor
```

`doctor`는 키가 어디서 왔는지(`saved` 저장된 키, `environment` 환경변수, `none` 없음)도 보여 줍니다. 여러 PC나 CI에서는 `APICK_API_KEY` 환경변수를 쓰는 방법도 계속 지원합니다. 어느 방법이든 코드와 키를 명령행 인자, 대화, 공개 파일에 넣지 마세요.

설치기는 기존 로그인·모델·다른 MCP 설정을 보존합니다. 설정 백업은 사용자 폴더의 `.apick-subagent/backups`에 보관합니다. 제거는 `apick-subagent uninstall`입니다. 패키지가 만든 설정만 제거하며 사용자가 수정한 파일·키·백업은 보존합니다.

## 사용

“현재 프로젝트의 docs/**/*.md를 apick-subagent에 위임해 상충하는 요구사항을 비교하고 핵심 근거를 검수해 줘”처럼 범위를 지정하세요. 주 에이전트는 원문을 전부 읽기 전에 위임하고, 결과의 인용·줄 번호·해시를 직접 확인합니다. 설치 성공은 자동 위임 성공을 보장하지 않습니다. 도구 호출 기록과 사용 통계에서 실제 위임을 확인하세요.

클라이언트가 제공하는 작업 공간 루트를 우선 사용합니다. 루트를 제공하지 않는 클라이언트는 실행한 프로젝트 폴더를 사용합니다. 필요하면 `APICK_WORKSPACE` 환경변수로 명시하세요. 홈 폴더·드라이브 전체 수집은 허용하지 않습니다. 프로젝트 밖 경로·링크·비밀 파일은 제외하며, 키가 포함된 내용은 전송을 중단합니다. 비밀정보 탐지는 모든 형태를 보장하지 않으므로 필요한 파일만 선택하세요.

도구: `apick_status`, `apick_dispatch`, `apick_collect`, `apick_evidence`, `apick_review`, `apick_cancel`, `apick_usage`.

접수에는 재사용 가능한 `idempotency_key`가 필요합니다. 응답 유실 시 같은 키·같은 내용으로 다시 확인합니다. 접수 영수증은 개인 설정 폴더에 저장되며 원문이나 API 키를 담지 않습니다.

## 요금과 보관

설치비·도입비·구독료는 없습니다. 성공한 작업만 사용량대로 정산합니다. 성공한 작업은 최소 1P이며, AI를 사용한 작업은 작업당 기본요금 5P가 최소액입니다. 검수 승인된 동일 결과 캐시 재사용과 `inventory` 목록 작업은 외부 모델을 호출하지 않으며 1P입니다. 충전 잔액 외 건수·토큰·누적금액 상품 한도는 없습니다.

자료는 고객별로 분리·암호화해 7일 보관합니다. `retention: none`은 검수 직후 삭제하며 임시 보관은 최대 1시간입니다. 즉시 삭제도 지원합니다. 실패·취소·자동 검증 실패는 청구하지 않으며, 응답이 유실된 작업의 사용량을 0으로 단정하지 않습니다. 주 모델 실제 비용 미연동은 절감률로 확정하지 않습니다.

## 제작 템플릿과 연동

`templates/SKILL.md`를 바탕으로 업무별 스킬을 만들 수 있습니다. API 키가 있어야 작업을 실행할 수 있습니다. 원격 MCP 주소는 `https://apick.app/mcp/subagent`, REST 기본 주소는 `https://apick.app/rest/subagent/v1`입니다. 원격 MCP는 업로드된 파일 ID를 받으며 로컬 수집은 이 패키지의 브리지가 담당합니다.

- [REST·MCP 가이드](https://apick.app/dev_guide/subagent)
- [내 사용 통계](https://apick.app/subagent/usage)
- [스킬 마켓 상품](https://apick.app/skills/apick-agent)

## 개발 검증

`npm test`는 모의 통신과 임시 파일만 사용합니다. 유료 API를 호출하지 않습니다.

결과는 목표에 해당하는 원문 인용을 출처별로 묶은 근거형 요약입니다. 비교는 동일 문구와 자료별 고유 문구를 구분합니다. 인용·행·해시 자동 검증과 최종 의미 판단은 구분하며, 최종 결론은 주 에이전트가 검수합니다.
