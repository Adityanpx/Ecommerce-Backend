/**
 * R2 connectivity verification — run BEFORE building any upload UI.
 *
 * Tests the real flow against your real buckets, bypassing the Express app
 * entirely so a failure here is unambiguously an R2/credentials problem
 * rather than an auth or routing problem.
 *
 * Usage, from the backend project root:
 *   node --env-file=.env scripts/verify-r2.mjs
 *
 * (Node 20.6+ supports --env-file. On older Node, prefix the vars manually.)
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const {
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_ENDPOINT,
  R2_PUBLIC_BUCKET,
  R2_PRIVATE_BUCKET,
  R2_PUBLIC_BASE_URL,
} = process.env;

const pass = (m) => console.log(`  \x1b[32mPASS\x1b[0m  ${m}`);
const fail = (m) => console.log(`  \x1b[31mFAIL\x1b[0m  ${m}`);
const info = (m) => console.log(`        ${m}`);
const head = (m) => console.log(`\n\x1b[1m${m}\x1b[0m`);

let failures = 0;
const check = (ok, msg, detail) => {
  if (ok) pass(msg);
  else {
    fail(msg);
    if (detail) info(detail);
    failures += 1;
  }
};

// --- 0. Env sanity -----------------------------------------------------------
head('0. Environment');
const required = {
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_ENDPOINT,
  R2_PUBLIC_BUCKET,
  R2_PRIVATE_BUCKET,
  R2_PUBLIC_BASE_URL,
};
for (const [k, v] of Object.entries(required)) {
  check(Boolean(v), `${k} is set`, 'Missing from .env — the rest of this script will fail.');
}
if (failures > 0) {
  console.log('\nFix the env vars above first.\n');
  process.exit(1);
}

const client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

// A tiny real PNG (1x1 red pixel) so we're uploading genuine image bytes,
// not a text file with an image extension.
const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const stamp = Date.now();
const publicKey = `products/_verify-${stamp}.png`;
const privateKey = `returns/_verify-${stamp}.png`;

// --- 1. Credentials + bucket access -----------------------------------------
head('1. Credentials and bucket access');
for (const bucket of [R2_PUBLIC_BUCKET, R2_PRIVATE_BUCKET]) {
  try {
    await client.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 }));
    pass(`Can list ${bucket}`);
  } catch (e) {
    check(false, `Can list ${bucket}`, `${e.name}: ${e.message}`);
  }
}

// --- 2. Presigned PUT to the public bucket ----------------------------------
head('2. Presigned upload — public bucket');
let publicUploadOk = false;
try {
  const url = await getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: R2_PUBLIC_BUCKET, Key: publicKey, ContentType: 'image/png' }),
    { expiresIn: 300, signableHeaders: new Set(['content-type']) },
  );
  pass('Generated presigned PUT URL');

  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/png' },
    body: PNG_BYTES,
  });
  check(res.ok, `Uploaded via presigned URL (HTTP ${res.status})`, await safeText(res));
  publicUploadOk = res.ok;
} catch (e) {
  check(false, 'Presigned upload to public bucket', `${e.name}: ${e.message}`);
}

// --- 3. Content-Type binding (the classic gotcha) ----------------------------
head('3. Content-Type must match the signature');
try {
  const url = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: R2_PUBLIC_BUCKET,
      Key: `products/_verify-mismatch-${stamp}.png`,
      ContentType: 'image/png',
    }),
    { expiresIn: 300, signableHeaders: new Set(['content-type']) },
  );
  // Deliberately send the WRONG content-type. R2 must reject this.
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    body: PNG_BYTES,
  });
  check(
    !res.ok,
    `Mismatched Content-Type is rejected (HTTP ${res.status})`,
    res.ok
      ? 'R2 ACCEPTED a mismatched content-type — unexpected; your frontend must still send the exact signed type.'
      : undefined,
  );
} catch (e) {
  check(false, 'Content-Type mismatch test', `${e.name}: ${e.message}`);
}

// --- 4. Public read via the public base URL ----------------------------------
head('4. Public read (no credentials)');
if (publicUploadOk) {
  const publicUrl = `${R2_PUBLIC_BASE_URL.replace(/\/$/, '')}/${publicKey}`;
  info(publicUrl);
  try {
    const res = await fetch(publicUrl);
    check(
      res.ok,
      `Public URL is readable without auth (HTTP ${res.status})`,
      res.ok
        ? undefined
        : 'Public Development URL may be disabled, or R2_PUBLIC_BASE_URL is wrong.',
    );
    if (res.ok) {
      const ct = res.headers.get('content-type');
      check(ct === 'image/png', `Content-Type served correctly (got: ${ct})`);
    }
  } catch (e) {
    check(false, 'Public URL fetch', `${e.name}: ${e.message}`);
  }
} else {
  info('Skipped — upload failed.');
}

// --- 5. Private bucket: upload, then confirm it is NOT public ----------------
head('5. Private bucket isolation');
try {
  const url = await getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: R2_PRIVATE_BUCKET, Key: privateKey, ContentType: 'image/png' }),
    { expiresIn: 300, signableHeaders: new Set(['content-type']) },
  );
  const put = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/png' },
    body: PNG_BYTES,
  });
  check(put.ok, `Uploaded to private bucket (HTTP ${put.status})`, await safeText(put));

  // The critical assertion: the same public base URL must NOT serve this.
  const leakUrl = `${R2_PUBLIC_BASE_URL.replace(/\/$/, '')}/${privateKey}`;
  const leak = await fetch(leakUrl);
  check(
    !leak.ok,
    `Private object is NOT reachable on the public URL (HTTP ${leak.status})`,
    leak.ok
      ? 'SECURITY PROBLEM: a private-bucket key resolved on the public domain. Check that you did not enable public access on the private bucket.'
      : undefined,
  );

  // But a presigned GET must work.
  const readUrl = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: R2_PRIVATE_BUCKET, Key: privateKey }),
    { expiresIn: 300 },
  );
  const read = await fetch(readUrl);
  check(read.ok, `Presigned GET retrieves the private object (HTTP ${read.status})`);
} catch (e) {
  check(false, 'Private bucket test', `${e.name}: ${e.message}`);
}

// --- 6. Delete (mirrors deleteAsset's prefix routing) ------------------------
head('6. Delete');
for (const [key, bucket] of [
  [publicKey, R2_PUBLIC_BUCKET],
  [privateKey, R2_PRIVATE_BUCKET],
  [`products/_verify-mismatch-${stamp}.png`, R2_PUBLIC_BUCKET],
]) {
  try {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    let gone = false;
    try {
      await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    } catch {
      gone = true;
    }
    check(gone, `Deleted and verified gone: ${key}`);
  } catch (e) {
    check(false, `Delete ${key}`, `${e.name}: ${e.message}`);
  }
}

// --- 7. Cross-bucket isolation from the OLD client's buckets -----------------
head('7. Token scoping (old client protection)');
for (const bucket of ['nwsf-media', 'nwsf-media-private']) {
  try {
    await client.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 }));
    check(false, `Token CANNOT reach ${bucket}`, 'SECURITY PROBLEM: this token can read the old client\'s bucket. Re-scope it.');
  } catch {
    pass(`Token cannot reach ${bucket} (correctly scoped)`);
  }
}

async function safeText(res) {
  try {
    const t = await res.text();
    return t.slice(0, 300);
  } catch {
    return undefined;
  }
}

head(failures === 0 ? 'All checks passed.' : `${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
