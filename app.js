const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const state = {
  materials: JSON.parse(localStorage.getItem('mngifts_materials') || '[]'),
  products: JSON.parse(localStorage.getItem('mngifts_products') || '[]'),
  sales: JSON.parse(localStorage.getItem('mngifts_sales') || '[]'),
  purchases: JSON.parse(localStorage.getItem('mngifts_purchases') || '[]'),
  expenses: JSON.parse(localStorage.getItem('mngifts_expenses') || '[]'),
  customers: JSON.parse(localStorage.getItem('mngifts_customers') || '[]'),
  orders: JSON.parse(localStorage.getItem('mngifts_orders') || '[]'),
  payments: JSON.parse(localStorage.getItem('mngifts_payments') || '[]'),
  cashClosures: JSON.parse(localStorage.getItem('mngifts_cash_closures') || '[]'),
  suppliers: JSON.parse(localStorage.getItem('mngifts_suppliers') || '[]'),
  inventoryMovements: JSON.parse(localStorage.getItem('mngifts_inventory_movements') || '[]'),
  productionJobs: JSON.parse(localStorage.getItem('mngifts_production_jobs') || '[]'),
  productionReservations: JSON.parse(localStorage.getItem('mngifts_production_reservations') || '[]'),
  customCategories: JSON.parse(localStorage.getItem('mngifts_categories') || '[]')
};
let draftRecipe = [];
let editing = { material:null, purchase:null, product:null, sale:null, expense:null, customer:null, order:null, supplier:null };

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
  inventory:['Inventario','Movimientos, pérdidas, proveedores y reposición'],
  purchases:['Compras','Reposición de materiales y salidas de caja'], products:['Productos','Recetas, costos y precios de venta'],
  customers:['Clientes','Directorio de compradores y datos de contacto'], orders:['Pedidos','Encargos, anticipos y fechas de entrega'],
  production:['Producción','Planificación, reservas de materiales y agenda de fabricación'],
  sales:['Ventas','Ingresos, costos y consumo de inventario'], expenses:['Gastos','Control de gastos operativos del negocio'],
  reports:['Reportes','Análisis financiero, rentabilidad y cuentas por cobrar'],
  cash:['Caja','Movimientos financieros, ingresos, egresos y cierre diario'],
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
  localStorage.setItem('mngifts_payments',JSON.stringify(state.payments));
  localStorage.setItem('mngifts_cash_closures',JSON.stringify(state.cashClosures));
  localStorage.setItem('mngifts_suppliers',JSON.stringify(state.suppliers));
  localStorage.setItem('mngifts_inventory_movements',JSON.stringify(state.inventoryMovements));
  localStorage.setItem('mngifts_production_jobs',JSON.stringify(state.productionJobs));
  localStorage.setItem('mngifts_production_reservations',JSON.stringify(state.productionReservations));
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
    const base=Math.max(num(m.totalPurchased),num(m.quantity),1),available=num(m.available),ratio=available/base,min=num(m.minimumStock);
    if(available<=0) alerts.push({level:'critical',icon:'⛔',title:`${m.name} está agotado`,detail:'No queda existencia disponible.',section:'materials'});
    else if((min>0&&available<=min)||(min<=0&&ratio<=.2)) alerts.push({level:'warning',icon:'🎀',title:`Stock bajo: ${m.name}`,detail:min>0?`Quedan ${formatQty(available)} ${m.unit}; mínimo configurado: ${formatQty(min)}.`:`Quedan ${formatQty(available)} ${m.unit}.`,section:'materials'});
  });
  state.orders.filter(o=>['Pendiente','En elaboración','Listo'].includes(o.status)&&o.deliveryDate).forEach(o=>{
    const days=dayDifference(o.deliveryDate); if(days===null||days>2)return;
    const customer=getCustomer(o.customerId)?.name||o.customerName||'Cliente';
    if(days<0) alerts.push({level:'critical',icon:'⏰',title:`Pedido atrasado · ${customer}`,detail:`La entrega era ${niceDate(o.deliveryDate)}.`,section:'orders'});
    else if(days===0) alerts.push({level:'critical',icon:'📦',title:`Entrega para hoy · ${customer}`,detail:`Pedido ${o.status.toLowerCase()} para entregar hoy.`,section:'orders'});
    else alerts.push({level:'warning',icon:'📅',title:`Entrega ${days===1?'mañana':`en ${days} días`} · ${customer}`,detail:`Fecha: ${niceDate(o.deliveryDate)}.`,section:'orders'});
  });
  const pendingOrders=state.orders.filter(o=>o.status!=='Cancelado'&&orderBalance(o)>0);
  const pendingTotal=pendingOrders.reduce((sum,o)=>sum+orderBalance(o),0);
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
function getSupplier(id){ return state.suppliers.find(x=>x.id===id); }
function getProduct(id){ return state.products.find(p=>p.id===id); }
function getCustomer(id){ return state.customers.find(c=>c.id===id); }
function getOrder(id){ return state.orders.find(o=>o.id===id); }
let draftOrderItems=[];
function normalizedOrderItems(order){
  if(!order)return[];
  const source=Array.isArray(order.items)&&order.items.length?order.items:(order.productId?[{id:order.id,productId:order.productId,productName:order.productName,quantity:order.quantity}]:[]);
  return source.map((i,index)=>({id:i.id||`${order.id||'order'}-${index}`,productId:i.productId||'',productName:i.productName||getProduct(i.productId)?.name||'Producto',quantity:Math.max(1,Math.round(num(i.quantity)||1))})).filter(i=>i.productId);
}
function syncOrderLegacyFields(order){const items=normalizedOrderItems(order);order.items=items;const first=items[0]||{};order.productId=first.productId||'';order.productName=first.productName||'Producto';order.quantity=items.reduce((sum,i)=>sum+num(i.quantity),0);return order}
function orderItemsSubtotal(items){return (items||[]).reduce((sum,i)=>sum+num(getProduct(i.productId)?.price)*num(i.quantity),0)}
function orderItemsSignature(items){return (items||[]).map(i=>`${i.productId}:${Math.max(1,Math.round(num(i.quantity)||1))}`).sort().join('|')}
function orderProductsText(order){const items=normalizedOrderItems(order);return items.map(i=>`${i.productName||getProduct(i.productId)?.name||'Producto'} × ${formatQty(i.quantity)}`).join(' · ')}
function orderProductsHtml(order){const items=normalizedOrderItems(order);return `<div class="order-product-lines">${items.map(i=>`<span class="order-product-line"><strong>${escapeHtml(i.productName||getProduct(i.productId)?.name||'Producto')}</strong> <small>× ${formatQty(i.quantity)}</small></span>`).join('')}</div>`}
function orderItemUnitPrice(order,item){const subtotal=orderItemsSubtotal(normalizedOrderItems(order));const p=getProduct(item.productId),factor=subtotal>0?num(order.total)/subtotal:0;return subtotal>0?num(p?.price)*factor:(normalizedOrderItems(order).reduce((s,x)=>s+num(x.quantity),0)?num(order.total)/normalizedOrderItems(order).reduce((s,x)=>s+num(x.quantity),0):0)}
function normalizedSaleItems(sale){if(!sale)return[];const source=Array.isArray(sale.items)&&sale.items.length?sale.items:(sale.productId?[{id:sale.id,productId:sale.productId,productName:sale.productName,productCategory:sale.productCategory,quantity:sale.quantity,unitPrice:sale.unitPrice,unitCost:sale.unitCost,consumption:sale.consumption}]:[]);return source.map((i,index)=>({id:i.id||`${sale.id||'sale'}-${index}`,productId:i.productId||'',productName:i.productName||getProduct(i.productId)?.name||'Producto',productCategory:i.productCategory||getProduct(i.productId)?.category||'',quantity:Math.max(1,Math.round(num(i.quantity)||1)),unitPrice:num(i.unitPrice),unitCost:num(i.unitCost),consumption:Array.isArray(i.consumption)?i.consumption:[]}))}
function saleItemsHtml(sale){const items=normalizedSaleItems(sale);return `<div class="order-product-lines">${items.map(i=>`<span class="order-product-line"><strong>${escapeHtml(i.productName||'Producto')}</strong> <small>× ${formatQty(i.quantity)}</small></span>`).join('')}</div>`}
function combineConsumptions(rows){const map=new Map();(rows||[]).flat().forEach(r=>{if(!r?.materialId)return;const x=map.get(r.materialId)||{materialId:r.materialId,materialName:r.materialName||getMaterial(r.materialId)?.name||'',unit:r.unit||getMaterial(r.materialId)?.unit||'',quantity:0,unitCost:num(r.unitCost)||materialUnitCost(getMaterial(r.materialId))};x.quantity+=num(r.quantity);map.set(r.materialId,x)});return [...map.values()]}
const PAYMENT_METHODS=['Efectivo','Nequi','Daviplata','Transferencia bancaria','Tarjeta','Otro'];
function paymentsForOrder(orderId){return state.payments.filter(p=>p.orderId===orderId)}
function initialPaymentForOrder(orderId){
  const positives=paymentsForOrder(orderId).filter(p=>num(p.amount)>0);
  const initial=positives.filter(p=>String(p.kind||'').toLowerCase()==='anticipo');
  const source=initial.length?initial:positives;
  return [...source].sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||state.payments.indexOf(a)-state.payments.indexOf(b))[0]||null;
}
function initialPaymentMethodForOrder(orderId){return initialPaymentForOrder(orderId)?.method||paymentMethodSummaryForOrder(orderId)||'Otro'}
function paidAmountForOrder(orderOrId){const id=typeof orderOrId==='string'?orderOrId:orderOrId?.id;return state.payments.filter(p=>p.orderId===id).reduce((sum,p)=>sum+num(p.amount),0)}
function refundedAmountForOrder(orderOrId){const id=typeof orderOrId==='string'?orderOrId:orderOrId?.id;return Math.abs(state.payments.filter(p=>p.orderId===id&&num(p.amount)<0).reduce((sum,p)=>sum+num(p.amount),0))}
function orderAgeDays(order){if(!order?.orderDate)return null;const d=dayDifference(order.orderDate);return d===null?null:-d}
function canRefundCancelledOrder(order){const age=orderAgeDays(order);return !!order&&order.status==='Cancelado'&&!order.saleId&&paidAmountForOrder(order)>0.009&&age!==null&&age>=0&&age<=5}
function orderRefundDeadline(order){const d=dateAtNoon(order?.orderDate);if(!d)return'';d.setDate(d.getDate()+5);const z=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`}
function paymentForSale(saleId){return state.payments.find(p=>p.saleId===saleId)}
function orderBalance(o){return Math.max(0,num(o?.total)-paidAmountForOrder(o))}
function paymentMethodSummaryForOrder(orderId){const methods=[...new Set(paymentsForOrder(orderId).map(p=>p.method).filter(Boolean))];return methods.length===1?methods[0]:(methods.length>1?'Varios':'Otro')}
function migrateFinanceData(){let changed=false;if(!Array.isArray(state.payments)){state.payments=[];changed=true}if(!Array.isArray(state.cashClosures)){state.cashClosures=[];changed=true}state.orders.forEach(o=>{const existing=paidAmountForOrder(o),legacy=num(o.deposit);if(legacy>0&&existing<=0){state.payments.push({id:crypto.randomUUID(),orderId:o.id,saleId:null,date:o.orderDate||todayISO(),amount:legacy,method:'Otro',kind:'Anticipo',note:'Anticipo migrado'});changed=true}o.deposit=paidAmountForOrder(o)});state.sales.forEach(s=>{if(!s.paymentMethod){s.paymentMethod=s.orderId?paymentMethodSummaryForOrder(s.orderId):'Otro';changed=true}if(!s.orderId&&!paymentForSale(s.id)){state.payments.push({id:crypto.randomUUID(),orderId:null,saleId:s.id,date:s.date||todayISO(),amount:num(s.total),method:s.paymentMethod||'Otro',kind:'Venta',note:''});changed=true}});state.purchases.forEach(x=>{if(!x.paymentMethod){x.paymentMethod='Otro';changed=true}});state.expenses.forEach(x=>{if(!x.paymentMethod){x.paymentMethod='Otro';changed=true}});return changed}

function materialUnitCost(m){ if(!m)return 0; if(Number.isFinite(Number(m.avgUnitCost)))return num(m.avgUnitCost); return num(m.quantity)>0?num(m.cost)/num(m.quantity):0; }
function normalizedRecipe(p){ return Array.isArray(p?.recipe)?p.recipe:[]; }
function calculateProductCost(p){
  const mc=normalizedRecipe(p).reduce((sum,i)=>{const m=getMaterial(i.materialId);return sum+(m?materialUnitCost(m)*num(i.quantity):0)},0);
  return mc+num(p?.laborCost)+num(p?.extraCost)+(normalizedRecipe(p).length?0:num(p?.cost));
}
function buildConsumption(product,qty){ return normalizedRecipe(product).map(i=>{const m=getMaterial(i.materialId);return {materialId:i.materialId,materialName:m?.name||'',unit:m?.unit||'',quantity:num(i.quantity)*num(qty),unitCost:m?materialUnitCost(m):0}}); }
function migrateV7(){
  let changed=false;
  state.materials.forEach(m=>{
    if(!Number.isFinite(Number(m.avgUnitCost))){m.avgUnitCost=num(m.quantity)>0?num(m.cost)/num(m.quantity):0;changed=true;}
    if(!Number.isFinite(Number(m.totalPurchased))){m.totalPurchased=num(m.quantity);changed=true;}
    if(!Number.isFinite(Number(m.totalSpent))){m.totalSpent=num(m.cost);changed=true;}
  });
  state.orders.forEach(o=>{if(!Array.isArray(o.items)||!o.items.length){o.items=normalizedOrderItems(o);changed=true}syncOrderLegacyFields(o)});
  state.sales.forEach(s=>{
    const p=getProduct(s.productId);
    if(!s.productName){s.productName=p?.name||'Producto';changed=true;}
    if(!Array.isArray(s.consumption)){s.consumption=p?buildConsumption(p,s.quantity):[];changed=true;}
    if(!Number.isFinite(Number(s.unitPrice))){s.unitPrice=num(s.quantity)>0?num(s.total)/num(s.quantity):0;changed=true;}
    if(!Number.isFinite(Number(s.unitCost))){s.unitCost=num(s.quantity)>0?num(s.cost)/num(s.quantity):0;changed=true;}
    if(!s.productCategory&&p?.category){s.productCategory=p.category;changed=true;}
    if(!Array.isArray(s.items)||!s.items.length){s.items=normalizedSaleItems(s);changed=true;}
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
const mobileSectionIcons={dashboard:'🏠',materials:'🎀',inventory:'📚',purchases:'📦',products:'🌹',customers:'👥',orders:'📋',production:'🧰',sales:'🛒',expenses:'💸',reports:'📊',cash:'💵',users:'👑',settings:'⚙️'};
function renderMobileNav(){
  const nav=document.getElementById('mobileBottomNav');if(!nav)return;
  const primary=currentAppRole()==='user'?['orders','production','sales','materials']:['dashboard','production','orders','sales'];
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
function roleCanOpenSection(section){ if(currentAppRole()!=='user')return section!=='users'||isSuperadmin();return !['dashboard','inventory','purchases','expenses','reports','cash','users'].includes(section); }
function applyRoleUI(){
  const role=currentAppRole(), user=role==='user';
  document.querySelectorAll('.nav-btn').forEach(btn=>{
    const section=btn.dataset.section;
    let hide=false;
    if(section==='users') hide=!isSuperadmin();
    else if(['dashboard','inventory','purchases','expenses','reports','cash'].includes(section)) hide=user;
    btn.hidden=hide;
    btn.classList.toggle('role-hidden',hide);
    btn.setAttribute('aria-hidden',hide?'true':'false');
  });
  ['openMaterialModal','openPurchaseModal','openProductModal','openExpenseModal','openSupplierModal','openInventoryAdjustmentModal','exportBackupBtn','resetAllDataBtn'].forEach(id=>{const el=document.getElementById(id);if(el)el.hidden=user});
  const importLabel=document.querySelector('label[for="importBackupInput"]');if(importLabel)importLabel.hidden=user;
  const access=document.getElementById('settingsRoleAccess');
  if(access)access.textContent=role==='superadmin'?'Control total + administración de usuarios':role==='admin'?'Control total del negocio · sin administración de usuarios':'Operación diaria · sin costos, compras, gastos, caja, reportes ni eliminaciones';
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
  const payBtn=o.status!=='Cancelado'&&orderBalance(o)>0?`<button type="button" class="action-btn payment" data-pay-order="${o.id}">+ Abono</button>`:'';
  if(!isBusinessAdmin())return `<div class="row-actions">${payBtn}<button type="button" class="action-btn convert" data-convert-order="${o.id}">Pasar a venta</button><button type="button" class="action-btn edit" data-edit-order="${o.id}">Editar</button></div>`;
  return `<div class="row-actions">${payBtn}<button type="button" class="action-btn convert" data-convert-order="${o.id}">Pasar a venta</button><button type="button" class="action-btn edit" data-edit-order="${o.id}">Editar</button><button type="button" class="action-btn delete" data-delete-order="${o.id}">Eliminar</button></div>`;
}
function saleActions(s){
  const detailBtn=`<button type="button" class="action-btn view" data-view-sale="${s.id}">Ver detalle</button>`;
  if(!isBusinessAdmin())return `<div class="row-actions">${detailBtn}<span class="action-state">${s.orderId?'Desde pedido':'Registrada'}</span></div>`;
  if(s.orderId)return `<div class="row-actions">${detailBtn}<span class="action-state">Desde pedido</span><button type="button" class="action-btn delete" data-delete-sale="${s.id}">Revertir</button></div>`;
  return `<div class="row-actions">${detailBtn}<button type="button" class="action-btn edit" data-edit-sale="${s.id}">Editar</button><button type="button" class="action-btn delete" data-delete-sale="${s.id}">Eliminar</button></div>`;
}
function saleItemMaterialsHtml(item){
  const rows=Array.isArray(item?.consumption)?item.consumption:[];
  if(!rows.length)return '<div class="sale-detail-no-materials">Sin materiales registrados para esta línea.</div>';
  return `<div class="sale-detail-materials">${rows.map(u=>`<div class="sale-detail-material"><span>${escapeHtml(u.materialName||getMaterial(u.materialId)?.name||'Material')}</span><strong>${formatQty(u.quantity)} ${escapeHtml(u.unit||getMaterial(u.materialId)?.unit||'')}</strong></div>`).join('')}</div>`;
}
function saleReversalPlan(sale){
  if(!sale)return {lines:[],combined:[]};
  const items=normalizedSaleItems(sale),lines=[];
  // Para ventas nuevas/multiproducto, la fuente de verdad son las líneas de la venta.
  // Así se devuelve exactamente lo consumido por cada producto del pedido.
  items.forEach(item=>{
    const rows=Array.isArray(item.consumption)?item.consumption.filter(u=>num(u.quantity)>0):[];
    rows.forEach(u=>lines.push({
      saleItemId:item.id,
      productId:item.productId||'',
      productName:item.productName||'Producto',
      productQuantity:num(item.quantity),
      materialId:u.materialId,
      materialName:u.materialName||getMaterial(u.materialId)?.name||'Material',
      unit:u.unit||getMaterial(u.materialId)?.unit||'',
      quantity:num(u.quantity),
      unitCost:num(u.unitCost)||materialUnitCost(getMaterial(u.materialId))
    }));
  });
  // Compatibilidad con ventas antiguas que solo guardaban consumption en la cabecera.
  if(!lines.length){
    (sale.consumption||[]).filter(u=>num(u.quantity)>0).forEach(u=>lines.push({
      saleItemId:sale.id,
      productId:sale.productId||'',
      productName:sale.productName||'Producto',
      productQuantity:num(sale.quantity),
      materialId:u.materialId,
      materialName:u.materialName||getMaterial(u.materialId)?.name||'Material',
      unit:u.unit||getMaterial(u.materialId)?.unit||'',
      quantity:num(u.quantity),
      unitCost:num(u.unitCost)||materialUnitCost(getMaterial(u.materialId))
    }));
  }
  return {lines,combined:combineConsumptions(lines.map(x=>[x]))};
}
function saleReversalSummary(sale){
  const plan=saleReversalPlan(sale);
  if(!plan.lines.length)return 'No hay materiales registrados para devolver.';
  const byProduct=new Map();
  plan.lines.forEach(x=>{const key=x.saleItemId||x.productName,row=byProduct.get(key)||{name:x.productName,qty:x.productQuantity,materials:[]};row.materials.push(`${x.materialName}: ${formatQty(x.quantity)} ${x.unit}`);byProduct.set(key,row)});
  return [...byProduct.values()].map(x=>`${x.name} × ${formatQty(x.qty)}\n  ${x.materials.join('\n  ')}`).join('\n');
}

function archivedOrderPaymentNote(order,originalKind,extra=''){
  const customer=getCustomer(order?.customerId)?.name||order?.customerName||'Cliente';
  const products=orderProductsText(order)||'Pedido';
  const ref=String(order?.id||'').slice(0,8);
  return [`Pedido eliminado ${ref?`#${ref}`:''}`,customer,products,originalKind?`Movimiento original: ${originalKind}`:'',extra].filter(Boolean).join(' · ');
}
function paymentsRelatedToOrderDeletion(order,sale){
  return state.payments.filter(p=>p.orderId===order?.id||(sale&&p.saleId===sale.id));
}
function orderDeletionRefundRows(order,sale,relevantPayments){
  const net=Math.max(0,relevantPayments.reduce((sum,p)=>sum+num(p.amount),0));
  if(net<=0.009)return [];
  const methodBalance=new Map();
  relevantPayments.forEach(p=>{const method=p.method||'Otro';methodBalance.set(method,(methodBalance.get(method)||0)+num(p.amount))});
  let remaining=net,rows=[];
  [...methodBalance.entries()].filter(([,amount])=>amount>0.009).sort((a,b)=>b[1]-a[1]).forEach(([method,amount])=>{
    if(remaining<=0.009)return;
    const refund=Math.min(remaining,amount);
    rows.push({id:crypto.randomUUID(),orderId:null,saleId:null,date:todayISO(),amount:-refund,method:PAYMENT_METHODS.includes(method)?method:'Otro',kind:'Devolución por eliminación',note:archivedOrderPaymentNote(order,'',`Reembolso registrado al eliminar el pedido${sale?' y su venta':''}`)});
    remaining-=refund;
  });
  if(remaining>0.009){
    rows.push({id:crypto.randomUUID(),orderId:null,saleId:null,date:todayISO(),amount:-remaining,method:'Otro',kind:'Devolución por eliminación',note:archivedOrderPaymentNote(order,'','Reembolso registrado al eliminar el pedido')});
  }
  return rows;
}
function orderDeletionPreview(order,sale,plan,relevantPayments){
  const paid=Math.max(0,relevantPayments.reduce((sum,p)=>sum+num(p.amount),0));
  const lines=[`¿Eliminar definitivamente este pedido?`,``,`Cliente: ${getCustomer(order.customerId)?.name||order.customerName||'Cliente'}`,`Productos: ${orderProductsText(order)||'Pedido'}`];
  if(sale){
    lines.push('',`La venta asociada también será eliminada.`);
    if(plan?.combined?.length){
      lines.push('Materiales que volverán al inventario:');
      plan.combined.forEach(x=>lines.push(`• ${x.materialName||getMaterial(x.materialId)?.name||'Material'}: ${formatQty(x.quantity)} ${x.unit||getMaterial(x.materialId)?.unit||''}`));
    }
  }
  const job=productionJobForOrder(order.id);
  if(job)lines.push('',`Se eliminará el plan de producción y se liberarán sus reservas de materiales.`);
  if(paid>0.009)lines.push('',`Dinero recibido pendiente por devolver: ${COP.format(paid)}.`,`La app registrará el reembolso en Caja. Debes realizar la devolución real al cliente por el medio correspondiente.`);
  else if(relevantPayments.length)lines.push('',`Los pagos/devoluciones históricos quedarán archivados en Caja con saldo neto ${COP.format(0)}.`);
  lines.push('',`Esta acción no se puede deshacer.`);
  return lines.join('\n');
}
function deleteOrderWithFullRollback(orderId){
  const order=getOrder(orderId);if(!order)return;
  const sale=order.saleId?state.sales.find(s=>s.id===order.saleId):state.sales.find(s=>s.orderId===order.id);
  if(order.saleId&&!sale){
    alert('Este pedido figura como vendido, pero no se encontró la venta asociada. No se eliminará para evitar perder el control de materiales o dinero.');
    return;
  }
  const plan=sale?saleReversalPlan(sale):{lines:[],combined:[]};
  if(sale&&!plan.combined.length){
    alert('No se puede eliminar este pedido de forma segura porque la venta asociada no tiene materiales registrados para devolver. Revisa primero el detalle de la venta.');
    return;
  }
  const missingMaterials=sale?plan.combined.filter(x=>!getMaterial(x.materialId)):[];
  if(missingMaterials.length){
    alert('No se puede eliminar este pedido porque faltan materiales del historial de la venta y no sería posible devolver todo al inventario. Materiales faltantes: '+missingMaterials.map(x=>x.materialName||x.materialId).join(', '));
    return;
  }
  const relevantPayments=paymentsRelatedToOrderDeletion(order,sale);
  if(!confirm(orderDeletionPreview(order,sale,plan,relevantPayments)))return;

  // 1) Si llegó a venta, devolver exactamente los materiales registrados en esa venta.
  if(sale){
    restore(plan.combined);
    plan.lines.forEach(u=>recordInventoryMovement({materialId:u.materialId,kind:'sale_reversal',quantity:u.quantity,date:todayISO(),note:`Pedido eliminado · devolución de material: ${u.productName} × ${formatQty(u.productQuantity)}`,sourceType:'order_delete_reversal',sourceId:order.id,unitCost:u.unitCost}));
    state.sales=state.sales.filter(s=>s.id!==sale.id);
  }

  // 2) Liberar reservas/planes de producción; las reservas no habían reducido stock físico.
  const jobIds=state.productionJobs.filter(j=>j.orderId===order.id).map(j=>j.id);
  state.productionReservations=state.productionReservations.filter(r=>r.orderId!==order.id&&!jobIds.includes(r.productionJobId));
  state.productionJobs=state.productionJobs.filter(j=>j.orderId!==order.id);

  // 3) Conservar trazabilidad financiera en Caja. Se archivan los movimientos originales
  //    sin FK al pedido y se agrega la devolución necesaria para que el saldo quede en cero.
  const refundRows=orderDeletionRefundRows(order,sale,relevantPayments);
  relevantPayments.forEach(p=>{
    const originalKind=p.kind|| (num(p.amount)<0?'Devolución':'Pago');
    p.orderId=null;p.saleId=null;
    p.kind=num(p.amount)<0?'Devolución archivada':'Pago archivado';
    p.note=archivedOrderPaymentNote(order,originalKind,p.note||'');
  });
  state.payments.push(...refundRows);

  // 4) Eliminar finalmente el pedido. El historial de inventario/caja queda conservado.
  state.orders=state.orders.filter(o=>o.id!==order.id);
  save();renderAll();
  const returned=plan.combined.length?` Se devolvieron ${plan.combined.length} material(es) al inventario.`:'';
  const refunded=refundRows.length?` Se registró una devolución total de ${COP.format(Math.abs(refundRows.reduce((s,p)=>s+num(p.amount),0)))} en Caja.`:'';
  alert(`Pedido eliminado correctamente.${returned}${refunded}`);
}

function openSaleDetail(id){
  const s=state.sales.find(x=>x.id===id);if(!s)return;
  const items=normalizedSaleItems(s),o=s.orderId?getOrder(s.orderId):null,customer=getCustomer(s.customerId)?.name||s.customerName||o?.customerName||'Cliente';
  const summary=document.getElementById('saleDetailSummary'),body=document.getElementById('saleDetailItems');
  if(summary)summary.innerHTML=`<div><span>Origen</span><strong>${s.orderId?'Pedido convertido':'Venta directa'}</strong></div><div><span>Cliente</span><strong>${escapeHtml(customer)}</strong></div><div><span>Fecha</span><strong>${niceDate(s.date)}</strong></div><div><span>Total</span><strong>${COP.format(s.total)}</strong></div>${o?`<div><span>Pedido realizado</span><strong>${niceDate(o.orderDate)}</strong></div><div><span>Entrega</span><strong>${niceDate(o.deliveryDate)}</strong></div>`:''}`;
  if(body)body.innerHTML=items.length?items.map((i,index)=>`<article class="sale-detail-item"><div class="sale-detail-item-head"><div><small>Producto ${index+1}</small><strong>${escapeHtml(i.productName||'Producto')}</strong></div><div class="sale-detail-qty"><span>Cantidad</span><strong>${formatQty(i.quantity)}</strong></div></div><div class="sale-detail-material-title">Materiales descontados</div>${saleItemMaterialsHtml(i)}</article>`).join(''):'<div class="empty-state small"><p>Esta venta no tiene líneas de producto registradas.</p></div>';
  openModal('saleDetailModal');
}

function renderDailyQuote(){ const start=new Date(new Date().getFullYear(),0,0),day=Math.floor((new Date()-start)/86400000),q=motivationalQuotes[day%motivationalQuotes.length]; document.getElementById('dailyQuote').textContent=`“${q.text}”`;document.getElementById('dailyQuoteAuthor').textContent=`— ${q.author}`; }
function goTo(section){ if(!roleCanOpenSection(section)){section=currentAppRole()==='user'?'orders':'dashboard'}document.querySelectorAll('.page-section').forEach(el=>el.classList.toggle('active',el.id===section));document.querySelectorAll('.nav-btn').forEach(el=>el.classList.toggle('active',el.dataset.section===section));document.getElementById('pageTitle').textContent=titles[section][0];document.getElementById('pageSubtitle').textContent=titles[section][1];syncMobileNavActive(section);toggleMobileSidebar(false);if(section==='inventory')requestAnimationFrame(()=>{enhanceMobileTables();sizeInventoryMovementScroll()});if(section==='cash')requestAnimationFrame(()=>{enhanceMobileTables();sizeCashMovementsScroll()});window.scrollTo({top:0,behavior:'smooth'}); }
function openModal(id){ document.getElementById(id).classList.add('open');document.body.classList.add('modal-open'); }
function closeModal(id){ document.getElementById(id).classList.remove('open');if(!document.querySelector('.modal-backdrop.open'))document.body.classList.remove('modal-open'); }

function refreshCategoryOptions(){ const s=document.getElementById('productCategory'),selected=s.value,all=[...new Set([...fixedCategories,...state.customCategories])];s.innerHTML='<option value="">Selecciona una categoría</option>'+all.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')+'<option value="__other__">+ Agregar otra categoría</option>';if(all.includes(selected))s.value=selected; }
function toggleCustomCategory(){ const s=document.getElementById('productCategory'),w=document.getElementById('customCategoryWrap'),i=document.getElementById('customCategory'),other=s.value==='__other__';w.classList.toggle('visible',other);i.required=other;if(!other)i.value=''; }
function refreshRecipeMaterialSelect(){ const s=document.getElementById('recipeMaterial'),available=sortedMaterials(state.materials.filter(m=>!draftRecipe.some(r=>r.materialId===m.id)));s.innerHTML=available.length?'<option value="">Selecciona un material</option>'+available.map(m=>`<option value="${m.id}">${escapeHtml(m.name)} · ${COP.format(materialUnitCost(m))}/${escapeHtml(m.unit)}</option>`).join(''):'<option value="">No hay materiales disponibles</option>'; }
function currentDraftMaterialsCost(){ return draftRecipe.reduce((sum,i)=>{const m=getMaterial(i.materialId);return sum+(m?materialUnitCost(m)*num(i.quantity):0)},0); }
function renderDraftRecipe(){
  const list=document.getElementById('recipeList'),empty=document.getElementById('recipeEmpty');list.innerHTML='';empty.style.display=draftRecipe.length?'none':'block';
  draftRecipe.forEach(i=>{const m=getMaterial(i.materialId);if(!m)return;const row=document.createElement('div');row.className='recipe-line';row.innerHTML=`<div><strong>${escapeHtml(m.name)}</strong><br><small>${formatQty(i.quantity)} ${escapeHtml(m.unit)} × ${COP.format(materialUnitCost(m))}</small></div><strong class="recipe-cost">${COP.format(materialUnitCost(m)*num(i.quantity))}</strong><button type="button" class="icon-btn" data-remove-recipe="${i.materialId}">×</button>`;list.appendChild(row)});
  document.getElementById('recipeMaterialsCost').textContent=COP.format(currentDraftMaterialsCost());refreshRecipeMaterialSelect();updateProductCostPreview();
}
function updateProductCostPreview(){ const materials=currentDraftMaterialsCost(),labor=num(document.getElementById('laborCost').value),extra=num(document.getElementById('extraCost').value),margin=num(document.getElementById('targetMargin').value),price=num(document.getElementById('productPrice').value),cost=materials+labor+extra,suggested=margin>=100?0:cost/(1-margin/100),profit=price-cost,actual=price?profit/price*100:0;document.getElementById('productRealCost').textContent=COP.format(cost);document.getElementById('suggestedPrice').textContent=COP.format(Math.ceil(suggested/100)*100);document.getElementById('liveProfit').textContent=`Ganancia estimada: ${COP.format(profit)} · Margen: ${actual.toFixed(1)}%`; }

function movementKindLabel(kind){const map={purchase:'Compra',sale:'Venta',loss:'Pérdida / desperdicio',damage:'Daño',internal:'Uso interno',correction_plus:'Corrección positiva',correction_minus:'Corrección negativa',manual_in:'Entrada manual',sale_reversal:'Reversión de venta',purchase_reversal:'Reversión de compra'};return map[kind]||kind||'Ajuste'}
function movementDeltaFor(kind,qty){return ['correction_plus','manual_in','sale_reversal','purchase'].includes(kind)?Math.abs(num(qty)):-Math.abs(num(qty))}
function recordInventoryMovement({materialId,kind,quantity,date=todayISO(),note='',sourceType='adjustment',sourceId=null,unitCost=null}){const m=getMaterial(materialId);if(!m)return null;const delta=movementDeltaFor(kind,quantity),movement={id:crypto.randomUUID(),materialId:m.id,materialName:m.name,unit:m.unit,date,kind,delta,unitCost:unitCost===null?materialUnitCost(m):num(unitCost),note,sourceType,sourceId,stockAfter:num(m.available)};state.inventoryMovements.push(movement);return movement}
function migrateInventoryData(){let changed=false;if(!Array.isArray(state.suppliers)){state.suppliers=[];changed=true}if(!Array.isArray(state.inventoryMovements)){state.inventoryMovements=[];changed=true}state.materials.forEach(m=>{if(!Number.isFinite(Number(m.minimumStock))){m.minimumStock=0;changed=true}if(!('preferredSupplierId' in m)){m.preferredSupplierId=null;changed=true}});state.purchases.forEach(x=>{if(!('supplierId' in x)){x.supplierId=null;changed=true}});if(!state.inventoryMovements.length&&(state.purchases.length||state.sales.length)){state.purchases.forEach(x=>{const m=getMaterial(x.materialId);if(m)state.inventoryMovements.push({id:crypto.randomUUID(),materialId:m.id,materialName:m.name,unit:m.unit,date:x.date||todayISO(),kind:'purchase',delta:num(x.quantity),unitCost:num(x.quantity)?num(x.cost)/num(x.quantity):materialUnitCost(m),note:x.note||'Compra',sourceType:'purchase',sourceId:x.id,stockAfter:null})});state.sales.forEach(s=>(s.consumption||[]).forEach(u=>{const m=getMaterial(u.materialId);state.inventoryMovements.push({id:crypto.randomUUID(),materialId:u.materialId,materialName:u.materialName||m?.name||'Material',unit:u.unit||m?.unit||'',date:s.date||todayISO(),kind:'sale',delta:-Math.abs(num(u.quantity)),unitCost:num(u.unitCost)||materialUnitCost(m),note:`Venta: ${s.productName||'Producto'}`,sourceType:'sale',sourceId:s.id,stockAfter:null})}));changed=true}return changed}
function refreshSupplierSelects(){const options='<option value="">Sin proveedor</option>'+state.suppliers.map(x=>`<option value="${x.id}">${escapeHtml(x.name)}</option>`).join('');['materialPreferredSupplier','purchaseSupplier'].forEach(id=>{const el=document.getElementById(id);if(!el)return;const current=el.value;el.innerHTML=options;if(current&&state.suppliers.some(x=>x.id===current))el.value=current});}
function refreshInventoryMaterialSelects(){const materials=sortedMaterials(),options='<option value="">Todos</option>'+materials.map(m=>`<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('');const filter=document.getElementById('inventoryMovementMaterial');if(filter){const v=filter.value;filter.innerHTML=options;if(v)filter.value=v}const adj=document.getElementById('inventoryAdjustmentMaterial');if(adj){const v=adj.value;adj.innerHTML='<option value="">Selecciona un material</option>'+materials.map(m=>`<option value="${m.id}">${escapeHtml(m.name)} · ${formatQty(m.available)} ${escapeHtml(m.unit)}</option>`).join('');if(v)adj.value=v}}
function renderSuppliers(){const tbody=document.getElementById('suppliersTable'),empty=document.getElementById('suppliersEmpty');if(!tbody)return;tbody.innerHTML='';empty.style.display=state.suppliers.length?'none':'block';state.suppliers.forEach(x=>{const mats=state.materials.filter(m=>m.preferredSupplierId===x.id);const tr=document.createElement('tr');tr.innerHTML=`<td><strong>${escapeHtml(x.name)}</strong><br><small>${escapeHtml(x.city||'')}</small></td><td>${escapeHtml(x.contactName||'—')}<br><small>${escapeHtml(x.phone||'')}</small></td><td><div class="supplier-material-chips">${mats.length?mats.slice(0,5).map(m=>`<span class="supplier-material-chip">${escapeHtml(m.name)}</span>`).join(''):'—'}</div></td><td>${actionButtons('supplier',x.id)}</td>`;tbody.appendChild(tr)})}
function sizeInventoryMovementScroll(){const wrap=document.getElementById('inventoryMovementsScroll'),tbody=document.getElementById('inventoryMovementsTable');if(!wrap||!tbody)return;const rows=[...tbody.querySelectorAll('tr')];wrap.classList.toggle('has-vertical-scroll',rows.length>10);if(rows.length<=10){wrap.style.maxHeight='';return}const head=wrap.querySelector('thead');let desired=head?head.getBoundingClientRect().height:0;rows.slice(0,10).forEach(row=>desired+=row.getBoundingClientRect().height);if(desired<=2)return;const mobileCap=window.innerWidth<=760?Math.max(360,Math.floor(window.innerHeight*.68)):desired;wrap.style.maxHeight=`${Math.ceil(Math.min(desired,mobileCap))+2}px`;wrap.scrollTop=0}
function sizeInventoryReorderScroll(){const list=document.getElementById('inventoryReorderList');if(!list)return;const items=[...list.querySelectorAll('.reorder-item')];list.classList.toggle('has-vertical-scroll',items.length>5);if(items.length<=5){list.style.maxHeight='';list.scrollTop=0;return}const styles=getComputedStyle(list),gap=parseFloat(styles.rowGap||styles.gap)||10;let desired=0;items.slice(0,5).forEach((item,index)=>{desired+=item.getBoundingClientRect().height;if(index<4)desired+=gap});if(desired<=2)return;const mobileCap=window.innerWidth<=760?Math.max(300,Math.floor(window.innerHeight*.55)):desired;list.style.maxHeight=`${Math.ceil(Math.min(desired,mobileCap))+2}px`;list.scrollTop=0}
function renderInventory(){const total=state.materials.reduce((sum,m)=>sum+num(m.available)*materialUnitCost(m),0),low=state.materials.filter(m=>num(m.available)>0&&num(m.minimumStock)>0&&num(m.available)<=num(m.minimumStock)).length,out=state.materials.filter(m=>num(m.available)<=0).length;document.getElementById('inventoryTotalValue')&&(document.getElementById('inventoryTotalValue').textContent=COP.format(total));document.getElementById('inventoryMaterialCount')&&(document.getElementById('inventoryMaterialCount').textContent=state.materials.length);document.getElementById('inventoryLowCount')&&(document.getElementById('inventoryLowCount').textContent=low);document.getElementById('inventoryOutCount')&&(document.getElementById('inventoryOutCount').textContent=out);refreshInventoryMaterialSelects();const mat=document.getElementById('inventoryMovementMaterial')?.value||'',type=document.getElementById('inventoryMovementType')?.value||'',from=document.getElementById('inventoryMovementFrom')?.value||'',to=document.getElementById('inventoryMovementTo')?.value||'';const rows=state.inventoryMovements.filter(x=>(!mat||x.materialId===mat)&&(!type||movementKindLabel(x.kind)===type)&&inRange(x.date,from,to)).sort((a,b)=>(b.date||'').localeCompare(a.date||''));const tbody=document.getElementById('inventoryMovementsTable'),empty=document.getElementById('inventoryMovementsEmpty');if(tbody){tbody.innerHTML='';empty.style.display=rows.length?'none':'block';rows.forEach(x=>{const tr=document.createElement('tr'),positive=num(x.delta)>0;tr.innerHTML=`<td>${niceDate(x.date)}</td><td><strong>${escapeHtml(x.materialName||getMaterial(x.materialId)?.name||'Material')}</strong></td><td>${escapeHtml(movementKindLabel(x.kind))}</td><td class="${positive?'movement-in':'movement-out'}">${positive?'+':''}${formatQty(x.delta)} ${escapeHtml(x.unit||getMaterial(x.materialId)?.unit||'')}</td><td>${x.stockAfter===null||x.stockAfter===undefined?'—':formatQty(x.stockAfter)}</td><td>${COP.format(Math.abs(num(x.delta))*num(x.unitCost))}</td><td>${escapeHtml(x.note||'—')}</td>`;tbody.appendChild(tr)});sizeInventoryMovementScroll()}renderSuppliers();const reorder=document.getElementById('inventoryReorderList');if(reorder){const items=state.materials.filter(m=>num(m.available)<=0||(num(m.minimumStock)>0&&num(m.available)<=num(m.minimumStock))).sort((a,b)=>num(a.available)-num(b.available));reorder.innerHTML=items.length?items.map(m=>{const s=getSupplier(m.preferredSupplierId);return `<div class="reorder-item"><div><strong>${escapeHtml(m.name)}</strong><small>${s?`Proveedor: ${escapeHtml(s.name)}${s.phone?` · ${escapeHtml(s.phone)}`:''}`:'Sin proveedor preferido'}</small></div><div class="reorder-qty ${num(m.available)<=0?'critical':'warning'}">${formatQty(m.available)} / mín. ${formatQty(m.minimumStock)} ${escapeHtml(m.unit)}</div></div>`}).join(''):'<div class="empty-state small"><p>No hay materiales pendientes de reposición.</p></div>';requestAnimationFrame(sizeInventoryReorderScroll)}}
function resetSupplierModal(){editing.supplier=null;const f=document.getElementById('supplierForm');f?.reset();document.getElementById('supplierModalTitle').textContent='Nuevo proveedor';document.getElementById('supplierSubmitBtn').textContent='Guardar proveedor'}
function openSupplierEdit(id){const x=getSupplier(id);if(!x)return;editing.supplier=id;const f=document.getElementById('supplierForm');f.elements.name.value=x.name;f.elements.contactName.value=x.contactName||'';f.elements.phone.value=x.phone||'';f.elements.city.value=x.city||'';f.elements.notes.value=x.notes||'';document.getElementById('supplierModalTitle').textContent='Editar proveedor';document.getElementById('supplierSubmitBtn').textContent='Guardar cambios';openModal('supplierModal')}
function syncInventoryAdjustmentReasonOptions(){
  const f=document.getElementById('inventoryAdjustmentForm');if(!f)return;
  const action=f.elements.action?.value||'subtract',kind=f.elements.kind,current=kind?.value||'';if(!kind)return;
  const options=action==='add'
    ? [['correction_plus','Corrección positiva'],['manual_in','Entrada manual']]
    : [['loss','Pérdida / desperdicio'],['damage','Daño'],['internal','Uso interno'],['correction_minus','Corrección negativa']];
  kind.innerHTML=options.map(([value,label])=>`<option value="${value}">${label}</option>`).join('');
  if(options.some(([value])=>value===current))kind.value=current;
}
function resetInventoryAdjustmentModal(){const f=document.getElementById('inventoryAdjustmentForm');f?.reset();if(f){f.elements.date.value=todayISO();if(f.elements.action)f.elements.action.value='subtract'}refreshInventoryMaterialSelects();syncInventoryAdjustmentReasonOptions();updateInventoryAdjustmentPreview()}
function updateInventoryAdjustmentPreview(){const f=document.getElementById('inventoryAdjustmentForm'),box=document.getElementById('inventoryAdjustmentPreview');if(!f||!box)return;const m=getMaterial(f.elements.materialId.value),q=Math.abs(num(f.elements.quantity.value)),action=f.elements.action?.value||'subtract';if(!m){box.textContent='Selecciona un material para ver el resultado del ajuste.';return}const delta=action==='add'?q:-q,after=num(m.available)+delta,verb=action==='add'?'Se sumarán':'Se restarán';box.innerHTML=`Existencia actual: <strong>${formatQty(m.available)} ${escapeHtml(m.unit)}</strong> · ${verb}: <strong>${formatQty(q)} ${escapeHtml(m.unit)}</strong> · Después: <strong>${formatQty(after)} ${escapeHtml(m.unit)}</strong>`}

