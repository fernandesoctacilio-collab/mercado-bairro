let PRODUCTS = [];
let CART = JSON.parse(localStorage.getItem('mb_cart')||'[]');
let HISTORY = JSON.parse(localStorage.getItem('mb_history')||'[]'); // array of item names
let ACCOUNT = JSON.parse(localStorage.getItem('mb_account')||'{}');
let POINTS = JSON.parse(localStorage.getItem('mb_points')||'0');
let SUBS = JSON.parse(localStorage.getItem('mb_subs')||'[]');
let COUPON = null;
let CATEGORY = 'Todos';
let COUNTDOWN_END = new Date('2025-08-13T02:04:59.572721Z');

const BRL = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' });

document.addEventListener('DOMContentLoaded', async () => {
  PRODUCTS = await fetch('assets/products.json').then(r=>r.json());
  renderOffers();
  renderPersonal();
  renderCatalog();
  renderList();
  renderSubs();
  renderPoints();
  startCountdown();
  setDefaultSchedule();
  updateBadge();
  updateWhatsAppLink();
  maybeBirthdayCoupon();
  preloadAccount();
});

function startCountdown(){
  const el = document.getElementById('countdown');
  const tick = () => {
    const d = COUNTDOWN_END - new Date();
    if (d<=0) { el.textContent = '00:00:00'; return; }
    const h = String(Math.floor(d/3600000)).padStart(2,'0');
    const m = String(Math.floor((d%3600000)/60000)).padStart(2,'0');
    const s = String(Math.floor((d%60000)/1000)).padStart(2,'0');
    el.textContent = `${h}:${m}:${s}`;
    requestAnimationFrame(tick);
  };
  tick();
}

function enablePromos(){
  if (!('Notification' in window)) return alert('Seu navegador não suporta notificações.');
  Notification.requestPermission().then(p=>{
    if(p==='granted'){ new Notification('Ofertas ativas!',''); }
  });
}

function renderOffers(){
  const grid = document.getElementById('offers-grid');
  grid.innerHTML = '';
  PRODUCTS.filter(p=>p.on_promo).forEach(p=>grid.appendChild(productCard(p,true)));
}

function renderPersonal(){
  const grid = document.getElementById('personal-grid');
  grid.innerHTML = '';
  // simplistic personalization: top from history or fall back to promos by category preferences
  const freq = {}
  HISTORY.forEach(n=>freq[n]=(freq[n]||0)+1);
  const topNames = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,6).map(x=>x[0]);
  let items = PRODUCTS.filter(p=> topNames.includes(p.name));
  if(items.length<6) {
    const likedCats = new Set(items.map(i=>i.category));
    const more = PRODUCTS.filter(p=>p.on_promo && (!likedCats.size || likedCats.has(p.category))).slice(0, 6-items.length);
    items = items.concat(more);
  }
  items.forEach(p=>grid.appendChild(productCard(p,true)));
}

function productCard(p, showPromo){
  const card = document.createElement('div');
  card.className = 'rounded-2xl overflow-hidden bg-slate-800 border border-slate-700 flex flex-col';
  card.innerHTML = `
    <img src="${p.image}" alt="${p.name}" class="h-40 w-full object-cover"/>
    <div class="p-4 flex-1 flex flex-col gap-2">
      <div class="text-xs text-slate-400">${p.category}</div>
      <h3 class="font-bold text-lg">${p.name}</h3>
      <div class="flex items-center gap-2">
        ${
          p.on_promo && showPromo 
            ? `<span class='text-2xl font-extrabold text-orange-400'>${BRL.format(p.promo_price)}</span>
               <span class='line-through text-slate-400'>${BRL.format(p.price)}</span>`
            : `<span class='text-2xl font-extrabold'>${BRL.format(p.price)}</span>`
        }
      </div>
      <div class="text-sm ${p.stock_qty>10?'text-teal-400': (p.stock_qty>0?'text-yellow-400':'text-red-400')}">
        ${p.stock_qty>10?'Disponível':(p.stock_qty>0?'Estoque baixo':'Indisponível')}
      </div>
      <div class="mt-auto flex gap-2">
        <button class="btn flex-1" onclick='addToCart(${JSON.stringify(p)})'>Adicionar</button>
        <button class="btn-outline" title="Adicionar à lista" onclick='addToList("${p.name}")'>Lista</button>
      </div>
    </div>`;
  return card;
}

function renderCatalog(){
  const q = document.getElementById('search').value?.toLowerCase() || '';
  const grid = document.getElementById('catalog-grid');
  grid.innerHTML = '';
  PRODUCTS.filter(p => (CATEGORY==='Todos'||p.category===CATEGORY) && p.name.toLowerCase().includes(q))
    .forEach(p=>grid.appendChild(productCard(p,true)));
}

