const $ = (s, r=document)=>r.querySelector(s); const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const data = window.EPA_DATA || [];
const params = new URLSearchParams(location.search);
const qParam = params.get('q') || '';
const modeParam = params.get('mode') || '';
function norm(s){return String(s||'').toLowerCase().normalize('NFKC').replace(/\s+/g,'');}
function getStats(){try{return JSON.parse(localStorage.getItem('epa_stats')||'{}')}catch{return {}}}
function setStats(v){localStorage.setItem('epa_stats',JSON.stringify(v))}
function bump(id,key){const s=getStats(); s[id]=s[id]||{search:0,view:0}; s[id][key]=(s[id][key]||0)+1; setStats(s)}
function scoreItem(item,q){const n=norm(q); if(!n) return item.popularity; let score=0; const fields=[item.id,item.title,item.kana,item.category,item.group,(item.tags||[]).join(' '),(item.purpose||[]).join(' '),item.summary].map(norm); fields.forEach((f,i)=>{ if(f===n) score+=120; else if(f.startsWith(n)) score+=80; else if(f.includes(n)) score+=45; }); if(norm(item.id)===n||norm(item.title)===n) score+=100; return score + item.popularity/10;}
function searchData(q, tab='すべて', filters={level:[], group:[]}, sort='relevance'){
  let arr=data.map(x=>({...x,_score:scoreItem(x,q)})).filter(x=>!q || x._score>0);
  if(tab && tab!=='すべて') arr=arr.filter(x=>x.category===tab || x.group===tab || (x.tags||[]).includes(tab));
  if(filters.level?.length) arr=arr.filter(x=>filters.level.includes(x.level));
  if(filters.group?.length) arr=arr.filter(x=>filters.group.includes(x.group)||filters.group.includes(x.category));
  const stats=getStats();
  arr.forEach(x=>{const st=stats[x.id]||{}; x._popular=(x.popularity||0)+(st.search||0)*3+(st.view||0)*5});
  if(sort==='popular') arr.sort((a,b)=>b._popular-a._popular);
  else if(sort==='new') arr.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  else if(sort==='name') arr.sort((a,b)=>a.title.localeCompare(b.title));
  else arr.sort((a,b)=>b._score-a._score || b._popular-a._popular);
  return arr;
}
function goSearch(q){ const v=(q||'').trim(); location.href='search.html'+(v?'?q='+encodeURIComponent(v):''); }
function goMode(mode){ location.href='search.html?mode='+encodeURIComponent(mode); }
function getHistory(){try{return JSON.parse(localStorage.getItem('epa_history')||'[]')}catch{return []}}
function setHistory(v){localStorage.setItem('epa_history',JSON.stringify(v.slice(0,20)))}
function addHistory(id){const item=data.find(x=>x.id===id); if(!item)return; const rest=getHistory().filter(x=>x!==id); setHistory([id,...rest]);}
function goDetail(id){ bump(id,'view'); addHistory(id); location.href='detail.html?id='+encodeURIComponent(id); }
function renderSmallLists(){
  const latest=$('#latestList'), popular=$('#popularList'); if(!latest&&!popular)return;
  const stats=getStats(); const enriched=data.map(x=>({...x,_pop:(x.popularity||0)+((stats[x.id]||{}).search||0)*3+((stats[x.id]||{}).view||0)*5}));
  if(latest) latest.innerHTML=enriched.slice().sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,5).map((x,i)=>smallCard(x,i+1,'date')).join('');
  if(popular) popular.innerHTML=enriched.slice().sort((a,b)=>b._pop-a._pop).slice(0,5).map((x,i)=>smallCard(x,i+1,'views')).join('');
  $$('.small-card').forEach(c=>c.onclick=()=>goDetail(c.dataset.id));
}
function smallCard(x,rank=1,kind='views'){
  const meta = kind==='date' ? (x.updatedAt||x.createdAt||'') : (formatCount((x.popularity||0)*100)||'');
  return `<div class="card small-card" data-id="${x.id}" data-rank="${rank}"><h3>${x.title}</h3><span class="badge">${x.group}</span><span class="home-list-meta">${meta}</span><p>${x.summary}</p></div>`
}
function formatCount(n){
  const v=Number(n||0);
  if(v>=1000) return (v/1000).toFixed(v>=10000?1:1).replace(/\.0$/,'')+'K';
  return String(v);
}
function initHome(){
  const input=$('#homeSearch'), btn=$('#homeBtn'); if(!input)return; btn.onclick=()=>goSearch(input.value); input.addEventListener('keydown',e=>{if(e.key==='Enter')goSearch(input.value)});
  $$('.chip,.quick-card').forEach(el=>el.addEventListener('click',e=>{
    if(el.dataset.q==='エラー'){ e.preventDefault(); goDetail('TROUBLE_HUB'); return; }
    if(el.dataset.mode){goMode(el.dataset.mode);return;}
    goSearch(el.dataset.q||el.textContent.trim());
  }));
  renderSmallLists();
}
let currentTab='すべて', currentPage=1, pageSize=7;
function getFilters(){return {level:$$('.filter-chip.active[data-filter="level"]').map(x=>x.dataset.value), group:$$('.filter-chip.active[data-filter="group"]').map(x=>x.dataset.value)}}
function renderSearch(){
  const root=$('#results'); if(!root)return; const input=$('#searchInput'); if(input && !input.value) input.value=qParam;
  const q=input?.value || qParam; const sort=($('#sortSelect')?.value || $('#sortSelectMobile')?.value || 'relevance');
  let arr, title;
  if(modeParam==='favorites'){
    arr=getFavoriteItems(); title='お気に入り';
    if(input) input.value='';
  }else if(modeParam==='history'){
    arr=getHistoryItems(); title='最近見た項目';
    if(input) input.value='';
  }else if(modeParam==='popular'){
    const stats=getStats();
    arr=data.map(x=>({...x,_popular:(x.popularity||0)+((stats[x.id]||{}).search||0)*3+((stats[x.id]||{}).view||0)*5})).sort((a,b)=>b._popular-a._popular);
    title='人気コンテンツ';
    if(input) input.value='';
  }else if(modeParam==='latest'){
    arr=data.slice().sort((a,b)=>String(b.createdAt||b.updatedAt).localeCompare(String(a.createdAt||a.updatedAt)));
    title='新着コンテンツ';
    if(input) input.value='';
  }else{
    arr=searchData(q,currentTab,getFilters(),sort); title=q ? `「${q}」の検索結果` : '検索結果';
    if(q) arr.slice(0,5).forEach(x=>{ if(x._score>0) bump(x.id,'search') });
  }
  $('#resultTitle').textContent = title;
  $('#resultCount').textContent = `${arr.length}件のコンテンツが見つかりました`;
  const totalPages=Math.max(1,Math.ceil(arr.length/pageSize)); if(currentPage>totalPages) currentPage=1;
  const page=arr.slice((currentPage-1)*pageSize,currentPage*pageSize);
  root.innerHTML = page.length ? page.map(resultCard).join('') : `<div class="empty"><h2>${modeParam==='favorites'?'お気に入りはまだありません':modeParam==='history'?'履歴はまだありません':'検索結果がありません'}</h2><p>${modeParam==='favorites'?'検索結果や詳細画面の星マークから追加できます。':modeParam==='history'?'詳細画面を開くと、最近見た項目として保存されます。':'「足し算」「縦検索」「条件付き合計」など、目的の言葉でも検索できます。'}</p></div>`;
  $$('.result-card').forEach(c=>c.addEventListener('click',e=>{ if(e.target.closest('.favorite'))return; goDetail(c.dataset.id)}));
  $$('.favorite').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation(); toggleFav(b.dataset.id,b)}));
  renderPager(totalPages);
}
function resultCard(x){const fav=isFav(x.id); const icon=x.category==='エラー解決'?'!':(x.category==='基本操作'?'▦':(x.group==='検索関数'?'⌕':x.title.slice(0,2))); return `<article class="result-card" data-id="${x.id}">
  <div class="result-top"><div class="result-name"><div class="result-icon">${icon}</div><div><h2>${x.title}</h2><div class="badges"><span class="badge green">${x.category}</span><span class="badge">${x.group}</span><span class="badge gray">${x.level}</span><span class="badge gray">約${x.minutes}分</span></div></div></div><button class="favorite ${fav?'active':''}" data-id="${x.id}" title="お気に入り">${fav?'★':'☆'}</button></div>
  <p class="result-summary">${x.summary}</p>
  <div class="formula-preview"><span>${x.syntax}</span><strong class="mini-link">詳細を見る →</strong></div>
  <div class="meta-row"><span>更新日：${x.updatedAt}</span><span>用途：${(x.purpose||[]).slice(0,3).join(' / ')}</span></div>
</article>`}
function renderPager(total){const p=$('#pager'); if(!p)return; p.innerHTML=''; if(total<=1)return; for(let i=1;i<=total;i++){const b=document.createElement('button');b.className='page-btn '+(i===currentPage?'active':'');b.textContent=i;b.onclick=()=>{currentPage=i;renderSearch();scrollTo({top:0,behavior:'smooth'})};p.appendChild(b)}}
function isFav(id){try{return (JSON.parse(localStorage.getItem('epa_favorites')||'[]')).includes(id)}catch{return false}}
function toggleFav(id,btn){let f=[];try{f=JSON.parse(localStorage.getItem('epa_favorites')||'[]')}catch{}; const wasFav=f.includes(id); f=wasFav?f.filter(x=>x!==id):[...f,id]; localStorage.setItem('epa_favorites',JSON.stringify(f)); if(btn){const nowFav=!wasFav;btn.classList.toggle('active',nowFav);btn.textContent=btn.classList.contains('detail-fav')?(nowFav?'★ お気に入り済み':'☆ お気に入り'):(nowFav?'★':'☆')} showToast(!wasFav?'お気に入りに追加しました':'お気に入りから外しました')}
function getFavoriteItems(){const ids=[];try{ids.push(...JSON.parse(localStorage.getItem('epa_favorites')||'[]'))}catch{}; return ids.map(id=>data.find(x=>x.id===id)).filter(Boolean)}
function getHistoryItems(){return getHistory().map(id=>data.find(x=>x.id===id)).filter(Boolean)}
function initSearch(){ if(!$('#results'))return; $('#searchBtn').onclick=()=>{currentPage=1; renderSearch(); history.replaceState(null,'','search.html?q='+encodeURIComponent($('#searchInput').value))}; $('#searchInput').addEventListener('keydown',e=>{if(e.key==='Enter')$('#searchBtn').click()}); $$('.tab').forEach(t=>t.onclick=()=>{$$('.tab').forEach(x=>x.classList.remove('active')); t.classList.add('active'); currentTab=t.dataset.tab; currentPage=1; renderSearch()}); $$('#sortSelect,#sortSelectMobile,input[type="checkbox"]').forEach(x=>x.addEventListener('change',()=>{currentPage=1;renderSearch()})); $$('.filter-chip').forEach(chip=>chip.addEventListener('click',()=>{chip.classList.toggle('active'); currentPage=1; renderSearch()})); renderSearch(); }

function initDetail(){
  const root=$('#detailRoot'); if(!root)return;
  const id=params.get('id')||'SUM';
  const x=data.find(d=>d.id===id)||data[0];
  bump(x.id,'view');
  addHistory(x.id);
  document.title=x.type==='utility-weight'?'EPA 材料・計算ツール Ver.4.2':`${x.title} - EPA`;
  const fav=isFav(x.id);
  const tpl=getDetailTemplate(x);
  const isWeightUtility=x.type==='utility-weight';
  root.innerHTML=`
    <div class="detail-layout-2026 ${isWeightUtility?'weight-detail-page':''}">
      ${isWeightUtility?'':`<div class="detail-breadcrumb docs-breadcrumb"><a href="index.html">ホーム</a><span>›</span><a href="javascript:history.back()">検索結果</a><span>›</span><strong>${detailDisplayTitle(x)}</strong></div>`}
      <section class="detail-doc-hero" id="toolHero">
        <div class="detail-doc-main">
          <div class="badges" id="toolHeroBadges"><span class="badge green">${x.category}</span><span class="badge">${x.group}</span><span class="badge gray">${x.level}</span><span class="badge gray">約${x.minutes||3}分</span></div>
          <h1 id="toolHeroTitle">${detailDisplayTitle(x)}</h1>
          <p class="detail-doc-lead" id="toolHeroLead">${tpl.lead}</p>
          ${isWeightUtility?`<div class="weight-product-stats" id="toolHeroStats" aria-label="製品情報"><div><strong>197</strong><span>材料データ</span></div><div><strong>7</strong><span>対応形状</span></div><div><strong>OFFLINE</strong><span>通信不要</span></div><div><strong>Ver.4.0 β</strong><span>Material & Calculation</span></div></div>`:''}
          <div class="detail-doc-actions">
            ${tpl.primaryCopy?`<button class="home-search-button copy" data-copy="${escapeHtml(tpl.primaryCopy)}">例をコピー</button>`:''}
            ${tpl.showSecondaryCopy===false?'':`<button class="ghost-button copy" data-copy="${escapeHtml(x.syntax||'')}">構文・手順をコピー</button>`}
            <button class="favorite detail-fav ${fav?'active':''}" data-id="${x.id}">${fav?'★ お気に入り済み':'☆ お気に入り'}</button>
          </div>
        </div>
        <aside class="detail-doc-meta">
          <div><span id="toolMetaLabel1">種類</span><strong id="toolMetaValue1">${tpl.label}</strong></div>
          <div><span id="toolMetaLabel2">対応</span><strong id="toolMetaValue2">${x.version||'Excel / Microsoft 365'}</strong></div>
          <div><span id="toolMetaLabel3">更新</span><strong id="toolMetaValue3">${x.updatedAt||x.createdAt||'-'}</strong></div>
        </aside>
      </section>
      <div class="detail-doc-grid">
        <main class="detail-doc-content">
          ${tpl.sections.map(renderDetailSection).join('')}
        </main>
        ${isWeightUtility?'':`<aside class="detail-doc-side">
          <div class="doc-side-card">
            <h3>目次</h3>
            ${tpl.sections.map(sec=>`<a href="#${sec.id}">${sec.title}</a>`).join('')}
          </div>
          <div class="doc-side-card soft">
            <h3>EPAの読み方</h3>
            <p>先に「普通の言葉」で理解してから、Excel用語・式・操作手順を確認します。</p>
          </div>
          <div class="doc-side-card">
            <h3>関連項目</h3>
            <div class="related-list side-related">${(x.related||[]).slice(0,6).map(r=>relatedChip(r)).join('')}</div>
          </div>
        </aside>`}
      </div>
    </div>`;
  $$('.copy').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();copyText(b.dataset.copy||'')}));
  $$('.favorite').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();toggleFav(b.dataset.id,b)}));
  $$('.visual-open').forEach(b=>b.addEventListener('click',()=>openVisualModal(b.closest('.visual-guide').innerHTML)));
  $$('.screenshot-zoom').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();openScreenshotModal(Number(b.dataset.step||0), b.dataset.guide || 'filter')}));
  $$('.trouble-category-card[data-target], .trouble-symptom-card[data-target]').forEach(card=>card.addEventListener('click',()=>{if(card.dataset.target)goDetail(card.dataset.target)}));
  $$('.trouble-back-hub').forEach(b=>b.addEventListener('click',()=>goDetail('TROUBLE_HUB')));
  $$('.trouble-back-category').forEach(b=>b.addEventListener('click',()=>goDetail(b.dataset.target||'TROUBLE_ERROR_SHOWN')));
  if(x.type==='utility-weight'){ initWeightCalculator(); initEmdDatabase(); }
}
function detailDisplayTitle(x){
  if((x.category==='関数' || x.type==='single-function') && !String(x.title||'').includes('関数')) return `${x.title} 関数`;
  return x.title || x.id || '詳細';
}
function getDetailTemplate(x){
  const type=x.type||'single-function';
  if(type==='utility-weight') return weightCalculatorTemplate(x);
  if(type==='compound-function') return compoundTemplate(x);
  if(type==='operation') return operationTemplate(x);
  if(type==='chart') return chartTemplate(x);
  if(type==='vba-series') return vbaIntroTemplate(x);
  if(type==='shortcut-collection') return shortcutCollectionTemplate(x);
  if(type==='trouble-hub') return troubleHubTemplate(x);
  if(type==='trouble-category') return troubleCategoryTemplate(x);
  if(type==='trouble-guide' && ['TROUBLE_VALUE','TROUBLE_NA','TROUBLE_REF','TROUBLE_DIV0','TROUBLE_NAME','TROUBLE_HASH'].includes(x.id)) return troubleErrorGoldenTemplate(x);
  if(type==='trouble-guide' && ['TROUBLE_CALC_NOT_UPDATE','TROUBLE_TOTAL_MISMATCH','TROUBLE_COPY_REFERENCE','TROUBLE_FILTER_NOT_WORK','TROUBLE_SORT_BROKEN','TROUBLE_AUTOFILL_WRONG','TROUBLE_CTRL_ARROW_STOPS'].includes(x.id)) return troubleNotWorkingGoldenTemplate(x);
  if(type==='trouble-guide') return troubleGuideTemplate(x);
  if(type==='formatting') return formattingTemplate(x);
  if(type==='template') return templateTemplate(x);
  if(type==='error') return errorTemplate(x);
  return functionTemplate(x);
}



// MW-001 Fix 006: material panels are mutually exclusive and calculation UI is frozen.
function weightCalculatorTemplate(x){
  return {
    label:'EPA Tools',
    lead:x.plain||x.summary,
    primaryCopy:'',
    showSecondaryCopy:false,
    sections:[
      {id:'calculator',title:'材料・重量計算',type:'plain',html:`
        <section id="weightToolView" class="tool-view active">
        <div class="material-calc-shell">
          <section class="material-search-panel" id="emdShell">
            <div class="material-panel-heading"><i class="panel-svg-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 7.2 12 3l8 4.2v9.6L12 21l-8-4.2V7.2Zm8 .4L7.1 10 12 12.5 16.9 10 12 7.6Zm-5.8 4.1v3.8l4.6 2.4v-3.8l-4.6-2.4Zm11.6 0-4.6 2.4v3.8l4.6-2.4v-3.8Z"/></svg></i><span>材料を選択</span><p>検索または一覧から選択できます。</p></div>
            <div class="material-source-tabs" role="tablist" aria-label="材料の選び方">
              <button type="button" class="material-source-tab active" data-material-source="search">材料を検索</button>
              <button type="button" class="material-source-tab" data-material-source="list">一覧から選ぶ</button>
            </div>
            <div id="materialSearchMode">
              <div class="emd-toolbar"><input id="emdSearch" type="search" placeholder="例：ITO、Al2O3、透明導電膜" aria-label="材料検索"><select id="emdCategory" aria-label="材料分類"><option value="">すべての分類</option></select></div>
              <div class="emd-list" id="emdList"></div>
              <article class="emd-detail compact" id="emdDetail"><p>材料を選択すると詳細を表示します。</p></article>
            </div>
            <div id="materialListMode" hidden>
              <div class="weight-list-tools">
                <div class="weight-list-search"><input id="weightListSearch" type="search" placeholder="材料名・記号・品番で検索（例：SUS、304、Al）" aria-label="一覧内を検索"><button type="button" id="weightListSearchClear" aria-label="検索をクリア">×</button></div>
                <p id="weightListSearchStatus" class="weight-list-search-status">一覧から材料を選択してください。</p>
              </div>
              <div class="weight-quick-sections" id="weightQuickSections">
                <section><div class="weight-quick-heading"><span>★ お気に入り</span></div><div class="weight-quick-list" id="weightFavorites"><span class="weight-quick-empty">まだ登録されていません</span></div></section>
                <section><div class="weight-quick-heading"><span>最近使用</span><button type="button" id="weightHistoryClear">履歴を消去</button></div><div class="weight-quick-list" id="weightHistory"><span class="weight-quick-empty">履歴はありません</span></div></section>
              </div>
              <div class="weight-material-tabs" role="tablist" aria-label="材料分類">
                <button type="button" class="weight-tab active" data-weight-tab="general">一般材料</button>
                <button type="button" class="weight-tab" data-weight-tab="chemical">元素・化合物</button>
                <button type="button" class="weight-tab" data-weight-tab="alloy">合金</button>
                <button type="button" class="weight-tab" data-weight-tab="special">特殊ルール</button>
              </div>
              <div id="weightSingleMaterial">
                <div class="weight-field-row" id="weightChemicalCategoryRow" hidden><label for="weightChemicalCategory">分類</label><select id="weightChemicalCategory"><option value="element">元素</option><option value="oxide">酸化物</option><option value="compound">化合物</option><option value="custom">任意密度</option></select></div><div class="weight-field-row" id="weightElementStateRow" hidden><label for="weightElementState">元素の状態</label><select id="weightElementState"><option value="">すべて</option><option value="solid">固体</option><option value="liquid">液体</option><option value="gas">気体</option><option value="unknown">密度未確定</option></select></div>
                <div class="weight-field-row" id="weightMaterialRow"><label for="weightMaterial">材質</label><select id="weightMaterial"></select></div>
              </div>
              <div id="weightAlloyPanel" class="weight-alloy-panel" hidden><div class="weight-alloy-head"><span>元素</span><span>重量比（%）</span><span></span></div><div id="weightAlloyRows"></div><button type="button" class="weight-alloy-add" id="weightAlloyAddBtn">＋ 成分を追加</button><div class="weight-alloy-status"><span>合計</span><b id="weightAlloyTotal">0.0%</b></div></div>
            </div>
          </section>
          <section class="weight-tool weight-v1" id="weightTool">
            <div class="material-panel-heading"><i class="panel-svg-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 5h16v5H4V5Zm2 2v1h2V7H6Zm4 0v1h2V7h-2Zm4 0v1h2V7h-2ZM4 13h7v7H4v-7Zm2 2v3h3v-3H6Zm8-2h6v2h-6v-2Zm0 4h6v2h-6v-2Z"/></svg></i><span>寸法・計算</span><p>材料と寸法がそろうと自動計算します。</p></div>
            <div class="weight-selected-material visible" id="weightSelectedMaterial"><span>選択中の材料</span><strong id="weightSelectedMaterialName">材料を選択してください</strong><button type="button" id="weightFavoriteToggle" class="weight-favorite-toggle" aria-label="お気に入りに追加" disabled>☆</button></div>
            <div class="weight-tool-grid integrated">
              <section class="weight-input-panel">
                <div class="weight-field-row"><label for="weightDensity">密度 <span>g/cm³</span></label><input id="weightDensity" type="number" min="0" step="any" value="" inputmode="decimal" readonly></div>
                <p class="weight-density-note" id="weightDensityNote">材料を選択してください。</p>
                <div class="weight-field-row"><label for="weightShape">形状</label><select id="weightShape"><option value="">選択してください</option><option value="disc">円盤・丸棒</option><option value="block">角材・板材</option><option value="ring">リング</option><option value="pipe">パイプ・円筒</option><option value="frustum">円錐台・テーパー</option><option value="steppedDisc">段付き円盤（2段）</option><option value="volume">体積を直接入力</option></select></div>
                <div class="weight-field-row" id="weightTaperModeRow" hidden><label for="weightTaperMode">テーパー入力</label><select id="weightTaperMode"><option value="diameters">上・下の直径で指定</option><option value="amount">片側テーパー量で指定</option></select></div>
                <div id="weightDimensions" class="weight-dimensions"></div>
                <p class="weight-unit-note" id="weightUnitNote">寸法はすべて mm で入力してください。</p>
              </section>
              <section class="weight-result-panel" aria-live="polite"><div class="result-card-title"><i aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 3h10l1 4h3v2h-2.2l1.7 10H3.5L5.2 9H3V7h3l1-4Zm1.6 4h6.8l-.5-2H9.1l-.5 2Zm-1.4 2-1.3 8h12.2l-1.3-8H7.2Zm4.8 1.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z"/></svg></i><span>計算結果</span></div><div class="weight-result-material"><span>材料</span><b id="weightResultMaterial">—</b></div><div class="weight-primary-result"><span>重量</span><strong id="weightResultGram">— g</strong><b id="weightResultKg">— kg</b></div><div class="weight-result-details"><div class="weight-volume"><span>体積</span><em id="weightResultVolume">— cm³</em></div><div class="weight-volume"><span>密度</span><em id="weightResultDensity">— g/cm³</em></div></div><button type="button" class="ghost-button" id="weightCopyBtn" disabled>結果をコピー</button><p id="weightMessage">材料・形状・寸法を入力してください。</p></section>
            </div>
          </section>
        </div>
        <p class="emd-version">単純形状による概算です。2段の同心円形状には対応します。3段以上の段差・穴・溝・接合材・バッキングプレート等は計算に含みません。</p>
        </section>`},
      {id:'excel',title:'Excel版をダウンロード',type:'plain',html:`<div class="weight-download-card"><div><span>Excel版 Ver.2.0</span><h3>EPA 材料・重量計算ツール</h3><p>Ver.5.0 Officialの全197材料、材料データベース、スパッタリング材料、テーパー・段付き円盤などの形状計算を収録しています。オフラインで使用できます。</p></div><a class="weight-download-button" href="downloads/EPA_Material_Weight_Tool_Ver2.0.xlsx" download>Excel版をダウンロード</a></div>`},
      {id:'notes',title:'使用上の注意',type:'plain',html:`<div class="weight-note-box"><ul><li>計算結果は、公称密度を使用した概算値です。</li><li>焼結体・多孔質体は、気孔率や添加剤により理論密度より低くなる場合があります。</li><li>合金密度は、体積加成を仮定した理論混合密度です。</li><li>重要用途では、材料証明書や実測値を確認してください。</li></ul></div>`},
      {id:'converter',title:'単位・分析値変換',type:'plain',html:`<section id="converterToolView" class="tool-view"></section>`}
    ]
  };
}

