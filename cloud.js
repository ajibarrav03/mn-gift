/*
  M&N Gift — conexión Supabase
  Versión de desarrollo: V.MN.0.0.006
  Esta clave es PUBLISHABLE y puede vivir en el frontend.
  Nunca incluir service_role o sb_secret_ en este archivo.
*/

const SUPABASE_URL = 'https://xmhoufvoocnksovdljhg.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_zcp4v072LJ3ZfFd8VtzX_Q_H3Sj0i33';

const cloud = {
  client: null,
  session: null,
  profile: null,
  ready: false,
  syncing: false,
  pendingSync: false,
  syncTimer: null,
  categoryMap: new Map(),
  lastError: null,
  pendingChanges: false,
  lastRemoteChangeAt: null,
  retryTimer: null,
  autoPullTimer: null
};

// app.js declara estos objetos/funciones en el mismo contexto global.
titles.users = ['Usuarios', 'Administración de acceso de M&N Gift'];

const saveLocal = save;
save = function saveWithCloudSync(){
  saveLocal();
  cloud.pendingChanges = true;
  updateSyncDetails();
  scheduleCloudSync();
};

function setCloudBadge(mode, text){
  const badge = document.getElementById('cloudSyncBadge');
  const label = document.getElementById('cloudSyncText');
  const settingsStatus = document.getElementById('settingsCloudStatus');
  if (badge){
    badge.classList.remove('synced','syncing','error');
    if (mode) badge.classList.add(mode);
  }
  if (label) label.textContent = text;
  if (settingsStatus){
    settingsStatus.textContent = text;
    settingsStatus.classList.toggle('sync-error', mode === 'error');
    settingsStatus.classList.toggle('sync-warning', mode === 'syncing');
  }
}


function updateSyncDetails(){
  const lastSync = document.getElementById('settingsLastSync');
  const pending = document.getElementById('settingsPendingChanges');
  const stored = localStorage.getItem('mngifts_last_cloud_sync');
  if (lastSync){
    lastSync.textContent = stored ? new Date(stored).toLocaleString('es-CO') : 'Todavía no';
  }
  if (pending){
    pending.textContent = cloud.pendingChanges ? 'Sí' : 'No';
    pending.classList.toggle('sync-warning', cloud.pendingChanges);
  }
}

const remoteStampTables = [
  'categories','suppliers','materials','products','product_materials','purchases','expenses','clients','orders','sales','payments','cash_closures','inventory_movements','production_jobs','production_reservations'
];

async function getRemoteChangeStamp(){
  if (!cloud.client || !cloud.session?.user) return null;
  const stamps = await Promise.all(remoteStampTables.map(async table=>{
    const { data, error } = await cloud.client.from(table).select('updated_at').order('updated_at',{ascending:false}).limit(1);
    if (error) throw new Error(`${table}: ${error.message}`);
    return data?.[0]?.updated_at || null;
  }));
  const times = stamps.filter(Boolean).map(x=>new Date(x).getTime()).filter(Number.isFinite);
  if (!times.length) return null;
  return new Date(Math.max(...times)).toISOString();
}

function remoteIsNewer(remoteStamp){
  if (!remoteStamp || !cloud.lastRemoteChangeAt) return false;
  return new Date(remoteStamp).getTime() > new Date(cloud.lastRemoteChangeAt).getTime() + 1000;
}

function scheduleSyncRetry(){
  clearTimeout(cloud.retryTimer);
  if (!cloud.ready || !cloud.pendingChanges) return;
  cloud.retryTimer = setTimeout(()=>{
    if (navigator.onLine !== false) syncAllToCloud();
  }, 12000);
}

async function reloadFromCloud({confirmDiscard=true}={}){
  if (!cloud.session?.user) return;
  if (cloud.pendingChanges && confirmDiscard){
    const ok = confirm('Hay cambios locales que todavía no se han sincronizado.\n\n¿Deseas descartarlos y recargar la versión más reciente de Supabase?');
    if (!ok) return;
    emergencyLocalSnapshot('before_cloud_reload');
  }
  setCloudBadge('syncing','Recargando nube…');
  const bundle = await fetchCloudBundle();
  applyCloudBundle(bundle);
  cloud.pendingChanges = false;
  cloud.lastRemoteChangeAt = await getRemoteChangeStamp();
  updateSyncDetails();
  setCloudBadge('synced','Sincronizado');
}

function showAuthMessage(message, success=false){
  const el = document.getElementById('authMessage');
  if (!el) return;
  el.textContent = message || '';
  el.classList.toggle('success', !!success);
}

function setAppVisible(visible){
  document.getElementById('authScreen')?.classList.toggle('hidden', visible);
  document.getElementById('appShell')?.classList.toggle('auth-locked', !visible);
}

function humanRole(role){
  return ({superadmin:'Superadmin',admin:'Administrador',user:'Usuario'})[role] || role || 'Usuario';
}

function updateIdentityUI(){
  const p = cloud.profile;
  const email = cloud.session?.user?.email || '';
  const name = p?.full_name?.trim() || email || 'Usuario';
  const role = humanRole(p?.role);
  const nameEl = document.getElementById('currentUserName');
  const roleEl = document.getElementById('currentUserRole');
  const chip = document.getElementById('userChip');
  const nav = document.getElementById('usersNavBtn');
  const settingsUser = document.getElementById('settingsCloudUser');
  if (nameEl) nameEl.textContent = name;
  if (roleEl) roleEl.textContent = role;
  if (settingsUser) settingsUser.textContent = `${email} · ${role}`;
  chip?.classList.toggle('superadmin', p?.role === 'superadmin');
  if (nav) nav.hidden = p?.role !== 'superadmin';
  if (typeof applyRoleUI === 'function') applyRoleUI();
}

function localBusinessHasData(){
  return ['materials','products','sales','purchases','expenses','customers','orders','suppliers','inventoryMovements','productionJobs','productionReservations','customCategories']
    .some(k => Array.isArray(state[k]) && state[k].length > 0);
}

function emergencyLocalSnapshot(label='precloud'){
  try {
    localStorage.setItem(`mngifts_${label}_backup`, JSON.stringify({
      exportedAt: new Date().toISOString(),
      version: 'V.MN.0.0.006',
      data: {
        materials: state.materials,
        products: state.products,
        sales: state.sales,
        purchases: state.purchases,
        expenses: state.expenses,
        customers: state.customers,
        orders: state.orders,
        payments: state.payments,
        cashClosures: state.cashClosures,
        suppliers: state.suppliers,
        inventoryMovements: state.inventoryMovements,
        productionJobs: state.productionJobs,
        productionReservations: state.productionReservations,
        customCategories: state.customCategories
      }
    }));
  } catch (_) {}
}

async function getProfile(userId){
  const { data, error } = await cloud.client.from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return data;
}

