/**
 * e-Takziah MKSLB · Backend Hebahan  (v2 · dengan Bot Biro Khairat MKSLB)
 * ------------------------------------------------------------
 *   e-Takziah ──POST──► GAS (doPost) ──► Sheet "Hebahan"
 *                              └──► Telegram: pratonton kepada Adib
 *                                     [✅ Terbit ke Group] → post ke group rasmi
 *   masjidkslb.com ──GET──► GAS (doGet) ──► hebahan aktif sahaja
 *
 * Status rekod (kolum C):
 *   TERBIT → dipapar di laman web sehingga Tamat Tempoh
 *   ARKIB  → tamat tempoh (diset automatik oleh trigger harian)
 *   PADAM  → disembunyikan serta-merta (tukar manual dalam Sheet)
 *
 * Persediaan: lihat README.md yang disertakan.
 */

// ===== KONFIGURASI =====
const CONFIG = {
  SHEET_ID: '17hpnEN5JljLW0RU4H_hTe3a3ayNUv_HBjlfozFRBM08',
  SHEET_NAME: 'Hebahan',
  WEBAPP_URL: 'https://script.google.com/macros/s/AKfycbzo11cX9IMulAFMP2k4vsOpz6T9KnTRf_AiH5CrZ8o9fSILn_Sdo0oMF622CEv7bSj_/exec',
  TZ: 'Asia/Kuala_Lumpur',
  TEMPOH_HARI: 3,          // hari dipapar, termasuk hari pengurusan
  CACHE_SAAT: 30,          // cache bacaan awam (jimat kuota)
  CACHE_KEY: 'hebahan_aktif_v1',
  PROP_TOKEN: 'TAKZIAH_TOKEN',
  MAX_TEKS: 5000,
  // Telegram
  TG_PIN: true             // pin hebahan dalam group; unpin bila diarkib
};

// Script Properties untuk Telegram
const P = {
  TG_TOKEN: 'TG_TOKEN',          // token bot dari @BotFather (isi sendiri dalam Project Settings)
  TG_SECRET: 'TG_SECRET',        // rahsia laluan webhook (dijana automatik)
  TG_PAIR: 'TG_PAIR',            // kod pasangan sementara untuk /daftar dan /sambung
  TG_ADMIN: 'TG_ADMIN_CHAT',     // chat id Adib (pelulus)
  TG_GROUP: 'TG_GROUP_CHAT'      // chat id group rasmi
};

// Susunan kolum dalam Sheet (A → Q). Jangan ubah tanpa ubah Sheet.
const COL = {
  ID: 0, DICIPTA: 1, STATUS: 2, JANTINA: 3, NAMA: 4, UMUR: 5,
  TRK_MATI: 6, ALAMAT: 7, TRK_URUS: 8, TAMAT: 9, JADUAL: 10,
  TAHLIL: 11, TEL: 12, HUBUNGAN: 13, TEKS: 14,
  TG_MSG: 15, TG_STATUS: 16
};
const BIL_KOLUM = 15;   // kolum yang ditulis oleh e-Takziah (A → O). P & Q diurus oleh bot.

