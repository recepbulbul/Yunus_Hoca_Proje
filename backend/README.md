# mindex (backend)

Python 3.12 paketi. Bağımlılıklar [uv](https://docs.astral.sh/uv/) ile kilitlenir (`uv.lock`).

```bash
uv sync                 # .venv oluşturur, kilitli bağımlılıkları kurar
uv run pytest           # testler + kapsam (>= %70)
uv run ruff check .     # lint
uv run ruff format .    # biçimlendirme
uv run pyright          # strict tip kontrolü
```

## Modüller (Hafta 1 iskeleti)

| Modül | İçerik |
|---|---|
| `mindex.config` | `.env` / ortam değişkenlerinden tipli ayarlar (`MINDEX_` öneki) |
| `mindex.logging_config` | structlog JSON log yapılandırması (NF4) |
| `mindex.domain.decision` | LLM ajan kararı JSON sözleşmesi ve doğrulaması (NF2) |
| `mindex.domain.trust` | Beta itibar skoru `w = (a+1)/(a+b+2)` |
| `mindex.domain.metrics` | Sharpe, maksimum düşüş, sürü korelasyonu |

Sonraki haftalarda: `mindex.data` (ccxt hattı), `mindex.sim` (simülatör), `mindex.agents`, `mindex.api` (FastAPI), `mindex.mcp`.
