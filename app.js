const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const state = {
  materials: JSON.parse(localStorage.getItem('mngifts_materials') || '[]'),
  products: JSON.parse(localStorage.getItem('mngifts_products') || '[]'),
  sales: JSON.parse(localStorage.getItem('mngifts_sales') || '[]'),
  purchases: JSON.parse(localStorage.getItem('mngifts_purchases') || '[]'),
  expenses: JSON.parse(localStorage.getItem('mngifts_expenses') || '[]'),
  customers: JSON.parse(localStorage.getItem('mngifts_customers') || '[]'),
  orders: JSON.parse(localStorage.getItem('mngifts_orders') || '[]'),
  customCategories: JSON.parse(localStorage.getItem('mngifts_categories') || '[]')
};
let draftRecipe = [];
let editing = { material:null, purchase:null, product:null, sale:null, expense:null, customer:null, order:null };

const motivationalQuotes = [
  { text: 'Hoy es un buen día para seguir creciendo.', author: 'M&N Gift' },
  { text: 'El éxito es la suma de pequeños esfuerzos repetidos cada día.', author: 'Robert Collier' },
  { text: 'Haz de cada día tu obra maestra.', author: 'John Wooden' },
  { text: 'Los grandes resultados nacen de pequeños pasos constantes.', author: 'M&N Gift' },
  { text: 'La mejor manera de predecir el futuro es crearlo.', author: 'Peter Drucker' },
  { text: 'Cree que puedes y ya estarás a medio camino.', author: 'Theodore Roosevelt' },
  { text: 'Cada detalle hecho con amor puede convertirse en una gran oportunidad.', author: 'M&N Gift' },
  { text: 'No cuentes los días; haz que los días cuenten.', author: 'Muhammad Ali' },
  { text: 'La constancia convierte una idea en un negocio.', author: 'M&N Gift' },
  { text: 'Siempre parece imposible hasta que se hace.', author: 'Nelson Mandela' }
];
const fixedCategories = ['Rosas individuales','Ramos de rosas','Cajas y arreglos','Detalles personalizados','Combos y regalos','Decoración'];
const titles = {
  dashboard:['Resumen general de M&N Gift',''], materials:['Materiales','Control de insumos, costos y existencias'],
  purchases:['Compras','Reposición de materiales y salidas de caja'], products:['Productos','Recetas, costos y precios de venta'],
  customers:['Clientes','Directorio de compradores y datos de contacto'], orders:['Pedidos','Encargos, anticipos y fechas de entrega'],
  sales:['Ventas','Ingresos, costos y consumo de inventario'], expenses:['Gastos','Control de gastos operativos del negocio'],
  reports:['Reportes','Análisis de rentabilidad por producto y categoría'],
  settings:['Configuración','Respaldo, instalación y administración de datos']
};

