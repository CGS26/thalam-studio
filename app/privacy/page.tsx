import Link from "next/link";

const repositoryUrl = "https://github.com/CGS26/thalam-studio";

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <article>
        <span className="legal-eyebrow">TĀLA LAB</span>
        <h1>Privacy</h1>
        <p className="legal-updated">Last updated: 28 July 2026</p>

        <h2>Local processing</h2>
        <p>
          Tāla Lab does not provide accounts or a project database. Compositions,
          settings, and imported audio are processed locally in your browser.
          Imported audio is not intentionally uploaded to Tāla Lab.
        </p>

        <h2>Offline storage</h2>
        <p>
          The service worker stores application files and previously visited
          same-origin resources on your device so the installed PWA can reopen
          offline. You can remove this data by uninstalling the PWA or clearing
          the site&apos;s browser data.
        </p>

        <h2>Hosting</h2>
        <p>
          The public application is hosted by Vercel. Like most hosting
          providers, Vercel may process technical request data such as IP
          address, date and time, requested URL, browser information, and
          diagnostic logs to deliver and secure the service.
        </p>

        <h2>Fonts and external requests</h2>
        <p>
          The interface currently requests the Poppins font from Google Fonts.
          That request can disclose technical connection information, including
          your IP address, to Google. No advertising or analytics trackers are
          intentionally included.
        </p>

        <h2>Your controls</h2>
        <p>
          You can clear cached data through your browser settings, uninstall the
          PWA at any time, and avoid importing files you do not want processed
          locally by the application.
        </p>

        <h2>Contact and source</h2>
        <p>
          Tāla Lab is an open-source project. Questions and source code are
          available through the project repository.
        </p>
        <div className="legal-actions">
          <Link href="/">Back to Tāla Lab</Link>
          <a href={repositoryUrl} target="_blank" rel="noreferrer">View source</a>
        </div>
      </article>
    </main>
  );
}
