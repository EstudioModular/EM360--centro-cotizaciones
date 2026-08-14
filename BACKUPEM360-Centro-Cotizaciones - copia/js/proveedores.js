const SERVICIOS_PROVEEDOR = {
    ebanisteria: "Ebanistas",
    marmoleros: "Marmoleros",
    sheetrockeros: "Sheetrockeros",
    plomeros: "Plomeros",
    electricistas: "Electricistas",
    piseros: "Piseros",
    pintores: "Pintores"
};

let documentoProveedorEditando = null;

function escaparTextoProveedor(valor) {
    const elemento = document.createElement("div");
    elemento.textContent = valor || "";
    return elemento.innerHTML;
}

function fechaDocumentoProveedor(fecha) {
    return new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(fecha));
}

async function cargarModuloProveedores(servicioPreseleccionado = "") {
    const contenedor = document.getElementById("contenidoExpediente");
    if (!contenedor || !window.proyectoActual) return;

    if (!window.em360Permisos?.esAdministrador()) {
        contenedor.innerHTML = `
            <section class="cotizaciones-proveedor">
                <h3>Documentos para proveedores</h3>
                <p>Solo el Administrador puede publicar documentos. Los proveedores los consultan desde su portal.</p>
                <div id="listaDocumentosPorProyecto" class="lista-documentos-proveedores">Cargando documentos...</div>
                ${window.em360Permisos?.puedeAprobarCotizaciones()
                    ? '<button type="button" id="btnHojaLevantamiento">Llenar hoja de levantamiento</button><button type="button" id="btnAdministrarHojas" class="boton-secundario">Modificar o borrar hojas</button>'
                    : ""}
            </section>
        `;
        document.getElementById("btnHojaLevantamiento")?.addEventListener("click", () => {
            window.cargarModuloLevantamiento?.(servicioPreseleccionado);
        });
        document.getElementById("btnAdministrarHojas")?.addEventListener("click", () => {
            window.mostrarHojasLevantamientoEnviadas?.(servicioPreseleccionado);
        });
        await cargarDocumentosPorProyecto();
        return;
    }

    const servicioSeleccionado = SERVICIOS_PROVEEDOR[servicioPreseleccionado]
        ? servicioPreseleccionado
        : "ebanisteria";
    const opcionesServicio = Object.entries(SERVICIOS_PROVEEDOR).map(([codigo, nombre]) => `
        <option value="${codigo}" ${codigo === servicioSeleccionado ? "selected" : ""}>${nombre}</option>
    `).join("");

    contenedor.innerHTML = `
        <section class="cotizaciones-proveedor">
            <h3>Documentos para proveedores</h3>
            <p>Publique planos, especificaciones o condiciones para los proveedores de este proyecto.</p>

            <form id="formDocumentoPorProveedor" class="form-cotizacion-proveedor">
                <label for="servicioDocumentoProveedor">Dirigido a proveedores de</label>
                <select id="servicioDocumentoProveedor" required>${opcionesServicio}</select>

                <label for="tituloDocumentoPorProveedor">Título del documento</label>
                <input id="tituloDocumentoPorProveedor" type="text" maxlength="150" required placeholder="Ejemplo: Plano de cocina y especificaciones">

                <label for="archivoDocumentoPorProveedor">Documento para compartir</label>
                <input id="archivoDocumentoPorProveedor" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg,image/png,image/jpeg,image/webp">
                <p class="ayuda-cotizacion">PDF, Word, Excel, DWG o imagen. Máximo 25 MB. Al editar, déjelo vacío para conservar el archivo actual.</p>

                <label for="notaDocumentoPorProveedor">Comentario</label>
                <textarea id="notaDocumentoPorProveedor" rows="4" maxlength="1500" placeholder="Escriba instrucciones o detalles importantes para el proveedor."></textarea>

                <button type="submit" id="btnPublicarDocumentoPorProveedor">Publicar documento</button>
                <button type="button" id="btnCancelarDocumentoPorProveedor" class="boton-secundario" hidden>Cancelar edición</button>
                <p id="mensajeDocumentoPorProveedor" class="mensaje-proveedor" aria-live="polite"></p>
            </form>

            <div id="listaDocumentosPorProyecto" class="lista-documentos-proveedores" aria-live="polite">Cargando documentos...</div>
            <button type="button" id="btnHojaLevantamiento">Llenar hoja de levantamiento de medidas</button>
            <button type="button" id="btnAdministrarHojas" class="boton-secundario">Modificar o borrar hojas</button>
        </section>
    `;

    document.getElementById("formDocumentoPorProveedor").addEventListener("submit", publicarDocumentoPorProveedor);
    document.getElementById("btnCancelarDocumentoPorProveedor").addEventListener("click", () => cargarModuloProveedores(servicioSeleccionado));
    document.getElementById("listaDocumentosPorProyecto").addEventListener("click", administrarDocumentoPorProveedor);
    document.getElementById("btnHojaLevantamiento").addEventListener("click", () => {
        window.cargarModuloLevantamiento?.(servicioSeleccionado);
    });
    document.getElementById("btnAdministrarHojas").addEventListener("click", () => {
        window.mostrarHojasLevantamientoEnviadas?.(servicioSeleccionado);
    });
    await cargarDocumentosPorProyecto();
}

