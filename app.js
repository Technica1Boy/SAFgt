/* ============================================================
   SAFgt - Sistema de Facturación y POS
   app.js · Lógica completa · Versión SAFgt6 (Anulación Fiscal + Enter en Login)
   ============================================================ */

// ============================================================
// VARIABLES GLOBALES
// ============================================================
let contribuyentes = [];
let facturasEmitidas = [];
let facturasAnuladas = [];
let ordenesInteligentes = [];
let historialNIT = [];
let administradores = [];
let usuarioActual = null;
let adminActual = null;
let contadoresSerie = {};

let itemsFacturaActual = [];
let categoriaVentaActual = null;
let tipoBienActual = null;

let temaActual = 'azul';
let zoomActual = 1;

// Variables del POS y Modulos
let inventarioActual = [];
let carritoPOS = [];
let productoEditandoId = null;
let facturaAAnularId = null;

let productoSeleccionadoFactura = null;

let exentoIDP = false;
let exentoIVA = false;

const ADMIN_PRINCIPAL_NOMBRE = 'Geivin Wilman Torres López';
const ADMIN_PRINCIPAL_PASS = 'Rootadmin';
const ADMIN_PRINCIPAL_NOMBRE_ANTIGUO = 'Heivyn Torres';

const TEMAS = {
    azul: {
        navy: '#0d1b2a', navyMid: '#1a3a5c', navyLight: '#2a4a6c',
        green: '#1b5e20', greenMid: '#2e7d32', greenLight: '#e8f5e9',
        orange: '#e65100', red: '#c62828',
        bgGradient: 'linear-gradient(145deg, #0d1b2a 0%, #1a3a5c 50%, #0d2b4a 100%)'
    },
    verde: {
        navy: '#0d2a1a', navyMid: '#1a5c3a', navyLight: '#2a6c4a',
        green: '#1b5e20', greenMid: '#2e7d32', greenLight: '#e8f5e9',
        orange: '#e65100', red: '#c62828',
        bgGradient: 'linear-gradient(145deg, #0d2a1a 0%, #1a5c3a 50%, #0d3a20 100%)'
    },
    rojo: {
        navy: '#2a0d0d', navyMid: '#5c1a1a', navyLight: '#6c2a2a',
        green: '#4a4a4a', greenMid: '#6a6a6a', greenLight: '#f0f0f0',
        orange: '#e65100', red: '#b71c1c',
        bgGradient: 'linear-gradient(145deg, #2a0d0d 0%, #5c1a1a 50%, #3a0d0d 100%)'
    },
    naranja: {
        navy: '#2a1500', navyMid: '#5c3000', navyLight: '#6c4020',
        green: '#2e7d32', greenMid: '#388e3c', greenLight: '#e8f5e9',
        orange: '#bf360c', red: '#c62828',
        bgGradient: 'linear-gradient(145deg, #2a1500 0%, #5c3000 50%, #3a2000 100%)'
    }
};

// ============================================================
// TEMA Y ZOOM
// ============================================================
function aplicarTema(nombre) {
    const tema = TEMAS[nombre] || TEMAS.azul;
    const root = document.documentElement;
    root.style.setProperty('--navy', tema.navy);
    root.style.setProperty('--navy-mid', tema.navyMid);
    root.style.setProperty('--navy-light', tema.navyLight);
    root.style.setProperty('--green', tema.green);
    root.style.setProperty('--green-mid', tema.greenMid);
    root.style.setProperty('--green-light', tema.greenLight);
    root.style.setProperty('--orange', tema.orange);
    root.style.setProperty('--red', tema.red);
    root.style.setProperty('--bg-gradient', tema.bgGradient);
    temaActual = nombre;
    save('temaActual', nombre);
    actualizarBotonesTema();
}

function aplicarZoom(valor) {
    const v = parseFloat(valor) || 1;
    document.documentElement.style.fontSize = (16 * v) + 'px';
    zoomActual = v;
    save('zoomActual', v);
    actualizarBotonesZoom();
}

function actualizarBotonesTema() {
    document.querySelectorAll('.config-tema-btn').forEach(btn => {
        if (btn.dataset.tema === temaActual) btn.classList.add('activo');
        else btn.classList.remove('activo');
    });
}

function actualizarBotonesZoom() {
    document.querySelectorAll('.config-zoom-btn').forEach(btn => {
        const v = parseFloat(btn.dataset.zoom);
        if (Math.abs(v - zoomActual) < 0.001) btn.classList.add('activo');
        else btn.classList.remove('activo');
    });
}

function cambiarTema(nombre) { aplicarTema(nombre); }
function cambiarZoom(valor) { aplicarZoom(valor); }

function abrirConfiguracion() {
    document.getElementById('modalConfiguracion').classList.add('activo');
    actualizarBotonesTema();
    actualizarBotonesZoom();
}

function cerrarModalConfiguracion() {
    document.getElementById('modalConfiguracion').classList.remove('activo');
}

// ============================================================
// INICIALIZACIÓN
// ============================================================
function init() {
    cargarAdministradores();
    cargarContribuyentes();
    cargarFacturasEmitidas();
    cargarFacturasAnuladas();
    cargarOrdenesInteligentes();
    cargarHistorialNIT();
    cargarContadoresSerie();
    cargarPreciosActuales();
    configurarEnter();

    const temaGuardado = load('temaActual', 'azul');
    const zoomGuardado = load('zoomActual', 1);
    aplicarTema(typeof temaGuardado === 'string' ? temaGuardado : 'azul');
    aplicarZoom(parseFloat(zoomGuardado) || 1);

    console.log('SAFgt · Sistema listo (Anulación con Menú Fiscal + Enter en Login)');
}

// ============================================================
// STORAGE HELPERS
// ============================================================
function load(key, def = []) {
    try {
        const d = localStorage.getItem(key);
        return d !== null ? JSON.parse(d) : def;
    } catch { return def; }
}
function save(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// ============================================================
// ADMINISTRADORES
// ============================================================
function cargarAdministradores() {
    administradores = load('administradores', []);

    let migrado = false;
    administradores.forEach(a => {
        if (a.nombre === ADMIN_PRINCIPAL_NOMBRE_ANTIGUO) {
            a.nombre = ADMIN_PRINCIPAL_NOMBRE;
            a.esPrincipal = true;
            migrado = true;
        }
    });

    const principal = administradores.find(a => a.nombre === ADMIN_PRINCIPAL_NOMBRE);
    if (!principal) {
        administradores.unshift({
            nombre: ADMIN_PRINCIPAL_NOMBRE,
            password: ADMIN_PRINCIPAL_PASS,
            esPrincipal: true
        });
        migrado = true;
    } else {
        principal.esPrincipal = true;
    }

    if (administradores.length === 0) {
        administradores = [{
            nombre: ADMIN_PRINCIPAL_NOMBRE,
            password: ADMIN_PRINCIPAL_PASS,
            esPrincipal: true
        }];
        migrado = true;
    }

    if (migrado) save('administradores', administradores);
    actualizarSelectAdmins();
}

function actualizarSelectAdmins() {
    const sel = document.getElementById('adminLoginSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Selecciona administrador --</option>';
    administradores.forEach((a, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = a.nombre;
        sel.appendChild(opt);
    });
}

function renderListaAdmins() {
    const cont = document.getElementById('listaAdmins');
    if (!cont) return;
    if (administradores.length === 0) {
        cont.innerHTML = '<div class="sin-usuarios">No hay administradores</div>';
        return;
    }
    let html = '';
    administradores.forEach((a, i) => {
        const esPrincipal = a.esPrincipal === true || a.nombre === ADMIN_PRINCIPAL_NOMBRE;
        const badge = esPrincipal
            ? ' <span style="background:#e8eaf6;color:#1a3a5c;padding:2px 8px;border-radius:10px;font-size:0.62rem;font-weight:700;">PRINCIPAL</span>'
            : '';
        const botonEliminar = esPrincipal
            ? ''
            : `<button class="btn-eliminar-usuario" onclick="eliminarAdmin(${i})" style="background:#c62828;color:white;border:none;padding:3px 10px;border-radius:6px;cursor:pointer;font-size:0.65rem;font-weight:700;">Eliminar</button>`;
        html += `<div class="item-usuario">
            <div><span class="nit">${a.nombre}</span>${badge}</div>
            ${botonEliminar}
        </div>`;
    });
    cont.innerHTML = html;
}

function agregarAdmin() {
    const nombre = document.getElementById('nuevoAdminNombre').value.trim();
    const pass = document.getElementById('nuevoAdminPass').value.trim();
    if (!nombre || !pass) {
        mostrarMsg('ErrorSuperuser2', 'Completa todos los campos', 'error');
        return;
    }
    if (administradores.some(a => a.nombre.toLowerCase() === nombre.toLowerCase())) {
        mostrarMsg('ErrorSuperuser2', 'Ese administrador ya existe', 'error');
        return;
    }
    administradores.push({ nombre, password: pass });
    save('administradores', administradores);
    actualizarSelectAdmins();
    renderListaAdmins();
    document.getElementById('nuevoAdminNombre').value = '';
    document.getElementById('nuevoAdminPass').value = '';
    mostrarMsg('Superuser', `"${nombre}" agregado`, 'exito');
}

function eliminarAdmin(i) {
    const admin = administradores[i];
    if (!admin) return;

    if (admin.esPrincipal === true || admin.nombre === ADMIN_PRINCIPAL_NOMBRE) {
        alert('Este administrador es el principal y no se puede eliminar.');
        return;
    }

    if (administradores.length <= 1) {
        alert('Debe existir al menos un administrador');
        return;
    }

    if (!confirm(`¿Eliminar a "${admin.nombre}"?`)) return;
    administradores.splice(i, 1);
    save('administradores', administradores);
    actualizarSelectAdmins();
    renderListaAdmins();
}

// ============================================================
// SUPERADMIN
// ============================================================
function abrirSuperuser() {
    document.getElementById('modalSuperuser').classList.add('activo');
    document.getElementById('superuserLogin').style.display = 'block';
    document.getElementById('superuserPanel').style.display = 'none';
    document.getElementById('passSuperuser').value = '';
    limpiarMsgs();
}

function cerrarModalSuperuser() {
    document.getElementById('modalSuperuser').classList.remove('activo');
}

function loginSuperuser() {
    const pass = document.getElementById('passSuperuser').value.trim();
    if (pass === 'Superadmin') {
        document.getElementById('superuserLogin').style.display = 'none';
        document.getElementById('superuserPanel').style.display = 'block';
        renderListaAdmins();
        limpiarMsgs();
    } else {
        mostrarMsg('ErrorSuperuser', 'Contraseña incorrecta', 'error');
    }
}

// ============================================================
// CONTRIBUYENTES
// ============================================================
function cargarContribuyentes() {
    contribuyentes = load('contribuyentes', []);
    if (contribuyentes.length === 0) {
        contribuyentes = [
            { nit: '123456-7', nombre: 'Juan Pérez', empresa: 'Pérez y Asociados', direccion: '4 calle 10 av zona 3 Barillas', password: '1234', regimen: 'general' },
            { nit: '789012-3', nombre: 'María López', empresa: 'López y Cía.', direccion: 'Zona 1, Ciudad', password: '5678', regimen: 'pequeno' }
        ];
        save('contribuyentes', contribuyentes);
    }
    renderizarListaAdmin();
    actualizarSelectNIT();
}

function guardarContribuyentes() { save('contribuyentes', contribuyentes); }

function renderizarListaAdmin() {
    const cont = document.getElementById('listaUsuarios');
    if (!cont) return;
    if (contribuyentes.length === 0) {
        cont.innerHTML = '<div class="sin-usuarios">No hay contribuyentes registrados</div>';
        return;
    }
    let html = '';
    contribuyentes.forEach((c, i) => {
        const regTxt = c.regimen === 'pequeno' ? 'Pequeño Contribuyente (5%)' : 'General (12%)';
        html += `<div class="item-usuario">
            <div>
                <span class="nit">${c.nit}</span>
                <span class="nombre">${c.nombre}</span>
                <span class="empresa">${c.empresa}</span>
                <div style="font-size:0.65rem;color:#666;">${c.direccion || ''}</div>
                <div style="font-size:0.65rem;color:#666;">Régimen: ${regTxt}</div>
            </div>
            <button class="btn-eliminar-usuario" onclick="eliminarContribuyente(${i})" style="background:#c62828;color:white;border:none;padding:3px 10px;border-radius:6px;cursor:pointer;font-size:0.65rem;font-weight:700;">Eliminar</button>
        </div>`;
    });
    cont.innerHTML = html;
}

function actualizarSelectNIT() {
    const sel = document.getElementById('nitLogin');
    const posSel = document.getElementById('posNitLogin');
    if (sel) {
        sel.innerHTML = '<option value="">-- Selecciona tu NIT --</option>';
        contribuyentes.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.nit;
            opt.textContent = `${c.nit} - ${c.nombre}`;
            sel.appendChild(opt);
        });
    }
    if (posSel) {
        posSel.innerHTML = '<option value="">-- Selecciona tu NIT --</option>';
        contribuyentes.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.nit;
            opt.textContent = `${c.nit} - ${c.nombre}`;
            posSel.appendChild(opt);
        });
    }
}

