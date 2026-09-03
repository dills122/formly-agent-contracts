import type {
  RuntimeHostFailureCode,
  RuntimeHostFailureExplanation,
  RuntimeHostFailurePhase,
} from "./runtime-host/protocol.js";

export type WorkspaceProjectFailureCode =
  | RuntimeHostFailureCode
  | "WORKER_ABORTED"
  | "WORKER_CRASHED"
  | "WORKER_FAILURE"
  | "WORKER_ISOLATION_UNAVAILABLE"
  | "WORKER_MESSAGE_INVALID"
  | "WORKER_REQUEST_MISMATCH"
  | "WORKER_TIMEOUT";

/** Local runtime result only; never serialized into contract artifacts. */
export interface WorkspaceProjectFailure {
  readonly code: WorkspaceProjectFailureCode;
  readonly configPath: string;
  readonly phase: RuntimeHostFailurePhase;
  readonly explanation?: RuntimeHostFailureExplanation;
}
