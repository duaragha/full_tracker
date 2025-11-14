/**
 * Verify the fix by calculating what the values should be
 */

// Nov 12 data from plug
const nov12Actual = {
  energy: 11.22,
  cost: 1.22,
  date: '2025-11-12'
}

// What was stored in DB (before fix)
const nov12DB = {
  energy: 2.17,
  cost: 0.21
}

// Calculate what the raw API value was
const rawApiValue = nov12DB.energy * 100  // Was divided by 100
console.log('=== Analysis of Nov 12 Data ===\n')
console.log('Plug showed:', nov12Actual.energy, 'kWh,', '$' + nov12Actual.cost)
console.log('DB stored:', nov12DB.energy, 'kWh,', '$' + nov12DB.cost)
console.log('\nCalculated raw API value (assuming ÷100):', rawApiValue)

// Apply new conversion (÷20)
const newEnergy = rawApiValue / 20
console.log('With new conversion (÷20):', newEnergy.toFixed(2), 'kWh')
console.log('Expected:', nov12Actual.energy, 'kWh')
console.log('Match?', Math.abs(newEnergy - nov12Actual.energy) < 0.1 ? '✅ YES' : '❌ NO')

// Cost calculation
const offPeakRate = 0.098  // Ontario off-peak rate
const newCost = newEnergy * offPeakRate
console.log('\nWith Ontario off-peak rate ($0.098/kWh):', '$' + newCost.toFixed(2))
console.log('Expected:', '$' + nov12Actual.cost)
console.log('Close enough?', Math.abs(newCost - nov12Actual.cost) < 0.5 ? '✅ YES (within $0.50)' : '❌ NO')
console.log('\nNote: Cost difference expected because:')
console.log('  - We assume overnight off-peak charging ($0.098/kWh)')
console.log('  - Actual charging may span multiple TOU periods')
console.log('  - Actual rate from plug: $' + (nov12Actual.cost / nov12Actual.energy).toFixed(3) + '/kWh')

// Test current device reading
console.log('\n=== Current Device Reading Test ===')
const currentAddEle = 101  // From diagnostics
console.log('Current add_ele value:', currentAddEle)
console.log('Old conversion (÷100):', (currentAddEle / 100).toFixed(2), 'kWh')
console.log('New conversion (÷20):', (currentAddEle / 20).toFixed(2), 'kWh')
