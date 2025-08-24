import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen text-white">
      <Header currentPage="terms" />
      
      {/* Page Header */}
      <header className="bg-music-secondary border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => window.history.back()}
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <h1 className="text-3xl font-bold text-white">Terms of Service</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="bg-music-secondary border-gray-700">
          <CardHeader>
            <CardTitle className="text-2xl text-music-blue">NuMusic Terms of Service</CardTitle>
            <p className="text-gray-300">Last updated: {new Date().toLocaleDateString()}</p>
          </CardHeader>
          <CardContent className="prose prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
              <div className="text-gray-300 space-y-3">
                <p>
                  By accessing and using NuMusic ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">2. Description of Service</h2>
              <div className="text-gray-300 space-y-3">
                <p>
                  NuMusic is an AI-powered music generation platform that allows users to:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Generate music from text prompts and lyrics</li>
                  <li>Transform existing audio files using AI</li>
                  <li>Create and manage a personal music library</li>
                  <li>Share tracks publicly in the community gallery</li>
                  <li>Access subscription-based features and enhanced capabilities</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">3. User Accounts</h2>
              <div className="text-gray-300 space-y-3">
                <p>To access our services, you must:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Provide accurate, current, and complete account information</li>
                  <li>Maintain and update your account information</li>
                  <li>Keep your password secure and confidential</li>
                  <li>Be responsible for all activities under your account</li>
                  <li>Notify us immediately of any unauthorized access</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">4. Subscription Plans and Billing</h2>
              <div className="text-gray-300 space-y-3">
                <p>NuMusic offers the following subscription tiers:</p>
                <div className="bg-music-dark p-4 rounded-lg border border-gray-600 my-4">
                  <ul className="space-y-2">
                    <li><strong>Free Plan:</strong> Up to 5 songs per month, standard quality, public sharing only</li>
                    <li><strong>Basic Plan:</strong> Up to 30 songs per month, high quality, private/public sharing ($9/month or $90/year)</li>
                    <li><strong>Premium Plan:</strong> Up to 200 songs per month, ultra-high quality, priority generation, commercial license ($19/month or $190/year)</li>
                  </ul>
                </div>
                <p>
                  Subscription fees are billed in advance and are non-refundable except as required by law. You may cancel your subscription at any time through your account settings.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">5. Acceptable Use Policy</h2>
              <div className="text-gray-300 space-y-3">
                <p>You agree not to use the Service to:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Generate content that infringes copyright, trademark, or other intellectual property rights</li>
                  <li>Create music that contains hate speech, harassment, or discriminatory content</li>
                  <li>Violate any applicable laws or regulations</li>
                  <li>Attempt to reverse engineer, hack, or compromise the Service</li>
                  <li>Share account credentials or circumvent usage limits</li>
                  <li>Generate excessive requests that could impact service performance</li>
                  <li>Use the Service for any commercial purpose without appropriate licensing</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">6. Intellectual Property Rights</h2>
              <div className="text-gray-300 space-y-3">
                <p><strong>Your Content:</strong></p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>You retain ownership of music you generate using our Service</li>
                  <li>You grant us a limited license to process and store your content</li>
                  <li>Public tracks may be displayed in our community gallery</li>
                  <li>You are responsible for ensuring your inputs don't infringe third-party rights</li>
                </ul>
                <p><strong>Our Service:</strong></p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>NuMusic retains all rights to the platform, AI models, and technology</li>
                  <li>You may not copy, modify, or distribute our software or algorithms</li>
                  <li>Our trademarks and branding remain our exclusive property</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">7. Commercial Licensing</h2>
              <div className="text-gray-300 space-y-3">
                <p>
                  Commercial use of generated music is subject to your subscription plan:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Free & Basic Plans:</strong> Personal use only, no commercial licensing</li>
                  <li><strong>Premium Plan:</strong> Includes commercial license for generated content</li>
                  <li>For extensive commercial use, contact us for enterprise licensing options</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">8. Service Availability</h2>
              <div className="text-gray-300 space-y-3">
                <p>
                  While we strive for high availability, we do not guarantee uninterrupted service. The Service may be temporarily unavailable due to:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Scheduled maintenance and updates</li>
                  <li>Technical issues or server problems</li>
                  <li>Third-party service dependencies</li>
                  <li>Extraordinary circumstances beyond our control</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">9. Limitation of Liability</h2>
              <div className="text-gray-300 space-y-3">
                <p>
                  To the maximum extent permitted by law, NuMusic shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Loss of data or generated content</li>
                  <li>Business interruption or lost profits</li>
                  <li>Cost of substitute services</li>
                  <li>Any damages arising from use of the Service</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">10. Privacy and Data Protection</h2>
              <div className="text-gray-300 space-y-3">
                <p>
                  Your privacy is important to us. Our collection and use of personal information is governed by our Privacy Policy, which is incorporated into these Terms by reference.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">11. Termination</h2>
              <div className="text-gray-300 space-y-3">
                <p>
                  Either party may terminate this agreement at any time:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>You may delete your account through your account settings</li>
                  <li>We may suspend or terminate accounts for Terms violations</li>
                  <li>Upon termination, your access to the Service will cease</li>
                  <li>We will retain your data according to our Privacy Policy</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">12. Changes to Terms</h2>
              <div className="text-gray-300 space-y-3">
                <p>
                  We reserve the right to modify these Terms at any time. We will notify users of material changes via email or through the Service. Continued use after changes constitutes acceptance of the new Terms.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">13. Contact Information</h2>
              <div className="text-gray-300 space-y-3">
                <p>
                  For questions about these Terms, please contact us:
                </p>
                <div className="bg-music-dark p-4 rounded-lg border border-gray-600">
                  <p className="font-medium">NuMusic Legal Team</p>
                  <p>Email: legal@numusic.app</p>
                  <p>Website: numusic.app</p>
                </div>
              </div>
            </section>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}