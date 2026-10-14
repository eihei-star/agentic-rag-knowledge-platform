# 文档状态流转测试 curl

默认测试环境：`DOCUMENT_REQUIRE_APPROVAL=true`（`.env` 不设置即为 true）。

**所有文档接口需 JWT**。审核相关接口需 `reviewer` 或 `admin` 账号。预置账号见 `curl-auth.md`。

| status | 名称 | 说明 |
|--------|------|------|
| 0 | Draft | 草稿，不进索引 |
| 1 | Published | 已发布，写入 RAG/Search/KG |
| 2 | Archived | 已归档，清索引、保留正文 |
| 3 | PendingReview | 待审核，不进索引 |

## 状态流转（审核模式）

```
Draft ──publish/submit──► PendingReview ──approve──► Published
PendingReview ──reject──► Draft
Published ──archive──────► Archived
Published ──save-draft───► Draft
Published ──改内容 + submit──► PendingReview（清旧索引，通过后写新索引）
```

---

## 零、登录拿 Token

```bash
export BASE=http://localhost:3000

# 普通用户：上传、提交审核
curl -s -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"username":"user","password":"123456"}' | jq -r '.accessToken'

TOKEN='替换成 user 的 accessToken'

# 审核员：待办列表、approve/reject
curl -s -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"username":"reviewer","password":"123456"}' | jq -r '.accessToken'

REVIEWER_TOKEN='替换成 reviewer 的 accessToken'
```

---

## 一、审核发布主流程

### 1. 上传 PDF 并解析为草稿

依赖：RustFS（`docker compose up -d rustfs`）。`authorId`/`createBy` 由 JWT 自动填充，无需手传。

```bash
curl -s -X POST "$BASE/documents/upload/parse" \
  -H "Authorization: Bearer $TOKEN" \
  -F 'file=@./test-files/02-production-release-sop.pdf' \
  -F 'tags=审核流测试,SOP' | jq '{documentId, title, status, fileExtension, contentLength, contentPreview}'
```

```bash
DOC_ID='替换成返回的 documentId'
```

可选：查看解析后的完整正文

```bash
curl -s "$BASE/documents/${DOC_ID}" \
  -H "Authorization: Bearer $TOKEN" | jq '{id, title, status, contentLength: (.content | length)}'
```

### 2. 提交发布 → status=3，不投索引

```bash
# PUT publish 与 POST reviews/submit 在需审核模式下效果相同
curl -s -X PUT "$BASE/documents/${DOC_ID}/publish" \
  -H "Authorization: Bearer $TOKEN" | jq '{id, status}'
```

### 3. 查看待审任务（审核员）

```bash
curl -s "$BASE/documents/${DOC_ID}/reviews/current" \
  -H "Authorization: Bearer $TOKEN" | jq

curl -s "$BASE/documents/reviews/tasks?status=pending" \
  -H "Authorization: Bearer $REVIEWER_TOKEN" | jq

curl -s "$BASE/documents/reviews/tasks/pending-count" \
  -H "Authorization: Bearer $REVIEWER_TOKEN" | jq
```

```bash
TASK_ID='替换成 reviews/current 或 tasks 列表里的 id'
```

### 4. 审核通过 → status=1 + 写入索引

```bash
curl -s -X POST "$BASE/documents/reviews/tasks/${TASK_ID}/approve" \
  -H "Authorization: Bearer $REVIEWER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"reviewComment": "内容符合规范，准予发布"}' | jq '{id, status, publishTime}'
```

### 5. 已发布文档修改后再提审

```bash
curl -s -X PATCH "$BASE/documents/${DOC_ID}" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"content": "# 生产发布 SOP v2\n\n已发布文档修改后需重新审核。"}' | jq '{id, status}'

curl -s -X POST "$BASE/documents/${DOC_ID}/reviews/submit" \
  -H "Authorization: Bearer $TOKEN" | jq '{id, status}'
```

> 已发布文档再次提审时会**清掉旧索引**，审核通过后再写入新索引。

### 6. 审核驳回 → status=0

```bash
curl -s "$BASE/documents/reviews/tasks?status=pending" \
  -H "Authorization: Bearer $REVIEWER_TOKEN" | jq '.items[0].id'
TASK_ID='替换成待审 task id'

curl -s -X POST "$BASE/documents/reviews/tasks/${TASK_ID}/reject" \
  -H "Authorization: Bearer $REVIEWER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"reviewComment": "请补充操作步骤与负责人信息"}' | jq '{id, status}'
```

### 7. 审核历史

```bash
curl -s "$BASE/documents/${DOC_ID}/reviews/history" \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## 二、已发布后的状态变更

```bash
# 归档 → status=2，清索引
curl -s -X PUT "$BASE/documents/${DOC_ID}/archive" \
  -H "Authorization: Bearer $TOKEN" | jq '{id, status}'

# 保存为草稿 → status=0，清索引
curl -s -X PUT "$BASE/documents/${DOC_ID}/save-draft" \
  -H "Authorization: Bearer $TOKEN" | jq '{id, status}'

# 软删除（任意状态；已发布会同时清 RAG/Search/KG）
curl -s -X DELETE "$BASE/documents/${DOC_ID}" \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## 三、边界校验

```bash
# status=3 时不可编辑，期望 400
curl -s -X PATCH "$BASE/documents/${DOC_ID}" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title": "试图修改标题"}' | jq

# 按状态筛选列表
curl -s "$BASE/documents?status=3&page=1&pageSize=5" \
  -H "Authorization: Bearer $TOKEN" | jq '.items[] | {id, title, status}'
```

---

## 四、免审模式（可选）

`.env` 设 `DOCUMENT_REQUIRE_APPROVAL=false` 并重启后，`PUT publish` 直接 → Published(1) 并投索引，无审核步骤。

```bash
curl -s -X PUT "$BASE/documents/${DOC_ID}/publish" \
  -H "Authorization: Bearer $TOKEN" | jq '{id, status, publishTime}'
```

---

未安装 `jq` 时去掉 `| jq` 即可。

本地全新初始化：删除 Postgres 数据卷后 `docker compose up -d`，`init.sql` 会创建用户/角色/文档相关表及测试账号。
