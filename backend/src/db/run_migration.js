#!/usr/bin/env node

/**
 * Simple migration runner for adding missing columns to sessions table
 * Usage: node run_migration.js
 *
 * Requires DATABASE_URL environment variable to be set
 */

const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("❌ ERROR: DATABASE_URL environment variable is not set");
    console.log(
      "Please set DATABASE_URL in your .env file or environment variables",
    );
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl:
      databaseUrl.includes("render.com") ||
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  });

  try {
    console.log("🔗 Connecting to database...");
    await client.connect();
    console.log("✅ Connected to database");

    // Apply every numbered migration in src/db/migrations/ in order.
    const migrationsDir = path.join(__dirname, "migrations");
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((f) => /^\d+_.*\.sql$/.test(f))
      .sort();

    if (migrationFiles.length === 0) {
      console.log("ℹ️  No migrations found in", migrationsDir);
    }

    for (const file of migrationFiles) {
      const migrationPath = path.join(migrationsDir, file);
      const migrationSQL = fs.readFileSync(migrationPath, "utf8");
      console.log(`🚀 Applying migration: ${file}`);
      await client.query(migrationSQL);
      console.log(`✅ ${file} applied`);
    }

    // Test the connection by checking if the columns exist
    const sessionsQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'sessions' 
      ORDER BY ordinal_position;
    `;

    const recommendationsQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'recommendations' 
      ORDER BY ordinal_position;
    `;

    const sessionsResult = await client.query(sessionsQuery);
    const recommendationsResult = await client.query(recommendationsQuery);

    console.log("\n📋 Current sessions table columns:");
    sessionsResult.rows.forEach((row) => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    console.log("\n📋 Current recommendations table columns:");
    recommendationsResult.rows.forEach((row) => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await client.end();
    console.log("\n🔒 Database connection closed");
  }
}

if (require.main === module) {
  runMigration().catch(console.error);
}

module.exports = { runMigration };
