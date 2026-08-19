/* Cotización interna y plan de trabajo por proyecto */

const TIPO_COTIZACION_INTERNA = "CotizacionInterna";
const TIPO_PLAN_TRABAJO = "PlanTrabajo";
const LOGO_DOCUMENTO_PROYECTO = "assets/estudio-modular-logo-verde-transparente.png";
const PLANTILLAS_PLAN_TRABAJO = {
    ebanisteria: { nombre: "Ebanistería", descripcion: "Mobiliario, puertas y trabajos en madera.", actividades: ["Confirmar medidas en obra", "Preparar diseño y despiece", "Comprar y recibir materiales", "Fabricar piezas", "Aplicar terminación", "Instalar y ajustar", "Entregar trabajos"] },
    marmoleros: { nombre: "Mármol y topes", descripcion: "Topes, revestimientos y acabados en piedra.", actividades: ["Tomar medidas y plantillas", "Confirmar material y veta", "Cortar piezas", "Preparar cantos y perforaciones", "Transportar piezas", "Instalar y nivelar", "Sellar y entregar"] },
    sheetrockeros: { nombre: "Sheetrock", descripcion: "Muros, plafones y acabados en sheetrock.", actividades: ["Replantear áreas", "Instalar estructura", "Coordinar instalaciones internas", "Colocar paneles", "Encintar juntas", "Lijar y corregir", "Entregar listo para pintura"] },
    plomeros: { nombre: "Plomería", descripcion: "Instalaciones sanitarias, agua y desagües.", actividades: ["Replantear puntos sanitarios", "Instalar tuberías", "Realizar prueba de presión", "Instalar desagües", "Colocar aparatos y grifería", "Probar funcionamiento", "Entregar instalación"] },
    electricistas: { nombre: "Electricidad", descripcion: "Canalizaciones, cableado y equipos eléctricos.", actividades: ["Replantear puntos eléctricos", "Instalar canalizaciones", "Tender cableado", "Instalar tablero y protecciones", "Colocar luminarias y tomas", "Realizar pruebas", "Entregar instalación"] },
    piseros: { nombre: "Pisos", descripcion: "Revestimientos, pisos y terminaciones.", actividades: ["Revisar y preparar superficie", "Trazar modulación", "Cortar piezas", "Instalar revestimiento", "Aplicar juntas o fragua", "Limpiar y corregir", "Entregar área"] },
    pintores: { nombre: "Pintura", descripcion: "Preparación, pintura y protección de superficies.", actividades: ["Revisar superficies y proteger el área", "Remover pintura deteriorada", "Reparar imperfecciones con relleno", "Lijar y limpiar superficies", "Aplicar base o imprimación", "Aplicar primera mano de pintura", "Aplicar segunda mano y retoques", "Aplicar laca transparente de protección si corresponde", "Inspeccionar, limpiar y entregar"] }
};
let tipoPlanTrabajoActual = TIPO_PLAN_TRABAJO;
let plantillaPlanTrabajoActual = null;
const DETALLES_POR_ESPECIALIDAD = {
    ebanisteria: { titulo: "Especificaciones de ebanistería", campos: [["areas", "Elementos y áreas", "Ej.: Gabinetes, puertas, closet y marcos."], ["materiales", "Madera, tableros y herrajes", "Ej.: MDF RH, melamina, bisagras y correderas."], ["acabado", "Color y acabado", "Ej.: Roble claro mate, pintura o laca."], ["medidas", "Medidas y detalles críticos", "Incluya espesores, aperturas y tolerancias."], ["calidad", "Control de calidad", "Alineación, nivelación, herrajes y acabado uniforme."]] },
    marmoleros: { titulo: "Especificaciones de mármol y topes", campos: [["areas", "Elementos y áreas", "Ej.: Tope de cocina, isla, backsplash y baños."], ["material", "Piedra, color y acabado", "Ej.: Cuarzo blanco, granito o mármol pulido."], ["medidas", "Espesor, cantos y perforaciones", "Indique espesor, tipo de canto, fregadero y grifería."], ["instalacion", "Juntas, sellado e instalación", "Defina uniones, siliconado y soportes."], ["calidad", "Control de calidad", "Nivelación, vetas, cortes limpios y sellado."]] },
    sheetrockeros: { titulo: "Especificaciones de sheetrock", campos: [["areas", "Muros, plafones y áreas", "Ej.: Plafón de sala, divisiones y cajillos."], ["sistema", "Estructura y sistema", "Ej.: Canales, parales, calibre y separación."], ["paneles", "Paneles y aislamiento", "Indique tipo, espesor, resistencia a humedad y aislante."], ["terminacion", "Juntas y terminación", "Encintado, masilla, lijado y nivel de acabado."], ["calidad", "Control de calidad", "Plomos, niveles, juntas invisibles y preparación para pintura."]] },
    plomeros: { titulo: "Especificaciones de plomería", campos: [["areas", "Puntos y áreas de trabajo", "Ej.: Cocina, baños, lavandería y calentador."], ["materiales", "Tuberías y materiales", "Ej.: PPR, PVC, CPVC, válvulas y accesorios."], ["aparatos", "Aparatos y griferías", "Indique lavamanos, inodoros, fregadero y mezcladoras."], ["pruebas", "Pruebas requeridas", "Presión, desagüe, fugas y funcionamiento."], ["calidad", "Control de calidad", "Pendientes, sellos, accesos y pruebas aprobadas."]] },
    electricistas: { titulo: "Especificaciones de electricidad", campos: [["areas", "Circuitos y áreas", "Ej.: Cocina, habitaciones, iluminación exterior y A/C."], ["materiales", "Canalizaciones, cables y protecciones", "Indique calibre, tubería, breakers y tablero."], ["equipos", "Luminarias, tomas y equipos", "Detalle interruptores, tomas, luminarias y cargas especiales."], ["pruebas", "Pruebas y seguridad", "Continuidad, polaridad, tierra y protecciones."], ["calidad", "Control de calidad", "Etiquetado, funcionamiento y cumplimiento de seguridad."]] },
    piseros: { titulo: "Especificaciones de pisos", campos: [["areas", "Áreas a revestir", "Ej.: Sala, cocina, baños, terraza y zócalos."], ["material", "Piso, formato y acabado", "Ej.: Porcelanato 60x60, cerámica o revestimiento."], ["base", "Base y nivelación", "Estado de contrapiso, pendiente y correcciones."], ["juntas", "Modulación, cortes y juntas", "Dirección de piezas, fragua, perfiles y remates."], ["calidad", "Control de calidad", "Nivel, alineación, juntas uniformes y piezas sin huecos."]] }
};

