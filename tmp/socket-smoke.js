import { io } from 'socket.io-client';

// Connect to local server
const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:4000';

// Use demo user's token: we will request /auth/login to get a token, but to keep this small
// we'll use a pre-built demo token if present in env or fallback to a known demo token string.

const DEMO_TOKEN = process.env.DEMO_TOKEN || '';

async function run() {
  try {
    if (!DEMO_TOKEN) {
      console.log('No DEMO_TOKEN provided in env. This script expects a valid JWT token.');
      process.exit(1);
    }

    const socket = io(SOCKET_URL, { auth: { token: DEMO_TOKEN } });

    socket.on('connect', () => {
      console.log('connected as', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.error('connect_error', err.message);
    });

    socket.on('message:new', (msg) => {
      console.log('message:new', msg);
    });

    socket.on('message:ack', (ack) => {
      console.log('message:ack', ack);
    });

    socket.on('message:error', (err) => {
      console.error('message:error', err);
    });

    // Wait for connect
    await new Promise(resolve => socket.once('connect', resolve));

    const projectId = process.env.TEST_PROJECT_ID || 'demo-project-1';
    console.log('joining', projectId);
    socket.emit('project:join', { projectId });

    // Wait a bit then send message
    await new Promise(r => setTimeout(r, 1000));
    const clientMessageId = cryptoRandomId();
    console.log('sending message with clientMessageId', clientMessageId);
    socket.emit('message:send', { projectId, body: 'Hello from smoke test', clientMessageId });

    // wait for ack or error
    await new Promise(r => setTimeout(r, 5000));
    socket.close();
    process.exit(0);
  } catch (err) {
    console.error('Error in smoke script', err);
    process.exit(2);
  }
}

function cryptoRandomId() {
  return Math.random().toString(36).slice(2, 10);
}

run();
