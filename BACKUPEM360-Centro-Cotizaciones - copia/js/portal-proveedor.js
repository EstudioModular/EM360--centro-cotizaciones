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

function actualizarNotificacionVerde(id, cantidad) {
    const burbuja = document.getElementById(id);
    if (!burbuja) return;
    burbuja.hidden = !cantidad;
    burbuja.textContent = cantidad > 99 ? "99+" : String(cantidad || "");
}

async function cargarProyectosPortalProveedor() {
    const selector = document.getElementById("proyectoProveedor");
    const { data, error } = await supabaseClient.rpc("proyectos_para_proveedor");

    if (error) {
        selector.innerHTML = '<option value="">No se pudieron cargar los proyectos</option>';
        throw error;
    }

    selector.innerHTML = [
        '<option value="">Seleccione el proyecto</option>',
        ...data.map((proyecto) => `<option value="${proyecto.id}">${proyecto.nombre} — ${proyecto.cliente} (${proyecto.estado})</option>`)
    ].join("");
    // El portal externo recibe solo el nombre y estado del proyecto asignado.
    selector.innerHTML = [
        '<option value="">Seleccione el proyecto</option>',
        ...data.map((proyecto) => `<option value="${proyecto.id}">${proyecto.nombre} (${proyecto.estado})</option>`)
    ].join("");
}

function mostrarRegistroProveedor() {
    document.getElementById("accesoProveedor").hidden = true;
    document.getElementById("establecerClaveProveedor").hidden = true;
    document.getElementById("panelProveedor").hidden = true;
    document.getElementById("registroProveedor").hidden = false;
}

function mostrarAccesoProveedor() {
    document.getElementById("registroProveedor").hidden = true;
    document.getElementById("establecerClaveProveedor").hidden = true;
    document.getElementById("panelProveedor").hidden = true;
    document.getElementById("accesoProveedor").hidden = false;
}

function urlPortalProveedor() {
    return `${window.location.origin}/proveedor.html`;
}

async function mostrarFormularioClaveProveedor() {
    const acceso = document.getElementById("accesoProveedor");
    const registro = document.getElementById("registroProveedor");
    const formularioClave = document.getElementById("establecerClaveProveedor");
    const panel = document.getElementById("panelProveedor");
    const mensaje = document.getElementById("mensajeEstablecerClaveProveedor");
    const { data: sesionData } = await supabaseClient.auth.getSession();

    acceso.hidden = true;
    registro.hidden = true;
    panel.hidden = true;

    if (!sesionData.session?.user) {
        formularioClave.hidden = false;
        mostrarMensajeProveedor(mensaje, "El enlace no es válido o ya venció. Solicite uno nuevo al administrador.", true);
        return;
    }

    formularioClave.hidden = false;
    mostrarMensajeProveedor(mensaje, "Cree una contraseña de al menos 6 caracteres.");
}

