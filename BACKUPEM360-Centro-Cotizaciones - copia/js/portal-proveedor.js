const TIPOS_PORTAL_PROVEEDOR = new Set([
    "ebanisteria", "marmoleros", "sheetrockeros", "plomeros",
    "electricistas", "piseros", "pintores"
]);

let usuarioPortalProveedor = null;
let especialidadPortalProveedor = null;
const hojasProveedorRecibidas = new Map();

function escaparTextoPortal(valor) {
    const elemento = document.createElement("div");
    elemento.textContent = valor || "";
    return elemento.innerHTML;
}

function fechaPortalProveedor(fecha) {
    return new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(fecha));
}

function nombreVisibleProveedor(nombre, correo) {
    const nombrePerfil = (nombre || "").trim();
    const parteCorreo = (correo || "").split("@")[0];
    if (!nombrePerfil) return "Proveedor";
    if (nombrePerfil.toLowerCase() === parteCorreo.toLowerCase()) {
        const primerNombre = nombrePerfil.split(/[._\d]+/)[0];
        return primerNombre ? `${primerNombre.charAt(0).toUpperCase()}${primerNombre.slice(1)}` : "Proveedor";
    }
    return nombrePerfil;
}

function mostrarMensajeProveedor(elemento, mensaje, esError = false) {
    elemento.textContent = mensaje;
    elemento.classList.toggle("es-error", esError);
}

async function cargarProyectosPortalProveedor() {
    const selector = document.getElementById("proyectoProveedor");
    const { data, error } = await supabaseClient
        .from("Proyectos")
        .select("id, nombre, cliente, estado")
        .order("id", { ascending: false });

    if (error) {
        selector.innerHTML = '<option value="">No se pudieron cargar los proyectos</option>';
        throw error;
    }

    selector.innerHTML = [
        '<option value="">Seleccione el proyecto</option>',
        ...data.map((proyecto) => `<option value="${proyecto.id}">${proyecto.nombre} — ${proyecto.cliente} (${proyecto.estado})</option>`)
    ].join("");
}

async function mostrarPortalProveedor() {
    const acceso = document.getElementById("accesoProveedor");
    const panel = document.getElementById("panelProveedor");
    const mensajeAcceso = document.getElementById("mensajeProveedorAcceso");
    const { data: sesionData } = await supabaseClient.auth.getSession();
    const usuario = sesionData.session?.user;

    if (!usuario) {
        usuarioPortalProveedor = null;
        especialidadPortalProveedor = null;
        acceso.hidden = false;
        panel.hidden = true;
        return;
    }

    const { data: perfil, error } = await supabaseClient
        .from("Perfiles")
        .select("nombre, rol, es_proveedor_portal, especialidad_proveedor")
        .eq("id", usuario.id)
        .single();

    if (error || (!perfil.es_proveedor_portal && perfil.rol !== "Administrador")) {
        acceso.hidden = false;
        panel.hidden = true;
        mostrarMensajeProveedor(
            mensajeAcceso,
            "Esta cuenta no tiene acceso al portal de proveedores. Solicítelo al administrador.",
            true
        );
        return;
    }

    usuarioPortalProveedor = usuario;
    especialidadPortalProveedor = perfil.especialidad_proveedor;
    acceso.hidden = true;
    panel.hidden = false;
    document.getElementById("nombreProveedorSesion").textContent = `¡Hola, ${nombreVisibleProveedor(perfil.nombre, usuario.email)}!`;

    try {
        await Promise.all([cargarProyectosPortalProveedor(), cargarSeguimientoProveedor(), cargarDocumentosProveedor(), cargarHojasProveedor()]);
    } catch (errorProyectos) {
        mostrarMensajeProveedor(document.getElementById("mensajeEnvioProveedor"), errorProyectos.message, true);
    }
}