function normalizeMaterialSearch(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es-CO').trim()}
function sortedMaterials(list=state.materials){return [...list].sort((a,b)=>String(a?.name||'').localeCompare(String(b?.name||''),'es',{sensitivity:'base',numeric:true}))}
function renderMaterials(){
  const tbody=document.getElementById('materialsTable'),empty=document.getElementById('materialsEmpty'),limited=!isBusinessAdmin(),search=document.getElementById('materialsSearch'),count=document.getElementById('materialsSearchCount');
  if(!tbody||!empty)return;
  const query=normalizeMaterialSearch(search?.value),rows=sortedMaterials(state.materials).filter(m=>!query||normalizeMaterialSearch(m.name).includes(query));
  tbody.innerHTML='';
  if(count)count.textContent=query?`${rows.length} de ${state.materials.length} materiales`:`${state.materials.length} ${state.materials.length===1?'material':'materiales'}`;
  if(!state.materials.length){empty.innerHTML='<p>No has registrado materiales todavía.</p>';empty.style.display='block'}
  else if(!rows.length){empty.innerHTML='<p>No se encontraron materiales con esa búsqueda.</p>';empty.style.display='block'}
  else empty.style.display='none';
  rows.forEach(m=>{const base=Math.max(num(m.totalPurchased),num(m.quantity),1),ratio=num(m.available)/base,min=num(m.minimumStock);let status='Disponible',cls='stock-ok';if(num(m.available)<=0){status='Agotado';cls='stock-out'}else if((min>0&&num(m.available)<=min)||(min<=0&&ratio<=.2)){status='Stock bajo';cls='stock-low'}const tr=document.createElement('tr');tr.innerHTML=`<td><strong>${escapeHtml(m.name)}</strong></td><td>${escapeHtml(m.unit)}</td><td>${limited?'Restringido':COP.format(materialUnitCost(m))}</td><td>${formatQty(m.available)} ${escapeHtml(m.unit)}</td><td>${limited?'—':`${formatQty(min)} ${escapeHtml(m.unit)}`}</td><td>${limited?'Restringido':COP.format(num(m.available)*materialUnitCost(m))}</td><td class="${cls}">${status}</td><td>${actionButtons('material',m.id)}</td>`;tbody.appendChild(tr)});
}
function refreshPurchaseMaterials(selected=''){ const s=document.getElementById('purchaseMaterial'),materials=sortedMaterials();s.innerHTML=materials.length?'<option value="">Selecciona un material</option>'+materials.map(m=>`<option value="${m.id}">${escapeHtml(m.name)} — disponible: ${formatQty(m.available)} ${escapeHtml(m.unit)}</option>`).join(''):'<option value="">No hay materiales</option>';if(selected)s.value=selected; }
function updatePurchasePreview(){ const f=document.getElementById('purchaseForm'),q=num(f.elements.quantity.value),cost=num(f.elements.cost.value),m=getMaterial(f.elements.materialId.value),box=document.getElementById('purchasePreview');if(q<=0){box.textContent='Completa cantidad y costo para ver el costo unitario de esta compra.';return}const unit=cost/q;if(!m){box.innerHTML=`Costo de esta compra: <strong>${COP.format(unit)}</strong> por unidad de medida.`;return}box.innerHTML=`Costo de compra: <strong>${COP.format(unit)}</strong>/${escapeHtml(m.unit)} · Disponible actualmente: <strong>${formatQty(m.available)} ${escapeHtml(m.unit)}</strong>`; }
function renderPurchases(){ const rows=filterItems(state.purchases,'purchases'),tbody=document.getElementById('purchasesTable'),empty=document.getElementById('purchasesEmpty');tbody.innerHTML='';empty.style.display=rows.length?'none':'block';[...rows].reverse().forEach(x=>{const m=getMaterial(x.materialId),supplier=getSupplier(x.supplierId),tr=document.createElement('tr');const detail=[supplier?.name,x.note].filter(Boolean).join(' · ')||'—';tr.innerHTML=`<td>${niceDate(x.date)}</td><td>${m?escapeHtml(m.name):escapeHtml(x.materialName||'Material eliminado')}</td><td>${formatQty(x.quantity)} ${escapeHtml(x.unit||m?.unit||'')}</td><td>${COP.format(x.cost)}</td><td><span class="payment-method-pill">${escapeHtml(x.paymentMethod||'Otro')}</span></td><td>${COP.format(num(x.quantity)?num(x.cost)/num(x.quantity):0)}</td><td>${escapeHtml(detail)}</td><td>${actionButtons('purchase',x.id)}</td>`;tbody.appendChild(tr)}); }
function renderProducts(){ const list=document.getElementById('productsList'),empty=document.getElementById('productsEmpty'),limited=!isBusinessAdmin();list.innerHTML='';empty.style.display=state.products.length?'none':'block';state.products.forEach(p=>{const cost=calculateProductCost(p),profit=num(p.price)-cost,margin=num(p.price)?profit/num(p.price)*100:0,chips=limited?'':(normalizedRecipe(p).length?normalizedRecipe(p).map(i=>{const m=getMaterial(i.materialId);return m?`<span class="recipe-chip">${escapeHtml(m.name)}: ${formatQty(i.quantity)} ${escapeHtml(m.unit)}</span>`:''}).join(''):'<span class="recipe-chip">Costo manual de versión anterior</span>'),card=document.createElement('article');card.className='product-card';card.innerHTML=limited?`<div class="product-card-head"><div><h4>${escapeHtml(p.name)}</h4><p>${escapeHtml(p.category)}</p></div>${actionButtons('product',p.id)}</div><div class="product-meta"><div><span>Precio de venta</span><strong>${COP.format(p.price)}</strong></div><div><span>Detalle de costos</span><strong>Restringido</strong></div></div>`:`<div class="product-card-head"><div><h4>${escapeHtml(p.name)}</h4><p>${escapeHtml(p.category)}</p></div>${actionButtons('product',p.id)}</div><div class="product-meta"><div><span>Costo real</span><strong>${COP.format(cost)}</strong></div><div><span>Venta</span><strong>${COP.format(p.price)}</strong></div><div><span>Ganancia</span><strong class="profit">${COP.format(profit)}</strong></div><div><span>Margen</span><strong>${margin.toFixed(1)}%</strong></div></div><div class="recipe-chips">${chips}</div>`;list.appendChild(card)});refreshSaleProducts(); }
function renderSales(){ const rows=filterItems(state.sales,'sales'),tbody=document.getElementById('salesTable'),empty=document.getElementById('salesEmpty'),limited=!isBusinessAdmin();tbody.innerHTML='';empty.style.display=rows.length?'none':'block';[...rows].reverse().forEach(s=>{const items=normalizedSaleItems(s),units=items.length?items.reduce((sum,i)=>sum+num(i.quantity),0):num(s.quantity),tr=document.createElement('tr');tr.innerHTML=`<td>${niceDate(s.date)}</td><td>${items.length?saleItemsHtml(s):escapeHtml(s.productName||'Producto eliminado')}${s.orderId?'<br><small>Pedido convertido</small>':''}</td><td>${formatQty(units)}</td><td>${COP.format(s.total)}</td><td><span class="payment-method-pill">${escapeHtml(s.paymentMethod||paymentForSale(s.id)?.method||'Otro')}</span></td><td>${limited?'Restringido':COP.format(s.cost)}</td><td class="profit">${limited?'Restringido':COP.format(num(s.total)-num(s.cost))}</td><td>${saleActions(s)}</td>`;tbody.appendChild(tr)}); }
function renderExpenses(){ const rows=filterItems(state.expenses,'expenses'),tbody=document.getElementById('expensesTable'),empty=document.getElementById('expensesEmpty');tbody.innerHTML='';empty.style.display=rows.length?'none':'block';[...rows].reverse().forEach(x=>{const tr=document.createElement('tr');tr.innerHTML=`<td>${niceDate(x.date)}</td><td><span class="category-pill">${escapeHtml(x.category)}</span></td><td>${escapeHtml(x.description)}</td><td class="expense-amount">${COP.format(x.amount)}</td><td><span class="payment-method-pill">${escapeHtml(x.paymentMethod||'Otro')}</span></td><td>${actionButtons('expense',x.id)}</td>`;tbody.appendChild(tr)}); }

function refreshOrderCustomers(selected=''){ const s=document.getElementById('orderCustomer');if(!s)return;s.innerHTML=state.customers.length?'<option value="">Selecciona un cliente</option>'+state.customers.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}${c.phone?' · '+escapeHtml(c.phone):''}</option>`).join(''):'<option value="">No hay clientes</option>';if(selected)s.value=selected; }
function refreshOrderProducts(selected=''){ const s=document.getElementById('orderProduct');if(!s)return;const products=[...state.products].sort((a,b)=>(a.name||'').localeCompare(b.name||'','es',{sensitivity:'base'}));s.innerHTML=products.length?'<option value="">Selecciona un producto</option>'+products.map(p=>`<option value="${p.id}">${escapeHtml(p.name)} — ${COP.format(p.price)}</option>`).join(''):'<option value="">No hay productos</option>';if(selected)s.value=selected; }
function renderCustomers(){ const tbody=document.getElementById('customersTable'),empty=document.getElementById('customersEmpty');if(!tbody)return;tbody.innerHTML='';empty.style.display=state.customers.length?'none':'block';state.customers.forEach(c=>{const count=state.orders.filter(o=>o.customerId===c.id).length,tr=document.createElement('tr');tr.innerHTML=`<td><strong>${escapeHtml(c.name)}</strong></td><td>${escapeHtml(c.phone||'—')}</td><td>${escapeHtml(c.location||'—')}</td><td>${escapeHtml(c.notes||'—')}</td><td>${count}</td><td>${actionButtons('customer',c.id)}</td>`;tbody.appendChild(tr)});refreshOrderCustomers(); }
function filteredOrders(){ const from=document.getElementById('ordersFrom')?.value||'',to=document.getElementById('ordersTo')?.value||'',status=document.getElementById('ordersStatus')?.value||'';return state.orders.filter(o=>inRange(o.deliveryDate,from,to)&&(!status||o.status===status)); }
function statusClass(status){ return {'Pendiente':'status-pending','En elaboración':'status-making','Listo':'status-ready','Entregado':'status-delivered','Cancelado':'status-cancelled'}[status]||''; }
function renderOrders(){ const rows=filteredOrders(),tbody=document.getElementById('ordersTable'),empty=document.getElementById('ordersEmpty');if(!tbody)return;tbody.innerHTML='';empty.style.display=rows.length?'none':'block';let total=0,balance=0;[...rows].sort((a,b)=>(a.deliveryDate||'').localeCompare(b.deliveryDate||'')).forEach(o=>{syncOrderLegacyFields(o);const c=getCustomer(o.customerId),items=normalizedOrderItems(o),units=items.reduce((sum,i)=>sum+num(i.quantity),0),paid=paidAmountForOrder(o),saldo=orderBalance(o);o.deposit=paid;if(!['Entregado','Cancelado'].includes(o.status))total+=num(o.total);if(o.status!=='Cancelado')balance+=saldo;const tr=document.createElement('tr');tr.innerHTML=`<td>${niceDate(o.deliveryDate)}</td><td><strong>${escapeHtml(c?.name||o.customerName||'Cliente eliminado')}</strong><br><small>${escapeHtml(c?.phone||o.customerPhone||'')}</small></td><td>${orderProductsHtml(o)}</td><td>${formatQty(units)}</td><td>${COP.format(o.total)}</td><td>${COP.format(paid)}</td><td class="${saldo>0?'expense-amount':'profit'}">${COP.format(saldo)}</td><td><span class="status-pill ${statusClass(o.status)}">${escapeHtml(o.status)}</span></td><td>${orderActions(o)}</td>`;tbody.appendChild(tr)});document.getElementById('ordersCount').textContent=rows.length;document.getElementById('ordersTotal').textContent=COP.format(total);document.getElementById('ordersBalance').textContent=COP.format(balance);refreshOrderProducts();refreshOrderCustomers(); }
function renderDraftOrderItems(recalculateTotal=true){const list=document.getElementById('orderItemsList'),empty=document.getElementById('orderItemsEmpty'),subtotal=document.getElementById('orderItemsSubtotal');if(!list)return;list.innerHTML='';empty.style.display=draftOrderItems.length?'none':'block';draftOrderItems.forEach(item=>{const p=getProduct(item.productId),row=document.createElement('div');row.className='order-item-line';row.innerHTML=`<div><strong>${escapeHtml(p?.name||item.productName||'Producto')}</strong><small>${COP.format(p?.price||0)} por unidad</small></div><label>Cantidad<input type="number" min="1" step="1" value="${Math.max(1,Math.round(num(item.quantity)||1))}" data-order-item-qty="${item.id}"></label><span class="order-line-total">${COP.format(num(p?.price)*num(item.quantity))}</span><button type="button" class="icon-btn" data-remove-order-item="${item.id}" aria-label="Quitar producto">×</button>`;list.appendChild(row)});const value=orderItemsSubtotal(draftOrderItems);subtotal.textContent=COP.format(value);refreshOrderProducts();if(recalculateTotal){const f=document.getElementById('orderForm');if(f)f.elements.total.value=Math.round(value)}updateOrderMoneyPreview(false)}
function updateOrderMoneyPreview(autoPrice=false){ const f=document.getElementById('orderForm');if(!f)return;if(autoPrice)f.elements.total.value=Math.round(orderItemsSubtotal(draftOrderItems));const total=num(f.elements.total.value),paid=editing.order?paidAmountForOrder(editing.order):num(f.elements.deposit.value),balance=Math.max(0,total-paid),box=document.getElementById('orderMoneyPreview');box.innerHTML=`Total acordado: <strong>${COP.format(total)}</strong> · Pagado: <strong>${COP.format(paid)}</strong> · Saldo pendiente: <strong>${COP.format(balance)}</strong>`; }
function resetCustomerModal(){ editing.customer=null;const f=document.getElementById('customerForm');f.reset();document.getElementById('customerModalTitle').textContent='Nuevo cliente';document.getElementById('customerSubmitBtn').textContent='Guardar cliente'; }
function openCustomerEdit(id){ const c=getCustomer(id);if(!c)return;editing.customer=id;const f=document.getElementById('customerForm');f.elements.name.value=c.name||'';f.elements.phone.value=c.phone||'';f.elements.location.value=c.location||'';f.elements.notes.value=c.notes||'';document.getElementById('customerModalTitle').textContent='Editar cliente';document.getElementById('customerSubmitBtn').textContent='Guardar cambios';openModal('customerModal'); }
function resetOrderModal(){ editing.order=null;draftOrderItems=[];const f=document.getElementById('orderForm');f.reset();refreshOrderCustomers();refreshOrderProducts();document.getElementById('orderItemQuantity').value=1;f.elements.orderDate.value=todayISO();f.elements.deliveryDate.value=todayISO();f.elements.deposit.value=0;f.elements.deposit.disabled=false;f.elements.depositMethod.disabled=false;f.elements.depositMethod.value='Efectivo';f.elements.depositMethod.title='';document.getElementById('orderDepositMethodWrap').hidden=false;f.elements.status.value='Pendiente';document.getElementById('orderModalTitle').textContent='Nuevo pedido';document.getElementById('orderSubmitBtn').textContent='Guardar pedido';renderDraftOrderItems(false);updateOrderMoneyPreview(); }
function openOrderEdit(id){ const o=getOrder(id);if(!o)return;if(o.saleId){alert('Este pedido ya fue convertido en venta. Revierte primero la venta si necesitas modificarlo.');return}editing.order=id;draftOrderItems=normalizedOrderItems(o).map(i=>({...i}));const f=document.getElementById('orderForm'),initialPayment=initialPaymentForOrder(o.id);refreshOrderCustomers(o.customerId);refreshOrderProducts();document.getElementById('orderItemQuantity').value=1;f.elements.orderDate.value=o.orderDate||todayISO();f.elements.deliveryDate.value=o.deliveryDate||todayISO();f.elements.total.value=o.total;f.elements.deposit.value=paidAmountForOrder(o);f.elements.deposit.disabled=true;document.getElementById('orderDepositMethodWrap').hidden=false;f.elements.depositMethod.disabled=!initialPayment;f.elements.depositMethod.value=initialPayment?.method||'Otro';f.elements.depositMethod.title=initialPayment?'Puedes corregir el método usado para el anticipo inicial.':'Este pedido no tiene un anticipo registrado.';f.elements.status.value=o.status||'Pendiente';f.elements.notes.value=o.notes||'';document.getElementById('orderModalTitle').textContent='Editar pedido';document.getElementById('orderSubmitBtn').textContent='Guardar cambios';renderDraftOrderItems(false);f.elements.total.value=o.total;updateOrderMoneyPreview(false);openModal('orderModal'); }

function renderDashboard(){ const from=document.getElementById('dashboardFrom').value,to=document.getElementById('dashboardTo').value,sales=state.sales.filter(x=>inRange(x.date,from,to)),expenses=state.expenses.filter(x=>inRange(x.date,from,to)),purchases=state.purchases.filter(x=>inRange(x.date,from,to));const totalSales=sales.reduce((s,x)=>s+num(x.total),0),totalCosts=sales.reduce((s,x)=>s+num(x.cost),0),totalExpenses=expenses.reduce((s,x)=>s+num(x.amount),0),totalPurchases=purchases.reduce((s,x)=>s+num(x.cost),0),units=sales.reduce((s,x)=>s+num(x.quantity),0),gross=totalSales-totalCosts,net=gross-totalExpenses,periodPayments=state.payments.filter(x=>inRange(x.date,from,to)),cashIn=periodPayments.filter(x=>num(x.amount)>0).reduce((sum,x)=>sum+num(x.amount),0),refundsOut=periodPayments.filter(x=>num(x.amount)<0).reduce((sum,x)=>sum+Math.abs(num(x.amount)),0),cashOut=totalPurchases+totalExpenses+refundsOut,cashBalance=cashIn-cashOut;document.getElementById('statSales').textContent=COP.format(totalSales);document.getElementById('statCosts').textContent=COP.format(totalCosts);document.getElementById('statExpenses').textContent=COP.format(totalExpenses);document.getElementById('statProfit').textContent=COP.format(net);document.getElementById('statPurchases').textContent=COP.format(totalPurchases);document.getElementById('statUnits').textContent=formatQty(units);document.getElementById('cashIn').textContent=COP.format(cashIn);document.getElementById('cashOut').textContent=COP.format(cashOut);document.getElementById('cashBalance').textContent=COP.format(cashBalance);const low=state.materials.filter(m=>num(m.available)<=0||num(m.available)<=Math.max(num(m.totalPurchased),num(m.quantity),1)*.2).length,inventory=state.materials.reduce((s,m)=>s+num(m.available)*materialUnitCost(m),0),margin=totalSales?net/totalSales*100:0,period=from||to?`${from?nicer(from):'Inicio'} → ${to?nicer(to):'Hoy'}`:'Todo el historial';document.getElementById('dashboardSummary').innerHTML=`<div class="summary-row"><span>Periodo mostrado</span><strong>${escapeHtml(period)}</strong></div><div class="summary-row"><span>Materiales registrados</span><strong>${state.materials.length}</strong></div><div class="summary-row"><span>Productos creados</span><strong>${state.products.length}</strong></div><div class="summary-row"><span>Pedidos pendientes / en proceso</span><strong>${state.orders.filter(o=>['Pendiente','En elaboración','Listo'].includes(o.status)).length}</strong></div><div class="summary-row"><span>Saldo pendiente por cobrar</span><strong>${COP.format(state.orders.filter(o=>o.status!=='Cancelado').reduce((s,o)=>s+orderBalance(o),0))}</strong></div><div class="summary-row"><span>Stock bajo / agotado</span><strong>${low}</strong></div><div class="summary-row"><span>Valor estimado del inventario</span><strong>${COP.format(inventory)}</strong></div><div class="summary-row"><span>Ganancia bruta del periodo</span><strong>${COP.format(gross)}</strong></div><div class="summary-row"><span>Margen neto del periodo</span><strong>${margin.toFixed(1)}%</strong></div>`; }
function nicer(d){return d?niceDate(d):''}
function refreshSaleProducts(selected=''){ const s=document.getElementById('saleProduct');s.innerHTML=state.products.length?'<option value="">Selecciona un producto</option>'+state.products.map(p=>`<option value="${p.id}">${escapeHtml(p.name)} — ${COP.format(p.price)}</option>`).join(''):'<option value="">No hay productos</option>';if(selected)s.value=selected;updateSalePreview(); }
function updateSalePreview(){ const f=document.getElementById('saleForm'),p=getProduct(f.elements.productId.value),qty=Math.max(1,num(f.elements.quantity.value)||1),box=document.getElementById('salePreview');if(!p){box.innerHTML='Selecciona un producto para ver el cálculo de la venta.';return}const cost=calculateProductCost(p)*qty,total=num(p.price)*qty;box.innerHTML=`Total: <strong>${COP.format(total)}</strong> · Costo: <strong>${COP.format(cost)}</strong> · Ganancia bruta: <strong>${COP.format(total-cost)}</strong>`; }
function monthRange(baseDate){const d=baseDate?new Date(baseDate+'T12:00:00'):new Date(),y=d.getFullYear(),m=d.getMonth(),z=n=>String(n).padStart(2,'0'),last=new Date(y,m+1,0).getDate();return {from:`${y}-${z(m+1)}-01`,to:`${y}-${z(m+1)}-${z(last)}`,label:new Intl.DateTimeFormat('es-CO',{month:'long',year:'numeric'}).format(d)}}
function previousMonthRange(baseDate){const d=baseDate?new Date(baseDate+'T12:00:00'):new Date();d.setDate(1);d.setMonth(d.getMonth()-1);return monthRange(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`)}
function periodFinancials(from,to){const sales=state.sales.filter(x=>inRange(x.date,from,to)),expenses=state.expenses.filter(x=>inRange(x.date,from,to)),payments=state.payments.filter(x=>inRange(x.date,from,to));const revenue=sales.reduce((a,x)=>a+num(x.total),0),cost=sales.reduce((a,x)=>a+num(x.cost),0),expense=expenses.reduce((a,x)=>a+num(x.amount),0);return {sales,expenses,payments,revenue,cost,gross:revenue-cost,expense,net:revenue-cost-expense,collected:payments.reduce((a,x)=>a+num(x.amount),0)}}
function renderPaymentMethodBars(payments){const el=document.getElementById('paymentMethodBars');if(!el)return;const totals=new Map();payments.forEach(p=>totals.set(p.method||'Otro',(totals.get(p.method||'Otro')||0)+num(p.amount)));const rows=[...totals.entries()].sort((a,b)=>b[1]-a[1]),max=Math.max(1,...rows.map(x=>x[1]));el.innerHTML=rows.length?rows.map(([name,value])=>`<div class="payment-bar-row"><span>${escapeHtml(name)}</span><div class="payment-bar-track"><div class="payment-bar-fill" style="width:${Math.max(2,value/max*100)}%"></div></div><strong>${COP.format(value)}</strong></div>`).join(''):'<div class="empty-state small"><p>No hay pagos en este periodo.</p></div>'}
function renderMonthComparison(referenceDate){const cur=monthRange(referenceDate),prev=previousMonthRange(referenceDate),x=periodFinancials(cur.from,cur.to),y=periodFinancials(prev.from,prev.to),el=document.getElementById('monthComparison');if(!el)return;const metrics=[['Ventas',x.revenue,y.revenue,true],['Dinero cobrado',x.collected,y.collected,true],['Gastos',x.expense,y.expense,false],['Ganancia neta',x.net,y.net,true]],delta=(v,p)=>p?((v-p)/Math.abs(p))*100:(v?100:0);el.innerHTML=`<div class="comparison-row"><strong>Métrica</strong><strong>${escapeHtml(cur.label)}</strong><strong>${escapeHtml(prev.label)}</strong><strong>Variación</strong></div>`+metrics.map(([n,v,p,higherIsBetter])=>{const d=delta(v,p),good=higherIsBetter?d>=0:d<=0;return `<div class="comparison-row"><span>${n}</span><strong>${COP.format(v)}</strong><strong>${COP.format(p)}</strong><span class="comparison-delta ${good?'up':'down'}">${d>=0?'+':''}${d.toFixed(1)}%</span></div>`}).join('')}
function renderReportMaterials(sales){const map=new Map();sales.forEach(s=>(s.consumption||[]).forEach(u=>{const key=u.materialId||u.materialName||'material',r=map.get(key)||{name:u.materialName||getMaterial(u.materialId)?.name||'Material',unit:u.unit||getMaterial(u.materialId)?.unit||'',qty:0,cost:0};r.qty+=num(u.quantity);r.cost+=num(u.quantity)*num(u.unitCost||materialUnitCost(getMaterial(u.materialId)));map.set(key,r)}));const rows=[...map.values()].sort((x,y)=>y.cost-x.cost),tb=document.getElementById('reportMaterialsTable'),empty=document.getElementById('reportMaterialsEmpty');if(!tb)return;tb.innerHTML='';empty.style.display=rows.length?'none':'block';rows.forEach(r=>{const tr=document.createElement('tr');tr.innerHTML=`<td><strong>${escapeHtml(r.name)}</strong></td><td>${formatQty(r.qty)} ${escapeHtml(r.unit)}</td><td>${COP.format(r.cost)}</td>`;tb.appendChild(tr)})}
function renderReceivables(){const rows=state.orders.filter(o=>o.status!=='Cancelado'&&orderBalance(o)>0).sort((x,y)=>(x.deliveryDate||'').localeCompare(y.deliveryDate||'')),tb=document.getElementById('receivablesTable'),empty=document.getElementById('receivablesEmpty');if(!tb)return;tb.innerHTML='';empty.style.display=rows.length?'none':'block';rows.forEach(o=>{const overdue=(o.deliveryDate||'')<todayISO(),tr=document.createElement('tr');tr.innerHTML=`<td><strong>${escapeHtml(getCustomer(o.customerId)?.name||o.customerName||'Cliente')}</strong></td><td class="${overdue?'receivable-overdue':''}">${niceDate(o.deliveryDate)}</td><td>${COP.format(o.total)}</td><td>${COP.format(paidAmountForOrder(o))}</td><td class="expense-amount">${COP.format(orderBalance(o))}</td>`;tb.appendChild(tr)})}
function renderReports(){const from=document.getElementById('reportsFrom')?.value||'',to=document.getElementById('reportsTo')?.value||'',f=periodFinancials(from,to),margin=f.revenue?f.net/f.revenue*100:0;document.getElementById('reportSales').textContent=COP.format(f.revenue);document.getElementById('reportCosts').textContent=COP.format(f.cost);document.getElementById('reportGross').textContent=COP.format(f.gross);document.getElementById('reportNet').textContent=COP.format(f.net);document.getElementById('reportMargin').textContent=margin.toFixed(1)+'%';document.getElementById('reportCollected').textContent=COP.format(f.collected);document.getElementById('reportReceivable').textContent=COP.format(state.orders.filter(o=>o.status!=='Cancelado').reduce((sum,o)=>sum+orderBalance(o),0));const byProduct=new Map();f.sales.forEach(x=>{const items=normalizedSaleItems(x);if(items.length){items.forEach(i=>{const p=getProduct(i.productId),key=i.productId||i.productName||'sin-producto',row=byProduct.get(key)||{name:p?.name||i.productName||'Producto eliminado',units:0,sales:0,costs:0,category:p?.category||i.productCategory||'Sin categoría'};row.units+=num(i.quantity);row.sales+=num(i.unitPrice)*num(i.quantity);row.costs+=num(i.unitCost)*num(i.quantity);byProduct.set(key,row)})}else{const p=getProduct(x.productId),key=x.productId||x.productName||'sin-producto',row=byProduct.get(key)||{name:p?.name||x.productName||'Producto eliminado',units:0,sales:0,costs:0,category:p?.category||x.productCategory||'Sin categoría'};row.units+=num(x.quantity);row.sales+=num(x.total);row.costs+=num(x.cost);byProduct.set(key,row)}});const pt=document.getElementById('reportProductsTable'),pe=document.getElementById('reportProductsEmpty'),products=[...byProduct.values()].sort((x,y)=>(y.sales-y.costs)-(x.sales-x.costs));pt.innerHTML='';pe.style.display=products.length?'none':'block';products.forEach(r=>{const profit=r.sales-r.costs,m=r.sales?profit/r.sales*100:0,tr=document.createElement('tr');tr.innerHTML=`<td><strong>${escapeHtml(r.name)}</strong></td><td>${formatQty(r.units)}</td><td>${COP.format(r.sales)}</td><td>${COP.format(r.costs)}</td><td class="profit">${COP.format(profit)}</td><td>${m.toFixed(1)}%</td>`;pt.appendChild(tr)});const byCategory=new Map();products.forEach(r=>{const c=byCategory.get(r.category)||{name:r.category,units:0,sales:0,profit:0};c.units+=r.units;c.sales+=r.sales;c.profit+=r.sales-r.costs;byCategory.set(r.category,c)});const ct=document.getElementById('reportCategoriesTable'),ce=document.getElementById('reportCategoriesEmpty'),categories=[...byCategory.values()].sort((x,y)=>y.profit-x.profit);ct.innerHTML='';ce.style.display=categories.length?'none':'block';categories.forEach(r=>{const tr=document.createElement('tr');tr.innerHTML=`<td><strong>${escapeHtml(r.name)}</strong></td><td>${formatQty(r.units)}</td><td>${COP.format(r.sales)}</td><td class="profit">${COP.format(r.profit)}</td>`;ct.appendChild(tr)});renderPaymentMethodBars(f.payments);renderMonthComparison(to||todayISO());renderReportMaterials(f.sales);renderReceivables()}
function convertOrderToSale(id){
  const o=getOrder(id);if(!o)return;if(o.saleId){alert('Este pedido ya tiene una venta asociada.');return}if(o.status==='Cancelado'){alert('Un pedido cancelado no puede convertirse en venta.');return}
  const balance=orderBalance(o);if(balance>0){alert(`Este pedido todavía tiene ${COP.format(balance)} pendientes por cobrar. Registra primero uno o más abonos hasta completar el pago.`);return}
  const orderItems=normalizedOrderItems(o);if(!orderItems.length){alert('Este pedido no tiene productos.');return}const missingProducts=orderItems.filter(i=>!getProduct(i.productId));if(missingProducts.length){alert('Uno o más productos de este pedido ya no existen. Revisa el pedido antes de convertirlo.');return}
  // Cada línea conserva exactamente el nombre y la cantidad escritos en el pedido.
  // Los materiales se fotografían por producto en el momento de la conversión para mantener trazabilidad.
  const lineConsumptions=orderItems.map(i=>buildConsumption(getProduct(i.productId),i.quantity).map(u=>({...u}))),consumption=combineConsumptions(lineConsumptions),missing=canConsume(consumption);if(missing.length){alert('No hay material suficiente para completar este pedido:\n\n'+missing.join('\n'));return}
  const detail=orderItems.map((i,index)=>{const mats=lineConsumptions[index].map(u=>`${u.materialName||getMaterial(u.materialId)?.name||'Material'}: ${formatQty(u.quantity)} ${u.unit||getMaterial(u.materialId)?.unit||''}`).join(', ')||'Sin materiales';return `${i.productName||getProduct(i.productId)?.name||'Producto'} × ${formatQty(i.quantity)} — ${mats}`}).join('\n');
  if(!confirm(`¿Pasar este pedido a Venta por ${COP.format(o.total)}?\n\nSe registrará exactamente:\n${detail}\n\nLos materiales indicados serán descontados del inventario.`))return;
  const saleId=crypto.randomUUID(),saleDate=o.deliveryDate||todayISO(),listSubtotal=orderItemsSubtotal(orderItems),factor=listSubtotal>0?num(o.total)/listSubtotal:1,totalUnits=orderItems.reduce((s,x)=>s+num(x.quantity),0)||1;
  const saleItems=orderItems.map((i,index)=>{const p=getProduct(i.productId),itemConsumption=lineConsumptions[index].map(u=>({...u})),unitCost=calculateProductCost(p),unitPrice=listSubtotal>0?num(p.price)*factor:(num(o.total)/totalUnits);return{id:crypto.randomUUID(),productId:p.id,productName:i.productName||p.name,productCategory:p.category||'',quantity:num(i.quantity),unitPrice,unitCost,consumption:itemConsumption}});
  const cost=saleItems.reduce((sum,i)=>sum+num(i.unitCost)*num(i.quantity),0),units=saleItems.reduce((sum,i)=>sum+num(i.quantity),0),first=saleItems[0];
  // Descontar y registrar el inventario por línea de producto, no solo como un total agregado.
  saleItems.forEach(item=>{consume(item.consumption);item.consumption.forEach(u=>recordInventoryMovement({materialId:u.materialId,kind:'sale',quantity:u.quantity,date:saleDate,note:`Pedido → Venta: ${item.productName} × ${formatQty(item.quantity)}`,sourceType:'sale',sourceId:saleId,unitCost:u.unitCost}))});
  state.sales.push({id:saleId,orderId:o.id,customerId:o.customerId,customerName:o.customerName||'',productId:first.productId,productName:saleItems.length>1?`${first.productName} + ${saleItems.length-1} más`:first.productName,productCategory:first.productCategory||'',quantity:units,date:saleDate,unitPrice:units?num(o.total)/units:0,total:num(o.total),unitCost:units?cost/units:0,cost,paymentMethod:initialPaymentMethodForOrder(o.id),items:saleItems,consumption:combineConsumptions(saleItems.map(i=>i.consumption))});
  o.saleId=saleId;o.status='Entregado';o.convertedAt=todayISO();save();renderAll();goTo('sales');openSaleDetail(saleId);
}