function registrarContribuyente() {
    const nit = document.getElementById('nitRegistro').value.trim();
    const nombre = document.getElementById('nombreRegistro').value.trim();
    const empresa = document.getElementById('empresaRegistro').value.trim();
    const direccion = document.getElementById('direccionRegistro').value.trim();
    const regimen = document.getElementById('regimenRegistro').value;
    const password = document.getElementById('passRegistro').value.trim();

    if (!nit || !nombre || !empresa || !direccion || !regimen || !password) {
        mostrarMsg('ErrorRegistro', 'Completa todos los campos', 'error');
        return;
    }
    if (contribuyentes.some(c => c.nit === nit)) {
        mostrarMsg('ErrorRegistro', 'Este NIT ya está registrado', 'error');
        return;
    }

    contribuyentes.push({ nit, nombre, empresa, direccion, regimen, password });
    guardarContribuyentes();
    renderizarListaAdmin();
    actualizarSelectNIT();

    ['nitRegistro','nombreRegistro','empresaRegistro','direccionRegistro','passRegistro'].forEach(id => {
        document.getElementById(id).value = '';
    });
    document.getElementById('regimenRegistro').value = '';
    mostrarMsg('Registro', `"${nombre}" registrado`, 'exito');
}

function eliminarContribuyente(i) {
    if (!confirm(`¿Eliminar a "${contribuyentes[i].nombre}"?`)) return;
    contribuyentes.splice(i, 1);
    guardarContribuyentes();
    renderizarListaAdmin();
    actualizarSelectNIT();
}

// ============================================================
// FACTURAS EMITIDAS / ANULADAS
// ============================================================
function cargarFacturasEmitidas() { facturasEmitidas = load('facturasEmitidas', []); }
function guardarFacturasEmitidas() { save('facturasEmitidas', facturasEmitidas); }
function cargarFacturasAnuladas() { facturasAnuladas = load('facturasAnuladas', []); }
function guardarFacturasAnuladas() { save('facturasAnuladas', facturasAnuladas); }
function cargarOrdenesInteligentes() { ordenesInteligentes = load('ordenesInteligentes', []); }
function guardarOrdenesInteligentes() { save('ordenesInteligentes', ordenesInteligentes); }
function cargarHistorialNIT() { historialNIT = load('historialNIT', []); }
function guardarHistorialNIT() { save('historialNIT', historialNIT); }
function cargarContadoresSerie() { contadoresSerie = load('contadoresSerie', {}); }
function guardarContadoresSerie() { save('contadoresSerie', contadoresSerie); }

// ============================================================
// NAVEGACIÓN Y LOGICA DE INICIO
// ============================================================
function ocultarTodo() {
    document.getElementById('vistaInicio').style.display = 'none';
    document.getElementById('app').style.display = 'none';
    ['formLoginUsuario','formLoginPOS','formLoginAuditor','panelAuditor','panelUsuario','panelPOS'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.remove('activo');
    });
}

function volverInicio() {
    ocultarTodo();
    document.getElementById('vistaInicio').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
    limpiarMsgs();
    usuarioActual = null;
    adminActual = null;
}

function mostrarLoginUsuario() {
    ocultarTodo();
    document.getElementById('app').style.display = 'block';
    document.getElementById('formLoginUsuario').classList.add('activo');
    limpiarMsgs();
    actualizarSelectNIT();
    document.getElementById('passLogin').value = '';
}

function mostrarLoginPOS() {
    ocultarTodo();
    document.getElementById('app').style.display = 'block';
    document.getElementById('formLoginPOS').classList.add('activo');
    limpiarMsgs();
    actualizarSelectNIT();
    document.getElementById('posPassLogin').value = '';
}

function mostrarLoginAuditor() {
    ocultarTodo();
    document.getElementById('app').style.display = 'block';
    document.getElementById('formLoginAuditor').classList.add('activo');
    limpiarMsgs();
    actualizarSelectAdmins();
    document.getElementById('passAuditor').value = '';
}

// ============================================================
// LOGINS
// ============================================================
function loginUsuario() {
    const nit = document.getElementById('nitLogin').value;
    const pass = document.getElementById('passLogin').value.trim();
    if (!nit) { mostrarMsg('ErrorLogin', 'Selecciona tu NIT', 'error'); return; }
    if (!pass) { mostrarMsg('ErrorLogin', 'Ingresa tu contraseña', 'error'); return; }

    const encontrado = contribuyentes.find(c => c.nit === nit && c.password === pass);
    if (encontrado) {
        usuarioActual = encontrado;
        setTimeout(() => {
            ocultarTodo();
            document.getElementById('app').style.display = 'block';
            document.getElementById('panelUsuario').classList.add('activo');
            document.getElementById('app').classList.add('sesion-activa');
            
            document.getElementById('menuSuperior').style.display = 'flex';
            cambiarPanel('contribuyentes');
            
            cargarInfoUsuario();
            llenarSelectMes();
            cargarDatosFactura();
            cargarDatosInteligentes();
            cargarListaFacturas();
            cargarBusquedaFacturas();
            cargarListaOrdenes();
            cargarListaAnuladas();
            limpiarMsgs();
            document.getElementById('tipoDocumento').value = 'CF';
            cambiarTipoDocumento();
            
            cargarInventario();
        }, 300);
    } else {
        mostrarMsg('ErrorLogin', 'Contraseña incorrecta', 'error');
    }
}

function loginPOS() {
    const nit = document.getElementById('posNitLogin').value;
    const pass = document.getElementById('posPassLogin').value.trim();
    
    if (!nit) { mostrarMsg('ErrorPOS', 'Selecciona tu NIT', 'error'); return; }
    if (!pass) { mostrarMsg('ErrorPOS', 'Ingresa tu contraseña', 'error'); return; }

    const encontrado = contribuyentes.find(c => c.nit === nit && c.password === pass);
    if (encontrado) {
        usuarioActual = encontrado;
        setTimeout(() => {
            ocultarTodo();
            document.getElementById('app').style.display = 'block';
            document.getElementById('panelPOS').classList.add('activo');
            document.getElementById('app').classList.add('sesion-activa');
            document.getElementById('app').classList.add('pos-expandido');
            
            cargarInventario();
            limpiarCarritoPOS();
            cambiarTabPOS('ventas');
        }, 300);
    } else {
        mostrarMsg('ErrorPOS', 'Contraseña incorrecta. Verifica tus datos.', 'error');
    }
}

function loginAuditor() {
    const idx = document.getElementById('adminLoginSelect').value;
    const pass = document.getElementById('passAuditor').value.trim();
    if (idx === '') { mostrarMsg('ErrorAuditor', 'Selecciona un administrador', 'error'); return; }
    const admin = administradores[parseInt(idx)];
    if (admin && admin.password === pass) {
        adminActual = admin;
        ocultarTodo();
        document.getElementById('app').style.display = 'block';
        document.getElementById('panelAuditor').classList.add('activo');
        document.getElementById('app').classList.add('sesion-activa');
        document.getElementById('adminConectadoInfo').innerHTML = `Conectado como: <strong>${admin.nombre}</strong>`;
        limpiarMsgs();
        renderizarListaAdmin();
        document.getElementById('passAuditor').value = '';
    } else {
        mostrarMsg('ErrorAuditor', 'Contraseña incorrecta', 'error');
    }
}

function cerrarSesionAuditor() {
    if (confirm('¿Cerrar sesión?')) { adminActual = null; volverInicio(); }
}

function cerrarSesionUsuario() {
    if (confirm('¿Cerrar sesión?')) { 
        const cabecera = document.querySelector('.cabecera-panel-usuario');
        if (cabecera) cabecera.classList.remove('oculto');
        usuarioActual = null; 
        volverInicio(); 
    }
}

