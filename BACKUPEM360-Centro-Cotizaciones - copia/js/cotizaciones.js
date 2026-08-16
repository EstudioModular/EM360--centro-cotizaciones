const TIPOS_COTIZACION = {
    ebanisteria: "Ebanistas",
    marmoleros: "Marmoleros",
    sheetrockeros: "Sheetrockeros",
    plomeros: "Plomeros",
    electricistas: "Electricistas",
    piseros: "Piseros",
    pintores: "Pintores",
    tope: "Tope"
};

const imagenesCotizaciones = new Map();

function textoSeguroCotizacion(valor) {
    const elemento = document.createElement("div");
    elemento.textContent = valor || "";
    return elemento.innerHTML;
}

function fechaVistaCotizacion(fecha) {
    return new Intl.DateTimeFormat("es-DO", {
        dateStyle: "medium",
        timeStyle: "short"
    }).format(new Date(fecha));
}

function archivoEsImagenCotizacion(ruta) {
    return /\.(png|jpe?g|webp|gif)$/i.test((ruta || "").split("?")[0]);
}

async function cargarModuloCotizaciones() {
    const contenedor = document.getElementById("contenidoExpediente");
    if (!contenedor || !window.proyectoActual) return;

    contenedor.innerHTML = `
        <section class="panel-cotizaciones">
            <div class="cabecera-cotizaciones">
                <div>
                    <h3>Cotizaciones recibidas</h3>
                    <p>Compare las propuestas e imágenes enviadas por cada proveedor.</p>
                </div>
                <button type="button" id="btnActualizarCotizaciones">Actualizar</button>
            </div>
            <div id="vistaCotizaciones" class="vista-cotizaciones" aria-live="polite">
                Cargando cotizaciones...
            </div>
        </section>
    `;

    document.getElementById("btnActualizarCotizaciones")
        .addEventListener("click", cargarVistaCotizaciones);

    document.getElementById("vistaCotizaciones")
        .addEventListener("click", async (evento) => {
            const botonAprobar = evento.target.closest("[data-aprobar-id]");
            if (botonAprobar) {
                await aprobarCotizacion(botonAprobar.dataset.aprobarId, cargarVistaCotizaciones);
                return;
            }

            const botonDeclinar = evento.target.closest("[data-declinar-id]");
            if (botonDeclinar) {
                const motivo = prompt("Motivo para declinar (opcional):");
                if (motivo !== null) {
                    await resolverCotizacion(botonDeclinar.dataset.declinarId, "Declinada", motivo, cargarVistaCotizaciones);
                }
                return;
            }

            const botonImagen = evento.target.closest("[data-imagen-id]");
            if (!botonImagen) return;

            const imagen = imagenesCotizaciones.get(botonImagen.dataset.imagenId);
            if (imagen) abrirVistaPreviaCotizacion(imagen.url, imagen.titulo);
        });

    await cargarVistaCotizaciones();
}

async function cargarVistaCotizaciones() {
    const vista = document.getElementById("vistaCotizaciones");
    if (!vista) return;

    vista.innerHTML = '<p class="estado-cotizaciones">Cargando cotizaciones...</p>';

    const { data, error } = await supabaseClient
        .from("CotizacionesProveedores")
        .select("id, proyecto_id, proveedor, servicio, comentario, ruta_archivo, created_at, estado, aprobado_por, aprobado_en, respuesta_administrador")
        .eq("proyecto_id", window.proyectoActual)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("No se pudieron cargar las cotizaciones:", error);
        vista.innerHTML = `<p class="estado-cotizaciones">No se pudieron cargar las cotizaciones: ${textoSeguroCotizacion(error.message)}</p>`;
        return;
    }

    if (!data.length) {
        imagenesCotizaciones.clear();
        vista.innerHTML = '<p class="estado-cotizaciones">Aún no hay cotizaciones enviadas por proveedores.</p>';
        return;
    }

    imagenesCotizaciones.clear();

    vista.innerHTML = Object.entries(TIPOS_COTIZACION).map(([servicio, titulo]) => {
        const cotizaciones = data.filter((cotizacion) => cotizacion.servicio === servicio);
        const contenido = cotizaciones.length
            ? cotizaciones.map(renderizarTarjetaCotizacion).join("")
            : '<p class="estado-cotizaciones">No hay propuestas en esta categoría.</p>';

        return `
            <section class="grupo-cotizaciones">
                <h4>${titulo}</h4>
                <div class="tarjetas-cotizaciones">${contenido}</div>
            </section>
        `;
    }).join("");
}

