import { defineConfig } from "vite";
import path from "path";
import fs from "fs";

function copyAssetsPlugin() {
  return {
    name: "copy-assets",
    closeBundle() {
      const srcDir = path.resolve(__dirname, "src/assets");
      const destDir = path.resolve(__dirname, "dist/assets");
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      if (fs.existsSync(srcDir)) {
        for (const file of fs.readdirSync(srcDir)) {
          const src = path.join(srcDir, file);
          const dest = path.join(destDir, file);
          if (fs.statSync(src).isFile()) {
            fs.copyFileSync(src, dest);
            console.log(`  Copied ${file} → dist/assets/`);
          }
        }
      }
    },
  };
}

function getHttpsConfig() {
  const homeDir = process.env.USERPROFILE || process.env.HOME || "~";
  const certDir = path.join(homeDir, ".office-addin-dev-certs");
  const certPath = path.join(certDir, "localhost.crt");
  const keyPath = path.join(certDir, "localhost.key");

  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    console.log("  Using trusted Office Add-in development certificates");
    return {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
    };
  }

  console.log("  Using Vite self-signed certificate (trust warning in browser)");
  return true;
}

export default defineConfig({
  root: "src",
  base: "/",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        taskpane: path.resolve(__dirname, "src/taskpane.html"),
        commands: path.resolve(__dirname, "src/commands.html"),
      },
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name].[ext]",
      },
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    https: getHttpsConfig(),
    allowedHosts: ["localhost", "127.0.0.1"],
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  plugins: [copyAssetsPlugin()],
});
