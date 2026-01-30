import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface NotificationSoundConfig {
  // Configurações gerais de som
  soundEnabled: boolean;
  soundVolume: number; // 0-100

  // Configurações de repetição
  repeatEnabled: boolean;
  repeatCount: number; // 1-10
  repeatIntervalSeconds: number; // 1-30

  // Configurações específicas de SLA
  slaAlertEnabled: boolean;
  slaFirstResponseWarningMinutes: number; // Minutos antes para alertar (5-120)
  slaResolutionWarningMinutes: number; // Minutos antes para alertar (5-240)
  slaBreachSoundEnabled: boolean; // Som especial quando SLA viola
  slaBreachRepeatEnabled: boolean; // Repetir som quando SLA viola
}

interface NotificationSoundStore extends NotificationSoundConfig {
  // Ações
  setSoundEnabled: (enabled: boolean) => void;
  setSoundVolume: (volume: number) => void;
  setRepeatEnabled: (enabled: boolean) => void;
  setRepeatCount: (count: number) => void;
  setRepeatIntervalSeconds: (interval: number) => void;
  setSlaAlertEnabled: (enabled: boolean) => void;
  setSlaFirstResponseWarningMinutes: (minutes: number) => void;
  setSlaResolutionWarningMinutes: (minutes: number) => void;
  setSlaBreachSoundEnabled: (enabled: boolean) => void;
  setSlaBreachRepeatEnabled: (enabled: boolean) => void;
  resetToDefaults: () => void;
}

const defaultConfig: NotificationSoundConfig = {
  soundEnabled: true,
  soundVolume: 70,
  repeatEnabled: true,
  repeatCount: 3,
  repeatIntervalSeconds: 5,
  slaAlertEnabled: true,
  slaFirstResponseWarningMinutes: 30,
  slaResolutionWarningMinutes: 60,
  slaBreachSoundEnabled: true,
  slaBreachRepeatEnabled: true,
};

export const useNotificationSoundStore = create<NotificationSoundStore>()(
  persist(
    (set) => ({
      ...defaultConfig,

      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      setSoundVolume: (volume) => set({ soundVolume: Math.max(0, Math.min(100, volume)) }),
      setRepeatEnabled: (enabled) => set({ repeatEnabled: enabled }),
      setRepeatCount: (count) => set({ repeatCount: Math.max(1, Math.min(10, count)) }),
      setRepeatIntervalSeconds: (interval) =>
        set({ repeatIntervalSeconds: Math.max(1, Math.min(30, interval)) }),
      setSlaAlertEnabled: (enabled) => set({ slaAlertEnabled: enabled }),
      setSlaFirstResponseWarningMinutes: (minutes) =>
        set({ slaFirstResponseWarningMinutes: Math.max(5, Math.min(120, minutes)) }),
      setSlaResolutionWarningMinutes: (minutes) =>
        set({ slaResolutionWarningMinutes: Math.max(5, Math.min(240, minutes)) }),
      setSlaBreachSoundEnabled: (enabled) => set({ slaBreachSoundEnabled: enabled }),
      setSlaBreachRepeatEnabled: (enabled) => set({ slaBreachRepeatEnabled: enabled }),
      resetToDefaults: () => set(defaultConfig),
    }),
    {
      name: 'sys-ticket-notification-sound',
    }
  )
);
