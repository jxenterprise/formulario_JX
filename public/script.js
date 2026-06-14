const form      = document.getElementById("formRegistro");
const btnEnviar = document.getElementById("btnEnviar");
const overlay    = document.getElementById("modalOverlay");
const mCargando  = document.getElementById("mCargando");
const mExito     = document.getElementById("mExito");
const mError     = document.getElementById("mError");
const mErrorMsg  = document.getElementById("mErrorMsg");
const mDuplicado = document.getElementById("mDuplicado");
const mDupMsg    = document.getElementById("mDupMsg");

let autoCloseTimer = null;

function mostrarModal(estado) {
  mCargando.classList.add("oculto");
  mExito.classList.add("oculto");
  mError.classList.add("oculto");
  mDuplicado.classList.add("oculto");

  if (estado === "cargando")   mCargando.classList.remove("oculto");
  if (estado === "exito")      mExito.classList.remove("oculto");
  if (estado === "error")      mError.classList.remove("oculto");
  if (estado === "duplicado")  mDuplicado.classList.remove("oculto");

  overlay.classList.add("visible");
  document.body.style.overflow = "hidden";

  // Auto-cierre: éxito 6 segundos / duplicado 10 segundos
  if (estado === "exito") {
    clearTimeout(autoCloseTimer);
    autoCloseTimer = setTimeout(cerrarModal, 6000);
  }
  if (estado === "duplicado") {
    clearTimeout(autoCloseTimer);
    autoCloseTimer = setTimeout(cerrarModal, 10000);
  }
}

function cerrarModal() {
  clearTimeout(autoCloseTimer);
  overlay.classList.remove("visible");
  document.body.style.overflow = "";
}

// Cerrar al hacer clic fuera del modal (en el fondo oscuro)
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) cerrarModal();
});

// Botones de cerrar
document.getElementById("btnCerrarExito").addEventListener("click", cerrarModal);
document.getElementById("btnCerrarError").addEventListener("click", cerrarModal);
document.getElementById("btnCerrarDup").addEventListener("click", cerrarModal);

// ── Género: mostrar campo personalizado si elige "Otro" ──
document.querySelectorAll('input[name="genero"]').forEach(radio => {
  radio.addEventListener("change", () => {
    const campo = document.getElementById("generoPersonalizado");
    campo.style.display = radio.value === "Otro" ? "block" : "none";
    if (radio.value !== "Otro") campo.value = "";
  });
});

// ── Validación ──
function validar(datos) {
  const errores = {};
  if (datos.nombre.trim().length < 2)   errores.nombre    = "Mínimo 2 caracteres";
  if (datos.apellido.trim().length < 2) errores.apellido  = "Mínimo 2 caracteres";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo))
                                         errores.correo    = "Correo no válido";
  if (!/^\+?[\d\s\-()\\.]{7,15}$/.test(datos.telefono.trim()))
                                         errores.telefono  = "Número no válido (7–15 dígitos)";
  if (!/^\d{6,15}$/.test(datos.documento.trim()))
                                         errores.documento = "Solo números (6–15 dígitos)";
  const edad = Number(datos.edad);
  if (!edad || edad < 1 || edad > 120)  errores.edad      = "Entre 1 y 120";
  if (!datos.genero)                     errores.genero    = "Selecciona una opción";
  return errores;
}

function mostrarErrores(errores) {
  document.querySelectorAll(".error").forEach((el) => (el.textContent = ""));
  document.querySelectorAll("input").forEach((el) => el.classList.remove("invalido"));
  for (const campo in errores) {
    const small = document.querySelector(`[data-error="${campo}"]`);
    const input = document.getElementById(campo);
    if (small) small.textContent = errores[campo];
    if (input) input.classList.add("invalido");
  }
}

// ── Envío ──
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const generoRadio = document.querySelector('input[name="genero"]:checked');
  const generoValor = generoRadio?.value === "Otro"
    ? document.getElementById("generoPersonalizado").value.trim()
    : generoRadio?.value || "";

  const datos = {
    nombre:    document.getElementById("nombre").value,
    apellido:  document.getElementById("apellido").value,
    correo:    document.getElementById("correo").value,
    telefono:  document.getElementById("telefono").value,
    documento: document.getElementById("documento").value,
    edad:      document.getElementById("edad").value,
    genero:    generoValor,
  };

  const errores = validar(datos);
  mostrarErrores(errores);
  if (Object.keys(errores).length > 0) return;

  btnEnviar.disabled = true;
  mostrarModal("cargando");

  try {
    const res = await fetch("/api/registros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });
    const resultado = await res.json();

    if (res.ok) {
      mostrarModal("exito");
      form.reset();
      mostrarErrores({});
    } else if (res.status === 409) {
      mDupMsg.textContent = resultado.mensaje;
      mostrarModal("duplicado");
    } else {
      mErrorMsg.textContent = resultado.mensaje || "Error en el servidor";
      mostrarModal("error");
    }
  } catch {
    mErrorMsg.textContent = "No se pudo conectar con el servidor";
    mostrarModal("error");
  } finally {
    btnEnviar.disabled = false;
  }
});
