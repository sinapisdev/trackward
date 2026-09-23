import { redirect } from 'next/navigation'

/**
 * Projetos virou Objetivos, e Objetivos virou um filtro dentro de Tracks.
 * O endereço antigo continua de pé porque ele está em link de conversa, em
 * favorito e em aviso já enviado: quebrar isso seria perder o caminho de volta.
 */
export default function Pagina() { redirect('/tracks?tipo=esteira') }
