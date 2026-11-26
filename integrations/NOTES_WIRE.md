# Legare Bloc notes → Privat (fără robot încă)

## 1. Copiază clientul
Pune `privatClient.mjs` în proiectul notes (orice folder `lib/` / `services/`).

## 2. ENV per prieten
```
PRIVAT_BASE_URL=https://privat-chat.apps.grok.bot
PRIVAT_API_KEY=bn_...   # din Admin Privat
```

## 3. Înlocuiește apelurile Telegram
| Telegram | Privat |
|----------|--------|
| bot token / getMe | `ping()` / `capabilities()` |
| sendMessage | `sendMessage(text)` |
| listă termene | `listExpirations()` |
| adaugă termen | `addExpiration({ clientName, expiresAt })` |
| memento 3 zile | `sendDueReminders(3)` sau cron |
| rezumat 09:00 | `sendMorningSummary()` sau cron |
| test 24h/48h | `createTest({ ... })` *(simulat)* |

## 4. Cron (VPS / notes)
```bash
curl -X POST "$PRIVAT_BASE_URL/api/cron/reminders" \
  -H "Authorization: Bearer $CRON_SECRET"
```
Rulează la fiecare oră.

## 5. Vizibilitate app
Ca notes (server) să apeleze API-ul, Privat trebuie accesibil din afară
(de obicei **Public** în Publish Settings). UI-ul rămâne pe API key / login.

## 6. Ulterior
Robotelul IPTV se leagă pe `createTest` / panel test — fără să schimbe chatul.
