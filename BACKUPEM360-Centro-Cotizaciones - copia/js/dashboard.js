document.addEventListener("DOMContentLoaded", () => {
    const contenido = document.getElementById("contenidoPrincipal");
    const menu = document.querySelector(".menu");

    aplicarConfiguracionLocal();
    aplicarPermisosPorRol();

    function escaparDashboard(valor) {
        const elemento = document.createElement("div");
        elemento.textContent = valor || "";
        return elemento.innerHTML;
    }

    function activarMenu(id) {
        menu.querySelectorAll("a").forEach((enlace) => enlace.classList.remove("activo"));
        document.getElementById(id)?.classList.add("activo");
    }

    function aplicarPermisosPorRol() {
        const sesion = window.em360Permisos.obtenerSesion();
        const rol = sesion?.rol || "Consulta";
        const visiblesPorRol = {
            Administrador: ["menuInicio", "menuProyectos", "menuPlanoInterior", "menuCotizaciones", "menuProveedores", "menuUsuarios", "menuConfiguracion"],
            Oficial: ["menuInicio", "menuCotizaciones", "menuProveedores"],
        Consulta: ["menuInicio", "menuProyectos", "menuPlanoInterior", "menuCotizaciones"]
        };
        const visibles = visiblesPorRol[rol] || visiblesPorRol.Consulta;

        menu.querySelectorAll("a").forEach((enlace) => {
            enlace.hidden = !visibles.includes(enlace.id);
        });

        const botonNuevoProyecto = document.getElementById("btnNuevoProyecto");
        if (botonNuevoProyecto) botonNuevoProyecto.hidden = !window.em360Permisos.esAdministrador();
    }

    function mostrarInicio() {
        activarMenu("menuInicio");
        contenido.innerHTML = `
            <div class="card bienvenida-inicio">
                <h2>Bienvenido a EM360™</h2>
                <p>Seleccione una opción del menú para administrar los proyectos, planos, cotizaciones y proveedores.</p>
            </div>
        `;
    }

    async function mostrarSelectorProyecto(titulo, descripcion, modulo, servicioPreseleccionado = "") {
        const { data, error } = await supabaseClient
            .from("Proyectos")
            .select("id, nombre, cliente, estado")
            .order("id", { ascending: false });

        if (error) {
            contenido.innerHTML = `<div class="card"><p>No se pudieron cargar los proyectos: ${escaparDashboard(error.message)}</p></div>`;
            return;
        }

        const proyectos = data.length
            ? data.map((proyecto) => `
                <article class="selector-proyecto-item">
                    <h3>${escaparDashboard(proyecto.nombre)}</h3>
                    <p><strong>Cliente:</strong> ${escaparDashboard(proyecto.cliente)}</p>
                    <p><strong>Estado:</strong> ${escaparDashboard(proyecto.estado)}</p>
                    <button type="button" data-proyecto-id="${proyecto.id}" data-modulo="${modulo}" data-servicio="${servicioPreseleccionado}">Abrir</button>
                </article>
            `).join("")
            : '<p>No hay proyectos disponibles.</p>';

        contenido.innerHTML = `
            <section class="card selector-proyectos">
                <h2>${titulo}</h2>
                <p>${descripcion}</p>
                <div class="grid-selector-proyectos">${proyectos}</div>
            </section>
        `;

        contenido.querySelectorAll("[data-proyecto-id]").forEach((boton) => {
            boton.addEventListener("click", async () => {
                await abrirProyecto(boton.dataset.proyectoId);
                const funcion = {
                    planos: window.cargarModuloPlanos,
                    cotizaciones: window.cargarModuloCotizaciones,
                    proveedores: window.cargarModuloProveedores
                }[boton.dataset.modulo];

                if (typeof funcion === "function") funcion(boton.dataset.servicio);
            });
        });
    }

    function obtenerUsuariosLocales() {
        try {
            return JSON.parse(localStorage.getItem("em360Usuarios") || "[]");
        } catch {
            return [];
        }
    }

    function mostrarUsuarios() {
        activarMenu("menuUsuarios");
        contenido.innerHTML = `
            <section class="card pagina-usuarios">
                <h2>Usuarios</h2>
                <p>Las cuentas se crean mediante invitación segura desde Supabase Authentication.</p>
                <p>Abra <strong>Authentication → Users → Add user → Send invitation</strong> para invitar a un correo. Los nuevos usuarios empiezan con rol Consulta; el rol se administra desde la tabla Perfiles.</p>
                <hr>
                <h3>Activar portal de proveedor</h3>
                <p>Después de invitar al proveedor, escriba su correo para darle acceso exclusivo al portal de cotizaciones.</p>
                <form id="formActivarProveedor" class="form-panel">
                    <input id="correoActivarProveedor" type="email" maxlength="160" placeholder="correo@proveedor.com" required>
                    <select id="especialidadActivarProveedor" required>
                        <option value="">Seleccione la especialidad</option>
                        <option value="ebanisteria">Ebanista</option>
                        <option value="marmoleros">Marmolero</option>
                        <option value="sheetrockeros">Sheetrockero</option>
                        <option value="plomeros">Plomero</option>
                        <option value="electricistas">Electricista</option>
                        <option value="piseros">Pisero</option>
                        <option value="pintores">Pintor</option>
                    </select>
                    <button type="submit">Activar proveedor</button>
                </form>
                <p id="mensajeActivarProveedor" class="mensaje-acceso" aria-live="polite"></p>
                <p><a href="proveedor.html" target="_blank" rel="noopener noreferrer">Abrir portal de proveedores</a></p>
            </section>
        `;

        document.getElementById("formActivarProveedor").addEventListener("submit", async (evento) => {
            evento.preventDefault();
            const mensaje = document.getElementById("mensajeActivarProveedor");
            mensaje.textContent = "Activando...";
            const { error } = await supabaseClient.rpc("configurar_proveedor", {
                correo_proveedor: document.getElementById("correoActivarProveedor").value.trim(),
                especialidad: document.getElementById("especialidadActivarProveedor").value
            });
            mensaje.textContent = error
                ? `No se pudo activar: ${error.message}`
                : "Proveedor activado. Ya puede entrar al portal de proveedores.";
        });
        return;

        const usuarios = obtenerUsuariosLocales();
        const lista = usuarios.length
            ? usuarios.map((usuario, indice) => `
                <li>
                    <strong>${escaparDashboard(usuario.nombre)}</strong>
                    <span>${escaparDashboard(usuario.rol)} · ${escaparDashboard(usuario.email)}</span>
                    <button type="button" class="btn-usar-sesion" data-usuario-indice="${indice}">Usar esta sesión</button>
                </li>
            `).join("")
            : '<li class="sin-usuarios">Todavía no hay usuarios registrados en este navegador.</li>';

        contenido.innerHTML = `
            <section class="card pagina-usuarios">
                <h2>Usuarios</h2>
                <p>Directorio local del portal.</p>
                <form id="formUsuario" class="form-panel">
                    <input id="usuarioNombre" type="text" maxlength="100" placeholder="Nombre completo" required>
                    <input id="usuarioEmail" type="email" maxlength="160" placeholder="Correo electrónico" required>
                    <select id="usuarioRol">
                        <option>Administrador</option>
                        <option>Oficial</option>
                        <option>Consulta</option>
                    </select>
                    <button type="submit">Agregar usuario</button>
                </form>
                <ul class="lista-usuarios">${lista}</ul>
            </section>
        `;

        document.getElementById("formUsuario").addEventListener("submit", (evento) => {
            evento.preventDefault();
            const nuevosUsuarios = obtenerUsuariosLocales();
            nuevosUsuarios.push({
                nombre: document.getElementById("usuarioNombre").value.trim(),
                email: document.getElementById("usuarioEmail").value.trim(),
                rol: document.getElementById("usuarioRol").value
            });
            localStorage.setItem("em360Usuarios", JSON.stringify(nuevosUsuarios));
            mostrarUsuarios();
        });

        contenido.querySelectorAll("[data-usuario-indice]").forEach((boton) => {
            boton.addEventListener("click", () => {
                const usuario = obtenerUsuariosLocales()[Number(boton.dataset.usuarioIndice)];
                window.em360Permisos.cambiarSesion(usuario.nombre, usuario.rol);
                aplicarPermisosPorRol();
                mostrarInicio();
                alert(`Sesión activa: ${usuario.nombre} (${usuario.rol})`);
            });
        });
    }

    function mostrarListaProveedores() {
        activarMenu("menuProveedores");

        const especialidades = [
            ["ebanisteria", "Ebanistas", "Mobiliario, puertas y trabajos en madera."],
            ["marmoleros", "Marmoleros", "Topes, revestimientos y acabados en mármol."],
            ["sheetrockeros", "Sheetrockeros", "Muros, plafones y acabados en sheetrock."],
            ["plomeros", "Plomeros", "Instalaciones sanitarias, agua y desagües."],
            ["electricistas", "Electricistas", "Instalaciones eléctricas, iluminación y controles."],
            ["piseros", "Piseros", "Colocación y acabado de pisos."],
            ["pintores", "Pintores", "Pintura interior, exterior y detalles finales."]
        ];

        contenido.innerHTML = `
            <section class="card lista-proveedores-pagina">
                <h2>Proveedores</h2>
                <p>Seleccione la especialidad del proveedor que necesita para el proyecto.</p>
                <div class="grid-especialidades-proveedores">
                    ${especialidades.map(([codigo, nombre, descripcion]) => `
                        <button type="button" class="especialidad-proveedor" data-especialidad="${codigo}">
                            <h3>${nombre}</h3>
                            <p>${descripcion}</p>
                            <span>Seleccionar para cotizar</span>
                        </button>
                    `).join("")}
                </div>
            </section>
        `;

        contenido.querySelectorAll("[data-especialidad]").forEach((boton) => {
            boton.addEventListener("click", () => {
                mostrarSelectorProyecto(
                    "Seleccionar proyecto",
                    `Seleccione el proyecto para registrar una cotización de ${boton.querySelector("h3").textContent}.`,
                    "proveedores",
                    boton.dataset.especialidad
                );
            });
        });
    }

    function aplicarConfiguracionLocal() {
        const nombrePortal = localStorage.getItem("em360NombrePortal") || "Portal de Proveedores";
        const titulo = document.querySelector(".topbar h1");
        const subtitulo = document.querySelector(".logo p");

        if (titulo) titulo.textContent = `EM360™ | ${nombrePortal}`;
        if (subtitulo) subtitulo.textContent = nombrePortal;
    }

    function mostrarConfiguracion() {
        activarMenu("menuConfiguracion");
        const nombrePortal = localStorage.getItem("em360NombrePortal") || "Portal de Proveedores";

        contenido.innerHTML = `
            <section class="card pagina-configuracion">
                <h2>Configuración</h2>
                <p>Personalice el nombre visible del portal en este navegador.</p>
                <form id="formConfiguracion" class="form-panel">
                    <label for="nombrePortal">Nombre del portal</label>
                    <input id="nombrePortal" type="text" maxlength="80" value="${escaparDashboard(nombrePortal)}" required>
                    <button type="submit">Guardar configuración</button>
                </form>
            </section>
        `;

        document.getElementById("formConfiguracion").addEventListener("submit", (evento) => {
            evento.preventDefault();
            localStorage.setItem("em360NombrePortal", document.getElementById("nombrePortal").value.trim());
            aplicarConfiguracionLocal();
            alert("Configuración guardada.");
        });
    }

    const acciones = {
        menuInicio: mostrarInicio,
        menuProyectos: () => {
            activarMenu("menuProyectos");
            window.cargarProyectos?.();
        },
        menuPlanoInterior: () => {
            activarMenu("menuPlanoInterior");
            mostrarSelectorProyecto("Plano de Interior", "Seleccione el proyecto cuyos planos desea consultar o cargar.", "planos");
        },
        menuCotizaciones: () => {
            activarMenu("menuCotizaciones");
            if (window.em360Permisos.esOficial()) {
                window.cargarAprobacionesOficial?.();
            } else {
                mostrarSelectorProyecto("Cotizaciones", "Seleccione el proyecto para revisar las cotizaciones recibidas.", "cotizaciones");
            }
        },
        menuProveedores: () => {
            mostrarListaProveedores();
        },
        menuUsuarios: mostrarUsuarios,
        menuConfiguracion: mostrarConfiguracion
    };

    Object.entries(acciones).forEach(([id, accion]) => {
        document.getElementById(id)?.addEventListener("click", (evento) => {
            evento.preventDefault();
            accion();
        });
    });

    window.em360ActualizarPermisos = aplicarPermisosPorRol;
});
