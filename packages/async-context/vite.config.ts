import { defineConfig } from "vite";
import { resolve } from "path";
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
			entry: "src/index.ts",
			formats: ["umd"]
		}
	}
})