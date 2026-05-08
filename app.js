/* ===== GLOBAL STATE ===== */
let ferts=JSON.parse(localStorage.getItem('fc_ferts')||'[]');
let editId=null,nuts={},mxP=1,shN=1,currentCrit='balanced';
let lastResults=null,lastTgts=null,chatHistory={};
let parsedImport=[];

/* ===== UTILS ===== */
const g=x=>document.getElementById(x);
const brl=n=>'R$ '+n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const nd=(n,d=2)=>parseFloat(n.toFixed(d));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,5);
const escH=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const fmtN=n=>{if(!n)return'—';return['N','P2O5','K2O','S'].filter(k=>n[k]>0).map(k=>k.replace('P2O5','P₂O₅').replace('K2O','K₂O')+' '+n[k]+'%').join(' · ')||'—'};
const fmtNK=n=>n.replace('P2O5','P₂O₅').replace('K2O','K₂O');
function toast(msg,tp=''){const t=document.createElement('div');t.className='t'+(tp?' '+tp:'');t.textContent=msg;g('tw').appendChild(t);setTimeout(()=>t.remove(),2600)}
function saveFerts(){localStorage.setItem('fc_ferts',JSON.stringify(ferts))}

/* ===== SIDEBAR ===== */
function openSB(){g('sbar').classList.add('open');g('sovly').classList.on='on';g('sovly').style.display='block'}
function closeSB(){g('sbar').classList.remove('open');g('sovly').style.display='none'}
function navTo(sec){
  closeSB();
  document.querySelectorAll('.si').forEach(s=>s.classList.remove('on'));
  if(sec==='calc'){
    document.querySelector('.si:first-of-type')&&document.querySelectorAll('.si')[0].classList.add('on');
    showView('view-calc');
    g('hdr-title').textContent='Fertilizantes';
    g('hdr-tag').style.display='none';
    g('hdr-right').style.display='flex';
  } else if(sec==='import'){
    document.querySelectorAll('.si')[1].classList.add('on');
    showView('view-import');
    g('hdr-title').textContent='Importar Lista';
    g('hdr-tag').style.display='none';
    g('hdr-right').style.display='none';
    impGoStep(1);
  } else if(sec==='ia-cfg'){
    toggleCfg();
  } else {
    toast('Em desenvolvimento');
  }
}
function showView(id){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id))}

/* ===== API KEY ===== */
function getKey(){return localStorage.getItem('fc_ai_key')||''}
function saveKey(){
  const k=g('api-key-input').value.trim();
  if(!k){toast('Cole a chave primeiro','er');return}
  if(!k.startsWith('sk-')){toast('Chave inválida (deve começar com sk-)','er');return}
  localStorage.setItem('fc_ai_key',k);
  g('api-key-input').value='';
  updateKeyStatus();toast('Chave salva','ok');
  g('cfg-panel').style.display='none';
}
function clearKey(){localStorage.removeItem('fc_ai_key');g('api-key-input').value='';updateKeyStatus();toast('Chave removida')}
function updateKeyStatus(){
  const has=!!getKey();
  g('key-dot').className='key-dot '+(has?'active':'missing');
  g('key-label').textContent=has?'IA conectada':'Sem chave';
}
function toggleCfg(){const p=g('cfg-panel');p.style.display=p.style.display==='block'?'none':'block';if(p.style.display==='block')g('api-key-input').focus()}

/* ===== FERTILIZER LIST ===== */
function renderFerts(){
  const cnt=g('fert-cnt');
  cnt.textContent=ferts.length+(ferts.length===1?' produto':' produtos');
  if(!ferts.length){
    g('flist').innerHTML=`<div class="pi-empty"><div class="pie-ico">🧪</div><div class="pie-t">Nenhum fertilizante</div><div class="pie-s">Cadastre ou importe produtos para começar</div><button class="btn-add" style="margin-top:8px" onclick="openAddProduct()">+ Adicionar produto</button></div>`;
    return;
  }
  g('flist').innerHTML=ferts.map(f=>{
    const pr=f.priceTon?'R$ '+Number(f.priceTon).toLocaleString('pt-BR')+'/t':'—';
    const st=f.status==='review'?'<span class="sbadge s-rev">Revisar</span>':f.active?'<span class="sbadge s-ok">OK</span>':'<span class="sbadge s-off">Inativo</span>';
    return`<div class="fc" id="fc-${f.id}">
      <div class="fc-hd">
        <div class="dot ${f.active?'':'off'}" title="${f.active?'Ativo':'Inativo'}" onclick="toggleAct('${f.id}',event)"></div>
        <div class="fc-info" onclick="expand('${f.id}')">
          <div class="fc-name">${f.name}</div>
          <div class="fc-sub">${fmtN(f.nutrients)}${f.supplier?' · '+f.supplier:''}${f.delivery?' · '+f.delivery:''}</div>
        </div>
        <div class="fc-price">${pr}</div>
        <div class="fc-acts">
          <button class="ib" onclick="expand('${f.id}')"><span id="arr-${f.id}" style="font-size:9px">▼</span></button>
          <button class="ib" title="Editar" onclick="editProd('${f.id}')">✎</button>
          <button class="ib" title="Duplicar" onclick="dupProd('${f.id}')">⧉</button>
          <button class="ib d" title="Excluir" onclick="delProd('${f.id}')">✕</button>
        </div>
      </div>
      <div class="fc-det" id="fd-${f.id}">
        <div class="dr"><span class="dl">Fornecedor</span><span class="dv">${f.supplier||'—'}</span></div>
        <div class="dr"><span class="dl">Entrega</span><span class="dv">${f.delivery||'—'}</span></div>
        <div class="dr"><span class="dl">Preço/t</span><span class="dv">${f.priceTon?brl(f.priceTon):'—'}</span></div>
        <div class="dr"><span class="dl">Frete/t</span><span class="dv">${f.freightTon?brl(f.freightTon):'—'}</span></div>
        <div class="dr"><span class="dl">Status</span><span class="dv">${st}</span></div>
      </div>
    </div>`;
  }).join('');
}