// ============================================================
// POST — e-Takziah ATAU webhook Telegram
// ============================================================
function doPost(e) {
  // Webhook Telegram dikenal pasti melalui ?tg=<rahsia>
  if (e && e.parameter && e.parameter.tg !== undefined) {
    try { tgWebhook_(e); } catch (err) { console.error('tgWebhook', err); }
    // Balas terus 200 (HtmlService tidak redirect) supaya Telegram tidak cuba semula
    return HtmlService.createHtmlOutput('ok');
  }

  let body;
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return jsonOut_({ ok: false, ralat: 'JSON tidak sah' });
  }

  // 1. Token
  const tokenSah = PropertiesService.getScriptProperties().getProperty(CONFIG.PROP_TOKEN);
  if (!tokenSah || body.token !== tokenSah) {
    return jsonOut_({ ok: false, ralat: 'Tidak dibenarkan' });
  }

  // 2. Tindakan padam (pilihan)
  if (body.tindakan === 'padam') {
    const r = tukarStatus_(String(body.id || ''), 'PADAM');
    if (r.ok) tgCuba_(() => tgTanyaPadam_(r.id));
    return jsonOut_(r);
  }

  // 3. Validasi
  const h = body.hebahan || {};
  const nama = bersih_(h.nama, 150);
  const trkMati = tarikhSah_(h.tarikhMeninggal);
  const trkUrus = tarikhSah_(h.tarikhUrus);
  const id = idSah_(body.id);
  if (!nama || !trkMati || !trkUrus || !id) {
    return jsonOut_({ ok: false, ralat: 'Maklumat wajib tidak lengkap' });
  }

  const baris = [];
  baris[COL.ID] = id;
  baris[COL.DICIPTA] = sekarang_();
  baris[COL.STATUS] = 'TERBIT';
  baris[COL.JANTINA] = h.jantina === 'p' ? 'P' : 'L';
  baris[COL.NAMA] = nama;
  baris[COL.UMUR] = umurSah_(h.umur);
  baris[COL.TRK_MATI] = trkMati;
  baris[COL.ALAMAT] = bersih_(h.alamat, 300);
  baris[COL.TRK_URUS] = trkUrus;
  baris[COL.TAMAT] = tambahHari_(trkUrus, CONFIG.TEMPOH_HARI - 1);
  baris[COL.JADUAL] = JSON.stringify(jadualSah_(h.jadual));
  baris[COL.TAHLIL] = bersih_(h.tahlil, 200);
  baris[COL.TEL] = bersih_(h.telWaris, 30);
  baris[COL.HUBUNGAN] = bersih_(h.hubungan, 60);
  baris[COL.TEKS] = bersih_(h.teks, CONFIG.MAX_TEKS);

  // 4. Tulis (kemas kini jika ID sama, jika tidak tambah baru)
  let tindakan, sudahDiGroup = false;
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = sheet_();
    const idx = cariBaris_(sh, id);
    if (idx > 0) {
      // Kekalkan masa asal dicipta; status kembali TERBIT
      baris[COL.DICIPTA] = sh.getRange(idx, COL.DICIPTA + 1).getValue() || baris[COL.DICIPTA];
      sh.getRange(idx, 1, 1, BIL_KOLUM).setValues([baris]);
      sudahDiGroup = !!teks_(sh.getRange(idx, COL.TG_MSG + 1).getValue());
      tindakan = 'kemaskini';
    } else {
      sh.appendRow(baris);
      tindakan = 'baru';
    }
    CacheService.getScriptCache().remove(CONFIG.CACHE_KEY);
  } finally {
    lock.releaseLock();
  }

  // 5. Pratonton kepada Adib (gagal Telegram tidak menjejaskan e-Takziah)
  tgCuba_(() => tgPratonton_(id, baris[COL.TEKS], tindakan, sudahDiGroup));

  return jsonOut_({ ok: true, id: id, tindakan: tindakan, tamat: baris[COL.TAMAT] });
}

