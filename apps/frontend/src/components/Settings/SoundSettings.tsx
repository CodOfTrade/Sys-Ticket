import { Volume2, VolumeX, Play, RotateCcw, Clock } from 'lucide-react';
import { useNotificationSoundStore } from '@/store/notificationSound.store';
import { useNotificationSound } from '@/hooks/useNotificationSound';

export function SoundSettings() {
  const {
    soundEnabled,
    soundVolume,
    repeatEnabled,
    repeatCount,
    repeatIntervalSeconds,
    slaAlertEnabled,
    slaFirstResponseWarningMinutes,
    slaResolutionWarningMinutes,
    slaBreachSoundEnabled,
    slaBreachRepeatEnabled,
    setSoundEnabled,
    setSoundVolume,
    setRepeatEnabled,
    setRepeatCount,
    setRepeatIntervalSeconds,
    setSlaAlertEnabled,
    setSlaFirstResponseWarningMinutes,
    setSlaResolutionWarningMinutes,
    setSlaBreachSoundEnabled,
    setSlaBreachRepeatEnabled,
    resetToDefaults,
  } = useNotificationSoundStore();

  const { testSound, testSoundWithRepeat } = useNotificationSound();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            Sons e Alertas
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Configure sons de notificacao e alertas de SLA
          </p>
        </div>
        <button
          onClick={resetToDefaults}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1"
        >
          <RotateCcw className="w-4 h-4" />
          Restaurar Padrao
        </button>
      </div>

      {/* Configurações Gerais de Som */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <h4 className="font-medium text-gray-900 dark:text-white">Configuracoes Gerais</h4>

        {/* Habilitar sons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {soundEnabled ? (
              <Volume2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            ) : (
              <VolumeX className="w-5 h-5 text-gray-400" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Habilitar sons de notificacao
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Toca um som quando novas notificacoes chegam
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => setSoundEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Volume */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-900 dark:text-white">
              Volume: {soundVolume}%
            </label>
            <button
              onClick={() => testSound()}
              disabled={!soundEnabled && soundVolume === 0}
              className="text-xs px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-3 h-3" />
              Testar
            </button>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={soundVolume}
            onChange={(e) => setSoundVolume(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>
      </div>

      {/* Configurações de Repetição */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <h4 className="font-medium text-gray-900 dark:text-white">Repeticao de Som</h4>

        {/* Habilitar repetição */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Repetir som para alertas criticos
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Repete o som varias vezes para notificacoes importantes
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={repeatEnabled}
              onChange={(e) => setRepeatEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {repeatEnabled && (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
            {/* Número de repetições */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Numero de repeticoes
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={repeatCount}
                onChange={(e) => setRepeatCount(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Intervalo entre repetições */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Intervalo (segundos)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={repeatIntervalSeconds}
                onChange={(e) => setRepeatIntervalSeconds(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Botão testar com repetição */}
            <div className="col-span-2">
              <button
                onClick={() => testSoundWithRepeat()}
                disabled={!soundEnabled}
                className="text-sm px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4" />
                Testar com Repeticao ({repeatCount}x)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Configurações de SLA */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Alertas de SLA
        </h4>

        {/* Habilitar alertas de SLA */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Habilitar alertas de SLA
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Receber notificacoes quando SLA esta proximo de vencer
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={slaAlertEnabled}
              onChange={(e) => setSlaAlertEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {slaAlertEnabled && (
          <>
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
              {/* Minutos antes para alertar primeira resposta */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Alerta 1a Resposta (min)
                </label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={slaFirstResponseWarningMinutes}
                  onChange={(e) => setSlaFirstResponseWarningMinutes(parseInt(e.target.value) || 30)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Alertar X minutos antes de vencer
                </p>
              </div>

              {/* Minutos antes para alertar resolução */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Alerta Resolucao (min)
                </label>
                <input
                  type="number"
                  min="5"
                  max="240"
                  value={slaResolutionWarningMinutes}
                  onChange={(e) => setSlaResolutionWarningMinutes(parseInt(e.target.value) || 60)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Alertar X minutos antes de vencer
                </p>
              </div>
            </div>

            {/* Som para SLA violado */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Som especial para SLA violado
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Destaca notificacoes de SLA que ja venceram
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={slaBreachSoundEnabled}
                  onChange={(e) => setSlaBreachSoundEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Repetir som para SLA violado */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Repetir som quando SLA viola
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Repete o som para garantir que voce veja
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={slaBreachRepeatEnabled}
                  onChange={(e) => setSlaBreachRepeatEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </>
        )}
      </div>

      {/* Info Box */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>Dica:</strong> Os sons so tocam quando a pagina esta aberta no navegador.
          Se voce fechar a aba, nao recebera alertas sonoros.
        </p>
      </div>
    </div>
  );
}

export default SoundSettings;