function expand(id){const d=g('fd-'+id);const a=g('arr-'+id);const o=d.classList.toggle('open');if(a)a.textContent=o?'▲':'▼'}
function toggleAct(id,e){e.stopPropagation();const f=ferts.find(x=>x.id===id);if(!f)return;f.active=!f.active;saveFerts();renderFerts();toast(f.active?'Ativado':'Inativado')}
function delProd(id){if(!confirm('Excluir este produto?'))return;ferts=ferts.filter(f=>f.id!==id);saveFerts();renderFerts();toast('Removido','er')}
function dupProd(id){const o=ferts.find(f=>f.id===id);if(!o)return;const c=JSON.parse(JSON.stringify(o));c.id=uid();c.name+=' (cópia)';ferts.push(c);saveFerts();renderFerts();toast('Duplicado','ok')}
function editProd(id){const f=ferts.find(x=>x.id===id);if(!f)return;editId=id;nuts={...f.nutrients};g('drw-prod-title').textContent='Editar Produto';g('p-nome').value=f.name||'';g('p-forn').value=f.supplier||'';g('p-entrega').value=f.delivery||'';g('p-preco').value=f.priceTon||'';g('p-frete').value=f.freightTon||'';g('p-carga').value=f.minLoadTon||'';g('nut-form').style.display='none';renderNutTags();openDrw('drw-prod')}
function openAddProduct(){editId=null;nuts={};g('drw-prod-title').textContent='Novo Produto';['p-nome','p-forn','p-entrega','p-preco','p-frete','p-carga'].forEach(i=>g(i).value='');g('nut-form').style.display='none';renderNutTags();openDrw('drw-prod')}
function openDrw(id){g(id).classList.add('on')}
function closeDrw(id){g(id).classList.remove('on')}
function showNutForm(){g('nut-form').style.display='block';g('nt-val').value='';g('nt-val').focus()}
function hideNutForm(){g('nut-form').style.display='none'}
function addNut(){const k=g('nt-sel').value;const v=parseFloat(g('nt-val').value);if(!k||isNaN(v)||v<0||v>100){toast('Teor inválido (0–100%)','er');return}nuts[k]=v;hideNutForm();renderNutTags()}
function removeNut(k){delete nuts[k];renderNutTags()}
function renderNutTags(){const ord=['N','P2O5','K2O','S','B','Zn','Mg','Ca'];const keys=Object.keys(nuts).sort((a,b)=>ord.indexOf(a)-ord.indexOf(b));g('nut-tags').innerHTML=keys.map(k=>`<span class="nt">${fmtNK(k)} ${nuts[k]}%<span class="nt-x" onclick="removeNut('${k}')">×</span></span>`).join('')||'<span style="font-size:.74em;color:var(--txm)">Nenhum nutriente</span>'}
function saveProd(){
  const name=g('p-nome').value.trim();if(!name){toast('Nome obrigatório','er');return}
  const p={id:editId||uid(),active:true,status:Object.keys(nuts).length>0?'ok':'review',name,supplier:g('p-forn').value.trim(),delivery:g('p-entrega').value.trim(),priceTon:parseFloat(g('p-preco').value)||0,freightTon:parseFloat(g('p-frete').value)||0,minLoadTon:parseFloat(g('p-carga').value)||0,nutrients:{...nuts}};
  if(editId){const i=ferts.findIndex(f=>f.id===editId);ferts[i]=p;toast('Atualizado','ok')}else{ferts.push(p);toast('Adicionado','ok')}
  saveFerts();renderFerts();closeDrw('drw-prod');editId=null;
}