function backupPayload(){
  return {
    app:'M&N Gift', version:'V.MN.0.0.007', phase:2, currency:'COP', exportedAt:new Date().toISOString(),
    data:{
      materials:state.materials, products:state.products, sales:state.sales, purchases:state.purchases,
      expenses:state.expenses, customers:state.customers, orders:state.orders, payments:state.payments, cashClosures:state.cashClosures, suppliers:state.suppliers, inventoryMovements:state.inventoryMovements, productionJobs:state.productionJobs, productionReservations:state.productionReservations, customCategories:state.customCategories
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
  const keys=['materials','products','sales','purchases','expenses','customers','orders','customCategories'];if(!Array.isArray(d.payments))d.payments=[];if(!Array.isArray(d.cashClosures))d.cashClosures=[];if(!Array.isArray(d.suppliers))d.suppliers=[];if(!Array.isArray(d.inventoryMovements))d.inventoryMovements=[];if(!Array.isArray(d.productionJobs))d.productionJobs=[];if(!Array.isArray(d.productionReservations))d.productionReservations=[];
  if(!keys.every(k=>Array.isArray(d[k])))return null;return d;
}
function importBackupFile(file){
  const reader=new FileReader();reader.onload=()=>{
    try{const payload=JSON.parse(reader.result),d=validateBackup(payload);if(!d)throw new Error('Formato no válido');
      if(!confirm('¿Importar este respaldo? Los datos actuales serán reemplazados.'))return;
      localStorage.setItem('mngifts_emergency_backup',JSON.stringify(backupPayload()));
      Object.keys(d).forEach(k=>state[k]=d[k]);if(!Array.isArray(state.payments))state.payments=[];if(!Array.isArray(state.cashClosures))state.cashClosures=[];if(!Array.isArray(state.suppliers))state.suppliers=[];if(!Array.isArray(state.inventoryMovements))state.inventoryMovements=[];if(!Array.isArray(state.productionJobs))state.productionJobs=[];if(!Array.isArray(state.productionReservations))state.productionReservations=[];save();renderAll();localStorage.setItem('mngifts_last_import',new Date().toISOString());alert('Respaldo importado correctamente.');
    }catch(err){alert('No se pudo importar el archivo. Verifica que sea un respaldo válido de M&N Gift.');}
  };reader.readAsText(file);
}
function renderDataSummary(){
  const box=document.getElementById('dataSummary');if(!box)return;
  const total=state.materials.length+state.products.length+state.customers.length+state.orders.length+state.sales.length+state.purchases.length+state.expenses.length+state.payments.length+state.cashClosures.length+state.suppliers.length+state.inventoryMovements.length+state.productionJobs.length+state.productionReservations.length;
  const last=localStorage.getItem('mngifts_last_backup'),lastText=last?new Date(last).toLocaleString('es-CO'):'Todavía no has exportado un respaldo';
  box.innerHTML=`<div><span>Registros guardados</span><strong>${total}</strong></div><div><span>Materiales</span><strong>${state.materials.length}</strong></div><div><span>Productos</span><strong>${state.products.length}</strong></div><div><span>Clientes</span><strong>${state.customers.length}</strong></div><div class="wide"><span>Último respaldo exportado</span><strong>${escapeHtml(lastText)}</strong></div>`;
}
function clearAllBusinessData(){
  if(!confirm('Esta acción borrará todos los datos de M&N Gift guardados en este navegador. ¿Deseas continuar?'))return;
  if(!confirm('Última confirmación: ¿borrar materiales, productos, clientes, pedidos, ventas, compras y gastos?'))return;
  localStorage.setItem('mngifts_emergency_backup',JSON.stringify(backupPayload()));
  ['materials','products','sales','purchases','expenses','customers','orders','payments','cashClosures','suppliers','inventoryMovements','productionJobs','productionReservations','customCategories'].forEach(k=>state[k]=[]);save();renderAll();alert('Los datos locales fueron borrados. Se guardó una copia de emergencia temporal en este navegador.');
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

function renderAll(){ migrateFinanceData();const invMigrated=migrateInventoryData();if(invMigrated)save();renderDailyQuote();refreshCategoryOptions();renderMaterials();renderInventory();renderPurchases();renderProducts();renderCustomers();renderOrders();renderProduction();renderSales();renderExpenses();renderDashboard();renderReports();renderCashMovements();renderCashClosure();refreshPurchaseMaterials();refreshSupplierSelects();refreshOrderCustomers();refreshOrderProducts();renderDataSummary();renderBusinessAlerts();enhanceMobileTables();renderMobileNav(); }

function resetMaterialModal(){ editing.material=null;const f=document.getElementById('materialForm');f.reset();f.elements.quantity.disabled=false;f.elements.cost.disabled=false;f.elements.paymentMethod.disabled=false;f.elements.paymentMethod.value='Efectivo';f.elements.minimumStock.value=0;refreshSupplierSelects();document.getElementById('materialModalTitle').textContent='Nuevo material';document.getElementById('materialSubmitBtn').textContent='Guardar material'; }
function openMaterialEdit(id){ const m=getMaterial(id);if(!m)return;editing.material=id;const f=document.getElementById('materialForm');refreshSupplierSelects();const materialPurchases=state.purchases.filter(p=>p.materialId===m.id);const initialPurchase=materialPurchases.find(p=>(p.note||'').trim().toLowerCase()==='compra inicial')||[...materialPurchases].sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')))[0];f.elements.name.value=m.name;f.elements.unit.value=m.unit;f.elements.quantity.value=num(m.available);f.elements.cost.value=Math.round(num(m.available)*materialUnitCost(m));f.elements.minimumStock.value=num(m.minimumStock);f.elements.preferredSupplierId.value=m.preferredSupplierId||'';f.elements.paymentMethod.value=initialPurchase?.paymentMethod||'Otro';f.elements.quantity.disabled=true;f.elements.cost.disabled=true;f.elements.paymentMethod.disabled=true;document.getElementById('materialModalTitle').textContent='Editar material';document.getElementById('materialSubmitBtn').textContent='Guardar cambios';openModal('materialModal'); }
function resetPurchaseModal(){ editing.purchase=null;const f=document.getElementById('purchaseForm');f.reset();refreshPurchaseMaterials();f.elements.date.value=todayISO();f.elements.paymentMethod.value='Efectivo';refreshSupplierSelects();document.getElementById('purchaseModalTitle').textContent='Registrar compra de material';document.getElementById('purchaseSubmitBtn').textContent='Guardar compra y aumentar inventario';updatePurchasePreview(); }
function openPurchaseEdit(id){ const x=state.purchases.find(p=>p.id===id);if(!x)return;editing.purchase=id;const f=document.getElementById('purchaseForm');refreshPurchaseMaterials(x.materialId);f.elements.quantity.value=x.quantity;f.elements.cost.value=x.cost;f.elements.date.value=x.date||todayISO();f.elements.paymentMethod.value=x.paymentMethod||'Otro';refreshSupplierSelects();f.elements.supplierId.value=x.supplierId||'';f.elements.note.value=x.note||'';document.getElementById('purchaseModalTitle').textContent='Editar compra';document.getElementById('purchaseSubmitBtn').textContent='Guardar cambios';updatePurchasePreview();openModal('purchaseModal'); }
function resetProductModal(){ editing.product=null;draftRecipe=[];const f=document.getElementById('productForm');f.reset();f.elements.laborCost.value=0;f.elements.extraCost.value=0;f.elements.targetMargin.value=40;refreshCategoryOptions();toggleCustomCategory();document.getElementById('productModalTitle').textContent='Nuevo producto';document.getElementById('productSubmitBtn').textContent='Guardar producto';renderDraftRecipe(); }
function openProductEdit(id){ const p=getProduct(id);if(!p)return;editing.product=id;draftRecipe=normalizedRecipe(p).map(x=>({...x}));const f=document.getElementById('productForm');f.elements.name.value=p.name;refreshCategoryOptions();if([...fixedCategories,...state.customCategories].includes(p.category))f.elements.category.value=p.category;else{if(p.category&&!state.customCategories.includes(p.category)){state.customCategories.push(p.category);save();refreshCategoryOptions()}f.elements.category.value=p.category||''}f.elements.laborCost.value=num(p.laborCost);f.elements.extraCost.value=num(p.extraCost);f.elements.targetMargin.value=num(p.targetMargin)||40;f.elements.price.value=num(p.price);toggleCustomCategory();document.getElementById('productModalTitle').textContent='Editar producto';document.getElementById('productSubmitBtn').textContent='Guardar cambios';renderDraftRecipe();openModal('productModal'); }
function resetSaleModal(){ editing.sale=null;const f=document.getElementById('saleForm');f.reset();refreshSaleProducts();f.elements.date.value=todayISO();f.elements.quantity.value=1;f.elements.paymentMethod.value='Efectivo';document.getElementById('saleModalTitle').textContent='Registrar venta';document.getElementById('saleSubmitBtn').textContent='Guardar venta y descontar materiales';updateSalePreview(); }
function openSaleEdit(id){ const s=state.sales.find(x=>x.id===id);if(!s)return;if(!getProduct(s.productId)){alert('Este producto ya fue eliminado. La venta puede eliminarse, pero no editarse.');return}editing.sale=id;const f=document.getElementById('saleForm');refreshSaleProducts(s.productId);f.elements.quantity.value=s.quantity;f.elements.date.value=s.date||todayISO();f.elements.paymentMethod.value=s.paymentMethod||paymentForSale(s.id)?.method||'Otro';document.getElementById('saleModalTitle').textContent='Editar venta';document.getElementById('saleSubmitBtn').textContent='Guardar cambios';updateSalePreview();openModal('saleModal'); }
function resetExpenseModal(){ editing.expense=null;const f=document.getElementById('expenseForm');f.reset();f.elements.date.value=todayISO();f.elements.paymentMethod.value='Efectivo';document.getElementById('expenseModalTitle').textContent='Registrar gasto';document.getElementById('expenseSubmitBtn').textContent='Guardar gasto'; }
function openExpenseEdit(id){ const x=state.expenses.find(e=>e.id===id);if(!x)return;editing.expense=id;const f=document.getElementById('expenseForm');f.elements.category.value=x.category;f.elements.description.value=x.description;f.elements.amount.value=x.amount;f.elements.date.value=x.date||todayISO();f.elements.paymentMethod.value=x.paymentMethod||'Otro';document.getElementById('expenseModalTitle').textContent='Editar gasto';document.getElementById('expenseSubmitBtn').textContent='Guardar cambios';openModal('expenseModal'); }

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
document.getElementById('materialsSearch')?.addEventListener('input',renderMaterials);
document.getElementById('clearMaterialsSearch')?.addEventListener('click',()=>{const input=document.getElementById('materialsSearch');if(input){input.value='';input.focus()}renderMaterials()});

document.getElementById('openMaterialModal').addEventListener('click',()=>{if(!requireBusinessAdmin())return;resetMaterialModal();openModal('materialModal')});
document.getElementById('openPurchaseModal').addEventListener('click',()=>{if(!requireBusinessAdmin())return;if(!state.materials.length){alert('Primero registra al menos un material.');goTo('materials');return}resetPurchaseModal();openModal('purchaseModal')});
document.getElementById('openProductModal').addEventListener('click',()=>{if(!requireBusinessAdmin())return;if(!state.materials.length){alert('Primero registra al menos un material para poder crear la receta del producto.');goTo('materials');return}resetProductModal();openModal('productModal')});
document.getElementById('openCustomerModal').addEventListener('click',()=>{resetCustomerModal();openModal('customerModal')});
document.getElementById('openOrderModal').addEventListener('click',()=>{if(!state.customers.length){alert('Primero registra al menos un cliente.');goTo('customers');return}if(!state.products.length){alert('Primero crea al menos un producto.');goTo('products');return}resetOrderModal();openModal('orderModal')});
document.getElementById('openSaleModal').addEventListener('click',()=>{if(!state.products.length){alert('Primero debes crear al menos un producto.');goTo('products');return}resetSaleModal();openModal('saleModal')});
document.getElementById('openExpenseModal').addEventListener('click',()=>{if(!requireBusinessAdmin())return;resetExpenseModal();openModal('expenseModal')});
document.getElementById('openSupplierModal')?.addEventListener('click',()=>{if(!requireBusinessAdmin())return;resetSupplierModal();openModal('supplierModal')});
document.getElementById('openInventoryAdjustmentModal')?.addEventListener('click',()=>{if(!requireBusinessAdmin())return;if(!state.materials.length){alert('Primero registra al menos un material.');goTo('materials');return}resetInventoryAdjustmentModal();openModal('inventoryAdjustmentModal')});
['inventoryMovementMaterial','inventoryMovementType','inventoryMovementFrom','inventoryMovementTo'].forEach(id=>document.getElementById(id)?.addEventListener('change',renderInventory));
window.addEventListener('resize',()=>{window.clearTimeout(window.__mnInventoryScrollResize);window.__mnInventoryScrollResize=window.setTimeout(()=>{sizeInventoryMovementScroll();sizeInventoryReorderScroll();sizeCashMovementsScroll()},120)});

['inventoryAdjustmentMaterial','inventoryAdjustmentKind','inventoryAdjustmentAction','inventoryAdjustmentQuantity'].forEach(id=>document.getElementById(id)?.addEventListener('input',updateInventoryAdjustmentPreview));
document.getElementById('inventoryAdjustmentAction')?.addEventListener('change',()=>{syncInventoryAdjustmentReasonOptions();updateInventoryAdjustmentPreview()});

document.getElementById('exportBackupBtn').addEventListener('click',()=>{if(requireBusinessAdmin())downloadBackup()});
document.getElementById('importBackupInput').addEventListener('change',e=>{if(!requireBusinessAdmin()){e.target.value='';return}const file=e.target.files?.[0];if(file)importBackupFile(file);e.target.value=''});
document.getElementById('resetAllDataBtn').addEventListener('click',()=>{if(requireBusinessAdmin())clearAllBusinessData()});
document.getElementById('installPwaBtn').addEventListener('click',installPwa);

document.getElementById('addOrderItem')?.addEventListener('click',()=>{const productId=document.getElementById('orderProduct').value,qty=Math.max(1,Math.round(num(document.getElementById('orderItemQuantity').value)||1)),p=getProduct(productId);if(!p){alert('Selecciona un producto.');return}const existing=draftOrderItems.find(i=>i.productId===productId);if(existing)existing.quantity+=qty;else draftOrderItems.push({id:crypto.randomUUID(),productId:p.id,productName:p.name,quantity:qty});document.getElementById('orderProduct').value='';document.getElementById('orderItemQuantity').value=1;renderDraftOrderItems(true)});
document.getElementById('orderItemsList')?.addEventListener('input',e=>{const input=e.target.closest('[data-order-item-qty]');if(!input)return;const item=draftOrderItems.find(i=>i.id===input.dataset.orderItemQty);if(!item)return;item.quantity=Math.max(1,Math.round(num(input.value)||1));renderDraftOrderItems(true)});
document.getElementById('orderItemsList')?.addEventListener('click',e=>{const btn=e.target.closest('[data-remove-order-item]');if(!btn)return;draftOrderItems=draftOrderItems.filter(i=>i.id!==btn.dataset.removeOrderItem);renderDraftOrderItems(true)});
['orderTotalInput','orderDepositInput'].forEach(id=>document.getElementById(id).addEventListener('input',()=>updateOrderMoneyPreview(false)));

// Formularios
document.getElementById('materialForm').addEventListener('submit',e=>{e.preventDefault();if(!requireBusinessAdmin())return;const f=e.currentTarget,d=Object.fromEntries(new FormData(f));if(editing.material){const m=getMaterial(editing.material);if(!m)return;m.name=d.name.trim();m.unit=d.unit;m.minimumStock=num(d.minimumStock);m.preferredSupplierId=d.preferredSupplierId||null;state.purchases.filter(p=>p.materialId===m.id).forEach(p=>{p.materialName=m.name;p.unit=m.unit});state.sales.forEach(s=>(s.consumption||[]).filter(i=>i.materialId===m.id).forEach(i=>{i.materialName=m.name;i.unit=m.unit}));state.inventoryMovements.filter(x=>x.materialId===m.id).forEach(x=>{x.materialName=m.name;x.unit=m.unit});save();renderAll();closeModal('materialModal');resetMaterialModal();return}const q=num(d.quantity),cost=num(d.cost),id=crypto.randomUUID(),avg=q?cost/q:0,purchaseId=crypto.randomUUID();state.materials.push({id,name:d.name.trim(),unit:d.unit,quantity:q,cost,available:q,avgUnitCost:avg,totalPurchased:q,totalSpent:cost,minimumStock:num(d.minimumStock),preferredSupplierId:d.preferredSupplierId||null});state.purchases.push({id:purchaseId,materialId:id,materialName:d.name.trim(),unit:d.unit,quantity:q,cost,date:todayISO(),paymentMethod:d.paymentMethod||'Otro',supplierId:d.preferredSupplierId||null,note:'Compra inicial'});recordInventoryMovement({materialId:id,kind:'purchase',quantity:q,date:todayISO(),note:'Compra inicial',sourceType:'purchase',sourceId:purchaseId,unitCost:avg});save();renderAll();closeModal('materialModal');resetMaterialModal()});
['materialId','quantity','cost'].forEach(name=>document.querySelector(`#purchaseForm [name="${name}"]`).addEventListener(name==='materialId'?'change':'input',updatePurchasePreview));
document.getElementById('purchaseForm').addEventListener('submit',e=>{e.preventDefault();if(!requireBusinessAdmin())return;const d=Object.fromEntries(new FormData(e.currentTarget)),m=getMaterial(d.materialId),q=num(d.quantity),cost=num(d.cost);if(!m||q<=0)return;const replacement={id:editing.purchase||crypto.randomUUID(),materialId:m.id,materialName:m.name,unit:m.unit,quantity:q,cost,date:d.date,paymentMethod:d.paymentMethod||'Otro',supplierId:d.supplierId||null,note:d.note.trim()};if(editing.purchase){const old=state.purchases.find(x=>x.id===editing.purchase);if(!old)return;const reversed=reversePurchaseFromInventory(old);if(!reversed.ok){alert(reversed.message);return}recordInventoryMovement({materialId:old.materialId,kind:'purchase_reversal',quantity:old.quantity,date:d.date||todayISO(),note:'Reversión por edición de compra',sourceType:'purchase_reversal',sourceId:old.id,unitCost:num(old.quantity)?num(old.cost)/num(old.quantity):0});Object.assign(old,replacement);applyPurchaseToInventory(old);recordInventoryMovement({materialId:old.materialId,kind:'purchase',quantity:old.quantity,date:old.date,note:old.note||'Compra editada',sourceType:'purchase',sourceId:old.id,unitCost:num(old.quantity)?num(old.cost)/num(old.quantity):0})}else{state.purchases.push(replacement);applyPurchaseToInventory(replacement);recordInventoryMovement({materialId:replacement.materialId,kind:'purchase',quantity:replacement.quantity,date:replacement.date,note:replacement.note||'Compra',sourceType:'purchase',sourceId:replacement.id,unitCost:num(replacement.quantity)?num(replacement.cost)/num(replacement.quantity):0})}save();renderAll();closeModal('purchaseModal');resetPurchaseModal()});
document.getElementById('addRecipeMaterial').addEventListener('click',()=>{const id=document.getElementById('recipeMaterial').value,q=num(document.getElementById('recipeQuantity').value);if(!id||q<=0){alert('Selecciona un material e indica una cantidad válida.');return}draftRecipe.push({materialId:id,quantity:q});document.getElementById('recipeQuantity').value='';renderDraftRecipe()});
document.getElementById('recipeList').addEventListener('click',e=>{const id=e.target.dataset.removeRecipe;if(!id)return;draftRecipe=draftRecipe.filter(x=>x.materialId!==id);renderDraftRecipe()});
['laborCost','extraCost','targetMargin','productPrice'].forEach(id=>document.getElementById(id).addEventListener('input',updateProductCostPreview));
document.getElementById('suggestedPrice').addEventListener('click',()=>{const raw=document.getElementById('suggestedPrice').textContent.replace(/[^0-9]/g,'');if(raw){document.getElementById('productPrice').value=raw;updateProductCostPreview()}});
document.getElementById('productForm').addEventListener('submit',e=>{e.preventDefault();if(!requireBusinessAdmin())return;if(!draftRecipe.length){alert('Agrega al menos un material a la receta del producto.');return}const d=Object.fromEntries(new FormData(e.currentTarget));let category=d.category;if(category==='__other__'){category=d.customCategory.trim();if(!category){alert('Escribe el nombre de la nueva categoría.');return}if(!state.customCategories.some(c=>c.toLowerCase()===category.toLowerCase()))state.customCategories.push(category)}const data={name:d.name.trim(),category,recipe:draftRecipe.map(x=>({...x})),laborCost:num(d.laborCost),extraCost:num(d.extraCost),targetMargin:num(d.targetMargin),price:num(d.price)};if(editing.product){const p=getProduct(editing.product);Object.assign(p,data);p.cost=calculateProductCost(p)}else{const p={id:crypto.randomUUID(),...data};p.cost=calculateProductCost(p);state.products.push(p)}save();renderAll();closeModal('productModal');resetProductModal()});
document.getElementById('saleProduct').addEventListener('change',updateSalePreview);document.querySelector('#saleForm [name="quantity"]').addEventListener('input',updateSalePreview);
document.getElementById('saleForm').addEventListener('submit',e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget)),p=getProduct(d.productId),qty=num(d.quantity);if(!p||qty<=0)return;let old=null;if(editing.sale){old=state.sales.find(x=>x.id===editing.sale);restore(old?.consumption||[]);(old?.consumption||[]).forEach(u=>recordInventoryMovement({materialId:u.materialId,kind:'sale_reversal',quantity:u.quantity,date:d.date||todayISO(),note:'Reversión por edición de venta',sourceType:'sale_reversal',sourceId:old.id,unitCost:u.unitCost}))}const consumption=buildConsumption(p,qty),missing=canConsume(consumption);if(missing.length){if(old)consume(old.consumption||[]);alert('No hay material suficiente para esta venta:\n\n'+missing.join('\n'));return}consume(consumption);const unitCost=calculateProductCost(p),data={productId:p.id,productName:p.name,productCategory:p.category||'',quantity:qty,date:d.date,unitPrice:num(p.price),total:num(p.price)*qty,unitCost,cost:unitCost*qty,paymentMethod:d.paymentMethod||'Otro',consumption};let sale;if(old){Object.assign(old,data);sale=old;const pay=paymentForSale(old.id);if(pay)Object.assign(pay,{date:d.date,amount:data.total,method:data.paymentMethod});else state.payments.push({id:crypto.randomUUID(),saleId:old.id,orderId:null,date:d.date,amount:data.total,method:data.paymentMethod,kind:'Venta',note:''})}else{sale={id:crypto.randomUUID(),...data};state.sales.push(sale);state.payments.push({id:crypto.randomUUID(),saleId:sale.id,orderId:null,date:d.date,amount:data.total,method:data.paymentMethod,kind:'Venta',note:''})}const priorItemId=Array.isArray(sale.items)&&sale.items[0]?.id?sale.items[0].id:sale.id;sale.items=[{id:priorItemId,productId:data.productId,productName:data.productName,productCategory:data.productCategory,quantity:data.quantity,unitPrice:data.unitPrice,unitCost:data.unitCost,consumption:data.consumption.map(u=>({...u}))}];(sale.consumption||[]).forEach(u=>recordInventoryMovement({materialId:u.materialId,kind:'sale',quantity:u.quantity,date:sale.date,note:`Venta: ${sale.productName}`,sourceType:'sale',sourceId:sale.id,unitCost:u.unitCost}));save();renderAll();closeModal('saleModal');resetSaleModal()});
document.getElementById('customerForm').addEventListener('submit',e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget)),data={name:d.name.trim(),phone:d.phone.trim(),location:d.location.trim(),notes:d.notes.trim()};if(editing.customer){const c=getCustomer(editing.customer);Object.assign(c,data);state.orders.filter(o=>o.customerId===c.id).forEach(o=>{o.customerName=c.name;o.customerPhone=c.phone})}else state.customers.push({id:crypto.randomUUID(),...data});save();renderAll();closeModal('customerModal');resetCustomerModal()});
document.getElementById('orderForm').addEventListener('submit',e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget)),c=getCustomer(d.customerId),items=draftOrderItems.map(i=>({...i,productName:getProduct(i.productId)?.name||i.productName||'Producto',quantity:Math.max(1,Math.round(num(i.quantity)||1))})).filter(i=>getProduct(i.productId)),total=num(d.total),deposit=editing.order?paidAmountForOrder(editing.order):num(d.deposit);if(!c){alert('Selecciona un cliente.');return}if(!items.length){alert('Agrega al menos un producto al pedido.');return}if(d.deliveryDate<d.orderDate){alert('La fecha de entrega no puede ser anterior a la fecha del pedido.');return}if(deposit>total){alert('El dinero recibido no puede ser mayor que el total del pedido.');return}const data={customerId:c.id,customerName:c.name,customerPhone:c.phone||'',items,orderDate:d.orderDate,deliveryDate:d.deliveryDate,total,deposit,status:d.status,notes:d.notes.trim()};syncOrderLegacyFields(data);if(editing.order){const old=getOrder(editing.order);if(old?.saleId){alert('No puedes editar un pedido ya convertido en venta.');return}const initialPayment=initialPaymentForOrder(old.id);if(initialPayment&&d.depositMethod){initialPayment.method=d.depositMethod}Object.assign(old,data);syncOrderLegacyFields(old)}else{const order={id:crypto.randomUUID(),...data};syncOrderLegacyFields(order);state.orders.push(order);if(deposit>0)state.payments.push({id:crypto.randomUUID(),orderId:order.id,saleId:null,date:d.orderDate,amount:deposit,method:d.depositMethod||'Otro',kind:'Anticipo',note:'Anticipo inicial'})}save();renderAll();closeModal('orderModal');resetOrderModal()});
document.getElementById('expenseForm').addEventListener('submit',e=>{e.preventDefault();if(!requireBusinessAdmin())return;const d=Object.fromEntries(new FormData(e.currentTarget)),data={category:d.category,description:d.description.trim(),amount:num(d.amount),date:d.date,paymentMethod:d.paymentMethod||'Otro'};if(editing.expense)Object.assign(state.expenses.find(x=>x.id===editing.expense),data);else state.expenses.push({id:crypto.randomUUID(),...data});save();renderAll();closeModal('expenseModal');resetExpenseModal()});
document.getElementById('supplierForm')?.addEventListener('submit',e=>{e.preventDefault();if(!requireBusinessAdmin())return;const d=Object.fromEntries(new FormData(e.currentTarget)),data={name:d.name.trim(),contactName:d.contactName.trim(),phone:d.phone.trim(),city:d.city.trim(),notes:d.notes.trim()};if(editing.supplier)Object.assign(getSupplier(editing.supplier),data);else state.suppliers.push({id:crypto.randomUUID(),...data});save();renderAll();closeModal('supplierModal');resetSupplierModal()});
document.getElementById('inventoryAdjustmentForm')?.addEventListener('input',updateInventoryAdjustmentPreview);
document.getElementById('inventoryAdjustmentForm')?.addEventListener('change',updateInventoryAdjustmentPreview);
document.getElementById('inventoryAdjustmentForm')?.addEventListener('submit',e=>{e.preventDefault();if(!requireBusinessAdmin())return;const d=Object.fromEntries(new FormData(e.currentTarget)),m=getMaterial(d.materialId),q=Math.abs(num(d.quantity)),action=d.action==='add'?'add':'subtract';if(!m||q<=0)return;const allowedKinds=action==='add'?['correction_plus','manual_in']:['loss','damage','internal','correction_minus'];if(!allowedKinds.includes(d.kind)){alert('Selecciona un motivo válido para el tipo de ajuste.');return}const delta=action==='add'?q:-q;if(num(m.available)+delta<-.000001){alert(`No puedes restar ${formatQty(q)} ${m.unit}. Solo hay ${formatQty(m.available)} disponibles.`);return}m.available=Math.max(0,num(m.available)+delta);recordInventoryMovement({materialId:m.id,kind:d.kind,quantity:q,date:d.date||todayISO(),note:d.note.trim(),sourceType:'adjustment',sourceId:null});save();renderAll();closeModal('inventoryAdjustmentModal');resetInventoryAdjustmentModal()});

