// ══════════════════════════════════════════
//  SUPABASE CLIENT
// ══════════════════════════════════════════
const SB_URL = 'https://qluhfbdlvudgffakiwbr.supabase.co';
const SB_KEY = 'sb_publishable_gmZ5C1Ae6dPSFeEtstffRg_5nJdSRq8';
const { createClient } = supabase;
const sb = createClient(SB_URL, SB_KEY);

// ══════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════
async function fazerLogin() {
  const email = document.getElementById('lg-email').value.trim();
  const senha = document.getElementById('lg-senha').value;
  const err   = document.getElementById('lg-err');
  const btn   = document.querySelector('.login-btn');

  if (!email || !senha) { err.textContent = 'Preencha e-mail e senha.'; err.style.display = 'block'; return; }

  btn.disabled = true;
  btn.textContent = 'Entrando...';

  const { error } = await sb.auth.signInWithPassword({ email, password: senha });

  if (error) {
    err.textContent = 'E-mail ou senha incorretos.';
    err.style.display = 'block';
    document.getElementById('lg-senha').value = '';
    btn.disabled = false;
    btn.textContent = 'Entrar';
  } else {
    err.style.display = 'none';
    mostrarApp();
    iniciarApp();
  }
}

function mostrarApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-shell').classList.add('visible');
}

async function fazerLogout() {
  await sb.auth.signOut();
  document.getElementById('app-shell').classList.remove('visible');
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('lg-email').value = '';
  document.getElementById('lg-senha').value = '';
}

// ══════════════════════════════════════════
//  SUPABASE API
// ══════════════════════════════════════════
async function getToken() {
  const { data: { session } } = await sb.auth.getSession();
  return session ? session.access_token : SB_KEY;
}

async function sbGet(table, params='') {
  const token = await getToken();
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${params}`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${token}` }
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function sbInsert(table, data) {
  const token = await getToken();
  const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(data)
  });
  if (!r.ok) throw new Error(await r.text());
}

async function sbUpdate(table, id, data) {
  const token = await getToken();
  const r = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(data)
  });
  if (!r.ok) throw new Error(await r.text());
}

async function sbDelete(table, id) {
  const token = await getToken();
  const r = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { apikey: SB_KEY, Authorization: `Bearer ${token}` }
  });
  if (!r.ok) throw new Error(await r.text());
}

async function sbUpsert(table, data) {
  const token = await getToken();
  const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(data)
  });
  if (!r.ok) throw new Error(await r.text());
}

// ══════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const TIPO_COR = {'FIXO':'badge-fixo','CARTÃO':'badge-cartao','PARCELADO':'badge-parcelado','PAG ÚNICO':'badge-pag-unico'};

const CAT_DEFAULT = {
  'Moradia':'#5b9ef9','Telefone':'#a78bfa','Alimentação':'#f5a623',
  'Transporte':'#3ecf8e','Saúde':'#f472b6','Educação':'#60c8e8',
  'Lazer':'#ff5a5a','Vestuário':'#ffd166','Assinaturas':'#b8f04a',
  'Empréstimo':'#ff8c42','Investimento':'#34d399','Outros':'#888888'
};

let S = {
  lancamentos:[], fixas:[], rendasFixas:[], rendasVar:[], metas:[],
  mes: new Date().getMonth(), ano: new Date().getFullYear(),
  darkMode:true, filtroDesp:'todos', charts:{},
  categorias: {...CAT_DEFAULT}
};

function catCor(cat) {
  return S.categorias[cat] || S.categorias[cat?.replace('cao','ção')] || '#888888';
}

// ══════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════
window.onload = async () => {
  const theme = localStorage.getItem('fg_dark');
  S.darkMode = theme === null ? true : theme === '1';
  const cats = localStorage.getItem('fg_cats');
  if (cats) try { S.categorias = JSON.parse(cats); } catch(e){}
  aplicarTema();

  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    mostrarApp();
    iniciarApp();
  }
};

function iniciarApp() {
  document.getElementById('f-data').value = hoje();
  document.getElementById('rv-data').value = hoje();
  document.getElementById('f-tipo').addEventListener('change', onTipo);
  updMesLbl();
  popularSelectsCats();
  loadAll();
}

// ══════════════════════════════════════════
//  CATEGORIAS
// ══════════════════════════════════════════
function popularSelectsCats() {
  const cats = Object.keys(S.categorias);
  ['f-cat','mf-cat','edit-cat','ef-cat'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const val = el.value;
    el.innerHTML = '<option value="">Selecionar...</option>' + cats.map(c=>`<option value="${c}">${c}</option>`).join('');
    if (val) el.value = val;
  });
}

function renderCfgCats() {
  const cats = Object.entries(S.categorias);
  document.getElementById('cfg-cats').innerHTML = cats.map(([nome, cor]) => `
    <div class="cat-row">
      <div class="cat-swatch" style="background:${cor}" onclick="document.getElementById('cc-${nome.replace(/\s/g,'_')}').click()"></div>
      <input type="color" id="cc-${nome.replace(/\s/g,'_')}" class="cat-color-input" value="${cor}" onchange="alterarCorCat('${nome}',this.value)" style="display:none">
      <span class="cat-name">${nome}</span>
      <span style="font-size:11px;color:var(--text3)">${cor}</span>
      <button class="btn btn-danger btn-sm" onclick="removerCategoria('${nome}')">✕</button>
    </div>`).join('');
}

