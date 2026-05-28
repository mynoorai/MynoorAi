import React from 'react';
import { Header, PageLayout } from '@/components/layout';
import { motion } from 'framer-motion';

export function TermsOfServicePage() {
  return (
    <PageLayout header={<Header title="Terms of Service" showBack />}>
      <div className="py-8 px-4 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="prose prose-lg max-w-none"
        >
          <h1 className="text-3xl font-bold mb-6 text-gray-900">Terms of Service</h1>

          <p className="text-gray-600 mb-8">Last updated: January 13, 2025</p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">1. Agreement to Terms</h2>
            <p className="text-gray-700 mb-4">
              By accessing or using the mynoor ai service ("Service"), you agree to be bound by
              these Terms of Service ("Terms"). If you disagree with any part of these terms, then
              you may not access the Service.
            </p>
            <p className="text-gray-700 mb-4">
              These Terms apply to all visitors, users, and others who access or use the Service.
              The Service is offered subject to your acceptance without modification of all of the
              terms and conditions contained herein.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">2. Description of Service</h2>
            <p className="text-gray-700 mb-4">
              mynoor ai provides an AI-powered personal color analysis service specifically designed
              for hijab-wearing individuals. Our Service analyzes uploaded photos to determine your
              personal color season and provides personalized hijab color recommendations.
            </p>
            <p className="text-gray-700 mb-4">The Service includes:</p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>AI-based personal color analysis</li>
              <li>Personalized hijab color recommendations</li>
              <li>Product catalog browsing</li>
              <li>Content and styling guides</li>
              <li>User account management</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">3. User Accounts</h2>
            <h3 className="text-xl font-semibold mb-3 text-gray-800">3.1 Account Creation</h3>
            <p className="text-gray-700 mb-4">
              To access certain features of the Service, you must register for an account. When you
              register for an account, you must provide accurate and complete information. You are
              responsible for maintaining the confidentiality of your account credentials and for
              all activities that occur under your account.
            </p>

            <h3 className="text-xl font-semibold mb-3 text-gray-800">
              3.2 Account Responsibilities
            </h3>
            <p className="text-gray-700 mb-4">You agree to:</p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Provide accurate, current, and complete information during registration</li>
              <li>Maintain and promptly update your account information</li>
              <li>
                Maintain the security of your password and accept all risks of unauthorized access
              </li>
              <li>Immediately notify us if you discover any unauthorized use of your account</li>
              <li>Not share your account credentials with others</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              4. Privacy and Data Protection
            </h2>
            <h3 className="text-xl font-semibold mb-3 text-gray-800">4.1 Data Collection</h3>
            <p className="text-gray-700 mb-4">
              Our Privacy Policy describes how we handle the information you provide to us when you
              use our Service. By using our Service, you understand that we will collect and use
              your information as described in our Privacy Policy.
            </p>

            <h3 className="text-xl font-semibold mb-3 text-gray-800">4.2 Photo Usage</h3>
            <p className="text-gray-700 mb-4">When you upload photos for color analysis:</p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Photos are processed solely for color analysis purposes</li>
              <li>We do not store facial recognition data</li>
              <li>Photos are automatically deleted after analysis completion</li>
              <li>We do not share your photos with third parties</li>
              <li>You retain all rights to your uploaded photos</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">5. Acceptable Use</h2>
            <p className="text-gray-700 mb-4">You may not use our Service:</p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>For any unlawful purpose</li>
              <li>To upload inappropriate, offensive, or copyrighted content</li>
              <li>To impersonate others or provide false information</li>
              <li>To interfere with or disrupt the Service</li>
              <li>To attempt to gain unauthorized access to any portion of the Service</li>
              <li>To collect user information without permission</li>
              <li>To transmit viruses or malicious code</li>
              <li>For commercial purposes without our express written consent</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">6. Intellectual Property</h2>
            <h3 className="text-xl font-semibold mb-3 text-gray-800">6.1 Service Content</h3>
            <p className="text-gray-700 mb-4">
              The Service and its original content, features, and functionality are and will remain
              the exclusive property of mynoor ai and its licensors. The Service is protected by
              copyright, trademark, and other laws. Our trademarks and trade dress may not be used
              in connection with any product or service without our prior written consent.
            </p>

            <h3 className="text-xl font-semibold mb-3 text-gray-800">6.2 User Content</h3>
            <p className="text-gray-700 mb-4">
              You retain ownership of any content you submit to the Service. By submitting content,
              you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, and
              process your content solely for the purpose of providing the Service to you.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">7. AI Service Disclaimer</h2>
            <p className="text-gray-700 mb-4">
              Our AI-powered color analysis provides recommendations based on algorithmic analysis.
              Please note:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>
                Results are recommendations only and may vary based on photo quality, lighting, and
                other factors
              </li>
              <li>Color analysis is subjective and results should be considered as guidance</li>
              <li>We do not guarantee specific outcomes or satisfaction with recommendations</li>
              <li>Professional color consultation may provide different results</li>
              <li>Screen color representation may vary from actual product colors</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              8. Third-Party Links and Services
            </h2>
            <p className="text-gray-700 mb-4">
              Our Service may contain links to third-party websites or services that are not owned
              or controlled by mynoor ai. We have no control over, and assume no responsibility for,
              the content, privacy policies, or practices of any third-party websites or services.
            </p>
            <p className="text-gray-700 mb-4">
              You acknowledge and agree that mynoor ai shall not be responsible or liable for any
              damage or loss caused by your use of any third-party content, goods, or services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              9. Disclaimers and Limitations of Liability
            </h2>
            <h3 className="text-xl font-semibold mb-3 text-gray-800">9.1 Service Availability</h3>
            <p className="text-gray-700 mb-4">
              The Service is provided on an "AS IS" and "AS AVAILABLE" basis. We do not warrant that
              the Service will be uninterrupted, timely, secure, or error-free.
            </p>

            <h3 className="text-xl font-semibold mb-3 text-gray-800">
              9.2 Limitation of Liability
            </h3>
            <p className="text-gray-700 mb-4">
              To the maximum extent permitted by law, mynoor ai shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages, including without
              limitation, loss of profits, data, use, goodwill, or other intangible losses.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">10. Indemnification</h2>
            <p className="text-gray-700 mb-4">
              You agree to defend, indemnify, and hold harmless mynoor ai and its officers,
              directors, employees, and agents from any claims, damages, obligations, losses,
              liabilities, costs, or expenses arising from:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Your use of and access to the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any third-party right</li>
              <li>Any content you submit to the Service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              11. Modifications to Service and Terms
            </h2>
            <h3 className="text-xl font-semibold mb-3 text-gray-800">11.1 Service Modifications</h3>
            <p className="text-gray-700 mb-4">
              We reserve the right to modify or discontinue, temporarily or permanently, the Service
              with or without notice. You agree that we shall not be liable to you or any third
              party for any modification, suspension, or discontinuance of the Service.
            </p>

            <h3 className="text-xl font-semibold mb-3 text-gray-800">11.2 Terms Modifications</h3>
            <p className="text-gray-700 mb-4">
              We reserve the right to modify these Terms at any time. If we make material changes,
              we will notify you by email or by posting a notice on our Service. Your continued use
              of the Service after any such changes constitutes your acceptance of the new Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">12. Termination</h2>
            <p className="text-gray-700 mb-4">
              We may terminate or suspend your account and bar access to the Service immediately,
              without prior notice or liability, under our sole discretion, for any reason
              whatsoever, including without limitation if you breach the Terms.
            </p>
            {/* TODO: confirm legal entity name/domain with product team */}
            <p className="text-gray-700 mb-4">
              Upon termination, your right to use the Service will cease immediately. If you wish to
              terminate your account, you may do so by contacting us at support@mynoorai.com.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              13. Governing Law and Dispute Resolution
            </h2>
            <h3 className="text-xl font-semibold mb-3 text-gray-800">13.1 Governing Law</h3>
            <p className="text-gray-700 mb-4">
              These Terms shall be governed and construed in accordance with the laws of the
              jurisdiction in which mynoor ai operates, without regard to its conflict of law
              provisions.
            </p>

            <h3 className="text-xl font-semibold mb-3 text-gray-800">13.2 Dispute Resolution</h3>
            <p className="text-gray-700 mb-4">
              Any dispute arising out of or relating to these Terms or the Service shall be resolved
              through good faith negotiations. If the dispute cannot be resolved through
              negotiations, it shall be submitted to binding arbitration in accordance with
              applicable arbitration rules.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">14. General Provisions</h2>
            <h3 className="text-xl font-semibold mb-3 text-gray-800">14.1 Entire Agreement</h3>
            <p className="text-gray-700 mb-4">
              These Terms constitute the entire agreement between you and mynoor ai regarding the
              use of the Service, superseding any prior agreements.
            </p>

            <h3 className="text-xl font-semibold mb-3 text-gray-800">
              14.2 Waiver and Severability
            </h3>
            <p className="text-gray-700 mb-4">
              Our failure to enforce any right or provision of these Terms will not be considered a
              waiver of those rights. If any provision of these Terms is held to be invalid or
              unenforceable, the remaining provisions will remain in effect.
            </p>

            <h3 className="text-xl font-semibold mb-3 text-gray-800">14.3 Assignment</h3>
            <p className="text-gray-700 mb-4">
              You may not assign or transfer these Terms, by operation of law or otherwise, without
              our prior written consent. We may assign or transfer these Terms, in whole or in part,
              without restriction.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">15. Contact Information</h2>
            <p className="text-gray-700 mb-4">
              If you have any questions about these Terms, please contact us at:
            </p>
            {/* TODO: confirm legal entity name/domain with product team */}
            <div className="bg-gray-50 p-4 rounded-lg text-gray-700">
              <p className="font-semibold">MyNoor AI</p>
              <p>Email: support@mynoorai.com</p>
              <p>Website: https://mynoorai.com</p>
            </div>
          </section>

          <div className="mt-12 p-6 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-center text-gray-700">
              By using mynoor ai, you acknowledge that you have read, understood, and agree to be
              bound by these Terms of Service.
            </p>
          </div>
        </motion.div>
      </div>
    </PageLayout>
  );
}