function cerrarSesionPOS() {
    if (confirm('¿Cerrar sesión del POS?')) { usuarioActual = null; volverInicio(); }
}

// ============================================================
// MENSAJES
// ============================================================
function limpiarMsgs() {
    document.querySelectorAll('.mensaje-error, .mensaje-exito').forEach(el => {
        el.classList.remove('mostrar');
        el.textContent = '';
    });
}
function mostrarMsg(tipo, texto, clase) {
    const map = {
        ErrorLogin: 'mensajeErrorLogin',
        ErrorPOS: 'mensajeErrorPOS',
        Registro: 'mensajeRegistro',
        ErrorRegistro: 'mensajeErrorRegistro',
        ErrorAuditor: 'mensajeErrorAuditor',
        ErrorSuperuser: 'mensajeErrorSuperuser',
        Superuser: 'mensajeSuperuser',
        ErrorSuperuser2: 'mensajeErrorSuperuser2'
    };
    const el = document.getElementById(map[tipo]);
    if (el) {
        el.textContent = texto;
        el.className = `mensaje-${clase} mostrar`;
        setTimeout(() => el.classList.remove('mostrar'), 4000);
    }
}

// ============================================================
// NAVEGACIÓN PANEL FACTURACIÓN
// ============================================================
function cambiarPanel(panel) {
    if ((panel === 'precios' || panel === 'facturasInteligentes') && !esRegimenGeneral()) {
        mostrarAvisoRegimen('No tiene acceso por el tipo de régimen fiscal');
        return;
    }

    document.querySelectorAll('#panelUsuario .panel').forEach(p => p.classList.remove('activo'));
    const map = {
        contribuyentes: 'panelContribuyentes',
        facturas: 'panelFacturas',
        facturasInteligentes: 'panelFacturasInteligentes',
        precios: 'panelPrecios',
        busqueda: 'panelBusqueda',
        anuladas: 'panelAnuladas'
    };
    const el = document.getElementById(map[panel]);
    if (el) el.classList.add('activo');

    document.querySelectorAll('#menuSuperior .btn-menu-opcion').forEach(b => b.classList.remove('activo'));
    const btnMap = {
        contribuyentes: 'btnContribuyentes',
        facturas: 'btnFacturas',
        facturasInteligentes: 'btnFacturasInteligentes',
        precios: 'btnPrecios',
        busqueda: 'btnBusqueda',
        anuladas: 'btnAnuladas'
    };
    const btn = document.getElementById(btnMap[panel]);
    if (btn) btn.classList.add('activo');

    const cabecera = document.querySelector('.cabecera-panel-usuario');
    if (cabecera) {
        if (panel === 'busqueda' || panel === 'anuladas') {
            cabecera.classList.add('oculto');
        } else {
            cabecera.classList.remove('oculto');
        }
    }

    if (panel === 'facturas') { cargarDatosFactura(); cargarListaFacturas(); }
    if (panel === 'facturasInteligentes') { cargarDatosInteligentes(); cargarListaOrdenes(); }
    if (panel === 'precios') cargarPreciosActuales();
    if (panel === 'busqueda') cargarBusquedaFacturas();
    if (panel === 'anuladas') cargarListaAnuladas();
    if (panel === 'contribuyentes') { cargarInfoUsuario(); llenarSelectMes(); }
}

// ============================================================
// INFO CONTRIBUYENTE + SELECTOR DE MES
// ============================================================
function cargarInfoUsuario() {
    if (!usuarioActual) return;
    document.getElementById('userNit').textContent = usuarioActual.nit;
    document.getElementById('userNombre').textContent = usuarioActual.nombre;
    document.getElementById('userEmpresa').textContent = usuarioActual.empresa;
    document.getElementById('userDireccion').textContent = usuarioActual.direccion || '-';
    document.getElementById('userRegimen').textContent =
        usuarioActual.regimen === 'pequeno' ? 'Pequeño Contribuyente (IVA 5%)' : 'General (IVA 12%)';
    actualizarStatsMes();
}

function llenarSelectMes() {
    const sel = document.getElementById('selectMes');
    if (!sel || !usuarioActual) return;
    const facturas = facturasEmitidas.filter(f => f.nitEmisor === usuarioActual.nit && !f.anulada);
    const meses = new Set();
    facturas.forEach(f => {
        if (f.fecha) {
            let y, m;
            if (f.fecha.includes('/')) {
                const p = f.fecha.split('/');
                y = p[2]; m = p[1];
            } else {
                const p = f.fecha.split('-');
                y = p[0]; m = p[1];
            }
            if (y && m) meses.add(`${y}-${m}`);
        }
    });
    sel.innerHTML = '<option value="todos">Todos los meses</option>';
    Array.from(meses).sort().reverse().forEach(mes => {
        const [yy, mm] = mes.split('-');
        const nombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        const opt = document.createElement('option');
        opt.value = mes;
        opt.textContent = `${nombres[parseInt(mm)-1]} ${yy}`;
        sel.appendChild(opt);
    });
}

function actualizarStatsMes() {
    if (!usuarioActual) return;
    const mesSel = document.getElementById('selectMes').value;
    const facturas = facturasEmitidas.filter(f => f.nitEmisor === usuarioActual.nit && !f.anulada);

    let totalGral = 0;
    facturas.forEach(f => totalGral += (parseFloat(f.total) || 0));

    document.getElementById('userTotalFacturas').textContent = facturas.length;
    document.getElementById('userMontoTotal').textContent = 'Q ' + totalGral.toFixed(2);

    let factPeriodo = facturas;
    if (mesSel !== 'todos') {
        factPeriodo = facturas.filter(f => f.fecha && f.fecha.includes(mesSel));
    }
    let totalPer = 0;
    factPeriodo.forEach(f => totalPer += (parseFloat(f.total) || 0));

    document.getElementById('userFacturasPeriodo').textContent = factPeriodo.length;
    document.getElementById('userMontoPeriodo').textContent = 'Q ' + totalPer.toFixed(2);
}

function esRegimenGeneral() {
    return usuarioActual && usuarioActual.regimen === 'general';
}

function mostrarAvisoRegimen(txt) {
    const av = document.getElementById('avisoRegimen');
    if (!av) return;
    av.textContent = txt;
    av.classList.add('mostrar');
    setTimeout(() => av.classList.remove('mostrar'), 3000);
}

// ============================================================
// MÓDULO DE FACTURACIÓN NORMAL
// ============================================================
function cargarDatosFactura() {
    if (!usuarioActual) return;
    document.getElementById('facturaEmisor').textContent = usuarioActual.nombre;
    document.getElementById('facturaNitEmisor').textContent = usuarioActual.nit;
    document.getElementById('facturaEstablecimiento').textContent = '001';
    document.getElementById('facturaDireccion').textContent = usuarioActual.direccion || 'Guatemala';

    const hoy = new Date();
    const fechaStr = `${String(hoy.getDate()).padStart(2,'0')}/${String(hoy.getMonth()+1).padStart(2,'0')}/${hoy.getFullYear()}`;
    document.getElementById('facturaFecha').textContent = fechaStr;
    document.getElementById('facturaSerie').textContent = 'A-' + usuarioActual.nit.replace(/[^0-9]/g, '').slice(0,4);

    let keyCont = 'cont_' + usuarioActual.nit;
    if (!contadoresSerie[keyCont]) contadoresSerie[keyCont] = 1;
    document.getElementById('facturaNumero').textContent = String(contadoresSerie[keyCont]).padStart(6, '0');

    itemsFacturaActual = [];
    productoSeleccionadoFactura = null;
    document.getElementById('categoriaVenta').value = '';
    cambiarCategoriaVenta();
    renderItemsFactura();
}

function cambiarTipoDocumento() {
    const tipo = document.getElementById('tipoDocumento').value;
    const nombreInput = document.getElementById('nombreComprador');
    const dirInput = document.getElementById('direccionComprador');
    const nitInput = document.getElementById('nitComprador');

    if (tipo === 'CF') {
        nitInput.value = 'C/F';
        nitInput.disabled = true;
        nombreInput.value = 'Consumidor Final';
        nombreInput.disabled = true;
        dirInput.value = 'Ciudad';
        dirInput.disabled = true;
    } else {
        nitInput.disabled = false;
        nitInput.value = '';
        nombreInput.disabled = false;
        nombreInput.value = '';
        dirInput.disabled = false;
        dirInput.value = '';
        nitInput.focus();
    }
}

function buscarComprador() {
    const val = document.getElementById('nitComprador').value.trim().toUpperCase();
    const sug = document.getElementById('sugerenciasNIT');
    if (!val || val === 'C/F') {
        sug.style.display = 'none';
        return;
    }
    const coincidencias = historialNIT.filter(h => h.nit.includes(val) || h.nombre.toUpperCase().includes(val));
    if (coincidencias.length === 0) {
        sug.style.display = 'none';
        return;
    }
    let html = '';
    coincidencias.forEach(c => {
        html += `<div style="padding:6px 10px; cursor:pointer; border-bottom:1px solid #eee;" onclick="seleccionarNIT('${c.nit}', '${c.nombre}', '${c.direccion || ''}')">
            <strong>${c.nit}</strong> - ${c.nombre}
        </div>`;
    });
    sug.innerHTML = html;
    sug.style.display = 'block';
}

function seleccionarNIT(nit, nombre, dir) {
    document.getElementById('nitComprador').value = nit;
    document.getElementById('nombreComprador').value = nombre;
    document.getElementById('direccionComprador').value = dir;
    document.getElementById('sugerenciasNIT').style.display = 'none';
}

function cambiarCategoriaVenta() {
    const cat = document.getElementById('categoriaVenta').value;
    categoriaVentaActual = cat;
    const bloqueBien = document.getElementById('bloqueBien');
    const bloqueServicio = document.getElementById('bloqueServicio');
    const tipoBien = document.getElementById('tipoBien');

    bloqueBien.style.display = 'none';
    bloqueServicio.style.display = 'none';
    tipoBien.innerHTML = '<option value="">-- Selecciona --</option>';

    if (cat === 'bien') {
        bloqueBien.style.display = 'block';
        if (esRegimenGeneral()) {
            tipoBien.innerHTML += `<option value="combustible">Combustible</option>`;
        }
        tipoBien.innerHTML += `<option value="producto">Producto de Inventario</option>`;
    } else if (cat === 'servicio') {
        bloqueServicio.style.display = 'block';
    }
    itemsFacturaActual = [];
    renderItemsFactura();
}

