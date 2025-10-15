EC Exhibits — Client Portal

Run locally

Server

cd server
npm install
npm run dev

Client

cd client
npm install
npm run dev

Deploy to Netlify

1. Create a GitHub repository and push this project.
2. On Netlify, choose "New site from Git" and connect the GitHub repo.
   - Base directory: client
   - Build command: npm run build
   - Publish directory: client/dist

Notes
- The server is a lightweight Express + Socket.IO demo and is intended for local development.
