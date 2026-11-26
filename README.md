# Privat — panouri de chat (fără robot/teste)

Chatbot privat: panou admin + panouri separate pentru prieteni, termene și memento-uri.  
Robot / teste IPTV **nu** sunt pe această aplicație.

## Live

https://privat-chat.apps.grok.bot

## Ce include

- Admin creează panouri prieteni (link + API key)
- Chat pe fiecare panou
- Expirări + cron memento 3/6 zile
- API `/api/v1/*` pentru mesaje/termene (opțional Bloc notes)

## Local

```bash
npm install
env -u DATABASE_URL npm run dev
```

## Secrets

| Nume | Rol |
|------|-----|
| `APP_OWNER_EMAIL` | Emailul tău Cursor = admin |
| `CRON_SECRET` | Protejează cron-ul |
| `OPENAI_API_KEY` | Opțional, AI / OCR vision |
| `CHAT_AI_ENABLED` | `true` pentru chat AI |
| `OCR_AI_ENABLED` | `true` pentru OCR pe poze |
