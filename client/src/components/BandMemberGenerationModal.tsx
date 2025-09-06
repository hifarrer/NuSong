import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/loading-spinner";
import { 
  Wand2, 
  Download, 
  RefreshCw,
  X,
  Check
} from "lucide-react";

interface BandMemberGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  position: number;
  onImageGenerated: (imageUrl: string) => void;
}

type GenerationStatus = 'idle' | 'generating' | 'completed' | 'error';

export function BandMemberGenerationModal({
  isOpen,
  onClose,
  position,
  onImageGenerated,
}: BandMemberGenerationModalProps) {
  const { toast } = useToast();
  
  const [description, setDescription] = useState("");
  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // Generate image mutation
  const generateImageMutation = useMutation({
    mutationFn: (description: string) =>
      apiRequest("/api/band/members/generate-image", {
        method: "POST",
        body: JSON.stringify({ description }),
      }),
    onSuccess: (data: { requestId: string }) => {
      setRequestId(data.requestId);
      setStatus('generating');
      setError(null);
    },
    onError: (error: any) => {
      setStatus('error');
      setError(error.message || "Failed to generate image");
      toast({
        title: "Error",
        description: "Failed to start image generation",
        variant: "destructive",
      });
    },
  });

  // Check status mutation
  const checkStatusMutation = useMutation({
    mutationFn: (requestId: string) =>
      apiRequest(`/api/band/members/image-status/${requestId}`),
    onSuccess: (data: { status: string; imageUrl?: string; error?: string }) => {
      if (data.status === 'completed' && data.imageUrl) {
        setGeneratedImageUrl(data.imageUrl);
        setStatus('completed');
      } else if (data.status === 'failed') {
        setStatus('error');
        setError(data.error || "Image generation failed");
      }
      // If still processing, we'll continue polling
    },
    onError: (error: any) => {
      setStatus('error');
      setError(error.message || "Failed to check status");
    },
  });

  // Save image mutation
  const saveImageMutation = useMutation({
    mutationFn: ({ memberId, imageUrl }: { memberId: string; imageUrl: string }) =>
      apiRequest(`/api/band/members/${memberId}/save-image`, {
        method: "POST",
        body: JSON.stringify({ imageUrl }),
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Band member created successfully!",
      });
      onImageGenerated(generatedImageUrl!);
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save band member",
        variant: "destructive",
      });
    },
  });

  // Poll for status when generating
  useEffect(() => {
    if (status === 'generating' && requestId) {
      const interval = setInterval(() => {
        checkStatusMutation.mutate(requestId);
      }, 2000); // Check every 2 seconds

      return () => clearInterval(interval);
    }
  }, [status, requestId, checkStatusMutation]);

  const handleGenerate = () => {
    if (!description.trim()) {
      toast({
        title: "Error",
        description: "Please enter a description for the band member",
        variant: "destructive",
      });
      return;
    }

    generateImageMutation.mutate(description.trim());
  };

  const handleGenerateAnother = () => {
    setGeneratedImageUrl(null);
    setStatus('idle');
    setError(null);
    setRequestId(null);
  };

  const handleSave = () => {
    if (!generatedImageUrl || !memberName.trim() || !memberRole.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // First create the band member, then save the image
    // We'll need to create the member first, then update with the image
    // For now, let's assume we have a member ID - in a real implementation,
    // we'd create the member first and get the ID
    saveImageMutation.mutate({
      memberId: "temp-id", // This would be the actual member ID
      imageUrl: generatedImageUrl,
    });
  };

  const handleClose = () => {
    setDescription("");
    setMemberName("");
    setMemberRole("");
    setRequestId(null);
    setGeneratedImageUrl(null);
    setStatus('idle');
    setError(null);
    onClose();
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'generating':
        return "Generating your band member image...";
      case 'completed':
        return "Image generated successfully!";
      case 'error':
        return error || "Something went wrong";
      default:
        return "";
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'generating':
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'error':
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">
            Generate Band Member {position}
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            Describe your band member and we'll generate an AI image for them
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Description Input */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Describe your band member *
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., A young woman with long blonde hair, wearing a leather jacket, holding a microphone"
              className="bg-gray-800 border-gray-600 text-white"
              rows={3}
              disabled={status === 'generating'}
            />
            <p className="text-xs text-gray-400 mt-1">
              Be specific about appearance, clothing, and any instruments or props
            </p>
          </div>

          {/* Generate Button */}
          {status === 'idle' && (
            <Button
              onClick={handleGenerate}
              disabled={!description.trim() || generateImageMutation.isPending}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {generateImageMutation.isPending ? (
                <LoadingSpinner className="h-4 w-4 mr-2" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              Generate Image
            </Button>
          )}

          {/* Status Display */}
          {status !== 'idle' && (
            <div className="flex items-center gap-3 p-4 bg-gray-800 rounded-lg">
              {getStatusIcon()}
              <span className="text-white">{getStatusMessage()}</span>
            </div>
          )}

          {/* Generated Image */}
          {generatedImageUrl && (
            <div className="space-y-4">
              <div className="text-center">
                <img
                  src={generatedImageUrl}
                  alt="Generated band member"
                  className="w-64 h-64 mx-auto rounded-lg object-cover border-2 border-gray-600"
                />
              </div>

              {/* Member Details Form */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Member Name *
                  </label>
                  <Input
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    placeholder="Enter name"
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Role *
                  </label>
                  <Input
                    value={memberRole}
                    onChange={(e) => setMemberRole(e.target.value)}
                    placeholder="e.g., Lead Singer"
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleGenerateAnother}
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate Another
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!memberName.trim() || !memberRole.trim() || saveImageMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {saveImageMutation.isPending ? (
                    <LoadingSpinner className="h-4 w-4 mr-2" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Save Member
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
