/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  api: {
    // Increase the body size limit for POSTs if needed
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
}

module.exports = nextConfig
