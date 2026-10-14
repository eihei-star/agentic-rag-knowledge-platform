# 用户鉴权测试 curl

默认 **注册后立即可登录**（`REQUIRE_EMAIL_VERIFICATION=false`）。设为 `true` 时需邮箱激活。文档接口默认需 JWT；审核接口需 `ROLE_REVIEWER` 或 `ROLE_ADMIN`。

## 预置测试账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | 123456 | 管理员 + 审核员 |
| reviewer | 123456 | 审核员 |
| user | 123456 | 普通用户 |

> 全新库：删除 Postgres 数据卷后 `docker compose up -d`，`init.sql` 会自动建表并插入上述账号。

```bash
export BASE=http://localhost:3000
```

---

## 1. 登录

```bash
curl -s -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"username":"user","password":"123456"}' | jq
```

```bash
TOKEN='替换成 accessToken'
```

审核员登录（用于 approve/reject）：

```bash
curl -s -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"username":"reviewer","password":"123456"}' | jq '{accessToken, userInfo}'
```

```bash
REVIEWER_TOKEN='替换成 reviewer 的 accessToken'
```

---

## 2. 当前用户

```bash
curl -s "$BASE/auth/me" \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## 3. 注册（默认 ROLE_USER）

```bash
curl -s -X POST "$BASE/auth/register" \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "zhangsan",
    "password": "123456",
    "email": "user@example.com",
    "realName": "张三"
  }' | jq
```

注册成功后用新账号走登录 curl。

---

## 4. 邮箱激活（REQUIRE_EMAIL_VERIFICATION=true 时）

注册成功后会向邮箱发送激活链接，token 存 Redis（24 小时有效）。

```bash
ACTIVATION_TOKEN='替换成邮件中的 token'

curl -s "$BASE/auth/verify-email?token=$ACTIVATION_TOKEN" | jq
```

---

## 5. 忘记密码（两步，验证码存 Redis，10 分钟有效）

需配置 `MAIL_*` 与 `REDIS_*`（见 `.env.example`）。

```bash
# 1. 发送验证码
curl -s -X POST "$BASE/auth/password/reset/send-code" \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com"}' | jq

# 2. 重置密码（邮箱 + 验证码 + 新密码）
curl -s -X POST "$BASE/auth/password/reset" \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","code":"123456","newPassword":"654321"}' | jq
```

---

## 6. 刷新 Token

```bash
REFRESH='替换成 login 返回的 refreshToken'

curl -s -X POST "$BASE/auth/refresh" \
  -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$REFRESH\"}" | jq '{accessToken, expiresIn}'
```

---

## 7. 退出登录

```bash
curl -s -X POST "$BASE/auth/logout" \
  -H "Authorization: Bearer $TOKEN" | jq
```

无状态 JWT，服务端仅返回成功；客户端丢弃 accessToken / refreshToken 即可。

---

## 8. 审核员 ID 列表

```bash
curl -s "$BASE/auth/reviewer-ids" \
  -H "Authorization: Bearer $REVIEWER_TOKEN" | jq
```

---

## 9. 带 Token 调用文档接口（示例）

上传 PDF 创建草稿（普通用户）：

```bash
curl -s -X POST "$BASE/documents/upload/parse" \
  -H "Authorization: Bearer $TOKEN" \
  -F 'file=@./test-files/02-production-release-sop.pdf' \
  -F 'tags=审核流测试,SOP' | jq
```

审核通过（需 reviewer/admin token）：

```bash
TASK_ID='替换成待审任务 id'

curl -s -X POST "$BASE/documents/reviews/tasks/${TASK_ID}/approve" \
  -H "Authorization: Bearer $REVIEWER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"reviewComment":"内容符合规范，准予发布"}' | jq '{id, status, publishTime}'
```

---

未安装 `jq` 时去掉 `| jq` 即可。

完整文档状态流转见 `curl-document-status.md`。用户/角色/团队管理见 `curl-users.md`。
