// 매일 GitHub Actions에서 실행되어 구글 시트 데이터를 data.json으로 변환
// 회사 방화벽이 막지 못하도록 사이트에 내장됨

const fs = require('fs');
const https = require('https');

const SHEET_ID = process.env.SHEET_ID || '1Td8b1PEOLYdaMfNqRcOUu1S0n0-G36sSX85WTKv43oI';

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

function rowsToNews(rows) {
  return rows
    .filter(r => r.title && r.cat)
    .map(r => {
      const subValue = String(r.sub || '');
      const isChinaSub = ['catl', 'byd', 'calb', 'ampace', 'eve'].includes(subValue);
      return {
        id: r.id,
        cat: r.cat,
        sub: isChinaSub ? 'china' : subValue,
        subsub: isChinaSub ? subValue : null,
        title: r.title,
        summary: r.summary || '',
        source: r.source || '',
        time: r.time || '',
        link: r.link || '#',
      };
    });
}

function rowsToIssues(rows) {
  return rows
    .filter(r => r.title)
    .map(r => ({
      id: r.id,
      label: r.label || '오늘의 이슈',
      title: r.title,
      accent: r.accent || '#1e3a8a',
      accentBg: (r.accent || '#1e3a8a') + '15',
      context: r.context || '',
      points: [r.point1, r.point2, r.point3].filter(Boolean),
    }));
}

(async () => {
  try {
    console.log('Fetching news sheet...');
    const newsRows = await fetchSheet('뉴스');
    console.log(`Got ${newsRows.length} news rows`);

    console.log('Fetching issues sheet...');
    const issueRows = await fetchSheet('이슈');
    console.log(`Got ${issueRows.length} issue rows`);

    const data = {
      news: rowsToNews(newsRows),
      issues: rowsToIssues(issueRows),
      lastUpdated: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
    };

    fs.mkdirSync('public', { recursive: true });
    fs.writeFileSync('public/data.json', JSON.stringify(data, null, 2), 'utf8');
    console.log(`✓ data.json saved: ${data.news.length} news, ${data.issues.length} issues`);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
})();
