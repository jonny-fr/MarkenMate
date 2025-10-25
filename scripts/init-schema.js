#!/usr/bin/env node
/**
 * Database Schema Initialization Script
 * 
 * This script automatically initializes the PostgreSQL database schema
 * when the application starts for the first time.
 * 
 * It uses drizzle-kit to push the schema to the database.
 */

const { execSync } = require('child_process');
const postgres = require('postgres');

// Parse DATABASE_URL from environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable is not set');
  process.exit(1);
}

console.log('🔍 Checking database connection...');

async function waitForDatabase(maxRetries = 30, delayMs = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const sql = postgres(DATABASE_URL, { 
        connect_timeout: 5,
        idle_timeout: 5,
        max_lifetime: 10
      });
      
      await sql`SELECT 1`;
      await sql.end();
      console.log('✅ Database is ready!');
      return true;
    } catch (err) {
      console.log(`⏳ Waiting for database... (attempt ${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  throw new Error('Database is not available after maximum retries');
}

async function checkSchemaExists() {
  try {
    const sql = postgres(DATABASE_URL, { 
      connect_timeout: 5,
      idle_timeout: 5,
      max_lifetime: 10
    });
    
    // Check if any tables exist
    const result = await sql`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `;
    
    await sql.end();
    
    const tableCount = parseInt(result[0]?.count || 0, 10);
    return tableCount > 0;
  } catch (err) {
    console.error('Error checking schema:', err.message);
    return false;
  }
}

async function initializeSchema() {
  try {
    console.log('🚀 Initializing database schema with drizzle-kit...');
    
    // Run drizzle-kit push to create/update schema
    execSync('npx drizzle-kit push', {
      stdio: 'inherit',
      env: { ...process.env },
      cwd: process.cwd()
    });
    
    console.log('✅ Database schema initialized successfully!');
    return true;
  } catch (err) {
    console.error('❌ Error initializing schema:', err.message);
    return false;
  }
}

async function main() {
  try {
    // Wait for database to be available
    await waitForDatabase();
    
    // Check if schema already exists
    const schemaExists = await checkSchemaExists();
    
    if (schemaExists) {
      console.log('ℹ️  Database schema already exists - skipping initialization');
      console.log('💡 To update schema, run: pnpm db:push');
    } else {
      console.log('📝 No schema found - initializing...');
      const success = await initializeSchema();
      
      if (!success) {
        console.error('⚠️  Schema initialization failed, but application will continue');
        console.log('💡 You can manually initialize with: pnpm db:push');
      }
    }
    
    console.log('🎉 Database initialization complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Fatal error during database initialization:', err.message);
    console.log('💡 Please check your database connection and try again');
    process.exit(1);
  }
}

// Run main function
main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
