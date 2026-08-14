async function cargarModuloHistorial() {
    const contenedor = document.getElementById("contenidoExpediente");
    if (!contenedor || !window.proyectoActual) return;

    contenedor.innerHTML = `
        <section class="historial-proyecto">
            <div class="cabecera-historial">
                <div>
                    <h3>Resumen del proyecto</h3>
                    <p>Conteo de la actividad registrada para este proyecto.</p>
                </div>
                <button type="button" id="btnActualizarHistorial">Actualizar</button>
            </div>
            <div id="conteoHistorial" class="conteo-historial" aria-live="polite">
                Cargando conteo...
            </div>
        </section>
    `;

    document.getElementById("btnActualizarHistorial")
        .addEventListener("click", cargarConteoHistorial);

    await cargarConteoHistorial();
}

async function cargarConteoHistorial() {
    const contenedor = document.getElementById("conteoHistorial");
    if (!contenedor) return;

    contenedor.innerHTML = '<p class="estado-historial">Cargando conteo...</p>';

    const proyectoId = window.proyectoActual;
    const [planos, transferencias, cotizaciones] = await Promise.all([
        supabaseClient.storage.from("planos").list(String(proyectoId), { limit: 1000 }),
        supabaseClient.from("Transferencias").select("id", { count: "exact", head: true }).eq("proyecto_id", proyectoId),
        supabaseClient.from("CotizacionesProveedores").select("id", { count: "exact", head: true }).eq("proyecto_id", proyectoId)
    ]);

    const datos = [
        { etiqueta: "Planos cargados", valor: planos.error ? null : planos.data.length },
        { etiqueta: "Transferencias", valor: transferencias.error ? null : transferencias.count },
        { etiqueta: "Cotizaciones", valor: cotizaciones.error ? null : cotizaciones.count }
    ];

    const conError = [planos.error, transferencias.error, cotizaciones.error].find(Boolean);
    if (conError) console.error("No se pudo completar parte del historial:", conError);

    const total = datos.reduce((acumulado, dato) => acumulado + (Number.isInteger(dato.valor) ? dato.valor : 0), 0);

    contenedor.innerHTML = `
        <article class="tarjeta-conteo total-conteo">
            <span>Actividad total</span>
            <strong>${total}</strong>
        </article>
        ${datos.map((dato) => `
            <article class="tarjeta-conteo">
                <span>${dato.etiqueta}</span>
                <strong>${dato.valor === null ? "—" : dato.valor}</strong>
            </article>
        `).join("")}
    `;
}

window.cargarModuloHistorial = cargarModuloHistorial;
