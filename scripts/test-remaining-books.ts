import { BookSeriesDetectionService } from '../lib/services/book-series-detection-service';

const testBooks = [
  { title: 'The Subtle Art of Not Giving a F*ck', author: 'Mark Manson' },
  { title: 'The Hobbit', author: 'J.R.R. Tolkien' },
  { title: 'The Priory of the Orange Tree', author: 'Samantha Shannon' }
];

async function testRemainingBooks() {
  console.log('Testing remaining books for series detection...\n');

  for (const book of testBooks) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Book: "${book.title}"\nAuthor: ${book.author}\n`);

    // Test comprehensive detection
    const result = await BookSeriesDetectionService.detectSeriesComprehensive(
      book.title,
      book.author,
      undefined,
      false
    );

    console.log(`Detection Method: ${result.detectionMethod}`);
    console.log(`Series Name: ${result.seriesName || 'NONE'}`);
    console.log(`Position: ${result.positionInSeries || 'N/A'}`);
    console.log(`Confidence: ${result.confidence}`);

    if (result.confidence >= 0.6) {
      console.log('\n✓ Would be auto-linked');
    } else {
      console.log('\n✗ Would NOT be auto-linked (confidence too low or not a series)');
    }
  }

  console.log('\n' + '='.repeat(60));
  process.exit(0);
}

testRemainingBooks().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