function save(){
  localStorage.setItem('mngifts_materials',JSON.stringify(state.materials));
  localStorage.setItem('mngifts_products',JSON.stringify(state.products));
  localStorage.setItem('mngifts_sales',JSON.stringify(state.sales));
  localStorage.setItem('mngifts_purchases',JSON.stringify(state.purchases));
  localStorage.setItem('mngifts_expenses',JSON.stringify(state.expenses));
  localStorage.setItem('mngifts_customers',JSON.stringify(state.customers));
  localStorage.setItem('mngifts_orders',JSON.stringify(state.orders));
  localStorage.setItem('mngifts_categories',JSON.stringify(state.customCategories));
}
function num(v){ const n=Number(v); return Number.isFinite(n)?n:0; }
function escapeHtml(v){ return String(v ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c])); }
function formatQty(v){ return num(v).toLocaleString('es-CO',{maximumFractionDigits:4}); }
function todayISO(){ const d=new Date(); const z=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`; }
function niceDate(date){ return date?new Date(date+'T12:00:00').toLocaleDateString('es-CO'):'—'; }
function dateAtNoon(date){ return date?new Date(date+'T12:00:00'):null; }
function dayDifference(date){
  const target=dateAtNoon(date); if(!target)return null;
  const now=new Date(); const today=new Date(now.getFullYear(),now.getMonth(),now.getDate(),12);
  return Math.round((target-today)/86400000);
}
function businessAlerts(){
  const alerts=[];
  state.materials.forEach(m=>{
    const base=Math.max(num(m.totalPurchased),num(m.quantity),1),available=num(m.available),ratio=available/base;
    if(available<=0) alerts.push({level:'critical',icon:'⛔',title:`${m.name} está agotado`,detail:'No queda existencia disponible.',section:'materials'});
    else if(ratio<=.2) alerts.push({level:'warning',icon:'🎀',title:`Stock bajo: ${m.name}`,detail:`Quedan ${formatQty(available)} ${m.unit}.`,section:'materials'});
  });
  state.orders.filter(o=>['Pendiente','En elaboración','Listo'].includes(o.status)&&o.deliveryDate).forEach(o=>{
    const days=dayDifference(o.deliveryDate); if(days===null||days>2)return;
    const customer=getCustomer(o.customerId)?.name||o.customerName||'Cliente';
    if(days<0) alerts.push({level:'critical',icon:'⏰',title:`Pedido atrasado · ${customer}`,detail:`La entrega era ${niceDate(o.deliveryDate)}.`,section:'orders'});
    else if(days===0) alerts.push({level:'critical',icon:'📦',title:`Entrega para hoy · ${customer}`,detail:`Pedido ${o.status.toLowerCase()} para entregar hoy.`,section:'orders'});
    else alerts.push({level:'warning',icon:'📅',title:`Entrega ${days===1?'mañana':`en ${days} días`} · ${customer}`,detail:`Fecha: ${niceDate(o.deliveryDate)}.`,section:'orders'});
  });
  const pendingOrders=state.orders.filter(o=>o.status!=='Cancelado'&&Math.max(0,num(o.total)-num(o.deposit))>0);
  const pendingTotal=pendingOrders.reduce((sum,o)=>sum+Math.max(0,num(o.total)-num(o.deposit)),0);
  if(pendingOrders.length) alerts.push({level:'info',icon:'💰',title:`${pendingOrders.length} ${pendingOrders.length===1?'pedido tiene':'pedidos tienen'} saldo pendiente`,detail:`Total pendiente por cobrar: ${COP.format(pendingTotal)}.`,section:'orders'});
  const weight={critical:0,warning:1,info:2};
  return alerts.sort((a,b)=>weight[a.level]-weight[b.level]);
}
function alertCardHtml(a,compact=false){
  return `<button type="button" class="business-alert-item ${a.level}${compact?' compact':''}" data-alert-section="${a.section}"><span class="business-alert-icon">${a.icon}</span><span class="business-alert-copy"><strong>${escapeHtml(a.title)}</strong><small>${escapeHtml(a.detail)}</small></span><span class="business-alert-arrow">›</span></button>`;
}
function renderBusinessAlerts(){
  const alerts=businessAlerts(),count=alerts.length,badge=document.getElementById('businessAlertsCount'),dashCount=document.getElementById('dashboardAlertsCount'),dash=document.getElementById('dashboardAlertsList'),pop=document.getElementById('businessAlertsPopoverList');
  if(badge){badge.textContent=count>99?'99+':String(count);badge.hidden=count===0;}
  if(dashCount)dashCount.textContent=`${count} ${count===1?'alerta':'alertas'}`;
  const empty='<div class="business-alerts-empty"><span>✓</span><div><strong>Todo bajo control</strong><small>No hay alertas activas en este momento.</small></div></div>';
  if(dash)dash.innerHTML=count?alerts.slice(0,8).map(a=>alertCardHtml(a)).join(''):empty;
  if(pop)pop.innerHTML=count?alerts.slice(0,10).map(a=>alertCardHtml(a,true)).join(''):empty;
}
function closeBusinessAlerts(){
  const pop=document.getElementById('businessAlertsPopover'),btn=document.getElementById('businessAlertsBtn');if(pop)pop.hidden=true;if(btn)btn.setAttribute('aria-expanded','false');
}
function initSplash(){
  const splash=document.getElementById('appSplash');if(!splash)return;
  setTimeout(()=>{splash.classList.add('leaving');setTimeout(()=>splash.remove(),320)},650);
}
function getMaterial(id){ return state.materials.find(m=>m.id===id); }
function getProduct(id){ return state.products.find(p=>p.id===id); }
function getCustomer(id){ return state.customers.find(c=>c.id===id); }
function getOrder(id){ return state.orders.find(o=>o.id===id); }
function materialUnitCost(m){ if(!m)return 0; if(Number.isFinite(Number(m.avgUnitCost)))return num(m.avgUnitCost); return num(m.quantity)>0?num(m.cost)/num(m.quantity):0; }
function normalizedRecipe(p){ return Array.isArray(p?.recipe)?p.recipe:[]; }
function calculateProductCost(p){
  const mc=normalizedRecipe(p).reduce((sum,i)=>{const m=getMaterial(i.materialId);return sum+(m?materialUnitCost(m)*num(i.quantity):0)},0);
  return mc+num(p?.laborCost)+num(p?.extraCost)+(normalizedRecipe(p).length?0:num(p?.cost));
}
function buildConsumption(product,qty){ return normalizedRecipe(product).map(i=>{const m=getMaterial(i.materialId);return {materialId:i.materialId,materialName:m?.name||'',unit:m?.unit||'',quantity:num(i.quantity)*num(qty)}}); }
function migrateV7(){
  let changed=false;
  state.materials.forEach(m=>{
    if(!Number.isFinite(Number(m.avgUnitCost))){m.avgUnitCost=num(m.quantity)>0?num(m.cost)/num(m.quantity):0;changed=true;}
    if(!Number.isFinite(Number(m.totalPurchased))){m.totalPurchased=num(m.quantity);changed=true;}
    if(!Number.isFinite(Number(m.totalSpent))){m.totalSpent=num(m.cost);changed=true;}
  });
  state.sales.forEach(s=>{
    const p=getProduct(s.productId);
    if(!s.productName){s.productName=p?.name||'Producto';changed=true;}
    if(!Array.isArray(s.consumption)){s.consumption=p?buildConsumption(p,s.quantity):[];changed=true;}
    if(!Number.isFinite(Number(s.unitPrice))){s.unitPrice=num(s.quantity)>0?num(s.total)/num(s.quantity):0;changed=true;}
    if(!Number.isFinite(Number(s.unitCost))){s.unitCost=num(s.quantity)>0?num(s.cost)/num(s.quantity):0;changed=true;}
    if(!s.productCategory&&p?.category){s.productCategory=p.category;changed=true;}
  });
  if(changed)save();
}
function inRange(date,from,to){ if(!date)return true; if(from&&date<from)return false; if(to&&date>to)return false; return true; }
function filterItems(items,prefix){ return items.filter(x=>inRange(x.date,document.getElementById(prefix+'From')?.value||'',document.getElementById(prefix+'To')?.value||'')); }
function currentAppRole(){ try{return cloud?.profile?.role||'user'}catch(_){return 'user'} }
function isBusinessAdmin(){ return ['superadmin','admin'].includes(currentAppRole()); }
function isSuperadmin(){ return currentAppRole()==='superadmin'; }
function requireBusinessAdmin(message='Esta acción está reservada para Administradores y Superadmin.'){ if(isBusinessAdmin())return true;alert(message);return false; }
function isMobileViewport(){return window.matchMedia('(max-width:760px)').matches;}
function isStandaloneApp(){return window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;}
function isIOSDevice(){return /iphone|ipad|ipod/i.test(navigator.userAgent);}
const mobileSectionIcons={dashboard:'🏠',materials:'🎀',purchases:'📦',products:'🌹',customers:'👥',orders:'📋',sales:'🛒',expenses:'💸',reports:'📊',users:'👑',settings:'⚙️'};
function renderMobileNav(){
  const nav=document.getElementById('mobileBottomNav');if(!nav)return;
  const primary=currentAppRole()==='user'?['materials','products','orders','sales']:['dashboard','products','orders','sales'];
  const allowed=primary.filter(roleCanOpenSection);
  nav.innerHTML=allowed.map(section=>`<button type="button" class="mobile-nav-btn" data-mobile-section="${section}"><b>${mobileSectionIcons[section]||'•'}</b><span>${escapeHtml(titles[section]?.[0]?.replace('Resumen general de M&N Gift','Resumen')||section)}</span></button>`).join('')+`<button type="button" class="mobile-nav-btn" data-mobile-more="1"><b>☰</b><span>Más</span></button>`;
  const active=document.querySelector('.page-section.active')?.id||'';syncMobileNavActive(active);
}
function syncMobileNavActive(section){
  const nav=document.getElementById('mobileBottomNav');if(!nav)return;
  const direct=nav.querySelector(`[data-mobile-section="${section}"]`);
  nav.querySelectorAll('.mobile-nav-btn').forEach(btn=>btn.classList.remove('active'));
  if(direct)direct.classList.add('active');else nav.querySelector('[data-mobile-more]')?.classList.add('active');
}
function toggleMobileSidebar(force){
  const sidebar=document.getElementById('sidebar'),backdrop=document.getElementById('mobileNavBackdrop'),menu=document.getElementById('menuBtn');if(!sidebar)return;
  const open=typeof force==='boolean'?force:!sidebar.classList.contains('open');
  sidebar.classList.toggle('open',open);backdrop?.classList.toggle('visible',open);if(backdrop)backdrop.hidden=!open;
  document.body.classList.toggle('mobile-menu-open',open);menu?.setAttribute('aria-expanded',open?'true':'false');
}
function enhanceMobileTables(){
  document.querySelectorAll('.table-wrap table').forEach(table=>{
    const headers=[...table.querySelectorAll('thead th')].map(th=>th.textContent.trim());
    table.querySelectorAll('tbody tr').forEach(tr=>[...tr.children].forEach((td,i)=>{if(td.tagName==='TD')td.dataset.label=headers[i]||'';}));
  });
}
function roleCanOpenSection(section){ if(currentAppRole()!=='user')return section!=='users'||isSuperadmin();return !['dashboard','purchases','expenses','reports','users'].includes(section); }
function applyRoleUI(){
  const role=currentAppRole(), user=role==='user';
  document.querySelectorAll('.nav-btn').forEach(btn=>{
    const section=btn.dataset.section;
    let hide=false;
    if(section==='users') hide=!isSuperadmin();
    else if(['dashboard','purchases','expenses','reports'].includes(section)) hide=user;
    btn.hidden=hide;
    btn.classList.toggle('role-hidden',hide);
    btn.setAttribute('aria-hidden',hide?'true':'false');
  });
  ['openMaterialModal','openPurchaseModal','openProductModal','openExpenseModal','exportBackupBtn','resetAllDataBtn'].forEach(id=>{const el=document.getElementById(id);if(el)el.hidden=user});
  const importLabel=document.querySelector('label[for="importBackupInput"]');if(importLabel)importLabel.hidden=user;
  const access=document.getElementById('settingsRoleAccess');
  if(access)access.textContent=role==='superadmin'?'Control total + administración de usuarios':role==='admin'?'Control total del negocio · sin administración de usuarios':'Operación diaria · sin costos, compras, gastos, reportes ni eliminaciones';
  renderMobileNav();
  const active=document.querySelector('.page-section.active')?.id;
  if(user&&active&&!roleCanOpenSection(active))goTo('orders');
}
function actionButtons(type,id){
  if(!isBusinessAdmin()){
    if(type==='customer')return `<div class="row-actions"><button type="button" class="action-btn edit" data-edit-customer="${id}">Editar</button></div>`;
    if(type==='sale')return `<div class="row-actions"><span class="action-state">Registrada</span></div>`;
    return `<div class="row-actions"><span class="action-state">Solo lectura</span></div>`;
  }
  return `<div class="row-actions"><button type="button" class="action-btn edit" data-edit-${type}="${id}">Editar</button><button type="button" class="action-btn delete" data-delete-${type}="${id}">Eliminar</button></div>`;
}
function orderActions(o){
  if(o.saleId)return `<div class="row-actions"><span class="action-state">✓ Venta creada</span></div>`;
  if(!isBusinessAdmin())return `<div class="row-actions"><button type="button" class="action-btn convert" data-convert-order="${o.id}">Pasar a venta</button><button type="button" class="action-btn edit" data-edit-order="${o.id}">Editar</button></div>`;
  return `<div class="row-actions"><button type="button" class="action-btn convert" data-convert-order="${o.id}">Pasar a venta</button><button type="button" class="action-btn edit" data-edit-order="${o.id}">Editar</button><button type="button" class="action-btn delete" data-delete-order="${o.id}">Eliminar</button></div>`;
}
function saleActions(s){
  if(!isBusinessAdmin())return `<div class="row-actions"><span class="action-state">${s.orderId?'Desde pedido':'Registrada'}</span></div>`;
  if(s.orderId)return `<div class="row-actions"><span class="action-state">Desde pedido</span><button type="button" class="action-btn delete" data-delete-sale="${s.id}">Revertir</button></div>`;
  return actionButtons('sale',s.id);
}

function renderDailyQuote(){ const start=new Date(new Date().getFullYear(),0,0),day=Math.floor((new Date()-start)/86400000),q=motivationalQuotes[day%motivationalQuotes.length]; document.getElementById('dailyQuote').textContent=`“${q.text}”`;document.getElementById('dailyQuoteAuthor').textContent=`— ${q.author}`; }
function goTo(section){ if(!roleCanOpenSection(section)){section=currentAppRole()==='user'?'orders':'dashboard'}document.querySelectorAll('.page-section').forEach(el=>el.classList.toggle('active',el.id===section));document.querySelectorAll('.nav-btn').forEach(el=>el.classList.toggle('active',el.dataset.section===section));document.getElementById('pageTitle').textContent=titles[section][0];document.getElementById('pageSubtitle').textContent=titles[section][1];syncMobileNavActive(section);toggleMobileSidebar(false);window.scrollTo({top:0,behavior:'smooth'}); }
function openModal(id){ document.getElementById(id).classList.add('open');document.body.classList.add('modal-open'); }
function closeModal(id){ document.getElementById(id).classList.remove('open');if(!document.querySelector('.modal-backdrop.open'))document.body.classList.remove('modal-open'); }

function refreshCategoryOptions(){ const s=document.getElementById('productCategory'),selected=s.value,all=[...new Set([...fixedCategories,...state.customCategories])];s.innerHTML='<option value="">Selecciona una categoría</option>'+all.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')+'<option value="__other__">+ Agregar otra categoría</option>';if(all.includes(selected))s.value=selected; }
function toggleCustomCategory(){ const s=document.getElementById('productCategory'),w=document.getElementById('customCategoryWrap'),i=document.getElementById('customCategory'),other=s.value==='__other__';w.classList.toggle('visible',other);i.required=other;if(!other)i.value=''; }
function refreshRecipeMaterialSelect(){ const s=document.getElementById('recipeMaterial'),available=state.materials.filter(m=>!draftRecipe.some(r=>r.materialId===m.id));s.innerHTML=available.length?'<option value="">Selecciona un material</option>'+available.map(m=>`<option value="${m.id}">${escapeHtml(m.name)} · ${COP.format(materialUnitCost(m))}/${escapeHtml(m.unit)}</option>`).join(''):'<option value="">No hay materiales disponibles</option>'; }
function currentDraftMaterialsCost(){ return draftRecipe.reduce((sum,i)=>{const m=getMaterial(i.materialId);return sum+(m?materialUnitCost(m)*num(i.quantity):0)},0); }
function renderDraftRecipe(){
  const list=document.getElementById('recipeList'),empty=document.getElementById('recipeEmpty');list.innerHTML='';empty.style.display=draftRecipe.length?'none':'block';
  draftRecipe.forEach(i=>{const m=getMaterial(i.materialId);if(!m)return;const row=document.createElement('div');row.className='recipe-line';row.innerHTML=`<div><strong>${escapeHtml(m.name)}</strong><br><small>${formatQty(i.quantity)} ${escapeHtml(m.unit)} × ${COP.format(materialUnitCost(m))}</small></div><strong class="recipe-cost">${COP.format(materialUnitCost(m)*num(i.quantity))}</strong><button type="button" class="icon-btn" data-remove-recipe="${i.materialId}">×</button>`;list.appendChild(row)});
  document.getElementById('recipeMaterialsCost').textContent=COP.format(currentDraftMaterialsCost());refreshRecipeMaterialSelect();updateProductCostPreview();
}
function updateProductCostPreview(){ const materials=currentDraftMaterialsCost(),labor=num(document.getElementById('laborCost').value),extra=num(document.getElementById('extraCost').value),margin=num(document.getElementById('targetMargin').value),price=num(document.getElementById('productPrice').value),cost=materials+labor+extra,suggested=margin>=100?0:cost/(1-margin/100),profit=price-cost,actual=price?profit/price*100:0;document.getElementById('productRealCost').textContent=COP.format(cost);document.getElementById('suggestedPrice').textContent=COP.format(Math.ceil(suggested/100)*100);document.getElementById('liveProfit').textContent=`Ganancia estimada: ${COP.format(profit)} · Margen: ${actual.toFixed(1)}%`; }

function renderMaterials(){ const tbody=document.getElementById('materialsTable'),empty=document.getElementById('materialsEmpty'),limited=!isBusinessAdmin();tbody.innerHTML='';empty.style.display=state.materials.length?'none':'block';state.materials.forEach(m=>{const base=Math.max(num(m.totalPurchased),num(m.quantity),1),ratio=num(m.available)/base;let status='Disponible',cls='stock-ok';if(num(m.available)<=0){status='Agotado';cls='stock-out'}else if(ratio<=.2){status='Stock bajo';cls='stock-low'}const tr=document.createElement('tr');tr.innerHTML=`<td><strong>${escapeHtml(m.name)}</strong></td><td>${escapeHtml(m.unit)}</td><td>${limited?'Restringido':COP.format(materialUnitCost(m))}</td><td>${formatQty(m.available)} ${escapeHtml(m.unit)}</td><td>${limited?'Restringido':COP.format(num(m.available)*materialUnitCost(m))}</td><td class="${cls}">${status}</td><td>${actionButtons('material',m.id)}</td>`;tbody.appendChild(tr)}); }
function refreshPurchaseMaterials(selected=''){ const s=document.getElementById('purchaseMaterial');s.innerHTML=state.materials.length?'<option value="">Selecciona un material</option>'+state.materials.map(m=>`<option value="${m.id}">${escapeHtml(m.name)} — disponible: ${formatQty(m.available)} ${escapeHtml(m.unit)}</option>`).join(''):'<option value="">No hay materiales</option>';if(selected)s.value=selected; }
function updatePurchasePreview(){ const f=document.getElementById('purchaseForm'),q=num(f.elements.quantity.value),cost=num(f.elements.cost.value),m=getMaterial(f.elements.materialId.value),box=document.getElementById('purchasePreview');if(q<=0){box.textContent='Completa cantidad y costo para ver el costo unitario de esta compra.';return}const unit=cost/q;if(!m){box.innerHTML=`Costo de esta compra: <strong>${COP.format(unit)}</strong> por unidad de medida.`;return}box.innerHTML=`Costo de compra: <strong>${COP.format(unit)}</strong>/${escapeHtml(m.unit)} · Disponible actualmente: <strong>${formatQty(m.available)} ${escapeHtml(m.unit)}</strong>`; }
function renderPurchases(){ const rows=filterItems(state.purchases,'purchases'),tbody=document.getElementById('purchasesTable'),empty=document.getElementById('purchasesEmpty');tbody.innerHTML='';empty.style.display=rows.length?'none':'block';[...rows].reverse().forEach(x=>{const m=getMaterial(x.materialId),tr=document.createElement('tr');tr.innerHTML=`<td>${niceDate(x.date)}</td><td>${m?escapeHtml(m.name):escapeHtml(x.materialName||'Material eliminado')}</td><td>${formatQty(x.quantity)} ${escapeHtml(x.unit||m?.unit||'')}</td><td>${COP.format(x.cost)}</td><td>${COP.format(num(x.quantity)?num(x.cost)/num(x.quantity):0)}</td><td>${escapeHtml(x.note||'—')}</td><td>${actionButtons('purchase',x.id)}</td>`;tbody.appendChild(tr)}); }
function renderProducts(){ const list=document.getElementById('productsList'),empty=document.getElementById('productsEmpty'),limited=!isBusinessAdmin();list.innerHTML='';empty.style.display=state.products.length?'none':'block';state.products.forEach(p=>{const cost=calculateProductCost(p),profit=num(p.price)-cost,margin=num(p.price)?profit/num(p.price)*100:0,chips=limited?'':(normalizedRecipe(p).length?normalizedRecipe(p).map(i=>{const m=getMaterial(i.materialId);return m?`<span class="recipe-chip">${escapeHtml(m.name)}: ${formatQty(i.quantity)} ${escapeHtml(m.unit)}</span>`:''}).join(''):'<span class="recipe-chip">Costo manual de versión anterior</span>'),card=document.createElement('article');card.className='product-card';card.innerHTML=limited?`<div class="product-card-head"><div><h4>${escapeHtml(p.name)}</h4><p>${escapeHtml(p.category)}</p></div>${actionButtons('product',p.id)}</div><div class="product-meta"><div><span>Precio de venta</span><strong>${COP.format(p.price)}</strong></div><div><span>Detalle de costos</span><strong>Restringido</strong></div></div>`:`<div class="product-card-head"><div><h4>${escapeHtml(p.name)}</h4><p>${escapeHtml(p.category)}</p></div>${actionButtons('product',p.id)}</div><div class="product-meta"><div><span>Costo real</span><strong>${COP.format(cost)}</strong></div><div><span>Venta</span><strong>${COP.format(p.price)}</strong></div><div><span>Ganancia</span><strong class="profit">${COP.format(profit)}</strong></div><div><span>Margen</span><strong>${margin.toFixed(1)}%</strong></div></div><div class="recipe-chips">${chips}</div>`;list.appendChild(card)});refreshSaleProducts(); }
function renderSales(){ const rows=filterItems(state.sales,'sales'),tbody=document.getElementById('salesTable'),empty=document.getElementById('salesEmpty'),limited=!isBusinessAdmin();tbody.innerHTML='';empty.style.display=rows.length?'none':'block';[...rows].reverse().forEach(s=>{const p=getProduct(s.productId),tr=document.createElement('tr');tr.innerHTML=`<td>${niceDate(s.date)}</td><td>${escapeHtml(p?.name||s.productName||'Producto eliminado')}${s.orderId?'<br><small>Pedido convertido</small>':''}</td><td>${formatQty(s.quantity)}</td><td>${COP.format(s.total)}</td><td>${limited?'Restringido':COP.format(s.cost)}</td><td class="profit">${limited?'Restringido':COP.format(num(s.total)-num(s.cost))}</td><td>${saleActions(s)}</td>`;tbody.appendChild(tr)}); }
function renderExpenses(){ const rows=filterItems(state.expenses,'expenses'),tbody=document.getElementById('expensesTable'),empty=document.getElementById('expensesEmpty');tbody.innerHTML='';empty.style.display=rows.length?'none':'block';[...rows].reverse().forEach(x=>{const tr=document.createElement('tr');tr.innerHTML=`<td>${niceDate(x.date)}</td><td><span class="category-pill">${escapeHtml(x.category)}</span></td><td>${escapeHtml(x.description)}</td><td class="expense-amount">${COP.format(x.amount)}</td><td>${actionButtons('expense',x.id)}</td>`;tbody.appendChild(tr)}); }

function refreshOrderCustomers(selected=''){ const s=document.getElementById('orderCustomer');if(!s)return;s.innerHTML=state.customers.length?'<option value="">Selecciona un cliente</option>'+state.customers.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}${c.phone?' · '+escapeHtml(c.phone):''}</option>`).join(''):'<option value="">No hay clientes</option>';if(selected)s.value=selected; }
function refreshOrderProducts(selected=''){ const s=document.getElementById('orderProduct');if(!s)return;s.innerHTML=state.products.length?'<option value="">Selecciona un producto</option>'+state.products.map(p=>`<option value="${p.id}">${escapeHtml(p.name)} — ${COP.format(p.price)}</option>`).join(''):'<option value="">No hay productos</option>';if(selected)s.value=selected; }
function renderCustomers(){ const tbody=document.getElementById('customersTable'),empty=document.getElementById('customersEmpty');if(!tbody)return;tbody.innerHTML='';empty.style.display=state.customers.length?'none':'block';state.customers.forEach(c=>{const count=state.orders.filter(o=>o.customerId===c.id).length,tr=document.createElement('tr');tr.innerHTML=`<td><strong>${escapeHtml(c.name)}</strong></td><td>${escapeHtml(c.phone||'—')}</td><td>${escapeHtml(c.location||'—')}</td><td>${escapeHtml(c.notes||'—')}</td><td>${count}</td><td>${actionButtons('customer',c.id)}</td>`;tbody.appendChild(tr)});refreshOrderCustomers(); }
function filteredOrders(){ const from=document.getElementById('ordersFrom')?.value||'',to=document.getElementById('ordersTo')?.value||'',status=document.getElementById('ordersStatus')?.value||'';return state.orders.filter(o=>inRange(o.deliveryDate,from,to)&&(!status||o.status===status)); }
function statusClass(status){ return {'Pendiente':'status-pending','En elaboración':'status-making','Listo':'status-ready','Entregado':'status-delivered','Cancelado':'status-cancelled'}[status]||''; }
function renderOrders(){ const rows=filteredOrders(),tbody=document.getElementById('ordersTable'),empty=document.getElementById('ordersEmpty');if(!tbody)return;tbody.innerHTML='';empty.style.display=rows.length?'none':'block';let total=0,balance=0;[...rows].sort((a,b)=>(a.deliveryDate||'').localeCompare(b.deliveryDate||'')).forEach(o=>{const c=getCustomer(o.customerId),p=getProduct(o.productId),saldo=Math.max(0,num(o.total)-num(o.deposit));total+=num(o.total);if(o.status!=='Cancelado')balance+=saldo;const tr=document.createElement('tr');tr.innerHTML=`<td>${niceDate(o.deliveryDate)}</td><td><strong>${escapeHtml(c?.name||o.customerName||'Cliente eliminado')}</strong><br><small>${escapeHtml(c?.phone||o.customerPhone||'')}</small></td><td>${escapeHtml(p?.name||o.productName||'Producto eliminado')}</td><td>${formatQty(o.quantity)}</td><td>${COP.format(o.total)}</td><td>${COP.format(o.deposit)}</td><td class="${saldo>0?'expense-amount':'profit'}">${COP.format(saldo)}</td><td><span class="status-pill ${statusClass(o.status)}">${escapeHtml(o.status)}</span></td><td>${orderActions(o)}</td>`;tbody.appendChild(tr)});document.getElementById('ordersCount').textContent=rows.length;document.getElementById('ordersTotal').textContent=COP.format(total);document.getElementById('ordersBalance').textContent=COP.format(balance);refreshOrderProducts();refreshOrderCustomers(); }
function updateOrderMoneyPreview(autoPrice=false){ const f=document.getElementById('orderForm');if(!f)return;const p=getProduct(f.elements.productId.value),qty=Math.max(1,num(f.elements.quantity.value)||1);if(autoPrice&&p)f.elements.total.value=Math.round(num(p.price)*qty);const total=num(f.elements.total.value),deposit=num(f.elements.deposit.value),balance=Math.max(0,total-deposit),box=document.getElementById('orderMoneyPreview');box.innerHTML=`Total acordado: <strong>${COP.format(total)}</strong> · Anticipo: <strong>${COP.format(deposit)}</strong> · Saldo pendiente: <strong>${COP.format(balance)}</strong>`; }
function resetCustomerModal(){ editing.customer=null;const f=document.getElementById('customerForm');f.reset();document.getElementById('customerModalTitle').textContent='Nuevo cliente';document.getElementById('customerSubmitBtn').textContent='Guardar cliente'; }
function openCustomerEdit(id){ const c=getCustomer(id);if(!c)return;editing.customer=id;const f=document.getElementById('customerForm');f.elements.name.value=c.name||'';f.elements.phone.value=c.phone||'';f.elements.location.value=c.location||'';f.elements.notes.value=c.notes||'';document.getElementById('customerModalTitle').textContent='Editar cliente';document.getElementById('customerSubmitBtn').textContent='Guardar cambios';openModal('customerModal'); }
function resetOrderModal(){ editing.order=null;const f=document.getElementById('orderForm');f.reset();refreshOrderCustomers();refreshOrderProducts();f.elements.quantity.value=1;f.elements.orderDate.value=todayISO();f.elements.deliveryDate.value=todayISO();f.elements.deposit.value=0;f.elements.status.value='Pendiente';document.getElementById('orderModalTitle').textContent='Nuevo pedido';document.getElementById('orderSubmitBtn').textContent='Guardar pedido';updateOrderMoneyPreview(); }
function openOrderEdit(id){ const o=getOrder(id);if(!o)return;if(o.saleId){alert('Este pedido ya fue convertido en venta. Revierte primero la venta si necesitas modificarlo.');return}editing.order=id;const f=document.getElementById('orderForm');refreshOrderCustomers(o.customerId);refreshOrderProducts(o.productId);f.elements.quantity.value=o.quantity;f.elements.orderDate.value=o.orderDate||todayISO();f.elements.deliveryDate.value=o.deliveryDate||todayISO();f.elements.total.value=o.total;f.elements.deposit.value=o.deposit;f.elements.status.value=o.status||'Pendiente';f.elements.notes.value=o.notes||'';document.getElementById('orderModalTitle').textContent='Editar pedido';document.getElementById('orderSubmitBtn').textContent='Guardar cambios';updateOrderMoneyPreview();openModal('orderModal'); }