document.getElementById("formAccesoProveedor").addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const mensaje = document.getElementById("mensajeProveedorAcceso");
    mostrarMensajeProveedor(mensaje, "Ingresando...");

    const { error } = await supabaseClient.auth.signInWithPassword({
        email: document.getElementById("correoProveedorAcceso").value.trim(),
        password: document.getElementById("claveProveedorAcceso").value
    });

    if (error) {
        mostrarMensajeProveedor(mensaje, error.message, true);
        return;
    }

    await mostrarPortalProveedor();
});

document.getElementById("formNuevaCotizacionProveedor").addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const mensaje = document.getElementById("mensajeEnvioProveedor");
    const boton = document.getElementById("btnEnviarCotizacionProveedor");
    const archivo = document.getElementById("archivoCotizacionProveedor").files[0];
    const servicio = document.getElementById("clasificacionProveedor").value;
    const proyectoId = Number(document.getElementById("proyectoProveedor").value);
    const proveedor = document.getElementById("empresaProveedor").value.trim();

    if (!usuarioPortalProveedor || !archivo || !proyectoId || !proveedor || !TIPOS_PORTAL_PROVEEDOR.has(servicio)) {
        mostrarMensajeProveedor(mensaje, "Complete todos los campos obligatorios.", true);
        return;
    }

    if (archivo.size > 15 * 1024 * 1024) {
        mostrarMensajeProveedor(mensaje, "El archivo no puede superar 15 MB.", true);
        return;
    }

    boton.disabled = true;
    mostrarMensajeProveedor(mensaje, "Enviando cotización...");

    const nombreSeguro = archivo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const rutaArchivo = `portal/${usuarioPortalProveedor.id}/${proyectoId}/${Date.now()}_${nombreSeguro}`;

    try {
        const { error: errorArchivo } = await supabaseClient.storage
            .from("cotizaciones-proveedores")
            .upload(rutaArchivo, archivo, { contentType: archivo.type || "application/octet-stream", upsert: false });

        if (errorArchivo) throw errorArchivo;

        const { error: errorRegistro } = await supabaseClient
            .from("CotizacionesProveedores")
            .insert([{
                proyecto_id: proyectoId,
                proveedor,
                servicio,
                comentario: document.getElementById("comentarioProveedor").value.trim() || null,
                ruta_archivo: rutaArchivo,
                proveedor_usuario_id: usuarioPortalProveedor.id
            }]);

        if (errorRegistro) {
            await supabaseClient.storage.from("cotizaciones-proveedores").remove([rutaArchivo]);
            throw errorRegistro;
        }

        evento.target.reset();
        await cargarSeguimientoProveedor();
        mostrarMensajeProveedor(mensaje, "Cotización creada correctamente. Gracias.");
    } catch (error) {
        console.error("No se pudo enviar la cotización:", error);
        mostrarMensajeProveedor(mensaje, `No se pudo enviar: ${error.message}`, true);
    } finally {
        boton.disabled = false;
    }
});

