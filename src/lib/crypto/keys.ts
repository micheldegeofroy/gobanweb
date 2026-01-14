// Cryptographic key-pair system for accountless game authentication
// Uses ECDSA P-256 for compact keys that can fit in URLs

export interface KeyPair {
  publicKey: string;  // Base64url encoded JWK
  privateKey: string; // Base64url encoded JWK
}

// Generate a new ECDSA key pair for a game
export async function generateKeyPair(): Promise<KeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true, // extractable
    ['sign', 'verify']
  );

  const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);

  // Encode as base64url for URL-safe transport
  return {
    publicKey: btoa(JSON.stringify(publicKeyJwk)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''),
    privateKey: btoa(JSON.stringify(privateKeyJwk)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''),
  };
}

// Parse a base64url encoded key back to JWK
function parseKey(encoded: string): JsonWebKey {
  // Add back padding if needed
  let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return JSON.parse(atob(base64));
}

// Verify that a private key matches a public key
// Does this by signing a challenge with the private key and verifying with public key
export async function verifyKeyPair(publicKeyEncoded: string, privateKeyEncoded: string): Promise<boolean> {
  try {
    const publicKeyJwk = parseKey(publicKeyEncoded);
    const privateKeyJwk = parseKey(privateKeyEncoded);

    // Import the keys
    const publicKey = await crypto.subtle.importKey(
      'jwk',
      publicKeyJwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );

    const privateKey = await crypto.subtle.importKey(
      'jwk',
      privateKeyJwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );

    // Create a challenge and sign it
    const challenge = new TextEncoder().encode('goban-auth-challenge');
    const signature = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      privateKey,
      challenge
    );

    // Verify the signature with the public key
    const isValid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      publicKey,
      signature,
      challenge
    );

    return isValid;
  } catch (error) {
    console.error('Key verification failed:', error);
    return false;
  }
}

// Generate a short game ID from the public key (first 8 chars of hash)
export async function generateGameId(publicKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(publicKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 12);
}
