const dialog = document.querySelector('#callback-dialog');
const form = document.querySelector('#callback-form');
const packageLabel = document.querySelector('#callback-package');
const status = document.querySelector('#callback-status');
const submitButton = form.querySelector('button[type=submit]');
const accessKey = 'd32d194d562cc95f1509644408c35159c4f3dd7bec9afd58ff73e1d7c428832d';
const nameField = document.querySelector('#callback-name');
const phoneField = document.querySelector('#callback-phone');

let activeCard;
let selectedPlan = '';

function selectPlan(plan) {
  selectedPlan = plan;
  packageLabel.querySelector('strong').textContent = plan;
  packageLabel.hidden = false;
}

if (!dialog) {
  const packageFromUrl = new URLSearchParams(window.location.search).get('package');
  if (['Start', 'Small', 'Medium', 'Enterprise'].includes(packageFromUrl)) {
    selectPlan(packageFromUrl);
  }
}

if (typeof dialog?.showModal === 'function') {
  for (const link of document.querySelectorAll('[data-plan]')) {
    link.setAttribute('aria-haspopup', 'dialog');
    link.addEventListener('click', (event) => {
      activeCard = link;
      selectPlan(link.dataset.plan);
      if (!submitButton.disabled) status.textContent = '';
      dialog.showModal();
      event.preventDefault();
    });
  }

  dialog.querySelector('.callback-close').addEventListener('click', () => dialog.close());

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.addEventListener('close', () => activeCard?.focus());
}

const requiredMessage = 'Пожалуйста, заполните это поле.';

for (const field of [nameField, phoneField]) {
  field.addEventListener('invalid', () => {
    if (field.validity.valueMissing) field.setCustomValidity(requiredMessage);
  });
  field.addEventListener('input', () => field.setCustomValidity(''));
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const name = nameField.value.trim();
  const phone = phoneField.value.trim();
  const phoneDigits = phone.replace(/\D/g, '');

  nameField.setCustomValidity(name ? '' : requiredMessage);

  let phoneError = '';
  if (!phone) {
    phoneError = requiredMessage;
  } else if (phoneDigits.length < 10 || phoneDigits.length > 15) {
    phoneError = 'Введите номер телефона с кодом города или страны.';
  }
  phoneField.setCustomValidity(phoneError);
  if (!form.reportValidity()) return;

  if (submitButton.disabled) return;

  const submission = Object.fromEntries(new FormData(form));
  submission['Имя'] = name;
  submission['Телефон'] = phone;
  submission['Пакет'] = selectedPlan || 'Обратная связь';
  submission.accessKey = accessKey;
  submission.subject = selectedPlan ? 'Elteca — заявка на пакет ' + selectedPlan : 'Elteca — заявка с сайта';

  submitButton.disabled = true;
  nameField.readOnly = true;
  phoneField.readOnly = true;
  status.textContent = 'Отправляем заявку…';

  try {
    const response = await fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(submission),
      signal: AbortSignal.timeout(15000),
    });
    const result = await response.json();
    if (!response.ok || result.status !== 'success') throw new Error('Submission failed');

    form.reset();
    const confirmation = 'отправлена, спасибо! Мы свяжемся с вами в рабочее время.';
    status.textContent = selectedPlan === submission['Пакет']
      ? 'Заявка на пакет ' + selectedPlan + ' ' + confirmation
      : 'Заявка ' + confirmation;
  } catch {
    status.textContent = 'Не удалось подтвердить отправку. Попробуйте ещё раз.';
  } finally {
    submitButton.disabled = false;
    nameField.readOnly = false;
    phoneField.readOnly = false;
  }
});

form.hidden = false;
