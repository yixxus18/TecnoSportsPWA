import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import Login from './pages/Login';
import Register from './pages/Register';
import MainTabs from './components/MainTabs';
import UpdatePrompt from './components/UpdatePrompt';
import OfflineIndicator from './components/OfflineIndicator';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* import '@ionic/react/css/palettes/dark.always.css'; */
/* import '@ionic/react/css/palettes/dark.class.css'; */
import '@ionic/react/css/palettes/dark.system.css';

/* Theme variables */
import './theme/variables.css';

import React, { useEffect } from 'react';
import { initializeSupabaseNotifications } from './lib/supabaseNotifications';
import { loadRecaptchaScript } from './lib/recaptcha';

setupIonicReact();

const App: React.FC = () => {
  useEffect(() => {
    const userProfileString = localStorage.getItem('userProfile');
    if (userProfileString) {
      try {
        const userProfile = JSON.parse(userProfileString);
        if (userProfile && userProfile.id) {
          initializeSupabaseNotifications(userProfile.id);
        }
      } catch (e) {
        console.error('Error parsing user profile for notifications', e);
      }
    }

    // Load reCAPTCHA script (only when online)
    if (navigator.onLine) {
      loadRecaptchaScript().catch(console.error);
    }
  }, []);

  return (
    <IonApp>
      {/* Offline Indicator */}
      <OfflineIndicator />
      
      {/* Update Prompt for new PWA versions */}
      <UpdatePrompt />
      
      <IonReactRouter>
        <IonRouterOutlet>
          <Route exact path="/login">
            <Login />
          </Route>
          <Route exact path="/register">
            <Register />
          </Route>
          <Route exact path="/home">
            <MainTabs />
          </Route>
          <Route path="/tabs">
            <MainTabs />
          </Route>
          <Route exact path="/">
            <Redirect to="/login" />
          </Route>
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;