/* ===== PARSER IMPORTAÇÃO ===== */
function parseBRL(s){if(!s)return 0;s=String(s).trim().replace(/R\$\s*/,'').replace(/\s/g,'');if(s==='-'||!s)return 0;if(s.includes(',')&&s.includes('.')){s=s.lastIndexOf(',')>s.lastIndexOf('.')?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'')}else if(s.includes(','))s=s.replace(',','.');return parseFloat(s)||0}
function parseNPK(name){
  const n={};
  if(/KCL\s*60/i.test(name)){n.K2O=60;return n}
  const kcl=name.match(/KCL\s*(\d+)/i);if(kcl){n.K2O=parseFloat(kcl[1]);return n}
  const ur=name.match(/UREIA\s*(\d+)/i);if(ur){n.N=parseFloat(ur[1]);return n}
  const map=name.match(/MAP\s*(\d+)[-–](\d+)/i);if(map){n.N=parseFloat(map[1]);n.P2O5=parseFloat(map[2]);return n}
  const tsp=name.match(/TSP\s*(\d+)/i);if(tsp){n.P2O5=parseFloat(tsp[1]);return n}
  const ssp=name.match(/SSP\s*(\d+)/i);if(ssp){n.P2O5=parseFloat(ssp[1]);return n}
  const sam=name.match(/SAM\s*([\d.]+)[/,]([\d.]+)/i);if(sam){n.N=parseFloat(sam[1]);n.S=parseFloat(sam[2]);return n}
  const npk=name.match(/(\d{2})[-–](\d{2})[-–](\d{2})/);if(npk){n.N=parseInt(npk[1]);n.P2O5=parseInt(npk[2]);n.K2O=parseInt(npk[3]);return n}
  return null;
}
function parseLine(line,defF,defE,defFr){
  line=line.trim();if(!line)return null;
  const ps=line.split(/[|;,\t]/).map(s=>s.trim());
  let sup='',name='',del='',price=0,fr=defFr;
  if(ps.length>=5){sup=ps[0]||defF;name=ps[1];del=ps[2]||defE;const p3=parseBRL(ps[3]),p4=parseBRL(ps[4]);price=p3>0?p3:p4}
  else if(ps.length===4){sup=ps[0]||defF;name=ps[1];del=ps[2]||defE;price=parseBRL(ps[3])}
  else if(ps.length===3){name=ps[0];del=ps[1]||defE;price=parseBRL(ps[2]);sup=defF}
  else if(ps.length===2){name=ps[0];price=parseBRL(ps[1]);sup=defF;del=defE}
  else{name=ps[0];sup=defF;del=defE}
  if(!name)return null;
  const nuts=parseNPK(name);
  return{id:uid(),active:true,status:nuts&&Object.keys(nuts).length>0?'ok':'review',name:name.trim(),supplier:sup.trim(),delivery:del.trim(),priceTon:price,freightTon:fr,minLoadTon:0,nutrients:nuts||{}};
}
function isDup(p){return ferts.some(f=>f.name.toLowerCase()===p.name.toLowerCase()&&f.supplier.toLowerCase()===p.supplier.toLowerCase()&&f.delivery.toLowerCase()===p.delivery.toLowerCase())}

/* ===== IMPORT STEPS ===== */
function impGoStep(n){
  [1,2,3].forEach(i=>{g('imp-s'+i).style.display=i===n?'block':'none';const d=g('sd-'+i);if(d)d.classList.toggle('done',i<=n)});
  const labels=['','Etapa 1 de 3 — Cole a lista','Etapa 2 de 3 — Pré-visualização','Etapa 3 de 3 — Concluído'];
  g('imp-step-label').textContent=labels[n]||'';
}
function previsualizar(){
  const raw=g('raw-input').value.trim();if(!raw){toast('Cole alguma lista primeiro','er');return}
  const defF=g('def-forn').value.trim(),defE=g('def-entrega').value.trim(),defFr=parseFloat(g('def-frete').value)||0;
  parsedImport=raw.split('\n').map(l=>parseLine(l,defF,defE,defFr)).filter(Boolean);
  if(!parsedImport.length){toast('Nenhuma linha válida','er');return}
  const dups=parsedImport.filter(p=>isDup(p));
  const oks=parsedImport.filter(p=>p.status==='ok'&&!isDup(p));
  const revs=parsedImport.filter(p=>p.status==='review');
  g('imp-stats').innerHTML=`<div class="stat"><div class="stat-n">${parsedImport.length}</div><div class="stat-l">Lidas</div></div><div class="stat s-ok"><div class="stat-n">${oks.length}</div><div class="stat-l">OK</div></div><div class="stat s-wn"><div class="stat-n">${revs.length}</div><div class="stat-l">Revisar</div></div><div class="stat s-bl"><div class="stat-n">${dups.length}</div><div class="stat-l">Duplicadas</div></div>`;
  g('dup-section').style.display=dups.length?'block':'none';
  g('prev-label').textContent=parsedImport.length+' produtos para importar';
  g('prev-list').innerHTML=parsedImport.map(p=>{
    const dup=isDup(p);const cls=dup?'p-dup':p.status==='review'?'p-rev':'p-ok';
    const badge=dup?'<span class="mini-badge mb-dup">Dup</span>':p.status==='review'?'<span class="mini-badge mb-rev">Revisar</span>':'<span class="mini-badge mb-ok">OK</span>';
    const pr=p.priceTon?'R$ '+p.priceTon.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'/t':'—';
    return`<div class="pcard ${cls}"><div class="p-info"><div class="p-name">${p.name}${badge}</div><div class="p-nuts">${fmtN(p.nutrients)}</div><div class="p-meta">${p.supplier||'—'} · ${p.delivery||'—'}</div></div><div class="p-price">${pr}</div></div>`;
  }).join('');
  impGoStep(2);
}
function importar(){
  const dupAct=document.querySelector('input[name="dup"]:checked')?.value||'ignore';
  let added=0,updated=0,skipped=0;
  parsedImport.forEach(p=>{
    const di=ferts.findIndex(f=>f.name.toLowerCase()===p.name.toLowerCase()&&f.supplier.toLowerCase()===p.supplier.toLowerCase()&&f.delivery.toLowerCase()===p.delivery.toLowerCase());
    if(di>=0){if(dupAct==='ignore')skipped++;else if(dupAct==='update'){ferts[di].priceTon=p.priceTon;updated++;}else{ferts.push({...p,id:uid()});added++;}}
    else{ferts.push(p);added++;}
  });
  saveFerts();renderFerts();
  g('done-title').textContent=`${added+updated} produto${added+updated!==1?'s':''} importado${added+updated!==1?'s':''}`;
  g('done-sub').textContent=`${added} adicionado${added!==1?'s':''}${updated?' · '+updated+' atualizado'+(updated!==1?'s':''):''}${skipped?' · '+skipped+' ignorado'+(skipped!==1?'s':''):''}`;
  toast(`${added+updated} importado${added+updated!==1?'s':''}!`,'ok');
  impGoStep(3);
}
function novaImport(){parsedImport=[];g('raw-input').value='';impGoStep(1)}

