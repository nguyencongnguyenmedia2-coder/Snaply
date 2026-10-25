const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { randomUUID } = require('crypto');
const { s3Client, R2_BUCKET_NAME, authenticateUser } = require('./_r2Client');

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif'
];
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB limit

module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Phương thức không được hỗ trợ (Method Not Allowed)' });
  }

  // 1. Authenticate user
  const { user, error: authError } = await authenticateUser(req);
  if (authError || !user) {
    return res.status(401).json({ error: authError || 'Yêu cầu xác thực tài khoản' });
  }

  const { contentType = 'image/jpeg', sizeBytes = 0, isThumbnail = false } = req.body || {};

  // 2. Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(contentType.toLowerCase())) {
    return res.status(400).json({
      error: `Định dạng ảnh không được hỗ trợ (${contentType}). Chỉ chấp nhận JPEG, PNG, WEBP, HEIC.`
    });
  }

  // 3. Validate size
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    return res.status(400).json({
      error: `Dung lượng tệp vượt quá giới hạn tối đa (${(MAX_FILE_SIZE_BYTES / 1024 / 1024).toFixed(0)}MB).`
    });
  }

  try {
    const fileId = randomUUID();
    const suffix = isThumbnail ? '_thumb.jpg' : '.jpg';
    const objectKey = `${user.id}/${fileId}${suffix}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: objectKey,
      ContentType: contentType,
      Metadata: {
        owner_id: user.id,
        created_at: new Date().toISOString()
      }
    });

    // Short-lived presigned PUT URL valid for 5 minutes (300 seconds)
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    return res.status(200).json({
      uploadUrl,
      objectKey,
      fileId,
      expiresInSeconds: 300,
      bucket: R2_BUCKET_NAME
    });
  } catch (err) {
    console.error('[R2 API] Error creating upload url:', err);
    return res.status(500).json({ error: 'Lỗi máy chủ khi tạo liên kết tải ảnh lên R2: ' + err.message });
  }
};
