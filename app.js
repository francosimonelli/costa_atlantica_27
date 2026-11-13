const STORAGE_KEY = 'costa-atlantica-plan-v1';
const LOCAL_IMPORT_KEY = 'costa-atlantica-pending-import';
const LOCAL_IMPORT_APPLIED_KEY = 'costa-atlantica-pending-import-applied';
const SUPABASE_URL = 'https://ipjgjjggcryolxhaxrvo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_iQ_RnoQZyp7Dbma9fwalqw_QIF4q8Hp';
const PEOPLE = ['Edu', 'Flores', 'Monelli', 'Juan', 'Maca', 'Chapa'];
const OWNERS = [...PEOPLE, 'Todos', 'Sin definir'];
const DAYS = [
  { value: '', label: 'Día a definir' },
  { value: '2026-11-20', label: 'Viernes 20' },
  { value: '2026-11-21', label: 'Sábado 21' },
  { value: '2026-11-22', label: 'Domingo 22' },
  { value: '2026-11-23', label: 'Lunes 23' }
];
const MEALS = ['Desayuno', 'Almuerzo', 'Merienda', 'Cena', 'A definir'];
const CATEGORIES = ['Comida', 'Playa', 'Cocina', 'Limpieza', 'Transporte', 'Otros'];
const CARS = [
  { id: 'car-1', label: 'Auto 1' },
  { id: 'car-2', label: 'Auto 2' }
];
const DEFAULT_STATE = {
  menu: [],
  cars: CARS.map(({ id }) => ({ id, driver: '', passengers: [] })),
  items: [
    { id: 'chair', item: 'Sillas plegables', category: 'Playa', owner: 'Edu', done: false },
    { id: 'cooler', item: 'Heladera portátil', category: 'Cocina', owner: 'Sin definir', done: false },
    { id: 'picnic-table', item: 'Mesa de picnic', category: 'Playa', owner: 'Sin definir', done: false },
    { id: 'food-basket', item: 'Canasta de comida', category: 'Comida', owner: 'Todos', done: false },
    { id: 'towels', item: 'Toallas y reposeras', category: 'Playa', owner: 'Sin definir', done: false },
    { id: 'drinks', item: 'Gaseosa / agua', category: 'Comida', owner: 'Sin definir', done: false }
  ]
};

const menuForm = document.getElementById('menuForm');
const itemsForm = document.getElementById('itemsForm');
const menuTableBody = document.getElementById('menuTableBody');
const itemsTableBody = document.getElementById('itemsTableBody');
const carsList = document.getElementById('carsList');
const storageStatus = document.getElementById('storageStatus');
const cloudStatus = document.getElementById('cloudStatus');
const localBackupStatus = document.getElementById('localBackupStatus');
const mergeLocalButton = document.getElementById('mergeLocal');
const menuDaySelect = menuForm.elements.day;
const menuOwnerSelect = menuForm.elements.owner;
const itemsCategorySelect = itemsForm.elements.category;
const itemsOwnerSelect = itemsForm.elements.owner;
let cloudDb = null;
let cloudConnected = false;
let lastCloudState = '';
let cloudSaveQueue = Promise.resolve();
let pendingCloudSaves = 0;
let cloudDirty = false;
let cloudRefreshTimer = null;
let localPlanForImport = null;
let localRevision = 0;
let cloudConnecting = false;

const setCloudStatus = (message, state = '') => {
  cloudStatus.textContent = message;
  cloudStatus.classList.toggle('error', state === 'error');
  cloudStatus.classList.toggle('connected', state === 'connected');
};

const setStatus = (message, isError = false) => {
  storageStatus.textContent = message;
  storageStatus.classList.toggle('error', isError);
};

const fillSelect = (select, options) => {
  options.forEach((option) => {
    const element = document.createElement('option');
    if (typeof option === 'string') {
      element.value = option;
      element.textContent = option;
    } else {
      element.value = option.value;
      element.textContent = option.label;
    }
    select.appendChild(element);
  });
};

fillSelect(menuDaySelect, DAYS);
fillSelect(menuForm.elements.meal, MEALS);
fillSelect(menuOwnerSelect, OWNERS);
fillSelect(itemsCategorySelect, CATEGORIES);
fillSelect(itemsOwnerSelect, OWNERS);