function escaparDocumentoProyecto(valor) {
    const elemento = document.createElement("div");
    elemento.textContent = valor ?? "";
    return elemento.innerHTML;
}

function fechaHoyDocumento() {
    return new Date().toISOString().slice(0, 10);
}

function puedeEditarDocumentosProyecto() {
    return Boolean(window.em360Permisos?.esAdministrador() || window.em360Permisos?.esOficial());
}

async function obtenerProyectoDocumento() {
    const { data, error } = await supabaseClient
        .from("Proyectos")
        .select("id, nombre, cliente, ubicacion")
        .eq("id", window.proyectoActual)
        .single();
    if (error) throw error;
    return data;
}

async function obtenerDocumentoProyecto(tipo) {
    const { data, error } = await supabaseClient
        .from("DocumentosProyecto")
        .select("id, titulo, contenido, updated_at")
        .eq("proyecto_id", window.proyectoActual)
        .eq("tipo", tipo)
        .maybeSingle();
    if (error) throw error;
    return data;
}

function campoTextoDocumento(id, etiqueta, valor = "", opciones = {}) {
    const tipo = opciones.tipo || "text";
    const readonly = opciones.readonly ? "readonly" : "";
    return `<label>${etiqueta}<input id="${id}" type="${tipo}" value="${escaparDocumentoProyecto(valor)}" ${readonly}></label>`;
}

function agregarMarcaDocumento() {
    const cabecera = document.querySelector(".cabecera-documento-proyecto");
    if (!cabecera || cabecera.querySelector(".marca-documento-proyecto")) return;
    cabecera.insertAdjacentHTML("afterbegin", `<div class="marca-documento-proyecto"><img src="${LOGO_DOCUMENTO_PROYECTO}" alt="Estudio Modular"></div>`);
}

function filaCotizacion(item = {}) {
    return `<tr>
        <td><input class="cot-descripcion" value="${escaparDocumentoProyecto(item.descripcion)}" placeholder="Descripción"></td>
        <td><input class="cot-cantidad" type="number" min="0" step="0.01" value="${escaparDocumentoProyecto(item.cantidad ?? 1)}"></td>
        <td><input class="cot-precio" type="number" min="0" step="0.01" value="${escaparDocumentoProyecto(item.precio ?? 0)}"></td>
        <td class="cot-subtotal">RD$ 0.00</td>
        <td><button type="button" class="boton-icono" data-quitar-fila title="Quitar partida">×</button></td>
    </tr>`;
}

function filaActividad(item = {}) {
    const estados = ["Pendiente", "En proceso", "Completada"];
    return `<tr>
        <td><input class="plan-actividad" value="${escaparDocumentoProyecto(item.actividad)}" placeholder="Actividad"></td>
        <td><input class="plan-responsable" value="${escaparDocumentoProyecto(item.responsable)}" placeholder="Responsable"></td>
        <td><input class="plan-inicio" type="date" value="${escaparDocumentoProyecto(item.inicio)}"></td>
        <td><input class="plan-fin" type="date" value="${escaparDocumentoProyecto(item.fin)}"></td>
        <td><select class="plan-estado">${estados.map((estado) => `<option ${item.estado === estado ? "selected" : ""}>${estado}</option>`).join("")}</select></td>
        <td><button type="button" class="boton-icono" data-quitar-fila title="Quitar actividad">×</button></td>
    </tr>`;
}

