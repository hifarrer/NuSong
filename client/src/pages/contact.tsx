import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Mail, MessageSquare, Send, MapPin, Phone, Clock } from "lucide-react";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Simulate form submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Message sent successfully!",
        description: "We'll get back to you within 24 hours.",
      });

      // Reset form
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: ""
      });
    } catch (error) {
      toast({
        title: "Failed to send message",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="min-h-screen bg-music-dark text-white">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-music-dark via-gray-900 to-music-secondary py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-music-accent via-music-purple to-music-blue bg-clip-text text-transparent mb-4">
            Get In Touch
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Have questions, feedback, or need support? We'd love to hear from you.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div>
            <Card className="bg-music-secondary border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center text-2xl">
                  <MessageSquare className="mr-3 h-6 w-6 text-music-accent" />
                  Send us a message
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Name *
                      </label>
                      <Input
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        placeholder="Your full name"
                        className="bg-music-dark border-gray-600 text-white placeholder-gray-400 focus:border-music-accent"
                        required
                        data-testid="input-contact-name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Email *
                      </label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        placeholder="your@email.com"
                        className="bg-music-dark border-gray-600 text-white placeholder-gray-400 focus:border-music-accent"
                        required
                        data-testid="input-contact-email"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Subject *
                    </label>
                    <Input
                      value={formData.subject}
                      onChange={(e) => handleInputChange("subject", e.target.value)}
                      placeholder="What's this about?"
                      className="bg-music-dark border-gray-600 text-white placeholder-gray-400 focus:border-music-accent"
                      required
                      data-testid="input-contact-subject"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Message *
                    </label>
                    <Textarea
                      value={formData.message}
                      onChange={(e) => handleInputChange("message", e.target.value)}
                      placeholder="Tell us more about your inquiry..."
                      rows={6}
                      className="bg-music-dark border-gray-600 text-white placeholder-gray-400 focus:border-music-accent resize-none"
                      required
                      data-testid="textarea-contact-message"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-music-accent via-music-purple to-music-blue hover:from-purple-600 hover:via-blue-600 hover:to-green-600 text-white py-3 font-semibold transition-all transform hover:scale-[1.02] disabled:opacity-50"
                    data-testid="button-send-message"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {isSubmitting ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Contact Information */}
          <div className="space-y-8">
            <Card className="bg-music-secondary border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <Mail className="mr-3 h-5 w-5 text-music-blue" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-music-accent to-music-purple rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Email Support</h4>
                    <p className="text-gray-300">support@numusic.app</p>
                    <p className="text-sm text-gray-400">For general inquiries and support</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-music-blue to-music-green rounded-lg flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Business Inquiries</h4>
                    <p className="text-gray-300">business@numusic.app</p>
                    <p className="text-sm text-gray-400">For partnerships and collaborations</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-music-purple to-music-accent rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Response Time</h4>
                    <p className="text-gray-300">Within 24 hours</p>
                    <p className="text-sm text-gray-400">Monday to Friday, 9 AM - 6 PM EST</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* FAQ Section */}
            <Card className="bg-music-secondary border-gray-700">
              <CardHeader>
                <CardTitle className="text-xl">Frequently Asked Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-white mb-2">How long does music generation take?</h4>
                  <p className="text-gray-300 text-sm">Most tracks are generated within 30-60 seconds, depending on complexity and current demand.</p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-white mb-2">Can I use generated music commercially?</h4>
                  <p className="text-gray-300 text-sm">Commercial usage rights depend on your subscription plan. Premium plans include commercial licenses.</p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-white mb-2">What audio formats are supported?</h4>
                  <p className="text-gray-300 text-sm">We support MP3, WAV, M4A, AAC, and OGG formats for audio uploads and downloads.</p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-white mb-2">How can I upgrade my subscription?</h4>
                  <p className="text-gray-300 text-sm">Visit our pricing page or contact support to upgrade your plan and unlock more features.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}