function escaparFinanzas(valor) {
    const elemento = document.createElement("div");
    elemento.textContent = valor || "";
    return elemento.innerHTML;
}

function monedaFinanzas(valor) {
    return new Intl.NumberFormat("es-DO", {
        style: "currency",
        currency: "DOP",
        maximumFractionDigits: 2
    }).format(Number(valor || 0));
}

function fechaFinanzas() {
    return new Date().toISOString().slice(0, 10);
}

function montoFinanzas(valor) {
    return Number.parseFloat(valor) || 0;
}

async function cargarModuloFinanzas() {
    const contenedor = document.getElementById("contenidoExpediente");
    if (!contenedor || !window.proyectoActual) return;
    if (!window.em360Permisos?.puedeAdministrar()) {
        contenedor.innerHTML = '<section class="finanzas-proyecto"><h3>Control financiero</h3><p>Solo Administrador u Oficial puede consultar esta información.</p></section>';
        return;
    }

    contenedor.innerHTML = '<section class="finanzas-proyecto"><p>Cargando control financiero...</p></section>';

    const proyectoId = window.proyectoActual;
    const [finanzasRespuesta, compromisosRespuesta, cobrosRespuesta, cierresRespuesta, facturasRespuesta, transferenciasRespuesta, bloqueoRespuesta] = await Promise.all([
        supabaseClient.from("FinanzasProyecto").select("monto_cliente, porcentaje_anticipo_cliente").eq("proyecto_id", proyectoId).maybeSingle(),
        supabaseClient.from("CompromisosProveedores").select("id, proveedor, concepto, monto_acordado, created_at").eq("proyecto_id", proyectoId).order("created_at", { ascending: false }),
        supabaseClient.from("PagosClientes").select("id, monto, fecha, nota, transferencia_id, created_at").eq("proyecto_id", proyectoId).order("fecha", { ascending: false }).order("created_at", { ascending: false }),
        supabaseClient.from("CierresFinancieros").select("id, nombre, tipo, notas, resumen, creado_por, created_at").eq("proyecto_id", proyectoId).order("created_at", { ascending: false }),
        supabaseClient.from("FacturasClientes").select("id, pago_cliente_id, numero, cliente, proyecto, concepto, monto, fecha, emitido_por, created_at").eq("proyecto_id", proyectoId).order("created_at", { ascending: false }),
        supabaseClient.from("Transferencias").select("id, ruta_archivo").eq("proyecto_id", proyectoId),
        supabaseClient.from("BloqueosFinancieros").select("nombre, tipo, notas, bloqueado_por, created_at").eq("proyecto_id", proyectoId).maybeSingle()
    ]);

    if (finanzasRespuesta.error || compromisosRespuesta.error || cobrosRespuesta.error || cierresRespuesta.error || facturasRespuesta.error || transferenciasRespuesta.error || bloqueoRespuesta.error) {
        const error = finanzasRespuesta.error || compromisosRespuesta.error || cobrosRespuesta.error || cierresRespuesta.error || facturasRespuesta.error || transferenciasRespuesta.error || bloqueoRespuesta.error;
        contenedor.innerHTML = `<section class="finanzas-proyecto"><h3>Control financiero</h3><p class="es-error">No se pudo cargar: ${escaparFinanzas(error.message)}</p></section>`;
        return;
    }

    const compromisos = compromisosRespuesta.data || [];
    const bloqueoFinanciero = bloqueoRespuesta.data;
    const idsCompromisos = compromisos.map((compromiso) => compromiso.id);
    const pagosRespuesta = idsCompromisos.length
        ? await supabaseClient.from("PagosProveedores").select("id, compromiso_id, monto, fecha, nota, comprobante_ruta, registrado_por, created_at").in("compromiso_id", idsCompromisos).order("fecha", { ascending: false }).order("created_at", { ascending: false })
        : { data: [], error: null };

    if (pagosRespuesta.error) {
        contenedor.innerHTML = `<section class="finanzas-proyecto"><h3>Control financiero</h3><p class="es-error">No se pudieron cargar los pagos: ${escaparFinanzas(pagosRespuesta.error.message)}</p></section>`;
        return;
    }

    const pagos = pagosRespuesta.data || [];
    const puedeRegistrarPagos = Boolean(window.em360Permisos?.esAdministrador());
    const enlacesComprobantes = new Map();
    if (puedeRegistrarPagos) {
        await Promise.all(pagos.filter((pago) => pago.comprobante_ruta).map(async (pago) => {
            const { data, error } = await supabaseClient.storage.from("pagos-proveedores").createSignedUrl(pago.comprobante_ruta, 3600);
            if (!error) enlacesComprobantes.set(pago.id, data.signedUrl);
        }));
    }
    const pagadoPorCompromiso = new Map();
    pagos.forEach((pago) => {
        pagadoPorCompromiso.set(pago.compromiso_id, (pagadoPorCompromiso.get(pago.compromiso_id) || 0) + montoFinanzas(pago.monto));
    });

    const montoCliente = montoFinanzas(finanzasRespuesta.data?.monto_cliente);
    const porcentajeAnticipo = montoFinanzas(finanzasRespuesta.data?.porcentaje_anticipo_cliente || 70);
    const cobrosClientes = cobrosRespuesta.data || [];
    const totalCobradoCliente = cobrosClientes.reduce((total, cobro) => total + montoFinanzas(cobro.monto), 0);
    const anticipoRequerido = montoCliente * (porcentajeAnticipo / 100);
    const anticipoPendiente = Math.max(0, anticipoRequerido - totalCobradoCliente);
    const pendienteCliente = Math.max(0, montoCliente - totalCobradoCliente);
    const saldoFinalCliente = Math.max(0, montoCliente - Math.max(totalCobradoCliente, anticipoRequerido));
    const totalAcordado = compromisos.reduce((total, compromiso) => total + montoFinanzas(compromiso.monto_acordado), 0);
    const totalPagado = pagos.reduce((total, pago) => total + montoFinanzas(pago.monto), 0);
    const pendienteProveedores = Math.max(0, totalAcordado - totalPagado);
    const saldoEMFinal = montoCliente - totalAcordado;
    const saldoEMDisponible = totalCobradoCliente - totalPagado;
    const cierres = cierresRespuesta.data || [];
    const resumenActual = {
        monto_cliente: montoCliente,
        porcentaje_anticipo_cliente: porcentajeAnticipo,
        anticipo_requerido: anticipoRequerido,
        cobrado_cliente: totalCobradoCliente,
        pendiente_cliente: pendienteCliente,
        acordado_proveedores: totalAcordado,
        pagado_proveedores: totalPagado,
        pendiente_proveedores: pendienteProveedores,
        saldo_em_al_liquidar: saldoEMFinal,
        flujo_disponible_em: saldoEMDisponible
    };

    const opcionesCompromisos = compromisos.map((compromiso) => {
        const pagado = pagadoPorCompromiso.get(compromiso.id) || 0;
        const pendiente = Math.max(0, montoFinanzas(compromiso.monto_acordado) - pagado);
        return `<option value="${compromiso.id}" data-pendiente="${pendiente}" ${pendiente <= 0 ? "disabled" : ""}>${escaparFinanzas(compromiso.proveedor)} · pendiente ${monedaFinanzas(pendiente)}</option>`;
    }).join("");

    const filasCompromisos = compromisos.length
        ? compromisos.map((compromiso) => {
            const acordado = montoFinanzas(compromiso.monto_acordado);
            const pagado = pagadoPorCompromiso.get(compromiso.id) || 0;
            const pendiente = Math.max(0, acordado - pagado);
            const porcentaje = acordado ? Math.min(100, (pagado / acordado) * 100) : 0;
            const botonEstado = puedeRegistrarPagos && pagado > 0
                ? `<button type="button" class="boton-secundario" data-imprimir-estado-pagos="${compromiso.id}">Imprimir estado</button>`
                : "";
            const botonEliminar = puedeRegistrarPagos
                ? `<button type="button" class="boton-icono" data-eliminar-compromiso="${compromiso.id}" title="Eliminar proveedor">×</button>`
                : "";
            return `<tr><td><strong>${escaparFinanzas(compromiso.proveedor)}</strong>${compromiso.concepto ? `<small>${escaparFinanzas(compromiso.concepto)}</small>` : ""}</td><td>${monedaFinanzas(acordado)}</td><td>${monedaFinanzas(pagado)}</td><td class="${pendiente ? "pendiente-finanzas" : "liquidado-finanzas"}">${monedaFinanzas(pendiente)}</td><td><div class="barra-progreso-finanzas"><span style="width:${porcentaje}%"></span></div><small>${porcentaje.toFixed(0)}% pagado</small></td><td>${botonEstado} ${botonEliminar}</td></tr>`;
        }).join("")
        : '<tr><td colspan="6" class="sin-registros-finanzas">Aún no hay proveedores registrados.</td></tr>';

    const nombresCompromisos = new Map(compromisos.map((compromiso) => [compromiso.id, compromiso.proveedor]));
    const filasPagos = pagos.length
        ? pagos.map((pago) => {
            const urlComprobante = enlacesComprobantes.get(pago.id);
            const enlaceComprobante = urlComprobante
                ? `<a class="boton-secundario" href="${urlComprobante}" target="_blank" rel="noopener noreferrer">Ver bauche</a>`
                : "—";
            const botonEliminar = puedeRegistrarPagos ? `<button type="button" class="boton-icono" data-eliminar-pago="${pago.id}" title="Eliminar pago">×</button>` : "—";
            return `<tr><td>${escaparFinanzas(nombresCompromisos.get(pago.compromiso_id) || "Proveedor")}</td><td>${escaparFinanzas(pago.fecha)}</td><td>${pago.nota ? escaparFinanzas(pago.nota) : "—"}</td><td>${monedaFinanzas(pago.monto)}</td><td>${enlaceComprobante}</td><td>${escaparFinanzas(pago.registrado_por || "—")}</td><td>${botonEliminar}</td></tr>`;
        }).join("")
        : '<tr><td colspan="7" class="sin-registros-finanzas">Aún no hay pagos registrados para este trabajo.</td></tr>';

    const facturas = facturasRespuesta.data || [];
    const facturasPorPago = new Map(facturas.map((factura) => [factura.pago_cliente_id, factura]));
    const facturasPorId = new Map(facturas.map((factura) => [String(factura.id), factura]));
    const transferenciasPorId = new Map((transferenciasRespuesta.data || []).map((transferencia) => [transferencia.id, transferencia]));
    const cobrosPorId = new Map(cobrosClientes.map((cobro) => [String(cobro.id), cobro]));
    const filasCobros = cobrosClientes.length
        ? cobrosClientes.map((cobro) => {
            const factura = facturasPorPago.get(cobro.id);
            const accionFactura = factura
                ? `<button type="button" class="boton-secundario btn-factura" data-ver-factura="${factura.id}">${escaparFinanzas(factura.numero)}</button>`
                : `<button type="button" class="boton-secundario btn-factura" data-crear-factura="${cobro.id}">Crear factura</button>`;
            const rutaComprobante = transferenciasPorId.get(cobro.transferencia_id)?.ruta_archivo;
            const comprobante = rutaComprobante
                ? `<a class="boton-secundario" href="${supabaseClient.storage.from("transferencias").getPublicUrl(rutaComprobante).data.publicUrl}" target="_blank" rel="noopener">Ver foto</a>`
                : "—";
            return `<tr><td>${escaparFinanzas(cobro.fecha)}</td><td>${cobro.nota ? escaparFinanzas(cobro.nota) : "—"}</td><td>${monedaFinanzas(cobro.monto)}</td><td>${comprobante}</td><td>${accionFactura}</td><td><button type="button" class="boton-icono" data-eliminar-cobro="${cobro.id}" title="Eliminar cobro">×</button></td></tr>`;
        }).join("")
        : '<tr><td colspan="6" class="sin-registros-finanzas">Aún no hay cobros registrados.</td></tr>';

    const filasCierres = cierres.length
        ? cierres.map((cierre) => {
            const resumen = cierre.resumen || {};
            return `<tr><td><strong>${escaparFinanzas(cierre.nombre)}</strong>${cierre.notas ? `<small>${escaparFinanzas(cierre.notas)}</small>` : ""}</td><td><span class="estado-cierre-finanzas ${cierre.tipo === "Cierre" ? "es-cierre" : "es-proceso"}">${escaparFinanzas(cierre.tipo)}</span></td><td>${new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(cierre.created_at))}</td><td>${monedaFinanzas(resumen.pendiente_cliente)}</td><td>${monedaFinanzas(resumen.pendiente_proveedores)}</td><td>${monedaFinanzas(resumen.saldo_em_al_liquidar)}</td><td><button type="button" class="boton-icono" data-eliminar-cierre="${cierre.id}" title="Eliminar guardado">×</button></td></tr>`;
        }).join("")
        : '<tr><td colspan="7" class="sin-registros-finanzas">Aún no hay procesos o cierres guardados.</td></tr>';
    const resumenCodificado = encodeURIComponent(JSON.stringify(resumenActual));

    contenedor.innerHTML = `
        <section class="finanzas-proyecto">
            <div class="cabecera-finanzas"><div><h3>Control financiero del proyecto</h3><p>Registre el monto acordado con el cliente y cada pago a proveedor. Los saldos se calculan automáticamente.</p></div><button type="button" class="boton-secundario" id="btnActualizarFinanzas">Actualizar</button></div>
            <div class="resumen-finanzas">
                <article><span>Total del trabajo al cliente</span><strong>${monedaFinanzas(montoCliente)}</strong></article>
                <article><span>Anticipo requerido (${porcentajeAnticipo}%)</span><strong>${monedaFinanzas(anticipoRequerido)}</strong></article>
                <article><span>Cobrado al cliente</span><strong>${monedaFinanzas(totalCobradoCliente)}</strong></article>
                <article class="${pendienteCliente ? "tarjeta-pendiente" : "tarjeta-liquidada"}"><span>El cliente debe</span><strong>${monedaFinanzas(pendienteCliente)}</strong><small>${anticipoPendiente ? `Faltan ${monedaFinanzas(anticipoPendiente)} del anticipo.` : `Saldo final: ${monedaFinanzas(saldoFinalCliente)}`}</small></article>
                <article><span>Acordado a proveedores</span><strong>${monedaFinanzas(totalAcordado)}</strong></article>
                <article><span>Pagado a proveedores</span><strong>${monedaFinanzas(totalPagado)}</strong></article>
                <article class="${pendienteProveedores ? "tarjeta-pendiente" : "tarjeta-liquidada"}"><span>Pendiente por pagar</span><strong>${monedaFinanzas(pendienteProveedores)}</strong></article>
                <article><span>Saldo EM al liquidar</span><strong>${monedaFinanzas(saldoEMFinal)}</strong></article>
                <article><span>Flujo disponible de EM</span><strong>${monedaFinanzas(saldoEMDisponible)}</strong></article>
            </div>

            <div class="grid-formularios-finanzas">
                <form id="formMontoCliente" class="form-finanzas"><h4>Acuerdo con el cliente</h4><label>Total de venta<input id="montoClienteFinanzas" type="number" min="0" step="0.01" required value="${montoCliente || ""}" placeholder="400000"></label><label>Anticipo requerido (%)<input id="porcentajeAnticipoFinanzas" type="number" min="0" max="100" step="0.01" required value="${porcentajeAnticipo}"></label><button type="submit">Guardar acuerdo</button></form>
                <form id="formCobroCliente" class="form-finanzas"><h4>Registrar cobro del cliente</h4><label>Monto recibido<input id="montoCobroCliente" type="number" min="0.01" step="0.01" required placeholder="280000"></label><label>Fecha<input id="fechaCobroCliente" type="date" required value="${fechaFinanzas()}"></label><label>Nota <input id="notaCobroCliente" maxlength="250" placeholder="Anticipo 70%"></label><button type="submit" ${montoCliente ? "" : "disabled"}>Registrar cobro</button></form>
                <form id="formCompromisoProveedor" class="form-finanzas"><h4>Agregar proveedor</h4><label>Proveedor<input id="proveedorFinanzas" maxlength="120" required placeholder="Ejemplo: Marmolería Pérez"></label><label>Concepto <input id="conceptoFinanzas" maxlength="250" placeholder="Ejemplo: Tope de cocina"></label><label>Total acordado<input id="montoAcordadoFinanzas" type="number" min="0.01" step="0.01" required placeholder="100000"></label><button type="submit">Agregar proveedor</button></form>
                ${puedeRegistrarPagos ? `<form id="formPagoProveedor" class="form-finanzas"><h4>Registrar pago a proveedor</h4><label>Proveedor<select id="compromisoPagoFinanzas" required><option value="">Seleccione un proveedor</option>${opcionesCompromisos}</select></label><label>Monto pagado<input id="montoPagoFinanzas" type="number" min="0.01" step="0.01" required placeholder="50000"></label><label>Fecha<input id="fechaPagoFinanzas" type="date" required value="${fechaFinanzas()}"></label><label>Bauche de transferencia<input id="comprobantePagoFinanzas" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" required></label><small>PDF, PNG, JPG o WEBP. Máximo 10 MB.</small><label>Nota <input id="notaPagoFinanzas" maxlength="250" placeholder="Anticipo 50%"></label><button type="submit" ${compromisos.length ? "" : "disabled"}>Registrar pago</button></form>` : '<p>Solo el Administrador puede registrar pagos a proveedores.</p>'}
            </div>

            <form id="formGuardarCierreFinanzas" class="form-cierre-finanzas" data-resumen="${resumenCodificado}"><div><h4>Guardar proceso o cierre</h4><p>Un proceso conserva el avance actual. El cierre final solo se guarda cuando cliente y proveedores estén liquidados.</p></div><label>Nombre<input id="nombreCierreFinanzas" maxlength="150" required placeholder="Ejemplo: Cierre Cocina Nueva - agosto"></label><label>Tipo<select id="tipoCierreFinanzas"><option value="Proceso">Proceso / avance</option><option value="Cierre">Cierre final</option></select></label><label>Notas<textarea id="notasCierreFinanzas" rows="2" maxlength="1000" placeholder="Observaciones del cierre"></textarea></label><button type="submit">Guardar</button></form>

            <div class="tabla-finanzas-wrap"><h4>Proveedores y saldo pendiente</h4><table class="tabla-finanzas"><thead><tr><th>Proveedor</th><th>Acordado</th><th>Pagado</th><th>Pendiente</th><th>Avance</th><th></th></tr></thead><tbody>${filasCompromisos}</tbody></table></div>
            <div class="tabla-finanzas-wrap"><h4>Historial de pagos de este trabajo</h4><table class="tabla-finanzas"><thead><tr><th>Proveedor</th><th>Fecha</th><th>Nota</th><th>Monto</th><th>Bauche</th><th>Registrado por</th><th></th></tr></thead><tbody>${filasPagos}</tbody></table></div>
            <div class="tabla-finanzas-wrap"><h4>Cobros y facturas del cliente</h4><table class="tabla-finanzas"><thead><tr><th>Fecha</th><th>Nota</th><th>Monto</th><th>Comprobante</th><th>Factura</th><th></th></tr></thead><tbody>${filasCobros}</tbody></table></div>
        </section>
    `;

    // El acuerdo y el cobro inicial se completan antes de revisar el resto del control financiero.
    const resumenFinanciero = contenedor.querySelector(".resumen-finanzas");
    const formulariosFinancieros = contenedor.querySelector(".grid-formularios-finanzas");
    const acuerdoCliente = document.getElementById("formMontoCliente");
    const cobroCliente = document.getElementById("formCobroCliente");
    if (resumenFinanciero && formulariosFinancieros && acuerdoCliente && cobroCliente) {
        const calculadoraCliente = document.createElement("div");
        calculadoraCliente.className = "grid-formularios-finanzas calculadora-finanzas";
        calculadoraCliente.append(acuerdoCliente, cobroCliente);
        resumenFinanciero.before(calculadoraCliente);
    }

    const formularioCobroCliente = document.getElementById("formCobroCliente");
    const botonRegistrarCobro = formularioCobroCliente?.querySelector("button[type=submit]");
    if (formularioCobroCliente && botonRegistrarCobro) {
        const campoComprobante = document.createElement("label");
        campoComprobante.innerHTML = 'Foto de la transferencia<input id="fotoCobroCliente" type="file" accept="image/png,image/jpeg,image/webp" required>';
        botonRegistrarCobro.before(campoComprobante);
        botonRegistrarCobro.textContent = "Registrar pago y generar factura";
    }

    const tipoCierre = document.getElementById("tipoCierreFinanzas");
    const botonGuardarCierre = document.querySelector("#formGuardarCierreFinanzas button[type=submit]");
    const actualizarBotonCierre = () => {
        if (botonGuardarCierre) botonGuardarCierre.textContent = tipoCierre?.value === "Cierre" ? "Cerrar y bloquear" : "Guardar proceso";
    };
    tipoCierre?.addEventListener("change", actualizarBotonCierre);
    actualizarBotonCierre();

    if (window.em360Permisos?.esAdministrador()) {
        const botonBorrarTodo = document.createElement("button");
        botonBorrarTodo.type = "button";
        botonBorrarTodo.id = "btnBorrarTodoFinanzas";
        botonBorrarTodo.className = "boton-peligro";
        botonBorrarTodo.textContent = "Borrar todo";
        contenedor.querySelector(".cabecera-finanzas")?.append(botonBorrarTodo);
        botonBorrarTodo.addEventListener("click", borrarTodoFinanzas);
    }

    if (bloqueoFinanciero) {
        const avisoBloqueo = document.createElement("p");
        avisoBloqueo.className = "aviso-bloqueo-finanzas";
        avisoBloqueo.innerHTML = `<strong>${escaparFinanzas(bloqueoFinanciero.tipo)} guardado:</strong> ${escaparFinanzas(bloqueoFinanciero.nombre)}. El control financiero está bloqueado y solo puede consultarse.`;
        contenedor.querySelector(".cabecera-finanzas")?.after(avisoBloqueo);
        contenedor.querySelectorAll("form input, form select, form textarea, form button, [data-eliminar-compromiso], [data-eliminar-pago], [data-eliminar-cobro], [data-eliminar-cierre], [data-crear-factura], #btnBorrarTodoFinanzas").forEach((control) => {
            control.disabled = true;
        });
    }

    const convertirEnPlegable = (elemento, titulo, abierto = false) => {
        if (!elemento) return;
        const seccion = document.createElement("details");
        seccion.className = "finanzas-plegable";
        seccion.open = abierto;
        const encabezado = document.createElement("summary");
        encabezado.textContent = titulo;
        elemento.before(seccion);
        seccion.append(encabezado, elemento);
    };

    convertirEnPlegable(contenedor.querySelector(".calculadora-finanzas"), "Pago del cliente y factura", true);
    convertirEnPlegable(resumenFinanciero, "Resumen financiero");
    convertirEnPlegable(formulariosFinancieros, "Proveedores y pagos");
    convertirEnPlegable(document.getElementById("formGuardarCierreFinanzas"), "Procesos y cierres");
    contenedor.querySelectorAll(".tabla-finanzas-wrap").forEach((tabla) => {
        convertirEnPlegable(tabla, tabla.querySelector("h4")?.textContent || "Detalle financiero");
    });
    const resumenPlegable = resumenFinanciero.closest(".finanzas-plegable");
    contenedor.querySelector(".finanzas-proyecto")?.append(resumenPlegable);
    const cobrosFacturas = Array.from(contenedor.querySelectorAll(".tabla-finanzas-wrap")).find((tabla) => tabla.querySelector("h4")?.textContent.includes("Cobros y facturas del cliente"));
    const cobrosFacturasPlegable = cobrosFacturas?.closest(".finanzas-plegable");
    if (cobrosFacturasPlegable) contenedor.querySelector(".finanzas-proyecto")?.append(cobrosFacturasPlegable);

    document.getElementById("btnActualizarFinanzas").addEventListener("click", cargarModuloFinanzas);
    document.getElementById("formMontoCliente").addEventListener("submit", guardarMontoClienteFinanzas);
    document.getElementById("formCobroCliente").addEventListener("submit", guardarCobroClienteFinanzas);
    document.getElementById("formGuardarCierreFinanzas").addEventListener("submit", guardarCierreFinanzas);
    document.getElementById("formCompromisoProveedor").addEventListener("submit", guardarCompromisoFinanzas);
    document.getElementById("formPagoProveedor")?.addEventListener("submit", guardarPagoFinanzas);
    contenedor.querySelectorAll("[data-imprimir-estado-pagos]").forEach((boton) => {
        boton.addEventListener("click", () => {
            const compromiso = compromisos.find((item) => String(item.id) === boton.dataset.imprimirEstadoPagos);
            if (compromiso) imprimirEstadoPagosProveedor(compromiso, pagos);
        });
    });
    contenedor.querySelectorAll("[data-eliminar-compromiso]").forEach((boton) => boton.addEventListener("click", eliminarCompromisoFinanzas));
    contenedor.querySelectorAll("[data-eliminar-pago]").forEach((boton) => boton.addEventListener("click", eliminarPagoFinanzas));
    contenedor.querySelectorAll("[data-eliminar-cobro]").forEach((boton) => boton.addEventListener("click", eliminarCobroClienteFinanzas));
    contenedor.querySelectorAll("[data-crear-factura]").forEach((boton) => boton.addEventListener("click", () => crearFacturaClienteFinanzas(cobrosPorId.get(boton.dataset.crearFactura))));
    contenedor.querySelectorAll("[data-ver-factura]").forEach((boton) => boton.addEventListener("click", () => mostrarFacturaClienteFinanzas(facturasPorId.get(boton.dataset.verFactura))));
    contenedor.querySelectorAll("[data-eliminar-cierre]").forEach((boton) => boton.addEventListener("click", eliminarCierreFinanzas));
}

async function guardarMontoClienteFinanzas(evento) {
    evento.preventDefault();
    const montoCliente = montoFinanzas(document.getElementById("montoClienteFinanzas").value);
    const porcentajeAnticipo = montoFinanzas(document.getElementById("porcentajeAnticipoFinanzas").value);
    if (porcentajeAnticipo < 0 || porcentajeAnticipo > 100) return alert("El anticipo debe estar entre 0% y 100%.");
    const { error } = await supabaseClient.from("FinanzasProyecto").upsert({ proyecto_id: window.proyectoActual, monto_cliente: montoCliente, porcentaje_anticipo_cliente: porcentajeAnticipo, updated_at: new Date().toISOString() }, { onConflict: "proyecto_id" });
    if (error) return alert(`No se pudo guardar el total: ${error.message}`);
    await cargarModuloFinanzas();
}

async function guardarCobroClienteFinanzas(evento) {
    evento.preventDefault();
    const monto = montoFinanzas(document.getElementById("montoCobroCliente").value);
    const fecha = document.getElementById("fechaCobroCliente").value;
    const nota = document.getElementById("notaCobroCliente").value.trim();
    const foto = document.getElementById("fotoCobroCliente")?.files[0];
    const boton = evento.currentTarget.querySelector("button[type=submit]");
    if (!monto || !fecha) return;
    if (!foto) return alert("Adjunte la foto de la transferencia para registrar el pago y generar la factura.");
    if (!foto.type.startsWith("image/")) return alert("Seleccione una imagen válida para el comprobante.");
    if (foto.size > 10 * 1024 * 1024) return alert("La foto de la transferencia no puede superar 10 MB.");
    const { data: finanzas, error: errorFinanzas } = await supabaseClient.from("FinanzasProyecto").select("monto_cliente").eq("proyecto_id", window.proyectoActual).maybeSingle();
    if (errorFinanzas) return alert(`No se pudo validar el cobro: ${errorFinanzas.message}`);
    const { data: cobros, error: errorCobros } = await supabaseClient.from("PagosClientes").select("monto").eq("proyecto_id", window.proyectoActual);
    if (errorCobros) return alert(`No se pudo validar el cobro: ${errorCobros.message}`);
    const pendiente = Math.max(0, montoFinanzas(finanzas?.monto_cliente) - (cobros || []).reduce((total, cobro) => total + montoFinanzas(cobro.monto), 0));
    if (monto > pendiente + 0.001) return alert(`El cobro supera lo pendiente del cliente: ${monedaFinanzas(pendiente)}.`);

    boton.disabled = true;
    boton.textContent = "Guardando pago...";
    let rutaArchivo = null;
    let transferenciaId = null;
    let cobroId = null;

    try {
        const nombreSeguro = foto.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        rutaArchivo = `${window.proyectoActual}/cobros-clientes/${Date.now()}_${nombreSeguro}`;
        const { error: errorSubida } = await supabaseClient.storage.from("transferencias").upload(rutaArchivo, foto, { contentType: foto.type, upsert: false });
        if (errorSubida) throw errorSubida;

        const { data: transferencia, error: errorTransferencia } = await supabaseClient.from("Transferencias").insert([{
            proyecto_id: window.proyectoActual,
            comentario: ["Cobro del cliente", nota].filter(Boolean).join(" · "),
            ruta_archivo: rutaArchivo
        }]).select("id").single();
        if (errorTransferencia) throw errorTransferencia;
        transferenciaId = transferencia.id;

        const { data: cobro, error: errorCobro } = await supabaseClient.from("PagosClientes").insert([{
            proyecto_id: window.proyectoActual,
            monto,
            fecha,
            nota: nota || null,
            transferencia_id: transferenciaId
        }]).select().single();
        if (errorCobro) throw errorCobro;
        cobroId = cobro.id;

        const resultadoFactura = await crearFacturaClienteFinanzas(cobro, false);
        if (resultadoFactura?.error) throw resultadoFactura.error;

        await cargarModuloFinanzas();
        if (resultadoFactura?.data) mostrarFacturaClienteFinanzas(resultadoFactura.data);
    } catch (error) {
        if (cobroId) await supabaseClient.from("PagosClientes").delete().eq("id", cobroId);
        if (transferenciaId) await supabaseClient.from("Transferencias").delete().eq("id", transferenciaId);
        if (rutaArchivo) await supabaseClient.storage.from("transferencias").remove([rutaArchivo]);
        console.error("No se pudo registrar el pago del cliente:", error);
        alert(`No se pudo registrar el pago y generar la factura: ${error.message}`);
    } finally {
        boton.disabled = false;
        boton.textContent = "Registrar pago y generar factura";
    }
}

async function crearFacturaClienteFinanzas(cobro, recargar = true) {
    if (!cobro?.id) return null;
    const { data: proyecto, error: errorProyecto } = await supabaseClient.from("Proyectos").select("nombre, cliente").eq("id", window.proyectoActual).single();
    if (errorProyecto) return { error: errorProyecto };
    const { data: facturaExistente } = await supabaseClient.from("FacturasClientes").select("id, pago_cliente_id, numero, cliente, proyecto, concepto, monto, fecha, emitido_por, created_at").eq("pago_cliente_id", cobro.id).maybeSingle();
    if (facturaExistente) {
        if (recargar) mostrarFacturaClienteFinanzas(facturaExistente);
        return { data: facturaExistente };
    }
    const { data, error } = await supabaseClient.from("FacturasClientes").insert([{
        pago_cliente_id: cobro.id,
        proyecto_id: window.proyectoActual,
        cliente: proyecto.cliente || "Cliente",
        proyecto: proyecto.nombre || "Proyecto",
        concepto: cobro.nota || "Pago recibido",
        monto: cobro.monto,
        fecha: cobro.fecha,
        emitido_por: window.em360Permisos?.obtenerSesion()?.nombre || "Estudio Modular"
    }]).select().single();
    if (!error && recargar) {
        await cargarModuloFinanzas();
        mostrarFacturaClienteFinanzas(data);
    }
    return { data, error };
}

function mostrarFacturaClienteFinanzas(factura) {
    if (!factura) return;
    const ventana = window.open("", "_blank");
    if (!ventana) return alert("El navegador bloqueó la factura. Permita las ventanas emergentes e intente de nuevo.");
    const fecha = new Intl.DateTimeFormat("es-DO", { dateStyle: "long" }).format(new Date(`${factura.fecha}T12:00:00`));
    ventana.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Factura ${escaparFinanzas(factura.numero)}</title><style>body{font-family:Arial,sans-serif;color:#17312f;max-width:850px;margin:42px auto;padding:0 28px}.marca{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:4px solid #0e5a56;padding-bottom:24px}.marca h1{margin:0;color:#083d3b;font-size:30px}.marca p{margin:6px 0;color:#52636a}.numero{padding:11px 14px;border-radius:8px;background:#eef7f6;color:#083d3b;font-weight:800}.datos{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:30px 0}.datos section{padding:17px;background:#f5f9f8;border-radius:9px}.datos h3{margin:0 0 8px;color:#0e5a56;font-size:13px;text-transform:uppercase}.datos p{margin:5px 0}.detalle{width:100%;border-collapse:collapse;margin:28px 0}.detalle th{background:#083d3b;color:#fff;text-align:left;padding:12px}.detalle td{padding:14px;border-bottom:1px solid #d7e5e3}.total{text-align:right;font-size:22px;font-weight:800;color:#083d3b}.pie{margin-top:65px;padding-top:16px;border-top:1px solid #d7e5e3;color:#64748b;font-size:13px}@media print{body{margin:0;max-width:none}}</style></head><body><div class="marca"><div><h1>Estudio Modular</h1><p>Factura de cobro</p></div><div class="numero">${escaparFinanzas(factura.numero)}</div></div><div class="datos"><section><h3>Facturar a</h3><p><strong>${escaparFinanzas(factura.cliente)}</strong></p><p>Proyecto: ${escaparFinanzas(factura.proyecto)}</p></section><section><h3>Datos de emisión</h3><p>Fecha: ${escaparFinanzas(fecha)}</p><p>Emitida por: ${escaparFinanzas(factura.emitido_por || "Estudio Modular")}</p></section></div><table class="detalle"><thead><tr><th>Descripción</th><th>Monto</th></tr></thead><tbody><tr><td>${escaparFinanzas(factura.concepto || "Pago recibido")}</td><td>${monedaFinanzas(factura.monto)}</td></tr></tbody></table><p class="total">Total recibido: ${monedaFinanzas(factura.monto)}</p><p class="pie">Factura generada desde EM360™.</p><script>window.onload=()=>setTimeout(()=>window.print(),250);</script></body></html>`);
    ventana.document.close();
}