function formatDensityValue(value){
  if(value==null||value==='')return '未設定';
  const n=Number(value);
  if(!Number.isFinite(n))return '未設定';
  if(n<0.001)return n.toPrecision(4);
  if(n<0.01)return n.toFixed(6).replace(/0+$/,'').replace(/\.$/,'');
  if(n<1)return n.toFixed(4).replace(/0+$/,'').replace(/\.$/,'');
  return n.toFixed(2);
}
function stateLabel(code){return ({solid:'固体',liquid:'液体',gas:'気体',unknown:'密度未確定'})[code]||'—';}
function initEmdDatabase(){
  const shell=$('#emdShell'); if(!shell||!window.EMD_DATA)return;
  const list=$('#emdList'), detail=$('#emdDetail'), search=$('#emdSearch'), category=$('#emdCategory');
  const materials=window.EMD_DATA.materials||[];
  [...new Set(materials.map(m=>m.subcategory).filter(Boolean))].sort().forEach(c=>category.insertAdjacentHTML('beforeend',`<option value="${c}">${c}</option>`));
  const normalize=s=>String(s||'').toLowerCase().replace(/[₂₃₄₅₆₇₈₉₀]/g,ch=>'₂₃₄₅₆₇₈₉₀'.indexOf(ch)+2).replace(/[^a-z0-9一-龠ぁ-んァ-ヶ]/g,'');
  const selectMaterial=m=>{
    detail.innerHTML=`<div class="emd-detail-head"><div><span>${m.subcategory||m.category}</span><h3>${m.name}</h3><p>${m.english||''}</p></div><strong>${formatDensityValue(m.density)}${m.density==null?'':'<small> g/cm³</small>'}<em>${m.density_status||'代表値'}</em></strong></div>
      <dl class="emd-detail-grid">
        <div><dt>化学式・組成</dt><dd>${m.display_formula||m.formula||'—'}</dd></div>
        <div><dt>分類</dt><dd>${m.subcategory||m.category||'—'}</dd></div>${m.atomic_number?`<div><dt>原子番号</dt><dd>${m.atomic_number}</dd></div><div><dt>状態</dt><dd><span class="emd-state-badge ${m.state_code||'unknown'}">${stateLabel(m.state_code)}</span></dd></div><div><dt>密度条件</dt><dd>${m.density_condition||'—'}</dd></div>`:''}
        <div><dt>主な用途</dt><dd>${(m.uses||[]).join('、')||'—'}</dd></div>
        <div><dt>スパッタリング用途</dt><dd>${(m.sputtering_uses||[]).join('、')||'—'}</dd></div>
        <div><dt>特徴</dt><dd>${(m.characteristics||[]).join('、')||'—'}</dd></div>
        <div><dt>関連材料</dt><dd>${(m.related||[]).join('、')||'—'}</dd></div>
      </dl>
      <p class="emd-note"><strong>注意：</strong>${m.note||'密度は代表値です。'}</p>
      <p class="emd-source">参考：${m.source_name||'EPA標準密度マスター'} ／ 更新 ${m.updated||window.EMD_DATA.updated||'—'}</p>`;
    list.querySelectorAll('.emd-item').forEach(b=>b.classList.toggle('active',b.dataset.emdId===m.id));
    document.dispatchEvent(new CustomEvent('emd-material-selected',{detail:{material:m}}));
  };
  let selectedId='';
  const render=()=>{
    const q=normalize(search.value),c=category.value;
    const filtered=materials.filter(m=>(!c||m.subcategory===c)&&(!q||normalize([m.name,m.english,m.formula,m.display_formula,m.category,m.subcategory,m.state,m.state_code,m.atomic_number,...(m.aliases||[]),...(m.uses||[]),...(m.sputtering_uses||[]),...(m.characteristics||[])].join(' ')).includes(q)));
    list.innerHTML=filtered.length?filtered.map(m=>`<button type="button" class="emd-item ${selectedId===m.id?'active':''}" data-emd-id="${m.id}"><span>${m.subcategory}</span><strong>${m.name}</strong><em>${m.density==null?'密度未設定':formatDensityValue(m.density)+' g/cm³'}</em></button>`).join(''):'<p class="emd-empty">該当する材料がありません。</p>';
    list.querySelectorAll('[data-emd-id]').forEach(b=>b.addEventListener('click',()=>{const m=materials.find(x=>x.id===b.dataset.emdId);selectedId=m?.id||'';selectMaterial(m);}));
    const exact=filtered.find(m=>q&&[m.name,m.english,m.formula,m.display_formula].some(v=>normalize(v)===q));
    if(exact&&selectedId!==exact.id){selectedId=exact.id;selectMaterial(exact);}
    else if(filtered.length===1&&selectedId!==filtered[0].id){selectedId=filtered[0].id;selectMaterial(filtered[0]);}
  };
  search.addEventListener('input',render); category.addEventListener('change',render); render();
}

