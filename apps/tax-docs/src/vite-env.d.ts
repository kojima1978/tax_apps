// Vite client type declarations
// Full types available when vite is installed: /// <reference types="vite/client" />
declare module '*.css' {}
declare module '*.svg' {
  const src: string
  export default src
}