// ============================================================
// GET — senarai hebahan aktif untuk landing page (awam)
// ============================================================
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'senarai';
  if (action === 'ping') return jsonOut_({ ok: true, masa: sekarang_() });

  const cache = CacheService.getScriptCache();
  const simpan = cache.get(CONFIG.CACHE_KEY);
  if (simpan) return ContentService.createTextOutput(simpan).setMimeType(ContentService.MimeType.JSON);

  const hariIni = hariIni_();
  const data = sheet_().getDataRange().getValues().slice(1);
  const aktif = data
    .filter(r => String(r[COL.STATUS]).trim() === 'TERBIT' && teks_(r[COL.TAMAT]) >= hariIni)
    .map(r => ({
      id: teks_(r[COL.ID]),
      jantina: teks_(r[COL.JANTINA]),
      gelaran: teks_(r[COL.JANTINA]) === 'P' ? 'ALLAHYARHAMAH' : 'ALLAHYARHAM',
      nama: teks_(r[COL.NAMA]),
      umur: r[COL.UMUR] === '' ? null : Number(r[COL.UMUR]),
      tarikhMeninggal: teks_(r[COL.TRK_MATI]),
      alamat: teks_(r[COL.ALAMAT]),
      tarikhUrus: teks_(r[COL.TRK_URUS]),
      tamat: teks_(r[COL.TAMAT]),
      jadual: parseJadual_(r[COL.JADUAL]),
      tahlil: teks_(r[COL.TAHLIL]),
      telWaris: teks_(r[COL.TEL]),
      hubungan: teks_(r[COL.HUBUNGAN]),
      dicipta: masa_(r[COL.DICIPTA])
    }))
    .sort((a, b) => (a.dicipta < b.dicipta ? 1 : -1));

  const json = JSON.stringify({ ok: true, hebahan: aktif });
  cache.put(CONFIG.CACHE_KEY, json, CONFIG.CACHE_SAAT);
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// TRIGGER HARIAN — tukar TERBIT → ARKIB bila tamat tempoh
// ============================================================
function arkibLuput() {
  const sh = sheet_();
  const hariIni = hariIni_();
  const n = sh.getLastRow() - 1;
  if (n < 1) return 0;
  const data = sh.getRange(2, 1, n, COL.TG_STATUS + 1).getValues();
  const status = data.map(r => [r[COL.STATUS]]);
  const unpin = [];
  let bil = 0;
  for (let i = 0; i < n; i++) {
    if (String(status[i][0]).trim() === 'TERBIT' && teks_(data[i][COL.TAMAT]) < hariIni) {
      status[i][0] = 'ARKIB';
      bil++;
      if (teks_(data[i][COL.TG_MSG])) unpin.push(teks_(data[i][COL.TG_MSG]));
    }
  }
  if (bil) {
    sh.getRange(2, COL.STATUS + 1, n, 1).setValues(status);
    CacheService.getScriptCache().remove(CONFIG.CACHE_KEY);
  }
  if (CONFIG.TG_PIN) unpin.forEach(m => tgCuba_(() => tgApi_('unpinChatMessage', { chat_id: prop_(P.TG_GROUP), message_id: Number(m) })));
  return bil;
}

// ============================================================
// TRIGGER BILA SHEET DIEDIT — kesan PADAM manual & segarkan laman web
// ============================================================
function bilaSheetDiedit(e) {
  if (!e || !e.range) return;
  const sh = e.range.getSheet();
  if (sh.getName() !== CONFIG.SHEET_NAME) return;
  CacheService.getScriptCache().remove(CONFIG.CACHE_KEY);   // laman web terus nampak perubahan
  if (e.range.getColumn() !== COL.STATUS + 1 || e.range.getNumColumns() !== 1) return;
  const r0 = e.range.getRow(), nr = e.range.getNumRows();
  for (let r = Math.max(r0, 2); r < r0 + nr; r++) {
    if (String(sh.getRange(r, COL.STATUS + 1).getValue()).trim() !== 'PADAM') continue;
    const id = teks_(sh.getRange(r, COL.ID + 1).getValue());
    if (id && teks_(sh.getRange(r, COL.TG_MSG + 1).getValue())) tgCuba_(() => tgTanyaPadam_(id));
  }
}

// ============================================================
// PERSEDIAAN — jalankan dari editor Apps Script
// ============================================================
function setup() {
  const props = PropertiesService.getScriptProperties();
  let token = props.getProperty(CONFIG.PROP_TOKEN);
  if (!token) {
    token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 16);
    props.setProperty(CONFIG.PROP_TOKEN, token);
  }
  const ada = ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'arkibLuput');
  if (!ada) {
    ScriptApp.newTrigger('arkibLuput').timeBased().atHour(1).everyDays(1).inTimezone(CONFIG.TZ).create();
  }
  sheet_();
  Logger.log('TOKEN (salin ke e-Takziah, simpan rahsia): ' + token);
  Logger.log('Trigger arkibLuput: ' + (ada ? 'sudah wujud' : 'dipasang (01:00 setiap hari)'));
  return token;
}

/**
 * Sambungkan Bot Telegram. Jalankan SELEPAS:
 *   1. Isi Script Property TG_TOKEN (token dari @BotFather)
 *   2. Deploy versi baru web app
 */