const normalizeOwner = (owner) => OWNERS.includes(owner) ? owner : 'Sin definir';

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const normalizeData = (parsed) => {
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.menu) || !Array.isArray(parsed.items)) {
    throw new Error('El formato del plan no es válido.');
  }

  const savedCars = Array.isArray(parsed.cars) ? parsed.cars : DEFAULT_STATE.cars;
  const assigned = new Set();
  const cars = CARS.map(({ id }) => {
    const savedCar = savedCars.find((car) => car && car.id === id) || {};
    const driver = PEOPLE.includes(savedCar.driver) && !assigned.has(savedCar.driver) ? savedCar.driver : '';
    if (driver) assigned.add(driver);
    const passengers = Array.isArray(savedCar.passengers)
      ? savedCar.passengers.filter((person) => {
        if (!PEOPLE.includes(person) || person === driver || assigned.has(person)) return false;
        assigned.add(person);
        return true;
      })
      : [];
    return { id, driver, passengers };
  });

  return {
    cars,
    menu: parsed.menu.map((entry) => ({
      id: String(entry.id || createId()),
      item: String(entry.item || ''),
      day: DAYS.some((day) => day.value === entry.day) ? entry.day : '',
      meal: MEALS.includes(entry.meal) ? entry.meal : 'A definir',
      owner: normalizeOwner(entry.owner)
    })),
    items: parsed.items.map((entry) => ({
      id: String(entry.id || createId()),
      item: String(entry.item || ''),
      category: CATEGORIES.includes(entry.category) ? entry.category : 'Otros',
      owner: normalizeOwner(entry.owner),
      done: entry.done === true
    }))
  };
};

const loadData = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeData(JSON.parse(raw)) : structuredClone(DEFAULT_STATE);
  } catch (error) {
    console.error('No se pudo leer el plan guardado.', error);
    setStatus('No se pudieron leer los datos guardados. Se muestran ejemplos; al guardar se reemplazará el contenido inválido.', true);
    return structuredClone(DEFAULT_STATE);
  }
};

const writeLocalData = (state) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localRevision += 1;
    return true;
  } catch (error) {
    console.error('No se pudo guardar el plan.', error);
    setStatus('No se pudo guardar. Revisá el espacio disponible o la configuración del navegador.', true);
    return false;
  }
};

const clearPendingImport = () => {
  try {
    if (localStorage.getItem(LOCAL_IMPORT_APPLIED_KEY) === 'true') return;
    localStorage.removeItem(LOCAL_IMPORT_KEY);
  } catch (error) {
    console.error('No se pudo borrar la copia de importación local.', error);
  }
};

const scheduleCloudSave = (state, onSuccess) => {
  const snapshot = JSON.stringify(state);
  pendingCloudSaves += 1;
  cloudDirty = false;
  setStatus('Guardado en este navegador; sincronizando con el grupo…');
  cloudSaveQueue = cloudSaveQueue.then(async () => {
    try {
      const { error } = await cloudDb.rpc('save_costa_plan', {
        p_plan: JSON.parse(snapshot)
      });
      if (error) throw error;
      lastCloudState = snapshot;
      setStatus('Guardado y compartido con el grupo.');
      if (onSuccess) onSuccess();
      else if (localPlanForImport === null) clearPendingImport();
    } catch (error) {
      cloudDirty = true;
      console.error('No se pudo sincronizar el plan con Supabase.', error);
      setStatus('No se pudo sincronizar con la nube. El cambio quedó guardado solo en este navegador; reintentá la conexión.', true);
      setCloudStatus('Hay cambios locales pendientes de sincronización.', 'error');
    } finally {
      pendingCloudSaves -= 1;
    }
  });
};

const saveData = (state) => {
  if (!writeLocalData(state)) return false;
  if (cloudDb && cloudConnected) {
    scheduleCloudSave(state);
  }
  else setStatus('Cambios guardados solo en este navegador.');
  return true;
};

const refreshCloudPlan = async () => {
  if (!cloudDb || !cloudConnected || pendingCloudSaves > 0) return;
  if (cloudDirty) {
    scheduleCloudSave(loadData());
    return;
  }
  if (localPlanForImport) return;
  try {
    const { data, error } = await cloudDb.rpc('get_costa_plan');
    if (error) throw error;
    const remoteState = normalizeData(data);
    const remoteSnapshot = JSON.stringify(remoteState);
    if (remoteSnapshot !== lastCloudState) {
      if (!writeLocalData(remoteState)) return;
      lastCloudState = remoteSnapshot;
      renderTables();
      setStatus('Plan actualizado con los cambios del grupo.');
    }
  } catch (error) {
    console.error('No se pudo actualizar el plan compartido.', error);
    setCloudStatus('No se pudo actualizar desde la nube. Revisá la conexión.', 'error');
  }
};

