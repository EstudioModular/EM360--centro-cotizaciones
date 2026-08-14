const MEDIDAS_LEVANTAMIENTO = [
    ["Extractor", "75 cm (largo) x 49 cm (profundidad)"],
    ["Gabinetes aéreos", "30 o 45 cm (profundidad)"],
    ["Espacio superior de gabinetes aéreos", "47 cm"],
    ["Gabinete sin llegar al techo", "67 cm"],
    ["Gabinete hasta techo", "103 cm"],
    ["Backsplash", "70 cm"],
    ["Meseta", "60 cm (profundidad)"],
    ["Estufa", "60 cm (profundidad) x 75 cm (ancho)"],
    ["Bebedero", "30 x 30 cm"],
    ["Pasamanos", "40 cm (ancho)"],
    ["Espacio de flujo", "160 cm"],
    ["Espacio entre isla y gabinetes", "67 cm"],
    ["Fregadero", "84 cm (largo) x 56 cm (profundidad)"]
];

const DESTINOS_LEVANTAMIENTO = {
    ebanisteria: "Ebanistas", marmoleros: "Marmoleros", sheetrockeros: "Sheetrockeros",
    plomeros: "Plomeros", electricistas: "Electricistas", piseros: "Piseros", pintores: "Pintores"
};

const hojasLevantamientoAdministrables = new Map();

function escaparLevantamiento(valor) {
    const elemento = document.createElement("div");
    elemento.textContent = valor || "";
    return elemento.innerHTML;
}

