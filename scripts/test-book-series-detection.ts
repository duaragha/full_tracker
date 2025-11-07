import { BookSeriesDetectionService } from '../lib/services/book-series-detection-service';

/**
 * Test script for the enhanced book series detection system
 */

const testCases = [
  // Pattern 1: (Series Name, #N)
  {
    title: 'The Fellowship of the Ring (The Lord of the Rings, #1)',
    author: 'J.R.R. Tolkien',
    expected: { series: 'The Lord of the Rings', position: 1 },
  },
  // Pattern 2: (Series Name #N)
  {
    title: 'Catching Fire (The Hunger Games #2)',
    author: 'Suzanne Collins',
    expected: { series: 'The Hunger Games', position: 2 },
  },
  // Pattern 3: Series Name: Book N - Title
  {
    title: 'A Song of Ice and Fire: Book 2 - A Clash of Kings',
    author: 'George R.R. Martin',
    expected: { series: 'A Song of Ice and Fire', position: 2 },
  },
  // Pattern 4: Book N of Series Name
  {
    title: 'A Clash of Kings: Book Two of A Song of Ice and Fire',
    author: 'George R.R. Martin',
    expected: { series: 'A Song of Ice and Fire', position: 2 },
  },
  // Pattern 5: Series Name, Book N
  {
    title: 'The Hunger Games, Book 1',
    author: 'Suzanne Collins',
    expected: { series: 'The Hunger Games', position: 1 },
  },
  // Pattern 6: Series Name - Book N
  {
    title: 'The Witcher - Book 3',
    author: 'Andrzej Sapkowski',
    expected: { series: 'The Witcher', position: 3 },
  },
  // Pattern 7: Title (Series Name)
  {
    title: 'The Fellowship of the Ring (Lord of the Rings)',
    author: 'J.R.R. Tolkien',
    expected: { series: 'Lord of the Rings', position: undefined },
  },
  // Pattern 8: Series Name #N
  {
    title: 'Stormlight Archive #4: Rhythm of War',
    author: 'Brandon Sanderson',
    expected: { series: 'Stormlight Archive', position: 4 },
  },
  // Pattern 9: Vol. N
  {
    title: 'One Piece, Vol. 1',
    author: 'Eiichiro Oda',
    expected: { series: 'One Piece', position: 1 },
  },
  // Pattern 10: Part N
  {
    title: 'The Godfather: Part 2',
    author: 'Mario Puzo',
    expected: { series: 'The Godfather', position: 2 },
  },
  // Pattern 11: [Series Name Book N]
  {
    title: '[Mistborn Book 1] The Final Empire',
    author: 'Brandon Sanderson',
    expected: { series: 'Mistborn', position: 1 },
  },
  // Pattern 12: Roman numerals
  {
    title: 'The Godfather III',
    author: 'Mario Puzo',
    expected: { series: 'The Godfather', position: 3 },
  },
  // Pattern 13: (Book N)
  {
    title: 'Catching Fire (Book 2)',
    author: 'Suzanne Collins',
    expected: { series: undefined, position: 2 },
  },
  // Pattern 14: Series Name: Title
  {
    title: 'Harry Potter: The Chamber of Secrets',
    author: 'J.K. Rowling',
    expected: { series: 'Harry Potter', position: undefined },
  },
  // Pattern 15: Ordinal numbers
  {
    title: 'The First Law: The Blade Itself',
    author: 'Joe Abercrombie',
    expected: { series: undefined, position: 1 },
  },
  // Real-world examples
  {
    title: 'Harry Potter and the Chamber of Secrets',
    author: 'J.K. Rowling',
    expected: { series: 'Harry Potter', position: undefined },
  },
  {
    title: 'A Game of Thrones (A Song of Ice and Fire #1)',
    author: 'George R.R. Martin',
    expected: { series: 'A Song of Ice and Fire', position: 1 },
  },
  {
    title: 'The Two Towers (The Lord of the Rings, Book 2)',
    author: 'J.R.R. Tolkien',
    expected: { series: 'The Lord of the Rings', position: 2 },
  },
];

async function runTests() {
  console.log('===================================');
  console.log('Book Series Detection Test Suite');
  console.log('===================================\n');

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    const result = BookSeriesDetectionService.detectSeriesFromTitle(testCase.title);

    const seriesMatch = !testCase.expected.series || result.seriesName === testCase.expected.series;
    const positionMatch = !testCase.expected.position || result.positionInSeries === testCase.expected.position;

    const success = seriesMatch && positionMatch;

    if (success) {
      passed++;
      console.log(`✓ PASS: "${testCase.title}"`);
      console.log(`  Series: ${result.seriesName || 'N/A'} (Position: ${result.positionInSeries || 'N/A'})`);
      console.log(`  Method: ${result.detectionMethod}, Confidence: ${result.confidence}\n`);
    } else {
      failed++;
      console.log(`✗ FAIL: "${testCase.title}"`);
      console.log(`  Expected: ${testCase.expected.series} (Position: ${testCase.expected.position})`);
      console.log(`  Got: ${result.seriesName || 'N/A'} (Position: ${result.positionInSeries || 'N/A'})`);
      console.log(`  Method: ${result.detectionMethod}, Confidence: ${result.confidence}\n`);
    }
  }

  console.log('===================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`Success rate: ${((passed / testCases.length) * 100).toFixed(1)}%`);
  console.log('===================================\n');
}

async function testAPIIntegration() {
  console.log('===================================');
  console.log('Testing API Integration');
  console.log('===================================\n');

  // Test Google Books API
  console.log('Testing Google Books API...');
  const googleResult = await BookSeriesDetectionService.detectSeriesFromGoogleBooks(
    'The Fellowship of the Ring',
    'J.R.R. Tolkien'
  );
  console.log('Result:', googleResult);
  console.log();

  // Test Open Library API
  console.log('Testing Open Library API...');
  const openLibraryResult = await BookSeriesDetectionService.detectSeriesFromOpenLibrary(
    'Harry Potter and the Philosopher\'s Stone',
    'J.K. Rowling'
  );
  console.log('Result:', openLibraryResult);
  console.log();

  // Test comprehensive detection
  console.log('Testing Comprehensive Detection...');
  const comprehensiveResult = await BookSeriesDetectionService.detectSeriesComprehensive(
    'The Two Towers',
    'J.R.R. Tolkien',
    undefined,
    false // Don't use AI for this test
  );
  console.log('Result:', comprehensiveResult);
  console.log();
}

async function testAIDetection() {
  console.log('===================================');
  console.log('Testing AI Detection (requires ANTHROPIC_API_KEY)');
  console.log('===================================\n');

  const testBooks = [
    { title: 'The Eye of the World', author: 'Robert Jordan' },
    { title: 'Dune', author: 'Frank Herbert' },
    { title: 'Neuromancer', author: 'William Gibson' },
  ];

  for (const book of testBooks) {
    console.log(`Testing: "${book.title}" by ${book.author}`);
    const result = await BookSeriesDetectionService.detectSeriesWithAI(book.title, book.author);
    console.log('Result:', result);
    console.log();
  }
}

// Main execution
async function main() {
  console.log('\n');

  // Run pattern matching tests
  await runTests();

  // Test API integration
  await testAPIIntegration();

  // Test AI detection if API key is available
  if (process.env.ANTHROPIC_API_KEY) {
    await testAIDetection();
  } else {
    console.log('\n===================================');
    console.log('Skipping AI tests (no ANTHROPIC_API_KEY)');
    console.log('To enable AI detection, set ANTHROPIC_API_KEY in .env.local');
    console.log('===================================\n');
  }
}

main().catch(console.error);