async function publicarDocumentoPorProveedor(evento) {
    evento.preventDefault();
    const mensaje = document.getElementById("mensajeDocumentoPorProveedor");
    const boton = document.getElementById("btnPublicarDocumentoPorProveedor");
    const archivo = document.getElementById("archivoDocumentoPorProveedor").files[0];
    const titulo = document.getElementById("tituloDocumentoPorProveedor").value.trim();
    const servicio = document.getElementById("servicioDocumentoProveedor").value;
    const comentario = document.getElementById("notaDocumentoPorProveedor").value.trim();

    if ((!archivo && !documentoProveedorEditando) || !titulo || !SERVICIOS_PROVEEDOR[servicio]) return;
    if (archivo.size > 25 * 1024 * 1024) {
        mensaje.textContent = "El archivo no puede superar 25 MB.";
        mensaje.classList.add("es-error");
        return;
    }

    boton.disabled = true;
    mensaje.classList.remove("es-error");
    mensaje.textContent = "Publicando documento...";
    const nombreSeguro = archivo?.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    let rutaArchivo = documentoProveedorEditando?.ruta_archivo || null;
    let archivoNuevoSubido = false;

    try {
        if (archivo) {
            rutaArchivo = `${window.proyectoActual}/${servicio}/${Date.now()}_${nombreSeguro}`;
            const { error: errorArchivo } = await supabaseClient.storage
                .from("documentos-proveedores")
                .upload(rutaArchivo, archivo, { contentType: archivo.type || "application/octet-stream", upsert: false });
            if (errorArchivo) throw errorArchivo;
            archivoNuevoSubido = true;
        }

        const datosDocumento = { servicio, titulo, ruta_archivo: rutaArchivo, comentario: comentario || null };
        const { error: errorRegistro } = documentoProveedorEditando
            ? await supabaseClient.from("DocumentosProveedores").update(datosDocumento).eq("id", documentoProveedorEditando.id)
            : await supabaseClient.from("DocumentosProveedores").insert([{ proyecto_id: window.proyectoActual, ...datosDocumento }]);
        if (errorRegistro) {
            if (archivoNuevoSubido) await supabaseClient.storage.from("documentos-proveedores").remove([rutaArchivo]);
            throw errorRegistro;
        }

        if (archivoNuevoSubido && documentoProveedorEditando?.ruta_archivo) {
            await supabaseClient.storage.from("documentos-proveedores").remove([documentoProveedorEditando.ruta_archivo]);
        }

        evento.target.reset();
        mensaje.textContent = documentoProveedorEditando ? "Documento modificado correctamente." : "Documento publicado. Los proveedores ya pueden descargarlo desde su portal.";
        documentoProveedorEditando = null;
        document.getElementById("btnPublicarDocumentoPorProveedor").textContent = "Publicar documento";
        document.getElementById("btnCancelarDocumentoPorProveedor").hidden = true;
        await cargarDocumentosPorProyecto();
    } catch (error) {
        console.error("No se pudo publicar el documento:", error);
        mensaje.textContent = `No se pudo guardar: ${error.message}`;
        mensaje.classList.add("es-error");
    } finally {
        boton.disabled = false;
    }
}