async function cargarModuloLevantamiento(servicioInicial = "", hojaEditar = null) {
    const contenedor = document.getElementById("contenidoExpediente");
    if (!contenedor || !window.proyectoActual || !window.em360Permisos?.puedeAprobarCotizaciones()) return;

    const { data: proyecto, error } = await supabaseClient
        .from("Proyectos")
        .select("nombre, cliente, ubicacion")
        .eq("id", window.proyectoActual)
        .single();
    if (error) {
        contenedor.innerHTML = `<section class="card"><p>No se pudo cargar el proyecto: ${escaparLevantamiento(error.message)}</p></section>`;
        return;
    }

    const valores = hojaEditar?.contenido || {};
    const medidasGuardadas = valores.medidas || [];
    const filas = MEDIDAS_LEVANTAMIENTO.map(([elemento, estandar], indice) => `
        <tr>
            <td>${indice + 1}</td><td>${elemento}</td><td>${estandar}</td>
            <td><input name="medida_${indice}" value="${escaparLevantamiento(medidasGuardadas[indice]?.real)}" aria-label="Medida real de ${elemento}"></td>
            <td><input name="observacion_${indice}" value="${escaparLevantamiento(medidasGuardadas[indice]?.observacion)}" aria-label="Observación de ${elemento}"></td>
        </tr>
    `).join("");
    const destinos = Object.entries(DESTINOS_LEVANTAMIENTO).map(([codigo, nombre]) => `
        <label class="destino-levantamiento"><input type="checkbox" name="destino" value="${codigo}" ${(hojaEditar?.servicios_destino || [servicioInicial]).includes(codigo) ? "checked" : ""}> ${nombre}</label>
    `).join("");
    const sesion = window.em360Permisos.obtenerSesion();

    contenedor.innerHTML = `
        <section class="hoja-levantamiento">
            <header class="encabezado-levantamiento">
                <div><strong>Estudio Modular</strong><span>DISEÑA LO QUE SUEÑAS</span></div>
                <div><h2>Hoja de levantamiento de medidas</h2><p>Estándares EM360™</p></div>
            </header>
            <form id="formLevantamiento" data-hoja-id="${hojaEditar?.id || ""}">
                <section class="datos-levantamiento">
                    <label>Proyecto<input name="proyecto" value="${escaparLevantamiento(proyecto.nombre)}" readonly></label>
                    <label>Cliente<input name="cliente" value="${escaparLevantamiento(proyecto.cliente)}" readonly></label>
                    <label>Ubicación<input name="ubicacion" value="${escaparLevantamiento(proyecto.ubicacion)}" readonly></label>
                    <label>Técnico / responsable<input name="tecnico" value="${escaparLevantamiento(valores.tecnico || sesion?.nombre)}" required></label>
                    <label>Teléfono<input name="telefono" value="${escaparLevantamiento(valores.telefono)}" placeholder="Teléfono de contacto"></label>
                    <label>Correo<input name="correo" type="email" value="${escaparLevantamiento(valores.correo)}" placeholder="correo@ejemplo.com"></label>
                    <label>Fecha<input name="fecha" type="date" value="${escaparLevantamiento(valores.fecha || new Date().toISOString().slice(0, 10))}" required></label>
                </section>
                <div class="cuerpo-levantamiento">
                    <section class="tabla-levantamiento"><h3>Medidas estándar de referencia</h3><div class="tabla-scroll"><table><thead><tr><th>#</th><th>Elemento</th><th>Medida estándar (EM)</th><th>Medida real</th><th>Observaciones</th></tr></thead><tbody>${filas}</tbody></table></div></section>
                    <section class="notas-levantamiento"><h3>Plano / croquis del espacio</h3><textarea name="croquis" placeholder="Describa el croquis, referencias y detalles del espacio.">${escaparLevantamiento(valores.croquis)}</textarea><h3>Notas / observaciones generales</h3><textarea name="notas" placeholder="Escriba las observaciones generales.">${escaparLevantamiento(valores.notas)}</textarea></section>
                </div>
                <section class="firmas-levantamiento">
                    <label>Levantamiento realizado por<input name="firma_tecnico" value="${escaparLevantamiento(valores.firma_tecnico || sesion?.nombre)}"></label>
                    <label>Revisado por Estudio Modular<input name="firma_estudio" value="${escaparLevantamiento(valores.firma_estudio)}" placeholder="Nombre del revisor"></label>
                    <label>Cliente / conformidad<input name="firma_cliente" value="${escaparLevantamiento(valores.firma_cliente)}" placeholder="Nombre del cliente"></label>
                </section>
                <section class="envio-levantamiento"><h3>Enviar a proveedores seleccionados</h3><p>Los proveedores de las especialidades marcadas podrán ver y descargar esta hoja desde su portal.</p><div class="destinos-levantamiento">${destinos}</div><button type="submit" id="btnEnviarLevantamiento">Enviar hoja a proveedores</button><button type="button" id="btnVolverProveedores" class="boton-secundario">Volver</button><p id="mensajeLevantamiento" class="mensaje-proveedor" aria-live="polite"></p></section>
            </form>
        </section>
    `;
    document.getElementById("formLevantamiento").addEventListener("submit", enviarLevantamiento);
    document.getElementById("btnVolverProveedores").addEventListener("click", () => window.cargarModuloProveedores?.(servicioInicial));
}

async function enviarLevantamiento(evento) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const destinos = Array.from(formulario.querySelectorAll('input[name="destino"]:checked')).map((input) => input.value);
    const mensaje = document.getElementById("mensajeLevantamiento");
    const boton = document.getElementById("btnEnviarLevantamiento");
    if (!destinos.length) {
        mensaje.textContent = "Seleccione al menos una especialidad de proveedor.";
        mensaje.classList.add("es-error");
        return;
    }
    const contenido = Object.fromEntries(new FormData(formulario).entries());
    contenido.medidas = MEDIDAS_LEVANTAMIENTO.map(([, ,], indice) => ({
        elemento: MEDIDAS_LEVANTAMIENTO[indice][0], estandar: MEDIDAS_LEVANTAMIENTO[indice][1],
        real: formulario.elements[`medida_${indice}`].value, observacion: formulario.elements[`observacion_${indice}`].value
    }));
    delete contenido.destino;
    boton.disabled = true;
    mensaje.classList.remove("es-error");
    mensaje.textContent = "Enviando hoja...";
    const datosHoja = {
        proyecto_id: window.proyectoActual,
        servicios_destino: destinos,
        contenido,
        creado_por: window.em360Permisos.obtenerSesion()?.nombre || "Usuario autorizado"
    };
    const idHoja = formulario.dataset.hojaId;
    const { error } = idHoja
        ? await supabaseClient.from("HojasLevantamiento").update(datosHoja).eq("id", idHoja)
        : await supabaseClient.from("HojasLevantamiento").insert([datosHoja]);
    boton.disabled = false;
    if (error) {
        mensaje.textContent = `No se pudo enviar: ${error.message}`;
        mensaje.classList.add("es-error");
        return;
    }
    mensaje.textContent = idHoja ? "Hoja modificada y reenviada a los proveedores seleccionados." : "Hoja enviada a los proveedores seleccionados.";
}

