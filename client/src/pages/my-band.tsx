import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Header } from "@/components/Header";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Plus, 
  Edit3, 
  Trash2, 
  Upload,
  Wand2,
  Music,
  X
} from "lucide-react";

interface Band {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface BandMember {
  id: string;
  bandId: string;
  name: string;
  role: string;
  imageUrl?: string;
  description?: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

interface BandData {
  band: Band | null;
  members: BandMember[];
}

const DEFAULT_ROLES = [
  "Lead Singer",
  "Guitarist", 
  "Bassist",
  "Drummer",
  "Keyboardist",
  "Saxophonist",
  "Violinist",
  "Producer"
];

export default function MyBand() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showBandForm, setShowBandForm] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editingMember, setEditingMember] = useState<BandMember | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<number>(1);
  const [bandForm, setBandForm] = useState({ name: "", description: "" });
  const [memberForm, setMemberForm] = useState({ name: "", role: "", description: "" });
  const [memberImageUrl, setMemberImageUrl] = useState<string | null>(null);
  const [memberImageDescription, setMemberImageDescription] = useState<string>("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // Fetch user's band data
  const { data: bandData, isLoading } = useQuery({
    queryKey: ["/api/band"],
    enabled: isAuthenticated,
    retry: false,
  }) as { data: BandData | undefined; isLoading: boolean };

  // Create/update band mutation
  const createBandMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const response = await apiRequest("/api/band", "POST", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/band"] });
      setShowBandForm(false);
      setBandForm({ name: "", description: "" });
      toast({
        title: "Success",
        description: "Band updated successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update band",
        variant: "destructive",
      });
    },
  });

  // Add/update band member mutation
  const addMemberMutation = useMutation({
    mutationFn: async (data: { name: string; role: string; description?: string; position: number; imageUrl?: string }) => {
      // First create the member
      const memberResponse = await apiRequest("/api/band/members", "POST", {
        name: data.name,
        role: data.role,
        description: data.description,
        position: data.position,
      });
      const memberData = await memberResponse.json();
      
      // If there's an image, save it
      if (data.imageUrl) {
        const imageResponse = await apiRequest(`/api/band/members/${memberData.member.id}/save-image`, "POST", { imageUrl: data.imageUrl });
        await imageResponse.json();
      }
      
      return memberData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/band"] });
      setShowMemberForm(false);
      setMemberForm({ name: "", role: "", description: "" });
      setMemberImageUrl(null);
      setMemberImageDescription("");
      setEditingMember(null);
      toast({
        title: "Success",
        description: "Band member added successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add band member",
        variant: "destructive",
      });
    },
  });

  // Update band member mutation
  const updateMemberMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest(`/api/band/members/${id}`, "PUT", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/band"] });
      setShowMemberForm(false);
      setMemberForm({ name: "", role: "", description: "" });
      setEditingMember(null);
      toast({
        title: "Success",
        description: "Band member updated successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update band member",
        variant: "destructive",
      });
    },
  });

  // Delete band member mutation
  const deleteMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/band/members/${id}`, "DELETE");
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/band"] });
      toast({
        title: "Success",
        description: "Band member deleted successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete band member",
        variant: "destructive",
      });
    },
  });


  // Generate image mutation for member form
  const generateMemberImageMutation = useMutation({
    mutationFn: async (description: string) => {
      const response = await apiRequest("/api/band/members/generate-image", "POST", { description });
      return await response.json();
    },
    onSuccess: (data: { requestId: string }) => {
      // Start polling for the result
      pollForImageResult(data.requestId);
    },
    onError: (error: any) => {
      setIsGeneratingImage(false);
      toast({
        title: "Error",
        description: "Failed to generate image",
        variant: "destructive",
      });
    },
  });

  // Poll for image generation result
  const pollForImageResult = async (requestId: string) => {
    const maxAttempts = 30;
    let attempts = 0;
    
    const poll = async () => {
      try {
        const response = await apiRequest(`/api/band/members/image-status/${requestId}`, "GET");
        const data = await response.json();
        
        if (data.status === 'completed' && data.imageUrl) {
          setMemberImageUrl(data.imageUrl);
          setIsGeneratingImage(false);
          toast({
            title: "Success",
            description: "Image generated successfully!",
          });
        } else if (data.status === 'failed') {
          setIsGeneratingImage(false);
          toast({
            title: "Error",
            description: data.error || "Image generation failed",
            variant: "destructive",
          });
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 2000); // Poll every 2 seconds
        } else {
          setIsGeneratingImage(false);
          toast({
            title: "Error",
            description: "Image generation timed out",
            variant: "destructive",
          });
        }
      } catch (error: any) {
        setIsGeneratingImage(false);
        toast({
          title: "Error",
          description: "Failed to check image status",
          variant: "destructive",
        });
      }
    };
    
    poll();
  };

  const handleBandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bandForm.name.trim()) return;
    
    createBandMutation.mutate({
      name: bandForm.name.trim(),
      description: bandForm.description.trim() || undefined,
    });
  };

  const handleMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberForm.name.trim() || !memberForm.role.trim()) return;
    
    if (editingMember) {
      updateMemberMutation.mutate({
        id: editingMember.id,
        data: {
          name: memberForm.name.trim(),
          role: memberForm.role.trim(),
          description: memberForm.description.trim() || undefined,
        },
      });
    } else {
      addMemberMutation.mutate({
        name: memberForm.name.trim(),
        role: memberForm.role.trim(),
        description: memberForm.description.trim() || undefined,
        position: selectedPosition,
        imageUrl: memberImageUrl || undefined,
      });
    }
  };

  const handleEditMember = (member: BandMember) => {
    setEditingMember(member);
    setMemberForm({
      name: member.name,
      role: member.role,
      description: member.description || "",
    });
    setMemberImageUrl(member.imageUrl || null);
    setMemberImageDescription("");
    setShowMemberForm(true);
  };

  const handleGenerateImageInForm = () => {
    if (!memberImageDescription.trim()) {
      toast({
        title: "Error",
        description: "Please enter a description for the image",
        variant: "destructive",
      });
      return;
    }
    setIsGeneratingImage(true);
    generateMemberImageMutation.mutate(memberImageDescription.trim());
  };

  const handleUploadCompleteInForm = async (result: any) => {
    if (!result.successful || result.successful.length === 0) {
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
      return;
    }

    const uploadedFile = result.successful[0];
    const imageUrl = uploadedFile.uploadURL;
    
    if (!imageUrl) {
      toast({
        title: "Error",
        description: "No image URL received from upload",
        variant: "destructive",
      });
      return;
    }

    try {
      const normalizeResponse = await apiRequest('/api/objects/normalize-path', 'POST', { uploadURL: imageUrl });
      const normalizeData = await normalizeResponse.json();
      setMemberImageUrl(normalizeData.objectPath);
      toast({
        title: "Success",
        description: "Image uploaded successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to process uploaded image",
        variant: "destructive",
      });
    }
  };

  const handleClearImage = () => {
    setMemberImageUrl(null);
    setMemberImageDescription("");
  };

  const handleDeleteMember = (member: BandMember) => {
    if (confirm(`Are you sure you want to delete ${member.name}?`)) {
      deleteMemberMutation.mutate(member.id);
    }
  };


  const getAvailablePositions = () => {
    const usedPositions = bandData?.members.map(m => m.position) || [];
    return [1, 2, 3, 4].filter(pos => !usedPositions.includes(pos) || (editingMember && editingMember.position === pos));
  };

  const getMemberAtPosition = (position: number) => {
    return bandData?.members.find(m => m.position === position);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen">
        <Header currentPage="my-band" />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4">My Band</h1>
            <p className="text-gray-300">Please log in to access your band.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header currentPage="my-band" />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header currentPage="my-band" />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-white" />
              <h1 className="text-4xl font-bold text-white">My Band</h1>
            </div>
            {!bandData?.band && (
              <Button
                onClick={() => setShowBandForm(true)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Band
              </Button>
            )}
          </div>

          {!bandData?.band ? (
            <Card className="bg-music-secondary border-gray-700">
              <CardContent className="p-8 text-center">
                <Music className="h-16 w-16 text-white/50 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Band Yet</h3>
                <p className="text-gray-300 mb-6">
                  Create your band and add up to 4 members to get started!
                </p>
                <Button
                  onClick={() => setShowBandForm(true)}
                  className="bg-gradient-to-r from-music-purple to-music-blue hover:from-purple-600 hover:to-blue-600"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your Band
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {/* Band Info */}
              <Card className="bg-music-secondary border-gray-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl text-white">{bandData.band.name}</CardTitle>
                      {bandData.band.description && (
                        <p className="text-gray-300 mt-2">{bandData.band.description}</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setBandForm({
                          name: bandData.band!.name,
                          description: bandData.band!.description || "",
                        });
                        setShowBandForm(true);
                      }}
                      className="border-gray-600 text-gray-300 hover:bg-gray-800"
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              {/* Band Members */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((position) => {
                  const member = getMemberAtPosition(position);
                  const isAvailable = !member && getAvailablePositions().includes(position);
                  
                  return (
                    <Card key={position} className="bg-music-secondary border-gray-700">
                      <CardContent className="p-6">
                        <div className="text-center">
                          <h3 className="text-lg font-semibold text-white mb-4">
                            Member {position}: {member?.role || (position === 1 ? "Lead Singer" : "Optional")}
                          </h3>
                          
                          {member ? (
                            <div className="space-y-4">
                              <div className="w-32 h-32 mx-auto rounded-full overflow-hidden bg-gray-700 flex items-center justify-center">
                                {member.imageUrl ? (
                                  <img
                                    src={member.imageUrl}
                                    alt={member.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Users className="h-12 w-12 text-gray-400" />
                                )}
                              </div>
                              
                              <div>
                                <h4 className="text-xl font-semibold text-white">{member.name}</h4>
                                <p className="text-gray-300">{member.role}</p>
                                {member.description && (
                                  <p className="text-sm text-gray-400 mt-2">{member.description}</p>
                                )}
                              </div>
                              
                              <div className="flex gap-2 justify-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditMember(member)}
                                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                                >
                                  <Edit3 className="h-4 w-4 mr-2" />
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteMember(member)}
                                  className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          ) : isAvailable ? (
                            <div className="space-y-4">
                              <div className="w-32 h-32 mx-auto rounded-full bg-gray-700 flex items-center justify-center">
                                <Users className="h-12 w-12 text-gray-400" />
                              </div>
                              
                              <div className="space-y-2">
                                <Button
                                  onClick={() => {
                                    setSelectedPosition(position);
                                    setMemberImageUrl(null);
                                    setMemberImageDescription("");
                                    setShowMemberForm(true);
                                  }}
                                  className="w-full bg-gradient-to-r from-music-purple to-music-blue hover:from-purple-600 hover:to-blue-600"
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Member
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="w-32 h-32 mx-auto rounded-full bg-gray-800 flex items-center justify-center">
                              <span className="text-gray-500 text-sm">Position {position}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Band Form Modal */}
      <Dialog open={showBandForm} onOpenChange={setShowBandForm}>
        <DialogContent className="bg-music-secondary border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              {bandData?.band ? "Edit Band" : "Create Band"}
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              {bandData?.band ? "Update your band information" : "Create your band and start adding members"}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleBandSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Band Name *
              </label>
              <Input
                value={bandForm.name}
                onChange={(e) => setBandForm({ ...bandForm, name: e.target.value })}
                placeholder="Enter band name"
                className="bg-gray-800 border-gray-600 text-white"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Description
              </label>
              <Textarea
                value={bandForm.description}
                onChange={(e) => setBandForm({ ...bandForm, description: e.target.value })}
                placeholder="Describe your band (optional)"
                className="bg-gray-800 border-gray-600 text-white"
                rows={3}
              />
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowBandForm(false)}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createBandMutation.isPending}
                className="bg-gradient-to-r from-music-purple to-music-blue hover:from-purple-600 hover:to-blue-600"
              >
                {createBandMutation.isPending ? (
                  <LoadingSpinner className="h-4 w-4 mr-2" />
                ) : null}
                {bandData?.band ? "Update Band" : "Create Band"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Member Form Modal */}
      <Dialog open={showMemberForm} onOpenChange={setShowMemberForm}>
        <DialogContent className="bg-music-secondary border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingMember ? "Edit Band Member" : "Add Band Member"}
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              {editingMember ? "Update member information" : `Add a new member to position ${selectedPosition}`}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleMemberSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Member Name *
              </label>
              <Input
                value={memberForm.name}
                onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                placeholder="Enter member name"
                className="bg-gray-800 border-gray-600 text-white"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Role *
              </label>
              <Input
                value={memberForm.role}
                onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
                placeholder="e.g., Lead Singer, Guitarist, Drummer"
                className="bg-gray-800 border-gray-600 text-white"
                list="roles"
                required
              />
              <datalist id="roles">
                {DEFAULT_ROLES.map(role => (
                  <option key={role} value={role} />
                ))}
              </datalist>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Description
              </label>
              <Textarea
                value={memberForm.description}
                onChange={(e) => setMemberForm({ ...memberForm, description: e.target.value })}
                placeholder="Describe this band member (optional)"
                className="bg-gray-800 border-gray-600 text-white"
                rows={3}
              />
            </div>

            {/* Image Section */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-white mb-2">
                Member Image
              </label>

              {/* Current Image Preview */}
              {memberImageUrl && (
                <div className="text-center">
                  <img
                    src={memberImageUrl}
                    alt="Member preview"
                    className="w-32 h-32 mx-auto rounded-lg object-cover border-2 border-gray-600"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClearImage}
                    className="mt-2 border-red-500/20 text-red-400 hover:bg-red-500/10"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove Image
                  </Button>
                </div>
              )}

              {/* Tabs for Generate vs Upload */}
              <Tabs defaultValue="generate" className="w-full">
                <TabsList className="grid grid-cols-2 bg-gray-800 border border-gray-700">
                  <TabsTrigger value="generate" className="text-gray-200 data-[state=active]:bg-gray-700">Generate with AI</TabsTrigger>
                  <TabsTrigger value="upload" className="text-gray-200 data-[state=active]:bg-gray-700">Upload Picture</TabsTrigger>
                </TabsList>

                <TabsContent value="generate" className="mt-4">
                  <div className="flex gap-2">
                    <Input
                      value={memberImageDescription}
                      onChange={(e) => setMemberImageDescription(e.target.value)}
                      placeholder="Describe the character (e.g., young woman with blonde hair, leather jacket)"
                      className="bg-gray-800 border-gray-600 text-white flex-1"
                      disabled={isGeneratingImage}
                    />
                    <Button
                      type="button"
                      onClick={handleGenerateImageInForm}
                      disabled={!memberImageDescription.trim() || isGeneratingImage}
                      className="bg-gradient-to-r from-music-purple to-music-blue hover:from-purple-600 hover:to-blue-600"
                    >
                      {isGeneratingImage ? (
                        <LoadingSpinner className="h-4 w-4 mr-2" />
                      ) : (
                        <Wand2 className="h-4 w-4 mr-2" />
                      )}
                      Generate
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="upload" className="mt-4">
                  <ObjectUploader
                    maxFileSize={10485760}
                    acceptedFileTypes={['.jpg', '.jpeg', '.png', '.gif', '.webp']}
                    onGetUploadParameters={async () => {
                      const response = await apiRequest("/api/objects/upload", "POST");
                      const data = await response.json();
                      return {
                        method: "PUT" as const,
                        url: data.uploadURL,
                      };
                    }}
                    onComplete={handleUploadCompleteInForm}
                    buttonClassName="border-gray-600 text-gray-300 hover:bg-gray-800 w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Image
                  </ObjectUploader>
                </TabsContent>
              </Tabs>
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowMemberForm(false);
                  setEditingMember(null);
                  setMemberForm({ name: "", role: "", description: "" });
                  setMemberImageUrl(null);
                  setMemberImageDescription("");
                }}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addMemberMutation.isPending || updateMemberMutation.isPending}
                className="bg-gradient-to-r from-music-purple to-music-blue hover:from-purple-600 hover:to-blue-600"
              >
                {(addMemberMutation.isPending || updateMemberMutation.isPending) ? (
                  <LoadingSpinner className="h-4 w-4 mr-2" />
                ) : null}
                {editingMember ? "Update Member" : "Add Member"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
