const { build } = require("esbuild");

const config = {
    entryPoints: ["src/index.ts"],
    bundle: true,
    platform: "node",
    target: "node18",
    outfile: "dist/bundle.js",
    sourcemap: false,
    minify: false,
    external: ["serialport"],
    format: "cjs",
    tsconfig: "tsconfig.json",
    logLevel: "info",
};

build(config)
    .then(() => {
        console.log("Build completed successfully with esbuild!");
    })
    .catch((error) => {
        console.error("Build failed:", error);
        process.exit(1);
    });
