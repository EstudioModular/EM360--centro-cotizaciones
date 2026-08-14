async function cargarProyectos() {

    const contenedor = document.getElementById("contenidoPrincipal");

    const { data, error } = await supabaseClient
        .from("Proyectos")
        .select("*")
        .order("id", { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    let html = `
        <div class="card">

            <h2>📁 Proyectos</h2>

            <br>
    `;

    if (data.length === 0) {

        html += `
            <p>No existen proyectos registrados.</p>
        `;

    } else {

        data.forEach(proyecto => {

            html += `

                <div class="proyecto-card">

                    <h3>${proyecto.nombre}</h3>

                    <p><strong>Cliente:</strong> ${proyecto.cliente}</p>

                    <p><strong>Ubicación:</strong> ${proyecto.ubicacion}</p>

                    <p><strong>Estado:</strong> ${proyecto.estado}</p>

                    <div class="acciones-proyecto">

                        <button onclick="abrirProyecto(${proyecto.id})">
                            👁 Abrir
                        </button>

                        <button onclick="editarProyecto(${proyecto.id})">
                            ✏️ Editar
                        </button>

                        <button onclick="eliminarProyecto(${proyecto.id})">
                            🗑 Eliminar
                        </button>

                    </div>

                </div>

            `;

        });

    }

    html += `</div>`;

    contenedor.innerHTML = html;

}

/* ===========================
   EDITAR
=========================== */

async function editarProyecto(id){

    const { data, error } = await supabaseClient
        .from("Proyectos")
        .select("*")
        .eq("id", id)
        .single();

    if(error){

        alert(error.message);
        return;

    }

    const nombre = prompt("Nombre del proyecto:", data.nombre);
    if(nombre === null) return;

    const cliente = prompt("Cliente:", data.cliente);
    if(cliente === null) return;

    const ubicacion = prompt("Ubicación:", data.ubicacion);
    if(ubicacion === null) return;

    const estado = prompt("Estado:", data.estado);
    if(estado === null) return;

    const { data: updateData, error: updateError } = await supabaseClient
        .from("Proyectos")
        .update({
            nombre,
            cliente,
            ubicacion,
            estado
        })
        .eq("id", id)
        .select();

    console.log("UPDATE:", updateData);
    console.log("ERROR UPDATE:", updateError);

    if(updateError){

        console.error(updateError);
        alert(updateError.message);
        return;

    }

    alert("Proyecto actualizado correctamente");

    cargarProyectos();

}

/* ===========================
   ELIMINAR
=========================== */

async function eliminarProyecto(id){

    const confirmar = confirm("¿Desea eliminar este proyecto?");
    if (!confirmar) return;

    console.log("ID:", id);

    const { data, error } = await supabaseClient
        .from("Proyectos")
        .delete()
        .eq("id", id)
        .select();

    console.log("DELETE:", data);

    if (error) {
        console.error(error);
        alert(error.message);
        return;
    }

    if (!data || data.length === 0) {
        alert("No se eliminó ningún proyecto.");
        return;
    }

    alert("Proyecto eliminado correctamente");

    cargarProyectos();

}

/* ===========================
   ABRIR PROYECTO
=========================== */


// Hacer las funciones accesibles desde otros archivos
window.cargarProyectos = cargarProyectos;
window.editarProyecto = editarProyecto;
window.eliminarProyecto = eliminarProyecto;

console.log("✅ proyectos.js cargado");