function renderDashboard(){ const from=document.getElementById('dashboardFrom').value,to=document.getElementById('dashboardTo').value,sales=state.sales.filter(x=>inRange(x.date,from,to)),expenses=state.expenses.filter(x=>inRange(x.date,from,to)),purchases=state.purchases.filter(x=>inRange(x.date,from,to));const totalSales=sales.reduce((s,x)=>s+num(x.total),0),totalCosts=sales.reduce((s,x)=>s+num(x.cost),0),totalExpenses=expenses.reduce((s,x)=>s+num(x.amount),0),totalPurchases=purchases.reduce((s,x)=>s+num(x.cost),0),units=sales.reduce((s,x)=>s+num(x.quantity),0),gross=totalSales-totalCosts,net=gross-totalExpenses,cashOut=totalPurchases+totalExpenses,cashBalance=totalSales-cashOut;document.getElementById('statSales').textContent=COP.format(totalSales);document.getElementById('statCosts').textContent=COP.format(totalCosts);document.getElementById('statExpenses').textContent=COP.format(totalExpenses);document.getElementById('statProfit').textContent=COP.format(net);document.getElementById('statPurchases').textContent=COP.format(totalPurchases);document.getElementById('statUnits').textContent=formatQty(units);document.getElementById('cashIn').textContent=COP.format(totalSales);document.getElementById('cashOut').textContent=COP.format(cashOut);document.getElementById('cashBalance').textContent=COP.format(cashBalance);const low=state.materials.filter(m=>num(m.available)<=0||num(m.available)<=Math.max(num(m.totalPurchased),num(m.quantity),1)*.2).length,inventory=state.materials.reduce((s,m)=>s+num(m.available)*materialUnitCost(m),0),margin=totalSales?net/totalSales*100:0,period=from||to?`${from?nicer(from):'Inicio'} → ${to?nicer(to):'Hoy'}`:'Todo el historial';document.getElementById('dashboardSummary').innerHTML=`<div class="summary-row"><span>Periodo mostrado</span><strong>${escapeHtml(period)}</strong></div><div class="summary-row"><span>Materiales registrados</span><strong>${state.materials.length}</strong></div><div class="summary-row"><span>Productos creados</span><strong>${state.products.length}</strong></div><div class="summary-row"><span>Pedidos pendientes / en proceso</span><strong>${state.orders.filter(o=>['Pendiente','En elaboración','Listo'].includes(o.status)).length}</strong></div><div class="summary-row"><span>Saldo pendiente por cobrar</span><strong>${COP.format(state.orders.filter(o=>o.status!=='Cancelado').reduce((s,o)=>s+Math.max(0,num(o.total)-num(o.deposit)),0))}</strong></div><div class="summary-row"><span>Stock bajo / agotado</span><strong>${low}</strong></div><div class="summary-row"><span>Valor estimado del inventario</span><strong>${COP.format(inventory)}</strong></div><div class="summary-row"><span>Ganancia bruta del periodo</span><strong>${COP.format(gross)}</strong></div><div class="summary-row"><span>Margen neto del periodo</span><strong>${margin.toFixed(1)}%</strong></div>`; }
function nicer(d){return d?niceDate(d):''}
function refreshSaleProducts(selected=''){ const s=document.getElementById('saleProduct');s.innerHTML=state.products.length?'<option value="">Selecciona un producto</option>'+state.products.map(p=>`<option value="${p.id}">${escapeHtml(p.name)} — ${COP.format(p.price)}</option>`).join(''):'<option value="">No hay productos</option>';if(selected)s.value=selected;updateSalePreview(); }
function updateSalePreview(){ const f=document.getElementById('saleForm'),p=getProduct(f.elements.productId.value),qty=Math.max(1,num(f.elements.quantity.value)||1),box=document.getElementById('salePreview');if(!p){box.innerHTML='Selecciona un producto para ver el cálculo de la venta.';return}const cost=calculateProductCost(p)*qty,total=num(p.price)*qty;box.innerHTML=`Total: <strong>${COP.format(total)}</strong> · Costo: <strong>${COP.format(cost)}</strong> · Ganancia bruta: <strong>${COP.format(total-cost)}</strong>`; }
function renderReports(){
  const from=document.getElementById('reportsFrom')?.value||'',to=document.getElementById('reportsTo')?.value||'';
  const sales=state.sales.filter(x=>inRange(x.date,from,to)),expenses=state.expenses.filter(x=>inRange(x.date,from,to));
  const totalSales=sales.reduce((a,x)=>a+num(x.total),0),costs=sales.reduce((a,x)=>a+num(x.cost),0),gross=totalSales-costs,totalExpenses=expenses.reduce((a,x)=>a+num(x.amount),0),net=gross-totalExpenses,margin=totalSales?net/totalSales*100:0;
  document.getElementById('reportSales').textContent=COP.format(totalSales);document.getElementById('reportCosts').textContent=COP.format(costs);document.getElementById('reportGross').textContent=COP.format(gross);document.getElementById('reportNet').textContent=COP.format(net);document.getElementById('reportMargin').textContent=margin.toFixed(1)+'%';
  const byProduct=new Map();
  sales.forEach(x=>{const p=getProduct(x.productId),key=x.productId||x.productName||'sin-producto',row=byProduct.get(key)||{name:p?.name||x.productName||'Producto eliminado',units:0,sales:0,costs:0,category:p?.category||x.productCategory||'Sin categoría'};row.units+=num(x.quantity);row.sales+=num(x.total);row.costs+=num(x.cost);byProduct.set(key,row)});
  const pt=document.getElementById('reportProductsTable'),pe=document.getElementById('reportProductsEmpty'),products=[...byProduct.values()].sort((a,b)=>(b.sales-b.costs)-(a.sales-a.costs));pt.innerHTML='';pe.style.display=products.length?'none':'block';products.forEach(r=>{const profit=r.sales-r.costs,m=r.sales?profit/r.sales*100:0,tr=document.createElement('tr');tr.innerHTML=`<td><strong>${escapeHtml(r.name)}</strong></td><td>${formatQty(r.units)}</td><td>${COP.format(r.sales)}</td><td>${COP.format(r.costs)}</td><td class="profit">${COP.format(profit)}</td><td>${m.toFixed(1)}%</td>`;pt.appendChild(tr)});
  const byCategory=new Map();products.forEach(r=>{const c=byCategory.get(r.category)||{name:r.category,units:0,sales:0,profit:0};c.units+=r.units;c.sales+=r.sales;c.profit+=r.sales-r.costs;byCategory.set(r.category,c)});
  const ct=document.getElementById('reportCategoriesTable'),ce=document.getElementById('reportCategoriesEmpty'),categories=[...byCategory.values()].sort((a,b)=>b.profit-a.profit);ct.innerHTML='';ce.style.display=categories.length?'none':'block';categories.forEach(r=>{const tr=document.createElement('tr');tr.innerHTML=`<td><strong>${escapeHtml(r.name)}</strong></td><td>${formatQty(r.units)}</td><td>${COP.format(r.sales)}</td><td class="profit">${COP.format(r.profit)}</td>`;ct.appendChild(tr)});
}
function convertOrderToSale(id){
  const o=getOrder(id);if(!o)return;if(o.saleId){alert('Este pedido ya tiene una venta asociada.');return}if(o.status==='Cancelado'){alert('Un pedido cancelado no puede convertirse en venta.');return}
  const balance=Math.max(0,num(o.total)-num(o.deposit));if(balance>0){alert(`Este pedido todavía tiene ${COP.format(balance)} pendientes por cobrar. Registra primero el pago completo editando el anticipo recibido.`);return}
  const p=getProduct(o.productId);if(!p){alert('El producto de este pedido ya no existe.');return}const qty=num(o.quantity);if(qty<=0)return;
  const consumption=buildConsumption(p,qty),missing=canConsume(consumption);if(missing.length){alert('No hay material suficiente para completar este pedido:\n\n'+missing.join('\n'));return}
  if(!confirm(`¿Convertir este pedido en venta por ${COP.format(o.total)}? Se descontarán los materiales utilizados.`))return;
  consume(consumption);const unitCost=calculateProductCost(p),saleId=crypto.randomUUID();state.sales.push({id:saleId,orderId:o.id,customerId:o.customerId,customerName:o.customerName||'',productId:p.id,productName:p.name,productCategory:p.category||'',quantity:qty,date:o.deliveryDate||todayISO(),unitPrice:qty?num(o.total)/qty:0,total:num(o.total),unitCost,cost:unitCost*qty,consumption});o.saleId=saleId;o.status='Entregado';o.convertedAt=todayISO();save();renderAll();goTo('sales');
}

