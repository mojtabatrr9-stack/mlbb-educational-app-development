import { randomBytes, scryptSync } from 'node:crypto';
const email = process.argv[2];
if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
  console.error(
    'Usage: node scripts/setup-admin.mjs owner@example.com\nOptionally provide ADMIN_SETUP_PASSWORD through a secure environment. Otherwise a strong password is generated.',
  );
  process.exit(1);
}
const password = process.env.ADMIN_SETUP_PASSWORD || randomBytes(24).toString('base64url');
if (password.length < 12) {
  console.error('Choose a password with at least 12 characters.');
  process.exit(1);
}
const salt = randomBytes(24).toString('hex');
const hash = scryptSync(password, salt, 64).toString('hex');
const secret = randomBytes(20);
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
let bits = '';
for (const byte of secret) bits += byte.toString(2).padStart(8, '0');
let totp = '';
for (let i = 0; i < bits.length; i += 5)
  totp += alphabet[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)];
console.error(
  'Store these values in your private environment, never in source control. This command does not modify files.',
);
console.log(
  `ADMIN_EMAIL=${email}\nADMIN_PASSWORD_HASH=${salt}:${hash}\nADMIN_TOTP_SECRET=${totp}\nSESSION_SECRET=${randomBytes(48).toString('hex')}`,
);
if (!process.env.ADMIN_SETUP_PASSWORD)
  console.error(`\nGenerated owner password (store in a password manager): ${password}`);
console.error(
  `\nAuthenticator provisioning URI (treat as a secret):\notpauth://totp/${encodeURIComponent(`Nexus:${email}`)}?secret=${totp}&issuer=Nexus&algorithm=SHA1&digits=6&period=30\n\nAdd the Base32 secret to your authenticator manually or generate a QR code locally. Restart the server after setting the variables. Do not share these values or put the URI into an online QR service.`,
);