// Acciones editar / eliminar
document.addEventListener('click',e=>{
  const t=e.target;
  if(t.dataset.editSupplier){if(!requireBusinessAdmin())return;return openSupplierEdit(t.dataset.editSupplier);}
  if(t.dataset.deleteSupplier){if(!requireBusinessAdmin())return;const id=t.dataset.deleteSupplier;if(state.materials.some(m=>m.preferredSupplierId===id)||state.purchases.some(p=>p.supplierId===id)){alert('Este proveedor está asociado a materiales o compras. Edita esas relaciones antes de eliminarlo.');return}if(confirm('¿Eliminar este proveedor?')){state.suppliers=state.suppliers.filter(x=>x.id!==id);save();renderAll()}return;}
  if(t.dataset.editMaterial){if(!requireBusinessAdmin())return;return openMaterialEdit(t.dataset.editMaterial);}
  if(t.dataset.deleteMaterial){if(!requireBusinessAdmin())return;const id=t.dataset.deleteMaterial,used=state.products.some(p=>normalizedRecipe(p).some(i=>i.materialId===id)),sold=state.sales.some(s=>(s.consumption||[]).some(i=>i.materialId===id));if(used){alert('No puedes eliminar este material porque está incluido en la receta de uno o más productos.');return}if(sold){alert('No puedes eliminar este material porque existen ventas históricas que lo consumieron.');return}if(confirm('¿Eliminar este material y su historial de compras?')){state.materials=state.materials.filter(m=>m.id!==id);state.purchases=state.purchases.filter(p=>p.materialId!==id);state.inventoryMovements=state.inventoryMovements.filter(x=>x.materialId!==id);save();renderAll()}return;}
  if(t.dataset.editPurchase){if(!requireBusinessAdmin())return;return openPurchaseEdit(t.dataset.editPurchase);}
  if(t.dataset.deletePurchase){if(!requireBusinessAdmin())return;const x=state.purchases.find(p=>p.id===t.dataset.deletePurchase);if(!x)return;if(!confirm('¿Eliminar esta compra? El inventario se reducirá en la cantidad comprada.'))return;const r=reversePurchaseFromInventory(x);if(!r.ok){alert(r.message);return}recordInventoryMovement({materialId:x.materialId,kind:'purchase_reversal',quantity:x.quantity,date:todayISO(),note:'Compra eliminada',sourceType:'purchase_reversal',sourceId:x.id,unitCost:num(x.quantity)?num(x.cost)/num(x.quantity):0});state.purchases=state.purchases.filter(p=>p.id!==x.id);save();renderAll();return;}
  if(t.dataset.editProduct){if(!requireBusinessAdmin())return;return openProductEdit(t.dataset.editProduct);}
  if(t.dataset.deleteProduct){if(!requireBusinessAdmin())return;if(confirm('¿Eliminar este producto? Las ventas históricas se conservarán.')){state.products=state.products.filter(p=>p.id!==t.dataset.deleteProduct);save();renderAll()}return;}
  if(t.dataset.payOrder){openPaymentModal(t.dataset.payOrder);return;}
  if(t.dataset.convertOrder){convertOrderToSale(t.dataset.convertOrder);return;}
  if(t.dataset.viewSale){openSaleDetail(t.dataset.viewSale);return;}
  if(t.dataset.editSale){if(!requireBusinessAdmin())return;const s=state.sales.find(x=>x.id===t.dataset.editSale);if(s?.orderId){alert('Esta venta proviene de un pedido. Revierte la venta para modificar el pedido original.');return}return openSaleEdit(t.dataset.editSale);}
  if(t.dataset.deleteSale){if(!requireBusinessAdmin())return;const s=state.sales.find(x=>x.id===t.dataset.deleteSale);if(!s)return;const plan=saleReversalPlan(s),summary=saleReversalSummary(s);if(!plan.combined.length){alert('Esta venta no tiene materiales registrados para devolver. Revisa el detalle de la venta antes de revertirla.');return}const msg=s.orderId?`¿Revertir esta venta?

Se devolverán TODOS estos materiales al inventario:

${summary}

El pedido regresará a estado Listo.`:`¿Eliminar esta venta?

Se devolverán TODOS estos materiales al inventario:

${summary}`;if(confirm(msg)){restore(plan.combined);plan.lines.forEach(u=>recordInventoryMovement({materialId:u.materialId,kind:'sale_reversal',quantity:u.quantity,date:todayISO(),note:`Reversión de venta: ${u.productName} × ${formatQty(u.productQuantity)}`,sourceType:'sale_reversal',sourceId:s.id,unitCost:u.unitCost}));state.sales=state.sales.filter(x=>x.id!==s.id);if(!s.orderId)state.payments=state.payments.filter(p=>p.saleId!==s.id);if(s.orderId){const o=getOrder(s.orderId);if(o){o.saleId=null;if(o.status==='Entregado')o.status='Listo';delete o.convertedAt}}save();renderAll()}return;}
  if(t.dataset.editCustomer)return openCustomerEdit(t.dataset.editCustomer);
  if(t.dataset.deleteCustomer){if(!requireBusinessAdmin())return;const id=t.dataset.deleteCustomer;if(state.orders.some(o=>o.customerId===id)){alert('No puedes eliminar este cliente porque tiene pedidos registrados. Puedes editar sus datos en su lugar.');return}if(confirm('¿Eliminar este cliente?')){state.customers=state.customers.filter(c=>c.id!==id);save();renderAll()}return;}
  if(t.dataset.editOrder)return openOrderEdit(t.dataset.editOrder);
  if(t.dataset.deleteOrder){if(!requireBusinessAdmin())return;deleteOrderWithFullRollback(t.dataset.deleteOrder);return;}
  if(t.dataset.editExpense){if(!requireBusinessAdmin())return;return openExpenseEdit(t.dataset.editExpense);}
  if(t.dataset.deleteExpense){if(!requireBusinessAdmin())return;if(confirm('¿Eliminar este gasto?')){state.expenses=state.expenses.filter(x=>x.id!==t.dataset.deleteExpense);save();renderAll()}return;}
});



