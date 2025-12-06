const RECAPTCHA_SITE_KEY = '6Lf8YCMsAAAAAKT5nswAFx2Yq1f7N_Sh2nrW5rXe';

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
      render: (container: string | HTMLElement, options: object) => number;
    };
  }
}

let recaptchaLoaded = false;

export const loadRecaptchaScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (recaptchaLoaded && window.grecaptcha) {
      resolve();
      return;
    }

    // Check if already loading
    if (document.querySelector('script[src*="recaptcha"]')) {
      const checkLoaded = setInterval(() => {
        if (window.grecaptcha) {
          clearInterval(checkLoaded);
          recaptchaLoaded = true;
          resolve();
        }
      }, 100);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      window.grecaptcha.ready(() => {
        recaptchaLoaded = true;
        resolve();
      });
    };

    script.onerror = () => {
      reject(new Error('Failed to load reCAPTCHA script'));
    };

    document.head.appendChild(script);
  });
};

export const executeRecaptcha = async (action: string): Promise<string | null> => {
  try {
    // Skip reCAPTCHA if offline
    if (!navigator.onLine) {
      console.log('Offline mode - skipping reCAPTCHA');
      return null;
    }

    await loadRecaptchaScript();
    const token = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action });
    return token;
  } catch (error) {
    console.error('reCAPTCHA error:', error);
    return null;
  }
};

export const verifyRecaptchaWithBackend = async (token: string): Promise<boolean> => {
  try {
    const response = await fetch('https://tecnosportsadmin2-production.up.railway.app/api/recaptcha/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    const data = await response.json();
    return data.success && data.score >= 0.5;
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return false;
  }
};
