
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'crypto'

function getEncryptionKey(): Buffer {
  const key = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY

  if (!key || !/^[a-fA-F0-9]{64}$/.test(key)) {
    throw new Error('Kunci enkripsi Google Drive belum dikonfigurasi dengan benar.')
  }

  return Buffer.from(key, 'hex')
}

export function encryptToken(token: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(12)

  const cipher = createCipheriv('aes-256-gcm', key, iv)

  const encrypted = Buffer.concat([
    cipher.update(token, 'utf8'),
    cipher.final(),
  ])

  const authTag = cipher.getAuthTag()

  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':')
}

export function decryptToken(encryptedToken: string): string {
  const key = getEncryptionKey()
  const parts = encryptedToken.split(':')

  if (parts.length !== 3) {
    throw new Error('Format token terenkripsi tidak valid.')
  }

  const [ivEncoded, authTagEncoded, dataEncoded] = parts

  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivEncoded, 'base64')
  )

  decipher.setAuthTag(Buffer.from(authTagEncoded, 'base64'))

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataEncoded, 'base64')),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}
