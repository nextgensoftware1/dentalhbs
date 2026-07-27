(function () {
  const STATUS_ID = 'contact-status-toast';
  let statusToast;

  function initContactForms() {
    const forms = Array.from(document.querySelectorAll('form[data-contact-form="true"], .contact-form'));
    if (!forms.length) return;

    forms.forEach((form) => {
      if (form.dataset.contactInitialized === 'true') return;
      form.dataset.contactInitialized = 'true';
      form.setAttribute('novalidate', 'novalidate');

      const submitButton = form.querySelector('button[type="submit"], button.btn');
      if (submitButton) {
        submitButton.setAttribute('aria-label', 'Submit contact form');
      }

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        await handleSubmit(form, submitButton);
      });
    });
  }

  function ensureStatusContainer() {
    if (statusToast) return statusToast;

    const container = document.createElement('div');
    container.id = STATUS_ID;
    container.setAttribute('role', 'status');
    container.setAttribute('aria-live', 'polite');
    container.style.position = 'fixed';
    container.style.right = '1rem';
    container.style.bottom = '1rem';
    container.style.maxWidth = '320px';
    container.style.padding = '0.9rem 1rem';
    container.style.borderRadius = '12px';
    container.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.14)';
    container.style.fontFamily = 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    container.style.fontSize = '0.92rem';
    container.style.lineHeight = '1.4';
    container.style.zIndex = '9999';
    container.style.display = 'none';
    container.style.border = '1px solid rgba(0, 0, 0, 0.08)';
    container.style.background = '#ffffff';
    container.style.color = '#1b2533';
    document.body.appendChild(container);
    statusToast = container;
    return statusToast;
  }

  function showStatus(message, type = 'info') {
    const container = ensureStatusContainer();
    container.textContent = message;
    container.style.display = 'block';

    if (type === 'success') {
      container.style.background = '#ecfdf3';
      container.style.color = '#166534';
      container.style.borderColor = '#86efac';
    } else if (type === 'error') {
      container.style.background = '#fef2f2';
      container.style.color = '#b91c1c';
      container.style.borderColor = '#fecaca';
    } else {
      container.style.background = '#ffffff';
      container.style.color = '#1b2533';
      container.style.borderColor = 'rgba(0, 0, 0, 0.08)';
    }

    if (type !== 'loading') {
      window.clearTimeout(showStatus.timeoutId);
      showStatus.timeoutId = window.setTimeout(() => {
        container.style.display = 'none';
      }, 5000);
    }
  }

  function getFieldValue(form, name) {
    const field = form.querySelector(`[name="${name}"]`);
    return field ? field.value : '';
  }

  function sanitizeText(value, maxLength = 2000) {
    return String(value || '')
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxLength);
  }

  function validateFields(values) {
    const errors = [];

    if (!values.name) {
      errors.push('Please enter your full name.');
    } else if (values.name.length < 2) {
      errors.push('Please enter a valid name.');
    }

    if (!values.email) {
      errors.push('Please enter your email address.');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      errors.push('Please enter a valid email address.');
    }

    if (!values.phone) {
      errors.push('Please enter your phone number.');
    }

    if (!values.message) {
      errors.push('Please tell us how we can help.');
    }

    return errors;
  }

  function setLoadingState(button, isLoading) {
    if (!button) return;
    button.setAttribute('aria-disabled', String(isLoading));
    button.style.pointerEvents = isLoading ? 'none' : '';
    button.style.cursor = isLoading ? 'wait' : '';
    button.dataset.loading = isLoading ? 'true' : 'false';
  }

  async function handleSubmit(form, button) {
    const values = {
      name: sanitizeText(getFieldValue(form, 'name'), 120),
      email: sanitizeText(getFieldValue(form, 'email'), 160).toLowerCase(),
      phone: sanitizeText(getFieldValue(form, 'phone'), 40),
      practice: sanitizeText(getFieldValue(form, 'practice'), 160),
      service: sanitizeText(getFieldValue(form, 'service'), 120),
      message: sanitizeText(getFieldValue(form, 'message'), 2000),
    };

    const validationErrors = validateFields(values);
    if (validationErrors.length) {
      showStatus(validationErrors[0], 'error');
      return;
    }

    setLoadingState(button, true);
    showStatus('Sending your request...', 'loading');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || 'We could not send your request right now. Please try again later.');
      }

      showStatus(result.message || 'Thanks! We will reach out shortly.', 'success');
      form.reset();
    } catch (error) {
      showStatus(error.message || 'Something went wrong. Please try again.', 'error');
    } finally {
      setLoadingState(button, false);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initContactForms, { once: true });
  } else {
    initContactForms();
  }
})();
