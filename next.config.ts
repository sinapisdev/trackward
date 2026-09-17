import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Tira o selo do Next do canto da tela, que cobria o rodapé da lateral.
  devIndicators: false,
  // Libera abrir o app pelo IP da máquina na rede local, para testar no celular.
  allowedDevOrigins: ['192.168.18.92', '*.local'],
}

export default nextConfig
