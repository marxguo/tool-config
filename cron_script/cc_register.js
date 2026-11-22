/**
 * CC Play 开放注册检测与自动提交脚本 (Quantumult X)
 * 1. 请求 /api/public/bootstrap 检查 switches.allowPublicRegistration === true
 * 2. 开放时调用 /api/user/register 提交注册参数
 */

const CONFIG = {
  bootstrapUrl: "https://ccemby.eu.org/api/public/bootstrap",
  registerUrl: "https://ccemby.eu.org/api/user/register",
  // 注册成功后是否自动关闭/跳过后续执行（防止重复请求，设为 true 建议配合 BoxJs 或脚本内状态）
  stopAfterSuccess: true,
  // 若未开放注册，是否也发通知（高频定时建议 false，避免通知轰炸）
  notifyWhenClosed: false,
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
  body: {
    username: "guosir",
    email: "max1036725897@gmail.com",
    password: "Aa1010110",
    voucher_code: "",
    // requireEmailVerification 为 true 时通常需要有效验证码（15分钟有效），后续可动态注入
    email_code: "809506"
  }
};

const DONE_KEY = "CCPLAY_REGISTER_DONE";

function notify(title, subtitle, content) {
  $notify(title, subtitle, content);
}

function checkBootstrap() {
  return new Promise((resolve, reject) => {
    const req = {
      url: CONFIG.bootstrapUrl,
      method: "GET",
      headers: CONFIG.headers
    };

    $task.fetch(req).then(
      (resp) => {
        try {
          const data = JSON.parse(resp.body || "{}");
          const allowed = Boolean(data && data.switches && data.switches.allowPublicRegistration === true);
          const requireEmail = Boolean(data && data.switches && data.switches.requireEmailVerification);
          const siteName = (data && data.branding && data.branding.site_name) || "CC Play";
          resolve({ allowed, requireEmail, siteName, raw: data });
        } catch (e) {
          reject(new Error("解析 bootstrap 响应失败: " + e.message));
        }
      },
      (err) => {
        reject(new Error("请求 bootstrap 失败: " + (err && err.error ? err.error : JSON.stringify(err))));
      }
    );
  });
}

function doRegister() {
  return new Promise((resolve, reject) => {
    const req = {
      url: CONFIG.registerUrl,
      method: "POST",
      headers: CONFIG.headers,
      body: JSON.stringify(CONFIG.body)
    };

    $task.fetch(req).then(
      (resp) => {
        resolve({
          statusCode: resp.statusCode,
          body: resp.body
        });
      },
      (err) => {
        reject(new Error("请求 register 失败: " + (err && err.error ? err.error : JSON.stringify(err))));
      }
    );
  });
}

(async () => {
  if (CONFIG.stopAfterSuccess && $prefs.valueForKey(DONE_KEY) === "1") {
    console.log("[CCPlay] 已标记注册完成，跳过执行。如需重新运行，请清除 prefs 中的 " + DONE_KEY);
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

    const regRes = await doRegister();
    console.log(`[CCPlay] 注册响应状态码: ${regRes.statusCode} | 响应内容: ${regRes.body}`);

    let parsedBody = null;
    try {
      parsedBody = JSON.parse(regRes.body || "{}");
    } catch (_) {}

    // 根据常见接口返回特征判断是否成功（可按实际成功返回字段微调）
    const isHttpOk = regRes.statusCode >= 200 && regRes.statusCode < 300;
    const isBusinessFail =
      parsedBody &&
      (parsedBody.success === false ||
        parsedBody.code < 0 ||
        /error|fail|invalid|expired|验证码|已存在|关闭/i.test(JSON.stringify(parsedBody)));

    if (isHttpOk && !isBusinessFail) {
      if (CONFIG.stopAfterSuccess) {
        $prefs.setValueForKey("1", DONE_KEY);
      }
      notify(
        info.siteName,
        "检测到开放注册并已提交！",
        `用户: ${CONFIG.body.username}\n状态码: ${regRes.statusCode}\n响应: ${(regRes.body || "").slice(0, 180)}`
      );
    } else {
      notify(
        info.siteName,
        "已检测到开放注册，但注册接口返回异常",
        `状态码: ${regRes.statusCode}\n响应: ${(regRes.body || "").slice(0, 220)}`
      );
    }
  } catch (err) {
    console.log("[CCPlay] 执行出错: " + err.message);
    notify("CC Play 注册脚本异常", "执行失败", err.message);
  } finally {
    $done();
  }
})();
