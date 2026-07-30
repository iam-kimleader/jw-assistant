# jw-assistant

김동언 형제(35세, 광주양림회중)의 개인 성경 연구를 돕는 도구다.
신세계역 성경 66권의 본문과 상호참조를 로컬 파일로 구축하고 기계로 검증한다.
설계 문서는 `docs/superpowers/specs/2026-07-29-jw-assistant-design.md`,
구현 계획은 `docs/superpowers/plans/2026-07-29-bible-core.md` 에 있다.

## 파이프라인

산출물은 아래 순서로만 만들어진다. 뒤 단계는 앞 단계의 산출물을 전제하므로 순서를
바꾸면 안 된다.

1. `npm run unpack` — 원본 jwpub 에서 SQLite DB 를 `.cache/nwtsty_KO.db` 로 꺼낸다.
2. `npm run extract:index` — DB 에서 권·장·절 인덱스를 뽑아 `core/bible/index.json` 을 만든다.
3. `npm run fetch:bible` — wol.jw.org 에서 본문을 장 단위로 받아 `core/bible/text/` 에 쓴다.
   1.5초 간격으로 1,189장을 받으므로 약 30분이 걸린다. 받은 원본 HTML 을 `.cache/wol/` 에
   캐시하므로, 중간에 끊겨도 이미 받은 장은 다시 받지 않고 안전하게 이어받을 수 있다.
4. `npm run verify` — 수집된 본문이 인덱스 기준선과 일치하는지 검사한다.
5. `npm run extract:refs` — DB 의 절-대-절 상호참조를 뽑아 `core/bible/refs/` 에 TSV 로 쓴다.
6. `npm run verify:refs` — 상호참조가 DB 재계산 값과 일치하는지 검사한다.

## 성구 조회

성구 하나 또는 범위를 주면 본문과 난외 참조를 양방향으로 펼쳐 준다.

```bash
npm run 성구 -- "마태복음 24:14"
npm run 성구 -- "시편 3:0-3"
npm run 성구 -- "열왕기상 6:37-7:1"
```

출력은 세 부분이다. **본문**, **이 성구가 가리키는 참조**(각각 본문까지), 그리고 **이 성구를 가리키는 참조**다. 세 번째가 난외 참조에는 없는 정보다. 난외 참조는 한쪽 방향으로만 기록되어 있어서, 어느 성구들이 이곳을 가리키는지는 65,578건을 뒤집어야 알 수 있다.

권 이름은 공백을 넣어도 되고 빼도 된다. 시편 표제는 0절로 조회한다.
`lookup` 이라는 영문 별칭도 같은 일을 한다.
