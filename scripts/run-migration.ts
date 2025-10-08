import { Pool } from 'pg'
import { readFileSync } from 'fs'
import { join } from 'path'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
})

async function runMigration(filename: string) {
  const sql = readFileSync(join(__dirname, '..', 'db', 'migrations', filename), 'utf-8')

  try {
    await pool.query(sql)
    console.log(`✓ Migration ${filename} completed successfully`)
  } catch (error) {
    console.error(`✗ Migration ${filename} failed:`, error)
    throw error
  } finally {
    await pool.end()
  }
}

const migrationFile = process.argv[2]
if (!migrationFile) {
  console.error('Usage: tsx scripts/run-migration.ts <migration-file>')
  process.exit(1)
}

runMigration(migrationFile)