async function authenticateSession(session){
  cloud.session = session;
  if (!session?.user){
    cloud.profile = null;
    cloud.ready = false;
    setAppVisible(false);
    updateIdentityUI();
    setCloudBadge('error','Sin sesión');
    return;
  }

  setCloudBadge('syncing','Validando usuario…');
  const profile = await getProfile(session.user.id);
  if (!profile?.is_active){
    await cloud.client.auth.signOut();
    showAuthMessage('Tu acceso a M&N Gift está bloqueado. Contacta al Superadmin.');
    setAppVisible(false);
    return;
  }

  cloud.profile = profile;
  updateIdentityUI();
  setAppVisible(true);

  // Registra el último acceso mediante la función segura. Si todavía no está
  // desplegada, el inicio de sesión y el resto de la app siguen funcionando.
  invokeAdminFunction('touch_login').catch(()=>{});

  await initializeBusinessData();
  cloud.ready = true;
  if(cloud.pendingChanges)scheduleCloudSync(500);
  startAutomaticCloudRefresh();
  setCloudBadge('synced','Sincronizado automáticamente');
  updateSyncDetails();
  if (profile.role === 'superadmin') await renderUsersAdmin();

  if (profile.must_change_password){
    showPasswordChangeModal(true);
  }
}

async function fetchBusiness(table){
  const { data, error } = await cloud.client.from(table).select('*');
  if (error) throw new Error(`${table}: ${error.message}`);
  return data || [];
}

async function fetchCloudBundle(){
  const tables = [
    'categories','suppliers','materials','products','product_materials','purchases','expenses',
    'clients','orders','order_items','sales','sale_items','sale_material_usage','payments','cash_closures','inventory_movements','production_jobs','production_reservations'
  ];
  const values = await Promise.all(tables.map(fetchBusiness));
  return Object.fromEntries(tables.map((t,i)=>[t,values[i]]));
}

function cloudBundleHasData(b){
  return ['materials','products','purchases','expenses','clients','orders','sales','payments','cash_closures','suppliers','inventory_movements','production_jobs','production_reservations'].some(k => (b[k]||[]).length);
}

function applyCloudBundle(b){
  state.suppliers=(b.suppliers||[]).map(x=>({id:x.id,name:x.name,contactName:x.contact_name||'',phone:x.phone||'',city:x.city||'',notes:x.notes||''}));
  const categoryById = new Map((b.categories||[]).map(c=>[c.id,c.name]));
  const materialByIdDb = new Map((b.materials||[]).map(m=>[m.id,m]));
  const purchaseSums = new Map();
  (b.purchases||[]).forEach(p=>{
    const x = purchaseSums.get(p.material_id) || {qty:0,cost:0};
    x.qty += num(p.quantity); x.cost += num(p.total_cost); purchaseSums.set(p.material_id,x);
  });

  state.materials = (b.materials||[]).map(m=>{
    const totals = purchaseSums.get(m.id) || {qty:num(m.stock),cost:num(m.stock)*num(m.average_unit_cost)};
    return {
      id:m.id, name:m.name, unit:m.unit,
      quantity:totals.qty, cost:totals.cost,
      available:num(m.stock), avgUnitCost:num(m.average_unit_cost),
      totalPurchased:totals.qty, totalSpent:totals.cost,
      minimumStock:num(m.minimum_stock), preferredSupplierId:m.preferred_supplier_id||null,
      notes:m.notes||''
    };
  });

  const recipeByProduct = new Map();
  (b.product_materials||[]).forEach(r=>{
    if(!recipeByProduct.has(r.product_id)) recipeByProduct.set(r.product_id,[]);
    recipeByProduct.get(r.product_id).push({materialId:r.material_id,quantity:num(r.quantity)});
  });

  state.products = (b.products||[]).map(p=>({
    id:p.id, name:p.name, category:categoryById.get(p.category_id)||'',
    recipe:recipeByProduct.get(p.id)||[], laborCost:num(p.labor_cost),
    extraCost:num(p.other_cost)+num(p.packaging_cost), targetMargin:num(p.desired_margin),
    price:num(p.sale_price), active:p.active !== false
  }));
  state.products.forEach(p=>{p.cost=calculateProductCost(p)});

  const materialName = id => materialByIdDb.get(id)?.name || getMaterial(id)?.name || 'Material';
  const materialUnit = id => materialByIdDb.get(id)?.unit || getMaterial(id)?.unit || '';
  state.purchases = (b.purchases||[]).map(p=>({
    id:p.id, materialId:p.material_id, materialName:materialName(p.material_id), unit:materialUnit(p.material_id),
    quantity:num(p.quantity), cost:num(p.total_cost), date:p.purchase_date, paymentMethod:p.payment_method||'Otro', supplierId:p.supplier_id||null, note:p.notes||p.supplier||''
  }));
  state.expenses = (b.expenses||[]).map(x=>({id:x.id,category:x.category,description:x.description,amount:num(x.amount),date:x.expense_date,paymentMethod:x.payment_method||'Otro'}));

  state.customers = (b.clients||[]).map(c=>({id:c.id,name:c.name,phone:c.phone||'',location:c.city||'',notes:c.notes||''}));
  const customerMap = new Map(state.customers.map(c=>[c.id,c]));
  const orderItemsByOrder = new Map();
  (b.order_items||[]).forEach(i=>{if(!orderItemsByOrder.has(i.order_id))orderItemsByOrder.set(i.order_id,[]);orderItemsByOrder.get(i.order_id).push(i)});
  const salesByOrder = new Map((b.sales||[]).filter(s=>s.order_id).map(s=>[s.order_id,s.id]));
  state.orders = (b.orders||[]).map(o=>{
    const dbItems=orderItemsByOrder.get(o.id)||[],items=dbItems.map(i=>({id:i.id,productId:i.product_id||'',productName:i.product_name||'Producto',quantity:num(i.quantity||1)})),first=items[0]||{},c=customerMap.get(o.client_id);
    return {
      id:o.id, customerId:o.client_id||'', customerName:c?.name||'', customerPhone:c?.phone||'',items,
      productId:first.productId||'', productName:first.productName||'Producto', quantity:items.reduce((sum,i)=>sum+num(i.quantity),0),
      orderDate:o.order_date, deliveryDate:o.delivery_date||o.order_date,
      total:num(o.total), deposit:num(o.advance_payment), status:o.status, notes:o.notes||'',
      saleId:salesByOrder.get(o.id)||null
    };
  });

  const saleItemsBySale = new Map();
  (b.sale_items||[]).forEach(i=>{if(!saleItemsBySale.has(i.sale_id))saleItemsBySale.set(i.sale_id,[]);saleItemsBySale.get(i.sale_id).push(i)});
  const usageBySaleItem = new Map();
  (b.sale_material_usage||[]).forEach(u=>{
    if(!usageBySaleItem.has(u.sale_item_id)) usageBySaleItem.set(u.sale_item_id,[]);
    usageBySaleItem.get(u.sale_item_id).push({
      materialId:u.material_id||'', materialName:u.material_name||materialName(u.material_id),
      unit:materialUnit(u.material_id), quantity:num(u.quantity_used), unitCost:num(u.unit_cost)
    });
  });
  const productMap = new Map(state.products.map(p=>[p.id,p]));
  state.sales = (b.sales||[]).map(s=>{
    const dbItems=saleItemsBySale.get(s.id)||[],items=dbItems.map(i=>{const p=productMap.get(i.product_id);return{id:i.id,productId:i.product_id||'',productName:i.product_name||'Producto',productCategory:p?.category||'',quantity:num(i.quantity||1),unitPrice:num(i.unit_price),unitCost:num(i.unit_cost),consumption:usageBySaleItem.get(i.id)||[]}}),first=items[0]||{},consumption=combineConsumptions(items.map(i=>i.consumption));
    return {
      id:s.id, orderId:s.order_id||null, customerId:s.client_id||null,
      customerName:customerMap.get(s.client_id)?.name||'', productId:first.productId||'',
      productName:items.length>1?`${first.productName||'Producto'} + ${items.length-1} más`:(first.productName||'Producto'), productCategory:first.productCategory||'', quantity:items.reduce((sum,i)=>sum+num(i.quantity),0),
      date:s.sale_date, unitPrice:items.length===1?num(first.unitPrice):0, total:num(s.total), unitCost:items.length===1?num(first.unitCost):0,
      cost:num(s.total_cost), paymentMethod:s.payment_method||'Otro', items, consumption
    };
  });

  state.payments=(b.payments||[]).map(p=>({id:p.id,orderId:p.order_id||null,saleId:p.sale_id||null,date:p.payment_date,amount:num(p.amount),method:p.method||'Otro',kind:p.kind||'Pago',note:p.notes||''}));
  state.cashClosures=(b.cash_closures||[]).map(x=>({id:x.id,date:x.closure_date,openingCash:num(x.opening_cash),expectedCash:num(x.expected_cash),countedCash:num(x.counted_cash),difference:num(x.difference),notes:x.notes||'',closedAt:x.closed_at||x.updated_at||x.created_at}));
  state.inventoryMovements=(b.inventory_movements||[]).map(x=>({id:x.id,materialId:x.material_id||'',materialName:x.material_name||materialName(x.material_id),unit:x.unit||materialUnit(x.material_id),date:x.movement_date,kind:x.movement_type,delta:num(x.quantity_delta),unitCost:num(x.unit_cost),note:x.notes||'',sourceType:x.source_type||'adjustment',sourceId:x.source_id||null,stockAfter:x.stock_after===null?null:num(x.stock_after)}));
  state.productionJobs=(b.production_jobs||[]).map(x=>({id:x.id,orderId:x.order_id,scheduledDate:x.scheduled_date,status:x.status||'Pendiente',notes:x.notes||'',createdAt:x.created_at,updatedAt:x.updated_at,completedAt:x.completed_at||null}));
  state.productionReservations=(b.production_reservations||[]).map(x=>({id:x.id,productionJobId:x.production_job_id,orderId:x.order_id,materialId:x.material_id||'',materialName:x.material_name||materialName(x.material_id),unit:x.unit||materialUnit(x.material_id),quantity:num(x.quantity_required),unitCost:num(x.unit_cost)}));
  state.orders.forEach(o=>{o.deposit=paidAmountForOrder(o)});

  const allCategoryNames = (b.categories||[]).map(c=>c.name).filter(Boolean);
  state.customCategories = [...new Set(allCategoryNames.filter(n=>!fixedCategories.includes(n)))];
  const financeMigrated=migrateFinanceData();
  saveLocal();
  cloud.pendingChanges = financeMigrated;
  updateSyncDetails();
  migrateV7();
  renderAll();
}

