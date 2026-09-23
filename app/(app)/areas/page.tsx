import { redirect } from 'next/navigation'

/** Área deixou de ser tela e virou filtro. Ver componentes/TelaTracks.tsx. */
export default function Pagina() { redirect('/tracks?tipo=ciclo') }
