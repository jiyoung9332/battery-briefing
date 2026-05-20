import React, { useState, useMemo, useEffect } from 'react';
import { Zap, FileText, Users, Swords, Building2, Clock, Star, ArrowLeft, Search, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';

// 카테고리 순서: 정책 → 경쟁사 → 고객사 → 자사 (아래로 갈수록 우리 회사)
const CATEGORIES = [
  { id: 'policy', label: '정책', desc: '정부 · 국제 정책', icon: FileText, accent: '#525252', accentBg: '#ececec', subs: [
    { id: 'us', label: '미국 (IRA·FEOC)' },
    { id: 'eu', label: '유럽 (배터리법)' },
    { id: 'kr', label: '국내' },
    { id: 'minerals', label: '광물·공급망' },
    { id: 'etc', label: '기타' },
  ]},
  { id: 'competitor', label: '경쟁사', desc: '경쟁사 동향', icon: Swords, accent: '#166534', accentBg: '#dfeede', subs: [
    { id: 'lges', label: 'LGES' },
    { id: 'catl', label: 'CATL' },
    { id: 'ampace', label: 'AMPACE' },
    { id: 'eve', label: 'EVE' },
  ]},
  { id: 'customer', label: '고객사', desc: '주요 고객사 동향', icon: Users, accent: '#c2410c', accentBg: '#fae7d8', subs: [
    { id: 'samsung-mx', label: '삼성전자 MX' },
    { id: 'tti', label: 'TTI' },
    { id: 'bosch', label: 'Bosch' },
    { id: 'volvo', label: 'Volvo' },
    { id: 'bmw', label: 'BMW' },
    { id: 'vwg', label: 'VWG' },
    { id: 'spacex', label: 'Space X' },
    { id: 'hyundai', label: '현대자동차' },
    { id: 'rivian', label: 'Rivian' },
  ]},
  // 자사: 하위 칩 없음 (전체만 표시)
  { id: 'own', label: '삼성SDI', desc: '자사 동향', icon: Building2, accent: '#1e3a8a', accentBg: '#e7eaf5', subs: [] },
];

const SUB_LABEL = {
  // 정책
  us: '미국', eu: '유럽', kr: '국내', minerals: '광물·공급망', etc: '기타',
  // 경쟁사
  lges: 'LGES', catl: 'CATL', ampace: 'AMPACE', eve: 'EVE',
  // 고객사
  'samsung-mx': '삼성전자 MX', tti: 'TTI', bosch: 'Bosch', volvo: 'Volvo',
  bmw: 'BMW', vwg: 'VWG', spacex: 'Space X', hyundai: '현대자동차', rivian: 'Rivian',
  // 자사
  'samsung-sdi': '삼성SDI',
};

export default function App() {
  const [news, setNews] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [lastUpdated, setLastUpdated] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState({ type: 'home' });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}data.json?t=${Date.now()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setNews(data.news || []);
      setFeatured(data.featured || []);
      setLastUpdated(data.lastUpdated || '');
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const openCategory = (catId, subId = null) => {
    setView({ type: 'category', catId, subFilter: subId });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goHome = () => {
    setView({ type: 'home' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div style={{ fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif", background: '#faf8f3', minHeight: '100vh', color: '#1a1a1a' }}>
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css');
        * { box-sizing: border-box; }
        body { margin: 0; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: #d4d0c4; border-radius: 4px; }
        .featured-card { transition: all 0.18s ease; cursor: pointer; }
        .featured-card:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(26,26,26,0.08); }
        .cat-block { transition: all 0.18s ease; }
        .cat-block-header { cursor: pointer; transition: background 0.12s ease; padding: 4px 6px; margin: -4px -6px 8px -6px; border-radius: 6; }
        .cat-block-header:hover { background: #f6f2e6; }
        .news-item { transition: background 0.12s ease; cursor: pointer; }
        .news-item:hover { background: #f6f2e6; }
        .news-item:hover .news-title-line { color: #1e3a8a; }
        .expand-btn { transition: background 0.12s ease; }
        .expand-btn:hover { background: #efeadb; }
        .news-card { transition: all 0.15s ease; }
        .news-card:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(26,26,26,0.07); border-color: #d4cdb8 !important; }
        .news-card:hover h3 { color: #1e3a8a; }
        .back-btn { transition: background 0.12s ease; }
        .back-btn:hover { background: #efeadb; }
        .sub-pill { transition: all 0.15s ease; cursor: pointer; }
        .sub-chip { transition: all 0.12s ease; }
        .sub-chip:hover { opacity: 0.85; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spinning { animation: spin 1s linear infinite; }
      `}</style>

      <header style={{ borderBottom: '1px solid #e5e0d3', background: '#faf8f3', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div onClick={goHome} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <Zap size={22} strokeWidth={2.2} color="#1e3a8a" />
            <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>Battery Briefing</span>
            <span style={{ fontSize: 11, color: '#8a8275', marginLeft: 8, padding: '3px 8px', background: '#efeadb', borderRadius: 4, letterSpacing: '0.05em' }}>SAMSUNG SDI · 기획그룹</span>
          </div>
          <div style={{ flex: 1 }} />
          {lastUpdated && (
            <div style={{ fontSize: 12, color: '#8a8275' }}>업데이트: {lastUpdated}</div>
          )}
          <div style={{ fontSize: 13, color: '#8a8275' }}>총 {news.length}건</div>
        </div>
      </header>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '36px 32px 80px 32px' }}>
        {loading && <LoadingView />}
        {!loading && error && <ErrorView error={error} onRetry={loadData} />}
        {!loading && !error && view.type === 'home' && <HomeView news={news} featured={featured} onOpenCategory={openCategory} />}
        {!loading && !error && view.type === 'category' && (
          <CategoryView
            key={view.catId + (view.subFilter || '')}
            news={news}
            category={CATEGORIES.find(c => c.id === view.catId)}
            initialSubFilter={view.subFilter}
            onBack={goHome}
          />
        )}
      </div>
    </div>
  );
}

function LoadingView() {
  return (
    <div style={{ padding: '80px 20px', textAlign: 'center' }}>
      <RefreshCw size={28} className="spinning" color="#8a8275" style={{ marginBottom: 14 }} />
      <div style={{ fontSize: 14, color: '#5a5040' }}>뉴스를 불러오는 중…</div>
    </div>
  );
}

function ErrorView({ error, onRetry }) {
  return (
    <div style={{ padding: '40px 30px', background: '#fff', border: '1px solid #f5d99a', borderRadius: 10, textAlign: 'center', maxWidth: 560, margin: '40px auto' }}>
      <AlertCircle size={32} color="#a8741f" style={{ marginBottom: 14 }} />
      <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 8px 0' }}>데이터를 불러올 수 없습니다</h3>
      <p style={{ fontSize: 13.5, color: '#5a5040', lineHeight: 1.6, margin: '0 0 18px 0' }}>새로고침을 시도해 주세요.</p>
      <details style={{ marginBottom: 16, fontSize: 12, color: '#8a8275' }}>
        <summary style={{ cursor: 'pointer' }}>오류 상세</summary>
        <code style={{ display: 'block', marginTop: 8, padding: 10, background: '#faf8f3', borderRadius: 6, fontSize: 11, textAlign: 'left' }}>{error}</code>
      </details>
      <button onClick={onRetry} style={{ padding: '8px 18px', background: '#1e3a8a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>다시 시도</button>
    </div>
  );
}

// 카테고리별 색상 가져오기 (필수 뉴스 카드용)
function getCategoryByNews(n) {
  return CATEGORIES.find(c => c.id === n.cat);
}

function HomeView({ news, featured, onOpenCategory }) {
  return (
    <>
      {/* 주요 이슈 섹션 */}
      <section style={{ marginBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Star size={22} color="#b8860b" strokeWidth={2.2} fill="#b8860b" />
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>주요 이슈</h1>
        </div>
        <p style={{ fontSize: 14, color: '#8a8275', margin: '0 0 22px 0' }}>오늘 꼭 봐야 할 핵심 뉴스</p>

        {featured.length === 0 ? (
          <div style={{ padding: '40px 24px', background: '#fff', border: '1px dashed #d4cdb8', borderRadius: 12, textAlign: 'center', color: '#8a8275', fontSize: 13.5 }}>
            아직 주요 이슈로 표시된 뉴스가 없습니다.<br />
            <span style={{ fontSize: 12, color: '#a8a090' }}>(구글 시트의 "뉴스" 탭에서 '필수' 열에 1을 입력하면 다음날 새벽 반영됩니다)</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
            {featured.map(n => {
              const cat = getCategoryByNews(n);
              return (
                <a key={n.id} href={n.link} target="_blank" rel="noopener noreferrer" className="featured-card" style={{
                  textDecoration: 'none', color: 'inherit',
                  background: '#fff', border: '1px solid #e5e0d3',
                  borderTop: `4px solid ${cat?.accent || '#1e3a8a'}`,
                  borderRadius: 12, padding: '22px 24px',
                  display: 'flex', flexDirection: 'column',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
                      color: cat?.accent || '#1e3a8a',
                      background: cat?.accentBg || '#e7eaf5',
                      padding: '3px 9px', borderRadius: 4
                    }}>
                      {cat?.label || '뉴스'}
                    </span>
                    {n.sub && SUB_LABEL[n.sub] && (
                      <span style={{ fontSize: 12, color: '#8a8275', fontWeight: 500 }}>{SUB_LABEL[n.sub]}</span>
                    )}
                  </div>
                  <h3 style={{ fontSize: 16.5, fontWeight: 700, lineHeight: 1.4, margin: '0 0 10px 0', letterSpacing: '-0.015em' }}>{n.title}</h3>
                  {n.summary && (
                    <p style={{ fontSize: 13, lineHeight: 1.6, color: '#5a5040', margin: '0 0 14px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.summary}</p>
                  )}
                  <div style={{ marginTop: 'auto', fontSize: 11.5, color: '#8a8275' }}>
                    <span style={{ fontWeight: 600, color: '#5a5040' }}>{n.source}</span>
                    <span style={{ color: '#cfc6b2', margin: '0 6px' }}>·</span>
                    <span>{n.time}</span>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </section>

      {/* 카테고리별 카드 */}
      <section>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 18px 0', letterSpacing: '-0.02em' }}>카테고리별 이슈</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {CATEGORIES.map(cat => {
            const items = news.filter(n => n.cat === cat.id);
            return <CategoryBlock key={cat.id} category={cat} items={items} onOpen={(subId) => onOpenCategory(cat.id, subId)} />;
          })}
        </div>
      </section>
    </>
  );
}

function CategoryBlock({ category, items, onOpen }) {
  const [activeSub, setActiveSub] = useState(null);
  const Icon = category.icon;
  const VISIBLE = 5;

  const filteredItems = activeSub ? items.filter(n => n.sub === activeSub) : items;
  const visibleItems = filteredItems.slice(0, VISIBLE);

  const handleChipClick = (e, subId) => {
    e.stopPropagation();
    setActiveSub(activeSub === subId ? null : subId);
  };

  // 하위 카테고리가 비어있으면 (자사) 칩 영역 안 보이게
  const hasSubs = category.subs && category.subs.length > 0;

  return (
    <div className="cat-block" style={{
      background: '#fff', border: '1px solid #e5e0d3',
      borderTop: `4px solid ${category.accent}`,
      borderRadius: 12, padding: '20px 0 8px 0',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '0 22px 14px 22px', borderBottom: '1px solid #f0ebdc' }}>
        <div className="cat-block-header" onClick={() => onOpen(activeSub)} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: category.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={17} color={category.accent} strokeWidth={2.2} />
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{category.label}</h3>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: category.accent, fontWeight: 700, background: category.accentBg, padding: '3px 10px', borderRadius: 999 }}>{filteredItems.length}건</span>
        </div>

        {/* 자사는 칩 영역 자체 안 표시. 다른 카테고리만 표시 */}
        {hasSubs && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
            <span onClick={(e) => { e.stopPropagation(); setActiveSub(null); }} className="sub-chip" style={chipStyle(activeSub === null, category)}>
              전체 <span style={{ fontSize: 10.5, opacity: 0.65, fontWeight: 600 }}>{items.length}</span>
            </span>
            {category.subs.map(sub => {
              const subCount = items.filter(n => n.sub === sub.id).length;
              return (
                <span key={sub.id} onClick={(e) => handleChipClick(e, sub.id)} className="sub-chip" style={chipStyle(activeSub === sub.id, category)}>
                  {sub.label} <span style={{ fontSize: 10.5, opacity: 0.65, fontWeight: 600 }}>{subCount}</span>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {filteredItems.length === 0 ? (
        <div style={{ padding: '32px 22px', textAlign: 'center', color: '#8a8275', fontSize: 13 }}>해당하는 뉴스가 없습니다.</div>
      ) : (
        <>
          {filteredItems[0] && (
            <a href={filteredItems[0].link} target="_blank" rel="noopener noreferrer" className="news-item" style={{ textDecoration: 'none', color: 'inherit', display: 'block', padding: '16px 22px', borderBottom: '1px solid #f0ebdc' }}>
              {filteredItems[0].sub && SUB_LABEL[filteredItems[0].sub] && (
                <div style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.03em', color: category.accent, background: category.accentBg, padding: '2px 7px', borderRadius: 3 }}>
                    {SUB_LABEL[filteredItems[0].sub]}
                  </span>
                </div>
              )}
              <div className="news-title-line" style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.4, marginBottom: 6, color: '#1a1a1a', letterSpacing: '-0.01em' }}>{filteredItems[0].title}</div>
              {filteredItems[0].summary && (
                <p style={{ fontSize: 12.5, lineHeight: 1.55, color: '#5a5040', margin: '0 0 8px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{filteredItems[0].summary}</p>
              )}
              <div style={{ fontSize: 11.5, color: '#8a8275' }}>
                <span style={{ fontWeight: 600, color: '#5a5040' }}>{filteredItems[0].source}</span>
                <span style={{ color: '#cfc6b2', margin: '0 6px' }}>·</span>
                <span>{filteredItems[0].time}</span>
              </div>
            </a>
          )}

          <div style={{ flex: 1 }}>
            {visibleItems.slice(1).map(n => (
              <a key={n.id} href={n.link} target="_blank" rel="noopener noreferrer" className="news-item" style={{ textDecoration: 'none', color: 'inherit', display: 'block', padding: '12px 22px', borderBottom: '1px solid #f5f1e2' }}>
                <div className="news-title-line" style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.45, color: '#1a1a1a', marginBottom: 4, letterSpacing: '-0.005em' }}>{n.title}</div>
                <div style={{ fontSize: 11.5, color: '#8a8275', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {n.sub && SUB_LABEL[n.sub] && (
                    <>
                      <span style={{ fontWeight: 500, color: '#5a5040' }}>{SUB_LABEL[n.sub]}</span>
                      <span style={{ color: '#cfc6b2' }}>·</span>
                    </>
                  )}
                  <span style={{ fontWeight: 500 }}>{n.source}</span>
                  <span style={{ color: '#cfc6b2' }}>·</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Clock size={11} /> {n.time}</span>
                </div>
              </a>
            ))}
          </div>
        </>
      )}

      <button onClick={() => onOpen(activeSub)} className="expand-btn" style={{
        margin: '6px 12px 8px 12px', padding: '10px 12px',
        background: 'transparent', border: 'none', borderRadius: 8,
        cursor: 'pointer', color: category.accent,
        fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
      }}>
        {activeSub
          ? <>{category.subs.find(s => s.id === activeSub)?.label} 전체 {filteredItems.length}건 보기 <ArrowRight size={14} /></>
          : <>전체 {items.length}건 보기 <ArrowRight size={14} /></>
        }
      </button>
    </div>
  );
}

function CategoryView({ news, category, initialSubFilter, onBack }) {
  const [subFilter, setSubFilter] = useState(initialSubFilter || null);
  const [search, setSearch] = useState('');

  if (!category) return null;
  const Icon = category.icon;
  const hasSubs = category.subs && category.subs.length > 0;

  const filtered = useMemo(() => {
    let list = news.filter(n => n.cat === category.id);
    if (subFilter) list = list.filter(n => n.sub === subFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(n => n.title.toLowerCase().includes(q) || (n.summary && n.summary.toLowerCase().includes(q)));
    }
    return list;
  }, [news, category, subFilter, search]);

  const handleSubClick = (subId) => {
    setSubFilter(subFilter === subId ? null : subId);
  };

  return (
    <>
      <button onClick={onBack} className="back-btn" style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px 6px 6px',
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: '#5a5040', fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
        marginBottom: 18, marginLeft: -6, borderRadius: 6
      }}>
        <ArrowLeft size={16} /> 메인으로
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div style={{ width: 52, height: 52, borderRadius: 12, background: category.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={26} color={category.accent} strokeWidth={2} />
        </div>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{category.label}</h1>
          <p style={{ fontSize: 13.5, color: '#8a8275', margin: '2px 0 0 0' }}>{category.desc}</p>
        </div>
      </div>

      {hasSubs && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
          <button onClick={() => setSubFilter(null)} className="sub-pill" style={pillStyle(!subFilter, category.accent)}>
            전체 <span style={{ marginLeft: 6, opacity: 0.65, fontSize: 11.5 }}>{news.filter(n => n.cat === category.id).length}</span>
          </button>
          {category.subs.map(sub => {
            const count = news.filter(n => n.cat === category.id && n.sub === sub.id).length;
            return (
              <button key={sub.id} onClick={() => handleSubClick(sub.id)} className="sub-pill" style={pillStyle(subFilter === sub.id, category.accent)}>
                {sub.label} <span style={{ marginLeft: 6, opacity: 0.65, fontSize: 11.5 }}>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={16} color="#8a8275" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          placeholder={`${category.label} 내 검색`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', padding: '11px 14px 11px 40px', background: '#fff', border: '1px solid #e5e0d3', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
        />
      </div>

      <div style={{ fontSize: 13, color: '#8a8275', marginBottom: 14 }}>{filtered.length}건</div>

      {filtered.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#8a8275', fontSize: 14, background: '#fff', border: '1px solid #e5e0d3', borderRadius: 10 }}>
          해당하는 뉴스가 없습니다.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {filtered.map(n => (
            <a key={n.id} href={n.link} target="_blank" rel="noopener noreferrer" className="news-card" style={{
              textDecoration: 'none', color: 'inherit',
              background: '#fff', border: '1px solid #e5e0d3', borderRadius: 10,
              padding: '18px 20px', display: 'flex', flexDirection: 'column', minHeight: 180,
            }}>
              {n.sub && SUB_LABEL[n.sub] && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.02em', color: category.accent, background: category.accentBg, padding: '2px 8px', borderRadius: 4 }}>{SUB_LABEL[n.sub]}</span>
                </div>
              )}
              <h3 style={{ fontSize: 15.5, fontWeight: 700, lineHeight: 1.4, margin: '0 0 8px 0', letterSpacing: '-0.01em', color: '#1a1a1a' }}>{n.title}</h3>
              {n.summary && (
                <p style={{ fontSize: 13, lineHeight: 1.6, color: '#4a4638', margin: '0 0 14px 0', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.summary}</p>
              )}
              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: '#8a8275' }}>
                <span style={{ fontWeight: 600, color: '#5a5040' }}>{n.source}</span>
                <span style={{ color: '#cfc6b2' }}>·</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Clock size={11} /> {n.time}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </>
  );
}

function chipStyle(active, category) {
  return {
    fontSize: 11.5, fontWeight: active ? 600 : 500,
    color: active ? '#fff' : '#5a5040',
    background: active ? category.accent : '#f3efe2',
    padding: '3px 9px', borderRadius: 999, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 5,
    border: '1px solid transparent',
  };
}

function pillStyle(active, accent) {
  return {
    background: active ? accent : '#fff',
    color: active ? '#fff' : '#3d3a30',
    border: active ? `1px solid ${accent}` : '1px solid #e5e0d3',
    borderRadius: 999, padding: '6px 14px',
    fontSize: 13, fontWeight: 500,
    fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center',
  };
}
