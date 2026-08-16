function abrirModalNuevoProyecto() {

    if (!window.em360Permisos?.puedeCrearProyectos()) {
        alert("No tiene permiso para crear proyectos.");
        return;
    }

    // Evita abrir dos modales
    if (document.getElementById("modalProyecto")) return;

    const modal = document.createElement("div");
    modal.id = "modalProyecto";

    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100%";
    modal.style.height = "100%";
    modal.style.background = "rgba(0,0,0,.55)";
    modal.style.display = "flex";
    modal.style.justifyContent = "center";
    modal.style.alignItems = "center";
    modal.style.zIndex = "99999";

    modal.innerHTML = `
        <div style="
            width:520px;
            background:#fff;
            border-radius:14px;
            padding:30px;
            box-shadow:0 15px 40px rgba(0,0,0,.25);
        ">

            <h2 style="
                margin-bottom:25px;
                color:#083D3B;
            ">
                Nuevo Proyecto
            </h2>

            <input
                id="nombreProyecto"
                type="text"
                placeholder="Nombre del Proyecto"
                style="
                    width:100%;
                    padding:14px;
                    margin-bottom:15px;
                    border:1px solid #ccc;
                    border-radius:8px;
                    font-size:15px;
                "
            >

            <input
                id="clienteProyecto"
                type="text"
                placeholder="Cliente"
                style="
                    width:100%;
                    padding:14px;
                    margin-bottom:15px;
                    border:1px solid #ccc;
                    border-radius:8px;
                    font-size:15px;
                "
            >

            <input
                id="ubicacionProyecto"
                type="text"
                placeholder="Ubicación"
                style="
                    width:100%;
                    padding:14px;
                    margin-bottom:25px;
                    border:1px solid #ccc;
                    border-radius:8px;
                    font-size:15px;
                "
            >

            <fieldset style="margin:0 0 25px;padding:14px;border:1px solid #cbd8d6;border-radius:8px;">
                <legend style="padding:0 6px;color:#083D3B;font-weight:700;">Proveedores requeridos</legend>
                <p style="margin:0 0 10px;color:#52636a;font-size:13px;">Seleccione las especialidades que podrán cotizar este proyecto.</p>
                <div id="serviciosProyecto" style="display:flex;flex-wrap:wrap;gap:9px;color:#083D3B;font-size:14px;">
                    <label><input type="checkbox" value="ebanisteria"> Ebanistas</label>
                    <label><input type="checkbox" value="marmoleros"> Marmoleros</label>
                    <label><input type="checkbox" value="sheetrockeros"> Sheetrockeros</label>
                    <label><input type="checkbox" value="plomeros"> Plomeros</label>
                    <label><input type="checkbox" value="electricistas"> Electricistas</label>
                    <label><input type="checkbox" value="piseros"> Piseros</label>
                    <label><input type="checkbox" value="pintores"> Pintores</label>
                </div>
            </fieldset>

            <div style="
                display:flex;
                justify-content:flex-end;
                gap:12px;
            ">

                <button
                    id="cerrarModal"
                    style="
                        background:#999;
                        color:#fff;
                        border:none;
                        padding:12px 22px;
                        border-radius:8px;
                        cursor:pointer;
                    "
                >
                    Cancelar
                </button>

                <button
                    id="guardarProyecto"
                    style="
                        background:#0E5A56;
                        color:#fff;
                        border:none;
                        padding:12px 22px;
                        border-radius:8px;
                        cursor:pointer;
                    "
                >
                    Guardar
                </button>

            </div>

        </div>
    `;

    document.body.appendChild(modal);

    // Botón Cancelar
    document.getElementById("cerrarModal").addEventListener("click", () => {
        modal.remove();
    });

    // Botón Guardar
    document.getElementById("guardarProyecto").addEventListener("click", async () => {

        const nombre = document.getElementById("nombreProyecto").value.trim();
        const cliente = document.getElementById("clienteProyecto").value.trim();
        const ubicacion = document.getElementById("ubicacionProyecto").value.trim();
        const serviciosProveedores = Array.from(document.querySelectorAll("#serviciosProyecto input:checked")).map((input) => input.value);

        if (!nombre || !cliente || !ubicacion || !serviciosProveedores.length) {
            alert("Complete todos los campos y seleccione al menos un tipo de proveedor.");
            return;
        }

        const { data, error } = await supabaseClient
            .from("Proyectos")
            .insert([
                {
                    nombre: nombre,
                    cliente: cliente,
                    ubicacion: ubicacion,
                    estado: "Pendiente",
                    servicios_proveedores: serviciosProveedores
                }
            ])
            .select();

        if (error) {

            console.error(error);

            alert(
                "Código: " + error.code +
                "\n\nMensaje: " + error.message +
                "\n\nDetalles: " + (error.details || "Sin detalles")
            );

            return;
        }

        console.log(data);

        alert("Proyecto creado correctamente.");

        modal.remove();

    });

}
