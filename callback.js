const dialog = document.querySelector('#callback-dialog');
const form = document.querySelector('#callback-form');
const packageLabel = document.querySelector('#callback-package');
const status = document.querySelector('#callback-status');
const copyFallback = document.querySelector('#callback-copy');
const copyText = document.querySelector('#callback-text');
const nameField = document.querySelector('#callback-name');
const phoneField = document.querySelector('#callback-phone');

let activeCard;
let selectedPlan = '';

if (dialog) {
  for (const link of document.querySelectorAll('[data-plan]')) {
    link.setAttribute('aria-haspopup', 'dialog');
    link.addEventListener('click', (event) => {
      event.preventDefault();
      activeCard = link;
      selectedPlan = link.dataset.plan;
      packageLabel.textContent = 'Пакет ' + selectedPlan;
      copyFallback.hidden = true;
      status.textContent = '';
      dialog.showModal();
    });
  }

  dialog.querySelector('.callback-close').addEventListener('click', () => dialog.close());

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.addEventListener('close', () => activeCard?.focus());
}

phoneField.addEventListener('input', () => phoneField.setCustomValidity(''));
nameField.addEventListener('input', () => nameField.setCustomValidity(''));

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const name = nameField.value.trim();
  const phone = phoneField.value.trim();
  const phoneDigits = phone.replace(/\D/g, '');

  nameField.setCustomValidity(name ? '' : 'Укажите ваше имя.');
  phoneField.setCustomValidity(phoneDigits.length >= 10 && phoneDigits.length <= 15
    ? ''
    : 'Введите номер телефона с кодом города или страны.');
  if (!form.reportValidity()) return;

  const text = [
    selectedPlan ? 'Заявка на пакет ' + selectedPlan : 'Заявка на обратную связь',
    'Имя: ' + name,
    'Телефон: ' + phone,
  ].join('\n');

  try {
    await navigator.clipboard.writeText(text);
    copyFallback.hidden = true;
    status.textContent = 'Текст заявки скопирован.';
  } catch {
    copyText.value = text;
    copyFallback.hidden = false;
    copyText.select();
    status.textContent = 'Скопируйте выделенный текст.';
  }
});

form.hidden = false;
