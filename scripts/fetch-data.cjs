// ============================================================
// Battery Briefing - 자동 데이터 수집 (with Gemini AI 요약)
// 매일 GitHub Actions에서 실행 — 구글 시트 → data.json
// ============================================================

const fs = require('fs');
const path = require('path');
const https = require('https');

const SHEET_ID = process.env.SHEET_ID || '1Td8b1PEOLYdaMfNqRcOUu1S0n0-G36sSX85WTKv43oI';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const CACHE_PATH = path.join('scripts', 'ai-cache.json');
const MAX_NEW_SUMMARIES_PER_RUN = 80; // 1회 실행 시 최대 신규 요약 개수 (rate limit 보호)

// 증시/주가 관련 키워드 (제목에 들어있으면 자사·경쟁사 카테고리에서 제외)
const STOCK_BLACKLIST = ['주가', '코스피', '코스닥', '시가총액', '거래량', '매도세', '매수세', '증시', '상한가', '하한가', '52주 신고가', '52주 신저가', '종가', '시초가', '공매도'];

// ━━━━━━━━━━━━━━━━ 구글 시트 읽기 ━━━━━━━━━━━━━━━━

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

// ━━━━━━━━━━━━━━━━ AI 요약 캐시 ━━━━━━━━━━━━━━━━

function loadCache() {
  try {
    if (fs.existsSync(CACHE_PATH)) {
      const raw = fs.readFileSync(CACHE_PATH, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('⚠ Cache load failed, starting fresh:', e.message);
  }
  return {};
}

function saveCache(cache) {
  try {
    fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf8');
    console.log(`✓ Cache saved: ${Object.keys(cache).length} entries`);
  } catch (e) {
    console.warn('⚠ Cache save failed:', e.message);
  }
}

function cacheKey(article) {
  return article.link || article.id || article.title;
}

// ━━━━━━━━━━━━━━━━ Gemini API 호출 ━━━━━━━━━━━━━━━━

function callGemini(title, originalSummary) {
  return new Promise((resolve, reject) => {
    if (!GEMINI_API_KEY) {
      reject(new Error('GEMINI_API_KEY not set'));
      return;
    }
    
    const prompt = `당신은 배터리 산업 전문 기자입니다. 다음 뉴스를 한국어로 2문장으로 요약해주세요.

요구사항:
- 첫 문장: 핵심 사실 (무엇이/누가/언제 일어났는지)
- 둘째 문장: 배경, 영향, 또는 시사점
- 군더더기 없이 명확하게
- 객관적이고 전문적인 톤
- 절대 마크다운(**, *, # 등) 사용하지 말 것
- 절대 "요약:" 같은 라벨 붙이지 말 것

제목: ${title}
원문: ${originalSummary}

요약:`;
    
    const payload = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 250,
      }
    });
    
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      port: 443,
      path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: 30000,
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            reject(new Error(`API error: ${parsed.error.message}`));
            return;
          }
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) {
            reject(new Error('Empty response'));
            return;
          }
          // 마크다운 제거 및 정리
          const cleaned = text.trim()
            .replace(/^\*+|\*+$/g, '')
            .replace(/\*\*/g, '')
            .replace(/^#+\s*/gm, '')
            .replace(/^요약:\s*/i, '')
            .trim();
          resolve(cleaned);
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.write(payload);
    req.end();
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ━━━━━━━━━━━━━━━━ AI 요약 적용 ━━━━━━━━━━━━━━━━

async function applyAISummaries(news, cache) {
  let cachedCount = 0;
  let newSummaryCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  for (const article of news) {
    const key = cacheKey(article);
    
    // 1. 캐시에 있으면 그대로 사용
    if (cache[key]) {
      article.summary = cache[key];
      cachedCount++;
      continue;
    }
    
    // 2. 원본이 너무 짧으면 스킵 (요약 가치 없음)
    if (!article.summary || article.summary.length < 30) {
      skippedCount++;
      continue;
    }
    
    // 3. 이번 실행에서 충분히 처리했으면 다음 실행으로 미룸
    if (newSummaryCount >= MAX_NEW_SUMMARIES_PER_RUN) {
      skippedCount++;
      continue;
    }
    
    // 4. Gemini 호출
    try {
      const aiSummary = await callGemini(article.title, article.summary);
      if (aiSummary && aiSummary.length > 10) {
        article.summary = aiSummary;
        cache[key] = aiSummary;
        newSummaryCount++;
        if (newSummaryCount % 10 === 0) {
          console.log(`  ✓ ${newSummaryCount}개 완료...`);
        }
      } else {
        skippedCount++;
      }
      // Rate limit 보호: 4.2초 대기 (15 RPM = 분당 15회)
      await sleep(4200);
    } catch (e) {
      errorCount++;
      console.warn(`  ✗ "${article.title.substring(0, 40)}..." 실패: ${e.message}`);
      if (errorCount > 5) {
        console.warn('⚠ 에러 5회 초과, AI 요약 중단 (다음 실행에서 재시도)');
        break;
      }
      // 에러 후 10초 대기 (back-off)
      await sleep(10000);
    }
  }
  
  console.log(`\n━━━ AI 요약 결과 ━━━`);
  console.log(`✓ 캐시 활용: ${cachedCount}건`);
  console.log(`✓ 신규 요약: ${newSummaryCount}건`);
  console.log(`- 스킵: ${skippedCount}건`);
  console.log(`✗ 실패: ${errorCount}건`);
}

// ━━━━━━━━━━━━━━━━ 메인 실행 ━━━━━━━━━━━━━━━━

(async () => {
  try {
    console.log('━━━ Battery Briefing 데이터 수집 시작 ━━━\n');
    
    console.log('📊 구글 시트에서 뉴스 가져오는 중...');
    const newsRows = await fetchSheet('뉴스');
    console.log(`✓ ${newsRows.length}건 가져옴`);
    
    const allNews = rowsToNews(newsRows);
    console.log(`✓ 필터링 후 ${allNews.length}건\n`);
    
    // AI 요약 적용
    if (GEMINI_API_KEY) {
      console.log('🤖 Gemini AI 요약 적용 중...');
      const cache = loadCache();
      console.log(`  기존 캐시: ${Object.keys(cache).length}건`);
      await applyAISummaries(allNews, cache);
      saveCache(cache);
    } else {
      console.warn('\n⚠ GEMINI_API_KEY 환경변수가 설정되지 않음. AI 요약 건너뜀.\n');
    }
    
    const featured = allNews.filter(n => n.featured).slice(0, 4);
    
    const data = {
      news: allNews,
      featured: featured,
      lastUpdated: new Date().toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      }),
    };
    
    fs.mkdirSync('public', { recursive: true });
    fs.writeFileSync('public/data.json', JSON.stringify(data, null, 2), 'utf8');
    
    console.log(`\n━━━ 완료 ━━━`);
    console.log(`📰 뉴스: ${data.news.length}건`);
    console.log(`⭐ 필수: ${data.featured.length}건`);
    console.log(`📁 저장: public/data.json`);
  } catch (e) {
    console.error('❌ Error:', e);
    process.exit(1);
  }
})();
