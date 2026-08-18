(function () {
    const LOGO_ORDEN_TRABAJO = "assets/estudio-modular-verde-sin-fondo-v2.png";

    const SERVICIOS_ORDEN = {
        ebanisteria: "Ebanistería",
        marmoleros: "Marmolería",
        sheetrockeros: "Sheetrock",
        plomeros: "Plomería",
        electricistas: "Electricidad",
        piseros: "Pisos",
        pintores: "Pintura"
    };

    function formatearMoneda(valor) {
        const numero = Number(valor || 0);
        return new Intl.NumberFormat("es-DO", {
            style: "currency",
            currency: "DOP",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(numero);
    }

    function formatearFecha(fecha) {
        if (!fecha) return "";
        const fechaValor = new Date(fecha);
        if (Number.isNaN(fechaValor.getTime())) return fecha;
        const dia = String(fechaValor.getDate()).padStart(2, "0");
        const mes = String(fechaValor.getMonth() + 1).padStart(2, "0");
        const anio = fechaValor.getFullYear();
        return `${dia}/${mes}/${anio}`;
    }

    function permitirSoloNumeros(valor) {
        return Number(String(valor).replace(/[^\d.]/g, "") || 0);
    }

    function construirNumeroOT() {
        const anioActual = new Date().getFullYear();
        const fecha = new Date();
        const fechaCodigo = `${String(fecha.getDate()).padStart(2, "0")}${String(fecha.getMonth() + 1).padStart(2, "0")}`;
        const horaCodigo = `${String(fecha.getHours()).padStart(2, "0")}${String(fecha.getMinutes()).padStart(2, "0")}`;
        return `OT-${anioActual}-${fechaCodigo}-${horaCodigo}`;
    }

    async function cargarProyectosOrdenTrabajo() {
        const { data, error } = await supabaseClient
            .from("Proyectos")
            .select("id, nombre, cliente, ubicacion, estado, servicios_proveedores")
            .order("id", { ascending: false });

        if (error) {
            console.error("Error cargando proyectos para OT:", error);
            return [];
        }

        return data || [];
    }

    function obtenerServiciosDisponiblesProyecto(proyecto) {
        const servicios = Array.isArray(proyecto?.servicios_proveedores) ? proyecto.servicios_proveedores : [];
        return servicios.length ? servicios : ["ebanisteria"];
    }

    async function cargarLogoOrdenTrabajo() {
        const respuesta = await fetch(LOGO_ORDEN_TRABAJO);
        if (!respuesta.ok) throw new Error("No se pudo cargar el logo de Estudio Modular.");

        const imagen = await respuesta.blob();
        return new Promise((resolver, rechazar) => {
            const lector = new FileReader();
            lector.onload = () => resolver(lector.result);
            lector.onerror = () => rechazar(new Error("No se pudo preparar el logo para el PDF."));
            lector.readAsDataURL(imagen);
        });
    }

    async function crearPdfOrdenTrabajo(datos) {
        if (!window.jspdf || !window.jspdf.jsPDF) {
            throw new Error("No se pudo cargar jsPDF.");
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: "mm", format: "a4" });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageWidth, pageHeight, "F");
        doc.setFillColor(8, 61, 59);
        doc.rect(0, 0, pageWidth, 5, "F");
        doc.setDrawColor(214, 181, 106);
        doc.setLineWidth(0.7);
        doc.line(14, 35, pageWidth - 14, 35);
        doc.setTextColor(8, 61, 59);
        try {
            const logo = await cargarLogoOrdenTrabajo();
            doc.addImage(logo, "PNG", 10, 0, 72, 38);
        } catch (error) {
            console.warn(error);
            doc.setFontSize(18);
            doc.setFont(undefined, "bold");
            doc.text("EM360™", 14, 18);
        }
        doc.setFontSize(16);
        doc.setFont(undefined, "bold");
        doc.text("ORDEN DE TRABAJO", pageWidth - 14, 17, { align: "right" });
        doc.setFontSize(10);
        doc.setFont(undefined, "normal");
        doc.text(`N.º ${datos.numero}`, pageWidth - 14, 24, { align: "right" });

        doc.setDrawColor(225, 232, 234);
        doc.setFillColor(248, 250, 250);
        doc.roundedRect(14, 43, pageWidth - 28, 17, 3, 3, "F");
        doc.roundedRect(14, 43, pageWidth - 28, 17, 3, 3, "S");
        doc.setTextColor(8, 61, 59);
        doc.setFontSize(11);
        doc.setFont(undefined, "bold");
        const etiquetaProyecto = "PROYECTO / CLIENTE";
        const anchoEtiquetaProyecto = doc.getTextWidth(etiquetaProyecto);

        doc.setTextColor(25, 25, 25);
        doc.setFont(undefined, "normal");
        doc.setFontSize(11);
        const nombreProyecto = String(datos.proyecto || "");
        const anchoNombreProyecto = doc.getTextWidth(nombreProyecto);
        const separacionProyecto = 10;
        const inicioProyecto = (pageWidth - anchoEtiquetaProyecto - separacionProyecto - anchoNombreProyecto) / 2;
        doc.setFont(undefined, "bold");
        doc.setTextColor(8, 61, 59);
        doc.text(etiquetaProyecto, inicioProyecto, 53);
        doc.setFont(undefined, "normal");
        doc.setTextColor(25, 25, 25);
        doc.text(nombreProyecto, inicioProyecto + anchoEtiquetaProyecto + separacionProyecto, 53);

        const bloqueCampos = [
            ["Servicio asignado", datos.servicio],
            ["Proveedor", datos.proveedor],
            ["Valor acordado", formatearMoneda(datos.valorAcordado)],
            ["Anticipo", formatearMoneda(datos.anticipo)],
            ["Restante", formatearMoneda(datos.restante)],
            ["Fecha de inicio", datos.fechaInicio],
            ["Fecha límite", datos.fechaFin],
            ["Material", datos.material]
        ];

        let y = 68;
        bloqueCampos.forEach(([titulo, valor], indice) => {
            const x = indice % 2 === 0 ? 14 : 108;
            const yActual = y + Math.floor(indice / 2) * 28;

            doc.setDrawColor(225, 232, 234);
            doc.roundedRect(x, yActual, 82, 20, 2, 2, "S");
            doc.setFillColor(247, 249, 249);
            doc.roundedRect(x, yActual, 82, 20, 2, 2, "F");
            doc.setFont(undefined, "bold");
            doc.setTextColor(8, 61, 59);
            doc.setFontSize(8.5);
            doc.text(`${titulo}:`, x + 4, yActual + 7);
            doc.setFont(undefined, "normal");
            doc.setTextColor(35, 35, 35);
            doc.setFontSize(9.3);
            const textoValor = String(valor || "");
            const lineasValor = doc.splitTextToSize(textoValor, 64);
            doc.text(lineasValor, x + 4, yActual + 13);
        });

        y = 178;
        doc.setDrawColor(225, 232, 234);
        doc.roundedRect(14, y, pageWidth - 28, 28, 3, 3, "S");
        doc.setFillColor(250, 252, 252);
        doc.roundedRect(14, y, pageWidth - 28, 28, 3, 3, "F");
        doc.setFont(undefined, "bold");
        doc.setTextColor(8, 61, 59);
        doc.setFontSize(9.5);
        doc.text("ALCANCE:", 20, y + 8);
        doc.setFont(undefined, "normal");
        doc.setTextColor(30, 30, 30);
        const alcanceLineas = doc.splitTextToSize(String(datos.alcance || ""), 165);
        doc.text(alcanceLineas, 20, y + 16);

        y += 38;
        doc.setDrawColor(225, 232, 234);
        doc.roundedRect(14, y, pageWidth - 28, 26, 3, 3, "S");
        doc.setFillColor(250, 252, 252);
        doc.roundedRect(14, y, pageWidth - 28, 26, 3, 3, "F");
        doc.setFont(undefined, "bold");
        doc.setTextColor(8, 61, 59);
        doc.setFontSize(9.5);
        doc.text("OBSERVACIONES:", 20, y + 8);
        doc.setFont(undefined, "normal");
        doc.setTextColor(30, 30, 30);
        const observacionesLineas = doc.splitTextToSize(String(datos.observaciones || ""), 165);
        doc.text(observacionesLineas, 20, y + 16);

        y += 40;
        doc.setFillColor(245, 240, 220);
        doc.roundedRect(14, y, pageWidth - 28, 20, 3, 3, "F");
        doc.setDrawColor(214, 181, 106);
        doc.roundedRect(14, y, pageWidth - 28, 20, 3, 3, "S");
        doc.setFont(undefined, "bold");
        doc.setTextColor(8, 61, 59);
        doc.setFontSize(9.5);
        doc.text("CLÁUSULA:", 20, y + 8);
        doc.setFont(undefined, "normal");
        doc.setTextColor(35, 35, 35);
        doc.text("Será descontado el 1% del valor total por cada día de atraso.", 55, y + 8);

        const firmaY = pageHeight - 15;
        doc.setDrawColor(100, 100, 100);
        doc.line(18, firmaY, 78, firmaY);
        doc.line(120, firmaY, 184, firmaY);
        doc.setFont(undefined, "normal");
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(9);
        doc.text("Firma Estudio Modular", 20, firmaY + 6);
        doc.text("Firma Proveedor", 128, firmaY + 6);

        return doc;
    }

    function construirCuerpoCorreo(datos) {
        return [
            `Estimado/a ${datos.proveedor},`,
            "",
            `Adjuntamos la orden de trabajo EM360™ N.º ${datos.numero} para el proyecto ${datos.proyecto}.`,
            "",
            `Servicio asignado: ${datos.servicio}`,
            `Valor acordado: ${formatearMoneda(datos.valorAcordado)}`,
            `Anticipo: ${formatearMoneda(datos.anticipo)}`,
            `Restante: ${formatearMoneda(datos.restante)}`,
            `Fecha de inicio: ${datos.fechaInicio}`,
            `Fecha límite: ${datos.fechaFin}`,
            `Material: ${datos.material}`,
            `Alcance: ${datos.alcance}`,
            `Observaciones: ${datos.observaciones}`,
            "",
            "Cláusula: Será descontado el 1% del valor total por cada día de atraso.",
            "",
            "Atentamente,",
            "Estudio Modular EM360™"
        ].join("\n");
    }

    async function abrirModalNuevaOrdenTrabajo() {
        if (document.getElementById("modalOrdenTrabajo")) return;

        const proyectos = await cargarProyectosOrdenTrabajo();
        const modal = document.createElement("div");
        modal.id = "modalOrdenTrabajo";
        modal.style.position = "fixed";
        modal.style.inset = "0";
        modal.style.background = "rgba(0,0,0,.58)";
        modal.style.display = "flex";
        modal.style.justifyContent = "center";
        modal.style.alignItems = "center";
        modal.style.zIndex = "99999";
        modal.style.padding = "20px";

        const proyectoOptions = proyectos.length
            ? proyectos.map((proyecto) => `<option value="${proyecto.id}">${proyecto.nombre}</option>`).join("")
            : '<option value="">No hay proyectos creados</option>';

        modal.innerHTML = `
            <div style="width:min(760px,100%);background:#fff;border-radius:16px;padding:28px;box-shadow:0 20px 50px rgba(0,0,0,.28);max-height:90vh;overflow:auto;">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:18px;">
                    <div>
                        <p style="margin:0;color:#0E5A56;font-size:12px;font-weight:700;letter-spacing:1.2px;">ESTUDIO MODULAR · EM360™</p>
                        <h2 style="margin:6px 0 0;color:#083D3B;">Crear Orden de Trabajo</h2>
                    </div>
                    <button type="button" id="cerrarOrdenTrabajo" style="background:#64748B;padding:10px 14px;">Cerrar</button>
                </div>

                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;">
                    <div>
                        <label style="display:block;color:#083D3B;font-weight:700;margin-bottom:6px;">Proyecto</label>
                        <select id="proyectoOrdenTrabajo" style="width:100%;padding:12px;border:1px solid #C9D4D3;border-radius:8px;">
                            ${proyectoOptions}
                        </select>
                    </div>

                    <div>
                        <label style="display:block;color:#083D3B;font-weight:700;margin-bottom:6px;">Servicio asignado</label>
                        <select id="servicioOrdenTrabajo" style="width:100%;padding:12px;border:1px solid #C9D4D3;border-radius:8px;">
                            <option value="">Seleccione servicio</option>
                        </select>
                    </div>

                    <div>
                        <label style="display:block;color:#083D3B;font-weight:700;margin-bottom:6px;">Proveedor</label>
                        <input id="proveedorOrdenTrabajo" type="text" placeholder="Ej. Jorge Luis Núñez Bautista" style="width:100%;padding:12px;border:1px solid #C9D4D3;border-radius:8px;" required>
                    </div>

                    <div>
                        <label style="display:block;color:#083D3B;font-weight:700;margin-bottom:6px;">Valor acordado</label>
                        <input id="valorAcordadoOrdenTrabajo" type="number" min="0" step="0.01" placeholder="85000" style="width:100%;padding:12px;border:1px solid #C9D4D3;border-radius:8px;" required>
                    </div>

                    <div>
                        <label style="display:block;color:#083D3B;font-weight:700;margin-bottom:6px;">Anticipo</label>
                        <input id="anticipoOrdenTrabajo" type="number" min="0" step="0.01" placeholder="40000" style="width:100%;padding:12px;border:1px solid #C9D4D3;border-radius:8px;" required>
                    </div>

                    <div>
                        <label style="display:block;color:#083D3B;font-weight:700;margin-bottom:6px;">Restante</label>
                        <input id="restanteOrdenTrabajo" type="number" min="0" step="0.01" placeholder="45000" style="width:100%;padding:12px;border:1px solid #C9D4D3;border-radius:8px;" required>
                    </div>

                    <div>
                        <label style="display:block;color:#083D3B;font-weight:700;margin-bottom:6px;">Fecha de inicio</label>
                        <input id="fechaInicioOrdenTrabajo" type="date" style="width:100%;padding:12px;border:1px solid #C9D4D3;border-radius:8px;" required>
                    </div>

                    <div>
                        <label style="display:block;color:#083D3B;font-weight:700;margin-bottom:6px;">Fecha límite</label>
                        <input id="fechaFinOrdenTrabajo" type="date" style="width:100%;padding:12px;border:1px solid #C9D4D3;border-radius:8px;" required>
                    </div>
                </div>

                <div style="margin-top:14px;display:grid;gap:14px;">
                    <div>
                        <label style="display:block;color:#083D3B;font-weight:700;margin-bottom:6px;">Material</label>
                        <input id="materialOrdenTrabajo" type="text" placeholder="MDF hidrófugo 3/4" style="width:100%;padding:12px;border:1px solid #C9D4D3;border-radius:8px;" required>
                    </div>

                    <div>
                        <label style="display:block;color:#083D3B;font-weight:700;margin-bottom:6px;">Alcance</label>
                        <textarea id="alcanceOrdenTrabajo" rows="3" placeholder="Según planos suministrados por Estudio Modular." style="width:100%;padding:12px;border:1px solid #C9D4D3;border-radius:8px;resize:vertical;" required></textarea>
                    </div>

                    <div>
                        <label style="display:block;color:#083D3B;font-weight:700;margin-bottom:6px;">Observaciones</label>
                        <textarea id="observacionesOrdenTrabajo" rows="3" placeholder="Cualquier modificación requiere autorización de Estudio Modular." style="width:100%;padding:12px;border:1px solid #C9D4D3;border-radius:8px;resize:vertical;" required></textarea>
                    </div>
                </div>

                <div style="margin-top:18px;display:flex;justify-content:flex-end;gap:12px;flex-wrap:wrap;">
                    <button type="button" id="generarOrdenTrabajo" style="background:#0E5A56;">Generar PDF y enviar</button>
                </div>
            </div>
        `;

        const proyectoSelect = modal.querySelector("#proyectoOrdenTrabajo");
        const servicioSelect = modal.querySelector("#servicioOrdenTrabajo");
        const valorInput = modal.querySelector("#valorAcordadoOrdenTrabajo");
        const anticipoInput = modal.querySelector("#anticipoOrdenTrabajo");
        const restanteInput = modal.querySelector("#restanteOrdenTrabajo");

        const rellenarServicios = () => {
            const proyectoSeleccionado = proyectos.find((proyecto) => String(proyecto.id) === String(proyectoSelect.value));
            const servicios = obtenerServiciosDisponiblesProyecto(proyectoSeleccionado);
            servicioSelect.innerHTML = servicios.length
                ? servicios.map((servicio) => `<option value="${servicio}">${SERVICIOS_ORDEN[servicio] || servicio}</option>`).join("")
                : '<option value="">Seleccione servicio</option>';
        };

        proyectoSelect.addEventListener("change", rellenarServicios);
        if (proyectoSelect.value) rellenarServicios();

        valorInput.addEventListener("input", () => {
            const valor = permitirSoloNumeros(valorInput.value);
            if (!Number.isFinite(valor)) return;
            if (!restanteInput.value) {
                restanteInput.value = valor - Number(anticipoInput.value || 0);
            }
        });

        anticipoInput.addEventListener("input", () => {
            const valor = permitirSoloNumeros(valorInput.value);
            const anticipo = permitirSoloNumeros(anticipoInput.value);
            if (valor > 0 || anticipo > 0) {
                restanteInput.value = Math.max(0, valor - anticipo);
            }
        });

        modal.querySelector("#cerrarOrdenTrabajo").addEventListener("click", () => modal.remove());
        modal.querySelector("#generarOrdenTrabajo").addEventListener("click", async () => {
            const proyectoSeleccionado = proyectos.find((proyecto) => String(proyecto.id) === String(proyectoSelect.value));
            const proveedor = modal.querySelector("#proveedorOrdenTrabajo").value.trim();
            const servicio = servicioSelect.value;
            const valorAcordado = Number(modal.querySelector("#valorAcordadoOrdenTrabajo").value || 0);
            const anticipo = Number(modal.querySelector("#anticipoOrdenTrabajo").value || 0);
            const restante = Number(modal.querySelector("#restanteOrdenTrabajo").value || 0);
            const fechaInicio = modal.querySelector("#fechaInicioOrdenTrabajo").value;
            const fechaFin = modal.querySelector("#fechaFinOrdenTrabajo").value;
            const material = modal.querySelector("#materialOrdenTrabajo").value.trim();
            const alcance = modal.querySelector("#alcanceOrdenTrabajo").value.trim();
            const observaciones = modal.querySelector("#observacionesOrdenTrabajo").value.trim();

            if (!proyectoSeleccionado || !proveedor || !servicio || !valorAcordado || !fechaInicio || !fechaFin || !material || !alcance || !observaciones) {
                alert("Complete todos los campos obligatorios para crear la orden de trabajo.");
                return;
            }

            const numeroOT = construirNumeroOT();
            const datos = {
                numero: numeroOT,
                proyecto: proyectoSeleccionado.nombre,
                servicio: SERVICIOS_ORDEN[servicio] || servicio,
                proveedor,
                valorAcordado,
                anticipo,
                restante,
                fechaInicio: formatearFecha(fechaInicio),
                fechaFin: formatearFecha(fechaFin),
                material,
                alcance,
                observaciones,
                correoDestino: "ventasestudiomodular@gmail.com"
            };

            try {
                const doc = await crearPdfOrdenTrabajo(datos);
                doc.save(`${numeroOT}.pdf`);

                const correo = `mailto:${datos.correoDestino}?subject=${encodeURIComponent(`Orden de trabajo ${numeroOT} - ${datos.proyecto}`)}&body=${encodeURIComponent(construirCuerpoCorreo(datos))}`;
                window.open(correo, "_blank");

                alert(`Orden de trabajo ${numeroOT} generada correctamente y lista para enviar al correo ${datos.correoDestino}.`);
                modal.remove();
            } catch (error) {
                console.error(error);
                alert(`No se pudo generar la orden de trabajo: ${error.message}`);
            }
        });

        document.body.appendChild(modal);
    }

    window.abrirModalNuevaOrdenTrabajo = abrirModalNuevaOrdenTrabajo;
})();
