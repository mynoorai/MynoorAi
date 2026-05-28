import React from 'react';
import { Header, PageLayout } from '@/components/layout';
import { motion } from 'framer-motion';

export function PrivacyPolicyPage() {
  return (
    <PageLayout header={<Header title="Privacy Policy" showBack />}>
      <div className="py-8 px-4 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="prose prose-lg max-w-none"
        >
          <h1 className="text-3xl font-bold mb-6 text-gray-900">Privacy Policy</h1>

          <p className="text-gray-600 mb-8">Last updated: January 13, 2025</p>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8">
            <p className="text-blue-800 font-semibold">
              Your privacy is important to us. This Privacy Policy explains how mynoor ai collects,
              uses, and protects your information when you use our AI-powered personal color
              analysis service.
            </p>
          </div>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">1. Information We Collect</h2>

            <h3 className="text-xl font-semibold mb-3 text-gray-800">
              1.1 Information You Provide
            </h3>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>
                <strong>Account Information:</strong> When you create an account, we collect your
                name, email address, and password (encrypted)
              </li>
              <li>
                <strong>Profile Photos:</strong> Photos you upload for color analysis purposes
              </li>
              <li>
                <strong>Communication Data:</strong> Information you provide when you contact us for
                support
              </li>
              <li>
                <strong>User Preferences:</strong> Your saved color preferences and recommendation
                history
              </li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 text-gray-800">
              1.2 Information Collected Automatically
            </h3>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>
                <strong>Usage Data:</strong> How you interact with our service, including pages
                viewed and features used
              </li>
              <li>
                <strong>Device Information:</strong> Device type, operating system, browser type,
                and version
              </li>
              <li>
                <strong>Log Data:</strong> IP address, access times, and referring URLs
              </li>
              <li>
                <strong>Analytics Data:</strong> Anonymous usage statistics to improve our service
              </li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 text-gray-800">
              1.3 Information We Do NOT Collect
            </h3>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Biometric data or facial recognition information</li>
              <li>Location data beyond general geographic region (country/state level)</li>
              <li>Financial information (we use third-party payment processors)</li>
              <li>Social media credentials or contacts</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              2. How We Use Your Information
            </h2>

            <h3 className="text-xl font-semibold mb-3 text-gray-800">2.1 Primary Uses</h3>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>
                <strong>Service Delivery:</strong> To provide personal color analysis and
                recommendations
              </li>
              <li>
                <strong>Account Management:</strong> To create and manage your user account
              </li>
              <li>
                <strong>Communication:</strong> To send service updates, recommendations, and
                respond to inquiries
              </li>
              <li>
                <strong>Improvement:</strong> To enhance our AI algorithms and user experience
              </li>
              <li>
                <strong>Security:</strong> To protect against fraud and maintain service security
              </li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 text-gray-800">2.2 Photo Processing</h3>
            <p className="text-gray-700 mb-4">Photos you upload are:</p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Processed locally on secure servers for color analysis only</li>
              <li>Not used for facial recognition or identification purposes</li>
              <li>Automatically deleted after analysis completion (within 24 hours)</li>
              <li>Never shared with third parties or used for marketing</li>
              <li>Not used to train AI models without explicit consent</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              3. Data Storage and Security
            </h2>

            <h3 className="text-xl font-semibold mb-3 text-gray-800">3.1 Security Measures</h3>
            <p className="text-gray-700 mb-4">
              We implement industry-standard security measures including:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>256-bit SSL/TLS encryption for data transmission</li>
              <li>Encrypted storage for sensitive information</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>Access controls and authentication protocols</li>
              <li>Secure data centers with physical security measures</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 text-gray-800">3.2 Data Retention</h3>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>
                <strong>Photos:</strong> Deleted within 24 hours after analysis
              </li>
              <li>
                <strong>Account Data:</strong> Retained while your account is active
              </li>
              <li>
                <strong>Analysis Results:</strong> Stored for your reference until you delete them
              </li>
              <li>
                <strong>Inactive Accounts:</strong> Deleted after 2 years of inactivity
              </li>
              <li>
                <strong>Legal Requirements:</strong> Data may be retained longer if required by law
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              4. Cookies and Tracking Technologies
            </h2>

            <h3 className="text-xl font-semibold mb-3 text-gray-800">4.1 Cookies We Use</h3>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>
                <strong>Essential Cookies:</strong> Required for service functionality
                (authentication, security)
              </li>
              <li>
                <strong>Performance Cookies:</strong> Help us understand service usage patterns
              </li>
              <li>
                <strong>Preference Cookies:</strong> Remember your settings and preferences
              </li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 text-gray-800">4.2 Managing Cookies</h3>
            <p className="text-gray-700 mb-4">
              You can control cookies through your browser settings. Note that disabling essential
              cookies may prevent you from using certain features of our service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">5. Third-Party Services</h2>

            <p className="text-gray-700 mb-4">We work with trusted third-party services:</p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>
                <strong>Cloud Infrastructure:</strong> AWS/Google Cloud for secure hosting
              </li>
              <li>
                <strong>Analytics:</strong> Google Analytics (anonymized data only)
              </li>
              <li>
                <strong>Email Service:</strong> SendGrid for transactional emails
              </li>
              <li>
                <strong>Payment Processing:</strong> Stripe (we don't store payment details)
              </li>
            </ul>

            <p className="text-gray-700 mb-4">
              These services have their own privacy policies and we encourage you to review them. We
              only share the minimum necessary information with these services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              6. Your Rights and Choices
            </h2>

            <h3 className="text-xl font-semibold mb-3 text-gray-800">6.1 Your Rights</h3>
            <p className="text-gray-700 mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>
                <strong>Access:</strong> Request a copy of your personal data
              </li>
              <li>
                <strong>Correction:</strong> Update or correct inaccurate information
              </li>
              <li>
                <strong>Deletion:</strong> Request deletion of your account and data
              </li>
              <li>
                <strong>Portability:</strong> Receive your data in a portable format
              </li>
              <li>
                <strong>Objection:</strong> Object to certain uses of your data
              </li>
              <li>
                <strong>Restriction:</strong> Request limited processing of your data
              </li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 text-gray-800">
              6.2 How to Exercise Your Rights
            </h3>
            <p className="text-gray-700 mb-4">To exercise any of these rights, you can:</p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Access most information through your account settings</li>
              {/* TODO: confirm legal entity name/domain with product team */}
              <li>Contact us at support@mynoorai.com</li>
              <li>Use the data export feature in your account</li>
              <li>Delete your account through account settings</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              7. International Data Transfers
            </h2>
            <p className="text-gray-700 mb-4">
              Your information may be transferred to and processed in countries other than your
              country of residence. These countries may have different data protection laws. When we
              transfer your information, we ensure appropriate safeguards are in place, including:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Standard Contractual Clauses approved by regulatory authorities</li>
              <li>Compliance with Privacy Shield frameworks where applicable</li>
              <li>Ensuring third parties meet our security standards</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">8. Children's Privacy</h2>
            <p className="text-gray-700 mb-4">
              Our service is not intended for children under 13 years of age. We do not knowingly
              collect personal information from children under 13. If we become aware that we have
              collected data from a child under 13, we will take steps to delete that information
              promptly.
            </p>
            <p className="text-gray-700 mb-4">
              For users aged 13-18, we recommend parental guidance when using our service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              9. California Privacy Rights (CCPA)
            </h2>
            <p className="text-gray-700 mb-4">
              If you are a California resident, you have additional rights under the California
              Consumer Privacy Act (CCPA):
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Right to know what personal information is collected, used, shared, or sold</li>
              <li>Right to delete personal information</li>
              <li>
                Right to opt-out of the sale of personal information (we do not sell personal data)
              </li>
              <li>Right to non-discrimination for exercising privacy rights</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              10. European Privacy Rights (GDPR)
            </h2>
            <p className="text-gray-700 mb-4">
              If you are located in the European Economic Area (EEA), you have rights under the
              General Data Protection Regulation (GDPR):
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>
                <strong>Legal Basis:</strong> We process your data based on consent, contract
                fulfillment, or legitimate interests
              </li>
              {/* TODO: confirm legal entity name/domain with product team */}
              <li>
                <strong>Data Protection Officer:</strong> Contact our DPO at support@mynoorai.com
              </li>
              <li>
                <strong>Supervisory Authority:</strong> You have the right to lodge a complaint with
                your local data protection authority
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              11. Changes to This Privacy Policy
            </h2>
            <p className="text-gray-700 mb-4">
              We may update this Privacy Policy from time to time to reflect changes in our
              practices or legal requirements. When we make material changes:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>We will notify you via email or through the service</li>
              <li>We will update the "Last updated" date at the top of this policy</li>
              <li>We will provide a summary of key changes</li>
              <li>Your continued use after changes constitutes acceptance</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              12. Data Breach Notification
            </h2>
            <p className="text-gray-700 mb-4">
              In the unlikely event of a data breach that may impact your personal information:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>We will notify affected users within 72 hours of discovery</li>
              <li>We will provide information about the nature and scope of the breach</li>
              <li>We will offer guidance on protective measures you can take</li>
              <li>We will cooperate with relevant authorities as required</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">13. Contact Information</h2>
            <p className="text-gray-700 mb-4">
              If you have questions, concerns, or requests regarding this Privacy Policy or our data
              practices, please contact us:
            </p>
            {/* TODO: confirm legal entity name/domain with product team */}
            <div className="bg-gray-50 p-4 rounded-lg text-gray-700 mb-4">
              <p className="font-semibold">MyNoor AI Privacy Team</p>
              <p>Email: support@mynoorai.com</p>
              <p>Data Protection Officer: support@mynoorai.com</p>
              <p>Website: https://mynoorai.com</p>
            </div>
            <p className="text-gray-700 mb-4">
              We aim to respond to all privacy-related inquiries within 30 days.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              14. Privacy Policy Acceptance
            </h2>
            <p className="text-gray-700 mb-4">
              By using mynoor ai, you acknowledge that you have read and understood this Privacy
              Policy and agree to the collection, use, and disclosure of your information as
              described herein.
            </p>
          </section>

          <div className="mt-12 p-6 bg-green-50 rounded-lg border border-green-200">
            <h3 className="text-lg font-semibold text-green-800 mb-2">Our Privacy Commitment</h3>
            <p className="text-green-700">
              We are committed to protecting your privacy and maintaining the trust you place in us.
              Your personal information and photos are handled with the utmost care and security. We
              believe in transparency and will always be clear about how we use your data.
            </p>
          </div>
        </motion.div>
      </div>
    </PageLayout>
  );
}
