# 4. AI Pipeline

Yeşil düğümler projenin özgün bileşenleridir: karşı-olgusal post-mortem, rejim farkındalıklı hafıza, güven tabanlı forum.

```mermaid
flowchart LR
    subgraph data[1 · Veri]
        ccxt[ccxt → Binance<br/>OHLCV 5 varlık] --> pq[(Parquet)]
        fg[Fear & Greed,<br/>funding rate] --> pq
        pq --> split{Zamansal ayrım}
        split --> tr[Eğitim<br/>2020-09 → 2025-09]
        split --> va[Doğrulama<br/>2025-10 → 2026-03]
        split --> te[Test 🔒<br/>2026-04 → 2026-09]
    end

    subgraph models[2 · Eğitilen modeller]
        tr --> hmm[HMM rejim modeli<br/>hmmlearn]
        tr --> ppo[PPO ajanı<br/>SB3 + Gymnasium]
        va --> tune[Prompt / parametre ayarı]
    end

    subgraph loop[3 · LLM karar döngüsü - her gün]
        obs[Gözlem<br/>anonim varlık adları] --> reg[Rejim etiketi]:::novel
        reg --> mem[Hafıza geri çağırma<br/>vektör + BM25 hibrit<br/>+ rejim bonusu]:::novel
        mem --> forum[Forum<br/>Beta güven ağırlığı]:::novel
        forum --> llm[Qwen3.5-9B Q4<br/>JSON şeması, düşünme kapalı]
        llm --> val{Pydantic<br/>doğrulama}
        val -- ok --> dec[Hedef ağırlıklar]
        val -- 2 başarısız --> hold[Pozisyonu koru]
    end

    subgraph learn[4 · Öğrenme]
        dec --> sim[Simülatör t+1<br/>komisyon + kayma]
        sim --> close{Pozisyon<br/>kapandı mı?}
        close -- evet --> cf[Karşı-olgusal PnL tablosu<br/>gerçek / girmemek / yarım / zarar-kes]:::novel
        cf --> pm[LLM ders yazar<br/>düşünme açık]
        pm --> chk{Sayısal iddialar<br/>tabloyla tutarlı?}:::novel
        chk -- hayır --> rej[Ders reddedilir]
        chk -- evet --> emb[Qwen3-Embedding] --> pg[(pgvector<br/>rejim etiketli)]
        pg --> mem
        sim --> trust[Tavsiye doğrulandı mı?<br/>a / b sayaçları]:::novel --> forum
    end

    subgraph eval[5 · Değerlendirme]
        te --> runs[C0–C3 × 5 seed]
        runs --> met[Sharpe · MDD · getiri<br/>sürü korelasyonu<br/>ders tutarlılık oranı]
        met --> boot[Blok bootstrap %95 GA]
    end

    reg --- hmm
    llm -. iz .-> lf[(Langfuse)]

    classDef novel fill:#d5f5e3,stroke:#1e8449,color:#145a32
```

## Look-ahead bias protokolü

1. Test dönemi (Nisan–Eylül 2026) model yayımından (2 Mart 2026) sonradır.
2. Test verisi yalnızca nihai değerlendirmede açılır; CI'da test Parquet'i okunursa hata verilir.
3. Prompt'larda varlık adları (`ASSET_A`…) ve tarihler (`gün 0…N`) anonimleştirilir.
4. Kasım–Aralık 2026 canlı paper-trading hiç görülmemiş veride ileri testtir.

## Deney koşulları (ablasyon)

| Koşul | Kişisel hafıza | Forum | Güven ağırlığı |
|---|:-:|:-:|:-:|
| C0 | — | — | — |
| C1 | ✔ | — | — |
| C1′ (rejimsiz) | ✔ (rejim bonusu yok) | — | — |
| C2 | ✔ | ✔ | eşit |
| C3 | ✔ | ✔ | Beta |
