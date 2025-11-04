import { Pool } from 'pg'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
})

async function checkDatabase() {
  console.log('🔍 PHEV DATABASE ANALYSIS\n')
  console.log('=' .repeat(70))

  try {
    // Check if table exists
    console.log('1️⃣ Checking if phev_tracker table exists...')
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'phev_tracker'
      );
    `)

    if (!tableCheck.rows[0].exists) {
      console.log('   ❌ Table does not exist!')
      return
    }
    console.log('   ✅ Table exists\n')

    // Check table schema
    console.log('2️⃣ Checking table schema...')
    const schemaCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'phev_tracker'
      ORDER BY ordinal_position;
    `)

    console.log('   Columns:')
    schemaCheck.rows.forEach(col => {
      console.log(`     - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`)
    })
    console.log()

    // Check if energy_kwh column exists
    const hasEnergyColumn = schemaCheck.rows.some(col => col.column_name === 'energy_kwh')
    if (hasEnergyColumn) {
      console.log('   ✅ energy_kwh column exists')
    } else {
      console.log('   ⚠️  energy_kwh column MISSING - run migration 014')
    }
    console.log()

    // Count total records
    console.log('3️⃣ Checking data...')
    const countResult = await pool.query('SELECT COUNT(*) as total FROM phev_tracker')
    const totalRecords = parseInt(countResult.rows[0].total)
    console.log(`   Total records: ${totalRecords}`)

    if (totalRecords === 0) {
      console.log('   ℹ️  No data in table yet')
      return
    }

    // Check energy data distribution
    if (hasEnergyColumn) {
      const energyStats = await pool.query(`
        SELECT
          COUNT(*) as total,
          COUNT(energy_kwh) as with_energy,
          COUNT(*) - COUNT(energy_kwh) as without_energy,
          MIN(energy_kwh) as min_energy,
          MAX(energy_kwh) as max_energy,
          AVG(energy_kwh) as avg_energy,
          SUM(energy_kwh) as total_energy
        FROM phev_tracker
      `)

      const stats = energyStats.rows[0]
      console.log(`   Records with energy data: ${stats.with_energy}/${stats.total}`)
      console.log(`   Records without energy data: ${stats.without_energy}`)

      if (parseInt(stats.with_energy) > 0) {
        console.log(`   Min energy: ${parseFloat(stats.min_energy).toFixed(3)} kWh`)
        console.log(`   Max energy: ${parseFloat(stats.max_energy).toFixed(3)} kWh`)
        console.log(`   Avg energy: ${parseFloat(stats.avg_energy).toFixed(3)} kWh`)
        console.log(`   Total energy: ${parseFloat(stats.total_energy).toFixed(3)} kWh`)
      }
    }
    console.log()

    // Show recent records
    console.log('4️⃣ Recent records (last 10):')
    const recentQuery = hasEnergyColumn
      ? 'SELECT id, date, cost, km_driven, energy_kwh, notes FROM phev_tracker ORDER BY date DESC LIMIT 10'
      : 'SELECT id, date, cost, km_driven, notes FROM phev_tracker ORDER BY date DESC LIMIT 10'

    const recent = await pool.query(recentQuery)

    if (recent.rows.length === 0) {
      console.log('   No records found')
    } else {
      console.log()
      recent.rows.forEach((row, idx) => {
        console.log(`   ${idx + 1}. ${row.date}`)
        console.log(`      Cost: $${row.cost}`)
        console.log(`      KM: ${row.km_driven}`)
        if (hasEnergyColumn) {
          console.log(`      Energy: ${row.energy_kwh ? parseFloat(row.energy_kwh).toFixed(3) + ' kWh' : 'NULL'}`)
        }
        if (row.notes) {
          console.log(`      Notes: ${row.notes}`)
        }
        console.log()
      })
    }

    // Check date range
    console.log('5️⃣ Data range:')
    const rangeResult = await pool.query(`
      SELECT
        MIN(date) as earliest,
        MAX(date) as latest,
        MAX(date)::date - MIN(date)::date as days_span
      FROM phev_tracker
    `)

    const range = rangeResult.rows[0]
    console.log(`   Earliest: ${range.earliest}`)
    console.log(`   Latest: ${range.latest}`)
    console.log(`   Days span: ${range.days_span}`)
    console.log()

    // Recommendations
    console.log('=' .repeat(70))
    console.log('📋 RECOMMENDATIONS')
    console.log('=' .repeat(70))

    if (!hasEnergyColumn) {
      console.log('❗ Run migration to add energy_kwh column:')
      console.log('   npx tsx scripts/run-migration.ts db/migrations/014_add_energy_kwh_to_phev.sql')
    } else if (parseInt(energyStats.rows[0].without_energy) > 0) {
      console.log(`⚠️  ${energyStats.rows[0].without_energy} records missing energy data`)
      console.log('   Consider running backfill script after fixing Tuya API:')
      console.log('   npm run backfill-energy')
    }

    if (totalRecords === 0) {
      console.log('ℹ️  No data yet. Start adding charging sessions!')
    } else if (parseInt(energyStats.rows[0].with_energy) === 0) {
      console.log('⚠️  No energy data collected yet')
      console.log('   Possible causes:')
      console.log('   1. Energy Management API not subscribed in Tuya IoT Platform')
      console.log('   2. Manual entries without energy data')
      console.log('   3. Smart plug not recording energy consumption')
    } else {
      console.log('✅ Database is healthy with energy data')
    }

  } catch (error) {
    console.error('❌ Database error:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
    }
  } finally {
    await pool.end()
  }
}

checkDatabase()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error)
    process.exit(1)
  })
