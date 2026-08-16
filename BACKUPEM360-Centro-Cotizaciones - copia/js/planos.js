/* ==========================================
   EM360™
   MÓDULO DE PLANOS
========================================== */

const SERVICIOS_PLANO = {
    ebanisteria: "Ebanistas", marmoleros: "Marmoleros", sheetrockeros: "Sheetrockeros",
    plomeros: "Plomeros", electricistas: "Electricistas", piseros: "Piseros", pintores: "Pintores"
};
const metadatosPlanos = new Map();

async function cargarModuloPlanos() {

    const contenedor = document.getElementById("contenidoExpediente");
    const puedeSubir = Boolean(window.em360Permisos?.esAdministrador());

    contenedor.innerHTML = `
        <div class="card">

            <h2>📐 Gestión de Planos</h2>

            <p><strong>Proyecto ID:</strong> ${window.proyectoActual}</p>

            ${puedeSubir ? `<br>

            <input
                type="file"
                id="archivoPlano"
                accept=".pdf,.dwg,.jpg,.jpeg,.png"
            >

            <fieldset class="destinos-plano">
                <legend>Compartir este plano con</legend>
                <label><input type="checkbox" name="destinoPlano" value="ebanisteria"> Ebanistas</label>
                <label><input type="checkbox" name="destinoPlano" value="marmoleros"> Marmoleros</label>
                <label><input type="checkbox" name="destinoPlano" value="sheetrockeros"> Sheetrockeros</label>
                <label><input type="checkbox" name="destinoPlano" value="plomeros"> Plomeros</label>
                <label><input type="checkbox" name="destinoPlano" value="electricistas"> Electricistas</label>
                <label><input type="checkbox" name="destinoPlano" value="piseros"> Piseros</label>
                <label><input type="checkbox" name="destinoPlano" value="pintores"> Pintores</label>
            </fieldset>

            <br><br>

            <button id="btnSubirPlano">
                📤 Subir Plano
            </button>` : '<p>Solo un administrador puede subir planos.</p>'}

            <hr>

            <div id="listaPlanos">
                No hay planos registrados.
            </div>

        </div>
    `;

    document
        .getElementById("btnSubirPlano")
        ?.addEventListener("click", subirPlano);

    await cargarListaPlanos();

}

async function subirPlano(){

    const input = document.getElementById("archivoPlano");
    const boton = document.getElementById("btnSubirPlano");
    const destinos = Array.from(document.querySelectorAll('input[name="destinoPlano"]:checked')).map((inputDestino) => inputDestino.value);

    if(input.files.length===0 || !destinos.length){

        alert("Seleccione un archivo y al menos un tipo de proveedor.");

        return;

    }

    const archivo=input.files[0];

    boton.disabled = true;
    boton.textContent = "Subiendo...";

    const nombreArchivo=
        `${window.proyectoActual}/${Date.now()}_${archivo.name}`;

    try{

        const {error}=await supabaseClient
            .storage
            .from("planos")
            .upload(nombreArchivo,archivo, {
                contentType: archivo.type || "application/octet-stream",
                upsert: false
            });

        if(error) throw error;

        const { error: errorRegistro } = await supabaseClient
            .from("PlanosProveedores")
            .insert([{
                proyecto_id: window.proyectoActual,
                servicios_destino: destinos,
                ruta_archivo: nombreArchivo,
                nombre_archivo: archivo.name
            }]);
        if (errorRegistro) {
            await supabaseClient.storage.from("planos").remove([nombreArchivo]);
            throw errorRegistro;
        }

        await cargarListaPlanos();

        input.value = "";
        document.querySelectorAll('input[name="destinoPlano"]').forEach((casilla) => { casilla.checked = false; });
        alert("Plano publicado para los proveedores seleccionados.");

    }catch(error){

        console.error("No se pudo subir el plano:", error);

        alert(
            "No se pudo subir el plano.\n\n" +
            "Código: " + (error.code || "No disponible") + "\n" +
            "Mensaje: " + (error.message || "No disponible") + "\n" +
            "Detalles: " + (error.details || "No disponible")
        );

    }finally{

        boton.disabled = false;
        boton.textContent = "📤 Subir Plano";

    }

}

