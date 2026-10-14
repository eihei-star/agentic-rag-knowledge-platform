---

##  发布文档（直接发布，无审核）

```bash
DOC_ID='docid'
```

将草稿（或已发布文档）设为已发布，并投递 RabbitMQ 异步管线。

```bash
curl -s -X PUT "http://localhost:3000/documents/${DOC_ID}/publish"
```

成功后 `status=1`，会给 RabbitMQ 并行投递消息，当前有两条消费者管道：

- **RAG**：分块 → 向量化 → 写入 ES `kh_chunk`（dense_vector，后续对话用）
- **Search**：从 Mongo 拉全文 → 写入 ES `kh_document`（全文检索）
- **KG**：抽实体关系 → 写入 Neo4j

下架 / 删除时同样投递删除消息，两条管道分别清理对应索引。

---

GET /_cat/indices?

GET /kh_document/_search
{
  "size": 100,
  "query": {
    "match_all": {}
  }
}

GET /kh_chunk/_search
{
  "size": 100,
  "query": {
    "match_all": {}
  }
}

POST /kh_document/_delete_by_query
{
  "query": {
    "match_all": {}
  }
}

POST /kh_chunk/_delete_by_query
{
  "query": {
    "match_all": {}
  }
}