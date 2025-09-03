import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen text-white">
      <Header currentPage="privacy" />
      
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
              <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="bg-music-secondary border-gray-700">
          <CardHeader>
            <CardTitle className="text-2xl text-music-blue">NuSong Privacy Policy</CardTitle>
            <p className="text-gray-300">Last updated: {new Date().toLocaleDateString()}</p>
          </CardHeader>
          <CardContent className="prose prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">1. Information We Collect</h2>
              <div className="text-gray-300 space-y-3">
                <p>
                  When you use NuSong, we collect information that you provide directly to us, including:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Account information (email address, username, password)</li>
                  <li>Music generation inputs (text prompts, lyrics, audio files)</li>
                  <li>Generated music tracks and associated metadata</li>
                  <li>Usage preferences and settings</li>
                  <li>Payment information (processed securely through Stripe)</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">2. How We Use Your Information</h2>
              <div className="text-gray-300 space-y-3">
                <p>We use the information we collect to:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Provide and improve our AI music generation services</li>
                  <li>Process your music generation requests</li>
                  <li>Manage your account and subscription</li>
                  <li>Communicate with you about your account and our services</li>
                  <li>Ensure platform security and prevent fraud</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">3. Information Sharing and Disclosure</h2>
              <div className="text-gray-300 space-y-3">
                <p>
                  We do not sell, trade, or rent your personal information. We may share your information only in the following circumstances:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>With your explicit consent</li>
                  <li>To comply with legal requirements or court orders</li>
                  <li>To protect our rights, property, or safety, or that of our users</li>
                  <li>With service providers who assist in our operations (subject to confidentiality agreements)</li>
                  <li>Public tracks you choose to share are visible to all users in the community gallery</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">4. Data Storage and Security</h2>
              <div className="text-gray-300 space-y-3">
                <p>
                  We implement appropriate technical and organizational measures to protect your personal information:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Encrypted data transmission and storage</li>
                  <li>Secure password hashing using industry standards</li>
                  <li>Regular security audits and updates</li>
                  <li>Limited access to personal data on a need-to-know basis</li>
                  <li>Secure cloud infrastructure with backup and recovery systems</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">5. Your Rights and Choices</h2>
              <div className="text-gray-300 space-y-3">
                <p>You have the right to:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Access, update, or delete your personal information</li>
                  <li>Control the visibility of your generated tracks (public/private)</li>
                  <li>Export your data in a machine-readable format</li>
                  <li>Opt out of promotional communications</li>
                  <li>Request deletion of your account and associated data</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">6. AI-Generated Content</h2>
              <div className="text-gray-300 space-y-3">
                <p>
                  Regarding music generated through our AI services:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>You retain ownership rights to tracks you generate</li>
                  <li>AI models may learn from aggregated, anonymized usage patterns</li>
                  <li>We do not use your specific content to train AI models without consent</li>
                  <li>Generated content is subject to our Terms of Service</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">7. Cookies and Tracking</h2>
              <div className="text-gray-300 space-y-3">
                <p>
                  We use essential cookies and similar technologies to:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Maintain your login session</li>
                  <li>Remember your preferences</li>
                  <li>Ensure platform security</li>
                  <li>Analyze usage patterns to improve our services</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">8. Changes to This Policy</h2>
              <div className="text-gray-300 space-y-3">
                <p>
                  We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the updated policy on our website and updating the "Last updated" date at the top of this policy.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">9. Contact Us</h2>
              <div className="text-gray-300 space-y-3">
                <p>
                  If you have any questions about this Privacy Policy or our data practices, please contact us at:
                </p>
                <div className="bg-music-dark p-4 rounded-lg border border-gray-600">
                  <p className="font-medium">NuSong Support</p>
                  <p>Email: privacy@nusong.app</p>
                  <p>Website: nusong.app</p>
                </div>
              </div>
            </section>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}