const WEIGHT_GENERAL=[
 {name:'SUS304',rho:7.93,note:'SUS304の代表密度です。'},
 {name:'SUS316',rho:7.98,note:'SUS316の代表密度です。'},
 {name:'SUS430',rho:7.70,note:'SUS430の代表密度です。'},
 {name:'SS400',rho:7.85,note:'一般構造用鋼の代表密度です。'},
 {name:'S45C',rho:7.85,note:'機械構造用炭素鋼の代表密度です。'},
 {name:'A1050',rho:2.71,note:'純アルミニウム系の代表密度です。'},
 {name:'A5052',rho:2.68,note:'A5052の代表密度です。'},
 {name:'A6061',rho:2.70,note:'A6061の代表密度です。'},
 {name:'C1100',rho:8.89,note:'タフピッチ銅の代表密度です。'},
 {name:'黄銅（代表値）',rho:8.50,note:'組成により密度は変動します。'},
 {name:'純チタン',rho:4.51,note:'純チタンの代表密度です。'},
 {name:'任意密度',rho:null,note:'材料証明書や実測密度を入力してください。'}
];
const WEIGHT_CHEMICAL_GROUPS={
  element:[
    {name:"H（水素）",rho:8.988e-05,note:"気体の標準状態付近の密度です。固体ターゲットの計算値としては使用しないでください。温度・圧力で大きく変化します。",state_code:"gas",atomic_number:1},
    {name:"He（ヘリウム）",rho:0.0001785,note:"気体の標準状態付近の密度です。固体ターゲットの計算値としては使用しないでください。温度・圧力で大きく変化します。",state_code:"gas",atomic_number:2},
    {name:"Li（リチウム）",rho:0.534,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:3},
    {name:"Be（ベリリウム）",rho:1.85,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:4},
    {name:"B（ホウ素）",rho:2.34,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:5},
    {name:"C（炭素）",rho:2.267,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:6},
    {name:"N（窒素）",rho:0.0012506,note:"気体の標準状態付近の密度です。固体ターゲットの計算値としては使用しないでください。温度・圧力で大きく変化します。",state_code:"gas",atomic_number:7},
    {name:"O（酸素）",rho:0.001429,note:"気体の標準状態付近の密度です。固体ターゲットの計算値としては使用しないでください。温度・圧力で大きく変化します。",state_code:"gas",atomic_number:8},
    {name:"F（フッ素）",rho:0.001696,note:"気体の標準状態付近の密度です。固体ターゲットの計算値としては使用しないでください。温度・圧力で大きく変化します。",state_code:"gas",atomic_number:9},
    {name:"Ne（ネオン）",rho:0.0008999,note:"気体の標準状態付近の密度です。固体ターゲットの計算値としては使用しないでください。温度・圧力で大きく変化します。",state_code:"gas",atomic_number:10},
    {name:"Na（ナトリウム）",rho:0.968,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:11},
    {name:"Mg（マグネシウム）",rho:1.738,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:12},
    {name:"Al（アルミニウム）",rho:2.7,note:"常温付近の元素密度です。純度・温度でわずかに変動します。",state_code:"solid",atomic_number:13},
    {name:"Si（ケイ素）",rho:2.329,note:"常温付近の元素密度です。純度・温度でわずかに変動します。",state_code:"solid",atomic_number:14},
    {name:"P（リン）",rho:1.823,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:15},
    {name:"S（硫黄）",rho:2.067,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:16},
    {name:"Cl（塩素）",rho:0.003214,note:"気体の標準状態付近の密度です。固体ターゲットの計算値としては使用しないでください。温度・圧力で大きく変化します。",state_code:"gas",atomic_number:17},
    {name:"Ar（アルゴン）",rho:0.001784,note:"気体の標準状態付近の密度です。固体ターゲットの計算値としては使用しないでください。温度・圧力で大きく変化します。",state_code:"gas",atomic_number:18},
    {name:"K（カリウム）",rho:0.862,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:19},
    {name:"Ca（カルシウム）",rho:1.55,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:20},
    {name:"Sc（スカンジウム）",rho:2.985,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:21},
    {name:"Ti（チタン）",rho:4.506,note:"常温付近の元素密度です。純度・温度でわずかに変動します。",state_code:"solid",atomic_number:22},
    {name:"V（バナジウム）",rho:6.11,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:23},
    {name:"Cr（クロム）",rho:7.19,note:"常温付近の元素密度です。純度・温度でわずかに変動します。",state_code:"solid",atomic_number:24},
    {name:"Mn（マンガン）",rho:7.21,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:25},
    {name:"Fe（鉄）",rho:7.874,note:"常温付近の元素密度です。純度・温度でわずかに変動します。",state_code:"solid",atomic_number:26},
    {name:"Co（コバルト）",rho:8.9,note:"常温付近の元素密度です。純度・温度でわずかに変動します。",state_code:"solid",atomic_number:27},
    {name:"Ni（ニッケル）",rho:8.908,note:"常温付近の元素密度です。純度・温度でわずかに変動します。",state_code:"solid",atomic_number:28},
    {name:"Cu（銅）",rho:8.96,note:"常温付近の元素密度です。純度・温度でわずかに変動します。",state_code:"solid",atomic_number:29},
    {name:"Zn（亜鉛）",rho:7.134,note:"常温付近の元素密度です。純度・温度でわずかに変動します。",state_code:"solid",atomic_number:30},
    {name:"Ga（ガリウム）",rho:5.91,note:"常温付近の元素密度です。純度・温度でわずかに変動します。",state_code:"solid",atomic_number:31},
    {name:"Ge（ゲルマニウム）",rho:5.323,note:"常温付近の元素密度です。純度・温度でわずかに変動します。",state_code:"solid",atomic_number:32},
    {name:"As（ヒ素）",rho:5.727,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:33},
    {name:"Se（セレン）",rho:4.81,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:34},
    {name:"Br（臭素）",rho:3.12,note:"液体状態（20℃付近）の代表密度です。温度で変化します。",state_code:"liquid",atomic_number:35},
    {name:"Kr（クリプトン）",rho:0.00375,note:"気体の標準状態付近の密度です。固体ターゲットの計算値としては使用しないでください。温度・圧力で大きく変化します。",state_code:"gas",atomic_number:36},
    {name:"Rb（ルビジウム）",rho:1.532,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:37},
    {name:"Sr（ストロンチウム）",rho:2.64,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:38},
    {name:"Y（イットリウム）",rho:4.472,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:39},
    {name:"Zr（ジルコニウム）",rho:6.52,note:"常温付近の元素密度です。純度・温度でわずかに変動します。",state_code:"solid",atomic_number:40},
    {name:"Nb（ニオブ）",rho:8.57,note:"常温付近の元素密度です。純度・温度でわずかに変動します。",state_code:"solid",atomic_number:41},
    {name:"Mo（モリブデン）",rho:10.28,note:"常温付近の元素密度です。純度・温度でわずかに変動します。",state_code:"solid",atomic_number:42},
    {name:"Tc（テクネチウム）",rho:11.5,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:43},
    {name:"Ru（ルテニウム）",rho:12.37,note:"常温付近の元素密度です。純度・温度でわずかに変動します。",state_code:"solid",atomic_number:44},
    {name:"Rh（ロジウム）",rho:12.41,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:45},
    {name:"Pd（パラジウム）",rho:12.02,note:"常温付近の元素密度です。純度・温度でわずかに変動します。",state_code:"solid",atomic_number:46},
    {name:"Ag（銀）",rho:10.49,note:"常温付近の元素密度です。純度・温度でわずかに変動します。",state_code:"solid",atomic_number:47},
    {name:"Cd（カドミウム）",rho:8.65,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:48},
    {name:"In（インジウム）",rho:7.31,note:"常温付近の元素密度です。純度・温度でわずかに変動します。",state_code:"solid",atomic_number:49},
    {name:"Sn（スズ）",rho:7.31,note:"常温付近の元素密度です。純度・温度でわずかに変動します。",state_code:"solid",atomic_number:50},
    {name:"Sb（アンチモン）",rho:6.697,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:51},
    {name:"Te（テルル）",rho:6.24,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:52},
    {name:"I（ヨウ素）",rho:4.93,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:53},
    {name:"Xe（キセノン）",rho:0.00589,note:"気体の標準状態付近の密度です。固体ターゲットの計算値としては使用しないでください。温度・圧力で大きく変化します。",state_code:"gas",atomic_number:54},
    {name:"Cs（セシウム）",rho:1.873,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:55},
    {name:"Ba（バリウム）",rho:3.594,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:56},
    {name:"La（ランタン）",rho:6.145,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:57},
    {name:"Ce（セリウム）",rho:6.77,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:58},
    {name:"Pr（プラセオジム）",rho:6.77,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:59},
    {name:"Nd（ネオジム）",rho:7.01,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:60},
    {name:"Pm（プロメチウム）",rho:7.26,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:61},
    {name:"Sm（サマリウム）",rho:7.52,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:62},
    {name:"Eu（ユウロピウム）",rho:5.244,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:63},
    {name:"Gd（ガドリニウム）",rho:7.9,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:64},
    {name:"Tb（テルビウム）",rho:8.23,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:65},
    {name:"Dy（ジスプロシウム）",rho:8.54,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:66},
    {name:"Ho（ホルミウム）",rho:8.79,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:67},
    {name:"Er（エルビウム）",rho:9.066,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:68},
    {name:"Tm（ツリウム）",rho:9.32,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:69},
    {name:"Yb（イッテルビウム）",rho:6.9,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:70},
    {name:"Lu（ルテチウム）",rho:9.84,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:71},
    {name:"Hf（ハフニウム）",rho:13.31,note:"常温付近の元素密度です。純度・温度でわずかに変動します。",state_code:"solid",atomic_number:72},
    {name:"Ta（タンタル）",rho:16.69,note:"常温付近の元素密度です。純度・温度でわずかに変動します。",state_code:"solid",atomic_number:73},
    {name:"W（タングステン）",rho:19.3,note:"常温付近の元素密度です。純度・温度でわずかに変動します。",state_code:"solid",atomic_number:74},
    {name:"Re（レニウム）",rho:21.02,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:75},
    {name:"Os（オスミウム）",rho:22.59,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:76},
    {name:"Ir（イリジウム）",rho:22.56,note:"常温付近の元素密度です。純度・温度でわずかに変動します。",state_code:"solid",atomic_number:77},
    {name:"Pt（白金）",rho:21.45,note:"常温付近の元素密度です。純度・温度でわずかに変動します。",state_code:"solid",atomic_number:78},
    {name:"Au（金）",rho:19.32,note:"常温付近の元素密度です。純度・温度でわずかに変動します。",state_code:"solid",atomic_number:79},
    {name:"Hg（水銀）",rho:13.534,note:"液体状態（20℃付近）の代表密度です。温度で変化します。",state_code:"liquid",atomic_number:80},
    {name:"Tl（タリウム）",rho:11.85,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:81},
    {name:"Pb（鉛）",rho:11.34,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:82},
    {name:"Bi（ビスマス）",rho:9.78,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:83},
    {name:"Po（ポロニウム）",rho:9.2,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:84},
    {name:"At（アスタチン）",rho:null,note:"実測密度が確定していない元素です。重量計算では材料仕様書などの密度を直接入力してください。",state_code:"unknown",atomic_number:85},
    {name:"Rn（ラドン）",rho:0.00973,note:"気体の標準状態付近の密度です。固体ターゲットの計算値としては使用しないでください。温度・圧力で大きく変化します。",state_code:"gas",atomic_number:86},
    {name:"Fr（フランシウム）",rho:null,note:"実測密度が確定していない元素です。重量計算では材料仕様書などの密度を直接入力してください。",state_code:"unknown",atomic_number:87},
    {name:"Ra（ラジウム）",rho:5.5,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:88},
    {name:"Ac（アクチニウム）",rho:10.07,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:89},
    {name:"Th（トリウム）",rho:11.72,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:90},
    {name:"Pa（プロトアクチニウム）",rho:15.37,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:91},
    {name:"U（ウラン）",rho:19.05,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:92},
    {name:"Np（ネプツニウム）",rho:20.45,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:93},
    {name:"Pu（プルトニウム）",rho:19.84,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:94},
    {name:"Am（アメリシウム）",rho:13.69,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:95},
    {name:"Cm（キュリウム）",rho:13.51,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:96},
    {name:"Bk（バークリウム）",rho:14.78,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:97},
    {name:"Cf（カリホルニウム）",rho:15.1,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:98},
    {name:"Es（アインスタイニウム）",rho:8.84,note:"常温付近の元素密度です。純度・結晶相・温度により変動します。",state_code:"solid",atomic_number:99},
    {name:"Fm（フェルミウム）",rho:null,note:"実測密度が確定していない元素です。重量計算では材料仕様書などの密度を直接入力してください。",state_code:"unknown",atomic_number:100},
    {name:"Md（メンデレビウム）",rho:null,note:"実測密度が確定していない元素です。重量計算では材料仕様書などの密度を直接入力してください。",state_code:"unknown",atomic_number:101},
    {name:"No（ノーベリウム）",rho:null,note:"実測密度が確定していない元素です。重量計算では材料仕様書などの密度を直接入力してください。",state_code:"unknown",atomic_number:102},
    {name:"Lr（ローレンシウム）",rho:null,note:"実測密度が確定していない元素です。重量計算では材料仕様書などの密度を直接入力してください。",state_code:"unknown",atomic_number:103},
    {name:"Rf（ラザホージウム）",rho:null,note:"実測密度が確定していない元素です。重量計算では材料仕様書などの密度を直接入力してください。",state_code:"unknown",atomic_number:104},
    {name:"Db（ドブニウム）",rho:null,note:"実測密度が確定していない元素です。重量計算では材料仕様書などの密度を直接入力してください。",state_code:"unknown",atomic_number:105},
    {name:"Sg（シーボーギウム）",rho:null,note:"実測密度が確定していない元素です。重量計算では材料仕様書などの密度を直接入力してください。",state_code:"unknown",atomic_number:106},
    {name:"Bh（ボーリウム）",rho:null,note:"実測密度が確定していない元素です。重量計算では材料仕様書などの密度を直接入力してください。",state_code:"unknown",atomic_number:107},
    {name:"Hs（ハッシウム）",rho:null,note:"実測密度が確定していない元素です。重量計算では材料仕様書などの密度を直接入力してください。",state_code:"unknown",atomic_number:108},
    {name:"Mt（マイトネリウム）",rho:null,note:"実測密度が確定していない元素です。重量計算では材料仕様書などの密度を直接入力してください。",state_code:"unknown",atomic_number:109},
    {name:"Ds（ダームスタチウム）",rho:null,note:"実測密度が確定していない元素です。重量計算では材料仕様書などの密度を直接入力してください。",state_code:"unknown",atomic_number:110},
    {name:"Rg（レントゲニウム）",rho:null,note:"実測密度が確定していない元素です。重量計算では材料仕様書などの密度を直接入力してください。",state_code:"unknown",atomic_number:111},
    {name:"Cn（コペルニシウム）",rho:null,note:"実測密度が確定していない元素です。重量計算では材料仕様書などの密度を直接入力してください。",state_code:"unknown",atomic_number:112},
    {name:"Nh（ニホニウム）",rho:null,note:"実測密度が確定していない元素です。重量計算では材料仕様書などの密度を直接入力してください。",state_code:"unknown",atomic_number:113},
    {name:"Fl（フレロビウム）",rho:null,note:"実測密度が確定していない元素です。重量計算では材料仕様書などの密度を直接入力してください。",state_code:"unknown",atomic_number:114},
    {name:"Mc（モスコビウム）",rho:null,note:"実測密度が確定していない元素です。重量計算では材料仕様書などの密度を直接入力してください。",state_code:"unknown",atomic_number:115},
    {name:"Lv（リバモリウム）",rho:null,note:"実測密度が確定していない元素です。重量計算では材料仕様書などの密度を直接入力してください。",state_code:"unknown",atomic_number:116},
    {name:"Ts（テネシン）",rho:null,note:"実測密度が確定していない元素です。重量計算では材料仕様書などの密度を直接入力してください。",state_code:"unknown",atomic_number:117},
    {name:"Og（オガネソン）",rho:null,note:"実測密度が確定していない元素です。重量計算では材料仕様書などの密度を直接入力してください。",state_code:"unknown",atomic_number:118}
  ],
  oxide:[
    {name:'Al₂O₃（α-アルミナ）',rho:3.99,note:'理論密度。焼結体は気孔率等で低下します。'},
    {name:'Al₂O₃（γ-アルミナ）',rho:3.40,note:'結晶相を区別した値です。'},
    {name:'SiO₂（石英）',rho:2.65,note:'非晶質シリカとは異なります。'},
    {name:'SiO₂（非晶質）',rho:2.20,note:'製法や空隙により変動します。'},
    {name:'TiO₂（ルチル）',rho:4.23,note:'結晶相を区別した代表値です。'},
    {name:'TiO₂（アナターゼ）',rho:3.90,note:'結晶相を区別した代表値です。'},
    {name:'MgO',rho:3.65,note:'理論値・製品状態で変動します。'},
    {name:'ZnO',rho:5.61,note:'理論値・製品状態で変動します。'}
  ],
  compound:[
    {name:'SiC',rho:3.22,note:'結晶型・気孔率で変動します。'},
    {name:'Si₃N₄',rho:3.44,note:'焼結体は添加剤・気孔率で変動します。'},
    {name:'AlN',rho:3.26,note:'焼結体は添加剤・気孔率で変動します。'},
    {name:'BN（六方晶）',rho:2.10,note:'結晶型により密度が大きく異なります。'},
    {name:'WC',rho:15.63,note:'超硬合金の密度とは異なります。'}
  ],
  custom:[{name:'任意密度',rho:null,note:'材料証明書や実測密度を入力してください。'}]
};
const WEIGHT_CHEMICAL=[...WEIGHT_CHEMICAL_GROUPS.element,...WEIGHT_CHEMICAL_GROUPS.oxide,...WEIGHT_CHEMICAL_GROUPS.compound,...WEIGHT_CHEMICAL_GROUPS.custom];
const WEIGHT_ELEMENTS=WEIGHT_CHEMICAL_GROUPS.element;
const WEIGHT_SPECIAL_RULES=[
  {name:'社内密度を直接入力',rho:null,note:'会社で定めた密度を入力してください。材料証明書・社内標準・実測値を優先します。',special:true}
];
const WEIGHT_SHAPES={
  disc:{fields:[['diameter','直径'],['length','厚さ・長さ']],defaults:['','']},
  block:{fields:[['width','幅'],['depth','奥行'],['height','厚さ・高さ']],defaults:['','','']},
  ring:{fields:[['outer','外径'],['inner','内径'],['length','厚さ・長さ']],defaults:['','','']},
  pipe:{fields:[['outer','外径'],['inner','内径'],['length','長さ']],defaults:['','','']},
  frustum:{fields:[['top','上側直径'],['bottom','下側直径'],['height','高さ・厚さ']],defaults:['','','']},
  steppedDisc:{fields:[['diameter1','1段目 直径'],['thickness1','1段目 厚さ'],['diameter2','2段目 直径'],['thickness2','2段目 厚さ']],defaults:['','','','']},
  volume:{fields:[['volumeCm3','体積']],defaults:[''],unit:'cm³'}
};
function initWeightCalculator(){
  const weightTool=$('#weightTool');
  const material=$('#weightMaterial'), density=$('#weightDensity'), shape=$('#weightShape'), dims=$('#weightDimensions');
  if(!material||!density||!shape||!dims)return;
  let currentTab='general',lastText='',alloyRows=[],selectedMaterialName='',activeMaterialRecord=null,listQuery='';
  const note=$('#weightDensityNote'), single=$('#weightSingleMaterial'), alloy=$('#weightAlloyPanel');
  const categoryRow=$('#weightChemicalCategoryRow'), category=$('#weightChemicalCategory'), elementStateRow=$('#weightElementStateRow'), elementState=$('#weightElementState'), materialRow=$('#weightMaterialRow');
  const alloyRowsBox=$('#weightAlloyRows'),alloyAddBtn=$('#weightAlloyAddBtn');
  const tabs=[...document.querySelectorAll('[data-weight-tab]')];
  const sourceTabs=[...document.querySelectorAll('[data-material-source]')];
  const searchMode=$('#materialSearchMode'),listMode=$('#materialListMode');
  const listSearch=$('#weightListSearch'),listSearchClear=$('#weightListSearchClear'),listSearchStatus=$('#weightListSearchStatus');
  const favoriteToggle=$('#weightFavoriteToggle'),favoritesBox=$('#weightFavorites'),historyBox=$('#weightHistory'),historyClear=$('#weightHistoryClear');
  const STORAGE_FAVORITES='epa-weight-favorites-v1',STORAGE_HISTORY='epa-weight-history-v1';
  const readStore=(key)=>{try{return JSON.parse(localStorage.getItem(key)||'[]')}catch(e){return []}};
  const writeStore=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch(e){}};
  const normalizeListSearch=v=>String(v||'').toLowerCase().replace(/[^a-z0-9一-龠ぁ-んァ-ヶ]/g,'');
  const switchSource=mode=>{sourceTabs.forEach(b=>b.classList.toggle('active',b.dataset.materialSource===mode));if(searchMode)searchMode.hidden=mode!=='search';if(listMode)listMode.hidden=mode!=='list';};
  sourceTabs.forEach(b=>b.addEventListener('click',()=>switchSource(b.dataset.materialSource)));
  const clearResults=(message='材質・形状・寸法を入力してください。')=>{
    $('#weightResultGram').textContent='— g';
    $('#weightResultKg').textContent='— kg';
    $('#weightResultVolume').textContent='— cm³';
    $('#weightResultDensity').textContent='— g/cm³';
    $('#weightResultMaterial').textContent=selectedMaterialName||'—';
    $('#weightMessage').textContent=message;
    $('#weightCopyBtn').disabled=true;
    lastText='';
  };
  const setOptions=(select,list,allowBlank=true)=>{
    select.innerHTML=(allowBlank?'<option value="">選択してください</option>':'')+list.map((m,i)=>`<option value="${i}">${m.name}${m.rho!=null?`（${formatDensityValue(m.rho)}）`:m.state_code==='unknown'?'（密度未確定）':''}</option>`).join('');
  };
  const currentSingleList=()=>{
    let list=currentTab==='chemical'?(WEIGHT_CHEMICAL_GROUPS[category.value]||[]):currentTab==='special'?WEIGHT_SPECIAL_RULES:WEIGHT_GENERAL;
    if(currentTab==='chemical'&&category.value==='element'&&elementState?.value)list=list.filter(m=>m.state_code===elementState.value);
    const q=normalizeListSearch(listQuery);
    if(q)list=list.filter(m=>normalizeListSearch([m.name,m.english,m.symbol,m.formula,m.note,...(m.aliases||[])].join(' ')).includes(q));
    return list;
  };
  const materialKey=r=>`${r?.name||''}|${r?.rho??''}`;
  const refreshQuickLists=()=>{
    const favorites=readStore(STORAGE_FAVORITES),history=readStore(STORAGE_HISTORY);
    const render=(box,items,empty)=>{if(!box)return;box.innerHTML=items.length?items.map((r,i)=>`<button type="button" class="weight-quick-item" data-quick-index="${i}"><strong>${r.name}</strong><span>${r.rho==null?'密度入力':formatDensityValue(r.rho)+' g/cm³'}</span></button>`).join(''):`<span class="weight-quick-empty">${empty}</span>`;};
    render(favoritesBox,favorites,'まだ登録されていません');render(historyBox,history,'履歴はありません');
    favoritesBox?.querySelectorAll('[data-quick-index]').forEach((b,i)=>b.addEventListener('click',()=>applyStoredMaterial(favorites[i])));
    historyBox?.querySelectorAll('[data-quick-index]').forEach((b,i)=>b.addEventListener('click',()=>applyStoredMaterial(history[i])));
    updateFavoriteButton();
  };
  const addHistory=r=>{if(!r?.name)return;let items=readStore(STORAGE_HISTORY).filter(x=>materialKey(x)!==materialKey(r));items.unshift(r);writeStore(STORAGE_HISTORY,items.slice(0,8));refreshQuickLists();};
  const updateFavoriteButton=()=>{if(!favoriteToggle)return;favoriteToggle.disabled=!activeMaterialRecord;const hit=activeMaterialRecord&&readStore(STORAGE_FAVORITES).some(x=>materialKey(x)===materialKey(activeMaterialRecord));favoriteToggle.textContent=hit?'★':'☆';favoriteToggle.classList.toggle('active',!!hit);favoriteToggle.setAttribute('aria-label',hit?'お気に入りから削除':'お気に入りに追加');};
  const setActiveRecord=r=>{
    activeMaterialRecord=r?{
      name:r.name,
      rho:r.rho===''?null:r.rho,
      note:r.note||'',
      state_code:r.state_code||'',
      source:r.source||currentTab,
      kind:r.kind||'',
      components:Array.isArray(r.components)?r.components.map(c=>({index:Number(c.index),ratio:Number(c.ratio)})):undefined
    }:null;
    updateFavoriteButton();
    if(activeMaterialRecord)addHistory(activeMaterialRecord);
  };
  function applyStoredMaterial(r){
    if(!r)return;
    if(r.source==='alloy'&&Array.isArray(r.components)&&r.components.length>=2){
      currentTab='alloy';
      tabs.forEach(b=>{const active=b.dataset.weightTab==='alloy';b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));});
      single.hidden=true;alloy.hidden=false;categoryRow.hidden=true;
      if(materialRow)materialRow.hidden=false;
      if(elementStateRow)elementStateRow.hidden=true;
      if(listSearch){listSearch.value='';listQuery='';listSearch.disabled=false;listSearch.placeholder='元素名・記号で検索（例：Fe、Ni、Cr）';}
      alloyRows=[];alloyRowsBox.innerHTML='';
      r.components.slice(0,5).forEach(c=>addAlloyRow(String(c.index),String(c.ratio)));
      while(alloyRows.length<2)addAlloyRow();
      updateAlloy();
      return;
    }
    selectedMaterialName=r.name;currentTab=r.source||'stored';density.value=r.rho==null?'':r.rho;density.readOnly=r.rho!=null;note.textContent=r.note||'保存された材料です。';note.className=`weight-density-note ${r.state_code||''}`;updateSelectedMaterialDisplay(r.name,r.rho);setActiveRecord(r);tabs.forEach(b=>b.classList.remove('active'));single.hidden=false;alloy.hidden=true;categoryRow.hidden=true;if(materialRow)materialRow.hidden=true;if(elementStateRow)elementStateRow.hidden=true;calculate();
  }
  const refreshListOptions=()=>{
    if(currentTab==='alloy')return;const isCustom=currentTab==='chemical'&&category.value==='custom';if(isCustom)return;const list=currentSingleList();setOptions(material,list,true);material.value='';density.value='';selectedMaterialName='';activeMaterialRecord=null;updateSelectedMaterialDisplay();updateFavoriteButton();if(listSearchStatus)listSearchStatus.textContent=listQuery?`${list.length}件見つかりました。`:`${list.length}件から選択できます。`;
  };
  const updateSelectedMaterialDisplay=(name='',rho='')=>{
    const box=$('#weightSelectedMaterial');
    const label=$('#weightSelectedMaterialName');
    if(box)box.hidden=false;
    if(label)label.textContent=name?(rho?`${name}（${formatDensityValue(rho)} g/cm³）`:name):'材料を選択してください';
  };
  const updateSingleDensity=()=>{
    const list=currentSingleList();
    const index=material.value===''?null:Number(material.value);
    const item=index==null?null:list[index];
    if(!item){
      selectedMaterialName='';activeMaterialRecord=null;updateFavoriteButton();density.readOnly=true;density.value='';
      note.textContent='材質を選択してください。';
      updateSelectedMaterialDisplay();clearResults();return;
    }
    selectedMaterialName=item.name;
    if(item.rho==null){density.readOnly=false;density.value='';}
    else{density.readOnly=true;density.value=item.rho;}
    const stateText=item.state_code?`【${stateLabel(item.state_code)}】`:'';
    note.textContent=`${stateText}${item.note||''}`;
    note.className=`weight-density-note ${item.state_code||''}`;
    updateSelectedMaterialDisplay(item.name,item.rho);
    setActiveRecord({name:item.name,rho:item.rho,note:item.note,state_code:item.state_code,source:currentTab});
    calculate();
  };
  const updateChemicalOptions=()=>{
    const isCustom=category.value==='custom';
    const isElement=category.value==='element';
    if(materialRow)materialRow.hidden=isCustom;
    if(elementStateRow)elementStateRow.hidden=!isElement;
    if(!isElement&&elementState)elementState.value='';
    selectedMaterialName='';density.value='';
    if(isCustom){
      material.innerHTML='';
      selectedMaterialName='任意密度';
      density.readOnly=false;
      note.textContent='材料証明書や実測値など、使用する密度を直接入力してください。';
      updateSelectedMaterialDisplay('任意密度');
      clearResults('密度・形状・寸法を入力してください。');
      return;
    }
    // 分類・元素状態で絞り込んだ実際の一覧を、そのままプルダウンへ反映する。
    // 表示一覧と currentSingleList() の参照先を一致させ、別元素の密度が残るのを防ぐ。
    refreshListOptions();
    material.value='';
    density.readOnly=true;
    density.value='';
    note.textContent='材質を選択してください。';
    note.className='weight-density-note';
    updateSelectedMaterialDisplay();
    clearResults();
  };
  const filteredAlloyElements=()=>{
    const q=normalizeListSearch(listQuery);
    if(!q)return WEIGHT_ELEMENTS;
    return WEIGHT_ELEMENTS.filter(m=>normalizeListSearch([m.name,m.english,m.symbol,m.formula,m.note,...(m.aliases||[])].join(' ')).includes(q));
  };
  const refreshAlloyElementOptions=()=>{
    const filtered=filteredAlloyElements();
    alloyRows.forEach(row=>{
      const previousIndex=row.material.value===''?null:Number(row.material.value);
      const previous=previousIndex==null?null:WEIGHT_ELEMENTS[previousIndex];
      // 検索中でも、各行ですでに確定した元素は候補から消さず固定表示する。
      const options=[...filtered];
      if(previous&&!options.includes(previous))options.unshift(previous);
      row.material.innerHTML='<option value="">選択してください</option>'+options.map(m=>{
        const originalIndex=WEIGHT_ELEMENTS.indexOf(m);
        return `<option value="${originalIndex}">${m.name}${m.rho!=null?`（${formatDensityValue(m.rho)}）`:''}</option>`;
      }).join('');
      if(previousIndex!=null)row.material.value=String(previousIndex);
    });
    if(listSearchStatus)listSearchStatus.textContent=listQuery?`${filtered.length}件の元素が見つかりました。選択済みの元素は保持されます。`:`${WEIGHT_ELEMENTS.length}元素から成分を選択できます。`;
  };
  const updateAlloy=()=>{
    let total=0,specificVolume=0,valid=true,used=0;
    alloyRows.forEach(row=>{
      const ratio=row.ratio.value===''?0:Number(row.ratio.value);
      const index=row.material.value===''?null:Number(row.material.value);
      const item=index==null?null:WEIGHT_ELEMENTS[index];
      if(ratio>0||index!=null)used++;
      total+=ratio;
      if(ratio>0&&item?.rho>0)specificVolume+=(ratio/100)/item.rho;
      else if(ratio>0||index!=null)valid=false;
    });
    $('#weightAlloyTotal').textContent=`${total.toFixed(1)}%`;
    const ok=used>=2&&Math.abs(total-100)<0.0001&&specificVolume>0&&valid;
    density.value=ok?(1/specificVolume).toFixed(3):'';
    density.readOnly=true;
    if(used===0)note.textContent='2成分以上を入力してください。';
    else if(used<2)note.textContent='2成分以上を入力してください。';
    else note.textContent=ok?'体積加成を仮定した理論混合密度です。':'材料を選択し、重量比の合計を100%にしてください。';
    if(alloyAddBtn)alloyAddBtn.hidden=alloyRows.length>=5;
    const components=alloyRows.map(row=>{
      const index=row.material.value===''?null:Number(row.material.value);
      const ratio=row.ratio.value===''?0:Number(row.ratio.value);
      return index==null?null:{index,ratio,item:WEIGHT_ELEMENTS[index]};
    }).filter(c=>c&&c.ratio>0&&c.item);
    const compositionLabel=components.map(c=>`${c.item.symbol||c.item.name} ${Number.isInteger(c.ratio)?c.ratio:c.ratio.toFixed(1)}%`).join(' / ');
    selectedMaterialName=ok?`合金（${compositionLabel}）`:'合金';
    updateSelectedMaterialDisplay(selectedMaterialName,ok?density.value:'');
    if(ok){
      setActiveRecord({
        name:selectedMaterialName,
        rho:Number(density.value),
        note:'体積加成を仮定した理論混合密度です。',
        source:'alloy',
        kind:'alloy',
        components:components.map(c=>({index:c.index,ratio:c.ratio}))
      });
      calculate();
    }else{
      activeMaterialRecord=null;
      updateFavoriteButton();
      clearResults('合金の材料と重量比を確認してください。');
    }
  };
  const addAlloyRow=(materialIndex='',ratio='')=>{
    if(alloyRows.length>=5)return;
    const row=document.createElement('div');
    row.className='weight-alloy-row';
    row.innerHTML=`<select aria-label="合金元素"></select><input type="number" min="0" max="100" step="0.1" inputmode="decimal" value="${ratio}" aria-label="重量比"><button type="button" class="weight-alloy-remove" aria-label="この成分を削除">−</button>`;
    const select=row.querySelector('select'),input=row.querySelector('input'),remove=row.querySelector('button');
    select.innerHTML='<option value="">選択してください</option>'+filteredAlloyElements().map(m=>{const originalIndex=WEIGHT_ELEMENTS.indexOf(m);return `<option value="${originalIndex}">${m.name}${m.rho!=null?`（${formatDensityValue(m.rho)}）`:''}</option>`;}).join('');
    select.value=materialIndex;
    select.addEventListener('change',()=>{
      updateAlloy();
      // 1成分を選択・確定したら検索をクリアし、次の成分を探しやすくする。
      if(select.value!==''&&listSearch){
        listSearch.value='';
        listQuery='';
        refreshAlloyElementOptions();
      }
    });
    input.addEventListener('input',updateAlloy);
    remove.addEventListener('click',()=>{
      if(alloyRows.length<=2){select.value='';input.value='';updateAlloy();return;}
      alloyRows=alloyRows.filter(x=>x.row!==row);row.remove();updateAlloy();
    });
    alloyRowsBox.appendChild(row);
    alloyRows.push({row,material:select,ratio:input});
  };
  const resetAlloy=()=>{
    alloyRows=[];alloyRowsBox.innerHTML='';
    addAlloyRow();addAlloyRow();
    updateAlloy();
  };
  const switchTab=tab=>{
    currentTab=tab;
    tabs.forEach(b=>{
      const active=b.dataset.weightTab===tab;
      b.classList.toggle('active',active);
      b.setAttribute('aria-selected',String(active));
    });
    const isAlloy=tab==='alloy',isChemical=tab==='chemical',isSpecial=tab==='special';
    single.hidden=isAlloy;
    alloy.hidden=!isAlloy;
    categoryRow.hidden=!isChemical;if(elementStateRow)elementStateRow.hidden=!isChemical||category?.value!=='element';
    if(materialRow)materialRow.hidden=false;
    if(listSearch){listSearch.disabled=false;listSearch.placeholder=isAlloy?'元素名・記号で検索（例：Fe、Ni、Cr）':'材料名・記号・品番で検索（例：SUS、304、Al）';}
    selectedMaterialName='';activeMaterialRecord=null;
    density.value='';density.readOnly=true;
    updateSelectedMaterialDisplay();updateFavoriteButton();
    if(isAlloy){
      refreshAlloyElementOptions();
      selectedMaterialName='合金';
      if(alloyRows.length<2)resetAlloy();else updateAlloy();
      return;
    }
    if(isChemical){
      category.value='element';
      updateChemicalOptions();
      return;
    }
    refreshListOptions();
    material.value='';
    note.textContent=isSpecial?'会社独自の密度・運用ルールを使用します。':'材質を選択してください。';
    clearResults();
  };
  const renderFields=(useDefaults=true)=>{
    const taperRow=$('#weightTaperModeRow'),taperMode=$('#weightTaperMode');
    if(taperRow)taperRow.hidden=shape.value!=='frustum';
    if(!shape.value){dims.innerHTML='';clearResults();return;}
    const unitNote=$('#weightUnitNote');
    if(unitNote)unitNote.textContent=shape.value==='volume'?'CADや図面等で確認した体積を cm³ で入力してください。':shape.value==='frustum'?'直径指定または片側テーパー量指定を選び、厚さまで入力してください。':shape.value==='steppedDisc'?'各段の直径と厚さを入力してください。例：φ290×3t ＋ φ320×6t':'寸法はすべて mm で入力してください。';
    let fields,unit='mm';
    if(shape.value==='frustum'&&taperMode?.value==='amount') fields=[['large','大径（大きい側）'],['taper','片側テーパー量'],['height','高さ・厚さ']];
    else fields=WEIGHT_SHAPES[shape.value].fields,unit=WEIGHT_SHAPES[shape.value].unit||'mm';
    dims.innerHTML=fields.map(f=>`<div class="weight-field-row"><label for="weight_${f[0]}">${f[1]} <span>${unit}</span></label><input id="weight_${f[0]}" data-key="${f[0]}" type="number" min="0" step="0.1" value="" inputmode="decimal"></div>`).join('');
    dims.querySelectorAll('input').forEach(el=>el.addEventListener('input',calculate));
    calculate();
  };
  const val=key=>Number(dims.querySelector(`[data-key="${key}"]`)?.value||0);
  function calculate(){
    const rho=Number(density.value),kind=shape.value;let mm3=0,error='';
    if(!kind)error='形状を選択してください。';
    if(!error&&!(rho>0))error=currentTab==='alloy'?'合金の材料と重量比を確認してください。':'密度は0より大きい値を入力してください。';
    if(!error&&kind==='disc')mm3=Math.PI*Math.pow(val('diameter')/2,2)*val('length');
    if(!error&&kind==='block')mm3=val('width')*val('depth')*val('height');
    if(!error&&kind==='steppedDisc')mm3=Math.PI*Math.pow(val('diameter1')/2,2)*val('thickness1')+Math.PI*Math.pow(val('diameter2')/2,2)*val('thickness2');
    if(!error&&(kind==='ring'||kind==='pipe')){if(val('inner')>=val('outer'))error='内径は外径より小さくしてください。';else mm3=Math.PI*(Math.pow(val('outer')/2,2)-Math.pow(val('inner')/2,2))*val('length');}
    if(!error&&kind==='frustum'){
      const mode=$('#weightTaperMode')?.value||'diameters';let top,bottom;
      if(mode==='amount'){top=val('large');bottom=top-2*val('taper');if(!(bottom>0))error='片側テーパー量が大きすぎます。';}
      else{top=val('top');bottom=val('bottom');}
      if(!error)mm3=Math.PI*val('height')/12*(top*top+top*bottom+bottom*bottom);
    }
    if(!error&&kind==='volume')mm3=val('volumeCm3')*1000;
    if(!error&&(!(mm3>0)||!Number.isFinite(mm3)))error=kind==='volume'?'体積に0より大きい値を入力してください。':'すべての寸法に0より大きい値を入力してください。';
    const copy=$('#weightCopyBtn');
    if(error){clearResults(error);return;}
    const cm3=mm3/1000,gram=cm3*rho,kg=gram/1000,fmt=(n,d)=>n.toLocaleString('ja-JP',{minimumFractionDigits:d,maximumFractionDigits:d});
    $('#weightResultMaterial').textContent=selectedMaterialName||'—';$('#weightResultGram').textContent=`${fmt(gram,1)} g`;$('#weightResultKg').textContent=`${fmt(kg,3)} kg`;$('#weightResultVolume').textContent=`${fmt(cm3,1)} cm³`;$('#weightResultDensity').textContent=`${formatDensityValue(rho)} g/cm³`;const gasWarn=note.classList.contains('gas');const liquidWarn=note.classList.contains('liquid');$('#weightMessage').textContent=currentTab==='alloy'?'理論混合密度による概算値です。':gasWarn?'気体の代表密度による概算です。温度・圧力で大きく変化します。':liquidWarn?'液体状態の代表密度による概算です。':'公称密度による概算値です。';
    lastText=`材料：${selectedMaterialName||'未指定'}\n重量：${fmt(gram,1)} g（${fmt(kg,3)} kg）\n体積：${fmt(cm3,1)} cm³\n密度：${formatDensityValue(rho)} g/cm³`;copy.disabled=false;
  }
  const resetCurrent=()=>{
    if(currentTab==='alloy')resetAlloy();
    else{
      if(currentTab==='chemical'){category.value='element';updateChemicalOptions();}
      else{setOptions(material,WEIGHT_GENERAL,true);material.value='';density.value='';density.readOnly=true;note.textContent='材質を選択してください。';}
    }
    shape.value='';dims.innerHTML='';clearResults();
  };
  listSearch?.addEventListener('input',()=>{listQuery=listSearch.value;if(currentTab==='alloy')refreshAlloyElementOptions();else refreshListOptions();});
  listSearchClear?.addEventListener('click',()=>{if(listSearch){listSearch.value='';listQuery='';listSearch.focus();if(currentTab==='alloy')refreshAlloyElementOptions();else refreshListOptions();}});
  favoriteToggle?.addEventListener('click',()=>{if(!activeMaterialRecord)return;let items=readStore(STORAGE_FAVORITES);const key=materialKey(activeMaterialRecord),exists=items.some(x=>materialKey(x)===key);items=exists?items.filter(x=>materialKey(x)!==key):[activeMaterialRecord,...items].slice(0,12);writeStore(STORAGE_FAVORITES,items);refreshQuickLists();});
  historyClear?.addEventListener('click',()=>{writeStore(STORAGE_HISTORY,[]);refreshQuickLists();});
  tabs.forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.weightTab)));
  category?.addEventListener('change',updateChemicalOptions);elementState?.addEventListener('change',updateChemicalOptions);
  material.addEventListener('change',updateSingleDensity);density.addEventListener('input',()=>{if((currentTab==='chemical'&&category?.value==='custom')||currentTab==='special'){selectedMaterialName=currentTab==='special'?'特殊ルール（社内密度）':'任意密度';updateSelectedMaterialDisplay(selectedMaterialName,density.value);setActiveRecord({name:selectedMaterialName,rho:density.value?Number(density.value):null,note:note.textContent,source:currentTab});}calculate();});shape.addEventListener('change',()=>renderFields(false));$('#weightTaperMode')?.addEventListener('change',()=>renderFields(false));
  alloyAddBtn?.addEventListener('click',()=>{addAlloyRow();updateAlloy();});
  document.addEventListener('emd-material-selected',event=>{
    const m=event.detail?.material;if(!m)return;
    selectedMaterialName=m.name;
    currentTab='emd';
    density.readOnly=m.density!=null;density.value=m.density==null?'':m.density;
    note.textContent=`${m.name}｜${m.state_code?`【${stateLabel(m.state_code)}】`:''}${m.note||'代表密度です。'}`;note.className=`weight-density-note ${m.state_code||''}`;
    updateSelectedMaterialDisplay(m.name,m.density==null?'':m.density);
    setActiveRecord({name:m.name,rho:m.density,note:m.note,state_code:m.state_code,source:'emd'});
    tabs.forEach(b=>b.classList.remove('active'));
    single.hidden=true;alloy.hidden=true;categoryRow.hidden=true;
    if(!shape.value){shape.value='disc';renderFields(false);}else calculate();

  });
  $('#weightCopyBtn').addEventListener('click',()=>{if(lastText)copyText(lastText)});
  resetAlloy();renderFields(false);switchTab('general');refreshQuickLists();switchSource('search');
  const requestedMaterialId=new URLSearchParams(location.search).get('material');
  if(requestedMaterialId&&window.EMD_DATA?.materials){
    const requested=window.EMD_DATA.materials.find(x=>x.id===requestedMaterialId);
    if(requested)setTimeout(()=>document.dispatchEvent(new CustomEvent('emd-material-selected',{detail:{material:requested}})),0);
  }
}

