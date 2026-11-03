# Reportes Alajuela

Sitio web académico para consultar, filtrar y registrar incidencias comunitarias de la provincia de Alajuela. Se hizo con HTML, CSS y JavaScript del navegador; no usa frameworks ni servidor de aplicación.

## Cómo se fue construyendo

1. **Se definió el contenido.** Se prepararon reportes de ejemplo en `data/reportes.json` y cantones con sus distritos en `data/ubicaciones-alajuela.json`. Los registros territoriales usan códigos para que el distrito siempre corresponda al cantón elegido.
2. **Se armó la página de inicio.** `index.html` presenta el propósito del sitio, un resumen y accesos a las otras secciones. También contiene el bloque “Acerca de”.
3. **Se creó la consulta de reportes.** `reportes.html` aporta el buscador y los controles por ubicación, categoría y estado. `JavaScript/app.js` carga los JSON, dibuja las tarjetas y vuelve a aplicar los filtros cuando cambia una opción.
4. **Se agregó el formulario y la revisión.** `gestion.html` contiene el formulario para enviar incidencias y los paneles de usuario y administración. Los envíos quedan pendientes; el administrador puede revisarlos, editarlos, aprobarlos o eliminarlos.
5. **Se conectó el registro y el acceso.** `registro.html`, `login.html` y `terminos.html` cubren creación de cuenta, inicio de sesión y lectura de las reglas. `JavaScript/account.js` valida los datos, registra cuentas y controla qué panel se muestra según el rol.
6. **Se repartió la lógica en módulos.** `JavaScript/utils.js` reúne operaciones pequeñas que comparten los otros archivos, como lectura y escritura local, normalización de texto, lectura de imágenes y escape de HTML.
7. **Se aplicó el diseño común.** `css/styles.css` define colores, tipografía, tarjetas, formularios, navegación y adaptación a distintos anchos de pantalla. Usa CSS Grid, Flexbox y media queries.
8. **Se revisaron los datos guardados.** Los reportes base vienen del JSON; las cuentas, envíos y cambios de la demostración se guardan en el navegador. La sesión de acceso se mantiene en `sessionStorage`.

## Cómo abrirlo

1. Descarga o clona el repositorio y abre la carpeta del proyecto en Visual Studio Code.
2. Instala o activa la extensión **Live Server**.
3. Haz clic derecho en `index.html` y elige **Open with Live Server**.
4. Navega desde el menú. Es necesario usar un servidor local porque el sitio importa módulos JavaScript y lee archivos JSON con `fetch`; abrir `index.html` como `file://` puede bloquear esas operaciones.

## Recorrido para revisar

- En **Reportes**, combina texto, cantón, distrito, categoría y estado. Abre una tarjeta para ver su detalle. Las reacciones “Me gusta” y “Me afecta” se pueden alternar.
- En **Crear Reporte**, inicia sesión o crea una cuenta, acepta los términos y envía un reporte. El formulario valida campos y el envío queda pendiente para revisión.
- Para demostrar administración, inicia sesión con la cuenta de ejemplo `admin` y contraseña `admin1234+`. Para la cuenta de ejemplo de usuario usa `usuario` y `user123`.
- Una cuenta nueva se crea en el formulario de registro y luego se inicia sesión con su cédula y contraseña. El perfil aparece al abrir el ícono de persona.

Las credenciales de ejemplo son solo para la demostración académica. No deben reutilizarse en servicios reales.

## Qué se guarda y dónde

- **`localStorage`:** datos locales de la aplicación, incluidas cuentas de demostración registradas, reportes enviados, reacciones y cambios administrativos. Se conservan al cerrar la pestaña en el mismo navegador y origen.
- **`sessionStorage`:** los datos de la sesión iniciada. Se usan para reconocer el acceso en la pestaña actual y se borran al cerrar sesión; el navegador también los elimina al terminar esa sesión de pestaña.
- **Cookies:** el proyecto no crea ni lee cookies.
- Los 13 reportes iniciales se leen desde `data/reportes.json`; el sitio no modifica ese archivo desde el navegador. Los cambios se superponen desde almacenamiento local.

## Archivos principales

```text
index.html                 Inicio y sección Acerca de
reportes.html              Búsqueda, filtros y detalle
gestion.html               Formulario, panel de usuario y panel admin
login.html                 Inicio de sesión
registro.html              Registro de cuenta
terminos.html              Términos y condiciones
css/styles.css             Estilos y diseño adaptable
JavaScript/app.js          Reportes, filtros, formularios y paneles
JavaScript/account.js      Registro, acceso, sesión y roles
JavaScript/utils.js        Funciones compartidas
data/reportes.json         Reportes de ejemplo
data/ubicaciones-alajuela.json  Cantones y distritos
img/                       Imágenes del sitio
docs/                      Documentos del proyecto
```

## Alcance

Es un prototipo de clase y funciona en el navegador donde se usa. No tiene backend ni base de datos compartida; por eso los datos no se sincronizan entre personas o dispositivos. El control de roles y el hash de contraseña se implementan en el cliente y sirven para practicar el flujo, no para proteger cuentas reales. El sitio tampoco reemplaza los canales oficiales ni el 9-1-1.