async function initializeBusinessData(){
  setCloudBadge('syncing','Cargando datos…');
  const bundle = await fetchCloudBundle();
  const cloudHas = cloudBundleHasData(bundle);
  const localHas = localBusinessHasData();

  if (!cloudHas && localHas && ['superadmin','admin'].includes(cloud.profile?.role)){
    const upload = confirm('Encontré datos guardados en este navegador y tu nube está vacía.\n\n¿Quieres subir estos datos a Supabase ahora?\n\nAceptar = subirlos a la nube.\nCancelar = iniciar con la nube vacía (se guardará una copia local de emergencia).');
    if (upload){
      cloud.ready = true;
      await syncAllToCloud(true);
      const refreshed = await fetchCloudBundle();
      applyCloudBundle(refreshed);
      return;
    }
    emergencyLocalSnapshot('precloud');
  } else if (!cloudHas && localHas){
    // Un Usuario normal nunca migra una copia local completa porque podría
    // contener costos o catálogos que no tiene permiso de administrar.
    emergencyLocalSnapshot('precloud_user');
  } else if (cloudHas && localHas){
    emergencyLocalSnapshot('precloud');
  }

  applyCloudBundle(bundle);
  cloud.lastRemoteChangeAt = await getRemoteChangeStamp();
  cloud.pendingChanges = false;
  updateSyncDetails();
}

async function ensureCategories(){
  const uid = cloud.session.user.id;
  const desiredNames = [...new Set([
    ...state.customCategories,
    ...state.products.map(p=>p.category).filter(Boolean)
  ])];
  const { data: existing, error } = await cloud.client.from('categories').select('id,name,user_id');
  if (error) throw error;
  const byLower = new Map((existing||[]).map(c=>[String(c.name).toLowerCase(),c]));
  for (const name of desiredNames){
    const key=String(name).toLowerCase();
    if (!byLower.has(key)){
      const { data, error:insErr } = await cloud.client.from('categories').insert({user_id:uid,name}).select('id,name').single();
      if (insErr) throw insErr;
      byLower.set(key,data);
    }
  }
  cloud.categoryMap = new Map([...byLower].map(([k,v])=>[k,v.id]));
  return {desiredNames,existing:existing||[]};
}

async function upsertRows(table, rows){
  if (!rows.length) return;
  const { error } = await cloud.client.from(table).upsert(rows,{onConflict:'id'});
  if (error) throw new Error(`${table}: ${error.message}`);
}

async function deleteMissing(table, desiredIds){
  const { data, error } = await cloud.client.from(table).select('id');
  if (error) throw new Error(`${table}: ${error.message}`);
  const keep = new Set(desiredIds);
  const remove = (data||[]).map(x=>x.id).filter(id=>!keep.has(id));
  if (!remove.length) return;
  const { error:delError } = await cloud.client.from(table).delete().in('id',remove);
  if (delError) throw new Error(`${table}: ${delError.message}`);
}

async function replaceBusinessRows(table, rows){
  const { error:delError } = await cloud.client.from(table).delete().not('id','is',null);
  if (delError) throw new Error(`${table}: ${delError.message}`);
  if (!rows.length) return;
  const { error } = await cloud.client.from(table).insert(rows);
  if (error) throw new Error(`${table}: ${error.message}`);
}