function filterCategory(cat){ CATEGORY = cat; renderCatalog(); }
function clearSearch(){ document.getElementById('search').value=''; renderCatalog(); }

function addToCart(p){
  const found = CART.find(i=>i.id===p.id);
  if(found) found.qty += 1; else CART.push({...p, qty:1});
  localStorage.setItem('mb_cart', JSON.stringify(CART));
  updateBadge();
  updateCart();
}

function updateBadge(){
  document.getElementById('cart-badge').textContent = CART.reduce((s,i)=>s+i.qty,0);
}

function openCart(){
  updateCart();
  document.getElementById('cart').classList.remove('hidden');
}
function closeCart(){
  document.getElementById('cart').classList.add('hidden');
}

function updateCart(){
  const ul = document.getElementById('cart-items');
  ul.innerHTML='';
  CART.forEach((i,idx)=>{
    const li = document.createElement('li');
    li.className = 'flex items-center gap-3';
    li.innerHTML = `
      <img src="${i.image}" class="w-14 h-14 rounded-xl object-cover"/>
      <div class="flex-1">
        <div class="font-semibold">${i.name}</div>
        <div class="text-sm text-slate-600">${BRL.format(priceOf(i))} • x <input min="1" type="number" value="${i.qty}" style="width:56px" class="border rounded px-2 py-0.5" onchange="setQty(${idx}, this.value)"></div>
      </div>
      <button class="text-red-600" onclick="removeItem(${idx})">Remover</button>`;
    ul.appendChild(li);
  });
  updateTotals();
}

function priceOf(i){
  return i.on_promo ? i.promo_price : i.price;
}

function setQty(idx, v){
  CART[idx].qty = Math.max(1, parseInt(v||1));
  localStorage.setItem('mb_cart', JSON.stringify(CART));
  updateCart();
}

function removeItem(idx){
  CART.splice(idx,1);
  localStorage.setItem('mb_cart', JSON.stringify(CART));
  updateCart();
  updateBadge();
}

function shippingFee(){
  if (document.getElementById('delivery-mode').value!=='delivery') return 0;
  const map={'Centro':5,'Vila São José':7,'Vargem Grande':10,'Zona Rural':15};
  return map[document.getElementById('bairro').value] || 0;
}

function discountValue(subtotal){
  let d = 0;
  if(COUPON==='ANIVERSARIO10') d += subtotal*0.10;
  if(POINTS>=100) d += 10; // if redeemed, handled elsewhere too, but here we reflect value
  return d;
}

function updateTotals(){
  const subtotal = CART.reduce((s,i)=>s+priceOf(i)*i.qty,0);
  const shipping = shippingFee();
  const discounts = discountValue(subtotal);
  const total = Math.max(0, subtotal + shipping - discounts);
  document.getElementById('subtotal').textContent = BRL.format(subtotal);
  document.getElementById('shipping').textContent = BRL.format(shipping);
  document.getElementById('discounts').textContent = '- ' + BRL.format(discounts);
  document.getElementById('total').textContent = BRL.format(total);
  updateWhatsAppLink();
  generatePix(total);
}

function updateWhatsAppLink(){
  const lines = CART.map(i=>`- ${i.name} (x${i.qty}) — ${BRL.format(priceOf(i))}`).join('%0A');
  const total = document.getElementById('total')?.textContent || 'R$ 0,00';
  const msg = `Pedido via *Mercado de Bairro*:%0A${lines}%0A*Total:* ${total}`;
  document.getElementById('wa-share').href = 'https://wa.me/?text=' + msg;
}

function togglePix(){
  const mode = document.getElementById('payment').value;
  document.getElementById('pix-box').classList.toggle('hidden', mode!=='pix');
}

function generatePix(total){
  const box = document.getElementById('pix-box');
  if(box.classList.contains('hidden')) return;
  const cents = Math.round((total||0)*100);
  const payload = `MB-PEDIDO|TOTAL={{cents}}|DATA=${new Date().toISOString()}`; // placeholder
  document.getElementById('pix-code').textContent = payload;
  const el = document.getElementById('qrcode');
  el.innerHTML='';
  new QRCode(el, { text: payload, width: 160, height:160 });
}

function finalize(){
  if(CART.length===0) return alert('Seu carrinho está vazio.');
  // accumulate history and points
  CART.forEach(i=>{ for(let n=0;n<i.qty;n++) HISTORY.push(i.name); });
  localStorage.setItem('mb_history', JSON.stringify(HISTORY));
  const subtotal = CART.reduce((s,i)=>s+priceOf(i)*i.qty,0);
  POINTS += Math.floor(subtotal/5); // 1 ponto a cada R$5
  localStorage.setItem('mb_points', JSON.stringify(POINTS));
  // clear cart
  CART = [];
  localStorage.setItem('mb_cart', JSON.stringify(CART));
  updateBadge();
  updateCart();
  alert('Pedido realizado com sucesso! Você ganhou pontos no seu cartão fidelidade.'); 
  renderPoints();
  renderPersonal();
}

