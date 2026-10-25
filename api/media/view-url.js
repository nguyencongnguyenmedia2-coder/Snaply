const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3Client, R2_BUCKET_NAME, authenticateUser } = require('./_r2Client');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { objectKey, expiresIn = 3600 } = req.query || req.body || {};

  if (!objectKey) {
    return res.status(400).json({ error: 'Thiếu objectKey' });
  }

  // Check user session
  const { user } = await authenticateUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Yêu cầu xác thực tài khoản để xem ảnh bảo mật' });
  }

  try {
    const ttl = Math.min(Math.max(Number(expiresIn) || 3600, 60), 86400); // 1 min to 24 hours max
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: objectKey,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: ttl });

    return res.status(200).json({
      url: signedUrl,
      objectKey,
      expiresInSeconds: ttl,
    });
  } catch (err) {
    console.error('[R2 API] Error generating view url:', err);
    return res.status(500).json({ error: 'Lỗi cấp URL xem ảnh: ' + err.message });
  }
};
