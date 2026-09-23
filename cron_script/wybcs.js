// ============================================================================
// 宸澄（wybcs.work）每日签到脚本，用于 Quantumult X 定时任务
// ----------------------------------------------------------------------------
// 功能：
//   1. 调用登录接口 https://register.wybcs.work/api/requests/auth
//      从响应 Set-Cookie 中读取 session_id 并缓存
//   2. 调用签到接口 https://register.wybcs.work/api/user/points/checkin
//      使用 session_id 作为 Cookie 授权
//   3. 签到成功后自动调用积分兑换接口 https://register.wybcs.work/api/user/points/redeem
//   4. 执行结果通过 Quantumult X 通知和 $done 弹窗输出
//
// 使用说明：
//   1. 修改下面的 DEFAULT_USERNAME / DEFAULT_PASSWORD
//   2. 在 Quantumult X [task_local] 配置中添加定时任务，例如：
//      45 8 * * * https://raw.githubusercontent.com/<你的仓库>/cron_script/happy_frog.js, tag=宸澄签到, img-url=https://register.wybcs.work/static/img/logo-app-2.png
//
// 脚本图标：
//   https://register.wybcs.work/static/img/logo-app-2.png
// ============================================================================

// 这里必须填写 wybcs.work 的账号密码。
// 也可以改用 QX 的 $prefs 值：taotu_username / taotu_password。
const DEFAULT_USERNAME = 'guosir';
const DEFAULT_PASSWORD = 'Aa1010110';

const BASE_URL = 'https://register.wybcs.work';
const LOGIN_URL = `${BASE_URL}/api/requests/auth`;
const CHECKIN_URL = `${BASE_URL}/api/user/points/checkin`;
const REDEEM_URL = `${BASE_URL}/api/user/points/redeem`;
const ICON_URL = `${BASE_URL}/static/img/logo-app-2.png`;
const REDEEM_ITEM_ID = 'item_1789909672074';

// session_id 缓存在 $prefs 中的 key
const SESSION_KEY = 'taotu_session_id';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36';

// 发送通知。兼容 $notification.post 和旧脚本常见的 $notify。
function notify(title, subtitle, body) {
  const realTitle = title || '宸澄签到';
  const realBody = body || '请查看日志';

  if (typeof $notification !== 'undefined' && typeof $notification.post === 'function') {
    $notification.post(realTitle, subtitle || '', realBody);
    return;
  }

  if (typeof $notify !== 'undefined') {
    $notify(realTitle, subtitle || '', realBody);
    return;
  }

  console.log(`[通知] ${realTitle} - ${subtitle || ''} - ${realBody}`);
}

// 简单转义，避免弹窗里的接口返回内容破坏 HTML 结构
function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 生成 $done 弹窗的 htmlMessage。弹窗尺寸小，所以用紧凑排版和较小字号。
function buildPopupHtml(statusEmoji, statusText, message) {
  const safeText = escapeHtml(statusText);
  const safeMessage = escapeHtml(message);

  return `
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC", sans-serif; background: #f7f8fa; }
    .card { padding: 10px 12px 14px; color: #222; }
    .status { font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 4px; margin-bottom: 8px; }
    .status span { font-size: 16px; }
    .message { font-size: 12px; line-height: 1.6; word-break: break-all; white-space: pre-wrap; background: #ffffff; border-radius: 8px; padding: 8px 10px; }
  </style>
  <div class="card">
    <div class="status"><span>${statusEmoji}</span>${safeText}</div>
    <div class="message">${safeMessage}</div>
  </div>`;
}

// 统一结束脚本：先通知，再用 $done 弹窗展示结果
function finishWithResult(statusEmoji, statusText, message) {
  const title = `${statusText} · 宸澄签到`;
  const htmlMessage = buildPopupHtml(statusEmoji, statusText, `${message}`);

  notify(`${statusEmoji} ${title}`, statusText, message);

  if (typeof $done === 'function') {
    $done({ title: `${statusEmoji} ${title}`, htmlMessage });
    return;
  }

  console.log(`${statusEmoji} ${title}\n${message}`);
}

// 保存登录返回的 session_id
function saveSessionId(sessionId) {
  if (typeof $prefs !== 'undefined' && typeof $prefs.setValueForKey === 'function') {
    $prefs.setValueForKey(sessionId, SESSION_KEY);
  }
}

// 统一的网络请求封装
function fetchText(url, method, headers, body) {
  const requestParams = { url, method, headers };

  // body 为 null 时不发送 body，避免签到接口被意外填上 JSON 内容
  if (body !== null && body !== undefined) {
    requestParams.body = body;
  }

  return new Promise((resolve, reject) => {
    $task.fetch(requestParams).then(
      (response) => resolve(response),
      (error) => reject(error)
    );
  });
}

// 解析 JSON，解析失败时返回 null
function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

// 在响应 headers 中按不区分大小写的方式读取值
function getHeader(headers, targetName) {
  if (!headers || typeof headers !== 'object') {
    return null;
  }

  const lowerName = targetName.toLowerCase();
  const keys = Object.keys(headers);
  for (let index = 0; index < keys.length; index++) {
    if (keys[index].toLowerCase() === lowerName) {
      return headers[keys[index]];
    }
  }

  return null;
}

