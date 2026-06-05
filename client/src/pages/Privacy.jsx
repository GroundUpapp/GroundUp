import LegalLayout, { Section, Lead, List, MailLink } from '../components/LegalLayout';

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" updated="June 5, 2026">
      <Lead>
        This Privacy Policy explains how Raftas Financial Group (“Raftas,” “we,”
        “us,” or “our”) collects, uses, stores, and protects information in
        connection with Ground Up, our financial dashboard for contractors,
        available at{' '}
        <a
          href="https://project-06pgg.vercel.app"
          className="font-medium text-amber-400 hover:text-amber-300"
        >
          https://project-06pgg.vercel.app
        </a>{' '}
        (the “Service”). By creating an account or connecting your QuickBooks
        Online company to Ground Up, you agree to the practices described here.
      </Lead>

      <Section title="1. Information We Collect">
        <p>We collect only the information needed to operate the Service:</p>
        <List
          items={[
            <>
              <strong className="text-cream-50">Account information.</strong> When
              you sign up, we collect your email address through our
              authentication provider, Supabase. Your password is created and
              stored by Supabase in hashed form; we never see or store your
              plaintext password.
            </>,
            <>
              <strong className="text-cream-50">QuickBooks financial data.</strong>{' '}
              When you connect your QuickBooks Online account, you authorize
              Ground Up to access your company’s financial information on a
              read-only basis. This may include company profile details, profit
              and loss reports, balance sheet reports, cash-flow reports,
              invoices, customer names, and related accounting figures. We use
              this data to generate the insights shown in your dashboard.
            </>,
            <>
              <strong className="text-cream-50">
                QuickBooks authorization tokens.
              </strong>{' '}
              To maintain your connection, we securely store the OAuth access and
              refresh tokens, the QuickBooks company (realm) identifier, and token
              expiry timestamps issued by Intuit. These tokens let the Service
              refresh data without asking you to sign in to QuickBooks each time.
            </>,
            <>
              <strong className="text-cream-50">Technical information.</strong> Our
              infrastructure providers may process limited technical data (such as
              IP address and request logs) for security, reliability, and abuse
              prevention.
            </>,
          ]}
        />
      </Section>

      <Section title="2. How We Use Your Information">
        <p>We use the information we collect to:</p>
        <List
          items={[
            'Authenticate you and maintain the security of your account;',
            'Retrieve your QuickBooks data and display financial insights in your dashboard, including cash on hand, outstanding invoices, job profitability, cash-flow trends, alerts, and a financial health score;',
            'Maintain and refresh your QuickBooks connection on your behalf; and',
            'Operate, maintain, secure, and improve the Service.',
          ]}
        />
        <p>
          <strong className="text-cream-50">
            We do not sell, rent, or trade your personal or financial
            information, and we do not share it with third parties for their own
            marketing purposes.
          </strong>{' '}
          We do not use your QuickBooks data for advertising. Your financial data
          is used solely to provide the Service to you.
        </p>
      </Section>

      <Section title="3. How Your Information Is Shared">
        <p>
          We share information only with the service providers that make Ground Up
          work, and only to the extent necessary for them to perform their
          functions:
        </p>
        <List
          items={[
            <>
              <strong className="text-cream-50">Intuit / QuickBooks Online</strong>{' '}
              — the source of your financial data, accessed under Intuit’s
              developer terms.
            </>,
            <>
              <strong className="text-cream-50">Supabase</strong> — provides
              authentication and our database, where your account record and
              QuickBooks tokens are stored.
            </>,
            <>
              <strong className="text-cream-50">Vercel</strong> — hosts the
              application and serves it over HTTPS.
            </>,
          ]}
        />
        <p>
          These providers act as our processors and are bound by their own
          security and privacy obligations. We may also disclose information if
          required by law, to comply with valid legal process, or to protect the
          rights, property, or safety of our users or others.
        </p>
      </Section>

      <Section title="4. Data Storage and Security">
        <p>
          Data is transmitted over encrypted connections (HTTPS/TLS). Account
          records and QuickBooks tokens are stored in our Supabase Postgres
          database. The table holding QuickBooks tokens is protected with
          row-level security and is accessible only to our backend using a
          privileged service credential — it is never readable from the browser.
          While no method of transmission or storage is completely secure, we
          maintain administrative, technical, and organizational safeguards
          designed to protect your information.
        </p>
      </Section>

      <Section title="5. Data Retention">
        <p>
          We retain your account information for as long as your account remains
          active. We retain your QuickBooks tokens only while your QuickBooks
          connection is active. When you disconnect QuickBooks within Ground Up,
          we delete the stored tokens for your account. When you close your
          account or request deletion, we delete your account information and any
          associated QuickBooks tokens, except where we are required to retain
          certain records to comply with legal obligations. We do not retain
          copies of your QuickBooks reports beyond what is needed to display your
          current dashboard.
        </p>
      </Section>

      <Section title="6. Your Rights and Choices">
        <p>You can, at any time:</p>
        <List
          items={[
            'Disconnect QuickBooks from within Ground Up, which removes our stored authorization tokens for your account;',
            'Revoke Ground Up’s access directly from your Intuit account settings;',
            'Request access to, correction of, or deletion of the personal information we hold about you; and',
            'Close your account.',
          ]}
        />
        <p>
          Depending on where you live, you may have additional rights under laws
          such as the California Consumer Privacy Act (CCPA) or the EU/UK General
          Data Protection Regulation (GDPR), including the right to access,
          delete, or restrict processing of your personal information, and the
          right to lodge a complaint with a supervisory authority. To exercise any
          of these rights, contact us at <MailLink />. We will respond within a
          reasonable timeframe and in accordance with applicable law.
        </p>
      </Section>

      <Section title="7. Children’s Privacy">
        <p>
          Ground Up is a business tool intended for use by adults and is not
          directed to individuals under the age of 18. We do not knowingly collect
          personal information from children. If you believe a child has provided
          us with personal information, please contact us so we can delete it.
        </p>
      </Section>

      <Section title="8. International Users">
        <p>
          Ground Up is operated from the United States, and your information will
          be processed and stored in the United States. If you access the Service
          from outside the United States, you understand that your information may
          be transferred to and processed in a jurisdiction with data-protection
          laws that differ from those in your country.
        </p>
      </Section>

      <Section title="9. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. When we do, we will
          revise the “Last updated” date above and, where appropriate, provide
          additional notice. Your continued use of the Service after an update
          takes effect constitutes acceptance of the revised policy.
        </p>
      </Section>

      <Section title="10. Contact Us">
        <p>
          If you have questions or requests regarding this Privacy Policy or your
          data, contact Raftas Financial Group at <MailLink />.
        </p>
      </Section>
    </LegalLayout>
  );
}
