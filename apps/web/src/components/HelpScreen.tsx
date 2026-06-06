import type { ReactNode } from 'react'
import { useStore } from '../store'
import { useSync } from '../sync/store'

const REPO_URL = 'https://github.com/investingeevee-apps/Targetgoals-tasks'

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent/15 text-sm font-bold text-accent">
        {n}
      </div>
      <div className="min-w-0">
        <div className="font-semibold text-slate-100">{title}</div>
        <div className="mt-1 space-y-1 text-sm leading-relaxed text-slate-400">{children}</div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
      <h2 className="mb-4 text-base font-bold text-white">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

const code = 'rounded bg-slate-800 px-1.5 py-0.5 font-mono text-xs text-slate-200'

export function HelpScreen() {
  const openSync = useSync((s) => s.openSettings)
  const setScreen = useStore((s) => s.setScreen)

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Setup &amp; Help</h1>
        <p className="text-sm text-slate-400">
          Everything stays on your devices. Use it solo, or sync your phone and desktop
          through your own server.
        </p>
      </header>

      <div className="space-y-5">
        <Section title="Getting started">
          <Step n={1} title="Install it as a desktop app">
            <p>
              In Chrome or Edge, open the install icon in the address bar (Edge:{' '}
              <span className="text-slate-300">⋯ → Apps → Install this site as an app</span>)
              and choose <span className="text-slate-300">Create Desktop shortcut</span>. It
              opens in its own window like a native app and works offline.
            </p>
          </Step>
          <Step n={2} title="Plan your day in Today">
            <p>
              The <strong>Today</strong> tab shows your recurring <strong>habits</strong> plus
              any <strong>tasks scheduled for today</strong>. To schedule a task, open it and
              use <strong>Add to Today</strong> — pick a one-time date, or a repeat
              (daily / specific weekdays / monthly). Overdue one-time tasks carry over until
              done. The <strong>Overview</strong> tab tracks streaks and a completion heatmap.
            </p>
          </Step>
          <Step n={3} title="Set goals and break them down">
            <p>
              In the <strong>Goals</strong> tab, create a goal and choose how to measure it
              (steps, a number, or daily habits). Then <strong>break it down</strong> into
              milestones and linked daily habits and watch progress climb — with an on-track
              read and, for number goals, a projected finish date. Everything's stored on your
              device.
            </p>
          </Step>
        </Section>

        <Section title="Sync your phone &amp; desktop">
          <Step n={1} title="Keep the server running">
            <p>
              Sync goes through a small server on your PC. Make it auto-start at login
              (no admin needed):
            </p>
            <p>
              <span className={code}>npm run startup:install -w @targetgoals/server</span>
            </p>
          </Step>
          <Step n={2} title="Connect this browser">
            <p>
              Click{' '}
              <button className="text-accent hover:underline" onClick={openSync}>
                Sync settings
              </button>{' '}
              → it's pre-filled with this server. Paste the token from{' '}
              <span className={code}>http://localhost:4000/pair</span> → Connect.
            </p>
          </Step>
          <Step n={3} title="Pair your phone">
            <p>
              Install the Android app (see the GitHub repo's Releases), open{' '}
              <strong>Sync → Scan pairing QR</strong>, and scan the QR in{' '}
              <button className="text-accent hover:underline" onClick={openSync}>
                Sync settings
              </button>
              . Make sure the QR's address is one your phone can reach (your LAN IP or
              Tailscale URL — not <span className={code}>localhost</span>).
            </p>
          </Step>
        </Section>

        <Section title="Reach it from anywhere (Tailscale)">
          <Step n={1} title="Install Tailscale on both devices">
            <p>
              Install{' '}
              <a className="text-accent hover:underline" href="https://tailscale.com/download" target="_blank" rel="noreferrer">
                Tailscale
              </a>{' '}
              on your PC and phone and sign in to the same account. It's a private,
              encrypted network — no port-forwarding, nothing exposed to the internet.
            </p>
          </Step>
          <Step n={2} title="Use your Tailscale address">
            <p>
              Find your PC's name with <span className={code}>tailscale status</span> (looks
              like <span className={code}>your-pc.tailnet-name.ts.net</span>). Put{' '}
              <span className={code}>http://your-pc.tailnet-name.ts.net:4000</span> into the
              pairing QR address (and the phone's server URL). Now it syncs from anywhere.
            </p>
          </Step>
          <Step n={3} title="Optional: HTTPS for the web app remotely">
            <p>
              To use this <em>web</em> app from your phone's browser too, front the server
              with HTTPS:{' '}
              <span className={code}>tailscale serve --bg --https=443 http://localhost:4000</span>,
              then use the <span className={code}>https://…ts.net</span> address.
            </p>
          </Step>
        </Section>

        <Section title="Your data &amp; privacy">
          <Step n={1} title="It never leaves your machines">
            <p>
              Tasks live in a SQLite file on your server PC. The API requires a secret
              token, and over Tailscale only your own devices can even reach the server —
              traffic is end-to-end encrypted. Nothing is sent to this project or any third
              party.
            </p>
          </Step>
        </Section>

        <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/40 px-5 py-4">
          <div className="text-sm text-slate-400">Open source — code, docs &amp; releases</div>
          <a
            className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-hover"
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
          >
            View on GitHub
          </a>
        </div>

        <button
          className="mx-auto block text-sm text-slate-500 hover:text-slate-300"
          onClick={() => setScreen('daily')}
        >
          ← Back to your tasks
        </button>
      </div>
    </div>
  )
}