// 从 Set-Cookie / set-cookie 中提取 session_id
function extractSessionIdFromCookieHeader(cookieHeader) {
  if (!cookieHeader) {
    return '';
  }

  const parts = Array.isArray(cookieHeader) ? cookieHeader : [cookieHeader];
  const joined = parts.join('\n');
  const match = joined.match(/(?:^|;\s*)session_id=([^;\s]+)/i);

  if (match) {
    try {
      return decodeURIComponent(match[1]);
    } catch (error) {
      return match[1];
    }
  }

  return '';
}

// 从登录响应 body 中提取 session_id
function extractSessionIdFromBody(bodyText) {
  const json = parseJson(bodyText);
  if (!json) {
    return '';
  }

  if (typeof json.session_id === 'string') {
    return json.session_id;
  }

  if (json.data && typeof json.data.session_id === 'string') {
    return json.data.session_id;
  }

  return '';
}

// 调用登录接口，从 Set-Cookie 中拿到 session_id
async function login() {
  const username = typeof $prefs !== 'undefined' ? ($prefs.valueForKey('taotu_username') || DEFAULT_USERNAME) : DEFAULT_USERNAME;
  const password = typeof $prefs !== 'undefined' ? ($prefs.valueForKey('taotu_password') || DEFAULT_PASSWORD) : DEFAULT_PASSWORD;

  if (!username || !password) {
    throw new Error('未配置 wybcs.work 账号或密码');
  }

  const headers = {
    Accept: '*/*',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Content-Type': 'application/json',
    Origin: BASE_URL,
    Referer: `${BASE_URL}/?tab=profile`,
    'User-Agent': USER_AGENT
  };

  const response = await fetchText(LOGIN_URL, 'POST', headers, JSON.stringify({
    username,
    password
  }));

  if (response.statusCode && response.statusCode >= 400) {
    throw new Error(`登录接口返回 HTTP ${response.statusCode}`);
  }

  const loginJson = parseJson(response.body);
  if (loginJson && loginJson.status === 'error') {
    throw new Error(`登录失败：${loginJson.message || '请检查账号密码'}`);
  }

  const setCookieHeader = getHeader(response.headers, 'set-cookie');
  const sessionId =
    extractSessionIdFromCookieHeader(setCookieHeader) ||
    extractSessionIdFromBody(response.body);

  if (!sessionId) {
    throw new Error(`登录接口未返回 session_id，原始响应：${response.body || ''}`);
  }

  saveSessionId(sessionId);
  console.log(`登录成功，session_id=${sessionId}`);
  return sessionId;
}

// 调用签到接口
async function checkIn(sessionId) {
  const headers = {
    Accept: '*/*',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Content-Length': '0',
    'Content-Type': 'application/json',
    Cookie: `session_id=${sessionId}`,
    Origin: BASE_URL,
    Referer: `${BASE_URL}/?tab=profile`,
    'User-Agent': USER_AGENT
  };

  const response = await fetchText(CHECKIN_URL, 'POST', headers, '');

  if (response.statusCode && response.statusCode >= 400) {
    throw new Error(`签到接口返回 HTTP ${response.statusCode}`);
  }

  const data = parseJson(response.body);
  if (!data) {
    throw new Error(`签到接口响应解析失败：${response.body || ''}`);
  }

  console.log(`签到接口响应：${response.body}`);

  if (data.status === 'success') {
    return { ok: true, message: data.message || '签到成功', data };
  }

  return { ok: false, message: data.message || '签到接口返回未知状态', data };
}

// 调用积分兑换接口，只在签到成功后执行
async function redeem(sessionId) {
  const headers = {
    Accept: '*/*',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Content-Type': 'application/json',
    Cookie: `session_id=${sessionId}`,
    Origin: BASE_URL,
    Referer: `${BASE_URL}/?tab=profile`,
    'User-Agent': USER_AGENT
  };

  const response = await fetchText(REDEEM_URL, 'POST', headers, JSON.stringify({
    item_id: REDEEM_ITEM_ID
  }));

  if (response.statusCode && response.statusCode >= 400) {
    throw new Error(`积分兑换接口返回 HTTP ${response.statusCode}`);
  }

  const data = parseJson(response.body);
  if (!data) {
    throw new Error(`积分兑换接口响应解析失败：${response.body || ''}`);
  }

  console.log(`积分兑换接口响应：${response.body}`);

  if (data.status === 'success') {
    return { ok: true, message: data.message || '兑换成功', data };
  }

  return { ok: false, message: data.message || '兑换接口返回未知状态', data };
}

// 主流程
async function main() {
  // 先登录拿 cookie
  const sessionId = await login();

  // 再签到
  const result = await checkIn(sessionId);

  if (!result.ok) {
    // 常见情况：今天已经签到过，不重复兑换
    finishWithResult('ℹ️', '已执行', result.message);
    return;
  }

  // 签到成功后才自动兑换积分
  const checkinMessage = result.message || '签到成功';

  try {
    const redeemResult = await redeem(sessionId);

    if (redeemResult.ok) {
      finishWithResult(
        '✅',
        '签到成功 · 兑换成功',
        `签到：${checkinMessage}\n兑换：${redeemResult.message}`
      );
    } else {
      finishWithResult(
        '⚠️',
        '签到成功 · 兑换失败',
        `签到：${checkinMessage}\n兑换：${redeemResult.message}`
      );
    }
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    finishWithResult(
      '⚠️',
      '签到成功 · 兑换异常',
      `签到：${checkinMessage}\n兑换：${message}`
    );
  }
}

main().then(
  () => {},
  (error) => {
    const message = error && error.message ? error.message : String(error);
    console.log(`执行失败：${message}`);
    finishWithResult('❌', '执行失败', message);
  }
);
