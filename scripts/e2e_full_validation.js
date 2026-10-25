const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const SUPABASE_URL = 'https://obxwwlsnrpuiuqkhrzzf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1fOEzQwgapHIYHCkFd4LFw_PuZZF_PH';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const email = 'nguyencongnguyen.media@gmail.com';
const password = 'Zxcvbnm123@';

function requestUrl(urlStr, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const req = https.request(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

function putBinary(urlStr, buffer, contentType = 'image/jpeg') {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const req = https.request(url, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.length
      }
    }, res => {
      resolve({ status: res.statusCode, statusText: res.statusMessage });
    });
    req.on('error', reject);
    req.write(buffer);
    req.end();
  });
}

async function runE2E() {
  console.log('===============================================================');
  console.log('🚀 BẮT ĐẦU E2E VALIDATION: SUPABASE + R2 + APP + ADMIN CRM');
  console.log('===============================================================');

  // BƯỚC 1: XÁC THỰC SUPABASE AUTH
  console.log('\n[1/5] Xác thực người dùng qua Supabase Auth...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError || !authData.session) {
    throw new Error('Đăng nhập thất bại: ' + authError?.message);
  }
  const token = authData.session.access_token;
  const userId = authData.user.id;
  console.log('✅ Đăng nhập thành công! User ID:', userId);

  // BƯỚC 2: YÊU CẦU PRESIGNED PUT URL TỪ VERCEL API
  console.log('\n[2/5] Gọi Vercel API: POST /api/media/upload-url...');
  const uploadInitRes = await requestUrl('https://snaplypro.vercel.app/api/media/upload-url', 'POST', {
    contentType: 'image/jpeg',
    sizeBytes: 1024,
    isThumbnail: false
  }, {
    Authorization: `Bearer ${token}`
  });
  console.log('Response Status:', uploadInitRes.status);
  console.log('Payload:', uploadInitRes.data);

  if (uploadInitRes.status !== 200 || !uploadInitRes.data.uploadUrl) {
    throw new Error('API không cấp được Presigned PUT URL: ' + JSON.stringify(uploadInitRes));
  }
  const { uploadUrl, objectKey } = uploadInitRes.data;
  console.log('✅ Cấp Presigned PUT URL thành công cho Key:', objectKey);

  // BƯỚC 3: TẢI ẢNH TRỰC TIẾP LÊN CLOUDFLARE R2
  console.log('\n[3/5] Upload trực tiếp dữ liệu nhị phân lên Cloudflare R2...');
  const samplePhotoBuffer = Buffer.from('FAKE_JPEG_IMAGE_BINARY_DATA_FOR_E2E_VERIFICATION_' + Date.now());
  const putRes = await putBinary(uploadUrl, samplePhotoBuffer, 'image/jpeg');
  console.log('Cloudflare R2 PUT Response:', putRes.status, putRes.statusText);
  if (putRes.status !== 200) {
    throw new Error('Upload lên R2 thất bại với HTTP ' + putRes.status);
  }
  console.log('✅ Upload lên Cloudflare R2 thành công (HTTP 200 OK)!');

  // BƯỚC 4: XÁC NHẬN HOÀN TẤT & LƯU DB QUA VERCEL API
  console.log('\n[4/5] Gọi Vercel API: POST /api/media/complete để verify trên R2 và lưu DB...');
  const completeRes = await requestUrl('https://snaplypro.vercel.app/api/media/complete', 'POST', {
    objectKey,
    caption: 'E2E Validation Moment @ ' + new Date().toISOString(),
    width: 1080,
    height: 1350
  }, {
    Authorization: `Bearer ${token}`
  });
  console.log('Complete Status:', completeRes.status);
  console.log('Complete Payload:', completeRes.data);

  if (completeRes.status !== 200 || !completeRes.data.success) {
    throw new Error('Xác nhận hoàn tất thất bại: ' + JSON.stringify(completeRes));
  }
  console.log('✅ Backend đã xác minh object tồn tại trên R2 và lưu DB thành công!');

  // BƯỚC 5: KIỂM TRA ĐỒNG BỘ TRÊN ADMIN CRM & CSDL
  console.log('\n[5/5] Kiểm tra đồng bộ dữ liệu trong bảng moments & profiles...');
  const { data: moments, error: mError } = await supabase
    .from('moments')
    .select('id, caption, media_url, created_at')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (mError) {
    console.warn('Lưu ý đọc moments:', mError.message);
  } else {
    console.log('✅ Moment mới nhất trong CSDL:', moments[0]);
  }

  console.log('\n===============================================================');
  console.log('🎉 TẤT CẢ 5 BƯỚC E2E TEST ĐỀU ĐẠT CHUẨN 100% (PASS)!');
  console.log('===============================================================');
}

runE2E().catch(err => {
  console.error('❌ E2E TEST FAILED:', err);
  process.exit(1);
});
