# Play Console — Data safety answers

Copy these into Play Console → App content → **Data safety**. Our story is clean
because the app is offline-first and the developer runs no servers.

## Data collection and sharing
- **Does your app collect or share any of the required user data types?** → **No.**
  - The developer operates no backend and receives no user data.
  - Task/habit data is stored **only on the device**.
  - Optional sync sends data **only to a server the user runs themselves** — it is not
    collected by, shared with, or accessible to the developer. (Self-hosted, user-controlled
    transfer does not count as collection/sharing by the developer.)

## Security practices
- **Is all of the user data encrypted in transit?** → The app does not transmit data to
  the developer. For the optional self-hosted sync, the recommended setup uses HTTPS
  (Tailscale `tailscale serve`). Answer per your build: data is not sent to us; optional
  user-controlled sync uses HTTPS.
- **Do you provide a way for users to request that their data be deleted?** → Data is
  stored locally; users delete all data by **uninstalling** the app, and can **export** a
  backup beforehand. (No accounts exist to delete.)

## Permissions to declare / justify (App content → Permissions)
- **CAMERA** — used only to scan a pairing QR code for optional self-hosted sync. No
  images are stored or transmitted.
- (No `RECORD_AUDIO` — removed and blocked.)
- (No location, contacts, storage, or advertising permissions.)

## Ads & content
- **Contains ads?** → No.
- **Target audience** → 18+/general productivity (not directed to children); the app
  collects nothing from anyone.
- **Content rating questionnaire** → no objectionable content → expected **Everyone**.

> Keep these answers consistent with `docs/privacy.html` (the hosted Privacy Policy).
> If you later add a hosted/cloud backend, this form must be revised.
