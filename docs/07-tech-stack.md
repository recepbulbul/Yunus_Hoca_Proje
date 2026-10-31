# 7. Teknoloji Yığını

| Katman | Seçim | Gerekçe | Durum |
|---|---|---|---|
| LLM çıkarımı | Qwen3.5-9B (Q4_K_M, ≈5,6 GB) · llama.cpp `llama-server` (OpenAI uyumlu API) | 8 GB VRAM sınıfındaki en yüksek başarımlı açık modellerden (Apache-2.0); JSON şemasıyla kısıtlı üretim | P3 |
| Ajan çerçevesi | PydanticAI | Tip güvenli yapılandırılmış çıktı, model bağımsızlık, OpenTelemetry desteği | P6 |
| Hafıza | Qwen3-Embedding-0.6B · PostgreSQL + pgvector (HNSW) + tam metin arama | Hibrit arama; ilişkisel ve vektör veri tek veritabanında | P5 |
| Veri | ccxt · Polars · DuckDB · Parquet | Borsadan bağımsız API; hızlı kolonsal analiz, tekrarlanabilir veri anlık görüntüleri | P3 |
| RL ve rejim | Gymnasium · Stable-Baselines3 (PPO) · hmmlearn | Standart ve iyi belgelenmiş kütüphaneler | P4 |
| Backend | FastAPI · Pydantic v2 · SQLAlchemy 2 + Alembic · Redis Streams işçisi | Asenkron API, otomatik OpenAPI; uzun deneyler API'den ayrı işçide | P4 |
| Protokol | MCP sunucusu (resmî Python SDK) · A2A (esneme) | Dış ajanların standart araç arayüzüyle katılımı | P7 |
| Frontend | React 19 · TypeScript · Vite · TanStack Query · Tailwind + shadcn/ui · Lightweight Charts v5 · MSW | Prototip aynı kodla ürüne dönüşür (MSW ile sahte API); hafif finans grafikleri | **P2 ✔** |
| Gözlemlenebilirlik | OpenTelemetry · Langfuse (self-host) · structlog | Her LLM çağrısının izi, prompt sürümleme, gecikme takibi | structlog **P1 ✔** |
| Test ve kalite | pytest · Vitest + Testing Library · Playwright · k6 · Ruff · pyright · oxlint · Prettier · pre-commit | Birim/entegrasyon, uçtan uca ve WebSocket yük testi; statik analiz | **P1 ✔** (k6/Playwright P9) |
| Dağıtım ve CI | uv · Docker Compose · Caddy · Tailscale · GitHub Actions · Trivy · gitleaks · Dependabot | Kilitli bağımlılıklar, otomatik HTTPS, laptop GPU'suna güvenli tünel, imaj ve sır taraması | CI **P1 ✔** |

## Sürüm politikası

- Python bağımlılıkları `backend/uv.lock`, Node bağımlılıkları `frontend/package-lock.json` ile kilitlidir; CI `uv sync --locked` ve `npm ci` kullanır.
- Dependabot haftalık gruplu güncelleme PR'ı açar; CI geçmeden birleştirilmez.
- LLM model dosyası SHA-256 ile, prompt'lar `prompt_version` ile sabitlenir ve her deney kaydına yazılır.
