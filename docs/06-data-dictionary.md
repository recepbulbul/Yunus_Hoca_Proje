# 6. Veri Sözlüğü

Kaynak DDL: [`db/schema.sql`](db/schema.sql). Tüm zaman damgaları UTC'dir (`timestamptz`); işlem günleri `date` olarak UTC 00:00 mum kapanışını ifade eder. Parasal değerler USDT cinsindendir.

## users
| Alan | Tip | Boş? | Kısıt / varsayılan | Açıklama |
|---|---|:-:|---|---|
| id | uuid | H | PK, `gen_random_uuid()` | Kullanıcı kimliği |
| email | citext | H | UNIQUE | Büyük/küçük harf duyarsız e-posta |
| password_hash | text | H | | Argon2id özeti (NF3); düz parola hiçbir yerde saklanmaz |
| role | user_role | H | `viewer` | `researcher` deney kurar, `viewer` yalnızca izler (F1) |
| created_at | timestamptz | H | `now()` | Kayıt zamanı |

## assets
| Alan | Tip | Boş? | Kısıt | Açıklama |
|---|---|:-:|---|---|
| symbol | text | H | PK, `^[A-Z]{2,10}$` | BTC, ETH, SOL, BNB, XRP |
| quote | text | H | `USDT` | Karşı para birimi |

## prices
| Alan | Tip | Boş? | Kısıt | Açıklama |
|---|---|:-:|---|---|
| asset | text | H | PK, FK → assets | Varlık |
| day | date | H | PK | Mum günü (UTC) |
| open / high / low / close | numeric(20,8) | H | > 0, low ≤ open,close ≤ high | Günlük OHLC |
| volume | numeric(28,8) | H | ≥ 0 | Baz varlık cinsinden hacim |
| fear_greed | smallint | E | 0–100 | Crypto Fear & Greed endeksi |
| funding_rate | numeric(12,8) | E | | Perpetual funding oranı (yalnızca gözlem özelliği) |

## experiments
| Alan | Tip | Boş? | Kısıt / varsayılan | Açıklama |
|---|---|:-:|---|---|
| id | uuid | H | PK | |
| owner_id | uuid | H | FK → users, RESTRICT | Deneyi kuran araştırmacı |
| name | text | H | 3–120 karakter | |
| mode | experiment_mode | H | `replay` \| `live` | Geçmiş veri tekrarı veya canlı paper-trading |
| condition | experiment_condition | H | C0, C1, C1_NO_REGIME, C2, C3 | Ablasyon koşulu |
| status | experiment_status | H | `draft` | draft → queued → running ⇄ paused → completed / failed |
| start_date / end_date | date | H / E | end > start | Canlı modda `end_date` boş olabilir |
| assets | text[] | H | ≥ 1 eleman | Deneydeki varlık evreni |
| seed | integer | H | | Tüm rastgelelik kaynakları bu seed'den türetilir (F3) |
| commission_rate | numeric(6,5) | H | 0.001, 0–0.01 | İşlem başına komisyon oranı |
| slippage_bps | numeric(6,2) | H | 5, 0–100 | Kayma (baz puan) |
| config | jsonb | H | | Tam yapılandırma; YAML dışa aktarımının kaynağı (F2) |
| model_version | text | H | | Örn. `qwen3.5-9b-q4_k_m@sha256:…` (NF5) |
| prompt_version | text | H | | Örn. `decision-v3` (NF5) |
| last_checkpoint_day | date | E | | Kaldığı yerden sürdürme noktası (NF2) |
| created_at | timestamptz | H | `now()` | |

## agents
| Alan | Tip | Boş? | Kısıt | Açıklama |
|---|---|:-:|---|---|
| id | uuid | H | PK | |
| name | text | H | UNIQUE | Örn. `llm-momentum`, `ppo`, `buy-hold-btc` |
| kind | agent_kind | H | rule \| rl \| llm \| external | `external` = MCP ile katılan dış ajan (F9) |
| persona | text | E | | LLM ajanının kişilik tanımı (momentum, ortalamaya dönüş, duyarlılık, riskten kaçınan) |
| params | jsonb | H | `{}` | Ajan hiperparametreleri (örn. MA pencereleri) |

## experiment_agents
| Alan | Tip | Boş? | Kısıt | Açıklama |
|---|---|:-:|---|---|
| id | uuid | H | PK | Deney içindeki ajan örneği; hafıza, karar ve güven buna bağlanır |
| experiment_id | uuid | H | FK, CASCADE | |
| agent_id | uuid | H | FK, RESTRICT | |
| initial_cash | numeric(20,2) | H | 10000, > 0 | Başlangıç sanal bakiyesi |

