# Privat — chatbot gata de integrare cu Bloc notes

Canalul care înlocuiește Telegram: panouri prieteni, API key, termene, memento-uri, teste (simulate până la robotel).

## Live

https://privat-chat.apps.grok.bot

## Pentru Bloc notes

1. Copiază `integrations/privatClient.mjs` în notes  
2. Vezi `integrations/NOTES_WIRE.md`  
3. ENV: `PRIVAT_BASE_URL` + `PRIVAT_API_KEY` (din Admin)  
4. Cron orar: `POST /api/cron/reminders` cu `CRON_SECRET`

## Local

```bash
npm install
env -u DATABASE_URL npm run dev
```

## Secrets (opțional / admin)

| Nume | Rol |
|------|-----|
| `APP_OWNER_EMAIL` | Emailul tău Cursor = admin |
| `CRON_SECRET` | Protejează cron-ul de memento-uri |
| `OPENAI_API_KEY` | Pentru AI / OCR vision |
| `CHAT_AI_ENABLED` | `true` ca să trimită mesaje la OpenAI |
| `OCR_AI_ENABLED` | `true` ca să trimită poze la OpenAI vision |

Fără chei AI, chatul și parse-ul text (MAC din banner) merg local.
