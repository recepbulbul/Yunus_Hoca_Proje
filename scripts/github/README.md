# İsterlerin GitHub Issues'a aktarılması

[`issues.json`](issues.json) öneri formundaki 14 isteri (F1–F9, NF1–NF5), P1/P2 iş paketi görevlerini, etiketleri ve haftalık milestone'ları içerir. [`create_issues.py`](create_issues.py) bunları idempotent olarak oluşturur (aynı başlıklı issue varsa atlar), yalnızca standart kütüphane kullanır ve `gh` gerektirmez.

```bash
# Fine-grained token: Repository → Issues: Read and write
export GITHUB_TOKEN=github_pat_...         # PowerShell: $env:GITHUB_TOKEN="..."
python scripts/github/create_issues.py --repo recepbulbul/Yunus_Hoca_Proje --dry-run
python scripts/github/create_issues.py --repo recepbulbul/Yunus_Hoca_Proje
```

Ardından GitHub Projects'te bir tablo (Board) oluşturup issue'ları milestone'a göre gruplamak önerilir.