async function cargarSeguimientoProveedor() {
    const lista = document.getElementById("listaSeguimientoProveedor");
    if (!lista || !usuarioPortalProveedor) return;

    lista.textContent = "Cargando cotizaciones...";
    const [{ data: cotizaciones, error: errorCotizaciones }, { data: proyectos, error: errorProyectos }] = await Promise.all([
        supabaseClient
            .from("CotizacionesProveedores")
            .select("id, proyecto_id, servicio, estado, respuesta_administrador, aprobado_por, aprobado_en, created_at")
            .eq("proveedor_usuario_id", usuarioPortalProveedor.id)
            .order("created_at", { ascending: false }),
        supabaseClient.from("Proyectos").select("id, nombre")
    ]);

    if (errorCotizaciones || errorProyectos) {
        lista.textContent = `No se pudieron cargar sus cotizaciones: ${(errorCotizaciones || errorProyectos).message}`;
        return;
    }

    if (!cotizaciones.length) {
        lista.textContent = "Aún no ha enviado cotizaciones desde este portal.";
        return;
    }

    const nombresProyecto = new Map(proyectos.map((proyecto) => [proyecto.id, proyecto.nombre]));
    const especialidades = {
        ebanisteria: "Ebanista", marmoleros: "Marmolero", sheetrockeros: "Sheetrockero",
        plomeros: "Plomero", electricistas: "Electricista", piseros: "Pisero", pintores: "Pintor"
    };

    lista.innerHTML = cotizaciones.map((cotizacion) => {
        const estado = cotizacion.estado || "Pendiente";
        const respuesta = cotizacion.respuesta_administrador
            ? `<p><strong>Respuesta:</strong> ${escaparTextoPortal(cotizacion.respuesta_administrador)}</p>`
            : "";
        const resueltoPor = cotizacion.aprobado_por
            ? `<p class="detalle-seguimiento">Actualizado por ${escaparTextoPortal(cotizacion.aprobado_por)} · ${fechaPortalProveedor(cotizacion.aprobado_en)}</p>`
            : "";
        return `
            <article class="item-seguimiento-proveedor">
                <div>
                    <h3>${escaparTextoPortal(nombresProyecto.get(cotizacion.proyecto_id) || "Proyecto")}</h3>
                    <p>${escaparTextoPortal(especialidades[cotizacion.servicio] || cotizacion.servicio)}</p>
                </div>
                <span class="estado-cotizacion ${estado.toLowerCase()}">${escaparTextoPortal(estado)}</span>
                <p class="detalle-seguimiento">Enviada ${fechaPortalProveedor(cotizacion.created_at)}</p>
                ${respuesta}
                ${resueltoPor}
            </article>
        `;
    }).join("");
}

async function cargarDocumentosProveedor() {
    const lista = document.getElementById("listaDocumentosProveedor");
    if (!lista || !usuarioPortalProveedor) return;

    lista.textContent = "Cargando documentos...";
    const [{ data: documentos, error: errorDocumentos }, { data: proyectos, error: errorProyectos }] = await Promise.all([
        supabaseClient.from("DocumentosProveedores").select("id, proyecto_id, titulo, servicio, comentario, ruta_archivo, created_at").order("created_at", { ascending: false }),
        supabaseClient.from("Proyectos").select("id, nombre")
    ]);
    if (errorDocumentos || errorProyectos) {
        lista.textContent = `No se pudieron cargar los documentos: ${(errorDocumentos || errorProyectos).message}`;
        return;
    }
    if (!documentos.length) {
        lista.textContent = "No hay documentos publicados todavía.";
        return;
    }
    const nombresProyecto = new Map(proyectos.map((proyecto) => [proyecto.id, proyecto.nombre]));
    lista.innerHTML = documentos.map((documento) => {
        const url = supabaseClient.storage.from("documentos-proveedores").getPublicUrl(documento.ruta_archivo).data.publicUrl;
        const categoria = documento.servicio ? ` · ${escaparTextoPortal(documento.servicio)}` : "";
        const comentario = documento.comentario ? `<p>${escaparTextoPortal(documento.comentario)}</p>` : "";
        return `<article class="documento-proveedor-item"><div><strong>${escaparTextoPortal(documento.titulo)}</strong><span>${escaparTextoPortal(nombresProyecto.get(documento.proyecto_id) || "Proyecto")}${categoria} · ${fechaPortalProveedor(documento.created_at)}</span>${comentario}</div><a href="${url}" target="_blank" rel="noopener noreferrer">Ver o descargar</a></article>`;
    }).join("");
}

document.getElementById("btnActualizarSeguimiento").addEventListener("click", cargarSeguimientoProveedor);
document.getElementById("btnActualizarDocumentosProveedor").addEventListener("click", cargarDocumentosProveedor);

