/**
 * Profile-specific encryption utilities
 */

import { E2EEKeyManager } from './keyManager';

export interface EncryptedField {
  encrypted: string;
  iv: string;
}

export interface EncryptedProfileData {
  primaryEmail?: EncryptedField;
  alternateEmail?: EncryptedField;
  phone?: EncryptedField;
  department?: EncryptedField;
  bio?: EncryptedField;
}

export interface DecryptedProfileData {
  primaryEmail?: string;
  alternateEmail?: string;
  phone?: string;
  department?: string;
  bio?: string;
}

export class ProfileEncryption {
  /**
   * Encrypts sensitive profile fields
   */
  static async encryptProfileData(
    data: DecryptedProfileData,
    masterKey: CryptoKey
  ): Promise<EncryptedProfileData> {
    const encrypted: EncryptedProfileData = {};

    if (data.primaryEmail) {
      encrypted.primaryEmail = await E2EEKeyManager.encrypt(
        data.primaryEmail,
        masterKey
      );
    }

    if (data.alternateEmail) {
      encrypted.alternateEmail = await E2EEKeyManager.encrypt(
        data.alternateEmail,
        masterKey
      );
    }

    if (data.phone) {
      encrypted.phone = await E2EEKeyManager.encrypt(data.phone, masterKey);
    }

    if (data.department) {
      encrypted.department = await E2EEKeyManager.encrypt(
        data.department,
        masterKey
      );
    }

    if (data.bio) {
      encrypted.bio = await E2EEKeyManager.encrypt(data.bio, masterKey);
    }

    return encrypted;
  }

  /**
   * Decrypts sensitive profile fields
   */
  static async decryptProfileData(
    data: EncryptedProfileData,
    masterKey: CryptoKey
  ): Promise<DecryptedProfileData> {
    const decrypted: DecryptedProfileData = {};

    if (data.primaryEmail?.encrypted && data.primaryEmail?.iv) {
      decrypted.primaryEmail = await E2EEKeyManager.decrypt(
        data.primaryEmail.encrypted,
        data.primaryEmail.iv,
        masterKey
      );
    }

    if (data.alternateEmail?.encrypted && data.alternateEmail?.iv) {
      decrypted.alternateEmail = await E2EEKeyManager.decrypt(
        data.alternateEmail.encrypted,
        data.alternateEmail.iv,
        masterKey
      );
    }

    if (data.phone?.encrypted && data.phone?.iv) {
      decrypted.phone = await E2EEKeyManager.decrypt(
        data.phone.encrypted,
        data.phone.iv,
        masterKey
      );
    }

    if (data.department?.encrypted && data.department?.iv) {
      decrypted.department = await E2EEKeyManager.decrypt(
        data.department.encrypted,
        data.department.iv,
        masterKey
      );
    }

    if (data.bio?.encrypted && data.bio?.iv) {
      decrypted.bio = await E2EEKeyManager.decrypt(
        data.bio.encrypted,
        data.bio.iv,
        masterKey
      );
    }

    return decrypted;
  }
}