function cronogramaPlanBase() {
    return [
        { etapa: "Logística", ebanisteria: 1, topes: 1, sheetrock: 1 },
        { etapa: "Elaboración", ebanisteria: 7, topes: 7, sheetrock: 7 },
        { etapa: "Instalación", ebanisteria: 7, topes: 7, sheetrock: 7 },
        { etapa: "Instalación / ajuste", ebanisteria: 7, topes: 7, sheetrock: 7 },
        { etapa: "Terminación", ebanisteria: 7, topes: 7, sheetrock: 7 }
    ];
}

function filaCronogramaPlan(item = {}) {
    return `<tr>
        <td><strong>${escaparDocumentoProyecto(item.etapa)}</strong></td>
        <td><input class="dias-ebanisteria" type="number" min="0" step="1" value="${escaparDocumentoProyecto(item.ebanisteria ?? 0)}"></td>
        <td><input class="dias-topes" type="number" min="0" step="1" value="${escaparDocumentoProyecto(item.topes ?? 0)}"></td>
        <td><input class="dias-sheetrock" type="number" min="0" step="1" value="${escaparDocumentoProyecto(item.sheetrock ?? 0)}"></td>
    </tr>`;
}

async function mostrarCotizacionInterna() { await cargarDocumentoProyecto(TIPO_COTIZACION_INTERNA); }
async function mostrarPlanTrabajo() {
    const contenedor = document.getElementById("contenidoExpediente");
    if (!contenedor || !window.proyectoActual) return;
    contenedor.innerHTML = "<p>Cargando plantillas...</p>";
    try {
        const proyecto = await obtenerProyectoDocumento();
        renderizarSelectorPlanTrabajo(contenedor, proyecto);
    } catch (error) {
        contenedor.innerHTML = `<p>No se pudieron cargar las plantillas: ${escaparDocumentoProyecto(error.message)}</p>`;
    }
}

function plantillaDetallesPintura(contenido = {}) {
    const pintura = contenido.pintura || {};
    return `<section class="cronograma-especialidades"><div><h4>Especificaciones de pintura</h4><p>Defina el sistema de preparación, acabado y control de calidad antes de iniciar.</p></div><div class="datos-documento-proyecto"><label>Áreas o elementos a pintar<textarea id="pinturaAreas" placeholder="Ej.: Gabinetes de cocina, puertas de closet y marcos.">${escaparDocumentoProyecto(pintura.areas)}</textarea></label><label>Superficie y condición actual<textarea id="pinturaSuperficie" placeholder="Ej.: Madera pintada, con rayones y pintura levantada.">${escaparDocumentoProyecto(pintura.superficie)}</textarea></label><label>Color y acabado<input id="pinturaColor" value="${escaparDocumentoProyecto(pintura.color)}" placeholder="Ej.: Blanco satinado"></label><label>Número de manos<input id="pinturaCapas" type="number" min="1" step="1" value="${escaparDocumentoProyecto(pintura.capas || 2)}"></label><label>Herramientas y equipos<textarea id="pinturaHerramientas" placeholder="Ej.: Compresor, pistola, rodillos, lijadora y brochas.">${escaparDocumentoProyecto(pintura.herramientas)}</textarea></label><label>Materiales y sistema<textarea id="pinturaMateriales" placeholder="Ej.: Relleno, lija, base, pintura y laca transparente.">${escaparDocumentoProyecto(pintura.materiales)}</textarea></label></div><label class="campo-ancho">Protección y control de calidad<textarea id="pinturaCalidad" placeholder="Proteja pisos, herrajes y áreas adyacentes. Confirme uniformidad de color, cobertura y ausencia de escurrimientos.">${escaparDocumentoProyecto(pintura.calidad)}</textarea></label></section>`;
}

function obtenerDetallesPintura() {
    const valor = (id) => document.getElementById(id)?.value.trim() || "";
    return { areas: valor("pinturaAreas"), superficie: valor("pinturaSuperficie"), color: valor("pinturaColor"), capas: Number(document.getElementById("pinturaCapas")?.value) || 0, herramientas: valor("pinturaHerramientas"), materiales: valor("pinturaMateriales"), calidad: valor("pinturaCalidad") };
}

function plantillaDetallesEspecialidad(plantilla, contenido = {}) {
    if (plantilla?.codigo === "pintores") return plantillaDetallesPintura(contenido);
    const configuracion = DETALLES_POR_ESPECIALIDAD[plantilla?.codigo];
    if (!configuracion) return "";
    const detalles = contenido.detalles_especialidad || {};
    const campos = configuracion.campos.map(([id, etiqueta, placeholder]) => `<label>${etiqueta}<textarea id="detalleEspecialidad_${id}" placeholder="${escaparDocumentoProyecto(placeholder)}">${escaparDocumentoProyecto(detalles[id])}</textarea></label>`).join("");
    return `<section class="cronograma-especialidades"><div><h4>${escaparDocumentoProyecto(configuracion.titulo)}</h4><p>Complete estos datos para coordinar, ejecutar y revisar esta especialidad.</p></div><div class="datos-documento-proyecto">${campos}</div></section>`;
}

