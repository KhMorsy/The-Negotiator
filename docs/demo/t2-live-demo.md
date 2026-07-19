# T2 Demo Runbook

## Simulated judge demo

The default demo uses the same fake adapters as CI and needs no credentials:

```bash
scripts/demo/t2-live-demo.sh
```

The script starts the app, creates a confirmed Austin cleaning job, runs the
two-round simulated negotiation, and prints the live-calls and report URLs.

## Live adapter smoke

Set these values in `.env.local` before starting a live adapter session:

```bash
USE_SIMULATED_SPEECH=false
USE_SIMULATED_TELEPHONY=false
NEXT_PUBLIC_USE_FAKE_REALTIME=false
ELEVENLABS_API_KEY=...
ELEVENLABS_AGENT_ID=...
ELEVENLABS_TWILIO_CONNECT_URL=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Run the live launcher:

```bash
scripts/demo/t2-live-demo.sh --live
```

It starts the app and prints an intake URL. Complete the configured ElevenLabs
conversation, confirm the job, then use the calls dashboard to follow active
call rows. Real transcript/quote events must be received before a final report
can contain negotiated prices.

## Rollback

Restore `USE_SIMULATED_SPEECH=true`, `USE_SIMULATED_TELEPHONY=true`, and
`NEXT_PUBLIC_USE_FAKE_REALTIME=true` to return to the deterministic CI path.
