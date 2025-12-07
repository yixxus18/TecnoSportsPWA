import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonList, IonItem, IonInput, IonButton, useIonToast, IonRouterLink, IonText, IonSpinner } from '@ionic/react';
import { useState, useEffect, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { biometricAvailable, registerLocalBiometric, verifyLocalBiometric, biometricsEnabled } from '../lib/biometric';
import { API_ENDPOINTS } from '../config/api';
import { cachedFetch } from '../utils/apiCache';
import { initializeSupabaseNotifications } from '../lib/supabaseNotifications';
import { supabase } from '../lib/supabase';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import ReCaptcha from '../components/ReCaptcha';
import './Login.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [showBiometricRegistrationPrompt, setShowBiometricRegistrationPrompt] = useState(false);
  const [present] = useIonToast();
  const history = useHistory();
  const isOnline = useOnlineStatus();

  useEffect(() => {
    const checkBiometric = async () => {
      try {
        const available = await biometricAvailable();
        setIsBiometricAvailable(available);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error checking biometric availability:', errorMessage);
        present({ message: `Error al verificar biometría: ${errorMessage}`, duration: 4000, color: 'danger' });
      }
    };
    checkBiometric();
  }, [present]);

  const handleRecaptchaVerify = useCallback((token: string) => {
    setRecaptchaToken(token);
  }, []);

  const handleRecaptchaExpire = useCallback(() => {
    setRecaptchaToken(null);
  }, []);

  const triggerBiometricVerification = async () => {
    try {
      const verified = await verifyLocalBiometric();
      if (verified) {
        present({ message: '¡Verificación biométrica exitosa! Redirigiendo...', duration: 2000, color: 'success' });
        history.push('/tabs/home');
      } else {
        present({ message: 'Fallo en la verificación biométrica.', duration: 4000, color: 'danger' });
        setShowBiometricPrompt(false);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Fallo en la verificación biométrica:', errorMessage);
      present({ message: `Fallo en la verificación biométrica: ${errorMessage}`, duration: 4000, color: 'danger' });
      setShowBiometricPrompt(false);
    }
  };

  const handleLogin = async () => {
    // Validate reCAPTCHA when online
    if (isOnline && !recaptchaToken) {
      present({ message: 'Por favor, completa el captcha', duration: 3000, color: 'warning' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await cachedFetch(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          password,
          recaptchaToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al iniciar sesión');
      }

      const data = await response.json();
      localStorage.setItem('session', JSON.stringify(data.session));
      localStorage.setItem('userProfile', JSON.stringify(data.userProfile));

      // Sync the session with the local Supabase client
      if (data.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        console.log('Supabase client session synced');
      }

      console.log('Inicio de sesión exitoso:', data);
      present({ message: '¡Inicio de sesión exitoso!', duration: 2000, color: 'success' });
      
      // Initialize notifications
      if (data.userProfile && data.userProfile.id) {
        initializeSupabaseNotifications(data.userProfile.id);
      }

      if (isBiometricAvailable) {
        if (!biometricsEnabled()) {
          setShowBiometricRegistrationPrompt(true);
        } else {
          setShowBiometricPrompt(true);
        }
      } else {
        history.push('/tabs/home');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error en el inicio de sesión:', errorMessage);
      present({ message: errorMessage || 'No se pudo iniciar sesión.', duration: 3000, color: 'danger' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      const verified = await verifyLocalBiometric();
      if (verified) {
        present({ message: '¡Inicio de sesión biométrico exitoso!', duration: 2000, color: 'success' });
        history.push('/tabs/home');
      } else {
        present({ message: 'Fallo en el inicio de sesión biométrico.', duration: 4000, color: 'danger' });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Biometric login failed', errorMessage);
      present({ message: `Fallo en el inicio de sesión biométrico: ${errorMessage}`, duration: 4000, color: 'danger' });
    }
  };

  const handleRegisterBiometric = async () => {
    const userProfileString = localStorage.getItem('userProfile');
    if (!userProfileString) {
      present({ message: 'No se encontró el perfil de usuario para registrar la biometría.', duration: 3000, color: 'warning' });
      return;
    }
    const userProfile = JSON.parse(userProfileString);

    try {
      const registered = await registerLocalBiometric(userProfile.id, userProfile.name || userProfile.email);
      if (registered) {
        present({ message: '¡Biometría registrada exitosamente! Redirigiendo...', duration: 2000, color: 'success' });
        history.push('/tabs/home');
      } else {
        present({ message: 'Fallo al registrar la biometría.', duration: 4000, color: 'danger' });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error al registrar biometría:', errorMessage);
      present({ message: `Error al registrar biometría: ${errorMessage}`, duration: 4000, color: 'danger' });
    }
    setShowBiometricRegistrationPrompt(false);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Iniciar Sesión</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        {!showBiometricPrompt && !showBiometricRegistrationPrompt ? (
          <>
            <IonList>
              <IonItem>
                <IonInput label="Correo Electrónico" labelPlacement="floating" type="email" value={email} onIonInput={(e) => setEmail(e.detail.value!)}></IonInput>
              </IonItem>
              <IonItem>
                <IonInput label="Contraseña" labelPlacement="floating" type="password" value={password} onIonInput={(e) => setPassword(e.detail.value!)}></IonInput>
              </IonItem>
            </IonList>

            {/* reCAPTCHA v2 Checkbox - only show when online */}
            {isOnline && (
              <ReCaptcha 
                onVerify={handleRecaptchaVerify} 
                onExpire={handleRecaptchaExpire}
              />
            )}

            <IonButton 
              expand="full" 
              onClick={handleLogin} 
              disabled={isLoading || (isOnline && !recaptchaToken)}
              className="login-button"
            >
              {isLoading ? <IonSpinner name="crescent" /> : 'Iniciar Sesión'}
            </IonButton>

            {isBiometricAvailable && biometricsEnabled() && (
              <IonButton expand="full" fill="outline" onClick={handleBiometricLogin} className="biometric-button">
                Usar Huella Digital
              </IonButton>
            )}

            <div className="ion-text-center register-link">
              <IonRouterLink routerLink="/register">¿No tienes una cuenta? Regístrate</IonRouterLink>
            </div>
          </>
        ) : showBiometricRegistrationPrompt ? (
          <div className="ion-text-center biometric-prompt">
            <IonText>
              <p>¿Deseas registrar tu huella dactilar o rostro para futuros inicios de sesión?</p>
            </IonText>
            <IonButton expand="full" onClick={handleRegisterBiometric} className="register-biometric-button">
              Registrar Biometría
            </IonButton>
            <IonButton expand="full" fill="outline" onClick={() => history.push('/tabs/home')} className="skip-button">
              Ahora No
            </IonButton>
          </div>
        ) : (
          <div className="ion-text-center biometric-prompt">
            <IonText>
              <p>Por favor, verifica tu identidad con tu huella dactilar o rostro.</p>
            </IonText>
            <IonButton expand="full" onClick={triggerBiometricVerification} className="verify-button">
              Verificar con Biometría
            </IonButton>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Login;
