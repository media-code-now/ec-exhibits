# EC Portal Server (Prototype)

This Express + Socket.IO server demonstrates real-time project messaging, notification badges, and drag & drop uploads for the EC-Exhibits client portal concept.

## Quick start

```bash
cd server
npm install
npm run dev
```

The server exposes REST + WebSocket endpoints on `http://localhost:4000` and ships with demo users. Request a JWT by posting to `/auth/token` with `{ "userId": "user-owner" }` and reuse the token in the client `Authorization` header / Socket.IO auth payload.

Uploaded files are stored in `server/uploads/` and metadata is tracked in-memory for demonstration purposes only.