function alterarCorCat(nome, cor) {
  S.categorias[nome] = cor;
  salvarCats();
  renderCfgCats();
  renderDash();
}

function adicionarCategoria() {
  const nome = document.getElementById('nova-cat-nome').value.trim();
  const cor  = document.getElementById('nova-cat-cor').value;
  if (!nome) { toast('Digite o nome da categoria.','err'); return; }
  if (S.categorias[nome]) { toast('Categoria já existe.','err'); return; }
  S.categorias[nome] = cor;
  salvarCats();
  document.getElementById('nova-cat-nome').value = '';
  popularSelectsCats();
  renderCfgCats();
  toast(`Categoria "${nome}" adicionada!`,'ok');
}

function removerCategoria(nome) {
  if (!confirm(`Remover a categoria "${nome}"? Lançamentos existentes não serão afetados.`)) return;
  delete S.categorias[nome];
  salvarCats();
  popularSelectsCats();
  renderCfgCats();
  toast('Categoria removida.','ok');
}

function salvarCats() { localStorage.setItem('fg_cats', JSON.stringify(S.categorias)); }

// ══════════════════════════════════════════
//  LOAD
// ══════════════════════════════════════════
async function loadAll(showToast=false) {
  showLoading(true);
  try {
    const [lancs, fixas, rf, rv, metas] = await Promise.all([
      sbGet('lancamentos','order=data.asc,created_at.asc'),
      sbGet('despesas_fixas','order=created_at.asc'),
      sbGet('rendas_fixas','order=created_at.asc'),
      sbGet('rendas_variaveis','order=data.asc'),
      sbGet('metas','order=created_at.asc'),
    ]);
    S.lancamentos = lancs||[];
    S.fixas       = fixas||[];
    S.rendasFixas = rf||[];
    S.rendasVar   = rv||[];
    S.metas       = metas||[];
    renderAll();
    if (showToast) toast('Sincronizado!','ok');
    document.getElementById('cfg-st').textContent = 'Última sync: ' + new Date().toLocaleTimeString('pt-BR');
  } catch(e) {
    toast('Erro ao carregar dados. Verifique sua conexão.','err');
    console.error(e);
  }
  showLoading(false);
}

function showLoading(v) { document.getElementById('loading-overlay').style.display = v?'flex':'none'; }

// ══════════════════════════════════════════
//  TEMA / NAV
// ══════════════════════════════════════════
function toggleTheme(){ S.darkMode=!S.darkMode; localStorage.setItem('fg_dark',S.darkMode?'1':'0'); aplicarTema(); }
function aplicarTema(){
  document.body.classList.toggle('light',!S.darkMode);
  document.getElementById('theme-lbl').textContent = S.darkMode?'Modo Claro':'Modo Escuro';
  setTimeout(renderCharts,80);
}
function goTo(pg,el){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('page-'+pg).classList.add('active');
  (el||document.querySelector(`[data-page="${pg}"]`))?.classList.add('active');
  closeSB();
  const fns={['visao-geral']:renderDash,despesas:renderDesp,rendimentos:renderRendimentos,fixas:renderFixas,metas:renderMetas,config:()=>{renderCfgCats();}};
  fns[pg]?.();
}
function openSB(){ document.getElementById('sidebar').classList.add('open'); document.getElementById('overlay').classList.add('show'); }
function closeSB(){ document.getElementById('sidebar').classList.remove('open'); document.getElementById('overlay').classList.remove('show'); }
function renderAll(){ renderDash(); renderDesp(); renderRendimentos(); renderFixas(); renderMetas(); renderCfgCats(); }

// ══════════════════════════════════════════
//  MÊS
// ══════════════════════════════════════════
function updMesLbl(){
  const l=`${MESES[S.mes]} ${S.ano}`;
  ['lbl-mes','lbl-mes2','lbl-mes-rv'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=l;});
}
function chMes(d){
  S.mes+=d;
  if(S.mes<0){S.mes=11;S.ano--;}
  if(S.mes>11){S.mes=0;S.ano++;}
  updMesLbl(); renderDash(); renderDesp(); renderRendimentos();
}

function getMes(){
  const mesStr = String(S.mes+1).padStart(2,'0');
  const base = [...S.lancamentos];

  S.fixas.forEach(f => {
    const realId = `fixa_real_${f.id}_${S.ano}_${S.mes}`;
    const temReal = base.find(l => l.id === realId);

    if (!temReal) {
      const chave = `fixa_${f.id}_${S.ano}_${S.mes}`;
      if (!base.find(l => l.id === chave)) {
        base.push({
          id: chave,
          data: `${S.ano}-${mesStr}-01`,
          valor: f.valor, tipo: f.tipo, categoria: f.categoria,
          identificacao: f.identificacao, descricao: f.descricao,
          parcelas: f.parcelas||null, parcela_atual: f.parcela_atual||null,
          status: 'PENDENTE', valor_pago: 0, isFixaRef: true, fixaId: f.id
        });
      }
    }
    if (temReal) {
      temReal.isFixaRef = true;
      temReal.fixaId = f.id;
    }
  });

  return base.filter(l => {
    if (!l.data) return false;
    const d = new Date(l.data+'T00:00:00');
    return d.getMonth()===S.mes && d.getFullYear()===S.ano;
  });
}

