const ROLES_EM360 = {
    ADMINISTRADOR: "Administrador",
    OFICIAL: "Oficial",
    CONSULTA: "Consulta"
};

let perfilActualEM360 = null;

async function cargarPerfilEM360() {
    const { data: sesionData } = await supabaseClient.auth.getSession();
    const usuario = sesionData.session?.user;

    if (!usuario) {
        perfilActualEM360 = null;
        return null;
    }

    const { data, error } = await supabaseClient
        .from("Perfiles")
        .select("nombre, rol")
        .eq("id", usuario.id)
        .single();

    if (error) {
        console.error("No se pudo cargar el perfil:", error);
        perfilActualEM360 = null;
        return null;
    }

    perfilActualEM360 = {
        id: usuario.id,
        nombre: data.nombre || usuario.email,
        correo: usuario.email,
        rol: data.rol
    };

    return perfilActualEM360;
}

function obtenerSesionEM360() {
    return perfilActualEM360;
}

function esAdministradorEM360() {
    return perfilActualEM360?.rol === ROLES_EM360.ADMINISTRADOR;
}

function esOficialEM360() {
    return perfilActualEM360?.rol === ROLES_EM360.OFICIAL;
}

function puedeAprobarCotizacionesEM360() {
    return esAdministradorEM360() || esOficialEM360();
}

function puedeCrearProyectosEM360() {
    return esAdministradorEM360() || esOficialEM360();
}

window.em360Permisos = {
    roles: ROLES_EM360,
    cargarPerfil: cargarPerfilEM360,
    obtenerSesion: obtenerSesionEM360,
    esAdministrador: esAdministradorEM360,
    esOficial: esOficialEM360,
    puedeCrearProyectos: puedeCrearProyectosEM360,
    puedeAprobarCotizaciones: puedeAprobarCotizacionesEM360
};