async function syncOperationalUserToCloud(uid){
  // Rol Usuario: clientes y pedidos pueden crearse/editarse, las ventas solo
  // se crean y el stock se actualiza. No se tocan costos, compras, gastos,
  // categorías, recetas ni se elimina historial.
  const {data:cats,error:catErr}=await cloud.client.from('categories').select('id,name');
  if(catErr) throw new Error(`categories: ${catErr.message}`);
  cloud.categoryMap=new Map((cats||[]).map(c=>[String(c.name||'').toLowerCase(),c.id]));

  const clients=state.customers.map(c=>({id:c.id,user_id:uid,name:c.name,phone:c.phone||null,city:c.location||null,notes:c.notes||null}));
  const orders=state.orders.map(o=>({id:o.id,user_id:uid,client_id:o.customerId||null,order_date:o.orderDate||todayISO(),delivery_date:o.deliveryDate||null,status:o.status||'Pendiente',total:num(o.total),advance_payment:Math.min(paidAmountForOrder(o),num(o.total)),notes:o.notes||null,converted_to_sale:!!o.saleId}));
  await upsertRows('clients',clients);
  await upsertRows('orders',orders);

  for(const m of state.materials){
    const {error}=await cloud.client.from('materials').update({stock:num(m.available)}).eq('id',m.id);
    if(error) throw new Error(`materials: ${error.message}`);
  }

  const orderItems=[];state.orders.forEach(o=>normalizedOrderItems(o).forEach(i=>orderItems.push({id:i.id,user_id:uid,order_id:o.id,product_id:i.productId||null,product_name:i.productName||getProduct(i.productId)?.name||'Producto',quantity:Math.max(1,Math.round(num(i.quantity)||1)),unit_price:orderItemUnitPrice(o,i),unit_cost:calculateProductCost(getProduct(i.productId))})));
  await upsertRows('order_items',orderItems);
  await deleteMissing('order_items',orderItems.map(x=>x.id));

  const {data:existingSales,error:salesErr}=await cloud.client.from('sales').select('id');
  if(salesErr) throw new Error(`sales: ${salesErr.message}`);
  const existingSaleIds=new Set((existingSales||[]).map(x=>x.id));
  const newSalesState=state.sales.filter(s=>!existingSaleIds.has(s.id));
  if(newSalesState.length){
    const sales=newSalesState.map(s=>({id:s.id,user_id:uid,client_id:s.customerId||null,order_id:s.orderId||null,sale_date:s.date||todayISO(),total:num(s.total),total_cost:num(s.cost),payment_method:s.paymentMethod||paymentForSale(s.id)?.method||'Otro',notes:null}));
    const {error}=await cloud.client.from('sales').insert(sales);
    if(error) throw new Error(`sales: ${error.message}`);

    const saleItems=[];newSalesState.forEach(s=>normalizedSaleItems(s).forEach(i=>saleItems.push({id:i.id,user_id:uid,sale_id:s.id,product_id:i.productId||null,product_name:i.productName||getProduct(i.productId)?.name||'Producto',quantity:Math.max(1,Math.round(num(i.quantity)||1)),unit_price:num(i.unitPrice),unit_cost:num(i.unitCost)})));
    const {error:itemErr}=await cloud.client.from('sale_items').insert(saleItems);
    if(itemErr) throw new Error(`sale_items: ${itemErr.message}`);

    const usages=[];
    newSalesState.forEach(s=>normalizedSaleItems(s).forEach(i=>{const itemUsage=i.consumption?.length?i.consumption:(normalizedSaleItems(s).length===1?s.consumption||[]:[]);itemUsage.forEach(u=>usages.push({user_id:uid,sale_item_id:i.id,material_id:u.materialId||null,material_name:u.materialName||getMaterial(u.materialId)?.name||'Material',quantity_used:num(u.quantity),unit_cost:num(u.unitCost)||materialUnitCost(getMaterial(u.materialId))}))}));
    if(usages.length){
      const {error:usageErr}=await cloud.client.from('sale_material_usage').insert(usages);
      if(usageErr) throw new Error(`sale_material_usage: ${usageErr.message}`);
    }
  }
  const {data:existingPayments,error:paymentErr}=await cloud.client.from('payments').select('id');
  if(paymentErr)throw new Error(`payments: ${paymentErr.message}`);
  const existingPaymentIds=new Set((existingPayments||[]).map(x=>x.id));
  const newPayments=state.payments.filter(p=>!existingPaymentIds.has(p.id)).map(p=>({id:p.id,user_id:uid,order_id:p.orderId||null,sale_id:p.saleId||null,payment_date:p.date||todayISO(),amount:num(p.amount),method:p.method||'Otro',kind:p.kind||'Pago',notes:p.note||null}));
  if(newPayments.length){const {error}=await cloud.client.from('payments').insert(newPayments);if(error)throw new Error(`payments: ${error.message}`)}
  const {data:existingMoves,error:moveErr}=await cloud.client.from('inventory_movements').select('id');
  if(moveErr)throw new Error(`inventory_movements: ${moveErr.message}`);
  const existingMoveIds=new Set((existingMoves||[]).map(x=>x.id));
  const newMoves=state.inventoryMovements.filter(x=>!existingMoveIds.has(x.id)).map(x=>({id:x.id,user_id:uid,material_id:x.materialId||null,material_name:x.materialName||getMaterial(x.materialId)?.name||'Material',unit:x.unit||getMaterial(x.materialId)?.unit||'',movement_date:x.date||todayISO(),movement_type:x.kind||'sale',quantity_delta:num(x.delta),unit_cost:num(x.unitCost),stock_after:x.stockAfter===null||x.stockAfter===undefined?null:num(x.stockAfter),source_type:x.sourceType||'sale',source_id:x.sourceId||null,notes:x.note||null}));
  if(newMoves.length){const {error}=await cloud.client.from('inventory_movements').insert(newMoves);if(error)throw new Error(`inventory_movements: ${error.message}`)}

  const productionJobs=state.productionJobs.map(j=>({id:j.id,user_id:uid,order_id:j.orderId,scheduled_date:j.scheduledDate||getOrder(j.orderId)?.deliveryDate||todayISO(),status:j.status||'Pendiente',notes:j.notes||null,completed_at:j.completedAt||null}));
  await upsertRows('production_jobs',productionJobs);
  const productionReservations=state.productionReservations.map(r=>({id:r.id,user_id:uid,production_job_id:r.productionJobId,order_id:r.orderId||getProductionJob(r.productionJobId)?.orderId,material_id:r.materialId||null,material_name:r.materialName||getMaterial(r.materialId)?.name||'Material',unit:r.unit||getMaterial(r.materialId)?.unit||'',quantity_required:num(r.quantity),unit_cost:num(r.unitCost)}));
  await upsertRows('production_reservations',productionReservations);
  await deleteMissing('production_reservations',productionReservations.map(x=>x.id));

}

