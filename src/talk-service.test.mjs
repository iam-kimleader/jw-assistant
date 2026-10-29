// 세 API가 부르는 조립 계층을 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { 배정목록, 뼈대준비, 원고준비, 환경만들기 } from './talk-service.mjs';

const 교재 = readFileSync('tests/fixtures/교재-배정.html', 'utf8');
const 가짜조회 = async () => 교재;
// weekDocuments 는 네트워크를 타므로 테스트에서 가짜를 넣는다.
const 가짜주 = async () => ({ 교재docId: 202026248, 주라벨: '2026년 8월 24-30일' });
const 매니페스트 = { 읽가: { 제목: '가', 조회일: '2026-08-25', 과: [{ 번호: 1, 제목: '효과적인 서론', 요점: '흥미를 일으킵니다.', 원칙: '', docid: 1102018441 }] }, 랑제: { 제목: '나', 조회일: '2026-08-25', 과: [] } };
const 읽기 = () => null;
const 형제 = { 성별: '형제', 연령: 35, 임명: '미임명', 파이오니아: false, 스타일: '논리형', 문체견본: '', 분당글자수: 320 };

test('연설이 아닌 항목은 목록에서 뺀다', async () => {
  const { 배정 } = await 배정목록({ 날짜: '2026-08-24', 프로필: 형제, 조회: 가짜조회, 주찾기: 가짜주 });

  assert.ok(!배정.some(x => x.종류 === '연설아님'));
  assert.ok(배정.some(x => x.번호 === 1));
});

test('자격 게이트가 목록에 씌워진다', async () => {
  const { 배정 } = await 배정목록({ 날짜: '2026-08-24', 프로필: 형제, 조회: 가짜조회, 주찾기: 가짜주 });
  const 보물 = 배정.find(x => x.번호 === 1);
  const 시연 = 배정.find(x => x.번호 === 4);

  assert.equal(보물.가능, false);
  assert.equal(시연.가능, true);
  assert.match(보물.사유, /장로/);
});

test('공개강연 카드가 언제나 함께 온다', async () => {
  const { 공개강연카드 } = await 배정목록({ 날짜: '2026-08-24', 프로필: { ...형제, 임명: '장로' }, 조회: 가짜조회, 주찾기: 가짜주 });

  assert.equal(공개강연카드.종류, '공개강연');
  assert.equal(공개강연카드.가능, true);
  assert.equal(공개강연카드.시간초, 1800);
});

test('교재 조회가 실패하면 예외를 던진다', async () => {
  await assert.rejects(
    () => 배정목록({ 날짜: '2026-08-24', 프로필: 형제, 주찾기: 가짜주, 조회: async () => { throw new Error('ETIMEDOUT'); } }),
    /ETIMEDOUT/,
  );
});

test('원고 준비가 산출물 네 개와 시간을 함께 돌려준다', async () => {
  const 뼈대 = {
    제목: '가', 종류: '보물연설', 배정시간: 600, 지정요점: null, 주제성구: null, 설정: null,
    구간: [{ 이름: '서론', 시작초: 0, 끝초: 60, 목적: '연다' }],
    대사: [], 단락: [{ 소제목: '소제목', 출처: '교재', 요점: [], 예화: '', 적용: '', 성구주소: [] }],
    성구: [], 축약순서: [], 출처: [], 경고: [],
  };
  const { 산출물, 시간 } = await 원고준비(
    { 뼈대, 프로필: 형제 },
    { 매니페스트, 읽기, 설정: { apiKey: '', fetchImpl: async () => { throw new Error('x'); } } },
  );

  assert.deepEqual(Object.keys(산출물).sort(), ['낭독대본', '점검표', '준비원고', '큐카드']);
  assert.equal(시간.배정초, 600);
  assert.equal(typeof 시간.총초, 'number');
});

// 출판물 본문이 아니라 시험용으로 지은 문장이다. 이 저장소는 출판물 본문을 담지 않는다.
const 가짜기사 = 문장 => `<article id="article" class="article document docId-9000001 pub-w">
  <p id="p1">${문장}</p>
  <input type="hidden" id="contentTitle" value="가상의 기사 제목"/>
  <input type="hidden" id="parentTitle" value="가상의 출판물"/>
</article>`;

function 출판물환경(기록, 문장 = '가상의 기사 본문입니다.') {
  return {
    매니페스트, 읽기,
    출판물조회: {
      accessedAt: '2026-10-29',
      logger: { warn() {} },
      fetchDocument: async url => {
        기록.읽은주소.push(url);
        return { html: 가짜기사(문장), resolvedUrl: 'https://wol.jw.org/ko/wol/d/r8/lp-ko/9000001#h=1:0-2:0' };
      },
    },
    설정: {
      apiKey: 'k',
      fetchImpl: async (url, options) => {
        const 몸 = JSON.parse(options.body);
        기록.요청.push(JSON.parse(몸.input[1].content[0].text));
        const 응답 = 몸.text.format.name === 'talk_outline'
          ? { 구간: [{ 이름: '서론', 시작초: 0, 끝초: 300, 목적: '연다' }], 설정: { 등장인물: [], 상황: '', 준비물: [] }, 성구주소: [], 요점배치: '서론' }
          : { 대사: [], 단락: [{ 소제목: '가', 요점: ['나'], 예화: '', 적용: '', 성구주소: [], 요점표시: '' }], 축약순서: [] };
        return { ok: true, status: 200, json: async () => ({ output: [{ content: [{ type: 'output_text', text: JSON.stringify(응답) }] }] }) };
      },
    },
  };
}