function backupPayload(){
  return {
    app:'M&N Gift', version:'V.MN.0.0.004', phase:2, currency:'COP', exportedAt:new Date().toISOString(),
    data:{
      materials:state.materials, products:state.products, sales:state.sales, purchases:state.purchases,
      expenses:state.expenses, customers:state.customers, orders:state.orders, customCategories:state.customCategories
    }
  };
}
function downloadBackup(){
  const payload=backupPayload(),blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  const stamp=todayISO().replaceAll('-','');a.href=url;a.download=`MN_Gift_respaldo_${stamp}.json`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
  localStorage.setItem('mngifts_last_backup',new Date().toISOString());renderDataSummary();
}
function validateBackup(payload){
  const d=payload?.data||payload;if(!d||typeof d!=='object')return null;
  const keys=['materials','products','sales','purchases','expenses','customers','orders','customCategories'];
  if(!keys.every(k=>Array.isArray(d[k])))return null;return d;
}
function importBackupFile(file){
  const reader=new FileReader();reader.onload=()=>{
    try{const payload=JSON.parse(reader.result),d=validateBackup(payload);if(!d)throw new Error('Formato no válido');
      if(!confirm('¿Importar este respaldo? Los datos actuales serán reemplazados.'))return;
      localStorage.setItem('mngifts_emergency_backup',JSON.stringify(backupPayload()));
      Object.keys(d).forEach(k=>state[k]=d[k]);save();localStorage.setItem('mngifts_last_import',new Date().toISOString());// La inicialización se realiza desde cloud.js después de validar la sesión de Supabase.alert('Respaldo importado correctamente.');
    }catch(err){alert('No se pudo importar el archivo. Verifica que sea un respaldo válido de M&N Gift.');}
  };reader.readAsText(file);
}
function renderDataSummary(){
  const box=document.getElementById('dataSummary');if(!box)return;
  const total=state.materials.length+state.products.length+state.customers.length+state.orders.length+state.sales.length+state.purchases.length+state.expenses.length;
  const last=localStorage.getItem('mngifts_last_backup'),lastText=last?new Date(last).toLocaleString('es-CO'):'Todavía no has exportado un respaldo';
  box.innerHTML=`<div><span>Registros guardados</span><strong>${total}</strong></div><div><span>Materiales</span><strong>${state.materials.length}</strong></div><div><span>Productos</span><strong>${state.products.length}</strong></div><div><span>Clientes</span><strong>${state.customers.length}</strong></div><div class="wide"><span>Último respaldo exportado</span><strong>${escapeHtml(lastText)}</strong></div>`;
}
function clearAllBusinessData(){
  if(!confirm('Esta acción borrará todos los datos de M&N Gift guardados en este navegador. ¿Deseas continuar?'))return;
  if(!confirm('Última confirmación: ¿borrar materiales, productos, clientes, pedidos, ventas, compras y gastos?'))return;
  localStorage.setItem('mngifts_emergency_backup',JSON.stringify(backupPayload()));
  ['materials','products','sales','purchases','expenses','customers','orders','customCategories'].forEach(k=>state[k]=[]);save();renderAll();alert('Los datos locales fueron borrados. Se guardó una copia de emergencia temporal en este navegador.');
}
let deferredInstallPrompt=null;
function updateMobileInstallUI(){
  const banner=document.getElementById('mobileInstallBanner'),copy=document.getElementById('mobileInstallText'),btn=document.getElementById('mobileInstallBtn');if(!banner||!copy||!btn)return;
  const dismissed=sessionStorage.getItem('mngifts_install_banner_dismissed')==='1';
  const eligible=isMobileViewport()&&location.protocol!=='file:'&&!isStandaloneApp()&&!dismissed;
  if(isIOSDevice()){copy.textContent='En iPhone: Compartir → Agregar a pantalla de inicio.';btn.textContent='Ver pasos';banner.hidden=!eligible;return;}
  copy.textContent=deferredInstallPrompt?'Abre M&N Gift como una app desde tu pantalla de inicio.':'Puedes instalarla desde el menú de tu navegador.';
  btn.textContent=deferredInstallPrompt?'Instalar':'Cómo instalar';banner.hidden=!eligible;
}
function updateConnectionUI(){
  const online=navigator.onLine,dot=document.getElementById('connectionDot'),status=document.getElementById('connectionStatus'),hint=document.getElementById('installHint'),installBtn=document.getElementById('installPwaBtn'),offlineBanner=document.getElementById('offlineBanner'),offlineText=document.getElementById('offlineBannerText');if(!dot||!status||!hint)return;
  dot.classList.toggle('offline',!online);status.textContent=online?'Con conexión':'Sin conexión';
  if(offlineBanner){offlineBanner.hidden=online;if(!online&&offlineText)offlineText.textContent=(typeof cloud!=='undefined'&&cloud.pendingChanges)?'Tienes cambios pendientes. Se enviarán automáticamente a Supabase cuando vuelva Internet.':'Puedes seguir consultando los datos cargados; los nuevos cambios quedarán pendientes hasta recuperar Internet.';}
  if(isStandaloneApp()){hint.textContent='M&N Gift ya está instalada en este dispositivo.';if(installBtn){installBtn.disabled=true;installBtn.textContent='✓ Aplicación instalada';}}
  else if(location.protocol==='file:'){hint.textContent='Modo local: para instalar, abre la versión publicada por HTTPS.';if(installBtn)installBtn.disabled=true;}
  else if(isIOSDevice()){hint.textContent='En iPhone/iPad: abre en Safari, toca Compartir y luego “Agregar a pantalla de inicio”.';if(installBtn){installBtn.disabled=false;installBtn.textContent='Ver cómo instalar';}}
  else if(deferredInstallPrompt){hint.textContent='La aplicación está lista para instalarse en este dispositivo.';if(installBtn){installBtn.disabled=false;installBtn.textContent='Instalar M&N Gift';}}
  else{hint.textContent='Si el navegador no muestra instalación directa, usa su menú y selecciona “Instalar aplicación” o “Agregar a pantalla de inicio”.';if(installBtn){installBtn.disabled=false;installBtn.textContent='Cómo instalar';}}
  updateMobileInstallUI();
}
async function installPwa(){
  if(isStandaloneApp())return;
  if(isIOSDevice()){alert('Para instalar M&N Gift en iPhone/iPad:\n\n1. Abre esta página en Safari.\n2. Toca el botón Compartir.\n3. Selecciona “Agregar a pantalla de inicio”.\n4. Confirma con “Agregar”.');return;}
  if(!deferredInstallPrompt){alert('Abre el menú de tu navegador y selecciona “Instalar aplicación” o “Agregar a pantalla de inicio”. Si esa opción todavía no aparece, vuelve a cargar la página e inténtalo nuevamente.');return;}
  deferredInstallPrompt.prompt();const choice=await deferredInstallPrompt.userChoice;if(choice?.outcome==='accepted')sessionStorage.setItem('mngifts_install_banner_dismissed','1');deferredInstallPrompt=null;updateConnectionUI();
}
function initPwa(){
  if('serviceWorker' in navigator && location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;updateConnectionUI();});
  window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;sessionStorage.setItem('mngifts_install_banner_dismissed','1');updateConnectionUI();});
  window.addEventListener('online',updateConnectionUI);window.addEventListener('offline',updateConnectionUI);window.addEventListener('resize',()=>{renderMobileNav();updateMobileInstallUI();});updateConnectionUI();
}