// ══════════════════════════════════════════
//  DASHBOARD / VISÃO GERAL
// ══════════════════════════════════════════
function getTotalRenda(m,y){
  const fixo=S.rendasFixas.reduce((s,r)=>s+parseFloat(r.valor||0),0);
  const varr=S.rendasVar.filter(r=>{const d=new Date(r.data+'T00:00:00');return d.getMonth()===m&&d.getFullYear()===y;}).reduce((s,r)=>s+parseFloat(r.valor||0),0);
  return {fixo,varr,total:fixo+varr};
}

function renderDash(){
  const lancs=getMes();
  const {fixo,varr,total:rendaTotal}=getTotalRenda(S.mes,S.ano);
  const renda=rendaTotal||0;
  const totalPrevisto=lancs.reduce((s,l)=>s+parseFloat(l.valor||0),0);
  const totalPago=lancs.reduce((s,l)=>{
    if(l.status==='PAGO')return s+parseFloat(l.valor||0);
    return s+parseFloat(l.valor_pago||0);
  },0);
  const saldo=renda-totalPago;
  const pct=renda>0?(totalPago/renda*100):0;
  const rendaLabel=S.rendasFixas.length>0?`Fixo ${fmt(fixo)} + Var ${fmt(varr)}`:'Configure em Rendimentos';

  document.getElementById('dash-cards').innerHTML=[
    {lbl:'Renda do Mês',   val:fmt(renda),        sub:rendaLabel,       cls:'c-green'},
    {lbl:'Total Previsto', val:fmt(totalPrevisto), sub:`${lancs.length} despesas`, cls:'c-amber'},
    {lbl:'Já Pago',        val:fmt(totalPago),     sub:`${pct.toFixed(1)}% da renda`, cls:'c-purple'},
    {lbl:'Pendente',       val:fmt(totalPrevisto-totalPago), sub:`${lancs.filter(l=>l.status==='PENDENTE').length} itens`, cls:'c-red'},
    {lbl:'Saldo Estimado', val:fmt(saldo),         sub:'renda − pago',   cls:saldo>=0?'c-green':'c-red'}
  ].map(c=>`<div class="card-m"><div class="lbl">${c.lbl}</div><div class="val ${c.cls}">${c.val}</div><div class="sub">${c.sub}</div></div>`).join('');

  const porCat={};
  lancs.forEach(l=>{const cat=l.categoria||'Outros';porCat[cat]=(porCat[cat]||0)+parseFloat(l.valor||0);});
  const sorted=Object.entries(porCat).sort((a,b)=>b[1]-a[1]);
  document.getElementById('dash-bars').innerHTML=sorted.length?sorted.map(([cat,val])=>{
    const p=totalPrevisto>0?(val/totalPrevisto*100):0;
    const cor=catCor(cat);
    return `<div class="prog-wrap"><div class="prog-lbl"><span style="color:${cor};font-weight:600">${cat}</span><span>${fmt(val)} <span style="color:var(--text3)">(${p.toFixed(1)}%)</span></span></div><div class="prog-bar"><div class="prog-fill" style="width:${Math.min(p,100)}%;background:${cor}"></div></div></div>`;
  }).join(''):'<p style="color:var(--text2);font-size:12px">Nenhum lançamento neste mês.</p>';

  const rec=[...lancs].sort((a,b)=>new Date(b.data)-new Date(a.data)).slice(0,7);
  document.getElementById('dash-recentes').innerHTML=rec.length?
    `<table><thead><tr><th>Data</th><th>Identificação</th><th>Tipo</th><th>Status</th><th>Valor</th></tr></thead><tbody>
    ${rec.map(l=>`<tr><td style="color:var(--text2)">${fmtD(l.data)}</td><td><span style="font-weight:600">${l.identificacao||'—'}</span><br><span class="td-obs">${l.descricao||''}</span></td><td><span class="badge ${TIPO_COR[l.tipo]||''}">${l.tipo||'—'}</span></td><td><span class="badge ${l.status==='PAGO'?'badge-pago':'badge-pendente'}">${l.status||'PENDENTE'}</span></td><td class="td-val">${fmt(l.valor)}</td></tr>`).join('')}
    </tbody></table>`:'<div class="empty">Nenhum lançamento neste mês.</div>';

  renderCharts(lancs,porCat);
}

