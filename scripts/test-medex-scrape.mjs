async function test() {
  try {
    const res = await fetch('https://medex.com.bd/brands?alpha=a&page=1', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    console.log('Status:', res.status);
    const html = await res.text();
    console.log('HTML length:', html.length);

    // Check pagination HTML
    const paginationSnippet = html.match(/<ul class="pagination[\s\S]*?<\/ul>/i);
    console.log('Pagination HTML:', paginationSnippet ? paginationSnippet[0] : 'None found');


    // Extract brand cards
    const regex = /<a href="([^"]+)" class="brand-card">[\s\S]*?<img[^>]*alt='([^']*)'[^>]*class='dosage-icon'[\s\S]*?<span class="brand-card__name">([^<]+)<\/span>[\s\S]*?<div class="brand-card__strength">([^<]*)<\/div>[\s\S]*?<div class="brand-card__generic">([^<]*)<\/div>[\s\S]*?<div class="brand-card__company">([^<]*)<\/div>/g;

    const cards = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
      cards.push({
        url: match[1],
        dosageForm: match[2].trim(),
        brandName: match[3].trim(),
        strength: match[4].trim(),
        genericName: match[5].trim(),
        manufacturer: match[6].trim()
      });
    }

    console.log('Parsed cards count on page 1:', cards.length);
    if (cards.length > 0) {
      console.log('Sample parsed card:', cards[0]);
    }
  } catch (err) {
    console.error('Test error:', err);
  }
}

test();
