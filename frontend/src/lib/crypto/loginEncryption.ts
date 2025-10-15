/**
 * Login encryption hook
 * Handles master key derivation and storage after login
 */

import { E2EEKeyManager } from '@/lib/crypto/keyManager';

export async function handleLoginEncryption(
  password: string,
  encryptionSalt: string
): Promise<void> {
  try {
    // Derive master key from password and salt
    const masterKey = await E2EEKeyManager.deriveMasterKey(password, encryptionSalt);
    
    // Store in session storage for current session
    await E2EEKeyManager.storeMasterKeyInSession(masterKey);
    
  } catch (error) {
    console.error('Failed to derive master key:', error);
    throw error;
  }
}

export function clearEncryptionKeys(): void {
  E2EEKeyManager.clearMasterKey();
}
