// 화자 프로필과 자격 게이트를 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 기본프로필, 자격판정, 배정에게이트적용 } from './talk-profile.mjs';

const 프로필 = 덮어쓰기 => ({ ...기본프로필(), ...덮어쓰기 });

test('자매는 시연만 할 수 있다', () => {
  const 자매 = 프로필({ 성별: '자매' });

  assert.equal(자격판정(자매, '시연').가능, true);
  assert.equal(자격판정(자매, '성경낭독').가능, false);
  assert.equal(자격판정(자매, '학생연설').가능, false);
  assert.equal(자격판정(자매, '보물연설').가능, false);
  assert.equal(자격판정(자매, '생활부분').가능, false);
  assert.equal(자격판정(자매, '공개강연').가능, false);
});

test('미임명 형제는 학생 과제만 할 수 있다', () => {
  const 형제 = 프로필({ 성별: '형제', 임명: '미임명' });

  assert.equal(자격판정(형제, '시연').가능, true);
  assert.equal(자격판정(형제, '성경낭독').가능, true);
  assert.equal(자격판정(형제, '학생연설').가능, true);
  assert.equal(자격판정(형제, '보물연설').가능, false);
  assert.equal(자격판정(형제, '생활부분').가능, false);
  assert.equal(자격판정(형제, '공개강연').가능, false);
});

test('장로와 봉사의 종은 모두 할 수 있다', () => {
  for (const 임명 of ['장로', '봉사의 종']) {
    const 형제 = 프로필({ 임명 });
    for (const 종류 of ['시연', '성경낭독', '학생연설', '보물연설', '생활부분', '공개강연']) {
      assert.equal(자격판정(형제, 종류).가능, true, `${임명} ${종류}`);
    }
  }
});

test('파이오니아 여부는 자격을 바꾸지 않는다', () => {
  const 가 = 자격판정(프로필({ 임명: '미임명', 파이오니아: true }), '보물연설');
  const 나 = 자격판정(프로필({ 임명: '미임명', 파이오니아: false }), '보물연설');

  assert.equal(가.가능, 나.가능);
});

test('막힌 배정에는 사유가 붙는다', () => {
  const 자매 = 프로필({ 성별: '자매' });

  assert.match(자격판정(자매, '학생연설').사유, /자매/);
  assert.equal(자격판정(자매, '시연').사유, '');
});

test('연설아님은 언제나 막힌다', () => {
  assert.equal(자격판정(프로필({ 임명: '장로' }), '연설아님').가능, false);
});

test('배정 목록에 게이트를 씌우고 원본을 바꾸지 않는다', () => {
  const 배정 = [{ 번호: 1, 종류: '보물연설' }, { 번호: 4, 종류: '시연' }];
  const 결과 = 배정에게이트적용(프로필({ 임명: '미임명' }), 배정);

  assert.equal(결과[0].가능, false);
  assert.equal(결과[1].가능, true);
  assert.equal(배정[0].가능, undefined);
});