async function guardarCierreFinanzas(evento) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const nombre = document.getElementById("nombreCierreFinanzas").value.trim();
    const tipo = document.getElementById("tipoCierreFinanzas").value;
    const notas = document.getElementById("notasCierreFinanzas").value.trim();
    const resumen = JSON.parse(decodeURIComponent(formulario.dataset.resumen));
    if (tipo === "Cierre" && (montoFinanzas(resumen.pendiente_cliente) > 0.001 || montoFinanzas(resumen.pendiente_proveedores) > 0.001)) {
        alert("No se puede guardar el cierre final mientras haya dinero pendiente del cliente o de los proveedores. Guarde un Proceso para conservar el avance.");
        return;
    }

    if (tipo === "Proceso") {
        const { error } = await supabaseClient.from("CierresFinancieros").insert([{
            proyecto_id: window.proyectoActual,
            nombre,
            tipo,
            notas: notas || null,
            resumen,
            creado_por: window.em360Permisos?.obtenerSesion()?.nombre || "Usuario autorizado"
        }]);
        if (error) return alert(`No se pudo guardar el proceso: ${error.message}`);
        alert("Proceso guardado. Puede continuar trabajando en el control financiero.");
        await cargarModuloFinanzas();
        return;
    }

    const { error } = await supabaseClient.rpc("bloquear_finanzas_proyecto", {
        p_proyecto_id: window.proyectoActual,
        p_nombre: nombre,
        p_tipo: tipo,
        p_notas: notas,
        p_bloqueado_por: window.em360Permisos?.obtenerSesion()?.nombre || "Usuario autorizado"
    });
    if (error) return alert(`No se pudo guardar y bloquear el control financiero: ${error.message}`);
    await cargarModuloFinanzas();
}

