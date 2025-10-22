import { Pool } from 'pg'
import * as fs from 'fs'
import * as path from 'path'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL || 'postgresql://postgres:postgres@localhost:5432/tracker',
  ssl: false,
})

async function runMigration() {
  try {
    const migrationPath = path.join(__dirname, '../db/migrations/013_add_is_replacement.sql')
    const sql = fs.readFileSync(migrationPath, 'utf-8')

    console.log('Running migration 013_add_is_replacement.sql...')
    await pool.query(sql)
    console.log('✓ Migration completed successfully!')
  } catch (error) {
    console.error('Error running migration:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

runMigration()
