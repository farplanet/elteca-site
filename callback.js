const dialog = document.querySelector('#callback-dialog');
const packageLabel = document.querySelector('#callback-package');
const plans = ['Start', 'Small', 'Medium', 'Enterprise'];

function showPackage(plan) {
  if (!plans.includes(plan)) return;
  packageLabel.querySelector('strong').textContent = plan;
  packageLabel.hidden = false;
}

if (typeof dialog?.showModal === 'function') {
  let activeCard;
  for (const card of document.querySelectorAll('[data-plan]')) {
    card.setAttribute('aria-haspopup', 'dialog');
    card.addEventListener('click', (event) => {
      event.preventDefault();
      activeCard = card;
      showPackage(card.dataset.plan);
      dialog.showModal();
    });
  }
  dialog.querySelector('.callback-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => activeCard?.focus());
} else if (!dialog) {
  showPackage(new URLSearchParams(window.location.search).get('package'));
}