async function syncAllToCloud(force=false){
  if (!cloud.session?.user || (!cloud.ready && !force)) return;
  if (cloud.syncing){ cloud.pendingSync=true; return; }
  cloud.syncing=true; cloud.pendingSync=false; setCloudBadge('syncing','Sincronizando…');
  const uid=cloud.session.user.id;
  try{
    if (!force && !cloud.pendingChanges){
      const remoteStamp = await getRemoteChangeStamp();
      if (remoteIsNewer(remoteStamp)){
        const latest = await fetchCloudBundle();
        applyCloudBundle(latest);
        cloud.lastRemoteChangeAt = remoteStamp;
        setCloudBadge('synced','Actualizado desde la nube');
      } else {
        cloud.lastRemoteChangeAt = remoteStamp || cloud.lastRemoteChangeAt;
        setCloudBadge('synced','Sincronizado');
      }
      updateSyncDetails();
      return;
    }

    if (!force){
      const remoteStamp = await getRemoteChangeStamp();
      if (remoteIsNewer(remoteStamp)){
        emergencyLocalSnapshot('sync_conflict');
        cloud.lastError = new Error('Hay cambios más recientes en Supabase realizados desde otra sesión.');
        setCloudBadge('error','Cambios nuevos en la nube');
        updateSyncDetails();
        return;
      }
    }

    const businessAdmin=['superadmin','admin'].includes(cloud.profile?.role);
    if(!businessAdmin){
      await syncOperationalUserToCloud(uid);
      cloud.lastError=null;
      cloud.pendingChanges=false;
      localStorage.setItem('mngifts_last_cloud_sync',new Date().toISOString());
      cloud.lastRemoteChangeAt=await getRemoteChangeStamp();
      setCloudBadge('synced','Sincronizado automáticamente');
      updateSyncDetails();
      return;
    }

    const {desiredNames,existing:existingCategories}=await ensureCategories();
    const categoryId = name => cloud.categoryMap.get(String(name||'').toLowerCase()) || null;

    const suppliers=state.suppliers.map(x=>({id:x.id,user_id:uid,name:x.name,contact_name:x.contactName||null,phone:x.phone||null,city:x.city||null,notes:x.notes||null}));
    const materials=state.materials.map(m=>({id:m.id,user_id:uid,name:m.name,unit:m.unit,stock:num(m.available),minimum_stock:num(m.minimumStock),average_unit_cost:materialUnitCost(m),preferred_supplier_id:m.preferredSupplierId||null,notes:m.notes||null}));
    const clients=state.customers.map(c=>({id:c.id,user_id:uid,name:c.name,phone:c.phone||null,city:c.location||null,notes:c.notes||null}));
    const products=state.products.map(p=>({id:p.id,user_id:uid,category_id:categoryId(p.category),name:p.name,labor_cost:num(p.laborCost),packaging_cost:0,other_cost:num(p.extraCost),desired_margin:num(p.targetMargin),sale_price:num(p.price),active:p.active!==false,notes:null}));
    const orders=state.orders.map(o=>({id:o.id,user_id:uid,client_id:o.customerId||null,order_date:o.orderDate||todayISO(),delivery_date:o.deliveryDate||null,status:o.status||'Pendiente',total:num(o.total),advance_payment:Math.min(paidAmountForOrder(o),num(o.total)),notes:o.notes||null,converted_to_sale:!!o.saleId}));
    const sales=state.sales.map(s=>({id:s.id,user_id:uid,client_id:s.customerId||null,order_id:s.orderId||null,sale_date:s.date||todayISO(),total:num(s.total),total_cost:num(s.cost),payment_method:s.paymentMethod||paymentForSale(s.id)?.method||'Otro',notes:null}));
    const expenses=state.expenses.map(x=>({id:x.id,user_id:uid,expense_date:x.date||todayISO(),category:x.category,description:x.description,amount:num(x.amount),payment_method:x.paymentMethod||'Otro',notes:null}));
    const purchases=state.purchases.map(x=>({id:x.id,user_id:uid,material_id:x.materialId,purchase_date:x.date||todayISO(),quantity:num(x.quantity),total_cost:num(x.cost),payment_method:x.paymentMethod||'Otro',supplier_id:x.supplierId||null,supplier:getSupplier(x.supplierId)?.name||null,notes:x.note||null}));
    const payments=state.payments.map(p=>({id:p.id,user_id:uid,order_id:p.orderId||null,sale_id:p.saleId||null,payment_date:p.date||todayISO(),amount:num(p.amount),method:p.method||'Otro',kind:p.kind||'Pago',notes:p.note||null}));
    const cashClosures=state.cashClosures.map(x=>({id:x.id,user_id:uid,closure_date:x.date||todayISO(),opening_cash:num(x.openingCash),expected_cash:num(x.expectedCash),counted_cash:num(x.countedCash),difference:num(x.difference),notes:x.notes||null,closed_at:x.closedAt||new Date().toISOString()}));
    const inventoryMovements=state.inventoryMovements.map(x=>({id:x.id,user_id:uid,material_id:x.materialId||null,material_name:x.materialName||getMaterial(x.materialId)?.name||'Material',unit:x.unit||getMaterial(x.materialId)?.unit||'',movement_date:x.date||todayISO(),movement_type:x.kind||'adjustment',quantity_delta:num(x.delta),unit_cost:num(x.unitCost),stock_after:x.stockAfter===null||x.stockAfter===undefined?null:num(x.stockAfter),source_type:x.sourceType||'adjustment',source_id:x.sourceId||null,notes:x.note||null}));
    const productionJobs=state.productionJobs.map(j=>({id:j.id,user_id:uid,order_id:j.orderId,scheduled_date:j.scheduledDate||getOrder(j.orderId)?.deliveryDate||todayISO(),status:j.status||'Pendiente',notes:j.notes||null,completed_at:j.completedAt||null}));
    const productionReservations=state.productionReservations.map(r=>({id:r.id,user_id:uid,production_job_id:r.productionJobId,order_id:r.orderId||getProductionJob(r.productionJobId)?.orderId,material_id:r.materialId||null,material_name:r.materialName||getMaterial(r.materialId)?.name||'Material',unit:r.unit||getMaterial(r.materialId)?.unit||'',quantity_required:num(r.quantity),unit_cost:num(r.unitCost)}));

    // Primero crear/actualizar padres para satisfacer FKs.
    await upsertRows('suppliers',suppliers);
    await upsertRows('materials',materials);
    await upsertRows('clients',clients);
    await upsertRows('products',products);
    await upsertRows('orders',orders);
    await upsertRows('sales',sales);
    await upsertRows('expenses',expenses);
    await upsertRows('purchases',purchases);
    await upsertRows('payments',payments);
    await upsertRows('cash_closures',cashClosures);
    await upsertRows('inventory_movements',inventoryMovements);
    await upsertRows('production_jobs',productionJobs);
    await upsertRows('production_reservations',productionReservations);

    const recipes=[];
    state.products.forEach(p=>normalizedRecipe(p).forEach(r=>recipes.push({user_id:uid,product_id:p.id,material_id:r.materialId,quantity:num(r.quantity)})));
    await replaceBusinessRows('product_materials',recipes);

    const orderItems=[];state.orders.forEach(o=>normalizedOrderItems(o).forEach(i=>orderItems.push({id:i.id,user_id:uid,order_id:o.id,product_id:i.productId||null,product_name:i.productName||getProduct(i.productId)?.name||'Producto',quantity:Math.max(1,Math.round(num(i.quantity)||1)),unit_price:orderItemUnitPrice(o,i),unit_cost:calculateProductCost(getProduct(i.productId))})));
    await replaceBusinessRows('order_items',orderItems);

    // El uso histórico depende de sale_items, por eso se reemplaza en este orden.
    await replaceBusinessRows('sale_material_usage',[]);
    const saleItems=[];state.sales.forEach(s=>normalizedSaleItems(s).forEach(i=>saleItems.push({id:i.id,user_id:uid,sale_id:s.id,product_id:i.productId||null,product_name:i.productName||getProduct(i.productId)?.name||'Producto',quantity:Math.max(1,Math.round(num(i.quantity)||1)),unit_price:num(i.unitPrice),unit_cost:num(i.unitCost)})));
    await replaceBusinessRows('sale_items',saleItems);
    const usages=[];
    state.sales.forEach(s=>normalizedSaleItems(s).forEach(i=>{const itemUsage=i.consumption?.length?i.consumption:(normalizedSaleItems(s).length===1?s.consumption||[]:[]);itemUsage.forEach(u=>usages.push({user_id:uid,sale_item_id:i.id,material_id:u.materialId||null,material_name:u.materialName||getMaterial(u.materialId)?.name||'Material',quantity_used:num(u.quantity),unit_cost:num(u.unitCost)||materialUnitCost(getMaterial(u.materialId))}))}));
    if (usages.length){
      const {error}=await cloud.client.from('sale_material_usage').insert(usages);
      if(error) throw new Error(`sale_material_usage: ${error.message}`);
    }

    // Eliminar registros que ya no existen localmente (después de actualizar hijos).
    await deleteMissing('payments',payments.map(x=>x.id));
    await deleteMissing('cash_closures',cashClosures.map(x=>x.id));
    await deleteMissing('inventory_movements',inventoryMovements.map(x=>x.id));
    await deleteMissing('production_reservations',productionReservations.map(x=>x.id));
    await deleteMissing('production_jobs',productionJobs.map(x=>x.id));
    await deleteMissing('purchases',purchases.map(x=>x.id));
    await deleteMissing('expenses',expenses.map(x=>x.id));
    await deleteMissing('sales',sales.map(x=>x.id));
    await deleteMissing('orders',orders.map(x=>x.id));
    await deleteMissing('products',products.map(x=>x.id));
    await deleteMissing('clients',clients.map(x=>x.id));
    await deleteMissing('materials',materials.map(x=>x.id));
    await deleteMissing('suppliers',suppliers.map(x=>x.id));

    const desiredLower=new Set(desiredNames.map(x=>String(x).toLowerCase()));
    const removeCats=(existingCategories||[]).filter(c=>!desiredLower.has(String(c.name).toLowerCase())).map(c=>c.id);
    if(removeCats.length){
      const {error}=await cloud.client.from('categories').delete().in('id',removeCats);
      if(error) throw new Error(`categories: ${error.message}`);
    }

    cloud.lastError=null;
    cloud.pendingChanges=false;
    localStorage.setItem('mngifts_last_cloud_sync',new Date().toISOString());
    cloud.lastRemoteChangeAt = await getRemoteChangeStamp();
    setCloudBadge('synced','Sincronizado automáticamente');
    updateSyncDetails();
  }catch(err){
    console.error('Error de sincronización Supabase:',err);
    cloud.lastError=err;
    setCloudBadge('error', navigator.onLine === false ? 'Sin conexión · cambios pendientes' : 'Error de sincronización');
    updateSyncDetails();
    scheduleSyncRetry();
  }finally{
    cloud.syncing=false;
    if(cloud.pendingSync){cloud.pendingSync=false;scheduleCloudSync(250)}
  }
}

