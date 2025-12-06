// import OneSignal from 'react-onesignal';

// export const initializeOneSignal = async (userId?: string) => {
//   try {
//     await OneSignal.init({
//       appId: "a24bda3d-8ab0-4059-95cf-10a8c60bac9a",
//       allowLocalhostAsSecureOrigin: true,
//     });

//     if (userId) {
//       await OneSignal.login(userId);
//     }

//     // Solicitar permiso si no se ha concedido
//     await OneSignal.Slidedown.promptPush();
//   } catch (error) {
//     console.error('Error initializing OneSignal:', error);
//   }
// };
