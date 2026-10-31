# 3. Akış Diyagramları (hata dallarıyla)

Üç kritik akış: (1) deney oluşturma ve yürütme, (2) LLM ajan karar döngüsü, (3) canlı paper-trading veri akışı. Kırmızı düğümler hata dallarıdır.

## Akış 1 — Deney oluşturma ve yürütme (F2, F3, NF2)

```mermaid
flowchart TD
    A([Araştırmacı deney formunu doldurur]) --> B{JWT geçerli ve<br/>rol = researcher?}
    B -- Hayır --> E1[401 / 403<br/>giriş sayfasına yönlendir]:::err
    B -- Evet --> C{Pydantic şema<br/>doğrulaması}
    C -- Geçersiz --> E2[422 alan hataları<br/>formda gösterilir]:::err
    C -- Geçerli --> D{Dönem test penceresiyle<br/>çakışıyor mu?}
    D -- Evet, bayrak yok --> E3[Uyarı: test seti yalnızca<br/>nihai değerlendirmede açılır]:::err
    D -- Hayır --> F[(experiments: status=draft)]
    F --> G[Başlat → Redis XADD]
    G --> H[İşçi XREADGROUP ile alır]
    H --> I[Gün t: gözlem → ajan kararları → t+1 yürütme]
    I --> J{İşçi çöktü mü?}
    J -- Evet --> K[XPENDING ile iş yeniden alınır<br/>son checkpoint'ten devam]:::err
    K --> I
    J -- Hayır --> L{Son gün mü?}
    L -- Hayır --> M[Checkpoint yaz, tick yayınla] --> I
    L -- Evet --> N[Metrikleri hesapla<br/>status=completed] --> O([Rapor hazır])

    classDef err fill:#fde2e2,stroke:#c0392b,color:#7b241c
```

## Akış 2 — LLM ajan karar döngüsü (NF2, NF3)

```mermaid
flowchart TD
    A([Gün t kapanışı]) --> B[Gözlem: 30 günlük normalize getiriler,<br/>göstergeler, duyarlılık, portföy]
    B --> C[HMM ile güncel rejimi bul]
    C --> D[Hafıza: hibrit arama<br/>benzerlik + güncellik + önem + rejim bonusu]
    D --> DE{pgvector erişilebilir?}
    DE -- Hayır --> D2[Hafızasız devam,<br/>olay loglanır]:::err --> F
    DE -- Evet --> F[Forum mesajları<br/>güven w = a+1 / a+b+2 ile ağırlıklı]
    F --> G[Güvenilmeyen içerik filtresi<br/>talimat kalıpları ayıklanır]
    G --> H[Prompt oluştur, sürümü sabit]
    H --> I{Önbellekte var mı?}
    I -- Evet --> K
    I -- Hayır --> J[llama.cpp: düşünme kapalı,<br/>JSON şeması kısıtlı]
    J --> JT{Zaman aşımı<br/>> 30 sn?}
    JT -- Evet --> R
    JT -- Hayır --> K{Pydantic doğrulama<br/>ağırlık ≤ 1, long-only}
    K -- Geçerli --> L[Karar kaydedilir,<br/>Langfuse izine yazılır]
    K -- Geçersiz --> R{Deneme < 3?}
    R -- Evet --> J
    R -- Hayır --> S[Güvenli varsayılan:<br/>mevcut pozisyonu koru]:::err --> L
    L --> T([t+1 açılışında yürüt])

    classDef err fill:#fde2e2,stroke:#c0392b,color:#7b241c
```

Bu akışın doğrulama/yeniden deneme kısmı [`backend/src/mindex/domain/decision.py`](../backend/src/mindex/domain/decision.py) içinde uygulanmış ve test edilmiştir.

## Akış 3 — Canlı paper-trading veri akışı (F4, F5, NF1)

```mermaid
sequenceDiagram
    autonumber
    participant BN as Binance WS
    participant W as İşçi
    participant R as Redis
    participant API as FastAPI WS
    participant UI as Tarayıcı

    UI->>API: WSS /ws/experiments/{id} (JWT)
    API-->>UI: anlık durum (snapshot)
    BN->>W: kline / trade olayı
    W->>W: sanal portföyü değerle
    W->>R: XADD ticks (throttle 4/sn)
    R-->>API: yeni tick
    API-->>UI: tick + lider tablosu

    alt Binance bağlantısı koptu
        BN--xW: bağlantı kapandı
        loop Üstel geri çekilme 1, 2, 4 … 60 sn
            W->>BN: yeniden bağlan
        end
        W->>BN: REST ile boşluğu doldur (eksik mumlar)
        W->>R: status=reconnected
    else 5 dk boyunca bağlanamadı
        W->>R: status=degraded
        API-->>UI: "Canlı veri yok - replay moduna geçildi" uyarısı
    end

    alt Tarayıcı bağlantısı koptu
        UI--xAPI: kapandı
        UI->>API: yeniden bağlan (son seq ile)
        API-->>UI: kaçırılan tick'ler (XRANGE)
    end
```