function scheduleCloudSync(delay=300){
  if(!cloud.ready) return;
  clearTimeout(cloud.syncTimer);
  if(navigator.onLine === false){
    setCloudBadge('error','Sin conexión · cambios pendientes');
    updateSyncDetails();
    return;
  }
  cloud.syncTimer=setTimeout(()=>syncAllToCloud(),delay);
}

function startAutomaticCloudRefresh(){
  clearInterval(cloud.autoPullTimer);
  // Los cambios locales se suben al guardar. Este ciclo solo comprueba
  // periódicamente si otro dispositivo/usuario publicó cambios nuevos.
  cloud.autoPullTimer=setInterval(async()=>{
    if(!cloud.ready || !cloud.session?.user || navigator.onLine===false || cloud.syncing) return;
    try{
      const remoteStamp=await getRemoteChangeStamp();
      if(!remoteStamp) return;
      if(!cloud.pendingChanges && remoteIsNewer(remoteStamp)){
        const latest=await fetchCloudBundle();
        applyCloudBundle(latest);
        cloud.lastRemoteChangeAt=remoteStamp;
        localStorage.setItem('mngifts_last_cloud_sync',new Date().toISOString());
        setCloudBadge('synced','Actualizado automáticamente');
        updateSyncDetails();
      }
    }catch(err){
      console.warn('Comprobación automática de nube:',err);
    }
  },12000);
}


function randomTemporaryPassword(){
  const upper='ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower='abcdefghijkmnopqrstuvwxyz';
  const nums='23456789';
  const symbols='!@#$%*_-';
  const all=upper+lower+nums+symbols;
  const randomIndex=max=>{const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]%max};
  const pick=str=>str[randomIndex(str.length)];
  const chars=[pick(upper),pick(lower),pick(nums),pick(symbols)];
  while(chars.length<14) chars.push(pick(all));
  for(let i=chars.length-1;i>0;i--){const j=randomIndex(i+1);[chars[i],chars[j]]=[chars[j],chars[i]]}
  return chars.join('');
}

async function functionErrorMessage(error){
  let message=error?.message||'Error al ejecutar la función administrativa.';
  try{
    if(error?.context?.json){
      const body=await error.context.json();
      message=body?.error||body?.message||message;
    }
  }catch(_){ }
  if(/Failed to send a request|not found|FunctionsFetchError|404/i.test(message)){
    return 'La Edge Function “admin-users” todavía no está desplegada o no se pudo contactar. Revisa el archivo INSTRUCCIONES_EDGE_FUNCTION.txt incluido en el proyecto.';
  }
  return message;
}

async function invokeAdminFunction(action,payload={}){
  if(!cloud.client) throw new Error('Supabase todavía no está conectado.');
  const {data,error}=await cloud.client.functions.invoke('admin-users',{body:{action,...payload}});
  if(error) throw new Error(await functionErrorMessage(error));
  if(data?.error) throw new Error(data.error);
  return data||{};
}

function auditActionLabel(action){
  return ({
    user_created:'Usuario creado',
    user_blocked:'Usuario bloqueado',
    user_unblocked:'Usuario desbloqueado',
    user_role_changed:'Rol modificado',
    user_temp_password:'Contraseña temporal',
    user_deleted:'Usuario eliminado'
  })[action]||action||'Acción administrativa';
}

function auditDetailText(row){
  const d=row?.details||{};
  if(row.action==='user_created') return `${humanRole(d.role)}${d.force_change?' · cambio de clave obligatorio':''}`;
  if(row.action==='user_role_changed') return `Nuevo rol: ${humanRole(d.role)}`;
  if(row.action==='user_blocked') return 'Inicio de sesión bloqueado';
  if(row.action==='user_unblocked') return 'Acceso restaurado';
  if(row.action==='user_temp_password') return d.force_change?'Deberá cambiar la contraseña al ingresar':'Contraseña actualizada';
  if(row.action==='user_deleted') return 'Cuenta eliminada; el historial comercial se conserva';
  return Object.keys(d).length?JSON.stringify(d):'—';
}

