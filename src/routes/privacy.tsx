import { createFileRoute, Link } from "@tanstack/react-router";

const DESC =
  "Privacy policy for the My Weather Pal Android app: location used only for weather, cookies, no account required.";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — My Weather Pal" },
      { name: "description", content: DESC },
      { property: "og:title", content: "Privacy Policy — My Weather Pal" },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Privacy,
});

const EMAIL = "rod1974b@gmail.com";

function Privacy() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 text-foreground">
      <Link to="/" className="text-sm text-muted-foreground hover:underline">← Back to weather</Link>
      <h1 className="mt-4 text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: October 7, 2026</p>
      <div className="mt-6 space-y-4 leading-relaxed">
        <p>
          This Privacy Policy explains how the <strong>My Weather Pal</strong> Android app (package name{" "}
          <code>co.median.android.odeqrey</code>) and its website ("the App", "we", "us") handle your information.
          By using the App, you agree to this policy.
        </p>

        <h2 className="text-xl font-semibold">1. No account required</h2>
        <p>
          You can use My Weather Pal without creating an account or signing in. We do not ask for your name, email
          address, phone number, or any other personal details to use the App.
        </p>

        <h2 className="text-xl font-semibold">2. Location data</h2>
        <p>
          With your permission, the App accesses your device's location (approximate or precise) solely to show
          weather forecasts and alerts for where you are. Location is only requested when you tap the location button,
          and you can decline and search for a city instead. You can revoke location permission at any time in your
          Android settings (Settings → Apps → My Weather Pal → Permissions).
        </p>
        <p>
          Your coordinates are sent directly from your device to weather data providers to retrieve forecasts. We do
          not store your location on our servers, track your movements, or sell your location data.
        </p>

        <h2 className="text-xl font-semibold">3. Cookies and local storage</h2>
        <p>
          The App uses cookies and similar on-device storage (such as browser local storage) to remember your
          preferences and keep the App working, including: your last viewed forecast (for offline use), favorite
          cities, unit choice (US/Metric), text size, and background theme. These stay on your device. You can clear
          them at any time by clearing the App's data or cache in Android settings.
        </p>
        <p>We do not use cookies for advertising or cross-site tracking.</p>

        <h2 className="text-xl font-semibold">4. Third-party services</h2>
        <p>To provide weather information, the App sends requests to these services:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li><a className="underline" href="https://open-meteo.com/en/terms">Open-Meteo</a> — forecasts, air quality, and city search</li>
          <li><a className="underline" href="https://www.usgs.gov/privacy-policies">USGS</a> — earthquake information</li>
          <li><a className="underline" href="https://www.weather.gov/privacy">U.S. National Weather Service</a> — official weather alerts</li>
          <li>Median.co — the platform used to package the App for Android</li>
        </ul>
        <p>
          These providers may receive your IP address and the coordinates or city name needed to answer the request.
          Their use of data is governed by their own privacy policies.
        </p>

        <h2 className="text-xl font-semibold">5. What we do not do</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>We do not sell or rent your data.</li>
          <li>We do not show ads or use advertising trackers.</li>
          <li>We do not collect contacts, photos, files, or other personal content.</li>
        </ul>

        <h2 className="text-xl font-semibold">6. Data security and retention</h2>
        <p>
          All requests are made over secure HTTPS connections. Since data is stored only on your device, it is kept
          until you clear it or uninstall the App.
        </p>

        <h2 className="text-xl font-semibold">7. Children's privacy</h2>
        <p>
          The App is suitable for general audiences and does not knowingly collect personal information from children
          under 13.
        </p>

        <h2 className="text-xl font-semibold">8. Your rights</h2>
        <p>
          Depending on where you live (for example under GDPR or CCPA), you may have rights to access, correct, or
          delete your data. Because we don't hold personal data on our servers, you can exercise control directly by
          clearing App data or revoking permissions. You may also contact us with any request.
        </p>

        <h2 className="text-xl font-semibold">9. Changes to this policy</h2>
        <p>
          We may update this policy from time to time. Changes will be posted on this page with a new "Last updated"
          date.
        </p>

        <h2 className="text-xl font-semibold">10. Contact us</h2>
        <p>
          Questions about this policy? Email{" "}
          <a className="underline" href={`mailto:${EMAIL}`}>{EMAIL}</a>.
        </p>
      </div>
    </main>
  );
}
