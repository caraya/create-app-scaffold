
import {
  readdirSync,
  readFileSync,
  statSync,
  mkdirSync,
  writeFileSync
} from 'node:fs';
import {
  dirname,
  resolve,
  join
} from 'node:path';
import {
  fileURLToPath
} from 'url'
import prompts from 'prompts';
import { Package, DependencyCollection } from "@manuth/package-json-editor";

// emulate CommonJS __filename & __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)
/**
 * Entry point: gathers options and generates project files.
 */
async function main() {
  const cwd = process.cwd();

  // 1. Select framework
  const { framework } = await prompts({
    type: 'select',
    name: 'framework',
    message: 'Select a framework:',
    choices: [
      { title: 'Vue', value: 'vue' },
      { title: 'React', value: 'react' },
      { title: 'Vanilla TS', value: 'ts' },
      { title: 'Vanilla JS', value: 'js' }
    ],
    initial: 0
  });

  let useRouter = false;
  if (framework === 'vue' || framework === 'react') {
    const res = await prompts({
      type: 'confirm',
      name: 'useRouter',
      message: `Install ${framework === 'vue' ? 'Vue Router' : 'React Router'}?`,
      initial: true
    });
    useRouter = res.useRouter;
  }

  // 2. Tooling
  const { playwright, prettier, eslint } = await prompts([
    {
      type: 'confirm',
      name: 'playwright',
      message: 'Install Playwright test?',
      initial: false
    },
    {
      type: 'confirm',
      name: 'prettier',
      message: 'Install Prettier?',
      initial: false
    },
    {
      type: 'confirm',
      name: 'eslint',
      message: 'Install ESLint?',
      initial: false
    }
  ]);

  // 3. Assemble package.json for the new project
 const pkg = new Package({
    name: 'my-app',
    version: '0.1.0',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      serve: 'vite preview'
    },
    dependencies: {},
    devDependencies: {
      vite: '>=6.3.5',
      typescript: '>=5.3.8',
      '@types/node': '>=22.15.21'
    }
  });

  // 4. Framework dependencies
  if (framework === 'vue') {
    pkg.Dependencies.Add('vue','>=3.15.14');
    pkg.DevelopmentDependencies.Add('@vitejs/plugin-vue', '>=5.2.4');
    if (useRouter) {
      pkg.DevelopmentDependencies.Add('vue-router', '>=4.5.1')
    }
  } else if (framework === 'react') {
    pkg.Dependencies.Add('react', '>=19.0.1');
    pkg.Dependencies.Add('react-dom', '>=19.0.1');
    pkg.DevelopmentDependencies.Add('@vitejs/plugin-react', '>=4.4.1');
    if (useRouter) {
      pkg.Dependencies.Add('react-router-dom', '>=7.6.0');
    }
  }

  // 5. Tooling dependencies
  if (playwright) {
    pkg.DevelopmentDependencies.Add('@playwright/test', '>=1.52.0');
  }
  if (prettier) {
    pkg.DevelopmentDependencies.Add('prettier', '>=3.5.3');
  }
  if (eslint) {
    pkg.DevelopmentDependencies.Add('eslint', '>=9.27.0');
    const eslintDependencies = new DependencyCollection(
    {
        devDependencies: {
            "@eslint/css": ">=0.8.1",
            "@eslint/js": ">=9.27.0",
            "@eslint/json": ">=0.12.0",
            "@eslint/markdown": ">=6.4.0",
            "typescript-eslint": ">=8.32.1"
        }
    });
    pkg.Register(eslintDependencies);
  }

  // 6. Copy template files
  const templateDir = resolve(__dirname, '..', 'templates', framework);
  mkdirSync(join(cwd, 'src'), { recursive: true });
  copyDir(templateDir, cwd);

  // 7. Copy common config files
  // Copy typescript config
  copyFile(resolve(__dirname, '..', 'templates', 'configs', 'tsconfig.json'), cwd);
  // conditionally copy prettier, eslint, and playwright config files
  if (prettier) copyFile(resolve(__dirname, '..', 'templates', 'configs', '.prettierrc.js'), cwd);
  if (eslint) copyFile(resolve(__dirname, '..', 'templates', 'configs', '.eslint.config.js'), cwd);
  if (playwright) copyFile(resolve(__dirname, '..', 'templates', 'configs', 'playwright.config.ts'), cwd);

  // 8. Write package.json to current working directory
  const packageJsonPath = join(cwd, 'package.json')
  writeFileSync(packageJsonPath, JSON.stringify(pkg.ToJSON(), null, 2), { encoding: 'utf-8' });

  console.log('Project scaffolded successfully!');
}

/**
 * Recursively copy a directory's contents into target.
 */
function copyDir(srcDir: string, destDir: string) {
  for (const name of readdirSync(srcDir)) {
    const src = join(srcDir, name);
    const dest = join(destDir, name);
    if (statSync(src).isDirectory()) {
      mkdirSync(dest, { recursive: true });
      copyDir(src, dest);
    } else {
      writeFileSync(dest, readFileSync(src));
    }
  }
}

/**
 * Copy a single file to the current working directory.
 */
function copyFile(src: string, cwd: string) {
  const name = resolve(src).split(/[/]/).pop()!;
  writeFileSync(join(cwd, name), readFileSync(src));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
})
