import React from 'react';

export const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-[#080808] text-white p-8 md:p-16">
      <div className="max-w-4xl mx-auto">
        <a href="/" className="inline-block mb-12 font-serif font-black text-xl text-[#C8651B]">← RETURN TO AETHOS</a>
        
        <h1 className="text-3xl md:text-5xl font-serif font-black uppercase italic text-white mb-8">Privacy Policy</h1>
        <p className="text-xs font-mono text-white/50 mb-12">Last updated: August 19, 2026</p>

        <div className="space-y-8 text-sm font-mono text-white/70 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-white mb-4">1. What is AETHOS?</h2>
            <p>AETHOS is a personal operating system designed to integrate task management, reflection, goal tracking, and AI coaching into a single, cohesive workflow.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-4">2. Information We Collect</h2>
            <p>We collect information you provide directly to us through the AETHOS interface, primarily via Firebase Authentication and Firestore:</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li><strong>Account Information:</strong> If you sign in using Google, we receive basic profile information (name, email) provided by Google.</li>
              <li><strong>User-Provided Data:</strong> Content you create, including task lists, journal entries, habit logs, WOOP plans, and Wheel of Life assessments, is stored in your private Firestore database.</li>
              <li><strong>App-Generated Content:</strong> AI-generated insights, daily briefings, and coach responses are saved to enhance your experience.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-4">3. How We Use Data</h2>
            <p>We use your data strictly to operate AETHOS, provide AI-driven insights, personalize your coaching experience, and maintain the functionality of your personal operating system. We do not sell your personal data.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-4">4. Firebase & Third-Party Services</h2>
            <p>AETHOS uses Firebase (Firestore, Authentication) as our primary infrastructure provider. Data is stored securely in Firebase projects under your control. We may use other Google Cloud services to power AI features.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-4">5. Data Storage & Security</h2>
            <p>Your data is stored securely in cloud-hosted databases. We implement standard security best practices to protect your information, though no system can guarantee absolute security.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-4">6. Your Rights</h2>
            <p>You have control over your data. You may review, modify, or delete your content within the AETHOS application at any time. For concerns regarding your data, please contact us.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-4">7. Updates to this Policy</h2>
            <p>We may update this policy periodically. Changes will be reflected with an updated "Last updated" date on this page.</p>
          </section>
        </div>
      </div>
    </div>
  );
};
