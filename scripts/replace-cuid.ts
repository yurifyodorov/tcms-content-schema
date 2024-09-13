import fs from "fs";
import path from "path";
import chokidar from "chokidar";
import { createId } from '@paralleldrive/cuid2';

function replaceCuidInFile(file: string) {
  try {
    let content = fs.readFileSync(file, "utf8");
    const updatedContent = content.replace(/{cuid}/g, () => createId());

    if (content !== updatedContent) {
      fs.writeFileSync(file, updatedContent, "utf8");
      console.log(`Обновлено: ${file}`);
    }
  } catch (error) {
    console.error(`Ошибка при обновлении файла ${file}:`, error);
  }
}

function watchYAMLFiles(relativePath: string) {
  const directory = path.join(process.cwd(), relativePath);
  const watcher = chokidar.watch(path.join(directory, "**/*.yaml"), {
    ignored: /^\./,
    persistent: true,
    ignoreInitial: false,
  });

  watcher.on("add", (file) => {
    replaceCuidInFile(file);
  });

  // Обработка при изменении файла
  watcher.on("change", (file) => {
    replaceCuidInFile(file);
  });
}

// Использование аргумента командной строки для указания относительного пути
const relativePath: string = process.argv[2]; // По умолчанию используется './test-structure'
watchYAMLFiles(relativePath);
