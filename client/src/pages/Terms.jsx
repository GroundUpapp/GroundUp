import LegalLayout, { Section, Lead, List, MailLink } from '../components/LegalLayout';

export default function Terms() {
  return (
    <LegalLayout title="Terms of Service" updated="June 5, 2026">
      <Lead>
        These Terms of Service and End User License Agreement (the “Terms”) govern
        your access to and use of Ground Up, a financial dashboard for contractors
        provided by Raftas Financial Group (“Raftas,” “we,” “us,” or “our”) at{' '}
        <a
          href="https://project-06pgg.vercel.app"
          className="font-medium text-amber-400 hover:text-amber-300"
        >
          https://project-06pgg.vercel.app
        </a>{' '}
        (the “Service”). By creating an account, connecting QuickBooks, or
        otherwise using the Service, you agree to be bound by these Terms. If you
        do not agree, do not use the Service.
      </Lead>

      <Section title="1. The Service">
        <p>
          Ground Up is a software application that connects to your QuickBooks
          Online account to present financial insights for your contracting
          business, including cash on hand, outstanding invoices, job
          profitability, cash-flow trends, automated alerts, and a financial
          health score. The Service organizes and visualizes information from your
          accounting data; it does not modify your QuickBooks records and accesses
          them on a read-only basis.
        </p>
      </Section>

      <Section title="2. Eligibility and Accounts">
        <p>
          You must be at least 18 years old and able to form a binding contract to
          use the Service. You are responsible for the accuracy of the information
          you provide, for maintaining the confidentiality of your login
          credentials, and for all activity that occurs under your account. Notify
          us promptly at <MailLink /> if you suspect unauthorized use of your
          account.
        </p>
      </Section>

      <Section title="3. QuickBooks Connection and Your Data">
        <p>
          To use core features, you authorize Ground Up to access your QuickBooks
          Online data through Intuit’s authorization process. You represent that
          you have the right to connect the QuickBooks company you link and to
          allow us to access its data for the purposes described in these Terms and
          our Privacy Policy. You may disconnect QuickBooks at any time from within
          the Service or by revoking access from your Intuit account. Your use of
          QuickBooks remains subject to Intuit’s own terms.
        </p>
      </Section>

      <Section title="4. License">
        <p>
          Subject to these Terms, Raftas grants you a limited, non-exclusive,
          non-transferable, revocable license to access and use the Service for
          your own internal business purposes. We retain all right, title, and
          interest in and to the Service, including all related software, content,
          and intellectual property. No rights are granted except as expressly set
          out in these Terms.
        </p>
      </Section>

      <Section title="5. Acceptable Use">
        <p>You agree that you will not, and will not permit others to:</p>
        <List
          items={[
            'Use the Service for any unlawful, fraudulent, or unauthorized purpose;',
            'Access or attempt to access data or accounts that are not yours, or interfere with another user’s use of the Service;',
            'Reverse engineer, decompile, disassemble, or otherwise attempt to derive the source code of the Service, except to the extent this restriction is prohibited by law;',
            'Copy, modify, distribute, sell, sublicense, or create derivative works from the Service;',
            'Probe, scan, or test the vulnerability of the Service, or breach or circumvent any security or authentication measures;',
            'Use automated means to scrape or harvest data from the Service, or place an unreasonable load on our infrastructure; or',
            'Use the Service to violate the rights of any third party or any applicable law or regulation.',
          ]}
        />
      </Section>

      <Section title="6. Not Financial, Accounting, or Tax Advice">
        <p>
          Ground Up provides informational insights and visualizations based on
          the data available from your QuickBooks account. The Service is not a
          substitute for professional judgment and does not constitute financial,
          accounting, tax, legal, or investment advice. Calculations such as the
          financial health score and alerts are estimates that depend on the
          accuracy and completeness of your underlying data. You are solely
          responsible for decisions you make based on the Service and should
          consult a qualified professional before making significant business or
          financial decisions.
        </p>
      </Section>

      <Section title="7. Third-Party Services">
        <p>
          The Service relies on third-party services, including Intuit/QuickBooks
          Online, Supabase, and Vercel. We are not responsible for the
          availability, accuracy, or practices of these third parties, and their
          services are governed by their own terms and policies. Interruptions or
          changes to a third-party service may affect the Service.
        </p>
      </Section>

      <Section title="8. Disclaimer of Warranties">
        <p>
          THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE,” WITHOUT WARRANTIES OF
          ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY. TO THE FULLEST EXTENT
          PERMITTED BY LAW, RAFTAS DISCLAIMS ALL WARRANTIES, INCLUDING IMPLIED
          WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE,
          AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE
          UNINTERRUPTED, ERROR-FREE, SECURE, OR THAT ANY DATA OR CALCULATIONS WILL
          BE ACCURATE OR COMPLETE.
        </p>
      </Section>

      <Section title="9. Limitation of Liability">
        <p>
          TO THE FULLEST EXTENT PERMITTED BY LAW, IN NO EVENT WILL RAFTAS FINANCIAL
          GROUP OR ITS OWNERS, OFFICERS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY
          INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE
          DAMAGES, OR FOR ANY LOSS OF PROFITS, REVENUE, DATA, GOODWILL, OR OTHER
          INTANGIBLE LOSSES, ARISING OUT OF OR RELATING TO YOUR USE OF (OR
          INABILITY TO USE) THE SERVICE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH
          DAMAGES. IN ALL CASES, OUR TOTAL AGGREGATE LIABILITY ARISING OUT OF OR
          RELATING TO THE SERVICE WILL NOT EXCEED THE GREATER OF (A) THE AMOUNTS
          YOU PAID US FOR THE SERVICE IN THE TWELVE MONTHS PRECEDING THE CLAIM, OR
          (B) ONE HUNDRED U.S. DOLLARS (US$100). SOME JURISDICTIONS DO NOT ALLOW
          CERTAIN LIMITATIONS, SO SOME OF THE ABOVE MAY NOT APPLY TO YOU.
        </p>
      </Section>

      <Section title="10. Indemnification">
        <p>
          You agree to indemnify and hold harmless Raftas Financial Group and its
          owners, officers, employees, and agents from and against any claims,
          liabilities, damages, losses, and expenses (including reasonable legal
          fees) arising out of or related to your misuse of the Service, your
          violation of these Terms, or your violation of any law or the rights of
          a third party.
        </p>
      </Section>

      <Section title="11. Termination">
        <p>
          You may stop using the Service and close your account at any time. We may
          suspend or terminate your access to the Service if you violate these
          Terms or if we reasonably believe your use poses a risk to the Service or
          others. Upon termination, your right to use the Service ends, and we will
          handle your data as described in our Privacy Policy. Sections that by
          their nature should survive termination — including those on
          intellectual property, disclaimers, limitation of liability,
          indemnification, and governing law — will survive.
        </p>
      </Section>

      <Section title="12. Governing Law">
        <p>
          These Terms are governed by the laws of the Commonwealth of
          Pennsylvania, United States, without regard to its conflict-of-laws
          principles. You agree that the exclusive venue for any dispute arising
          out of or relating to these Terms or the Service will be the state and
          federal courts located in Pennsylvania, and you consent to the personal
          jurisdiction of those courts.
        </p>
      </Section>

      <Section title="13. Changes to These Terms">
        <p>
          We may update these Terms from time to time. When we do, we will revise
          the “Last updated” date above and, where appropriate, provide additional
          notice. Your continued use of the Service after an update takes effect
          constitutes acceptance of the revised Terms.
        </p>
      </Section>

      <Section title="14. Contact Us">
        <p>
          Questions about these Terms may be directed to Raftas Financial Group at{' '}
          <MailLink />.
        </p>
      </Section>
    </LegalLayout>
  );
}