## decisions
| Alan | Tip | Boş? | Kısıt | Açıklama |
|---|---|:-:|---|---|
| id | uuid | H | PK | |
| experiment_agent_id | uuid | H | FK; (ajan, gün) UNIQUE | |
| day | date | H | | Kararın verildiği gün `t` (yürütme `t+1` açılışı) |
| target_weights | jsonb | H | Σ ≤ 1, her biri 0–1 | Hedef portföy ağırlıkları; kalan nakit |
| confidence | numeric(4,3) | E | 0–1 | LLM'in beyan ettiği güven |
| rationale | text | E | | Karar gerekçesi (F6, açıklanabilirlik) |
| regime | market_regime | E | bull \| bear \| sideways | HMM'in o günkü rejim etiketi |
| attempts | smallint | H | 1–3 | Kaç denemede geçerli JSON alındı |
| held_position | boolean | H | false | Tüm denemeler başarısız → pozisyon korundu (NF2) |
| latency_ms | integer | E | ≥ 0 | Karar çağrısı süresi (NF1 p95 hedefi) |
| trace_id | text | E | | Langfuse izi (NF4) |

## trades
| Alan | Tip | Boş? | Kısıt | Açıklama |
|---|---|:-:|---|---|
| id | uuid | H | PK | |
| decision_id | uuid | H | FK | İşlemi doğuran karar (her işlem gerekçesine kadar izlenebilir) |
| asset | text | H | FK → assets | |
| side | trade_side | H | buy \| sell | |
| quantity | numeric(28,10) | H | > 0 | |
| price | numeric(20,8) | H | > 0 | Kayma dahil gerçekleşen fiyat |
| fee | numeric(20,8) | H | ≥ 0 | Ödenen komisyon (USDT) |
| executed_at | timestamptz | H | | `t+1` açılışı |

## portfolio_snapshots
| Alan | Tip | Boş? | Kısıt | Açıklama |
|---|---|:-:|---|---|
| experiment_agent_id, day | uuid, date | H | PK | Günlük checkpoint |
| equity | numeric(20,2) | H | ≥ 0 | Toplam portföy değeri |
| cash | numeric(20,2) | H | ≥ 0 | |
| holdings | jsonb | H | | `{"BTC": 0.12, …}` adet cinsinden |

## memories
| Alan | Tip | Boş? | Kısıt | Açıklama |
|---|---|:-:|---|---|
| id | uuid | H | PK | |
| experiment_agent_id | uuid | H | FK | Hafıza sahibi (deney kapsamlı) |
| source_trade_id | uuid | E | FK, SET NULL | Post-mortemi tetikleyen kapanış işlemi |
| lesson | text | H | 20–2000 karakter | Kabul edilmiş ders metni |
| counterfactual | jsonb | H | | `{"actual": -3.2, "skip": 0, "half": -1.6, "stop_loss": -1.1}` (% PnL) |
| regime | market_regime | H | | Dersin öğrenildiği rejim |
| importance | numeric(3,2) | H | 0–1 | Geri çağırma ağırlığı |
| embedding | vector(1024) | H | HNSW cosine | Qwen3-Embedding-0.6B vektörü |
| lesson_tsv | tsvector | H | üretilmiş, GIN | Tam metin arama |
| created_at | timestamptz | H | | Güncellik skoru için |

## decision_memories / decision_forum_reads
| Alan | Tip | Açıklama |
|---|---|---|
| decision_id + memory_id | uuid, PK | Kararda hangi anıların kullanıldığı (F6) |
| score | numeric(6,5) | Hibrit sıralama skoru |
| decision_id + forum_message_id | uuid, PK | Kararda hangi forum mesajlarının okunduğu |
| weight | numeric(5,4) | O anki gönderen güveni `w` |

## forum_messages
| Alan | Tip | Boş? | Kısıt | Açıklama |
|---|---|:-:|---|---|
| id | uuid | H | PK | |
| experiment_id | uuid | H | FK | |
| sender_id | uuid | H | FK → experiment_agents | |
| day | date | H | | |
| content | text | H | ≤ 1000 karakter | Güvenilmeyen veri olarak işlenir (LLM01) |
| asset | text | E | FK | Tavsiyenin ilgili olduğu varlık |
| stance | forum_stance | H | | Doğrulama için yön |
| flagged | boolean | H | false | Talimat/injection kalıbı tespit edildi |
| verified | boolean | E | | Ufuk sonunda tavsiye tuttu mu; NULL = henüz değil |

## trust_scores
| Alan | Tip | Boş? | Kısıt | Açıklama |
|---|---|:-:|---|---|
| truster_id, trustee_id | uuid | H | PK, truster ≠ trustee | Güvenen → güvenilen |
| confirmed | integer | H | ≥ 0 | `a`: doğrulanan tavsiye sayısı |
| refuted | integer | H | ≥ 0 | `b`: çürüyen tavsiye sayısı |
| score | numeric(5,4) | H | üretilmiş | `(a+1)/(a+b+2)`; başlangıç 0,5 |
| updated_at | timestamptz | H | | |

## Enum değerleri

| Enum | Değerler |
|---|---|
| user_role | researcher, viewer |
| experiment_mode | replay, live |
| experiment_condition | C0 (hafızasız), C1 (kişisel hafıza), C1_NO_REGIME, C2 (düz forum), C3 (güven ağırlıklı forum) |
| experiment_status | draft, queued, running, paused, completed, failed |
| agent_kind | rule, rl, llm, external |
| market_regime | bull, bear, sideways |
| trade_side | buy, sell |
| forum_stance | bullish, bearish, neutral |
