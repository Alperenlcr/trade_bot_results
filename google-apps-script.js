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
 */

const SHEET_ID = '1pHoxWVNPIVMUTQnTPpuhUq-ZqyX7fpXNIeoyVJk35R8';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();

    // Header row (only if empty)
    if (sheet.getLastRow() === 0) {
      const headers = ['Tarih', 'Platform', 'E-posta', 'Referrer Nickname', 'Referrer ID', 'Referred Nickname'];
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#2DD6C4').setFontColor('#04130f');
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([
      new Date().toLocaleString('tr-TR'),
      data.platform          || '',
      data.email             || '',
      data.referrerNickname  || '',
      data.referrerID        || '',
      data.referredNickname  || '',
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
