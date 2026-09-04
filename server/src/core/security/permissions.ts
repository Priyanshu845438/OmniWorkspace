import { PermissionLevel } from '../../types/index.js';

export interface PermissionPolicy {
  autoApproveLevel: PermissionLevel; // Default: LEVEL_1_MODIFY
  requireConfirmationForLevel2: boolean; // Terminal commands, tests, builds
  requireConfirmationForLevel3: boolean; // External network requests
  requireConfirmationForLevel4: boolean; // Destructive file deletion / git force push (always true by default)
}

export class PermissionManager {
  private policy: PermissionPolicy;

  constructor(customPolicy?: Partial<PermissionPolicy>) {
    this.policy = {
      autoApproveLevel: PermissionLevel.LEVEL_1_MODIFY,
      requireConfirmationForLevel2: false, // Can be toggled in settings
      requireConfirmationForLevel3: false,
      requireConfirmationForLevel4: true, // Always confirmed
      ...customPolicy,
    };
  }

  public getPolicy(): PermissionPolicy {
    return { ...this.policy };
  }

  public updatePolicy(newPolicy: Partial<PermissionPolicy>) {
    this.policy = { ...this.policy, ...newPolicy };
  }

  public requiresUserApproval(requiredLevel: PermissionLevel, isDangerous: boolean = false): boolean {
    if (isDangerous || requiredLevel >= PermissionLevel.LEVEL_4_DESTRUCTIVE) {
      return true;
    }

    if (requiredLevel === PermissionLevel.LEVEL_3_NETWORK && this.policy.requireConfirmationForLevel3) {
      return true;
    }

    if (requiredLevel === PermissionLevel.LEVEL_2_EXECUTE && this.policy.requireConfirmationForLevel2) {
      return true;
    }

    return requiredLevel > this.policy.autoApproveLevel;
  }
}