/* ===== SOLVER ===== */
function getValid(){return ferts.filter(f=>f.active&&f.status==='ok'&&(f.priceTon||0)>0&&Object.values(f.nutrients||{}).some(v=>v>0))}
function combs(arr,k){if(k===1)return arr.map(x=>[x]);const r=[];for(let i=0;i<arr.length;i++)combs(arr.slice(i+1),k-1).forEach(c=>r.push([arr[i],...c]));return r}
function calcCombo(prods,tgts,area){
  const NUTS=['N','P2O5','K2O','S'],active=NUTS.filter(n=>(tgts[n]||0)>0);
  if(!active.length)return null;
  const sorted=[...prods].sort((a,b)=>(b.nutrients[active[0]]||0)-(a.nutrients[active[0]]||0));
  const rem={};active.forEach(n=>rem[n]=tgts[n]);
  const doses=[];
  for(const p of sorted){
    let best=0;
    for(const n of active){const t=p.nutrients[n]||0;if(t>0&&(rem[n]||0)>0.01){const d=100*rem[n]/t;if(d>best)best=d;}}
    if(best<0.001)continue;
    const del={};active.forEach(n=>{del[n]=(best*(p.nutrients[n]||0))/100;rem[n]=Math.max(0,(rem[n]||0)-del[n]);});
    const tonHa=best/1000;
    doses.push({prod:p,dose:best,tonHa,costHa:tonHa*(p.priceTon||0),frHa:tonHa*(p.freightTon||0),del,tonTotal:tonHa*area,costTotal:tonHa*(p.priceTon||0)*area});
  }
  if(!doses.length)return null;
  const tCH=doses.reduce((s,d)=>s+d.costHa,0),tFH=doses.reduce((s,d)=>s+d.frHa,0),tT=doses.reduce((s,d)=>s+d.tonTotal,0),tC=doses.reduce((s,d)=>s+d.costTotal,0);
  const finDel={};active.forEach(n=>{finDel[n]=doses.reduce((s,d)=>s+(d.del[n]||0),0);});
  let err=0;active.forEach(n=>{if(tgts[n]>0)err+=Math.abs(tgts[n]-(finDel[n]||0))/tgts[n];});err/=active.length;
  const sob=active.reduce((s,n)=>s+Math.max(0,(finDel[n]||0)-tgts[n]),0);
  return{doses,tCH,tFH,tT,tC,err,sob,finDel,active,area};
}
function scoreC(c,cr){switch(cr){case'cost':return c.tCH*0.70+c.err*1000*0.20+c.sob*0.10;case'freight':return c.tFH*0.70+c.tCH*0.20+c.err*1000*0.10;case'error':return c.err*1000*0.60+c.tCH*0.30+c.sob*0.10;case'ton':return c.tT*0.60+c.tCH*0.30+c.err*1000*0.10;default:return c.err*1000*0.40+c.tCH*0.30+c.tFH*0.15+c.sob*0.10+c.doses.length*50*0.05}}
function sMax(n){mxP=n;document.querySelectorAll('[data-m]').forEach(b=>b.classList.toggle('on',+b.dataset.m===n))}
function sShow(n){shN=n;document.querySelectorAll('[data-n]').forEach(b=>b.classList.toggle('on',+b.dataset.n===n))}
function setCrit(cr){currentCrit=cr;document.querySelectorAll('.ctab').forEach(b=>b.classList.toggle('on',b.dataset.c===cr));if(lastResults){const s=[...lastResults].sort((a,b)=>scoreC(a,cr)-scoreC(b,cr));renderCards(s.slice(0,shN),lastTgts,cr)}}

function run(){
  const area=parseFloat(g('fa').value)||0;if(!area){toast('Informe a área','er');return}
  const tgts={N:parseFloat(g('fn').value)||0,P2O5:parseFloat(g('fp').value)||0,K2O:parseFloat(g('fk').value)||0,S:parseFloat(g('fs').value)||0};
  if(!Object.values(tgts).some(v=>v>0)){toast('Defina ao menos uma meta','er');return}
  const v=getValid();if(!v.length){toast('Nenhum produto válido','er');return}
  const all=[];
  for(let k=1;k<=Math.min(mxP,v.length,6);k++)combs(v,k).forEach(ps=>{const r=calcCombo(ps,tgts,area);if(r)all.push(r);});
  if(!all.length){toast('Não foi possível calcular','er');return}
  all.sort((a,b)=>scoreC(a,currentCrit)-scoreC(b,currentCrit));
  lastResults=all;lastTgts=tgts;chatHistory={};
  g('emp-calc').style.display='none';g('res-cards').style.display='block';
  renderCards(all.slice(0,shN),tgts,currentCrit);
  toast('Cálculo concluído!','ok');
}