function escaparPlano(valor){

    const elemento = document.createElement("div");
    elemento.textContent = valor || "";
    return elemento.innerHTML;

}

async function cargarListaPlanos(){

    const lista = document.getElementById("listaPlanos");

    if(!lista || !window.proyectoActual) return;

    metadatosPlanos.clear();
    const { data: registrosPlanos, error: errorRegistros } = await supabaseClient
        .from("PlanosProveedores")
        .select("id, ruta_archivo, nombre_archivo, servicios_destino")
        .eq("proyecto_id", window.proyectoActual);
    if (!errorRegistros) {
        registrosPlanos.forEach((registro) => metadatosPlanos.set(registro.ruta_archivo, registro));
    }

    const { data, error } = await supabaseClient
        .storage
        .from("planos")
        .list(String(window.proyectoActual), {
            limit: 100,
            sortBy: { column: "created_at", order: "desc" }
        });

    if(error){

        console.error("No se pudieron cargar los planos:", error);
        lista.innerHTML = `<p>No se pudieron cargar los planos: ${escaparPlano(error.message)}</p>`;
        return;

    }

    if(!data.length){

        lista.textContent = "No hay planos registrados.";
        return;

    }

    const puedeAdministrar = Boolean(window.em360Permisos?.esAdministrador());
    lista.innerHTML = data.map((archivo) => {

        const ruta = `${window.proyectoActual}/${archivo.name}`;
        const url = supabaseClient.storage.from("planos").getPublicUrl(ruta).data.publicUrl;
        const registro = metadatosPlanos.get(ruta);
        const destinos = registro?.servicios_destino?.map((servicio) => SERVICIOS_PLANO[servicio] || servicio).join(", ") || "Sin proveedores asignados";

        return `
            <div class="plano-item">
                <div><strong>${escaparPlano(archivo.name)}</strong><span class="detalle-plano">${escaparPlano(destinos)}</span></div>
                <a href="${url}" target="_blank" rel="noopener noreferrer">Ver o descargar</a>
                ${puedeAdministrar ? `<div class="acciones-resolucion"><button type="button" data-editar-plano="${encodeURIComponent(ruta)}">Editar</button><button type="button" class="btn-declinar-cotizacion" data-eliminar-plano="${encodeURIComponent(ruta)}">Eliminar</button></div>` : ""}
            </div>
        `;

    }).join("");

    // Se reasigna en cada recarga para no acumular manejadores de los botones.
    lista.onclick = administrarPlano;

}

async function administrarPlano(evento) {
    const editar = evento.target.closest("[data-editar-plano]");
    const eliminar = evento.target.closest("[data-eliminar-plano]");
    if (editar) abrirEdicionPlano(decodeURIComponent(editar.dataset.editarPlano));
    if (eliminar) await eliminarPlano(decodeURIComponent(eliminar.dataset.eliminarPlano));
}