function obtenerDetallesEspecialidad(plantilla) {
    if (!plantilla) return null;
    if (plantilla.codigo === "pintores") return obtenerDetallesPintura();
    const configuracion = DETALLES_POR_ESPECIALIDAD[plantilla.codigo];
    if (!configuracion) return null;
    return Object.fromEntries(configuracion.campos.map(([id]) => [id, document.getElementById(`detalleEspecialidad_${id}`)?.value.trim() || ""]));
}

function resumenDetallesEspecialidad(plantilla) {
    if (!plantilla || plantilla.codigo === "pintores") return "";
    const configuracion = DETALLES_POR_ESPECIALIDAD[plantilla.codigo];
    const detalles = obtenerDetallesEspecialidad(plantilla);
    if (!configuracion || !detalles) return "";
    return `<h4>${escaparImpresion(configuracion.titulo)}</h4><div class="meta">${configuracion.campos.map(([id, etiqueta]) => `<b>${escaparImpresion(etiqueta)}:</b> ${escaparImpresion(detalles[id]) || "—"}`).join("<br>")}</div>`;
}

function renderizarSelectorPlanTrabajo(contenedor, proyecto) {
    contenedor.innerHTML = `<section class="documento-proyecto"><div class="cabecera-documento-proyecto"><div><p class="etiqueta-documento">ESTUDIO MODULAR · EM360™</p><h3>Planes de trabajo por especialidad</h3><p>Seleccione la plantilla que desea preparar para ${escaparDocumentoProyecto(proyecto.nombre)}. Cada especialidad se guarda por separado.</p></div></div><div class="grid-especialidades-proveedores"><button type="button" class="especialidad-proveedor" data-plan-especialidad=""><h3>Plan general</h3><p>Plan global del proyecto.</p><span>Abrir plantilla</span></button>${Object.entries(PLANTILLAS_PLAN_TRABAJO).map(([codigo, plantilla]) => `<button type="button" class="especialidad-proveedor" data-plan-especialidad="${codigo}"><h3>${escaparDocumentoProyecto(plantilla.nombre)}</h3><p>${escaparDocumentoProyecto(plantilla.descripcion)}</p><span>Abrir plantilla</span></button>`).join("")}</div></section>`;
    contenedor.querySelectorAll("[data-plan-especialidad]").forEach((boton) => boton.addEventListener("click", () => cargarPlanTrabajoPorEspecialidad(boton.dataset.planEspecialidad)));
}

async function cargarPlanTrabajoPorEspecialidad(codigo = "") {
    const contenedor = document.getElementById("contenidoExpediente");
    if (!contenedor || !window.proyectoActual) return;
    const plantilla = codigo ? PLANTILLAS_PLAN_TRABAJO[codigo] : null;
    const tipo = plantilla ? `${TIPO_PLAN_TRABAJO}_${codigo}` : TIPO_PLAN_TRABAJO;
    contenedor.innerHTML = "<p>Cargando plan de trabajo...</p>";
    try {
        const [proyecto, documento] = await Promise.all([obtenerProyectoDocumento(), obtenerDocumentoProyecto(tipo)]);
        tipoPlanTrabajoActual = tipo;
        plantillaPlanTrabajoActual = plantilla ? { codigo, ...plantilla } : null;
        renderizarPlanTrabajo(contenedor, proyecto, documento, plantillaPlanTrabajoActual);
    } catch (error) {
        contenedor.innerHTML = `<p>No se pudo cargar el plan: ${escaparDocumentoProyecto(error.message)}</p>`;
    }
}

async function cargarDocumentoProyecto(tipo) {
    const contenedor = document.getElementById("contenidoExpediente");
    if (!contenedor || !window.proyectoActual) return;
    contenedor.innerHTML = "<p>Cargando documento...</p>";
    try {
        const [proyecto, documento] = await Promise.all([obtenerProyectoDocumento(), obtenerDocumentoProyecto(tipo)]);
        if (tipo === TIPO_COTIZACION_INTERNA) renderizarCotizacionInterna(contenedor, proyecto, documento);
        else renderizarPlanTrabajo(contenedor, proyecto, documento);
    } catch (error) {
        console.error("No se pudo cargar el documento del proyecto:", error);
        contenedor.innerHTML = `<p>No se pudo cargar el documento: ${escaparDocumentoProyecto(error.message)}</p>`;
    }
}

