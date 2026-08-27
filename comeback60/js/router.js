// A one-line router lives on its own so views can navigate without importing
// app.js — views should never depend on the shell that mounts them, only the
// other way around. (Importing app.js from a view also crashes any Node-side
// import check, since app.js touches `document` at module load time; that is
// a real signal the dependency direction was backwards, not just a test
// inconvenience.)
export function navigate(route){
  location.hash = `#/${route}`;
}
