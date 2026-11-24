# e-Takziah MKSLB · Backend GAS

Sheet: **e-Takziah MKSLB · Hebahan** (tab `Hebahan`).
Bot: **Bot Biro Khairat MKSLB** (@bkmkslbbot).

---

## Naik taraf ke v3 (Page Facebook) · ±15 minit

Lakukan dari komputer. Butang ✅ yang sama akan post ke Group **dan** Page FB.

### 1. Dapatkan token Page (tiada tarikh luput)
Guna app Meta **Imarah MKSLB** yang sama dengan Bot Imarah. Token lama Bot Imarah **kekal sah**.

1. Buka **developers.facebook.com/tools/explorer**
2. **Meta App:** Imarah MKSLB → **Add a Permission:** `pages_show_list`, `pages_read_engagement`, `pages_manage_posts` → **Generate Access Token** → Continue
3. Tekan ikon **ⓘ** di sebelah token → **Open in Access Token Tool** → **Extend Access Token** → salin token panjang (long-lived)
4. Kembali ke Explorer → tampal token panjang itu dalam kotak **Access Token** → laluan `me/accounts` → **Submit**
5. Cari Page masjid dalam keputusan. Anda perlukan dua nilai: `id` dan `access_token`

### 2. Simpan dalam Script properties (jangan paste dalam chat)
**Project Settings** → **Script properties** → **Add script property**:
- `FB_PAGE_ID` = nilai `id` Page
- `FB_TOKEN` = nilai `access_token` Page

**Save script properties**. Property lain jangan diusik.

### 3. Ganti kod & deploy
Tampal `Code.gs` v3 → **Save** → **Deploy → Manage deployments → ✏️ → New version → Deploy**.

### 4. Semak sambungan
Pilih fungsi **`setupFacebook`** → **Run**. Log yang betul:
```
Page FB: Masjid Kampung Sungai Lang Baru
Token: tiada tarikh luput ✅ · Izin posting: ✅
Kolum R "FB Post ID": sedia
```
Fungsi ini tidak membuat sebarang posting. Ia juga menambah kolum **R · FB Post ID** dalam Sheet.

### 5. Uji tanpa jemaah nampak
Pilih fungsi **`ujiFacebook`** → **Run**. Ia cipta post **tidak diterbitkan**, edit, kemudian padam:
```
1. Cipta post (tersembunyi): ✅
2. Edit post: ✅
3. Padam post: ✅
Page FB sedia.
```
Dalam chat peribadi dengan bot, `/status` kini tunjuk **Page FB: ✓ disambung**.

### Bila token perlu diperbaharui (25 Jan 2027)
Ulang langkah 1, kemudian kemas kini **dua tempat**:
1. GitHub Secrets `FB_TOKEN` (Bot Imarah)
2. Script property `FB_TOKEN` di sini, kemudian jalankan `setupFacebook` untuk semak

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
| Admin tekan 🚀 dalam e-Takziah | Hantar pratonton kepada anda dengan **✅ Terbit ke Group & FB** / **✖️ Abaikan** |
| Anda tekan ✅ | Post ke group + pin, dan post ke Page FB. Pratonton bertukar *✅ DITERBITKAN · Group ✅ · FB ✅* |
| Hebahan dibetulkan (admin atau anda) | Pratonton baru dengan **✅ Kemas kini post Group & FB** → kedua-dua post asal diedit, tiada post kedua |
| FB gagal (token / rangkaian) | Group tetap dipost. Pratonton tunjuk *FB ❌* + sebab + butang **🔁 Cuba semula FB** |
| Status ditukar **PADAM** dalam Sheet | Tanya sama ada padam post dari Group & FB |
| Tamat tempoh (3 hari) | Status jadi ARKIB, post group di-unpin. Post FB kekal |

- Hanya akaun anda boleh guna butang. Orang lain yang tekan akan ditolak.
- Telegram hanya benarkan bot memadam post dalam **48 jam**. Selepas itu bot akan minta anda padam secara manual. Post FB tiada had masa.
- Jika `FB_TOKEN` dibuang dari Script properties, bot kembali post ke group sahaja.
- Laman web kini terus dikemas kini bila status diubah dalam Sheet (tidak perlu tunggu 30 saat).
- `/status` dalam chat peribadi dengan bot: semak keadaan sambungan.

## Status rekod

| Status | Maksud |
|---|---|
| `TERBIT` | Dipapar di laman web sehingga **Tamat Tempoh** (hari urus + 2 hari) |
| `ARKIB` | Tamat tempoh. Diset automatik setiap hari 1:00 pagi |
| `PADAM` | Disembunyikan serta-merta |

Kolum **TG Msg ID**, **TG Status** dan **FB Post ID** diurus oleh bot. Jangan ubah secara manual.

## Fungsi penyelenggaraan

| Fungsi | Bila guna |
|---|---|
| `tukarToken` | Kod Admin e-Takziah bocor atau telefon hilang. Kemas kini Kod Admin di setiap telefon selepas itu |
| `resetTelegram` → `setupTelegram` | Tukar akaun pelulus atau group |
| `kosongkanCache` | Paksa laman web baca semula Sheet |
| `setupFacebook` | Semak token Page FB (selepas tukar token) |
| `ujiFacebook` | Uji post/edit/padam FB secara tersembunyi |

Token bot bocor? Dalam @BotFather tekan **Revoke**, salin token baru ke Script property `TG_TOKEN`, kemudian jalankan `setupTelegram` semula.

## Jika ubah kod kemudian
**Deploy → Manage deployments → ✏️ → Version: New version → Deploy.**