const mergePlans = (shared, local) => {
  const mergeRows = (sharedRows, localRows) => {
    const merged = [...sharedRows];
    const ids = new Set(sharedRows.map((entry) => entry.id));
    localRows.forEach((entry) => {
      if (!ids.has(entry.id)) {
        ids.add(entry.id);
        merged.push(entry);
      }
    });
    return merged;
  };

  const cars = shared.cars.map((car) => ({
    id: car.id,
    driver: car.driver,
    passengers: [...car.passengers]
  }));
  const assignedPeople = new Set();
  cars.forEach((car) => {
    if (car.driver) assignedPeople.add(car.driver);
    car.passengers.forEach((person) => assignedPeople.add(person));
  });
  local.cars.forEach((localCar) => {
    const target = cars.find((car) => car.id === localCar.id);
    if (!target) return;
    if (localCar.driver && !assignedPeople.has(localCar.driver)) {
      target.driver = localCar.driver;
      assignedPeople.add(localCar.driver);
    }
    localCar.passengers.forEach((person) => {
      if (!assignedPeople.has(person)) {
        target.passengers.push(person);
        assignedPeople.add(person);
      }
    });
  });

  return normalizeData({
    cars,
    menu: mergeRows(shared.menu, local.menu),
    items: mergeRows(shared.items, local.items)
  });
};

const showLocalBackup = (state) => {
  localPlanForImport = state;
  localBackupStatus.hidden = false;
  mergeLocalButton.hidden = false;
  localBackupStatus.textContent = 'Encontré una copia local. Se conserva hasta que la combines; los elementos duplicados conservan la versión compartida.';
  try {
    localStorage.setItem(LOCAL_IMPORT_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('No se pudo conservar una copia local para combinar.', error);
    localBackupStatus.textContent = 'Hay datos locales distintos, pero no se pudo guardar una copia persistente para combinarlos.';
  }
};

const clearLocalBackup = () => {
  localPlanForImport = null;
  localBackupStatus.hidden = true;
  mergeLocalButton.hidden = true;
  localBackupStatus.textContent = '';
  try {
    localStorage.setItem(LOCAL_IMPORT_APPLIED_KEY, 'true');
  } catch (error) {
    console.error('No se pudo marcar la copia local como combinada.', error);
  }
};

const connectToCloud = async () => {
  if (!cloudDb || cloudConnecting || cloudConnected) return;
  cloudConnecting = true;
  const revisionAtStart = localRevision;
  try {
    const localRaw = localStorage.getItem(STORAGE_KEY);
    let localPlan = localRaw ? loadData() : null;
    const importRaw = localStorage.getItem(LOCAL_IMPORT_KEY);
    const importApplied = localStorage.getItem(LOCAL_IMPORT_APPLIED_KEY) === 'true';
    const savedImport = importRaw && !importApplied ? normalizeData(JSON.parse(importRaw)) : null;
    const { data, error } = await cloudDb.rpc('get_costa_plan');
    if (error) throw error;

    if (localRevision !== revisionAtStart) localPlan = loadData();
    cloudDirty = false;
    const plan = data === null ? (localPlan || structuredClone(DEFAULT_STATE)) : normalizeData(data);
    const localBackup = savedImport || (localPlan && JSON.stringify(localPlan) !== JSON.stringify(plan) ? localPlan : null);
    if (!writeLocalData(plan)) throw new Error('No se pudo guardar una copia local del plan.');
    lastCloudState = JSON.stringify(plan);
    cloudConnected = true;
    if (data === null) scheduleCloudSave(plan);
    if (localBackup) {
      try {
        localStorage.removeItem(LOCAL_IMPORT_APPLIED_KEY);
      } catch (error) {
        console.error('No se pudo actualizar el estado de la copia local.', error);
      }
      showLocalBackup(localBackup);
    }
    else clearLocalBackup();
    setCloudStatus('Conectado. Los cambios se sincronizan para todos, sin clave.', 'connected');
    renderTables();
  } catch (error) {
    cloudConnected = false;
    console.error('No se pudo conectar al plan compartido.', error);
    const schemaMissing = error?.code === 'PGRST202';
    setCloudStatus(
      schemaMissing
        ? 'Falta instalar las funciones de la base. Ejecutá supabase/schema.sql en el SQL Editor de este proyecto.'
        : 'No se pudo conectar a Supabase. Revisá la configuración o la conexión.',
      'error'
    );
  } finally {
    cloudConnecting = false;
  }
};

const configureCloud = () => {
  const configured = !SUPABASE_URL.includes('YOUR_PROJECT_ID')
    && !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_PUBLISHABLE_KEY');
  if (!configured) {
    setCloudStatus('Base de datos no configurada: por ahora los cambios quedan en este navegador.');
    return;
  }
  if (!window.supabase?.createClient) {
    setCloudStatus('No se pudo cargar el cliente de Supabase. Revisá tu conexión a internet.', 'error');
    return;
  }
  cloudDb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  setCloudStatus('Conectando al plan compartido…');
  connectToCloud();
  cloudRefreshTimer = window.setInterval(() => {
    if (cloudConnected) refreshCloudPlan();
    else connectToCloud();
  }, 8000);
};

mergeLocalButton.addEventListener('click', () => {
  if (!cloudConnected || !localPlanForImport) return;
  const merged = mergePlans(loadData(), localPlanForImport);
  if (!writeLocalData(merged)) return;
  renderTables();
  scheduleCloudSave(merged, clearLocalBackup);
});

const appendCell = (row, value) => {
  const cell = document.createElement('td');
  cell.textContent = value;
  row.appendChild(cell);
  return cell;
};

const appendEmptyMessage = (tableBody, columnCount, message) => {
  const row = document.createElement('tr');
  const cell = document.createElement('td');
  cell.colSpan = columnCount;
  cell.className = 'empty-row';
  cell.textContent = message;
  row.appendChild(cell);
  tableBody.appendChild(row);
};

const createDeleteButton = (onDelete) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'delete-btn';
  button.textContent = 'Borrar';
  button.addEventListener('click', onDelete);
  return button;
};