function renderizarCotizacionInterna(contenedor, proyecto, documento) {
    const contenido = documento?.contenido || {};
    const items = contenido.items?.length ? contenido.items : [{ cantidad: 1, precio: 0 }];
    const editable = puedeEditarDocumentosProyecto();
    contenedor.innerHTML = `
        <section class="documento-proyecto">
            <div class="cabecera-documento-proyecto"><div><p class="etiqueta-documento">ESTUDIO MODULAR · EM360™</p><h3>Cotización</h3><p>Prepare la propuesta económica de este proyecto y expórtela cuando esté lista.</p></div><div class="acciones-documento"><button type="button" id="btnExportarCotizacion">Exportar PDF</button>${editable ? '<button type="button" id="btnGuardarCotizacion">Guardar cotización</button>' : ''}</div></div>
            <div class="datos-documento-proyecto">
                ${campoTextoDocumento("cotNumero", "No. de cotización", contenido.numero || `COT-${proyecto.id}-${new Date().getFullYear()}`)}
                ${campoTextoDocumento("cotFecha", "Fecha", contenido.fecha || fechaHoyDocumento(), { tipo: "date" })}
                ${campoTextoDocumento("cotValidez", "Válida por (días)", contenido.validez || "15", { tipo: "number" })}
                ${campoTextoDocumento("cotCliente", "Cliente", contenido.cliente || proyecto.cliente)}
                ${campoTextoDocumento("cotProyecto", "Proyecto", proyecto.nombre, { readonly: true })}
                ${campoTextoDocumento("cotUbicacion", "Ubicación", contenido.ubicacion || proyecto.ubicacion)}
            </div>
            <div class="tabla-documento-scroll"><table class="tabla-documento-proyecto"><thead><tr><th>Descripción</th><th>Cantidad</th><th>Precio unitario</th><th>Subtotal</th><th></th></tr></thead><tbody id="filasCotizacion">${items.map(filaCotizacion).join("")}</tbody></table></div>
            ${editable ? '<button type="button" class="boton-secundario" id="btnAgregarPartida">+ Agregar partida</button>' : ''}
            <div class="resumen-cotizacion"><label>Descuento (RD$)<input id="cotDescuento" type="number" min="0" step="0.01" value="${escaparDocumentoProyecto(contenido.descuento ?? 0)}"></label><strong>Total: <span id="cotTotal">RD$ 0.00</span></strong></div>
            <label class="campo-ancho">Notas o condiciones<textarea id="cotNotas" placeholder="Incluya materiales, alcance, forma de pago y condiciones.">${escaparDocumentoProyecto(contenido.notas)}</textarea></label>
            ${documento?.updated_at ? `<p class="nota-guardado">Última actualización: ${new Date(documento.updated_at).toLocaleString("es-DO")}</p>` : ''}
        </section>`;
    agregarMarcaDocumento();
    const filas = document.getElementById("filasCotizacion");
    filas.addEventListener("input", calcularTotalesCotizacion);
    filas.addEventListener("click", (evento) => { if (evento.target.closest("[data-quitar-fila]")) { evento.target.closest("tr").remove(); calcularTotalesCotizacion(); } });
    document.getElementById("cotDescuento").addEventListener("input", calcularTotalesCotizacion);
    document.getElementById("btnAgregarPartida")?.addEventListener("click", () => { filas.insertAdjacentHTML("beforeend", filaCotizacion()); calcularTotalesCotizacion(); });
    document.getElementById("btnGuardarCotizacion")?.addEventListener("click", guardarCotizacionInterna);
    document.getElementById("btnExportarCotizacion").addEventListener("click", exportarCotizacionInterna);
    calcularTotalesCotizacion();
}

function obtenerItemsCotizacion() {
    return Array.from(document.querySelectorAll("#filasCotizacion tr")).map((fila) => ({
        descripcion: fila.querySelector(".cot-descripcion").value.trim(), cantidad: Number(fila.querySelector(".cot-cantidad").value) || 0, precio: Number(fila.querySelector(".cot-precio").value) || 0
    })).filter((item) => item.descripcion || item.cantidad || item.precio);
}

function calcularTotalesCotizacion() {
    const items = obtenerItemsCotizacion();
    let total = 0;
    document.querySelectorAll("#filasCotizacion tr").forEach((fila) => {
        const subtotal = (Number(fila.querySelector(".cot-cantidad").value) || 0) * (Number(fila.querySelector(".cot-precio").value) || 0);
        fila.querySelector(".cot-subtotal").textContent = formatoMonedaDocumento(subtotal);
        total += subtotal;
    });
    const descuento = Number(document.getElementById("cotDescuento")?.value) || 0;
    document.getElementById("cotTotal").textContent = formatoMonedaDocumento(Math.max(0, total - descuento));
    return { items, total: Math.max(0, total - descuento) };
}

function formatoMonedaDocumento(valor) { return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(valor || 0); }

async function guardarCotizacionInterna() {
    const { items } = calcularTotalesCotizacion();
    const contenido = { numero: document.getElementById("cotNumero").value.trim(), fecha: document.getElementById("cotFecha").value, validez: document.getElementById("cotValidez").value, cliente: document.getElementById("cotCliente").value.trim(), ubicacion: document.getElementById("cotUbicacion").value.trim(), items, descuento: Number(document.getElementById("cotDescuento").value) || 0, notas: document.getElementById("cotNotas").value.trim() };
    await guardarDocumentoProyecto(TIPO_COTIZACION_INTERNA, contenido.numero || "Cotización", contenido);
}

