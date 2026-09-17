let dCard = {};
let dTask = [];
let fT = 'Todos';
let fG = 'Todos';
let selF = '';
let itemSel = null;

// --- FUNCIÓN INFALIBLE DE ZONA HORARIA ---
// Esta función garantiza que siempre obtengamos la fecha local de tu celular 
// ignorando por completo la conversión a UTC.
function obtenerFechaLocal(fechaObj = new Date()) {
  const y = fechaObj.getFullYear();
  const m = String(fechaObj.getMonth() + 1).padStart(2, '0');
  const d = String(fechaObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`; 
}

// --- INTERACCIÓN DE LA CÁMARA ---
document.getElementById('c-file').addEventListener('change', function(e) {
  const btnCam = document.getElementById('btn-camera');
  const icon = document.getElementById('camera-icon');
  if (this.files && this.files.length > 0) {
    btnCam.style.background = 'var(--text-main)';
    btnCam.style.color = 'white';
    icon.style.stroke = 'white';
  } else {
    btnCam.style.background = '#e5e5ea';
    btnCam.style.color = 'var(--text-main)';
    icon.style.stroke = 'currentColor';
  }
});

// --- NAVEGACIÓN ---
function nav(v, el) {
  document.querySelectorAll('.view, .nav-item').forEach(x => x.classList.remove('active'));
  document.getElementById('view-' + v).classList.add('active');
  el.classList.add('active');
  cerrar();
  if (v === 'task') { initT(); } else { initC(); }
}

// --- AUXILIAR: ESTRUCTURAR DATOS DE SUPABASE ---
function agruparGastos(datosPlanos) {
  let estructura = {};
  const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  datosPlanos.forEach(item => {
    let partes = item.fecha.split('-');
    let anio = partes[0];
    let mesNum = parseInt(partes[1], 10);
    let mes = meses[mesNum - 1];
    let dia = partes[2];

    if (!estructura[anio]) estructura[anio] = {};
    if (!estructura[anio][mes]) estructura[anio][mes] = {};
    if (!estructura[anio][mes][dia]) estructura[anio][mes][dia] = [];

    estructura[anio][mes][dia].push({
      id: item.id,
      monto: parseFloat(item.monto),
      desc: item.descripcion,
      tipo: item.tipo,
      gasto: item.gasto,
      fechaFormat: `${dia}/${String(mesNum).padStart(2, '0')}/${anio.slice(-2)}`,
      fechaRaw: item.fecha,
      nota: item.nota,
      evidencia: item.evidencia
    });
  });
  return estructura;
}

// --- INIT CARD ---
async function initC() { 
  if (Object.keys(dCard).length === 0) {
    document.getElementById('content-card').innerHTML = '<p style="text-align:center; padding:40px; color:gray;">Cargando gastos...</p>';
  }
  try {
    const response = await fetch('/api/gastos');
    const data = await response.json();
    dCard = agruparGastos(data); 
    renderC(); 
  } catch(e) {
    console.error(e);
    document.getElementById('content-card').innerHTML = '<p style="text-align:center; padding:40px; color:red;">Error de conexión.</p>';
  }
}

// --- INIT TASK ---
async function initT() { 
  try {
    const response = await fetch('/api/tareas');
    dTask = await response.json();
    cal(); 
    renderT(); 
  } catch(e) {
    console.error(e);
  }
}

// --- RENDER CARD ---
function renderC() {
  const list = document.getElementById('content-card'); 
  list.innerHTML = '';
  let saldo = 0; 
  let hay = false;
  const mesesR = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  Object.keys(dCard).sort((a,b) => b - a).forEach(a => {
    let htmlA = `<div class="anio-label">${a}</div>`;
    let anioTieneMeses = false;

    Object.keys(dCard[a]).sort((p,q) => mesesR.indexOf(q) - mesesR.indexOf(p)).forEach(m => {
      let htmlM = ''; 
      let totE = 0;
      let countMes = 0;
      
      Object.keys(dCard[a][m]).sort((p,q) => q - p).forEach(dia => {
        const arr = dCard[a][m][dia].filter(i => {
          const n = s => s ? String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
          return (fT === 'Todos' || i.tipo === fT) && (fG === 'Todos' || n(i.gasto) === n(fG));
        });
        
        if(!arr.length) return;
        countMes += arr.length;
        htmlM += `<div class="dia-header">${arr[0].fechaFormat}</div>`;
        
        arr.forEach(i => {
          const esE = i.tipo === 'Egreso'; 
          totE += esE ? i.monto : 0; 
          saldo += esE ? -i.monto : i.monto;
          
          htmlM += `
            <div class="item-row" onclick="verDet('${a}','${m}','${dia}','${i.id}')">
              <div class="info-container">
                <h4>${i.desc}</h4>
                <span class="gasto-tag">${i.gasto}</span>
              </div>
              <div class="monto-box ${esE ? 'red' : 'green'}">${esE ? '-' : '+'} S/ ${i.monto.toFixed(2)}</div>
            </div>`;
        });
      });
      
      if(countMes > 0) {
        anioTieneMeses = true; hay = true;
        htmlA += `
          <div class="mes-header collapsed" onclick="this.nextElementSibling.classList.toggle('hidden'); this.classList.toggle('collapsed')">
            <span style="flex:1;">${m}</span>
            <span style="color:var(--red); margin-right:10px;">S/ ${totE.toFixed(2)}</span>
          </div>
          <div class="lista-box hidden">${htmlM}</div>`;
      }
    });
    if(anioTieneMeses) list.innerHTML += htmlA; 
  });
  
  if(!hay) list.innerHTML = '<p style="text-align:center; padding:50px; color:var(--gray); font-weight:600;">Sin registros.</p>';
  
  const bEl = document.getElementById('card-total'); 
  bEl.innerText = (saldo < 0 ? '- ' : '') + 'S/ ' + Math.abs(saldo).toFixed(2);
  bEl.style.color = saldo < 0 ? 'var(--red)' : 'var(--green)';
}

// --- CALENDARIO PÍLDORA (NUEVO iOS) ---
function cal() {
  const s = document.getElementById('date-strip'); 
  s.innerHTML = '';
  const hoy = new Date(); 
  const nD = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']; 
  const nM = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  
  // SOLUCIÓN DE HORA LOCAL AQUÍ
  if(!selF) selF = obtenerFechaLocal(hoy);

  for(let i = -15; i <= 30; i++) {
    let d = new Date(); d.setDate(hoy.getDate() + i);
    let localIso = obtenerFechaLocal(d);
    
    const card = document.createElement('div');
    card.className = `day-pill ${localIso === selF ? 'active' : ''}`;
    card.innerHTML = `<span class="d-name">${nD[d.getDay()]}</span><span class="d-num">${d.getDate()}</span>`;
    
    card.onclick = () => { selF = localIso; cal(); renderT(); };
    s.appendChild(card);
    
    if(localIso === selF) {
      document.getElementById('task-month').innerText = `${nM[d.getMonth()]} ${d.getFullYear()}`;
      if(i === 0) setTimeout(() => card.scrollIntoView({inline:'center', behavior:'smooth'}), 150);
    }
  }
}

// --- RENDER TAREAS (TARJETAS MODERNAS) ---
function renderT() {
  const list = document.getElementById('content-task'); 
  list.innerHTML = '';
  const items = dTask.filter(t => t.fecha === selF);
  const stats = document.getElementById('task-stats');
  
  if(!items.length) { 
    stats.innerText = "Día libre";
    list.innerHTML = '<div style="text-align:center; padding:80px 20px; color:var(--gray);"><div style="font-size:50px; margin-bottom:15px; opacity:0.8;">🏖️</div><h3 style="margin:0; font-weight:700; color:var(--text-main);">Nada programado</h3><p style="margin-top:5px;">Tómate un respiro.</p></div>'; 
    return; 
  }
  
  const doneC = items.filter(t => t.estado === 'Done').length;
  stats.innerText = `${doneC} de ${items.length} completadas`;

  items.forEach(t => {
    const isD = t.estado === 'Done';
    
    list.innerHTML += `
      <div class="ios-task-card ${isD ? 'done' : ''}" onclick="verDetT('${t.id}')">
        <div class="ios-check" onclick="event.stopPropagation(); toggleT('${t.id}')">
          <svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7" fill="none"/></svg>
        </div>
        <div class="task-content">
          <h4 class="task-title">${t.titulo}</h4>
          <div class="task-meta">
            <span class="owner-tag"><div class="owner-dot owner-${t.responsable}"></div>${t.responsable}</span>
            <div><span class="prio-dot prio-${t.prioridad}"></span><span class="prio-text">${t.prioridad}</span></div>
          </div>
        </div>
      </div>`;
  });
}

// --- TOGGLE ESTADO TAREA ---
async function toggleT(id) {
  const t = dTask.find(x => x.id === id);
  t.estado = t.estado === 'Done' ? 'To do' : 'Done';
  renderT(); 
  try {
    let fd = new FormData(); 
    fd.append("id", id); 
    fd.append("estado", t.estado);
    await fetch('/api/tareas/estado', { method: 'POST', body: fd });
  } catch(e) {}
}

// --- VER DETALLE CARD ---
function verDet(a, m, d, id) {
  itemSel = dCard[a][m][d].find(x => x.id === id);
  
  document.getElementById('d-monto').innerText = 'S/ ' + parseFloat(itemSel.monto).toFixed(2);
  document.getElementById('d-monto').style.color = itemSel.tipo === 'Egreso' ? 'var(--text-main)' : 'var(--green)';
  document.getElementById('d-desc').innerText = itemSel.desc;
  document.getElementById('d-fecha').innerText = itemSel.fechaFormat;
  document.getElementById('d-cat').innerText = itemSel.gasto;
  
  const msg = document.getElementById('img-msg'); 
  const img = document.getElementById('d-img');
  img.style.display = 'none'; 
  msg.style.display = 'block'; 
  
  if(itemSel.evidencia && itemSel.evidencia.startsWith('http')) {
    img.src = itemSel.evidencia; 
    img.onload = () => {
      img.style.display = 'block'; 
      msg.style.display = 'none'; 
    };
  } else { 
    msg.innerText = 'Sin foto adjunta.'; 
  }
  
  document.getElementById('overlay').style.display = 'block';
  document.getElementById('sheet-det-card').classList.add('show');
}

// --- VER DETALLE/EDITAR TASK ---
function verDetT(id) {
  const t = dTask.find(x => x.id === id);
  if(!t) return;
  
  document.getElementById('t-id').value = t.id;
  document.getElementById('t-fecha').value = t.fecha;
  document.getElementById('t-titulo').value = t.titulo;
  document.getElementById('t-owner').value = t.responsable;
  document.getElementById('t-prio').value = t.prioridad;
  document.getElementById('task-form-title').innerText = "Editar Tarea";
  
  document.getElementById('overlay').style.display = 'block';
  document.getElementById('sheet-task').classList.add('show');
}

// --- PREPARAR EDICIÓN CARD ---
function prepararEditC() {
  document.getElementById('c-id').value = itemSel.id;
  document.getElementById('c-fecha').value = itemSel.fechaRaw;
  document.getElementById('c-monto').value = itemSel.monto;
  document.getElementById('c-desc').value = itemSel.desc;
  document.getElementById('c-tipo').value = itemSel.tipo;
  document.getElementById('c-gasto').value = itemSel.gasto;
  document.getElementById('c-ev-act').value = itemSel.evidencia || '';
  document.getElementById('card-form-title').innerText = "Editar Gasto";
  
  const btnCam = document.getElementById('btn-camera');
  const icon = document.getElementById('camera-icon');
  if (itemSel.evidencia) {
    btnCam.style.background = 'var(--text-main)'; btnCam.style.color = 'white'; icon.style.stroke = 'white';
  } else {
    btnCam.style.background = '#e5e5ea'; btnCam.style.color = 'var(--text-main)'; icon.style.stroke = 'currentColor';
  }
  
  document.getElementById('sheet-det-card').classList.remove('show');
  document.getElementById('sheet-card').classList.add('show');
}

// --- LIMPIAR FORMULARIO CARD ---
function limpiarFormCard() {
  document.getElementById('f-card').reset();
  document.getElementById('c-id').value = ''; 
  document.getElementById('c-ev-act').value = '';
  document.getElementById('card-form-title').innerText = "Nuevo Gasto";
  
  // APLICANDO LA HORA LOCAL CORRECTA AL FORMULARIO DE GASTOS
  document.getElementById('c-fecha').value = obtenerFechaLocal();
  
  const btnCam = document.getElementById('btn-camera');
  const icon = document.getElementById('camera-icon');
  btnCam.style.background = '#e5e5ea'; btnCam.style.color = 'var(--text-main)'; icon.style.stroke = 'currentColor';
}

function fCardT(t, el) { document.querySelectorAll('#view-card .filter-btn').forEach(b => b.classList.remove('active')); el.classList.add('active'); fT = t; renderC(); }
function fCardG(g) { fG = g; renderC(); }

function abrirAdd(v) { 
  if(v === 'card') { limpiarFormCard(); } 
  else { 
    document.getElementById('f-task').reset(); document.getElementById('t-id').value = ''; 
    document.getElementById('t-fecha').value = selF; document.getElementById('task-form-title').innerText = "Nueva Tarea"; 
  }
  document.getElementById('overlay').style.display = 'block'; 
  document.getElementById('sheet-' + v).classList.add('show'); 
}

function cerrar() { 
  document.getElementById('overlay').style.display = 'none'; 
  document.querySelectorAll('.sheet').forEach(s => s.classList.remove('show')); 
}

// --- GUARDAR CARD VÍA FASTAPI ---
async function saveCard(e) {
  e.preventDefault(); 
  const form = e.target;
  const btn = document.getElementById('btn-c-save');
  btn.innerText = 'Guardando...';
  btn.disabled = true;

  try {
    const formData = new FormData(form);
    await fetch('/api/gastos', { method: 'POST', body: formData });
    cerrar(); 
    await initC();
  } catch (error) {
    alert("Error de red al guardar.");
  } finally {
    btn.innerText = 'Guardar';
    btn.disabled = false;
  }
}

// --- GUARDAR TASK VÍA FASTAPI ---
async function saveTask(e) {
  e.preventDefault(); 
  const form = e.target;
  const btn = document.getElementById('btn-t-save');
  btn.innerText = 'Programando...'; btn.disabled = true;

  try {
    const formData = new FormData(form);
    await fetch('/api/tareas', { method: 'POST', body: formData });
    cerrar(); 
    await initT();
  } catch (error) {
    alert("Error de red.");
  } finally {
    btn.innerText = 'Programar Tarea'; btn.disabled = false;
  }
}

function fullImg() { 
  document.getElementById('f-img').src = document.getElementById('d-img').src; 
  document.getElementById('fullscreen-modal').style.display = 'flex'; 
}

window.onload = initC;