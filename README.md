# Privat — chatbot cu panouri

Chatbot privat cu:

- **Panou admin** — chat personal + creare panouri pentru prieteni
- **Panouri prieteni** — fiecare prieten are spațiu de chat separat, acces prin link de invitație
- Autentificare Cursor (publish privat / team)
- Postgres pentru mesaje și panouri
- OpenAI pentru răspunsuri (fallback demo fără cheie)

## Local

```bash
npm install
env -u DATABASE_URL npm run dev
```

## Build

```bash
npm run build
```
