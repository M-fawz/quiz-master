/**
 * @fileoverview UI Controls — custom dropdowns and number input +/- buttons
 * Loaded as a regular script (not a module) so it runs synchronously.
 */

/**
 * Initializes all .custom-select dropdowns on the page.
 */
function initCustomSelects() {
  document.querySelectorAll('.custom-select').forEach(select => {
    const trigger     = select.querySelector('.custom-select-trigger');
    const options     = select.querySelectorAll('.custom-select-option');
    const hiddenInput = select.parentElement.querySelector('input[type="hidden"]');
    const textSpan    = trigger.querySelector('.custom-select-text');
    const iconSpan    = trigger.querySelector('.custom-select-icon');

    // Toggle open/close on trigger click
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = select.classList.contains('open');
      // Close all other open selects
      document.querySelectorAll('.custom-select.open').forEach(s => {
        if (s !== select) {
          s.classList.remove('open');
          s.querySelector('.custom-select-trigger')?.setAttribute('aria-expanded', 'false');
        }
      });
      select.classList.toggle('open', !isOpen);
      trigger.setAttribute('aria-expanded', String(!isOpen));
    });

    // Keyboard support on trigger
    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        trigger.click();
      }
      if (e.key === 'Escape') {
        select.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });

    // Select an option
    options.forEach(option => {
      option.addEventListener('click', () => {
        const value   = option.dataset.value;
        const iconEl  = option.querySelector('i');
        const icon    = iconEl ? iconEl.outerHTML : '';
        const text    = option.textContent.trim();

        select.dataset.value = value;
        if (hiddenInput) hiddenInput.value = value;
        textSpan.textContent = text;
        iconSpan.innerHTML   = icon;

        options.forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
        select.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
      });
    });
  });
}

/**
 * Initializes the custom +/- number input buttons.
 */
function initNumberInputs() {
  document.querySelectorAll('.number-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const wrapper = btn.closest('.number-input-wrapper');
      const input   = wrapper.querySelector('input[type="number"]');
      const min     = parseInt(input.min, 10) || 1;
      const max     = parseInt(input.max, 10) || 50;
      let   value   = parseInt(input.value, 10) || min;

      if (btn.dataset.action === 'increment' && value < max) {
        input.value = value + 1;
      } else if (btn.dataset.action === 'decrement' && value > min) {
        input.value = value - 1;
      }
    });
  });
}

/**
 * Closes all open dropdowns when clicking anywhere outside them.
 */
function initClickOutside() {
  document.addEventListener('click', () => {
    document.querySelectorAll('.custom-select.open').forEach(s => {
      s.classList.remove('open');
      s.querySelector('.custom-select-trigger')?.setAttribute('aria-expanded', 'false');
    });
  });
}

// Initialize all UI controls once the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initCustomSelects();
  initNumberInputs();
  initClickOutside();
});
