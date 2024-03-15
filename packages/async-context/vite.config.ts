import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		dts({
			rollupTypes: true
		}),
	],
	build: {
		lib: {
			name: "async-context",
			fileName: (format) => `index.${format}.js`,
			entry: "src/index.ts",
			formats: ["umd", "es"]
		},
		sourcemap: true,
	},
})