const CRL={balanced:'Balanceado',cost:'Menor custo',freight:'Menor frete',error:'Menor erro',ton:'Menor tonelada'};
const RKL=['1ª','2ª','3ª'];

function renderCards(rs,tgts,cr){
  g('res-cards').innerHTML=rs.map((r,i)=>buildCard(r,i,tgts,cr)).join('');
}

function buildCard(r,i,tgts,cr){
  const win=i===0;
  const nutHTML=r.active.map(n=>{
    const meta=tgts[n]||0,del=r.finDel[n]||0,pct=meta>0?Math.min(130,del/meta*100):0,diff=del-meta,ok=Math.abs(diff)<0.5,ov=diff>0.5;
    return`<div class="nb-row"><span class="nb-name">${fmtNK(n)}</span><div class="nb-mid"><div class="nb-track"><div class="nb-fill${ok?'':ov?' ov':' sh'}" style="width:${Math.min(100,pct)}%"></div></div><div class="nb-vals"><span>${nd(meta,0)} meta</span><span>${nd(del,1)} entregue</span></div></div><span class="nb-bdg ${ok?'b-ok':ov?'b-ov':'b-sh'}">${ok?'OK':ov?'+'+nd(diff,1)+' kg':nd(diff,1)+' kg'}</span></div>`;
  }).join('');
  const prHTML=r.doses.map(d=>`<div class="rp-item"><div class="rpn">${d.prod.name}<span class="rp-sup">${d.prod.supplier||''} · ${d.prod.delivery||''}</span></div><div class="rr"><span class="rl">Dose</span><span class="rv-bl">${nd(d.dose,1)} kg/ha</span></div><div class="rr"><span class="rl">Total (${r.area} ha)</span><span class="rv">${nd(d.tonTotal,2)} t</span></div><div class="rr"><span class="rl">Custo/ha</span><span class="rv">${brl(d.costHa)}</span></div><div class="rr"><span class="rl">Custo total</span><span class="rv">${brl(d.costTotal)}</span></div>${d.frHa>0?`<div class="rr"><span class="rl">Frete/ha</span><span class="rv">${brl(d.frHa)}</span></div>`:''}<div class="nut-pills">${r.active.filter(n=>(d.del[n]||0)>0.01).map(n=>`<span class="np">${fmtNK(n)} ${nd(d.del[n]||0,1)} kg/ha</span>`).join('')}</div></div>`).join('');
  const qPrompts=['Por que esta combinação foi escolhida?','Qual a vantagem do custo?','Há risco de excesso nutricional?','Como interpretar a sobra/falta?','Vale trocar por outro produto?'];
  const iaHTML=`<div class="ia-panel"><div class="ia-hdr" onclick="toggleIA(${i})"><div class="ia-ico">🤖</div><div class="ia-title">Explicar com IA</div><div class="ia-st" id="ia-st-${i}">${getKey()?'Pronta':'Sem chave'}</div><div class="ia-arr" id="ia-arr-${i}">▼</div></div><div class="ia-body" id="ia-body-${i}"><div class="quick-prompts">${qPrompts.map(q=>`<button class="qp" onclick="askAI('${q.replace(/'/g,"\\'")}',${i})">${q}</button>`).join('')}</div><div class="ia-chat" id="chat-${i}"><div class="msg msg-a">Analisarei a combinação ${i+1}. Escolha uma pergunta ou escreva.</div></div><div style="padding:7px 11px;border-top:1px solid var(--bd);display:flex;gap:5px"><input class="inp" id="ia-inp-${i}" placeholder="Sua pergunta..." style="flex:1;font-size:.79em" onkeydown="if(event.key==='Enter')sendMsg(${i})"><button class="btn-xs save-btn" onclick="sendMsg(${i})">Enviar</button></div><div class="ia-disc">IA explica — não calcula. Baseada apenas nos dados acima.</div></div></div>`;
  return`<div class="${win?'rc-win':'rc'}" style="margin-bottom:12px">${win?'<div class="ribbon">Melhor opção</div>':''}<div class="${win?'rh rh-w':i===1?'rh rh-2':'rh rh-3'}"><div class="${win?'rk rk-w':i===1?'rk rk-2':'rk rk-3'}">${RKL[i]||''}</div><div class="${win?'rht rht-w':i===1?'rht rht-2':'rht rht-3'}">${r.doses.map(d=>d.prod.name).join(' + ')}</div><div class="${win?'rbg rbg-w':'rbg rbg-2'}">${CRL[cr]}</div></div>${prHTML}<div class="rs"><div style="font-size:.6em;font-weight:600;color:var(--txm);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Resumo</div><div class="sg"><div class="ss"><div class="sn">${brl(r.tCH)}</div><div class="sl2">Custo/ha</div></div><div class="ss"><div class="sn">${nd(r.tT,2)} t</div><div class="sl2">Total área</div></div><div class="ss"><div class="sn">${brl(r.tC)}</div><div class="sl2">Custo total</div></div><div class="ss"><div class="sn">${brl(r.tFH)}</div><div class="sl2">Frete/ha</div></div></div><div style="font-size:.6em;font-weight:600;color:var(--txm);text-transform:uppercase;letter-spacing:.4px;margin-bottom:5px">Balanço nutricional</div>${nutHTML}</div>${iaHTML}</div>`;
}

