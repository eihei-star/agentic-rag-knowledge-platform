# Agentic RAG 智能知识平台

面向企业制度、流程和业务知识分散、检索效率低、权限边界复杂等问题构建的全栈知识平台。系统覆盖多格式文档解析、审核发布、混合检索、知识图谱和多轮 AI 问答，并由 Agent 自主完成意图路由、工具调用、检索评估、查询改写及联网补充。

## 核心能力

- **Agentic RAG**：根据问题动态选择知识库、知识图谱和联网搜索工具，对检索结果进行评估，并在必要时改写查询、二次召回。
- **混合检索**：融合 Elasticsearch 关键词检索与向量召回，通过 RRF 合并候选结果，再使用 Reranker 精排和阈值过滤。
- **权限感知问答**：公开、团队、作者等文档权限同时作用于全文、向量和图谱检索，避免 Agent 引用越权内容。
- **知识全生命周期**：支持 PDF、Word、PPT、Excel 等文档解析，使用 RabbitMQ 异步完成分块、向量化、全文索引和知识图谱构建。
- **多层对话记忆**：Redis 保存短期热上下文，PostgreSQL 保存历史消息，Mem0 承载经过分类的跨会话记忆。
- **可解释生成**：流式展示意图识别、工具调用、检索评估和查询改写过程，回答附带原文引用与图谱关系。

## 系统架构

```text
React + Ant Design 管理台
          │ REST / SSE
          ▼
NestJS API ── Agent / RAG Orchestrator
   │              ├─ Elasticsearch + Vector Retrieval
   │              ├─ RRF + Reranker
   │              ├─ Neo4j Knowledge Graph
   │              └─ Web Search / LLM Tools
   │
   ├─ PostgreSQL（用户、权限、文档、消息）
   ├─ MongoDB（文档与处理数据）
   ├─ Redis / Mem0（短期与长期记忆）
   ├─ RabbitMQ（异步知识处理）
   └─ RustFS（S3 兼容对象存储）
```

## 技术栈

| 分层 | 技术 |
|---|---|
| AI | LangChain、AI SDK、OpenAI Compatible API、Embedding、Reranker、Mem0 |
| 后端 | NestJS、TypeScript、TypeORM、Mongoose、RabbitMQ |
| 前端 | React、TypeScript、Ant Design、ECharts、Vite |
| 数据 | PostgreSQL、MongoDB、Redis、Elasticsearch、Neo4j、RustFS |
| 工程 | Docker Compose、Jest、ESLint、GitHub Actions |

## 仓库结构

```text
backend/   NestJS API、Agent、检索、权限、文档流水线
frontend/  React 管理台、聊天、图谱及系统管理界面
```

真实 `.env`、模型密钥、测试上传文档、运行数据和构建产物均不会提交到仓库。

## 本地运行

环境要求：Node.js 22+、pnpm 11+、Docker Desktop。

```powershell
git clone https://github.com/eihei-star/agentic-rag-knowledge-platform.git
cd agentic-rag-knowledge-platform

Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env

cd backend
docker compose up -d
pnpm install
pnpm run start:dev
```

新终端启动前端：

```powershell
cd frontend
pnpm install
pnpm run dev
```

前端默认运行在 `http://localhost:5173`，并将 `/api` 代理到 `http://localhost:3000`。

> `docker-compose.yml` 和示例账号只用于本地演示。部署前必须替换数据库密码、JWT Secret、对象存储凭据及所有模型 API Key。

## 质量检查

```powershell
pnpm --dir backend run build
pnpm --dir backend run lint
pnpm --dir backend test -- --runInBand
pnpm --dir frontend run lint
pnpm --dir frontend run build
```

上述检查也会在每次推送和 Pull Request 中由 GitHub Actions 自动执行。