function troubleHubTemplate(x){
  const categories=x.troubleCategories||[];
  return {
    label:'トラブル解決',
    lead:x.plain||x.summary||'今の状態に近いものを選んで、解決方法を探します。',
    primaryCopy:'',
    showSecondaryCopy:false,
    sections:[
      {id:'start',title:'今の状態に近いものを選んでください',type:'plain',html:`<div class="trouble-category-grid">${categories.map((c,i)=>`<button type="button" class="trouble-category-card" data-target="${c.target||''}" aria-label="${c.title}の症状を見る"><div class="trouble-category-icon">${c.icon}</div><div class="trouble-category-body"><span class="trouble-category-index">${String(i+1).padStart(2,'0')}</span><h3>${c.title}</h3><p>${c.description}</p><div class="trouble-card-example"><b>例えば</b><span>${(c.examples||[]).join('／')}</span></div><div class="trouble-card-action">この症状を見る <b>→</b></div></div></button>`).join('')}</div>`}
    ]
  };
}

function troubleCategoryTemplate(x){
  if(x.id==='TROUBLE_ERROR_SHOWN') return troubleErrorListTemplate(x);
  const groups=x.symptomGroups||[];
  return {label:'トラブル解決',lead:x.plain||x.summary,primaryCopy:'',showSecondaryCopy:false,sections:[
    {id:'choose',title:'今の症状に近いものを選びます',type:'plain',html:`<button type="button" class="trouble-back-hub trouble-back-primary"><span aria-hidden="true">←</span><span>トラブル解決の最初の画面へ戻る</span></button><div class="trouble-symptom-list">${groups.map((g,i)=>`<article class="trouble-symptom-card${g.target?' is-clickable':''}" ${g.target?`data-target="${g.target}" tabindex="0" role="button"`:''}><div class="trouble-symptom-number">${String(i+1).padStart(2,'0')}</div><div><h3>${g.title}</h3><p>${g.description}</p><div class="trouble-check-label">まず確認すること</div><ul>${(g.checks||[]).map(v=>`<li>${v}</li>`).join('')}</ul>${g.note?`<div class="trouble-field-note"><strong>実務で多い原因</strong><span>${g.note}</span></div>`:''}${g.target?`<div class="trouble-card-action">原因と直し方を見る <b>→</b></div>`:''}</div></article>`).join('')}</div>`},
    {id:'safe',title:'作業する前に',type:'plain',html:`<div class="trouble-safe-box"><strong>大切なファイルは、先に別名で保存してください</strong><p>原因が分からないまま数式やデータを変更すると、元に戻せなくなることがあります。「名前を付けて保存」で複製してから確認します。</p></div>`},
    {id:'next',title:'解決できないときの確認順',type:'plain',html:`<div class="trouble-first-check"><ol><li><span>1</span><div><strong>直前の操作を確認</strong><p>コピー、削除、貼り付け、ファイル移動など、症状が出る直前の操作を思い出します。</p></div></li><li><span>2</span><div><strong>1つのセルや1つの設定に絞る</strong><p>表全体を一度に直さず、問題が起きている場所を1つだけ確認します。</p></div></li><li><span>3</span><div><strong>画面の文字をそのまま控える</strong><p>エラー文字、警告文、ファイル名を控えておくと、原因を絞り込みやすくなります。</p></div></li></ol></div><div class="trouble-bottom-nav"><button type="button" class="trouble-back-hub trouble-back-primary"><span aria-hidden="true">←</span><span>トラブル解決の最初の画面へ戻る</span></button></div>`}
  ]}
}

function troubleErrorListTemplate(x){
  const groups=x.symptomGroups||[];
  const meanings={
    'TROUBLE_VALUE':'計算に使えない文字や値があります',
    'TROUBLE_NA':'探しているデータが見つかりません',
    'TROUBLE_REF':'計算に使っていたセルがなくなっています',
    'TROUBLE_DIV0':'0または空欄で割ろうとしています',
    'TROUBLE_NAME':'数式の名前や文字を認識できません',
    'TROUBLE_HASH':'列の幅が足りず、値を表示できません'
  };
  const examples={
    'TROUBLE_VALUE':'例：数字の中に文字や空白が混ざっている',
    'TROUBLE_NA':'例：VLOOKUPで品番が見つからない',
    'TROUBLE_REF':'例：数式で使っていた列やシートを削除した',
    'TROUBLE_DIV0':'例：未入力のセルや0で割り算している',
    'TROUBLE_NAME':'例：関数名の入力ミスや記号の違いがある',
    'TROUBLE_HASH':'例：日付や大きな数字が列に収まらない'
  };
  const codeOf=g=>(g.title||'').replace(' と表示される','').trim();
  return {label:'トラブル解決',lead:'画面に表示されている文字と同じものを選んでください。',primaryCopy:'',showSecondaryCopy:false,sections:[
    {id:'choose',title:'画面と同じ文字を選んでください',type:'plain',html:`<button type="button" class="trouble-back-hub trouble-back-primary"><span aria-hidden="true">←</span><span>トラブル解決の最初の画面へ戻る</span></button><div class="trouble-error-list">${groups.map(g=>`<article class="trouble-error-card is-clickable trouble-symptom-card" data-target="${g.target||''}" tabindex="0" role="button" aria-label="${codeOf(g)}の解決方法を見る"><div class="trouble-error-code">${codeOf(g)}</div><div class="trouble-error-body"><h3>${meanings[g.target]||g.description}</h3><p>${examples[g.target]||g.description}</p><div class="trouble-card-action">この症状を見る <b>→</b></div></div></article>`).join('')}</div><div class="trouble-error-help"><strong>表示されている文字が見つからない場合</strong><p>エラー文字をそのまま控え、トラブル解決の最初の画面から近い症状を選びます。</p></div>`},
    {id:'safe',title:'変更する前に',type:'plain',html:`<div class="trouble-safe-box"><strong>大切なファイルは、先に別名で保存します</strong><p>元の状態を残しておくと、操作を間違えた場合でも戻せます。</p></div><div class="trouble-bottom-nav"><button type="button" class="trouble-back-hub trouble-back-primary"><span aria-hidden="true">←</span><span>トラブル解決の最初の画面へ戻る</span></button></div>`}
  ]};
}

function shortcutCollectionTemplate(x){
  const all=(x.shortcutGroups||[]).flatMap(g=>g.items||[]);
  return {label:'ショートカット集',lead:x.plain||x.summary,primaryCopy:'',showSecondaryCopy:false,sections:[
    {id:'overview',title:'このページについて',type:'plain',html:`<div class="shortcut-intro"><p>${x.summary}</p><div class="shortcut-count"><strong>${all.length}</strong><span>個のショートカットを収録</span></div></div>`},
    {id:'quick',title:'ショートカット早見表',type:'shortcutTable',groups:x.shortcutGroups||[]},
    {id:'remember',title:'覚え方のコツ',type:'plain',html:shortcutLearningTips(x)},
    {id:'notes',title:'使う前に確認すること',type:'plain',html:shortcutNotes(x)},
    {id:'related',title:'関連するショートカット集',type:'related',items:x.related||[]}
  ]}
}
function shortcutLearningTips(x){
  const first=(x.shortcutGroups?.[0]?.items||[]).slice(0,3).map(v=>`<span><kbd>${v[0]}</kbd>${v[1]}</span>`).join('');
  return `<div class="learning-box tips-box"><div class="learning-head"><span>💡</span><strong>最初から全部覚えなくて大丈夫です</strong></div><p>まずは、毎日の作業で使う3つから試しましょう。</p><div class="shortcut-starter">${first}</div><p>同じ操作をマウスで行う直前に、ショートカットを1回使うだけでも定着しやすくなります。</p></div>`
}
function shortcutNotes(x){
  return `<div class="shortcut-note-grid"><article><strong>Windows版を基準にしています</strong><p>Mac版Excelでは、CtrlではなくCommandを使うなどキーが異なる場合があります。</p></article><article><strong>Excelの状態で動作が変わる場合があります</strong><p>セル編集中、数式編集中、フィルター中など、同じキーでも動作が変わることがあります。</p></article><article><strong>Altキー操作は順番に押します</strong><p>「Alt → H → O → I」は同時押しではなく、Altから順番に押します。</p></article><article><strong>環境差に注意します</strong><p>キーボード設定やWindowsのショートカットと競合し、一部が使えない場合があります。</p></article></div>`
}

function functionTemplate(x){
  const guide=getBeginnerGuide(x);
  return {label:'関数詳細',lead:(guide.short || x.plain || x.summary || '').trim(),primaryCopy:guide.copyExamples?.[0]?.formula||x.copyExamples?.[0]||x.syntax,sections:[
    {id:'plain',title:'一言でいうと',type:'plain',html:`<p>${guide.short || x.plain || x.summary || ''}</p>`},
    {id:'use',title:'こんな時に使います',type:'cards',items:guide.when||detailCanDo(x)},
    {id:'copy',title:'まずはこの式をコピーしてください',type:'copyExamples',items:guide.copyExamples||[]},
    {id:'replace',title:'コピーしたら、ここだけ変えます',type:'replace',items:(guide.copyExamples?.[0]?.replace||[])},
    {id:'visual',title:'図で見る',type:'visual',html:functionVisual(x,guide)},
    {id:'sample',title:'この画面と同じExcelを開く',type:'sample',html:sampleExcelBlock(x,guide)},
    {id:'tips',title:'Tips',type:'tips',item:getTips(x)},
    {id:'practical',title:'実務のポイント',type:'practical',item:getPracticalPoint(x)},
    {id:'mistakes',title:'よくあるミス',type:'mistakes',items:getFriendlyMistakes(x)},
    {id:'ai-check',title:'AIで作った式を使う前に',type:'aiCheck',html:aiCheckBlock(x)},
    {id:'terms',title:'Excelではこう呼びます',type:'terms',items:x.terms||[]},
    {id:'related',title:'関連する項目',type:'related',items:x.related||[]}
  ]}
}

function compoundTemplate(x){
  const ex=x.copyExamples?.[0]||x.examples?.[0]||x.syntax;
  return {label:'複合関数',lead:`${x.plain||x.summary} 複数の関数を役割ごとに分けて理解します。`,primaryCopy:ex,sections:[
    {id:'goal',title:'何を実現する組み合わせ？',type:'plain',html:`<p>${x.plain||x.summary}</p>`},
    {id:'roles',title:'使う関数の役割分担',type:'roleList',items:compoundRoles(x)},
    {id:'copy',title:'完成式をコピー',type:'copyExamples',items:(x.copyExamples||[ex]).map(v=>({formula:v,note:'セル番地・条件・表示文字を自分の表に合わせて変更します。',replace:['条件セル','判定条件','表示する文字']}))},
    {id:'breakdown',title:'分解して理解',type:'terms',items:x.terms||[]},
    {id:'visual',title:'式の流れ',type:'visual',html:compoundVisual(x)},
    {id:'mistakes',title:'よくあるミス',type:'mistakes',items:getFriendlyMistakes(x)},
    {id:'related',title:'関連パターン',type:'related',items:x.related||[]}
  ]}
}
function operationTemplate(x){
  if(x.id==='FILTER_OPERATION') return filterOperationTemplate(x);
  if(x.id==='SORT_OPERATION') return sortOperationTemplate(x);
  if(x.id==='PIVOT') return pivotBasicTemplate(x);
  return {label:'基本操作',lead:`${x.plain||x.summary} 画面上でどこをクリックするかを順番に確認します。`,primaryCopy:x.copyExamples?.[0]||x.syntax,sections:[
    {id:'goal',title:'このページでできるようになること',type:'plain',html:operationGoalBlock(x)},
    {id:'use',title:'こんな時に使います',type:'cards',items:detailCanDo(x)},
    {id:'visual',title:'完成イメージ',type:'visual',html:operationVisual(x)},
    {id:'steps',title:'やってみましょう',type:'steps',items:operationSteps(x)},
    {id:'tips',title:'Tips',type:'plain',html:operationTipsBlock(x)},
    {id:'practical',title:'実務のポイント',type:'plain',html:operationPracticalBlock(x)},
    {id:'mistakes',title:'よくあるミス',type:'mistakes',items:getFriendlyMistakes(x)},
    {id:'related',title:'次に覚えるなら',type:'related',items:x.related||[]}
  ]}
}


function sortOperationTemplate(x){
  return {label:'基本操作',lead:'品番・日付・売上などを、見たい順番に並べます。',primaryCopy:x.syntax,sections:[
    {id:'use',title:'こんな時に使います',type:'cards',items:['品番順に整理したい','日付の古い順・新しい順に並べたい','売上の高い順に確認したい']},
    {id:'visual',title:'完成するとこうなります',type:'visual',html:sortCompleteVisual()},
    {id:'click-guide',title:'実際のExcel画面で見る',type:'visual',html:sortClickGuide()},
    {id:'sample',title:'この画面と同じExcelを開く',type:'sample',html:operationSampleBlock('SORT_operation_sample.xlsx','並べ替え練習用サンプル')},
    {id:'tips',title:'Tips',type:'plain',html:sortTipsBlock()},
    {id:'mistakes',title:'ここだけ注意',type:'mistakes',items:[{title:'1列だけを動かさない',text:'品番だけを並べ替えると、担当者や売上との組み合わせが崩れます。表全体が一緒に動いていればOKです。'},{title:'順番がおかしい時は形式を確認',text:'数字や日付が文字として入っていると、思った順番にならないことがあります。'}]},
    {id:'related',title:'次に覚えるなら',type:'related',items:['フィルター','テーブル','条件付き書式']}
  ]}
}

function pivotBasicTemplate(x){
  return {label:'ピボットテーブル',lead:'一覧表をもとに、担当者別・商品別などの集計表を簡単に作れます。今回は担当者別の売上合計を作ります。',primaryCopy:'',showSecondaryCopy:false,sections:[
    {id:'use',title:'こんな時に使います',type:'cards',items:['担当者別の売上を集計したい','商品別の売上を確認したい','月ごとの件数をまとめたい','数式を書かずに集計したい']},
    {id:'visual',title:'完成するとこうなります',type:'visual',html:pivotCompleteVisual()},
    {id:'click-guide',title:'実際のExcel画面で見る',type:'visual',html:pivotClickGuide()},
    {id:'sample',title:'この画面と同じExcelを開く',type:'sample',html:operationSampleBlock('PIVOT_basic_sample.xlsx','ピボットテーブル 練習用サンプル')},
    {id:'tips',title:'Tips',type:'plain',html:pivotTipsBlock()},
    {id:'practical',title:'実務のポイント',type:'plain',html:pivotPracticalBlock()},
    {id:'mistakes',title:'ここだけ注意',type:'mistakes',items:[{title:'元データの途中に空白行を入れない',text:'途中に空白行や空白列があると、Excelがデータ範囲を正しく認識できないことがあります。'},{title:'元データを変更したら更新する',text:'元データを追加・修正した後は、ピボットテーブルを右クリックして「更新」します。'}]},
    {id:'related',title:'次に覚えるなら',type:'related',items:['ピボットグラフ','スライサー','フィルター','並べ替え']}
  ]}
}
function pivotCompleteVisual(){return `<div class="cf-complete-card"><div class="cf-complete-head"><strong>担当者別の売上合計</strong><span>数式を使わずに自動で集計します。</span></div><div class="cf-demo-table pivot-demo-table"><div class="head">担当者</div><div class="head">売上（円）合計</div><div>佐藤</div><div>249,000</div><div>山田</div><div>334,000</div><div>田中</div><div>330,000</div><div>鈴木</div><div>229,000</div><div class="head">総計</div><div class="head">1,142,000</div></div></div>`}
const pivotScreenshotSteps=[
  {title:'1. データ内のセルをクリック',caption:'一覧表の中なら、どのセルでも大丈夫です。表全体を選択する必要はありません。',src:'assets/screenshots/excel365/pivot/basic/annotated/step1_select_cell.png'},
  {title:'2. 挿入 → ピボットテーブル',caption:'「挿入」タブを開き、左側の「ピボットテーブル」をクリックします。「おすすめピボットテーブル」から始めることもできます。',src:'assets/screenshots/excel365/pivot/basic/annotated/step2_open_pivot.png'},
  {title:'3. OKをクリック',caption:'表示された画面はそのままで、「OK」をクリックします。',src:'assets/screenshots/excel365/pivot/basic/annotated/step3_create_dialog.png'},
  {title:'4. 担当者と売上にチェック',caption:'「担当者」と「売上（円）」にチェックを入れるだけで、自動で「行」と「値」に配置されます。必要に応じて、ドラッグして自由に配置を変更できます。',src:'assets/screenshots/excel365/pivot/basic/annotated/step4_set_fields.png'},
  {title:'5. 担当者別売上が完成',caption:'担当者ごとの売上合計が表示されれば完成です。',src:'assets/screenshots/excel365/pivot/basic/annotated/step5_complete.png'}
];
function pivotClickGuide(){return `<div class="screenshot-step-list" aria-label="実際のExcel画面でピボットテーブルを確認する">${pivotScreenshotSteps.map((step,i)=>`<article class="screenshot-step-card"><div class="screenshot-step-head"><span>${i+1}</span><div><strong>${step.title.replace(/^\d+\.\s*/,'')}</strong><p>${step.caption}</p></div></div><div class="screenshot-frame"><img src="${step.src}" alt="${step.title}"><button class="screenshot-zoom" data-guide="pivot-basic" data-step="${i}">拡大</button></div>${i===3?`<div class="pivot-field-help"><strong>フィールドが表示されない場合</strong><p>ピボットテーブル内をクリックします。それでも表示されない場合は、［ピボットテーブル分析］→［フィールドリスト］をクリックしてください。</p></div>`:''}</article>`).join('')}</div>`}
function pivotTipsBlock(){return `<div class="learning-box tips-box"><div class="learning-head"><span>💡</span><strong>Tips</strong></div><p>ピボットテーブルは、数式を書かなくても自動で合計や件数を集計できます。</p><p>最初は「項目にチェックを入れるだけ」で十分です。</p></div>`}
function pivotPracticalBlock(){return `<div class="learning-box practical-box"><div class="learning-head"><span>💼</span><strong>実務のポイント</strong></div><p>売上、件数、不良数、工数など、一覧データを担当者別・商品別・月別にまとめる時に便利です。</p><p>基本ページでは新規ワークシートに作成します。既存シートの指定場所へ作る方法は応用編で扱います。</p></div>`}

function filterOperationTemplate(x){
  return {label:'基本操作',lead:'必要なデータだけを表示できます。データは消えず、見えていない行を一時的に隠す操作です。',primaryCopy:x.syntax,sections:[
    {id:'goal',title:'このページでできるようになること',type:'plain',html:filterGoalBlock()},
    {id:'use',title:'こんな時に使います',type:'cards',items:['NGだけ確認したい','未対応だけ表示したい','担当者ごとに絞り込みたい','今月分だけ確認したい']},
    {id:'visual',title:'完成するとこうなります',type:'visual',html:filterCompleteVisual()},
    {id:'click-guide',title:'実際のExcel画面で見る',type:'visual',html:filterClickGuide()},
    {id:'steps',title:'やってみましょう',type:'steps',items:['表の中を1か所クリックします。表全体を選択しなくても大丈夫です。','データ タブをクリックします。','フィルター をクリックします。見出しに ▼ が付きます。','絞り込みたい列の ▼ をクリックします。','表示したい項目だけにチェックを入れて、OK をクリックします。']},
    {id:'tips',title:'Tips',type:'plain',html:filterTipsBlock()},
    {id:'practical',title:'実務のポイント',type:'plain',html:filterPracticalBlock()},
    {id:'mistakes',title:'よくあるミス',type:'mistakes',items:[{title:'データが消えたと思ってしまう',text:'消えていません。フィルターで一時的に隠れているだけです。解除すると元に戻ります。'},{title:'一部の行しか対象にならない',text:'表の途中だけを選んでいる可能性があります。まずは表の中を1か所クリックしてから設定しましょう。'},{title:'絞り込み中なのに全件だと思ってしまう',text:'行番号が青くなっていたり、見出しにフィルターの印がある時は絞り込み中です。'}]},
    {id:'ai-check',title:'AIに聞く前に',type:'plain',html:filterAiCheckBlock()},
    {id:'sample',title:'この画面と同じExcelを開く',type:'sample',html:operationSampleBlock('FILTER_operation_sample.xlsx','フィルター練習用サンプル')},
    {id:'done',title:'できるようになったこと',type:'plain',html:filterDoneBlock()},
    {id:'related',title:'次に覚えるなら',type:'related',items:['並べ替え','テーブル','条件付き書式','ピボットテーブル']}
  ]}
}