/* ===== IA ===== */
function buildCtx(){
  if(!lastResults||!lastTgts)return'';
  const cult=g('fc').value,area=g('fa').value;
  const lines=[`Cultura: ${cult} | Área: ${area} ha | Critério: ${CRL[currentCrit]}`,`Metas (kg/ha): N=${lastTgts.N||0} P₂O₅=${lastTgts.P2O5||0} K₂O=${lastTgts.K2O||0} S=${lastTgts.S||0}`,''];
  lastResults.slice(0,shN).forEach((r,i)=>{
    lines.push(`--- Combinação ${i+1} ${i===0?'(MELHOR)':''}---`);
    r.doses.forEach(d=>{lines.push(`${d.prod.name} | ${fmtN(d.prod.nutrients)} | R$ ${d.prod.priceTon}/t`);lines.push(`  Dose: ${nd(d.dose,1)} kg/ha | Total: ${nd(d.tonTotal,2)} t | Custo/ha: ${brl(d.costHa)}`);});
    lines.push(`Custo/ha: ${brl(r.tCH)} | Total: ${nd(r.tT,2)} t | Total R$: ${brl(r.tC)}`);
    r.active.forEach(n=>{const m=lastTgts[n],d=r.finDel[n]||0,diff=d-m;lines.push(`${fmtNK(n)}: meta ${m} → entregue ${nd(d,1)} [${Math.abs(diff)<0.5?'OK':diff>0?'SOBRA '+nd(diff,1):'FALTA '+nd(Math.abs(diff),1)} kg/ha]`);});
    lines.push('');
  });
  return lines.join('\n');
}

function toggleIA(i){const b=g('ia-body-'+i);const a=g('ia-arr-'+i);const o=b.classList.toggle('open');if(a)a.classList.toggle('open',o)}
function sendMsg(i){const inp=g('ia-inp-'+i);const q=inp.value.trim();if(!q)return;inp.value='';askAI(q,i)}

async function askAI(question,cardIdx){
  const key=getKey();
  const chatEl=g('chat-'+cardIdx);if(!chatEl)return;
  if(!chatHistory[cardIdx])chatHistory[cardIdx]=[];
  chatHistory[cardIdx].push({role:'user',content:question});
  chatEl.innerHTML+=`<div class="msg msg-u">${escH(question)}</div>`;
  const tid='tk-'+Date.now();
  chatEl.innerHTML+=`<div class="msg msg-a thinking" id="${tid}">Analisando...</div>`;
  chatEl.scrollTop=chatEl.scrollHeight;
  if(!key){document.getElementById(tid).textContent='⚠ Configure a API Key no cabeçalho. Chave gratuita em openrouter.ai/keys';document.getElementById(tid).classList.remove('thinking');return}
  const sys=`Você é um agrônomo especialista em fertilização do Cerrado brasileiro.\n\nDados do resultado:\n${buildCtx()}\n\nREGRAS ABSOLUTAS:\n1. NUNCA recalcule valores — os números acima são a fonte da verdade\n2. NUNCA invente produtos, nutrientes ou dados externos\n3. SÓ explique, justifique e analise com base nos dados fornecidos\n4. Resposta em português, objetiva, máximo 180 palavras\n5. Recuse gentilmente perguntas fora do escopo agronômico`;
  const msgs=[{role:'system',content:sys},...(chatHistory[cardIdx]||[]).slice(-6)];
  try{
    const res=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key,'HTTP-Referer':'https://soloforte.app','X-Title':'FertiCalc SoloForte'},body:JSON.stringify({model:'deepseek/deepseek-chat:free',temperature:0.2,max_tokens:300,messages:msgs})});
    if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e?.error?.message||'Erro '+res.status)}
    const data=await res.json();
    const reply=data?.choices?.[0]?.message?.content||'Sem resposta.';
    chatHistory[cardIdx].push({role:'assistant',content:reply});
    const el=document.getElementById(tid);if(el){el.textContent=reply;el.classList.remove('thinking')}
    chatEl.scrollTop=chatEl.scrollHeight;
  }catch(e){const el=document.getElementById(tid);if(el){el.textContent='⚠ '+e.message;el.classList.remove('thinking')}}
}

/* ===== MOBILE TAB NAVIGATION ===== */
const isMob=()=>window.innerWidth<=700;

function mobTab(tab){
  if(!isMob())return;

  // Atualiza tabs ativos
  ['prod','calc','res','imp'].forEach(t=>{
    const btn=g('tab-'+t);
    if(btn) btn.classList.toggle('on',t===tab);
  });

  // Esconde tudo
  g('lp').classList.remove('mob-active');
  g('rp').classList.remove('mob-active');

  // FAB só aparece na aba Produtos
  const fab=g('fab-add');
  if(fab) fab.style.display=tab==='prod'?'flex':'none';

  if(tab==='prod'){
    g('lp').classList.add('mob-active');
    g('hdr-title').textContent='Fertilizantes';

  } else if(tab==='calc'){
    g('rp').classList.add('mob-active');
    showView('view-calc');
    g('hdr-title').textContent='Calcular';
    // Esconde resultado, mostra filtros
    g('emp-calc').style.display='flex';
    if(g('res-cards')) g('res-cards').style.display='none';

  } else if(tab==='res'){
    g('rp').classList.add('mob-active');
    showView('view-calc');
    g('hdr-title').textContent='Resultado';
    // Mostra resultado se houver, senão empty
    if(lastResults){
      g('emp-calc').style.display='none';
      if(g('res-cards')) g('res-cards').style.display='block';
    } else {
      g('emp-calc').style.display='flex';
    }
    // badge
    const badge=g('tab-res-badge');
    if(badge) badge.style.display='none';

  } else if(tab==='imp'){
    g('rp').classList.add('mob-active');
    showView('view-import');
    g('hdr-title').textContent='Importar';
    impGoStep(1);
  }
}

