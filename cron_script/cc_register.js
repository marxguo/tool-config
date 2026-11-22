/**
 * CC Play 开放注册检测 -> 发送邮箱验证码 -> 注册脚本 (Quantumult X)
 */

const CONFIG = {
  bootstrapUrl: "https://ccemby.eu.org/api/public/bootstrap",
  sendCodeUrl: "https://ccemby.eu.org/api/auth/send-email-code",
  registerUrl: "https://ccemby.eu.org/api/user/register",

  // 注册成功后是否跳过后续执行
  stopAfterSuccess: true,
  // 检测到开放注册并发送验证码后，是否立即调用注册接口：
  // false: 先发验证码并通知你去收邮件获取最新验证码（15分钟有效），等填好/自动写入 email_code 后再注册
  // true:  发完验证码后立刻使用当前配置的 email_code 发起注册
  registerAfterSendCode: false,
  // 未开放注册时是否发通知
  notifyWhenClosed: false,
  // 验证码发送冷却时间（秒），防止短时间内重复发码触发接口限流（默认 120 秒）
  sendCodeCooldownSec: 120,

  headers: {
    "Accept": "*/*",
    "Accept-Language": "zh-CN,zh;q=0.9",
    "Connection": "keep-alive",
    "Content-Type": "application/json",
    "Origin": "https://ccemby.eu.org",
    "Referer": "https://ccemby.eu.org/",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36",
    "X-Emby-Device-Id": "web_4676ba83a5b94a3986d1733162087250",
    "sec-ch-ua": '"Not-A.Brand";v="99", "Google Chrome";v="157", "Chromium";v="157"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"'
  },

  sendCodeBody: {
    email: "max1036725897@gmail.com",
    purpose: "REGISTER"
  },

  registerBody: {
    username: "guosir",
    email: "max1036725897@gmail.com",
    password: "Aa1010110",
    voucher_code: "",
    // 验证码15分钟有效；可在此手动填写，或由外部写入 $prefs 的 EMAIL_CODE_KEY 自动读取
    email_code: ""
  }
};

const DONE_KEY = "CCPLAY_REGISTER_DONE";
const LAST_SEND_CODE_TS_KEY = "CCPLAY_LAST_SEND_CODE_TS";
const DYNAMIC_EMAIL_CODE_KEY = "CCPLAY_EMAIL_CODE";

function notify(title, subtitle, content) {
  $notify(title, subtitle, content);
}

function requestJson(url, method, payloadObj = null) {
  return new Promise((resolve, reject) => {
    const req = {
      url,
      method,
      headers: CONFIG.headers
    };
    if (payloadObj !== null) {
      req.body = JSON.stringify(payloadObj);
    }

    $task.fetch(req).then(
      (resp) => {
        let parsed = null;
        try {
          parsed = JSON.parse(resp.body || "{}");
        } catch (_) {}
        resolve({
          statusCode: resp.statusCode,
          rawBody: resp.body || "",
          json: parsed
        });
      },
      (err) => {
        reject(new Error(`请求 ${url} 失败: ` + (err && err.error ? err.error : JSON.stringify(err))));
      }
    );
  });
}

function isApiSuccess(res) {
  const httpOk = res.statusCode >= 200 && res.statusCode < 300;
  if (!httpOk) return false;
  if (!res.json) return true;

  if (res.json.success === false) return false;
  if (typeof res.json.code === "number" && res.json.code < 0) return false;
  if (/error|fail|invalid|expired|验证码|已存在|关闭|频繁|limit/i.test(JSON.stringify(res.json))) {
    return false;
  }
  return true;
}

async function checkBootstrap() {
  const res = await requestJson(CONFIG.bootstrapUrl, "GET");
  if (!res.json) {
    throw new Error("解析 bootstrap 响应失败: " + res.rawBody.slice(0, 120));
  }
  const data = res.json;
  return {
    allowed: Boolean(data && data.switches && data.switches.allowPublicRegistration === true),
    requireEmail: Boolean(data && data.switches && data.switches.requireEmailVerification),
    siteName: (data && data.branding && data.branding.site_name) || "CC Play"
  };
}