function setupTelegram() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty(P.TG_TOKEN)) {
    throw new Error('TG_TOKEN belum diisi. Project Settings → Script properties → Add: TG_TOKEN = token bot.');
  }
  let secret = props.getProperty(P.TG_SECRET);
  if (!secret) { secret = Utilities.getUuid().replace(/-/g, ''); props.setProperty(P.TG_SECRET, secret); }

  const me = tgApi_('getMe', {});
  const hook = tgApi_('setWebhook', {
    url: CONFIG.WEBAPP_URL + '?tg=' + secret,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: true
  });

  const ada = ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'bilaSheetDiedit');
  if (!ada) ScriptApp.newTrigger('bilaSheetDiedit').forSpreadsheet(CONFIG.SHEET_ID).onEdit().create();

  const perlu = [];
  if (!props.getProperty(P.TG_ADMIN)) perlu.push('admin');
  if (!props.getProperty(P.TG_GROUP)) perlu.push('group');
  let kod = '';
  if (perlu.length) {
    kod = String(Math.floor(100000 + Math.random() * 900000));
    props.setProperty(P.TG_PAIR, kod);
  }

  Logger.log('Bot: @' + (me.result && me.result.username) + ' · webhook: ' + (hook.ok ? 'OK' : JSON.stringify(hook)));
  Logger.log('Trigger bilaSheetDiedit: ' + (ada ? 'sudah wujud' : 'dipasang'));
  if (kod) {
    Logger.log('KOD PASANGAN: ' + kod);
    if (perlu.indexOf('admin') >= 0) Logger.log('→ Dalam chat peribadi dengan bot, hantar:  /daftar ' + kod);
    if (perlu.indexOf('group') >= 0) Logger.log('→ Dalam group rasmi, hantar:  /sambung ' + kod);
  } else {
    Logger.log('Admin & group sudah disambung. Tiada kod diperlukan.');
  }
}

// Tukar token e-Takziah jika bocor. Lepas jalankan, kemas kini Kod Admin di setiap telefon.
function tukarToken() {
  PropertiesService.getScriptProperties().deleteProperty(CONFIG.PROP_TOKEN);
  return setup();
}

// Putuskan sambungan admin/group Telegram (untuk tukar akaun atau group). Kemudian jalankan setupTelegram.
function resetTelegram() {
  const props = PropertiesService.getScriptProperties();
  [P.TG_ADMIN, P.TG_GROUP, P.TG_PAIR].forEach(k => props.deleteProperty(k));
  Logger.log('Sambungan Telegram dikosongkan. Jalankan setupTelegram untuk kod pasangan baru.');
}

function kosongkanCache() {
  CacheService.getScriptCache().remove(CONFIG.CACHE_KEY);
}

// ============================================================
// TELEGRAM
// ============================================================
function tgWebhook_(e) {
  const secret = prop_(P.TG_SECRET);
  if (!secret || e.parameter.tg !== secret) return;   // bukan dari Telegram kita
  const u = JSON.parse((e.postData && e.postData.contents) || '{}');

  // Elak proses berganda jika Telegram hantar semula update yang sama
  const cache = CacheService.getScriptCache();
  const k = 'tgu_' + u.update_id;
  if (u.update_id != null) {
    if (cache.get(k)) return;
    cache.put(k, '1', 21600);
  }

  if (u.callback_query) return tgButang_(u.callback_query);
  if (u.message) return tgMesej_(u.message);
}

