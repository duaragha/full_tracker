# Inventory Scripts

## Update Keep Until Dates

This script updates the `keep_until` date for all existing inventory items based on their cost and purchase date.

### Formula

The script applies the following formula based on price ranges:

- **$0-250**: multiply by 5
- **$251-500**: multiply by 4
- **$501-1000**: multiply by 3
- **$1001-1500**: multiply by 2
- **$1501-2000**: multiply by 1.5
- **$2001+**: multiply by 1

**Example**: If you bought something for $120 on April 19, 2021:
- Price: $120 (falls in $0-250 range)
- Multiplier: 5
- Days to add: 120 × 5 = 600 days
- Keep Until: December 10, 2022

### Running the Script

```bash
# Make sure you have the DATABASE_URL or POSTGRES_URL environment variable set
export DATABASE_URL="your_database_connection_string"

# Run the script
npx tsx scripts/update-inventory-keep-until.ts
```

### What it does

1. Fetches all inventory items that have both a `cost` and `purchased_when` date
2. Calculates the `keep_until` date based on the formula above
3. Updates each item in the database
4. Shows a summary of items updated, skipped, and any errors

### Safety

- Only updates items that have both cost and purchase date
- Shows detailed output for each item updated
- Includes error handling for individual items