async function sendEmailCode() {
  const nowSec = Math.floor(Date.now() / 1000);
  const lastSec = Number($prefs.valueForKey(LAST_SEND_CODE_TS_KEY) || "0");
  const elapsed = nowSec - lastSec;

  if (lastSec > 0 && elapsed < CONFIG.sendCodeCooldownSec) {
    const waitSec = CONFIG.sendCodeCooldownSec - elapsed;
    console.log(`[CCPlay] 距离上次发送验证码仅 ${elapsed}s，冷却中（还需 ${waitSec}s），跳过重复发码`);
    return { skipped: true, waitSec };
  }

  const res = await requestJson(CONFIG.sendCodeUrl, "POST", CONFIG.sendCodeBody);
  console.log(`[CCPlay] 发送验证码响应 (${res.statusCode}): ${res.rawBody}`);

  const ok = isApiSuccess(res);
  if (ok) {
    $prefs.setValueForKey(String(nowSec), LAST_SEND_CODE_TS_KEY);
  }
  return { skipped: false, ok, res };
}

async function doRegister(emailCode) {
  const payload = {
    ...CONFIG.registerBody,
    email_code: emailCode
  };
  const res = await requestJson(CONFIG.registerUrl, "POST", payload);
  console.log(`[CCPlay] 注册响应 (${res.statusCode}): ${res.rawBody}`);
  return {
    ok: isApiSuccess(res),
    res
  };
}

(async () => {
  if (CONFIG.stopAfterSuccess && $prefs.valueForKey(DONE_KEY) === "1") {
    console.log("[CCPlay] 已标记注册完成，跳过执行。");
    $done();
    return;
  }

  try {
    const info = await checkBootstrap();
    console.log(`[CCPlay] 站点: ${info.siteName} | allowPublicRegistration: ${info.allowed} | requireEmailVerification: ${info.requireEmail}`);

    if (!info.allowed) {
      if (CONFIG.notifyWhenClosed) {
        notify(info.siteName, "暂未开放公开注册", "allowPublicRegistration 当前为 false");
      }
      $done();
      return;
    }

    // 开放注册时，先调用发送验证码接口
    const codeResult = await sendEmailCode();
    if (!codeResult.skipped) {
      if (codeResult.ok) {
        notify(
          info.siteName,
          "已触发发送注册验证码",
          `邮箱: ${CONFIG.sendCodeBody.email}\n验证码15分钟内有效，请查收邮件`
        );
      } else {
        notify(
          info.siteName,
          "发送注册验证码失败",
          `状态码: ${codeResult.res.statusCode}\n响应: ${codeResult.res.rawBody.slice(0, 200)}`
        );
      }
    }

    // 优先读取外部/脚本写入的动态验证码，其次使用脚本内配置的 email_code
    const prefCode = ($prefs.valueForKey(DYNAMIC_EMAIL_CODE_KEY) || "").trim();
    const emailCode = prefCode || (CONFIG.registerBody.email_code || "").trim();

    if (!CONFIG.registerAfterSendCode && !prefCode) {
      console.log("[CCPlay] registerAfterSendCode=false 且无动态验证码，本次仅发送验证码，等待获取验证码后再注册。");
      $done();
      return;
    }

    if (info.requireEmail && !emailCode) {
      console.log("[CCPlay] 站点要求邮箱验证但当前 email_code 为空，跳过注册请求。");
      $done();
      return;
    }

    const regResult = await doRegister(emailCode);
    if (regResult.ok) {
      if (CONFIG.stopAfterSuccess) {
        $prefs.setValueForKey("1", DONE_KEY);
      }
      notify(
        info.siteName,
        "注册请求已成功提交！",
        `用户: ${CONFIG.registerBody.username}\n状态码: ${regResult.res.statusCode}\n响应: ${regResult.res.rawBody.slice(0, 180)}`
      );
    } else {
      notify(
        info.siteName,
        "注册接口返回异常",
        `状态码: ${regResult.res.statusCode}\n响应: ${regResult.res.rawBody.slice(0, 220)}`
      );
    }
  } catch (err) {
    console.log("[CCPlay] 执行出错: " + err.message);
    notify("CC Play 注册脚本异常", "执行失败", err.message);
  } finally {
    $done();
  }
})();