async function renderAdminAudit(){
  if(cloud.profile?.role!=='superadmin') return;
  const tbody=document.getElementById('adminAuditTable'),empty=document.getElementById('adminAuditEmpty');
  if(!tbody) return;
  const {data,error}=await cloud.client.from('admin_audit_log').select('id,actor_user_id,target_user_id,action,details,created_at').order('created_at',{ascending:false}).limit(30);
  if(error){tbody.innerHTML=`<tr><td colspan="4">${escapeHtml(error.message)}</td></tr>`;return}
  const ids=[...new Set((data||[]).flatMap(x=>[x.actor_user_id,x.target_user_id]).filter(Boolean))];
  let profileMap=new Map();
  if(ids.length){
    const {data:profiles}=await cloud.client.from('profiles').select('id,email,full_name').in('id',ids);
    profileMap=new Map((profiles||[]).map(x=>[x.id,x]));
  }
  tbody.innerHTML='';
  if(empty) empty.style.display=data?.length?'none':'block';
  (data||[]).forEach(row=>{
    const target=profileMap.get(row.target_user_id);
    const targetLabel=target?.full_name||target?.email||row.details?.target_email||row.details?.target_user_id||'Usuario eliminado';
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${new Date(row.created_at).toLocaleString('es-CO')}</td><td><strong>${escapeHtml(auditActionLabel(row.action))}</strong></td><td>${escapeHtml(targetLabel)}</td><td class="admin-audit-detail">${escapeHtml(auditDetailText(row))}</td>`;
    tbody.appendChild(tr);
  });
}

async function renderUsersAdmin(){
  if(cloud.profile?.role!=='superadmin') return;
  const tbody=document.getElementById('usersTable'),empty=document.getElementById('usersEmpty');
  if(!tbody) return;
  tbody.innerHTML='<tr><td colspan="6">Cargando usuarios…</td></tr>';
  const {data,error}=await cloud.client.from('profiles').select('id,email,full_name,role,is_active,must_change_password,last_login_at,created_at').order('created_at',{ascending:true});
  if(error){tbody.innerHTML=`<tr><td colspan="6">${escapeHtml(error.message)}</td></tr>`;return}
  tbody.innerHTML=''; if(empty) empty.style.display=data?.length?'none':'block';
  (data||[]).forEach(u=>{
    const self=u.id===cloud.session.user.id;
    const tr=document.createElement('tr');
    const passwordFlag=u.must_change_password?'<br><small>Debe cambiar contraseña</small>':'';
    tr.innerHTML=`<td><strong>${escapeHtml(u.full_name||u.email)}</strong><br><small>${escapeHtml(u.email)}</small>${passwordFlag}</td>
      <td><select class="user-role-select" data-admin-role="${u.id}" ${self?'disabled':''}><option value="user" ${u.role==='user'?'selected':''}>Usuario</option><option value="admin" ${u.role==='admin'?'selected':''}>Administrador</option><option value="superadmin" ${u.role==='superadmin'?'selected':''}>Superadmin</option></select></td>
      <td><span class="user-status ${u.is_active?'active':'blocked'}">${u.is_active?'Activo':'Bloqueado'}</span></td>
      <td>${new Date(u.created_at).toLocaleDateString('es-CO')}</td>
      <td>${u.last_login_at?new Date(u.last_login_at).toLocaleString('es-CO'):'Nunca'}</td>
      <td><div class="user-action-stack"><button class="action-btn edit" data-admin-reset="${u.id}" data-admin-email="${escapeHtml(u.email)}">Enviar enlace</button><button class="action-btn warning" data-admin-temp="${u.id}" data-admin-email="${escapeHtml(u.email)}">Clave temporal</button>${self?'':'<button class="action-btn '+(u.is_active?'delete':'convert')+'" data-admin-active="'+u.id+'" data-admin-next="'+(!u.is_active)+'">'+(u.is_active?'Bloquear':'Desbloquear')+'</button><button class="action-btn delete" data-admin-delete="'+u.id+'" data-admin-email="'+escapeHtml(u.email)+'">Eliminar</button>'}</div></td>`;
    tbody.appendChild(tr);
  });
  await renderAdminAudit();
}

async function adminSetActive(userId,active){
  const action=active?'desbloquear':'bloquear';
  if(!confirm(`¿Seguro que deseas ${action} este usuario?`)) return;
  try{
    await invokeAdminFunction('set_active',{target_user_id:userId,active});
    await renderUsersAdmin();
  }catch(err){alert(err.message)}
}

async function adminSetRole(userId,role){
  if(!confirm(`¿Cambiar el rol de este usuario a “${humanRole(role)}”?`)){await renderUsersAdmin();return}
  try{
    await invokeAdminFunction('set_role',{target_user_id:userId,role});
    await renderUsersAdmin();
  }catch(err){alert(err.message);await renderUsersAdmin()}
}

async function sendPasswordReset(email){
  if(!email) return;
  if(!confirm(`¿Enviar un correo de restablecimiento de contraseña a ${email}?`)) return;
  const options={};
  if(location.protocol==='https:' || location.protocol==='http:') options.redirectTo=location.origin+location.pathname;
  const {error}=await cloud.client.auth.resetPasswordForEmail(email,options);
  if(error) alert('No se pudo enviar el correo: '+error.message);
  else alert('Se solicitó el correo de restablecimiento de contraseña.');
}

function openTempPasswordModal(userId,email){
  document.getElementById('tempPasswordUserId').value=userId;
  document.getElementById('tempPasswordTarget').innerHTML=`Usuario: <strong>${escapeHtml(email||'')}</strong>`;
  document.getElementById('tempPasswordValue').value=randomTemporaryPassword();
  document.getElementById('tempPasswordForceChange').checked=true;
  document.getElementById('tempPasswordMessage').textContent='';
  openModal('tempPasswordModal');
}

async function adminDeleteUser(userId,email){
  const typed=prompt(`Esta acción elimina la cuenta de ${email}.\n\nLos registros comerciales históricos no se borrarán.\n\nEscribe ELIMINAR para confirmar:`);
  if(typed!=='ELIMINAR') return;
  try{
    await invokeAdminFunction('delete_user',{target_user_id:userId});
    alert('Usuario eliminado. El historial comercial se conservó.');
    await renderUsersAdmin();
  }catch(err){alert(err.message)}
}

function showPasswordChangeModal(forced=false){
  const modal=document.getElementById('passwordRecoveryModal');
  const intro=document.getElementById('passwordRecoveryIntro');
  if(intro) intro.textContent=forced?'Por seguridad debes crear una contraseña nueva antes de continuar usando M&N Gift.':'Escribe y confirma tu nueva contraseña.';
  modal?.classList.toggle('password-forced',forced);
  modal?.classList.add('open');
  document.getElementById('newPassword').value='';
  document.getElementById('confirmNewPassword').value='';
  const msg=document.getElementById('passwordRecoveryMessage'); if(msg){msg.textContent='';msg.classList.remove('success')}
}

async function initCloudApp(){
  initPwa();
  updateSyncDetails();
  if(!window.supabase?.createClient){
    showAuthMessage('No se pudo cargar la conexión con Supabase. Comprueba tu conexión a Internet.');
    setCloudBadge('error','Supabase no disponible');
    return;
  }
  cloud.client=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
  });

  cloud.client.auth.onAuthStateChange((event,session)=>{
    if(event==='PASSWORD_RECOVERY'){
      cloud.session=session;
      showPasswordChangeModal(false);
      return;
    }
    if(event==='SIGNED_OUT'){
      cloud.session=null;cloud.profile=null;cloud.ready=false;setAppVisible(false);updateIdentityUI();
    }
  });

  const {data:{session},error}=await cloud.client.auth.getSession();
  if(error){showAuthMessage(error.message);return}
  if(session){
    try{await authenticateSession(session)}catch(err){console.error(err);showAuthMessage('No se pudo cargar tu perfil: '+err.message);setAppVisible(false)}
  }else{
    setAppVisible(false);setCloudBadge('error','Sin sesión');
  }
}

// ===== Eventos de autenticación / nube =====
document.getElementById('loginForm')?.addEventListener('submit',async e=>{
  e.preventDefault();showAuthMessage('');
  const email=document.getElementById('loginEmail').value.trim();
  const password=document.getElementById('loginPassword').value;
  const btn=document.getElementById('loginBtn'); btn.disabled=true; btn.textContent='Ingresando…';
  try{
    const {data,error}=await cloud.client.auth.signInWithPassword({email,password});
    if(error) throw error;
    await authenticateSession(data.session);
  }catch(err){showAuthMessage(err.message==='Invalid login credentials'?'Correo o contraseña incorrectos.':err.message)}
  finally{btn.disabled=false;btn.textContent='Ingresar'}
});

document.getElementById('logoutBtn')?.addEventListener('click',async()=>{
  if(cloud.pendingChanges){
    await syncAllToCloud();
    if(cloud.pendingChanges){
      const leave=confirm('Todavía hay cambios locales sin sincronizar. Si sales ahora, quedarán guardados solo en este navegador hasta que vuelvas a iniciar sesión.\n\n¿Deseas salir de todas formas?');
      if(!leave) return;
    }
  }
  await cloud.client.auth.signOut();
  location.reload();
});

document.getElementById('forgotPasswordBtn')?.addEventListener('click',async()=>{
  const email=document.getElementById('loginEmail').value.trim();
  if(!email){showAuthMessage('Escribe primero tu correo electrónico.');return}
  const options={};
  if(location.protocol==='https:' || location.protocol==='http:') options.redirectTo=location.origin+location.pathname;
  const {error}=await cloud.client.auth.resetPasswordForEmail(email,options);
  if(error) showAuthMessage(error.message);
  else showAuthMessage('Solicitud enviada. Revisa tu correo para crear una nueva contraseña.',true);
});

document.getElementById('passwordRecoveryForm')?.addEventListener('submit',async e=>{
  e.preventDefault();
  const a=document.getElementById('newPassword').value,b=document.getElementById('confirmNewPassword').value,msg=document.getElementById('passwordRecoveryMessage');
  msg.classList.remove('success');
  if(a!==b){msg.textContent='Las contraseñas no coinciden.';return}
  if(a.length<8){msg.textContent='La contraseña debe tener al menos 8 caracteres.';return}
  const {error}=await cloud.client.auth.updateUser({password:a});
  if(error){msg.textContent=error.message;return}
  try{
    await invokeAdminFunction('complete_password_change');
    if(cloud.profile) cloud.profile.must_change_password=false;
    msg.textContent='Contraseña actualizada correctamente.';msg.classList.add('success');
    setTimeout(()=>{document.getElementById('passwordRecoveryModal').classList.remove('open','password-forced');location.reload()},900);
  }catch(err){
    msg.textContent='La contraseña se cambió, pero no se pudo actualizar el indicador de seguridad: '+err.message;
  }
});

document.getElementById('syncNowBtn')?.addEventListener('click',()=>syncAllToCloud());
document.getElementById('reloadCloudBtn')?.addEventListener('click',()=>reloadFromCloud());
window.addEventListener('online',()=>{
  if(cloud.ready){
    setCloudBadge('syncing','Conexión recuperada…');
    if(cloud.pendingChanges) syncAllToCloud(); else reloadFromCloud({confirmDiscard:false}).catch(console.error);
  }
});
window.addEventListener('offline',()=>{
  if(cloud.ready) setCloudBadge('error',cloud.pendingChanges?'Sin conexión · cambios pendientes':'Sin conexión');
});
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible' && cloud.ready && !cloud.pendingChanges && navigator.onLine!==false){
    reloadFromCloud({confirmDiscard:false}).catch(()=>{});
  }
});
document.getElementById('refreshUsersBtn')?.addEventListener('click',renderUsersAdmin);
document.getElementById('openCreateUserModal')?.addEventListener('click',()=>{
  document.getElementById('createUserForm').reset();
  document.getElementById('createUserForceChange').checked=true;
  document.getElementById('createUserPassword').value=randomTemporaryPassword();
  document.getElementById('createUserMessage').textContent='';
  openModal('createUserModal');
});
document.getElementById('generateCreatePassword')?.addEventListener('click',()=>{document.getElementById('createUserPassword').value=randomTemporaryPassword()});
document.getElementById('generateTempPassword')?.addEventListener('click',()=>{document.getElementById('tempPasswordValue').value=randomTemporaryPassword()});

document.getElementById('createUserForm')?.addEventListener('submit',async e=>{
  e.preventDefault();
  const msg=document.getElementById('createUserMessage'),btn=document.getElementById('createUserSubmit');
  msg.textContent='';msg.classList.remove('success');btn.disabled=true;
  try{
    const data=await invokeAdminFunction('create_user',{
      email:document.getElementById('createUserEmail').value.trim(),
      full_name:document.getElementById('createUserName').value.trim(),
      role:document.getElementById('createUserRole').value,
      password:document.getElementById('createUserPassword').value,
      force_change:document.getElementById('createUserForceChange').checked
    });
    msg.textContent='Usuario creado correctamente.';msg.classList.add('success');
    setTimeout(async()=>{closeModal('createUserModal');await renderUsersAdmin();},600);
  }catch(err){msg.textContent=err.message}
  finally{btn.disabled=false}
});

document.getElementById('tempPasswordForm')?.addEventListener('submit',async e=>{
  e.preventDefault();
  const msg=document.getElementById('tempPasswordMessage'),password=document.getElementById('tempPasswordValue').value;
  msg.textContent='';msg.classList.remove('success');
  if(password.length<8){msg.textContent='La contraseña debe tener al menos 8 caracteres.';return}
  try{
    await invokeAdminFunction('set_temp_password',{target_user_id:document.getElementById('tempPasswordUserId').value,password,force_change:document.getElementById('tempPasswordForceChange').checked});
    msg.textContent='Contraseña temporal asignada correctamente.';msg.classList.add('success');
    setTimeout(async()=>{closeModal('tempPasswordModal');await renderUsersAdmin();},600);
  }catch(err){msg.textContent=err.message}
});

document.addEventListener('change',e=>{
  const target=e.target;
  if(target?.dataset?.adminRole) adminSetRole(target.dataset.adminRole,target.value);
});

document.addEventListener('click',e=>{
  const t=e.target;
  if(t?.dataset?.adminActive) adminSetActive(t.dataset.adminActive,t.dataset.adminNext==='true');
  if(t?.dataset?.adminReset) sendPasswordReset(t.dataset.adminEmail);
  if(t?.dataset?.adminTemp) openTempPasswordModal(t.dataset.adminTemp,t.dataset.adminEmail);
  if(t?.dataset?.adminDelete) adminDeleteUser(t.dataset.adminDelete,t.dataset.adminEmail);
});

window.addEventListener('beforeunload',()=>{ if(cloud.ready) saveLocal(); });

initCloudApp();