function cambiarTipoBien() {
    const tipo = document.getElementById('tipoBien').value;
    tipoBienActual = tipo;
    const bComb = document.getElementById('bloqueCombustible');
    const bProd = document.getElementById('bloqueProducto');

    bComb.style.display = 'none';
    bProd.style.display = 'none';

    if (tipo === 'combustible') bComb.style.display = 'block';
    if (tipo === 'producto') bProd.style.display = 'block';
}

function buscarProductoInventarioFactura() {
    const q = document.getElementById('productoBusquedaFactura').value.trim().toLowerCase();
    const cont = document.getElementById('sugerenciasProductoFactura');
    if (!q) {
        cont.style.display = 'none';
        productoSeleccionadoFactura = null;
        document.getElementById('productoPrecio').value = '';
        return;
    }
    const encontrados = inventarioActual.filter(p => p.codigo.toLowerCase().includes(q) || p.descripcion.toLowerCase().includes(q));
    if (encontrados.length === 0) {
        cont.style.display = 'none';
        return;
    }
    let html = '';
    encontrados.forEach(p => {
        html += `<div style="padding:6px 8px; cursor:pointer; border-bottom:1px solid #eee;" onclick='seleccionarProductoFactura(${JSON.stringify(p)})'>
            <strong>${p.codigo}</strong> - ${p.descripcion} (Stock: ${p.existencia}) | Q${p.precioVenta}
        </div>`;
    });
    cont.innerHTML = html;
    cont.style.display = 'block';
}

function seleccionarProductoFactura(prod) {
    productoSeleccionadoFactura = prod;
    document.getElementById('productoBusquedaFactura').value = prod.codigo + ' - ' + prod.descripcion;
    document.getElementById('productoPrecio').value = prod.precioVenta;
    document.getElementById('sugerenciasProductoFactura').style.display = 'none';
    document.getElementById('productoCantidad').focus();
}

function agregarItemProductoInventario() {
    if (!productoSeleccionadoFactura) {
        alert('Selecciona un producto del inventario');
        return;
    }
    const cant = parseFloat(document.getElementById('productoCantidad').value) || 1;
    if (cant <= 0) {
        alert('Ingresa una cantidad válida');
        return;
    }
    if (cant > productoSeleccionadoFactura.existencia) {
        alert(`Stock insuficiente. Existencia actual: ${productoSeleccionadoFactura.existencia}`);
        return;
    }

    const subtotal = cant * productoSeleccionadoFactura.precioVenta;
    itemsFacturaActual.push({
        tipo: 'producto',
        codigo: productoSeleccionadoFactura.codigo,
        descripcion: productoSeleccionadoFactura.descripcion,
        cantidad: cant,
        precioUnitario: productoSeleccionadoFactura.precioVenta,
        subtotal: subtotal
    });

    document.getElementById('productoBusquedaFactura').value = '';
    document.getElementById('productoCantidad').value = '';
    document.getElementById('productoPrecio').value = '';
    productoSeleccionadoFactura = null;

    renderItemsFactura();
}

function agregarItemCombustible() {
    const tipoComb = document.getElementById('combustibleTipo').value;
    const monto = parseFloat(document.getElementById('combustibleMonto').value) || 0;
    if (monto <= 0) { alert('Ingresa un monto válido'); return; }

    const precios = load('preciosCombustible', { superior: 35.00, regular: 33.00, diesel: 30.00 });
    const pVenta = precios[tipoComb] || 35.00;
    const galones = monto / pVenta;

    itemsFacturaActual.push({
        tipo: 'combustible',
        combustibleTipo: tipoComb,
        descripcion: `Gasolina ${tipoComb.toUpperCase()}`,
        monto: monto,
        galones: galones,
        precioUnitario: pVenta
    });

    document.getElementById('combustibleMonto').value = '';
    renderItemsFactura();
}

function calcularServicio() {}

function eliminarItemFactura(i) {
    itemsFacturaActual.splice(i, 1);
    renderItemsFactura();
}

function limpiarFactura() {
    itemsFacturaActual = [];
    document.getElementById('nitComprador').value = 'C/F';
    document.getElementById('nombreComprador').value = 'Consumidor Final';
    document.getElementById('direccionComprador').value = 'Ciudad';
    document.getElementById('tipoDocumento').value = 'CF';
    cambiarTipoDocumento();
    renderItemsFactura();
}

function renderItemsFactura() {
    const cont = document.getElementById('listaItemsFactura');
    const lineaIDP = document.getElementById('lineaIDP');
    const lineaGalones = document.getElementById('lineaGalones');
    const boxIDP = document.getElementById('boxResumenIDP');
    const boxGalones = document.getElementById('boxResumenGalones');

    if (itemsFacturaActual.length === 0) {
        cont.innerHTML = '<div class="text-center text-muted" style="padding:10px; font-size:0.8rem;">No hay items agregados</div>';
        actualizarTotalesFactura(0, 0, 0);
        return;
    }

    let html = '';
    let totalPago = 0;
    let totalGalones = 0;
    let esCombustible = false;

    itemsFacturaActual.forEach((it, i) => {
        if (it.tipo === 'combustible') {
            esCombustible = true;
            totalPago += it.monto;
            totalGalones += it.galones;
            html += `<div class="item-factura">
                <span class="desc"><strong>${it.descripcion}</strong> · ${it.galones.toFixed(4)} Gal. (Q${it.precioUnitario.toFixed(2)}/gal)</span>
                <span class="valor">Q ${it.monto.toFixed(2)} <button onclick="eliminarItemFactura(${i})" style="background:var(--red);color:white;border:none;padding:2px 6px;border-radius:4px;cursor:pointer;font-size:0.65rem;">X</button></span>
            </div>`;
        } else if (it.tipo === 'producto') {
            totalPago += it.subtotal;
            html += `<div class="item-factura">
                <span class="desc"><strong>[${it.codigo}]</strong> ${it.descripcion} x ${it.cantidad} @ Q${it.precioUnitario.toFixed(2)}</span>
                <span class="valor">Q ${it.subtotal.toFixed(2)} <button onclick="eliminarItemFactura(${i})" style="background:var(--red);color:white;border:none;padding:2px 6px;border-radius:4px;cursor:pointer;font-size:0.65rem;">X</button></span>
            </div>`;
        }
    });

    cont.innerHTML = html;

    if (esCombustible) {
        lineaIDP.style.display = 'block';
        lineaGalones.style.display = 'block';
        boxIDP.style.display = 'block';
        boxGalones.style.display = 'block';
        
        let idpTotal = 0;
        itemsFacturaActual.forEach(it => {
            if(it.tipo === 'combustible') {
                let idpUn = it.combustibleTipo === 'diesel' ? 1.30 : (it.combustibleTipo === 'superior' ? 4.23 : 4.14);
                if (exentoIDP) idpUn = 0;
                idpTotal += (it.galones * idpUn);
            }
        });

        let tasaIVA = usuarioActual && usuarioActual.regimen === 'pequeno' ? 0.05 : 0.12;
        if (exentoIVA) tasaIVA = 0;
        let subtotalBase = totalPago / (1 + tasaIVA);
        let valorIVA = totalPago - subtotalBase;

        actualizarTotalesFactura(totalPago, valorIVA, idpTotal, totalGalones);
    } else {
        lineaIDP.style.display = 'none';
        lineaGalones.style.display = 'none';
        boxIDP.style.display = 'none';
        boxGalones.style.display = 'none';

        let tasaIVA = usuarioActual && usuarioActual.regimen === 'pequeno' ? 0.05 : 0.12;
        let subtotalBase = totalPago / (1 + tasaIVA);
        let valorIVA = totalPago - subtotalBase;

        actualizarTotalesFactura(totalPago, valorIVA, 0, 0);
    }
}

function actualizarTotalesFactura(totalPago, iva, idp, galones = 0) {
    document.getElementById('detalleTotalPago').textContent = 'Q ' + totalPago.toFixed(2);
    document.getElementById('detalleIDPValor').textContent = 'Q ' + idp.toFixed(2);
    document.getElementById('detalleIVAValor').textContent = 'Q ' + iva.toFixed(2);
    document.getElementById('detalleSubtotal').textContent = 'Q ' + (totalPago - iva).toFixed(2);
    document.getElementById('detalleGalones').textContent = galones.toFixed(4);

    document.getElementById('resumenSubtotal').textContent = 'Q ' + (totalPago - iva).toFixed(2);
    document.getElementById('resumenIDP').textContent = 'Q ' + idp.toFixed(2);
    document.getElementById('resumenIVA').textContent = 'Q ' + iva.toFixed(2);
    document.getElementById('resumenTotal').textContent = 'Q ' + totalPago.toFixed(2);
    document.getElementById('resumenGalones').textContent = galones.toFixed(4);
}

function generarFactura() {
    if (!usuarioActual) return;
    if (itemsFacturaActual.length === 0) {
        alert('Agrega al menos un producto o servicio a la factura.');
        return;
    }

    const nitComp = document.getElementById('nitComprador').value.trim() || 'C/F';
    const nomComp = document.getElementById('nombreComprador').value.trim() || 'Consumidor Final';
    const dirComp = document.getElementById('direccionComprador').value.trim() || 'Ciudad';

    let totalGral = 0;
    itemsFacturaActual.forEach(it => {
        totalGral += (it.monto || it.subtotal || 0);
    });

    const serie = document.getElementById('facturaSerie').textContent;
    const numero = document.getElementById('facturaNumero').textContent;
    const fecha = document.getElementById('facturaFecha').textContent;

    itemsFacturaActual.forEach(it => {
        if (it.tipo === 'producto') {
            const prodInv = inventarioActual.find(p => p.codigo === it.codigo);
            if (prodInv) {
                prodInv.existencia -= it.cantidad;
                if (prodInv.existencia < 0) prodInv.existencia = 0;
            }
        }
    });
    guardarInventario();

    const nuevaFac = {
        id: 'FAC-' + Date.now(),
        nitEmisor: usuarioActual.nit,
        nombreEmisor: usuarioActual.nombre,
        serie,
        numero,
        fecha,
        nitComprador: nitComp,
        nombreComprador: nomComp,
        direccionComprador: dirComp,
        items: [...itemsFacturaActual],
        total: totalGral,
        lote: 'MANUAL-' + Date.now().toString().slice(-6),
        anulada: false
    };

    facturasEmitidas.push(nuevaFac);
    guardarFacturasEmitidas();

    let keyCont = 'cont_' + usuarioActual.nit;
    contadoresSerie[keyCont] = (parseInt(numero) || 1) + 1;
    guardarContadoresSerie();

    if (nitComp !== 'C/F' && !historialNIT.some(h => h.nit === nitComp)) {
        historialNIT.push({ nit: nitComp, nombre: nomComp, direccion: dirComp });
        guardarHistorialNIT();
    }

    alert(`¡Factura ${serie}-${numero} generada con éxito!`);
    cargarDatosFactura();
    cargarListaFacturas();
}

