# Güvenlik Politikası

Mindex gerçek borsa hesaplarına bağlanmaz ve gerçek para kullanmaz. Yine de bir güvenlik açığı bulursanız lütfen herkese açık issue açmak yerine GitHub'ın **Private vulnerability reporting** özelliğini kullanın (Security → Report a vulnerability).

Kapsam ve önlemler (NF3):

- Parolalar Argon2id ile özetlenir; JWT gizli anahtarı yalnızca `.env`'dedir.
- Forum mesajları güvenilmeyen veri olarak işaretlenir ve talimat kalıpları filtrelenir (OWASP LLM01).
- MCP araçları yalnızca çağıran ajanın kendi portföyüne yetkilidir.
- CI'da Trivy (bağımlılık, sır, yapılandırma) ve gitleaks taramaları çalışır.
