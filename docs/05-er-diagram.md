# 5. ER Diyagramı

PostgreSQL 17 + pgvector. DDL: [`db/schema.sql`](db/schema.sql). Alan açıklamaları: [veri sözlüğü](06-data-dictionary.md).

```mermaid
erDiagram
    users ||--o{ experiments : "oluşturur"
    experiments ||--o{ experiment_agents : "içerir"
    agents ||--o{ experiment_agents : "katılır"
    experiment_agents ||--o{ decisions : "verir"
    decisions ||--o{ trades : "yürütülür"
    decisions ||--o{ decision_memories : "kullanır"
    memories ||--o{ decision_memories : "geri çağrılır"
    experiment_agents ||--o{ memories : "yazar"
    trades |o--o| memories : "post-mortem kaynağı"
    experiment_agents ||--o{ forum_messages : "gönderir"
    decisions ||--o{ decision_forum_reads : "okur"
    forum_messages ||--o{ decision_forum_reads : "okunur"
    experiment_agents ||--o{ trust_scores : "güvenen"
    experiment_agents ||--o{ trust_scores : "güvenilen"
    experiments ||--o{ portfolio_snapshots : "kaydeder"
    experiment_agents ||--o{ portfolio_snapshots : "sahip"
    prices }o--|| assets : "ait"

    users {
        uuid id PK
        citext email UK
        text password_hash "Argon2id"
        user_role role "researcher | viewer"
        timestamptz created_at
    }
    experiments {
        uuid id PK
        uuid owner_id FK
        text name
        experiment_mode mode "replay | live"
        experiment_condition condition "C0..C3"
        experiment_status status
        date start_date
        date end_date
        text[] assets
        int seed
        numeric commission_rate
        numeric slippage_bps
        jsonb config "tam YAML karşılığı"
        text model_version
        text prompt_version
        int last_checkpoint_day
        timestamptz created_at
    }
    agents {
        uuid id PK
        text name UK
        agent_kind kind "rule | rl | llm | external"
        text persona
        jsonb params
    }
    experiment_agents {
        uuid id PK
        uuid experiment_id FK
        uuid agent_id FK
        numeric initial_cash
    }
    decisions {
        uuid id PK
        uuid experiment_agent_id FK
        date day
        jsonb target_weights
        numeric confidence
        text rationale
        market_regime regime
        smallint attempts
        bool held_position
        int latency_ms
        text trace_id "Langfuse"
    }
    trades {
        uuid id PK
        uuid decision_id FK
        text asset
        trade_side side
        numeric quantity
        numeric price
        numeric fee
        timestamptz executed_at
    }
    memories {
        uuid id PK
        uuid experiment_agent_id FK
        uuid source_trade_id FK
        text lesson
        jsonb counterfactual "PnL tablosu"
        market_regime regime
        numeric importance
        vector embedding "1024"
        tsvector lesson_tsv
        timestamptz created_at
    }
    decision_memories {
        uuid decision_id PK,FK
        uuid memory_id PK,FK
        numeric score
    }
    forum_messages {
        uuid id PK
        uuid experiment_id FK
        uuid sender_id FK
        date day
        text content
        text asset
        text stance "bullish | bearish | neutral"
        bool flagged "prompt injection şüphesi"
        bool verified "null = henüz değerlendirilmedi"
    }
    decision_forum_reads {
        uuid decision_id PK,FK
        uuid forum_message_id PK,FK
        numeric weight "gönderen güveni"
    }
    trust_scores {
        uuid truster_id PK,FK
        uuid trustee_id PK,FK
        int confirmed "a"
        int refuted "b"
        numeric score "(a+1)/(a+b+2), hesaplanan"
    }
    portfolio_snapshots {
        uuid experiment_agent_id PK,FK
        date day PK
        numeric equity
        numeric cash
        jsonb holdings
    }
    assets {
        text symbol PK
        text quote
    }
    prices {
        text asset PK,FK
        date day PK
        numeric open
        numeric high
        numeric low
        numeric close
        numeric volume
        numeric fear_greed
        numeric funding_rate
    }
```

## Tasarım notları

- **UUID birincil anahtarlar** (`uuidv7()` yoksa `gen_random_uuid()`): dış sistemlere (MCP, URL) sıralı ID sızdırmaz.
- **`experiment_agents` köprü tablosu**: aynı ajan farklı deneylerde farklı hafızaya sahip olur; hafıza ve güven deney kapsamındadır, koşullar arası sızıntı olmaz.
- **`trust_scores.score`** üretilmiş sütundur (`GENERATED ALWAYS AS ... STORED`), formül uygulama koduyla aynıdır (`mindex.domain.trust`).
- **Hibrit arama**: `memories.embedding` üzerinde HNSW (cosine), `lesson_tsv` üzerinde GIN; sonuçlar Reciprocal Rank Fusion ile birleşir.
- **`prices`** yalnızca canlı mod ve ekran için önbellektir; deneyler tekrarlanabilirlik için sürümlü Parquet anlık görüntülerinden okur.
- **`portfolio_snapshots`** gün bazlı checkpoint görevi de görür (NF2).
