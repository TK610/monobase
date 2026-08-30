(function(){
  const categories={
    length:{name:'長さ',icon:'↔',group:'general',units:{mm:[1,'mm'],cm:[10,'cm'],m:[1000,'m'],um:[0.001,'μm'],nm:[0.000001,'nm'],angstrom:[0.0000001,'Å'],inch:[25.4,'inch'],ft:[304.8,'ft']}},
    mass:{name:'質量',icon:'⚖',group:'general',units:{ug:[0.000001,'μg'],mg:[0.001,'mg'],g:[1,'g'],kg:[1000,'kg'],t:[1000000,'t'],oz:[28.349523125,'oz'],lb:[453.59237,'lb']}},
    area:{name:'面積',icon:'□',group:'general',units:{mm2:[1,'mm²'],cm2:[100,'cm²'],m2:[1000000,'m²'],in2:[645.16,'inch²']}},
    volume:{name:'体積',icon:'▣',group:'general',units:{mm3:[0.001,'mm³'],cm3:[1,'cm³'],uL:[0.001,'μL'],mL:[1,'mL'],L:[1000,'L'],m3:[1000000,'m³']}},
    temperature:{name:'温度',icon:'℃',group:'general',temperature:true,units:{C:[0,'℃'],F:[0,'℉'],K:[0,'K']}},
    pressure:{name:'圧力・真空',icon:'P',group:'general',units:{Pa:[1,'Pa'],kPa:[1000,'kPa'],MPa:[1000000,'MPa'],bar:[100000,'bar'],mbar:[100,'mbar'],Torr:[133.32236842105263,'Torr'],mTorr:[0.13332236842105263,'mTorr'],atm:[101325,'atm'],psi:[6894.757293168,'psi']}},
    density:{name:'密度',icon:'ρ',group:'general',units:{gcm3:[1,'g/cm³'],kgm3:[0.001,'kg/m³'],gL:[0.001,'g/L'],kgL:[1,'kg/L']}},
    flow:{name:'流量',icon:'⇢',group:'general',units:{sccm:[1,'sccm'],slm:[1000,'slm'],mLs:[60,'mL/s'],Lmin:[1000,'L/min']}},
    fraction:{name:'質量割合',icon:'%',group:'analysis',analysis:true,units:{percent:[0.01,'%'],wtpercent:[0.01,'wt%'],ppm:[1e-6,'ppm'],ppb:[1e-9,'ppb'],ppt:[1e-12,'ppt'],mgkg:[1e-6,'mg/kg'],ugg:[1e-6,'μg/g'],ugkg:[1e-9,'μg/kg'],ngg:[1e-9,'ng/g']}},
    liquid:{name:'質量濃度',icon:'滴',group:'analysis',analysis:true,units:{gL:[1,'g/L'],mgL:[0.001,'mg/L'],ugL:[0.000001,'μg/L'],ngL:[0.000000001,'ng/L'],mgmL:[1,'mg/mL']}},
    molarity:{name:'モル濃度',icon:'mol',group:'analysis',analysis:true,units:{molL:[1,'mol/L'],mmolL:[0.001,'mmol/L'],umolL:[0.000001,'μmol/L'],nmolL:[0.000000001,'nmol/L']}},
    film:{name:'膜厚',icon:'▱',group:'analysis',analysis:true,units:{angstrom:[0.1,'Å'],nm:[1,'nm'],um:[1000,'μm'],mm:[1000000,'mm']}},
    composition:{name:'組成（wt%・mol%・at%）',icon:'Σ',group:'analysis',composition:true,units:{}}
  };
  let precisionMode=localStorage.getItem('epa_precision_mode')||'auto';
  const trimZeros=s=>String(s).replace(/(\.\d*?[1-9])0+(?=E|$)/,'$1').replace(/\.0+(?=E|$)/,'').replace('e','E');
  const addThousands=s=>{
    const parts=String(s).split('.');
    const sign=parts[0].startsWith('-')?'-':'';
    const integer=(sign?parts[0].slice(1):parts[0]).replace(/\B(?=(\d{3})+(?!\d))/g,',');
    return sign+integer+(parts.length>1?'.'+parts[1]:'');
  };
  const plain=n=>addThousands(trimZeros(n));
  const fmt=n=>{
    if(!Number.isFinite(n))return '—';
    if(Object.is(n,-0)||n===0)return '0';
    const a=Math.abs(n);
    if(precisionMode!=='auto'){
      const d=Number(precisionMode);
      if(a<Math.pow(10,-d)||a>=1e15)return trimZeros(n.toExponential(Math.max(1,d-1)));
      return plain(n.toFixed(d));
    }
    // EPA表示仕様 Ver.1.1：人が読める範囲はカンマ区切りを優先する。
    // 本当に極端な値だけ指数表記へ切り替える。
    if(a<1e-6||a>=1e15)return trimZeros(n.toExponential(3));
    if(a>=1)return plain(n.toFixed(4));
    const decimals=Math.min(10,Math.max(6,Math.ceil(-Math.log10(a))+3));
    return plain(n.toFixed(decimals));
  };
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function temp(v,f,t){const c=f==='C'?v:f==='F'?(v-32)*5/9:v-273.15;return t==='C'?c:t==='F'?c*9/5+32:c+273.15;}
  function init(){
    const root=document.getElementById('converterToolView');if(!root)return;
    root.innerHTML=`<div class="converter-shell">
      <div class="converter-mode-switch"><div class="converter-mode-head"><span>変換モード</span><label>表示桁数<select id="precisionMode"><option value="auto">自動（推奨）</option><option value="2">小数2桁</option><option value="4">小数4桁</option><option value="6">小数6桁</option></select></label></div><div class="converter-tabs" id="converterTabs"><button data-group="general"><b>↔</b><span>一般単位</span><small>長さ・質量・温度など</small></button><button class="active" data-group="analysis"><b>Σ</b><span>分析値</span><small>濃度・組成・膜厚など</small></button></div></div>
      <section id="singleConverterPanel">
        <div class="quick-conversions"><span>よく使う変換</span><button data-quick="length,mm,inch">mm ⇄ inch</button><button data-quick="mass,kg,lb">kg ⇄ lb</button><button data-quick="pressure,Pa,Torr">Pa ⇄ Torr</button><button data-quick="film,nm,angstrom">nm ⇄ Å</button><button data-quick="fraction,ppm,wtpercent">ppm ⇄ wt%</button></div>
        <div class="converter-category-wrap"><h3>変換カテゴリ</h3><div class="converter-categories" id="convCategories"></div></div>
        <div class="converter-workspace">
          <section class="converter-card input-card">
            <div class="converter-pair"><label>変換前<div><input id="convValue" type="number" step="any" value=""><select id="convFrom"></select></div></label><button id="convSwap" type="button" title="単位を入れ替え">⇄</button><label>変換後<div class="to-unit-row"><select id="convTo"></select></div></label></div>
            <div class="converter-result-card"><span>変換結果</span><strong id="convResult">—</strong><p id="convEquation">—</p><button id="convCopy" class="converter-copy" type="button">▣ 結果をコピー</button></div>
          </section>
          <aside class="converter-learning"><details open><summary>計算方法</summary><div id="convFormula"></div></details><details open><summary>単位の意味</summary><div id="convMeaning"></div><div id="unitLearningLink"></div></details><details class="warning"><summary>注意事項</summary><div id="convNote"></div></details></aside>
        </div>
      </section>
      <section id="compositionPanel" hidden>${compositionMarkup()}</section>
      <section class="converter-history"><div><h3>最近使った変換</h3><button id="clearConvHistory" type="button">履歴を消去</button></div><div id="convHistoryList"></div></section>
    </div>`;
    const from=root.querySelector('#convFrom'),to=root.querySelector('#convTo'),value=root.querySelector('#convValue');
    let group='analysis',currentCategory='fraction';
    function visibleCategories(){return Object.entries(categories).filter(([,c])=>c.group===group);}
    function showCategoryPanel(){const isComp=categories[currentCategory]?.composition===true;root.querySelector('#singleConverterPanel').hidden=isComp;root.querySelector('#compositionPanel').hidden=!isComp;root.querySelector('.converter-history').hidden=isComp;updateLearningLink();}
    function drawCategories(){const list=visibleCategories();if(!list.some(([k])=>k===currentCategory))currentCategory=list[0][0];root.querySelector('#convCategories').innerHTML=list.map(([k,c])=>`<button class="category-card ${k===currentCategory?'active':''}" data-category="${k}"><b>${c.icon}</b><span>${c.name}</span></button>`).join('');root.querySelectorAll('.category-card').forEach(b=>b.onclick=()=>{currentCategory=b.dataset.category;drawCategories();showCategoryPanel();if(!categories[currentCategory].composition)fillUnits();});}
    function fillUnits(){const c=categories[currentCategory];if(!c||c.composition)return;const opts=Object.entries(c.units).map(([k,v])=>`<option value="${k}">${v[1]}</option>`).join('');from.innerHTML=opts;to.innerHTML=opts;if(to.options.length>1)to.selectedIndex=1;calc();}
    function infoFor(cat){
      if(cat==='fraction')return ['ppmは100万分の1、ppbは10億分の1を表します。','wt%・ppm・ppbを直接変換するときは、同じ質量基準で比べていることを確認してください。'];
      if(cat==='liquid')return ['溶液1 Lあたりに含まれる成分の質量を表します。','mg/Lとppmは常に同じではありません。溶液密度が約1.00 kg/Lの場合に近い値になります。'];
      if(cat==='molarity')return ['溶液1 Lあたりの物質量を表します。mol/Lはモル濃度です。','g/Lやmg/Lとの変換には対象成分の分子量が必要です。この画面ではモル濃度同士のみを直接変換します。'];
      if(cat==='pressure')return ['PaはSI単位、Torrやmbarは真空分野でよく使われる圧力単位です。','絶対圧とゲージ圧を混同しないでください。Torrは 1 atm = 760 Torr を基準にしています。'];
      if(cat==='film')return ['Å、nm、μmは薄膜や表面処理の厚さで使われます。1 nm = 10 Åです。','測定装置の表示桁数を超えて丸めすぎないよう注意してください。'];
      if(cat==='temperature')return ['℃、℉、Kは温度の尺度で、基準点が異なります。','温度は倍率だけでなく基準点（オフセット）も変わります。'];
      if(cat==='length')return ['長さの単位を変換します。inchを使う場合は、1 inch = 25.4 mmです。','図面・仕様書では単位記号まで確認してください。'];
      return ['同じ種類の物理量を、異なる単位へ換算します。','入力値と単位を確認し、必要な有効数字に丸めて使用してください。'];
    }

    function referenceFor(cat,fu,tu,v,result){
      const c=categories[cat], fl=c.units[fu]?.[1]||fu, tl=c.units[tu]?.[1]||tu;
      const key=`${fu}>${tu}`;
      const curated={
        'length:mm>inch':{lines:['1 inch = 25.4 mm','1 inch = 2.54 cm'],calc:`${fmt(v)} mm ÷ 25.4 = ${fmt(result)} inch`},
        'length:cm>inch':{lines:['1 inch = 2.54 cm','10 inch = 25.4 cm'],calc:`${fmt(v)} cm ÷ 2.54 = ${fmt(result)} inch`},
        'length:inch>mm':{lines:['1 inch = 25.4 mm','1 inch = 2.54 cm'],calc:`${fmt(v)} inch × 25.4 = ${fmt(result)} mm`},
        'length:inch>cm':{lines:['1 inch = 2.54 cm','10 inch = 25.4 cm'],calc:`${fmt(v)} inch × 2.54 = ${fmt(result)} cm`},
        'mass:kg>lb':{lines:['1 kg ≒ 2.2046 lb','1 lb = 453.592 g'],calc:`${fmt(v)} kg × 2.2046 ≒ ${fmt(result)} lb`},
        'mass:lb>kg':{lines:['1 lb = 0.453592 kg','1 kg ≒ 2.2046 lb'],calc:`${fmt(v)} lb × 0.453592 ≒ ${fmt(result)} kg`},
        'pressure:Pa>Torr':{lines:['1 Torr ≒ 133.322 Pa','760 Torr = 1 atm'],calc:`${fmt(v)} Pa ÷ 133.322 ≒ ${fmt(result)} Torr`},
        'pressure:Torr>Pa':{lines:['1 Torr ≒ 133.322 Pa','760 Torr = 1 atm'],calc:`${fmt(v)} Torr × 133.322 ≒ ${fmt(result)} Pa`},
        'film:nm>angstrom':{lines:['1 nm = 10 Å','100 nm = 1,000 Å'],calc:`${fmt(v)} nm × 10 = ${fmt(result)} Å`},
        'film:angstrom>nm':{lines:['10 Å = 1 nm','1 Å = 0.1 nm'],calc:`${fmt(v)} Å ÷ 10 = ${fmt(result)} nm`},
        'fraction:ppm>wtpercent':{lines:['1 wt% = 10,000 ppm','1,000 ppm = 0.1 wt%'],calc:`${fmt(v)} ppm ÷ 10,000 = ${fmt(result)} wt%`},
        'fraction:wtpercent>ppm':{lines:['1 wt% = 10,000 ppm','100 ppm = 0.01 wt%'],calc:`${fmt(v)} wt% × 10,000 = ${fmt(result)} ppm`},
        'fraction:percent>ppb':{lines:['1 % = 10,000,000 ppb','0.001 % = 10,000 ppb'],calc:`${fmt(v)} % × 10,000,000 = ${fmt(result)} ppb`},
        'fraction:ppb>percent':{lines:['10,000,000 ppb = 1 %','10,000 ppb = 0.001 %'],calc:`${fmt(v)} ppb ÷ 10,000,000 = ${fmt(result)} %`},
        'fraction:percent>ppt':{lines:['1 % = 10,000,000,000 ppt','0.001 % = 10,000,000 ppt'],calc:`${fmt(v)} % × 10,000,000,000 = ${fmt(result)} ppt`},
        'fraction:ppt>percent':{lines:['10,000,000,000 ppt = 1 %','10,000,000 ppt = 0.001 %'],calc:`${fmt(v)} ppt ÷ 10,000,000,000 = ${fmt(result)} %`},
        'fraction:wtpercent>ppb':{lines:['1 wt% = 10,000,000 ppb','0.001 wt% = 10,000 ppb'],calc:`${fmt(v)} wt% × 10,000,000 = ${fmt(result)} ppb`},
        'fraction:ppb>wtpercent':{lines:['10,000,000 ppb = 1 wt%','10,000 ppb = 0.001 wt%'],calc:`${fmt(v)} ppb ÷ 10,000,000 = ${fmt(result)} wt%`},
        'fraction:wtpercent>ppt':{lines:['1 wt% = 10,000,000,000 ppt','0.001 wt% = 10,000,000 ppt'],calc:`${fmt(v)} wt% × 10,000,000,000 = ${fmt(result)} ppt`},
        'fraction:ppt>wtpercent':{lines:['10,000,000,000 ppt = 1 wt%','10,000,000 ppt = 0.001 wt%'],calc:`${fmt(v)} ppt ÷ 10,000,000,000 = ${fmt(result)} wt%`}
      };
      const hit=curated[`${cat}:${key}`];
      if(hit)return hit;
      if(c.temperature)return {lines:['温度は倍率だけでなく、基準点も変わります。'],calc:`${fmt(v)} ${fl} → ${fmt(result)} ${tl}`};
      const ratio=c.units[fu][0]/c.units[tu][0];
      const inv=c.units[tu][0]/c.units[fu][0];
      if(inv>=1 && inv<1000000)return {lines:[`1 ${tl} = ${fmt(inv)} ${fl}`],calc:`${fmt(v)} ${fl} ÷ ${fmt(inv)} = ${fmt(result)} ${tl}`};
      return {lines:[`1 ${fl} = ${fmt(ratio)} ${tl}`],calc:`${fmt(v)} ${fl} × ${fmt(ratio)} = ${fmt(result)} ${tl}`};
    }
    function calc(){const c=categories[currentCategory],v=Number(value.value),fu=from.value,tu=to.value;if(!Number.isFinite(v)){root.querySelector('#convResult').textContent='—';return;}const result=c.temperature?temp(v,fu,tu):v*c.units[fu][0]/c.units[tu][0];const fl=c.units[fu][1],tl=c.units[tu][1];const line=`${fmt(v)} ${fl} = ${fmt(result)} ${tl}`;root.querySelector('#convResult').innerHTML=`<span class="conv-result-number">${esc(fmt(result))}</span><span class="conv-result-unit">${esc(tl)}</span>`;root.querySelector('#convEquation').textContent=line;const ref=referenceFor(currentCategory,fu,tu,v,result);const calcParts=String(ref.calc).split(/\s(=|≒)\s/);
      const calcMarkup=calcParts.length>=3
        ? `<p class="current-calculation"><span class="calc-left">${esc(calcParts[0])}</span><span class="calc-equals">${esc(calcParts[1])}</span><span class="calc-right">${esc(calcParts.slice(2).join(' '))}</span></p>`
        : `<p class="current-calculation"><span class="calc-left">${esc(ref.calc)}</span></p>`;
      root.querySelector('#convFormula').innerHTML=`<div class="conversion-reference"><h4>基準値</h4>${ref.lines.map(x=>`<p>${esc(x)}</p>`).join('')}<h4>今回の計算</h4>${calcMarkup}</div>`;const [meaning,note]=infoFor(currentCategory);const meaningEl=root.querySelector('#convMeaning');meaningEl.textContent=meaning;root.querySelector('#convNote').textContent=note;root.dataset.last=line;updateLearningLink();}
    
    function updateLearningLink(){
      const box=root.querySelector('#unitLearningLink');
      if(!box)return;
      const fu=from.value,tu=to.value;
      let href='',label='';
      if(currentCategory==='length'&&(fu==='inch'||tu==='inch')){
        href='unit_learning_inch.html';label='inchを詳しく学ぶ';
      }else if(currentCategory==='fraction'&&(['ppm','ppb','ppt','percent','wtpercent'].includes(fu)||['ppm','ppb','ppt','percent','wtpercent'].includes(tu))){
        href='unit_learning_ppm_ppb.html';label='ppm・ppb・wt%を詳しく学ぶ';
      }else if(currentCategory==='composition'){
        href='unit_learning_composition.html';label='wt%・mol%・at%を詳しく学ぶ';
      }else if(currentCategory==='pressure'&&(fu==='Pa'||tu==='Pa'||fu==='Torr'||tu==='Torr')){
        href='learning_vacuum_pa.html';label='Pa・Torrを詳しく学ぶ';
      }
      box.innerHTML=href?`<a class="unit-learning-link" href="${href}">この単位を詳しく学ぶ → <strong>${label}</strong></a>`:'';
    }
function addHistory(text){if(!text||text.includes('—'))return;let h=[];try{h=JSON.parse(localStorage.getItem('epa_conv_history')||'[]')}catch{};h=[text,...h.filter(x=>x!==text)].slice(0,5);localStorage.setItem('epa_conv_history',JSON.stringify(h));renderHistory();}
    function renderHistory(){let h=[];try{h=JSON.parse(localStorage.getItem('epa_conv_history')||'[]')}catch{};root.querySelector('#convHistoryList').innerHTML=h.length?h.map(x=>`<span>${esc(x)}</span>`).join(''):'<p>まだ履歴はありません。</p>';}
    root.querySelectorAll('#converterTabs button').forEach(b=>b.onclick=()=>{root.querySelectorAll('#converterTabs button').forEach(x=>x.classList.remove('active'));b.classList.add('active');group=b.dataset.group;currentCategory=group==='analysis'?'fraction':'length';drawCategories();showCategoryPanel();fillUnits();});
    [from,to,value].forEach(x=>x.addEventListener('input',calc));
    root.querySelector('#convSwap').onclick=()=>{const a=from.value;from.value=to.value;to.value=a;calc();};
    root.querySelector('#convCopy').onclick=()=>{const text=root.dataset.last||'';if(window.copyText)copyText(text);else navigator.clipboard?.writeText(text);addHistory(text);const b=root.querySelector('#convCopy');b.textContent='✓ コピーしました';setTimeout(()=>b.textContent='▣ 結果をコピー',1800);};
    root.querySelectorAll('[data-quick]').forEach(b=>b.onclick=()=>{const [cat,f,t]=b.dataset.quick.split(',');group=categories[cat].group;root.querySelectorAll('#converterTabs button').forEach(x=>x.classList.toggle('active',x.dataset.group===group));currentCategory=cat;drawCategories();showCategoryPanel();fillUnits();from.value=f;to.value=t;calc();});
    root.querySelector('#clearConvHistory').onclick=()=>{localStorage.removeItem('epa_conv_history');renderHistory();};
    const precisionSelect=root.querySelector('#precisionMode');precisionSelect.value=precisionMode;precisionSelect.onchange=()=>{precisionMode=precisionSelect.value;localStorage.setItem('epa_precision_mode',precisionMode);calc();root.querySelector('#compositionResult').innerHTML='<strong>表示桁数を変更しました</strong><p>組成結果は、もう一度「組成を計算」を押すと新しい桁数で表示されます。</p>';};
    root.querySelector('#backToAnalysis').onclick=()=>{group='analysis';currentCategory='fraction';root.querySelectorAll('#converterTabs button').forEach(x=>x.classList.toggle('active',x.dataset.group==='analysis'));drawCategories();showCategoryPanel();fillUnits();};
    root.querySelector('#breadcrumbAnalysis').onclick=root.querySelector('#backToAnalysis').onclick;
    initComposition(root);drawCategories();showCategoryPanel();fillUnits();
    from.value='percent';
    to.value='ppm';
    value.value='';
    calc();
    renderHistory();
  }
  function compositionMarkup(){return `<nav class="composition-breadcrumb" aria-label="パンくず"><button id="breadcrumbAnalysis" type="button">分析値</button><span>›</span><strong>組成変換</strong></nav>
  <button class="composition-back" id="backToAnalysis" type="button">← 分析値のカテゴリへ戻る</button>
  <div class="composition-intro"><h3>wt%・mol%・at% 組成変換</h3><p>入力した割合を原子量・分子量で換算し、質量割合と物質量割合を相互変換します。</p></div><div class="composition-learning-link"><a href="unit_learning_composition.html">wt%・mol%・at%を基礎から学ぶ →</a></div>
  <div class="composition-basics">
    <article><span>wt%</span><b>重さの割合</b><p>試料全体の質量に対して、その成分が占める重さの割合です。</p></article>
    <article><span>mol%</span><b>物質量の割合</b><p>化合物や成分を、molの数で比べた割合です。</p></article>
    <article><span>at%</span><b>原子数の割合</b><p>元素同士を、原子の数で比べた割合です。元素組成に使用します。</p></article>
  </div>
  <div class="composition-flow"><b>変換の基本的な考え方</b><div><span>wt%</span><i>÷ 原子量・分子量</i><span>mol相当量</span><i>合計を100%に正規化</i><span>mol% / at%</span></div><p>逆にmol%・at%からwt%へ変換するときは、原子量・分子量を掛けて重さの比へ戻します。</p></div>
  <div class="composition-controls"><fieldset class="composition-type-picker"><legend>入力する割合を選んでください</legend><label><input type="radio" name="compInputType" value="wt" checked><span>wt%</span><small>質量割合を入力</small></label><label><input type="radio" name="compInputType" value="mol"><span>mol%</span><small>化合物・成分</small></label><label><input type="radio" name="compInputType" value="at"><span>at%</span><small>元素組成</small></label></fieldset><button id="addCompRow" type="button">＋ 成分を追加</button></div>
  <div class="composition-table-help"><b>入力方法</b><span>元素記号（例：Mo、Si、Al）を入力すると原子量が自動入力されます。化合物は分子量を入力してください。</span></div>
  <div class="composition-table-wrap"><table class="composition-table"><thead><tr><th>元素・化合物 <small>例：Mo、Si、Al、SiO₂</small></th><th id="compInputHeader">入力値（wt%）</th><th>原子量 / 分子量</th><th id="compWtHeader">正規化結果（wt%）</th><th id="compMolHeader">変換結果（at% / mol%）</th><th></th></tr></thead><tbody id="compositionRows"></tbody></table></div>
  <div class="composition-actions"><button id="calcComposition" type="button">組成を計算</button><button id="resetComposition" type="button">リセット</button></div>
  <div class="composition-result" id="compositionResult"><strong>計算結果</strong><p>2成分以上を入力して「組成を計算」を押してください。</p></div>
  <details class="composition-guide" open><summary>入力前に確認すること</summary><div><p><b>元素同士</b>の組成を比べる場合は at% を使用します。</p><p><b>化合物同士</b>の割合を比べる場合は mol% を使用します。</p><p>入力値の合計が100でなくても、ツール内で100%に正規化します。原子量・分子量が正しくない場合、結果も正しくなりません。</p></div></details>`;}
  function initComposition(root){
    const tbody=root.querySelector('#compositionRows');
    const atomicWeights={H:1.008,He:4.002602,Li:6.94,Be:9.0121831,B:10.81,C:12.011,N:14.007,O:15.999,F:18.998403163,Ne:20.1797,Na:22.98976928,Mg:24.305,Al:26.9815385,Si:28.085,P:30.973761998,S:32.06,Cl:35.45,Ar:39.948,K:39.0983,Ca:40.078,Sc:44.955908,Ti:47.867,V:50.9415,Cr:51.9961,Mn:54.938044,Fe:55.845,Co:58.933194,Ni:58.6934,Cu:63.546,Zn:65.38,Ga:69.723,Ge:72.630,As:74.921595,Se:78.971,Br:79.904,Kr:83.798,Rb:85.4678,Sr:87.62,Y:88.90584,Zr:91.224,Nb:92.90637,Mo:95.95,Tc:98,Ru:101.07,Rh:102.90550,Pd:106.42,Ag:107.8682,Cd:112.414,In:114.818,Sn:118.710,Sb:121.760,Te:127.60,I:126.90447,Xe:131.293,Cs:132.90545196,Ba:137.327,La:138.90547,Ce:140.116,Pr:140.90766,Nd:144.242,Pm:145,Sm:150.36,Eu:151.964,Gd:157.25,Tb:158.92535,Dy:162.500,Ho:164.93033,Er:167.259,Tm:168.93422,Yb:173.045,Lu:174.9668,Hf:178.49,Ta:180.94788,W:183.84,Re:186.207,Os:190.23,Ir:192.217,Pt:195.084,Au:196.966569,Hg:200.592,Tl:204.38,Pb:207.2,Bi:208.98040,Po:209,At:210,Rn:222,Fr:223,Ra:226,Ac:227,Th:232.0377,Pa:231.03588,U:238.02891,Np:237,Pu:244,Am:243,Cm:247,Bk:247,Cf:251,Es:252,Fm:257,Md:258,No:259,Lr:266,Rf:267,Db:268,Sg:269,Bh:270,Hs:269,Mt:278,Ds:281,Rg:282,Cn:285,Nh:286,Fl:289,Mc:290,Lv:293,Ts:294,Og:294};
    function row(name='',value='',mw=''){
      const tr=document.createElement('tr');
      tr.innerHTML=`<td><div class="comp-name-cell"><input class="comp-name" value="${esc(name)}" placeholder="例：Mo"><small class="comp-auto-note"></small></div></td><td><input class="comp-value" type="number" step="any" value="${value}" placeholder="0"></td><td><input class="comp-mw" type="number" step="any" value="${mw}" placeholder="原子量/分子量"></td><td class="comp-wt">—</td><td class="comp-mol">—</td><td><button class="remove-comp" type="button" title="削除">×</button></td>`;
      const nameInput=tr.querySelector('.comp-name'),mwInput=tr.querySelector('.comp-mw'),note=tr.querySelector('.comp-auto-note');
      const autoFill=()=>{const raw=nameInput.value.trim();const symbol=raw?raw.charAt(0).toUpperCase()+raw.slice(1).toLowerCase():'';if(atomicWeights[symbol]){nameInput.value=symbol;mwInput.value=atomicWeights[symbol];note.textContent='✓ 原子量を自動入力しました';note.className='comp-auto-note ok';}else{note.textContent=raw?'化合物の場合は分子量を入力してください':' ';note.className='comp-auto-note';}};
      nameInput.addEventListener('change',autoFill);nameInput.addEventListener('blur',autoFill);
      tr.querySelector('.remove-comp').onclick=()=>{if(tbody.children.length>2)tr.remove();};tbody.appendChild(tr);if(name)autoFill();
    }
    const reset=()=>{tbody.innerHTML='';row('Al',97,26.9815385);row('Si',2,28.085);row('Cu',1,63.546);root.querySelector('#compositionResult').innerHTML='<strong>計算結果</strong><p>成分を入力して「組成を計算」を押してください。</p>';};
    function updateCompositionHeaders(){
      const type=root.querySelector('input[name="compInputType"]:checked').value;
      const inputLabel=type==='wt'?'wt%':type==='mol'?'mol%':'at%';
      root.querySelector('#compInputHeader').textContent=`入力値（${inputLabel}）`;
      if(type==='wt'){
        root.querySelector('#compWtHeader').textContent='正規化結果（wt%）';
        root.querySelector('#compMolHeader').textContent='変換結果（at% / mol%）';
      }else{
        root.querySelector('#compWtHeader').textContent='変換結果（wt%）';
        root.querySelector('#compMolHeader').textContent=`正規化結果（${inputLabel}）`;
      }
    }
    reset();updateCompositionHeaders();
    root.querySelectorAll('input[name="compInputType"]').forEach(r=>r.addEventListener('change',()=>{updateCompositionHeaders();root.querySelector('#compositionResult').innerHTML='<strong>入力モードを変更しました</strong><p>入力値を確認して「組成を計算」を押してください。</p>';}));
    root.querySelector('#addCompRow').onclick=()=>row();
    root.querySelector('#resetComposition').onclick=reset;
    root.querySelector('#calcComposition').onclick=()=>{
      const type=root.querySelector('input[name="compInputType"]:checked').value;
      const rows=[...tbody.querySelectorAll('tr')];
      const data=rows.map(tr=>({tr,name:tr.querySelector('.comp-name').value.trim()||'成分',v:Number(tr.querySelector('.comp-value').value),mw:Number(tr.querySelector('.comp-mw').value)})).filter(x=>x.v>=0&&x.mw>0);
      if(data.length<2){root.querySelector('#compositionResult').innerHTML='<strong>入力を確認してください</strong><p>2成分以上の入力値と、正の原子量・分子量が必要です。</p>';return;}
      const inputSum=data.reduce((a,x)=>a+x.v,0);
      if(!(inputSum>0)){root.querySelector('#compositionResult').innerHTML='<strong>入力を確認してください</strong><p>入力値の合計は0より大きくしてください。</p>';return;}
      let wt,mol,raw,totalRaw;
      if(type==='wt'){
        wt=data.map(x=>x.v/inputSum);
        raw=wt.map((x,i)=>x/data[i].mw);
        totalRaw=raw.reduce((a,x)=>a+x,0);
        mol=raw.map(x=>x/totalRaw);
      }else{
        mol=data.map(x=>x.v/inputSum);
        raw=mol.map((x,i)=>x*data[i].mw);
        totalRaw=raw.reduce((a,x)=>a+x,0);
        wt=raw.map(x=>x/totalRaw);
      }
      data.forEach((x,i)=>{x.tr.querySelector('.comp-wt').textContent=fmt(wt[i]*100)+'%';x.tr.querySelector('.comp-mol').textContent=fmt(mol[i]*100)+'%';});
      const outLabel=type==='wt'?(data.every(x=>/^[A-Z][a-z]?$/.test(x.name))?'at%':'mol%'):'wt%';
      const resultCards=data.map((x,i)=>`<article><b>${esc(x.name)}</b><span>${fmt(x.v)} ${type==='wt'?'wt%':type+'%'}</span><i>→</i><strong>${fmt((type==='wt'?mol[i]:wt[i])*100)} ${outLabel}</strong></article>`).join('');
      const firstStep=type==='wt'?'入力値 ÷ 合計で、wt%を100%基準にそろえます。':'入力値 ÷ 合計で、mol%・at%を100%基準にそろえます。';
      const operation=type==='wt'?'÷':'×';
      const detailRows=data.map((x,i)=>`<tr><td>${esc(x.name)}</td><td>${fmt((type==='wt'?wt[i]:mol[i])*100)}</td><td>${operation} ${fmt(x.mw)}</td><td>${fmt(raw[i])}</td><td>${fmt((type==='wt'?mol[i]:wt[i])*100)}%</td></tr>`).join('');
      const light=data.reduce((a,x,i)=>x.mw<data[a].mw?i:a,0),heavy=data.reduce((a,x,i)=>x.mw>data[a].mw?i:a,0);
      const point=type==='wt'&&data.length>1?`<b>${esc(data[light].name)}は今回の成分の中で比較的軽く、${esc(data[heavy].name)}は比較的重い成分です。</b><p>同じ質量割合でも、軽い成分は原子・分子の数が多くなるため、mol%・at%が相対的に大きくなりやすくなります。</p>`:`<b>mol%・at%からwt%へは、原子量・分子量を掛けて重さへ戻します。</b><p>重い成分ほど、同じmol割合でもwt%が大きくなりやすくなります。</p>`;
      root.querySelector('#compositionResult').innerHTML=`<div class="composition-result-head"><strong>組成変換結果</strong><span>入力合計 ${fmt(inputSum)} → 100%に正規化</span></div><div class="composition-result-cards">${resultCards}</div><details class="composition-calculation" open><summary>今回の計算を順番に見る</summary><div class="composition-step-block"><h4>1. 入力値を100%基準にそろえる</h4><p>${firstStep}</p><h4>2. 重さとmol相当量を変換する</h4><table><thead><tr><th>成分</th><th>正規化値</th><th>原子量・分子量</th><th>換算後の比</th><th>最終結果</th></tr></thead><tbody>${detailRows}</tbody></table><h4>3. 合計で割って100%にする</h4><p>換算後の比の合計 ${fmt(totalRaw)} を使い、各成分 ÷ 合計 × 100 で最終割合を求めます。</p></div></details><aside class="composition-point"><span>ワンポイント</span>${point}</aside><aside class="composition-caution"><b>注意</b><p>at%は元素組成、mol%は化合物や成分の物質量割合に使用します。原子量・分子量は信頼できる値を入力してください。</p></aside>`;
    };
  }
  function switchView(view){
    const w=document.getElementById('weightToolView'),c=document.getElementById('converterToolView');if(!w||!c)return;const conv=view==='converter';
    ['calculator','excel','notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.hidden=conv;});const convSection=document.getElementById('converter');if(convSection)convSection.hidden=!conv;w.hidden=conv;c.hidden=!conv;w.classList.toggle('active',!conv);c.classList.toggle('active',conv);document.body.classList.toggle('converter-mode',conv);document.querySelectorAll('[data-tool-view]').forEach(b=>b.classList.toggle('active',b.dataset.toolView===view));
    const title=document.getElementById('toolHeroTitle'),lead=document.getElementById('toolHeroLead'),badges=document.getElementById('toolHeroBadges'),stats=document.getElementById('toolHeroStats'),m1=document.getElementById('toolMetaValue1'),m2=document.getElementById('toolMetaValue2'),m3=document.getElementById('toolMetaValue3'),fav=document.querySelector('.detail-doc-actions .detail-fav');
    if(conv){document.title='単位・分析値変換ツール - EPA Tools';if(title)title.textContent='単位・分析値変換ツール';if(lead)lead.textContent='一般単位・分析値・組成を、計算根拠付きで変換できます。';if(badges)badges.innerHTML='<span class="badge">単位・分析</span><span class="badge gray">教育対応</span><span class="badge green">OFFLINE</span>';if(stats)stats.innerHTML='<div><strong>40+</strong><span>対応単位</span></div><div><strong>wt / mol / at</strong><span>組成変換</span></div><div><strong>OFFLINE</strong><span>通信不要</span></div><div><strong>Ver.4.6</strong><span>Converter</span></div>';if(m1)m1.textContent='単位・分析・組成変換';if(m2)m2.textContent='一般単位 / 分析値（wt%・mol%・at%含む）';if(m3)m3.textContent='2026-07-21';if(fav)fav.hidden=true;}else{document.title='材料・重量計算ツール - EPA Tools';if(title)title.textContent='材料・重量計算ツール';if(lead)lead.textContent='材料と形状から概算重量を計算できます。Excel版もダウンロードできます。';if(badges)badges.innerHTML='<span class="badge green">お役立ちツール</span><span class="badge">重量計算</span><span class="badge gray">初級</span>';if(stats)stats.innerHTML='<div><strong>197</strong><span>材料データ</span></div><div><strong>7</strong><span>対応形状</span></div><div><strong>OFFLINE</strong><span>通信不要</span></div><div><strong>Ver.4.6</strong><span>Material & Calculation</span></div>';if(m1)m1.textContent='EPA Tools';if(m2)m2.textContent='オフライン対応 / Excel版付属';if(m3)m3.textContent='2026-07-21';if(fav)fav.hidden=false;}window.scrollTo({top:0,behavior:'smooth'});
  }
  document.addEventListener('DOMContentLoaded',()=>{init();document.querySelectorAll('[data-tool-view]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.toolView)));const requested=new URLSearchParams(location.search).get('view');switchView(requested==='converter'?'converter':'weight');});
})();