// ============================================================
// MÓDULO POS (INVENTARIO Y VENTAS)
// ============================================================
function cargarInventario() {
    if (!usuarioActual) return;
    const key = 'inventario_' + usuarioActual.nit;
    inventarioActual = load(key, [
        { codigo: 'JEA-001', descripcion: 'Jeans Clásicos 501', costo: 350, precioVenta: 600, existence: 15, existencia: 15, categoria: 'ROPA', stockMinimo: 3, vence: '', referencia: 'R01', proveedor: 'Levi' },
        { codigo: 'JEA-002', descripcion: 'Jeans Slim Fit 514', costo: 300, precioVenta: 500, existence: 10, existencia: 10, categoria: 'ROPA', stockMinimo: 2, vence: '', referencia: 'R02', proveedor: 'AE' }
    ]);
    renderizarInventario();
}

function guardarInventario() {
    if (!usuarioActual) return;
    const key = 'inventario_' + usuarioActual.nit;
    save(key, inventarioActual);
}

function cambiarTabPOS(tab) {
    document.querySelectorAll('.tab-pos-btn').forEach(b => b.classList.remove('activo'));
    document.querySelectorAll('.subpanel-pos').forEach(p => p.classList.remove('activo'));

    if (tab === 'ventas') {
        document.getElementById('tabBtnVentas').classList.add('activo');
        document.getElementById('subpanelVentas').classList.add('activo');
        setTimeout(() => document.getElementById('posBuscador').focus(), 100);
    } else {
        document.getElementById('tabBtnInventario').classList.add('activo');
        document.getElementById('subpanelInventario').classList.add('activo');
        renderizarInventario();
    }
}