function tgMesej_(m) {
  const teks = String(m.text || '').trim();
  const arahan = teks.split(/\s+/)[0].split('@')[0].toLowerCase();
  const arg = teks.split(/\s+/)[1] || '';
  const props = PropertiesService.getScriptProperties();
  const kod = props.getProperty(P.TG_PAIR);
  const peribadi = m.chat && m.chat.type === 'private';

  if (peribadi && arahan === '/daftar') {
    if (kod && arg === kod) {
      props.setProperty(P.TG_ADMIN, String(m.chat.id));
      tgHantar_(m.chat.id, '✓ Akaun ini kini pelulus hebahan Biro Khairat MKSLB.' +
        (props.getProperty(P.TG_GROUP) ? '' : '\n\nSeterusnya, hantar /sambung ' + kod + ' dalam group rasmi.'));
      tamatPasangan_();
    }
    return;
  }

  if (!peribadi && arahan === '/sambung') {
    if (kod && arg === kod) {
      props.setProperty(P.TG_GROUP, String(m.chat.id));
      tgCuba_(() => tgApi_('deleteMessage', { chat_id: m.chat.id, message_id: m.message_id }));
      const adm = props.getProperty(P.TG_ADMIN);
      if (adm) tgHantar_(adm, '✓ Group "' + (m.chat.title || m.chat.id) + '" disambung. Hebahan yang anda luluskan akan dipost di sana.');
      tamatPasangan_();
    }
    return;
  }

  if (peribadi && arahan === '/status' && String(m.chat.id) === props.getProperty(P.TG_ADMIN)) {
    tgHantar_(m.chat.id, 'Status Bot Biro Khairat MKSLB\n• Pelulus: ✓ akaun ini\n• Group: ' + (props.getProperty(P.TG_GROUP) ? '✓ disambung' : '✗ belum') +
      '\n• Pin hebahan: ' + (CONFIG.TG_PIN ? 'ya' : 'tidak'));
    return;
  }

  if (peribadi && arahan === '/start') {
    tgHantar_(m.chat.id, 'Assalamualaikum. Ini bot rasmi Biro Khairat Masjid Kampung Sungai Lang Baru untuk hebahan kematian.\n\nHebahan terkini: https://masjidkslb.com/#takziah');
  }
}

// Kod pasangan dibuang sebaik admin & group kedua-duanya disambung
function tamatPasangan_() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty(P.TG_ADMIN) && props.getProperty(P.TG_GROUP)) props.deleteProperty(P.TG_PAIR);
}

function tgButang_(q) {
  const admin = prop_(P.TG_ADMIN);
  if (!admin || String(q.from && q.from.id) !== admin) {
    tgApi_('answerCallbackQuery', { callback_query_id: q.id, text: 'Hanya pelulus boleh menggunakan butang ini.', show_alert: true });
    return;
  }
  const [aksi, id] = String(q.data || '').split('|');
  const msg = q.message || {};
  const jawab = (t, alert) => tgApi_('answerCallbackQuery', { callback_query_id: q.id, text: t, show_alert: !!alert });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = sheet_();
    const idx = cariBaris_(sh, idSah_(id));
    if (idx < 0) { jawab('Hebahan tidak dijumpai dalam Sheet.', true); return; }
    const row = sh.getRange(idx, 1, 1, COL.TG_STATUS + 1).getValues()[0];
    const status = String(row[COL.STATUS]).trim();
    const teks = teks_(row[COL.TEKS]);
    const msgId = teks_(row[COL.TG_MSG]);

    if (aksi === 't') {
      if (status !== 'TERBIT') { jawab('Hebahan ini berstatus ' + status + '. Tidak diterbit.', true); return; }
      const group = prop_(P.TG_GROUP);
      if (!group) { jawab('Group belum disambung. Jalankan setupTelegram dan /sambung.', true); return; }

      let baru = false, mid = msgId;
      if (mid) {
        const r = tgApi_('editMessageText', { chat_id: group, message_id: Number(mid), text: teks, disable_web_page_preview: true });
        const tiadaUbah = !r.ok && /not modified/i.test(r.description || '');
        if (!r.ok && !tiadaUbah) mid = '';   // post asal sudah dipadam manual → hantar baru
      }
      if (!mid) {
        const r = tgApi_('sendMessage', { chat_id: group, text: teks, disable_web_page_preview: true });
        if (!r.ok) { jawab('Gagal post ke group: ' + (r.description || 'ralat'), true); return; }
        mid = String(r.result.message_id);
        baru = true;
        if (CONFIG.TG_PIN) tgCuba_(() => tgApi_('pinChatMessage', { chat_id: group, message_id: Number(mid), disable_notification: true }));
      }
      sh.getRange(idx, COL.TG_MSG + 1, 1, 2).setValues([[mid, (baru ? 'DIPOST ' : 'DIKEMASKINI ') + sekarang_()]]);
      tgTutupPratonton_(msg, (baru ? '✅ DITERBITKAN KE GROUP · ' : '✅ POST DI GROUP DIKEMAS KINI · ') + jamKini_(), teks);
      jawab(baru ? 'Diterbitkan ke group.' : 'Post di group dikemas kini.');
      return;
    }

    if (aksi === 'x') {
      tgTutupPratonton_(msg, '✖️ DIABAIKAN · ' + jamKini_(), teks);
      jawab('Diabaikan.');
      return;
    }

    if (aksi === 'd') {
      const group = prop_(P.TG_GROUP);
      if (msgId && group) {
        if (CONFIG.TG_PIN) tgCuba_(() => tgApi_('unpinChatMessage', { chat_id: group, message_id: Number(msgId) }));
        const r = tgApi_('deleteMessage', { chat_id: group, message_id: Number(msgId) });
        if (!r.ok) {
          tgTutupPratonton_(msg, '⚠️ Tidak dapat dipadam oleh bot (Telegram hadkan 48 jam). Sila padam post itu secara manual dalam group.', '');
          jawab('Sila padam secara manual.', true);
          return;
        }
        sh.getRange(idx, COL.TG_MSG + 1, 1, 2).setValues([['', 'DIPADAM ' + sekarang_()]]);
      }
      tgTutupPratonton_(msg, '🗑️ POST DIPADAM DARI GROUP · ' + jamKini_(), '');
      jawab('Post dipadam dari group.');
      return;
    }

    if (aksi === 'k') {
      tgTutupPratonton_(msg, '✓ Post di group dibiarkan.', '');
      jawab('Dibiarkan.');
    }
  } finally {
    lock.releaseLock();
  }
}