function chartTemplate(x){
  return {label:'グラフ詳細',lead:'数字の違いを、棒の長さで比べられるようにします。',primaryCopy:'',showSecondaryCopy:false,sections:[
    {id:'use',title:'こんな時に使います',type:'cards',items:['月ごとの売上を比べたい','品番ごとの不良件数を比べたい','部署ごとの件数を見やすくしたい']},
    {id:'visual',title:'完成するとこうなります',type:'visual',html:columnChartCompleteVisual()},
    {id:'click-guide',title:'実際のExcel画面で見る',type:'visual',html:columnChartClickGuide()},
    {id:'read',title:'グラフの見方',type:'plain',html:columnChartReadingBlock()},
    {id:'types',title:'棒グラフの種類と特徴',type:'plain',html:columnChartTypesBlock()},
    {id:'sample',title:'この画面と同じExcelを開く',type:'sample',html:operationSampleBlock('CHART_COLUMN_sample.xlsx','棒グラフ練習用サンプル')},
    {id:'tips',title:'Tips',type:'plain',html:columnChartTipsBlock()},
    {id:'practical',title:'実務のポイント',type:'plain',html:columnChartPracticalBlock()},
    {id:'mistakes',title:'ここだけ注意',type:'mistakes',items:[{title:'見出しも一緒に選ぶ',text:'「月」「売上」の見出しを含めて選ぶと、横軸やグラフ名が分かりやすくなります。'},{title:'棒を増やしすぎない',text:'項目が多すぎると比べにくくなります。まずは6～10項目程度に絞ると見やすくなります。'}]},
    {id:'related',title:'次に覚えるなら',type:'related',items:['折れ線グラフ','円グラフ','並べ替え','テーブル']}
  ]}
}
function columnChartCompleteVisual(){
  const values=[120,145,132,168,155,190];
  const months=['1月','2月','3月','4月','5月','6月'];
  return `<div class="chart-complete-card"><div class="chart-preview-title">月別売上</div><div class="chart-preview-area"><div class="chart-y-axis"><span>200</span><span>150</span><span>100</span><span>50</span><span>0</span></div><div class="chart-bars">${values.map((v,i)=>`<div class="chart-bar-item"><span class="chart-bar-value">${v}</span><div class="chart-bar" style="height:${Math.round(v/2)}%"></div><strong>${months[i]}</strong></div>`).join('')}</div></div><p class="chart-preview-note">棒が高いほど、売上が多いことが分かります。</p></div>`
}
const columnChartScreenshotSteps=[
  {title:'1. グラフにしたい表を選択',caption:'「月」と「売上」を、見出しごと選びます。',src:'assets/screenshots/excel365/chart/column/annotated/step1_select_data.png'},
  {title:'2. 挿入タブ → グラフ → 集合縦棒',caption:'「挿入」タブを開き、グラフの「2-D 縦棒」から左上の集合縦棒を選びます。',src:'assets/screenshots/excel365/chart/column/annotated/step2_choose_column.png'},
  {title:'3. 棒グラフが完成',caption:'月別売上の棒グラフが表示されれば完了です。',src:'assets/screenshots/excel365/chart/column/annotated/step3_chart_complete.png'}
];
function columnChartClickGuide(){return `<div class="screenshot-step-list" aria-label="実際のExcel画面で操作を確認する">
  ${columnChartScreenshotSteps.map((step,i)=>`<article class="screenshot-step-card"><div class="screenshot-step-head"><span>${i+1}</span><div><strong>${step.title.replace(/^\d+\.\s*/,'')}</strong><p>${step.caption}</p></div></div><div class="screenshot-frame"><img src="${step.src}" alt="${step.title}"><button class="screenshot-zoom" data-guide="chart-column" data-step="${i}">拡大</button></div></article>`).join('')}
</div>`}
function columnChartReadingBlock(){return `<div class="chart-reading-grid"><div><strong>横軸</strong><span>何を比べるか</span><p>今回は1月～6月です。</p></div><div><strong>縦軸</strong><span>数字の大きさ</span><p>今回は売上（万円）です。</p></div><div><strong>棒</strong><span>項目ごとの結果</span><p>高いほど数値が大きいと分かります。</p></div></div>`}
function columnChartTypesBlock(){return `<div class="chart-type-list">
  <article class="chart-type-card"><h3>集合縦棒</h3><div><strong>特徴</strong><p>項目ごとの数値を、縦向きの棒で比較します。</p></div><div><strong>こんな時に使います</strong><p>月別売上、品番別不良数、部門別件数</p></div></article>
  <article class="chart-type-card"><h3>積み上げ縦棒</h3><div><strong>特徴</strong><p>合計と内訳を、1本の棒の中で確認できます。</p></div><div><strong>こんな時に使います</strong><p>良品・不良品の内訳、製品別の売上構成、人数の内訳</p></div></article>
  <article class="chart-type-card"><h3>100%積み上げ縦棒</h3><div><strong>特徴</strong><p>合計を100%として、割合（構成比）を比較します。</p></div><div><strong>こんな時に使います</strong><p>不良率、市場シェア、構成比</p></div></article>
  <article class="chart-type-card"><h3>集合横棒</h3><div><strong>特徴</strong><p>横向きの棒で比較します。項目名が長い場合でも読みやすくなります。</p></div><div><strong>こんな時に使います</strong><p>長い製品名、ランキング、部門比較</p></div></article>
  <article class="chart-type-card"><h3>積み上げ横棒</h3><div><strong>特徴</strong><p>横向きで、合計と内訳を同時に表示します。</p></div><div><strong>こんな時に使います</strong><p>工程別時間、部門別内訳、作業内訳</p></div></article>
  <article class="chart-type-card"><h3>100%積み上げ横棒</h3><div><strong>特徴</strong><p>横向きで、割合（構成比）を比較します。</p></div><div><strong>こんな時に使います</strong><p>構成比、割合比較、シェア比較</p></div></article>
  <article class="chart-type-card chart-type-card-wide"><h3>3-D縦棒・3-D横棒</h3><div><strong>特徴</strong><p>立体的に表示できますが、奥行きのため棒の高さや長さを比べにくくなることがあります。</p></div><div><strong>こんな時に使います</strong><p>見た目を重視する資料。数値を正確に比較したい時は、2-Dの棒グラフの方が読み取りやすくなります。</p></div></article>
</div>`}
function columnChartTipsBlock(){return `<div class="learning-box tips-box"><div class="learning-head"><span>💡</span><strong>Tips</strong></div><p>項目ごとの大きさを比べるなら、まず棒グラフを選べば大丈夫です。</p><p>時間の変化を見たい時は、折れ線グラフの方が分かりやすい場合があります。</p></div>`}
function columnChartPracticalBlock(){return `<div class="learning-box practical-box"><div class="learning-head"><span>💼</span><strong>実務のポイント</strong></div><p>グラフタイトルには「何を比べたグラフか」を書きます。</p><p>「売上」だけより、「2026年 月別売上」のようにすると、会議資料でも迷いません。</p></div>`}


function vbaIntroTemplate(x){
  return {label:'VBAシリーズ',lead:'VBAを使う前に、できることと学ぶ順番を確認します。コードを書くのは次のページからです。',primaryCopy:'',showSecondaryCopy:false,sections:[
    {id:'what',title:'VBAとは',type:'plain',html:vbaWhatBlock()},
    {id:'can',title:'VBAでできること',type:'cards',items:['同じ作業をまとめて実行する','セルやシートを自動で操作する','複数ファイルの処理を自動化する','決まった形式で保存・印刷する']},
    {id:'macro',title:'マクロとの関係',type:'plain',html:vbaMacroBlock()},
    {id:'flow',title:'VBAを使うまでの流れ',type:'plain',html:vbaFlowBlock()},
    {id:'series',title:'VBAシリーズの進み方',type:'plain',html:vbaSeriesBlock()},
    {id:'security',title:'使う前に確認すること',type:'plain',html:vbaSecurityBlock()},
    {id:'next',title:'次のページ',type:'plain',html:vbaNextBlock()}
  ]}
}
function vbaWhatBlock(){return `<div class="vba-intro-card"><div class="vba-intro-mark">VBA</div><div><h3>Excelの操作を自動化するための仕組みです。</h3><p>毎回同じ手順で行う作業を、コードにしてまとめて実行できます。</p><p>最初から難しいコードを覚える必要はありません。まずは、どこで使うかと全体の流れを見ていきます。</p></div></div>`}
function vbaMacroBlock(){return `<div class="vba-compare-grid"><article><span>マクロ</span><strong>自動で動かす仕組み</strong><p>登録した操作やコードを実行します。</p></article><article><span>VBA</span><strong>マクロの中身を書く言語</strong><p>Excelに「何を、どの順番で行うか」を伝えます。</p></article></div><p class="vba-small-note">EPAでは、マクロ記録とVBAコードを別ページで一つずつ扱います。</p>`}
function vbaFlowBlock(){const steps=[['1','開発タブを表示する','VBAやマクロを使うための入口を出します。'],['2','VBA画面を開く','コードを書く画面を開きます。'],['3','初めてのコードを書く','まずは短いコードを入力します。'],['4','.xlsmで保存する','コードを残せる形式で保存します。'],['5','マクロを実行する','保存したコードを動かし、結果を確認します。']];return `<div class="vba-flow">${steps.map(s=>`<article><span>${s[0]}</span><div><strong>${s[1]}</strong><p>${s[2]}</p></div></article>`).join('')}</div>`}
function vbaSeriesBlock(){const items=[['1','はじめてのVBA','current'],['2','開発タブを表示する',''],['3','VBA画面を開く',''],['4','初めてのコードを書く',''],['5','マクロ有効ブックで保存する',''],['6','マクロを実行する',''],['7','マクロの記録',''],['8','よく使うVBAコード','']];return `<div class="vba-series-card"><div class="vba-series-head"><strong>VBAシリーズ</strong><span>1 / 8</span></div><div class="vba-series-list">${items.map(i=>`<div class="${i[2]}"><span>${i[0]}</span><p>${i[1]}</p></div>`).join('')}</div></div>`}
function vbaSecurityBlock(){return `<div class="vba-security-card"><h3>知らないコードは、そのまま実行しません。</h3><ul><li>コードの内容を確認してから実行します。</li><li>作業前に元ファイルのバックアップを取ります。</li><li>EPAのVBA教材ファイルは、マクロなしの <code>.xlsx</code> で配布します。</li><li>コードを追加した後に、自分で <code>.xlsm</code> として保存します。</li></ul></div>`}
function vbaNextBlock(){return `<div class="vba-next-card"><span>VBAシリーズ 2 / 8</span><h3>次は「開発タブを表示する」です。</h3><p>リボンに「開発」が見当たらなくても問題ありません。次のページで表示方法を確認します。</p><button class="related-chip disabled" type="button">次ページは準備中</button></div>`}

function formattingTemplate(x){
  if(x.id==='CF_BASIC') return conditionalFormattingBasicTemplate(x);
  return {label:'条件付き書式',lead:`${x.plain||x.summary} 条件に合うセルを自動で見つけて、色や書式で目立たせます。`,primaryCopy:'',showSecondaryCopy:false,sections:[
    {id:'what',title:'何を自動で色分けする？',type:'plain',html:`<p>${x.summary}</p>`},
    {id:'steps',title:'設定手順',type:'steps',items:formattingSteps(x)},
    {id:'visual',title:'画面イメージ',type:'visual',html:formattingVisual(x)},
    {id:'mistakes',title:'よくある失敗',type:'mistakes',items:getFriendlyMistakes(x)},
    {id:'related',title:'関連テンプレート・関数',type:'related',items:x.related||[]}
  ]}
}
function conditionalFormattingBasicTemplate(x){
  return {label:'条件付き書式',lead:'条件に合うセルを自動で色付けできます。今回は、80より大きい点数を緑色にします。',primaryCopy:'',showSecondaryCopy:false,sections:[
    {id:'use',title:'こんな時に使います',type:'cards',items:['基準を超えた点数を見つけたい','期限切れを目立たせたい','重複データを探したい','売上上位を見つけたい']},
    {id:'visual',title:'完成するとこうなります',type:'visual',html:conditionalFormattingCompleteVisual()},
    {id:'click-guide',title:'実際のExcel画面で見る',type:'visual',html:conditionalFormattingClickGuide()},
    {id:'types',title:'条件付き書式の種類',type:'plain',html:conditionalFormattingTypesBlock()},
    {id:'sample',title:'この画面と同じExcelを開く',type:'sample',html:operationSampleBlock('CONDITIONAL_FORMATTING_basic_sample.xlsx','条件付き書式 練習用サンプル')},
    {id:'tips',title:'Tips',type:'plain',html:conditionalFormattingTipsBlock()},
    {id:'practical',title:'実務のポイント',type:'plain',html:conditionalFormattingPracticalBlock()},
    {id:'mistakes',title:'ここだけ注意',type:'mistakes',items:[{title:'「80より大きい」は80を含みません',text:'今回のルールでは、81以上が色付きになります。80も含めたい場合は、別のルールや数式を使います。'},{title:'色を付けたいセルだけを選ぶ',text:'今回は点数のB2:B8だけを選びます。見出しの「点数」は選びません。'}]},
    {id:'related',title:'次に覚えるなら',type:'related',items:['重複を色分けする','期限切れを色分けする','フィルター','並べ替え']}
  ]}
}
function conditionalFormattingCompleteVisual(){return `<div class="cf-complete-card"><div class="cf-complete-head"><strong>80より大きい点数を自動で色付け</strong><span>条件を満たすセルだけが変わります。</span></div><div class="cf-demo-table"><div class="head">氏名</div><div class="head">点数</div><div>佐藤</div><div>72</div><div>鈴木</div><div class="hit">88</div><div>田中</div><div>65</div><div>山本</div><div class="hit">91</div><div>伊藤</div><div>79</div><div>中村</div><div class="hit">84</div><div>小林</div><div>58</div></div></div>`}
const conditionalFormattingScreenshotSteps=[
  {title:'1. 点数の範囲を選択',caption:'色を付けたい点数だけを選びます。今回はB2:B8です。',src:'assets/screenshots/excel365/conditional-formatting/basic/annotated/step1_select_range.png'},
  {title:'2. ホーム → 条件付き書式',caption:'「ホーム」タブにある「条件付き書式」を開きます。',src:'assets/screenshots/excel365/conditional-formatting/basic/annotated/step2_open_conditional_formatting.png'},
  {title:'3. セルの強調表示ルール → 指定の値より大きい',caption:'条件を指定して色付けするルールを選びます。',src:'assets/screenshots/excel365/conditional-formatting/basic/annotated/step3_choose_rule.png'},
  {title:'4. 条件を入力する',caption:'今回は「80」を入力して、OKをクリックします。',src:'assets/screenshots/excel365/conditional-formatting/basic/annotated/step4_enter_condition.png'},
  {title:'5. 色付け完了',caption:'80より大きい点数だけが緑色になれば完了です。',src:'assets/screenshots/excel365/conditional-formatting/basic/annotated/step5_complete.png'}
];
function conditionalFormattingClickGuide(){return `<div class="screenshot-step-list" aria-label="実際のExcel画面で条件付き書式を確認する">${conditionalFormattingScreenshotSteps.map((step,i)=>`<article class="screenshot-step-card"><div class="screenshot-step-head"><span>${i+1}</span><div><strong>${step.title.replace(/^\d+\.\s*/,'')}</strong><p>${step.caption}</p></div></div><div class="screenshot-frame"><img src="${step.src}" alt="${step.title}"><button class="screenshot-zoom" data-guide="conditional-formatting" data-step="${i}">拡大</button></div></article>`).join('')}</div>`}
function conditionalFormattingTypesBlock(){return `<div class="cf-type-list"><article><h3>セルの強調表示ルール</h3><p><strong>特徴</strong> 指定した数値・文字・日付に合うセルを色付けします。</p><p><strong>こんな時に使います</strong> 基準値、期限、重複の確認</p></article><article><h3>上位／下位ルール</h3><p><strong>特徴</strong> 上位10件や平均より上などを自動で見つけます。</p><p><strong>こんな時に使います</strong> 売上上位、成績上位、低い値の確認</p></article><article><h3>データバー</h3><p><strong>特徴</strong> セルの中に棒を表示し、数値の大小を比べます。</p><p><strong>こんな時に使います</strong> 売上、工数、数量の比較</p></article><article><h3>カラースケール</h3><p><strong>特徴</strong> 数値の大小を色の濃淡で表します。</p><p><strong>こんな時に使います</strong> 点数分布、温度、傾向の確認</p></article><article><h3>アイコンセット</h3><p><strong>特徴</strong> 矢印や信号のアイコンで状態を表します。</p><p><strong>こんな時に使います</strong> 達成状況、増減、判定の表示</p></article></div>`}
function conditionalFormattingTipsBlock(){return `<div class="learning-box tips-box"><div class="learning-head"><span>💡</span><strong>Tips</strong></div><p>条件付き書式は、元の数値を変えずに見た目だけを自動で変えます。</p><p>点数を変更すると、色も自動で更新されます。</p></div>`}
function conditionalFormattingPracticalBlock(){return `<div class="learning-box practical-box"><div class="learning-head"><span>💼</span><strong>実務のポイント</strong></div><p>期限切れや基準外など、見落としたくない情報に使うと確認が早くなります。</p><p>色を増やしすぎず、意味を決めて使うと表が読みやすくなります。</p></div>`}
function templateTemplate(x){
  return {label:'テンプレート',lead:`${x.plain||x.summary} 入力する場所と自動計算される場所を分けて使います。`,primaryCopy:x.copyExamples?.[0]||'',sections:[
    {id:'what',title:'何に使うテンプレート？',type:'plain',html:`<p>${x.summary}</p>`},
    {id:'input',title:'入力する場所',type:'terms',items:x.terms||[]},
    {id:'preview',title:'完成イメージ',type:'visual',html:templateVisual(x)},
    {id:'howto',title:'使い方',type:'steps',items:['テンプレートを開く','入力セルに必要な情報を入力する','出力結果を確認する','印刷・保存・共有する']},
    {id:'custom',title:'カスタマイズ例',type:'cards',items:x.purpose||[]},
    {id:'caution',title:'注意点',type:'mistakes',items:getFriendlyMistakes(x)},
    {id:'related',title:'関連テンプレート',type:'related',items:x.related||[]}
  ]}
}


function troubleValueGuideTemplate(x){
  const related=x.relatedTroubles||[];
  return {label:'トラブル解決',lead:'Excelが数字として計算できない内容を見つけたときに表示されます。',primaryCopy:'',showSecondaryCopy:false,sections:[
    {id:'first',title:'まず試してください',type:'plain',html:`
      <button type="button" class="trouble-back-category trouble-back-primary" data-target="${x.parent||'TROUBLE_ERROR_SHOWN'}"><span aria-hidden="true">←</span><span>エラーの一覧へ戻る</span></button>
      <div class="trouble-guide-lead"><code>#VALUE!</code><div><h3>計算に使えない文字や値があります</h3><p>次の3つを上から順に確認します。</p></div></div>
      <div class="trouble-quick-steps">
        <article><span>STEP 1</span><div><strong>エラーが出ているセルをクリックします</strong><p>セルを1つ選び、画面上部に表示される計算式を確認します。</p></div></article>
        <article><span>STEP 2</span><div><strong>計算に使われている数字を順番に確認します</strong><p>数字の場所に文字、単位、記号、空白が入っていないか見ます。</p></div></article>
        <article><span>STEP 3</span><div><strong>「100円」など、数字以外が入っている内容を数字だけにして入力し直します</strong><p>例：「100円」→「100」、「100個」→「100」のように入力し直します。</p></div></article>
      </div>
      <div class="trouble-mini-example"><div class="is-ok"><b>計算できる例</b><span>100</span></div><div class="is-ng"><b>確認する例</b><span>100円</span><span>100□</span></div></div>`},
    {id:'notfixed',title:'まだ直らない場合',type:'plain',html:`
      <div class="trouble-check-panel"><p>次の項目を上から確認してください。</p><ul>
        <li>数字が左側に寄っていませんか</li>
        <li>セルの左上に緑色の三角がありませんか</li>
        <li>数字の前後に空白が入っていませんか</li>
        <li>「円」「個」「kg」などが一緒に入力されていませんか</li>
        <li>コピーや貼り付けをした直後ではありませんか</li>
      </ul></div>`},
    {id:'causes',title:'よくある原因',type:'plain',html:`
      <div class="trouble-ranked-causes">
        <article><span>1</span><div><strong>数字が文字として保存されている</strong><p>見た目が100でも、Excelが文字として扱っていることがあります。</p></div></article>
        <article><span>2</span><div><strong>文字・単位・空白が混ざっている</strong><p>「100円」や末尾の空白は、そのまま計算できないことがあります。</p></div></article>
        <article><span>3</span><div><strong>計算式の指定場所がずれている</strong><p>コピー後に、計算に使うセルが別の場所へ変わっている場合があります。</p></div></article>
      </div>`},
    {id:'field',title:'現場でよくある例',type:'plain',html:`
      <div class="trouble-field-example"><strong>別システムやCSVから貼り付けた数字</strong><p>画面では「100」と見えても、文字として取り込まれていることがあります。数量や金額の列で発生しやすいトラブルです。</p><div class="trouble-field-tip"><b>確認の目安</b><span>通常、数字はセルの右側、文字は左側に寄ります。ただし、書式設定で位置が変わる場合もあります。</span></div></div>`},
    {id:'prevention',title:'次から困らないために',type:'plain',html:`
      <div class="trouble-prevention-list"><ul>
        <li>数量や金額のセルには、数字だけを入力します。</li>
        <li>単位はセルに入力せず、表示形式や見出しで示します。</li>
        <li>CSVや他システムのデータは、計算前に数値として扱われているか確認します。</li>
        <li>数式をコピーした後は、最初と最後の計算結果を確認します。</li>
      </ul></div>`},
    {id:'related',title:'関連するトラブル',type:'plain',html:`
      <div class="trouble-related-grid">
        <button type="button" class="trouble-symptom-card is-clickable" data-target="TROUBLE_INPUT_DISPLAY"><strong>入力した数字や表示がおかしい</strong><span>数字が日付になる、先頭の0が消えるなど</span><b>見る →</b></button>
        <button type="button" class="trouble-symptom-card is-clickable" data-target="TROUBLE_NOT_WORKING"><strong>いつも通り動かない</strong><span>計算結果が変わらない、コピー後に数字が変わるなど</span><b>見る →</b></button>
      </div>
      <div class="trouble-bottom-nav"><button type="button" class="trouble-back-category trouble-back-primary" data-target="${x.parent||'TROUBLE_ERROR_SHOWN'}"><span aria-hidden="true">←</span><span>エラーの一覧へ戻る</span></button><button type="button" class="trouble-back-hub trouble-back-secondary"><span aria-hidden="true">⌂</span><span>トラブル解決トップへ戻る</span></button></div>`}
  ]};
}