function renderAll(){ renderDailyQuote();refreshCategoryOptions();renderMaterials();renderPurchases();renderProducts();renderCustomers();renderOrders();renderSales();renderExpenses();renderDashboard();renderReports();refreshPurchaseMaterials();refreshOrderCustomers();refreshOrderProducts();renderDataSummary();renderBusinessAlerts();enhanceMobileTables();renderMobileNav(); }

function resetMaterialModal(){ editing.material=null;const f=document.getElementById('materialForm');f.reset();f.elements.quantity.disabled=false;f.elements.cost.disabled=false;document.getElementById('materialModalTitle').textContent='Nuevo material';document.getElementById('materialSubmitBtn').textContent='Guardar material'; }
function openMaterialEdit(id){ const m=getMaterial(id);if(!m)return;editing.material=id;const f=document.getElementById('materialForm');f.elements.name.value=m.name;f.elements.unit.value=m.unit;f.elements.quantity.value=num(m.available);f.elements.cost.value=Math.round(num(m.available)*materialUnitCost(m));f.elements.quantity.disabled=true;f.elements.cost.disabled=true;document.getElementById('materialModalTitle').textContent='Editar material';document.getElementById('materialSubmitBtn').textContent='Guardar cambios';openModal('materialModal'); }
function resetPurchaseModal(){ editing.purchase=null;const f=document.getElementById('purchaseForm');f.reset();refreshPurchaseMaterials();f.elements.date.value=todayISO();document.getElementById('purchaseModalTitle').textContent='Registrar compra de material';document.getElementById('purchaseSubmitBtn').textContent='Guardar compra y aumentar inventario';updatePurchasePreview(); }
function openPurchaseEdit(id){ const x=state.purchases.find(p=>p.id===id);if(!x)return;editing.purchase=id;const f=document.getElementById('purchaseForm');refreshPurchaseMaterials(x.materialId);f.elements.quantity.value=x.quantity;f.elements.cost.value=x.cost;f.elements.date.value=x.date||todayISO();f.elements.note.value=x.note||'';document.getElementById('purchaseModalTitle').textContent='Editar compra';document.getElementById('purchaseSubmitBtn').textContent='Guardar cambios';updatePurchasePreview();openModal('purchaseModal'); }
function resetProductModal(){ editing.product=null;draftRecipe=[];const f=document.getElementById('productForm');f.reset();f.elements.laborCost.value=0;f.elements.extraCost.value=0;f.elements.targetMargin.value=40;refreshCategoryOptions();toggleCustomCategory();document.getElementById('productModalTitle').textContent='Nuevo producto';document.getElementById('productSubmitBtn').textContent='Guardar producto';renderDraftRecipe(); }
function openProductEdit(id){ const p=getProduct(id);if(!p)return;editing.product=id;draftRecipe=normalizedRecipe(p).map(x=>({...x}));const f=document.getElementById('productForm');f.elements.name.value=p.name;refreshCategoryOptions();if([...fixedCategories,...state.customCategories].includes(p.category))f.elements.category.value=p.category;else{if(p.category&&!state.customCategories.includes(p.category)){state.customCategories.push(p.category);save();refreshCategoryOptions()}f.elements.category.value=p.category||''}f.elements.laborCost.value=num(p.laborCost);f.elements.extraCost.value=num(p.extraCost);f.elements.targetMargin.value=num(p.targetMargin)||40;f.elements.price.value=num(p.price);toggleCustomCategory();document.getElementById('productModalTitle').textContent='Editar producto';document.getElementById('productSubmitBtn').textContent='Guardar cambios';renderDraftRecipe();openModal('productModal'); }
function resetSaleModal(){ editing.sale=null;const f=document.getElementById('saleForm');f.reset();refreshSaleProducts();f.elements.date.value=todayISO();f.elements.quantity.value=1;document.getElementById('saleModalTitle').textContent='Registrar venta';document.getElementById('saleSubmitBtn').textContent='Guardar venta y descontar materiales';updateSalePreview(); }
function openSaleEdit(id){ const s=state.sales.find(x=>x.id===id);if(!s)return;if(!getProduct(s.productId)){alert('Este producto ya fue eliminado. La venta puede eliminarse, pero no editarse.');return}editing.sale=id;const f=document.getElementById('saleForm');refreshSaleProducts(s.productId);f.elements.quantity.value=s.quantity;f.elements.date.value=s.date||todayISO();document.getElementById('saleModalTitle').textContent='Editar venta';document.getElementById('saleSubmitBtn').textContent='Guardar cambios';updateSalePreview();openModal('saleModal'); }
function resetExpenseModal(){ editing.expense=null;const f=document.getElementById('expenseForm');f.reset();f.elements.date.value=todayISO();document.getElementById('expenseModalTitle').textContent='Registrar gasto';document.getElementById('expenseSubmitBtn').textContent='Guardar gasto'; }
function openExpenseEdit(id){ const x=state.expenses.find(e=>e.id===id);if(!x)return;editing.expense=id;const f=document.getElementById('expenseForm');f.elements.category.value=x.category;f.elements.description.value=x.description;f.elements.amount.value=x.amount;f.elements.date.value=x.date||todayISO();document.getElementById('expenseModalTitle').textContent='Editar gasto';document.getElementById('expenseSubmitBtn').textContent='Guardar cambios';openModal('expenseModal'); }