function renderizarTarjetaCotizacion(cotizacion) {
    const archivoUrl = cotizacion.ruta_archivo
        ? supabaseClient.storage.from("cotizaciones-proveedores").getPublicUrl(cotizacion.ruta_archivo).data.publicUrl
        : null;
    const imagen = archivoUrl && archivoEsImagenCotizacion(cotizacion.ruta_archivo)
        ? archivoUrl
        : null;

    if (imagen) {
        imagenesCotizaciones.set(String(cotizacion.id), {
            url: imagen,
            titulo: `Cotización de ${cotizacion.proveedor}`
        });
    }

    const foto = imagen
        ? `
            <button type="button" class="boton-vista-imagen" data-imagen-id="${cotizacion.id}">
                <img class="imagen-vista-cotizacion" src="${imagen}" alt="Ver imagen completa de la cotización">
                <span>Ver imagen completa</span>
            </button>
        `
        : "";
    const archivoAdjunto = archivoUrl && !imagen
        ? `<a class="enlace-archivo-cotizacion" href="${archivoUrl}" target="_blank" rel="noopener noreferrer">Ver o descargar archivo de cotización</a>`
        : "";
    const comentario = cotizacion.comentario
        ? `<p>${textoSeguroCotizacion(cotizacion.comentario)}</p>`
        : '<p class="sin-comentario">Sin comentario adicional.</p>';
    const resuelta = ["Aprobada", "Declinada"].includes(cotizacion.estado);
    const estado = cotizacion.estado === "Aprobada"
        ? `<span class="estado-cotizacion aprobada">Aprobada</span>`
        : cotizacion.estado === "Declinada"
            ? `<span class="estado-cotizacion declinada">Declinada</span>`
        : '<span class="estado-cotizacion pendiente">Pendiente</span>';
    const respuesta = cotizacion.respuesta_administrador
        ? `<p class="respuesta-administrador"><strong>Respuesta:</strong> ${textoSeguroCotizacion(cotizacion.respuesta_administrador)}</p>`
        : "";
    const botonesResolucion = !resuelta && window.em360Permisos?.puedeAprobarCotizaciones()
        ? `<div class="acciones-resolucion"><button type="button" class="btn-aprobar-cotizacion" data-aprobar-id="${cotizacion.id}">Aprobar</button><button type="button" class="btn-declinar-cotizacion" data-declinar-id="${cotizacion.id}">Declinar</button></div>`
        : "";

    return `
        <article class="tarjeta-cotizacion">
            <header>
                <strong>${textoSeguroCotizacion(cotizacion.proveedor)}</strong>
                <span>${fechaVistaCotizacion(cotizacion.created_at)}</span>
                ${estado}
            </header>
            ${foto}
            ${archivoAdjunto}
            ${comentario}
            ${respuesta}
            ${botonesResolucion}
        </article>
    `;
}

async function aprobarCotizacion(id, recargar) {
    return resolverCotizacion(id, "Aprobada", "", recargar);
}

async function resolverCotizacion(id, estado, respuesta, recargar) {
    if (!window.em360Permisos?.puedeAprobarCotizaciones()) return;

    const { error } = await supabaseClient
        .rpc("resolver_cotizacion", { cotizacion_id: id, estado_nuevo: estado, respuesta });

    if (error) {
        console.error("No se pudo aprobar la cotización:", error);
        alert(`No se pudo aprobar la cotización: ${error.message}`);
        return;
    }

    await recargar();
    await window.em360ActualizarNotificacionCotizaciones?.();
}

function abrirVistaPreviaCotizacion(url, titulo) {
    document.getElementById("visorImagenCotizacion")?.remove();

    const visor = document.createElement("div");
    visor.id = "visorImagenCotizacion";
    visor.className = "visor-imagen-cotizacion";
    visor.addEventListener("click", (evento) => {
        if (evento.target === visor) visor.remove();
    });

    const panel = document.createElement("section");
    panel.className = "panel-visor-imagen";

    const encabezado = document.createElement("div");
    encabezado.className = "encabezado-visor-imagen";

    const tituloVisor = document.createElement("h4");
    tituloVisor.textContent = titulo;

    const cerrar = document.createElement("button");
    cerrar.type = "button";
    cerrar.className = "cerrar-visor-imagen";
    cerrar.textContent = "Cerrar";
    cerrar.addEventListener("click", () => visor.remove());

    encabezado.append(tituloVisor, cerrar);

    const imagen = document.createElement("img");
    imagen.className = "imagen-completa-cotizacion";
    imagen.src = url;
    imagen.alt = titulo;

    const imprimir = document.createElement("button");
    imprimir.type = "button";
    imprimir.className = "btn-imprimir-imagen";
    imprimir.textContent = "Imprimir imagen";
    imprimir.addEventListener("click", () => imprimirImagenCotizacion(url, titulo));

    panel.append(encabezado, imagen, imprimir);
    visor.append(panel);
    document.body.append(visor);
}

