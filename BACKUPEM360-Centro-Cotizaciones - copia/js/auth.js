function enlaceDeActivacion() {
    const parametros = new URLSearchParams(window.location.hash.substring(1));
    return ["invite", "magiclink", "recovery"].includes(parametros.get("type"));
}

async function actualizarVistaAcceso() {
    const pantalla = document.getElementById("pantallaAcceso");
    const app = document.getElementById("appShell");
    const formInicio = document.getElementById("formInicioSesion");
    const formInvitacion = document.getElementById("formClaveInvitacion");
    const { data } = await supabaseClient.auth.getSession();

    if (!data.session) {
        pantalla.hidden = false;
        app.hidden = true;
        formInicio.hidden = false;
        formInvitacion.hidden = true;
        return;
    }

    if (enlaceDeActivacion()) {
        pantalla.hidden = false;
        app.hidden = true;
        formInicio.hidden = true;
        formInvitacion.hidden = false;
        return;
    }

    await window.em360Permisos.cargarPerfil();
    const sesion = window.em360Permisos.obtenerSesion();

    if (!sesion) {
        pantalla.hidden = false;
        app.hidden = true;
        document.getElementById("mensajeAcceso").textContent = "Su cuenta no tiene un perfil asignado. Contacte al administrador.";
        return;
    }

    pantalla.hidden = true;
    app.hidden = false;
    const etiquetaUsuario = document.getElementById("usuarioSesion");
    if (etiquetaUsuario) etiquetaUsuario.textContent = `${sesion.nombre} · ${sesion.rol}`;
    window.em360ActualizarPermisos?.();
}

document.getElementById("formInicioSesion").addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const mensaje = document.getElementById("mensajeAcceso");
    mensaje.textContent = "Iniciando sesión...";

    const { error } = await supabaseClient.auth.signInWithPassword({
        email: document.getElementById("correoAcceso").value.trim(),
        password: document.getElementById("claveAcceso").value
    });

    if (error) {
        mensaje.textContent = error.message;
        return;
    }

    window.location.hash = "";
    await actualizarVistaAcceso();
});

document.getElementById("formClaveInvitacion").addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const mensaje = document.getElementById("mensajeInvitacion");
    mensaje.textContent = "Activando cuenta...";

    const { error } = await supabaseClient.auth.updateUser({
        password: document.getElementById("nuevaClaveAcceso").value
    });

    if (error) {
        mensaje.textContent = error.message;
        return;
    }

    window.location.hash = "";
    window.location.reload();
});

document.getElementById("btnCerrarSesion").addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.reload();
});

supabaseClient.auth.onAuthStateChange(() => {
    actualizarVistaAcceso();
});

actualizarVistaAcceso();
