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
