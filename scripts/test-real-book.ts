import { BookSeriesDetectionService } from '../lib/services/book-series-detection-service';

async function testRealBook() {
  console.log('Testing detection on real book from database...\n');

  const testBook = {
    title: 'Blood of Elves',
    author: 'Andrzej Sapkowski',
    isbn: undefined
  };

  console.log(`Book: "${testBook.title}" by ${testBook.author}\n`);

  // Test 1: Pattern matching
  console.log('1. Pattern Matching Test:');
  const patternResult = BookSeriesDetectionService.detectSeriesFromTitle(testBook.title);
  console.log(`   Method: ${patternResult.detectionMethod}`);
  console.log(`   Series: ${patternResult.seriesName || 'none'}`);
  console.log(`   Position: ${patternResult.positionInSeries || 'none'}`);
  console.log(`   Confidence: ${patternResult.confidence}\n`);

  // Test 2: Google Books
  console.log('2. Google Books API Test:');
  try {
    const googleResult = await BookSeriesDetectionService.detectSeriesFromGoogleBooks(
      testBook.title,
      testBook.author,
      testBook.isbn
    );
    console.log(`   Method: ${googleResult.detectionMethod}`);
    console.log(`   Series: ${googleResult.seriesName || 'none'}`);
    console.log(`   Position: ${googleResult.positionInSeries || 'none'}`);
    console.log(`   Confidence: ${googleResult.confidence}\n`);
  } catch (error) {
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown'}\n`);
  }

  // Test 3: Open Library
  console.log('3. Open Library API Test:');
  try {
    const openLibResult = await BookSeriesDetectionService.detectSeriesFromOpenLibrary(
      testBook.title,
      testBook.author,
      testBook.isbn
    );
    console.log(`   Method: ${openLibResult.detectionMethod}`);
    console.log(`   Series: ${openLibResult.seriesName || 'none'}`);
    console.log(`   Position: ${openLibResult.positionInSeries || 'none'}`);
    console.log(`   Confidence: ${openLibResult.confidence}\n`);
  } catch (error) {
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown'}\n`);
  }

  // Test 4: Comprehensive detection
  console.log('4. Comprehensive Detection (all methods):');
  try {
    const compResult = await BookSeriesDetectionService.detectSeriesComprehensive(
      testBook.title,
      testBook.author,
      testBook.isbn,
      false // no AI for now
    );
    console.log(`   Method: ${compResult.detectionMethod}`);
    console.log(`   Series: ${compResult.seriesName || 'none'}`);
    console.log(`   Position: ${compResult.positionInSeries || 'none'}`);
    console.log(`   Confidence: ${compResult.confidence}`);
    console.log(`   Raw Data:`, compResult.rawData ? JSON.stringify(compResult.rawData).substring(0, 100) + '...' : 'none');
  } catch (error) {
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  process.exit(0);
}

testRealBook().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
