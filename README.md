# Mindex — Birlikte Öğrenen Kripto Ticaret Ajanları

[![CI](https://github.com/recepbulbul/Yunus_Hoca_Proje/actions/workflows/ci.yml/badge.svg)](https://github.com/recepbulbul/Yunus_Hoca_Proje/actions/workflows/ci.yml)
[![Prototip](https://img.shields.io/badge/prototip-GitHub%20Pages-2ea44f)](https://recepbulbul.github.io/Yunus_Hoca_Proje/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Kural tabanlı, pekiştirmeli öğrenme (PPO) ve LLM tabanlı ticaret ajanlarının aynı kripto piyasasında yarıştığı, **kalıcı hafızaya** sahip olduğu ve öğrendiklerini **güven ağırlıklı bir forumda** paylaştığı simülasyon arenası. LLM ajanları 8 GB VRAM'li bir dizüstünde yerel çalışan 4-bit Qwen3.5-9B ile karar verir. Gerçek para kullanılmaz.

> Yapay Zeka ve Veri Mühendisliği Tasarımı dersi projesi — Recep Bülbül (230291001), Meryem Arpacı (230291012)

**Araştırma sorusu:** Kalıcı hafıza ve paylaşım, LLM ajanlarının riske göre düzeltilmiş getirisini artırır mı, yoksa sürü davranışına mı yol açar? (C0 hafızasız · C1 kişisel hafıza · C2 düz forum · C3 güven ağırlıklı forum)

## Canlı prototip

**https://recepbulbul.github.io/Yunus_Hoca_Proje/** — sahte (MSW) API ile çalışan 6 ekran: giriş, deney kurma, canlı borsa, ajan detayı, forum & hafıza, rapor.

Demo hesapları giriş ekranında tek tıkla doldurulur (`arastirmaci@mindex.dev` / `izleyici@mindex.dev`).

## Depo yapısı

```
backend/     Python 3.12 paketi (uv) — domain mantığı, ileride FastAPI + işçi
frontend/    React 19 + TypeScript + Vite prototipi (MSW sahte API)
docs/        Use case, mimari, akış, AI pipeline, ER, veri sözlüğü, teknoloji yığını
scripts/     İsterlerin GitHub Issues'a aktarılması
.github/     CI (lint, tip, test, Trivy, gitleaks), Pages dağıtımı, şablonlar
```

## Hızlı başlangıç

Gereksinimler: Python 3.12, [uv](https://docs.astral.sh/uv/), Node 24.

```bash
# Backend
cd backend
uv sync
uv run pytest

# Frontend (sahte API ile)
cd frontend
npm ci
npm run dev        # http://localhost:5173

# Git kancaları
cd backend && uv run pre-commit install
```

## Dokümantasyon

| Hafta | Doküman |
|---|---|
| 1 | [Use case modeli](docs/01-use-cases.md) · [Sistem mimarisi](docs/02-architecture.md) · [Akış diyagramları](docs/03-flows.md) · [AI pipeline](docs/04-ai-pipeline.md) |
| 2 | [ER diyagramı](docs/05-er-diagram.md) · [Şema (SQL)](docs/db/schema.sql) · [Veri sözlüğü](docs/06-data-dictionary.md) · [Teknoloji yığını](docs/07-tech-stack.md) |

İsterler (F1–F9, NF1–NF5) GitHub Issues'ta milestone'lara bağlı olarak takip edilir; bkz. [`scripts/github`](scripts/github/README.md).

## İş planı durumu

| Paket | Hafta | Durum |
|---|---|---|
| P1 Analiz, diyagramlar, isterler, repo iskeleti (uv, pre-commit, CI) | 1 | ✅ |
| P2 Tıklanabilir prototip (6 ekran, GitHub Pages), ER, şema, veri sözlüğü, teknoloji yığını | 2 | ✅ |
| P3 ccxt veri hattı, EDA, simülatör çekirdeği, baseline ajanlar | 3 | ⏳ |

## Lisans

[MIT](LICENSE)
