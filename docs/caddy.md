# Caddy 配置说明

本文档介绍 Smileyan 博客系统的前端部署配置。

## 完整 Caddy 配置文件

```caddyfile
# The Caddyfile is an easy way to configure your Caddy web server.
#
# https://caddyserver.com/docs/caddyfile


# The configuration below serves a welcome page over HTTP on port 80.  To use
# your own domain name with automatic HTTPS, ensure your A/AAAA DNS record is
# pointing to this machine's public IP, then replace `http://` with your domain
# name.  Refer to the documentation for full instructions on the address
# specification.
#
# https://caddyserver.com/docs/caddyfile/concepts#addresses
# http:// {
bigbigpig.cn {
    # Set this path to your site's directory.
    root * /var/www/html

    # Enable the static file server.
    file_server

    # Another common task is to set up a reverse proxy:
    # reverse_proxy localhost:8080

    # Or serve a PHP site through php-fpm:
    # php_fastcgi localhost:9000
    # SPA fallback - 所有路由都返回 index.html
    # try_files {path} {path}/ /index.html

    # Refer to the directive documentation for more options.
    # https://caddyserver.com/docs/caddyfile/directives
    handle /api/* {
        reverse_proxy localhost:8080
    }
    # 其他所有请求返回 index.html（SPA）
    handle {
        try_files {path} /index.html
        file_server
    }
}


# As an alternative to editing the above site block, you can add your own site
# block files in the Caddyfile.d directory, and they will be included as long
# as they use the .caddyfile extension.
import Caddyfile.d/*.caddyfile
```

## 关键配置说明

### 1. 静态文件服务

```caddyfile
root * /var/www/html
file_server
```

设置静态文件根目录为 `/var/www/html`，并启用静态文件服务器。

### 2. API 反向代理

```caddyfile
handle /api/* {
    reverse_proxy localhost:8080
}
```

将 `/api/*` 路径的请求反向代理到后端服务 localhost:8080。

### 3. SPA Fallback

```caddyfile
handle {
    try_files {path} /index.html
    file_server
}
```

处理非 API 的其他请求：
- 先尝试查找对应文件
- 找不到则返回 index.html
- 让前端 Vue Router 处理路由

这是 SPA（单页应用）的关键配置，确保刷新页面路由正常工作。

## 常用命令

```bash
# 验证配置
sudo caddy validate --config /etc/caddy/Caddyfile

# 重载配置
sudo caddy reload

# 或者重启
sudo caddy restart
```

## 参考文档

- [Caddy 官方文档](https://caddyserver.com/docs)
- [Caddyfile 概念](https://caddyserver.com/docs/caddyfile/concepts)
- [指令列表](https://caddyserver.com/docs/caddyfile/directives)