async function cargarHojasProveedor() {
    const lista = document.getElementById("listaHojasProveedor");
    if (!lista || !usuarioPortalProveedor) return;
    if (!especialidadPortalProveedor) {
        lista.textContent = "El administrador debe asignar su especialidad para recibir hojas de levantamiento.";
        return;
    }
    lista.textContent = "Cargando hojas...";
    const [{ data: hojas, error: errorHojas }, { data: proyectos, error: errorProyectos }] = await Promise.all([
        supabaseClient.from("HojasLevantamiento").select("id, proyecto_id, contenido, creado_por, created_at").contains("servicios_destino", [especialidadPortalProveedor]).order("created_at", { ascending: false }),
        supabaseClient.from("Proyectos").select("id, nombre")
    ]);
    if (errorHojas || errorProyectos) {
        lista.textContent = `No se pudieron cargar las hojas: ${(errorHojas || errorProyectos).message}`;
        return;
    }
    if (!hojas.length) {
        lista.textContent = "No hay hojas de levantamiento enviadas para su especialidad.";
        return;
    }
    const nombresProyecto = new Map(proyectos.map((proyecto) => [proyecto.id, proyecto.nombre]));
    hojasProveedorRecibidas.clear();
    lista.innerHTML = hojas.map((hoja) => {
        hojasProveedorRecibidas.set(String(hoja.id), hoja);
        return `<article class="documento-proveedor-item"><div><strong>Hoja de levantamiento</strong><span>${escaparTextoPortal(nombresProyecto.get(hoja.proyecto_id) || "Proyecto")} · ${fechaPortalProveedor(hoja.created_at)}</span></div><button type="button" class="boton-secundario" data-hoja-recibida="${hoja.id}">Ver hoja</button></article>`;
    }).join("");
}

function abrirHojaProveedor(id) {
    const hoja = hojasProveedorRecibidas.get(String(id));
    if (!hoja) return;
    const contenido = hoja.contenido || {};
    const filas = (contenido.medidas || []).map((medida) => `<tr><td>${escaparTextoPortal(medida.elemento)}</td><td>${escaparTextoPortal(medida.estandar)}</td><td>${escaparTextoPortal(medida.real || "-")}</td><td>${escaparTextoPortal(medida.observacion || "-")}</td></tr>`).join("");
    const visor = document.createElement("div");
    visor.className = "visor-hoja-proveedor";
    visor.innerHTML = `<section class="panel-hoja-proveedor"><div class="cabecera-seguimiento-proveedor"><div><h2>Hoja de levantamiento de medidas</h2><p>${escaparTextoPortal(contenido.proyecto || "Proyecto")} · ${escaparTextoPortal(contenido.fecha || "")}</p></div><button type="button" class="boton-secundario" data-cerrar-hoja>Cerrar</button></div><p><strong>Cliente:</strong> ${escaparTextoPortal(contenido.cliente || "-")} · <strong>Ubicación:</strong> ${escaparTextoPortal(contenido.ubicacion || "-")}</p><table class="tabla-hoja-proveedor"><thead><tr><th>Elemento</th><th>Estándar</th><th>Medida real</th><th>Observaciones</th></tr></thead><tbody>${filas}</tbody></table><h3>Notas generales</h3><p>${escaparTextoPortal(contenido.notas || "Sin notas.")}</p></section>`;
    visor.addEventListener("click", (evento) => { if (evento.target === visor || evento.target.closest("[data-cerrar-hoja]")) visor.remove(); });
    document.body.append(visor);
}

document.getElementById("btnActualizarHojasProveedor").addEventListener("click", cargarHojasProveedor);
document.getElementById("listaHojasProveedor").addEventListener("click", (evento) => {
    const boton = evento.target.closest("[data-hoja-recibida]");
    if (boton) abrirHojaProveedor(boton.dataset.hojaRecibida);
});

document.getElementById("btnCerrarSesionProveedor").addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    await mostrarPortalProveedor();
});

supabaseClient.auth.onAuthStateChange(() => mostrarPortalProveedor());
mostrarPortalProveedor();
