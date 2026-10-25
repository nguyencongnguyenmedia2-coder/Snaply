const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 [Build] Starting Expo Web export...');
execSync('npx expo export -p web', { stdio: 'inherit' });

const distDir = path.resolve(__dirname, '..', 'dist');
const landingDir = path.resolve(__dirname, '..', 'landing');
const distLandingDir = path.join(distDir, 'landing');

// 1. Copy Landing Page into dist/landing
if (fs.existsSync(landingDir)) {
  console.log('📂 [Build] Copying landing page into dist/landing...');
  fs.cpSync(landingDir, distLandingDir, { recursive: true });
}

// 2. Copy robots.txt and sitemap.xml to dist root for search bots
const robotsSrc = path.join(landingDir, 'robots.txt');
const sitemapSrc = path.join(landingDir, 'sitemap.xml');
if (fs.existsSync(robotsSrc)) {
  fs.copyFileSync(robotsSrc, path.join(distDir, 'robots.txt'));
  console.log('🤖 [SEO] Copied robots.txt to dist root');
}
if (fs.existsSync(sitemapSrc)) {
  fs.copyFileSync(sitemapSrc, path.join(distDir, 'sitemap.xml'));
  console.log('🗺️ [SEO] Copied sitemap.xml to dist root');
}

// 3. Inject full SEO metadata and JSON-LD schema into dist/index.html
const indexHtmlPath = path.join(distDir, 'index.html');
if (fs.existsSync(indexHtmlPath)) {
  console.log('🏷️ [SEO] Injecting rich SEO metadata into dist/index.html...');
  let html = fs.readFileSync(indexHtmlPath, 'utf8');

  // Replace default title
  html = html.replace(
    '<title>Snaply</title>',
    '<title>Snaply — Khoảnh khắc thật, gửi thẳng lên Màn hình chính của bạn thân</title>'
  );

  // Replace lang="en" with lang="vi"
  html = html.replace('<html lang="en">', '<html lang="vi" prefix="og: https://ogp.me/ns#">');

  const seoTags = `
    <!-- Primary Meta Tags -->
    <meta name="title" content="Snaply — Khoảnh khắc thật, gửi thẳng lên Màn hình chính của bạn thân" />
    <meta name="description" content="Snaply là ứng dụng chia sẻ ảnh đời thường trực tiếp lên Màn hình chính & Màn hình khóa của bạn bè qua Live Widget. Không filter ảo, không số like áp lực, riêng tư tuyệt đối." />
    <meta name="keywords" content="Snaply, locket, locket widget, widget ảnh bạn thân, chia sẻ ảnh widget, ảnh màn hình chính, ảnh màn hình khóa, widget iphone, widget android, camera bạn bè, khoảnh khắc thật, live widget photos" />
    <meta name="author" content="Snaply Team" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <link rel="canonical" href="https://snaply.app/" />

    <!-- Open Graph / Facebook / Zalo -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://snaply.app/" />
    <meta property="og:site_name" content="Snaply" />
    <meta property="og:locale" content="vi_VN" />
    <meta property="og:title" content="Snaply — Khoảnh khắc thật, gửi thẳng lên Màn hình chính của bạn thân" />
    <meta property="og:description" content="Chụp và gửi ảnh trực tiếp đến Widget bạn thân trong 1 giây. Không filter ảo, không số like áp lực." />
    <meta property="og:image" content="https://snaply.app/landing/assets/icon.png" />
    <meta property="og:image:width" content="1024" />
    <meta property="og:image:height" content="1024" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@snaplyapp" />
    <meta name="twitter:creator" content="@snaplyapp" />
    <meta name="twitter:url" content="https://snaply.app/" />
    <meta name="twitter:title" content="Snaply — Khoảnh khắc thật, gửi thẳng lên Màn hình chính của bạn thân" />
    <meta name="twitter:description" content="Chụp và gửi ảnh trực tiếp đến Widget bạn thân trong 1 giây." />
    <meta name="twitter:image" content="https://snaply.app/landing/assets/icon.png" />

    <!-- Structured Data (JSON-LD) -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Snaply",
      "operatingSystem": "iOS 16+, Android 10+, Web",
      "applicationCategory": "SocialNetworkingApplication",
      "description": "Ứng dụng chia sẻ ảnh đời thường trực tiếp lên Màn hình chính của bạn bè qua Widget.",
      "url": "https://snaply.app/",
      "image": "https://snaply.app/landing/assets/icon.png",
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "ratingCount": "12850"
      },
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "VND"
      }
    }
    </script>
`;

  html = html.replace('</head>', `${seoTags}\n  </head>`);
  fs.writeFileSync(indexHtmlPath, html, 'utf8');
  console.log('✅ [SEO] dist/index.html injected successfully!');
}

console.log('✨ [Build] Production web build completed in dist/ with Full SEO!');
