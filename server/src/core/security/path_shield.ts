import path from 'path';
import fs from 'fs';

export class PathShield {
  private allowedRoots: string[];

  constructor(workspacePath: string, extraAllowedRoots: string[] = []) {
    this.allowedRoots = [
      path.resolve(workspacePath),
      ...extraAllowedRoots.map((r) => path.resolve(r)),
    ];
  }

  public setWorkspaceRoot(newRoot: string) {
    this.allowedRoots[0] = path.resolve(newRoot);
  }

  public resolveSafePath(userPath: string): { safePath: string; isAllowed: boolean; reason?: string } {
    if (!userPath || typeof userPath !== 'string') {
      return { safePath: '', isAllowed: false, reason: 'Invalid path input' };
    }

    // Reject null bytes or URL control characters
    if (userPath.includes('\0')) {
      return { safePath: '', isAllowed: false, reason: 'Null byte injection detected in path' };
    }

    // If path is relative, resolve it against workspace root
    const resolvedPath = path.isAbsolute(userPath)
      ? path.resolve(userPath)
      : path.resolve(this.allowedRoots[0], userPath);

    // Canonical check: must start with one of the allowed roots
    const isWithinBounds = this.allowedRoots.some((root) => {
      const relative = path.relative(root, resolvedPath);
      return !relative.startsWith('..') && !path.isAbsolute(relative);
    });

    if (!isWithinBounds) {
      return {
        safePath: resolvedPath,
        isAllowed: false,
        reason: `Path traversal violation: Target [${resolvedPath}] is outside allowed workspace boundaries.`,
      };
    }

    // Check for symlink traversal escape if target exists
    if (fs.existsSync(resolvedPath)) {
      try {
        const realPath = fs.realpathSync(resolvedPath);
        const realWithinBounds = this.allowedRoots.some((root) => {
          const relative = path.relative(root, realPath);
          return !relative.startsWith('..') && !path.isAbsolute(relative);
        });

        if (!realWithinBounds) {
          return {
            safePath: realPath,
            isAllowed: false,
            reason: `Symlink escape detected: [${resolvedPath}] points to [${realPath}] outside workspace.`,
          };
        }
      } catch (err) {
        return {
          safePath: resolvedPath,
          isAllowed: false,
          reason: `Failed to inspect filesystem path: ${(err as Error).message}`,
        };
      }
    }

    return { safePath: resolvedPath, isAllowed: true };
  }

  public isSensitiveFile(filePath: string): boolean {
    const basename = path.basename(filePath).toLowerCase();
    const sensitiveNames = [
      '.env',
      '.env.local',
      '.env.production',
      '.git-credentials',
      'id_rsa',
      'id_ed25519',
      'key.pem',
      'cert.pem',
      'credentials.json',
      'service-account.json',
    ];
    return sensitiveNames.includes(basename) || basename.endsWith('.key');
  }
}
