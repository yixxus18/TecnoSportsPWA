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
let recaptchaFailed = false;

export const loadRecaptchaScript = (): Promise<void> => {
  return new Promise((resolve) => {
    // If already failed, don't try again
    if (recaptchaFailed) {
      resolve();
      return;
    }

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
      
      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkLoaded);
        if (!window.grecaptcha) {
          console.warn('reCAPTCHA load timeout - continuing without it');
          recaptchaFailed = true;
          resolve(); // Resolve anyway to not block login
        }
      }, 5000);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.grecaptcha) {
        window.grecaptcha.ready(() => {
          recaptchaLoaded = true;
          resolve();
        });
      } else {
        // grecaptcha not available even after load
        console.warn('reCAPTCHA not available after script load');
        recaptchaFailed = true;
        resolve();
      }
    };

    script.onerror = () => {
      console.warn('Failed to load reCAPTCHA script - continuing without it');
      recaptchaFailed = true;
      resolve(); // Resolve anyway to not block login
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
