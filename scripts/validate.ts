import fs from "fs";
import path from "path";
import chokidar from "chokidar";
import * as Yaml from "yaml";
import Ajv from "ajv";
import { Case } from "../schemas/case.schema";
import { Feature } from "../schemas/feature.schema";
import { Manifest } from "../schemas/manifest.schema";

export class ContentParser {
  private ajv = new Ajv({
    strict: false,
  });

  async parse<T>(text: string, schema: object) {
    const resultObject: unknown = await Yaml.parse(text);

    if (this.ajv.validate(schema, resultObject)) {
      return resultObject as T;
    } else {
      console.log(this.ajv.errors);
      throw this.ajv.errors;
    }
  }
}

const contentParser = new ContentParser();

// CHECK IDS
let ids = new Set<string>();

const checkIds = (obj: any, context: string, path = "") => {
  if (obj && typeof obj === "object") {
    if (obj.id) {
      if (ids.has(obj.id)) {
        console.error(
          `Duplicate ID found: ${obj.id} in ${context} path: ${path}`
        );
      } else {
        ids.add(obj.id);
      }
    }
    Object.entries(obj).forEach(([key, value]) =>
      checkIds(value, `${path}.${key}`, context)
    );
  }
};

// VALIDATE SCHEMA

const caseSchema = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../schemas/case.schema.json"), {
    encoding: "utf8",
  })
);
const featureSchema = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../schemas/feature.schema.json"), {
    encoding: "utf8",
  })
);
const manifestSchema = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../schemas/manifest.schema.json"), {
    encoding: "utf8",
  })
);

async function validateCase(file: string) {
  const caseItem = await contentParser.parse<Case>(
    fs.readFileSync(file, "utf8"),
    caseSchema
  );

  checkIds(caseItem, file);
  return caseItem;
}

async function validateFeature(file: string) {
  const feature = await contentParser.parse<Feature>(
    fs.readFileSync(file, "utf8"),
    featureSchema
  );
  checkIds(feature, file);
  return feature;
}

async function validateManifest(file: string) {
  return await contentParser.parse<Manifest>(
      fs.readFileSync(file, "utf8"),
      manifestSchema
  );
}

async function scanDirectory(directoryPath: string) {
  ids = new Set();

  const manifest = await validateManifest(`${directoryPath}/manifest.yaml`);

  for (const featurePath of manifest.features) {
    const feature = await validateFeature(
      `${directoryPath}/features/${featurePath}/feature.yaml`
    );

    for (const casePath of feature.cases) {
      await validateCase(
        `${directoryPath}/features/${featurePath}/cases/${casePath}/case.yaml`
      );
    }
  }

  console.log("All files are valid");
}

function watchYAMLFiles(relativePath: string) {
  const directory = path.join(process.cwd(), relativePath);
  const watcher = chokidar.watch(path.join(directory, "**/*.yaml"), {
    ignored: /^\./,
    persistent: true,
    ignoreInitial: false,
  });

  scanDirectory(directory).catch((e) => {
    console.error(e);
  });
  // Обработка при изменении файла
  watcher.on("change", async (file) => {
    try {
      await scanDirectory(directory);
    } catch (error) {
      console.error(error);
    }
  });
}

const relativePath: string = process.argv[2];
watchYAMLFiles(relativePath);