function troubleErrorGoldenTemplate(x){
  if(x.id==='TROUBLE_VALUE') return troubleValueGuideTemplate(x);
  const pages={
    TROUBLE_NA:{
      lead:'探しているデータが一覧の中に見つからないときに表示されます。',
      heading:'探しているデータが見つかりません',
      intro:'次の3つを上から順に確認します。',
      steps:[
        ['探している品番や名前をコピーします','エラーになった数式で使っている品番や名前をコピーします。'],
        ['元の一覧で検索します','Ctrl＋Fを押し、コピーした内容を貼り付けて検索します。'],
        ['文字の違いを確認します','末尾の空白、全角・半角、ハイフンの違いがないか見ます。']
      ],
      example:['見つかる例','ABC-123','確認する例','ABC-123□','ＡＢＣ-１２３'],
      checks:['元の一覧に同じ品番や名前がありますか','検索する範囲に追加した行が含まれていますか','数字と文字の扱いがそろっていますか','コピー後に検索範囲がずれていませんか'],
      causes:[
        ['探しているデータが登録されていない','元の一覧に品番や社員番号がありません。'],
        ['見えない空白や表記の違いがある','末尾の空白や全角・半角の違いは、別の文字として扱われます。'],
        ['検索する範囲がずれている','数式をコピーしたあと、元の一覧の指定場所が動いていることがあります。']
      ],
      fieldTitle:'品番の末尾に入った空白',
      field:'画面では同じ品番に見えても、末尾に空白があると見つかりません。別システムから貼り付けたデータで起こりやすいトラブルです。',
      tip:'セルを編集状態にして、文字の最後にカーソルを置くと確認しやすくなります。',
      prevention:['品番や社員番号の入力方法を統一します。','元の一覧へ追加した後、検索できるか1件確認します。','検索範囲をコピーする場合は、固定する場所を確認します。','見つからないときは空白にせず「未登録」と表示します。'],
      related:[['TROUBLE_VALUE','#VALUE!','文字として保存された数字が原因のとき'],['TROUBLE_NOT_WORKING','いつも通り動かない','検索や計算の結果がいつもと違うとき']]
    },
    TROUBLE_REF:{
      lead:'計算に使っていたセル・列・シートがなくなったときに表示されます。',
      heading:'計算に使っていた場所がなくなっています',
      intro:'削除や移動の直後なら、まず元に戻します。',
      steps:[
        ['直前に削除した場合はCtrl＋Zを押します','削除直後であれば、元の状態へ戻せる可能性があります。'],
        ['エラーのセルをクリックします','画面上部の計算式で、#REF!と表示された場所を確認します。'],
        ['正しいセルや範囲を選び直します','上下の正常な計算式と比べて、元の場所を指定し直します。']
      ],
      example:['正常な例','=B2*C2','確認する例','=#REF!*C2','=SUM(#REF!)'],
      checks:['行・列・シートを削除した直後ではありませんか','数式を切り取り・貼り付けしていませんか','同じ列の上下に正常な数式がありますか','元のデータが別の場所へ移動していませんか'],
      causes:[
        ['行や列を削除した','内容だけでなく、行や列そのものを削除しています。'],
        ['元のシートを削除した','別シートのデータを使う計算式が残っています。'],
        ['数式を移動した','切り取りや貼り付けで、計算に使う場所との関係が崩れています。']
      ],
      fieldTitle:'不要な列を削除したら集計表までエラーになった',
      field:'列を削除すると、その列を使っていた別シートの計算式も影響を受けます。値だけを消す操作とは影響が異なります。',
      tip:'削除直後は操作を続けず、最初にCtrl＋Zを試します。',
      prevention:['大きな変更の前にファイルを別名で保存します。','不要な値だけを消す場合はDeleteキーを使います。','行や列を削除する前に、別シートの計算結果を確認します。'],
      related:[['TROUBLE_NOT_WORKING','いつも通り動かない','コピー後に計算結果が変わったとき'],['TROUBLE_VALUE','#VALUE!','計算に使えない内容が混ざったとき']]
    },
    TROUBLE_DIV0:{
      lead:'0または未入力のセルで割り算をしたときに表示されます。',
      heading:'0または空欄では割り算できません',
      intro:'割り算の右側にある数字を確認します。',
      steps:[
        ['エラーのセルをクリックします','画面上部の計算式で「/」を探します。'],
        ['「/」の右側のセルを確認します','0、空欄、または未入力になっていないか見ます。'],
        ['必要な数字を入力します','入力漏れなら正しい値を入れ、未入力を許す表なら表示方法を調整します。']
      ],
      example:['計算できる例','=100/5','確認する例','=100/0','=100/空欄'],
      checks:['割る側の数字が0になっていませんか','必要な数量や件数が未入力ではありませんか','コピー後に空欄のセルを使っていませんか','0と未入力を同じ意味にしていませんか'],
      causes:[
        ['割る数が0になっている','割合や平均の計算で、分母が0です。'],
        ['必要な入力がまだない','月途中などで、数量や件数が空欄のままです。'],
        ['コピー後に指定場所がずれた','本来とは別の空欄セルで割っています。']
      ],
      fieldTitle:'月途中の集計表でエラーが並ぶ',
      field:'まだ実績がない行では、割る側の数が0や空欄になります。計算ミスではなく、未入力をどう表示するか決める必要があります。',
      tip:'エラーを消すために0を1へ変えると、結果そのものが誤るので避けます。',
      prevention:['割る側になる項目を分かりやすく表示します。','0と未入力の意味を分けます。','入力前は空欄表示にするなど、表のルールを決めます。'],
      related:[['TROUBLE_VALUE','#VALUE!','割り算に文字が混ざっているとき'],['TROUBLE_NOT_WORKING','いつも通り動かない','計算結果が更新されないとき']]
    },
    TROUBLE_NAME:{
      lead:'Excelが関数名や数式の中の文字を理解できないときに表示されます。',
      heading:'関数名や数式の文字を確認してください',
      intro:'入力ミスや記号の違いを順番に確認します。',
      steps:[
        ['関数名を確認します','=SUMM(...)など、関数名のつづりが間違っていないか見ます。'],
        ['文字を「" "」で囲みます','=IF(A1="OK",1,0)のように、条件の文字を半角の記号で囲みます。'],
        ['半角の記号で入力し直します','括弧、カンマ、ダブルクォーテーションが全角になっていないか確認します。']
      ],
      example:['正しい例','=SUM(A1:A3)','=IF(A1="OK",1,0)','確認する例','=SUMM(A1:A3)','=IF(A1=OK,1,0)'],
      checks:['関数名の入力候補が表示されましたか','括弧やカンマが半角になっていますか','文字を半角のダブルクォーテーションで囲みましたか','古いExcelで新しい関数を使っていませんか'],
      causes:[
        ['関数名のつづりが違う','=SUMMのように、Excelにない名前が入力されています。'],
        ['文字を記号で囲んでいない','OKや未入力などの文字が、名前として読み取られています。'],
        ['全角の記号が混ざっている','日本語入力中の括弧やカンマは、数式の記号として使えません。']
      ],
      fieldTitle:'日本語入力のまま数式を入力した',
      field:'見た目が似ていても、全角の括弧や引用符は別の文字です。数式を入力するときは半角入力に切り替えます。',
      tip:'関数名を手入力せず、表示された候補を選ぶと入力ミスを減らせます。',
      prevention:['関数名は入力候補から選びます。','数式の記号は半角で入力します。','他の人へ渡す前に、使用するExcelのバージョンを確認します。'],
      related:[['TROUBLE_FORMULA_SHOWN','数式がそのまま表示される','=SUM(...)が計算されないとき'],['TROUBLE_VALUE','#VALUE!','関数は正しいが計算できないとき']]
    },
    TROUBLE_HASH:{
      lead:'多くの場合、列の幅が足りず数字や日付を表示できないときに出ます。',
      heading:'列の幅が足りません',
      intro:'最初に列幅を自動調整します。',
      steps:[
        ['#####が出ている列を確認します','セルではなく、上にあるA・B・Cなどの列記号を見ます。'],
        ['列記号の右側の境界をダブルクリックします','列幅が内容に合わせて自動で広がります。'],
        ['直らない場合は日付や時刻を確認します','終了時刻－開始時刻などがマイナスになっていないか見ます。']
      ],
      example:['表示できる例','2026/7/14','確認する例','#####','狭い列の日付'],
      checks:['列幅を広げると表示されますか','画面上部の入力欄には値が見えますか','日付や時刻の計算結果がマイナスではありませんか','表示形式が必要以上に長くなっていませんか'],
      causes:[
        ['列の幅が狭い','大きな数字や長い日付を表示しきれません。'],
        ['表示形式が長い','年月日や小数点以下を細かく表示しています。'],
        ['日付・時刻の結果がマイナス','Excelの設定によっては、負の日付や時刻を#####で表示します。']
      ],
      fieldTitle:'印刷用に列を狭くしたら日付が#####になった',
      field:'値が消えたのではなく、表示する幅が足りないだけの場合がほとんどです。入力し直す前に列幅を確認します。',
      tip:'セルをクリックして画面上部の入力欄に値が見えれば、データは残っています。',
      prevention:['入力後に列幅を自動調整します。','日付や数値の表示形式を必要な長さにそろえます。','印刷前にプレビューで#####がないか確認します。'],
      related:[['TROUBLE_TEXT_CUT_OFF','文字が途中で切れる','文字や数字が全部見えないとき'],['TROUBLE_INPUT_DISPLAY','入力した数字や表示がおかしい','日付や表示全般で困ったとき']]
    }
  };
  const p=pages[x.id];
  if(!p) return troubleGuideTemplate(x);
  const ex=p.example;
  const exSplit=ex.indexOf('確認する例');
  const rel=p.related||[];
  return {label:'トラブル解決',lead:p.lead,primaryCopy:'',showSecondaryCopy:false,sections:[
    {id:'first',title:'まず試してください',type:'plain',html:`
      <button type="button" class="trouble-back-category trouble-back-primary" data-target="${x.parent||'TROUBLE_ERROR_SHOWN'}"><span aria-hidden="true">←</span><span>エラーの一覧へ戻る</span></button>
      <div class="trouble-guide-lead"><code>${x.errorCode||''}</code><div><h3>${p.heading}</h3><p>${p.intro}</p></div></div>
      <div class="trouble-quick-steps">${p.steps.map((s,i)=>`<article><span>STEP ${i+1}</span><div><strong>${s[0]}</strong><p>${s[1]}</p></div></article>`).join('')}</div>
      <div class="trouble-mini-example"><div class="is-ok"><b>${ex[0]}</b>${ex.slice(1,exSplit).map(v=>`<span>${v}</span>`).join('')}</div><div class="is-ng"><b>${ex[exSplit]}</b>${ex.slice(exSplit+1).map(v=>`<span>${v}</span>`).join('')}</div></div>`},
    {id:'notfixed',title:'まだ直らない場合',type:'plain',html:`<div class="trouble-check-panel"><p>次の項目を上から確認してください。</p><ul>${p.checks.map(v=>`<li>${v}</li>`).join('')}</ul></div>`},
    {id:'causes',title:'よくある原因',type:'plain',html:`<div class="trouble-ranked-causes">${p.causes.map((c,i)=>`<article><span>${i+1}</span><div><strong>${c[0]}</strong><p>${c[1]}</p></div></article>`).join('')}</div>`},
    {id:'field',title:'現場でよくある例',type:'plain',html:`<div class="trouble-field-example"><strong>${p.fieldTitle}</strong><p>${p.field}</p><div class="trouble-field-tip"><b>確認の目安</b><span>${p.tip}</span></div></div>`},
    {id:'prevention',title:'次から困らないために',type:'plain',html:`<div class="trouble-prevention-list"><ul>${p.prevention.map(v=>`<li>${v}</li>`).join('')}</ul></div>`},
    {id:'related',title:'関連するトラブル',type:'plain',html:`<div class="trouble-related-grid">${rel.map(r=>`<button type="button" class="trouble-symptom-card is-clickable" data-target="${r[0]}"><strong>${r[1]}</strong><span>${r[2]}</span><b>見る →</b></button>`).join('')}</div><div class="trouble-bottom-nav"><button type="button" class="trouble-back-category trouble-back-primary" data-target="${x.parent||'TROUBLE_ERROR_SHOWN'}"><span aria-hidden="true">←</span><span>エラーの一覧へ戻る</span></button><button type="button" class="trouble-back-hub trouble-back-secondary"><span aria-hidden="true">⌂</span><span>トラブル解決トップへ戻る</span></button></div>`}
  ]};
}


function troubleNotWorkingGoldenTemplate(x){
  const pages={
    TROUBLE_CALC_NOT_UPDATE:{
      lead:'入力した数字を変えても、計算結果が変わらないときの確認ページです。', heading:'計算結果が更新されていません', intro:'最初に、セルに計算式が残っているか確認します。',
      steps:[['結果が変わらないセルをクリックします','画面上部の入力欄が「=」から始まっているか確認します。'],['F9キーを一度押します','結果が変われば、自動計算が止まっている可能性があります。'],['数式タブで計算方法を「自動」にします','「数式」→「計算方法の設定」→「自動」を選びます。']],
      example:['正常な状態','=B2*C2','確認する状態','数字だけが入っている','F9を押すと変わる'],
      checks:['入力欄が「=」から始まっていますか','F9を押すと結果が変わりますか','計算方法が「手動」になっていませんか','同じ列の上下と計算式が違っていませんか'],
      causes:[['計算方法が手動になっている','入力値を変えても、自動では計算し直されません。'],['計算式が数字に置き換わっている','貼り付けなどで、計算式が固定の数字になっています。'],['別の場所を使って計算している','計算式は動いていますが、確認したい数字とは別の場所を使っています。']],
      fieldTitle:'別の人のファイルを開いた後から更新されない', field:'大きなファイルで手動計算が使われ、その設定が別のファイルにも残ることがあります。F9で変化するかを最初に確認します。', tip:'F9で変わった場合は、数式タブの計算方法を確認します。',
      prevention:['通常の作業では計算方法を「自動」にします。','計算式が入る列へ貼り付ける前に、元ファイルを保存します。','結果だけでなく、入力欄に計算式が残っているかも確認します。'],
      related:[['TROUBLE_TOTAL_MISMATCH','合計が合わない','合計だけが期待した結果にならないとき'],['TROUBLE_COPY_REFERENCE','コピーしたら数字が変わった','コピー後だけ結果がおかしいとき']]
    },
    TROUBLE_TOTAL_MISMATCH:{
      lead:'見えている数字と、SUMなどで出した合計が合わないときの確認ページです。', heading:'合計に含まれていない数字があるかもしれません', intro:'まず、合計する範囲と数字の見え方を確認します。',
      steps:[['合計のセルをクリックします','画面上部の入力欄で、どこからどこまでを合計しているか確認します。'],['合計に入っていない行がないか見ます','後から追加した行や、範囲の外にある数字を確認します。'],['数字を1つクリックします','左上の緑の三角や、左寄せの数字がないか見ます。']],
      example:['合計に入る例','100','250','確認する例','文字として入った「100」','範囲の外に追加した行'],
      checks:['追加した最終行まで合計範囲に入っていますか','数字が左寄せになっていませんか','フィルターで行が隠れていませんか','小数点以下が表示されていないだけではありませんか'],
      causes:[['合計する範囲から行が外れている','後から追加したデータがSUMの範囲に含まれていません。'],['数字が文字として入っている','見た目は数字でも、SUMで合計されないことがあります。'],['表示されていない小数がある','画面では整数に見えても、内部に小数が残っています。']],
      fieldTitle:'システムから貼り付けた数字だけ合計されない', field:'別システムやCSVから貼り付けた数字は、文字として扱われることがあります。緑の三角や左寄せ表示が目印です。', tip:'数件だけ足し算して、合計に入る数字と入らない数字を比べます。',
      prevention:['継続して行を追加する表はテーブル化します。','貼り付け後に数字が右寄せになっているか確認します。','小数を使う表は、表示桁数のルールをそろえます。'],
      related:[['TROUBLE_CALC_NOT_UPDATE','計算結果が変わらない','数字を変えても合計が更新されないとき'],['TROUBLE_VALUE','#VALUE!','数字に文字や単位が混ざっているとき']]
    },
    TROUBLE_COPY_REFERENCE:{
      lead:'計算式をコピーしたあと、数字が変わったり違う場所を使ったりするときの確認ページです。', heading:'コピーで計算に使う場所が動いています', intro:'コピー元とコピー先の計算式を比べます。',
      steps:[['正しいセルと違うセルを順番にクリックします','画面上部の入力欄で、セルの場所がどう変わったか比べます。'],['全行で同じ数字を使う場所を確認します','税率・単価・基準値など、固定したい場所を決めます。'],['固定したい場所を選びF4キーを押します','A1が$A$1になったら、もう一度コピーして確認します。']],
      example:['正しい例','=B2*$F$1','確認する例','=B2*F1','=B3*F2'],
      checks:['全行で同じ税率や単価を使いますか','コピー元の計算式は正しいですか','$が必要な場所に付いていますか','先頭・途中・最後の行で結果を確認しましたか'],
      causes:[['固定したい場所に$がない','税率や基準値の場所まで、コピーに合わせて動いています。'],['最初の計算式が間違っている','誤った計算式をそのまま下へコピーしています。'],['行だけ・列だけ固定する必要がある','表の向きによって、A$1や$A1を使う場合があります。']],
      fieldTitle:'単価のセルが下へずれて金額が変わった', field:'数量だけを行ごとに変え、単価は同じセルを使う場合があります。単価の場所を$で固定します。', tip:'最初から大量にコピーせず、2～3行で結果を確認します。',
      prevention:['基準値には「税率」「単価」などの名前を付けます。','大量コピー前に先頭と次の行を確認します。','固定する場所だけに$を付けます。'],
      related:[['TROUBLE_CALC_NOT_UPDATE','計算結果が変わらない','コピー後に計算式が消えたとき'],['TROUBLE_SORT_BROKEN','並び替えたら表が崩れた','行の組み合わせが変わったとき']]
    },
    TROUBLE_FILTER_NOT_WORK:{
      lead:'絞り込んだのに一部の行が残る、または追加した行が対象にならないときの確認ページです。', heading:'フィルターが表全体に設定されていません', intro:'最初に、すべての見出しに▼があるか確認します。',
      steps:[['見出し行の▼を確認します','一部の列にしか▼がない場合は、範囲が足りません。'],['フィルターをいったん解除します','「データ」→「フィルター」をクリックしてOFFにします。'],['表の中をクリックして、もう一度フィルターを設定します','途中の空白行や結合セルも確認します。']],
      example:['正常な状態','すべての見出しに▼がある','確認する状態','途中から▼がない','追加行だけ対象外'],
      checks:['表の途中に完全な空白行はありませんか','見出しは1行で、空欄はありませんか','表の中に結合セルはありませんか','後から追加した行まで▼の範囲に入っていますか'],
      causes:[['表の途中に空白行がある','Excelがそこで表の終わりと判断しています。'],['後から追加した行が範囲外','最初に設定したフィルター範囲が古いままです。'],['見出しや結合セルが原因','表として正しく認識されていません。']],
      fieldTitle:'月末に追加した行だけ絞り込めない', field:'最初のフィルター範囲より下へ追加した行が、対象に入っていないことがあります。フィルターを設定し直します。', tip:'絞り込み前に最終行まで▼の対象になっているか確認します。',
      prevention:['表の途中に空白行やタイトル行を入れません。','継続してデータを追加する表はテーブル化します。','見出しは1行、空欄なしでそろえます。'],
      related:[['TROUBLE_SORT_BROKEN','並び替えたら表が崩れた','同じ表で並び替えもおかしいとき'],['FILTER','フィルターの基本操作','フィルターの設定方法を確認したいとき']]
    },
    TROUBLE_SORT_BROKEN:{
      lead:'並び替えたあと、品番・氏名・数量などの組み合わせがずれたときの確認ページです。', heading:'一部の列だけが動いた可能性があります', intro:'操作を続けず、最初に元へ戻せるか確認します。',
      steps:[['並び替え後の操作を止めます','保存や別の並び替えを行う前に止めます。'],['Ctrl＋Zを押します','並び替え直後なら、元の状態へ戻せる可能性があります。'],['表の中を1つクリックして並び替え直します','警告が出た場合は「選択範囲を拡張する」を選びます。']],
      example:['正しい状態','品番・品名・数量が同じ行で動く','確認する状態','品番列だけ動く','担当者と実績がずれる'],
      checks:['並び替え直後ならCtrl＋Zを試しましたか','1列全体だけを選んでいませんでしたか','表の途中に空白列や結合セルはありませんか','品番と品名など2項目以上を照合しましたか'],
      causes:[['1列だけを並び替えた','他の列が元の場所に残り、行の組み合わせが崩れています。'],['選択範囲を拡張しなかった','現在選択中の列だけを並び替えています。'],['表が途中で分かれている','空白列や結合セルで別の表として扱われています。']],
      fieldTitle:'品番と数量の組み合わせが変わった', field:'見た目だけでは気づきにくく、誤った内容で集計される危険があります。品番と品名など複数項目を比べます。', tip:'元へ戻せない場合は、保存前のコピーや自動保存履歴を確認します。',
      prevention:['並び替え前にファイルを保存します。','列全体ではなく表内のセルをクリックして実行します。','一覧はテーブル化し、表全体を一緒に動かします。'],
      related:[['SORT','並び替えの基本操作','安全な並び替え手順を確認したいとき'],['TROUBLE_FILTER_NOT_WORK','フィルターがうまく効かない','表の範囲自体がおかしいとき']]
    },
    TROUBLE_AUTOFILL_WRONG:{
      lead:'セル右下をドラッグしたとき、同じ値が続く、番号や日付が思った並びにならないときの確認ページです。', heading:'コピーと連続データの選び方が違っています', intro:'最初に選ぶ値と、ドラッグ後のオプションを確認します。',
      steps:[['連続させたい最初の2つを入力します','例として「1」「2」または「7月」「8月」を入力します。'],['2つのセルをまとめて選びます','選択範囲の右下にある小さな四角をドラッグします。'],['右下のオートフィルオプションを確認します','必要に応じて「連続データ」を選びます。']],
      example:['連続データの例','1、2 → 3、4、5','確認する例','1だけをドラッグ → 1、1、1'],
      checks:['最初の2つの値を選びましたか','コピーではなく「連続データ」を選びましたか','日付や曜日が文字として入っていませんか','計算式のコピーで$の付け方が正しいですか'],
      causes:[['最初の値が1つだけ','Excelが同じ値をコピーすると判断しています。'],['オートフィルオプションがコピー','ドラッグ後の処理が「セルのコピー」になっています。'],['入力した値が文字になっている','日付や番号として認識されず、規則性を判断できません。']],
      fieldTitle:'1、2、3と入れたいのに1が並んだ', field:'「1」だけでは、コピーか連続番号か判断できません。「1」「2」を入力して2セルを選ぶと、続きの数字を作りやすくなります。', tip:'ドラッグ直後に表示される小さなボタンから、結果を切り替えられます。',
      prevention:['連続番号は最初の2件を入力します。','ドラッグ後に先頭・途中・最後を確認します。','複雑な連番はROW関数などを使う方法も検討します。'],
      related:[['TROUBLE_COPY_REFERENCE','コピーしたら数字が変わった','計算式をドラッグした結果がおかしいとき'],['TROUBLE_INPUT_DISPLAY','入力した数字や表示がおかしい','日付や番号が別の形へ変わるとき']]
    },
    TROUBLE_CTRL_ARROW_STOPS:{
      lead:'Ctrl＋矢印で表の端へ移動したいのに、途中で止まるときの確認ページです。', heading:'途中の空白が表の区切りになっています', intro:'止まった場所の次のセルを確認します。',
      steps:[['Ctrl＋矢印で止まったセルを確認します','止まった方向の次のセルを見ます。'],['途中に空白がないか確認します','空白セルがあると、データが続く範囲の端として止まります。'],['もう一度Ctrl＋矢印を押します','次のデータ範囲へ移動できるか確認します。']],
      example:['続いている状態','データ、データ、データ','途中で止まる状態','データ、空白、データ'],
      checks:['止まった次のセルは空白ですか','空白に見える数式やスペースが入っていませんか','表の途中に見出しや区切り行がありますか','最終行へ行きたい場合はCtrl＋Endと混同していませんか'],
      causes:[['途中に空白セルがある','連続したデータ範囲がそこで終わっています。'],['表が複数の範囲に分かれている','見出しや空白行で別のまとまりになっています。'],['空白に見えるセルがある','数式で空文字を表示している場合など、見え方と移動結果が異なることがあります。']],
      fieldTitle:'長い一覧で最終行まで一気に移動できない', field:'Ctrl＋矢印はシートの最終行ではなく、現在いるデータのまとまりの端へ移動します。空白がある表では複数回押します。', tip:'表の本当の最終使用セルを確認したい場合はCtrl＋Endも使えます。',
      prevention:['一覧表の途中に不要な空白行を作りません。','区切りが必要なら、空白行ではなく書式で見分けます。','継続する一覧はテーブル化します。'],
      related:[['TROUBLE_FILTER_NOT_WORK','フィルターがうまく効かない','空白行で表が分かれているとき'],['TROUBLE_HIDDEN_CONTENT','行や列が見えない','移動先が非表示になっているとき']]
    }
  };
  const p=pages[x.id];
  if(!p) return troubleGuideTemplate(x);
  const ex=p.example;
  const exSplit=Math.max(1, ex.findIndex(v=>String(v||'').startsWith('確認')));
  return {label:'トラブル解決',lead:p.lead,primaryCopy:'',showSecondaryCopy:false,sections:[
    {id:'first',title:'まず試してください',type:'plain',html:`
      <button type="button" class="trouble-back-category trouble-back-primary" data-target="TROUBLE_NOT_WORKING"><span aria-hidden="true">←</span><span>「いつも通り動かない」へ戻る</span></button>
      <div class="trouble-guide-lead"><code>${x.errorCode||''}</code><div><h3>${p.heading}</h3><p>${p.intro}</p></div></div>
      <div class="trouble-quick-steps">${p.steps.map((s,i)=>`<article><span>STEP ${i+1}</span><div><strong>${s[0]}</strong><p>${s[1]}</p></div></article>`).join('')}</div>
      <div class="trouble-mini-example"><div class="is-ok"><b>${ex[0]}</b>${ex.slice(1,exSplit).map(v=>`<span>${v}</span>`).join('')}</div><div class="is-ng"><b>${ex[exSplit]}</b>${ex.slice(exSplit+1).map(v=>`<span>${v}</span>`).join('')}</div></div>`},
    {id:'notfixed',title:'まだ直らない場合',type:'plain',html:`<div class="trouble-check-panel"><p>次の項目を上から確認してください。</p><ul>${p.checks.map(v=>`<li>${v}</li>`).join('')}</ul></div>`},
    {id:'causes',title:'よくある原因',type:'plain',html:`<div class="trouble-ranked-causes">${p.causes.map((c,i)=>`<article><span>${i+1}</span><div><strong>${c[0]}</strong><p>${c[1]}</p></div></article>`).join('')}</div>`},
    {id:'field',title:'現場でよくある例',type:'plain',html:`<div class="trouble-field-example"><strong>${p.fieldTitle}</strong><p>${p.field}</p><div class="trouble-field-tip"><b>確認の目安</b><span>${p.tip}</span></div></div>`},
    {id:'prevention',title:'次から困らないために',type:'plain',html:`<div class="trouble-prevention-list"><ul>${p.prevention.map(v=>`<li>${v}</li>`).join('')}</ul></div>`},
    {id:'related',title:'関連するトラブル',type:'plain',html:`<div class="trouble-related-grid">${p.related.map(r=>`<button type="button" class="trouble-symptom-card is-clickable" data-target="${r[0]}"><strong>${r[1]}</strong><span>${r[2]}</span><b>見る →</b></button>`).join('')}</div><div class="trouble-bottom-nav"><button type="button" class="trouble-back-category trouble-back-primary" data-target="TROUBLE_NOT_WORKING"><span aria-hidden="true">←</span><span>「いつも通り動かない」へ戻る</span></button><button type="button" class="trouble-back-hub trouble-back-secondary"><span aria-hidden="true">⌂</span><span>トラブル解決トップへ戻る</span></button></div>`}
  ]};
}

