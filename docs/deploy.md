# 部署说明（GitHub Actions）

本文档介绍如何通过 GitHub Actions 流水线把 `smileyan-frontend` 部署到云服务器。

流水线配置文件位于 [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)。

## 工作原理

1. 推送形如 `v*` 的 tag 时自动触发流水线（例：`v1.2.3`）
2. 在 GitHub 托管 runner 上完成 `npm ci` + `npm run build:prod`，产出 `dist/`
3. 通过 SSH 把 `dist/` 打包上传到服务器 `/tmp/smileyan-frontend.tar.gz`
4. 在服务器上执行部署脚本：备份当前版本 → 清空 `/var/www/html` → 解压新版 → 本地健康检查

> 服务器已配置 Caddy，静态根目录为 `/var/www/html`，详见 [caddy.md](./caddy.md)。

## 1. 在 GitHub 仓库配置 Secrets

进入 **Settings → Secrets and variables → Actions → New repository secret**，依次添加：

| Secret 名          | 含义                             | 示例值                                        |
| ----------------- | ------------------------------ | ------------------------------------------ |
| `SSH_HOST`        | 云服务器 IP 或域名                    | `bigbigpig.cn` 或 `1.2.3.4`                 |
| `SSH_PORT`        | SSH 端口                         | `22`（非默认端口填实际值）                            |
| `SSH_USER`        | 部署用户名（建议专用账号，不要用 root）         | `deployer`                                 |
| `SSH_PRIVATE_KEY` | 该用户的 SSH 私钥完整内容（含 BEGIN/END 行） | `-----BEGIN OPENSSH PRIVATE KEY-----\n...` |

## 2. 服务器一次性准备

### 2.1 生成部署用密钥对（本地操作）

```bash
ssh-keygen -t ed25519 -C "github-deploy-smileyan" -f ~/.ssh/github_deploy
```

得到 `github_deploy`（私钥）和 `github_deploy.pub`（公钥）。

### 2.2 把公钥写入服务器

```bash
ssh-copy-id -i ~/.ssh/github_deploy.pub deployer@<服务器地址>
```

或手动追加到服务器的 `~/.ssh/authorized_keys`。

### 2.3 配置 sudo 白名单（在服务器上以 root 执行一次）

```bash
sudo tee /etc/sudoers.d/smileyan-deploy <<'EOF'
deployer ALL=(ALL) NOPASSWD: /bin/mkdir, /usr/bin/find, /bin/tar, /bin/rm, /bin/ls
EOF
sudo chmod 440 /etc/sudoers.d/smileyan-deploy
```

这一步让 `deployer` 用户能在不输入密码的情况下覆盖 `/var/www/html`。

### 2.4 把私钥填进 GitHub Secret

把 `~/.ssh/github_deploy` 的完整内容（含 `-----BEGIN ... PRIVATE KEY-----` 和 END 行）粘贴进 `SSH_PRIVATE_KEY` Secret。

## 3. 触发部署

```bash
git tag v0.1.0
git push origin v0.1.0
```

推送后在 GitHub 仓库 **Actions** 页面观察 `build-and-deploy` 任务进度。三阶段全绿即视为部署成功；最后一行日志应为：

```
deploy ok: tag=v0.1.0 at ...
```

## 4. 验证清单

完成 Secrets 配置和服务器准备后：

* [ ] GitHub 仓库 4 个 Secret 全部设置

* [ ] 服务器 `~/.ssh/authorized_keys` 中已有对应公钥

* [ ] `/etc/sudoers.d/smileyan-deploy` 已配置

* [ ] 推送一个测试 tag 验证流水线

## 5. 回滚

部署脚本会在覆盖前自动备份当前版本到 `/var/www/.backups/smileyan-frontend/`，保留最近 3 份，命名格式 `<时间戳>-<tag>.tar.gz`。

查看可用备份：

```bash
ssh deployer@<host> 'sudo ls -1tr /var/www/.backups/smileyan-frontend/'
```

回滚到指定版本：

```bash
ssh deployer@<host> 'sudo find /var/www/html -mindepth 1 -delete && \
  sudo tar -xzf /var/www/.backups/smileyan-frontend/<TIMESTAMP>-<TAG>.tar.gz -C /var/www/html'
```

## 6. 安全建议

* 仓库 Settings → Actions 中 workflow 使用最小权限（已配置 `permissions: contents: read`）

* 服务器 SSH 仅放行这一把部署用公钥；不要复用日常开发用的密钥

* 部署账号只授予白名单内的 sudo 命令，避免 root 全权限

* 私有仓库的 Secrets 仅对受信 workflow 可见，PR from fork 不会自动拿到 Secrets

