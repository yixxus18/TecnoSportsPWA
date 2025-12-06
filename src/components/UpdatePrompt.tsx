import React from 'react';
import { IonToast, IonButton } from '@ionic/react';
import { useServiceWorkerUpdate } from '../hooks/useServiceWorkerUpdate';

export const UpdatePrompt: React.FC = () => {
  const { needRefresh, offlineReady, acceptUpdate, dismissUpdate, dismissOfflineReady } = useServiceWorkerUpdate();

  return (
    <>
      {/* Offline Ready Toast */}
      <IonToast
        isOpen={offlineReady}
        message="📱 La app está lista para uso sin conexión"
        duration={3000}
        position="bottom"
        color="success"
        onDidDismiss={dismissOfflineReady}
      />

      {/* Update Available Toast */}
      <IonToast
        isOpen={needRefresh}
        message="🆕 Nueva versión disponible"
        position="bottom"
        color="primary"
        buttons={[
          {
            text: 'Más tarde',
            role: 'cancel',
            handler: dismissUpdate,
          },
          {
            text: 'Actualizar',
            handler: acceptUpdate,
          },
        ]}
      />
    </>
  );
};

export default UpdatePrompt;
