import "dotenv/config";
import { encryptSecret, decryptSecret, encryptionAvailable } from "../src/lib/crypto";

function run() {
  let pass = true;
  const ok = (l: string, c: boolean) => { if (!c) pass = false; console.log(`${c?"OK  ":"FAIL"} ${l}`); };

  ok("encryption available (CLERK_SECRET_KEY fallback or APP_ENCRYPTION_KEY)", encryptionAvailable());

  const secret = "rzp_secret_9aF3kP2wQ7zR1tYbN8mLx0Vc"; // sample razorpay-style secret
  const enc = encryptSecret(secret);
  ok("ciphertext differs from plaintext", enc !== secret && !enc.includes(secret));
  ok("ciphertext is versioned v1:iv:tag:ct", /^v1:[^:]+:[^:]+:[^:]+$/.test(enc));
  ok("roundtrip decrypts to original", decryptSecret(enc) === secret);

  // determinism: same plaintext → different ciphertext (random IV)
  ok("non-deterministic (random IV per encrypt)", encryptSecret(secret) !== enc);

  // tamper detection: flip a char in the ciphertext segment → must throw (GCM auth)
  const parts = enc.split(":");
  const ctBuf = Buffer.from(parts[3], "base64");
  ctBuf[0] = ctBuf[0] ^ 0xff;
  const tampered = `${parts[0]}:${parts[1]}:${parts[2]}:${ctBuf.toString("base64")}`;
  let threw = false;
  try { decryptSecret(tampered); } catch { threw = true; }
  ok("tampered ciphertext is rejected (AES-GCM auth tag)", threw);

  // empty / unicode
  ok("unicode secret roundtrips", decryptSecret(encryptSecret("naïve-✓-secret")) === "naïve-✓-secret");

  console.log(`\n${pass ? "✓ PASS — secret encryption at rest is correct, authenticated, non-deterministic" : "✗ FAIL"}`);
  if (!pass) process.exit(1);
}
run();
