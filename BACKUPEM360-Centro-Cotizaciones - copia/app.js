document.addEventListener("DOMContentLoaded", () => {

    console.clear();

    console.log("🚀 EM360 iniciado");


    // Botón Nuevo Proyecto
    const boton = document.getElementById("btnNuevoProyecto");

    if (!boton) {
        console.error("❌ No se encontró el botón btnNuevoProyecto");
        return;
    }

    boton.addEventListener("click", () => {

        abrirModalNuevoProyecto();

    });

});