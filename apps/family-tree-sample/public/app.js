'use strict';
const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY = 'tsunagari-family-v1';
const sample = () => ({version:1,applicant:'c1',created:new Date().toLocaleDateString('sv-SE'),includeAddress:false,people:[
  {id:'r',kind:'root',name:'佐藤 太郎',relation:'被相続人',birth:'1950-04-12',death:'2025-11-03',address:'東京都世田谷区桜丘一丁目1番1号',domicile:'東京都世田谷区桜丘一丁目1番'},
  {id:'s',kind:'spouse',name:'佐藤 花子',relation:'妻',birth:'1953-08-25',death:'',address:'東京都世田谷区桜丘一丁目1番1号'},
  {id:'c1',kind:'child',name:'佐藤 健一',relation:'長男',birth:'1978-06-15',death:'',address:'東京都杉並区荻窪二丁目2番2号'},
  {id:'c2',kind:'child',name:'田中 美咲',relation:'長女',birth:'1981-03-08',death:'',address:'神奈川県横浜市青葉区青葉台三丁目3番3号'},
  {id:'c3',kind:'child',name:'佐藤 直人',relation:'二男',birth:'1985-10-21',death:'',address:'東京都練馬区石神井町四丁目4番4号'},
  {id:'rf',kind:'parent',name:'佐藤 一郎',relation:'父',relatedTo:'r',birth:'1922-02-10',death:'2008-07-14',address:'東京都世田谷区桜丘一丁目1番1号',output:false},
  {id:'rm',kind:'parent',name:'佐藤 和子',relation:'母',relatedTo:'r',birth:'1925-09-06',death:'2016-02-20',address:'東京都世田谷区桜丘一丁目1番1号',output:false},
  {id:'rs',kind:'sibling',name:'高橋 幸子',relation:'姉',relatedTo:'r',birth:'1947-05-18',death:'',address:'東京都調布市布田一丁目5番5号',output:false},
  {id:'rschild',kind:'other',name:'高橋 優子',relation:'姉の子',relatedTo:'rs',birth:'1974-12-03',death:'',address:'東京都調布市布田一丁目5番5号',output:false},
  {id:'sf',kind:'parent',name:'山田 正男',relation:'妻の父',relatedTo:'s',birth:'1926-06-11',death:'2013-10-09',address:'東京都大田区久が原二丁目6番6号',output:false},
  {id:'sm',kind:'parent',name:'山田 文子',relation:'妻の母',relatedTo:'s',birth:'1929-01-24',death:'2021-04-16',address:'東京都大田区久が原二丁目6番6号',output:false}
]});
function validDate(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const d=new Date(v+'T00:00:00Z');return !isNaN(d)&&d.toISOString().slice(0,10)===v&&v>='1800-01-01'&&v<='2100-12-31'}
const included=p=>p.kind==='root'||(p.output??['spouse','child'].includes(p.kind));
const selectedHeirs=()=>state.people.filter(p=>p.kind!=='root'&&included(p));
function validate(data){
 if(!data||data.version!==1||!Array.isArray(data.people)||data.people.length<1||data.people.length>30)throw Error('対応する家系図JSONファイルを選択してください（最大30人）。');
 const ids=new Set();
 for(const p of data.people){if(!p||typeof p.id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(p.id)||ids.has(p.id))throw Error('人物IDに問題があります。');ids.add(p.id);
 if(!['root','spouse','child','grandchild','parent','sibling','other'].includes(p.kind)||typeof p.name!=='string'||!p.name.trim()||p.name.length>30||typeof p.relation!=='string'||!p.relation.trim()||p.relation.length>10)throw Error('人物の名前・関係・続柄を確認してください。');
 if((p.birth&&!validDate(p.birth))||(['root','spouse','child'].includes(p.kind)&&!validDate(p.birth))||(p.death&&!validDate(p.death))||(p.death&&p.birth&&p.death<p.birth))throw Error('生年月日・死亡年月日を確認してください。被相続人・配偶者・子の生年月日は必須です。');
 for(const field of ['address','domicile'])if(p[field]!==undefined&&(typeof p[field]!=='string'||p[field].length>60))throw Error('住所・本籍は60文字以内で入力してください。');}
 if(data.people.filter(p=>p.kind==='root').length!==1||data.people.filter(p=>p.kind==='spouse').length>1)throw Error('被相続人は1人、配偶者は最大1人です。');
 for(const p of data.people.filter(p=>p.kind==='grandchild'))if(!data.people.some(x=>x.id===p.parent&&x.kind==='child'))throw Error('孫の親を指定してください。');
 if(!validDate(data.created)||typeof data.includeAddress!=='boolean')throw Error('作成日・住所の表示設定を確認してください。');
 if(data.applicant&&!data.people.some(p=>p.id===data.applicant&&['spouse','child'].includes(p.kind)))throw Error('申出人を確認してください。');
 for(const p of data.people){if(p.output!==undefined&&typeof p.output!=='boolean')throw Error('出力対象の設定を確認してください。');if(p.relatedTo&&(p.relatedTo===p.id||!data.people.some(x=>x.id===p.relatedTo)))throw Error('関連する人物を確認してください。');}
 if(data.poa){const a=data.poa;if(typeof a!=='object'||Array.isArray(a))throw Error('委任状の設定が不正です。');for(const k of ['person','name','address','capacity','date'])if(typeof a[k]!=='string'||a[k].length>80)throw Error('委任状の項目を確認してください。');if(a.name.length>30||a.address.length>60||!Number.isInteger(a.copies)||a.copies<1||a.copies>999||!validDate(a.date))throw Error('委任状の入力値を確認してください。');if(a.person&&!data.people.some(p=>p.id===a.person&&p.kind!=='root'))throw Error('代理人を確認してください。');}
 return data;
}
let state=sample(),view='tree',timer;
let treeZoom=1,treeFit=false;
const zoomSteps=[0.05,0.1,0.25,0.5,0.75,1,1.25,1.5,2];
function applyTreeZoom(next=treeZoom,preserveCenter=true){
 const svg=$('#tree-canvas svg'),viewport=$('.tree-scroll');if(!svg||!viewport.clientWidth)return;
 const {width,height}=svg.viewBox.baseVal;
 const oldRect=svg.getBoundingClientRect(),viewportRect=viewport.getBoundingClientRect();
 const centerX=(viewportRect.left+viewport.clientWidth/2-oldRect.left)/oldRect.width;
 const centerY=(viewportRect.top+viewport.clientHeight/2-oldRect.top)/oldRect.height;
 treeZoom=treeFit?Math.min(1,(viewport.clientWidth-16)/width,(viewport.clientHeight-16)/height):Math.max(0.05,Math.min(2,next));
 svg.style.width=width*treeZoom+'px';svg.style.height=height*treeZoom+'px';
 const padX=viewport.clientWidth,padY=viewport.clientHeight,canvas=$('#tree-canvas');
 canvas.style.padding=`${padY}px ${padX}px`;canvas.style.width=width*treeZoom+2*padX+'px';canvas.style.height=height*treeZoom+2*padY+'px';
 if(treeFit||!preserveCenter){viewport.scrollLeft=padX+(width*treeZoom-viewport.clientWidth)/2;viewport.scrollTop=padY+(height*treeZoom-viewport.clientHeight)/2;}else{viewport.scrollLeft=padX+centerX*width*treeZoom-viewport.clientWidth/2;viewport.scrollTop=padY+centerY*height*treeZoom-viewport.clientHeight/2;}
 $('#zoom-value').textContent=Math.round(treeZoom*100)+'%';$('#zoom-out').disabled=treeZoom<=0.05;$('#zoom-in').disabled=treeZoom>=2;$('#zoom-fit').setAttribute('aria-pressed',String(treeFit));
}
function stepTreeZoom(direction){treeFit=false;const next=direction>0?zoomSteps.find(n=>n>treeZoom+0.001):zoomSteps.findLast(n=>n<treeZoom-0.001);applyTreeZoom(next??(direction>0?2:0.05));}
try{const saved=localStorage.getItem(KEY);if(saved){state=validate(JSON.parse(saved));$('#save-state').textContent='保存したデータを読み込みました';}}catch(e){$('#save-state').textContent='保存データを読めないためサンプルを表示中';}
function toast(text){$('#toast').textContent=text;clearTimeout(timer);timer=setTimeout(()=>$('#toast').textContent='',4000)}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));$('#save-state').textContent='このブラウザに保存済み';}catch(e){$('#save-state').textContent='保存できませんでした';toast('端末に保存できません。データを書き出して保管してください。')}}
const dateJP=v=>v&&validDate(v)?new Intl.DateTimeFormat('ja-JP-u-ca-japanese',{era:'long',year:'numeric',month:'long',day:'numeric',timeZone:'UTC'}).format(new Date(v+'T00:00:00Z')):'未入力';
const shortDate=v=>v?v.replaceAll('-','.'):'—';
function setView(next){view=next;document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===next);if(b.hasAttribute('role'))b.setAttribute('aria-selected',String(b.dataset.view===next));});for(const v of ['tree','people','document','poa'])$('#'+v+'-view').hidden=v!==next;const title={tree:'家系図',people:'人物情報',document:'法定相続情報一覧図',poa:'委任状'}[next];$('#breadcrumb').textContent=title;$('#page-title').textContent=title;if(next==='document')renderDocument();if(next==='poa')renderPoa();}
function render(){const root=state.people.find(p=>p.kind==='root');$('#person-count').textContent=state.people.length;$('#project-title').textContent=root.name.split(/[ 　]/)[0]+'家の家系図';renderTree();renderPeople();renderDocument();renderPoa();}
function renderTree(){
 const people=$('#tree-scope')?.value==='selected'?state.people.filter(included):state.people,root=people.find(p=>p.kind==='root'),spouse=people.find(p=>p.kind==='spouse'),children=people.filter(p=>p.kind==='child'),grandchildren=people.filter(p=>p.kind==='grandchild'&&children.some(c=>c.id===p.parent));
 const groups=children.map(p=>({person:p,kids:grandchildren.filter(g=>g.parent===p.id)}));
 const siblings=people.filter(p=>p.kind==='sibling'&&p.relatedTo===root.id);
 const siblingGroups=siblings.map(person=>({person,kids:people.filter(p=>p.kind==='other'&&/^(姉|兄|弟|妹)の子$/.test(p.relation)&&p.relatedTo===person.id)}));
 const relativesWidth=siblingGroups.reduce((sum,g)=>sum+Math.max(1,g.kids.length)*208,0);
 const parentGroups=[root,spouse].filter(Boolean).map(person=>({person,parents:people.filter(p=>p.kind==='parent'&&p.relatedTo===person.id).slice(0,2)})).filter(g=>g.parents.length);
 const placedRelatives=new Set([...siblings,...siblingGroups.flatMap(g=>g.kids),...parentGroups.flatMap(g=>g.parents)].map(p=>p.id));
 const others=people.filter(p=>!placedRelatives.has(p.id)&&(['parent','sibling','other'].includes(p.kind)||(p.kind==='grandchild'&&!grandchildren.includes(p))));
 const widths=groups.map(g=>Math.max(1,g.kids.length)*208);const width=Math.max(parentGroups.length?950:850,widths.reduce((a,b)=>a+b,0)+100)+relativesWidth;const baseHeight=grandchildren.length?640:430;const topOffset=parentGroups.length?180:0;const height=topOffset+baseHeight+(others.length?55+Math.ceil(others.length/4)*150:0);const pos=new Map();
 const center=(width+relativesWidth)/2;pos.set(root.id,{x:center-(spouse?214:94),y:48});if(spouse)pos.set(spouse.id,{x:center+26,y:48});
 let start=relativesWidth+(width-relativesWidth-widths.reduce((a,b)=>a+b,0))/2;
 groups.forEach((g,i)=>{const mid=start+widths[i]/2;pos.set(g.person.id,{x:mid-94,y:257});g.kids.forEach((k,j)=>pos.set(k.id,{x:start+j*208+10,y:462}));start+=widths[i]});
 let relativeStart=20;
 siblingGroups.forEach(g=>{const span=Math.max(1,g.kids.length)*208;pos.set(g.person.id,{x:relativeStart+span/2-94,y:48});g.kids.forEach((p,i)=>pos.set(p.id,{x:relativeStart+i*208+10,y:257}));relativeStart+=span;});
 parentGroups.forEach(g=>{const target=pos.get(g.person.id).x+94;const mid=target+(g.person.id===root.id?-104:104);g.parents.forEach((p,i)=>pos.set(p.id,{x:mid+(i-(g.parents.length-1)/2)*208-94,y:-132}));});
 others.forEach((p,i)=>pos.set(p.id,{x:(width-832)/2+(i%4)*208+10,y:baseHeight+45+Math.floor(i/4)*150}));
 let lines=others.length?`<path d="M 20 ${baseHeight} H ${width-20}" stroke="#cbd5e1"/><text x="28" y="${baseHeight+27}" font-size="12" fill="#475569">その他の親族・関係者</text>`:'';const line=(d)=>{lines+=`<path d="${d}" fill="none" stroke="#94a3b8" stroke-width="1.5"/>`};
 parentGroups.forEach(g=>{const xs=g.parents.map(p=>pos.get(p.id).x+94),mid=(xs[0]+xs.at(-1))/2,descendants=[g.person,...(g.person.id===root.id?siblings:[])].map(p=>pos.get(p.id).x+94);if(xs.length===2){line(`M ${xs[0]+94} -73 H ${xs[1]-94}`);line(`M ${xs[0]+94} -67 H ${xs[1]-94}`);}line(`M ${mid} ${xs.length===2?-67:-14} V 12`);line(`M ${Math.min(mid,...descendants)} 12 H ${Math.max(mid,...descendants)}`);descendants.forEach(x=>line(`M ${x} 12 V 48`));});
 siblingGroups.forEach(g=>{if(!g.kids.length)return;const x=pos.get(g.person.id).x+94,xs=g.kids.map(p=>pos.get(p.id).x+94);line(`M ${x} 166 V 219`);line(`M ${Math.min(x,...xs)} 219 H ${Math.max(x,...xs)}`);xs.forEach(xx=>line(`M ${xx} 219 V 257`));});
 if(spouse){line(`M ${center-26} 107 H ${center+26}`);line(`M ${center-26} 113 H ${center+26}`)}
 if(children.length){let xs=children.map(c=>pos.get(c.id).x+94);line(`M ${center} ${spouse?113:166} V 219`);line(`M ${Math.min(center,...xs)} 219 H ${Math.max(center,...xs)}`);for(const x of xs)line(`M ${x} 219 V 257`);}
 for(const g of groups){if(!g.kids.length)continue;const x=pos.get(g.person.id).x+94,xs=g.kids.map(k=>pos.get(k.id).x+94);line(`M ${x} 375 V 424`);line(`M ${Math.min(x,...xs)} 424 H ${Math.max(x,...xs)}`);for(const xx of xs)line(`M ${xx} 424 V 462`);}
 const cards=people.map(p=>{const {x,y}=pos.get(p.id);const isRoot=p.kind==='root';const title=isRoot?'被相続人':p.relation;const label=grandchildren.some(g=>g.id===p.id)?'孫':p.kind==='child'?'子':p.kind==='spouse'?'配偶者':'';
 return `<g class="tree-node" data-person="${esc(p.id)}" tabindex="0" role="button" aria-label="${esc(p.name)}を編集" transform="translate(${x} ${y})"><rect class="card-bg" width="188" height="118" rx="3" fill="${isRoot?'#edf2f9':'#ffffff'}" stroke="${isRoot?'#6b86a8':'#cbd5e1'}"/><rect x="15" y="14" width="${Math.max(42,title.length*11+16)}" height="20" rx="2" fill="${isRoot?'#dae5f3':'#f1f5f9'}"/><text x="23" y="28" fill="#36577e" font-size="10">${esc(title)}</text><text x="169" y="28" text-anchor="end" font-size="9" fill="#64748b">${label}</text><text x="16" y="63" font-size="${p.name.length>12?12:18}" font-weight="600" fill="#1f2937" ${p.name.length>17?'textLength="156" lengthAdjust="spacingAndGlyphs"':''}>${esc(p.name)}</text><text x="16" y="85" font-size="10" fill="#64748b">${shortDate(p.birth)} 生</text><text x="16" y="103" font-size="9" fill="#64748b">${p.death?shortDate(p.death)+' 没':p.id===state.applicant?'申出人':''}</text><text x="164" y="101" font-size="14" fill="#64748b">↗</text></g>`;}).join('');
 $('#tree-canvas').innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="font-family:'Yu Gothic UI',Meiryo,sans-serif" role="img" aria-label="${esc(root.name)}の家系図"><rect width="100%" height="100%" fill="#ffffff" fill-opacity="0"/><g transform="translate(0 ${topOffset})">${lines}${cards}</g></svg>`;
 $('#tree-canvas').querySelectorAll('[data-person]').forEach(el=>{el.onclick=()=>editPerson(el.dataset.person);el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();editPerson(el.dataset.person)}}});
 applyTreeZoom(treeZoom,false);
}
function renderPeople(){$('#people-list').innerHTML='<div class="selection-help">「出力対象」を選択すると、一覧図と家系図の選択表示に反映されます。被相続人は常に対象です。<br>一覧図の作成範囲は配偶者・子です。相続人の判定は行いません。</div>'+state.people.map(p=>`<div class="person-entry"><button class="person-row" data-id="${esc(p.id)}"><strong>${esc(p.name)}</strong><span>${esc(p.relation)}</span><span>${p.birth?dateJP(p.birth)+' 生':'生年月日未登録'}${p.relatedTo?' ／ 関連：'+esc(state.people.find(x=>x.id===p.relatedTo)?.name):''}</span><span class="row-edit">編集 →</span></button><label class="output-check"><input type="checkbox" data-output="${esc(p.id)}" aria-label="${esc(p.name)}を出力対象にする" ${included(p)?'checked':''} ${p.kind==='root'?'disabled':''}>出力対象</label></div>`).join('');$('#people-list').querySelectorAll('button').forEach(b=>b.onclick=()=>editPerson(b.dataset.id));$('#people-list').querySelectorAll('[data-output]').forEach(c=>c.onchange=()=>{state.people.find(p=>p.id===c.dataset.output).output=c.checked;persist();render();});}
function documentIssues(){const issues=[],root=state.people.find(p=>p.kind==='root'),heirs=selectedHeirs();if(heirs.some(p=>!['spouse','child'].includes(p.kind)))issues.push('選択された人物に、一覧図出力が未対応の続柄があります。家系図の選択表示・SVG保存は利用できます。');if(!root.death)issues.push('被相続人の死亡年月日を入力してください。');if(!root.address)issues.push('被相続人の最後の住所を入力してください。');if(!root.domicile)issues.push('被相続人の最後の本籍を入力してください。');if(!heirs.length)issues.push('このサンプルは配偶者・子の構成専用です。対象の人物を追加してください。');if(state.people.some(p=>p.kind==='grandchild'&&state.people.find(x=>x.id===p.parent)?.death))issues.push('代襲相続を伴う構成は一覧図出力に未対応です。');if(heirs.some(p=>p.death))issues.push('死亡した配偶者・子を含む構成は一覧図出力に未対応です。');if(heirs.length>5)issues.push('一覧図出力は配偶者・子の合計5人までです。');if(!state.applicant||!heirs.some(p=>p.id===state.applicant))issues.push('申出人を選択してください。');const app=heirs.find(p=>p.id===state.applicant);if(app&&!app.address)issues.push('申出人の住所を入力してください。');if(state.includeAddress&&heirs.some(p=>!p.address))issues.push('住所を記載する場合は、配偶者・子全員の住所を入力してください。');if(root.death&&heirs.some(p=>p.birth>root.death))issues.push('被相続人の死亡後に出生した家族がいます。このサンプルの対応範囲外です。');if(!validDate(state.created)||(root.death&&state.created<root.death))issues.push('作成日は被相続人の死亡日以降にしてください。');return issues;}
function renderDocument(){const root=state.people.find(p=>p.kind==='root'),heirs=selectedHeirs(),app=heirs.find(p=>p.id===state.applicant);$('#applicant').innerHTML='<option value="">選択してください</option>'+heirs.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');$('#applicant').value=state.applicant||'';$('#created-date').value=state.created;$('#include-address').checked=state.includeAddress;
 const issues=documentIssues();document.body.classList.toggle('print-blocked',issues.length>0);$('#document-errors').innerHTML=issues.length?'<strong>出力前に確認してください</strong><br>'+issues.map(esc).join('<br>'):'';$('#print-document').disabled=issues.length>0;
 const omitted=state.people.filter(p=>['spouse','child'].includes(p.kind)&&!included(p));$('#output-notice').textContent=omitted.length?'未選択の配偶者・子：'+omitted.map(p=>p.name).join('、')+'。提出用一覧図には法定相続人全員の記載が必要です。出力範囲を確認してください。':'';
 $('#paper').innerHTML=`<div class="draft-mark">下書き / サンプル</div><h2>被相続人 ${esc(root.name)} 法定相続情報</h2><div class="legal-root">最後の住所　${esc(root.address)||'（未入力）'}<br>最後の本籍　${esc(root.domicile)||'（未入力）'}<br>出生　${dateJP(root.birth)}<br>死亡　${root.death?dateJP(root.death):'（未入力）'}<br>（被相続人）　${esc(root.name)}</div><div class="legal-family">${heirs.map(p=>`<div class="legal-person">${state.includeAddress?'住所　'+esc(p.address)+'<br>':''}出生　${dateJP(p.birth)}<br>（${esc(p.relation)}）　<strong>${esc(p.name)}</strong>${p.id===state.applicant?'　（申出人）':''}</div>`).join('')}</div><div class="legal-creator">${dateJP(state.created)} 作成<br>作成者　住所　${esc(app?.address)||'（未入力）'}<br>氏名　${esc(app?.name)||'（申出人を選択）'}</div><div class="paper-note">この図は入力内容に基づく下書きです。戸籍等との照合・相続人の確定・法務局による認証は行っていません。<br>提出前に法務局の最新様式および必要書類を確認してください。下部は認証文用の余白です。</div>`;
 const probe=$('#paper').cloneNode(true);probe.removeAttribute('id');probe.style.cssText='position:fixed;left:-10000px;top:0;visibility:hidden;';document.body.append(probe);const overflows=probe.querySelector('.legal-creator').getBoundingClientRect().bottom+14>probe.querySelector('.paper-note').getBoundingClientRect().top;probe.remove();
 if(overflows){$('#document-errors').innerHTML+='<br>文字量がA4の印刷範囲を超えています。住所の表示設定などを確認してください。';$('#print-document').disabled=true;document.body.classList.add('print-blocked');}
}
const form=$('#person-form');
function updateKind(){const kind=form.elements.kind.value;$('#parent-field').hidden=kind!=='grandchild';$('#domicile-field').hidden=kind!=='root';form.elements.parent.required=kind==='grandchild';$('#related-field').hidden=!['parent','sibling','other'].includes(kind);form.elements.birth.required=['root','spouse','child'].includes(kind);}
function editPerson(id){const p=state.people.find(p=>p.id===id)||{id:'',kind:'child',name:'',relation:'',birth:'',death:'',address:'',domicile:'',parent:''};form.reset();$('#form-error').textContent='';for(const key of ['id','name','kind','relation','birth','death','address','domicile'])form.elements[key].value=p[key]||'';form.elements.parent.innerHTML=state.people.filter(x=>x.kind==='child').map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');if(p.parent)form.elements.parent.value=p.parent;form.elements.relatedTo.innerHTML='<option value="">指定なし</option>'+state.people.filter(x=>x.id!==p.id).map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join('');form.elements.relatedTo.value=p.relatedTo||'';form.elements.kind.disabled=p.kind==='root';for(const opt of form.elements.kind.options){opt.disabled=opt.value==='root'&&p.kind!=='root'||opt.value==='spouse'&&state.people.some(x=>x.kind==='spouse'&&x.id!==p.id);}$('#delete-person').hidden=!p.id||p.kind==='root';$('#dialog-title').textContent=p.id?'人物情報を編集':'人物を追加';updateKind();$('#person-dialog').showModal();form.elements.name.focus();}
form.elements.kind.onchange=()=>{updateKind();const k=form.elements.kind.value;form.elements.relation.value={root:'被相続人',spouse:'配偶者',child:'',grandchild:'孫',parent:'父',sibling:'兄',other:'関係者'}[k]};
form.onsubmit=e=>{e.preventDefault();const p={};for(const key of ['id','name','kind','relation','birth','death','address','domicile','parent','relatedTo'])p[key]=form.elements[key].value.trim();if(!p.id)p.id='p-'+Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');const next=structuredClone(state);const i=next.people.findIndex(x=>x.id===p.id);if(i>=0)next.people[i]={...next.people[i],...p};else next.people.push(p);if(!next.people.some(x=>x.id===next.applicant&&['child','spouse'].includes(x.kind)))next.applicant='';try{validate(next);state=next;persist();render();$('#person-dialog').close();toast('人物情報を保存しました');}catch(err){$('#form-error').textContent=err.message}};
$('#delete-person').onclick=()=>{const id=form.elements.id.value;if(state.people.some(p=>p.parent===id)){$('#form-error').textContent='この人物に子が登録されています。先に子の親を変更するか、子を削除してください。';return;}if(!confirm('この人物を家系図から削除しますか？'))return;state.people=state.people.filter(p=>p.id!==id);state.people.forEach(p=>{if(p.relatedTo===id)p.relatedTo=''});if(state.poa?.person===id)state.poa.person='';if(state.applicant===id)state.applicant='';persist();render();$('#person-dialog').close();toast('人物を削除しました');};
$('#close-dialog').onclick=$('#cancel-dialog').onclick=()=>$('#person-dialog').close();$('#add-person').onclick=()=>editPerson();
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
document.querySelectorAll('[role="tab"]').forEach((b,i,all)=>b.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const next=all[(i+(e.key==='ArrowRight'?1:all.length-1))%all.length];next.focus();setView(next.dataset.view)}});
$('#applicant').onchange=e=>{state.applicant=e.target.value;persist();render()};$('#created-date').onchange=e=>{if(!validDate(e.target.value)){toast('有効な作成日を入力してください');e.target.value=state.created;return;}state.created=e.target.value;persist();renderDocument()};$('#include-address').onchange=e=>{state.includeAddress=e.target.checked;persist();renderDocument()};
$('#print-document').onclick=()=>printPages('document');
window.addEventListener('beforeprint',()=>{document.body.dataset.printMode=printMode||(view==='poa'?'poa':'document');renderDocument();renderPoa()});window.addEventListener('afterprint',()=>{printMode=null;delete document.body.dataset.printMode});
function download(text,name,type){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
$('#backup').onclick=()=>{download(JSON.stringify(state,null,2),'家系図データ.json','application/json');toast('家系図データを書き出しました')};
$('#export-svg').onclick=()=>{const svg=$('#tree-canvas svg').cloneNode(true);svg.style.removeProperty('width');svg.style.removeProperty('height');download(new XMLSerializer().serializeToString(svg),'家系図.svg','image/svg+xml');toast('家系図をSVG形式で保存しました')};
$('#restore').onclick=()=>$('#import-file').click();$('#import-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>100000)throw Error('ファイルが大きすぎます（100KBまで）。');const data=validate(JSON.parse(await file.text()));if(!confirm('現在の家系図を、ファイルの内容で置き換えますか？'))return;state=data;persist();render();toast('家系図データを読み込みました');}catch(err){toast('読み込めません：'+err.message)}finally{e.target.value=''}};
$('#reset').onclick=()=>{if(!confirm('編集内容をサンプルデータで置き換えますか？必要な場合は先にデータを書き出してください。'))return;state=sample();persist();render();toast('サンプルデータに戻しました')};
let printMode=null;
$('#tree-scope').onchange=renderTree;
$('#zoom-out').onclick=()=>stepTreeZoom(-1);$('#zoom-in').onclick=()=>stepTreeZoom(1);
$('#zoom-reset').onclick=()=>{treeFit=false;applyTreeZoom(1)};
$('#zoom-fit').onclick=()=>{treeFit=true;applyTreeZoom()};
new ResizeObserver(()=>applyTreeZoom(treeZoom,true)).observe($('.tree-scroll'));
const panViewport=$('.tree-scroll');
let panGesture=null,suppressPanClickUntil=0;
panViewport.addEventListener('pointerdown',e=>{
 if(e.pointerType!=='mouse'||e.button!==0)return;
 const bounds=panViewport.getBoundingClientRect();
 if(e.clientX>=bounds.left+panViewport.clientWidth||e.clientY>=bounds.top+panViewport.clientHeight)return;
 panGesture={id:e.pointerId,x:e.clientX,y:e.clientY,left:panViewport.scrollLeft,top:panViewport.scrollTop,dragging:false};
});
panViewport.addEventListener('pointermove',e=>{
 if(!panGesture||panGesture.id!==e.pointerId)return;
 const dx=e.clientX-panGesture.x,dy=e.clientY-panGesture.y;
 if(!panGesture.dragging&&Math.hypot(dx,dy)<5)return;
 if(!panGesture.dragging){panGesture.dragging=true;panViewport.setPointerCapture(e.pointerId);panViewport.classList.add('is-panning');treeFit=false;$('#zoom-fit').setAttribute('aria-pressed','false');}
 e.preventDefault();panViewport.scrollLeft=panGesture.left-dx;panViewport.scrollTop=panGesture.top-dy;
});
function endPan(e){if(!panGesture||panGesture.id!==e.pointerId)return;if(panGesture.dragging)suppressPanClickUntil=performance.now()+400;panGesture=null;panViewport.classList.remove('is-panning');if(panViewport.hasPointerCapture(e.pointerId))panViewport.releasePointerCapture(e.pointerId);}
window.addEventListener('pointerup',endPan);window.addEventListener('pointercancel',endPan);panViewport.addEventListener('lostpointercapture',endPan);
panViewport.addEventListener('click',e=>{if(e.detail>0&&performance.now()<suppressPanClickUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
function poaSettings(){return state.poa ||= {person:'',name:'',address:'',capacity:'',copies:1,date:state.created};}
function renderPoa(){
 const a=poaSettings(),root=state.people.find(p=>p.kind==='root'),principal=state.people.find(p=>p.id===state.applicant);
 const agent=state.people.find(p=>p.id===a.person),name=agent?agent.name:a.name,address=agent?agent.address:a.address;
 $('#poa-principal').innerHTML='<option value="">選択してください</option>'+state.people.filter(p=>['spouse','child'].includes(p.kind)&&!p.death).map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');$('#poa-principal').value=state.applicant||'';
 $('#poa-person').innerHTML='<option value="">直接入力</option>'+state.people.filter(p=>p.kind!=='root'&&p.id!==state.applicant&&!p.death).map(p=>`<option value="${esc(p.id)}">${esc(p.name)}（${esc(p.relation)}）</option>`).join('');$('#poa-person').value=a.person;
 $('#poa-name').value=name||'';$('#poa-address').value=address||'';$('#poa-name').readOnly=$('#poa-address').readOnly=!!agent;
 $('#poa-capacity').value=a.capacity;$('#poa-copies').value=a.copies;$('#poa-date').value=a.date;
 const issues=[];if(!principal||principal.death)issues.push('生存する委任者（申出人）を選択してください。');if(principal&&!principal.address)issues.push('委任者の住所を入力してください。');if(a.person===state.applicant)issues.push('委任者と代理人は別の人物を指定してください。');if(agent?.death)issues.push('死亡した人物は代理人に指定できません。');if(!name?.trim()||!address?.trim())issues.push('代理人の住所・氏名を入力してください。');if(!Array.from($('#poa-capacity').options).some(o=>o.value&&o.value===a.capacity))issues.push('代理人の資格・関係を選択してください。');if(!root.death||!(root.address||root.domicile))issues.push('被相続人の死亡年月日と最後の住所または本籍を入力してください。');if(!validDate(a.date)||(root.death&&a.date<root.death))issues.push('委任日は被相続人の死亡日以降にしてください。');if(!Number.isInteger(a.copies)||a.copies<1||a.copies>999)issues.push('交付通数は1〜999の整数で入力してください。');
 $('#poa-errors').innerHTML=issues.map(esc).join('<br>');$('#print-poa').disabled=issues.length>0;$('#print-bundle').disabled=issues.length>0||$('#print-document').disabled;document.body.classList.toggle('poa-blocked',issues.length>0);
 $('#poa-paper').innerHTML=`<h2>委　任　状</h2><div class="poa-agent">（代理人）<div>住　所　${esc(address)||'（未入力）'}</div><div>氏　名　${esc(name)||'（未入力）'}</div></div><p class="poa-intro">私は、上記の者に対し、以下の被相続人の相続に係る次の権限を委任する。</p><div class="poa-powers"><p>１　法定相続情報一覧図を作成すること</p><p>２　法定相続情報一覧図の保管及び一覧図の写しの交付の申出をすること<br>　　（希望する法定相続情報一覧図の写しの交付通数　${esc(a.copies)}　通）</p><p>３　法定相続情報一覧図の写し及び返却される添付書面を受領すること</p><p>４　上記１から３までのほか、法定相続情報一覧図の保管及び一覧図の写しの交付の申出に関して必要な一切の権限</p></div><div class="poa-deceased"><p>被相続人の最後の住所（又は本籍）<br><span>${esc(root.address||root.domicile)||'（未入力）'}</span></p><p>被相続人の氏名<br><span>${esc(root.name)}</span></p><p>死亡年月日<br><span>${dateJP(root.death)}</span></p></div><div class="poa-signing"><p>${dateJP(a.date)}</p><p>（委任者）</p><div>住　所　${esc(principal?.address)||'（未入力）'}</div><div>氏　名　${esc(principal?.name)||'（未選択）'}</div></div>`;
}
function printPages(mode){renderDocument();renderPoa();if((mode!=='poa'&&$('#print-document').disabled)||(mode!=='document'&&$('#print-poa').disabled))return;printMode=mode;document.body.dataset.printMode=mode;window.print();}
$('#poa-principal').onchange=e=>{state.applicant=e.target.value;persist();render()};
$('#poa-person').onchange=e=>{poaSettings().person=e.target.value;persist();renderPoa()};
for(const key of ['name','address','capacity','copies','date'])$('#poa-'+key).onchange=e=>{const a=poaSettings();const value=key==='copies'?Number(e.target.value):e.target.value.trim();if(key==='copies'&&(!Number.isInteger(value)||value<1||value>999)||key==='date'&&!validDate(value)){toast('入力値を確認してください');renderPoa();return;}a[key]=value;persist();renderPoa()};
$('#print-poa').onclick=()=>printPages('poa');$('#print-bundle').onclick=()=>printPages('bundle');
render();
