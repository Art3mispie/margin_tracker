import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { AppState } from './AppContext';

// Show notifications while the app is foregrounded too.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const CHANNEL_ID = 'reminders';

async function ensureChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

/** Ask for permission, requesting it the first time. Returns whether granted. */
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (current.canAskAgain === false) return false;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  } catch {
    return false;
  }
}

function parseTime(value: string): { hour: number; minute: number } {
  const [h, m] = value.split(':').map(Number);
  return { hour: h || 0, minute: m || 0 };
}

/**
 * Reconcile all scheduled local notifications with the current settings.
 * Cancels everything and reschedules: daily morning/evening prompts and a
 * per-idea reminder on the morning of each upcoming due date.
 */
export async function syncNotifications(state: AppState): Promise<void> {
  try {
    const anyOn = state.notifMorning || state.notifEvening || state.notifDue;
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!anyOn) return;

    const granted = await ensureNotificationPermission();
    if (!granted) return;
    await ensureChannel();

    if (state.notifMorning) {
      const { hour, minute } = parseTime(state.notifMorningTime);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Plan your day',
          body: 'Pick the few things you want to focus on today.',
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          channelId: CHANNEL_ID,
        },
      });
    }

    if (state.notifEvening) {
      const { hour, minute } = parseTime(state.notifEveningTime);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Evening check-in',
          body: 'Tick off what you finished today.',
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          channelId: CHANNEL_ID,
        },
      });
    }

    if (state.notifDue) {
      const now = Date.now();
      const upcoming = state.ideas.filter(i => !i.archived && i.due && i.due > now);
      for (const idea of upcoming) {
        const when = new Date(idea.due as number);
        when.setHours(9, 0, 0, 0); // morning of the due date
        if (when.getTime() <= now) continue;
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Due today',
            body: idea.title || 'An idea is due today.',
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: when,
            channelId: CHANNEL_ID,
          },
        });
      }
    }
  } catch {
    // Scheduling failures (e.g. permission revoked) must never crash the app.
  }
}
