async function testGoogleBooksAPI() {
  const title = 'Blood of Elves';
  const author = 'Andrzej Sapkowski';

  const query = `intitle:"${title}" inauthor:"${author}"`;
  const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY || process.env.GOOGLE_BOOKS_API_KEY;

  console.log('Testing Google Books API...');
  console.log(`Query: ${query}`);
  console.log(`API Key: ${apiKey ? 'Present (length: ' + apiKey.length + ')' : 'MISSING'}\n`);

  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}${apiKey ? `&key=${apiKey}` : ''}`;

  console.log('Fetching:', url.substring(0, 100) + '...\n');

  try {
    const response = await fetch(url);
    console.log(`Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const text = await response.text();
      console.log('Error response:', text.substring(0, 500));
      process.exit(1);
    }

    const data = await response.json();

    console.log(`Total items found: ${data.totalItems || 0}`);

    if (data.items && data.items.length > 0) {
      const first = data.items[0];
      console.log('\nFirst result:');
      console.log(`  Title: ${first.volumeInfo.title}`);
      console.log(`  Authors: ${first.volumeInfo.authors?.join(', ')}`);
      console.log(`  Series Info:`, first.volumeInfo.seriesInfo || 'NONE');
      console.log('\nFull volumeInfo:', JSON.stringify(first.volumeInfo, null, 2).substring(0, 1000));
    } else {
      console.log('\nNo results found!');
    }
  } catch (error) {
    console.error('Fetch error:', error instanceof Error ? error.message : error);
  }

  process.exit(0);
}

testGoogleBooksAPI();
