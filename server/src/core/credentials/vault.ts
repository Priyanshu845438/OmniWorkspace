import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface VaultStore {
  version: number;
  credentials: Record<string, { iv: string; tag: string; ciphertext: string }>;
}

export class CredentialVault {
  private masterKey: Buffer;
  private vaultFilePath: string;
  private memoryCache: Map<string, string> = new Map();

  constructor(storageDir: string, userKeySeed?: string) {
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true, mode: 0o700 });
    }
    this.vaultFilePath = path.join(storageDir, '.vault.enc');

    // Derive deterministic AES-256 master key from machine/seed
    const seed = userKeySeed || process.env.OMNI_VAULT_SEED || 'omni-workspace-local-master-vault-seed';
    this.masterKey = crypto.scryptSync(seed, 'omni-salt-vault-secure', 32);

    this.load();
  }

  private load() {
    if (!fs.existsSync(this.vaultFilePath)) return;

    try {
      const raw = fs.readFileSync(this.vaultFilePath, 'utf8');
      const store: VaultStore = JSON.parse(raw);

      for (const [keyName, enc] of Object.entries(store.credentials)) {
        const decipher = crypto.createDecipheriv(
          'aes-256-gcm',
          this.masterKey,
          Buffer.from(enc.iv, 'hex')
        );
        decipher.setAuthTag(Buffer.from(enc.tag, 'hex'));
        let decrypted = decipher.update(enc.ciphertext, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        this.memoryCache.set(keyName, decrypted);
      }
    } catch (err) {
      console.error('[CredentialVault] Safe load failure (corrupted or new master key):', (err as Error).message);
    }
  }

  private persist() {
    const store: VaultStore = {
      version: 1,
      credentials: {},
    };

    for (const [keyName, plaintext] of this.memoryCache.entries()) {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);
      let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
      ciphertext += cipher.final('hex');
      const tag = cipher.getAuthTag().toString('hex');

      store.credentials[keyName] = {
        iv: iv.toString('hex'),
        tag,
        ciphertext,
      };
    }

    fs.writeFileSync(this.vaultFilePath, JSON.stringify(store, null, 2), {
      encoding: 'utf8',
      mode: 0o600, // Read/write only by owner
    });
  }

  public setSecret(name: string, secret: string) {
    if (!secret || secret.trim() === '') {
      this.deleteSecret(name);
      return;
    }
    this.memoryCache.set(name, secret.trim());
    this.persist();
  }

  public getSecret(name: string): string | undefined {
    // 1. Check process environment first (e.g. OPENAI_API_KEY, NVIDIA_API_KEY)
    if (process.env[name]) {
      return process.env[name];
    }
    // 2. Check local vault
    return this.memoryCache.get(name);
  }

  public hasSecret(name: string): boolean {
    return Boolean(process.env[name] || this.memoryCache.has(name));
  }

  public deleteSecret(name: string) {
    this.memoryCache.delete(name);
    this.persist();
  }

  public listConfiguredProviders(): string[] {
    const list = Array.from(this.memoryCache.keys());
    for (const key of ['OPENAI_API_KEY', 'NVIDIA_API_KEY', 'OPENROUTER_API_KEY', 'OLLAMA_HOST']) {
      if (process.env[key] && !list.includes(key)) {
        list.push(key);
      }
    }
    return list;
  }

  /**
   * Sanitizes strings to prevent API keys and sensitive tokens from leaking into logs or traces.
   */
  public redact(content: string): string {
    if (!content) return content;
    let redacted = content;

    for (const secret of this.memoryCache.values()) {
      if (secret && secret.length >= 6) {
        redacted = redacted.replaceAll(secret, '***REDACTED_API_KEY***');
      }
    }

    // Generic regex checks for common bearer tokens and keys
    redacted = redacted.replace(/sk-[a-zA-Z0-9]{20,}/g, 'sk-***REDACTED***');
    redacted = redacted.replace(/nvapi-[a-zA-Z0-9_-]{20,}/g, 'nvapi-***REDACTED***');
    redacted = redacted.replace(/Bearer\s+[a-zA-Z0-9_-]{20,}/gi, 'Bearer ***REDACTED***');

    return redacted;
  }
}
