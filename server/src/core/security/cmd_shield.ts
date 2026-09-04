export interface CommandRiskAnalysis {
  isDangerous: boolean;
  requiresConfirmation: boolean;
  isBlocked: boolean;
  reason?: string;
  category: 'safe' | 'modification' | 'execution' | 'destructive' | 'forbidden';
}

export class CommandShield {
  // Commands that should be strictly blocked under any circumstance
  private static FORBIDDEN_PATTERNS = [
    /rm\s+-[a-zA-Z]*r[a-zA-Z0-9_-]*\s+.*(\/|~|\$HOME|\.\.)(\s|$)/,
    /rm\s+(-[a-zA-Z]+\s+)*(-rf|-r|-f)\s+(\/|~|\$HOME|\.\.)(\s|$)/,
    /mkfs(\.|\s)/,
    /dd\s+if=.*of=\/dev\//,
    /:\(\)\s*\{\s*:\|:&\s*\};\s*:/, // Fork bomb
    />\s*\/dev\/sda/,
    /chmod\s+(-R\s+)?777\s+(\/|~|\$HOME)/,
    /curl\s+.*\|\s*(sh|bash)/,
    /wget\s+.*\|\s*(sh|bash)/,
    /nc\s+-e\s+\/bin\/(ba)?sh/, // Netcat reverse shell
    /shutdown\s+(-h|-r|now)/,
    /reboot/,
    /init\s+0/,
  ];

  // Commands that are potentially destructive and require explicit confirmation
  private static CONFIRMATION_PATTERNS = [
    /git\s+push\s+--force/,
    /git\s+reset\s+--hard/,
    /git\s+clean\s+-fdx?/,
    /rm\s+-rf?/,
    /npm\s+publish/,
    /docker\s+system\s+prune/,
    /docker\s+rm\s+-f/,
    /drop\s+database/i,
    /truncate\s+table/i,
  ];

  public static analyzeCommand(cmd: string): CommandRiskAnalysis {
    const trimmed = cmd.trim();

    if (!trimmed) {
      return {
        isDangerous: false,
        requiresConfirmation: false,
        isBlocked: false,
        category: 'safe',
      };
    }

    // Check for strictly forbidden destructive commands
    for (const pattern of this.FORBIDDEN_PATTERNS) {
      if (pattern.test(trimmed)) {
        return {
          isDangerous: true,
          requiresConfirmation: false,
          isBlocked: true,
          reason: `Command matches forbidden safety policy: ${pattern.toString()}`,
          category: 'forbidden',
        };
      }
    }

    // Check for commands requiring explicit confirmation
    for (const pattern of this.CONFIRMATION_PATTERNS) {
      if (pattern.test(trimmed)) {
        return {
          isDangerous: true,
          requiresConfirmation: true,
          isBlocked: false,
          reason: `Command performs potentially destructive actions requiring user confirmation.`,
          category: 'destructive',
        };
      }
    }

    // Default execution
    return {
      isDangerous: false,
      requiresConfirmation: false,
      isBlocked: false,
      category: 'execution',
    };
  }
}
