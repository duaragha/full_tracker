const { Pool } = require('pg')

const pool = new Pool({
  connectionString: 'postgresql://postgres:NXeHZloHCpBzRoOfaKHHYkJLgArIbxGj@ballast.proxy.rlwy.net:44476/railway',
  ssl: false,
})

async function checkDbValues() {
  try {
    const result = await pool.query(`
      SELECT date, energy_kwh, cost, km_driven, notes
      FROM phev_tracker
      WHERE date BETWEEN '2025-11-08' AND '2025-11-12'
      ORDER BY date DESC
    `)

    console.log('=== Database Values ===\n')
    console.log('Date        | Energy (kWh) | Cost ($) | KM     | Notes')
    console.log('-'.repeat(70))

    result.rows.forEach(row => {
      console.log(
        `${row.date.toISOString().split('T')[0]} | ${(row.energy_kwh || 'NULL').toString().padEnd(12)} | ${(row.cost || 'NULL').toString().padEnd(8)} | ${(row.km_driven || 'NULL').toString().padEnd(6)} | ${row.notes || ''}`
      )
    })

    console.log('\n=== Comparison with Plug Readings ===')
    console.log('Nov 12: DB shows', result.rows.find(r => r.date.toISOString().startsWith('2025-11-12'))?.energy_kwh, 'kWh | Plug showed 11.22 kWh')
    console.log('Nov 11: DB shows', result.rows.find(r => r.date.toISOString().startsWith('2025-11-11'))?.energy_kwh, 'kWh | Plug showed 11.6 kWh')
    console.log('Nov 10: DB shows', result.rows.find(r => r.date.toISOString().startsWith('2025-11-10'))?.energy_kwh, 'kWh | Plug showed 11.76 kWh')
    console.log('Nov 8: DB shows', result.rows.find(r => r.date.toISOString().startsWith('2025-11-08'))?.energy_kwh, 'kWh | Plug showed 12.15 kWh')

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await pool.end()
  }
}

checkDbValues()
