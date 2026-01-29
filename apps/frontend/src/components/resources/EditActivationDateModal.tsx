import { useState } from 'react';
import { X, Save, Calendar, Loader2 } from 'lucide-react';
import { format, add } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EditActivationDateModalProps {
  currentDate: string;
  durationValue: number;
  durationType: 'months' | 'years';
  onSave: (newDate: string) => void;
  onClose: () => void;
  isSaving: boolean;
}

export function EditActivationDateModal({
  currentDate,
  durationValue,
  durationType,
  onSave,
  onClose,
  isSaving,
}: EditActivationDateModalProps) {
  const [newDate, setNewDate] = useState(currentDate);

  const calculateExpiryDate = (activationDate: string) => {
    if (!activationDate) return null;
    try {
      const date = new Date(activationDate + 'T00:00:00');
      const expiryDate = add(date, durationType === 'months' ? { months: durationValue } : { years: durationValue });
      return format(expiryDate, 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return null;
    }
  };

  const expiryPreview = calculateExpiryDate(newDate);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm m-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Calendar className="text-blue-600" size={20} />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Editar Data de Ativação
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Data de Ativação
            </label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <p className="text-xs text-gray-500 mt-1">
              Início da contagem ({durationValue} {durationType === 'months' ? 'meses' : 'anos'})
            </p>
          </div>

          {expiryPreview && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <span className="font-medium">Nova data de expiração:</span>{' '}
                <span className="font-bold">{expiryPreview}</span>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(newDate)}
            disabled={isSaving || !newDate || newDate === currentDate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