const renderMenu = (state) => {
  menuTableBody.replaceChildren();
  if (!state.menu.length) {
    appendEmptyMessage(menuTableBody, 5, 'Todavía no agregaron comidas. Anoten qué van a cocinar cada día.');
    return;
  }

  state.menu.forEach((entry) => {
    const row = document.createElement('tr');
    appendCell(row, entry.item);
    appendCell(row, DAYS.find((day) => day.value === entry.day)?.label || 'A definir');
    appendCell(row, entry.meal);
    appendCell(row, entry.owner);
    const actionCell = document.createElement('td');
    actionCell.appendChild(createDeleteButton(() => {
      const current = loadData();
      current.menu = current.menu.filter((item) => item.id !== entry.id);
      if (saveData(current)) renderTables();
    }));
    row.appendChild(actionCell);
    menuTableBody.appendChild(row);
  });
};

const renderItems = (state) => {
  itemsTableBody.replaceChildren();
  if (!state.items.length) {
    appendEmptyMessage(itemsTableBody, 5, 'Todavía no hay cosas anotadas para llevar.');
    return;
  }

  state.items.forEach((entry) => {
    const row = document.createElement('tr');
    if (entry.done) row.classList.add('item-done');
    appendCell(row, entry.item);
    appendCell(row, entry.category);
    appendCell(row, entry.owner);

    const statusCell = document.createElement('td');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = entry.done;
    checkbox.setAttribute('aria-label', `Marcar ${entry.item} como listo`);
    checkbox.addEventListener('change', () => {
      const current = loadData();
      const item = current.items.find((candidate) => candidate.id === entry.id);
      if (!item) return;
      item.done = checkbox.checked;
      if (saveData(current)) renderTables();
    });
    statusCell.appendChild(checkbox);
    row.appendChild(statusCell);

    const actionCell = document.createElement('td');
    actionCell.appendChild(createDeleteButton(() => {
      const current = loadData();
      current.items = current.items.filter((item) => item.id !== entry.id);
      if (saveData(current)) renderTables();
    }));
    row.appendChild(actionCell);
    itemsTableBody.appendChild(row);
  });
};

const renderTables = () => {
  const state = loadData();
  renderMenu(state);
  renderItems(state);
  renderCars(state);
};