const 연설배정 = {
  번호: 6, 제목: '연설', 절: '야외봉사', 종류: '학생연설', 시간초: 300, 봉사형태: '',
  설명: '「웹성해」 기사 6—주제: 가상의 주제입니다.', 지정요점: null, 소제목: [], 묵상: '', 낭독범위: '', 교재원문: '',
  출판물: [{ 표시: '「웹성해」 기사 6', pc: '/ko/wol/pc/r8/lp-ko/202026248/8/0' }],
};

test('배정이 가리키는 출판물을 서버가 읽어 뼈대와 원고 호출에 넘기고 응답에는 싣지 않는다', async () => {
  const 기록 = { 읽은주소: [], 요청: [] };
  const 환경 = 출판물환경(기록);

  const 뼈대결과 = await 뼈대준비({ 배정: 연설배정, 프로필: 형제 }, 환경);
  const 원고결과 = await 원고준비({ 뼈대: 뼈대결과.뼈대, 프로필: 형제 }, 환경);

  // 뼈대에는 본문이 없으므로 원고 단계가 같은 공식 링크로 한 번 더 읽는다.
  assert.deepEqual(기록.읽은주소, Array(2).fill('https://wol.jw.org/ko/wol/pc/r8/lp-ko/202026248/8/0'));
  assert.equal(기록.요청[0].참조자료[0].본문, '가상의 기사 본문입니다.');
  assert.equal(기록.요청[1].참조자료[0].본문, '가상의 기사 본문입니다.');
  assert.ok(!JSON.stringify(뼈대결과).includes('가상의 기사 본문입니다.'));
  assert.ok(!JSON.stringify(원고결과).includes('가상의 기사 본문입니다.'));
  assert.match(원고결과.산출물.준비원고, /가상의 기사 제목\. https:\/\/wol\.jw\.org\/ko\/wol\/d\/r8\/lp-ko\/9000001#h=1:0-2:0 \(조회일 2026-10-29\)/);
});

test('원고 단계는 뼈대에 실려 온 링크 가운데 공식 WOL 링크만 읽는다', async () => {
  const 기록 = { 읽은주소: [], 요청: [] };
  const 뼈대 = {
    제목: '연설', 종류: '학생연설', 배정시간: 300, 구간: [{ 이름: '서론', 시작초: 0, 끝초: 300, 목적: '연다' }],
    단락: [], 성구: [], 출처: [], 경고: [],
    참조: [{ 표시: '가짜', url: 'https://evil.example/ko/wol/pc/1', 조회일: '2026-10-29' }],
  };
  await 원고준비({ 뼈대, 프로필: 형제 }, 출판물환경(기록));

  assert.deepEqual(기록.읽은주소, []);
});

test('모델에 넘기는 출판물은 4편, 본문은 모두 합쳐 16,000자까지다', async () => {
  const 기록 = { 읽은주소: [], 요청: [] };
  const 많은배정 = {
    ...연설배정,
    출판물: [1, 2, 3, 4, 5].map(n => ({ 표시: `「가짜」 ${n}`, pc: `/ko/wol/pc/r8/lp-ko/202026248/${n}/0` })),
  };
  await 뼈대준비({ 배정: 많은배정, 프로필: 형제 }, 출판물환경(기록, '가'.repeat(12_000)));

  assert.equal(기록.읽은주소.length, 4);
  const 합계 = 기록.요청[0].참조자료.reduce((합, x) => 합 + x.본문.length, 0);
  assert.equal(합계, 16_000);
});

test('연설은 연구 답변의 OPENAI_MODEL 을 따르지 않고 gpt-5.6-sol high 를 쓴다', () => {
  const 이전 = { 모델: process.env.OPENAI_MODEL, 연설: process.env.TALK_MODEL, 강도: process.env.OPENAI_REASONING_EFFORT };
  process.env.OPENAI_MODEL = 'gpt-5.6-terra';
  process.env.OPENAI_REASONING_EFFORT = 'low';
  delete process.env.TALK_MODEL;
  try {
    const { 설정 } = 환경만들기(process.cwd());
    assert.equal(설정.model, 'gpt-5.6-sol');
    assert.equal(설정.effort, 'high');
    process.env.TALK_MODEL = 'gpt-다른모델';
    assert.equal(환경만들기(process.cwd()).설정.model, 'gpt-다른모델');
  } finally {
    for (const [키, 값] of [['OPENAI_MODEL', 이전.모델], ['TALK_MODEL', 이전.연설], ['OPENAI_REASONING_EFFORT', 이전.강도]]) {
      if (값 === undefined) delete process.env[키]; else process.env[키] = 값;
    }
  }
});
