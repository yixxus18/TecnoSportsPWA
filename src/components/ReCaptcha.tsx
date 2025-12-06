import React, { useEffect, useRef, useState } from 'react';
import { loadRecaptchaScript, renderRecaptcha, resetRecaptcha } from '../lib/recaptcha';
import './ReCaptcha.css';

interface ReCaptchaProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
}

export const ReCaptcha: React.FC<ReCaptchaProps> = ({ onVerify, onExpire }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [widgetId, setWidgetId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const initRecaptcha = async () => {
      try {
        await loadRecaptchaScript();
        
        if (!mounted || !containerRef.current) return;

        // Small delay to ensure DOM is ready
        setTimeout(() => {
          if (!mounted || !containerRef.current) return;
          
          const id = renderRecaptcha(
            'recaptcha-container',
            (token) => {
              onVerify(token);
            },
            () => {
              if (onExpire) onExpire();
            }
          );

          if (id !== null) {
            setWidgetId(id);
            setIsLoading(false);
          } else {
            setError('No se pudo cargar el captcha');
            setIsLoading(false);
          }
        }, 100);
      } catch (err) {
        if (mounted) {
          setError('Error al cargar reCAPTCHA');
          setIsLoading(false);
        }
      }
    };

    initRecaptcha();

    return () => {
      mounted = false;
    };
  }, [onVerify, onExpire]);

  const handleReset = () => {
    if (widgetId !== null) {
      resetRecaptcha(widgetId);
    }
  };

  if (error) {
    return (
      <div className="recaptcha-error">
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Reintentar</button>
      </div>
    );
  }

  return (
    <div className="recaptcha-wrapper">
      {isLoading && (
        <div className="recaptcha-loading">
          <span>Cargando verificación...</span>
        </div>
      )}
      <div 
        id="recaptcha-container" 
        ref={containerRef}
        style={{ display: isLoading ? 'none' : 'flex', justifyContent: 'center' }}
      />
    </div>
  );
};

export default ReCaptcha;