function applyPurchaseToInventory(p){ const m=getMaterial(p.materialId);if(!m)return false;const oldQty=num(m.available),oldValue=oldQty*materialUnitCost(m),newQty=oldQty+num(p.quantity);m.available=newQty;m.avgUnitCost=newQty?(oldValue+num(p.cost))/newQty:0;m.totalPurchased=num(m.totalPurchased)+num(p.quantity);m.totalSpent=num(m.totalSpent)+num(p.cost);return true; }
function reversePurchaseFromInventory(p){ const m=getMaterial(p.materialId);if(!m)return {ok:false,message:'El material de esta compra ya no existe.'};const q=num(p.quantity),cost=num(p.cost),available=num(m.available),value=available*materialUnitCost(m);if(available+1e-9<q)return {ok:false,message:'No se puede modificar esta compra porque parte de esas unidades ya fue utilizada en productos vendidos.'};if(value+1e-6<cost)return {ok:false,message:'No se puede revertir esta compra porque su valor ya fue parcialmente consumido por ventas posteriores.'};const newQty=Math.max(0,available-q),newValue=Math.max(0,value-cost);m.available=newQty;m.avgUnitCost=newQty?newValue/newQty:0;m.totalPurchased=Math.max(0,num(m.totalPurchased)-q);m.totalSpent=Math.max(0,num(m.totalSpent)-cost);return {ok:true}; }
function canConsume(consumption){ const missing=[];consumption.forEach(i=>{const m=getMaterial(i.materialId);if(!m||num(m.available)+1e-9<num(i.quantity))missing.push(`${m?.name||i.materialName||'Material eliminado'} (necesitas ${formatQty(i.quantity)} ${m?.unit||i.unit||''})`)});return missing; }
function consume(consumption){ consumption.forEach(i=>{const m=getMaterial(i.materialId);if(m)m.available=Math.max(0,num(m.available)-num(i.quantity))}); }
function restore(consumption){ consumption.forEach(i=>{const m=getMaterial(i.materialId);if(m)m.available=num(m.available)+num(i.quantity)}); }

