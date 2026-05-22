import React, { useState, useMemo, useEffect } from 'react';
import { Zap, FileText, Users, Swords, Building2, Clock, Star, Search, RefreshCw, AlertCircle, ChevronRight, Sparkles, Home, ExternalLink } from 'lucide-react';

// 카테고리 정의 (기존과 동일)
const CATEGORIES = [
  { id: 'policy', label: '정책', desc: 'IRA · 배터리법 · 광물', icon: FileText, subs: [
    { id: 'us', label: '미국' },
    { id: 'eu', label: '유럽' },
    { id: 'kr', label: '국내' },
    { id: 'minerals', label: '광물·공급망' },
    { id: 'etc', label: '기타' },
  ]},
  { id: 'competitor', label: '경쟁사', desc: '주요 경쟁사 동향', icon: Swords, subs: [
    { id: 'lges', label: 'LGES' },
    { id: 'catl', label: 'CATL' },
    { id: 'ampace', label: 'AMPACE' },
    { id: 'eve', label: 'EVE' },
  ]},
  { id: 'customer', label: '고객사', desc: '주요 고객사 동향', icon: Users, subs: [
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
  { id: 'own', label: '자사', desc: '삼성SDI 동향', icon: Building2, subs: [] },
];

const SUB_LABEL = {
  us: '미국', eu: '유럽', kr: '국내', minerals: '광물·공급망', etc: '기타',
  lges: 'LGES', catl: 'CATL', ampace: 'AMPACE', eve: 'EVE',
  'samsung-mx': '삼성전자 MX', tti: 'TTI', bosch: 'Bosch', volvo: 'Volvo',
  bmw: 'BMW', vwg: 'VWG', spacex: 'Space X', hyundai: '현대자동차', rivian: 'Rivian',
};

export default function App() {
  const [news, setNews] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [lastUpdated, setLastUpdated] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCat, setActiveCat] = useState(null);
  const [activeSub, setActiveSub] = useState(null);
  const [search, setSearch] = useState('');

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

  const handleCatClick = (catId) => {
    if (activeCat === catId) {
      setActiveCat(null);
      setActiveSub(null);
    } else {
      setActiveCat(catId);
      setActiveSub(null);
    }
    setSearch('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubClick = (catId, subId) => {
    setActiveCat(catId);
    setActiveSub(activeSub === subId ? null : subId);
    setSearch('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goHome = () => {
    setActiveCat(null);
    setActiveSub(null);
    setSearch('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeCategory = CATEGORIES.find(c => c.id === activeCat);

  const filteredNews = useMemo(() => {
    let list = news;
    if (activeCat) list = list.filter(n => n.cat === activeCat);
    if (activeSub) list = list.filter(n => n.sub === activeSub);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(n =>
        n.title.toLowerCase().includes(q) ||
        (n.summary && n.summary.toLowerCase().includes(q))
      );
    }
    return list;
  }, [news, activeCat, activeSub, search]);

  return (
    <div className="bb-app">
      <style>{globalStyles}</style>

      <TopNav lastUpdated={lastUpdated} totalCount={news.length} onLogoClick={goHome} />

      <div className="bb-layout">
        <Sidebar
          activeCat={activeCat}
          activeSub={activeSub}
          news={news}
          onCatClick={handleCatClick}
          onSubClick={handleSubClick}
          onHomeClick={goHome}
        />

        <main className="bb-content">
          {loading && <LoadingView />}
          {!loading && error && <ErrorView error={error} onRetry={loadData} />}
          {!loading && !error && (
            <>
              {featured.length > 0 && <ConcernsBanner featured={featured} />}

              {activeCat ? (
                <CategoryView
                  category={activeCategory}
                  activeSub={activeSub}
                  news={news}
                  filteredNews={filteredNews}
                  search={search}
                  setSearch={setSearch}
                  onSubClick={handleSubClick}
                />
              ) : (
                <HomeView
                  news={news}
                  onCatClick={handleCatClick}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

// ━━━━━━━━━━ Top Navigation ━━━━━━━━━━
function TopNav({ lastUpdated, totalCount, onLogoClick }) {
  return (
    <header className="bb-topnav">
      <div className="bb-logo" onClick={onLogoClick}>
        <div className="bb-logo-icon"><Zap size={16} color="#fff" strokeWidth={2.5} /></div>
        <span className="bb-logo-text">Battery Briefing</span>
        <span className="bb-logo-badge">SDI 기획그룹</span>
      </div>
      <nav className="bb-top-menu">
        <a className="active">메인</a>
      </nav>
      <div className="bb-top-right">
        {lastUpdated && <span className="bb-last-update">업데이트 · {lastUpdated}</span>}
        <span className="bb-total-count">총 {totalCount}건</span>
      </div>
    </header>
  );
}

// ━━━━━━━━━━ Sidebar ━━━━━━━━━━
function Sidebar({ activeCat, activeSub, news, onCatClick, onSubClick, onHomeClick }) {
  return (
    <aside className="bb-sidebar">
      <div className="bb-sidebar-header">
        <div className="bb-sidebar-title">카테고리</div>
        <div className="bb-sidebar-sub">CATEGORY</div>
      </div>

      <div className="bb-menu-list">
        {/* Home */}
        <div
          className={`bb-menu-item ${!activeCat ? 'active' : ''}`}
          onClick={onHomeClick}
        >
          <Home size={17} style={{ marginRight: 10, verticalAlign: -3 }} />
          전체 보기
          <span className="bb-count">{news.length}</span>
        </div>

        {/* Categories */}
        {CATEGORIES.map(cat => {
          const count = news.filter(n => n.cat === cat.id).length;
          const isActive = activeCat === cat.id;
          return (
            <React.Fragment key={cat.id}>
              <div
                className={`bb-menu-item ${isActive ? 'active' : ''}`}
                onClick={() => onCatClick(cat.id)}
              >
                {cat.label}
                <span className="bb-count">{count}</span>
              </div>

              {/* Subcategories (expanded when active) */}
              {isActive && cat.subs.length > 0 && (
                <div className="bb-submenu">
                  {cat.subs.map(sub => {
                    const subCount = news.filter(n => n.cat === cat.id && n.sub === sub.id).length;
                    return (
                      <div
                        key={sub.id}
                        className={`bb-submenu-item ${activeSub === sub.id ? 'active' : ''}`}
                        onClick={() => onSubClick(cat.id, sub.id)}
                      >
                        {sub.label}
                        <span className="bb-count">{subCount}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </aside>
  );
}

// ━━━━━━━━━━ SDI 고민거리 Banner ━━━━━━━━━━
function ConcernsBanner({ featured }) {
  const items = featured.slice(0, 3);
  return (
    <div className="bb-concerns">
      <div className="bb-concerns-label">
        SDI 고민거리
        <span className="bb-concerns-badge">{featured.length}</span>
      </div>
      <div className="bb-concerns-items">
        {items.map((item, idx) => (
          <a
            key={item.id}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="bb-concern"
          >
            <span className="bb-concern-num">{String(idx + 1).padStart(2, '0')}</span>
            {item.title}
          </a>
        ))}
      </div>
    </div>
  );
}

// ━━━━━━━━━━ Home View ━━━━━━━━━━
function HomeView({ news, onCatClick }) {
  return (
    <>
      <div className="bb-page-header">
        <div className="bb-page-title-area">
          <div className="bb-page-icon"><Star size={20} color="#2C7DC4" strokeWidth={2.2} /></div>
          <div>
            <div className="bb-page-title">전체 카테고리</div>
            <div className="bb-page-desc">왼쪽 사이드바에서 카테고리를 선택하거나, 아래 카드에서 바로 이동하세요</div>
          </div>
        </div>
      </div>

      <div className="bb-cat-grid">
        {CATEGORIES.map(cat => {
          const items = news.filter(n => n.cat === cat.id).slice(0, 4);
          const totalCount = news.filter(n => n.cat === cat.id).length;
          const Icon = cat.icon;
          return (
            <div key={cat.id} className="bb-cat-card" onClick={() => onCatClick(cat.id)}>
              <div className="bb-cat-card-header">
                <div className="bb-cat-card-icon"><Icon size={18} color="#2C7DC4" strokeWidth={2.2} /></div>
                <div className="bb-cat-card-title-area">
                  <div className="bb-cat-card-title">{cat.label}</div>
                  <div className="bb-cat-card-desc">{cat.desc}</div>
                </div>
                <div className="bb-cat-card-count">{totalCount}</div>
              </div>
              <div className="bb-cat-card-list">
                {items.length === 0 ? (
                  <div className="bb-empty-small">아직 수집된 기사가 없습니다</div>
                ) : (
                  items.map((n, idx) => (
                    <a
                      key={n.id}
                      href={n.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bb-cat-card-item"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="bb-cat-card-item-num">{idx + 1}</span>
                      <span className="bb-cat-card-item-title">{n.title}</span>
                    </a>
                  ))
                )}
              </div>
              <div className="bb-cat-card-more">
                {cat.label} 전체 보기 <ChevronRight size={14} />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ━━━━━━━━━━ Category View ━━━━━━━━━━
function CategoryView({ category, activeSub, news, filteredNews, search, setSearch, onSubClick }) {
  if (!category) return null;
  const Icon = category.icon;
  const hasSubs = category.subs && category.subs.length > 0;
  const totalInCat = news.filter(n => n.cat === category.id).length;

  return (
    <>
      {/* Page Header */}
      <div className="bb-page-header">
        <div className="bb-page-title-area">
          <div className="bb-page-icon"><Icon size={20} color="#2C7DC4" strokeWidth={2.2} /></div>
          <div>
            <div className="bb-page-title">
              {category.label}
              {activeSub && <span className="bb-page-title-sub"> · {SUB_LABEL[activeSub] || activeSub}</span>}
            </div>
            <div className="bb-page-desc">{category.desc}</div>
          </div>
        </div>
        <div className="bb-breadcrumb">
          <Home size={13} color="#2C7DC4" />
          <span>›</span>
          <span>{category.label}</span>
          {activeSub && (<>
            <span>›</span>
            <span className="current">{SUB_LABEL[activeSub]}</span>
          </>)}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bb-filter-bar">
        <span className="bb-filter-label">검색</span>
        <div className="bb-search-box">
          <input
            type="text"
            className="bb-search-input"
            placeholder={`${category.label} 내 기사 검색`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="bb-search-btn"><Search size={14} /></button>
        </div>
        <div className="bb-result-count">총 <strong>{filteredNews.length}</strong>건</div>
      </div>

      {/* Subcategory chips (only if has subs) */}
      {hasSubs && (
        <div className="bb-subchips">
          <div
            className={`bb-subchip ${!activeSub ? 'active' : ''}`}
            onClick={() => onSubClick(category.id, null)}
          >
            전체 <span className="bb-subchip-count">{totalInCat}</span>
          </div>
          {category.subs.map(sub => {
            const subCount = news.filter(n => n.cat === category.id && n.sub === sub.id).length;
            return (
              <div
                key={sub.id}
                className={`bb-subchip ${activeSub === sub.id ? 'active' : ''}`}
                onClick={() => onSubClick(category.id, sub.id)}
              >
                {sub.label} <span className="bb-subchip-count">{subCount}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Article list */}
      {filteredNews.length === 0 ? (
        <div className="bb-empty">
          <AlertCircle size={28} color="#999" />
          <div>해당하는 기사가 없습니다</div>
        </div>
      ) : (
        <div className="bb-article-list">
          {filteredNews.map((n, idx) => (
            <ArticleRow key={n.id} article={n} num={idx + 1} category={category} />
          ))}
        </div>
      )}
    </>
  );
}

// ━━━━━━━━━━ Article Row ━━━━━━━━━━
function ArticleRow({ article, num, category }) {
  return (
    <a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      className="bb-article-row"
    >
      <div className="bb-article-num">{num}</div>
      <div className="bb-article-body">
        <div className="bb-article-title">{article.title}</div>

        {article.summary && (
          <div className="bb-ai-summary">
            <div className="bb-ai-summary-label">
              <Sparkles size={11} color="#2C7DC4" />
              AI 요약
            </div>
            <div className="bb-ai-summary-content">{article.summary}</div>
          </div>
        )}

        <div className="bb-article-meta">
          {article.sub && SUB_LABEL[article.sub] && (
            <span className="bb-article-tag">{category.label} · {SUB_LABEL[article.sub]}</span>
          )}
          <span className="bb-article-source">{article.source}</span>
          <span className="bb-article-date">{article.time}</span>
        </div>
      </div>
      <div className="bb-article-arrow"><ExternalLink size={14} color="#999" /></div>
    </a>
  );
}

// ━━━━━━━━━━ Loading & Error Views ━━━━━━━━━━
function LoadingView() {
  return (
    <div className="bb-loading">
      <RefreshCw size={28} className="bb-spin" color="#2C7DC4" />
      <div>뉴스를 불러오는 중…</div>
    </div>
  );
}

function ErrorView({ error, onRetry }) {
  return (
    <div className="bb-error">
      <AlertCircle size={32} color="#E74C3C" />
      <h3>데이터를 불러올 수 없습니다</h3>
      <p>새로고침을 시도해 주세요.</p>
      <details>
        <summary>오류 상세</summary>
        <code>{error}</code>
      </details>
      <button onClick={onRetry}>다시 시도</button>
    </div>
  );
}

// ━━━━━━━━━━ Global Styles ━━━━━━━━━━
const globalStyles = `
  @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css');

  :root {
    --primary: #2C7DC4;
    --primary-dark: #1F5F9E;
    --primary-light: #5BA8D9;
    --primary-bg: #E8F2FB;
    --bg: #F5F7FA;
    --bg-card: #FFFFFF;
    --ink: #2C2C2C;
    --ink-mute: #666666;
    --ink-faint: #999999;
    --line: #E0E5EB;
    --line-light: #EEF1F5;
    --accent: #E74C3C;
    --warning: #F39C12;
  }

  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Pretendard', -apple-system, sans-serif; background: var(--bg); color: var(--ink); -webkit-font-smoothing: antialiased; }
  a { color: inherit; text-decoration: none; }

  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-thumb { background: #d0d6de; border-radius: 4px; }

  .bb-app { min-height: 100vh; }

  /* ━━━ Top Nav ━━━ */
  .bb-topnav { background: #fff; border-bottom: 1px solid var(--line); height: 68px; display: flex; align-items: center; padding: 0 32px; gap: 36px; position: sticky; top: 0; z-index: 10; }
  .bb-logo { display: flex; align-items: center; gap: 10px; cursor: pointer; }
  .bb-logo-icon { width: 32px; height: 32px; background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%); border-radius: 7px; display: flex; align-items: center; justify-content: center; }
  .bb-logo-text { font-size: 22px; font-weight: 700; color: var(--primary-dark); letter-spacing: -0.02em; }
  .bb-logo-badge { font-size: 12px; color: var(--primary); background: var(--primary-bg); padding: 4px 10px; border-radius: 4px; letter-spacing: 0.04em; font-weight: 500; }
  .bb-top-menu { display: flex; gap: 28px; flex: 1; }
  .bb-top-menu a { font-size: 15px; font-weight: 500; color: var(--ink-mute); padding: 6px 0; border-bottom: 2px solid transparent; cursor: pointer; transition: all 0.15s; }
  .bb-top-menu a.active { color: var(--ink); border-bottom-color: var(--primary); }
  .bb-top-menu a:hover { color: var(--ink); }
  .bb-top-right { display: flex; align-items: center; gap: 16px; }
  .bb-last-update { font-size: 13px; color: var(--ink-faint); }
  .bb-total-count { font-size: 13px; color: var(--ink-mute); background: var(--bg); padding: 5px 12px; border-radius: 14px; font-weight: 500; }

  /* ━━━ Layout ━━━ */
  .bb-layout { display: grid; grid-template-columns: 280px 1fr; gap: 20px; padding: 20px 28px 60px; max-width: 1400px; margin: 0 auto; }

  /* ━━━ Sidebar ━━━ */
  .bb-sidebar { background: #fff; border: 1px solid var(--line); border-radius: 4px; overflow: hidden; align-self: start; position: sticky; top: 80px; }
  .bb-sidebar-header { background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%); padding: 28px 24px; color: #fff; position: relative; overflow: hidden; }
  .bb-sidebar-header::after { content: '🔋'; position: absolute; right: 16px; top: 50%; transform: translateY(-50%); font-size: 40px; opacity: 0.3; }
  .bb-sidebar-title { font-size: 24px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 4px; }
  .bb-sidebar-sub { font-size: 11px; opacity: 0.85; letter-spacing: 0.1em; }
  .bb-menu-list { padding: 8px 0; }
  .bb-menu-item { padding: 18px 24px; font-size: 17px; font-weight: 600; color: var(--ink); border-left: 4px solid transparent; cursor: pointer; transition: all 0.15s; user-select: none; position: relative; letter-spacing: -0.01em; }
  .bb-menu-item:hover { background: var(--bg); color: var(--primary-dark); }
  .bb-menu-item.active { color: var(--primary); border-left-color: var(--primary); background: var(--primary-bg); font-weight: 700; }
  .bb-count { float: right; font-size: 13px; color: var(--ink-faint); background: var(--bg); padding: 3px 10px; border-radius: 12px; font-weight: 600; }
  .bb-menu-item.active .bb-count { background: #fff; color: var(--primary); }
  .bb-submenu { background: var(--bg); padding: 6px 0; border-top: 1px solid var(--line-light); border-bottom: 1px solid var(--line-light); }
  .bb-submenu-item { padding: 12px 24px 12px 42px; font-size: 14.5px; color: var(--ink-mute); cursor: pointer; transition: all 0.15s; user-select: none; position: relative; font-weight: 500; }
  .bb-submenu-item::before { content: ''; position: absolute; left: 28px; top: 50%; width: 5px; height: 5px; background: var(--line); border-radius: 50%; }
  .bb-submenu-item:hover { color: var(--primary); background: rgba(255,255,255,0.6); }
  .bb-submenu-item.active { color: var(--primary); font-weight: 700; }
  .bb-submenu-item.active::before { background: var(--primary); }
  .bb-submenu-item .bb-count { background: transparent; font-size: 12px; }

  /* ━━━ Content ━━━ */
  .bb-content { min-width: 0; }

  /* ━━━ Concerns Banner ━━━ */
  .bb-concerns { background: linear-gradient(135deg, #1F5F9E 0%, #2C7DC4 100%); color: #fff; border-radius: 4px; padding: 22px 26px; margin-bottom: 22px; display: flex; gap: 24px; align-items: center; position: relative; overflow: hidden; flex-wrap: wrap; }
  .bb-concerns::before { content: ''; position: absolute; top: -30px; right: -30px; width: 160px; height: 160px; background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%); }
  .bb-concerns-label { font-size: 15px; font-weight: 700; padding-right: 24px; border-right: 1px solid rgba(255,255,255,0.3); flex-shrink: 0; letter-spacing: 0.02em; position: relative; }
  .bb-concerns-badge { display: inline-block; font-size: 11px; background: rgba(255,255,255,0.2); padding: 3px 9px; border-radius: 12px; margin-left: 8px; font-weight: 500; }
  .bb-concerns-items { display: flex; gap: 26px; flex: 1; position: relative; flex-wrap: wrap; min-width: 0; }
  .bb-concern { font-size: 14.5px; line-height: 1.45; color: #fff; cursor: pointer; transition: opacity 0.15s; }
  .bb-concern:hover { opacity: 0.8; }
  .bb-concern-num { color: #FFE082; font-weight: 700; margin-right: 7px; font-size: 13px; }

  /* ━━━ Page Header ━━━ */
  .bb-page-header { background: #fff; border: 1px solid var(--line); border-radius: 4px; padding: 22px 26px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
  .bb-page-title-area { display: flex; align-items: center; gap: 16px; }
  .bb-page-icon { width: 48px; height: 48px; background: var(--primary-bg); border-radius: 10px; display: flex; align-items: center; justify-content: center; }
  .bb-page-title { font-size: 24px; font-weight: 700; letter-spacing: -0.02em; }
  .bb-page-title-sub { color: var(--primary); }
  .bb-page-desc { font-size: 14px; color: var(--ink-mute); margin-top: 3px; }
  .bb-breadcrumb { display: flex; align-items: center; gap: 7px; font-size: 13.5px; color: var(--ink-faint); }
  .bb-breadcrumb .current { color: var(--ink); font-weight: 500; }

  /* ━━━ Filter Bar ━━━ */
  .bb-filter-bar { background: #fff; border: 1px solid var(--line); border-radius: 4px; padding: 14px 20px; margin-bottom: 16px; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
  .bb-filter-label { font-size: 14px; color: var(--ink-mute); font-weight: 500; }
  .bb-search-box { flex: 1; min-width: 220px; display: flex; border: 1px solid var(--line); border-radius: 4px; overflow: hidden; }
  .bb-search-input { flex: 1; padding: 9px 14px; border: none; outline: none; font-size: 14px; background: var(--bg); font-family: inherit; }
  .bb-search-btn { background: var(--primary); color: #fff; border: none; padding: 0 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .bb-search-btn:hover { background: var(--primary-dark); }
  .bb-result-count { font-size: 14px; color: var(--ink-mute); }
  .bb-result-count strong { color: var(--primary); font-weight: 700; }

  /* ━━━ Subchips ━━━ */
  .bb-subchips { display: flex; gap: 7px; flex-wrap: wrap; margin-bottom: 18px; }
  .bb-subchip { font-size: 13.5px; padding: 7px 14px; background: #fff; border: 1px solid var(--line); color: var(--ink-mute); cursor: pointer; border-radius: 20px; transition: all 0.15s; user-select: none; }
  .bb-subchip:hover { border-color: var(--primary); color: var(--primary); }
  .bb-subchip.active { background: var(--primary); color: #fff; border-color: var(--primary); font-weight: 500; }
  .bb-subchip-count { margin-left: 4px; font-size: 12px; opacity: 0.65; }

  /* ━━━ Article List ━━━ */
  .bb-article-list { background: #fff; border: 1px solid var(--line); border-radius: 4px; overflow: hidden; }
  .bb-article-row { padding: 22px 26px; border-bottom: 1px solid var(--line-light); cursor: pointer; transition: background 0.15s; display: grid; grid-template-columns: 32px 1fr auto; gap: 16px; align-items: start; }
  .bb-article-row:last-child { border-bottom: none; }
  .bb-article-row:hover { background: var(--primary-bg); }
  .bb-article-num { font-size: 16px; font-weight: 700; color: var(--primary); padding-top: 2px; text-align: center; }
  .bb-article-body { min-width: 0; }
  .bb-article-title { font-size: 17px; font-weight: 600; letter-spacing: -0.01em; line-height: 1.4; margin-bottom: 11px; color: var(--ink); }
  .bb-article-row:hover .bb-article-title { color: var(--primary-dark); }
  .bb-ai-summary { background: var(--bg); border-left: 3px solid var(--primary-light); padding: 11px 15px; margin-bottom: 11px; border-radius: 0 4px 4px 0; }
  .bb-ai-summary-label { font-size: 11.5px; color: var(--primary); font-weight: 700; letter-spacing: 0.08em; margin-bottom: 4px; display: flex; align-items: center; gap: 5px; }
  .bb-ai-summary-content { font-size: 14px; color: var(--ink-mute); line-height: 1.65; }
  .bb-article-meta { display: flex; align-items: center; gap: 11px; font-size: 13px; color: var(--ink-faint); flex-wrap: wrap; }
  .bb-article-source { color: var(--primary-dark); font-weight: 500; }
  .bb-article-date { color: var(--ink-faint); }
  .bb-article-tag { display: inline-block; background: var(--primary-bg); color: var(--primary); font-size: 12px; padding: 3px 9px; border-radius: 4px; font-weight: 500; }
  .bb-article-arrow { padding-top: 3px; opacity: 0.5; transition: opacity 0.15s; }
  .bb-article-row:hover .bb-article-arrow { opacity: 1; }

  /* ━━━ Category Grid (Home) ━━━ */
  .bb-cat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
  .bb-cat-card { background: #fff; border: 1px solid var(--line); border-radius: 6px; padding: 20px 22px 18px; cursor: pointer; transition: all 0.15s; }
  .bb-cat-card:hover { border-color: var(--primary); box-shadow: 0 4px 14px rgba(44,125,196,0.1); transform: translateY(-2px); }
  .bb-cat-card-header { display: flex; align-items: center; gap: 12px; padding-bottom: 14px; border-bottom: 1px solid var(--line-light); margin-bottom: 14px; }
  .bb-cat-card-icon { width: 40px; height: 40px; background: var(--primary-bg); border-radius: 8px; display: flex; align-items: center; justify-content: center; }
  .bb-cat-card-title-area { flex: 1; min-width: 0; }
  .bb-cat-card-title { font-size: 18px; font-weight: 700; letter-spacing: -0.015em; }
  .bb-cat-card-desc { font-size: 13px; color: var(--ink-faint); margin-top: 2px; }
  .bb-cat-card-count { font-size: 15px; font-weight: 700; color: var(--primary); background: var(--primary-bg); padding: 4px 12px; border-radius: 14px; }
  .bb-cat-card-list { display: flex; flex-direction: column; gap: 8px; min-height: 120px; }
  .bb-cat-card-item { display: flex; gap: 10px; padding: 6px 0; font-size: 14px; color: var(--ink); line-height: 1.5; cursor: pointer; transition: color 0.15s; }
  .bb-cat-card-item:hover { color: var(--primary); }
  .bb-cat-card-item-num { color: var(--primary); font-weight: 700; flex-shrink: 0; min-width: 16px; }
  .bb-cat-card-item-title { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
  .bb-cat-card-more { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--line-light); font-size: 13.5px; color: var(--primary); font-weight: 600; display: flex; align-items: center; gap: 4px; }
  .bb-empty-small { padding: 22px 0; text-align: center; color: var(--ink-faint); font-size: 13px; }

  /* ━━━ Empty / Loading / Error ━━━ */
  .bb-empty { padding: 60px 30px; background: #fff; border: 1px solid var(--line); border-radius: 4px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 10px; color: var(--ink-mute); font-size: 13.5px; }
  .bb-loading { padding: 80px 20px; text-align: center; }
  .bb-loading div { margin-top: 14px; font-size: 13px; color: var(--ink-mute); }
  .bb-spin { animation: bb-spin 1s linear infinite; }
  @keyframes bb-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .bb-error { padding: 40px 30px; background: #fff; border: 1px solid #F5D9D7; border-radius: 4px; text-align: center; max-width: 480px; margin: 40px auto; }
  .bb-error h3 { font-size: 16px; font-weight: 700; margin: 14px 0 6px; }
  .bb-error p { font-size: 13px; color: var(--ink-mute); margin: 0 0 16px; }
  .bb-error details { margin-bottom: 14px; font-size: 12px; color: var(--ink-faint); }
  .bb-error details code { display: block; margin-top: 8px; padding: 10px; background: var(--bg); border-radius: 4px; font-size: 11px; text-align: left; }
  .bb-error button { padding: 8px 18px; background: var(--primary); color: #fff; border: none; border-radius: 4px; cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 600; }
  .bb-error button:hover { background: var(--primary-dark); }

  /* ━━━ Responsive ━━━ */
  @media (max-width: 768px) {
    .bb-layout { grid-template-columns: 1fr; padding: 16px; }
    .bb-sidebar { position: relative; top: 0; }
    .bb-topnav { padding: 0 16px; gap: 16px; }
    .bb-logo-badge { display: none; }
    .bb-cat-grid { grid-template-columns: 1fr; }
  }
`;