function abrirEdicionPlano(ruta) {
    const registro = metadatosPlanos.get(ruta);
    const seleccionados = registro?.servicios_destino || [];
    document.getElementById("modalEditarPlano")?.remove();
    const opciones = Object.entries(SERVICIOS_PLANO).map(([codigo, nombre]) =>
        `<label><input type="checkbox" name="editarDestinoPlano" value="${codigo}" ${seleccionados.includes(codigo) ? "checked" : ""}> ${nombre}</label>`
    ).join("");
    const modal = document.createElement("div");
    modal.id = "modalEditarPlano";
    modal.className = "visor-hoja-proveedor";
    modal.innerHTML = `<section class="panel-hoja-proveedor"><div class="cabecera-seguimiento-proveedor"><div><h2>Editar plano</h2><p>${escaparPlano(ruta.split("/").pop())}</p></div><button type="button" class="boton-secundario" data-cerrar-edicion>Cerrar</button></div><fieldset class="destinos-plano"><legend>Compartir con proveedores</legend>${opciones}</fieldset><label class="carga-croquis">Reemplazar archivo (opcional)<input id="archivoReemplazoPlano" type="file" accept=".pdf,.dwg,.jpg,.jpeg,.png"><small>Si no selecciona uno, se conserva el plano actual.</small></label><div class="acciones-resolucion"><button type="button" id="btnGuardarEdicionPlano">Guardar cambios</button><button type="button" class="boton-secundario" data-cerrar-edicion>Cancelar</button></div></section>`;
    modal.addEventListener("click", (evento) => {
        if (evento.target === modal || evento.target.closest("[data-cerrar-edicion]")) modal.remove();
    });
    modal.querySelector("#btnGuardarEdicionPlano").addEventListener("click", () => guardarEdicionPlano(ruta, registro));
    document.body.append(modal);
}

async function guardarEdicionPlano(rutaAnterior, registro) {
    const modal = document.getElementById("modalEditarPlano");
    const destinos = Array.from(modal.querySelectorAll('input[name="editarDestinoPlano"]:checked')).map((input) => input.value);
    const archivo = modal.querySelector("#archivoReemplazoPlano").files[0];
    const boton = modal.querySelector("#btnGuardarEdicionPlano");
    if (!destinos.length) return alert("Seleccione al menos un tipo de proveedor.");
    boton.disabled = true;
    let rutaNueva = rutaAnterior;
    let nombreNuevo = registro?.nombre_archivo || rutaAnterior.split("/").pop();
    try {
        if (archivo) {
            const nombreSeguro = archivo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            rutaNueva = `${window.proyectoActual}/${Date.now()}_${nombreSeguro}`;
            const { error: errorArchivo } = await supabaseClient.storage.from("planos").upload(rutaNueva, archivo, { contentType: archivo.type || "application/octet-stream", upsert: false });
            if (errorArchivo) throw errorArchivo;
            nombreNuevo = archivo.name;
        }
        const datos = { proyecto_id: window.proyectoActual, servicios_destino: destinos, ruta_archivo: rutaNueva, nombre_archivo: nombreNuevo };
        const { error: errorRegistro } = registro
            ? await supabaseClient.from("PlanosProveedores").update(datos).eq("id", registro.id)
            : await supabaseClient.from("PlanosProveedores").insert([datos]);
        if (errorRegistro) {
            if (archivo) await supabaseClient.storage.from("planos").remove([rutaNueva]);
            throw errorRegistro;
        }
        if (archivo) {
            await supabaseClient.storage.from("planos").remove([rutaAnterior]);
            if (registro) await supabaseClient.from("PlanosProveedores").delete().eq("ruta_archivo", rutaAnterior);
        }
        modal.remove();
        await cargarListaPlanos();
    } catch (error) {
        alert(`No se pudo guardar el plano: ${error.message}`);
    } finally {
        boton.disabled = false;
    }
}

async function eliminarPlano(ruta) {
    if (!confirm("¿Eliminar este plano? Los proveedores dejarán de verlo.")) return;
    const { error: errorArchivo } = await supabaseClient.storage.from("planos").remove([ruta]);
    if (errorArchivo) return alert(`No se pudo eliminar: ${errorArchivo.message}`);
    const registro = metadatosPlanos.get(ruta);
    if (registro) {
        const { error: errorRegistro } = await supabaseClient.from("PlanosProveedores").delete().eq("id", registro.id);
        if (errorRegistro) console.error("No se pudo borrar el registro del plano:", errorRegistro);
    }
    await cargarListaPlanos();
}

window.cargarModuloPlanos=cargarModuloPlanos;

console.log("🔥 ESTE ES MI PLANOS.JS NUEVO");
