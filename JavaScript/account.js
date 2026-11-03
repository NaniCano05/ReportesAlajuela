// Inicio de sesión, registro, perfil y control de acceso local.
import { $, read, write, hashPassword } from "./utils.js";

// Claves para separar la sesión temporal de la lista persistente de cuentas.
const SESSION = "reportes-alajuela-sesion-v1";
const REGISTERED_USERS = "reportes-alajuela-cuentas-v1";

// Cuentas ficticias para demostrar los dos roles de la aplicación.
const demoAccounts = [
  { username: "admin", password: "admin1234+", role: "admin" },
  { username: "usuario", password: "user123", role: "usuario" }
];

// Recupera los datos de la persona y su rol desde sessionStorage; si no hay sesión, devuelve null.
export function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION));
  } catch (error) {
    return null;
  }
}

// Conecta login y registro, protege Gestión y actualiza el perfil y las opciones visibles según el rol.
// Devuelve false cuando redirige para que app.js no inicialice la vista actual.
export function initAccess() {
  // Valida el login con una cuenta demo o una cuenta guardada y abre Gestión al autenticarse.
  const loginForm = $("#login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async event => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(loginForm).entries());
      const login = values.username.trim();
      const demoAccount = demoAccounts.find(item => item.username === login && item.password === values.password);
      let account = demoAccount;
      if (!account) {
        const savedAccounts = read(REGISTERED_USERS, []);
        const saved = savedAccounts.find(item => item.cedula === login);
        if (saved && await hashPassword(values.password) === saved.passwordHash) account = saved;
      }
      const message = $("#login-message");
      if (!account) {
        message.textContent = "La cédula o el usuario, o la contraseña, no coinciden.";
        message.dataset.type = "error";
        return;
      }
      sessionStorage.setItem(SESSION, JSON.stringify({
        username: account.username || account.cedula,
        cedula: account.cedula || account.username || "",
        nombre: [account.nombre, account.apellido].filter(Boolean).join(" ") || account.username || account.cedula,
        email: account.email || "",
        role: account.role
      }));
      const nextPage = new URLSearchParams(window.location.search).get("next");
      window.location.href = nextPage === "gestion.html" ? nextPage : "gestion.html";
    });
  }

  const registerForm = $("#register-form");
  if (registerForm) {
    // Elementos para leer y aceptar los términos de la cuenta.
    const termsCheckbox = $("#accept-terms");
    const termsDialog = $("#terms-dialog");
    const termsContent = $("#terms-dialog-content");
    const termsHelp = $("#terms-acceptance-help");
    const scrollHelp = $("#terms-scroll-help");
    const acceptTermsButton = $("#accept-terms-button");
    // Se mantiene en memoria para exigir aceptar desde el diálogo antes de marcar la casilla.
    let termsAccepted = false;

    // Comprueba si se llegó al final del texto y habilita o bloquea el botón Aceptar.
    const updateTermsScroll = () => {
      const reachedBottom = termsContent.scrollTop + termsContent.clientHeight >= termsContent.scrollHeight - 8;
      acceptTermsButton.disabled = !reachedBottom;
      scrollHelp.textContent = reachedBottom
        ? "Llegaste al final. Ya puedes aceptar los términos."
        : "Desplázate hasta el final para habilitar la aceptación.";
    };
    termsContent.addEventListener("scroll", updateTermsScroll);

    // Intercepta el primer intento de marcar la casilla y abre el texto completo.
    termsCheckbox.addEventListener("click", event => {
      if (termsAccepted) return;
      event.preventDefault();
      if (!termsDialog.open) {
        termsContent.scrollTop = 0;
        acceptTermsButton.disabled = true;
        scrollHelp.textContent = "Desplázate hasta el final para habilitar la aceptación.";
        termsDialog.showModal();
        requestAnimationFrame(updateTermsScroll);
      }
    });
    // Cierra el diálogo sin aceptar para regresar al formulario.
    $("#close-terms-button").addEventListener("click", () => termsDialog.close());
    // Acepta después de llegar al final y devuelve el foco a la casilla.
    acceptTermsButton.addEventListener("click", () => {
      if (acceptTermsButton.disabled) return;
      termsAccepted = true;
      termsDialog.close();
      termsHelp.textContent = "Términos aceptados. Ahora marca la casilla para confirmar.";
      termsCheckbox.focus();
    });
    // Actualiza el mensaje cuando la casilla queda marcada o desmarcada.
    termsCheckbox.addEventListener("change", () => {
      termsHelp.textContent = termsCheckbox.checked
        ? "Aceptación confirmada."
        : "Al marcar la casilla, primero podrás revisar y aceptar las condiciones.";
    });

    const emailInput = $("#register-email");
    const emailError = $("#register-email-error");
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    // Comprueba el formato del correo y presenta el error junto al campo.
    const validateEmail = () => {
      const email = emailInput.value.trim();
      const error = !email
        ? "Ingresa tu correo electrónico."
        : !emailPattern.test(email)
          ? "Escribe un correo válido, por ejemplo nombre@dominio.com."
          : "";
      emailError.textContent = error;
      emailInput.setAttribute("aria-invalid", String(Boolean(error)));
      return !error;
    };

    // Vuelve a validar el correo en tiempo real después de que se empezó a editar.
    emailInput.addEventListener("input", () => {
      if (emailInput.dataset.touched === "true") validateEmail();
    });

    // Valida los datos, evita cédulas repetidas, guarda la cuenta y redirige al login.
    registerForm.addEventListener("submit", async event => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(registerForm).entries());
      const message = $("#register-message");
      const cedula = values.cedula.trim();
      const email = values.email.trim();
      const password = values.password;
      const confirmation = values.confirmation;
      emailInput.dataset.touched = "true";
      if (!validateEmail()) {
        emailInput.focus();
        return;
      }
      if (!values.nombre.trim() || !values.apellido.trim() || cedula.length < 6) {
        message.textContent = "Completa nombre, apellido y una identificación de al menos 6 caracteres.";
        message.dataset.type = "error";
        return;
      }
      if (password.length < 8) {
        message.textContent = "La contraseña debe tener al menos 8 caracteres.";
        message.dataset.type = "error";
        return;
      }
      if (password !== confirmation) {
        message.textContent = "Las contraseñas no coinciden.";
        message.dataset.type = "error";
        return;
      }
      if (!termsAccepted || !termsCheckbox.checked) {
        message.textContent = "Debes leer y aceptar los términos antes de registrarte.";
        message.dataset.type = "error";
        return;
      }

      const savedAccounts = read(REGISTERED_USERS, []);
      if (savedAccounts.some(item => item.cedula === cedula) || demoAccounts.some(item => item.username === cedula)) {
        message.textContent = "Ya existe una cuenta registrada con esa identificación.";
        message.dataset.type = "error";
        return;
      }

      try {
        const account = {
          nombre: values.nombre.trim(),
          apellido: values.apellido.trim(),
          cedula,
          email,
          passwordHash: await hashPassword(password),
          role: "usuario",
          aceptoTerminos: true,
          fechaRegistro: new Date().toISOString()
        };
        savedAccounts.push(account);
        write(REGISTERED_USERS, savedAccounts);
        message.textContent = "Cuenta creada correctamente. Te llevaremos al inicio de sesión…";
        message.dataset.type = "success";
        registerForm.reset();
        window.setTimeout(() => {
          window.location.href = "login.html";
        }, 900);
      } catch (error) {
        message.textContent = "No se pudo crear la cuenta. Abre la página desde localhost y vuelve a intentarlo.";
        message.dataset.type = "error";
      }
    });
  }

  const session = getSession();
  const validSession = Boolean(session && ["admin", "usuario"].includes(session.role));
  // Envía a login si alguien abre Gestión sin sesión y permite regresar después de autenticarse.
  if (document.body.dataset.page === "gestion" && !validSession) {
    window.location.replace("login.html?next=gestion.html");
    return false;
  }

  const userArea = $("#user-area");
  const adminPanel = $("#admin-panel");
  if (userArea) {
    userArea.hidden = !validSession;
    const isAdmin = Boolean(session && session.role === "admin");
    const form = $("#new-report-form");
    const userReports = $("#user-reports-panel");
    if (form) form.hidden = isAdmin;
    if (userReports) userReports.hidden = isAdmin;
    if (adminPanel) adminPanel.hidden = !isAdmin;
    const label = $("#session-label");
    if (label && session) label.textContent = isAdmin ? "Sesión de administrador" : "Sesión de usuario";
  }

  // Borra solo la sesión de esta pestaña y vuelve a Inicio; conserva los datos locales.
  const logout = () => {
    sessionStorage.removeItem(SESSION);
    window.location.href = "index.html";
  };
  // Conecta el botón Cerrar sesión que aparece en el panel de Gestión.
  const logoutButton = $("#logout-button");
  if (logoutButton) logoutButton.addEventListener("click", logout);
  const loginLink = $("[data-login-link]");
  const mobileLoginLink = $("[data-mobile-login-link]");
  const userMenu = $("[data-user-menu]");
  const sessionName = $("[data-session-name]");
  const sessionId = $("[data-session-id]");
  const sessionEmail = $("[data-session-email]");
  const accountDetails = $("[data-account-details]");
  // Alterna el menú del emoji entre Iniciar sesión y los datos de la sesión activa.
  if (loginLink && userMenu) {
    loginLink.hidden = validSession;
    if (mobileLoginLink) mobileLoginLink.hidden = validSession;
    if (accountDetails) accountDetails.hidden = !validSession;
    if (validSession) {
      sessionName.textContent = session.nombre || session.username || "Mi cuenta";
      sessionId.textContent = session.cedula || session.username || "No disponible";
      sessionEmail.textContent = session.email || "No disponible";
      userMenu.querySelector("[data-logout]").addEventListener("click", logout);
    }
  }
  return true;
}