function renderizarPlanTrabajo(contenedor, proyecto, documento, plantilla = null) {
    const contenido = documento?.contenido || {};
    const actividades = contenido.actividades?.length ? contenido.actividades : (plantilla ? plantilla.actividades.map((actividad) => ({ actividad })) : [{}]);
    const cronograma = contenido.cronograma?.length ? contenido.cronograma : cronogramaPlanBase();
    const editable = puedeEditarDocumentosProyecto();
    const esPintura = plantilla?.codigo === "pintores";
    const tituloPlan = plantilla ? `Plan de trabajo · ${plantilla.nombre}` : "Plan de trabajo general";
    const descripcionPlan = plantilla ? `Organice las actividades de ${plantilla.nombre.toLowerCase()} para ${proyecto.nombre}.` : `Organice las actividades, responsables y fechas para ${proyecto.nombre}.`;
    contenedor.innerHTML = `
        <section class="documento-proyecto">
            <div class="cabecera-documento-proyecto"><div><p class="etiqueta-documento">ESTUDIO MODULAR · EM360™</p><h3>${escaparDocumentoProyecto(tituloPlan)}</h3><p>${escaparDocumentoProyecto(descripcionPlan)}</p></div><div class="acciones-documento"><button type="button" id="btnVolverPlantillasPlan" class="boton-secundario">Plantillas</button><button type="button" id="btnExportarPlan">Exportar PDF</button>${editable ? '<button type="button" id="btnGuardarPlan">Guardar plan</button>' : ''}</div></div>
            <div class="datos-documento-proyecto">
                ${campoTextoDocumento("planProyecto", "Proyecto", proyecto.nombre, { readonly: true })}
                ${campoTextoDocumento("planEspecialidad", "Especialidad", plantilla?.nombre || "General", { readonly: true })}
                ${campoTextoDocumento("planCliente", "Cliente", contenido.cliente || proyecto.cliente)}
                ${campoTextoDocumento("planResponsable", "Responsable", contenido.responsable || "")}
                ${campoTextoDocumento("planInicioGeneral", "Inicio estimado", contenido.inicio || fechaHoyDocumento(), { tipo: "date" })}
                ${campoTextoDocumento("planFinGeneral", "Finalización estimada", contenido.fin || "", { tipo: "date" })}
                ${campoTextoDocumento("planUbicacion", "Ubicación", contenido.ubicacion || proyecto.ubicacion)}
            </div>
            ${plantilla ? `<section class="cronograma-especialidades"><div><h4>Etapas sugeridas para ${escaparDocumentoProyecto(plantilla.nombre)}</h4><p>La plantilla carga estas actividades como base. Edítelas según el alcance contratado.</p></div></section>` : `<section class="cronograma-especialidades">
                <div><h4>Cronograma estimado por especialidad</h4><p>Edite los días de cada etapa según el alcance del proyecto.</p></div>
                <div class="tabla-documento-scroll"><table class="tabla-documento-proyecto tabla-cronograma"><thead><tr><th>Etapa</th><th>Ebanistería<br><small>Días</small></th><th>Topes<br><small>Días</small></th><th>Sheetrock<br><small>Días</small></th></tr></thead><tbody id="filasCronogramaPlan">${cronograma.map(filaCronogramaPlan).join("")}</tbody></table></div>
            </section>`}
            ${plantilla ? plantillaDetallesEspecialidad(plantilla, contenido) : ""}
            <label class="campo-ancho">Alcance del trabajo<textarea id="planAlcance" placeholder="Describa el alcance de los trabajos.">${escaparDocumentoProyecto(contenido.alcance)}</textarea></label>
            <div class="tabla-documento-scroll"><table class="tabla-documento-proyecto"><thead><tr><th>Actividad</th><th>Responsable</th><th>Inicio</th><th>Fin</th><th>Estado</th><th></th></tr></thead><tbody id="filasPlanTrabajo">${actividades.map(filaActividad).join("")}</tbody></table></div>
            ${editable ? '<button type="button" class="boton-secundario" id="btnAgregarActividad">+ Agregar actividad</button>' : ''}
            <label class="campo-ancho">Notas generales<textarea id="planNotas" placeholder="Acuerdos, dependencias o recomendaciones.">${escaparDocumentoProyecto(contenido.notas)}</textarea></label>
            ${documento?.updated_at ? `<p class="nota-guardado">Última actualización: ${new Date(documento.updated_at).toLocaleString("es-DO")}</p>` : ''}
        </section>`;
    agregarMarcaDocumento();
    const filas = document.getElementById("filasPlanTrabajo");
    filas.addEventListener("click", (evento) => { if (evento.target.closest("[data-quitar-fila]")) evento.target.closest("tr").remove(); });
    document.getElementById("btnAgregarActividad")?.addEventListener("click", () => filas.insertAdjacentHTML("beforeend", filaActividad()));
    document.getElementById("btnGuardarPlan")?.addEventListener("click", guardarPlanTrabajo);
    document.getElementById("btnExportarPlan").addEventListener("click", exportarPlanTrabajo);
    document.getElementById("btnVolverPlantillasPlan").addEventListener("click", mostrarPlanTrabajo);
}