function tgPratonton_(id, teks, tindakan, sudahDiGroup) {
  const admin = prop_(P.TG_ADMIN);
  if (!admin || !prop_(P.TG_TOKEN)) return;
  const kepala = tindakan === 'baru'
    ? '🆕 HEBAHAN BARU · menunggu kelulusan anda'
    : '✏️ HEBAHAN DIKEMAS KINI · menunggu kelulusan anda';
  const butangUtama = sudahDiGroup ? '✅ Kemas kini post di Group' : '✅ Terbit ke Group';
  tgApi_('sendMessage', {
    chat_id: admin,
    text: kepala + '\n━━━━━━━━━━━━━━━━\n\n' + teks,
    disable_web_page_preview: true,
    reply_markup: { inline_keyboard: [[
      { text: butangUtama, callback_data: 't|' + id },
      { text: '✖️ Abaikan', callback_data: 'x|' + id }
    ]] }
  });
}

function tgTanyaPadam_(id) {
  const admin = prop_(P.TG_ADMIN);
  if (!admin || !prop_(P.TG_TOKEN)) return;
  const sh = sheet_();
  const idx = cariBaris_(sh, id);
  if (idx < 0) return;
  const row = sh.getRange(idx, 1, 1, COL.TG_STATUS + 1).getValues()[0];
  if (!teks_(row[COL.TG_MSG])) return;
  tgApi_('sendMessage', {
    chat_id: admin,
    text: '🗑️ Hebahan ' + teks_(row[COL.NAMA]) + ' ditukar kepada PADAM.\nPadam juga post itu dari group rasmi?',
    reply_markup: { inline_keyboard: [[
      { text: '🗑️ Padam dari Group', callback_data: 'd|' + id },
      { text: 'Biarkan', callback_data: 'k|' + id }
    ]] }
  });
}

// Tukar mesej pratonton: buang butang, letak status di atas
function tgTutupPratonton_(msg, kepala, teks) {
  if (!msg || !msg.chat) return;
  tgCuba_(() => tgApi_('editMessageText', {
    chat_id: msg.chat.id, message_id: msg.message_id,
    text: kepala + (teks ? '\n━━━━━━━━━━━━━━━━\n\n' + teks : ''),
    disable_web_page_preview: true
  }));
}

function tgHantar_(chatId, teks) {
  return tgApi_('sendMessage', { chat_id: chatId, text: teks, disable_web_page_preview: true });
}

