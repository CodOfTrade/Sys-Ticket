import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Trash2, ImageIcon, FileText, Monitor, LogIn, Info, Loader2 } from 'lucide-react';
import { settingsService, LogosData } from '@/services/settings.service';

interface LogoUploadCardProps {
  title: string;
  description: string;
  sizeHint: string;
  icon: React.ElementType;
  logoUrl: string | null;
  logoType: 'report' | 'system' | 'login';
  onUpload: (type: 'report' | 'system' | 'login', file: File) => void;
  onRemove: (type: 'report' | 'system' | 'login') => void;
  isUploading: boolean;
  isRemoving: boolean;
}

function LogoUploadCard({
  title,
  description,
  sizeHint,
  icon: Icon,
  logoUrl,
  logoType,
  onUpload,
  onRemove,
  isUploading,
  isRemoving,
}: LogoUploadCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.includes('png')) {
        alert('Apenas arquivos PNG sao permitidos');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        alert('Arquivo muito grande. Maximo 2MB');
        return;
      }
      onUpload(logoType, file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.includes('png')) {
        alert('Apenas arquivos PNG sao permitidos');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        alert('Arquivo muito grande. Maximo 2MB');
        return;
      }
      onUpload(logoType, file);
    }
  };

  const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || '';

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
        </div>
      </div>

      {/* Size hint */}
      <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
        <span className="text-sm text-blue-700 dark:text-blue-300">{sizeHint}</span>
      </div>

      {/* Preview ou Upload area */}
      {logoUrl ? (
        <div className="space-y-4">
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
            <img
              src={`${baseUrl}${logoUrl}`}
              alt={title}
              className="max-h-24 object-contain"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Alterar
            </button>
            <button
              onClick={() => onRemove(logoType)}
              disabled={isRemoving}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isRemoving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Remover
            </button>
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${
              dragOver
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
            }
          `}
        >
          {isUploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-2" />
              <span className="text-gray-600 dark:text-gray-400">Enviando...</span>
            </div>
          ) : (
            <>
              <ImageIcon className="w-10 h-10 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
              <p className="text-gray-600 dark:text-gray-400">
                Arraste uma imagem ou <span className="text-blue-600 dark:text-blue-400">clique para selecionar</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">PNG, max 2MB</p>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}

export function LogoSettings() {
  const queryClient = useQueryClient();
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [removingType, setRemovingType] = useState<string | null>(null);

  const { data: logos, isLoading } = useQuery<LogosData>({
    queryKey: ['settings', 'logos'],
    queryFn: () => settingsService.getLogos(),
  });

  const uploadMutation = useMutation({
    mutationFn: ({ type, file }: { type: 'report' | 'system' | 'login'; file: File }) =>
      settingsService.uploadLogo(type, file),
    onMutate: ({ type }) => {
      setUploadingType(type);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'logos'] });
    },
    onSettled: () => {
      setUploadingType(null);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (type: 'report' | 'system' | 'login') => settingsService.removeLogo(type),
    onMutate: (type) => {
      setRemovingType(type);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'logos'] });
    },
    onSettled: () => {
      setRemovingType(null);
    },
  });

  const handleUpload = (type: 'report' | 'system' | 'login', file: File) => {
    uploadMutation.mutate({ type, file });
  };

  const handleRemove = (type: 'report' | 'system' | 'login') => {
    if (confirm('Tem certeza que deseja remover esta logo?')) {
      removeMutation.mutate(type);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Identidade Visual
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Configure as logos da sua empresa para diferentes areas do sistema.
          Todas as imagens devem estar no formato PNG.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <LogoUploadCard
          title="Logo para Relatorios"
          description="Exibida no cabecalho de relatorios PDF e apontamentos offline."
          sizeHint="Tamanho recomendado: 300x100px (proporcao 3:1)"
          icon={FileText}
          logoUrl={logos?.logo_report || null}
          logoType="report"
          onUpload={handleUpload}
          onRemove={handleRemove}
          isUploading={uploadingType === 'report'}
          isRemoving={removingType === 'report'}
        />

        <LogoUploadCard
          title="Logo do Sistema"
          description="Exibida no header e na barra lateral do sistema."
          sizeHint="Tamanho recomendado: 180x50px (proporcao 3.6:1)"
          icon={Monitor}
          logoUrl={logos?.logo_system || null}
          logoType="system"
          onUpload={handleUpload}
          onRemove={handleRemove}
          isUploading={uploadingType === 'system'}
          isRemoving={removingType === 'system'}
        />

        <LogoUploadCard
          title="Logo de Login"
          description="Exibida na pagina de login do sistema."
          sizeHint="Tamanho recomendado: 250x80px (proporcao 3.1:1)"
          icon={LogIn}
          logoUrl={logos?.logo_login || null}
          logoType="login"
          onUpload={handleUpload}
          onRemove={handleRemove}
          isUploading={uploadingType === 'login'}
          isRemoving={removingType === 'login'}
        />
      </div>
    </div>
  );
}
