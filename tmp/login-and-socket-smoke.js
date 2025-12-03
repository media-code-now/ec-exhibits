import fetch from 'node-fetch';
import { io } from 'socket.io-client';

const API = process.env.API_URL || 'http://localhost:4000';
const EMAIL = process.env.TEST_EMAIL || 'matan@ec-exhibits.com';
const PASSWORD = process.env.TEST_PASSWORD || 'Password123!';
const PROJECT_ID = process.env.TEST_PROJECT_ID || 'demo-project-1';

async function login() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(json));
  return json.token; // server returns token in response after our patch
}

async function run() {
  try {
    console.log('Logging in as', EMAIL);
    const token = await login();
    console.log('Received token length', token?.length);

    const socket = io('http://localhost:4000', { auth: { token } });

    socket.on('connect', () => console.log('Socket connected:', socket.id));
    socket.on('connect_error', err => console.error('connect_error', err.message));
    socket.on('message:new', msg => console.log('message:new', msg));
    socket.on('message:ack', ack => console.log('message:ack', ack));
    socket.on('message:error', err => console.error('message:error', err));

    await new Promise(resolve => socket.once('connect', resolve));

    console.log('Joining project', PROJECT_ID);
    socket.emit('project:join', { projectId: PROJECT_ID });

    await new Promise(r => setTimeout(r, 1000));
    const clientMessageId = Math.random().toString(36).slice(2, 10);
    console.log('Sending message with clientMessageId', clientMessageId);
    socket.emit('message:send', { projectId: PROJECT_ID, body: 'Hello from smoke test', clientMessageId });

    await new Promise(r => setTimeout(r, 5000));
    socket.close();
  } catch (err) {
    console.error('Smoke test failed', err);
    process.exit(1);
  }
}

run();
