#!/bin/zsh
# 轻记 · 本地预览
# 双击此文件，会在当前目录启动一个本地静态服务器并打开浏览器。
# 关闭终端窗口即可停止服务。

cd "$(dirname "$0")" || exit 1

PORT=8000
URL="http://localhost:$PORT"

echo ""
echo "  轻记 · 本地预览"
echo "  -----------------------------"
echo "  地址：$URL"
echo "  停止：按 Ctrl+C 或关闭本窗口"
echo ""

(sleep 1; open "$URL") &
python3 -m http.server "$PORT"