function troubleGuideTemplate(x){
  const causes=x.causes||[], steps=x.steps||[], prevention=x.prevention||[];
  return {eyebrow:x.errorCode||'トラブル解決', sections:[
    {id:'meaning',title:'まず、普通の言葉でいうと',type:'plain',html:`<button type="button" class="trouble-back-category trouble-back-primary" data-target="${x.parent||'TROUBLE_ERROR_SHOWN'}"><span aria-hidden="true">←</span><span>${x.backLabel||'エラーの一覧へ戻る'}</span></button><div class="trouble-guide-meaning"><code>${x.errorCode||''}</code><div><strong>${x.ordinary||x.plain||''}</strong><p>意味を覚える必要はありません。下の順番で1つずつ確認すれば大丈夫です。</p></div></div>`},
    {id:'causes',title:'よくある原因',type:'plain',html:`<div class="trouble-cause-grid">${causes.map((c,i)=>`<article><span>${String(i+1).padStart(2,'0')}</span><strong>${c[0]}</strong><p>${c[1]}</p></article>`).join('')}</div>`},
    {id:'steps',title:'この順番で確認します',type:'plain',html:`<div class="trouble-solve-steps">${steps.map((s,i)=>`<article><div class="trouble-step-num">STEP ${i+1}</div><div><strong>${s[0]}</strong><p>${s[1]}</p></div></article>`).join('')}</div>`},
    {id:'field',title:'実務でよくあるケース',type:'plain',html:`<div class="trouble-practical-box"><span>現場あるある</span><p>${x.fieldCase||''}</p></div>`},
    {id:'prevention',title:'同じトラブルを防ぐには',type:'plain',html:`<div class="trouble-prevention"><ul>${prevention.map(v=>`<li>${v}</li>`).join('')}</ul></div>`},
    {id:'caution',title:'ここに注意',type:'plain',html:`<div class="trouble-caution"><strong>エラーを消すことだけを目的にしないでください</strong><p>${x.caution||''}</p></div><div class="trouble-bottom-nav"><button type="button" class="trouble-back-category trouble-back-primary" data-target="${x.parent||'TROUBLE_ERROR_SHOWN'}"><span aria-hidden="true">←</span><span>${x.backLabel||'エラーの一覧へ戻る'}</span></button><button type="button" class="trouble-back-hub trouble-back-secondary"><span aria-hidden="true">⌂</span><span>トラブル解決トップへ戻る</span></button></div>`}
  ]};
}

function errorTemplate(x){
  return {label:'エラー解決',lead:`${x.plain||x.summary} 原因を一つずつ確認して、式やデータを直します。`,primaryCopy:x.copyExamples?.[0]||x.syntax,sections:[
    {id:'cause',title:'よくある原因',type:'plain',html:`<p>${x.summary}</p>`},
    {id:'check',title:'確認する順番',type:'steps',items:['探している値が本当にあるか確認する','余分な空白がないか確認する','数値と文字列が混ざっていないか確認する','必要に応じてIFERRORで表示を整える']},
    {id:'fix',title:'対処例をコピー',type:'copyExamples',items:(x.copyExamples||[x.syntax]).map(v=>({formula:v,note:'表名・列番号・表示文字を自分の表に合わせて変更します。',replace:['検索値','表の範囲','見つからない時の表示']}))},
    {id:'visual',title:'確認イメージ',type:'visual',html:errorVisual(x)},
    {id:'mistakes',title:'注意点',type:'mistakes',items:getFriendlyMistakes(x)},
    {id:'related',title:'関連項目',type:'related',items:x.related||[]}
  ]}
}
function renderDetailSection(sec){
  let body='';
  if(sec.type==='plain') body=`<div class="doc-prose">${sec.html}</div>`;
  if(sec.type==='cards') body=`<div class="use-grid">${(sec.items||[]).map(v=>`<div class="use-card">${v}</div>`).join('')}</div>`;
  if(sec.type==='copyExamples') body=`<div class="copy-example-list">${(sec.items||[]).map(ex=>`<div class="copy-example-card"><div class="formula-preview"><span>${ex.formula||ex}</span><button class="copy" data-copy="${escapeHtml(ex.formula||ex)}">コピー</button></div>${ex.note?`<p>${ex.note}</p>`:''}${ex.replace?`<div class="replace-list">${ex.replace.map(r=>`<span>${r}</span>`).join('')}</div>`:''}</div>`).join('')}</div>`;
  if(sec.type==='replace') body=`<div class="replace-guide">${(sec.items||[]).map(v=>replaceItemCard(v)).join('')}</div>`;
  if(sec.type==='terms') body=`<div class="terms-table"><div class="terms-head"><span>EPAの言い方</span><span>Excel用語</span><span>例</span></div>${(sec.items||[]).map(r=>`<div><span>${r[0]}</span><span>${r[1]}</span><span>${r[2]}</span></div>`).join('')}</div>`;
  if(sec.type==='tips') body=learningBox('tips', sec.item);
  if(sec.type==='practical') body=learningBox('practical', sec.item);
  if(sec.type==='code') body=`<div class="formula-preview big"><span>${sec.code}</span><button class="copy" data-copy="${escapeHtml(sec.code)}">コピー</button></div>`;
  if(sec.type==='mistakes') body=`<div class="mistake-list">${(sec.items||[]).map(m=>`<div class="mistake"><strong>${m.title||m[0]}</strong><p>${m.text||m[1]}</p></div>`).join('')}</div>`;
  if(sec.type==='aiCheck') body=sec.html;
  if(sec.type==='related') body=`<div class="related-list">${(sec.items||[]).map(relatedChip).join('')}</div>`;
  if(sec.type==='steps') body=`<ol class="step-list">${(sec.items||[]).map((v,i)=>`<li><span>${i+1}</span><p>${v}</p></li>`).join('')}</ol>`;
  if(sec.type==='visual') body=sec.html;
  if(sec.type==='sample') body=sec.html;
  if(sec.type==='roleList') body=`<div class="role-list">${(sec.items||[]).map(r=>`<div><strong>${r.name}</strong><p>${r.role}</p></div>`).join('')}</div>`;
  if(sec.type==='shortcutTable') body=renderShortcutGroups(sec.groups||[]);
  return `<section id="${sec.id}" data-tool-section="${sec.id}" class="detail-section doc-section ${sec.id==='converter'?'converter-section':''}"><div class="section-heading"><h2>${sec.title}</h2></div>${body}</section>`;
}

function renderShortcutGroups(groups){
  return `<div class="shortcut-groups">${groups.map((group,gi)=>`<section class="shortcut-group-card"><div class="shortcut-group-head"><div><span>${String(gi+1).padStart(2,'0')}</span><h3>${group.title}</h3></div><p>${group.note||''}</p></div><div class="shortcut-table"><div class="shortcut-row shortcut-row-head"><span>キー</span><span>操作</span><span>説明</span></div>${(group.items||[]).map(item=>`<div class="shortcut-row"><span><kbd>${item[0]}</kbd></span><strong>${item[1]}</strong><p>${item[2]||''}</p></div>`).join('')}</div></section>`).join('')}</div>`
}

function relatedChip(r){const target=data.find(d=>d.id===r||d.title===r); return target?`<button class="related-chip" onclick="goDetail('${target.id}')">${target.title}</button>`:`<span class="related-chip disabled">${r}</span>`}
function functionVisual(x,guide){
  if(x.id==='XLOOKUP'||x.id==='VLOOKUP'||x.id==='INDEX_MATCH') return `<div class="visual-guide search-flow"><div><strong>探したいもの</strong><span>A2 / 社員番号</span></div><em>→</em><div><strong>一覧から探す</strong><span>社員番号一覧</span></div><em>→</em><div><strong>表示したいもの</strong><span>社員名・単価</span></div><button class="visual-open">拡大</button></div>`;
  if(x.id==='IF'||x.id==='IF_AND') return `<div class="visual-guide decision-flow"><div><strong>条件</strong><span>60点以上？</span></div><em>YES</em><div><strong>合格</strong></div><em>NO</em><div><strong>再確認</strong></div><button class="visual-open">拡大</button></div>`;
  return `<div class="visual-guide sheet-flow"><div class="mini-sheet"><span>B2</span><span>B3</span><span>B4</span><span>…</span></div><em>→</em><div><strong>合計・件数</strong><span>結果を表示</span></div><button class="visual-open">拡大</button></div>`;
}
function operationVisual(x){return `<div class="visual-guide ribbon-flow"><div><strong>1. 範囲を選択</strong><span>A1:D10</span></div><em>→</em><div><strong>2. ホーム</strong><span>リボン</span></div><em>→</em><div><strong>3. ${x.title}</strong><span>設定して完了</span></div><button class="visual-open">拡大</button></div>`}
function formattingVisual(x){return `<div class="visual-guide cf-flow"><div><strong>対象範囲</strong><span>A2:A100</span></div><em>→</em><div><strong>条件付き書式</strong><span>ルールを選択</span></div><em>→</em><div><strong>自動で色分け</strong><span>条件に合うセル</span></div><button class="visual-open">拡大</button></div>`}
function templateVisual(x){return `<div class="visual-guide template-flow"><div><strong>入力欄</strong><span>URL / 品番 / 数値</span></div><em>→</em><div><strong>自動処理</strong><span>計算・変換</span></div><em>→</em><div><strong>出力</strong><span>${x.title}</span></div><button class="visual-open">拡大</button></div>`}
function errorVisual(x){return `<div class="visual-guide error-flow"><div><strong>エラー</strong><span>${x.title}</span></div><em>→</em><div><strong>原因確認</strong><span>値・空白・型</span></div><em>→</em><div><strong>対処</strong><span>式やデータを修正</span></div><button class="visual-open">拡大</button></div>`}
function compoundRoles(x){
  if(x.id==='IF_AND') return [{name:'IF',role:'結果を「合格」「再確認」のように切り替える役割です。'},{name:'AND',role:'複数条件がすべてOKか確認する役割です。'}];
  if(x.id==='INDEX_MATCH') return [{name:'MATCH',role:'探したい値が何番目にあるか調べます。'},{name:'INDEX',role:'その位置にある値を表示します。'}];
  return [{name:x.title,role:x.summary}];
}
function operationSteps(x){
  if(x.id==='CELL_COLOR') return ['色を付けたいセルを選択する','ホームタブを開く','塗りつぶしの色を選ぶ','必要に応じて文字色も調整する'];
  if(x.id==='BORDER') return ['罫線を入れたい範囲を選択する','ホームタブを開く','罫線メニューを開く','格子・外枠などを選ぶ'];
  if(x.id==='PIVOT') return ['見出し付きの一覧表を用意する','挿入タブからピボットテーブルを選ぶ','行・列・値に項目を配置する','必要に応じて表示形式を整える'];
  return (x.examples||[x.syntax]).filter(Boolean);
}
function formattingSteps(x){
  if(x.id==='CF_DUPLICATE') return ['重複を確認したい範囲を選択する','ホーム → 条件付き書式を開く','セルの強調表示ルール → 重複する値を選ぶ','色を選んでOKを押す'];
  if(x.id==='CF_DEADLINE') return ['期限列を含む範囲を選択する','条件付き書式 → 新しいルールを開く','数式を使用してルールを作る','期限切れの条件式を入力して色を指定する'];
  return (x.examples||[x.syntax]).filter(Boolean);
}

function operationGoalBlock(x){return `<div class="goal-grid"><div>操作の目的が分かる</div><div>同じ手順を再現できる</div><div>よくあるミスを避けられる</div></div>`}
function operationTipsBlock(x){return `<div class="learning-box tips-box"><div class="learning-head"><span>💡</span><strong>Tips</strong></div><p>操作は手順だけでなく、意味を知っておくと応用しやすくなります。まずは「何を変える操作なのか」を確認しましょう。</p></div>`}
function operationPracticalBlock(x){return `<div class="learning-box practical-box"><div class="learning-head"><span>💼</span><strong>実務のポイント</strong></div><p>会議前や確認作業の前に使うと、見るべき場所をすばやく絞れます。</p></div>`}

function sortGoalBlock(){return `<div class="goal-grid"><div>昇順で並べ替えできる</div><div>降順で並べ替えできる</div><div>行の対応関係を崩さない</div><div>並べ替え前に確認する場所が分かる</div></div>`}
function sortCompleteVisual(){return `<div class="operation-preview sort-preview"><div class="sheet-caption">並べ替え前</div><div class="excel-like-grid sort-grid"><div class="cell head">品番</div><div class="cell head">担当者</div><div class="cell head">売上(円)</div><div class="cell head">判定</div><div class="cell">A005</div><div class="cell">田中</div><div class="cell">125000</div><div class="cell ok">OK</div><div class="cell">A002</div><div class="cell">佐藤</div><div class="cell">89000</div><div class="cell ng">NG</div><div class="cell">A006</div><div class="cell">鈴木</div><div class="cell">210000</div><div class="cell ok">OK</div></div><div class="filter-arrow">品番を昇順に並べ替え</div><div class="sheet-caption">並べ替え後</div><div class="excel-like-grid sort-grid"><div class="cell head">品番</div><div class="cell head">担当者</div><div class="cell head">売上(円)</div><div class="cell head">判定</div><div class="cell">A001</div><div class="cell">田中</div><div class="cell">56000</div><div class="cell ng">NG</div><div class="cell">A002</div><div class="cell">佐藤</div><div class="cell">89000</div><div class="cell ng">NG</div><div class="cell">A003</div><div class="cell">佐藤</div><div class="cell">99000</div><div class="cell ng">NG</div></div></div>`}
const sortScreenshotSteps=[
  {title:'1. データタブを開く',caption:'表の中を1か所クリックして、データタブを開きます。',src:'assets/screenshots/excel2019/sort/annotated/step1_data_tab.png'},
  {title:'2. 昇順（A→Z）をクリック',caption:'品番を小さい順に並べます。',src:'assets/screenshots/excel2019/sort/annotated/step2_sort_az.png'},
  {title:'3. 品番順に並びました',caption:'A001からA006の順になれば完了です。',src:'assets/screenshots/excel2019/sort/annotated/step3_asc_result.png'}
];
function sortClickGuide(){return `<div class="screenshot-step-list" aria-label="実際のExcel画面で操作を確認する">
  ${sortScreenshotSteps.map((step,i)=>`<article class="screenshot-step-card">
    <div class="screenshot-step-head"><span>${i+1}</span><div><strong>${step.title.replace(/^\d+\.\s*/,'')}</strong><p>${step.caption}</p></div></div>
    <div class="screenshot-frame"><img src="${step.src}" alt="${step.title}"><button class="screenshot-zoom" data-guide="sort" data-step="${i}">拡大</button></div>
  </article>`).join('')}
</div>`}
function sortTipsBlock(){return `<div class="learning-box tips-box"><div class="learning-head"><span>💡</span><strong>Tips</strong></div><p>表の中を1か所クリックすれば、Excelが表全体を見つけてくれます。</p><p>全部をドラッグして選ばなくても大丈夫です。</p></div>`}
function sortPracticalBlock(){return `<div class="learning-box practical-box"><div class="learning-head"><span>💼</span><strong>実務のポイント</strong></div><p>会議前に売上の高い順、日付の古い順、品番順に並べておくと、確認が早くなります。</p><p>並べ替える前に、表の途中だけを選んでいないか確認すると安全です。</p></div>`}
function sortAiCheckBlock(){return `<div class="ai-check-card operation-ai"><div class="ai-check-icon">AI</div><div><h3>「並べ替えがおかしい」と聞く前に</h3><p>AIに聞く前に、まず表の状態を確認しましょう。</p><ul><li><strong>表全体が一緒に並び替わっていますか？</strong><span>1列だけ動くと、品番と担当者の対応が崩れます。</span></li><li><strong>見出し行は残っていますか？</strong><span>品番・担当者・売上などの見出しは、データとして並べ替えません。</span></li><li><strong>数字が文字になっていませんか？</strong><span>売上や日付の順番がおかしい時は、データ型を確認します。</span></li></ul></div></div>`}
function sortDoneBlock(){return `<div class="done-grid"><div>☑ 昇順で並べ替えできる</div><div>☑ 降順で並べ替えできる</div><div>☑ 1列だけ並べ替える危険が分かる</div><div>☑ AIの回答も判断しやすくなる</div></div>`}
function filterGoalBlock(){return `<div class="goal-grid"><div>フィルターを設定できる</div><div>フィルターを解除できる</div><div>データは消えないと分かる</div><div>NGだけ表示できる</div></div>`}
function filterCompleteVisual(){return `<div class="operation-preview filter-preview"><div class="sheet-caption">フィルター前</div><div class="excel-like-grid"><div class="cell head">品番 ▼</div><div class="cell head">担当者 ▼</div><div class="cell head">判定 ▼</div><div class="cell head">対応状況 ▼</div><div class="cell">A001</div><div class="cell">田中</div><div class="cell ok">OK</div><div class="cell">完了</div><div class="cell">A002</div><div class="cell">佐藤</div><div class="cell ng">NG</div><div class="cell">未対応</div><div class="cell">A003</div><div class="cell">田中</div><div class="cell ng">NG</div><div class="cell">確認中</div></div><div class="filter-arrow">判定で「NG」だけ選ぶ</div><div class="sheet-caption">フィルター後</div><div class="excel-like-grid filtered"><div class="cell head">品番 ▼</div><div class="cell head">担当者 ▼</div><div class="cell head">判定 ▼</div><div class="cell head">対応状況 ▼</div><div class="cell">A002</div><div class="cell">佐藤</div><div class="cell ng">NG</div><div class="cell">未対応</div><div class="cell">A003</div><div class="cell">田中</div><div class="cell ng">NG</div><div class="cell">確認中</div></div></div>`}
const filterScreenshotSteps=[
  {title:'1. データタブを開く',caption:'表の中を1か所クリックしてから、データタブを開きます。',src:'assets/screenshots/excel2019/filter/annotated/step1_data_tab.png'},
  {title:'2. フィルターをクリック',caption:'リボンの「フィルター」をクリックします。見出しに▼が付きます。',src:'assets/screenshots/excel2019/filter/annotated/step2_filter_button.png'},
  {title:'3. 判定列の▼を開く',caption:'判定列の▼を開き、NGだけを残します。',src:'assets/screenshots/excel2019/filter/annotated/step3_dropdown_ng.png'},
  {title:'4. NGだけ表示',caption:'NGの行だけ表示されます。データは消えていません。',src:'assets/screenshots/excel2019/filter/annotated/step4_filtered_result.png'}
];
function filterClickGuide(){return `<div class="screenshot-step-list" aria-label="実際のExcel画面で操作を確認する">
  ${filterScreenshotSteps.map((step,i)=>`<article class="screenshot-step-card">
    <div class="screenshot-step-head"><span>${i+1}</span><div><strong>${step.title.replace(/^\d+\.\s*/,'')}</strong><p>${step.caption}</p></div></div>
    <div class="screenshot-frame"><img src="${step.src}" alt="${step.title}"><button class="screenshot-zoom" data-guide="filter" data-step="${i}">拡大</button></div>
  </article>`).join('')}
</div>`}
function filterTipsBlock(){return `<div class="learning-box tips-box"><div class="learning-head"><span>💡</span><strong>Tips</strong></div><p>フィルターは「削除」ではなく「一時的に隠す」機能です。</p><p>見えていない行もExcelの中には残っています。解除すると元に戻ります。</p></div>`}
function filterPracticalBlock(){return `<div class="learning-box practical-box"><div class="learning-head"><span>💼</span><strong>実務のポイント</strong></div><p>品質保証なら、NGだけ・未対応だけ・特定設備だけを表示すると確認が早くなります。</p><p>営業なら担当者別、事務なら未処理だけ、という使い方もできます。</p></div>`}
function filterAiCheckBlock(){return `<div class="ai-check-card operation-ai"><div class="ai-check-icon">AI</div><div><h3>「フィルターできない」と聞く前に</h3><p>AIに聞く前に、まず画面の状態を見てみましょう。</p><ul><li><strong>表の中をクリックしていますか？</strong><span>表の外を選んでいると、Excelが対象範囲を判断できないことがあります。</span></li><li><strong>見出し行はありますか？</strong><span>品番・担当者・判定のような見出しがあると、フィルターが使いやすくなります。</span></li><li><strong>結合セルはありませんか？</strong><span>結合セルがあると、範囲が正しく認識されないことがあります。</span></li><li><strong>すでに絞り込み中ではありませんか？</strong><span>データが少なく見える時は、まずフィルター解除を確認しましょう。</span></li></ul></div></div>`}
function operationSampleBlock(fileName,title){return `<div class="sample-excel-card"><div class="sample-excel-head"><div><span class="sample-kicker">練習用ファイル</span><h3>${title}</h3><p>完成イメージと同じ表で試せます。</p></div><a class="sample-download" href="assets/samples/${fileName}" download>この画面と同じExcelを開く</a></div></div>`}
function filterDoneBlock(){return `<div class="done-grid"><div>☑ フィルターを設定できる</div><div>☑ フィルターを解除できる</div><div>☑ データは消えないと説明できる</div><div>☑ AIの回答も判断しやすくなる</div></div>`}

