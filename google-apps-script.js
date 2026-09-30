/**
 * Executor Bot — Referral Form → Google Sheets
 * =============================================
 * Sheet ID: 1pHoxWVNPIVMUTQnTPpuhUq-ZqyX7fpXNIeoyVJk35R8
 *
 * KURULUM / SETUP:
 * 1. https://docs.google.com/spreadsheets/d/1pHoxWVNPIVMUTQnTPpuhUq-ZqyX7fpXNIeoyVJk35R8/edit
 *    adresinde sayfayı açın.
 * 2. Extensions → Apps Script → Bu kodu yapıştırın.
 * 3. Deploy → New deployment → Web app:
 *    - Execute as : Me
 *    - Who has access : Anyone
 * 4. "Deploy" → URL'yi kopyalayın.
 * 5. data/config.json → "formEndpoint" alanına URL'yi yapıştırın:
 *    "formEndpoint": "https://script.google.com/macros/s/XXX.../exec"
 *
 * Kolon sırası: Tarih | Platform | E-posta | Referrer Nick | Referrer ID | Referred Nick
 *
 * İletişim formu (type: 'contact'): "İletişim" sayfasına yazar ve info@'ya mail atar (Yanıtla → ziyaretçi).
 * Kodu güncellerken URL değişmesin: Deploy → Manage deployments → mevcut dağıtım → Edit →
 * Version: New version → Deploy. İlk seferde Gmail ile gönderme izni istenir, onaylayın.
 */

const SHEET_ID = '1pHoxWVNPIVMUTQnTPpuhUq-ZqyX7fpXNIeoyVJk35R8';
const CONTACT_TO = 'info@executortrading.com';

// appendRow '=', '+', '-', '@' ile başlayan metni formül sayar; başa ' eklenince düz metin kalır.
// Uzunluk sınırı tabloyu şişirmeye yönelik isteklere karşı.
function clean(v, max) {
  const s = String(v || '').slice(0, max || 200);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function sheetWithHeader(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#2DD6C4').setFontColor('#04130f');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function saveContact(data) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = sheetWithHeader(ss.getSheetByName('İletişim') || ss.insertSheet('İletişim'), ['Tarih', 'Ad', 'E-posta', 'Mesaj']);
  const name = clean(data.name), email = clean(data.email), message = clean(data.message, 5000);
  sheet.appendRow([new Date().toLocaleString('tr-TR'), name, email, message]);
  MailApp.sendEmail({
    to: CONTACT_TO,
    replyTo: String(data.email || '').slice(0, 200),
    subject: 'Executor Trading iletişim: ' + (String(data.name || '').slice(0, 100) || data.email),
    body: String(data.message || '').slice(0, 5000) + '\n\n— ' + String(data.name || '') + ' <' + String(data.email || '') + '> (' + String(data.lang || '') + ')',
  });
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    // Honeypot: gerçek kullanıcı gizli "website" alanını görmez, botlar doldurur. Bota başarı döner, satır yazılmaz.
    if (data.website) {
      return ContentService
        .createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (data.type === 'contact') {
      saveContact(data);
      return ContentService
        .createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    // İlk sayfa referans tablosu (getActiveSheet, İletişim sayfası eklenince ona düşebilir).
    const sheet = sheetWithHeader(SpreadsheetApp.openById(SHEET_ID).getSheets()[0],
      ['Tarih', 'Platform', 'E-posta', 'Referrer Nickname', 'Referrer ID', 'Referred Nickname']);

    sheet.appendRow([
      new Date().toLocaleString('tr-TR'),
      clean(data.platform),
      clean(data.email),
      clean(data.referrerNickname),
      clean(data.referrerID),
      clean(data.referredNickname),
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', sheet: SHEET_ID }))
    .setMimeType(ContentService.MimeType.JSON);
}
