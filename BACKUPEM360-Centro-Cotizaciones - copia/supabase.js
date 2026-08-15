// Guardamos el tipo de enlace antes de que Supabase intercambie el código por una sesión.
// Así una invitación o recuperación siempre muestra el formulario para crear contraseña.
window.em360EnlaceDeClave = (() => {
    const tipos = ["invite", "magiclink", "recovery"];
    const hash = new URLSearchParams(window.location.hash.substring(1));
    const consulta = new URLSearchParams(window.location.search);
    return tipos.includes(hash.get("type")) || tipos.includes(consulta.get("type"));
})();

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

console.log("✅ Supabase conectado correctamente");
