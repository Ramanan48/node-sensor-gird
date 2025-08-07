import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load and combine all YAML files
const sensorData = YAML.load(path.join(__dirname, "docs/sensorData.yaml"));
const channel = YAML.load(path.join(__dirname, "docs/channel.yaml"));

// Merge paths
base.paths = {
  ...sensorData.paths,
  ...channel.paths
};

export default (app) => {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(base));
};