function tgApi_(kaedah, data) {
  const token = prop_(P.TG_TOKEN);
  if (!token) return { ok: false, description: 'TG_TOKEN tiada' };
  const res = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/' + kaedah, {
    method: 'post', contentType: 'application/json', payload: JSON.stringify(data), muteHttpExceptions: true
  });
  let out;
  try { out = JSON.parse(res.getContentText()); } catch (e) { out = { ok: false, description: 'Respons tidak sah' }; }
  // Group dinaik taraf ke supergroup → chat id berubah; kemas kini dan cuba sekali lagi
  const baru = out && out.parameters && out.parameters.migrate_to_chat_id;
  if (!out.ok && baru && String(data.chat_id) === prop_(P.TG_GROUP)) {
    PropertiesService.getScriptProperties().setProperty(P.TG_GROUP, String(baru));
    return tgApi_(kaedah, Object.assign({}, data, { chat_id: baru }));
  }
  return out;
}

function tgCuba_(fn) {
  try { return fn(); } catch (e) { console.error('Telegram', e); }
}

function prop_(k) {
  return PropertiesService.getScriptProperties().getProperty(k) || '';
}

// ============================================================
// FUNGSI DALAMAN
// ============================================================
function sheet_() {
  const sh = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.SHEET_NAME);
  if (!sh) throw new Error('Tab "' + CONFIG.SHEET_NAME + '" tidak dijumpai');
  return sh;
}

function cariBaris_(sh, id) {
  if (!id) return -1;
  const n = sh.getLastRow() - 1;
  if (n < 1) return -1;
  const ids = sh.getRange(2, COL.ID + 1, n, 1).getValues();
  for (let i = 0; i < n; i++) if (String(ids[i][0]) === id) return i + 2;
  return -1;
}

function tukarStatus_(id, status) {
  if (!idSah_(id)) return { ok: false, ralat: 'ID tidak sah' };
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = sheet_();
    const idx = cariBaris_(sh, id);
    if (idx < 0) return { ok: false, ralat: 'Hebahan tidak dijumpai' };
    sh.getRange(idx, COL.STATUS + 1).setValue(status);
    CacheService.getScriptCache().remove(CONFIG.CACHE_KEY);
    return { ok: true, id: id, status: status };
  } finally {
    lock.releaseLock();
  }
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Buang ruang lebihan, hadkan panjang, dan halang formula injection
function bersih_(v, max) {
  let s = String(v == null ? '' : v).trim().slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function idSah_(v) {
  const s = String(v || '');
  return /^[A-Za-z0-9_-]{8,64}$/.test(s) ? s : '';
}

function tarikhSah_(v) {
  const s = String(v || '');
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}

function umurSah_(v) {
  const n = parseInt(v, 10);
  return isNaN(n) || n < 0 || n > 130 ? '' : n;
}

function jadualSah_(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, 10).map(j => ({
    aktiviti: bersih_(j && j.aktiviti, 40).replace(/^'/, ''),
    masa: /^\d{2}:\d{2}$/.test(String(j && j.masa)) ? j.masa : '',
    lokasi: bersih_(j && j.lokasi, 120).replace(/^'/, '')
  }));
}

function parseJadual_(v) {
  try { return JSON.parse(String(v || '[]')); } catch (e) { return []; }
}

function teks_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, CONFIG.TZ, 'yyyy-MM-dd');
  return String(v == null ? '' : v).replace(/^'/, '');
}

// Nilai masa (Dicipta) sebagai teks boleh-susun, termasuk jam
function masa_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, CONFIG.TZ, "yyyy-MM-dd'T'HH:mm:ss");
  return String(v == null ? '' : v).replace(/^'/, '').replace(' ', 'T');
}

function hariIni_() {
  return Utilities.formatDate(new Date(), CONFIG.TZ, 'yyyy-MM-dd');
}

function sekarang_() {
  return Utilities.formatDate(new Date(), CONFIG.TZ, "yyyy-MM-dd'T'HH:mm:ss");
}

function jamKini_() {
  return Utilities.formatDate(new Date(), CONFIG.TZ, 'd/M h:mm a');
}

function tambahHari_(ymd, n) {
  const p = ymd.split('-').map(Number);
  const d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + n));
  return d.toISOString().slice(0, 10);
}
