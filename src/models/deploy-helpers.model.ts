// Interfaces for deploy helper function parameters

export interface UploadPatchParams {
  apiKey: string;
  projectId: string;
  patchZipBuffer: Buffer;
  manifestForUpdate: Record<string, string>;
}

export interface GetRemoteManifestParams {
  apiKey: string;
  projectId: string;
}

export interface CalculateFileDiffParams {
  localManifest: Record<string, string>;
  remoteManifest: Record<string, string>;
}