initSplash();

// Navegación, modales y filtros
document.querySelectorAll('.nav-btn').forEach(b=>b.addEventListener('click',()=>goTo(b.dataset.section)));
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>goTo(b.dataset.go)));
document.getElementById('menuBtn').addEventListener('click',()=>toggleMobileSidebar());
document.getElementById('sidebarCloseBtn')?.addEventListener('click',()=>toggleMobileSidebar(false));
document.getElementById('mobileNavBackdrop')?.addEventListener('click',()=>toggleMobileSidebar(false));
document.getElementById('mobileBottomNav')?.addEventListener('click',e=>{const btn=e.target.closest('.mobile-nav-btn');if(!btn)return;if(btn.dataset.mobileSection)goTo(btn.dataset.mobileSection);else if(btn.dataset.mobileMore)toggleMobileSidebar(true);});
document.getElementById('mobileInstallBtn')?.addEventListener('click',installPwa);
document.getElementById('mobileInstallDismiss')?.addEventListener('click',()=>{sessionStorage.setItem('mngifts_install_banner_dismissed','1');updateMobileInstallUI();});
document.getElementById('businessAlertsBtn')?.addEventListener('click',e=>{e.stopPropagation();const pop=document.getElementById('businessAlertsPopover'),btn=document.getElementById('businessAlertsBtn');if(!pop)return;pop.hidden=!pop.hidden;btn.setAttribute('aria-expanded',pop.hidden?'false':'true');});
document.getElementById('closeBusinessAlerts')?.addEventListener('click',closeBusinessAlerts);
document.addEventListener('click',e=>{const item=e.target.closest?.('[data-alert-section]');if(item){goTo(item.dataset.alertSection);closeBusinessAlerts();return}if(!e.target.closest?.('.alerts-control'))closeBusinessAlerts();});
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>closeModal(b.dataset.close)));
document.querySelectorAll('.modal-backdrop').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeModal(m.id)}));
document.getElementById('productCategory').addEventListener('change',toggleCustomCategory);
['purchases','sales','expenses'].forEach(prefix=>{['From','To'].forEach(suffix=>document.getElementById(prefix+suffix).addEventListener('change',()=>({purchases:renderPurchases,sales:renderSales,expenses:renderExpenses}[prefix]())))});
document.querySelectorAll('[data-clear-filter]').forEach(b=>b.addEventListener('click',()=>{const p=b.dataset.clearFilter;if(p==='orders'){document.getElementById('ordersFrom').value='';document.getElementById('ordersTo').value='';document.getElementById('ordersStatus').value='';renderOrders();return}document.getElementById(p+'From').value='';document.getElementById(p+'To').value='';({purchases:renderPurchases,sales:renderSales,expenses:renderExpenses,reports:renderReports}[p])()}));
['ordersFrom','ordersTo','ordersStatus'].forEach(id=>document.getElementById(id).addEventListener('change',renderOrders));
['reportsFrom','reportsTo'].forEach(id=>document.getElementById(id).addEventListener('change',renderReports));
['dashboardFrom','dashboardTo'].forEach(id=>document.getElementById(id).addEventListener('change',renderDashboard));document.getElementById('clearDashboardFilter').addEventListener('click',()=>{document.getElementById('dashboardFrom').value='';document.getElementById('dashboardTo').value='';renderDashboard()});

document.getElementById('openMaterialModal').addEventListener('click',()=>{if(!requireBusinessAdmin())return;resetMaterialModal();openModal('materialModal')});
document.getElementById('openPurchaseModal').addEventListener('click',()=>{if(!requireBusinessAdmin())return;if(!state.materials.length){alert('Primero registra al menos un material.');goTo('materials');return}resetPurchaseModal();openModal('purchaseModal')});
document.getElementById('openProductModal').addEventListener('click',()=>{if(!requireBusinessAdmin())return;if(!state.materials.length){alert('Primero registra al menos un material para poder crear la receta del producto.');goTo('materials');return}resetProductModal();openModal('productModal')});
document.getElementById('openCustomerModal').addEventListener('click',()=>{resetCustomerModal();openModal('customerModal')});
document.getElementById('openOrderModal').addEventListener('click',()=>{if(!state.customers.length){alert('Primero registra al menos un cliente.');goTo('customers');return}if(!state.products.length){alert('Primero crea al menos un producto.');goTo('products');return}resetOrderModal();openModal('orderModal')});
document.getElementById('openSaleModal').addEventListener('click',()=>{if(!state.products.length){alert('Primero debes crear al menos un producto.');goTo('products');return}resetSaleModal();openModal('saleModal')});
document.getElementById('openExpenseModal').addEventListener('click',()=>{if(!requireBusinessAdmin())return;resetExpenseModal();openModal('expenseModal')});

document.getElementById('exportBackupBtn').addEventListener('click',()=>{if(requireBusinessAdmin())downloadBackup()});
document.getElementById('importBackupInput').addEventListener('change',e=>{if(!requireBusinessAdmin()){e.target.value='';return}const file=e.target.files?.[0];if(file)importBackupFile(file);e.target.value=''});
document.getElementById('resetAllDataBtn').addEventListener('click',()=>{if(requireBusinessAdmin())clearAllBusinessData()});
document.getElementById('installPwaBtn').addEventListener('click',installPwa);

document.getElementById('orderProduct').addEventListener('change',()=>updateOrderMoneyPreview(true));
document.querySelector('#orderForm [name="quantity"]').addEventListener('input',()=>updateOrderMoneyPreview(true));
['orderTotalInput','orderDepositInput'].forEach(id=>document.getElementById(id).addEventListener('input',()=>updateOrderMoneyPreview(false)));

