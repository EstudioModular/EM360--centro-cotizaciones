function escaparDocumentoProveedor(valor) {
    const elemento = document.createElement("div");
    elemento.textContent = valor || "";
    return elemento.innerHTML;
}

function fechaDocumentoProveedor(fecha) {
    return new Intl.DateTimeFormat("es-DO", { dateStyle: "medium" }).format(new Date(fecha));
}

async function mostrarDocumentosParaProveedores() {
    const contenedor = document.getElementById("contenidoPrincipal");
    if (!contenedor || !window.em360Permisos?.esAdministrador()) return;

    const { data: proyectos, error } = await supabaseClient
        .from("Proyectos")
        .select("id, nombre")
        .order("nombre");

    if (error) {
        contenedor.innerHTML = `<section class="card"><p>No se pudieron cargar los proyectos: ${escaparDocumentoProveedor(error.message)}</p></section>`;
        return;
    }

    contenedor.innerHTML = `
        <section class="card documentos-proveedores-admin">
            <h2>Documentos para proveedores</h2>
            <p>Suba planos, especificaciones o condiciones para que los proveedores autenticados los consulten y descarguen.</p>
            <form id="formDocumentoProveedor" class="form-panel">
                <label for="proyectoDocumentoProveedor">Proyecto</label>
                <select id="proyectoDocumentoProveedor" required>
                    <option value="">Seleccione el proyecto</option>
                    ${proyectos.map((proyecto) => `<option value="${proyecto.id}">${escaparDocumentoProveedor(proyecto.nombre)}</option>`).join("")}
                </select>
                <label for="tituloDocumentoProveedor">Título del documento</label>
                <input id="tituloDocumentoProveedor" type="text" maxlength="150" required placeholder="Ejemplo: Especificaciones de cocina">
                <label for="archivoDocumentoProveedor">Archivo</label>
                <input id="archivoDocumentoProveedor" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg,image/png,image/jpeg,image/webp" required>
                <p class="ayuda-cotizacion">PDF, Word, Excel, DWG o imagen. Máximo 25 MB.</p>
                <button type="submit" id="btnSubirDocumentoProveedor">Publicar documento</button>
                <p id="mensajeDocumentoProveedor" class="mensaje-proveedor" aria-live="polite"></p>
            </form>
            <div id="listaDocumentosAdmin" class="lista-documentos-proveedores">Cargando documentos...</div>
        </section>
    `;

    document.getElementById("formDocumentoProveedor").addEventListener("submit", subirDocumentoProveedor);
    document.getElementById("listaDocumentosAdmin").addEventListener("click", borrarDocumentoProveedor);
    await cargarDocumentosAdmin();
}

async function subirDocumentoProveedor(evento) {
    evento.preventDefault();
    const mensaje = document.getElementById("mensajeDocumentoProveedor");
    const boton = document.getElementById("btnSubirDocumentoProveedor");
    const archivo = document.getElementById("archivoDocumentoProveedor").files[0];
    const proyectoId = Number(document.getElementById("proyectoDocumentoProveedor").value);
    const titulo = document.getElementById("tituloDocumentoProveedor").value.trim();

    if (!archivo || !proyectoId || !titulo) return;
    if (archivo.size > 25 * 1024 * 1024) {
        mensaje.textContent = "El archivo no puede superar 25 MB.";
        mensaje.classList.add("es-error");
        return;
    }

    boton.disabled = true;
    mensaje.classList.remove("es-error");
    mensaje.textContent = "Publicando documento...";
    const nombreSeguro = archivo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const ruta = `${proyectoId}/${Date.now()}_${nombreSeguro}`;

    try {
        const { error: errorArchivo } = await supabaseClient.storage
            .from("documentos-proveedores")
            .upload(ruta, archivo, { contentType: archivo.type || "application/octet-stream", upsert: false });
        if (errorArchivo) throw errorArchivo;

        const { error: errorRegistro } = await supabaseClient
            .from("DocumentosProveedores")
            .insert([{ proyecto_id: proyectoId, titulo, ruta_archivo: ruta }]);
        if (errorRegistro) {
            await supabaseClient.storage.from("documentos-proveedores").remove([ruta]);
            throw errorRegistro;
        }

        evento.target.reset();
        mensaje.textContent = "Documento publicado para proveedores.";
        await cargarDocumentosAdmin();
    } catch (error) {
        mensaje.textContent = `No se pudo publicar: ${error.message}`;
        mensaje.classList.add("es-error");
    } finally {
        boton.disabled = false;
    }
}

async function cargarDocumentosAdmin() {
    const lista = document.getElementById("listaDocumentosAdmin");
    if (!lista) return;
    const [{ data: documentos, error: errorDocumentos }, { data: proyectos, error: errorProyectos }] = await Promise.all([
        supabaseClient.from("DocumentosProveedores").select("id, proyecto_id, titulo, ruta_archivo, created_at").order("created_at", { ascending: false }),
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
        return `<article class="documento-proveedor-item"><div><strong>${escaparDocumentoProveedor(documento.titulo)}</strong><span>${escaparDocumentoProveedor(nombresProyecto.get(documento.proyecto_id) || "Proyecto")} · ${fechaDocumentoProveedor(documento.created_at)}</span></div><a href="${url}" target="_blank" rel="noopener noreferrer">Descargar</a><button type="button" class="btn-eliminar-documento" data-documento-id="${documento.id}" data-ruta-documento="${documento.ruta_archivo}">Eliminar</button></article>`;
    }).join("");
}

async function borrarDocumentoProveedor(evento) {
    const boton = evento.target.closest("[data-documento-id]");
    if (!boton || !confirm("¿Eliminar este documento para proveedores?")) return;
    const { error: errorArchivo } = await supabaseClient.storage.from("documentos-proveedores").remove([boton.dataset.rutaDocumento]);
    if (errorArchivo) return alert(errorArchivo.message);
    const { error } = await supabaseClient.from("DocumentosProveedores").delete().eq("id", boton.dataset.documentoId);
    if (error) return alert(error.message);
    await cargarDocumentosAdmin();
}

window.mostrarDocumentosParaProveedores = mostrarDocumentosParaProveedores;