// ============================================================
// BLOQUE FINANCIERO AVANZADO — desarrollo sobre V.MN.0.0.007
// ============================================================
function openPaymentModal(orderId){const o=getOrder(orderId);if(!o||o.saleId||o.status==='Cancelado')return;const balance=orderBalance(o);if(balance<=0){alert('Este pedido ya está completamente pagado.');return}const f=document.getElementById('paymentForm');f.reset();f.elements.orderId.value=o.id;f.elements.date.value=todayISO();f.elements.method.value='Efectivo';f.elements.amount.value=Math.round(balance);document.getElementById('paymentOrderTarget').innerHTML=`${escapeHtml(getCustomer(o.customerId)?.name||o.customerName||'Cliente')} · Saldo actual: <strong>${COP.format(balance)}</strong>`;updatePaymentPreview();openModal('paymentModal')}
function updatePaymentPreview(){const f=document.getElementById('paymentForm');if(!f)return;const o=getOrder(f.elements.orderId.value),amount=num(f.elements.amount.value),balance=orderBalance(o);document.getElementById('paymentPreview').innerHTML=`Saldo actual: <strong>${COP.format(balance)}</strong> · Después del abono: <strong>${COP.format(Math.max(0,balance-amount))}</strong>`}
document.getElementById('paymentAmount')?.addEventListener('input',updatePaymentPreview);
document.getElementById('paymentForm')?.addEventListener('submit',e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget)),o=getOrder(d.orderId);if(!o)return;const amount=num(d.amount),balance=orderBalance(o);if(amount<=0)return;if(amount>balance+0.01){alert(`El abono no puede superar el saldo de ${COP.format(balance)}.`);return}state.payments.push({id:crypto.randomUUID(),orderId:o.id,saleId:null,date:d.date||todayISO(),amount,method:d.method||'Otro',kind:paidAmountForOrder(o)>0?'Abono':'Anticipo',note:d.note?.trim()||''});o.deposit=paidAmountForOrder(o);save();renderAll();closeModal('paymentModal')});
function openRefundModal(orderId){const o=getOrder(orderId);if(!o)return;if(o.status!=='Cancelado'){alert('Solo se puede devolver dinero de un pedido cancelado.');return}const age=orderAgeDays(o),amount=paidAmountForOrder(o);if(age===null||age<0||age>5){alert('La devolución solo está disponible durante los primeros 5 días desde que se realizó el pedido.');return}if(amount<=0.009){alert('Este pedido no tiene dinero pendiente por devolver.');return}const positive=paymentsForOrder(o.id).filter(p=>num(p.amount)>0),methods=[...new Set(positive.map(p=>p.method||'Otro'))],method=methods.length===1?methods[0]:'Otro',f=document.getElementById('refundForm');f.reset();f.elements.orderId.value=o.id;f.elements.amount.value=Math.round(amount);f.elements.date.value=todayISO();f.elements.method.value=PAYMENT_METHODS.includes(method)?method:'Otro';const remaining=Math.max(0,5-age);document.getElementById('refundOrderTarget').innerHTML=`<strong>${escapeHtml(getCustomer(o.customerId)?.name||o.customerName||'Cliente')}</strong><br>Pedido realizado: ${niceDate(o.orderDate)} · Fecha límite: <strong>${niceDate(orderRefundDeadline(o))}</strong><br><small>${remaining===0?'Último día para realizar la devolución.':`Quedan ${remaining} día(s) para realizar la devolución.`}</small>`;document.getElementById('refundPreview').innerHTML=`Total recibido pendiente por devolver: <strong>${COP.format(amount)}</strong><br>Después de la devolución, el dinero recibido de este pedido quedará en <strong>${COP.format(0)}</strong>.`;openModal('refundModal')}
document.getElementById('refundForm')?.addEventListener('submit',e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget)),o=getOrder(d.orderId);if(!o)return;if(!canRefundCancelledOrder(o)){alert('Este pedido ya no cumple las condiciones para realizar la devolución.');closeModal('refundModal');renderAll();return}const amount=paidAmountForOrder(o);if(amount<=0.009)return;state.payments.push({id:crypto.randomUUID(),orderId:o.id,saleId:null,date:todayISO(),amount:-Math.abs(amount),method:d.method||'Otro',kind:'Devolución',note:d.note?.trim()||'Devolución total por pedido cancelado'});o.deposit=paidAmountForOrder(o);save();renderAll();closeModal('refundModal');alert(`Devolución registrada por ${COP.format(amount)}.`)});
document.addEventListener('click',e=>{const t=e.target.closest('[data-refund-order]');if(t){e.preventDefault();openRefundModal(t.dataset.refundOrder)}},true);
function allCashMovements(){
  const rows=[];let sequence=0;
  state.payments.forEach(p=>{
    const amount=num(p.amount);if(!amount)return;
    const o=p.orderId?getOrder(p.orderId):null,s=p.saleId?state.sales.find(x=>x.id===p.saleId):null,c=o?getCustomer(o.customerId):null;
    let detail='Movimiento de dinero';
    if(o){const customer=c?.name||o.customerName||'Cliente',products=orderProductsText(o);detail=`${p.kind|| (amount>0?'Pago':'Devolución')} · ${customer}${products?` · ${products}`:''}`}
    else if(s){const items=normalizedSaleItems(s).map(i=>`${i.productName||'Producto'} × ${formatQty(i.quantity)}`).join(' · ');detail=`${p.kind||'Venta'}${items?` · ${items}`:''}`}
    else if(p.kind)detail=p.kind;
    if(p.note)detail+=` · ${p.note}`;
    rows.push({id:`payment-${p.id}`,date:p.date||todayISO(),type:amount>0?'Ingreso':'Egreso',category:p.kind|| (amount>0?'Cobro':'Devolución'),detail,method:p.method||'Otro',income:amount>0?amount:0,out:amount<0?Math.abs(amount):0,sequence:sequence++});
  });
  state.purchases.forEach(x=>{
    const supplier=getSupplier(x.supplierId),detail=`Compra de ${x.materialName||getMaterial(x.materialId)?.name||'material'}${supplier?` · ${supplier.name}`:''}${x.note?` · ${x.note}`:''}`;
    rows.push({id:`purchase-${x.id}`,date:x.date||todayISO(),type:'Egreso',category:'Compra',detail,method:x.paymentMethod||'Otro',income:0,out:num(x.cost),sequence:sequence++});
  });
  state.expenses.forEach(x=>{
    const employee=x.category==='Pago a empleados',label=employee?'Pago a empleados':(x.category||'Gasto'),detail=`${label}${x.description?` · ${x.description}`:''}`;
    rows.push({id:`expense-${x.id}`,date:x.date||todayISO(),type:'Egreso',category:label,detail,method:x.paymentMethod||'Otro',income:0,out:num(x.amount),sequence:sequence++});
  });
  return rows.sort((a,b)=>(b.date||'').localeCompare(a.date||'')||b.sequence-a.sequence);
}
function filteredCashMovements(){
  const from=document.getElementById('cashMovementsFrom')?.value||'',to=document.getElementById('cashMovementsTo')?.value||'',type=document.getElementById('cashMovementType')?.value||'',method=document.getElementById('cashMovementMethod')?.value||'';
  return allCashMovements().filter(x=>inRange(x.date,from,to)&&(!type||x.type===type)&&(!method||x.method===method));
}
function sizeCashMovementsScroll(){
  const wrap=document.getElementById('cashMovementsScroll'),tbody=document.getElementById('cashMovementsTable');
  if(!wrap||!tbody)return;
  const rows=[...tbody.querySelectorAll('tr')];
  wrap.classList.toggle('has-vertical-scroll',rows.length>10);
  if(rows.length<=10){wrap.style.maxHeight='';wrap.scrollTop=0;return}
  const head=wrap.querySelector('thead');
  let desired=(head&&getComputedStyle(head).display!=='none')?head.getBoundingClientRect().height:0;
  const bodyStyle=getComputedStyle(tbody),gap=parseFloat(bodyStyle.rowGap||bodyStyle.gap)||0;
  rows.slice(0,10).forEach((row,index)=>{desired+=row.getBoundingClientRect().height;if(index<9)desired+=gap});
  if(desired<=2)return;
  const mobileCap=window.innerWidth<=760?Math.max(360,Math.floor(window.innerHeight*.68)):desired;
  wrap.style.maxHeight=`${Math.ceil(Math.min(desired,mobileCap))+2}px`;
  wrap.scrollTop=0;
}
function renderCashMovements(){
  const tbody=document.getElementById('cashMovementsTable'),empty=document.getElementById('cashMovementsEmpty');if(!tbody||!empty)return;
  const rows=filteredCashMovements(),income=rows.reduce((sum,x)=>sum+num(x.income),0),out=rows.reduce((sum,x)=>sum+num(x.out),0),net=income-out;
  tbody.innerHTML='';empty.style.display=rows.length?'none':'block';
  rows.forEach(x=>{const tr=document.createElement('tr');tr.innerHTML=`<td>${niceDate(x.date)}</td><td><strong class="${x.type==='Ingreso'?'profit':'expense-amount'}">${x.type}</strong><br><small>${escapeHtml(x.category)}</small></td><td>${escapeHtml(x.detail)}</td><td><span class="payment-method-pill">${escapeHtml(x.method)}</span></td><td class="profit">${x.income?COP.format(x.income):'—'}</td><td class="expense-amount">${x.out?COP.format(x.out):'—'}</td>`;tbody.appendChild(tr)});
  requestAnimationFrame(()=>{enhanceMobileTables();sizeCashMovementsScroll()});
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=COP.format(v)};set('cashMovementIncome',income);set('cashMovementOut',out);set('cashMovementNet',net);
  const netEl=document.getElementById('cashMovementNet');if(netEl){netEl.classList.toggle('profit',net>=0);netEl.classList.toggle('expense-amount',net<0)}
}
function cashMovementFilterLabel(){const from=document.getElementById('cashMovementsFrom')?.value||'',to=document.getElementById('cashMovementsTo')?.value||'',type=document.getElementById('cashMovementType')?.value||'',method=document.getElementById('cashMovementMethod')?.value||'';return {from,to,type,method}}
function printCashMovements(){
  const rows=filteredCashMovements();if(!rows.length){alert('No hay movimientos para imprimir con los filtros seleccionados.');return}
  const income=rows.reduce((s,x)=>s+num(x.income),0),out=rows.reduce((s,x)=>s+num(x.out),0),f=cashMovementFilterLabel(),popup=window.open('','_blank','width=1020,height=760');
  if(!popup){alert('El navegador bloqueó la ventana de impresión. Permite ventanas emergentes para M&N Gift e inténtalo nuevamente.');return}
  const range=`${f.from?niceDate(f.from):'Inicio'} → ${f.to?niceDate(f.to):'Hoy'}`,filters=[f.type||'Ingresos y egresos',f.method||'Todos los métodos'].join(' · '),tableRows=rows.map(x=>`<tr><td>${niceDate(x.date)}</td><td><strong>${escapeHtml(x.type)}</strong><br><small>${escapeHtml(x.category)}</small></td><td>${escapeHtml(x.detail)}</td><td>${escapeHtml(x.method)}</td><td class="in">${x.income?COP.format(x.income):'—'}</td><td class="out">${x.out?COP.format(x.out):'—'}</td></tr>`).join('');
  popup.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Movimientos de caja - M&N Gift</title><style>body{font-family:Arial,sans-serif;color:#2f2025;margin:30px}h1{margin:0;font-size:24px}p{color:#6f6267;margin:6px 0 18px}.summary{display:flex;gap:18px;margin:0 0 22px;padding:12px 0;border-top:1px solid #ddd;border-bottom:1px solid #ddd}.summary div{min-width:160px}.summary span{display:block;color:#777;font-size:11px;text-transform:uppercase}.summary strong{font-size:17px}.in{color:#257a50}.out{color:#b04747}table{width:100%;border-collapse:collapse}th,td{padding:9px 8px;border-bottom:1px solid #ddd;text-align:left;font-size:12px;vertical-align:top}th{background:#f6eef1;text-transform:uppercase;font-size:10px}small{color:#777}.footer{margin-top:18px;font-size:10px;color:#777}@media print{body{margin:10mm}}</style></head><body><h1>M&N Gift · Movimientos de caja</h1><p>${escapeHtml(range)} · ${escapeHtml(filters)} · Generado ${escapeHtml(new Date().toLocaleString('es-CO'))}</p><div class="summary"><div><span>Ingresos</span><strong class="in">${COP.format(income)}</strong></div><div><span>Egresos</span><strong class="out">${COP.format(out)}</strong></div><div><span>Neto</span><strong>${COP.format(income-out)}</strong></div></div><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Detalle</th><th>Método</th><th>Ingreso</th><th>Egreso</th></tr></thead><tbody>${tableRows}</tbody></table><div class="footer">Desde el cuadro de impresión puedes seleccionar “Guardar como PDF”.</div><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),150));<\/script></body></html>`);popup.document.close();
}
function downloadCashMovements(){
  const rows=filteredCashMovements();if(!rows.length){alert('No hay movimientos para guardar con los filtros seleccionados.');return}
  const income=rows.reduce((s,x)=>s+num(x.income),0),out=rows.reduce((s,x)=>s+num(x.out),0),f=cashMovementFilterLabel(),lines=[['M&N Gift - Movimientos de caja'],['Desde',f.from||'Inicio'],['Hasta',f.to||'Hoy'],['Tipo',f.type||'Todos'],['Método',f.method||'Todos'],[],['Fecha','Tipo','Categoría','Detalle','Método','Ingreso','Egreso']];
  rows.forEach(x=>lines.push([x.date,x.type,x.category,x.detail,x.method,x.income||'',x.out||'']));lines.push([],['Totales','','','','',income,out],['Movimiento neto','','','','',income-out,'']);downloadText(`MN_Gift_movimientos_caja_${f.from||'inicio'}_${f.to||todayISO()}.csv`,lines.map(r=>r.map(csvEscape).join(',')).join('\n'));
}
['cashMovementsFrom','cashMovementsTo','cashMovementType','cashMovementMethod'].forEach(id=>document.getElementById(id)?.addEventListener('change',renderCashMovements));
document.getElementById('clearCashMovementFilters')?.addEventListener('click',()=>{['cashMovementsFrom','cashMovementsTo','cashMovementType','cashMovementMethod'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''});renderCashMovements()});
document.getElementById('printCashMovements')?.addEventListener('click',printCashMovements);
document.getElementById('downloadCashMovements')?.addEventListener('click',downloadCashMovements);
function cashActivityForDate(date){const cashPayments=state.payments.filter(p=>p.date===date&&p.method==='Efectivo'),income=cashPayments.filter(p=>num(p.amount)>0).reduce((sum,p)=>sum+num(p.amount),0),refunds=cashPayments.filter(p=>num(p.amount)<0).reduce((sum,p)=>sum+Math.abs(num(p.amount)),0),purchases=state.purchases.filter(p=>p.date===date&&p.paymentMethod==='Efectivo').reduce((sum,p)=>sum+num(p.cost),0),expenses=state.expenses.filter(x=>x.date===date&&x.paymentMethod==='Efectivo').reduce((sum,x)=>sum+num(x.amount),0);return {income,out:purchases+expenses+refunds}}
function renderCashClosure(){const date=document.getElementById('cashCloseDate')?.value||todayISO(),opening=num(document.getElementById('cashOpening')?.value),counted=num(document.getElementById('cashCounted')?.value),x=cashActivityForDate(date),expected=opening+x.income-x.out,diff=counted-expected,set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=COP.format(v)};set('cashCloseIncome',x.income);set('cashCloseOut',x.out);set('cashCloseExpected',expected);set('cashCloseDifference',diff);const d=document.querySelector('.cash-close-difference');d?.classList.toggle('positive',diff>=0);d?.classList.toggle('negative',diff<0);const tb=document.getElementById('cashClosuresTable'),empty=document.getElementById('cashClosuresEmpty');if(tb){tb.innerHTML='';const rows=[...state.cashClosures].sort((a,b)=>(b.date||'').localeCompare(a.date||''));empty.style.display=rows.length?'none':'block';rows.slice(0,60).forEach(c=>{const tr=document.createElement('tr');tr.innerHTML=`<td>${niceDate(c.date)}</td><td>${COP.format(c.openingCash)}</td><td>${COP.format(c.expectedCash)}</td><td>${COP.format(c.countedCash)}</td><td class="${num(c.difference)<0?'expense-amount':'profit'}">${COP.format(c.difference)}</td><td>${escapeHtml(c.notes||'—')}</td>`;tb.appendChild(tr)})}}
function loadCashClosureForDate(){const date=document.getElementById('cashCloseDate')?.value||todayISO(),existing=state.cashClosures.find(c=>c.date===date);if(existing){document.getElementById('cashOpening').value=Math.round(num(existing.openingCash));document.getElementById('cashCounted').value=Math.round(num(existing.countedCash));document.getElementById('cashCloseNotes').value=existing.notes||''}else{document.getElementById('cashOpening').value=0;document.getElementById('cashCounted').value=0;document.getElementById('cashCloseNotes').value=''}renderCashClosure()}
document.getElementById('cashCloseDate')?.addEventListener('change',loadCashClosureForDate);['cashOpening','cashCounted'].forEach(id=>document.getElementById(id)?.addEventListener('input',renderCashClosure));
document.getElementById('saveCashClosure')?.addEventListener('click',()=>{if(!requireBusinessAdmin())return;const date=document.getElementById('cashCloseDate').value||todayISO(),opening=num(document.getElementById('cashOpening').value),counted=num(document.getElementById('cashCounted').value),notes=document.getElementById('cashCloseNotes').value.trim(),x=cashActivityForDate(date),expected=opening+x.income-x.out,difference=counted-expected,existing=state.cashClosures.find(c=>c.date===date),data={date,openingCash:opening,expectedCash:expected,countedCash:counted,difference,notes,closedAt:new Date().toISOString()};if(existing)Object.assign(existing,data);else state.cashClosures.push({id:crypto.randomUUID(),...data});save();renderCashClosure();alert(`Cierre guardado. Diferencia: ${COP.format(difference)}.`)});
function setReportPeriod(kind){const now=new Date();let from='',to='';if(kind==='today')from=to=todayISO();if(kind==='week'){const d=new Date(),day=(d.getDay()+6)%7,start=new Date(d);start.setDate(d.getDate()-day);const z=n=>String(n).padStart(2,'0'),iso=x=>`${x.getFullYear()}-${z(x.getMonth()+1)}-${z(x.getDate())}`;from=iso(start);to=todayISO()}if(kind==='month'){const r=monthRange(todayISO());from=r.from;to=r.to}if(kind==='previous-month'){const r=previousMonthRange(todayISO());from=r.from;to=r.to}if(kind==='year'){from=`${now.getFullYear()}-01-01`;to=`${now.getFullYear()}-12-31`}document.getElementById('reportsFrom').value=from;document.getElementById('reportsTo').value=to;renderReports()}
document.querySelectorAll('[data-report-period]').forEach(b=>b.addEventListener('click',()=>setReportPeriod(b.dataset.reportPeriod)));
function csvEscape(v){const x=String(v??'');return /[",\n]/.test(x)?`"${x.replace(/"/g,'""')}"`:x}
function downloadText(filename,text){const blob=new Blob(['\ufeff'+text],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function exportFinanceCsv(){const from=document.getElementById('reportsFrom').value||'',to=document.getElementById('reportsTo').value||'',f=periodFinancials(from,to),lines=[['Reporte M&N Gift'],['Desde',from||'Inicio'],['Hasta',to||'Hoy'],[],['Resumen','COP'],['Ventas',f.revenue],['Costo de ventas',f.cost],['Gastos',f.expense],['Ganancia neta',f.net],['Dinero cobrado',f.collected],[],['Pagos','Fecha','Método','Tipo','Monto']];f.payments.forEach(p=>lines.push(['',p.date,p.method,p.kind,p.amount]));lines.push([],['Cuentas por cobrar','Cliente','Entrega','Total','Pagado','Saldo']);state.orders.filter(o=>o.status!=='Cancelado'&&orderBalance(o)>0).forEach(o=>lines.push(['',getCustomer(o.customerId)?.name||o.customerName||'',o.deliveryDate,o.total,paidAmountForOrder(o),orderBalance(o)]));downloadText(`MN_Gift_reporte_${from||'inicio'}_${to||'hoy'}.csv`,lines.map(r=>r.map(csvEscape).join(',')).join('\n'))}
document.getElementById('exportFinanceCsv')?.addEventListener('click',exportFinanceCsv);document.getElementById('printFinanceReport')?.addEventListener('click',()=>window.print());
if(document.getElementById('cashCloseDate'))document.getElementById('cashCloseDate').value=todayISO();



// ============================================================
// BLOQUE PRODUCCIÓN Y PLANIFICACIÓN — desarrollo V.MN.0.0.007
// ============================================================
function getProductionJob(id){return state.productionJobs.find(j=>j.id===id)}
function productionJobForOrder(orderId){return state.productionJobs.find(j=>j.orderId===orderId)}
function productionReservationsForJob(jobId){return state.productionReservations.filter(r=>r.productionJobId===jobId)}
function productionJobIsActive(job){return !!job&&!['Entregado','Cancelado'].includes(job.status)}
function productionStatusClass(status){return String(status||'').toLowerCase().replaceAll(' ','-').replaceAll('ó','o')}
function productionDateBefore(date,days=1){const d=dateAtNoon(date)||new Date();d.setDate(d.getDate()-days);const z=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`}
function productionRequirementsForOrder(order){const rows=normalizedOrderItems(order).map(i=>{const p=getProduct(i.productId);return p?buildConsumption(p,num(i.quantity)):[]});return combineConsumptions(rows).filter(x=>num(x.quantity)>0)}
function orderProductsWithoutRecipe(order){return normalizedOrderItems(order).filter(i=>{const p=getProduct(i.productId);return !p||!normalizedRecipe(p).length})}
function replaceProductionReservations(job,order){
  const reqs=productionRequirementsForOrder(order);state.productionReservations=state.productionReservations.filter(r=>r.productionJobId!==job.id);
  reqs.forEach(r=>state.productionReservations.push({id:crypto.randomUUID(),productionJobId:job.id,orderId:order.id,materialId:r.materialId,materialName:r.materialName||getMaterial(r.materialId)?.name||'Material',unit:r.unit||getMaterial(r.materialId)?.unit||'',quantity:num(r.quantity),unitCost:num(r.unitCost||materialUnitCost(getMaterial(r.materialId)))}));
  job.reservedAt=new Date().toISOString();job.updatedAt=new Date().toISOString();return reqs;
}
function productionAllocation(){
  const remaining=new Map(state.materials.map(m=>[m.id,num(m.available)])),byJob=new Map();
  const jobs=state.productionJobs.filter(productionJobIsActive).sort((a,b)=>{const oa=getOrder(a.orderId),ob=getOrder(b.orderId),da=a.scheduledDate||oa?.deliveryDate||'9999-12-31',db=b.scheduledDate||ob?.deliveryDate||'9999-12-31';return da.localeCompare(db)||(a.createdAt||'').localeCompare(b.createdAt||'')});
  jobs.forEach(job=>{const rows=[],shortages=[];productionReservationsForJob(job.id).forEach(r=>{const available=Math.max(0,num(remaining.get(r.materialId))),need=num(r.quantity),allocated=Math.min(available,need),shortage=Math.max(0,need-allocated);remaining.set(r.materialId,Math.max(0,available-allocated));const row={...r,availableBefore:available,allocated,shortage};rows.push(row);if(shortage>1e-9)shortages.push(row)});byJob.set(job.id,{rows,shortages,ok:shortages.length===0&&rows.length>0})});
  return {remaining,byJob};
}
function productionMaterialCommitments(){
  const map=new Map();state.productionJobs.filter(productionJobIsActive).forEach(j=>productionReservationsForJob(j.id).forEach(r=>{const m=getMaterial(r.materialId),x=map.get(r.materialId)||{materialId:r.materialId,name:r.materialName||m?.name||'Material',unit:r.unit||m?.unit||'',reserved:0,stock:num(m?.available),supplierId:m?.preferredSupplierId||null};x.reserved+=num(r.quantity);x.stock=num(m?.available);map.set(r.materialId,x)}));
  return [...map.values()].map(x=>({...x,free:Math.max(0,x.stock-x.reserved),shortage:Math.max(0,x.reserved-x.stock)})).sort((a,b)=>b.shortage-a.shortage||b.reserved-a.reserved);
}
function productionJobSummary(job,allocation=productionAllocation()){
  const entry=allocation.byJob.get(job?.id)||{rows:[],shortages:[],ok:false};return {requirements:entry.rows,shortages:entry.shortages,ok:entry.ok};
}
function productionNextButton(job){
  if(!job||['Entregado','Cancelado','Terminado'].includes(job.status))return'';
  const next=job.status==='Pendiente'?'Preparando':job.status==='Preparando'?'Fabricando':'Terminado';
  const label=next==='Preparando'?'Preparar':next==='Fabricando'?'Iniciar fabricación':'Marcar terminado';
  const cls=next==='Terminado'?'production-done':'production-next';return `<button type="button" class="action-btn ${cls}" data-production-next="${job.id}" data-next-status="${next}">${label}</button>`;
}
function productionActions(order,job){
  if(!job)return `<div class="production-actions"><button type="button" class="action-btn production" data-plan-production="${order.id}">Planificar</button></div>`;
  const edit=`<button type="button" class="action-btn production" data-plan-production="${order.id}">Ver / editar</button>`,next=productionNextButton(job),cancel=isBusinessAdmin()&&!['Fabricando','Terminado','Entregado'].includes(job.status)?`<button type="button" class="action-btn delete" data-cancel-production="${job.id}">Cancelar plan</button>`:'';
  return `<div class="production-actions">${edit}${next}${cancel}</div>`;
}
function productionVisibleRows(){
  const from=document.getElementById('productionFrom')?.value||'',to=document.getElementById('productionTo')?.value||'',status=document.getElementById('productionStatus')?.value||'';
  const rows=[];state.orders.filter(o=>o.status!=='Cancelado'&&!o.saleId).forEach(o=>{const job=productionJobForOrder(o.id),date=job?.scheduledDate||o.deliveryDate||o.orderDate,st=job?.status||'Sin planificar';if(inRange(date,from,to)&&(!status||status===st))rows.push({order:o,job,date,status:st})});
  state.productionJobs.filter(j=>['Entregado','Cancelado'].includes(j.status)).forEach(job=>{const o=getOrder(job.orderId);if(!o)return;const date=job.scheduledDate||o.deliveryDate||o.orderDate;if(inRange(date,from,to)&&(!status||status===job.status))rows.push({order:o,job,date,status:job.status})});
  return rows.sort((a,b)=>(a.date||'').localeCompare(b.date||''));
}
function renderProductionWeek(){
  const box=document.getElementById('productionWeek');if(!box)return;const today=dateAtNoon(todayISO()),fmt=new Intl.DateTimeFormat('es-CO',{weekday:'short',day:'numeric',month:'short'}),cards=[];
  for(let i=0;i<7;i++){const d=new Date(today);d.setDate(today.getDate()+i);const z=n=>String(n).padStart(2,'0'),iso=`${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`,jobs=state.productionJobs.filter(j=>productionJobIsActive(j)&&(j.scheduledDate||getOrder(j.orderId)?.deliveryDate)===iso);cards.push(`<div class="production-day ${i===0?'today':''}"><strong>${escapeHtml(fmt.format(d))}</strong><span>${jobs.length} ${jobs.length===1?'plan':'planes'}</span><div class="production-day-jobs">${jobs.slice(0,4).map(j=>{const o=getOrder(j.orderId);return `<div class="production-day-job">${escapeHtml(orderProductsText(o)||'Pedido')}</div>`}).join('')}${jobs.length>4?`<div class="production-day-job">+ ${jobs.length-4} más</div>`:''}</div></div>`)}box.innerHTML=cards.join('');
}
function renderProductionToday(allocation){
  const box=document.getElementById('productionTodayList');if(!box)return;const rows=state.productionJobs.filter(j=>productionJobIsActive(j)&&!['Terminado'].includes(j.status)).map(j=>({job:j,order:getOrder(j.orderId)})).filter(x=>x.order&&(x.job.scheduledDate||x.order.deliveryDate||'9999-12-31')<=todayISO()).sort((a,b)=>(a.job.scheduledDate||a.order.deliveryDate||'').localeCompare(b.job.scheduledDate||b.order.deliveryDate||''));
  if(!rows.length){box.innerHTML='<div class="business-alerts-empty"><span>✓</span><div><strong>Producción al día</strong><small>No hay trabajos programados o atrasados para hoy.</small></div></div>';return}
  box.innerHTML=rows.map(({job,order})=>{const c=getCustomer(order.customerId),date=job.scheduledDate||order.deliveryDate,late=date<todayISO(),sum=productionJobSummary(job,allocation);const noRecipe=orderProductsWithoutRecipe(order).length>0||!productionReservationsForJob(job.id).length,materialsOk=sum.ok&&!noRecipe;return `<article class="production-today-card ${late?'overdue':'today'}"><div><strong>${escapeHtml(orderProductsText(order)||'Pedido')}</strong><small>${escapeHtml(c?.name||order.customerName||'Cliente')} · producción ${niceDate(date)} · entrega ${niceDate(order.deliveryDate)}</small></div><div class="${materialsOk?'production-material-ok':'production-material-short'}">${materialsOk?'✓ Materiales cubiertos':noRecipe?'⚠ Producto sin receta':`⚠ ${sum.shortages.length} material(es) con faltante`}</div><div class="production-mini-actions">${productionActions(order,job)}</div></article>`}).join('');
}
function renderProductionMaterials(){
  const rows=productionMaterialCommitments(),tb=document.getElementById('productionMaterialsTable'),empty=document.getElementById('productionMaterialsEmpty');if(!tb)return;tb.innerHTML='';empty.style.display=rows.length?'none':'block';rows.forEach(r=>{const sp=getSupplier(r.supplierId),tr=document.createElement('tr');tr.innerHTML=`<td><strong>${escapeHtml(r.name)}</strong><br><small>${escapeHtml(r.unit)}</small></td><td>${formatQty(r.stock)}</td><td>${formatQty(r.reserved)}</td><td class="${r.free<=0&&r.reserved>0?'production-material-warning':''}">${formatQty(r.free)}</td><td class="${r.shortage>0?'production-material-short':'production-material-ok'}">${r.shortage>0?formatQty(r.shortage):'—'}</td><td>${escapeHtml(sp?.name||'—')}</td>`;tb.appendChild(tr)});
}
function renderProduction(){
  const tb=document.getElementById('productionTable');if(!tb)return;const allocation=productionAllocation(),rows=productionVisibleRows(),empty=document.getElementById('productionEmpty');tb.innerHTML='';empty.style.display=rows.length?'none':'block';
  rows.forEach(({order:o,job,date,status})=>{const c=getCustomer(o.customerId),sum=job?productionJobSummary(job,allocation):null,tr=document.createElement('tr'),matText=!job?'Sin reserva':(orderProductsWithoutRecipe(o).length||!productionReservationsForJob(job.id).length)?'Sin receta':sum.ok?'✓ Cubiertos':`⚠ Faltan ${sum.shortages.length}`,units=normalizedOrderItems(o).reduce((s,i)=>s+num(i.quantity),0);tr.innerHTML=`<td>${job?niceDate(date):'<span class="production-material-warning">Sin planificar</span>'}</td><td>${niceDate(o.deliveryDate)}</td><td><strong>${escapeHtml(c?.name||o.customerName||'Cliente')}</strong></td><td>${escapeHtml(orderProductsText(o)||'Pedido')}</td><td>${formatQty(units)}</td><td><span class="production-status-pill ${productionStatusClass(status)}">${escapeHtml(status)}</span></td><td class="${job&&sum?.ok?'production-material-ok':job?'production-material-short':'production-material-warning'}">${matText}</td><td>${productionActions(o,job)}</td>`;tb.appendChild(tr)});
  const active=state.productionJobs.filter(j=>productionJobIsActive(j)),unplanned=state.orders.filter(o=>o.status!=='Cancelado'&&!o.saleId&&!productionJobForOrder(o.id)),due=active.filter(j=>!['Terminado'].includes(j.status)&&(j.scheduledDate||getOrder(j.orderId)?.deliveryDate||'9999-12-31')<=todayISO()),short=active.filter(j=>!productionReservationsForJob(j.id).length||productionJobSummary(j,allocation).shortages.length>0);
  document.getElementById('productionUnplannedCount').textContent=unplanned.length;document.getElementById('productionActiveCount').textContent=active.length;document.getElementById('productionTodayCount').textContent=due.length;document.getElementById('productionShortageCount').textContent=short.length;
  renderProductionToday(allocation);renderProductionWeek();renderProductionMaterials();enhanceMobileTables();
}
function renderProductionRequirementsPreview(orderId){
  const box=document.getElementById('productionRequirementsPreview');if(!box)return;const order=getOrder(orderId),job=productionJobForOrder(orderId),withoutRecipe=orderProductsWithoutRecipe(order),reqs=job&&productionReservationsForJob(job.id).length?productionReservationsForJob(job.id):productionRequirementsForOrder(order);if(!reqs.length){box.innerHTML='<div class="business-alerts-empty"><span>⚠</span><div><strong>Productos sin receta</strong><small>Agrega materiales a la receta de los productos antes de reservar la producción.</small></div></div>';return}
  const otherReserved=mid=>state.productionJobs.filter(j=>productionJobIsActive(j)&&j.id!==job?.id).reduce((sum,j)=>sum+productionReservationsForJob(j.id).filter(r=>r.materialId===mid).reduce((a,r)=>a+num(r.quantity),0),0);
  box.innerHTML=(withoutRecipe.length?`<div class="production-requirement short"><div><strong>⚠ ${withoutRecipe.length} producto(s) sin receta</strong><small>${escapeHtml(withoutRecipe.map(i=>i.productName||getProduct(i.productId)?.name||'Producto').join(', '))}</small></div><div class="req-number"><span>Acción</span><strong class="production-material-short">Completar receta</strong></div></div>`:'')+reqs.map(r=>{const m=getMaterial(r.materialId),stock=num(m?.available),other=otherReserved(r.materialId),free=Math.max(0,stock-other),need=num(r.quantity),short=Math.max(0,need-free);return `<div class="production-requirement ${short>0?'short':''}"><div><strong>${escapeHtml(r.materialName||m?.name||'Material')}</strong><small>${short>0?`Faltan ${formatQty(short)} ${escapeHtml(r.unit||m?.unit||'')}`:'Disponible para reservar'}</small></div><div class="req-number"><span>Necesario</span><strong>${formatQty(need)}</strong></div><div class="req-number"><span>Libre antes</span><strong>${formatQty(free)}</strong></div><div class="req-number"><span>Resultado</span><strong class="${short>0?'production-material-short':'production-material-ok'}">${short>0?'Faltante':'Cubierto'}</strong></div></div>`}).join('');
}
function openProductionPlanner(orderId){
  const o=getOrder(orderId);if(!o||o.status==='Cancelado'||o.saleId)return;const items=normalizedOrderItems(o);if(!items.length||items.some(i=>!getProduct(i.productId))){alert('Uno o más productos de este pedido ya no existen. Revisa el pedido antes de planificar la producción.');return}const job=productionJobForOrder(orderId),f=document.getElementById('productionForm');f.reset();f.elements.orderId.value=o.id;f.elements.scheduledDate.value=job?.scheduledDate||productionDateBefore(o.deliveryDate||todayISO(),1);f.elements.status.value=['Pendiente','Preparando','Fabricando','Terminado'].includes(job?.status)?job.status:'Pendiente';f.elements.notes.value=job?.notes||'';document.getElementById('productionModalTitle').textContent=job?'Editar plan de producción':'Planificar producción';document.getElementById('productionSubmitBtn').textContent=job?'Guardar cambios':'Guardar plan y reservar materiales';document.getElementById('productionOrderTarget').innerHTML=`<strong>${escapeHtml(orderProductsText(o))}</strong> · ${escapeHtml(getCustomer(o.customerId)?.name||o.customerName||'Cliente')}<br><small>Entrega: ${niceDate(o.deliveryDate)}</small>`;renderProductionRequirementsPreview(orderId);openModal('productionModal');
}
function setProductionStatus(job,next){
  if(!job||!['Pendiente','Preparando','Fabricando','Terminado'].includes(next))return;const o=getOrder(job.orderId);if(!o)return;const sum=productionJobSummary(job),missingRecipes=orderProductsWithoutRecipe(o);if(['Fabricando','Terminado'].includes(next)&&(missingRecipes.length||!productionReservationsForJob(job.id).length||sum.shortages.length)){alert('No puedes avanzar esta producción porque faltan materiales o el producto no tiene una receta válida. Revisa Materiales / Inventario.');return}
  job.status=next;job.updatedAt=new Date().toISOString();if(next==='Preparando'||next==='Fabricando')o.status='En elaboración';if(next==='Terminado')o.status='Listo';save();renderAll();
}
function cancelProductionPlan(jobId){const job=getProductionJob(jobId);if(!job||!requireBusinessAdmin())return;if(['Fabricando','Terminado','Entregado'].includes(job.status)){alert('Este plan ya avanzó a fabricación. No se puede cancelar desde aquí; ajusta primero el pedido y el inventario si corresponde.');return}if(!confirm('¿Cancelar este plan de producción? Los materiales reservados volverán a quedar libres.'))return;job.status='Cancelado';job.updatedAt=new Date().toISOString();save();renderAll()}
function productionAlerts(){const allocation=productionAllocation(),alerts=[];state.productionJobs.filter(j=>productionJobIsActive(j)).forEach(j=>{const o=getOrder(j.orderId),label=orderProductsText(o)||'Pedido',sum=productionJobSummary(j,allocation),date=j.scheduledDate||o?.deliveryDate;if(orderProductsWithoutRecipe(o).length||!productionReservationsForJob(j.id).length)alerts.push({level:'critical',icon:'🧰',title:`Producción sin receta · ${label}`,detail:'El producto no tiene materiales reservados. Revisa su receta antes de fabricar.',section:'production'});else if(sum.shortages.length)alerts.push({level:'critical',icon:'🧰',title:`Producción con faltantes · ${label}`,detail:`${sum.shortages.length} material(es) no alcanzan para la reserva.`,section:'production'});if(date&&date<=todayISO()&&!['Terminado'].includes(j.status))alerts.push({level:date<todayISO()?'critical':'warning',icon:'🛠️',title:date<todayISO()?'Producción atrasada':'Producción programada para hoy',detail:`${label} · ${j.status}.`,section:'production'})});const unplanned=state.orders.filter(o=>o.status!=='Cancelado'&&!o.saleId&&!productionJobForOrder(o.id)&&dayDifference(o.deliveryDate)!==null&&dayDifference(o.deliveryDate)<=2);if(unplanned.length)alerts.push({level:'warning',icon:'📋',title:`${unplanned.length} pedido(s) próximos sin planificar`,detail:'Tienen entrega en los próximos 2 días y todavía no reservan materiales.',section:'production'});return alerts}
const businessAlertsBeforeProduction=businessAlerts;businessAlerts=function(){const all=[...businessAlertsBeforeProduction(),...productionAlerts()],weight={critical:0,warning:1,info:2};return all.sort((a,b)=>weight[a.level]-weight[b.level])};
const orderActionsBeforeProduction=orderActions;
orderActions=function(o){
  const deleteBtn=isBusinessAdmin()?`<button type="button" class="action-btn delete" data-delete-order="${o.id}">Eliminar</button>`:'';
  if(o.saleId)return `<div class="row-actions"><span class="action-state">✓ Venta creada</span>${deleteBtn}</div>`;
  const payBtn=o.status!=='Cancelado'&&orderBalance(o)>0?`<button type="button" class="action-btn payment" data-pay-order="${o.id}">+ Abono</button>`:'';
  const prodBtn=o.status!=='Cancelado'?`<button type="button" class="action-btn production" data-plan-production="${o.id}">Producción</button>`:'';
  const refundBtn=canRefundCancelledOrder(o)?`<button type="button" class="action-btn refund" data-refund-order="${o.id}">↩ Devolver dinero</button>`:(o.status==='Cancelado'&&refundedAmountForOrder(o)>0?`<span class="action-state">✓ Dinero devuelto</span>`:'');
  if(!isBusinessAdmin())return `<div class="row-actions">${prodBtn}${payBtn}${refundBtn}${o.status!=='Cancelado'?`<button type="button" class="action-btn convert" data-convert-order="${o.id}">Pasar a venta</button>`:''}<button type="button" class="action-btn edit" data-edit-order="${o.id}">Editar</button></div>`;
  return `<div class="row-actions">${prodBtn}${payBtn}${refundBtn}${o.status!=='Cancelado'?`<button type="button" class="action-btn convert" data-convert-order="${o.id}">Pasar a venta</button>`:''}<button type="button" class="action-btn edit" data-edit-order="${o.id}">Editar</button>${deleteBtn}</div>`;
};
const convertOrderToSaleBeforeProduction=convertOrderToSale;convertOrderToSale=function(id){const o=getOrder(id),before=o?.saleId;convertOrderToSaleBeforeProduction(id);if(o&&!before&&o.saleId){const job=productionJobForOrder(id);if(job){job.status='Entregado';job.updatedAt=new Date().toISOString();job.completedAt=new Date().toISOString();save();renderAll()}}};

// Protege pedidos que ya están en fabricación/terminados y conserva la reserva si se edita un pedido temprano.
const productionOrderForm=document.getElementById('orderForm');
productionOrderForm?.addEventListener('submit',e=>{const id=editing.order||'',f=e.currentTarget;f.dataset.productionEditingOrder=id;if(!id)return;const job=productionJobForOrder(id);if(!job)return;const d=Object.fromEntries(new FormData(f)),old=getOrder(id);if(['Fabricando','Terminado'].includes(job.status)){const changedProduct=orderItemsSignature(draftOrderItems)!==orderItemsSignature(normalizedOrderItems(old));if(changedProduct||d.status==='Cancelado'){e.preventDefault();e.stopImmediatePropagation();alert('Este pedido ya está en fabricación o terminado. No puedes cambiar los productos, las cantidades ni cancelarlo desde Pedidos.');}}},true);
productionOrderForm?.addEventListener('submit',e=>{if(e.defaultPrevented)return;const id=e.currentTarget.dataset.productionEditingOrder;delete e.currentTarget.dataset.productionEditingOrder;if(!id)return;const job=productionJobForOrder(id),o=getOrder(id);if(!job||!o)return;if(o.status==='Cancelado'&&!['Fabricando','Terminado','Entregado'].includes(job.status)){job.status='Cancelado';job.updatedAt=new Date().toISOString()}else if(['Pendiente','Preparando'].includes(job.status)){replaceProductionReservations(job,o)}save();renderAll()});

// Guarda el vínculo de la producción al revertir una venta, para volver el plan a Terminado.
document.addEventListener('click',e=>{const t=e.target.closest('[data-delete-sale]');if(!t)return;const sale=state.sales.find(x=>x.id===t.dataset.deleteSale);if(sale?.orderId)t.dataset.productionOrderId=sale.orderId},true);
document.addEventListener('click',e=>{const t=e.target.closest('[data-delete-sale]');if(t?.dataset.productionOrderId){const job=productionJobForOrder(t.dataset.productionOrderId);if(job&&!state.sales.some(s=>s.orderId===t.dataset.productionOrderId)){job.status='Terminado';job.updatedAt=new Date().toISOString();save();renderAll()}delete t.dataset.productionOrderId}},false);

// Impide borrar un pedido con un plan activo desde el manejador anterior.
// La eliminación completa de un pedido también libera su plan y reservas de producción.
// No se bloquea aquí: deleteOrderWithFullRollback() se encarga de revertir todo de forma controlada.

document.getElementById('productionForm')?.addEventListener('submit',e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget)),o=getOrder(d.orderId);if(!o)return;let job=productionJobForOrder(o.id);if(!job){job={id:crypto.randomUUID(),orderId:o.id,scheduledDate:d.scheduledDate,status:'Pendiente',notes:d.notes?.trim()||'',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};state.productionJobs.push(job);replaceProductionReservations(job,o)}else{job.scheduledDate=d.scheduledDate;job.notes=d.notes?.trim()||'';if(['Pendiente','Preparando'].includes(job.status))replaceProductionReservations(job,o)}const desired=d.status||job.status;if(['Fabricando','Terminado'].includes(desired)){const sum=productionJobSummary(job),missingRecipes=orderProductsWithoutRecipe(o);if(missingRecipes.length||!productionReservationsForJob(job.id).length||sum.shortages.length){alert('No se puede guardar ese estado: faltan materiales o el producto no tiene receta. El plan quedó guardado como Pendiente/Preparando.');job.status=['Preparando'].includes(job.status)?'Preparando':'Pendiente';save();renderAll();return}}job.status=desired;if(desired==='Preparando'||desired==='Fabricando')o.status='En elaboración';if(desired==='Terminado')o.status='Listo';job.updatedAt=new Date().toISOString();save();renderAll();closeModal('productionModal')});
document.getElementById('productionScheduledDate')?.addEventListener('change',()=>{const id=document.getElementById('productionForm')?.elements.orderId.value;if(id)renderProductionRequirementsPreview(id)});
['productionFrom','productionTo','productionStatus'].forEach(id=>document.getElementById(id)?.addEventListener('change',renderProduction));
document.getElementById('clearProductionFilter')?.addEventListener('click',()=>{document.getElementById('productionFrom').value='';document.getElementById('productionTo').value='';document.getElementById('productionStatus').value='';renderProduction()});
document.getElementById('productionRefreshBtn')?.addEventListener('click',()=>{renderProduction();renderBusinessAlerts()});
document.addEventListener('click',e=>{const t=e.target.closest('[data-plan-production],[data-production-next],[data-cancel-production]');if(!t)return;if(t.dataset.planProduction){openProductionPlanner(t.dataset.planProduction);return}if(t.dataset.productionNext){setProductionStatus(getProductionJob(t.dataset.productionNext),t.dataset.nextStatus);return}if(t.dataset.cancelProduction){cancelProductionPlan(t.dataset.cancelProduction);return}});