async function guardarCompromisoFinanzas(evento) {
    evento.preventDefault();
    const proveedor = document.getElementById("proveedorFinanzas").value.trim();
    const concepto = document.getElementById("conceptoFinanzas").value.trim();
    const montoAcordado = montoFinanzas(document.getElementById("montoAcordadoFinanzas").value);
    const { error } = await supabaseClient.from("CompromisosProveedores").insert([{ proyecto_id: window.proyectoActual, proveedor, concepto: concepto || null, monto_acordado: montoAcordado }]);
    if (error) return alert(`No se pudo guardar el proveedor: ${error.message}`);
    await cargarModuloFinanzas();
}

async function guardarPagoFinanzas(evento) {
    evento.preventDefault();
    if (!window.em360Permisos?.esAdministrador()) return alert("Solo el Administrador puede registrar pagos a proveedores.");
    const compromisoId = Number(document.getElementById("compromisoPagoFinanzas").value);
    const monto = montoFinanzas(document.getElementById("montoPagoFinanzas").value);
    const fecha = document.getElementById("fechaPagoFinanzas").value;
    const nota = document.getElementById("notaPagoFinanzas").value.trim();
    const archivo = document.getElementById("comprobantePagoFinanzas").files[0];
    const boton = evento.currentTarget.querySelector("button[type=submit]");
    const pendiente = montoFinanzas(document.querySelector("#compromisoPagoFinanzas option:checked")?.dataset.pendiente);
    if (!compromisoId || !monto || !fecha || !archivo) return;
    const tiposPermitidos = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
    if (!tiposPermitidos.includes(archivo.type)) return alert("Adjunte el bauche en PDF, PNG, JPG o WEBP.");
    if (archivo.size > 10 * 1024 * 1024) return alert("El bauche no puede superar 10 MB.");
    if (monto > pendiente + 0.001) {
        alert(`El pago supera el saldo pendiente de ${monedaFinanzas(pendiente)}.`);
        return;
    }
    boton.disabled = true;
    boton.textContent = "Guardando pago...";
    let rutaComprobante = "";
    let comprobanteSubido = false;
    try {
        const nombreSeguro = archivo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        rutaComprobante = `${window.proyectoActual}/pagos-proveedores/${compromisoId}/${Date.now()}_${nombreSeguro}`;
        const { error: errorArchivo } = await supabaseClient.storage.from("pagos-proveedores").upload(rutaComprobante, archivo, {
            contentType: archivo.type,
            upsert: false
        });
        if (errorArchivo) throw errorArchivo;
        comprobanteSubido = true;

        const { error } = await supabaseClient.from("PagosProveedores").insert([{
            compromiso_id: compromisoId,
            monto,
            fecha,
            nota: nota || null,
            comprobante_ruta: rutaComprobante,
            registrado_por: window.em360Permisos?.obtenerSesion()?.nombre || "Usuario autorizado"
        }]);
        if (error) throw error;
        await cargarModuloFinanzas();
    } catch (error) {
        if (comprobanteSubido) await supabaseClient.storage.from("pagos-proveedores").remove([rutaComprobante]);
        alert(`No se pudo registrar el pago: ${error.message}`);
    } finally {
        boton.disabled = false;
        boton.textContent = "Registrar pago";
    }
}