async function mostrarPortalProveedor() {
    if (window.em360EnlaceDeClave) {
        await mostrarFormularioClaveProveedor();
        return;
    }

    const acceso = document.getElementById("accesoProveedor");
    const registro = document.getElementById("registroProveedor");
    const formularioClave = document.getElementById("establecerClaveProveedor");
    const panel = document.getElementById("panelProveedor");
    const mensajeAcceso = document.getElementById("mensajeProveedorAcceso");
    const { data: sesionData } = await supabaseClient.auth.getSession();
    const usuario = sesionData.session?.user;

    if (!usuario) {
        usuarioPortalProveedor = null;
        especialidadPortalProveedor = null;
        acceso.hidden = false;
        registro.hidden = true;
        panel.hidden = true;
        formularioClave.hidden = true;
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
    registro.hidden = true;
    formularioClave.hidden = true;
    panel.hidden = false;
    document.getElementById("nombreProveedorSesion").textContent = `¡Hola, ${nombreVisibleProveedor(perfil.nombre, usuario.email)}!`;

    const selectorClasificacion = document.getElementById("clasificacionProveedor");
    if (especialidadPortalProveedor && selectorClasificacion) {
        selectorClasificacion.value = especialidadPortalProveedor;
        selectorClasificacion.disabled = true;
    }

    try {
        await Promise.all([cargarProyectosPortalProveedor(), cargarSeguimientoProveedor(), cargarPlanosProveedor(), cargarDocumentosProveedor(), cargarHojasProveedor()]);
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

document.getElementById("btnMostrarRegistroProveedor").addEventListener("click", mostrarRegistroProveedor);
document.getElementById("btnVolverAccesoProveedor").addEventListener("click", mostrarAccesoProveedor);

document.getElementById("btnRecuperarClaveProveedor").addEventListener("click", async () => {
    const correo = document.getElementById("correoProveedorAcceso").value.trim();
    const mensaje = document.getElementById("mensajeProveedorAcceso");
    if (!correo) {
        mostrarMensajeProveedor(mensaje, "Escriba su correo primero para enviarle el enlace de contraseña.", true);
        return;
    }

    mostrarMensajeProveedor(mensaje, "Enviando enlace de contraseña...");
    const { error } = await supabaseClient.auth.resetPasswordForEmail(correo, { redirectTo: urlPortalProveedor() });
    if (error) {
        mostrarMensajeProveedor(mensaje, error.message, true);
        return;
    }
    mostrarMensajeProveedor(mensaje, "Revise su correo y abra el enlace para crear una contraseña.");
});

document.getElementById("formRegistroProveedor").addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const mensaje = document.getElementById("mensajeRegistroProveedor");
    const nombre = document.getElementById("nombreRegistroProveedor").value.trim();
    const correo = document.getElementById("correoRegistroProveedor").value.trim();
    const clave = document.getElementById("claveRegistroProveedor").value;
    const confirmacion = document.getElementById("confirmarClaveRegistroProveedor").value;

    if (clave.length < 6) {
        mostrarMensajeProveedor(mensaje, "La contraseña debe tener al menos 6 caracteres.", true);
        return;
    }
    if (clave !== confirmacion) {
        mostrarMensajeProveedor(mensaje, "Las contraseñas no coinciden.", true);
        return;
    }

    mostrarMensajeProveedor(mensaje, "Creando cuenta...");
    const { error } = await supabaseClient.auth.signUp({
        email: correo,
        password: clave,
        options: {
            data: { nombre },
            emailRedirectTo: urlPortalProveedor()
        }
    });
    if (error) {
        mostrarMensajeProveedor(mensaje, error.message, true);
        return;
    }
    mostrarMensajeProveedor(mensaje, "Revise su correo para confirmar la cuenta. Luego un administrador podrá habilitarlo para cotizar.");
});

document.getElementById("formEstablecerClaveProveedor").addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const mensaje = document.getElementById("mensajeEstablecerClaveProveedor");
    const clave = document.getElementById("nuevaClaveProveedor").value;
    const confirmacion = document.getElementById("confirmarClaveProveedor").value;

    if (clave.length < 6) {
        mostrarMensajeProveedor(mensaje, "La contraseña debe tener al menos 6 caracteres.", true);
        return;
    }
    if (clave !== confirmacion) {
        mostrarMensajeProveedor(mensaje, "Las contraseñas no coinciden.", true);
        return;
    }

    mostrarMensajeProveedor(mensaje, "Guardando contraseña...");
    const { error } = await supabaseClient.auth.updateUser({ password: clave });
    if (error) {
        mostrarMensajeProveedor(mensaje, error.message, true);
        return;
    }

    window.history.replaceState({}, document.title, window.location.pathname);
    window.em360EnlaceDeClave = false;
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

async function cargarPlanosProveedor() {
    const lista = document.getElementById("listaPlanosProveedor");
    if (!lista || !usuarioPortalProveedor) return;
    lista.textContent = "Cargando planos...";
    const { data: planos, error } = await supabaseClient.rpc("planos_para_proveedor");
    if (error) {
        lista.textContent = `No se pudieron cargar los planos: ${error.message}`;
        return;
    }
    actualizarNotificacionVerde("notificacionPlanosProveedor", planos.length);
    if (!planos.length) {
        lista.textContent = "No hay planos publicados para su especialidad.";
        return;
    }
    lista.innerHTML = planos.map((plano) => {
        const url = supabaseClient.storage.from("planos").getPublicUrl(plano.ruta_archivo).data.publicUrl;
        return `<article class="documento-proveedor-item"><div><strong>${escaparTextoPortal(plano.nombre_archivo || "Plano")}</strong><span>Publicado ${fechaPortalProveedor(plano.created_at)}</span></div><a href="${url}" target="_blank" rel="noopener noreferrer">Ver o descargar</a></article>`;
    }).join("");
}

async function cargarDocumentosProveedor() {
    const lista = document.getElementById("listaDocumentosProveedor");
    if (!lista || !usuarioPortalProveedor) return;

    lista.textContent = "Cargando documentos...";
    const { data: documentos, error: errorDocumentos } = await supabaseClient.rpc("documentos_para_proveedor");
    if (errorDocumentos) {
        lista.textContent = `No se pudieron cargar los documentos: ${errorDocumentos.message}`;
        return;
    }
    if (!documentos.length) {
        actualizarNotificacionVerde("notificacionDocumentosProveedor", 0);
        lista.textContent = "No hay documentos publicados todavía.";
        return;
    }
    actualizarNotificacionVerde("notificacionDocumentosProveedor", documentos.length);
    const nombresProyecto = new Map();
    lista.innerHTML = documentos.map((documento) => {
        const url = supabaseClient.storage.from("documentos-proveedores").getPublicUrl(documento.ruta_archivo).data.publicUrl;
        const categoria = documento.servicio ? ` · ${escaparTextoPortal(documento.servicio)}` : "";
        const comentario = documento.comentario ? `<p>${escaparTextoPortal(documento.comentario)}</p>` : "";
        return `<article class="documento-proveedor-item"><div><strong>${escaparTextoPortal(documento.titulo)}</strong><span>${escaparTextoPortal(nombresProyecto.get(documento.proyecto_id) || "Proyecto")}${categoria} · ${fechaPortalProveedor(documento.created_at)}</span>${comentario}</div><a href="${url}" target="_blank" rel="noopener noreferrer">Ver o descargar</a></article>`;
    }).join("");
}

document.getElementById("btnActualizarSeguimiento").addEventListener("click", cargarSeguimientoProveedor);
document.getElementById("btnActualizarPlanosProveedor").addEventListener("click", cargarPlanosProveedor);
document.getElementById("btnActualizarDocumentosProveedor").addEventListener("click", cargarDocumentosProveedor);

async function cargarHojasProveedor() {
    const lista = document.getElementById("listaHojasProveedor");
    if (!lista || !usuarioPortalProveedor) return;
    if (!especialidadPortalProveedor) {
        lista.textContent = "El administrador debe asignar su especialidad para recibir hojas de levantamiento.";
        return;
    }
    lista.textContent = "Cargando hojas...";
    const { data: hojas, error: errorHojas } = await supabaseClient.rpc("hojas_levantamiento_para_proveedor");
    if (errorHojas) {
        lista.textContent = `No se pudieron cargar las hojas: ${errorHojas.message}`;
        return;
    }
    if (!hojas.length) {
        actualizarNotificacionVerde("notificacionHojasProveedor", 0);
        lista.textContent = "No hay hojas de levantamiento enviadas para su especialidad.";
        return;
    }
    actualizarNotificacionVerde("notificacionHojasProveedor", hojas.length);
    const nombresProyecto = new Map();
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
    // La versión del proveedor no muestra ningún dato personal del cliente.
    const detallePrivado = visor.querySelector(".cabecera-seguimiento-proveedor + p");
    if (detallePrivado) detallePrivado.remove();
    if (contenido.croquis_imagen_ruta) {
        const imagenCroquis = supabaseClient.storage.from("hojas-levantamiento").getPublicUrl(contenido.croquis_imagen_ruta).data.publicUrl;
        const seccionCroquis = document.createElement("section");
        seccionCroquis.className = "croquis-recibido";
        seccionCroquis.innerHTML = `<h3>Plano / croquis adjunto</h3><a href="${imagenCroquis}" target="_blank" rel="noopener noreferrer"><img src="${imagenCroquis}" alt="Plano o croquis del espacio"></a><a href="${imagenCroquis}" target="_blank" rel="noopener noreferrer">Abrir imagen completa o descargar</a>`;
        visor.querySelector(".tabla-hoja-proveedor")?.before(seccionCroquis);
    }
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
