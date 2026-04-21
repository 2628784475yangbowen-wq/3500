#!/usr/bin/env node
/**
 * Cross-platform SQL runner so `npm run db:schema` and `npm run db:seed`
 * work the same on Windows PowerShell, cmd.exe, bash, and CI shells.
 * Uses the `pg` driver so no local `psql` binary is required.
 */
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

require('dotenv').config();

async function main() {
  const [, , relativePath] = process.argv;

  if (!relativePath) {
    console.error('Usage: node scripts/run-sql.js <path/to/file.sql>');
    process.exit(1);
  }

  const filePath = path.resolve(process.cwd(), relativePath);
  if (!fs.existsSync(filePath)) {
    console.error(`SQL file not found: ${filePath}`);
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set. Copy .env.example to .env and set DATABASE_URL first.');
    process.exit(1);
  }

  const sql = fs.readFileSync(filePath, 'utf8');
  const client = new Client({
    connectionString,
    ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined
  });

  try {
    await client.connect();
    await client.query(sql);
    console.log(`Applied ${path.relative(process.cwd(), filePath)}`);
  } catch (error) {
    console.error(`Failed to apply SQL file: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