function imprimirImagenCotizacion(url, titulo) {
    const ventana = window.open("", "_blank", "width=1000,height=800");

    if (!ventana) {
        alert("El navegador bloqueó la ventana de impresión. Permita las ventanas emergentes e inténtelo de nuevo.");
        return;
    }

    ventana.document.title = titulo;

    const estilos = ventana.document.createElement("style");
    estilos.textContent = `
        body { margin: 24px; font-family: Arial, sans-serif; color: #111; }
        h1 { font-size: 18px; margin: 0 0 20px; }
        img { display: block; max-width: 100%; max-height: calc(100vh - 100px); margin: 0 auto; object-fit: contain; }
        @page { margin: 12mm; }
    `;

    const encabezado = ventana.document.createElement("h1");
    encabezado.textContent = titulo;

    const imagen = ventana.document.createElement("img");
    imagen.src = url;
    imagen.alt = titulo;
    imagen.addEventListener("load", () => {
        ventana.focus();
        ventana.print();
    });

    ventana.document.head.append(estilos);
    ventana.document.body.append(encabezado, imagen);
}

async function cargarAprobacionesOficial() {
    const contenedor = document.getElementById("contenidoPrincipal");
    if (!contenedor) return;

    contenedor.innerHTML = `
        <section class="card panel-aprobaciones">
            <h2>Aprobación de cotizaciones</h2>
            <p>Revise las cotizaciones pendientes y apruebe las que correspondan.</p>
            <div id="listaAprobaciones" class="lista-aprobaciones">Cargando cotizaciones...</div>
        </section>
    `;

    const lista = document.getElementById("listaAprobaciones");
    const [{ data: cotizaciones, error: errorCotizaciones }, { data: proyectos, error: errorProyectos }] = await Promise.all([
        supabaseClient
            .from("CotizacionesProveedores")
            .select("id, proyecto_id, proveedor, servicio, comentario, ruta_archivo, created_at, estado")
            .order("created_at", { ascending: false }),
        supabaseClient.from("Proyectos").select("id, nombre")
    ]);

    if (errorCotizaciones || errorProyectos) {
        const error = errorCotizaciones || errorProyectos;
        lista.innerHTML = `<p class="estado-cotizaciones">No se pudieron cargar las cotizaciones: ${textoSeguroCotizacion(error.message)}</p>`;
        return;
    }

    const nombresProyecto = new Map(proyectos.map((proyecto) => [proyecto.id, proyecto.nombre]));
    const pendientes = cotizaciones.filter((cotizacion) => cotizacion.estado === "Pendiente");

    if (!pendientes.length) {
        lista.innerHTML = '<p class="estado-cotizaciones">No hay cotizaciones pendientes de aprobación.</p>';
        return;
    }

    lista.innerHTML = pendientes.map((cotizacion) => {
        const archivoUrl = cotizacion.ruta_archivo
            ? supabaseClient.storage.from("cotizaciones-proveedores").getPublicUrl(cotizacion.ruta_archivo).data.publicUrl
            : null;
        const enlaceArchivo = archivoUrl
            ? `<a href="${archivoUrl}" target="_blank" rel="noopener noreferrer">Ver o descargar archivo</a>`
            : "";

        return `
            <article class="aprobacion-item">
                <h3>${textoSeguroCotizacion(nombresProyecto.get(cotizacion.proyecto_id) || "Proyecto")}</h3>
                <p><strong>Proveedor:</strong> ${textoSeguroCotizacion(cotizacion.proveedor)}</p>
                <p><strong>Especialidad:</strong> ${textoSeguroCotizacion(TIPOS_COTIZACION[cotizacion.servicio] || cotizacion.servicio)}</p>
                <p>${textoSeguroCotizacion(cotizacion.comentario || "Sin comentario adicional.")}</p>
                ${enlaceArchivo}
                <div class="acciones-resolucion">
                    <button type="button" data-aprobacion-id="${cotizacion.id}">Aprobar</button>
                    <button type="button" class="btn-declinar-cotizacion" data-declinar-aprobacion-id="${cotizacion.id}">Declinar</button>
                </div>
            </article>
        `;
    }).join("");

    lista.querySelectorAll("[data-aprobacion-id]").forEach((boton) => {
        boton.addEventListener("click", async () => {
            await aprobarCotizacion(boton.dataset.aprobacionId, cargarAprobacionesOficial);
        });
    });
    lista.querySelectorAll("[data-declinar-aprobacion-id]").forEach((boton) => {
        boton.addEventListener("click", async () => {
            const motivo = prompt("Motivo para declinar (opcional):");
            if (motivo !== null) {
                await resolverCotizacion(boton.dataset.declinarAprobacionId, "Declinada", motivo, cargarAprobacionesOficial);
            }
        });
    });
}

window.cargarModuloCotizaciones = cargarModuloCotizaciones;
window.cargarAprobacionesOficial = cargarAprobacionesOficial;
