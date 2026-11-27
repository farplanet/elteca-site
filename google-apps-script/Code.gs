const SHEET_NAME = 'Заявки';
const PACKAGES = ['Start', 'Small', 'Medium', 'Enterprise', 'Обратная связь'];
const SOURCES = ['Пакеты на главной', 'Контакты'];

function doPost(e) {
  const fields = e && e.parameter;
  if (!fields || !e.postData || e.postData.length > 4096) {
    return response_('error');
  }
  const id = fields.id;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return response_('error');
  }
  if (fields.sf_extra) return response_('error');

  const name = (fields['Имя'] || '').replace(/\s+/g, ' ').trim();
  const phone = (fields['Телефон'] || '').replace(/\s+/g, ' ').trim();
  const digits = phone.replace(/\D/g, '');
  const plan = fields['Пакет'];
  const source = fields['Источник'];
  if (!name || name.length > 100 || phone.length > 30 || digits.length < 10 ||
      digits.length > 15 || !PACKAGES.includes(plan) || !SOURCES.includes(source) ||
      (source === 'Пакеты на главной' && plan === 'Обратная связь')) {
    return response_('error');
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return response_('error');
  try {
    const sheetId = PropertiesService.getScriptProperties().getProperty('CRM_SPREADSHEET_ID');
    if (!sheetId) return response_('error');
    const sheet = SpreadsheetApp.openById(sheetId).getSheetByName(SHEET_NAME);
    if (!sheet || sheet.getRange('A1').getValue() !== 'ID заявки' ||
        sheet.getRange('G1').getValue() !== 'Статус') {
      return response_('error');
    }

    const last = sheet.getLastRow();
    if (last > 1 && sheet.getRange(2, 1, last - 1, 1).createTextFinder(id).matchEntireCell(true).findNext()) {
      return response_('success', id);
    }

    const capacity = sheet.getMaxRows();
    if (last < capacity && last + 1 === capacity) {
      // Insert above the reserved blank last row to extend the existing filter.
      sheet.insertRowsBefore(capacity, 1000);
    } else if (last === capacity) {
      sheet.insertRowsAfter(capacity, 1000);
    }

    const received = Utilities.formatDate(new Date(), 'Europe/Moscow', 'yyyy-MM-dd HH:mm:ss');
    sheet.getRange(last + 1, 2, 1, 3).setNumberFormat('@');
    const statusRule = sheet.getRange('G2').getDataValidation();
    if (statusRule) sheet.getRange(last + 1, 7).setDataValidation(statusRule);
    sheet.getRange(last + 1, 1, 1, 7).setValues([[
      id, received, literal_(name), literal_(phone), plan, source, 'Новая',
    ]]);
    SpreadsheetApp.flush();
    return response_('success', id);
  } catch {
    return response_('error');
  } finally {
    lock.releaseLock();
  }
}

function literal_(value) {
  return /^[=+\-@']/.test(value) ? "'" + value : value;
}

function response_(status, id) {
  return ContentService.createTextOutput(JSON.stringify({ status, id }))
    .setMimeType(ContentService.MimeType.JSON);
}