async function mostrarHojasLevantamientoEnviadas(servicioInicial = "") {
    const contenedor = document.getElementById("contenidoExpediente");
    if (!contenedor || !window.proyectoActual || !window.em360Permisos?.puedeAprobarCotizaciones()) return;
    contenedor.innerHTML = `<section class="cotizaciones-proveedor"><h3>Hojas de levantamiento enviadas</h3><p>Puede modificar o borrar una hoja. Al guardar cambios se actualiza para los proveedores seleccionados.</p><div id="listaHojasAdministrables" class="lista-documentos-proveedores">Cargando hojas...</div><button type="button" id="btnNuevaHojaLevantamiento">Nueva hoja</button><button type="button" id="btnVolverDocumentos" class="boton-secundario">Volver</button></section>`;
    document.getElementById("btnNuevaHojaLevantamiento").addEventListener("click", () => cargarModuloLevantamiento(servicioInicial));
    document.getElementById("btnVolverDocumentos").addEventListener("click", () => window.cargarModuloProveedores?.(servicioInicial));
    const lista = document.getElementById("listaHojasAdministrables");
    const { data, error } = await supabaseClient.from("HojasLevantamiento")
        .select("id, servicios_destino, contenido, created_at")
        .eq("proyecto_id", window.proyectoActual)
        .order("created_at", { ascending: false });
    if (error) {
        lista.textContent = `No se pudieron cargar las hojas: ${error.message}`;
        return;
    }
    if (!data.length) {
        lista.textContent = "Aún no hay hojas enviadas para este proyecto.";
        return;
    }
    hojasLevantamientoAdministrables.clear();
    lista.innerHTML = data.map((hoja) => {
        hojasLevantamientoAdministrables.set(String(hoja.id), hoja);
        const destinatarios = hoja.servicios_destino.map((servicio) => DESTINOS_LEVANTAMIENTO[servicio] || servicio).join(", ");
        return `<article class="documento-proveedor-item"><div><strong>Hoja de levantamiento · ${escaparLevantamiento(hoja.contenido?.fecha || "Sin fecha")}</strong><span>Enviada a: ${escaparLevantamiento(destinatarios)}</span></div><div class="acciones-resolucion"><button type="button" data-editar-hoja="${hoja.id}">Editar</button><button type="button" class="btn-declinar-cotizacion" data-eliminar-hoja="${hoja.id}">Eliminar</button></div></article>`;
    }).join("");
    lista.addEventListener("click", async (evento) => {
        const editar = evento.target.closest("[data-editar-hoja]");
        const eliminar = evento.target.closest("[data-eliminar-hoja]");
        if (editar) {
            const hoja = hojasLevantamientoAdministrables.get(editar.dataset.editarHoja);
            if (hoja) cargarModuloLevantamiento(hoja.servicios_destino[0], hoja);
        }
        if (eliminar) {
            const hoja = hojasLevantamientoAdministrables.get(eliminar.dataset.eliminarHoja);
            if (!hoja || !confirm("¿Eliminar esta hoja de levantamiento? Los proveedores dejarán de verla.")) return;
            const { error: errorEliminar } = await supabaseClient.from("HojasLevantamiento").delete().eq("id", hoja.id);
            if (errorEliminar) return alert(errorEliminar.message);
            await mostrarHojasLevantamientoEnviadas(servicioInicial);
        }
    });
}

window.cargarModuloLevantamiento = cargarModuloLevantamiento;
window.mostrarHojasLevantamientoEnviadas = mostrarHojasLevantamientoEnviadas;
