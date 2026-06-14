const cargando       = document.getElementById("cargando");
const vacio          = document.getElementById("vacio");
const tablaWrap      = document.getElementById("tablaWrap");
const cuerpo         = document.getElementById("cuerpoTabla");
const btnRef         = document.getElementById("btnRefrescar");
const btnLogout      = document.getElementById("btnLogout");
const elTotal        = document.getElementById("totalRegistros");
const elEdad         = document.getElementById("edadPromedio");
const elFecha        = document.getElementById("ultimaFecha");
const confirmOverlay = document.getElementById("confirmOverlay");
const confirmNombre  = document.getElementById("confirmNombre");
const btnConfirmar   = document.getElementById("btnConfirmar");
const btnCancelar    = document.getElementById("btnCancelar");
const sesionOverlay  = document.getElementById("sesionOverlay");
const btnVolverLogin = document.getElementById("btnVolverLogin");

let idPendiente = null;

// ── Escape XSS ──
function esc(str) {
  return String(str ?? "—")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Modal sesión expirada ──
function mostrarModalSesion() {
  const svg = sesionOverlay.querySelector(".svg-sesion");
  if (svg) { svg.style.animation = "none"; svg.offsetHeight; svg.style.animation = ""; }
  sesionOverlay.classList.add("visible");
}

btnVolverLogin.addEventListener("click", () => {
  window.location.href = "/jx-backend";
});

// ── Timer de inactividad (5 minutos) ──
const INACTIVIDAD_MS  = 5 * 60 * 1000;
const CLAVE_ACTIVIDAD = "jx_ultima_actividad";
let timerInactividad  = null;

function registrarActividad() {
  localStorage.setItem(CLAVE_ACTIVIDAD, Date.now().toString());
  clearTimeout(timerInactividad);
  timerInactividad = setTimeout(cerrarPorInactividad, INACTIVIDAD_MS);
}

async function cerrarPorInactividad() {
  await fetch("/api/logout", { method: "POST" }).catch(() => {});
  localStorage.removeItem(CLAVE_ACTIVIDAD);
  mostrarModalSesion();
}

// Detectar si reabrió la pestaña con sesión vencida
const ultimaActividad = localStorage.getItem(CLAVE_ACTIVIDAD);
if (ultimaActividad && Date.now() - Number(ultimaActividad) > INACTIVIDAD_MS) {
  fetch("/api/logout", { method: "POST" }).catch(() => {});
  localStorage.removeItem(CLAVE_ACTIVIDAD);
  mostrarModalSesion();
}

["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"].forEach(ev => {
  document.addEventListener(ev, registrarActividad, { passive: true });
});

registrarActividad();

// ── Carga ──
async function cargarRegistros() {
  btnRef.classList.add("girando");
  cargando.textContent = "Cargando datos...";
  cargando.classList.remove("oculto");
  vacio.classList.add("oculto");
  tablaWrap.classList.add("oculto");

  try {
    const res = await fetch("/api/registros");
    if (res.status === 401) { mostrarModalSesion(); return; }

    const datos = await res.json();
    actualizarStats(datos);
    cargando.classList.add("oculto");

    if (datos.length === 0) {
      vacio.classList.remove("oculto");
    } else {
      renderTabla(datos);
    }
  } catch {
    cargando.textContent = "Error de conexión con el servidor.";
  } finally {
    btnRef.classList.remove("girando");
  }
}

function actualizarStats(datos) {
  elTotal.textContent = datos.length;
  if (datos.length > 0) {
    const prom = datos.reduce((s, r) => s + Number(r.edad), 0) / datos.length;
    elEdad.textContent  = Math.round(prom);
    elFecha.textContent = (datos[datos.length - 1].fecha || "").split(",")[0] || "—";
  } else {
    elEdad.textContent  = "—";
    elFecha.textContent = "—";
  }
}

function renderTabla(datos) {
  cuerpo.innerHTML = "";
  [...datos].reverse().forEach((r, idx) => {
    const num      = datos.length - idx;
    const inicial  = (r.nombre?.[0] ?? "?").toUpperCase();
    const nombre   = esc(r.nombre);
    const apellido = esc(r.apellido);
    const tr       = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="badge-id">#${num}</span></td>
      <td>
        <div class="celda-nombre">
          <span class="avatar">${inicial}</span>
          <div class="nombre-texto"><span>${nombre} ${apellido}</span></div>
        </div>
      </td>
      <td class="td-muted">${esc(r.correo)}</td>
      <td class="td-muted">${esc(r.telefono)}</td>
      <td class="td-muted">${esc(r.documento)}</td>
      <td><span class="badge-edad">${esc(r.edad)} años</span></td>
      <td class="td-muted">${esc(r.genero)}</td>
      <td><span class="fecha-txt">${esc(r.fecha)}</span></td>
      <td>
        <button class="btn-row-delete"
                data-id="${r._id}"
                data-nombre="${nombre} ${apellido}"
                title="Eliminar registro">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none"
               viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862
                     a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4
                     a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      </td>
    `;
    cuerpo.appendChild(tr);
  });
  tablaWrap.classList.remove("oculto");
}

// ── Eliminar ──
cuerpo.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-row-delete");
  if (!btn) return;
  idPendiente = btn.dataset.id;
  confirmNombre.textContent = `Se eliminará a "${btn.dataset.nombre}". Esta acción no se puede deshacer.`;
  confirmOverlay.classList.add("visible");
});

btnCancelar.addEventListener("click", () => {
  confirmOverlay.classList.remove("visible");
  idPendiente = null;
});

confirmOverlay.addEventListener("click", (e) => {
  if (e.target === confirmOverlay) {
    confirmOverlay.classList.remove("visible");
    idPendiente = null;
  }
});

btnConfirmar.addEventListener("click", async () => {
  if (!idPendiente) return;
  confirmOverlay.classList.remove("visible");
  try {
    const res = await fetch(`/api/registros/${idPendiente}`, { method: "DELETE" });
    if (res.status === 401) { mostrarModalSesion(); return; }
    await cargarRegistros();
  } catch {
    alert("Error al eliminar. Intenta de nuevo.");
  } finally {
    idPendiente = null;
  }
});

// ── Logout ──
btnLogout.addEventListener("click", async () => {
  clearTimeout(timerInactividad);
  localStorage.removeItem(CLAVE_ACTIVIDAD);
  await fetch("/api/logout", { method: "POST" });
  window.location.href = "/jx-backend";
});

btnRef.addEventListener("click", cargarRegistros);
cargarRegistros();
