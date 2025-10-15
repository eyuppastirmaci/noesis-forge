/**
 * E2EE Key Management
 * Handles client-side encryption/decryption for sensitive user data
 */

export class E2EEKeyManager {
  private static readonly PBKDF2_ITERATIONS = 100000;
  private static readonly KEY_LENGTH = 256;
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly IV_LENGTH = 12;

  /**
   * Derives a master encryption key from user's password and salt
   * @param password User's password
   * @param salt Base64-encoded salt
   * @returns CryptoKey for encryption/decryption
   */
  static async deriveMasterKey(
    password: string,
    salt: string
  ): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const saltBuffer = Uint8Array.from(atob(salt), (c) => c.charCodeAt(0));

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: this.PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Generates a random salt for key derivation
   * @returns Base64-encoded salt
   */
  static generateSalt(): string {
    const saltBuffer = crypto.getRandomValues(new Uint8Array(16));
    return btoa(String.fromCharCode(...saltBuffer));
  }

  /**
   * Encrypts plaintext data
   * @param data Plaintext to encrypt
   * @param masterKey Encryption key
   * @returns Object with encrypted data (base64) and IV (base64)
   */
  static async encrypt(
    data: string,
    masterKey: CryptoKey
  ): Promise<{ encrypted: string; iv: string }> {
    if (!data) {
      return { encrypted: '', iv: '' };
    }

    const enc = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

    const encrypted = await crypto.subtle.encrypt(
      { name: this.ALGORITHM, iv },
      masterKey,
      enc.encode(data)
    );

    return {
      encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      iv: btoa(String.fromCharCode(...iv)),
    };
  }

  /**
   * Decrypts encrypted data
   * @param encryptedData Base64-encoded encrypted data
   * @param iv Base64-encoded initialization vector
   * @param masterKey Decryption key
   * @returns Decrypted plaintext
   */
  static async decrypt(
    encryptedData: string,
    iv: string,
    masterKey: CryptoKey
  ): Promise<string> {
    if (!encryptedData || !iv) {
      return '';
    }

    const encryptedBuffer = Uint8Array.from(atob(encryptedData), (c) =>
      c.charCodeAt(0)
    );
    const ivBuffer = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));

    const decrypted = await crypto.subtle.decrypt(
      { name: this.ALGORITHM, iv: ivBuffer },
      masterKey,
      encryptedBuffer
    );

    return new TextDecoder().decode(decrypted);
  }

  /**
   * Stores master key in session storage (temporary)
   * This is not persistent across sessions
   */
  static storeMasterKeyInSession(key: CryptoKey): Promise<void> {
    return crypto.subtle.exportKey('raw', key).then((exported) => {
      const keyData = btoa(String.fromCharCode(...new Uint8Array(exported)));
      sessionStorage.setItem('e2ee_master_key', keyData);
    });
  }

  /**
   * Retrieves master key from session storage
   */
  static async getMasterKeyFromSession(): Promise<CryptoKey | null> {
    const keyData = sessionStorage.getItem('e2ee_master_key');
    if (!keyData) return null;

    const keyBuffer = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));
    return crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Clears master key from session storage
   */
  static clearMasterKey(): void {
    sessionStorage.removeItem('e2ee_master_key');
  }
}
