const form       = document.getElementById("formLogin");
const btn        = document.getElementById("btnLogin");
const mensaje    = document.getElementById("mensaje");
const inputClave = document.getElementById("clave");
const btnVer     = document.getElementById("btnVer");

btnVer.addEventListener("click", () => {
  const visible = inputClave.type === "text";
  inputClave.type = visible ? "password" : "text";
  btnVer.style.color = visible ? "" : "var(--plata)";
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const usuario = document.getElementById("usuario").value.trim();
  const clave   = inputClave.value;

  if (!usuario || !clave) {
    mensaje.textContent = "Completa ambos campos";
    mensaje.className = "mensaje fallo";
    return;
  }

  btn.disabled = true;
  btn.textContent = "Verificando...";
  mensaje.textContent = "";

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario, clave }),
    });

    if (res.ok) {
      window.location.href = "/jx-backend/panel";
    } else {
      const data = await res.json();
      mensaje.textContent = "✗ " + (data.mensaje || "Credenciales incorrectas");
      mensaje.className = "mensaje fallo";
    }
  } catch {
    mensaje.textContent = "✗ Sin conexión con el servidor";
    mensaje.className = "mensaje fallo";
  } finally {
    btn.disabled = false;
    btn.textContent = "Entrar";
  }
});
