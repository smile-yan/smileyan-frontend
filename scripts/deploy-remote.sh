#!/bin/bash
#
# 服务器端部署脚本（模板）
#
# 本文件作为参考保留，github 工作流（.github/workflows/deploy.yml）
# 会通过 appleboy/ssh-action 内嵌相同逻辑直接执行；如需在服务器上手动
# 复用，把本文件 scp 上去后用 RELEASE_TAG=<tag> bash deploy-remote.sh 即可。
#
# 环境变量：
#   RELEASE_TAG    当前发布的 tag 名（例如 v1.2.3），仅用于备份命名
#   DEPLOY_DIR     部署目录（对应 SERVERS_CONFIG 中的 deploy_path），默认 /var/www/html
#
# 前置条件：
#   - 运行此脚本的用户对 DEPLOY_DIR 有写权限（通过 sudo 限定命令白名单）
#   - 服务器已安装 curl（用于本地健康检查，可选）
#   - 部署包已上传到 /tmp/smileyan-frontend-<tag>.tar.gz（或旧版固定名 /tmp/smileyan-frontend.tar.gz）

set -euo pipefail
DEPLOY_DIR="${DEPLOY_DIR:-/var/www/html}"
TAG="${RELEASE_TAG:-unknown}"
PKG=""
for candidate in "/tmp/smileyan-frontend-${TAG}.tar.gz" "/tmp/smileyan-frontend.tar.gz"; do
  if [ -f "$candidate" ]; then PKG="$candidate"; break; fi
done
TS=$(date +%Y%m%d-%H%M%S)
# 备份目录放在部署目录的上一级，兼容 /var/www/html 与 /opt/xxx
BACKUP_DIR="$(dirname "$DEPLOY_DIR")/.backups/smileyan-frontend"

test -n "$PKG" || { echo "missing /tmp/smileyan-frontend-${TAG}.tar.gz"; exit 1; }

# 备份上一版（仅当目标目录非空时）
sudo mkdir -p "$BACKUP_DIR"
if [ -d "$DEPLOY_DIR" ] && [ -n "$(sudo ls -A "$DEPLOY_DIR" 2>/dev/null || true)" ]; then
  sudo tar -czf "$BACKUP_DIR/${TS}-${TAG}.tar.gz" -C "$DEPLOY_DIR" .
  # 仅保留最近 3 个备份
  sudo ls -1tr "$BACKUP_DIR" | head -n -3 | xargs -r sudo rm -rf --
fi

# 清空并解压新版本
sudo mkdir -p "$DEPLOY_DIR"
sudo find "$DEPLOY_DIR" -mindepth 1 -delete
sudo tar -xzf "$PKG" -C "$DEPLOY_DIR"

# 清理上传包
sudo rm -f "$PKG"

# 本地健康检查（失败不回滚）
if command -v curl >/dev/null 2>&1; then
  sleep 1
  curl -fsS -o /dev/null "http://127.0.0.1/" || echo "WARN: local health check failed"
fi

echo "deploy ok: tag=$TAG at $TS"