function redeem(){
  if(POINTS<100) return alert('Você precisa de pelo menos 100 pontos.');
  POINTS -= 100;
  localStorage.setItem('mb_points', JSON.stringify(POINTS));
  COUPON = null; // redemption applies as R$10 off next order
  alert('R$ 10,00 de desconto aplicado no próximo pedido!');
  renderPoints();
  updateTotals();
}

function renderPoints(){
  document.getElementById('points').textContent = POINTS;
  const pct = Math.min(100, (POINTS%100));
  document.getElementById('points-bar').style.width = pct + '%';
}

function maybeBirthdayCoupon(){
  if(!ACCOUNT?.birth) return;
  const m = new Date(ACCOUNT.birth).getMonth();
  const nowM = new Date().getMonth();
  const el = document.getElementById('birthday-coupon');
  if(m===nowM) el.textContent = 'ANIVERSARIO10 • 10% de desconto';
  else el.textContent = 'Seu mês de aniversário libera 10%';
}

function applyCoupon(){
  const code = (document.getElementById('coupon-input').value||'').trim().toUpperCase();
  if(code==='ANIVERSARIO10') { COUPON=code; updateTotals(); alert('Cupom aplicado!'); }
  else alert('Cupom inválido.');
}

function setDefaultSchedule(){
  const now = new Date();
  now.setHours(now.getHours()+2);
  document.getElementById('schedule').value = new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,16);
}

function openScanner(){
  document.getElementById('scanner').classList.remove('hidden');
  Quagga.init({
    inputStream: { name: 'Live', type:'LiveStream', target: document.querySelector('#interactive') },
    decoder: { readers: ['ean_reader','ean_8_reader','code_128_reader'] }
  }, (err)=>{
    if(err) { document.getElementById('scan-result').textContent = 'Erro ao iniciar câmera.'; return; }
    Quagga.start();
  });
  Quagga.onDetected(data=>{
    const code = data.codeResult.code;
    document.getElementById('scan-result').textContent = 'Código: '+code;
    const p = PRODUCTS.find(x=>x.barcode===code);
    if(p) { addToCart(p); alert(p.name+' adicionado ao carrinho!'); closeScanner(); }
  });
}
function closeScanner(){ try { Quagga.stop(); } catch(e){} document.getElementById('scanner').classList.add('hidden'); }

function openAccount(){
  document.getElementById('account').classList.remove('hidden');
}
function closeAccount(){
  document.getElementById('account').classList.add('hidden');
}
function saveAccount(){
  ACCOUNT = {
    name: document.getElementById('acc-name').value,
    phone: document.getElementById('acc-phone').value,
    birth: document.getElementById('acc-birth').value,
    addr: document.getElementById('acc-addr').value,
  };
  localStorage.setItem('mb_account', JSON.stringify(ACCOUNT));
  maybeBirthdayCoupon();
  alert('Dados salvos!');
}
function preloadAccount(){
  if(!ACCOUNT) return;
  document.getElementById('acc-name').value = ACCOUNT.name||'';
  document.getElementById('acc-phone').value = ACCOUNT.phone||'';
  document.getElementById('acc-birth').value = ACCOUNT.birth||'';
  document.getElementById('acc-addr').value = ACCOUNT.addr||'';
}

