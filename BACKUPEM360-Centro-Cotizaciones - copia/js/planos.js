/* ==========================================
   EM360™
   MÓDULO DE PLANOS
========================================== */

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

    lista.innerHTML = data.map((archivo) => {

        const ruta = `${window.proyectoActual}/${archivo.name}`;
        const url = supabaseClient.storage.from("planos").getPublicUrl(ruta).data.publicUrl;

        return `
            <div class="plano-item">
                <strong>${escaparPlano(archivo.name)}</strong>
                <a href="${url}" target="_blank" rel="noopener noreferrer">Ver o descargar</a>
            </div>
        `;

    }).join("");

}

window.cargarModuloPlanos=cargarModuloPlanos;

console.log("🔥 ESTE ES MI PLANOS.JS NUEVO");
