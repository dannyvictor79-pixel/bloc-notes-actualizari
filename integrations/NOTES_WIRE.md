# Legare Bloc notes → Privat (fără robot/teste)

Panourile Privat rămân o app separată. Această versiune = chat + termene + memento-uri.

## 1. Copiază clientul
Pune `privatClient.mjs` în notes.

## 2. ENV per prieten
```
PRIVAT_BASE_URL=https://privat-chat.apps.grok.bot
PRIVAT_API_KEY=bn_...   # din Admin Privat
```

## 3. Înlocuiește Telegram
| Telegram | Privat |
|----------|--------|
| sendMessage | `sendMessage(text)` |
| listă termene | `listExpirations()` |
| adaugă termen | `addExpiration({ clientName, expiresAt })` |
| memento / rezumat | `sendDueReminders(3)` / `sendMorningSummary()` sau cron |

## 4. Cron
```bash
curl -X POST "$PRIVAT_BASE_URL/api/cron/reminders" \
  -H "Authorization: Bearer $CRON_SECRET"
```

## 5. Nu pe această app
Robotel IPTV / `.efectueaza test` / panou Teste — ulterior, app separat.
