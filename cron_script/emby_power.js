/*
QX 脚本传参与弹窗演示 Demo
*/

async function main() {
    // 1. 获取通过配置文件传入的参数 ($argument)
    const rawArg = typeof $argument !== "undefined" ? $argument : "未收到参数";
    
    // 假设我们传入的格式是 key=value&name=xxx，这里简单解析一下
    const params = {};
    if (typeof $argument === "string" && $argument.length > 0) {$argument.split("&").forEach(item => {
            const [k, v] = item.split("=");
            if (k && v) params[k] = decodeURIComponent(v);
        });
    }

    const inputName = params.name || "默认访客";
    const inputMessage = params.message || rawArg;

    // 2. 构造通知内容
    const title = "QX 脚本测试成功 🎉";
    const subtitle = `欢迎你，${inputName}！`;
    const message = `收到的完整参数/消息内容：\n${inputMessage}`;

    // 3. 调用 QX 的通知 API 弹窗提醒
    // 参数格式: $notify(title, subtitle, message, options)
    $notify(title, subtitle, message);

    // 4. 同时在 QX 的控制台/日志中打印输出
    console.log(`[QX Demo] 收到输入参数 -> 名字: ${inputName}, 消息: ${inputMessage}`);
}

// 执行主函数
main().catch((err) => {
    console.log(`[QX Demo Error] ${err}`);
}).finally(() => {
    // 结束脚本
    $done();
});