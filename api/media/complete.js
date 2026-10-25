const { HeadObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3Client, supabaseAdmin, R2_BUCKET_NAME, authenticateUser } = require('./_r2Client');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 1. Authenticate user
  const { user, error: authError } = await authenticateUser(req);
  if (authError || !user) {
    return res.status(401).json({ error: authError || 'Yêu cầu xác thực tài khoản' });
  }

  const { objectKey, thumbnailKey, caption, width, height, groupId } = req.body || {};

  if (!objectKey) {
    return res.status(400).json({ error: 'Thiếu objectKey' });
  }

  // Security: Verify user can only register their own object key
  if (!objectKey.startsWith(`${user.id}/`)) {
    return res.status(403).json({ error: 'Bạn không có quyền sở hữu tệp này (Owner Mismatch)' });
  }

  try {
    // 2. Verify Object exists on Cloudflare R2
    const headCommand = new HeadObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: objectKey,
    });
    const headResult = await s3Client.send(headCommand);

    const actualSizeBytes = headResult.ContentLength || 0;
    const actualContentType = headResult.ContentType || 'image/jpeg';

    // 3. Save to media_assets in Supabase DB (tolerant of demo / non-auth users)
    let mediaRecord = null;
    try {
      const { data: mData, error: dbError } = await supabaseAdmin
        .from('media_assets')
        .insert({
          owner_id: user.id,
          storage_provider: 'cloudflare_r2',
          bucket_name: R2_BUCKET_NAME,
          object_key: objectKey,
          thumbnail_key: thumbnailKey || null,
          content_type: actualContentType,
          size_bytes: actualSizeBytes,
          width: width || null,
          height: height || null,
          status: 'ready',
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      if (!dbError) mediaRecord = mData;
      else console.warn('[R2 complete] media_assets insert note:', dbError.message);
    } catch (dbErr) {
      console.warn('[R2 complete] media_assets insert exception:', dbErr.message);
    }

    // 4. Generate Presigned GET URL for instant viewing (valid for 1 hour / 3600 seconds)
    const getCommand = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: objectKey,
    });
    const viewUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });

    let thumbViewUrl = viewUrl;
    if (thumbnailKey) {
      const getThumbCommand = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: thumbnailKey,
      });
      thumbViewUrl = await getSignedUrl(s3Client, getThumbCommand, { expiresIn: 3600 });
    }

    // 5. Also insert into moments table if caption or instant moment creation requested
    let momentRecord = null;
    try {
      const { data: mData, error: mErr } = await supabaseAdmin
        .from('moments')
        .insert({
          owner_id: user.id,
          media_url: viewUrl,
          caption: caption || null,
          group_id: groupId || null,
        })
        .select()
        .single();
      if (!mErr) momentRecord = mData;
    } catch (mErr) {
      console.warn('[complete-upload] Optional moments insert note:', mErr.message);
    }

    return res.status(200).json({
      success: true,
      media: mediaRecord,
      moment: momentRecord,
      viewUrl,
      thumbnailUrl: thumbViewUrl,
      objectKey,
      sizeBytes: actualSizeBytes,
    });
  } catch (err) {
    console.error('[R2 API] Error completing upload:', err);
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      return res.status(404).json({ error: 'Tệp chưa được tải lên thành công trên Cloudflare R2' });
    }
    return res.status(500).json({ error: 'Lỗi xác minh và lưu tệp: ' + err.message });
  }
};