// ===== Revisión Inventario 03: imprimir / guardar lista de reposición =====
function inventoryReorderItems(){
  return state.materials
    .filter(m=>num(m.available)<=0||(num(m.minimumStock)>0&&num(m.available)<=num(m.minimumStock)))
    .sort((a,b)=>num(a.available)-num(b.available)||(a.name||'').localeCompare(b.name||'','es',{sensitivity:'base'}));
}
function inventoryReorderRows(){
  return inventoryReorderItems().map(m=>{
    const s=getSupplier(m.preferredSupplierId);
    return {
      material:m.name||'Material',
      available:num(m.available),
      minimum:num(m.minimumStock),
      unit:m.unit||'',
      status:num(m.available)<=0?'Agotado':'Stock bajo',
      supplier:s?.name||'Sin proveedor preferido',
      phone:s?.phone||''
    };
  });
}
function printInventoryReorderList(){
  const rows=inventoryReorderRows();
  if(!rows.length){alert('No hay materiales pendientes de reposición para imprimir.');return}
  const popup=window.open('','_blank','width=920,height=720');
  if(!popup){alert('El navegador bloqueó la ventana de impresión. Permite ventanas emergentes para M&N Gift e inténtalo nuevamente.');return}
  const generated=new Date().toLocaleString('es-CO',{dateStyle:'long',timeStyle:'short'});
  const tableRows=rows.map(r=>`<tr><td><strong>${escapeHtml(r.material)}</strong></td><td>${escapeHtml(r.status)}</td><td>${formatQty(r.available)} ${escapeHtml(r.unit)}</td><td>${formatQty(r.minimum)} ${escapeHtml(r.unit)}</td><td>${escapeHtml(r.supplier)}${r.phone?`<br><small>${escapeHtml(r.phone)}</small>`:''}</td></tr>`).join('');
  popup.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Lista de reposición - M&N Gift</title><style>body{font-family:Arial,sans-serif;color:#2f2025;margin:32px}h1{margin:0;font-size:24px}p{color:#6f6267;margin:6px 0 22px}table{width:100%;border-collapse:collapse}th,td{padding:11px 10px;border-bottom:1px solid #ddd;text-align:left;font-size:13px}th{background:#f6eef1;text-transform:uppercase;font-size:11px}small{color:#6f6267}.footer{margin-top:22px;font-size:11px;color:#777}@media print{body{margin:12mm}}</style></head><body><h1>M&N Gift · Lista de reposición</h1><p>Generada: ${escapeHtml(generated)} · ${rows.length} material(es) por reponer</p><table><thead><tr><th>Material</th><th>Estado</th><th>Disponible</th><th>Stock mínimo</th><th>Proveedor</th></tr></thead><tbody>${tableRows}</tbody></table><div class="footer">Desde el cuadro de impresión puedes seleccionar “Guardar como PDF”.</div><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),150));<\/script></body></html>`);
  popup.document.close();
}
function downloadInventoryReorderList(){
  const rows=inventoryReorderRows();
  if(!rows.length){alert('No hay materiales pendientes de reposición para guardar.');return}
  const lines=[['M&N Gift - Lista de reposición'],['Generada',new Date().toLocaleString('es-CO')],[],['Material','Estado','Disponible','Unidad','Stock mínimo','Proveedor','Teléfono']];
  rows.forEach(r=>lines.push([r.material,r.status,r.available,r.unit,r.minimum,r.supplier,r.phone]));
  downloadText(`MN_Gift_lista_reposicion_${todayISO()}.csv`,lines.map(row=>row.map(csvEscape).join(',')).join('\n'));
}
document.getElementById('printInventoryReorder')?.addEventListener('click',printInventoryReorderList);
document.getElementById('downloadInventoryReorder')?.addEventListener('click',downloadInventoryReorderList);

// La inicialización se realiza desde cloud.js después de validar la sesión de Supabase.
