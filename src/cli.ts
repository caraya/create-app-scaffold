import {
  readdirSync,
  readFileSync,
  statSync,
  mkdirSync,
  writeFileSync
} from 'node:fs';
import {
  resolve,
  join
} from 'node:path';
import prompts from 'prompts';
import { Package, DependencyCollection } from "@manuth/package-json-editor";

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
      { title: 'None (vanilla TS)', value: 'vanilla' }
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
      initial: true
    },
    {
      type: 'confirm',
      name: 'eslint',
      message: 'Install ESLint + Google shareable config?',
      initial: true
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
      vite: '*',
      typescript: '*',
      '@types/node': '*'
    }
  });

  // 4. Framework dependencies
  if (framework === 'vue') {
    pkg.Dependencies.Add('vue','*');
    pkg.DevelopmentDependencies.Add('@vitejs/plugin-vue', '*');
    if (useRouter) {
      pkg.DevelopmentDependencies.Add('vue-router', '*')
    }
  } else if (framework === 'react') {
    pkg.Dependencies.Add('react', '*');
    pkg.Dependencies.Add('react-dom', '*');
    pkg.DevelopmentDependencies.Add('@vitejs/plugin-react', '*');
    if (useRouter) {
      pkg.Dependencies.Add('react-router-dom', '*');
    }
  }

  // 5. Tooling dependencies
  if (playwright) {
    pkg.DevelopmentDependencies.Add('@playwright/test', '*');
  }
  if (prettier) {
    pkg.DevelopmentDependencies.Add('prettier', '*');
  }
  if (eslint) {
    pkg.DevelopmentDependencies.Add('eslint', '*');
    const eslintDependencies = new DependencyCollection(
    {
        devDependencies: {
            "@eslint/css": "^0.8.1",
            "@eslint/js": "^9.26.0",
            "@eslint/json": "^0.12.0",
            "@eslint/markdown": "^6.4.0",
            "@eslint/typescript": "^0.1.0",
            "typescript-eslint": "^8.32.1"
        }
    });
    pkg.Register(eslintDependencies);
  }

  // 6. Copy template files
  const templateDir = resolve(__dirname, '..', 'templates', framework);
  mkdirSync(join(cwd, 'src'), { recursive: true });
  copyDir(templateDir, cwd);

  // 7. Copy common config files
  if (prettier) copyFile(resolve(__dirname, '..', 'templates', 'configs', '.prettierrc'), cwd);
  if (eslint) copyFile(resolve(__dirname, '..', 'templates', 'configs', '.eslintrc.cjs'), cwd);
  if (playwright) copyDir(resolve(__dirname, '..', 'templates', 'configs', 'playwright'), cwd);

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
