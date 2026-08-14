function escaparHtml(valor) {
    const elemento = document.createElement("div");
    elemento.textContent = valor || "";
    return elemento.innerHTML;
}

function formatearFecha(fecha) {
    return new Intl.DateTimeFormat("es-DO", {
        dateStyle: "medium",
        timeStyle: "short"
    }).format(new Date(fecha));
}

async function mostrarTransferencias() {
    const contenedor = document.getElementById("contenidoExpediente");

    if (!contenedor || !window.proyectoActual) return;
    const puedeCrear = Boolean(window.em360Permisos?.esAdministrador());

    contenedor.innerHTML = `
        <section class="transferencias">
            <h3>Transferencias</h3>
            <p>Suba una foto y deje un comentario para el equipo.</p>

            ${puedeCrear ? `<form id="formTransferencia" class="form-transferencia">
                <label for="fotoTransferencia">Foto</label>
                <input id="fotoTransferencia" type="file" accept="image/png,image/jpeg,image/webp">

                <label for="comentarioTransferencia">Comentario</label>
                <textarea id="comentarioTransferencia" rows="4" maxlength="1000" placeholder="Escriba un comentario sobre la transferencia..."></textarea>

                <button type="submit" id="btnGuardarTransferencia">Guardar transferencia</button>
                <p class="ayuda-transferencia">Puede guardar una foto, un comentario o ambos.</p>
            </form>` : '<p>Solo un administrador puede crear o modificar transferencias.</p>'}

            <div class="transferencias-lista" id="listaTransferencias" aria-live="polite">
                Cargando transferencias...
            </div>
        </section>
    `;

    document.getElementById("formTransferencia")?.addEventListener("submit", guardarTransferencia);
    await cargarTransferencias();
}

async function guardarTransferencia(evento) {
    evento.preventDefault();

    const inputFoto = document.getElementById("fotoTransferencia");
    const comentario = document.getElementById("comentarioTransferencia").value.trim();
    const boton = document.getElementById("btnGuardarTransferencia");
    const foto = inputFoto.files[0];

    if (!foto && !comentario) {
        alert("Agregue una foto, un comentario o ambos.");
        return;
    }

    if (foto && !foto.type.startsWith("image/")) {
        alert("Seleccione un archivo de imagen valido.");
        return;
    }

    boton.disabled = true;
    boton.textContent = "Guardando...";
    let rutaArchivo = null;

    try {
        if (foto) {
            const nombreSeguro = foto.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            rutaArchivo = `${window.proyectoActual}/${Date.now()}_${nombreSeguro}`;

            const { error: errorSubida } = await supabaseClient
                .storage
                .from("transferencias")
                .upload(rutaArchivo, foto, { contentType: foto.type, upsert: false });

            if (errorSubida) throw errorSubida;
        }

        const { error: errorRegistro } = await supabaseClient
            .from("Transferencias")
            .insert([{
                proyecto_id: window.proyectoActual,
                comentario: comentario || null,
                ruta_archivo: rutaArchivo
            }]);

        if (errorRegistro) {
            if (rutaArchivo) {
                await supabaseClient.storage.from("transferencias").remove([rutaArchivo]);
            }
            throw errorRegistro;
        }

        document.getElementById("formTransferencia").reset();
        await cargarTransferencias();
    } catch (error) {
        console.error("No se pudo guardar la transferencia:", error);
        alert(`No se pudo guardar la transferencia: ${error.message}`);
    } finally {
        boton.disabled = false;
        boton.textContent = "Guardar transferencia";
    }
}

async function cargarTransferencias() {
    const lista = document.getElementById("listaTransferencias");
    if (!lista) return;

    const { data, error } = await supabaseClient
        .from("Transferencias")
        .select("id, comentario, ruta_archivo, created_at")
        .eq("proyecto_id", window.proyectoActual)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("No se pudieron cargar las transferencias:", error);
        lista.innerHTML = `<p class="estado-transferencias">No se pudieron cargar las transferencias: ${escaparHtml(error.message)}</p>`;
        return;
    }

    if (!data.length) {
        lista.innerHTML = '<p class="estado-transferencias">Aun no hay transferencias registradas.</p>';
        return;
    }

    lista.innerHTML = data.map((transferencia) => {
        const imagen = transferencia.ruta_archivo
            ? supabaseClient.storage.from("transferencias").getPublicUrl(transferencia.ruta_archivo).data.publicUrl
            : null;
        const comentario = transferencia.comentario
            ? `<p>${escaparHtml(transferencia.comentario)}</p>`
            : "";
        const foto = imagen
            ? `<img src="${imagen}" alt="Foto de transferencia" class="foto-transferencia">`
            : "";

        return `
            <article class="transferencia-item">
                <div class="transferencia-meta">${formatearFecha(transferencia.created_at)}</div>
                ${foto}
                ${comentario}
            </article>
        `;
    }).join("");
}

window.mostrarTransferencias = mostrarTransferencias;