async function imprimirEstadoPagosProveedor(compromiso, todosLosPagos) {
    if (!window.em360Permisos?.esAdministrador()) return alert("Solo el Administrador puede generar estados de pago.");

    const pagos = todosLosPagos
        .filter((pago) => pago.compromiso_id === compromiso.id)
        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha) || new Date(a.created_at) - new Date(b.created_at));
    if (!pagos.length) return alert("Este proveedor aún no tiene pagos registrados.");

    const ventana = window.open("", "_blank", "width=1000,height=800");
    if (!ventana) return alert("El navegador bloqueó la hoja. Permita las ventanas emergentes e inténtelo de nuevo.");
    ventana.document.write("<!doctype html><html lang=\"es\"><head><meta charset=\"utf-8\"><title>Estado de pagos</title></head><body>Preparando estado de pagos...</body></html>");

    try {
        const [{ data: proyecto, error: errorProyecto }, comprobantes] = await Promise.all([
            supabaseClient.from("Proyectos").select("nombre, cliente, ubicacion").eq("id", window.proyectoActual).single(),
            Promise.all(pagos.map(async (pago) => {
                if (!pago.comprobante_ruta) return [pago.id, ""];
                const { data, error } = await supabaseClient.storage.from("pagos-proveedores").createSignedUrl(pago.comprobante_ruta, 3600);
                return [pago.id, error ? "" : data.signedUrl];
            }))
        ]);
        if (errorProyecto) throw errorProyecto;

        const enlaces = new Map(comprobantes);
        const totalAcordado = montoFinanzas(compromiso.monto_acordado);
        const totalPagado = pagos.reduce((total, pago) => total + montoFinanzas(pago.monto), 0);
        const pendiente = Math.max(0, totalAcordado - totalPagado);
        const fechaEmision = new Intl.DateTimeFormat("es-DO", { dateStyle: "long" }).format(new Date());
        const filas = pagos.map((pago) => {
            const url = enlaces.get(pago.id);
            const nombreArchivo = pago.comprobante_ruta?.split("/").pop() || "Bauche registrado";
            const contenidoBauche = url && /\.(png|jpe?g|webp)$/i.test(nombreArchivo)
                ? `<a href="${escaparFinanzas(url)}"><img src="${escaparFinanzas(url)}" alt="Bauche del pago"></a>`
                : url ? `<a href="${escaparFinanzas(url)}">${escaparFinanzas(nombreArchivo)}</a>` : escaparFinanzas(nombreArchivo);
            const fechaPago = new Intl.DateTimeFormat("es-DO", { dateStyle: "medium" }).format(new Date(`${pago.fecha}T12:00:00`));
            return `<tr><td>${escaparFinanzas(fechaPago)}</td><td>${escaparFinanzas(pago.nota || "Pago registrado")}</td><td>${monedaFinanzas(pago.monto)}</td><td>${escaparFinanzas(pago.registrado_por || "—")}</td><td class="bauche">${contenidoBauche}</td></tr>`;
        }).join("");
        const logo = escaparFinanzas(new URL("assets/estudio-modular-logo-verde-transparente.png", window.location.href).href);

        ventana.document.open();
        ventana.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Estado de pagos · ${escaparFinanzas(compromiso.proveedor)}</title><style>
            *{box-sizing:border-box}body{margin:32px auto;padding:0 28px;max-width:1000px;color:#243533;font:14px/1.45 Arial,sans-serif}.marca{display:flex;align-items:center;justify-content:space-between;gap:20px;border-bottom:3px solid #08766f;padding-bottom:18px}.marca img{width:190px;max-height:75px;object-fit:contain}.marca h1{margin:12px 0 0;color:#075d57;font-size:25px}.emision{text-align:right;color:#687675}.emision p{margin:5px 0}.datos{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:22px 0}.dato{padding:13px 15px;border:1px solid #d6e2df;border-radius:6px}.dato span{display:block;color:#687675;font-size:11px;text-transform:uppercase}.dato strong{display:block;margin-top:5px;font-size:15px}.resumen{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:18px 0 26px}.resumen section{padding:14px;border:1px solid #d6e2df;border-top:3px solid #08766f}.resumen span{display:block;color:#687675}.resumen strong{display:block;margin-top:5px;font-size:19px}.resumen .pendiente{border-top-color:#d89012}.tabla{width:100%;border-collapse:collapse}.tabla th{padding:10px;background:#075d57;color:#fff;text-align:left}.tabla td{padding:10px;border-bottom:1px solid #d6e2df;vertical-align:top}.bauche img{display:block;max-width:145px;max-height:105px;object-fit:contain}.pie{margin-top:30px;padding-top:12px;border-top:1px solid #d6e2df;color:#687675;font-size:11px}.firmas{display:grid;grid-template-columns:1fr 1fr;gap:70px;margin:56px 12px 0}.firmas div{padding-top:8px;border-top:1px solid #899795;text-align:center;color:#687675}@page{size:A4;margin:14mm}@media print{body{margin:0;max-width:none;padding:0}a{color:inherit;text-decoration:none}tr{break-inside:avoid}}
        </style></head><body><header class="marca"><div><img src="${logo}" alt="Estudio Modular"><h1>Estado de pagos al proveedor</h1></div><div class="emision">Documento generado<br>${escaparFinanzas(fechaEmision)}<p>Proyecto EM360™</p></div></header><section class="datos"><div class="dato"><span>Trabajo / proyecto</span><strong>${escaparFinanzas(proyecto.nombre)}</strong></div><div class="dato"><span>Cliente</span><strong>${escaparFinanzas(proyecto.cliente || "—")}</strong></div><div class="dato"><span>Proveedor</span><strong>${escaparFinanzas(compromiso.proveedor)}</strong></div><div class="dato"><span>Concepto</span><strong>${escaparFinanzas(compromiso.concepto || "Servicios del proyecto")}</strong></div><div class="dato"><span>Ubicación del trabajo</span><strong>${escaparFinanzas(proyecto.ubicacion || "—")}</strong></div><div class="dato"><span>Movimientos incluidos</span><strong>${pagos.length}</strong></div></section><section class="resumen"><section><span>Total acordado</span><strong>${monedaFinanzas(totalAcordado)}</strong></section><section><span>Total pagado</span><strong>${monedaFinanzas(totalPagado)}</strong></section><section class="pendiente"><span>Saldo pendiente</span><strong>${monedaFinanzas(pendiente)}</strong></section></section><h2>Detalle de pagos</h2><table class="tabla"><thead><tr><th>Fecha</th><th>Detalle</th><th>Monto</th><th>Registrado por</th><th>Bauche</th></tr></thead><tbody>${filas}</tbody></table><footer class="pie">Estado de cuenta interno generado desde los pagos registrados para este trabajo. Los bauches de imagen se incluyen en la impresión; los bauches PDF pueden abrirse desde el enlace antes de imprimir.</footer><section class="firmas"><div>Preparado por Estudio Modular</div><div>Recibido por el proveedor</div></section></body></html>`);
        ventana.document.close();
        await Promise.all(Array.from(ventana.document.images).map((imagen) => imagen.complete
            ? Promise.resolve()
            : new Promise((resolve) => { imagen.onload = resolve; imagen.onerror = resolve; })));
        ventana.focus();
        ventana.print();
    } catch (error) {
        ventana.close();
        alert(`No se pudo preparar el estado de pagos: ${error.message}`);
    }
}

async function eliminarCompromisoFinanzas(evento) {
    if (!confirm("¿Eliminar este proveedor y todos sus pagos registrados?")) return;
    const { error } = await supabaseClient.from("CompromisosProveedores").delete().eq("id", evento.currentTarget.dataset.eliminarCompromiso);
    if (error) return alert(`No se pudo eliminar: ${error.message}`);
    await cargarModuloFinanzas();
}

async function eliminarPagoFinanzas(evento) {
    if (!window.em360Permisos?.esAdministrador()) return alert("Solo el Administrador puede eliminar pagos a proveedores.");
    if (!confirm("¿Eliminar este pago?")) return;
    const idPago = evento.currentTarget.dataset.eliminarPago;
    const { data: pago, error: errorConsulta } = await supabaseClient.from("PagosProveedores").select("comprobante_ruta").eq("id", idPago).single();
    if (errorConsulta) return alert(`No se pudo consultar el pago: ${errorConsulta.message}`);
    const { error } = await supabaseClient.from("PagosProveedores").delete().eq("id", idPago);
    if (error) return alert(`No se pudo eliminar: ${error.message}`);
    if (pago.comprobante_ruta) {
        const { error: errorArchivo } = await supabaseClient.storage.from("pagos-proveedores").remove([pago.comprobante_ruta]);
        if (errorArchivo) console.error("No se pudo eliminar el bauche del pago:", errorArchivo);
    }
    await cargarModuloFinanzas();
}

async function eliminarCobroClienteFinanzas(evento) {
    if (!confirm("¿Eliminar este cobro del cliente?")) return;
    const { error } = await supabaseClient.from("PagosClientes").delete().eq("id", evento.currentTarget.dataset.eliminarCobro);
    if (error) return alert(`No se pudo eliminar: ${error.message}`);
    await cargarModuloFinanzas();
}

async function eliminarCierreFinanzas(evento) {
    if (!confirm("¿Eliminar este proceso o cierre guardado?")) return;
    const { error } = await supabaseClient.from("CierresFinancieros").delete().eq("id", evento.currentTarget.dataset.eliminarCierre);
    if (error) return alert(`No se pudo eliminar: ${error.message}`);
    await cargarModuloFinanzas();
}

async function borrarTodoFinanzas() {
    if (!window.em360Permisos?.esAdministrador()) {
        alert("Solo el Administrador puede borrar toda la información financiera.");
        return;
    }

    const confirmacion = prompt("Esta acción eliminará todo el acuerdo, cobros, facturas, proveedores, pagos y cierres del proyecto. Escriba BORRAR para continuar.");
    if (confirmacion !== "BORRAR") return;

    const { error } = await supabaseClient.rpc("borrar_finanzas_proyecto", {
        p_proyecto_id: window.proyectoActual
    });
    if (error) return alert(`No se pudo borrar la información financiera: ${error.message}`);
    await cargarModuloFinanzas();
}

window.cargarModuloFinanzas = cargarModuloFinanzas;
