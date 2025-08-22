import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { WandSparkles, RotateCcw, Copy } from "lucide-react";

interface LyricsGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUseLyrics: (lyrics: string) => void;
}

export function LyricsGeneratorModal({ isOpen, onClose, onUseLyrics }: LyricsGeneratorModalProps) {
  const [prompt, setPrompt] = useState("");
  const [generatedLyrics, setGeneratedLyrics] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please enter what your song is about.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await apiRequest("/api/generate-lyrics", "POST", { prompt: prompt.trim() });
      const data = await response.json();
      setGeneratedLyrics(data.lyrics);
    } catch (error) {
      console.error('Error generating lyrics:', error);
      toast({
        title: "Generation failed",
        description: "Failed to generate lyrics. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseLyrics = () => {
    if (generatedLyrics.trim()) {
      onUseLyrics(generatedLyrics);
      onClose();
      toast({
        title: "Lyrics added",
        description: "The generated lyrics have been added to your song.",
      });
    }
  };

  const handleCopyLyrics = async () => {
    if (generatedLyrics.trim()) {
      try {
        await navigator.clipboard.writeText(generatedLyrics);
        toast({
          title: "Copied",
          description: "Lyrics copied to clipboard.",
        });
      } catch (error) {
        toast({
          title: "Copy failed",
          description: "Failed to copy lyrics to clipboard.",
          variant: "destructive",
        });
      }
    }
  };

  const handleClose = () => {
    setPrompt("");
    setGeneratedLyrics("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-music-secondary border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center text-music-blue">
            <WandSparkles className="mr-2 h-5 w-5" />
            AI Lyrics Generator
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Generate custom lyrics for your music using AI. Describe what your song is about and get professionally structured lyrics.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Prompt Input */}
          <div className="space-y-2">
            <Label htmlFor="song-prompt" className="text-sm font-medium text-gray-300">
              What is your song about?
            </Label>
            <Input
              id="song-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., a summer romance, overcoming challenges, city nightlife..."
              className="bg-music-dark border-gray-600 text-white placeholder-gray-400 focus:border-music-purple"
              data-testid="input-lyrics-prompt"
            />
          </div>

          {/* Generate Button */}
          <div className="flex gap-3">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="flex-1 bg-gradient-to-r from-music-purple to-music-blue hover:from-purple-600 hover:to-blue-600"
              data-testid="button-generate-lyrics"
            >
              {isGenerating ? (
                <LoadingSpinner />
              ) : (
                <WandSparkles className="mr-2 h-4 w-4" />
              )}
              {isGenerating ? "Generating..." : "Generate Lyrics"}
            </Button>
            
            {generatedLyrics && (
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                variant="outline"
                className="border-gray-600 hover:border-music-accent"
                data-testid="button-regenerate-lyrics"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Generated Lyrics */}
          {generatedLyrics && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-gray-300">Generated Lyrics</Label>
                <Button
                  onClick={handleCopyLyrics}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                  data-testid="button-copy-lyrics"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
              </div>
              <Textarea
                value={generatedLyrics}
                onChange={(e) => setGeneratedLyrics(e.target.value)}
                rows={12}
                className="bg-music-dark border-gray-600 text-white resize-none font-mono text-sm"
                data-testid="textarea-generated-lyrics"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-700">
            <Button
              onClick={handleClose}
              variant="outline"
              className="flex-1 border-gray-600 hover:border-gray-500"
              data-testid="button-cancel-lyrics"
            >
              Cancel
            </Button>
            {generatedLyrics && (
              <Button
                onClick={handleUseLyrics}
                className="flex-1 bg-music-green hover:bg-green-600"
                data-testid="button-use-lyrics"
              >
                Use These Lyrics
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}