const renderCars = (state) => {
  carsList.replaceChildren();
  const assignedElsewhere = new Map();
  state.cars.forEach((car) => {
    if (car.driver) assignedElsewhere.set(car.driver, car.id);
    car.passengers.forEach((person) => assignedElsewhere.set(person, car.id));
  });

  CARS.forEach(({ id, label }) => {
    const car = state.cars.find((entry) => entry.id === id);
    const card = document.createElement('article');
    card.className = 'car-card';

    const heading = document.createElement('h4');
    heading.textContent = label;
    card.appendChild(heading);

    const driverLabel = document.createElement('label');
    driverLabel.className = 'driver-field';
    driverLabel.textContent = 'Conductor';
    const driverSelect = document.createElement('select');
    driverSelect.setAttribute('aria-label', `Conductor de ${label}`);
    const noDriver = document.createElement('option');
    noDriver.value = '';
    noDriver.textContent = 'A definir';
    driverSelect.appendChild(noDriver);
    PEOPLE.forEach((person) => {
      const option = document.createElement('option');
      option.value = person;
      option.textContent = person;
      option.disabled = assignedElsewhere.has(person) && assignedElsewhere.get(person) !== id;
      driverSelect.appendChild(option);
    });
    driverSelect.value = car.driver;
    driverLabel.appendChild(driverSelect);
    card.appendChild(driverLabel);

    const passengerHeading = document.createElement('p');
    passengerHeading.className = 'passenger-heading';
    passengerHeading.textContent = 'Acompañantes';
    card.appendChild(passengerHeading);

    const passengerList = document.createElement('div');
    passengerList.className = 'passenger-list';
    PEOPLE.filter((person) => person !== car.driver).forEach((person) => {
      const labelElement = document.createElement('label');
      labelElement.className = 'passenger-option';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = person;
      checkbox.checked = car.passengers.includes(person);
      checkbox.disabled = assignedElsewhere.has(person) && assignedElsewhere.get(person) !== id;
      checkbox.setAttribute('aria-label', `${person} viaja en ${label}`);
      const name = document.createElement('span');
      name.textContent = person;
      labelElement.append(checkbox, name);
      passengerList.appendChild(labelElement);

      checkbox.addEventListener('change', () => {
        const current = loadData();
        const currentCar = current.cars.find((entry) => entry.id === id);
        if (!currentCar) return;
        currentCar.passengers = checkbox.checked
          ? [...currentCar.passengers, person]
          : currentCar.passengers.filter((name) => name !== person);
        if (saveData(current)) renderTables();
      });
    });
    card.appendChild(passengerList);

    driverSelect.addEventListener('change', () => {
      const current = loadData();
      const currentCar = current.cars.find((entry) => entry.id === id);
      if (!currentCar) return;
      currentCar.driver = driverSelect.value;
      currentCar.passengers = currentCar.passengers.filter((person) => person !== currentCar.driver);
      if (saveData(current)) renderTables();
    });

    const riders = [car.driver, ...car.passengers].filter(Boolean);
    const roster = document.createElement('p');
    roster.className = 'car-roster';
    roster.textContent = riders.length
      ? `Viajan: ${riders.join(', ')}`
      : 'Todavía no hay personas asignadas.';
    card.appendChild(roster);
    carsList.appendChild(card);
  });
};

menuForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(menuForm);
  const item = String(formData.get('item') || '').trim();
  if (!item) return;

  const state = loadData();
  state.menu.push({
    id: createId(),
    item,
    day: String(formData.get('day') || ''),
    meal: String(formData.get('meal') || 'A definir'),
    owner: normalizeOwner(String(formData.get('owner') || ''))
  });
  if (saveData(state)) {
    menuForm.reset();
    renderTables();
  }
});

itemsForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(itemsForm);
  const item = String(formData.get('item') || '').trim();
  if (!item) return;

  const state = loadData();
  state.items.push({
    id: createId(),
    item,
    category: String(formData.get('category') || 'Otros'),
    owner: normalizeOwner(String(formData.get('owner') || '')),
    done: false
  });
  if (saveData(state)) {
    itemsForm.reset();
    renderTables();
  }
});

const buildShareText = () => {
  const state = loadData();
  const lines = ['*Costa Atlántica · 20 al 23 de noviembre*', '', '*AUTOS*'];
  CARS.forEach(({ id, label }) => {
    const car = state.cars.find((entry) => entry.id === id);
    const riders = [car.driver, ...car.passengers].filter(Boolean);
    lines.push(`• ${label} — Conductor: ${car.driver || 'A definir'}; viajan: ${riders.length ? riders.join(', ') : 'A definir'}`);
  });

  lines.push('', '*COMIDAS PARA COCINAR*');
  if (state.menu.length) {
    state.menu.forEach((entry) => {
      const day = DAYS.find((option) => option.value === entry.day)?.label || 'Día a definir';
      lines.push(`• ${day} · ${entry.meal}: ${entry.item} — ${entry.owner}`);
    });
  } else {
    lines.push('• A definir');
  }

  lines.push('', '*COSAS PARA LLEVAR*');
  if (state.items.length) {
    state.items.forEach((entry) => {
      lines.push(`${entry.done ? '✅' : '☐'} ${entry.item} (${entry.category}) — ${entry.owner}`);
    });
  } else {
    lines.push('• A definir');
  }
  return lines.join('\n');
};

document.getElementById('whatsappPlan').addEventListener('click', () => {
  const url = `https://wa.me/?text=${encodeURIComponent(buildShareText())}`;
  window.open(url, '_blank', 'noopener,noreferrer');
});

document.getElementById('printPlan').addEventListener('click', () => window.print());

configureCloud();
renderTables();
