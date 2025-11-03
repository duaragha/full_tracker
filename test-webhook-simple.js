/**
 * Simple test to verify Plex webhook endpoint logic
 * Run with: node test-webhook-simple.js
 */

const { Pool } = require('pg');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
});

// Sample Plex webhook payload
const samplePayload = {
  event: 'media.scrobble',
  user: true,
  owner: true,
  Account: {
    id: 1,
    thumb: 'https://plex.tv/users/1234/avatar',
    title: 'TestUser'
  },
  Server: {
    title: 'Test Plex Server',
    uuid: 'test-uuid-1234'
  },
  Player: {
    local: true,
    publicAddress: '192.168.1.100',
    title: 'Test Player',
    uuid: 'player-uuid-5678'
  },
  Metadata: {
    librarySectionType: 'show',
    ratingKey: '12345',
    key: '/library/metadata/12345',
    parentRatingKey: '11111',
    grandparentRatingKey: '10000',
    guid: 'plex://episode/5d9c086fe9d5a1001e9d4d3c',
    type: 'episode',
    title: 'Pilot',
    grandparentTitle: 'Breaking Bad',
    parentTitle: 'Season 1',
    parentIndex: 1,
    index: 1,
    year: 2008,
    thumb: '/library/metadata/12345/thumb/1234567890',
    addedAt: 1234567890,
    updatedAt: 1234567890
  }
};

