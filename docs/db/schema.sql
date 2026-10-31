-- Mindex veritabanı şeması (PostgreSQL 17 + pgvector >= 0.7)
-- P4'te Alembic migration'larına dönüştürülecek referans DDL.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()

-- ---------------------------------------------------------------- enums
CREATE TYPE user_role            AS ENUM ('researcher', 'viewer');
CREATE TYPE experiment_mode      AS ENUM ('replay', 'live');
CREATE TYPE experiment_condition AS ENUM ('C0', 'C1', 'C1_NO_REGIME', 'C2', 'C3');
CREATE TYPE experiment_status    AS ENUM ('draft', 'queued', 'running', 'paused', 'completed', 'failed');
CREATE TYPE agent_kind           AS ENUM ('rule', 'rl', 'llm', 'external');
CREATE TYPE market_regime        AS ENUM ('bull', 'bear', 'sideways');
CREATE TYPE trade_side           AS ENUM ('buy', 'sell');
CREATE TYPE forum_stance         AS ENUM ('bullish', 'bearish', 'neutral');

-- ---------------------------------------------------------------- users
CREATE TABLE users (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email         citext      NOT NULL UNIQUE,
    password_hash text        NOT NULL,                      -- Argon2id
    role          user_role   NOT NULL DEFAULT 'viewer',
    created_at    timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- market data
CREATE TABLE assets (
    symbol text PRIMARY KEY CHECK (symbol ~ '^[A-Z]{2,10}$'),
    quote  text NOT NULL DEFAULT 'USDT'
);
INSERT INTO assets (symbol) VALUES ('BTC'), ('ETH'), ('SOL'), ('BNB'), ('XRP');

CREATE TABLE prices (
    asset        text    NOT NULL REFERENCES assets (symbol),
    day          date    NOT NULL,
    open         numeric(20, 8) NOT NULL CHECK (open  > 0),
    high         numeric(20, 8) NOT NULL CHECK (high  > 0),
    low          numeric(20, 8) NOT NULL CHECK (low   > 0),
    close        numeric(20, 8) NOT NULL CHECK (close > 0),
    volume       numeric(28, 8) NOT NULL CHECK (volume >= 0),
    fear_greed   smallint CHECK (fear_greed BETWEEN 0 AND 100),
    funding_rate numeric(12, 8),
    PRIMARY KEY (asset, day),
    CHECK (low <= LEAST(open, close) AND high >= GREATEST(open, close))
);

-- ---------------------------------------------------------------- experiments
CREATE TABLE experiments (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id            uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    name                text NOT NULL CHECK (length(name) BETWEEN 3 AND 120),
    mode                experiment_mode      NOT NULL,
    condition           experiment_condition NOT NULL,
    status              experiment_status    NOT NULL DEFAULT 'draft',
    start_date          date NOT NULL,
    end_date            date,                                -- NULL: canlı mod açık uçlu
    assets              text[] NOT NULL CHECK (cardinality(assets) > 0),
    seed                integer NOT NULL,
    commission_rate     numeric(6, 5) NOT NULL DEFAULT 0.001 CHECK (commission_rate BETWEEN 0 AND 0.01),
    slippage_bps        numeric(6, 2) NOT NULL DEFAULT 5     CHECK (slippage_bps BETWEEN 0 AND 100),
    config              jsonb NOT NULL,                      -- YAML dışa aktarımın kaynağı
    model_version       text NOT NULL,
    prompt_version      text NOT NULL,
    last_checkpoint_day date,
    created_at          timestamptz NOT NULL DEFAULT now(),
    CHECK (end_date IS NULL OR end_date > start_date)
);
CREATE INDEX experiments_owner_idx  ON experiments (owner_id);
CREATE INDEX experiments_status_idx ON experiments (status);

CREATE TABLE agents (
    id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name    text NOT NULL UNIQUE,
    kind    agent_kind NOT NULL,
    persona text,                                            -- yalnızca LLM ajanları
    params  jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE experiment_agents (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id uuid NOT NULL REFERENCES experiments (id) ON DELETE CASCADE,
    agent_id      uuid NOT NULL REFERENCES agents (id) ON DELETE RESTRICT,
    initial_cash  numeric(20, 2) NOT NULL DEFAULT 10000 CHECK (initial_cash > 0),
    UNIQUE (experiment_id, agent_id)
);

-- ---------------------------------------------------------------- decisions & trades
CREATE TABLE decisions (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_agent_id uuid NOT NULL REFERENCES experiment_agents (id) ON DELETE CASCADE,
    day                 date NOT NULL,
    target_weights      jsonb NOT NULL,                      -- {"BTC": 0.5, "ETH": 0.3}
    confidence          numeric(4, 3) CHECK (confidence BETWEEN 0 AND 1),
    rationale           text,
    regime              market_regime,
    attempts            smallint NOT NULL DEFAULT 1 CHECK (attempts BETWEEN 1 AND 3),
    held_position       boolean  NOT NULL DEFAULT false,     -- NF2 güvenli varsayılan uygulandı
    latency_ms          integer CHECK (latency_ms >= 0),
    trace_id            text,                                -- Langfuse trace
    UNIQUE (experiment_agent_id, day)
);

CREATE TABLE trades (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_id uuid NOT NULL REFERENCES decisions (id) ON DELETE CASCADE,
    asset       text NOT NULL REFERENCES assets (symbol),
    side        trade_side NOT NULL,
    quantity    numeric(28, 10) NOT NULL CHECK (quantity > 0),
    price       numeric(20, 8)  NOT NULL CHECK (price > 0),
    fee         numeric(20, 8)  NOT NULL CHECK (fee >= 0),
    executed_at timestamptz NOT NULL
);
CREATE INDEX trades_decision_idx ON trades (decision_id);

CREATE TABLE portfolio_snapshots (
    experiment_agent_id uuid NOT NULL REFERENCES experiment_agents (id) ON DELETE CASCADE,
    day                 date NOT NULL,
    equity              numeric(20, 2) NOT NULL CHECK (equity >= 0),
    cash                numeric(20, 2) NOT NULL CHECK (cash >= 0),
    holdings            jsonb NOT NULL,                      -- {"BTC": 0.12}
    PRIMARY KEY (experiment_agent_id, day)
);

-- ---------------------------------------------------------------- memory (pgvector)
CREATE TABLE memories (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_agent_id uuid NOT NULL REFERENCES experiment_agents (id) ON DELETE CASCADE,
    source_trade_id     uuid REFERENCES trades (id) ON DELETE SET NULL,
    lesson              text NOT NULL CHECK (length(lesson) BETWEEN 20 AND 2000),
    counterfactual      jsonb NOT NULL,                      -- gerçek / girmemek / yarım / zarar-kes PnL
    regime              market_regime NOT NULL,
    importance          numeric(3, 2) NOT NULL CHECK (importance BETWEEN 0 AND 1),
    embedding           vector(1024) NOT NULL,               -- Qwen3-Embedding-0.6B
    lesson_tsv          tsvector GENERATED ALWAYS AS (to_tsvector('simple', lesson)) STORED,
    created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX memories_embedding_hnsw ON memories USING hnsw (embedding vector_cosine_ops);
CREATE INDEX memories_tsv_gin        ON memories USING gin (lesson_tsv);
CREATE INDEX memories_owner_regime   ON memories (experiment_agent_id, regime);

CREATE TABLE decision_memories (
    decision_id uuid NOT NULL REFERENCES decisions (id) ON DELETE CASCADE,
    memory_id   uuid NOT NULL REFERENCES memories (id)  ON DELETE CASCADE,
    score       numeric(6, 5) NOT NULL,                      -- hibrit sıralama skoru
    PRIMARY KEY (decision_id, memory_id)
);

-- ---------------------------------------------------------------- forum & trust
CREATE TABLE forum_messages (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id uuid NOT NULL REFERENCES experiments (id) ON DELETE CASCADE,
    sender_id     uuid NOT NULL REFERENCES experiment_agents (id) ON DELETE CASCADE,
    day           date NOT NULL,
    content       text NOT NULL CHECK (length(content) <= 1000),
    asset         text REFERENCES assets (symbol),
    stance        forum_stance NOT NULL,
    flagged       boolean NOT NULL DEFAULT false,            -- OWASP LLM01 filtresi
    verified      boolean                                     -- NULL: ufuk dolmadı
);
CREATE INDEX forum_messages_exp_day_idx ON forum_messages (experiment_id, day);

CREATE TABLE decision_forum_reads (
    decision_id      uuid NOT NULL REFERENCES decisions (id)      ON DELETE CASCADE,
    forum_message_id uuid NOT NULL REFERENCES forum_messages (id) ON DELETE CASCADE,
    weight           numeric(5, 4) NOT NULL CHECK (weight BETWEEN 0 AND 1),
    PRIMARY KEY (decision_id, forum_message_id)
);

CREATE TABLE trust_scores (
    truster_id uuid NOT NULL REFERENCES experiment_agents (id) ON DELETE CASCADE,
    trustee_id uuid NOT NULL REFERENCES experiment_agents (id) ON DELETE CASCADE,
    confirmed  integer NOT NULL DEFAULT 0 CHECK (confirmed >= 0),
    refuted    integer NOT NULL DEFAULT 0 CHECK (refuted   >= 0),
    score      numeric(5, 4) GENERATED ALWAYS AS
               ((confirmed + 1)::numeric / (confirmed + refuted + 2)) STORED,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (truster_id, trustee_id),
    CHECK (truster_id <> trustee_id)
);
