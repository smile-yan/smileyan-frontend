# 部署说明（GitHub Actions）

本文档介绍如何通过 GitHub Actions 流水线把 `smileyan-frontend` 部署到云服务器。

流水线配置文件位于 [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)。

## 工作原理

1. 推送形如 `v*` 的 tag 时自动触发流水线（例：`v1.2.3`）
2. 在 GitHub 托管 runner 上完成 `npm ci` + `npm run build:prod`，产出 `dist/`，打包为 `smileyan-frontend-<tag>.tar.gz`
3. 读取仓库变量 `SERVERS_CONFIG`（JSON 数组），对其中每台服务器并行部署
4. 通过 SSH 把 tarball 上传到服务器 `/tmp/`，在服务器上执行部署脚本：备份当前版本 → 清空 `deploy_path` → 解压新版 → 本地健康检查

> 服务器已配置 Caddy，静态根目录为 `/var/www/html`，详见 [caddy.md](./caddy.md)。`deploy_path` 必须与 Caddy 的 `root` 指向同一目录。

## 1. 在 GitHub 仓库配置变量与密钥

进入 **Settings → Secrets and variables → Actions**。

### 1.1 `SSH_PRIVATE_KEY`（Secret）

在 **Secrets** 页签添加：

| Secret 名          | 含义                             | 示例值                                        |
| ----------------- | ------------------------------ | ------------------------------------------ |
| `SSH_PRIVATE_KEY` | 部署账号的 SSH 私钥完整内容（含 BEGIN/END 行） | `-----BEGIN OPENSSH PRIVATE KEY-----\n...` |

### 1.2 `SERVERS_CONFIG`（Repository Variable）

在 **Variables** 页签添加 `SERVERS_CONFIG`，值为 JSON 数组；每台服务器一个对象，部署 job 会按数组并行展开（matrix）：

```json
[
  {
    "name": "prod-1",
    "addr": "1.2.3.4",
    "port": "22",
    "user": "deploy",
    "deploy_path": "/opt/bigbigpig-frontend"
  }
]
```

| 字段            | 含义                                   | 示例                        |
| ------------- | ------------------------------------ | ------------------------- |
| `name`        | 服务器标识，仅用于 job 名称和日志                  | `prod-1`                  |
| `addr`        | 服务器 IP 或域名                           | `1.2.3.4`                 |
| `port`        | SSH 端口（字符串）                          | `22`                      |
| `user`        | 部署用户名（建议专用账号，不要用 root）               | `deploy`                  |
| `deploy_path` | 前端静态文件目录，需与 Caddy/Nginx 的 root 一致    | `/opt/bigbigpig-frontend` |

> 如果继续沿用现有目录，把 `deploy_path` 设为 `/var/www/html`，无需改动 Caddy；改成 `/opt/bigbigpig-frontend` 时，同步把 Caddyfile 的 `root *` 指到该目录。

## 2. 服务器一次性准备

### 2.1 生成部署用密钥对（本地操作）

```bash
ssh-keygen -t ed25519 -C "github-deploy-smileyan" -f ~/.ssh/github_deploy
```

得到 `github_deploy`（私钥）和 `github_deploy.pub`（公钥）。

### 2.2 把公钥写入服务器

```bash
ssh-copy-id -i ~/.ssh/github_deploy.pub deploy@<服务器地址>
```

或手动追加到服务器的 `~/.ssh/authorized_keys`。

### 2.3 配置 sudo 白名单（在服务器上以 root 执行一次）

```bash
sudo tee /etc/sudoers.d/smileyan-deploy <<'EOF'
deploy ALL=(ALL) NOPASSWD: /bin/mkdir, /usr/bin/find, /bin/tar, /bin/rm, /bin/ls
EOF
sudo chmod 440 /etc/sudoers.d/smileyan-deploy
```

这一步让 `deploy` 用户能在不输入密码的情况下覆盖 `deploy_path` 指向的目录。

### 2.4 把私钥填进 GitHub Secret

把 `~/.ssh/github_deploy` 的完整内容（含 `-----BEGIN ... PRIVATE KEY-----` 和 END 行）粘贴进 `SSH_PRIVATE_KEY` Secret。

## 3. 触发部署

```bash
git tag v0.1.0
git push origin v0.1.0
```

推送后在 GitHub 仓库 **Actions** 页面观察 `build-and-deploy` 任务进度。`validate-config`、`build` 以及每台服务器的 `deploy` job 全绿即视为部署成功；最后一行日志应为：

```
deploy ok: tag=v0.1.0 at ... -> <deploy_path>
```

## 4. 验证清单

完成变量/密钥配置和服务器准备后：

* [ ] GitHub 仓库已设置 `SSH_PRIVATE_KEY` Secret

* [ ] GitHub 仓库已设置 `SERVERS_CONFIG` Variable，且 JSON 校验通过

* [ ] 每台服务器 `~/.ssh/authorized_keys` 中已有对应公钥

* [ ] 每台服务器 `/etc/sudoers.d/smileyan-deploy` 已配置

* [ ] 推送一个测试 tag 验证流水线

## 5. 回滚

部署脚本会在覆盖前自动备份当前版本到 `deploy_path` 上一级的 `.backups/smileyan-frontend/`（例如 `/opt/bigbigpig-frontend` → `/opt/.backups/smileyan-frontend/`），保留最近 3 份，命名格式 `<时间戳>-<tag>.tar.gz`。

查看可用备份：

```bash
ssh deploy@<host> 'sudo ls -1tr <deploy_path 的上一级>/.backups/smileyan-frontend/'
```

回滚到指定版本：

```bash
ssh deploy@<host> 'sudo find <deploy_path> -mindepth 1 -delete && \
  sudo tar -xzf <deploy_path 的上一级>/.backups/smileyan-frontend/<TIMESTAMP>-<TAG>.tar.gz -C <deploy_path>'
```

## 6. 安全建议

* 仓库 Settings → Actions 中 workflow 使用最小权限（已配置 `permissions: contents: read`）

* 服务器 SSH 仅放行这一把部署用公钥；不要复用日常开发用的密钥

* 部署账号只授予白名单内的 sudo 命令，避免 root 全权限

* 私有仓库的 Secrets 仅对受信 workflow 可见，PR from fork 不会自动拿到 Secrets