function renderCharts(lancs,porCat){
  if(!lancs){lancs=getMes();}
  if(!porCat){porCat={};lancs.forEach(l=>{const c=l.categoria||'Outros';porCat[c]=(porCat[c]||0)+parseFloat(l.valor||0);});}
  const isDark=S.darkMode;
  const gc=isDark?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.06)';
  const tc=isDark?'rgba(237,234,226,0.45)':'rgba(24,25,15,0.45)';
  Chart.defaults.color=tc;Chart.defaults.borderColor=gc;

  const cL=Object.keys(porCat),cV=Object.values(porCat),cC=cL.map(c=>catCor(c));
  if(S.charts.cat)S.charts.cat.destroy();
  const cv=document.getElementById('ch-cat');
  if(cv)S.charts.cat=new Chart(cv,{type:'doughnut',data:{labels:cL,datasets:[{data:cV,backgroundColor:cC,borderWidth:0,hoverOffset:6}]},options:{plugins:{legend:{position:'bottom',labels:{boxWidth:9,font:{size:11},color:tc}}},cutout:'62%',responsive:true,maintainAspectRatio:false}});

  const tL=[],tV=[];
  for(let i=5;i>=0;i--){
    let m=S.mes-i,y=S.ano;
    if(m<0){m+=12;y--;}
    const g=S.lancamentos.filter(l=>{const d=new Date(l.data+'T00:00:00');return d.getMonth()===m&&d.getFullYear()===y;}).reduce((s,l)=>s+parseFloat(l.valor||0),0);
    tL.push(MESES[m].substring(0,3));tV.push(parseFloat(g.toFixed(2)));
  }
  const aAcc=isDark?'#b8f04a':'#527a00',aDim=isDark?'rgba(184,240,74,0.22)':'rgba(82,122,0,0.18)';
  if(S.charts.trend)S.charts.trend.destroy();
  const cv2=document.getElementById('ch-trend');
  if(cv2)S.charts.trend=new Chart(cv2,{type:'bar',data:{labels:tL,datasets:[{data:tV,backgroundColor:tV.map((_,i)=>i===5?aAcc:aDim),borderRadius:6,borderSkipped:false}]},options:{plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{color:tc}},y:{grid:{color:gc},ticks:{color:tc,callback:v=>'R$'+v.toLocaleString('pt-BR')}}},responsive:true,maintainAspectRatio:false}});
}

// ══════════════════════════════════════════
//  DESPESAS DO MÊS
// ══════════════════════════════════════════
function renderDesp(){
  const lancs=getMes();
  const total=lancs.reduce((s,l)=>s+parseFloat(l.valor||0),0);
  const pago=lancs.reduce((s,l)=>s+(l.status==='PAGO'?parseFloat(l.valor||0):parseFloat(l.valor_pago||0)),0);
  document.getElementById('desp-cards').innerHTML=[
    {lbl:'Total do mês',val:fmt(total),cls:'c-amber'},
    {lbl:'Pago',        val:fmt(pago), cls:'c-green'},
    {lbl:'Pendente',    val:fmt(total-pago),cls:'c-red'},
    {lbl:'Itens pendentes',val:lancs.filter(l=>l.status==='PENDENTE').length,cls:'c-blue'}
  ].map(c=>`<div class="card-m"><div class="lbl">${c.lbl}</div><div class="val ${c.cls}">${c.val}</div></div>`).join('');

  let lista=[...lancs];
  if(S.filtroDesp==='pendente')lista=lista.filter(l=>l.status==='PENDENTE');
  else if(S.filtroDesp==='pago')lista=lista.filter(l=>l.status==='PAGO');
  else if(['FIXO','CARTÃO','PARCELADO','PAG ÚNICO'].includes(S.filtroDesp))lista=lista.filter(l=>l.tipo===S.filtroDesp);
  lista.sort((a,b)=>({FIXO:0,PARCELADO:1,'CARTÃO':2,'PAG ÚNICO':3}[a.tipo]??9)-({FIXO:0,PARCELADO:1,'CARTÃO':2,'PAG ÚNICO':3}[b.tipo]??9));

  document.getElementById('tbl-desp').innerHTML=lista.length?
    `<table><thead><tr><th>Identificação</th><th>Tipo</th><th>Parcela</th><th>Valor Total</th><th>Já Pago</th><th>Restante</th><th>Status</th><th></th></tr></thead><tbody>
    ${lista.map(l=>{
      const tot=parseFloat(l.valor||0);
      const pg=l.status==='PAGO'?tot:parseFloat(l.valor_pago||0);
      const rest=tot-pg;
      const clsR=pg===0?'ok':rest<=0?'zero':'parcial';
      return `<tr>
        <td><span style="font-weight:600">${l.identificacao||'—'}</span><br><span class="td-obs">${l.descricao||''}</span></td>
        <td><span class="badge ${TIPO_COR[l.tipo]||''}">${l.tipo||'—'}</span></td>
        <td style="color:var(--text2);font-size:12px">${l.parcelas?`${l.parcela_atual||l.parcelaAtual}/${l.parcelas}`:'—'}</td>
        <td class="td-val">${fmt(l.valor)}</td>
        <td><input class="pag-input" type="number" value="${pg||''}" placeholder="0,00" min="0" max="${tot}" step="0.01" onchange="regPagamento('${l.id}',this.value,${tot},${!!l.isFixaRef})" onblur="regPagamento('${l.id}',this.value,${tot},${!!l.isFixaRef})"></td>
        <td><span class="pag-restante ${clsR}">${rest<=0?'✓ Quitado':fmt(rest)}</span></td>
        <td><button class="status-btn ${l.status==='PAGO'?'pago':'pendente'}" onclick="toggleStatus('${l.id}',${!!l.isFixaRef})">${l.status||'PENDENTE'}</button></td>
        <td style="display:flex;gap:4px;align-items:center">
          <button class="btn-edit" onclick="${l.isFixaRef?`abrirEdicaoFixaDesp('${l.fixaId}')`:`abrirEdicao('${l.id}')`}">✎</button>
          ${!l.isFixaRef?`<button class="btn btn-danger btn-sm" onclick="excluir('${l.id}')">✕</button>`:''}
        </td>
      </tr>`;
    }).join('')}</tbody></table>`:
    '<div class="empty">Nenhuma despesa encontrada.</div>';
}

function fDesp(f,btn){S.filtroDesp=f;document.querySelectorAll('.f-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');renderDesp();}

