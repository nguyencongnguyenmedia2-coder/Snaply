const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client, supabaseAdmin, R2_BUCKET_NAME, authenticateUser } = require('./_r2Client');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,DELETE,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Authenticate user
  const { user, error: authError } = await authenticateUser(req);
  if (authError || !user) {
    return res.status(401).json({ error: authError || 'Yêu cầu xác thực tài khoản' });
  }

  const { objectKey } = req.body || req.query || {};

  if (!objectKey) {
    return res.status(400).json({ error: 'Thiếu objectKey' });
  }

  // Security: Only owner or admin can delete
  if (!objectKey.startsWith(`${user.id}/`)) {
    return res.status(403).json({ error: 'Bạn không có quyền xóa tệp của người khác' });
  }

  try {
    // 2. Delete from R2
    const deleteCommand = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: objectKey,
    });
    await s3Client.send(deleteCommand);

    // 3. Mark deleted in database
    await supabaseAdmin
      .from('media_assets')
      .update({ status: 'deleted', updated_at: new Date().toISOString() })
      .eq('object_key', objectKey);

    return res.status(200).json({ success: true, message: 'Đã xóa tệp khỏi Cloudflare R2' });
  } catch (err) {
    console.error('[R2 API] Error deleting media:', err);
    return res.status(500).json({ error: 'Lỗi khi xóa tệp: ' + err.message });
  }
};
