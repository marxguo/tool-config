#!/bin/bash

# 目标配置
TARGET_URL="https://v6.28202820.xyz:20896/"
HOST="v6.28202820.xyz"
PORT="20896"

# 颜色输出定义
GREEN="\033[32m"
RED="\033[31m"
YELLOW="\033[33m"
CYAN="\033[36m"
RESET="\033[0m"

echo -e "${CYAN}====================================================${RESET}"
echo -e "${CYAN}       目标服务器综合测试脚本                         ${RESET}"
echo -e "${CYAN}       目标地址: ${TARGET_URL}                       ${RESET}"
echo -e "${CYAN}====================================================${RESET}\n"

# 1. 基础连通性与 HTTP 状态码、证书检测
echo -e "${YELLOW}[1/3] 正在检测目标基础连通性与 HTTPS 证书...${RESET}"
if command -v curl &> /dev/null; then
    # 获取 HTTP 状态码、总耗时、SSL 握手时间
    RESPONSE_INFO=$(curl -s -o /dev/null -w "HTTP状态码: %{http_code}\n总耗时: %{time_total}s\nSSL握手耗时: %{time_appconnect}s\n" --insecure "$TARGET_URL")
    echo -e "${GREEN}$RESPONSE_INFO${RESET}"
else
    echo -e "${RED}未检测到 curl 工具，跳过基础连通性测试。${RESET}"
fi

echo -e "\n----------------------------------------------------\n"

# 2. 漏洞回归测试（模拟 Nginx 畸形 URL 请求）
echo -e "${YELLOW}[2/3] 正在发送安全/漏洞排查测试请求（模拟长路径/特殊字符）...${RESET}"
if command -v curl &> /dev/null; then
    # 构造包含大量 + 号和编码字符的测试路径
    TEST_PATH="Connect/Exchange/++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++"
    FULL_TEST_URL="${TARGET_URL}${TEST_PATH}"
    
    echo -e "发送测试请求: ${FULL_TEST_URL}"
    STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" --insecure "$FULL_TEST_URL")
    
    echo -e "服务器响应状态码: ${GREEN}$STATUS_CODE${RESET}"
    if [ "$STATUS_CODE" -eq 502 ] || [ "$STATUS_CODE" -eq 504 ]; then
        echo -e "${RED}[警告] 服务器返回了 ${STATUS_CODE}，请检查后端或 Nginx 进程是否异常崩溃！${RESET}"
    else
        echo -e "${GREEN}[正常] 服务器正常响应，未引发网关崩溃。${RESET}"
    fi
else
    echo -e "${RED}未检测到 curl 工具。${RESET}"
fi

echo -e "\n----------------------------------------------------\n"

# 3. 简易并发压力测试 (ApacheBench - ab)
echo -e "${YELLOW}[3/3] 正在进行简易并发压力测试...${RESET}"
if command -v ab &> /dev/null; then
    read -p "是否要执行并发测试？(总共发送 100 个请求，并发 10) [y/N]: " RUN_AB
    if [[ "$RUN_AB" =~ ^[Yy]$ ]]; then
        echo -e "${CYAN}执行命令: ab -n 100 -c 10 -k '${TARGET_URL}'${RESET}"
        # 注意：由于目标是 HTTPS，ab 工具对某些自签证书可能需要 -s 或忽略，这里加上 -k (Keep-Alive)
        ab -n 100 -c 10 -k "${TARGET_URL}"
    else
        echo -e "已跳过并发压力测试。"
    fi
else
    echo -e "${YELLOW}提示: 未检测到 ApacheBench (ab) 工具。如需压测，可安装 apache2-utils (Ubuntu/Debian) 或 httpd-tools (CentOS)。${RESET}"
fi

echo -e "\n${CYAN}====================================================${RESET}"
echo -e "${CYAN}       测试完成                                       ${RESET}"
echo -e "${CYAN}====================================================${RESET}"