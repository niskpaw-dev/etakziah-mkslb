# e-Takziah MKSLB · Backend GAS

Sheet: **e-Takziah MKSLB · Hebahan** (tab `Hebahan`).
Bot: **Bot Biro Khairat MKSLB** (@bkmkslbbot).

---

## Naik taraf ke v2 (Bot Telegram) · ±10 minit

Lakukan dari komputer atau tablet (editor Apps Script lebih selesa di skrin besar).

### 1. Ganti kod
Sheet → **Extensions → Apps Script** → padam semua kod dalam `Code.gs` → tampal `Code.gs` v2 → **Save**.

### 2. Simpan token bot (jangan paste dalam chat)
Ikon gear **Project Settings** (kiri) → turun ke **Script properties** → **Add script property**:
- Property: `TG_TOKEN`
- Value: token dari @BotFather (butang **Copy** dalam BotFather)

Tekan **Save script properties**. `TAKZIAH_TOKEN` yang sedia ada jangan diusik.

### 3. Deploy versi baru (URL kekal sama)
**Deploy → Manage deployments** → ikon ✏️ → **Version: New version** → **Deploy**.
Jangan pilih "New deployment", itu akan menukar URL.

### 4. Sambung bot
Kembali ke editor → pilih fungsi **`setupTelegram`** → **Run**.
Google akan minta kebenaran baru (sambungan luar & trigger) → **Allow**.

Buka **Execution log**. Anda akan nampak:
```
KOD PASANGAN: 123456
→ Dalam chat peribadi dengan bot, hantar:  /daftar 123456
→ Dalam group rasmi, hantar:  /sambung 123456
```

### 5. Daftar di Telegram
1. Chat peribadi dengan **@bkmkslbbot** → hantar `/daftar 123456`
   Bot balas: *✓ Akaun ini kini pelulus hebahan…*
2. Dalam **group rasmi masjid** → hantar `/sambung 123456`
   Mesej itu dipadam sendiri oleh bot, dan anda terima pengesahan secara peribadi.

Kod pasangan dibuang sebaik kedua-duanya selesai, jadi orang lain tidak boleh guna kod yang sama.

**Pastikan bot ialah admin group** dengan kebenaran: *Send Messages*, *Delete Messages*, *Pin Messages*.

### 6. Uji
1. Jana satu hebahan ujian dalam e-Takziah dan tekan 🚀.
2. Bot hantar pratonton kepada anda → tekan **✅ Terbit ke Group** → semak group.
3. Dalam Sheet, tukar status hebahan ujian kepada **PADAM** → bot tanya → **🗑️ Padam dari Group**.

---

## Cara kerja harian

| Berlaku | Bot buat |
|---|---|
| Admin tekan 🚀 dalam e-Takziah | Hantar pratonton kepada anda dengan **✅ Terbit ke Group** / **✖️ Abaikan** |
| Anda tekan ✅ | Post ke group + pin. Pratonton bertukar *✅ Diterbitkan* |
| Hebahan dibetulkan (admin atau anda) | Pratonton baru dengan **✅ Kemas kini post di Group** → post asal diedit, tiada post kedua |
| Status ditukar **PADAM** dalam Sheet | Tanya sama ada padam post dari group |
| Tamat tempoh (3 hari) | Status jadi ARKIB, post di-unpin (kekal dalam sejarah group) |

- Hanya akaun anda boleh guna butang. Orang lain yang tekan akan ditolak.
- Telegram hanya benarkan bot memadam post dalam **48 jam**. Selepas itu bot akan minta anda padam secara manual.
- Laman web kini terus dikemas kini bila status diubah dalam Sheet (tidak perlu tunggu 30 saat).
- `/status` dalam chat peribadi dengan bot: semak keadaan sambungan.

## Status rekod

| Status | Maksud |
|---|---|
| `TERBIT` | Dipapar di laman web sehingga **Tamat Tempoh** (hari urus + 2 hari) |
| `ARKIB` | Tamat tempoh. Diset automatik setiap hari 1:00 pagi |
| `PADAM` | Disembunyikan serta-merta |

Kolum **TG Msg ID** dan **TG Status** diurus oleh bot. Jangan ubah secara manual.

## Fungsi penyelenggaraan

| Fungsi | Bila guna |
|---|---|
| `tukarToken` | Kod Admin e-Takziah bocor atau telefon hilang. Kemas kini Kod Admin di setiap telefon selepas itu |
| `resetTelegram` → `setupTelegram` | Tukar akaun pelulus atau group |
| `kosongkanCache` | Paksa laman web baca semula Sheet |

Token bot bocor? Dalam @BotFather tekan **Revoke**, salin token baru ke Script property `TG_TOKEN`, kemudian jalankan `setupTelegram` semula.

## Jika ubah kod kemudian
**Deploy → Manage deployments → ✏️ → Version: New version → Deploy.**
