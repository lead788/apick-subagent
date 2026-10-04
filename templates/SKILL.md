---
name: my-research-skill
description: 지정한 자료의 근거를 모아 검수 가능한 조사 결과를 만든다.
---

# 조사 스킬 제작 예시

`apick-subagent` 설치와 `APICK_API_KEY` 설정이 필요하다.
작업 목적에 맞는 include·exclude와 검수 기준을 정한다.
`apick_status` 확인 후 `apick_dispatch`에 조사·추출·요약·비교 중 하나를 맡긴다.
`apick_collect` 결과에서 필요한 근거만 `apick_evidence`로 확인한다.
원문 대조 후 결과 해시와 함께 `apick_review`에 검수 결정을 기록한다.
명확한 근거와 남은 불확실성을 구분해 전달한다.
API 키·고객 원문·서버 구현을 이 패키지에 넣지 않는다.
