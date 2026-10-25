const { S3Client } = require('@aws-sdk/client-s3');
const { createClient } = require('@supabase/supabase-js');

// Load env variables
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '50060d056a6a9f7fc0cdaf69cd807274';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '58c963f1fd34f9c5d3233e3464978692';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '860f61ea122a88edfaf13a4ad7a34c12ddf1dba7fa0c1cc06968ab6ff655eaf8';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'snaply-media';
const R2_ENDPOINT = process.env.R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://obxwwlsnrpuiuqkhrzzf.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_1fOEzQwgapHIYHCkFd4LFw_PuZZF_PH';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

/**
 * Verify Supabase JWT token from Authorization header
 */
async function authenticateUser(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return { user: null, error: 'Thiếu Authorization Bearer token' };
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    return { user: null, error: error ? error.message : 'Token không hợp lệ hoặc đã hết hạn' };
  }

  return { user, error: null };
}

module.exports = {
  s3Client,
  supabaseAdmin,
  R2_BUCKET_NAME,
  R2_ENDPOINT,
  authenticateUser,
};
