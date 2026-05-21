import { useState, useRef } from 'react';
import { Upload, Camera, X, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PhotoUploadProps {
  employeeId: string;
  currentPhotoUrl?: string;
  onPhotoUploaded: (url: string) => void;
}

export function PhotoUpload({ employeeId, currentPhotoUrl, onPhotoUploaded }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'La photo ne doit pas dépasser 5 Mo' });
      return;
    }

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Veuillez sélectionner une image valide' });
      return;
    }

    setMessage(null);
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${employeeId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      if (currentPhotoUrl) {
        const oldPath = currentPhotoUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage.from('employee-photos').remove([oldPath]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('employee-photos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('employee-photos')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('employees')
        .update({ photo_url: publicUrl })
        .eq('id', employeeId);

      if (updateError) throw updateError;

      setPreview(publicUrl);
      onPhotoUploaded(publicUrl);
      setMessage({ type: 'success', text: 'Photo mise à jour avec succès' });
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      setMessage({ type: 'error', text: error.message || 'Erreur lors de l\'upload' });
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!currentPhotoUrl) return;

    setUploading(true);
    setMessage(null);

    try {
      const oldPath = currentPhotoUrl.split('/').pop();
      if (oldPath) {
        await supabase.storage.from('employee-photos').remove([oldPath]);
      }

      const { error: updateError } = await supabase
        .from('employees')
        .update({ photo_url: null })
        .eq('id', employeeId);

      if (updateError) throw updateError;

      setPreview(null);
      onPhotoUploaded('');
      setMessage({ type: 'success', text: 'Photo supprimée avec succès' });
    } catch (error: any) {
      console.error('Error removing photo:', error);
      setMessage({ type: 'error', text: error.message || 'Erreur lors de la suppression' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
      <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
        <Camera className="w-5 h-5" />
        Photo de profil
      </h3>

      <div className="flex flex-col md:flex-row items-start gap-4">
        <div className="relative">
          {preview ? (
            <div className="relative group">
              <img
                src={preview}
                alt="Photo de profil"
                className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
              />
              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={uploading}
                className="absolute top-0 right-0 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition opacity-0 group-hover:opacity-100 disabled:opacity-50"
                title="Supprimer la photo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-snh-green to-snh-green-dark flex items-center justify-center text-white text-4xl font-bold shadow-lg">
              <Camera className="w-12 h-12" />
            </div>
          )}
        </div>

        <div className="flex-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 bg-snh-green text-white rounded-lg hover:bg-snh-green-dark transition disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {uploading ? 'Upload en cours...' : preview ? 'Changer la photo' : 'Ajouter une photo'}
            </button>
            <p className="text-xs text-slate-600">
              Formats acceptés : JPG, PNG, WEBP (max 5 Mo)
            </p>
          </div>

          {message && (
            <div className={`mt-3 p-3 rounded-lg flex items-start gap-2 text-sm ${
              message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              )}
              <span>{message.text}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
