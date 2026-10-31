# 2. Sistem Mimarisi

Mindex dört katmandan oluşur: **Veri**, **Simülatör**, **Ajanlar**, **Sunum/Protokol**. Uzun süren deneyler API sürecinden ayrı bir işçide (worker) koşar; LLM çıkarımı GPU'lu dizüstüne Tailscale tüneliyle bağlanır.

## Bağlam (C4 seviye 1)

```mermaid
flowchart TB
    user([Araştırmacı / İzleyici])
    ext([Dış LLM ajanı])
    subgraph mindex[Mindex]
        sys[Arena]
    end
    binance[(Binance REST + WS)]
    llm[(llama.cpp - laptop GPU)]
    lf[(Langfuse)]

    user -- HTTPS / WSS --> sys
    ext -- MCP --> sys
    sys -- ccxt --> binance
    sys -- OpenAI uyumlu API, Tailscale --> llm
    sys -- OTel izleri --> lf
```

## Konteynerler (C4 seviye 2)

```mermaid
flowchart LR
    subgraph client[Tarayıcı]
        web[React 19 SPA<br/>TanStack Query, Lightweight Charts]
    end

    subgraph vps[VPS - Docker Compose]
        caddy[Caddy<br/>otomatik HTTPS]
        api[FastAPI<br/>REST + WebSocket + OpenAPI]
        mcp[MCP sunucusu<br/>resmi Python SDK]
        worker[Deney işçisi<br/>simülatör + ajan döngüsü]
        redis[(Redis Streams<br/>iş kuyruğu + yayın)]
        pg[(PostgreSQL 17<br/>+ pgvector HNSW)]
        lf[Langfuse<br/>self-host]
        parquet[(Parquet anlık<br/>görüntüleri)]
    end

    subgraph laptop[Laptop - 8 GB VRAM]
        llama[llama-server<br/>Qwen3.5-9B Q4_K_M]
        emb[Qwen3-Embedding-0.6B]
    end

    binance[(Binance)]

    web -- HTTPS/WSS --> caddy --> api
    caddy --> mcp
    api -- XADD deney işi --> redis
    redis -- XREADGROUP --> worker
    worker -- tick/işlem yayını --> redis -- pub --> api
    api & worker & mcp --> pg
    worker --> parquet
    worker -- ccxt --> binance
    worker -- Tailscale --> llama
    worker -- Tailscale --> emb
    worker -. OTel .-> lf
```

## Katmanlar

| Katman | Sorumluluk | Ana bileşenler |
|---|---|---|
| Veri | OHLCV, Fear & Greed, funding rate çekme; Parquet anlık görüntüleri; train/val/test ayrımı | ccxt, Polars, DuckDB |
| Simülatör | `t` kapanışında karar, `t+1` açılışında %0,1 komisyon + 5 bp kayma ile yürütme; long-only, kaldıraçsız; checkpoint | Saf Python, Gymnasium ortamı |
| Ajanlar | `BaseAgent` arayüzü; kural tabanlı (3), PPO (1), LLM (4); hafıza, forum, post-mortem | PydanticAI, Stable-Baselines3, hmmlearn, pgvector |
| Sunum / Protokol | REST, WebSocket, MCP; kimlik doğrulama; rapor | FastAPI, MCP SDK, React |

## Temel tasarım kararları (ADR özeti)

| # | Karar | Gerekçe | Alternatif |
|---|---|---|---|
| ADR-1 | Tek PostgreSQL'de ilişkisel + vektör veri (pgvector) | Tek yedek, tek işlem sınırı, JOIN ile hibrit arama | Ayrı vektör DB (Qdrant) — operasyon yükü |
| ADR-2 | Deney işçisi API'den ayrı, Redis Streams ile | Uzun deneyler HTTP isteğini bloklamaz; consumer group ile yeniden deneme | Celery — daha ağır |
| ADR-3 | Yerel LLM (llama.cpp), bulut yok | Maliyet sıfır, veri egemenliği, birebir tekrarlanabilirlik | Bulut API — look-ahead ve maliyet riski |
| ADR-4 | Karar adımında düşünme modu kapalı + JSON şeması ile kısıtlı üretim | p95 < 10 sn hedefi, bozuk JSON riskini azaltır | Serbest metin + regex — kırılgan |
| ADR-5 | Prototip MSW ile sahte API'ye bağlı | Aynı frontend kodu gerçek API'ye geçer; sözleşme önce tanımlanır | Statik HTML mock — atılır |
| ADR-6 | Forum mesajları güvenilmeyen veri | OWASP LLM01 prompt injection | — |