function openVisualModal(html){
  let m=$('#visualModal'); if(!m){m=document.createElement('div');m.id='visualModal';m.className='visual-modal';document.body.appendChild(m)}
  m.innerHTML=`<div class="visual-modal-backdrop"></div><div class="visual-modal-card"><button class="visual-close">×</button>${html}</div>`;
  m.classList.add('show');
  $('.visual-close',m).onclick=()=>m.classList.remove('show');
  $('.visual-modal-backdrop',m).onclick=()=>m.classList.remove('show');
}
let currentScreenshotStep=0;
let activeScreenshotGuide='filter';
function getActiveScreenshotSteps(){if(activeScreenshotGuide==='sort')return sortScreenshotSteps;if(activeScreenshotGuide==='chart-column')return columnChartScreenshotSteps;if(activeScreenshotGuide==='conditional-formatting')return conditionalFormattingScreenshotSteps;if(activeScreenshotGuide==='pivot-basic')return pivotScreenshotSteps;return filterScreenshotSteps}
function openScreenshotModal(index,guide='filter'){
  currentScreenshotStep=index||0;
  activeScreenshotGuide=guide||'filter';
  renderScreenshotModal();
}
function renderScreenshotModal(){
  const steps=getActiveScreenshotSteps()||[];
  const step=steps[currentScreenshotStep];
  if(!step)return;
  let m=$('#screenshotModal');
  if(!m){m=document.createElement('div');m.id='screenshotModal';m.className='screenshot-modal';document.body.appendChild(m)}
  m.innerHTML=`<div class="screenshot-modal-backdrop"></div>
    <div class="screenshot-modal-card" role="dialog" aria-modal="true">
      <div class="screenshot-modal-head"><strong>${step.title}</strong><button class="screenshot-close" aria-label="閉じる">×</button></div>
      <div class="screenshot-modal-body"><img src="${step.src}" alt="${step.title}"></div>
      <div class="screenshot-modal-foot"><button class="screenshot-prev" ${currentScreenshotStep===0?'disabled':''}>前へ</button><div class="screenshot-stepper" aria-label="操作ステップ">${steps.map((_,i)=>`<span class="${i===currentScreenshotStep?'active':''}"></span>`).join('')}<strong>STEP ${currentScreenshotStep+1} / ${steps.length}</strong></div><button class="screenshot-next" ${currentScreenshotStep===steps.length-1?'disabled':''}>次へ</button></div>
    </div>`;
  m.classList.add('show');
  $('.screenshot-close',m).onclick=()=>m.classList.remove('show');
  $('.screenshot-modal-backdrop',m).onclick=()=>m.classList.remove('show');
  const prev=$('.screenshot-prev',m), next=$('.screenshot-next',m);
  if(prev)prev.onclick=()=>{if(currentScreenshotStep>0){currentScreenshotStep--;renderScreenshotModal()}};
  if(next)next.onclick=()=>{if(currentScreenshotStep<steps.length-1){currentScreenshotStep++;renderScreenshotModal()}};
}
document.addEventListener('keydown',e=>{
  const m=$('#screenshotModal');
  if(!m||!m.classList.contains('show'))return;
  if(e.key==='Escape')m.classList.remove('show');
  if(e.key==='ArrowLeft'&&currentScreenshotStep>0){currentScreenshotStep--;renderScreenshotModal()}
  if(e.key==='ArrowRight'&&currentScreenshotStep<getActiveScreenshotSteps().length-1){currentScreenshotStep++;renderScreenshotModal()}
});
function getBeginnerGuide(x){
  const title = x.title || x.id;
  const firstExample = (x.examples||[])[0] || x.syntax || '';
  const common={
    short:`${title}は、Excelでよく使う処理を効率よく行うための項目です。まずは例をコピーして、自分の表のセル番地に置き換えて使ってみましょう。`,
    bestFormula:firstExample,
    steps:['まず「何をしたいか」を決めます。','次に、対象になるセルや範囲を決めます。','最後に、コピーした式のセル番地だけ自分の表に合わせて変更します。'],
    words:(x.args||[]).map(a=>[a[0],a[0],'-',a[2]]),
    copyExamples:(x.examples||[]).map((f,i)=>({title:i?'別パターン':'まず使うならこれ',formula:f,note:'コピーしたあと、セル番地を自分の表に合わせて変更します。',replace:['セル範囲を変更']}))
  };

  const guides={
    SUM:{
      short:'選んだ範囲の数字を合計します。売上、数量、点数、検査数など、「まず合計したい」ときに一番よく使う関数です。',
      bestFormula:'=SUM(B2:B10)',
      steps:['合計したい数字が入っている範囲を確認します。','その範囲を SUM の中に入れます。','コピーしたら、B2:B10 の部分だけ自分の表に合わせて変更します。'],
      words:[
        ['合計したい範囲','number1','B2:B10','足したい数字が入っている範囲です。'],
        ['追加で足したい範囲','number2','D2:D10','離れた範囲も一緒に合計したいときだけ使います。']
      ],
      copyExamples:[
        {title:'列の合計',formula:'=SUM(B2:B10)',note:'B2:B10 を、合計したい範囲に変えるだけです。',replace:['B2:B10＝合計したい範囲']},
        {title:'横方向の合計',formula:'=SUM(C2:E2)',note:'同じ行の中で、複数月や複数項目を合計したいときに使います。',replace:['C2:E2＝横方向の範囲']},
        {title:'離れた範囲を合計',formula:'=SUM(B2:B10,D2:D10)',note:'離れた列をまとめて合計したいときに使います。',replace:['B2:B10 / D2:D10＝それぞれ合計したい範囲']}
      ]
    },
    IF:{
      short:'条件によって、表示する内容を切り替えます。「60点以上なら合格、それ以外なら不合格」のような判定に使います。',
      bestFormula:'=IF(C2>=60,"合格","不合格")',
      steps:['「どんな条件ならOKか」を決めます。','条件に合うときに表示する文字を決めます。','条件に合わないときに表示する文字を決めます。'],
      words:[
        ['もし〜なら','logical_test','C2>=60','判定したい条件です。'],
        ['条件に合うとき','value_if_true','"合格"','条件が正しいときに表示する内容です。'],
        ['それ以外のとき','value_if_false','"不合格"','条件が正しくないときに表示する内容です。']
      ],
      copyExamples:[
        {title:'点数で合否判定',formula:'=IF(C2>=60,"合格","不合格")',note:'C2 を点数のセルに、60 を基準点に変更します。',replace:['C2＝点数セル','60＝基準点','"合格"/"不合格"＝表示したい文字']},
        {title:'OK/NGで完了判定',formula:'=IF(D2="OK","完了","確認")',note:'文字を条件にするときは、OK のような文字を " " で囲みます。',replace:['D2＝判定セル','"OK"＝条件の文字','"完了"/"確認"＝表示したい文字']},
        {title:'空欄なら未入力',formula:'=IF(A2="","未入力","入力済み")',note:'空欄チェックでよく使います。A2 を確認したいセルに変えます。',replace:['A2＝確認したいセル','""＝空欄']}
      ]
    },
    COUNTIF:{
      short:'条件に合うセルが何個あるかを数えます。OK件数、不良件数、合格者数、未入力数などを数えるときに便利です。',
      bestFormula:'=COUNTIF(C2:C100,"NG")',
      steps:['どの範囲を見るかを決めます。','何を数えたいかを決めます。','文字を数えるときは、"NG" のようにダブルクォーテーションで囲みます。'],
      words:[
        ['どこを見る？','範囲','C2:C100','数えたいセルが並んでいる範囲です。'],
        ['何を数える？','条件','"NG"','数えたい文字や条件です。']
      ],
      copyExamples:[
        {title:'NG件数を数える',formula:'=COUNTIF(C2:C100,"NG")',note:'C2:C100 を判定列に、"NG" を数えたい文字に変えます。',replace:['C2:C100＝判定が入っている範囲','"NG"＝数えたい文字']},
        {title:'合格者数を数える',formula:'=COUNTIF(D2:D50,"合格")',note:'合格、不合格、未提出など、文字の件数を数えたいときに使います。',replace:['D2:D50＝結果が入っている範囲','"合格"＝数えたい文字']},
        {title:'80以上の件数を数える',formula:'=COUNTIF(B2:B100,">=80")',note:'以上・以下などの条件は、">=80" のように " " で囲みます。',replace:['B2:B100＝点数の範囲','">=80"＝80以上']}
      ]
    },
    XLOOKUP:{
      short:'一覧表から欲しい情報を探して表示します。社員番号から氏名、品番から単価など、「コードを入れたら対応する情報を出したい」ときに使います。',
      bestFormula:'=XLOOKUP(A2,$B$2:$B$100,$C$2:$C$100,"未登録")',
      steps:['探したいものを決めます。例：A2 の社員番号。','どこから探すかを決めます。例：B2:B100 の社員番号一覧。','何を表示したいかを決めます。例：C2:C100 の社員名。'],
      words:[
        ['探したいもの','検索値','A2','検索のキーになる値です。'],
        ['どこから探す？','検索配列','$B$2:$B$100','探したいものが並んでいる範囲です。'],
        ['何を表示する？','戻り配列','$C$2:$C$100','見つかった行から表示したい範囲です。戻り値より「表示したいもの」と考えると分かりやすいです。'],
        ['見つからないとき','見つからない場合','"未登録"','該当がないときに表示する文字です。']
      ],
      copyExamples:[
        {title:'社員番号から社員名を表示',formula:'=XLOOKUP(A2,$B$2:$B$100,$C$2:$C$100,"未登録")',note:'A2、B列、C列を自分の表に合わせて変えるだけです。',replace:['A2＝探したい社員番号','B2:B100＝社員番号一覧','C2:C100＝表示したい社員名一覧']},
        {title:'品番から単価を表示',formula:'=XLOOKUP(A2,商品表[品番],商品表[単価],"未登録")',note:'テーブルを使っている場合は、列名で指定できるので読みやすくなります。',replace:['商品表[品番]＝探す列','商品表[単価]＝表示する列']},
        {title:'見つからないときは空欄にする',formula:'=XLOOKUP(A2,$B$2:$B$100,$C$2:$C$100,"")',note:'該当なしを空欄にしたいときに使います。',replace:['""＝見つからないときは空欄']}
      ]
    },
    VLOOKUP:{
      short:'表の左端から値を探して、同じ行にある別の列の情報を表示します。古くからよく使われる検索関数です。',
      bestFormula:'=VLOOKUP(A2,$B$2:$E$100,3,FALSE)',
      steps:['探したいものを決めます。','検索する表を選びます。このとき、探す列が表の左端にある必要があります。','左から何列目を表示するかを数えます。最後はまず FALSE を入れます。'],
      words:[
        ['探したいもの','検索値','A2','検索のキーになる値です。'],
        ['検索する表','範囲','$B$2:$E$100','左端に検索値がある表です。'],
        ['表示する列番号','列番号','3','選んだ範囲の左から何列目を表示するかです。'],
        ['完全一致にする','検索方法','FALSE','実務ではまず FALSE がおすすめです。']
      ],
      copyExamples:[
        {title:'品番から単価を表示',formula:'=VLOOKUP(A2,$B$2:$E$100,3,FALSE)',note:'A2、表の範囲、列番号だけ変えれば使えます。',replace:['A2＝探したい品番','B2:E100＝商品表','3＝表示したい列番号','FALSE＝完全一致']},
        {title:'社員番号から部署を表示',formula:'=VLOOKUP(A2,$F$2:$H$100,2,FALSE)',note:'検索表の左から2列目を表示する例です。',replace:['F2:H100＝検索する表','2＝左から2列目']}
      ]
    },
    SUMIF:{
      short:'条件に合う行だけを合計します。担当者別、品番別、拠点別など「特定の条件だけ合計したい」ときに使います。',
      bestFormula:'=SUMIF(A2:A100,"東京",C2:C100)',
      steps:['条件を見る範囲を決めます。','どの条件だけ合計するかを決めます。','実際に合計する数値の範囲を決めます。'],
      words:[
        ['条件を見る場所','範囲','A2:A100','東京などの条件が入っている範囲です。'],
        ['条件','条件','"東京"','合計したい対象を決めます。'],
        ['合計する場所','合計範囲','C2:C100','実際に足し算する数値の範囲です。']
      ],
      copyExamples:[
        {title:'東京だけ売上を合計',formula:'=SUMIF(A2:A100,"東京",C2:C100)',note:'A列を条件列、C列を売上列に置き換えます。',replace:['A2:A100＝条件を見る範囲','"東京"＝条件','C2:C100＝合計する範囲']},
        {title:'品番A001だけ数量を合計',formula:'=SUMIF(B2:B100,"A001",D2:D100)',note:'品番別の数量集計などに使えます。',replace:['B2:B100＝品番の範囲','"A001"＝集計したい品番','D2:D100＝数量の範囲']}
      ]
    }
  };
  return guides[x.id]||common;
}



function sampleExcelBlock(x,guide){
  const fileMap={
    SUM:'SUM_sample.xlsx',
    IF:'IF_sample.xlsx',
    COUNTIF:'COUNTIF_sample.xlsx',
    SUMIF:'SUMIF_sample.xlsx',
    VLOOKUP:'VLOOKUP_sample.xlsx',
    XLOOKUP:'XLOOKUP_sample.xlsx',
    FILTER_OPERATION:'FILTER_operation_sample.xlsx',
    SORT_OPERATION:'SORT_operation_sample.xlsx'
  };
  const sampleFile=fileMap[x.id]||`${x.id}_sample.xlsx`;
  const file=`assets/samples/${sampleFile}`;
  const preview=getSamplePreview(x);
  return `<div class="sample-excel-card">
    <div class="sample-excel-head">
      <div>
        <span class="sample-kicker">練習用ファイル</span>
        <h3>この画面と同じExcelを開く</h3>
        <p>画面の表と同じ内容をExcelで確認できます。黄色のセルだけ変えて、結果がどう変わるか見てみましょう。</p>
      </div>
      <a class="sample-download" href="${file}" download>サンプルExcelを開く</a>
    </div>
    <div class="sample-preview-wrap">
      <div class="sample-preview-title">完成イメージ</div>
      <div class="sample-sheet">
        <div class="sample-row sample-header">${preview.headers.map(h=>`<span>${h}</span>`).join('')}</div>
        ${preview.rows.map((row,i)=>`<div class="sample-row ${i===preview.focusRow?'sample-focus-row':''}">${row.map((c,j)=>`<span class="${preview.highlightCols.includes(j)?'sample-edit-cell':''}">${c}</span>`).join('')}</div>`).join('')}
      </div>
    </div>
  </div>`;
}

function getSamplePreview(x){
  const id=x.id;
  if(id==='XLOOKUP') return {headers:['探す品番','商品表：品番','商品名','単価','結果'],rows:[['A002','A001','ボルト','120','ナット'],['','A002','ナット','80',''],['','A003','ワッシャ','30','']],highlightCols:[0],focusRow:0};
  if(id==='VLOOKUP') return {headers:['探す品番','品番','商品名','単価','結果'],rows:[['A002','A001','ボルト','120','80'],['','A002','ナット','80',''],['','A003','ワッシャ','30','']],highlightCols:[0],focusRow:0};
  if(id==='IF') return {headers:['点数','基準','判定','メモ'],rows:[['72','60','合格','60点以上なら合格'],['48','60','不合格','点数を変えて確認'],['90','60','合格','']],highlightCols:[0,1],focusRow:0};
  if(id==='COUNTIF') return {headers:['No','判定','数える文字','NG件数'],rows:[['1','OK','NG','2'],['2','NG','',''],['3','NG','',''],['4','OK','','']],highlightCols:[2],focusRow:0};
  if(id==='SUMIF') return {headers:['拠点','品番','売上','条件','合計'],rows:[['東京','A001','1200','東京','3200'],['大阪','A001','900','',''],['東京','A002','2000','','']],highlightCols:[3],focusRow:0};
  return {headers:['日付','品番','数量','単価','金額'],rows:[['7/1','A001','5','120','600'],['7/2','A002','3','80','240'],['7/3','A003','10','30','300'],['合計','','18','','1140']],highlightCols:[2,3],focusRow:3};
}

function aiCheckBlock(x){
  const title=x.title||'この式';
  const formula=(getBeginnerGuide(x).copyExamples?.[0]?.formula)||x.syntax||'';
  return `<div class="ai-check-card">
    <div class="ai-check-lead">
      <span class="ai-check-icon">AI</span>
      <div>
        <p class="ai-check-title">AIで作った式も、最後は人が確認します。</p>
        <p>AIは便利です。ただ、あなたの表の場所や列名までは正確に分からないことがあります。${title}を使う前に、次の4点だけ確認しましょう。</p>
      </div>
    </div>
    <div class="ai-check-grid ai-check-grid-readable">
      <div><strong>1. 範囲</strong><span>どこのセルを計算するかです。AIの式が <code>A2:A100</code> でも、実際の表は <code>B2:B250</code> かもしれません。</span></div>
      <div><strong>2. $ 固定</strong><span><code>$</code> は「コピーしても動かさない」記号です。同じ表や基準セルを見続けたい時に使います。</span></div>
      <div><strong>3. 条件</strong><span>何を探すか、何を集計するかです。文字・数値・日付が目的どおりになっているか確認します。</span></div>
      <div><strong>4. 結果</strong><span>一番上だけでなく、途中と最後も見ます。急に0になったり大きくなったら、式がずれているかもしれません。</span></div>
    </div>
    ${formula?`<div class="ai-check-example"><span>確認する式の例</span><code>${escapeHtml(formula)}</code></div>`:''}
    <p class="ai-check-note">式を直せるようになると、AIの答えも自分で判断できるようになります。</p>
  </div>`;
}

function replaceItemCard(v){
  const text=String(v||'');
  const parts=text.split('＝');
  if(parts.length>=2) return `<div><strong>${parts[0]}</strong><span>${parts.slice(1).join('＝')}</span></div>`;
  return `<div><strong>${text}</strong><span>自分の表に合わせて変更します</span></div>`;
}

function learningBox(kind,item){
  const data=item||{};
  const cls=kind==='tips'?'epa-learning-box tips-box':'epa-learning-box practical-box';
  const icon=kind==='tips'?'💡':'💼';
  return `<div class="${cls}">
    <div class="learning-head"><span>${icon}</span><strong>${data.title||''}</strong></div>
    <p>${data.text||''}</p>
    ${data.points?.length?`<ul>${data.points.map(p=>`<li>${p}</li>`).join('')}</ul>`:''}
  </div>`;
}

function getTips(x){
  const map={
    SUM:{title:'範囲は「どこからどこまで足すか」です',text:'SUMで一番大事なのは、関数名よりも範囲です。数字が増えた時に範囲から外れていないかを見るクセを付けると、集計ミスを減らせます。',points:['途中に空白行がある表は、範囲漏れに注意します。','合計結果が小さい時は、範囲が途中で切れていないか確認します。']},
    IF:{title:'IFは「条件・合う時・それ以外」に分けて読む',text:'IFが難しく見える時は、式を3つに分けます。まず条件を見て、次に条件に合う時、最後にそれ以外の時を確認します。',points:['文字を表示する時は "合格" のように囲みます。','条件が増えすぎたら、IFSやANDも候補にします。']},
    XLOOKUP:{title:'戻り範囲は「表示したいもの」と考える',text:'XLOOKUPの「戻り範囲」は少し難しい言葉です。まずは「見つかったら何を表示したいか」と考えると分かりやすくなります。',points:['探す列と表示する列は、同じ行数にします。','新しく作るなら、VLOOKUPよりXLOOKUPの方が読みやすいことが多いです。']},
    VLOOKUP:{title:'列番号は、選んだ表の左から数えます',text:'VLOOKUPでよくあるミスは列番号です。Excelの列番号ではなく、自分が選んだ表の左端を1列目として数えます。',points:['実務では、まず FALSE（完全一致）で使うと安心です。','探す列は、選んだ表の一番左に置きます。']},
    COUNTIF:{title:'条件は「何を数えたいか」です',text:'COUNTIFは、範囲の中から条件に合うセルを数えます。文字を数える時は "NG" のように囲みます。',points:['以上・以下も ">=80" のように囲みます。','空白や未入力を数える時にも使えます。']},
    SUMIF:{title:'条件を見る場所と合計する場所は別です',text:'SUMIFは「条件を見る範囲」と「合計する範囲」を分けて考えます。ここを混ぜると結果がずれます。',points:['担当者別、品番別、拠点別の集計に向いています。','条件が2つ以上ならSUMIFSを使います。']}
  };
  return map[x.id]||{title:'式は小さく分けて読む',text:'長い式でも、見る場所・条件・表示する内容に分けると理解しやすくなります。',points:['まずは小さな表で試します。','動いたら実務データに置き換えます。']};
}

function getPracticalPoint(x){
  const map={
    SUM:{title:'合計欄は、あとから行が増える前提で作ります',text:'売上表や検査数の表は、あとから行が増えることが多いです。範囲を広めに取るか、テーブル化しておくと保守しやすくなります。',points:['月次集計、検査数、在庫数などでよく使います。','会議資料に使う前に、合計元の範囲を確認します。']},
    IF:{title:'判定列を作ると、確認作業が楽になります',text:'OK/NG、合格/不合格、要確認などをIFで出しておくと、あとでフィルターや集計がしやすくなります。',points:['品質判定、提出確認、期限チェックでよく使います。','表示文字は部署内で統一しておくと集計しやすいです。']},
    XLOOKUP:{title:'マスタ表から情報を引く時に使います',text:'社員番号から氏名、品番から単価、ロットNoから判定結果など、別表から必要な情報を持ってくる時に便利です。',points:['マスタ表は列名を分かりやすくしておくと後で直しやすいです。','見つからない時の表示を入れておくと、未登録に気づけます。']},
    VLOOKUP:{title:'既存ファイルでは今もよく出てきます',text:'新しく作るならXLOOKUPがおすすめですが、会社の古いファイルではVLOOKUPが多く残っています。読めるようにしておくと役立ちます。',points:['列を追加すると列番号がずれることがあります。','表の左端に探す値があるか確認します。']},
    COUNTIF:{title:'件数確認に強い関数です',text:'NG件数、未入力件数、対象件数など、「何件あるか」をすぐ確認できます。チェック作業の最初に使いやすい関数です。',points:['重複チェックにも使えます。','件数が合わない時は条件の文字ゆれを確認します。']},
    SUMIF:{title:'条件別集計の入口になる関数です',text:'担当者別、品番別、拠点別など、1つの条件で合計したい時に使います。条件が複数になったらSUMIFSに進みます。',points:['まずはSUMIFで考えると集計の流れを理解しやすいです。','条件列と合計列の行数をそろえます。']}
  };
  return map[x.id]||{title:'仕事の表に置き換えて使います',text:'サンプル式はそのまま覚えるより、どこを自分の表に置き換えるかを確認して使います。',points:['セル番地だけでなく、列の意味も確認します。','結果が正しいか数件だけ照合します。']};
}

function detailCanDo(x){
  const map={SUM:['範囲内の数値を合計する','行方向・列方向の合計を出す','売上・数量・検査数を集計する','基本集計の土台を作る'],IF:['条件によって表示を切り替える','合格/不合格を判定する','OK/NGのチェック列を作る','複数条件の考え方につなげる'],VLOOKUP:['コードから名称や単価を取得する','商品マスタや顧客マスタを参照する','別表の情報を転記する','検索エラーの原因を確認する'],XLOOKUP:['検索範囲と表示したい範囲を分けて指定する','左方向検索にも対応する','見つからない場合の表示を指定する','VLOOKUPを置き換える'],COUNTIF:['条件に一致する件数を数える','OK/NG件数を集計する','重複や対象件数を確認する','条件付き集計の基礎にする'],SUMIF:['条件に一致する数値だけ合計する','担当者別・品番別に集計する','月別や拠点別の集計に使う','SUMIFSへの理解につなげる']};
  return map[x.id]||['目的に合うExcel操作を確認する','小さな例で動作を試す','実務データへ置き換える','関連項目へ理解を広げる'];
}
function detailPractical(x){
  const base=(x.purpose||['集計','確認','資料作成']).slice(0,4);
  const icons=['📊','📦','🧪','🧾'];
  return base.map((p,i)=>({icon:icons[i%icons.length],title:p,text:`${p}の一覧表で、${x.title}を使って確認・集計・参照を効率化します。`}));
}
function getFriendlyMistakes(x){
  const maps={
    COUNTIF:[{title:'文字を " " で囲んでいない',text:'合格、NG、東京などの文字を条件にするときは、必ずダブルクォーテーションで囲みます。',fix:'=COUNTIF(C2:C100,"NG")'},{title:'以上・以下の条件を書き間違える',text:'>=80 のような条件も文字として指定するため、" "+条件の形にします。',fix:'=COUNTIF(B2:B100,">=80")'}],
    XLOOKUP:[{title:'検索範囲と表示したい範囲を逆にする',text:'検索範囲は「探す場所」、戻り範囲は「表示したいもの」です。戻り値という言葉より、表示したいものと考えると分かりやすいです。',fix:'=XLOOKUP(A2,$B$2:$B$100,$C$2:$C$100,"未登録")'},{title:'範囲の行数がそろっていない',text:'検索範囲と表示したい範囲は、同じ行数にします。'}],
    IF:[{title:'文字を " " で囲んでいない',text:'合格、不合格、OKなどの文字を表示するときはダブルクォーテーションで囲みます。',fix:'=IF(C2>=60,"合格","不合格")'}],
    VLOOKUP:[{title:'列番号を数え間違える',text:'列番号は、選んだ範囲の左端を1列目として数えます。'},{title:'完全一致のFALSEを入れていない',text:'実務ではまずFALSEを入れて完全一致にすると安心です。',fix:'=VLOOKUP(A2,$B$2:$E$100,3,FALSE)'}]
  };
  return maps[x.id] || (x.mistakes||[]).map(m=>({title:m[0],text:m[1]}));
}
function detailAdvice(x){
  if(x.id==='XLOOKUP') return '「戻り範囲」は、まず「表示したいもの」と読み替えると理解しやすいです。';
  if(x.id==='VLOOKUP') return '検索方法はまず FALSE（完全一致）で考えると、実務でのミスを減らしやすいです。';
  if(x.id==='IF') return '条件・合うとき・それ以外の3つに分けて読むと、複雑な式も理解しやすくなります。';
  if(x.id==='SUM') return 'コピーしたら、まず範囲だけ自分の表に合わせて変えれば使えます。';
  if(x.id==='COUNTIF') return '文字を数えるときは "NG" のように、ダブルクォーテーションを忘れないようにしましょう。';
  return 'まずは小さな表で動作確認してから、実務データに使うと安心です。';
}
function friendlyExampleBlock(x,guide){
  const ex=guide.copyExamples[0];
  return `<div class="excel-demo"><div class="excel-table"><div class="cell head">行</div><div class="cell head">例</div><div class="cell">探す/見るセル</div><div class="cell">A2</div><div class="cell">対象範囲</div><div class="cell">B2:B100</div><div class="cell">表示/合計範囲</div><div class="cell">C2:C100</div></div><div class="example-side"><p>コピーして使う式</p><div class="formula-preview"><span>${ex.formula}</span><button class="copy" data-copy="${escapeHtml(ex.formula)}">コピー</button></div><small>${ex.note}</small><div class="replace-list example-replace">${ex.replace.map(r=>`<span>${r}</span>`).join('')}</div></div></div>`
}
function escapeHtml(s){return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function copyText(s){
  if(navigator.clipboard && window.isSecureContext){navigator.clipboard.writeText(s).then(()=>showToast('コピーしました')).catch(()=>fallbackCopy(s));}
  else fallbackCopy(s);
}
function fallbackCopy(s){const ta=document.createElement('textarea');ta.value=s;ta.style.position='fixed';ta.style.left='-9999px';document.body.appendChild(ta);ta.focus();ta.select();try{document.execCommand('copy');showToast('コピーしました')}catch{showToast('コピーできませんでした')}ta.remove();}
function showToast(msg){let t=$('#toast'); if(!t){t=document.createElement('div');t.id='toast';t.className='toast';document.body.appendChild(t)} t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1500)}
initHome(); initSearch(); initDetail();