function renderizarInventario() {
    const tbody = document.getElementById('tablaInventarioBody');
    const filtro = document.getElementById('inventarioBuscador').value.trim().toLowerCase();
    const limiteSelect = document.getElementById('inventarioLimite').value;

    let filtrados = inventarioActual.filter(p => 
        p.codigo.toLowerCase().includes(filtro) || 
        p.descripcion.toLowerCase().includes(filtro) || 
        p.categoria.toLowerCase().includes(filtro)
    );

    if (limiteSelect !== 'todos') {
        const lim = parseInt(limiteSelect) || 10;
        filtrados = filtrados.slice(0, lim);
    }

    if (filtrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted" style="padding:20px;">No hay productos en el inventario</td></tr>';
        return;
    }

    let html = '';
    filtrados.forEach((p, i) => {
        let claseFila = '';
        if (p.existencia <= 0) claseFila = 'agotado';
        else if (p.existencia <= p.stockMinimo) claseFila = 'minimo';

        html += `<tr class="${claseFila}">
            <td><strong>${p.codigo}</strong></td>
            <td style="text-align:left;">${p.descripcion}</td>
            <td>Q ${parseFloat(p.costo).toFixed(2)}</td>
            <td><strong>Q ${parseFloat(p.precioVenta).toFixed(2)}</strong></td>
            <td><strong>${p.existencia}</strong></td>
            <td>${p.categoria}</td>
            <td>${p.stockMinimo}</td>
            <td>${p.vence || '-'}</td>
            <td><button class="btn-accion-tabla" onclick="editarProducto(${i})">✏️</button></td>
            <td><button class="btn-accion-tabla eliminar" onclick="eliminarProducto(${i})">🗑️</button></td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

function abrirModalProducto() {
    productoEditandoId = null;
    document.getElementById('prodCodigo').value = '';
    document.getElementById('prodDescripcion').value = '';
    document.getElementById('prodCosto').value = '';
    document.getElementById('prodGanancia').value = '';
    document.getElementById('prodPrecioVenta').value = '';
    document.getElementById('prodCategoria').value = '';
    document.getElementById('prodExistencia').value = '0';
    document.getElementById('prodVence').value = '';
    document.getElementById('prodStockMinimo').value = '1';
    document.getElementById('prodReferencia').value = '';
    document.getElementById('prodProveedor').value = '';
    document.getElementById('modalNuevoProducto').classList.add('activo');
}

function cerrarModalProducto() {
    document.getElementById('modalNuevoProducto').classList.remove('activo');
}

function calcularPrecioVenta() {
    const costo = parseFloat(document.getElementById('prodCosto').value) || 0;
    const ganancia = parseFloat(document.getElementById('prodGanancia').value) || 0;
    if (costo > 0 && ganancia > 0) {
        const venta = costo * (1 + (ganancia / 100));
        document.getElementById('prodPrecioVenta').value = venta.toFixed(2);
    }
}

function calcularGanancia() {
    const costo = parseFloat(document.getElementById('prodCosto').value) || 0;
    const venta = parseFloat(document.getElementById('prodPrecioVenta').value) || 0;
    if (costo > 0 && venta > costo) {
        const ganancia = ((venta / costo) - 1) * 100;
        document.getElementById('prodGanancia').value = ganancia.toFixed(2);
    }
}

function guardarProducto() {
    const codigo = document.getElementById('prodCodigo').value.trim();
    const descripcion = document.getElementById('prodDescripcion').value.trim();
    const costo = parseFloat(document.getElementById('prodCosto').value) || 0;
    const precioVenta = parseFloat(document.getElementById('prodPrecioVenta').value) || 0;
    const existencia = parseInt(document.getElementById('prodExistencia').value) || 0;
    const categoria = document.getElementById('prodCategoria').value.trim().toUpperCase() || 'GENERAL';
    const stockMinimo = parseInt(document.getElementById('prodStockMinimo').value) || 1;
    const vence = document.getElementById('prodVence').value;
    const referencia = document.getElementById('prodReferencia').value.trim();
    const proveedor = document.getElementById('prodProveedor').value.trim();

    if (!codigo || !descripcion || precioVenta <= 0) {
        alert('Completa los campos obligatorios (Código, Descripción y Precio de Venta)');
        return;
    }

    if (productoEditandoId !== null) {
        inventarioActual[productoEditandoId] = {
            codigo, descripcion, costo, precioVenta, existence: existencia, existencia, categoria, stockMinimo, vence, referencia, proveedor
        };
    } else {
        if (inventarioActual.some(p => p.codigo === codigo)) {
            alert('Ya existe un producto con este código');
            return;
        }
        inventarioActual.push({
            codigo, descripcion, costo, precioVenta, existence: existencia, existencia, categoria, stockMinimo, vence, referencia, proveedor
        });
    }

    guardarInventario();
    cerrarModalProducto();
    renderizarInventario();
}

function editarProducto(i) {
    const p = inventarioActual[i];
    productoEditandoId = i;
    document.getElementById('prodCodigo').value = p.codigo;
    document.getElementById('prodDescripcion').value = p.descripcion;
    document.getElementById('prodCosto').value = p.costo;
    document.getElementById('prodPrecioVenta').value = p.precioVenta;
    document.getElementById('prodCategoria').value = p.categoria;
    document.getElementById('prodExistencia').value = p.existencia;
    document.getElementById('prodVence').value = p.vence;
    document.getElementById('prodStockMinimo').value = p.stockMinimo;
    document.getElementById('prodReferencia').value = p.referencia;
    document.getElementById('prodProveedor').value = p.proveedor;
    document.getElementById('modalNuevoProducto').classList.add('activo');
}

function eliminarProducto(i) {
    if (!confirm('¿Eliminar este producto del inventario?')) return;
    inventarioActual.splice(i, 1);
    guardarInventario();
    renderizarInventario();
}

function exportarInventarioExcel() {
    let csv = 'Codigo,Descripcion,Costo,PrecioVenta,Existencia,Categoria,StockMinimo,Vencimiento\n';
    inventarioActual.forEach(p => {
        csv += `"${p.codigo}","${p.descripcion}",${p.costo},${p.precioVenta},${p.existencia},"${p.categoria}",${p.stockMinimo},"${p.vence}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventario_productos.csv';
    a.click();
}

function buscarProductoPOS() {
    const q = document.getElementById('posBuscador').value.trim().toLowerCase();
    const cont = document.getElementById('posResultadosBusqueda');
    if (!q) {
        cont.style.display = 'none';
        return;
    }
    const encontrados = inventarioActual.filter(p => p.codigo.toLowerCase().includes(q) || p.descripcion.toLowerCase().includes(q));
    if (encontrados.length === 0) {
        cont.style.display = 'none';
        return;
    }
    let html = '';
    encontrados.forEach(p => {
        html += `<div onclick='agregarAlCarritoPOS("${p.codigo}")'>
            <span class="prod-nombre">[${p.codigo}] ${p.descripcion}</span>
            <div class="prod-info">
                <span>Stock: ${p.existencia}</span>
                <strong style="color:var(--green-mid);">Q ${parseFloat(p.precioVenta).toFixed(2)}</strong>
            </div>
        </div>`;
    });
    cont.innerHTML = html;
    cont.style.display = 'block';
}

function agregarAlCarritoPOS(codigo) {
    const prod = inventarioActual.find(p => p.codigo === codigo);
    if (!prod) return;
    if (prod.existencia <= 0) {
        alert('Producto agotado');
        return;
    }

    const itemExistente = carritoPOS.find(i => i.codigo === codigo);
    if (itemExistente) {
        if (itemExistente.cantidad + 1 > prod.existencia) {
            alert('Stock máximo alcanzado');
            return;
        }
        itemExistente.cantidad++;
        itemExistente.subtotal = itemExistente.cantidad * itemExistente.precioUnitario;
    } else {
        carritoPOS.push({
            codigo: prod.codigo,
            descripcion: prod.descripcion,
            precioUnitario: prod.precioVenta,
            cantidad: 1,
            subtotal: prod.precioVenta
        });
    }

    document.getElementById('posBuscador').value = '';
    document.getElementById('posResultadosBusqueda').style.display = 'none';
    renderCarritoPOS();
    document.getElementById('posBuscador').focus();
}

function renderCarritoPOS() {
    const tbody = document.getElementById('tablaCarritoBody');
    if (carritoPOS.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted" style="padding:20px;">No hay productos en la venta</td></tr>';
        document.getElementById('posTotalPagar').textContent = 'Q 0.00';
        document.getElementById('posCantidadItems').textContent = '0 artículos';
        return;
    }

    let html = '';
    let totalPagar = 0;
    let totalItems = 0;

    carritoPOS.forEach((item, i) => {
        totalPagar += item.subtotal;
        totalItems += item.cantidad;
        html += `<tr>
            <td>
                <div style="display:flex; align-items:center; justify-content:center; gap:4px;">
                    <button class="btn-sm" style="padding:2px 6px;" onclick="cambiarCantPOS(${i}, -1)">-</button>
                    <span>${item.cantidad}</span>
                    <button class="btn-sm" style="padding:2px 6px;" onclick="cambiarCantPOS(${i}, 1)">+</button>
                </div>
            </td>
            <td><strong>${item.codigo}</strong></td>
            <td style="text-align:left;">${item.descripcion}</td>
            <td>Q ${parseFloat(item.precioUnitario).toFixed(2)}</td>
            <td><strong>Q ${parseFloat(item.subtotal).toFixed(2)}</strong></td>
            <td><button class="btn-danger" style="padding:2px 6px; font-size:0.65rem;" onclick="eliminarItemCarritoPOS(${i})">X</button></td>
        </tr>`;
    });

    tbody.innerHTML = html;
    document.getElementById('posTotalPagar').textContent = 'Q ' + totalPagar.toFixed(2);
    document.getElementById('posCantidadItems').textContent = `${totalItems} artículos (${carritoPOS.length} prod)`;
}

function cambiarCantPOS(i, delta) {
    const item = carritoPOS[i];
    const prod = inventarioActual.find(p => p.codigo === item.codigo);
    const nuevaCant = item.cantidad + delta;

    if (nuevaCant <= 0) {
        eliminarItemCarritoPOS(i);
        return;
    }
    if (prod && nuevaCant > prod.existencia) {
        alert('Stock insuficiente');
        return;
    }
    item.cantidad = nuevaCant;
    item.subtotal = item.cantidad * item.precioUnitario;
    renderCarritoPOS();
}

function eliminarItemCarritoPOS(i) {
    carritoPOS.splice(i, 1);
    renderCarritoPOS();
}

function limpiarCarritoPOS() {
    carritoPOS = [];
    renderCarritoPOS();
}

function cobrarPOS() {
    if (carritoPOS.length === 0) {
        alert('El carrito está vacío');
        return;
    }
    document.getElementById('modalCobroPOS').classList.add('activo');
    document.getElementById('cobroOpciones').style.display = 'block';
    document.getElementById('cobroFormulario').style.display = 'none';
}

function cerrarModalCobroPOS() {
    document.getElementById('modalCobroPOS').classList.remove('activo');
}

function procesarVentaCF() {
    finalizarVentaPOS('C/F', 'Consumidor Final', 'Ciudad');
}

function mostrarFormularioClientePOS() {
    document.getElementById('cobroOpciones').style.display = 'none';
    document.getElementById('cobroFormulario').style.display = 'block';
    document.getElementById('cobroNit').value = '';
    document.getElementById('cobroNombre').value = '';
    document.getElementById('cobroDireccion').value = '';
    document.getElementById('cobroNit').focus();
}

function volverOpcionesCobro() {
    document.getElementById('cobroOpciones').style.display = 'block';
    document.getElementById('cobroFormulario').style.display = 'none';
}

function buscarCompradorModalPOS() {
    const nit = document.getElementById('cobroNit').value.trim();
    const cliente = historialNIT.find(h => h.nit === nit);
    if (cliente) {
        document.getElementById('cobroNombre').value = cliente.nombre;
        document.getElementById('cobroDireccion').value = cliente.direccion || 'Ciudad';
    }
}

function procesarVentaConDatos() {
    const nit = document.getElementById('cobroNit').value.trim() || 'C/F';
    const nombre = document.getElementById('cobroNombre').value.trim() || 'Consumidor Final';
    const direccion = document.getElementById('cobroDireccion').value.trim() || 'Ciudad';
    finalizarVentaPOS(nit, nombre, direccion);
}

function finalizarVentaPOS(nit, nombre, direccion) {
    if (!usuarioActual) return;

    let totalGral = 0;
    carritoPOS.forEach(i => totalGral += i.subtotal);

    carritoPOS.forEach(item => {
        const prod = inventarioActual.find(p => p.codigo === item.codigo);
        if (prod) {
            prod.existencia -= item.cantidad;
            if (prod.existencia < 0) prod.existencia = 0;
        }
    });
    guardarInventario();

    let keyCont = 'cont_' + usuarioActual.nit;
    if (!contadoresSerie[keyCont]) contadoresSerie[keyCont] = 1;
    const numeroStr = String(contadoresSerie[keyCont]).padStart(6, '0');
    contadoresSerie[keyCont]++;
    guardarContadoresSerie();

    const serieStr = 'POS-' + usuarioActual.nit.replace(/[^0-9]/g, '').slice(0,4);
    const hoy = new Date();
    const fechaStr = `${String(hoy.getDate()).padStart(2,'0')}/${String(hoy.getMonth()+1).padStart(2,'0')}/${hoy.getFullYear()}`;

    const nuevaFac = {
        id: 'FAC-POS-' + Date.now(),
        nitEmisor: usuarioActual.nit,
        nombreEmisor: usuarioActual.nombre,
        serie: serieStr,
        numero: numeroStr,
        fecha: fechaStr,
        nitComprador: nit,
        nombreComprador: nombre,
        direccionComprador: direccion,
        items: [...carritoPOS],
        total: totalGral,
        lote: 'POS-' + Date.now().toString().slice(-6),
        anulada: false
    };

    facturasEmitidas.push(nuevaFac);
    guardarFacturasEmitidas();

    if (nit !== 'C/F' && !historialNIT.some(h => h.nit === nit)) {
        historialNIT.push({ nit, nombre, direccion });
        guardarHistorialNIT();
    }

    cerrarModalCobroPOS();
    limpiarCarritoPOS();
    alert(`¡Venta procesada y factura ${serieStr}-${numeroStr} generada con éxito!`);
}

// ============================================================
// FACTURAS INTELIGENTES
// ============================================================
function cargarDatosInteligentes() {
    if (!usuarioActual) return;
    document.getElementById('inteligenteEmisor').textContent = usuarioActual.nombre;
    document.getElementById('inteligenteNitEmisor').textContent = usuarioActual.nit;
    document.getElementById('inteligenteEstablecimiento').textContent = '001';
    document.getElementById('inteligenteDireccion').textContent = usuarioActual.direccion || 'Guatemala';
    cambiarTipoFacturacionInteligente();
}

function cambiarTipoFacturacionInteligente() {
    const tipo = document.getElementById('inteligenteTipoFacturacion').value;
    const grupoComb = document.getElementById('grupoCombustible');
    if (tipo === 'combustible') {
        grupoComb.style.display = 'block';
    } else {
        grupoComb.style.display = 'none';
    }
}

function sugerirCantidad() {
    const montoTotal = parseFloat(document.getElementById('inteligenteMontoTotal').value) || 0;
    const sugBox = document.getElementById('sugerenciaCantidad');
    if (montoTotal <= 0) {
        sugBox.style.display = 'none';
        return;
    }
    sugBox.style.display = 'block';
    sugBox.innerHTML = `Sugerencia: Se asignarán los productos de tu inventario exacto para cubrir el total de Q${montoTotal.toFixed(2)}.`;
}

let ordenPreviewActual = null;

function previsualizarOrden() {
    const tipoFac = document.getElementById('inteligenteTipoFacturacion').value;
    const montoTotal = parseFloat(document.getElementById('inteligenteMontoTotal').value) || 0;
    const cantFacturas = parseInt(document.getElementById('inteligenteCantidad').value) || 0;

    if (montoTotal <= 0 || cantFacturas <= 0) {
        alert('Ingresa el monto total y la cantidad de facturas válidos.');
        return;
    }

    let montos = [];
    let itemsPorFactura = [];

    if (tipoFac === 'productos') {
        if (!inventarioActual || inventarioActual.length === 0) {
            alert('No hay productos registrados en el inventario del POS.');
            return;
        }

        let productosDisponibles = [...inventarioActual];
        productosDisponibles.sort((a, b) => b.precioVenta - a.precioVenta);

        let sumaAcumulada = 0;
        for (let i = 0; i < cantFacturas; i++) {
            let prod = productosDisponibles[i % productosDisponibles.length];
            let precioExacto = prod.precioVenta;
            
            montos.push(precioExacto);
            itemsPorFactura.push([{
                tipo: 'producto',
                codigo: prod.codigo,
                descripcion: prod.descripcion,
                cantidad: 1,
                precioUnitario: precioExacto,
                subtotal: precioExacto
            }]);
            sumaAcumulada += precioExacto;
        }

        if (montoTotal !== sumaAcumulada) {
            document.getElementById('inteligenteMontoTotal').value = sumaAcumulada;
        }
    } else {
        const min = parseFloat(document.getElementById('inteligenteMinimo').value) || 50;
        const max = parseFloat(document.getElementById('inteligenteMaximo').value) || 500;
        let sumaActual = 0;

        for (let i = 0; i < cantFacturas; i++) {
            montos.push(min);
            sumaActual += min;
        }

        let resto = montoTotal - sumaActual;
        let intentos = 0;
        while (resto > 0 && intentos < 1000) {
            for (let i = 0; i < cantFacturas && resto > 0; i++) {
                let incremento = Math.floor(Math.random() * ((max - montos[i]) / 5)) * 5;
                if (incremento > resto) incremento = Math.floor(resto / 5) * 5;
                if (incremento <= 0) incremento = 5;
                if (montos[i] + incremento <= max) {
                    montos[i] += incremento;
                    resto -= incremento;
                }
            }
            intentos++;
        }
        let diferencia = montoTotal - montos.reduce((a,b)=>a+b, 0);
        montos[montos.length - 1] += diferencia;
    }

    const montoRealTotal = montos.reduce((a,b)=>a+b, 0);

    ordenPreviewActual = {
        tipoFac,
        combustibleTipo: document.getElementById('inteligenteCombustible').value,
        montoTotal: montoRealTotal,
        cantFacturas,
        montos,
        itemsPorFactura
    };

    document.getElementById('previewCantidad').textContent = cantFacturas;
    document.getElementById('previewMontoTotal').textContent = 'Q ' + montoRealTotal.toFixed(2);
    
    const badgeComb = document.getElementById('previewCombustible');
    if (tipoFac === 'combustible') {
        const combT = document.getElementById('inteligenteCombustible').value;
        badgeComb.textContent = combT.toUpperCase();
        badgeComb.className = 'badge-combustible ' + combT;
    } else {
        badgeComb.textContent = 'INVENTARIO EXACTO';
        badgeComb.className = 'badge-combustible superior';
    }

    let detalleHTML = '';
    montos.forEach((m, idx) => {
        let descItem = tipoFac === 'productos' && ordenPreviewActual.itemsPorFactura[idx] ? ordenPreviewActual.itemsPorFactura[idx][0].descripcion : 'Q' + m.toFixed(2);
        detalleHTML += `<span class="factura-item">#${idx+1}: ${descItem} (Q${m.toFixed(2)})</span>`;
    });
    document.getElementById('previewDetalle').innerHTML = detalleHTML;

    document.getElementById('resumenCantidad').textContent = cantFacturas;
    document.getElementById('resumenTotal').textContent = 'Q ' + montoRealTotal.toFixed(2);
    document.getElementById('resumenCombustible').textContent = tipoFac === 'combustible' ? document.getElementById('inteligenteCombustible').value : 'Productos de Inventario (Precios Exactos)';
    document.getElementById('resumenRango').textContent = tipoFac === 'combustible' ? `Q${document.getElementById('inteligenteMinimo').value} - Q${document.getElementById('inteligenteMaximo').value}` : 'Precios de Inventario';
    document.getElementById('resumenLote').textContent = 'LOT-' + Date.now().toString().slice(-6);

    document.getElementById('inteligentePreview').style.display = 'block';
    document.getElementById('btnGenerarOrden').disabled = false;
}

function generarOrdenInteligente() {
    if (!ordenPreviewActual || !usuarioActual) return;

    const loteId = 'LOT-' + Date.now().toString().slice(-6);
    const hoy = new Date();
    const fechaStr = `${String(hoy.getDate()).padStart(2,'0')}/${String(hoy.getMonth()+1).padStart(2,'0')}/${hoy.getFullYear()}`;
    
    let subFacturas = [];
    let preciosComb = load('preciosCombustible', { superior: 35.00, regular: 33.00, diesel: 30.00 });

    ordenPreviewActual.montos.forEach((monto, index) => {
        let keyCont = 'cont_' + usuarioActual.nit;
        if (!contadoresSerie[keyCont]) contadoresSerie[keyCont] = 1;
        const numStr = String(contadoresSerie[keyCont]).padStart(6, '0');
        contadoresSerie[keyCont]++;
        guardarContadoresSerie();

        let items = [];
        if (ordenPreviewActual.tipoFac === 'combustible') {
            const pVenta = preciosComb[ordenPreviewActual.combustibleTipo] || 35.00;
            const galones = monto / pVenta;
            items.push({
                tipo: 'combustible',
                combustibleTipo: ordenPreviewActual.combustibleTipo,
                descripcion: `Gasolina ${ordenPreviewActual.combustibleTipo.toUpperCase()}`,
                monto: monto,
                galones: galones,
                precioUnitario: pVenta
            });
        } else {
            let itemOriginal = ordenPreviewActual.itemsPorFactura[index][0];
            items.push({
                tipo: 'producto',
                codigo: itemOriginal.codigo,
                descripcion: itemOriginal.descripcion,
                cantidad: 1,
                precioUnitario: itemOriginal.precioUnitario,
                subtotal: itemOriginal.precioUnitario
            });

            const pInv = inventarioActual.find(p => p.codigo === itemOriginal.codigo);
            if (pInv) {
                pInv.existencia -= 1;
                if (pInv.existencia < 0) pInv.existencia = 0;
            }
        }

        const fac = {
            id: 'FAC-INT-' + Date.now() + '-' + index,
            nitEmisor: usuarioActual.nit,
            nombreEmisor: usuarioActual.nombre,
            serie: 'INT-' + usuarioActual.nit.replace(/[^0-9]/g, '').slice(0,4),
            numero: numStr,
            fecha: fechaStr,
            nitComprador: 'C/F',
            nombreComprador: 'Consumidor Final',
            direccionComprador: 'Ciudad',
            items: items,
            total: monto,
            lote: loteId,
            anulada: false
        };
        facturasEmitidas.push(fac);
        subFacturas.push(fac);
    });

    guardarInventario();
    guardarFacturasEmitidas();

    const nuevaOrden = {
        id: loteId,
        fecha: fechaStr,
        cantidadFacturas: ordenPreviewActual.cantFacturas,
        montoTotal: ordenPreviewActual.montoTotal,
        tipo: ordenPreviewActual.tipoFac,
        detalle: ordenPreviewActual.montos
    };

    ordenesInteligentes.push(nuevaOrden);
    guardarOrdenesInteligentes();

    alert(`¡Orden inteligente ${loteId} generada con éxito (${ordenPreviewActual.cantFacturas} facturas con productos y precios exactos)!`);
    document.getElementById('inteligentePreview').style.display = 'none';
    document.getElementById('btnGenerarOrden').disabled = true;
    cargarListaOrdenes();
    cargarListaFacturas();
}

function cargarListaOrdenes() {
    const tbody = document.getElementById('tablaOrdenesBody');
    if (!usuarioActual) return;
    const ordenesUser = ordenesInteligentes;

    if (ordenesUser.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted" style="padding:14px;">No hay órdenes generadas</td></tr>';
        return;
    }

    let html = '';
    ordenesUser.forEach((o, i) => {
        html += `<tr>
            <td>${i+1}</td>
            <td><span class="badge-lote">${o.id}</span></td>
            <td>${o.fecha}</td>
            <td>${o.cantidadFacturas}</td>
            <td><strong>Q ${o.montoTotal.toFixed(2)}</strong></td>
            <td>
                <button class="btn-ingresar btn-sm" onclick="imprimirOrden('${o.id}')">🖨️ PDF</button>
                <button class="btn-danger btn-sm" onclick="eliminarOrden('${o.id}')">🗑️</button>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

function imprimirOrden(loteId) {
    const orden = ordenesInteligentes.find(o => o.id === loteId);
    if (!orden) return;
    const facsLote = facturasEmitidas.filter(f => f.lote === loteId);

    let ventana = window.open('', '_blank', 'width=400,height=600');
    ventana.document.write(`
        <html>
        <head>
            <title>Orden ${loteId}</title>
            <style>
                body { font-family: monospace; font-size: 12px; width: 300px; margin: 0 auto; padding: 10px; }
                h3, h4, p { text-align: center; margin: 4px 0; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
                th, td { border-bottom: 1px dashed #333; padding: 4px 2px; text-align: left; }
                th { text-align: center; }
                .text-right { text-align: right; }
            </style>
        </head>
        <body>
            <h3>${usuarioActual.nombre}</h3>
            <p>NIT: ${usuarioActual.nit}</p>
            <p>Orden / Lote: <strong>${loteId}</strong></p>
            <p>Fecha: ${orden.fecha} | Total: Q ${orden.montoTotal.toFixed(2)}</p>
            <hr style="border: 1px dashed #333;">
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Serie-Num</th>
                        <th class="text-right">Monto</th>
                    </tr>
                </thead>
                <tbody>
    `);

    facsLote.forEach((f, idx) => {
        ventana.document.write(`
            <tr>
                <td>${idx+1}</td>
                <td>${f.serie}-${f.numero}</td>
                <td class="text-right">Q ${f.total.toFixed(2)}</td>
            </tr>
        `);
    });

    ventana.document.write(`
                </tbody>
            </table>
            <hr style="border: 1px dashed #333;">
            <p style="text-align:center; font-size:10px;">Documento Tributario Electrónico</p>
        </body>
        </html>
    `);
    ventana.document.close();
    setTimeout(() => ventana.print(), 300);
}

function eliminarOrden(loteId) {
    if (!confirm(`¿Eliminar la orden ${loteId} y sus facturas asociadas?`)) return;
    ordenesInteligentes = ordenesInteligentes.filter(o => o.id !== loteId);
    facturasEmitidas = facturasEmitidas.filter(f => f.lote !== loteId);
    guardarOrdenesInteligentes();
    guardarFacturasEmitidas();
    cargarListaOrdenes();
    cargarListaFacturas();
}

// ============================================================
// LISTA DE FACTURAS Y BÚSQUEDA
// ============================================================
function cargarListaFacturas() {
    const tbody = document.getElementById('tablaFacturasBody');
    if (!usuarioActual) return;
    const facs = facturasEmitidas.filter(f => f.nitEmisor === usuarioActual.nit && !f.anulada);

    if (facs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted" style="padding:10px;">No hay facturas</td></tr>';
        return;
    }

    let html = '';
    facs.slice(-20).reverse().forEach(f => {
        html += `<tr>
            <td>${f.numero}</td>
            <td>${f.serie}</td>
            <td>${f.fecha}</td>
            <td><strong>Q ${f.total.toFixed(2)}</strong></td>
            <td>
                <button class="btn-ingresar btn-sm" onclick="imprimirFactura('${f.id}')">🖨️</button>
                <button class="btn-danger btn-sm" onclick="abrirModalAnulacion('${f.id}')">Anular</button>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

function cargarBusquedaFacturas() {
    filtrarFacturasBusqueda();
}

function filtrarFacturasBusqueda() {
    const q = document.getElementById('busquedaFactura').value.trim().toLowerCase();
    const tbody = document.getElementById('tablaBusquedaBody');
    const contador = document.getElementById('contadorBusqueda');
    const sinRes = document.getElementById('sinResultadosBusqueda');
    if (!usuarioActual) return;

    const facs = facturasEmitidas.filter(f => f.nitEmisor === usuarioActual.nit && !f.anulada);
    const filtradas = facs.filter(f => 
        f.nombreComprador.toLowerCase().includes(q) ||
        f.nitComprador.toLowerCase().includes(q) ||
        f.fecha.toLowerCase().includes(q) ||
        f.serie.toLowerCase().includes(q) ||
        f.numero.toLowerCase().includes(q) ||
        f.total.toString().includes(q) ||
        (f.lote && f.lote.toLowerCase().includes(q))
    );

    contador.textContent = `${filtradas.length} facturas`;

    if (filtradas.length === 0) {
        tbody.innerHTML = '';
        sinRes.style.display = 'block';
        return;
    }

    sinRes.style.display = 'none';
    let html = '';
    filtradas.slice(-50).reverse().forEach(f => {
        html += `<tr>
            <td>${f.serie}-${f.numero}</td>
            <td>${f.fecha}</td>
            <td>${f.nombreComprador}</td>
            <td>${f.nitComprador}</td>
            <td><strong>Q ${f.total.toFixed(2)}</strong></td>
            <td><span class="badge-lote">${f.lote || '-'}</span></td>
            <td>
                <button class="btn-ingresar btn-sm" onclick="imprimirFactura('${f.id}')">🖨️</button>
                <button class="btn-danger btn-sm" onclick="abrirModalAnulacion('${f.id}')">Anular</button>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

function limpiarBusqueda() {
    document.getElementById('busquedaFactura').value = '';
    filtrarFacturasBusqueda();
}

function cargarListaAnuladas() {
    const tbody = document.getElementById('tablaAnuladasBody');
    if (!usuarioActual) return;
    const anuladas = facturasAnuladas.filter(f => f.nitEmisor === usuarioActual.nit);

    if (anuladas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding:14px;">No hay facturas anuladas</td></tr>';
        return;
    }

    let html = '';
    anuladas.forEach(f => {
        html += `<tr class="anulada">
            <td>${f.serie}-${f.numero}</td>
            <td>${f.fecha}</td>
            <td>${f.nombreComprador}</td>
            <td>Q ${f.total.toFixed(2)}</td>
            <td>${f.motivoAnulacion || 'Sin motivo'}</td>
            <td><span class="badge-anulada">Anulada</span></td>
            <td><button class="btn-ingresar btn-sm" onclick="imprimirFactura('${f.id}', true)">🖨️</button></td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

// ============================================================
// FUNCIONES DE ANULACIÓN CON MENÚ FISCAL (MODAL)
// ============================================================
function abrirModalAnulacion(id) {
    facturaAAnularId = id;
    const selectMotivo = document.getElementById('selectMotivoAnulacion');
    if (selectMotivo) selectMotivo.value = 'Error en los datos de la descripción';
    document.getElementById('modalAnulacion').classList.add('activo');
}

function cerrarModalAnulacion() {
    document.getElementById('modalAnulacion').classList.remove('activo');
    facturaAAnularId = null;
}

function confirmarAnulacionFactura() {
    if (!facturaAAnularId) return;
    const selectMotivo = document.getElementById('selectMotivoAnulacion');
    const motivoSeleccionado = selectMotivo ? selectMotivo.value : 'Otros';

    const idx = facturasEmitidas.findIndex(f => f.id === facturaAAnularId);
    if (idx !== -1) {
        const fac = facturasEmitidas.splice(idx, 1)[0];
        fac.anulada = true;
        fac.motivoAnulacion = motivoSeleccionado;
        facturasAnuladas.push(fac);
        guardarFacturasEmitidas();
        guardarFacturasAnuladas();
        
        cargarListaFacturas();
        filtrarFacturasBusqueda();
        cargarListaAnuladas();
        cerrarModalAnulacion();
        alert('Documento Tributario (DTE) anulado correctamente.');
    }
}

// ============================================================
// IMPRESIÓN DE FACTURA
// ============================================================
function imprimirFactura(id, esAnulada = false) {
    const fac = esAnulada ? facturasAnuladas.find(f => f.id === id) : facturasEmitidas.find(f => f.id === id);
    if (!fac) return;

    let totalGral = fac.total || 0;
    let tasaIVA = usuarioActual && usuarioActual.regimen === 'pequeno' ? 0.05 : 0.12;
    let tasaPorc = usuarioActual && usuarioActual.regimen === 'pequeno' ? '5%' : '12%';
    let subtotalBase = totalGral / (1 + tasaIVA);
    let valorIVA = totalGral - subtotalBase;

    let ventana = window.open('', '_blank', 'width=420,height=700');
    ventana.document.write(`
        <html>
        <head>
            <title>Factura ${fac.serie}-${fac.numero}</title>
            <style>
                body { font-family: 'Inter', monospace; font-size: 12px; width: 310px; margin: 0 auto; padding: 10px; color: #111; background: #fff; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .logo-container { text-align: center; margin-bottom: 8px; position: relative; }
                .logo-img { width: 130px; height: auto; display: inline-block; }
                .logo-blur-bg { position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 140px; opacity: 0.12; filter: blur(8px); z-index: 1; pointer-events: none; }
                h3, h4, p { margin: 3px 0; }
                .divider { border: none; border-top: 1px dashed #333; margin: 8px 0; }
                table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 11px; }
                th, td { padding: 4px 2px; text-align: left; }
                th { border-bottom: 1px solid #333; border-top: 1px solid #333; font-weight: bold; }
                .barcode { text-align: center; font-family: monospace; font-size: 22px; letter-spacing: 3px; font-weight: bold; margin: 6px 0 2px 0; }
                .frase-isr { font-size: 10px; color: #e65100; text-align: center; font-weight: bold; margin-top: 10px; line-height: 1.3; }
                .anulada-水印 { color: red; text-align: center; font-size: 24px; font-weight: bold; margin-top: 10px; }
            </style>
        </head>
        <body>
            <div class="logo-container">
                <img src="assets/img/logo.png" class="logo-blur-bg" alt="">
                <img src="assets/img/logo.png" class="logo-img" alt="SAFgt">
            </div>

            <h3>${fac.nombreEmisor}</h3>
            <p class="text-center">NIT: ${fac.nitEmisor}</p>
            <p class="text-center">${usuarioActual ? usuarioActual.empresa : ''}</p>
            <p class="text-center">${usuarioActual ? usuarioActual.direccion : 'Guatemala'}</p>

            <hr class="divider">
            <h4 class="text-center">FACTURA ELECTRÓNICA DE VENTA</h4>
            <p class="text-center">No. ${fac.numero}</p>
            <hr class="divider">

            <div class="barcode">||| || |||</div>
            <p class="text-center" style="font-size:10px; margin-bottom:6px;">${fac.numero}</p>

            <p><strong>Fecha:</strong> ${fac.fecha}</p>
            <p><strong>Cliente:</strong> ${fac.nombreComprador}</p>
            <p><strong>NIT:</strong> ${fac.nitComprador}</p>
            <p><strong>Dirección:</strong> ${fac.direccionComprador || 'Ciudad'}</p>

            <table>
                <thead>
                    <tr>
                        <th style="width:15%;">Cant</th>
                        <th style="width:55%;">Detalle</th>
                        <th class="text-right" style="width:30%;">Total</th>
                    </tr>
                </thead>
                <tbody>
    `);

    fac.items.forEach(it => {
        let desc = it.descripcion || 'Item';
        let cant = it.cantidad || (it.galones ? it.galones.toFixed(2) : 1);
        let sub = it.subtotal || it.monto || 0;
        ventana.document.write(`
            <tr>
                <td>${cant}</td>
                <td>${desc}<br><span style="font-size:9px; color:#555;">Cant: ${cant}</span></td>
                <td class="text-right">Q ${sub.toFixed(2)}</td>
            </tr>
        `);
    });

    ventana.document.write(`
                </tbody>
            </table>

            <hr class="divider">
            <table style="font-size:11px;">
                <tr>
                    <td>Subtotal:</td>
                    <td class="text-right">Q ${subtotalBase.toFixed(2)}</td>
                </tr>
                <tr>
                    <td>IVA ${tasaPorc}:</td>
                    <td class="text-right">Q ${valorIVA.toFixed(2)}</td>
                </tr>
                <tr>
                    <td style="font-size:13px; font-weight:bold;">Total:</td>
                    <td class="text-right" style="font-size:13px; font-weight:bold;">Q ${totalGral.toFixed(2)}</td>
                </tr>
            </table>

            <hr class="divider">
            <div class="frase-isr">
                Sujeto a retención definitiva ISR / Sujeto a pagos trimestrales ISR
            </div>

            <p class="text-center" style="font-size:9px; color:#666; margin-top:12px;">
                Generado: ${new Date().toLocaleString()}<br>
                SAFgt · Facturación Electrónica
            </p>
            ${fac.anulada ? '<div class="anulada-水印">ANULADA</div>' : ''}
        </body>
        </html>
    `);
    ventana.document.close();
    setTimeout(() => ventana.print(), 300);
}

// ============================================================
// CONFIGURACIÓN DE PRECIOS Y COMBUSTIBLE
// ============================================================
function cargarPreciosActuales() {
    const precios = load('preciosCombustible', { superior: 35.00, regular: 33.00, diesel: 30.00 });
    document.getElementById('precioSuperior').value = precios.superior;
    document.getElementById('precioRegular').value = precios.regular;
    document.getElementById('precioDiesel').value = precios.diesel;

    document.getElementById('precioActualSuperior').textContent = 'Q ' + precios.superior.toFixed(2);
    document.getElementById('precioActualRegular').textContent = 'Q ' + precios.regular.toFixed(2);
    document.getElementById('precioActualDiesel').textContent = 'Q ' + precios.diesel.toFixed(2);

    document.getElementById('idpActualSuperior').textContent = 'Q 4.23';
    document.getElementById('idpActualRegular').textContent = 'Q 4.14';
}

function guardarConfiguracionCombustible() {
    const superior = parseFloat(document.getElementById('precioSuperior').value) || 35.00;
    const regular = parseFloat(document.getElementById('precioRegular').value) || 33.00;
    const diesel = parseFloat(document.getElementById('precioDiesel').value) || 30.00;

    const precios = { superior, regular, diesel };
    save('preciosCombustible', precios);
    cargarPreciosActuales();
    alert('Precios actualizados con éxito.');
}

// ============================================================
// CONFIGURAR ENTER / EVENTOS
// ============================================================
function configurarEnter() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            // Si está activo el login de usuario
            if (document.getElementById('formLoginUsuario').classList.contains('activo')) {
                e.preventDefault();
                loginUsuario();
            }
            // Si está activo el login de POS
            else if (document.getElementById('formLoginPOS').classList.contains('activo')) {
                e.preventDefault();
                loginPOS();
            }
            // Si está activo el login de Auditor
            else if (document.getElementById('formLoginAuditor').classList.contains('activo')) {
                e.preventDefault();
                loginAuditor();
            }
        }

        if (e.key === 'F12') {
            e.preventDefault();
            if (document.getElementById('panelPOS').classList.contains('activo')) {
                cobrarPOS();
            }
        }
        if (e.key === 'F9') {
            e.preventDefault();
            if (document.getElementById('panelPOS').classList.contains('activo')) {
                limpiarCarritoPOS();
            }
        }
    });
}

window.onload = init;