import { runRuntimeExperiment, runStaticExperiment } from "./experiment.mjs";

const result = {
  static: runStaticExperiment(),
  runtime: await runRuntimeExperiment(),
};

process.stdout.write(`${JSON.stringify(result, undefined, 2)}\n`);
