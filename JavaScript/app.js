import { $, $$, read, readObject, write, readImage, escapeHtml, normalizeText } from "./utils.js";
import { getSession, initAccess } from "./account.js";

(function () {
  "use strict";

  // CONFIGURACIÓN: nombres de las claves locales que usa la función de reportes.
  const STORE = "reportes-alajuela-usuario-v1";
  const VOTES = "reportes-alajuela-votos-v1";
  const LIKES = "reportes-alajuela-me-gusta-v1";
  const ADMIN_EDITS = "reportes-alajuela-ediciones-v1";
  const HIDDEN_REPORTS = "reportes-alajuela-eliminados-v1";

  // CATÁLOGOS: nombres visibles y equivalencias para registros anteriores.
  // Traduce los códigos cortos guardados en JSON a nombres para mostrar en pantalla.
  const categoryNames = {
    agua: "Corte de agua",
    huecos: "Hueco o bache",
    fugas: "Fuga de agua",
    accidentes: "Accidente",
    Estadio: "Partido de fútbol",
    otros: "Otra incidencia"
  };

  // Permite reconocer distritos guardados con nombres antiguos en vez de códigos oficiales.
  const legacyDistrictCodes = {
    "alajuela-centro": "20101",
    "san-jose": "20102",
    carrizal: "20103",
    "san-antonio": "20104",
    desamparados: "20110",
    tambor: "20112",
    "la-garita": "20113"
  };

  // ESTADO Y UTILIDADES: datos en memoria y funciones pequeñas reutilizadas en la app.
  // Estado temporal de la página: datos cargados y filtros seleccionados.
  const state = {
    reports: [], // Todos los reportes que se muestran en el sitio.
    baseReports: [], // Noticias de ejemplo que vienen de data/reportes.json.
    allReports: [], // Reportes públicos y pendientes para el panel administrador.
    userReports: [], // Reportes enviados desde este navegador.
    locations: [], // Cantones y distritos leídos del archivo territorial.
    category: "all", // Categoría activa en la página de búsqueda.
    query: "", // Texto que la persona está buscando.
    canton: "all", // Cantón seleccionado como filtro.
    district: "all", // Distrito seleccionado como filtro.
    status: "all", // Estado seleccionado como filtro.
    votes: read(VOTES, []), // Reportes marcados con “Me afecta”.
    likes: read(LIKES, []), // Reportes marcados con “Me gusta”.
    editingReportId: null // Reporte que está abierto en el formulario de edición.
  };

  // UBICACIONES: convierte códigos JSON en nombres y mantiene dependientes los selectores.
  // Busca el cantón por su código dentro de la lista cargada desde el JSON territorial.
  function findCanton(code) {
    return state.locations.find(canton => canton.codigo === String(code));
  }

  // Devuelve el nombre legible del cantón o el valor recibido si no lo encuentra.
  function cantonName(code) {
    const canton = findCanton(code);
    return canton ? canton.nombre : String(code || "");
  }

  // Busca y devuelve el nombre del distrito que pertenece al cantón indicado.
  function districtName(cantonCode, districtCode) {
    const canton = findCanton(cantonCode);
    const district = canton && canton.distritos.find(item => item.codigo === String(districtCode));
    return district ? district.nombre : String(districtCode || "");
  }

  // Unifica códigos antiguos de cantón y distrito para que coincidan con los JSON actuales.
  function normalizeReport(report) {
    const previousCanton = String(report.canton || "201");
    const canton = state.locations.find(item =>
      item.codigo === previousCanton || normalizeText(item.nombre) === normalizeText(previousCanton)
    );
    const cantonCode = canton ? canton.codigo : previousCanton === "Alajuela" ? "201" : previousCanton;
    let districtCode = legacyDistrictCodes[String(report.distrito)] || String(report.distrito || "");

    // Si el distrito todavía tiene un nombre, lo convierte al código oficial.
    if (!/^\d{5}$/.test(districtCode)) {
      const selectedCanton = findCanton(cantonCode);
      const district = selectedCanton && selectedCanton.distritos.find(item =>
        normalizeText(item.nombre) === normalizeText(districtCode)
      );
      if (district) districtCode = district.codigo;
    }

    return Object.assign({}, report, { canton: cantonCode, distrito: districtCode });
  }

  // Crea de nuevo las opciones de un selector, por ejemplo la lista de cantones.
  function setOptions(select, items, firstLabel, firstValue) {
    if (!select) return;
    select.replaceChildren();

    const firstOption = document.createElement("option");
    firstOption.value = firstValue;
    firstOption.textContent = firstLabel;
    select.appendChild(firstOption);

    items.forEach(item => {
      const option = document.createElement("option");
      option.value = item.codigo;
      option.textContent = item.nombre;
      select.appendChild(option);
    });
  }

  // Actualiza los distritos disponibles según el cantón que se haya seleccionado.
  function updateDistrictOptions(cantonSelect, districtSelect, allMode) {
    if (!cantonSelect || !districtSelect) return;
    const code = cantonSelect.value;
    const canton = findCanton(code);
    const firstLabel = allMode
      ? "Todos los distritos"
      : code ? "Selecciona un distrito" : "Primero selecciona un cantón";

    setOptions(districtSelect, canton ? canton.distritos : [], firstLabel, allMode ? "all" : "");
    districtSelect.disabled = !canton;
  }

  // Carga cantones y prepara los selectores tanto de búsqueda como del formulario.
  function populateLocationSelects() {
    const filterCanton = $("#canton-filter");
    const formCanton = $("#report-canton");

    setOptions(filterCanton, state.locations, "Todos los cantones", "all");
    setOptions(formCanton, state.locations, "Selecciona un cantón de Alajuela", "");
    updateDistrictOptions(filterCanton, $("#district-filter"), true);
    updateDistrictOptions(formCanton, $("#report-district"), false);
  }

  // Cambia el estado interno por su texto visible en la página. 
  function stateName(value) {
    if (value === "proceso") return "En proceso";
    if (value === "finalizado") return "Finalizado";
    if (value === "resuelto") return "Resuelto";
    return "Activo";
  }

  // PRESENTACIÓN: crea tarjetas, estadísticas, listas, detalles y mensajes dinámicos.
  // Genera la etiqueta de imagen solo si es una ruta local válida o una imagen elegida en el formulario.
  function imageMarkup(report) {
    const path = String(report.imagen || "").trim();
    // Se aceptan imágenes guardadas en la carpeta img y fotos seleccionadas en el formulario.
    const validPath = /^img\/[A-Za-z0-9_-]+\.(png|jpe?g|webp|gif)$/i.test(path);
    const validImage = /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/]+=*$/i.test(path);
    if (!validPath && !validImage) return "";

    const alt = escapeHtml(report.imagenAlt || report.titulo || "Imagen del reporte");
    return '<img class="foto-reporte" src="' + escapeHtml(path) + '" alt="' + alt + '" loading="lazy">';
  }

  // Construye una tarjeta de reporte; compact indica si se muestra en una lista pequeña.
  function card(report, compact) {
    const heading = compact ? "h3" : "h2";
    const voted = state.votes.includes(report.id);
    const liked = state.likes.includes(report.id);
    const category = categoryNames[report.categoria] || report.categoria;
    const district = districtName(report.canton, report.distrito);
    const canton = cantonName(report.canton);
    const location = [
      district,
      normalizeText(district) === normalizeText(canton) ? "" : canton,
      report.lugar || "Alajuela"
    ].filter(Boolean).join(" · ");

    // Los valores escritos por usuarios se escapan antes de insertarlos como HTML.
    return '<article class="reporte">' + imageMarkup(report) +
      '<div class="datos-reporte"><span class="categoria">' + escapeHtml(category) +
      '</span><span class="estado estado-' + escapeHtml(report.estado) + '">' + stateName(report.estado) +
      '</span></div><' + heading + '>' + escapeHtml(report.titulo) + '</' + heading +
      '><p class="lugar">' + escapeHtml(location) + '</p><p class="descripcion">' +
      escapeHtml(report.descripcion) + '</p><div class="acciones"><button class="boton-enlace" type="button" data-action="detail" data-id="' +
      escapeHtml(report.id) + '">Ver detalle</button><div class="reacciones" aria-label="Reacciones al reporte">' +
      '<button class="boton-enlace reaccion me-gusta ' + (liked ? "seleccionada" : "") + '" type="button" data-action="like" data-id="' + escapeHtml(report.id) +
      '" aria-pressed="' + liked + '">' + (liked ? "✓ Me gusta" : "♡ Me gusta") + '</button>' +
      '<button class="boton-enlace reaccion me-afecta ' + (voted ? "afectado" : "") + '" type="button" data-action="vote" data-id="' + escapeHtml(report.id) +
      '" aria-pressed="' + voted + '">' + (voted ? "✓ Me afecta" : "♡ Me afecta") + '</button></div></div></article>';
  }

  // Calcula los totales y los coloca en los contadores de Inicio.
  function renderStats() {
    const counts = {
      total: state.reports.length,
      activo: state.reports.filter(report => report.estado === "activo").length,
      proceso: state.reports.filter(report => report.estado === "proceso").length,
      resuelto: state.reports.filter(report => ["resuelto", "finalizado"].includes(report.estado)).length
    };

    $$('[data-report-stat]').forEach(element => {
      element.textContent = counts[element.dataset.reportStat] || 0;
    });
  }

  // Muestra los tres reportes más recientes en la página de Inicio.
  function renderRecent() {
    const container = $("#recent-reports");
    if (!container) return;
    container.innerHTML = state.reports.slice(0, 3).map(report => card(report, true)).join("") ||
      '<p class="vacio">Aún no hay reportes.</p>';
  }

  // Aplica búsqueda y filtros a la lista de reportes y actualiza el conteo de resultados.
  function renderList() {
    const container = $("#report-list");
    if (!container) return;

    const reports = state.reports.filter(report => {
      // Se combinan los datos visibles para permitir una búsqueda general.
      const searchable = normalizeText([
        report.titulo,
        report.descripcion,
        report.lugar,
        report.distrito,
        districtName(report.canton, report.distrito),
        report.canton,
        cantonName(report.canton)
      ].join(" "));

      // Cada condición permite todos los valores o el valor que eligió la persona.
      return (state.category === "all" || report.categoria === state.category) &&
        (state.canton === "all" || report.canton === state.canton) &&
        (state.district === "all" || report.distrito === state.district) &&
        (state.status === "all" || report.estado === state.status) &&
        searchable.includes(state.query);
    });

    container.innerHTML = reports.map(report => card(report, false)).join("");
    const emptyState = $("#no-results");
    const resultCount = $("#result-count");
    if (emptyState) emptyState.hidden = reports.length > 0;
    if (resultCount) {
      resultCount.textContent = reports.length + " " +
        (reports.length === 1 ? "reporte encontrado" : "reportes encontrados");
    }
  }

  // Dibuja los envíos de la persona que inició sesión en este navegador.
  function renderMine() {
    const container = $("#my-reports");
    if (!container) return;

    const mine = state.userReports;

    container.innerHTML = mine.length ? mine.map(report =>
      '<div>' + card(report, true) +
      '<p class="revision revision-' + escapeHtml(report.revision || "pendiente") + '">Revisión: ' +
      (report.revision === "aprobado" ? "Publicado" : report.revision === "rechazado" ? "No aprobado" : "Pendiente") +
      '</p><button class="eliminar" type="button" data-action="delete" data-id="' +
      escapeHtml(report.id) + '">Eliminar reporte</button></div>'
    ).join("") : '<p class="vacio">Aún no has creado reportes.</p>';
  }

  // Muestra todas las noticias en Gestión y habilita las acciones exclusivas del administrador.
  function renderAdmin() {
    const container = $("#admin-reports");
    if (!container) return;
    container.innerHTML = state.allReports.length ? state.allReports.map(report =>
      '<div class="admin-reporte">' + card(report, true) +
      '<p class="revision revision-' + escapeHtml(report.revision || "aprobado") + '">' +
      (report.revision === "pendiente" ? "Esperando revisión" : report.revision === "rechazado" ? "No aprobado" : "Publicado") +
      '</p><div class="acciones-admin">' +
      (report.revision === "pendiente" ?
        '<button class="boton boton-rojo" type="button" data-action="approve" data-id="' + escapeHtml(report.id) + '">Aprobar y publicar</button>' +
        '<button class="boton boton-claro" type="button" data-action="reject" data-id="' + escapeHtml(report.id) + '">Rechazar</button>' : "") +
      (report.revision === "rechazado" ?
        '<button class="boton boton-claro" type="button" data-action="reopen" data-id="' + escapeHtml(report.id) + '">Revisar de nuevo</button>' : "") +
      '<button class="boton boton-claro" type="button" data-action="edit" data-id="' + escapeHtml(report.id) + '">Editar</button>' +
      '<button class="eliminar" type="button" data-action="admin-delete" data-id="' + escapeHtml(report.id) + '">Eliminar</button>' +
      '</div></div>'
    ).join("") : '<p class="vacio">No hay reportes para administrar.</p>';
  }

  // Vuelve a dibujar las partes dinámicas de todas las páginas que estén abiertas.
  function renderAll() {
    renderStats();
    renderRecent();
    renderList();
    renderMine();
    renderAdmin();
  }

  // Presenta un aviso temporal para confirmar acciones o informar resultados.
  function showAnnouncement(message) {
    const announcement = $("#announcement");
    if (!announcement) return;
    announcement.textContent = message;
    announcement.classList.add("visible");
    window.setTimeout(() => announcement.classList.remove("visible"), 3500);
  }

  // DATOS: combina los ejemplos del JSON con aportes y cambios guardados en localStorage.
  // Busca un reporte y abre su información completa en la ventana de detalle.
  function detail(id) {
    const report = state.allReports.find(item => item.id === id);
    const dialog = $("#report-dialog");
    const target = $("#report-detail");
    if (!report || !dialog || !target) return;

    const category = categoryNames[report.categoria] || report.categoria;
    target.innerHTML = '<p class="etiqueta">' + escapeHtml(category) +
      '</p><h2 id="report-detail-title">' + escapeHtml(report.titulo) + '</h2>' + imageMarkup(report) +
      '<p><strong>Estado:</strong> ' + stateName(report.estado) + '</p>' +
      '<p><strong>Provincia:</strong> Alajuela</p>' +
      '<p><strong>Cantón:</strong> ' + escapeHtml(cantonName(report.canton)) + '</p>' +
      '<p><strong>Distrito:</strong> ' + escapeHtml(districtName(report.canton, report.distrito)) + '</p>' +
      '<p><strong>Ubicación:</strong> ' + escapeHtml(report.lugar) + '</p>' +
      '<p>' + escapeHtml(report.descripcion) + '</p>' +
      '<p class="ayuda">Fecha: ' + escapeHtml(report.fecha) + '</p>';
    dialog.showModal();
  }

  // Reconstruye la lista pública y la lista de revisión con los datos guardados localmente.
  function refreshReports() {
    const edits = readObject(ADMIN_EDITS);
    const hidden = read(HIDDEN_REPORTS, []);
    state.userReports = read(STORE, [])
      .filter(report => report && typeof report.id === "string" && report.id.startsWith("USR-"))
      .map(normalizeReport);

    const examples = state.baseReports.map(report => Object.assign({}, report, edits[report.id] || {}));
    state.allReports = state.userReports.concat(examples)
      .filter(report => !hidden.includes(report.id));

    // Los reportes enviados por usuarios solo aparecen en Inicio y Reportes al aprobarse.
    state.reports = state.allReports.filter(report =>
      !report.id.startsWith("USR-") || report.revision === "aprobado"
    );
    renderAll();
  }

  // Carga reportes y ubicaciones desde los JSON y después aplica aprobación y ediciones locales.
  async function load() {
    try {
      const responses = await Promise.all([
        fetch("data/reportes.json"),
        fetch("data/ubicaciones-alajuela.json")
      ]);
      if (!responses[0].ok) throw new Error("No se pudo leer data/reportes.json");
      if (!responses[1].ok) throw new Error("No se pudo leer data/ubicaciones-alajuela.json");

      // Los reportes de ejemplo y las ubicaciones viven en archivos JSON separados.
      const baseReports = await responses[0].json();
      const locationData = await responses[1].json();
      if (!Array.isArray(baseReports)) throw new Error("El archivo de reportes debe contener una lista");
      if (!locationData || !Array.isArray(locationData.cantones)) {
        throw new Error("El archivo de cantones y distritos no tiene el formato esperado");
      }

      state.locations = locationData.cantones;
      populateLocationSelects();
      state.baseReports = baseReports.map(normalizeReport);
      refreshReports();
    } catch (error) {
      console.error(error);
      ["#report-list", "#recent-reports", "#my-reports"].forEach(selector => {
        const element = $(selector);
        if (element) {
          element.innerHTML = '<p class="vacio">No se pudieron cargar los datos. Abre el proyecto con un servidor local y revisa la carpeta data.</p>';
        }
      });
    }
  }

  // FORMULARIO DE REPORTES: validaciones, vista previa, guardado y limpieza.
  // Revisa un campo del formulario y muestra un mensaje junto al campo si hay un problema.
  function validate(field, root) {
    const validationRoot = root || document;
    const value = field.value.trim();
    let message = "";

    // Revisa requisitos, longitudes, imagen y lenguaje de la descripción.
    if (field.required && !value) {
      message = "Este campo es obligatorio.";
    } else if (field.minLength > 0 && value && value.length < field.minLength) {
      message = "Escribe al menos " + field.minLength + " caracteres.";
    } else if (field.name === "image" && field.files && field.files[0]) {
      const file = field.files[0];
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
        message = "Selecciona una imagen PNG, JPG o WebP.";
      } else if (file.size > 800 * 1024) {
        message = "La imagen debe pesar 800 KB o menos.";
      }
    } else if (field.name === "description" && /\b(puta|puto|mierda|idiota|estupido|estúpido|imbecil|imbécil)\b/i.test(value)) {
      message = "Usa una descripción respetuosa y centrada en los hechos.";
    }

    const error = $('[data-error-for="' + field.name + '"]', validationRoot);
    if (error) error.textContent = message;
    field.setAttribute("aria-invalid", String(Boolean(message)));
    return !message;
  }

  // Limpia campos, errores, vista previa de imagen y mensajes del formulario.
  function clearForm(form, message) {
    form.reset();
    const preview = $("#image-preview", form);
    if (preview) {
      if (preview.dataset.url) URL.revokeObjectURL(preview.dataset.url);
      preview.removeAttribute("src");
      delete preview.dataset.url;
      preview.hidden = true;
    }
    updateDistrictOptions($("#report-canton"), $("#report-district"), false);
    $$(".error", form).forEach(element => { element.textContent = ""; });
    $$('[aria-invalid="true"]', form).forEach(element => element.removeAttribute("aria-invalid"));

    const formMessage = $("#form-message");
    if (formMessage) {
      formMessage.textContent = message || "Formulario limpio. Puedes ingresar otro reporte.";
      formMessage.dataset.type = "success";
    }
    if (message) showAnnouncement(message);
  }

  // Conecta los controles del formulario con sus validaciones y acciones de guardar y limpiar.
  function initForm() {
    const form = $("#new-report-form");
    if (!form) return;

    const fields = $$('input[name], select[name], textarea[name]', form)
      .filter(field => field.name !== "status");
    fields.forEach(field => {
      ["input", "change", "blur"].forEach(eventName => {
        field.addEventListener(eventName, () => validate(field, form));
      });
    });

    const imageInput = $("#report-image", form);
    const imagePreview = $("#image-preview", form);
    if (imageInput && imagePreview) {
      imageInput.addEventListener("change", () => {
        validate(imageInput, form);
        if (imagePreview.dataset.url) URL.revokeObjectURL(imagePreview.dataset.url);
        delete imagePreview.dataset.url;
        const file = imageInput.files && imageInput.files[0];
        if (!file || !validate(imageInput, form)) {
          imagePreview.removeAttribute("src");
          imagePreview.hidden = true;
          return;
        }
        imagePreview.dataset.url = URL.createObjectURL(file);
        imagePreview.src = imagePreview.dataset.url;
        imagePreview.hidden = false;
      });
    }

    const canton = $("#report-canton", form);
    const district = $("#report-district", form);
    if (canton) {
      canton.addEventListener("change", () => {
        updateDistrictOptions(canton, district, false);
        if (district) {
          district.value = "";
          district.removeAttribute("aria-invalid");
        }
        const districtError = $('[data-error-for="district"]');
        if (districtError) districtError.textContent = "";
        validate(canton, form);
      });
    }

    const clearButton = $("#clear-form", form);
    if (clearButton) {
      clearButton.addEventListener("click", () => {
        if (!window.confirm("¿Quieres borrar la información que escribiste en el formulario?")) return;
        clearForm(form);
      });
    }

    form.addEventListener("submit", async event => {
      event.preventDefault();
      const session = getSession();
      if (!session || session.role !== "usuario") {
        const formMessage = $("#form-message");
        formMessage.textContent = "Inicia sesión como usuario para enviar un reporte.";
        formMessage.dataset.type = "error";
        return;
      }
      if (!fields.map(field => validate(field, form)).every(Boolean)) {
        const formMessage = $("#form-message");
        formMessage.textContent = "Revisa los campos marcados antes de guardar.";
        formMessage.dataset.type = "error";
        return;
      }

      // FormData recoge todos los valores escritos en el formulario.
      const values = Object.fromEntries(new FormData(form).entries());
      const imageFile = imageInput && imageInput.files && imageInput.files[0];
      // Evita repetir el mismo título, categoría y ubicación.
      const duplicate = state.allReports.some(report =>
        report.categoria === values.category &&
        report.canton === values.canton &&
        report.distrito === values.district &&
        normalizeText(report.titulo) === normalizeText(values.title)
      );
      if (duplicate) {
        const formMessage = $("#form-message");
        formMessage.textContent = "Ya existe un reporte con ese título, categoría, cantón y distrito.";
        formMessage.dataset.type = "error";
        return;
      }

      // La imagen se guarda como texto dentro del navegador junto con el resto del reporte.
      const report = {
        id: "USR-" + Date.now(),
        titulo: values.title.trim(),
        categoria: values.category,
        canton: values.canton,
        distrito: values.district,
        lugar: values.location.trim(),
        imagen: imageFile ? await readImage(imageFile) : "",
        imagenAlt: imageFile ? values.title.trim() : "",
        descripcion: values.description.trim(),
        estado: "activo",
        fecha: new Date().toISOString().slice(0, 10),
        revision: "pendiente"
      };
      const mine = read(STORE, [])
        .filter(item => item && typeof item.id === "string" && item.id.startsWith("USR-"));
      mine.unshift(report);
      // Si el navegador no tiene espacio disponible, se informa sin borrar el formulario.
      try {
        write(STORE, mine);
      } catch (error) {
        const formMessage = $("#form-message");
        formMessage.textContent = "No se pudo guardar. Prueba con una imagen más pequeña.";
        formMessage.dataset.type = "error";
        return;
      }
      refreshReports();
      clearForm(form, "Reporte enviado. Aparecerá en la página cuando el administrador lo apruebe.");
    });
  }

  // Conecta el formulario accesible que reemplaza los cuadros prompt de edición.
  function initEditForm() {
    const form = $("#edit-report-form");
    const dialog = $("#edit-dialog");
    if (!form || !dialog) return;

    const fields = $$('input[name], select[name], textarea[name]', form);
    const message = $("#edit-form-message", form);
    fields.forEach(field => {
      ["input", "blur"].forEach(eventName => {
        field.addEventListener(eventName, () => validate(field, form));
      });
    });

    const closeButton = $("[data-close-edit]", form);
    if (closeButton) closeButton.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", event => {
      if (event.target === dialog) dialog.close();
    });

    form.addEventListener("submit", event => {
      event.preventDefault();
      const session = getSession();
      if (!session || session.role !== "admin") return;

      if (!fields.map(field => validate(field, form)).every(Boolean)) {
        message.textContent = "Revisa los campos marcados antes de guardar.";
        message.dataset.type = "error";
        return;
      }

      const report = state.allReports.find(item => item.id === state.editingReportId);
      if (!report) {
        message.textContent = "No se encontró el reporte que intentas editar.";
        message.dataset.type = "error";
        return;
      }

      const values = Object.fromEntries(new FormData(form).entries());
      const duplicate = state.allReports.some(item =>
        item.id !== report.id &&
        item.categoria === report.categoria &&
        item.canton === report.canton &&
        item.distrito === report.distrito &&
        normalizeText(item.titulo) === normalizeText(values.title)
      );
      if (duplicate) {
        message.textContent = "Ya existe un reporte con ese título en la misma categoría y ubicación.";
        message.dataset.type = "error";
        return;
      }

      const updated = Object.assign({}, report, {
        titulo: values.title.trim(),
        lugar: values.location.trim(),
        descripcion: values.description.trim(),
        estado: values.status
      });

      try {
        if (report.id.startsWith("USR-")) {
          write(STORE, read(STORE, []).map(item => item.id === report.id ? updated : item));
        } else {
          const edits = readObject(ADMIN_EDITS);
          edits[report.id] = updated;
          write(ADMIN_EDITS, edits);
        }
      } catch (error) {
        message.textContent = "No se pudieron guardar los cambios en este navegador.";
        message.dataset.type = "error";
        return;
      }

      state.editingReportId = null;
      dialog.close();
      form.reset();
      $$('[aria-invalid="true"]', form).forEach(field => field.removeAttribute("aria-invalid"));
      $$(".error", form).forEach(error => { error.textContent = ""; });
      message.textContent = "";
      refreshReports();
      showAnnouncement("El reporte se actualizó.");
    });
  }

  // MODERACIÓN: acciones disponibles para revisar reportes como administrador.
  // Cambia el estado de revisión de un envío hecho por una persona usuaria.
  function setReview(id, revision) {
    const reports = read(STORE, []).map(report =>
      report.id === id ? Object.assign({}, report, { revision }) : report
    );
    write(STORE, reports);
    refreshReports();
  }

  // Abre el formulario con los datos actuales del reporte seleccionado.
  function editReport(id) {
    const report = state.allReports.find(item => item.id === id);
    const form = $("#edit-report-form");
    const dialog = $("#edit-dialog");
    if (!report || !form || !dialog) return;

    form.reset();
    $$('[aria-invalid="true"]', form).forEach(field => field.removeAttribute("aria-invalid"));
    $$(".error", form).forEach(error => { error.textContent = ""; });
    $("#edit-form-message", form).textContent = "";
    $("#edit-title", form).value = report.titulo || "";
    $("#edit-location", form).value = report.lugar || "";
    $("#edit-description", form).value = report.descripcion || "";
    $("#edit-status", form).value = report.estado || "activo";
    state.editingReportId = report.id;
    dialog.showModal();
    $("#edit-title", form).focus();
  }

  // El administrador puede ocultar un envío o un reporte incluido en el JSON.
  function removeReport(id) {
    if (!window.confirm("¿Quieres eliminar este reporte de la página?")) return;
    if (id.startsWith("USR-")) {
      write(STORE, read(STORE, []).filter(report => report.id !== id));
    } else {
      const hidden = read(HIDDEN_REPORTS, []);
      if (!hidden.includes(id)) hidden.push(id);
      write(HIDDEN_REPORTS, hidden);
    }
    refreshReports();
    showAnnouncement("El reporte se eliminó de la página.");
  }

  // INICIO: conecta los eventos de la página actual y carga los datos compartidos.
  // Conecta búsqueda, filtros, botones de reportes, diálogo y menú móvil.
  function init() {
    const canOpenPage = initAccess();
    if (!canOpenPage) return;
    const page = document.body.dataset.page;
    if (page === "login" || page === "registro") return;
    const search = $("#search-input");
    const canton = $("#canton-filter");
    const district = $("#district-filter");
    const status = $("#status-filter");

    if (search) {
      search.addEventListener("input", () => {
        state.query = normalizeText(search.value);
        renderList();
      });
    }
    if (canton) {
      canton.addEventListener("change", () => {
        state.canton = canton.value;
        state.district = "all";
        updateDistrictOptions(canton, district, true);
        renderList();
      });
    }
    if (district) {
      district.addEventListener("change", () => {
        state.district = district.value;
        renderList();
      });
    }
    if (status) {
      status.addEventListener("change", () => {
        state.status = status.value;
        renderList();
      });
    }

    $$(".filtro").forEach(button => {
      button.addEventListener("click", () => {
        state.category = button.dataset.cat;
        $$(".filtro").forEach(item => {
          const selected = item === button;
          item.classList.toggle("seleccionado", selected);
          item.setAttribute("aria-pressed", String(selected));
        });
        renderList();
      });
    });

    // Un solo evento en el documento atiende botones de tarjetas creadas dinámicamente.
    document.addEventListener("click", event => {
      const button = event.target.closest("[data-action]");
      if (!button) return;
      const id = button.dataset.id;

      if (button.dataset.action === "detail") detail(id);
      if (["vote", "like"].includes(button.dataset.action)) {
        // Cada persona puede dejar una reacción por reporte; cambiarla quita la anterior.
        const isLike = button.dataset.action === "like";
        const selected = isLike ? state.likes : state.votes;
        const other = isLike ? state.votes : state.likes;
        const wasSelected = selected.includes(id);
        const nextSelected = wasSelected
          ? selected.filter(value => value !== id)
          : selected.concat(id);
        const nextOther = wasSelected ? other : other.filter(value => value !== id);

        if (isLike) {
          state.likes = nextSelected;
          state.votes = nextOther;
        } else {
          state.votes = nextSelected;
          state.likes = nextOther;
        }
        write(LIKES, state.likes);
        write(VOTES, state.votes);
        renderAll();
      }
      if (button.dataset.action === "delete") {
        if (getSession() && getSession().role === "usuario") removeReport(id);
      }
      if (["approve", "reject", "reopen", "edit", "admin-delete"].includes(button.dataset.action)) {
        const session = getSession();
        if (!session || session.role !== "admin") return;
        if (button.dataset.action === "approve") {
          setReview(id, "aprobado");
          showAnnouncement("Reporte aprobado y publicado.");
        }
        if (button.dataset.action === "reject") {
          setReview(id, "rechazado");
          showAnnouncement("Reporte rechazado; no se mostrará públicamente.");
        }
        if (button.dataset.action === "reopen") {
          setReview(id, "pendiente");
          showAnnouncement("El reporte volvió a quedar pendiente de revisión.");
        }
        if (button.dataset.action === "edit") editReport(id);
        if (button.dataset.action === "admin-delete") removeReport(id);
      }
    });

    // Permite cerrar el detalle con su botón o al pulsar el fondo de la ventana.
    const dialog = $("#report-dialog");
    if (dialog) {
      const closeButton = $(".cerrar", dialog);
      if (closeButton) closeButton.addEventListener("click", () => dialog.close());
      dialog.addEventListener("click", event => {
        if (event.target === dialog) dialog.close();
      });
    }

    // Abre y cierra el menú de navegación en pantallas pequeñas.
    const menuButton = $(".menu");
    const navigation = $(".menu-principal");
    if (menuButton && navigation) {
      menuButton.addEventListener("click", () => {
        const isOpen = menuButton.getAttribute("aria-expanded") !== "true";
        menuButton.setAttribute("aria-expanded", String(isOpen));
        navigation.classList.toggle("abierto", isOpen);
      });
      navigation.addEventListener("click", event => {
        if (event.target.closest("a")) {
          navigation.classList.remove("abierto");
          menuButton.setAttribute("aria-expanded", "false");
        }
      });
    }

    // Marca como actual el enlace de navegación que corresponde a la página abierta.
    const activeLink = $('[data-nav="' + document.body.dataset.page + '"]');
    if (activeLink) activeLink.setAttribute("aria-current", "page");
    initForm();
    initEditForm();
    load();
  }

  // Espera a que el HTML exista antes de conectar eventos y cargar los datos.
  document.addEventListener("DOMContentLoaded", init);
})();
