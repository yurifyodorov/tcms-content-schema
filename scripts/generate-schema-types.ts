import fs from "fs";
import path from "path";
import { compileFromFile } from "json-schema-to-typescript";
import chokidar from "chokidar";

async function convertSchemaToType(file: string): Promise<void> {
  try {
    const ts: string = await compileFromFile(file);
    fs.writeFileSync(
      path.join(path.dirname(file), path.basename(file, ".json") + ".d.ts"),
      ts
    );
    console.log(`Конвертировано: ${file}`);
  } catch (error) {
    console.error(`Ошибка при конвертации файла ${file}:`, error);
  }
}

function watchSchemas(relativePath: string): void {
  const directory: string = path.join(process.cwd(), relativePath);

  const watcher = chokidar.watch(path.join(directory, "*.json"), {
    ignored: /^\./,
    persistent: true,
    ignoreInitial: false,
  });

  watcher
    .on("add", async (file) => {
      console.log(`Найден новый файл: ${file}`);
      await convertSchemaToType(file);
    })
    .on("change", async (file) => {
      console.log(`Обнаружены изменения в файле: ${file}`);
      await convertSchemaToType(file);
    });
}

// Использование аргумента командной строки для указания относительного пути
const relativePath: string = process.argv[2];
watchSchemas(relativePath);
