import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Upload, 
  AudioWaveform, 
  X, 
  CheckCircle, 
  AlertCircle,
  Music,
  File
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AudioUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (audioUrl: string) => void;
}

interface UploadState {
  status: 'idle' | 'uploading' | 'success' | 'error';
  progress: number;
  fileName?: string;
  fileSize?: number;
  error?: string;
}

export function AudioUploadModal({ isOpen, onClose, onUploadComplete }: AudioUploadModalProps) {
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle', progress: 0 });
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const acceptedTypes = ['.mp3', '.wav', '.m4a', '.aac', '.ogg'];
  const maxFileSize = 50 * 1024 * 1024; // 50MB

  const validateFile = (file: File): string | null => {
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedTypes.includes(fileExtension)) {
      return `File type not supported. Please upload: ${acceptedTypes.join(', ')}`;
    }
    if (file.size > maxFileSize) {
      return `File too large. Maximum size is 50MB.`;
    }
    return null;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const uploadFile = async (file: File) => {
    try {
      setUploadState({ status: 'uploading', progress: 0, fileName: file.name, fileSize: file.size });

      // Get upload parameters
      const response = await apiRequest("/api/objects/upload", "POST");
      const data = await response.json();

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + Math.random() * 20, 90)
        }));
      }, 200);

      // Upload file
      const uploadResponse = await fetch(data.uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          // Must match the contentType used when signing the URL on the server
          'Content-Type': 'application/octet-stream',
        },
      });

      clearInterval(progressInterval);

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      // Normalize the path
      const normalizeResponse = await apiRequest("/api/objects/normalize-path", "POST", { 
        uploadURL: data.uploadURL 
      });
      const normalizeData = await normalizeResponse.json();

      setUploadState({ status: 'success', progress: 100, fileName: file.name, fileSize: file.size });

      setTimeout(() => {
        onUploadComplete(normalizeData.objectPath);
        handleClose();
      }, 1000);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadState({ 
        status: 'error', 
        progress: 0, 
        fileName: file.name, 
        fileSize: file.size,
        error: 'Upload failed. Please try again.' 
      });
    }
  };

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const error = validateFile(file);
    
    if (error) {
      toast({
        title: "Invalid file",
        description: error,
        variant: "destructive",
      });
      return;
    }

    uploadFile(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  }, [handleFileSelect]);

  const handleClose = () => {
    setUploadState({ status: 'idle', progress: 0 });
    setIsDragOver(false);
    onClose();
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-music-secondary border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center text-white">
            <Music className="mr-2 h-5 w-5 text-music-accent" />
            Upload Audio File
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Select an audio file to transform into a different musical style
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {uploadState.status === 'idle' && (
            <div
              className={`
                relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
                ${isDragOver 
                  ? 'border-music-accent bg-music-accent/10 scale-105' 
                  : 'border-gray-600 hover:border-music-accent hover:bg-music-accent/5'
                }
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={openFileDialog}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={acceptedTypes.join(',')}
                onChange={handleFileInputChange}
                className="hidden"
              />
              
              <div className="space-y-4">
                <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
                  isDragOver ? 'bg-music-accent' : 'bg-music-accent/20'
                }`}>
                  <Upload className={`h-8 w-8 ${isDragOver ? 'text-white' : 'text-music-accent'}`} />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white">
                    {isDragOver ? 'Drop your audio file here' : 'Drag & drop your audio file'}
                  </h3>
                  <p className="text-gray-400">
                    or click to browse your files
                  </p>
                </div>
                
                <div className="space-y-1 text-sm text-gray-500">
                  <p>Supported formats: {acceptedTypes.join(', ')}</p>
                  <p>Maximum file size: 50MB</p>
                </div>
              </div>
            </div>
          )}

          {uploadState.status === 'uploading' && (
            <div className="space-y-4 p-6 bg-gray-800/50 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-music-accent/20 rounded-lg flex items-center justify-center">
                  <AudioWaveform className="h-6 w-6 text-music-accent animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{uploadState.fileName}</p>
                  <p className="text-gray-400 text-sm">{uploadState.fileSize && formatFileSize(uploadState.fileSize)}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Uploading...</span>
                  <span className="text-music-accent">{Math.round(uploadState.progress)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-music-accent h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadState.progress}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {uploadState.status === 'success' && (
            <div className="space-y-4 p-6 bg-green-900/20 border border-green-700 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{uploadState.fileName}</p>
                  <p className="text-green-400 text-sm">Upload completed successfully!</p>
                </div>
              </div>
            </div>
          )}

          {uploadState.status === 'error' && (
            <div className="space-y-4 p-6 bg-red-900/20 border border-red-700 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{uploadState.fileName}</p>
                  <p className="text-red-400 text-sm">{uploadState.error}</p>
                </div>
              </div>
              
              <Button
                onClick={() => setUploadState({ status: 'idle', progress: 0 })}
                className="w-full bg-music-accent hover:bg-music-accent/80"
              >
                Try Again
              </Button>
            </div>
          )}

          {uploadState.status === 'idle' && (
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
              <Button variant="outline" onClick={handleClose} className="border-gray-600 text-gray-300">
                Cancel
              </Button>
              <Button onClick={openFileDialog} className="bg-music-accent hover:bg-music-accent/80">
                <File className="mr-2 h-4 w-4" />
                Browse Files
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