function obtenerActividadesPlan() {
    return Array.from(document.querySelectorAll("#filasPlanTrabajo tr")).map((fila) => ({
        actividad: fila.querySelector(".plan-actividad").value.trim(), responsable: fila.querySelector(".plan-responsable").value.trim(), inicio: fila.querySelector(".plan-inicio").value, fin: fila.querySelector(".plan-fin").value, estado: fila.querySelector(".plan-estado").value
    })).filter((item) => Object.values(item).some(Boolean));
}

function obtenerCronogramaPlan() {
    const filas = document.querySelectorAll("#filasCronogramaPlan tr");
    if (!filas.length) return [];
    return Array.from(filas).map((fila) => ({
        etapa: fila.cells[0].textContent.trim(),
        ebanisteria: Number(fila.querySelector(".dias-ebanisteria").value) || 0,
        topes: Number(fila.querySelector(".dias-topes").value) || 0,
        sheetrock: Number(fila.querySelector(".dias-sheetrock").value) || 0
    }));
}

async function guardarPlanTrabajo() {
    const contenido = { cliente: document.getElementById("planCliente").value.trim(), responsable: document.getElementById("planResponsable").value.trim(), inicio: document.getElementById("planInicioGeneral").value, fin: document.getElementById("planFinGeneral").value, ubicacion: document.getElementById("planUbicacion").value.trim(), alcance: document.getElementById("planAlcance").value.trim(), cronograma: obtenerCronogramaPlan(), actividades: obtenerActividadesPlan(), notas: document.getElementById("planNotas").value.trim(), especialidad: plantillaPlanTrabajoActual?.codigo || null, pintura: plantillaPlanTrabajoActual?.codigo === "pintores" ? obtenerDetallesPintura() : null, detalles_especialidad: plantillaPlanTrabajoActual?.codigo && plantillaPlanTrabajoActual.codigo !== "pintores" ? obtenerDetallesEspecialidad(plantillaPlanTrabajoActual) : null };
    const titulo = plantillaPlanTrabajoActual ? `Plan de trabajo · ${plantillaPlanTrabajoActual.nombre}` : "Plan de trabajo general";
    await guardarDocumentoProyecto(tipoPlanTrabajoActual, titulo, contenido);
}

async function guardarDocumentoProyecto(tipo, titulo, contenido) {
    if (!puedeEditarDocumentosProyecto()) return alert("Solo Administrador u Oficial puede guardar este documento.");
    const boton = tipo.startsWith(TIPO_PLAN_TRABAJO) ? document.getElementById("btnGuardarPlan") : document.getElementById("btnGuardarCotizacion");
    boton.disabled = true;
    try {
        const perfil = window.em360Permisos?.obtenerSesion?.();
        const { error } = await supabaseClient.from("DocumentosProyecto").upsert({ proyecto_id: window.proyectoActual, tipo, titulo, contenido, creado_por: perfil?.id || null }, { onConflict: "proyecto_id,tipo" });
        if (error) throw error;
        alert("Documento guardado correctamente.");
    } catch (error) {
        console.error("No se pudo guardar el documento:", error);
        alert(`No se pudo guardar: ${error.message}`);
    } finally { boton.disabled = false; }
}

function escaparImpresion(valor) { return escaparDocumentoProyecto(valor).replace(/\n/g, "<br>"); }

function exportarCotizacionInterna() {
    const { items, total } = calcularTotalesCotizacion();
    const filas = items.map((item) => `<tr><td>${escaparImpresion(item.descripcion)}</td><td>${item.cantidad}</td><td>${formatoMonedaDocumento(item.precio)}</td><td>${formatoMonedaDocumento(item.cantidad * item.precio)}</td></tr>`).join("");
    imprimirDocumento("Cotización", `<div class="meta"><b>No.:</b> ${escaparImpresion(document.getElementById("cotNumero").value)}<br><b>Fecha:</b> ${escaparImpresion(document.getElementById("cotFecha").value)}<br><b>Cliente:</b> ${escaparImpresion(document.getElementById("cotCliente").value)}<br><b>Proyecto:</b> ${escaparImpresion(document.getElementById("cotProyecto").value)}<br><b>Ubicación:</b> ${escaparImpresion(document.getElementById("cotUbicacion").value)}</div><table><thead><tr><th>Descripción</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr></thead><tbody>${filas}</tbody></table><h3 class="total">Total: ${formatoMonedaDocumento(total)}</h3><h4>Notas y condiciones</h4><p>${escaparImpresion(document.getElementById("cotNotas").value) || "Sin notas adicionales."}</p>`);
}

