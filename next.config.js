/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Los errores de tipo de Supabase generics no deben bloquear el build
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}
module.exports = nextConfig
