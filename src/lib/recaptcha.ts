const RECAPTCHA_SITE_KEY = '6Lf8YCMsAAAAAKT5nswAFx2Yq1f7N_Sh2nrW5rXe';

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      render: (container: string | HTMLElement, options: {
        sitekey: string;
        callback: (token: string) => void;
        'expired-callback'?: () => void;
        'error-callback'?: () => void;
        theme?: 'light' | 'dark';
        size?: 'normal' | 'compact';
      }) => number;
      reset: (widgetId?: number) => void;
      getResponse: (widgetId?: number) => string;
    };
    onRecaptchaLoad?: () => void;
  }
}

let recaptchaLoaded = false;
let loadPromise: Promise<void> | null = null;

export const loadRecaptchaScript = (): Promise<void> => {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve) => {
    if (recaptchaLoaded && window.grecaptcha) {
      resolve();
      return;
    }

    // Check if script already exists
    if (document.querySelector('script[src*="recaptcha"]')) {
      const checkLoaded = setInterval(() => {
        if (window.grecaptcha) {
          clearInterval(checkLoaded);
          recaptchaLoaded = true;
          resolve();
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkLoaded);
        resolve();
      }, 10000);
      return;
    }

    // Set global callback
    window.onRecaptchaLoad = () => {
      recaptchaLoaded = true;
      resolve();
    };

    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit`;
    script.async = true;
    script.defer = true;

    script.onerror = () => {
      console.warn('Failed to load reCAPTCHA script');
      resolve();
    };

    document.head.appendChild(script);
  });

  return loadPromise;
};

export const renderRecaptcha = (
  containerId: string,
  onSuccess: (token: string) => void,
  onExpired?: () => void
): number | null => {
  if (!window.grecaptcha) {
    console.warn('reCAPTCHA not loaded');
    return null;
  }

  try {
    const widgetId = window.grecaptcha.render(containerId, {
      sitekey: RECAPTCHA_SITE_KEY,
      callback: onSuccess,
      'expired-callback': onExpired,
      theme: 'dark',
      size: 'normal',
    });
    return widgetId;
  } catch (error) {
    console.error('Error rendering reCAPTCHA:', error);
    return null;
  }
};

export const resetRecaptcha = (widgetId?: number): void => {
  if (window.grecaptcha) {
    window.grecaptcha.reset(widgetId);
  }
};

export const getRecaptchaResponse = (widgetId?: number): string => {
  if (window.grecaptcha) {
    return window.grecaptcha.getResponse(widgetId);
  }
  return '';
};

export const RECAPTCHA_SITE_KEY_EXPORT = RECAPTCHA_SITE_KEY;
