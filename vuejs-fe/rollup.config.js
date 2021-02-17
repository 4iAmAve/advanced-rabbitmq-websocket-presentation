import svelte from 'rollup-plugin-svelte';
import babel from 'rollup-plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import livereload from 'rollup-plugin-livereload';
import { terser } from 'rollup-plugin-terser';
import sveltePreprocess from 'svelte-preprocess';
import typescript from '@rollup/plugin-typescript';

const production = !process.env.ROLLUP_WATCH;
const umd = process.env.npm_config_argv.includes('build');
export default {
  input: umd ? 'src/main_umd.ts' : 'src/main.ts',
  output: {
    sourcemap: true,
    format: umd ? 'umd' : 'iife',
    name: 'app',
    file: umd ? '../public/dummy-module.js' : 'public/build/bundle.js',
  },
  plugins: [
    // Will replace process.env.production with production
    svelte({
      // enable run-time checks when not in production
      dev: !production,
      // we could extract any component CSS out into
      // a separate file like this:
      // css: css => {
      // 	css.write('public/build/bundle.css');
      // },
      preprocess: sveltePreprocess(),
    }),

    // If you have external dependencies installed from
    // npm, you'll most likely need these plugins. In
    // some cases you'll need additional configuration -
    // consult the documentation for details:
    // https://github.com/rollup/plugins/tree/master/packages/commonjs
    resolve({
      browser: true,
      dedupe: ['svelte'],
    }),
    commonjs(),
    typescript({ sourceMap: true }),
    umd &&
      babel({
        extensions: ['ts', 'jsx', 'tsx', '.js', '.mjs', '.html', '.svelte'],
        runtimeHelpers: true,
        exclude: ['node_modules/@babel/**'],
        presets: [
          '@babel/typescript',
          [
            '@babel/preset-env',
            {
              targets: '> 0.25%, not dead, IE 11',
            },
          ],
        ],
        plugins: [
          '@babel/plugin-syntax-dynamic-import',
          '@babel/plugin-syntax-import-meta',
          [
            '@babel/plugin-transform-runtime',
            {
              useESModules: true,
            },
          ],
        ],
      }),
    // In dev mode, call `npm run start` once
    // the bundle has been generated
    !production && serve(),

    // Watch the `public` directory and refresh the
    // browser on changes when not in production
    !production && livereload('public'),

    // If we're building for production (npm run build
    // instead of npm run dev), minify
    production && terser(),
  ],
  watch: {
    clearScreen: false,
  },
};

function serve() {
  let started = false;

  return {
    writeBundle() {
      if (!started) {
        started = true;

        require('child_process').spawn('npm', ['run', 'start', '--', '--dev'], {
          stdio: ['ignore', 'inherit', 'inherit'],
          shell: true,
        });
      }
    },
  };
}