async function toggleStatus(id,isFixaRef){
  if(isFixaRef){
    const lanc=getMes().find(l=>l.id===id);if(!lanc)return;
    const novoStatus=lanc.status==='PAGO'?'PENDENTE':'PAGO';
    const novoId=`fixa_real_${lanc.fixaId}_${S.ano}_${S.mes}`;
    const exist=S.lancamentos.find(l=>l.id===novoId);
    if(exist){await sbUpdate('lancamentos',novoId,{status:novoStatus});exist.status=novoStatus;}
    else{const novo={...lanc,id:novoId,status:novoStatus,valor_pago:0,isFixaRef:undefined,fixaId:undefined};delete novo.isFixaRef;delete novo.fixaId;await sbInsert('lancamentos',novo);S.lancamentos.push(novo);}
  } else {
    const l=S.lancamentos.find(x=>x.id===id);if(!l)return;
    const ns=l.status==='PAGO'?'PENDENTE':'PAGO';
    await sbUpdate('lancamentos',id,{status:ns});l.status=ns;
    toast(ns==='PAGO'?'Marcado como pago!':'Revertido para pendente.','ok');
  }
  renderDesp();renderDash();
}

async function regPagamento(id,val,total,isFixaRef){
  const v=Math.min(Math.max(parseFloat(val)||0,0),total);
  if(isFixaRef){
    const lanc=getMes().find(l=>l.id===id);if(!lanc)return;
    const novoId=`fixa_real_${lanc.fixaId}_${S.ano}_${S.mes}`;
    const exist=S.lancamentos.find(l=>l.id===novoId);
    if(exist){await sbUpdate('lancamentos',novoId,{valor_pago:v});exist.valor_pago=v;}
    else{const novo={...lanc,id:novoId,valor_pago:v,isFixaRef:undefined,fixaId:undefined};delete novo.isFixaRef;delete novo.fixaId;await sbInsert('lancamentos',novo);S.lancamentos.push(novo);}
  } else {
    const l=S.lancamentos.find(x=>x.id===id);if(!l)return;
    await sbUpdate('lancamentos',id,{valor_pago:v});l.valor_pago=v;
  }
  renderDesp();renderDash();
}

// ══════════════════════════════════════════
//  LANÇAMENTOS
// ══════════════════════════════════════════
function onTipo(){document.getElementById('extra-parcelas').style.display=document.getElementById('f-tipo').value==='PARCELADO'?'block':'none';}

async function salvar(){
  const data=document.getElementById('f-data').value;
  const valor=parseFloat(document.getElementById('f-valor').value);
  const tipo=document.getElementById('f-tipo').value;
  const cat=document.getElementById('f-cat').value;
  const ident=document.getElementById('f-ident').value.trim();
  const desc=document.getElementById('f-desc').value.trim();
  const status=document.getElementById('f-status').value;
  const obs=document.getElementById('f-obs').value.trim();
  const parcAt=parseInt(document.getElementById('f-parc-at').value)||1;
  const parcTot=tipo==='PARCELADO'?parseInt(document.getElementById('f-parc-tot').value)||null:null;
  if(!data||!valor||!cat){toast('Preencha data, valor e categoria.','err');return;}
  const lanc={id:Date.now().toString(),data,valor,tipo,categoria:cat,identificacao:ident,descricao:desc,status,observacao:obs,parcelas:parcTot,parcela_atual:parcAt,valor_pago:0};
  try{await sbInsert('lancamentos',lanc);S.lancamentos.push(lanc);limpar();toast('Lançamento adicionado!','ok');renderDash();renderDesp();}
  catch(e){toast('Erro: '+e.message,'err');}
}

