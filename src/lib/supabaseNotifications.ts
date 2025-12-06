import { supabase } from './supabase';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { RealtimeChannel } from '@supabase/supabase-js';

const isNativePlatform = () => Capacitor.isNativePlatform();

let notificationChannel: RealtimeChannel | null = null;

export const initializeSupabaseNotifications = async (userId?: number | string) => {
  console.log('Initializing Supabase notifications for user:', userId);

  // Clean up existing subscription if any
  if (notificationChannel) {
    supabase.removeChannel(notificationChannel);
    notificationChannel = null;
  }

  // Request permissions first
  let permissionGranted = false;
  if (isNativePlatform()) {
    const permissions = await LocalNotifications.requestPermissions();
    permissionGranted = permissions.display === 'granted';
  } else {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      permissionGranted = permission === 'granted';
    }
  }

  if (!permissionGranted) {
    console.warn('Notification permissions not granted.');
    return;
  }

  // Define the filter
  // If userId is provided, we filter by user_id. 
  // If not, we might not want to subscribe to ALL notifications (security/noise), 
  // but for now we'll leave it as "no filter" or just return if no user.
  
  if (!userId) {
    console.log('No user ID provided, skipping subscription.');
    return;
  }

  // Subscribe to the 'notifications' table
  notificationChannel = supabase
    .channel('public:notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`, 
      },
      (payload) => {
        console.log('New notification received:', payload);
        const { title, message } = payload.new;
        showNotification(title, message);
      }
    )
    .subscribe((status) => {
      console.log('Supabase subscription status:', status);
    });

  return () => {
    if (notificationChannel) {
      supabase.removeChannel(notificationChannel);
    }
  };
};

const showNotification = async (title: string, body: string) => {
  if (isNativePlatform()) {
    await LocalNotifications.schedule({
      notifications: [
        {
          title,
          body,
          id: new Date().getTime(),
          schedule: { at: new Date(Date.now() + 100) }, // Schedule for immediate display
          sound: undefined,
          attachments: undefined,
          actionTypeId: "",
          extra: null
        }
      ]
    });
  } else {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  }
};
