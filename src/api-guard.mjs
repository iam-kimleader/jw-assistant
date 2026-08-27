// 로그인하지 않은 요청을 401로 막는다. 화면이 그것을 보고 로그인으로 보낸다.
import { 요청사용자 } from './auth-runtime.mjs';

export function 가드(handler) {
  return async function (req, res) {
    const 사용자 = 요청사용자(req.headers?.cookie);
    if (!사용자) {
      res.status(401).json({ error: '로그인이 필요합니다.' });
      return;
    }
    req.사용자 = 사용자;
    return handler(req, res);
  };
}
