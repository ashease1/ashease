// ============================================
// SILENT STUDIOS — Formspree form delivery
// ============================================

const FORMSPREE_ENDPOINT = "https://formspree.io/f/xvkganvp";

const SS_FORMS = {
  OWNER_EMAIL: 'agrahari778@gmail.com',

  _cfg() {
    const config = (typeof window !== 'undefined' && window.__SS_FORMS_CONFIG) || {};
    // Hardcoded fallback to ensure forms work even if config file is missing
    if (!config.contactFormId && !config.bookingFormId && !config.formId) {
      return { contactFormId: 'xvkganvp', bookingFormId: 'xvkganvp' };
    }
    return config;
  },

  contactEndpoint() {
    return FORMSPREE_ENDPOINT;
  },

  bookingEndpoint() {
    return FORMSPREE_ENDPOINT;
  },

  configured() {
    return true;
  },

  async submit(endpoint, payload) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload)
    });
    let data = null;
    try {
      data = await res.json();
    } catch (_) {
      /* non-JSON error body */
    }
    if (!res.ok) {
      const msg = data?.error || data?.errors?.[0]?.message || `Submission failed (${res.status})`;
      throw new Error(msg);
    }
    return data;
  }
};

window.SS_FORMS = SS_FORMS;
