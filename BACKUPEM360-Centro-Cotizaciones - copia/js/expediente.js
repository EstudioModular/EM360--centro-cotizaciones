/* ===========================
   EXPEDIENTE DEL PROYECTO
=========================== */

async function abrirProyecto(id){

    // Guardar el proyecto actualmente abierto
    window.proyectoActual = id;

    const { data, error } = await supabaseClient
        .from("Proyectos")
        .select("*")
        .eq("id", id)
        .single();

    if(error){
        alert(error.message);
        return;
    }

    const contenedor = document.getElementById("contenidoPrincipal");

    contenedor.innerHTML = `

        <div class="card expediente">

            <div class="cabecera-proyecto">

                <h2>📁 ${data.nombre}</h2>

                <p><strong>Cliente:</strong> ${data.cliente}</p>

                <p><strong>Ubicación:</strong> ${data.ubicacion}</p>

                <p><strong>Estado:</strong> ${data.estado}</p>

            </div>

            <hr>

            <div class="menu-expediente">

                <button onclick="mostrarPlano()">
                    📐 Plano
                </button>

                <button onclick="mostrarTransferencias()">
                    📸 Transferencias
                </button>

                <button onclick="mostrarProveedores()">
                    🏢 Proveedores
                </button>

                <button onclick="mostrarCotizaciones()">
                    💰 Cotizaciones
                </button>

                <button onclick="mostrarHistorial()">
                    📋 Historial
                </button>

            </div>

            <hr>

            <div id="contenidoExpediente">

                <h3>Bienvenido al expediente del proyecto</h3>

                <p>Seleccione un módulo para comenzar.</p>

            </div>

            <br>

            <button onclick="cargarProyectos()">
                ⬅ Volver a proyectos
            </button>

        </div>

    `;

}

/* ===========================
   MÓDULOS
=========================== */

function mostrarPlano(){

    if(typeof cargarModuloPlanos === "function"){
        cargarModuloPlanos();
    }else{

        document.getElementById("contenidoExpediente").innerHTML = `
            <h3>📐 Gestión de Planos</h3>
            <p>El módulo planos aún no está disponible.</p>
        `;

    }

}

function mostrarDocumentos(){

    document.getElementById("contenidoExpediente").innerHTML = `
        <h3>📄 Documentos</h3>
        <p>Aquí estarán los documentos.</p>
    `;

}

function mostrarProveedores(){

    if(typeof cargarModuloProveedores === "function"){
        cargarModuloProveedores();
        return;
    }

    document.getElementById("contenidoExpediente").innerHTML = `
        <h3>🏢 Proveedores</h3>
        <p>Aquí aparecerán los proveedores asignados.</p>
    `;

}

function mostrarCotizaciones(){

    if(typeof cargarModuloCotizaciones === "function"){
        cargarModuloCotizaciones();
        return;
    }

    document.getElementById("contenidoExpediente").innerHTML = `
        <h3>💰 Cotizaciones</h3>
        <p>Aquí estarán las cotizaciones.</p>
    `;

}

function mostrarHistorial(){

    if(typeof cargarModuloHistorial === "function"){
        cargarModuloHistorial();
        return;
    }

    document.getElementById("contenidoExpediente").innerHTML = `
        <h3>📋 Historial</h3>
        <p>Aquí se mostrará el historial del proyecto.</p>
    `;

}

window.abrirProyecto = abrirProyecto;
window.mostrarPlano = mostrarPlano;
window.mostrarProveedores = mostrarProveedores;
window.mostrarCotizaciones = mostrarCotizaciones;
window.mostrarHistorial = mostrarHistorial;
