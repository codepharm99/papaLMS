import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: { root: __dirname },
  buildActivity: false, 
  buildActivityPosition: 'bottom-right',
};



export default nextConfig;