async function runTests() {
  console.log('\n==============================================');
  console.log('Plex Webhook Endpoint - Diagnostic Tests');
  console.log('==============================================\n');

  try {
    // Test 1: Database connection
    console.log('Test 1: Database Connection');
    console.log('----------------------------');
    try {
      const result = await pool.query('SELECT NOW()');
      console.log('✓ Database connection successful');
      console.log(`  Timestamp: ${result.rows[0].now}\n`);
    } catch (error) {
      console.log('✗ Database connection failed:', error.message);
      return;
    }

    // Test 2: Check Plex configuration
    console.log('Test 2: Plex Configuration');
    console.log('----------------------------');
    const configResult = await pool.query(
      'SELECT id, user_id, enabled, auto_add_shows, auto_mark_watched, webhook_secret FROM plex_config WHERE user_id = 1'
    );

    if (configResult.rows.length === 0) {
      console.log('✗ No Plex configuration found');
      console.log('  You need to configure Plex first\n');
      return;
    }

    const config = configResult.rows[0];
    console.log('✓ Plex configuration found');
    console.log(`  Enabled: ${config.enabled}`);
    console.log(`  Auto Mark Watched: ${config.auto_mark_watched}`);
    console.log(`  Auto Add Shows: ${config.auto_add_shows}`);
    console.log(`  Webhook Secret: ${config.webhook_secret.substring(0, 10)}...`);
    console.log(`  Webhook URL: ${process.env.PUBLIC_WEBHOOK_URL || 'http://localhost:3000'}/api/plex/webhook?secret=${config.webhook_secret}\n`);

    // Test 3: Check if tables exist
    console.log('Test 3: Database Tables');
    console.log('----------------------------');
    const tables = ['plex_config', 'plex_show_mappings', 'plex_webhook_logs', 'plex_conflicts'];
    for (const table of tables) {
      const tableCheck = await pool.query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`,
        [table]
      );
      if (tableCheck.rows[0].exists) {
        console.log(`✓ Table '${table}' exists`);
      } else {
        console.log(`✗ Table '${table}' missing`);
      }
    }
    console.log();

    // Test 4: Check webhook logs
    console.log('Test 4: Existing Webhook Logs');
    console.log('----------------------------');
    const logsResult = await pool.query(
      'SELECT COUNT(*) as count FROM plex_webhook_logs'
    );
    const logCount = parseInt(logsResult.rows[0].count);
    console.log(`Total webhook logs: ${logCount}`);

    if (logCount > 0) {
      const recentLogs = await pool.query(
        `SELECT id, event_type, plex_title, plex_season, plex_episode, status, action_taken,
         TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created
         FROM plex_webhook_logs
         ORDER BY created_at DESC
         LIMIT 5`
      );
      console.log('\nRecent logs:');
      console.table(recentLogs.rows);
    } else {
      console.log('✗ No webhook logs found (webhooks not being received)');
    }
    console.log();

    // Test 5: Check show mappings
    console.log('Test 5: Show Mappings');
    console.log('----------------------------');
    const mappingsResult = await pool.query(
      'SELECT COUNT(*) as count FROM plex_show_mappings'
    );
    const mappingCount = parseInt(mappingsResult.rows[0].count);
    console.log(`Total show mappings: ${mappingCount}`);

    if (mappingCount > 0) {
      const mappings = await pool.query(
        `SELECT id, plex_title, tvshow_id, match_confidence, match_method, sync_enabled
         FROM plex_show_mappings
         LIMIT 5`
      );
      console.log('\nMappings:');
      console.table(mappings.rows);
    } else {
      console.log('⚠ No show mappings (normal on first run)');
    }
    console.log();

    // Test 6: Check conflicts
    console.log('Test 6: Unresolved Conflicts');
    console.log('----------------------------');
    const conflictsResult = await pool.query(
      'SELECT COUNT(*) as count FROM plex_conflicts WHERE resolved = false'
    );
    const conflictCount = parseInt(conflictsResult.rows[0].count);
    console.log(`Unresolved conflicts: ${conflictCount}`);

    if (conflictCount > 0) {
      const conflicts = await pool.query(
        `SELECT id, plex_title, conflict_type,
         TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created
         FROM plex_conflicts
         WHERE resolved = false
         ORDER BY created_at DESC
         LIMIT 5`
      );
      console.log('\nConflicts:');
      console.table(conflicts.rows);
      console.log('⚠ These conflicts need manual resolution');
    } else {
      console.log('✓ No unresolved conflicts');
    }
    console.log();

    // Test 7: Check TV shows in tracker
    console.log('Test 7: TV Shows in Tracker');
    console.log('----------------------------');
    const showsResult = await pool.query(
      `SELECT COUNT(*) as count FROM tvshows`
    );
    const showCount = parseInt(showsResult.rows[0].count);
    console.log(`Total TV shows: ${showCount}`);

    if (showCount > 0) {
      const shows = await pool.query(
        `SELECT id, title, tmdb_id, watched_episodes, total_episodes
         FROM tvshows
         ORDER BY updated_at DESC
         LIMIT 5`
      );
      console.log('\nRecent shows:');
      console.table(shows.rows);
    } else {
      console.log('⚠ No TV shows in tracker (add some shows first)');
    }
    console.log();

    // Test 8: Simulate webhook processing logic
    console.log('Test 8: Simulate Webhook Processing');
    console.log('----------------------------');
    console.log('Testing with sample payload: Breaking Bad S01E01');
    console.log('Event type:', samplePayload.event);
    console.log('Show:', samplePayload.Metadata.grandparentTitle);
    console.log('Season:', samplePayload.Metadata.parentIndex);
    console.log('Episode:', samplePayload.Metadata.index);
    console.log();

    // Check if auto_mark_watched is enabled
    if (!config.auto_mark_watched) {
      console.log('✗ Auto-mark watched is DISABLED');
      console.log('  Webhook would be ignored');
      console.log('  Enable in config to process webhooks\n');
      return;
    }

    console.log('✓ Auto-mark watched is enabled');
    console.log();

    // Check for existing mapping
    const mappingCheck = await pool.query(
      'SELECT * FROM plex_show_mappings WHERE plex_rating_key = $1',
      [samplePayload.Metadata.grandparentRatingKey]
    );

    if (mappingCheck.rows.length > 0) {
      const mapping = mappingCheck.rows[0];
      console.log('✓ Show mapping exists');
      console.log(`  Plex: ${mapping.plex_title}`);
      console.log(`  Tracker ID: ${mapping.tvshow_id}`);
      console.log(`  Method: ${mapping.match_method}`);
      console.log(`  Confidence: ${mapping.match_confidence}`);

      if (mapping.tvshow_id) {
        console.log('\n  → Webhook would mark episode as watched');
      } else {
        console.log('\n  ⚠ Mapping exists but no tracker show linked');
        console.log('  → Webhook would create a conflict');
      }
    } else {
      console.log('⚠ No mapping for this show');
      console.log('  → Webhook would attempt to match show');
      console.log('  → If no match found, would create a conflict');
    }
    console.log();

    // Summary
    console.log('==============================================');
    console.log('Diagnostic Summary');
    console.log('==============================================\n');
    console.log(`Database: ${config.enabled ? '✓ Connected' : '✗ Disconnected'}`);
    console.log(`Configuration: ${config.enabled ? '✓ Enabled' : '✗ Disabled'}`);
    console.log(`Auto-mark watched: ${config.auto_mark_watched ? '✓ Enabled' : '✗ Disabled'}`);
    console.log(`Webhook logs: ${logCount > 0 ? `✓ ${logCount} logs` : '✗ No logs (not receiving webhooks)'}`);
    console.log(`Show mappings: ${mappingCount > 0 ? `✓ ${mappingCount} mappings` : '⚠ No mappings'}`);
    console.log(`Conflicts: ${conflictCount > 0 ? `⚠ ${conflictCount} unresolved` : '✓ None'}`);
    console.log(`TV shows in tracker: ${showCount > 0 ? `✓ ${showCount} shows` : '⚠ No shows'}`);
    console.log();

    // Recommendations
    console.log('Recommendations:');
    console.log('----------------');

    if (logCount === 0) {
      console.log('1. No webhooks received from Plex. Verify:');
      console.log('   - Server is running (npm run dev)');
      console.log('   - Webhook URL is configured in Plex');
      console.log('   - Webhook URL is accessible (use ngrok for local testing)');
      console.log('   - Mark an episode as watched in Plex to trigger webhook');
    }

    if (conflictCount > 0) {
      console.log('2. Resolve conflicts in the UI:');
      console.log('   - Visit /settings/plex (or conflict resolution page)');
      console.log('   - Match Plex shows to tracker shows manually');
    }

    if (showCount === 0) {
      console.log('3. Add TV shows to your tracker first');
      console.log('   - This provides shows to match against');
    }

    console.log();

  } catch (error) {
    console.error('✗ Error running tests:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

// Run tests
runTests();
