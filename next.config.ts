import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Tira o selo do Next do canto da tela, que cobria o rodapé da lateral.
  devIndicators: false,
  // Endereços de onde o app pode ser aberto durante o desenvolvimento, para
  // abrir do celular na mesma rede. A faixa inteira entra porque o IP muda toda
  // vez que se troca de Wi-Fi, e ficar caçando o número não ajuda ninguém.
  allowedDevOrigins: ['192.168.0.0/16', '10.0.0.0/8', '172.16.0.0/12', '*.local'],
}

export default nextConfig