async function cargarDocumentosPorProyecto() {
    const lista = document.getElementById("listaDocumentosPorProyecto");
    if (!lista || !window.proyectoActual) return;

    const { data, error } = await supabaseClient
        .from("DocumentosProveedores")
        .select("id, titulo, servicio, comentario, ruta_archivo, created_at")
        .eq("proyecto_id", window.proyectoActual)
        .order("created_at", { ascending: false });

    if (error) {
        lista.textContent = `No se pudieron cargar los documentos: ${error.message}`;
        return;
    }
    if (!data.length) {
        lista.textContent = "Aún no hay documentos publicados para este proyecto.";
        return;
    }

    lista.innerHTML = data.map((documento) => {
        const url = supabaseClient.storage.from("documentos-proveedores").getPublicUrl(documento.ruta_archivo).data.publicUrl;
        return `
            <article class="documento-proveedor-item">
                <div>
                    <strong>${escaparTextoProveedor(documento.titulo)}</strong>
                    <span>${escaparTextoProveedor(SERVICIOS_PROVEEDOR[documento.servicio] || "Todos los proveedores")} · ${fechaDocumentoProveedor(documento.created_at)}</span>
                    ${documento.comentario ? `<p>${escaparTextoProveedor(documento.comentario)}</p>` : ""}
                </div>
                <a href="${url}" target="_blank" rel="noopener noreferrer">Ver o descargar</a>
                ${window.em360Permisos?.esAdministrador() ? `<div class="acciones-resolucion"><button type="button" data-editar-documento="${documento.id}">Editar</button><button type="button" class="btn-declinar-cotizacion" data-eliminar-documento="${documento.id}">Eliminar</button></div>` : ""}
            </article>
        `;
    }).join("");
}

async function administrarDocumentoPorProveedor(evento) {
    const editar = evento.target.closest("[data-editar-documento]");
    const eliminar = evento.target.closest("[data-eliminar-documento]");
    const { data, error } = await supabaseClient.from("DocumentosProveedores")
        .select("id, titulo, servicio, comentario, ruta_archivo")
        .eq("proyecto_id", window.proyectoActual);
    if (error) return alert(error.message);

    if (editar) {
        documentoProveedorEditando = data.find((documento) => String(documento.id) === editar.dataset.editarDocumento);
        if (!documentoProveedorEditando) return;
        document.getElementById("servicioDocumentoProveedor").value = documentoProveedorEditando.servicio || "ebanisteria";
        document.getElementById("tituloDocumentoPorProveedor").value = documentoProveedorEditando.titulo;
        document.getElementById("notaDocumentoPorProveedor").value = documentoProveedorEditando.comentario || "";
        document.getElementById("btnPublicarDocumentoPorProveedor").textContent = "Guardar cambios";
        document.getElementById("btnCancelarDocumentoPorProveedor").hidden = false;
        document.getElementById("formDocumentoPorProveedor").scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (eliminar) {
        const documento = data.find((item) => String(item.id) === eliminar.dataset.eliminarDocumento);
        if (!documento || !confirm("¿Eliminar este documento para proveedores?")) return;
        const { error: errorRegistro } = await supabaseClient.from("DocumentosProveedores").delete().eq("id", documento.id);
        if (errorRegistro) return alert(errorRegistro.message);
        const { error: errorArchivo } = await supabaseClient.storage.from("documentos-proveedores").remove([documento.ruta_archivo]);
        if (errorArchivo) console.error("No se pudo borrar el archivo:", errorArchivo);
        await cargarDocumentosPorProyecto();
    }
}

window.cargarModuloProveedores = cargarModuloProveedores;
