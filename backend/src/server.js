require('dotenv').config();

const app = require('./app');
const { pool } = require('./config/db');

const port = Number(process.env.PORT || 3000);

const server = app.listen(port, () => {
  console.log(`Campus Work-Study HR Portal Lite API listening on port ${port}`);
});

function shutdown(signal) {
  console.log(`${signal} received. Closing HTTP server and database pool.`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