function limpar(){
  ['f-valor','f-ident','f-desc','f-obs'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('f-cat').value='';
  document.getElementById('f-tipo').value='FIXO';
  document.getElementById('f-status').value='PENDENTE';
  document.getElementById('extra-parcelas').style.display='none';
  document.getElementById('f-data').value=hoje();
}

async function excluir(id){
  try{await sbDelete('lancamentos',id);S.lancamentos=S.lancamentos.filter(l=>l.id!==id);renderDash();renderDesp();toast('Removido.','ok');}
  catch(e){toast('Erro: '+e.message,'err');}
}

function abrirEdicao(id){
  const l=S.lancamentos.find(x=>x.id===id);if(!l)return;
  document.getElementById('edit-id').value=id;
  document.getElementById('edit-data').value=l.data||'';
  document.getElementById('edit-valor').value=l.valor||'';
  document.getElementById('edit-tipo').value=l.tipo||'FIXO';
  document.getElementById('edit-cat').value=l.categoria||'';
  document.getElementById('edit-ident').value=l.identificacao||'';
  document.getElementById('edit-desc').value=l.descricao||'';
  document.getElementById('edit-status').value=l.status||'PENDENTE';
  document.getElementById('edit-obs').value=l.observacao||'';
  abrirModal('modal-edit');
}

async function salvarEdicao(){
  const id=document.getElementById('edit-id').value;
  const upd={data:document.getElementById('edit-data').value,valor:parseFloat(document.getElementById('edit-valor').value)||0,tipo:document.getElementById('edit-tipo').value,categoria:document.getElementById('edit-cat').value,identificacao:document.getElementById('edit-ident').value.trim(),descricao:document.getElementById('edit-desc').value.trim(),status:document.getElementById('edit-status').value,observacao:document.getElementById('edit-obs').value.trim()};
  try{await sbUpdate('lancamentos',id,upd);const l=S.lancamentos.find(x=>x.id===id);if(l)Object.assign(l,upd);fecharModal('modal-edit');toast('Atualizado!','ok');renderDash();renderDesp();}
  catch(e){toast('Erro: '+e.message,'err');}
}

// ══════════════════════════════════════════
//  DESPESAS FIXAS
// ══════════════════════════════════════════
function renderFixas(){
  const el=document.getElementById('tbl-fixas');
  el.innerHTML=S.fixas.length?
    `<table><thead><tr><th>Identificação</th><th>Descrição</th><th>Tipo</th><th>Categoria</th><th>Valor</th><th>Parcelas</th><th></th></tr></thead><tbody>
    ${S.fixas.map(f=>`<tr>
      <td style="font-weight:600">${f.identificacao||'—'}</td>
      <td style="color:var(--text2)">${f.descricao||'—'}</td>
      <td><span class="badge ${TIPO_COR[f.tipo]||''}">${f.tipo}</span></td>
      <td>${f.categoria}</td>
      <td class="td-val">${fmt(f.valor)}</td>
      <td style="color:var(--text2);font-size:12px">${f.parcelas?`${f.parcela_atual||1}/${f.parcelas}`:'—'}</td>
      <td style="display:flex;gap:4px"><button class="btn-edit" onclick="abrirEdicaoFixa('${f.id}')">✎</button><button class="btn btn-danger btn-sm" onclick="excluirFixa('${f.id}')">✕</button></td>
    </tr>`).join('')}</tbody></table>`:
    '<div class="empty">Nenhuma despesa fixa cadastrada.</div>';
}

async function salvarFixa(){
  const ident=document.getElementById('mf-ident').value.trim();
  const valor=parseFloat(document.getElementById('mf-valor').value);
  if(!ident||!valor){toast('Preencha identificação e valor.','err');return;}
  const fixa={id:Date.now().toString(),identificacao:ident,descricao:document.getElementById('mf-desc').value.trim(),tipo:document.getElementById('mf-tipo').value,categoria:document.getElementById('mf-cat').value,valor,parcelas:parseInt(document.getElementById('mf-parcelas').value)||null,parcela_atual:1};
  try{await sbInsert('despesas_fixas',fixa);S.fixas.push(fixa);fecharModal('modal-fixa');['mf-ident','mf-desc','mf-valor','mf-parcelas'].forEach(id=>document.getElementById(id).value='');renderFixas();renderDesp();renderDash();toast('Despesa fixa cadastrada!','ok');}
  catch(e){toast('Erro: '+e.message,'err');}
}

function abrirEdicaoFixa(id){
  const f=S.fixas.find(x=>x.id===id);if(!f)return;
  document.getElementById('ef-id').value=id;
  document.getElementById('ef-ident').value=f.identificacao||'';
  document.getElementById('ef-desc').value=f.descricao||'';
  document.getElementById('ef-tipo').value=f.tipo||'FIXO';
  document.getElementById('ef-cat').value=f.categoria||'';
  document.getElementById('ef-valor').value=f.valor||'';
  abrirModal('modal-edit-fixa');
}

function abrirEdicaoFixaDesp(fixaId){abrirEdicaoFixa(fixaId);}

async function salvarEdicaoFixa(){
  const id=document.getElementById('ef-id').value;
  const upd={identificacao:document.getElementById('ef-ident').value.trim(),descricao:document.getElementById('ef-desc').value.trim(),tipo:document.getElementById('ef-tipo').value,categoria:document.getElementById('ef-cat').value,valor:parseFloat(document.getElementById('ef-valor').value)||0};
  try{await sbUpdate('despesas_fixas',id,upd);const f=S.fixas.find(x=>x.id===id);if(f)Object.assign(f,upd);fecharModal('modal-edit-fixa');toast('Despesa fixa atualizada!','ok');renderFixas();renderDesp();renderDash();}
  catch(e){toast('Erro: '+e.message,'err');}
}

async function excluirFixa(id){
  try{await sbDelete('despesas_fixas',id);S.fixas=S.fixas.filter(f=>f.id!==id);renderFixas();renderDesp();renderDash();toast('Removida.','ok');}
  catch(e){toast('Erro: '+e.message,'err');}
}

// ══════════════════════════════════════════
//  RENDIMENTOS
// ══════════════════════════════════════════
function renderRendimentos(){
  const {fixo,varr,total}=getTotalRenda(S.mes,S.ano);
  const desp=getMes().reduce((s,l)=>s+parseFloat(l.valor||0),0);
  const saldo=total-desp;
  const el2=document.getElementById('lbl-mes-rv');if(el2)el2.textContent=`${MESES[S.mes]} ${S.ano}`;
  document.getElementById('rend-cards').innerHTML=[
    {lbl:'Renda Total do Mês',val:fmt(total),sub:'fixo + variável',cls:'c-green'},
    {lbl:'Renda Fixa',        val:fmt(fixo), sub:`${S.rendasFixas.length} fonte(s)`,cls:''},
    {lbl:`Variável — ${MESES[S.mes]}`,val:fmt(varr),sub:`${S.rendasVar.filter(r=>{const d=new Date(r.data+'T00:00:00');return d.getMonth()===S.mes&&d.getFullYear()===S.ano;}).length} lançamento(s)`,cls:'c-blue'},
    {lbl:'Saldo do Mês',      val:fmt(saldo),sub:'renda − despesas',cls:saldo>=0?'c-green':'c-red'}
  ].map(c=>`<div class="card-m"><div class="lbl">${c.lbl}</div><div class="val ${c.cls}">${c.val}</div><div class="sub">${c.sub}</div></div>`).join('');

  document.getElementById('lista-rend-fixo').innerHTML=S.rendasFixas.length?
    `<table><thead><tr><th>Fonte</th><th>Descrição</th><th>Categoria</th><th>Valor/mês</th><th></th></tr></thead><tbody>
    ${S.rendasFixas.map(r=>`<tr>
      <td style="font-weight:600">${r.fonte||'—'}</td>
      <td style="color:var(--text2)">${r.descricao||'—'}</td>
      <td><span class="badge" style="background:var(--teal-d);color:var(--teal)">${r.categoria||'—'}</span></td>
      <td class="td-val" style="color:var(--teal)">${fmt(r.valor)}</td>
      <td style="display:flex;gap:4px"><button class="btn-edit" onclick="abrirEdicaoRendFixo('${r.id}')">✎</button><button class="btn btn-danger btn-sm" onclick="excluirRendFixo('${r.id}')">✕</button></td>
    </tr>`).join('')}</tbody></table>`:
    '<div class="empty">Nenhuma renda fixa cadastrada.</div>';

  const vars=S.rendasVar.filter(r=>{const d=new Date(r.data+'T00:00:00');return d.getMonth()===S.mes&&d.getFullYear()===S.ano;});
  document.getElementById('tbl-rend-var').innerHTML=vars.length?
    `<table><thead><tr><th>Data</th><th>Fonte</th><th>Descrição</th><th>Categoria</th><th>Valor</th><th></th></tr></thead><tbody>
    ${vars.map(r=>`<tr>
      <td style="color:var(--text2);font-size:12px">${fmtD(r.data)}</td>
      <td style="font-weight:600">${r.fonte||'—'}</td>
      <td style="color:var(--text2)">${r.descricao||'—'}</td>
      <td><span class="badge" style="background:var(--blue-d);color:var(--blue)">${r.categoria||'—'}</span></td>
      <td class="td-val" style="color:var(--teal)">${fmt(r.valor)}</td>
      <td style="display:flex;gap:4px"><button class="btn-edit" onclick="abrirEdicaoRendVar('${r.id}')">✎</button><button class="btn btn-danger btn-sm" onclick="excluirRendVar('${r.id}')">✕</button></td>
    </tr>`).join('')}</tbody></table>`:
    `<div class="empty">Nenhum lançamento variável em ${MESES[S.mes]}.</div>`;
}

function abrirEdicaoRendFixo(id){
  const r=S.rendasFixas.find(x=>x.id===id);if(!r)return;
  document.getElementById('rf-edit-id').value=id;
  document.getElementById('rf-fonte').value=r.fonte||'';
  document.getElementById('rf-desc').value=r.descricao||'';
  document.getElementById('rf-valor').value=r.valor||'';
  document.getElementById('rf-cat').value=r.categoria||'Salário';
  document.getElementById('modal-rf-titulo').textContent='Editar Renda Fixa';
  abrirModal('modal-rend-fixo');
}

async function salvarRendFixo(){
  const editId=document.getElementById('rf-edit-id').value;
  const fonte=document.getElementById('rf-fonte').value.trim();
  const valor=parseFloat(document.getElementById('rf-valor').value);
  if(!fonte||!valor){toast('Preencha fonte e valor.','err');return;}
  const dados={fonte,descricao:document.getElementById('rf-desc').value.trim(),categoria:document.getElementById('rf-cat').value,valor};
  try{
    if(editId){
      await sbUpdate('rendas_fixas',editId,dados);
      const r=S.rendasFixas.find(x=>x.id===editId);if(r)Object.assign(r,dados);
      toast('Renda fixa atualizada!','ok');
    } else {
      const novo={id:Date.now().toString(),...dados};
      await sbInsert('rendas_fixas',novo);S.rendasFixas.push(novo);
      toast('Renda fixa cadastrada!','ok');
    }
    fecharModal('modal-rend-fixo');
    ['rf-fonte','rf-desc','rf-valor','rf-edit-id'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('modal-rf-titulo').textContent='Cadastrar Renda Fixa';
    renderRendimentos();renderDash();
  }catch(e){toast('Erro: '+e.message,'err');}
}

async function excluirRendFixo(id){
  try{await sbDelete('rendas_fixas',id);S.rendasFixas=S.rendasFixas.filter(r=>r.id!==id);renderRendimentos();renderDash();toast('Removida.','ok');}
  catch(e){toast('Erro: '+e.message,'err');}
}

function abrirEdicaoRendVar(id){
  const r=S.rendasVar.find(x=>x.id===id);if(!r)return;
  document.getElementById('rv-edit-id').value=id;
  document.getElementById('rv-fonte').value=r.fonte||'';
  document.getElementById('rv-desc').value=r.descricao||'';
  document.getElementById('rv-valor').value=r.valor||'';
  document.getElementById('rv-cat').value=r.categoria||'Freelance';
  document.getElementById('rv-data').value=r.data||hoje();
  document.getElementById('modal-rv-titulo').textContent='Editar Renda Variável';
  abrirModal('modal-rend-var');
}

async function salvarRendVar(){
  const editId=document.getElementById('rv-edit-id').value;
  const fonte=document.getElementById('rv-fonte').value.trim();
  const valor=parseFloat(document.getElementById('rv-valor').value);
  const data=document.getElementById('rv-data').value;
  if(!fonte||!valor||!data){toast('Preencha fonte, valor e data.','err');return;}
  const dados={fonte,descricao:document.getElementById('rv-desc').value.trim(),categoria:document.getElementById('rv-cat').value,valor,data};
  try{
    if(editId){
      await sbUpdate('rendas_variaveis',editId,dados);
      const r=S.rendasVar.find(x=>x.id===editId);if(r)Object.assign(r,dados);
      toast('Renda variável atualizada!','ok');
    } else {
      const novo={id:Date.now().toString(),...dados};
      await sbInsert('rendas_variaveis',novo);S.rendasVar.push(novo);
      toast('Renda variável lançada!','ok');
    }
    fecharModal('modal-rend-var');
    ['rv-fonte','rv-desc','rv-valor','rv-edit-id'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('modal-rv-titulo').textContent='Lançar Renda Variável';
    renderRendimentos();renderDash();
  }catch(e){toast('Erro: '+e.message,'err');}
}

async function excluirRendVar(id){
  try{await sbDelete('rendas_variaveis',id);S.rendasVar=S.rendasVar.filter(r=>r.id!==id);renderRendimentos();renderDash();toast('Removida.','ok');}
  catch(e){toast('Erro: '+e.message,'err');}
}

// ══════════════════════════════════════════
//  METAS
// ══════════════════════════════════════════
function renderMetas(){
  const el=document.getElementById('lista-metas');
  el.innerHTML=S.metas.length?S.metas.map(m=>{
    const pct=Math.min((m.atual/m.alvo*100),100);
    const cor=pct>=100?'var(--teal)':pct>=60?'var(--blue)':'var(--amber)';
    return `<div class="meta-card"><div class="meta-head"><div><h4>${m.nome}</h4><p style="font-size:11px;color:var(--text2)">Prazo: ${m.prazo||'—'}</p></div>
      <div style="display:flex;gap:8px">
        <button class="btn-edit" onclick="abrirEdicaoMeta('${m.id}')">✎</button>
        <button class="btn btn-danger btn-sm" onclick="excluirMeta('${m.id}')">✕</button>
      </div></div>
      <div class="prog-lbl"><span style="color:${cor};font-weight:700">${pct.toFixed(1)}%</span><span>${fmt(m.atual)} de ${fmt(m.alvo)}</span></div>
      <div class="prog-bar" style="height:7px"><div class="prog-fill" style="width:${pct}%;background:${cor}"></div></div>
    </div>`;
  }).join(''):'<div class="empty">Nenhuma meta cadastrada.</div>';
}

function abrirEdicaoMeta(id){
  const m=S.metas.find(x=>x.id===id);if(!m)return;
  document.getElementById('mm-id').value=id;
  document.getElementById('mm-nome').value=m.nome||'';
  document.getElementById('mm-alvo').value=m.alvo||'';
  document.getElementById('mm-atual').value=m.atual||0;
  document.getElementById('mm-prazo').value=m.prazo||'';
  document.getElementById('modal-meta-titulo').textContent='Editar Meta';
  abrirModal('modal-meta');
}

async function salvarMeta(){
  const editId=document.getElementById('mm-id').value;
  const nome=document.getElementById('mm-nome').value.trim();
  const alvo=parseFloat(document.getElementById('mm-alvo').value);
  const atual=parseFloat(document.getElementById('mm-atual').value)||0;
  const prazo=document.getElementById('mm-prazo').value;
  if(!nome||!alvo){toast('Preencha nome e valor alvo.','err');return;}
  const dados={nome,alvo,atual,prazo};
  try{
    if(editId){
      await sbUpdate('metas',editId,dados);
      const m=S.metas.find(x=>x.id===editId);if(m)Object.assign(m,dados);
      toast('Meta atualizada!','ok');
    } else {
      const novo={id:Date.now().toString(),...dados};
      await sbInsert('metas',novo);S.metas.push(novo);
      toast('Meta salva!','ok');
    }
    fecharModal('modal-meta');
    ['mm-id','mm-nome','mm-alvo','mm-prazo'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('mm-atual').value=0;
    document.getElementById('modal-meta-titulo').textContent='Nova Meta Financeira';
    renderMetas();
  }catch(e){toast('Erro: '+e.message,'err');}
}

async function excluirMeta(id){
  try{await sbDelete('metas',id);S.metas=S.metas.filter(m=>m.id!==id);renderMetas();toast('Meta removida.','ok');}
  catch(e){toast('Erro: '+e.message,'err');}
}

// ══════════════════════════════════════════
//  UTILS
// ══════════════════════════════════════════
function fmt(v){return 'R$ '+parseFloat(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});}
function fmtD(d){if(!d)return '—';const p=d.split('-');return `${p[2]}/${p[1]}`;}
function hoje(){return new Date().toISOString().split('T')[0];}
function abrirModal(id){document.getElementById(id).classList.add('open');}
function fecharModal(id){document.getElementById(id).classList.remove('open');}
function toast(msg,type){const el=document.createElement('div');el.className=`toast ${type}`;el.textContent=msg;document.getElementById('toasts').appendChild(el);setTimeout(()=>el.remove(),3200);}