///// LISTA DE COMPRAS /////
function renderList(){
  const ul = document.getElementById('shopping-list');
  const items = JSON.parse(localStorage.getItem('mb_list')||'[]');
  ul.innerHTML = '';
  items.forEach((t,idx)=>{
    const li = document.createElement('li');
    const available = PRODUCTS.find(p=>p.name.toLowerCase().includes(t.toLowerCase()) && p.stock_qty>0);
    li.className = 'py-2 flex items-center justify-between';
    li.innerHTML = `<div class="flex items-center gap-3">
        <input type="checkbox" onchange="toggleList(${idx})" />
        <span>${t}</span>
      </div>
      <div class="${available?'text-teal-400':'text-red-400'} text-sm">
        ${available?'Disponível':'Indisponível'}
      </div>`;
    ul.appendChild(li);
  });
  renderSuggestions();
  renderAvailability();
}
function addListItem(){
  const inp = document.getElementById('list-input');
  const v = (inp.value||'').trim();
  if(!v) return;
  const items = JSON.parse(localStorage.getItem('mb_list')||'[]');
  items.push(v);
  localStorage.setItem('mb_list', JSON.stringify(items));
  inp.value='';
  renderList();
}
function addToList(txt){
  const items = JSON.parse(localStorage.getItem('mb_list')||'[]');
  if(!items.includes(txt)) items.push(txt);
  localStorage.setItem('mb_list', JSON.stringify(items));
  renderList();
}
function toggleList(idx){
  // noop for MVP
}
function clearList(){
  localStorage.removeItem('mb_list');
  renderList();
}
function renderSuggestions(){
  const box = document.getElementById('suggestions');
  box.innerHTML='';
  const freq = {}, items = JSON.parse(localStorage.getItem('mb_list')||'[]');
  HISTORY.forEach(n=>freq[n]=(freq[n]||0)+1);
  const top = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,8).map(x=>x[0]);
  (top.length?top:PRODUCTS.filter(p=>p.on_promo).slice(0,8).map(p=>p.name)).forEach(n=>{
    const b = document.createElement('button');
    b.className = 'chip border-slate-700 hover:bg-slate-700';
    b.textContent = n;
    b.onclick = ()=>addToList(n);
    box.appendChild(b);
  });
}
function renderAvailability(){
  const ul = document.getElementById('availability');
  ul.innerHTML='';
  const items = JSON.parse(localStorage.getItem('mb_list')||'[]');
  items.forEach(t=>{
    const p = PRODUCTS.find(p=>p.name.toLowerCase().includes(t.toLowerCase()));
    const li = document.createElement('li');
    if(p) {
      li.innerHTML = `<div class="flex items-center justify-between">
        <span>${p.name}</span>
        <span class="${p.stock_qty>0?'text-teal-400':'text-red-400'}">${p.stock_qty>0?'Em estoque':'Falta'}</span>
      </div>`;
    } else {
      li.innerHTML = `<div class="flex items-center justify-between">
        <span>${t}</span>
        <span class="text-yellow-400">Consultar</span>
      </div>`;
    }
    ul.appendChild(li);
  });
}
function addAvailableToCart(){
  const items = JSON.parse(localStorage.getItem('mb_list')||'[]');
  items.forEach(t=>{
    const p = PRODUCTS.find(p=>p.name.toLowerCase().includes(t.toLowerCase()) && p.stock_qty>0);
    if(p) addToCart(p);
  });
  openCart();
}

///// ASSINATURAS /////
function renderSubs(){
  const grid = document.getElementById('subs-list');
  grid.innerHTML='';
  SUBS.forEach((s,idx)=>{
    const div = document.createElement('div');
    div.className = 'p-5 rounded-2xl bg-slate-800 border border-slate-700';
    div.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="font-bold">${s.title}</div>
        <div class="text-sm ${s.paused?'text-red-400':'text-teal-400'}">${s.paused?'Pausada':'Ativa'}</div>
      </div>
      <div class="text-sm text-slate-400 mt-1">Frequência: ${s.freq}</div>
      <div class="text-sm text-slate-400">Próxima: ${new Date(s.next).toLocaleString('pt-BR')}</div>
      <ul class="mt-3 text-sm list-disc pl-5">${s.items.map(n=>`<li>${n}</li>`).join('')}</ul>
      <div class="mt-4 flex gap-2">
        <button class="btn-outline" onclick="toggleSub(${idx})">${s.paused?'Retomar':'Pausar'}</button>
        <button class="btn-outline" onclick="deleteSub(${idx})">Excluir</button>
      </div>`;
    grid.appendChild(div);
  });
}

function openSubscriptionModal(){
  const title = prompt('Título da assinatura (ex.: Básicos da semana)');
  if(!title) return;
  const items = prompt('Itens separados por vírgula (ex.: leite, pão, arroz)');
  if(!items) return;
  const freq = prompt('Frequência (semanal, quinzenal, mensal)', 'semanal');
  const next = new Date(); if(freq==='semanal') next.setDate(next.getDate()+7); else if(freq==='quinzenal') next.setDate(next.getDate()+15); else next.setMonth(next.getMonth()+1);
  SUBS.push({ title, items: items.split(',').map(s=>s.trim()), freq, next: next.toISOString(), paused:false });
  localStorage.setItem('mb_subs', JSON.stringify(SUBS));
  renderSubs();
}

function toggleSub(idx){
  SUBS[idx].paused = !SUBS[idx].paused;
  localStorage.setItem('mb_subs', JSON.stringify(SUBS));
  renderSubs();
}
function deleteSub(idx){
  SUBS.splice(idx,1);
  localStorage.setItem('mb_subs', JSON.stringify(SUBS));
  renderSubs();
}


let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById('btn-install');
  if (btn) btn.style.display = 'inline-flex';
});
function installApp(){
  if (!deferredPrompt) return alert('Se o botão não aparecer, use "Adicionar à tela inicial" do navegador.');
  deferredPrompt.prompt();
  deferredPrompt.userChoice.finally(() => deferredPrompt = null);
}
// Hide button by default
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btn-install');
  if (btn) btn.style.display = 'none';
});
