# Releasing

Two GitHub Actions workflows live in [`.github/workflows`](../.github/workflows):

| Workflow | Trigger | What it does |
| --- | --- | --- |
| **CI** (`ci.yml`) | every push to `main` + PRs | `npm ci`, build the web app (+ shared), typecheck the server and mobile app |
| **Release Android APK** (`release-android.yml`) | pushing a `v*` tag (or manual) | builds the APK on EAS and attaches it to the GitHub Release for that tag |

## One-time setup: the `EXPO_TOKEN` secret

The release workflow builds on EAS, so CI needs an Expo access token:

1. On [expo.dev](https://expo.dev): **Account settings → Access tokens → Create token**
   (use the account that owns this project — the `owner` in `apps/mobile/app.json`).
2. In the GitHub repo: **Settings → Secrets and variables → Actions → New repository
   secret** → name **`EXPO_TOKEN`**, paste the token.

EAS manages the Android signing keystore for you (created the first time you build).

## Cut a release

```bash
# 1. bump the version in apps/mobile/app.json ("version") and package.json
# 2. commit, then tag and push the tag:
git tag v0.1.0
git push origin v0.1.0
```

The **Release Android APK** workflow then:
1. builds the APK on EAS (`production` profile → `.apk`), waiting for it to finish
   (~10–20 min),
2. downloads the artifact,
3. publishes it to the GitHub **Release** for that tag (with auto-generated notes).

People can then download `TargetGoalsTasks-v0.1.0.apk` from the release and sideload it
(allow "install unknown apps"). See [ANDROID.md](ANDROID.md).

## Manual build (no release)

From the **Actions** tab → **Release Android APK → Run workflow** (pick `production` or
`preview`). It builds and uploads the APK as a **workflow artifact** (no Release is
published unless triggered by a tag).

## Building locally instead

You don't need CI to release — you can always build by hand:

```bash
cd apps/mobile
npx eas-cli build -p android --profile production
```

and attach the resulting APK to a release yourself.
