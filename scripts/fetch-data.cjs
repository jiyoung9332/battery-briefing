// 매일 GitHub Actions에서 실행 — 구글 시트 → data.json

const fs = require('fs');
const https = require('https');

const SHEET_ID = process.env.SHEET_ID || '1Td8b1PEOLYdaMfNqRcOUu1S0n0-G36sSX85WTKv43oI';

// 증시/주가 관련 키워드 (제목에 들어있으면 자사 카테고리에서 제외)
const STOCK_BLACKLIST = ['주가', '코스피', '코스닥', '시가총액', '거래량', '매도세', '매수세', '증시', '상한가', '하한가', '52주 신고가', '52주 신저가', '종가', '시초가', '공매도'];

function fetchSheet(sheetName) {
  return new Promise((resolve, reject) => {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonText = data.substring(data.indexOf('{'), data.lastIndexOf('}') + 1);
          const parsed = JSON.parse(jsonText);
          if (!parsed.table || !parsed.table.rows) {
            resolve([]);
            return;
          }
          const cols = parsed.table.cols.map(c => c.label || c.id);
          const rows = parsed.table.rows.map(row => {
            const obj = {};
            row.c.forEach((cell, i) => {
              obj[cols[i]] = cell ? cell.v : '';
            });
            return obj;
          });
          resolve(rows);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function isStockNews(title) {
  if (!title) return false;
  return STOCK_BLACKLIST.some(kw => title.includes(kw));
}

function rowsToNews(rows) {
  return rows
    .filter(r => r.title && r.cat)
    .filter(r => !((r.cat === 'own' || r.cat === 'competitor') && isStockNews(r.title)))
    .map(r => ({
      id: r.id,
      cat: r.cat,
      sub: String(r.sub || ''),
      title: r.title,
      summary: r.summary || '',
      source: r.source || '',
      time: r.time || '',
      link: r.link || '#',
      featured: r['필수'] == 1 || r['필수'] === '1' || r['필수'] === true,
    }));
}

(async () => {
  try {
    console.log('Fetching news sheet...');
    const newsRows = await fetchSheet('뉴스');
    console.log(`Got ${newsRows.length} news rows`);

    const allNews = rowsToNews(newsRows);
    const featured = allNews.filter(n => n.featured).slice(0, 4); // 최대 4개

    const data = {
      news: allNews,
      featured: featured,
      lastUpdated: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
    };

    fs.mkdirSync('public', { recursive: true });
    fs.writeFileSync('public/data.json', JSON.stringify(data, null, 2), 'utf8');
    console.log(`✓ Saved: ${data.news.length} news, ${data.featured.length} featured`);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
})();