function exportarPlanTrabajo() {
    const cronograma = obtenerCronogramaPlan().map((item) => `<tr><td>${escaparImpresion(item.etapa)}</td><td>${item.ebanisteria}</td><td>${item.topes}</td><td>${item.sheetrock}</td></tr>`).join("");
    const filas = obtenerActividadesPlan().map((item) => `<tr><td>${escaparImpresion(item.actividad)}</td><td>${escaparImpresion(item.responsable)}</td><td>${item.inicio || "—"}</td><td>${item.fin || "—"}</td><td>${item.estado}</td></tr>`).join("");
    const cronogramaHtml = cronograma ? `<h4>Cronograma estimado por especialidad</h4><table><thead><tr><th>Etapa</th><th>Ebanistería · días</th><th>Topes · días</th><th>Sheetrock · días</th></tr></thead><tbody>${cronograma}</tbody></table>` : "";
    const titulo = plantillaPlanTrabajoActual ? `Plan de trabajo · ${plantillaPlanTrabajoActual.nombre}` : "Plan de trabajo general";
    const pintura = plantillaPlanTrabajoActual?.codigo === "pintores" ? obtenerDetallesPintura() : null;
    const pinturaHtml = pintura ? `<h4>Especificaciones de pintura</h4><div class="meta"><b>Áreas:</b> ${escaparImpresion(pintura.areas) || "—"}<br><b>Superficie:</b> ${escaparImpresion(pintura.superficie) || "—"}<br><b>Color y acabado:</b> ${escaparImpresion(pintura.color) || "—"}<br><b>Manos:</b> ${pintura.capas || "—"}<br><b>Herramientas:</b> ${escaparImpresion(pintura.herramientas) || "—"}<br><b>Materiales:</b> ${escaparImpresion(pintura.materiales) || "—"}<br><b>Control de calidad:</b> ${escaparImpresion(pintura.calidad) || "—"}</div>` : "";
    const detallesHtml = pinturaHtml || resumenDetallesEspecialidad(plantillaPlanTrabajoActual);
    imprimirDocumento(titulo, `<div class="meta"><b>Proyecto:</b> ${escaparImpresion(document.getElementById("planProyecto").value)}<br><b>Especialidad:</b> ${escaparImpresion(document.getElementById("planEspecialidad").value)}<br><b>Cliente:</b> ${escaparImpresion(document.getElementById("planCliente").value)}<br><b>Responsable:</b> ${escaparImpresion(document.getElementById("planResponsable").value)}<br><b>Inicio estimado:</b> ${escaparImpresion(document.getElementById("planInicioGeneral").value)}<br><b>Finalización estimada:</b> ${escaparImpresion(document.getElementById("planFinGeneral").value)}<br><b>Ubicación:</b> ${escaparImpresion(document.getElementById("planUbicacion").value)}</div>${detallesHtml}${cronogramaHtml}<h4>Alcance</h4><p>${escaparImpresion(document.getElementById("planAlcance").value) || "Sin alcance indicado."}</p><table><thead><tr><th>Actividad</th><th>Responsable</th><th>Inicio</th><th>Fin</th><th>Estado</th></tr></thead><tbody>${filas}</tbody></table><h4>Notas generales</h4><p>${escaparImpresion(document.getElementById("planNotas").value) || "Sin notas adicionales."}</p>`);
}

function imprimirDocumento(titulo, cuerpo) {
    const ventana = window.open("", "_blank");
    if (!ventana) return alert("El navegador bloqueó la ventana de exportación. Permita las ventanas emergentes e intente de nuevo.");
    const logo = new URL(LOGO_DOCUMENTO_PROYECTO, window.location.href).href;
    ventana.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escaparDocumentoProyecto(titulo)}</title><style>body{font-family:Arial,sans-serif;color:#123;max-width:900px;margin:42px auto;padding:0 26px}.marca{display:flex;align-items:center;height:82px;padding:13px 22px;background:#003d38;border-radius:10px}.marca img{max-width:310px;max-height:56px;object-fit:contain}.titulo{border-bottom:4px solid #0e5a56;padding-bottom:14px;margin:20px 0 25px;font-size:32px;color:#083d3b}.meta{line-height:1.75;margin-bottom:24px;padding:18px;background:#f4f8f7;border-left:5px solid #0e5a56}table{width:100%;border-collapse:collapse;margin:22px 0}th{background:#083d3b;color:#fff}th,td{border:1px solid #cad8d6;padding:10px;text-align:left}h4{color:#083d3b;margin-top:28px}.total{text-align:right;color:#083d3b}p{line-height:1.6}@media print{body{margin:0;max-width:none}}</style></head><body><div class="marca"><img src="${logo}" alt="Estudio Modular"></div><h1 class="titulo">${escaparDocumentoProyecto(titulo)}</h1>${cuerpo}<p style="margin-top:45px;border-top:1px solid #ccd;padding-top:14px;color:#667">Documento generado desde EM360™ · ${new Date().toLocaleString("es-DO")}</p><script>window.onload=()=>setTimeout(()=>window.print(),300);</script></body></html>`);
    const estiloLogoSinFondo = ventana.document.createElement("style");
    estiloLogoSinFondo.textContent = ".marca{height:66px!important;padding:0!important;background:transparent!important;border-radius:0!important}.marca img{max-width:250px!important;max-height:66px!important}";
    ventana.document.head.append(estiloLogoSinFondo);
    ventana.document.close();
}

window.mostrarCotizacionInterna = mostrarCotizacionInterna;
window.mostrarPlanTrabajo = mostrarPlanTrabajo;
