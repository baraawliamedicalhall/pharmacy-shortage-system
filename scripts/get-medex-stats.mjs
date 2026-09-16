const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function getMaxPage(html) {
  const matches = [...html.matchAll(/page=(\d+)/g)];
  if (matches.length === 0) return 1;
  const pageNums = matches.map(m => parseInt(m[1], 10)).filter(n => !isNaN(n));
  return Math.max(...pageNums, 1);
}

async function getStats() {
  console.log('Checking Medex page counts per letter...');
  let totalEstimatedPages = 0;

  for (const letter of ALPHABET) {
    try {
      const html = await fetchPage(`https://medex.com.bd/brands?alpha=${letter}&page=1`);
      const maxPage = getMaxPage(html);
      totalEstimatedPages += maxPage;
      console.log(`Letter '${letter}': ${maxPage} pages (~${maxPage * 30} medicines)`);
    } catch (e) {
      console.error(`Error for '${letter}':`, e.message);
    }
  }

  console.log(`\nTotal estimated pages across A-Z: ${totalEstimatedPages}`);
  console.log(`Total estimated medicines: ~${totalEstimatedPages * 30}`);
}

getStats();
