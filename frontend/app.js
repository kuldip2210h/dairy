const API = '';
const authView = document.querySelector('#auth-view');
const appView = document.querySelector('#app-view');
let authMode = 'login';
let customers = [];
let milkRecords = [];
let editingMilkId = null;
let editingCustomerId = null;
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const money = value => Number(value || 0).toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2});
const shortDate = value => { if (!value) return '—'; const date = new Date(`${value}T00:00:00`); return Number.isNaN(date.getTime()) ? esc(value) : date.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}); };
function toast(message, error = false) { const box = document.querySelector('#toast'); box.textContent = message; box.style.background = error ? '#9d3d32' : ''; box.classList.add('show'); setTimeout(() => box.classList.remove('show'), 3000); }
async function api(path, options = {}) {
  const headers = {'Content-Type':'application/json', ...(options.headers || {})};
  const savedSession = sessionStorage.getItem('dairyUser');
  if (savedSession) {
    try {
      const {token} = JSON.parse(savedSession);
      if (token) headers.Authorization = `Bearer ${token}`;
    } catch { sessionStorage.removeItem('dairyUser'); }
  }
  const response = await fetch(`${API}${path}`, {...options, headers});
  let data;
  try { data = await response.json(); } catch { throw new Error('The server returned an unreadable response.'); }
  if (!response.ok) throw new Error(data.detail || data.msg || `Request failed (${response.status})`);
  if (data && !Array.isArray(data) && data.msg && /not found|already exists|invalid/i.test(data.msg)) throw new Error(data.msg);
  return data;
}
function setAuthMode(mode) {
  authMode = mode;
  document.querySelectorAll('[data-auth]').forEach(button => button.classList.toggle('active', button.dataset.auth === mode));
  document.querySelector('#auth-submit').textContent = mode === 'login' ? 'Sign in' : 'Create account';
  document.querySelector('#auth-message').textContent = '';
}
document.querySelectorAll('[data-auth]').forEach(button => button.addEventListener('click', () => setAuthMode(button.dataset.auth)));
document.querySelector('#auth-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = Object.fromEntries(new FormData(event.currentTarget));
  const note = document.querySelector('#auth-message');
  const submit = document.querySelector('#auth-submit');
  submit.disabled = true; note.textContent = '';
  try {
    const result = await api(`/User/${authMode === 'login' ? 'Login' : 'Register'}`, {method:'POST', body:JSON.stringify(form)});
    if (authMode === 'register') {
      setAuthMode('login');
      note.style.color = '#176b45';
      note.textContent = 'Registration successful. Please sign in with your new account.';
      event.currentTarget.reset();
      return;
    }
    if (!result.token) throw new Error(result.msg || 'Could not sign in.');
    sessionStorage.setItem('dairyUser', JSON.stringify({username:form.username, token:result.token})); showApp(form.username);
  } catch (error) { note.style.color = '#b34036'; note.textContent = error.message; }
  finally { submit.disabled = false; }
});
function showApp(username) {
  authView.classList.add('hidden'); appView.classList.remove('hidden');
  document.querySelector('#profile-name').textContent = username;
  document.querySelector('#welcome-name').textContent = username;
  document.querySelector('#today').textContent = new Date().toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
  refreshData();
}
document.querySelector('#logout').addEventListener('click', () => {
  sessionStorage.removeItem('dairyUser');
  appView.classList.add('hidden');
  authView.classList.remove('hidden');
  document.querySelector('.stats-grid').classList.remove('show-private');
  document.querySelector('#milk-stats-toggle').textContent = 'Unlock milk totals';
});
document.querySelector('#milk-stats-toggle').addEventListener('click', () => {
  const stats = document.querySelector('.stats-grid');
  const toggle = document.querySelector('#milk-stats-toggle');
  if (stats.classList.contains('show-private')) {
    stats.classList.remove('show-private');
    toggle.textContent = 'Unlock milk totals';
    return;
  }
  document.querySelector('#milk-stats-password-form').reset();
  document.querySelector('#milk-stats-password-message').textContent = '';
  document.querySelector('#milk-stats-password-dialog').showModal();
});
document.querySelector('#milk-stats-password-form').addEventListener('submit', async event => {
  event.preventDefault();
  const message = document.querySelector('#milk-stats-password-message');
  let session;
  try { session = JSON.parse(sessionStorage.getItem('dairyUser') || '{}'); }
  catch { session = {}; }
  if (!session.username) { message.textContent = 'Please sign in again to unlock these totals.'; return; }
  const submit = event.currentTarget.querySelector('button[type="submit"]');
  submit.disabled = true;
  try {
    const result = await api('/User/Login',{method:'POST',body:JSON.stringify({username:session.username,password:new FormData(event.currentTarget).get('password')})});
    if (!result.token) throw new Error(result.msg || 'Password did not match.');
    document.querySelector('.stats-grid').classList.add('show-private');
    document.querySelector('#milk-stats-toggle').textContent = 'Lock milk totals';
    document.querySelector('#milk-stats-password-dialog').close();
  } catch(error) {
    message.textContent = error.message;
  } finally { submit.disabled = false; }
});
function goPage(name) {
  document.querySelectorAll('.page').forEach(page => page.classList.toggle('active', page.id === `page-${name}`));
  document.querySelectorAll('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.page === name));
  document.querySelector('#crumb').textContent = ({dashboard:'Overview',customers:'Customers',milk:'Milk records'})[name];
  if (name === 'customers') renderCustomers();
  if (name === 'milk') renderMilk();
}
document.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => goPage(button.dataset.page)));
document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => openForm(button.dataset.action)));
function openForm(action) {
  const customerDialog = document.querySelector('#customer-dialog');
  const milkDialog = document.querySelector('#milk-dialog');
  if (action === 'add-customer') {
    editingCustomerId = null;
    const form = document.querySelector('#customer-form'); form.reset();
    form.elements.customer_id.readOnly = false;
    document.querySelector('#customer-dialog-title').textContent = 'Add a customer';
    document.querySelector('#customer-submit').textContent = 'Save customer';
    customerDialog.showModal();
  } else if (action === 'customer-statement') {
    const form = document.querySelector('#statement-form'); form.reset();
    document.querySelector('#statement-customer-suggestions').innerHTML = customers.map(c => `<option value="${esc(c.customer_id)}">${esc(c.name)}</option>`).join('');
    document.querySelector('#statement-results').innerHTML = '';
    document.querySelector('#customer-statement-dialog').showModal();
  } else {
    editingMilkId = null;
    const suggestions = document.querySelector('#customer-id-suggestions');
    suggestions.innerHTML = customers.map(c => `<option value="${esc(c.customer_id)}">${esc(c.name)}</option>`).join('');
    const form = document.querySelector('#milk-form'); form.reset();
    document.querySelector('#milk-dialog-title').textContent = 'Record milk';
    document.querySelector('#milk-submit').textContent = 'Save record';
    form.elements.date.value = new Date().toISOString().slice(0,10);
    form.elements.time.value = new Date().toTimeString().slice(0,5);
    updateMilkCustomerName();
    milkDialog.showModal();
  }
}
function updateMilkCustomerName() {
  const id = document.querySelector('#milk-customer').value.trim().toLowerCase();
  const customer = customers.find(item => String(item.customer_id).trim().toLowerCase() === id);
  const hint = document.querySelector('#milk-customer-name');
  hint.textContent = customer ? `Customer name: ${customer.name}` : (id ? 'Customer ID not found in your customer list; you can still enter it.' : 'Type a customer ID to see their name.');
  hint.classList.toggle('customer-match', Boolean(customer));
}
function editCustomer(id) {
  const customer = customers.find(item => item.customer_id === id);
  if (!customer) { toast('Customer could not be found. Refresh and try again.', true); return; }
  editingCustomerId = id;
  const form = document.querySelector('#customer-form');
  form.elements.customer_id.value = customer.customer_id;
  form.elements.customer_id.readOnly = true;
  form.elements.name.value = customer.name || '';
  form.elements.mobile.value = customer.mobile || '';
  form.elements.address.value = customer.address || '';
  document.querySelector('#customer-dialog-title').textContent = 'Edit customer';
  document.querySelector('#customer-submit').textContent = 'Save changes';
  document.querySelector('#customer-dialog').showModal();
}
function editMilkRecord(id) {
  const record = milkRecords.find(item => item._id === id);
  if (!record) { toast('Milk record could not be found. Refresh and try again.', true); return; }
  editingMilkId = id;
  const suggestions = document.querySelector('#customer-id-suggestions');
  suggestions.innerHTML = customers.map(c => `<option value="${esc(c.customer_id)}">${esc(c.name)}</option>`).join('');
  const form = document.querySelector('#milk-form');
  form.reset();
  for (const key of ['customer_id','date','time','shift','milk_type','liter','fat','snf','rate','total_amount']) {
    form.elements[key].value = record[key] ?? '';
  }
  updateMilkCustomerName();
  document.querySelector('#milk-dialog-title').textContent = 'Edit milk record';
  document.querySelector('#milk-submit').textContent = 'Save changes';
  document.querySelector('#milk-dialog').showModal();
}
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); }));
document.querySelector('#customer-form').addEventListener('submit', async event => {
  event.preventDefault(); const form = Object.fromEntries(new FormData(event.currentTarget));
  try {
    const wasEditing = Boolean(editingCustomerId);
    if (wasEditing) await api(`/Customer/Update/${encodeURIComponent(editingCustomerId)}`,{method:'PUT',body:JSON.stringify(form)});
    else await api('/Customer/Add',{method:'POST',body:JSON.stringify(form)});
    editingCustomerId = null;
    document.querySelector('#customer-dialog').close();
    toast(wasEditing ? 'Customer updated.' : 'Customer added.');
    await refreshData(); goPage('customers');
  }
  catch(error) { toast(error.message,true); }
});
document.querySelector('#statement-form').addEventListener('submit', async event => {
  event.preventDefault();
  const customerId = new FormData(event.currentTarget).get('customer_id').trim();
  const normalizeId = value => String(value || '').trim().toLowerCase();
  let customer = customers.find(item => normalizeId(item.customer_id) === normalizeId(customerId));
  const results = document.querySelector('#statement-results');
  results.innerHTML = '<p class="statement-loading">Loading customer and milk details…</p>';
  if (!customer) {
    try { customer = await api(`/Customer/Get/${encodeURIComponent(customerId)}`); }
    catch { customer = null; }
  }
  const records = milkRecords.filter(item => normalizeId(item.customer_id) === normalizeId(customerId)).sort((a,b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  const litres = records.reduce((sum,item) => sum + Number(item.liter || 0),0);
  const amount = records.reduce((sum,item) => sum + Number(item.total_amount || 0),0);
  const printBtn = document.querySelector('#btn-print-statement');
  if (printBtn) printBtn.style.display = records.length ? 'inline-flex' : 'none';

  const header = customer
    ? `<div class="statement-print-head"><h2>MP RATHOD DAIRY</h2><p>Customer Statement & Payout Report</p></div>
       <h3>${esc(customer.name)}</h3>
       <div class="statement-profile">
         <div><small>Customer ID</small><strong>${esc(customer.customer_id)}</strong></div>
         <div><small>Mobile</small><strong>${esc(customer.mobile)}</strong></div>
         <div><small>Address</small><strong>${esc(customer.address)}</strong></div>
       </div>`
    : `<div class="statement-print-head"><h2>MP RATHOD DAIRY</h2><p>Customer Statement & Payout Report</p></div>
       <h3>Customer ID: ${esc(customerId)}</h3>
       <p class="statement-missing">Customer profile was not found in directory. Milk records are shown below.</p>`;
  
  const rows = records.length 
    ? records.map(record => `<tr><td>${shortDate(record.date)}</td><td>${esc(record.time || '—')}</td><td>${esc(record.shift)}</td><td>${esc(record.milk_type)}</td><td>${Number(record.liter || 0).toFixed(2)} L</td><td>${Number(record.fat || 0).toFixed(1)} / ${Number(record.snf || 0).toFixed(1)}</td><td>₹${money(record.rate)}</td><td><strong>₹${money(record.total_amount)}</strong></td></tr>`).join('') 
    : '<tr><td colspan="8" class="empty-cell">No milk records for this customer ID.</td></tr>';
  
  results.innerHTML = `
    <div id="statement-print-area">
      <section class="statement-summary">
        ${header}
        <div class="statement-totals">
          <strong>Total Entries: ${records.length}</strong>
          <strong>Total Quantity: ${litres.toFixed(2)} L</strong>
          <strong>Total Payable: ₹${money(amount)}</strong>
        </div>
      </section>
      <div class="table-wrap statement-table">
        <table>
          <thead><tr><th>Date</th><th>Time</th><th>Shift</th><th>Milk</th><th>Quantity</th><th>Fat / SNF</th><th>Rate</th><th>Amount</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
});

document.querySelector('#btn-print-statement')?.addEventListener('click', () => {
  window.print();
});
const milkForm = document.querySelector('#milk-form');
function updateTotal() {
  const qty = Number(milkForm.elements.liter.value) || 0;
  let rate = Number(milkForm.elements.rate.value) || 0;
  
  // Auto rate calculation suggestion if rate is empty but fat is provided
  // Example standard: Cow base rate or Fat-based calculation (Fat * 7.5 or rate)
  if (!rate && milkForm.elements.fat.value) {
    const fatVal = Number(milkForm.elements.fat.value) || 0;
    const milkType = milkForm.elements.milk_type.value;
    if (fatVal > 0) {
      // Standard dairy formula: Fat * rate_factor or standard default rate
      const factor = milkType === 'Cow' ? 7.2 : 8.0;
      rate = Math.round(fatVal * factor * 10) / 10;
      milkForm.elements.rate.value = rate.toFixed(2);
    }
  }

  if (qty > 0 && rate > 0) {
    milkForm.elements.total_amount.value = (qty * rate).toFixed(2);
  } else if (!qty || !rate) {
    if (!qty) milkForm.elements.total_amount.value = '';
  }
}
milkForm.elements.customer_id.addEventListener('input', updateMilkCustomerName);
milkForm.elements.liter.addEventListener('input', updateTotal);
milkForm.elements.rate.addEventListener('input', updateTotal);
milkForm.elements.fat.addEventListener('input', updateTotal);
milkForm.elements.milk_type.addEventListener('change', updateTotal);
milkForm.addEventListener('submit', async event => {
  event.preventDefault();
  const form = Object.fromEntries(new FormData(event.currentTarget));
  if (milkForm.dataset.saving === 'true') return;
  
  // Validation check
  if (!form.customer_id || !form.customer_id.trim()) {
    toast('Please enter customer ID', true);
    return;
  }
  if (!Number(form.liter) || Number(form.liter) <= 0) {
    toast('Please enter valid quantity (litres)', true);
    return;
  }
  if (!Number(form.total_amount) && Number(form.liter) && Number(form.rate)) {
    form.total_amount = (Number(form.liter) * Number(form.rate)).toFixed(2);
  }

  milkForm.dataset.saving = 'true';
  form.customer_id = form.customer_id.trim();
  for (const key of ['liter','fat','snf','rate','total_amount']) form[key] = Number(form[key] || 0);
  const submit = milkForm.querySelector('button[type="submit"]');
  submit.disabled = true; submit.textContent = 'Saving…';
  try {
    const isEditing = Boolean(editingMilkId);
    const result = isEditing
      ? await api(`/Milk/Update/${encodeURIComponent(editingMilkId)}`,{method:'PUT',body:JSON.stringify(form)})
      : await api('/Milk/Add',{method:'POST',body:JSON.stringify(form)});
    if (!isEditing && !result.id) throw new Error(result.msg || 'The server did not confirm that the record was saved.');
    if (isEditing) {
      document.querySelector('#milk-dialog').close();
      editingMilkId = null;
      toast('Milk record updated.');
      await refreshData(); goPage('milk');
    } else {
      const savedData = {...form};
      document.querySelector('#milk-dialog').close();
      milkForm.reset();
      updateMilkCustomerName();
      await refreshData();
      toast('Milk record saved successfully!');
      // Show Slip Print Receipt for the saved record
      showReceipt(savedData);
    }
  } catch(error) { toast(`Milk record not saved: ${error.message}`,true); }
  finally { milkForm.dataset.saving = 'false'; submit.disabled = false; submit.textContent = editingMilkId ? 'Save changes' : 'Save record'; }
});

// Hardware Integration: Read Weight from Scale
document.querySelector('#btn-read-weight')?.addEventListener('click', async () => {
  const btn = document.querySelector('#btn-read-weight');
  btn.textContent = '⏳ Reading...';
  try {
    const res = await api('/Hardware/Read_Weight');
    if (res && res.weight) {
      document.querySelector('#milk-qty-input').value = res.weight;
      updateTotal();
      toast(`Weight Captured: ${res.weight} kg (${res.source === 'hardware' ? 'Machine' : 'Demo Test'})`);
    }
  } catch(err) { toast('Could not read weighing scale: ' + err.message, true); }
  finally { btn.textContent = '⚖️ Read Weight'; }
});

// Hardware Integration: Read Fat & SNF from Milk Analyzer
document.querySelector('#btn-read-analyzer')?.addEventListener('click', async () => {
  const btn = document.querySelector('#btn-read-analyzer');
  btn.textContent = '⏳ Reading...';
  try {
    const res = await api('/Hardware/Read_Analyzer');
    if (res && res.fat) {
      document.querySelector('#milk-fat-input').value = res.fat;
      document.querySelector('#milk-snf-input').value = res.snf;
      toast(`Captured: Fat ${res.fat}%, SNF ${res.snf}% (${res.source === 'hardware' ? 'Machine' : 'Demo Test'})`);
    }
  } catch(err) { toast('Could not read analyzer: ' + err.message, true); }
  finally { btn.textContent = '🧪 Read Fat/SNF'; }
});

// Slip Print Receipt Generator
function showReceipt(data) {
  const cName = customerName(data.customer_id);
  const container = document.querySelector('#receipt-content');
  if (!container) return;
  container.innerHTML = `
    <div class="receipt-row"><span>Date & Shift:</span> <strong>${shortDate(data.date)} (${esc(data.shift)})</strong></div>
    <div class="receipt-row"><span>Cust ID:</span> <strong>${esc(data.customer_id)}</strong></div>
    <div class="receipt-row"><span>Name:</span> <strong>${esc(cName)}</strong></div>
    <div class="receipt-row"><span>Milk Type:</span> <strong>${esc(data.milk_type)}</strong></div>
    <div class="receipt-row"><span>Quantity:</span> <strong>${Number(data.liter).toFixed(2)} Litres</strong></div>
    <div class="receipt-row"><span>FAT / SNF:</span> <strong>${Number(data.fat).toFixed(1)}% / ${Number(data.snf).toFixed(1)}%</strong></div>
    <div class="receipt-row"><span>Rate:</span> <strong>₹${money(data.rate)} / L</strong></div>
    <hr class="dashed-line">
    <div class="receipt-row total-row"><span>TOTAL:</span> <strong>₹${money(data.total_amount)}</strong></div>
  `;
  document.querySelector('#receipt-date-print').textContent = 'Printed: ' + new Date().toLocaleTimeString();
  document.querySelector('#receipt-dialog')?.showModal();
}

document.querySelector('#btn-print-receipt')?.addEventListener('click', () => {
  window.print();
});
async function refreshData() {
  try {
    const [customerResult, milkResult] = await Promise.all([api('/Customer/Get_All'), api('/Milk/Get_All')]);
    customers = Array.isArray(customerResult) ? customerResult : [];
    milkRecords = Array.isArray(milkResult) ? milkResult : [];
    renderCustomers(); renderMilk(); renderDashboard();
  } catch(error) { toast(`Could not load records: ${error.message}`,true); }
}
function renderCustomers() {
  const query = (document.querySelector('#customer-search')?.value || '').toLowerCase();
  const filtered = customers.filter(c => [c.name,c.customer_id,c.mobile,c.address].some(value => String(value || '').toLowerCase().includes(query)));
  const tbody = document.querySelector('#customers-table'); if (!tbody) return;
  document.querySelector('#customer-count').textContent = `${customers.length} ${customers.length === 1 ? 'customer' : 'customers'} registered`;
  tbody.innerHTML = filtered.length ? filtered.map(c => `<tr><td><div class="person-cell"><span class="mini-avatar">${esc((c.name||'?').slice(0,1).toUpperCase())}</span>${esc(c.name)}</div></td><td>${esc(c.customer_id)}</td><td>${esc(c.mobile)}</td><td>${esc(c.address)}</td><td><button class="table-action edit-action" data-edit-customer="${esc(c.customer_id)}">Edit</button> <button class="table-action" data-delete-customer="${esc(c.customer_id)}">Remove</button></td></tr>`).join('') : '<tr><td colspan="5" class="empty-cell">No customers found. Add your first customer to get started.</td></tr>';
  tbody.querySelectorAll('[data-edit-customer]').forEach(button => button.addEventListener('click', () => editCustomer(button.dataset.editCustomer)));
  tbody.querySelectorAll('[data-delete-customer]').forEach(button => button.addEventListener('click', async () => { if (!confirm('Remove this customer? Existing milk records will remain.')) return; try { await api(`/Customer/Delete/${encodeURIComponent(button.dataset.deleteCustomer)}`,{method:'DELETE'}); toast('Customer removed.'); await refreshData(); } catch(error) { toast(error.message,true); } }));
}
function customerName(id) { const customer = customers.find(c => c.customer_id === id); return customer ? customer.name : id; }
function renderMilk() {
  const query = (document.querySelector('#milk-search')?.value || '').toLowerCase();
  const filtered = [...milkRecords].reverse().filter(m => `${customerName(m.customer_id)} ${m.customer_id} ${m.milk_type} ${m.shift} ${m.date}`.toLowerCase().includes(query));
  const tbody = document.querySelector('#milk-table'); if (!tbody) return;
  document.querySelector('#milk-count').textContent = `${milkRecords.length} collection ${milkRecords.length === 1 ? 'record' : 'records'}`;
  document.querySelector('#delete-all-milk').disabled = milkRecords.length === 0;
  tbody.innerHTML = filtered.length ? filtered.map(m => `<tr><td><div class="person-cell"><span class="mini-avatar">${esc(customerName(m.customer_id).slice(0,1).toUpperCase())}</span>${esc(customerName(m.customer_id))}</div></td><td>${shortDate(m.date)}<br><span class="pill ${m.shift === 'Evening' ? 'evening' : ''}">${esc(m.shift)}</span></td><td>${esc(m.milk_type)}</td><td>${Number(m.liter || 0).toFixed(2)} L</td><td>${Number(m.fat || 0).toFixed(1)} / ${Number(m.snf || 0).toFixed(1)}</td><td>₹${money(m.rate)}</td><td><strong>₹${money(m.total_amount)}</strong></td><td><button class="table-action edit-action" data-edit-milk="${esc(m._id)}">Edit</button> <button class="table-action" data-delete-milk="${esc(m._id)}">Remove</button></td></tr>`).join('') : '<tr><td colspan="8" class="empty-cell">No milk records found. Record a collection to see it here.</td></tr>';
  tbody.querySelectorAll('[data-edit-milk]').forEach(button => button.addEventListener('click', () => editMilkRecord(button.dataset.editMilk)));
  tbody.querySelectorAll('[data-delete-milk]').forEach(button => button.addEventListener('click', async () => { if (!confirm('Delete this milk record?')) return; try { await api(`/Milk/Delete/${encodeURIComponent(button.dataset.deleteMilk)}`,{method:'DELETE'}); toast('Milk record deleted.'); await refreshData(); } catch(error) { toast(error.message,true); } }));
}
function renderDashboard() {
  const today = new Date().toISOString().slice(0,10);
  const todays = milkRecords.filter(record => record.date === today);
  document.querySelector('#stat-customers').textContent = customers.length;
  document.querySelector('#stat-litres').textContent = todays.reduce((sum, record) => sum + Number(record.liter || 0),0).toFixed(2);
  document.querySelector('#stat-amount').textContent = money(todays.reduce((sum, record) => sum + Number(record.total_amount || 0),0));
  const recent = [...milkRecords].reverse().slice(0,6); const tbody = document.querySelector('#recent-table');
  tbody.innerHTML = recent.length ? recent.map(m => `<tr><td><div class="person-cell"><span class="mini-avatar">${esc(customerName(m.customer_id).slice(0,1).toUpperCase())}</span>${esc(customerName(m.customer_id))}</div></td><td>${shortDate(m.date)}<br><span class="pill ${m.shift === 'Evening' ? 'evening' : ''}">${esc(m.shift)}</span></td><td>${esc(m.milk_type)}</td><td>${Number(m.liter || 0).toFixed(2)} L</td><td>₹${money(m.total_amount)}</td></tr>`).join('') : '<tr><td colspan="5" class="empty-cell">Your milk entries will appear here.</td></tr>';
}
document.querySelector('#customer-search').addEventListener('input', renderCustomers);
document.querySelector('#milk-search').addEventListener('input', renderMilk);
document.querySelector('#delete-all-milk').addEventListener('click', async event => {
  const count = milkRecords.length;
  if (!count || !confirm(`Delete all ${count} milk records from your account? This cannot be undone.`)) return;
  const button = event.currentTarget;
  button.disabled = true;
  try {
    const result = await api('/Milk/Delete_All',{method:'DELETE'});
    toast(`${result.deleted_count ?? count} milk records deleted.`);
    await refreshData();
    goPage('milk');
  } catch(error) {
    toast(`Could not delete milk records: ${error.message}`,true);
    button.disabled = false;
  }
});
const savedUser = sessionStorage.getItem('dairyUser');
if (savedUser) { try { showApp(JSON.parse(savedUser).username || 'Manager'); } catch { sessionStorage.removeItem('dairyUser'); } }