// Inicializa mobile
function initMob(){
  if(!isMob())return;
  // Esconde key status e btn-add no header
  const ksw=g('key-status-wrap');if(ksw)ksw.style.display='none';
  // Ativa tab Produtos por padrão
  mobTab('prod');
}

// Intercept run() para redirecionar resultado no mobile
const _runOrig=run;
window.run=function(){
  _runOrig();
  if(isMob()&&lastResults){
    // Mostra badge de resultado
    const badge=g('tab-res-badge');
    if(badge) badge.style.display='flex';
    // Vai para aba resultado
    setTimeout(()=>mobTab('res'),300);
  }
};

window.addEventListener('resize',()=>{
  if(!isMob()){
    // Restaura desktop
    g('lp').classList.remove('mob-active');
    g('rp').classList.remove('mob-active');
    g('lp').style.display='';
    g('rp').style.display='';
    const fab=g('fab-add');if(fab)fab.style.display='none';
  } else {
    initMob();
  }
});

/* ===== SEED DE PRODUTOS (carrega se localStorage vazio) ===== */
function seedIfEmpty(){
  if(ferts.length>0)return; // já tem dados, não sobrescreve

  const mkP=(name,sup,del,price,fr=0)=>{
    const n=parseNPK(name);
    return{id:uid(),active:true,status:n&&Object.keys(n).length>0?'ok':'review',
      name,supplier:sup,delivery:del,priceTon:price,freightTon:fr,minLoadTon:0,
      nutrients:n||{},micros:{},
      createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  };

  const CIBRA=[
    ['CIBRAMIX I 00-14-18 MG',3612.18],['CIBRAMIX 00-20-00',3503.34],['CIBRAMIX I 00-20-20 MG',4359.66],
    ['CIBRAMIX 00-22-00',3734.63],['CIBRAMIX I 00-25-00 MG',4081.56],['CIBRAMIX I 00-25-23 MG',5136.93],
    ['CIBRAMIX I 00-30-10',5074.74],['CIBRAMIX 00-30-15 MG',5285.62],['CIBRAMIX 00-32-00 MG',4884.27],
    ['CIBRAMIX 00-44-00 MG',6278.80],['CIBRAMIX I 02-17-24 MG',4244.85],['CIBRAMIX 02-18-18 MG',4142.78],
    ['CIBRAMIX I 02-20-20 MG',4414.89],['CIBRAMIX 02-24-12 MG',4347.34],['CIBRAMIX 02-25-00 MG',3993.13],
    ['CIBRAMIX 02-25-25 MG',5197.19],['CIBRAMIX 02-26-00 MG',4340.06],['CIBRAMIX I 03-26-00 MG I',4523.73],
    ['CIBRAMIX 03-28-06 MG',5462.46],['CIBRAMIX 03-32-08 MG',5455.69],['CIBRAMIX 03-44-00 MG',6353.63],
    ['CIBRAMIX I 04-14-08 MG',5848.92],['CIBRAMIX 04-30-10 MG',4523.73],['CIBRAMIX I 04-30-10 MG',4789.00],
    ['CIBRAMIX I 05-25-25 MG',5203.99],['CIBRAMIX 05-35-00 MG',5380.86],['CIBRAMIX I 06-30-06 MG',5387.66],
    ['CIBRAMIX I 06-37-00 MG',5816.22],['CIBRAMIX I 07-34-09 MG',5755.00],['CIBRAMIX I 07-40-00 MG',6027.10],
    ['CIBRAMIX I 08-28-08 MG',6442.06],['CIBRAMIX I 09-46-00 MG',6782.19],['CIBRAMIX I 10-15-15 MG',4183.60],
    ['CIBRAMIX 10-20-10 MG',4510.12],['CIBRAMIX I 10-20-10 MG',5557.75],['CIBRAMIX I 10-50-00 MG',7840.01],
    ['KCL 60 GR',3584.97],['MAP 11-52/44 GR',7333.61],['SAM 20,5/23 GR',2578.19],
    ['SSP 19/16 + 16CA + 11S/SO4 GR',2953.88],['SSP 19/16 + 16CA + 10S/SO4 r',3238.04],
    ['SSP 20/16 GR',3387.70],['TSP 46/36 GR',6319.62],['UREIA 46 GR',3460.41],
    ['10-30-10 MG',5401.27],['10-49-00 + 0,75% ZN MG',7183.55],['10-50-00 MG',7115.92],
    ['10-15-15 MG',4176.88],['13-10-10 MG',3503.34],['00-00-54 +1B MG',3795.85],
    ['00-00-57 +0,5B MG',3687.01],['00-14-18 MG',3496.56],['00-17-24 MG',4027.14],
    ['00-18-18 MG',3891.09],['00-20-20 MG',3894.30],['00-20-25 MG',4408.09],
    ['00-20-30 MG',4618.97],['00-22-00 MG',3591.77],['00-25-00 MG',3931.90],
    ['00-25-25 MG',5176.78],['00-30-10 MG',4925.08],['00-30-15 MG',5129.16],
    ['00-30-20 MG',5374.06],['00-32-00 MG',4727.83],['00-33-00 MG',4843.45],
    ['00-36-00 MG',5190.38],['00-24-12 MG',3435.31],['00-24-16 MG',4129.18],
    ['02-20-20 MG',4265.23],['02-24-12 MG',4380.88],['02-25-00 MG',3993.13],
    ['02-25-23 MG',5081.56],['02-30-10 MG',4986.31],['03-28-00 MG',4367.27],
    ['03-30-15 MG',5224.40],['03-32-08 MG',5163.17],['04-14-08 MG',3904.07],
    ['04-20-30 MG',4374.07],['04-26-10 MG',4659.78],['04-30-10 MG',5047.53],
    ['04-35-10 MG',6108.74],['04-40-08 MG',6108.74],['04-50-20 MG',4823.04],
    ['05-25-15 MG',4761.82],['05-25-25 MG',5176.78],['05-25-30 MG',5394.46],
    ['05-35-00 MG',5244.81],['06-28-20 + 1%Zn MG',5350.92],['06-30-06 MG',4999.91],
    ['06-30-10 +0,5B+0,75Zn MG',5544.12],['06-30-10 MG',5496.50],['07-34-09 MG',5605.34],
    ['07-40-00 MG',5870.65],['08-20-00 MG',3183.63],['08-20-20 MG',4625.77],
    ['08-28-16 MG',5299.23],['08-28-16 + 1% ZN MG',5330.52],
    ['08-40-07 +0,5B+0,75ZN MG',6605.31],['08-40-08 MG',6292.41],['09-46-00 MG',6612.13],
    ['10-15-15 MG',3326.47],['10-20-10 MG',4367.27],['13-11-21 MG',4149.59],
    ['15-00-15 MG',2829.88],['15-00-30 MG',3707.45],['15-15-15 MG',4510.12],
    ['16-16-16 MG',4836.65],['18-18-18 MG',5482.90],['20-00-10 MG',3095.18],
    ['20-00-20 MG',3793.86],['20-05-20 MG',4408.09],['20-10-00 MG',4292.44],
    ['20-10-20 MG',4789.00],['26-00-26 MG',4993.11],['27-00-24 MG',5034.33],
    ['30-00-20 MG',5244.81],['33-00-00 MG',3456.41],['36-00-12 MG',5337.32],
    ['NITROCAP 18-10-05 0,5B 0,75Zn GR',4421.69],['NITROCAP 20-00-20 MG',3965.92],
    ['NITROCAP 20-00-30 MG',4618.91],['NITROCAP 20-10-10 MG',4466.32],
    ['NITROCAP 21-00-21 MG',4163.19],['NITROCAP 25-00-25 MG',4993.11],
    ['NITROCAP 27-00-24 MG',4993.11],['NITROCAP 30-00-20 MG',5411.41],
    ['NITROCAP 30-10-10 MG',3904.66],['NITROCAP 33-00-00 MG',3469.31],
    ['NITROCAP 36-00-12 MG',5741.40],['NITROCAP 45-00-00 I',6021.55],['NITROCAP 46 GR',4299.11],
  ].map(([n,p])=>mkP(n,'Cibra','Julho',p,0));

  const TIMAC=[
    ['K-UP 500 B1',6349.54],['SULFAMMO MeTA 17 B1',6824.05],['SULFAMMO MeTA 214 K B1',6099.17],
    ['SULFAMMO MeTA 29 B1',7527.95],['SULFAMMO ULTRA B1',7257.92],['SULFAMMO MeTA S B1',6618.25],
    ['TOP-PHOS 280 HP B1',6416.39],['TOP-PHOS 319 MASTER B1',6184.37],['TOP-PHOS 328 MASTER B1',7200.25],
    ['TOP-PHOS 88 MASTER B1',7510.91],['TOP-PHOS 842 MASTER B1',8909.54],
    ['NP PLUS 640 MASTER B1',8857.11],['INPZZA 470 MASTER B1',7185.83],['INPZZA 540 MASTER B1',8440.27],
  ].map(([n,p])=>mkP(n,'TIMAC','Julho',p,0));

  const MOTTA=[
    mkP('KCL 60% GR','Motta Fertilizantes','Mai-Jul',3767.27,0),
    mkP('SSP 19%','Motta Fertilizantes','Mai-Jul',3392.66,0),
    mkP('TSP 46%','Motta Fertilizantes','Mai-Jul',6113.86,0),
    mkP('KCL 60% GR','Motta Fertilizantes','Mai-Jul',3590.57,0),
    mkP('SSP 19%','Motta Fertilizantes','Mai-Jul',3208.90,0),
    mkP('TSP 46%','Motta Fertilizantes','Mai-Jul',5930.10,0),
  ];

  ferts=[...CIBRA,...TIMAC,...MOTTA];
  saveFerts();
  toast('✓ '+ferts.length+' produtos carregados (Cibra, TIMAC, Motta)','ok');
}

/* ===== INIT ===== */
document.addEventListener('input',e=>{if(e.target.type==='number'&&e.target.value.length>7)e.target.value=e.target.value.slice(0,7)});
updateKeyStatus();
seedIfEmpty();
renderFerts();
initMob();

// PWA
if('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').catch(()=>{});
