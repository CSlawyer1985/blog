(() => {
 'use strict';
 const base=new URL('../',document.currentScript.src), q=s=>document.querySelector(s);
 const ref=(s)=>new URL(s,base).href, esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const typer=i=>i.kind==='司法任免'?'司法任免':/案例|裁判/.test(i.kind)?'重大案例':/解释|意见稿|法规|规章|法律/.test(i.kind)?'新法速递':/答问|权威|解读/.test(i.kind)?'权威观点':'监管与程序';
 const day=i=>i.changed||i.published;
 async function copy(text){
   if(navigator.clipboard&&window.isSecureContext) await navigator.clipboard.writeText(text);
   else {const el=document.createElement('textarea');el.value=text;document.body.append(el);el.select();const ok=document.execCommand('copy');el.remove();if(!ok)throw Error('复制未获授权')}
 }
 document.addEventListener('click',async e=>{
    const b=e.target.closest('button[data-share-id]');if(!b)return;
    const link=ref('news/'+encodeURIComponent(b.dataset.shareId)+'/');
    try{await copy(link);b.textContent='链接已复制'}catch{window.prompt('复制这一条的链接',link)}
 });
 const bundle=q('#site-data');if(!bundle)return;
 const {items,regions}=JSON.parse(bundle.textContent);
 const parent=new Map(regions.map(x=>[x.id,x.parent]));
 const types=['新法速递','重大案例','权威观点','监管与程序','司法任免'];
 const tags=[...new Set(items.flatMap(i=>Object.values(i.tags).flat()))].sort((a,b)=>a.localeCompare(b,'zh-CN'));
 const choices=(data,checked)=>data.map(([v,label])=>'<option value="'+esc(v)+'"'+(checked.includes(v)?' selected':'')+'>'+esc(label)+'</option>').join('');
 const names=new Map(regions.map(x=>[x.id,x.name]));
 const label=id=>{const p=[];for(let x=id;x&&x!=='CN';x=parent.get(x))p.unshift(names.get(x));return p.join(' / ')||'全国（所有地区）'};
 const fields=(state,more)=>`<label>地域 <input type="search" name="regionSearch" placeholder="搜地名／地区代码" aria-label="搜索区划"> <select name="region" multiple size="4" aria-label="地域，可多选">${choices(regions.map(r=>[r.id,label(r.id)]),state.region||[])}</select></label>
 <label>新闻类型 <select name="type" multiple size="4" aria-label="资讯类型，可多选">${choices(types.map(x=>[x,x]),state.type||[])}</select></label>
 ${more?`<label>其它标签 <select name="tag" multiple size="4" aria-label="其它标签，可多选">${choices(tags.map(x=>[x,x]),state.tag||[])}</select></label>`:''}
 <label class="small"><input type="checkbox" name="up" ${state.up?'checked':''}> 同看依法适用于本地的上级规则</label>
 <label>地域口径 <select name="regionMode"><option value="related">当地事项（含直接涉及）</option><option value="applicable" ${state.regionMode==='applicable'?'selected':''}>当地适用的现行规则</option></select></label><label class="small"><input type="checkbox" name="exact" ${state.exact?'checked':''}> 仅所选区划，不含下级</label>${more?`<label class="small"><input type="checkbox" name="noap" ${state.noap?'checked':''}> 不包含司法任免</label>`:''}`;
 function selected(i,choices,up, mode='related',exact=false){
   if(!choices.length||choices.includes('CN'))return true;
   const direct=mode==='applicable'?(i.region_applicability||[]):(i.region_facts||i.region_ids||[]);
   for(const c of direct){for(let cur=c;cur;cur=exact?null:parent.get(cur)) if(choices.includes(cur))return true}
   if(up) for(const c of i.region_applicability||[]){
      for(const option of choices)for(let ck=option;ck;ck=parent.get(ck))if(ck===c)return true;
   }return false;
 }
 const arow=i=>`<article class="appointment" data-card-id="${esc(i.id)}">
 <div class="app-content">${i.person?`<strong class="person">${esc(i.person)}</strong>${(i.actions||[]).map(x=>`<p><span class="action">${esc(x.action)}</span> <span>${esc(x.agency)} · ${esc(x.roles.join('、'))}</span></p>`).join('')}`:`<p>${esc(i.summary)}</p>`}</div>
 <div class="app-meta"><time>${esc(i.published)}</time>${i.decision_date?`<small>决定 ${esc(i.decision_date)}</small>`:''}<a href="${esc(i.source)}">官方原文 ↗</a><a href="${esc(ref('news/'+i.id+'/'))}" aria-label="条目详情">详情</a><button class="one-share" data-share-id="${esc(i.id)}">分享</button></div></article>`;
 const tagsLinks=(i)=>Object.entries(i.tags).flatMap(([k,v])=>v.map(t=>`<a class="chip ${esc(k)}" href="${esc(ref('tags/'+k+'/'+encodeURIComponent(t)+'/'))}">${esc(t)}</a>`)).join('');
 const tile=i=>`<article class="tile" data-card-id="${esc(i.id)}"><div class="card-ey"><span>${esc(i.kind)}</span><strong>${esc(i.state)}</strong></div><h2><a href="${esc(ref('news/'+i.id+'/'))}">${esc(i.title)}</a></h2><p>${esc(i.summary)}</p><aside><strong>实务提示</strong><p>${esc(i.practice)}</p></aside><p class="scope">适用或参考范围：${esc(i.scope)}</p><div class="dates">${[['published','公布'],['changed','更新'],['effective','施行'],['deadline','截止']].filter(([k])=>i[k]).map(([k,v])=>`<span>${v} ${esc(i[k])}</span>`).join('')}</div><div class="source"><span>${esc(i.issuer)}</span><a href="${esc(i.source)}">官方原文 ↗</a></div><div class="chips">${tagsLinks(i)}</div><button class="one-share" data-share-id="${esc(i.id)}">分享此条</button></article>`;
 function wireRegion(form){
    const input=form.elements.regionSearch, selector=form.elements.region;
    if(!input || !selector)return;
    input.oninput=()=>{const t=input.value.trim().toLowerCase();const keep=new Set([...selector.selectedOptions].map(x=>x.value));for(const opt of selector.options)opt.hidden=!!t&&!opt.text.toLowerCase().includes(t)&&!opt.value.includes(t)&&!keep.has(opt.value)};
 }
 const dlg=q('#pref-dialog'), key='law-brief-preferences-v1';
 const get=()=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}};
 if(dlg){
   const form=dlg.querySelector('form'), fs=q('.pref-fields'), main=q('.stream'), apps=q('#appointment-home');
   const update=p=>{
      const hits=items.filter(i=>selected(i,p?.region||[],p?.up,p?.regionMode,p?.exact)&&(!p?.type?.length||p.type.includes(typer(i))));
      const posts=hits.filter(i=>typer(i)!=='司法任免').slice(0,Number(main.dataset.homeLimit));
      const appointments=hits.filter(i=>typer(i)==='司法任免').slice(0,240);
      main.innerHTML=posts.map(tile).join('')||'<p>暂无匹配资讯，可清空关注查看全部。</p>';
      apps.innerHTML=appointments.map(arow).join('')||'<p>当前范围暂无已登记任免。</p>';
      q('#count').textContent='显示 '+posts.length+' 条 · 按时间从新到旧';
      q('#feedback').textContent=(p?.region?.length||p?.type?.length)?'当前：我的关注':'当前：看全部';
      document.dispatchEvent(new Event('law-layout'));
   };
   const show=()=>{fs.innerHTML=fields(get()||{},false);wireRegion(form);dlg.showModal()};
   q('#prefs').onclick=show;
   const persist=p=>{try{localStorage.setItem(key,JSON.stringify(p))}catch{}update(p);dlg.close()};
   form.onsubmit=e=>{e.preventDefault();const f=new FormData(form);persist({region:f.getAll('region'),type:f.getAll('type'),up:f.has('up'),regionMode:f.get('regionMode'),exact:f.has('exact')})};
   q('button[data-clear]').onclick=()=>persist({region:[],type:[]});
   const saved=get();update(saved);if(!saved)show();
 }
 const form=q('.share-form');
 if(form){
    const params=new URLSearchParams(location.search), d=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Shanghai'});
    const s={region:params.getAll('region'),type:params.getAll('type'),tag:params.getAll('tag'),up:params.has('up'),noap:params.has('noap'),regionMode:params.get('regionMode'),exact:params.has('exact')};
    q('.share-fields').innerHTML=fields(s,true);wireRegion(form);
    form.elements.from.value=params.get('from')||d();form.elements.to.value=params.get('to')||d();
    let shareUrl, text;
    function preview(){
      const f=new FormData(form), from=f.get('from'),to=f.get('to');
      if(!from||!to||from>to){q('#share-status').textContent='请把结束日期设在开始日期当天或之后。';q('#share-results').replaceChildren();q('#share-link').disabled=q('#share-text').disabled=true;return}
      const t=f.getAll('type'),g=f.getAll('tag'),r=f.getAll('region');
      const hits=items.filter(i=>{
        const matchDate=[i.published,i.changed].some(x=>x && x>=from&&x<=to);
        const labels=Object.values(i.tags).flat(), group=typer(i);
        return matchDate&&selected(i,r,f.has('up'),f.get('regionMode'),f.has('exact'))&&!(f.has('noap')&&group==='司法任免')&&(!(g.length||t.length)||t.includes(group)||g.some(tag=>labels.includes(tag)));
      });
      const groups=[...new Set(hits.map(typer))];
      const query=new URLSearchParams(f);query.delete('regionSearch');
      shareUrl=ref('share/?'+query.toString());
      text='法讯简报｜'+from+' ～ '+to+'｜'+hits.length+' 条\n地域：'+(r.map(label).join('、')||'全部')+'\n标签（并集）：'+([...t,...g].join('、')||'全部')+'\n';
      q('#share-status').textContent=text.split('\n').filter(Boolean).join('；');
      q('#share-results').innerHTML=groups.map(k=>{
        const xs=hits.filter(i=>typer(i)===k);
        text+='\n'+k+'（'+xs.length+'）\n'+xs.map(i=>i.published+' '+i.title+'\n'+i.summary+'\n原文：'+i.source).join('\n\n')+'\n';
        return `<section class="source-group"><h2>${esc(k)}（${xs.length}）</h2>${xs.map(i=>typer(i)==='司法任免'?arow(i):tile(i)).join('')}</section>`;
      }).join('');
      q('#share-link').disabled=q('#share-text').disabled=!hits.length;
    }
    form.onsubmit=e=>{e.preventDefault();preview()};
    for(const [id,fn] of [['#share-link',()=>shareUrl],['#share-text',()=>text]])q(id).onclick=async()=>{try{await copy(fn());q('#share-status').textContent+=' · 已复制'}catch{window.prompt('复制分享内容',fn())}};
    if(params.has('from')&&params.has('to'))preview();
 }
})();
