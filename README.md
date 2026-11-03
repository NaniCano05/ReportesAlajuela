## Repositorio en GitHub

[Ver Reportes Alajuela hecho por Daniela Cano Alfaro](https://github.com/NaniCano05/ReportesAlajuela)
[Ver Reportes Alajuela en GITHUB PAGES](https://nanicano05.github.io/ReportesAlajuela/)
<p align="center">
  <img src="img/logo-icon.png" alt="Logo de Reportes Alajuela" width="90">
</p>

<h1 align="center">Reportes Alajuela</h1>

<p align="center">
  Sitio web académico para consultar y compartir incidencias comunitarias de la provincia de Alajuela.
</p>

<p align="center">
  Proyecto individual · ISW-521 Programación en Ambiente Web I
</p>

---

## Sobre el proyecto

Reportes Alajuela reúne en un solo lugar avisos sobre situaciones que pueden afectar a las comunidades. La página permite buscar reportes por ubicación, categoría y estado; abrir sus detalles y registrar una incidencia con información organizada.

El proyecto se desarrolló con **HTML, CSS y JavaScript nativos**, sin frameworks. Los ejemplos iniciales se cargan desde archivos JSON. Las cuentas, los reportes creados y otros cambios de la demostración se conservan en el navegador.

## Qué se puede hacer

- Consultar reportes de la provincia de Alajuela.
- Buscar por texto y filtrar por cantón, distrito, categoría o estado.
- Abrir el detalle de cada incidencia.
- Marcar **Me gusta** o **Me afecta**.
- Crear una cuenta, leer y aceptar los términos e iniciar sesión.
- Enviar un reporte con ubicación, descripción y una imagen opcional.
- Revisar los reportes enviados desde el panel de administración, aprobarlos, editarlos o eliminarlos.

Los reportes nuevos quedan pendientes hasta que la persona administradora los revise. Las categorías incluyen cortes de agua, huecos, fugas, accidentes, otros reportes y partidos de fútbol. Los estados disponibles son Activo, En proceso, Finalizado y Resuelto.

## Cómo se fue construyendo

1. **Se prepararon los datos.** `data/reportes.json` reúne 13 reportes de ejemplo. `data/ubicaciones-alajuela.json` contiene 16 cantones y 116 distritos, organizados con códigos para relacionar cada distrito con su cantón.
2. **Se armó la estructura de las páginas.** `index.html` presenta el proyecto y la sección Acerca de. `reportes.html` contiene la búsqueda y los filtros. `gestion.html` reúne el formulario de incidencias y los paneles de usuario y administración.
3. **Se completó el recorrido de cuentas.** `registro.html`, `login.html` y `terminos.html` cubren el registro, el acceso y las condiciones de participación.
4. **Se conectó el comportamiento.** `JavaScript/app.js` carga los datos, actualiza las tarjetas y filtros, valida los reportes y controla las acciones de usuario y administración. `JavaScript/account.js` maneja el registro, la sesión, los roles y el perfil. `JavaScript/utils.js` reúne funciones compartidas para leer datos, normalizar texto, procesar imágenes y proteger el HTML generado.
5. **Se aplicó el diseño.** `css/styles.css` define la identidad visual, los formularios, las tarjetas y la adaptación a distintos tamaños de pantalla. Usa CSS Grid, Flexbox y media queries.
6. **Se guardan los cambios en el navegador.** `localStorage` conserva los datos de la demostración; `sessionStorage` mantiene la sesión iniciada durante la sesión de la pestaña.

## Cómo abrirlo en tu computadora

1. Abre la carpeta del proyecto en Visual Studio Code.
2. Inicia un servidor local, por ejemplo con la extensión **Live Server**.
3. Abre `index.html` con Live Server.
4. Usa el menú para entrar a Reportes, crear una cuenta o iniciar sesión.

No abras la página directamente como `file://`: el proyecto usa módulos JavaScript y `fetch()` para leer los archivos JSON, y el navegador puede bloquear esas solicitudes cuando no hay un servidor local.

## Cuentas para la demostración

Se incluyen dos cuentas de ejemplo:

| Rol | Usuario | Contraseña |
| --- | --- | --- |
| Administración | `admin` | `admin1234+` |
| Persona usuaria | `usuario` | `user123` |

Una cuenta nueva se crea desde Registro. Después se inicia sesión usando la cédula y la contraseña elegidas. El menú del ícono de persona muestra los datos del perfil y la opción de cerrar sesión.

Estas credenciales son solo para la demostración del curso. No reutilices esas contraseñas en otros servicios.

## Datos y almacenamiento

- **`data/reportes.json`:** contiene reportes iniciales de ejemplo. El navegador los lee, pero no modifica el archivo.
- **`data/ubicaciones-alajuela.json`:** proporciona los cantones y distritos para los selectores dependientes.
- **`localStorage`:** guarda cuentas registradas, reportes enviados, reacciones y cambios administrativos en el navegador actual.
- **`sessionStorage`:** guarda la sesión iniciada y el rol durante la sesión de esa pestaña.
- **Cookies:** el proyecto no crea ni lee cookies.

Los datos guardados no se sincronizan entre personas ni dispositivos. Para limpiar la demostración se pueden borrar los datos del sitio desde el almacenamiento del navegador.

## Organización de archivos

```text
index.html                         Inicio y sección Acerca de
reportes.html                      Búsqueda, filtros y detalles
gestion.html                       Envío de reportes y administración
login.html                         Inicio de sesión
registro.html                      Registro de cuentas
terminos.html                      Términos y condiciones
css/styles.css                     Estilos y adaptación móvil
JavaScript/app.js                  Reportes, filtros y formularios
JavaScript/account.js              Registro, acceso y sesiones
JavaScript/utils.js                Funciones compartidas
data/reportes.json                 Reportes iniciales
data/ubicaciones-alajuela.json     Cantones y distritos
img/                               Imágenes del sitio
docs/Daniela_Cano_avance/          PDF del avance actualizado
```

## Diseño y decisiones técnicas

El sitio adapta la navegación, las tarjetas y los formularios a pantallas de escritorio y teléfono. Las imágenes conservan su proporción dentro de las tarjetas. Los campos tienen etiquetas y mensajes de validación; los botones indican sus acciones y los textos ingresados se escapan antes de agregarse a la página.

Los avisos del sistema se muestran con elementos propios del proyecto. No se usa Toastify ni otra biblioteca de notificaciones.

## Alcance del prototipo

Este es un proyecto académico de frontend. No tiene backend ni base de datos central: el almacenamiento y el control de roles ocurren en el navegador y sirven para demostrar el flujo de la aplicación, no para ofrecer autenticación segura. La contraseña de una cuenta registrada se guarda como un hash generado en el navegador, pero eso no convierte el sitio en un sistema seguro para cuentas reales.

Reportes Alajuela tampoco reemplaza los canales oficiales de atención ni el 9-1-1 ante una emergencia.
