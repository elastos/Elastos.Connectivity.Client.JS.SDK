import path from "path";
import svelte from 'rollup-plugin-svelte';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import postcss from 'rollup-plugin-postcss';
import sveltePreprocess from "svelte-preprocess";
//import analyze from 'rollup-plugin-analyzer';
import typescript from "@rollup/plugin-typescript";
import pkg from './package.json';
import eslint from '@rollup/plugin-eslint';

const production = !process.env.ROLLUP_WATCH;

export default {
	input: 'src/index.ts',
	output: [
		{
			sourcemap: true,
			format: 'cjs',
			file: 'dist/index.js'
		},
		{
			sourcemap: true,
			format: 'es',
			file: 'dist.esm/index.js'
		}
	],
	external: Object.keys(pkg.dependencies || {}), // Exclude all package.json dependencies
	plugins: [
		svelte({
			preprocess: sveltePreprocess({ sourceMap: !production }),
			compilerOptions: {
				// enable run-time checks when not in production
				dev: !production
			}
		}),

		postcss({
			extract: 'bundle.css'
		}),

		// If you have external dependencies installed from
		// npm, you'll most likely need these plugins. In
		// some cases you'll need additional configuration -
		// consult the documentation for details:
		// https://github.com/rollup/plugins/tree/master/packages/commonjs
		resolve({
			browser: true,
			dedupe: ['svelte']
		}),
		commonjs(),
		typescript({
			declaration: false,
			sourceMap: true,
			inlineSources: !production
		}),

		eslint({
			throwOnError: true, // This option throws an error if there are eslint errors/warnings
		}),

		// If we're building for production (npm run build
		// instead of npm run dev), minify
		// trying to avoid optimization errors such as "_ : logger" // production && terser(),

		/*analyze({
				limit: 10
		})*/
	],
	watch: {
		clearScreen: true
	}
};