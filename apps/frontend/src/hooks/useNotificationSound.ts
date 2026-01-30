import { useCallback, useRef } from 'react';
import { useNotificationSoundStore } from '../store/notificationSound.store';

// Tipos de notificação que são considerados críticos (devem repetir)
const CRITICAL_NOTIFICATION_TYPES = [
  'SLA_FIRST_RESPONSE_BREACH',
  'SLA_RESOLUTION_BREACH',
  'LICENSE_EXPIRED',
  'RESOURCE_OFFLINE_24H',
];

// Tipos de notificação de SLA
const SLA_NOTIFICATION_TYPES = [
  'SLA_FIRST_RESPONSE_WARNING',
  'SLA_FIRST_RESPONSE_BREACH',
  'SLA_RESOLUTION_WARNING',
  'SLA_RESOLUTION_BREACH',
];

interface PlaySoundOptions {
  notificationType?: string;
  forceRepeat?: boolean;
  skipRepeat?: boolean;
}

export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const repeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const repeatCountRef = useRef<number>(0);

  const {
    soundEnabled,
    soundVolume,
    repeatEnabled,
    repeatCount,
    repeatIntervalSeconds,
    slaBreachSoundEnabled,
    slaBreachRepeatEnabled,
  } = useNotificationSoundStore();

  // Limpar timeouts pendentes
  const clearRepeatTimeout = useCallback(() => {
    if (repeatTimeoutRef.current) {
      clearTimeout(repeatTimeoutRef.current);
      repeatTimeoutRef.current = null;
    }
    repeatCountRef.current = 0;
  }, []);

  // Parar som atual
  const stopSound = useCallback(() => {
    clearRepeatTimeout();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [clearRepeatTimeout]);

  // Tocar som uma vez
  const playSoundOnce = useCallback(async () => {
    try {
      // Criar novo elemento de áudio se não existir
      if (!audioRef.current) {
        audioRef.current = new Audio('/sounds/notification.mp3');
      }

      const audio = audioRef.current;
      audio.volume = soundVolume / 100;
      audio.currentTime = 0;

      await audio.play();
    } catch (error) {
      // Ignorar erros de autoplay bloqueado pelo browser
      console.warn('Não foi possível tocar o som de notificação:', error);
    }
  }, [soundVolume]);

  // Tocar som com repetição
  const playSound = useCallback(
    async (options: PlaySoundOptions = {}) => {
      const { notificationType, forceRepeat = false, skipRepeat = false } = options;

      // Verificar se som está habilitado
      if (!soundEnabled) {
        return;
      }

      // Verificar se é notificação de SLA e se som de SLA está habilitado
      if (notificationType && SLA_NOTIFICATION_TYPES.includes(notificationType)) {
        if (!slaBreachSoundEnabled) {
          return;
        }
      }

      // Limpar repetição anterior
      clearRepeatTimeout();

      // Determinar se deve repetir
      const isCritical =
        notificationType && CRITICAL_NOTIFICATION_TYPES.includes(notificationType);
      const shouldRepeat =
        !skipRepeat &&
        (forceRepeat ||
          (repeatEnabled && isCritical) ||
          (slaBreachRepeatEnabled && isCritical));

      // Tocar som
      await playSoundOnce();

      // Configurar repetição se necessário
      if (shouldRepeat && repeatCount > 1) {
        repeatCountRef.current = 1;

        const scheduleNextPlay = () => {
          if (repeatCountRef.current < repeatCount) {
            repeatTimeoutRef.current = setTimeout(async () => {
              await playSoundOnce();
              repeatCountRef.current++;
              scheduleNextPlay();
            }, repeatIntervalSeconds * 1000);
          }
        };

        scheduleNextPlay();
      }
    },
    [
      soundEnabled,
      slaBreachSoundEnabled,
      slaBreachRepeatEnabled,
      repeatEnabled,
      repeatCount,
      repeatIntervalSeconds,
      playSoundOnce,
      clearRepeatTimeout,
    ]
  );

  // Testar som (para preview nas configurações)
  const testSound = useCallback(async () => {
    if (!soundEnabled) {
      // Mesmo se desabilitado, permite testar nas configurações
      try {
        if (!audioRef.current) {
          audioRef.current = new Audio('/sounds/notification.mp3');
        }
        const audio = audioRef.current;
        audio.volume = soundVolume / 100;
        audio.currentTime = 0;
        await audio.play();
      } catch (error) {
        console.warn('Não foi possível tocar o som de teste:', error);
      }
      return;
    }

    await playSound({ skipRepeat: true });
  }, [soundEnabled, soundVolume, playSound]);

  // Testar som com repetição (para preview nas configurações)
  const testSoundWithRepeat = useCallback(async () => {
    await playSound({ forceRepeat: true });
  }, [playSound]);

  return {
    playSound,
    testSound,
    testSoundWithRepeat,
    stopSound,
    isEnabled: soundEnabled,
  };
}

export default useNotificationSound;