// Formularios
document.getElementById('materialForm').addEventListener('submit',e=>{e.preventDefault();if(!requireBusinessAdmin())return;const f=e.currentTarget,d=Object.fromEntries(new FormData(f));if(editing.material){const m=getMaterial(editing.material);if(!m)return;m.name=d.name.trim();m.unit=d.unit;state.purchases.filter(p=>p.materialId===m.id).forEach(p=>{p.materialName=m.name;p.unit=m.unit});state.sales.forEach(s=>(s.consumption||[]).filter(i=>i.materialId===m.id).forEach(i=>{i.materialName=m.name;i.unit=m.unit}));save();renderAll();closeModal('materialModal');resetMaterialModal();return}const q=num(d.quantity),cost=num(d.cost),id=crypto.randomUUID(),avg=q?cost/q:0;state.materials.push({id,name:d.name.trim(),unit:d.unit,quantity:q,cost,available:q,avgUnitCost:avg,totalPurchased:q,totalSpent:cost});state.purchases.push({id:crypto.randomUUID(),materialId:id,materialName:d.name.trim(),unit:d.unit,quantity:q,cost,date:todayISO(),note:'Compra inicial'});save();renderAll();closeModal('materialModal');resetMaterialModal()});
['materialId','quantity','cost'].forEach(name=>document.querySelector(`#purchaseForm [name="${name}"]`).addEventListener(name==='materialId'?'change':'input',updatePurchasePreview));
document.getElementById('purchaseForm').addEventListener('submit',e=>{e.preventDefault();if(!requireBusinessAdmin())return;const d=Object.fromEntries(new FormData(e.currentTarget)),m=getMaterial(d.materialId),q=num(d.quantity),cost=num(d.cost);if(!m||q<=0)return;const replacement={id:editing.purchase||crypto.randomUUID(),materialId:m.id,materialName:m.name,unit:m.unit,quantity:q,cost,date:d.date,note:d.note.trim()};if(editing.purchase){const old=state.purchases.find(x=>x.id===editing.purchase);if(!old)return;const reversed=reversePurchaseFromInventory(old);if(!reversed.ok){alert(reversed.message);return}Object.assign(old,replacement);applyPurchaseToInventory(old)}else{state.purchases.push(replacement);applyPurchaseToInventory(replacement)}save();renderAll();closeModal('purchaseModal');resetPurchaseModal()});
document.getElementById('addRecipeMaterial').addEventListener('click',()=>{const id=document.getElementById('recipeMaterial').value,q=num(document.getElementById('recipeQuantity').value);if(!id||q<=0){alert('Selecciona un material e indica una cantidad válida.');return}draftRecipe.push({materialId:id,quantity:q});document.getElementById('recipeQuantity').value='';renderDraftRecipe()});
document.getElementById('recipeList').addEventListener('click',e=>{const id=e.target.dataset.removeRecipe;if(!id)return;draftRecipe=draftRecipe.filter(x=>x.materialId!==id);renderDraftRecipe()});
['laborCost','extraCost','targetMargin','productPrice'].forEach(id=>document.getElementById(id).addEventListener('input',updateProductCostPreview));
document.getElementById('suggestedPrice').addEventListener('click',()=>{const raw=document.getElementById('suggestedPrice').textContent.replace(/[^0-9]/g,'');if(raw){document.getElementById('productPrice').value=raw;updateProductCostPreview()}});
document.getElementById('productForm').addEventListener('submit',e=>{e.preventDefault();if(!requireBusinessAdmin())return;if(!draftRecipe.length){alert('Agrega al menos un material a la receta del producto.');return}const d=Object.fromEntries(new FormData(e.currentTarget));let category=d.category;if(category==='__other__'){category=d.customCategory.trim();if(!category){alert('Escribe el nombre de la nueva categoría.');return}if(!state.customCategories.some(c=>c.toLowerCase()===category.toLowerCase()))state.customCategories.push(category)}const data={name:d.name.trim(),category,recipe:draftRecipe.map(x=>({...x})),laborCost:num(d.laborCost),extraCost:num(d.extraCost),targetMargin:num(d.targetMargin),price:num(d.price)};if(editing.product){const p=getProduct(editing.product);Object.assign(p,data);p.cost=calculateProductCost(p)}else{const p={id:crypto.randomUUID(),...data};p.cost=calculateProductCost(p);state.products.push(p)}save();renderAll();closeModal('productModal');resetProductModal()});
document.getElementById('saleProduct').addEventListener('change',updateSalePreview);document.querySelector('#saleForm [name="quantity"]').addEventListener('input',updateSalePreview);
document.getElementById('saleForm').addEventListener('submit',e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget)),p=getProduct(d.productId),qty=num(d.quantity);if(!p||qty<=0)return;let old=null;if(editing.sale){old=state.sales.find(x=>x.id===editing.sale);restore(old?.consumption||[])}const consumption=buildConsumption(p,qty),missing=canConsume(consumption);if(missing.length){if(old)consume(old.consumption||[]);alert('No hay material suficiente para esta venta:\n\n'+missing.join('\n'));return}consume(consumption);const unitCost=calculateProductCost(p),data={productId:p.id,productName:p.name,productCategory:p.category||'',quantity:qty,date:d.date,unitPrice:num(p.price),total:num(p.price)*qty,unitCost,cost:unitCost*qty,consumption};if(old)Object.assign(old,data);else state.sales.push({id:crypto.randomUUID(),...data});save();renderAll();closeModal('saleModal');resetSaleModal()});
document.getElementById('customerForm').addEventListener('submit',e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget)),data={name:d.name.trim(),phone:d.phone.trim(),location:d.location.trim(),notes:d.notes.trim()};if(editing.customer){const c=getCustomer(editing.customer);Object.assign(c,data);state.orders.filter(o=>o.customerId===c.id).forEach(o=>{o.customerName=c.name;o.customerPhone=c.phone})}else state.customers.push({id:crypto.randomUUID(),...data});save();renderAll();closeModal('customerModal');resetCustomerModal()});
document.getElementById('orderForm').addEventListener('submit',e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget)),c=getCustomer(d.customerId),p=getProduct(d.productId),qty=num(d.quantity),total=num(d.total),deposit=num(d.deposit);if(!c||!p||qty<=0)return;if(d.deliveryDate<d.orderDate){alert('La fecha de entrega no puede ser anterior a la fecha del pedido.');return}if(deposit>total){alert('El anticipo no puede ser mayor que el total del pedido.');return}const data={customerId:c.id,customerName:c.name,customerPhone:c.phone||'',productId:p.id,productName:p.name,quantity:qty,orderDate:d.orderDate,deliveryDate:d.deliveryDate,total,deposit,status:d.status,notes:d.notes.trim()};if(editing.order){const old=getOrder(editing.order);if(old?.saleId){alert('No puedes editar un pedido ya convertido en venta.');return}Object.assign(old,data)}else state.orders.push({id:crypto.randomUUID(),...data});save();renderAll();closeModal('orderModal');resetOrderModal()});
document.getElementById('expenseForm').addEventListener('submit',e=>{e.preventDefault();if(!requireBusinessAdmin())return;const d=Object.fromEntries(new FormData(e.currentTarget)),data={category:d.category,description:d.description.trim(),amount:num(d.amount),date:d.date};if(editing.expense)Object.assign(state.expenses.find(x=>x.id===editing.expense),data);else state.expenses.push({id:crypto.randomUUID(),...data});save();renderAll();closeModal('expenseModal');resetExpenseModal()});

// Acciones editar / eliminar
document.addEventListener('click',e=>{
  const t=e.target;
  if(t.dataset.editMaterial){if(!requireBusinessAdmin())return;return openMaterialEdit(t.dataset.editMaterial);}
  if(t.dataset.deleteMaterial){if(!requireBusinessAdmin())return;const id=t.dataset.deleteMaterial,used=state.products.some(p=>normalizedRecipe(p).some(i=>i.materialId===id)),sold=state.sales.some(s=>(s.consumption||[]).some(i=>i.materialId===id));if(used){alert('No puedes eliminar este material porque está incluido en la receta de uno o más productos.');return}if(sold){alert('No puedes eliminar este material porque existen ventas históricas que lo consumieron.');return}if(confirm('¿Eliminar este material y su historial de compras?')){state.materials=state.materials.filter(m=>m.id!==id);state.purchases=state.purchases.filter(p=>p.materialId!==id);save();renderAll()}return;}
  if(t.dataset.editPurchase){if(!requireBusinessAdmin())return;return openPurchaseEdit(t.dataset.editPurchase);}
  if(t.dataset.deletePurchase){if(!requireBusinessAdmin())return;const x=state.purchases.find(p=>p.id===t.dataset.deletePurchase);if(!x)return;if(!confirm('¿Eliminar esta compra? El inventario se reducirá en la cantidad comprada.'))return;const r=reversePurchaseFromInventory(x);if(!r.ok){alert(r.message);return}state.purchases=state.purchases.filter(p=>p.id!==x.id);save();renderAll();return;}
  if(t.dataset.editProduct){if(!requireBusinessAdmin())return;return openProductEdit(t.dataset.editProduct);}
  if(t.dataset.deleteProduct){if(!requireBusinessAdmin())return;if(confirm('¿Eliminar este producto? Las ventas históricas se conservarán.')){state.products=state.products.filter(p=>p.id!==t.dataset.deleteProduct);save();renderAll()}return;}
  if(t.dataset.convertOrder){convertOrderToSale(t.dataset.convertOrder);return;}
  if(t.dataset.editSale){if(!requireBusinessAdmin())return;const s=state.sales.find(x=>x.id===t.dataset.editSale);if(s?.orderId){alert('Esta venta proviene de un pedido. Revierte la venta para modificar el pedido original.');return}return openSaleEdit(t.dataset.editSale);}
  if(t.dataset.deleteSale){if(!requireBusinessAdmin())return;const s=state.sales.find(x=>x.id===t.dataset.deleteSale);if(!s)return;const msg=s.orderId?'¿Revertir esta venta? Los materiales volverán al inventario y el pedido regresará a estado Listo.':'¿Eliminar esta venta? Los materiales utilizados volverán al inventario.';if(confirm(msg)){restore(s.consumption||[]);state.sales=state.sales.filter(x=>x.id!==s.id);if(s.orderId){const o=getOrder(s.orderId);if(o){o.saleId=null;if(o.status==='Entregado')o.status='Listo';delete o.convertedAt}}save();renderAll()}return;}
  if(t.dataset.editCustomer)return openCustomerEdit(t.dataset.editCustomer);
  if(t.dataset.deleteCustomer){if(!requireBusinessAdmin())return;const id=t.dataset.deleteCustomer;if(state.orders.some(o=>o.customerId===id)){alert('No puedes eliminar este cliente porque tiene pedidos registrados. Puedes editar sus datos en su lugar.');return}if(confirm('¿Eliminar este cliente?')){state.customers=state.customers.filter(c=>c.id!==id);save();renderAll()}return;}
  if(t.dataset.editOrder)return openOrderEdit(t.dataset.editOrder);
  if(t.dataset.deleteOrder){if(!requireBusinessAdmin())return;const o=getOrder(t.dataset.deleteOrder);if(o?.saleId){alert('Este pedido ya fue convertido en venta. Revierte primero la venta asociada.');return}if(confirm('¿Eliminar este pedido?')){state.orders=state.orders.filter(o=>o.id!==t.dataset.deleteOrder);save();renderAll()}return;}
  if(t.dataset.editExpense){if(!requireBusinessAdmin())return;return openExpenseEdit(t.dataset.editExpense);}
  if(t.dataset.deleteExpense){if(!requireBusinessAdmin())return;if(confirm('¿Eliminar este gasto?')){state.expenses=state.expenses.filter(x=>x.id!==t.dataset.deleteExpense);save();renderAll()}return;}
});

// La inicialización se realiza desde cloud.js después de validar la sesión de Supabase.
