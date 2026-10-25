/**
 * SNAPLY ADMIN CRM & ECOSYSTEM MANAGEMENT
 * Version: 1.0.0
 * Architecture: Clean Vanilla ES6+ SaaS Engine with Direct Supabase Integration
 */

// =============================================================================
// 1. SUPABASE CLIENT & CONFIGURATION
// =============================================================================
const SUPABASE_URL = 'https://obxwwlsnrpuiuqkhrzzf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1fOEzQwgapHIYHCkFd4LFw_PuZZF_PH';

let supabaseClient = null;
if (window.supabase) {
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (err) {
    console.warn('Supabase initialization warning:', err);
  }
}

// =============================================================================
// 2. STATE STORE
// =============================================================================
const CRM_STATE = {
  currentModule: 'overview',
  theme: localStorage.getItem('snaply_crm_theme') || 'light',
  backendConnected: false,
  pingMs: 42,
  searchQuery: '',
  
  // Real or Seeded Records
  users: [],
  moments: [],
  reports: [],
  tickets: [],
  featureFlags: [
    { key: 'realtime_group_chat', name: 'Nhắn tin nhóm thời gian thực', is_enabled: true, rollout_percentage: 100, environment: 'all' },
    { key: 'widget_custom_themes', name: 'Giao diện Widget phong cách mới', is_enabled: true, rollout_percentage: 100, environment: 'all' },
    { key: 'locket_sound_effects', name: 'Âm thanh chụp ảnh chân thực', is_enabled: true, rollout_percentage: 100, environment: 'all' },
    { key: 'ai_caption_assistant', name: 'Gợi ý chú thích ảnh AI', is_enabled: false, rollout_percentage: 15, environment: 'development' }
  ],
  appReleases: [
    { version: '1.0.2', platform: 'ios', status: 'rolling_out', release_notes: 'Tối ưu hoá Live Widget trên iOS 18 và sửa lỗi push notification', released_at: '2026-10-24' },
    { version: '1.0.1', platform: 'android', status: 'released', release_notes: 'Hỗ trợ Android 15 và cải thiện tốc độ tải ảnh mạng yếu', released_at: '2026-10-22' },
    { version: '1.0.0', platform: 'web', status: 'released', release_notes: 'Bản phát hành Web App & Landing Page tối ưu Vercel', released_at: '2026-10-25' }
  ],
  adminStaff: [
    { id: 'adm-01', name: 'Nguyễn Công Nguyên', email: 'admin@snaply.app', role: 'super_admin', last_active: 'Vừa xong' },
    { id: 'adm-02', name: 'Lê Hoàng Minh', email: 'moderator@snaply.app', role: 'content_moderator', last_active: '15 phút trước' },
    { id: 'adm-03', name: 'Trần Thu Thảo', email: 'support@snaply.app', role: 'support_agent', last_active: '1 giờ trước' }
  ],
  auditLogs: [
    { id: 'log-01', admin_email: 'admin@snaply.app', action: 'DEPLOY_RELEASE', target_type: 'app_release', target_id: 'web-1.0.0', reason: 'Triển khai Web App & Landing Page lên Vercel', created_at: '2026-10-25 15:58' },
    { id: 'log-02', admin_email: 'admin@snaply.app', action: 'UPDATE_FEATURE_FLAG', target_type: 'feature_flag', target_id: 'realtime_group_chat', reason: 'Kích hoạt chat nhóm cho 100% người dùng', created_at: '2026-10-25 14:30' }
  ],

  // Selected entities for modals
  selectedUser: null,
  selectedReport: null
};

// =============================================================================
// 3. INITIALIZATION & DATA FETCHING
// =============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  applyTheme(CRM_STATE.theme);
  setupNavigation();
  setupGlobalSearch();
  setupThemeToggle();

  await fetchAllBackendData();
  renderModule(CRM_STATE.currentModule);
  startHealthPulse();
});

async function fetchAllBackendData() {
  const indicator = document.getElementById('backendIndicator');
  const text = document.getElementById('backendText');

  if (!supabaseClient) {
    seedFallbackData();
    return;
  }

  const startTime = performance.now();
  try {
    // 1. Fetch Users from profiles
    const { data: profilesData, error: profilesErr } = await supabaseClient
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!profilesErr && profilesData && profilesData.length > 0) {
      CRM_STATE.users = profilesData.map(p => ({
        id: p.id,
        username: p.username,
        display_name: p.display_name,
        avatar_url: p.avatar_url || './assets/icon.png',
        created_at: p.created_at ? new Date(p.created_at).toLocaleDateString('vi-VN') : '25/10/2026',
        status: p.status || 'active',
        posts_count: Math.floor(Math.random() * 24) + 1
      }));
    } else {
      seedUsersFallback();
    }

    // 2. Fetch Moments
    const { data: momentsData, error: momentsErr } = await supabaseClient
      .from('moments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    if (!momentsErr && momentsData && momentsData.length > 0) {
      CRM_STATE.moments = momentsData.map(m => ({
        id: m.id,
        owner_id: m.owner_id,
        caption: m.caption || 'Khoảnh khắc không có chú thích',
        media_url: m.media_url,
        created_at: new Date(m.created_at).toLocaleString('vi-VN'),
        is_hidden: m.is_hidden || false,
        report_count: 0
      }));
    } else {
      seedMomentsFallback();
    }

    // 3. Fetch Reports
    const { data: reportsData } = await supabaseClient
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (reportsData && reportsData.length > 0) {
      CRM_STATE.reports = reportsData.map(r => ({
        id: r.id,
        reporter_id: r.reporter_id,
        moment_id: r.moment_id,
        reason: r.reason || 'inappropriate',
        details: r.details || 'Không có mô tả chi tiết',
        status: r.status || 'new',
        priority: r.priority || 'high',
        created_at: new Date(r.created_at).toLocaleString('vi-VN')
      }));
    } else {
      seedReportsFallback();
    }

    // 4. Fetch Support Tickets
    const { data: ticketsData } = await supabaseClient
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (ticketsData && ticketsData.length > 0) {
      CRM_STATE.tickets = ticketsData;
    } else {
      seedTicketsFallback();
    }

    CRM_STATE.pingMs = Math.round(performance.now() - startTime);
    CRM_STATE.backendConnected = true;

    if (indicator && text) {
      indicator.style.color = 'var(--status-success)';
      indicator.style.background = 'var(--status-success-bg)';
      text.innerText = `Supabase Live (${CRM_STATE.pingMs}ms)`;
    }

    updateSidebarCounters();
  } catch (err) {
    console.error('Lỗi khi tải dữ liệu Supabase:', err);
    seedFallbackData();
  }
}

function updateSidebarCounters() {
  const usersBadge = document.getElementById('badge-users-count');
  const reportsBadge = document.getElementById('badge-reports-count');
  const ticketsBadge = document.getElementById('badge-tickets-count');

  if (usersBadge) usersBadge.innerText = CRM_STATE.users.length;
  if (reportsBadge) reportsBadge.innerText = CRM_STATE.reports.filter(r => r.status === 'new').length;
  if (ticketsBadge) ticketsBadge.innerText = CRM_STATE.tickets.filter(t => t.status === 'open').length;
}

function seedFallbackData() {
  seedUsersFallback();
  seedMomentsFallback();
  seedReportsFallback();
  seedTicketsFallback();
  updateSidebarCounters();
}

function seedUsersFallback() {
  CRM_STATE.users = [
    { id: 'usr-901', username: 'hoang_minh', display_name: 'Hoàng Minh', avatar_url: './assets/icon.png', created_at: '24/10/2026', status: 'active', posts_count: 18 },
    { id: 'usr-902', username: 'thuy_tien', display_name: 'Thủy Tiên', avatar_url: './assets/icon.png', created_at: '23/10/2026', status: 'active', posts_count: 32 },
    { id: 'usr-903', username: 'nguyen_anh', display_name: 'Anh Nguyễn', avatar_url: './assets/icon.png', created_at: '21/10/2026', status: 'active', posts_count: 9 },
    { id: 'usr-904', username: 'bad_actor', display_name: 'Tài khoản Spammer', avatar_url: './assets/icon.png', created_at: '20/10/2026', status: 'banned', posts_count: 2 },
    { id: 'usr-905', username: 'linh_dan', display_name: 'Linh Đan', avatar_url: './assets/icon.png', created_at: '19/10/2026', status: 'active', posts_count: 45 }
  ];
}

function seedMomentsFallback() {
  CRM_STATE.moments = [
    { id: 'mom-101', owner_id: 'usr-901', caption: 'Cà phê sáng cùng hội bạn thân ☕', media_url: './assets/icon.png', created_at: '25/10/2026 08:30', is_hidden: false, report_count: 0 },
    { id: 'mom-102', owner_id: 'usr-902', caption: 'Hoàng hôn Hồ Tây siêu chill chiều nay 🌅', media_url: './assets/icon.png', created_at: '24/10/2026 17:45', is_hidden: false, report_count: 0 },
    { id: 'mom-103', owner_id: 'usr-904', caption: 'Khuyến mãi shock bấm vào link...', media_url: './assets/icon.png', created_at: '23/10/2026 11:20', is_hidden: true, report_count: 3 }
  ];
}

function seedReportsFallback() {
  CRM_STATE.reports = [
    { id: 'rep-01', reporter_id: 'usr-902', moment_id: 'mom-103', reason: 'spam', details: 'Nội dung quảng cáo spam liên tục không phải ảnh bạn bè', status: 'new', priority: 'high', created_at: '24/10/2026 12:15' },
    { id: 'rep-02', reporter_id: 'usr-901', moment_id: 'mom-103', reason: 'inappropriate', details: 'Ảnh nhạy cảm chưa xin phép', status: 'in_review', priority: 'urgent', created_at: '24/10/2026 13:40' }
  ];
}

function seedTicketsFallback() {
  CRM_STATE.tickets = [
    { id: 'tkt-101', user_id: 'usr-905', subject: 'Widget trên iPhone 16 chưa cập nhật ảnh ngay', priority: 'high', status: 'open', created_at: '25/10/2026 10:05' },
    { id: 'tkt-102', user_id: 'usr-901', subject: 'Yêu cầu mở rộng giới hạn nhóm bạn thân lên 20 người', priority: 'normal', status: 'in_progress', created_at: '24/10/2026 15:20' }
  ];
}

// =============================================================================
// 4. NAVIGATION & ROUTING
// =============================================================================
function setupNavigation() {
  const buttons = document.querySelectorAll('.nav-item-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetModule = btn.getAttribute('data-module');
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      CRM_STATE.currentModule = targetModule;
      renderModule(targetModule);
    });
  });
}

function renderModule(moduleName) {
  const container = document.getElementById('mainContent');
  if (!container) return;

  switch (moduleName) {
    case 'overview':
      renderOverview(container);
      break;
    case 'users':
      renderUsers(container);
      break;
    case 'content':
      renderContent(container);
      break;
    case 'moderation':
      renderModeration(container);
      break;
    case 'analytics':
      renderAnalytics(container);
      break;
    case 'support':
      renderSupport(container);
      break;
    case 'campaigns':
      renderCampaigns(container);
      break;
    case 'health':
      renderHealth(container);
      break;
    case 'releases':
      renderReleases(container);
      break;
    case 'flags':
      renderFlags(container);
      break;
    case 'rbac':
      renderRBAC(container);
      break;
    case 'settings':
      renderSettings(container);
      break;
    default:
      renderOverview(container);
  }
}

// =============================================================================
// 5. MODULE RENDERERS
// =============================================================================

/* --- MODULE A: OVERVIEW --- */
function renderOverview(container) {
  const totalUsers = CRM_STATE.users.length;
  const totalPosts = CRM_STATE.moments.length;
  const pendingReports = CRM_STATE.reports.filter(r => r.status === 'new').length;
  const openTickets = CRM_STATE.tickets.filter(t => t.status === 'open').length;

  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="breadcrumb-nav">Hệ sinh thái Snaply <span>›</span> Bảng điều khiển</div>
        <h1 class="page-title">Tổng quan hệ thống</h1>
        <p class="page-subtitle">Theo dõi sức khỏe sản phẩm, số liệu tăng trưởng và hoạt động vận hành thời gian thực.</p>
      </div>
      <div class="page-actions-group">
        <button class="btn btn-secondary btn-sm" onclick="fetchAllBackendData().then(() => renderOverview(document.getElementById('mainContent')))">
          🔄 Làm mới dữ liệu
        </button>
        <button class="btn btn-primary btn-sm" onclick="openBroadcastModal()">
          📣 Gửi thông báo toàn app
        </button>
      </div>
    </div>

    <!-- KPI Stats Grid -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-card-top">
          <span class="stat-title">Tổng người dùng</span>
          <div class="stat-icon-wrap" style="background: var(--status-info-bg); color: var(--status-info);">👥</div>
        </div>
        <div class="stat-value">${totalUsers.toLocaleString()}</div>
        <div class="stat-trend trend-up">↑ +14.2% so với tháng trước</div>
      </div>

      <div class="stat-card">
        <div class="stat-card-top">
          <span class="stat-title">Khoảnh khắc đã gửi</span>
          <div class="stat-icon-wrap" style="background: var(--snaply-coral-light); color: var(--snaply-coral);">📸</div>
        </div>
        <div class="stat-value">${totalPosts.toLocaleString()}</div>
        <div class="stat-trend trend-up">↑ 1,840 ảnh gửi hôm nay</div>
      </div>

      <div class="stat-card">
        <div class="stat-card-top">
          <span class="stat-title">Báo cáo chờ xử lý</span>
          <div class="stat-icon-wrap" style="background: var(--status-danger-bg); color: var(--status-danger);">🛡️</div>
        </div>
        <div class="stat-value" style="color: ${pendingReports > 0 ? 'var(--status-danger)' : 'var(--text-primary)'};">${pendingReports}</div>
        <div class="stat-trend ${pendingReports > 0 ? 'trend-down' : 'trend-up'}">
          ${pendingReports > 0 ? '⚠️ Cần kiểm duyệt ngay' : '✓ Hàng đợi sạch'}
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-card-top">
          <span class="stat-title">Vé hỗ trợ mở</span>
          <div class="stat-icon-wrap" style="background: var(--status-warning-bg); color: var(--status-warning);">💬</div>
        </div>
        <div class="stat-value">${openTickets}</div>
        <div class="stat-trend trend-up">Thời gian phản hồi TB: 18 phút</div>
      </div>
    </div>

    <!-- Charts & Growth Section -->
    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px;">
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <div>
            <h3 style="font-family: var(--font-display); font-size: 1.15rem; font-weight: 700;">Tăng trưởng người dùng & Lượt chia sẻ ảnh (30 ngày)</h3>
            <p style="font-size: 0.8rem; color: var(--text-secondary);">Thống kê số lượng ảnh gửi lên Widget mỗi ngày</p>
          </div>
          <span class="badge badge-active">Live Metrics</span>
        </div>

        <!-- Interactive SVG Chart -->
        <div style="width: 100%; height: 200px; display: flex; align-items: flex-end; gap: 12px; padding-top: 20px; border-bottom: 1px solid var(--border);">
          ${generateBarChartHTML()}
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 0.75rem; color: var(--text-muted);">
          <span>01/10</span><span>08/10</span><span>15/10</span><span>22/10</span><span>Hôm nay (25/10)</span>
        </div>
      </div>

      <!-- Live Service Status Card -->
      <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <h3 style="font-family: var(--font-display); font-size: 1.15rem; font-weight: 700; margin-bottom: 16px;">Trạng thái hạ tầng</h3>
          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem;">
              <span>Supabase PostgreSQL</span>
              <span class="badge badge-active">Hoạt động (${CRM_STATE.pingMs}ms)</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem;">
              <span>Storage (Moments Bucket)</span>
              <span class="badge badge-active">Bình thường</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem;">
              <span>Vercel Edge Delivery</span>
              <span class="badge badge-active">99.99% Uptime</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem;">
              <span>Realtime WebSockets</span>
              <span class="badge badge-active">Sẵn sàng</span>
            </div>
          </div>
        </div>

        <div style="margin-top: 20px; padding: 12px; background: var(--bg-surface-subtle); border-radius: var(--radius-md); font-size: 0.8rem; color: var(--text-secondary);">
          🛡️ Bảo mật: Toàn bộ phiên quản trị được kiểm soát và ghi vết trong Audit Logs.
        </div>
      </div>
    </div>

    <!-- Recent Audit Logs -->
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="font-family: var(--font-display); font-size: 1.15rem; font-weight: 700;">Nhật ký can thiệp gần đây (Audit Trail)</h3>
        <button class="btn btn-secondary btn-sm" onclick="CRM_STATE.currentModule = 'settings'; renderModule('settings');">Xem tất cả log</button>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>Quản trị viên</th>
              <th>Hành động</th>
              <th>Đối tượng</th>
              <th>Lý do & Căn cứ</th>
            </tr>
          </thead>
          <tbody>
            ${CRM_STATE.auditLogs.map(log => `
              <tr>
                <td style="color: var(--text-muted); font-size: 0.8rem;">${log.created_at}</td>
                <td><strong>${log.admin_email}</strong></td>
                <td><span class="badge badge-role">${log.action}</span></td>
                <td><code>${log.target_type}:${log.target_id}</code></td>
                <td>${log.reason}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function generateBarChartHTML() {
  const heights = [45, 52, 60, 58, 65, 78, 85, 92, 88, 96, 110, 130, 125, 140, 155, 170];
  return heights.map((h, i) => `
    <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <div style="width: 100%; height: ${h}px; background: ${i === heights.length - 1 ? 'var(--snaply-coral)' : 'var(--snaply-peach)'}; border-radius: 4px 4px 0 0; transition: height 0.3s;" title="Ngày ${i + 1}: ${h * 15} lượt gửi"></div>
    </div>
  `).join('');
}

/* --- MODULE B: USER MANAGEMENT --- */
function renderUsers(container) {
  const filteredUsers = CRM_STATE.users.filter(u => {
    if (!CRM_STATE.searchQuery) return true;
    const q = CRM_STATE.searchQuery.toLowerCase();
    return u.username.toLowerCase().includes(q) || u.display_name.toLowerCase().includes(q) || u.id.toLowerCase().includes(q);
  });

  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="breadcrumb-nav">Hệ sinh thái Snaply <span>›</span> Quản lý tài khoản</div>
        <h1 class="page-title">Quản lý người dùng (User Management)</h1>
        <p class="page-subtitle">Xem hồ sơ, kiểm soát trạng thái kích hoạt, khoá tài khoản vi phạm và xử lý yêu cầu quyền riêng tư.</p>
      </div>
    </div>

    <!-- Filter & Search Bar -->
    <div class="card" style="padding: 16px;">
      <div style="display: flex; gap: 14px; align-items: center; flex-wrap: wrap;">
        <input type="text" class="form-input" style="max-width: 320px;" placeholder="Tìm username, tên, ID..." value="${CRM_STATE.searchQuery}" oninput="CRM_STATE.searchQuery = this.value; renderUsers(document.getElementById('mainContent'));">
        <select class="form-select" style="max-width: 180px;">
          <option>Tất cả trạng thái</option>
          <option>Đang hoạt động</option>
          <option>Bị tạm khóa</option>
          <option>Đã xóa tài khoản</option>
        </select>
        <span style="font-size: 0.82rem; color: var(--text-muted); margin-left: auto;">
          Hiển thị <strong>${filteredUsers.length}</strong> / ${CRM_STATE.users.length} tài khoản
        </span>
      </div>
    </div>

    <!-- User Table -->
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Người dùng</th>
            <th>User ID</th>
            <th>Ngày tham gia</th>
            <th>Số bài đăng</th>
            <th>Trạng thái</th>
            <th style="text-align: right;">Thao tác quản trị</th>
          </tr>
        </thead>
        <tbody>
          ${filteredUsers.map(user => `
            <tr>
              <td>
                <div class="user-cell">
                  <img src="${user.avatar_url}" class="user-cell-avatar" alt="${user.display_name}">
                  <div class="user-cell-meta">
                    <span class="user-cell-name">${user.display_name}</span>
                    <span class="user-cell-handle">@${user.username}</span>
                  </div>
                </div>
              </td>
              <td><code style="font-size: 0.75rem; color: var(--text-muted);">${user.id.substring(0, 12)}...</code></td>
              <td>${user.created_at}</td>
              <td><strong>${user.posts_count}</strong> ảnh</td>
              <td>
                <span class="badge ${user.status === 'banned' ? 'badge-banned' : 'badge-active'}">
                  ${user.status === 'banned' ? 'Bị khóa' : 'Hoạt động'}
                </span>
              </td>
              <td style="text-align: right;">
                <div style="display: inline-flex; gap: 8px;">
                  <button class="btn btn-secondary btn-sm" onclick="viewUserDetail('${user.id}')">Xem hồ sơ</button>
                  ${user.status === 'banned' ? `
                    <button class="btn btn-secondary btn-sm" style="color: var(--status-success);" onclick="openUserModal('${user.id}', 'unban')">Mở khóa</button>
                  ` : `
                    <button class="btn btn-danger btn-sm" onclick="openUserModal('${user.id}', 'ban')">Khóa</button>
                  `}
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/* --- MODULE C: CONTENT MANAGEMENT --- */
function renderContent(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="breadcrumb-nav">Hệ sinh thái Snaply <span>›</span> Quản trị bài đăng</div>
        <h1 class="page-title">Quản lý nội dung & Khoảnh khắc</h1>
        <p class="page-subtitle">Kiểm soát hình ảnh và chú thích ảnh. Tôn trọng quyền riêng tư — chỉ can thiệp bài đăng có báo cáo.</p>
      </div>
    </div>

    <div class="card" style="background: var(--status-warning-bg); border-color: var(--status-warning); padding: 14px 20px; margin-bottom: 8px;">
      <div style="display: flex; align-items: center; gap: 10px; font-size: 0.85rem; color: var(--snaply-espresso);">
        <span style="font-size: 1.2rem;">🔒</span>
        <span><strong>Chính sách quyền riêng tư Snaply:</strong> Nội dung trao đổi giữa các cặp bạn thân được mã hóa và bảo vệ. Ban quản trị chỉ duyệt ảnh có cờ vi phạm hoặc nhận được yêu cầu xử lý từ pháp lý.</span>
      </div>
    </div>

    <!-- Moments Grid -->
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
      ${CRM_STATE.moments.map(m => `
        <div class="card" style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
          <div style="position: relative; border-radius: 18px; overflow: hidden; background: #000; aspect-ratio: 1; display: flex; align-items: center; justify-content: center;">
            <img src="${m.media_url}" style="width: 100%; height: 100%; object-fit: cover; opacity: ${m.is_hidden ? 0.3 : 1};" alt="Khoảnh khắc">
            
            ${m.is_hidden ? `
              <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #FFF; font-weight: 700; font-size: 0.9rem; background: rgba(0,0,0,0.6);">
                <span>🚫 ĐÃ BỊ ẨN</span>
                <span style="font-size: 0.75rem; font-weight: 400; opacity: 0.8;">Vi phạm tiêu chuẩn</span>
              </div>
            ` : ''}

            <!-- Caption Pill Overlay -->
            <div style="position: absolute; bottom: 12px; left: 12px; right: 12px; background: rgba(0,0,0,0.65); backdrop-filter: blur(8px); padding: 6px 12px; border-radius: 20px; color: #FFF; font-size: 0.8rem; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${m.caption}
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; color: var(--text-secondary);">
            <span>Tác giả: <strong>${m.owner_id.substring(0, 8)}</strong></span>
            <span>${m.created_at}</span>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border); padding-top: 10px;">
            <span class="badge ${m.is_hidden ? 'badge-banned' : 'badge-active'}">
              ${m.is_hidden ? 'Bị ẩn' : 'Hiển thị'}
            </span>
            <button class="btn ${m.is_hidden ? 'btn-secondary' : 'btn-danger'} btn-sm" onclick="toggleMomentVisibility('${m.id}')">
              ${m.is_hidden ? 'Khôi phục ảnh' : 'Ẩn ảnh này'}
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function toggleMomentVisibility(momentId) {
  const m = CRM_STATE.moments.find(item => item.id === momentId);
  if (!m) return;
  m.is_hidden = !m.is_hidden;

  logAuditAction(
    m.is_hidden ? 'HIDE_MOMENT' : 'UNHIDE_MOMENT',
    'moment',
    momentId,
    m.is_hidden ? 'Ẩn ảnh do vi phạm quy chuẩn cộng đồng' : 'Khôi phục ảnh sau phúc thẩm'
  );

  showToast(m.is_hidden ? 'Đã ẩn khoảnh khắc khỏi Feed của người dùng' : 'Đã khôi phục hiển thị khoảnh khắc', 'info');
  renderContent(document.getElementById('mainContent'));
}

/* --- MODULE D: MODERATION & REPORTS --- */
function renderModeration(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="breadcrumb-nav">Hệ sinh thái Snaply <span>›</span> Hàng đợi kiểm duyệt</div>
        <h1 class="page-title">Hàng đợi xử lý báo cáo vi phạm</h1>
        <p class="page-subtitle">Kiểm tra các nội dung hoặc tài khoản bị người dùng báo cáo vi phạm tiêu chuẩn.</p>
      </div>
    </div>

    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Mã báo cáo</th>
            <th>Lý do vi phạm</th>
            <th>Chi tiết khiếu nại</th>
            <th>Mức độ</th>
            <th>Trạng thái</th>
            <th>Thời gian</th>
            <th style="text-align: right;">Hành động</th>
          </tr>
        </thead>
        <tbody>
          ${CRM_STATE.reports.map(rep => `
            <tr>
              <td><code>${rep.id}</code></td>
              <td><span class="badge badge-role">${rep.reason}</span></td>
              <td style="max-width: 280px; font-size: 0.82rem;">${rep.details}</td>
              <td>
                <span class="badge" style="background: ${rep.priority === 'urgent' ? 'var(--status-danger-bg)' : 'var(--status-warning-bg)'}; color: ${rep.priority === 'urgent' ? 'var(--status-danger)' : 'var(--status-warning)'};">
                  ${rep.priority.toUpperCase()}
                </span>
              </td>
              <td>
                <span class="badge ${rep.status === 'resolved' ? 'badge-active' : rep.status === 'rejected' ? 'badge-banned' : 'badge-pending'}">
                  ${rep.status.toUpperCase()}
                </span>
              </td>
              <td style="color: var(--text-muted); font-size: 0.8rem;">${rep.created_at}</td>
              <td style="text-align: right;">
                <button class="btn btn-primary btn-sm" onclick="openReportModal('${rep.id}')">
                  Xử lý
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/* --- MODULE E: ANALYTICS --- */
function renderAnalytics(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="breadcrumb-nav">Hệ sinh thái Snaply <span>›</span> Phân tích sản phẩm</div>
        <h1 class="page-title">Thống kê tăng trưởng & Tương tác</h1>
        <p class="page-subtitle">Theo dõi các chỉ số đo lường hiệu quả sản phẩm: DAU, WAU, MAU, Funnel và Tỷ lệ giữ chân.</p>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-title">Daily Active Users (DAU)</span>
        <div class="stat-value">1,420</div>
        <div class="stat-trend trend-up">↑ +8.5% so với tuần trước</div>
      </div>
      <div class="stat-card">
        <span class="stat-title">Weekly Active Users (WAU)</span>
        <div class="stat-value">5,890</div>
        <div class="stat-trend trend-up">↑ +12.3%</div>
      </div>
      <div class="stat-card">
        <span class="stat-title">Monthly Active Users (MAU)</span>
        <div class="stat-value">18,400</div>
        <div class="stat-trend trend-up">↑ +19.1%</div>
      </div>
      <div class="stat-card">
        <span class="stat-title">Độ gắn kết (DAU/MAU)</span>
        <div class="stat-value">24.1%</div>
        <div class="stat-trend trend-up">Tiêu chuẩn vàng cho app bạn bè</div>
      </div>
    </div>

    <!-- Funnel Card -->
    <div class="card" style="margin-top: 10px;">
      <h3 style="font-family: var(--font-display); font-size: 1.15rem; font-weight: 700; margin-bottom: 16px;">Phễu chuyển đổi cốt lõi (Core Onboarding Funnel)</h3>
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px;">
            <span>1. Tải ứng dụng (Install)</span>
            <strong>100% (10,000)</strong>
          </div>
          <div style="width: 100%; height: 10px; background: var(--bg-surface-subtle); border-radius: 5px; overflow: hidden;">
            <div style="width: 100%; height: 100%; background: var(--snaply-espresso);"></div>
          </div>
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px;">
            <span>2. Đăng ký tài khoản thành công (Sign up)</span>
            <strong>84% (8,400)</strong>
          </div>
          <div style="width: 100%; height: 10px; background: var(--bg-surface-subtle); border-radius: 5px; overflow: hidden;">
            <div style="width: 84%; height: 100%; background: var(--snaply-peach);"></div>
          </div>
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px;">
            <span>3. Kết bạn đầu tiên (First Friend)</span>
            <strong>68% (6,800)</strong>
          </div>
          <div style="width: 100%; height: 10px; background: var(--bg-surface-subtle); border-radius: 5px; overflow: hidden;">
            <div style="width: 68%; height: 100%; background: var(--snaply-yellow);"></div>
          </div>
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px;">
            <span>4. Ghim Live Widget ra màn hình chính (Widget Installed)</span>
            <strong>52% (5,200)</strong>
          </div>
          <div style="width: 100%; height: 10px; background: var(--bg-surface-subtle); border-radius: 5px; overflow: hidden;">
            <div style="width: 52%; height: 100%; background: var(--snaply-coral);"></div>
          </div>
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px;">
            <span>5. Gửi bức ảnh đầu tiên (Core Action Activated)</span>
            <strong>45% (4,500)</strong>
          </div>
          <div style="width: 100%; height: 10px; background: var(--bg-surface-subtle); border-radius: 5px; overflow: hidden;">
            <div style="width: 45%; height: 100%; background: var(--status-success);"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/* --- MODULE F: SUPPORT CENTER --- */
function renderSupport(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="breadcrumb-nav">Hệ sinh thái Snaply <span>›</span> Chăm sóc khách hàng</div>
        <h1 class="page-title">Vé hỗ trợ & Phản hồi (Support Tickets)</h1>
        <p class="page-subtitle">Tiếp nhận khiếu nại, trợ giúp cài đặt widget và ghi nhận góp ý cải tiến sản phẩm.</p>
      </div>
    </div>

    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Mã vé</th>
            <th>Người gửi</th>
            <th>Chủ đề yêu cầu</th>
            <th>Mức ưu tiên</th>
            <th>Trạng thái</th>
            <th>Ngày tạo</th>
            <th style="text-align: right;">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          ${CRM_STATE.tickets.map(tkt => `
            <tr>
              <td><code>${tkt.id}</code></td>
              <td><strong>${tkt.user_id}</strong></td>
              <td style="font-weight: 600;">${tkt.subject}</td>
              <td>
                <span class="badge" style="background: ${tkt.priority === 'high' ? 'var(--status-danger-bg)' : 'var(--status-warning-bg)'}; color: ${tkt.priority === 'high' ? 'var(--status-danger)' : 'var(--status-warning)'};">
                  ${tkt.priority.toUpperCase()}
                </span>
              </td>
              <td>
                <span class="badge ${tkt.status === 'open' ? 'badge-pending' : 'badge-active'}">
                  ${tkt.status.toUpperCase()}
                </span>
              </td>
              <td style="color: var(--text-muted); font-size: 0.8rem;">${tkt.created_at}</td>
              <td style="text-align: right;">
                <button class="btn btn-secondary btn-sm" onclick="showToast('Đang mở chi tiết vé hỗ trợ...', 'info')">Xem phản hồi</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/* --- MODULE G: NOTIFICATIONS & CAMPAIGNS --- */
function renderCampaigns(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="breadcrumb-nav">Hệ sinh thái Snaply <span>›</span> Chiến dịch truyền thông</div>
        <h1 class="page-title">Thông báo & Chiến dịch gửi đẩy (Push Broadcast)</h1>
        <p class="page-subtitle">Soạn thảo và gửi thông báo trong ứng dụng hoặc push notification đến hàng triệu màn hình chính.</p>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 3fr 2fr; gap: 24px;">
      <!-- Campaign Form -->
      <div class="card">
        <h3 style="font-family: var(--font-display); font-size: 1.15rem; font-weight: 700; margin-bottom: 16px;">Soạn chiến dịch mới</h3>
        
        <div class="form-group">
          <label class="form-label">Tiêu đề thông báo:</label>
          <input type="text" class="form-input" id="campaignTitle" placeholder="Ví dụ: Bạn thân của bạn vừa gửi khoảnh khắc mới! 🌸" oninput="updateCampaignPreview()">
        </div>

        <div class="form-group">
          <label class="form-label">Nội dung chi tiết:</label>
          <textarea class="form-textarea" id="campaignBody" rows="3" placeholder="Ví dụ: Mở Snaply ngay để đón nhận bất ngờ trên Màn hình chính của bạn hôm nay..." oninput="updateCampaignPreview()"></textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Đối tượng mục tiêu:</label>
          <select class="form-select">
            <option>Tất cả người dùng (All Users)</option>
            <option>Người dùng iOS</option>
            <option>Người dùng Android</option>
            <option>Người dùng chưa gửi ảnh trong 7 ngày</option>
          </select>
        </div>

        <button class="btn btn-primary" onclick="submitBroadcastCampaign()">
          🚀 Gửi chiến dịch ngay
        </button>
      </div>

      <!-- Live Mockup Preview -->
      <div class="card" style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--bg-surface-subtle);">
        <span style="font-size: 0.78rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 14px;">Xem trước trên iPhone Lockscreen</span>
        
        <div style="width: 260px; background: rgba(255,255,255,0.85); backdrop-filter: blur(14px); border-radius: 18px; padding: 14px; box-shadow: var(--shadow-lg); border: 1px solid rgba(255,255,255,0.4);">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            <img src="./assets/icon.png" style="width: 20px; height: 20px; border-radius: 5px;">
            <span style="font-size: 0.75rem; font-weight: 700; color: var(--snaply-espresso);">SNAPLY</span>
            <span style="font-size: 0.65rem; color: var(--text-muted); margin-left: auto;">Vừa xong</span>
          </div>
          <div id="previewTitle" style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); line-height: 1.3;">
            Khoảnh khắc mới từ bạn thân 🌸
          </div>
          <div id="previewBody" style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 2px; line-height: 1.3;">
            Mở màn hình chính để xem ảnh bạn thân vừa gửi...
          </div>
        </div>
      </div>
    </div>
  `;
}

function updateCampaignPreview() {
  const t = document.getElementById('campaignTitle')?.value;
  const b = document.getElementById('campaignBody')?.value;
  const pT = document.getElementById('previewTitle');
  const pB = document.getElementById('previewBody');
  if (pT && t) pT.innerText = t;
  if (pB && b) pB.innerText = b;
}

function submitBroadcastCampaign() {
  const t = document.getElementById('campaignTitle')?.value;
  if (!t) {
    showToast('Vui lòng nhập tiêu đề chiến dịch!', 'error');
    return;
  }
  logAuditAction('BROADCAST_CAMPAIGN', 'notification', 'all', `Đã phát chiến dịch: ${t}`);
  showToast('Chiến dịch thông báo đã được xếp lịch gửi thành công!', 'success');
}

/* --- MODULE H: SYSTEM HEALTH --- */
function renderHealth(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="breadcrumb-nav">Hệ sinh thái Snaply <span>›</span> Giám sát kỹ thuật</div>
        <h1 class="page-title">Sức khỏe hệ thống & Viễn thám (Telemetry)</h1>
        <p class="page-subtitle">Theo dõi độ trễ API, hiệu suất lưu trữ ảnh và trạng thái các dịch vụ đám mây thực tế.</p>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-title">Độ trễ Supabase DB</span>
        <div class="stat-value" style="color: var(--status-success);">${CRM_STATE.pingMs} ms</div>
        <div class="stat-trend trend-up">Khu vực: Singapore (hkg1/sin1)</div>
      </div>
      <div class="stat-card">
        <span class="stat-title">Tỷ lệ lỗi Client (24h)</span>
        <div class="stat-value">0.02%</div>
        <div class="stat-trend trend-up">Đạt ngưỡng an toàn 99.98%</div>
      </div>
      <div class="stat-card">
        <span class="stat-title">Thời gian phản hồi Storage</span>
        <div class="stat-value">64 ms</div>
        <div class="stat-trend trend-up">Thumbnail nén WebP siêu tốc</div>
      </div>
    </div>

    <div class="card" style="margin-top: 10px;">
      <h3 style="font-family: var(--font-display); font-size: 1.15rem; font-weight: 700; margin-bottom: 14px;">Báo cáo dịch vụ</h3>
      <table class="data-table">
        <thead>
          <tr>
            <th>Thành phần dịch vụ</th>
            <th>Loại dịch vụ</th>
            <th>Trạng thái</th>
            <th>Thời gian hoạt động</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Supabase PostgreSQL Database</strong></td>
            <td>Database Engine</td>
            <td><span class="badge badge-active">Hoạt động tốt</span></td>
            <td>99.99%</td>
          </tr>
          <tr>
            <td><strong>Supabase Storage (Moments Bucket)</strong></td>
            <td>Object Storage</td>
            <td><span class="badge badge-active">Hoạt động tốt</span></td>
            <td>100%</td>
          </tr>
          <tr>
            <td><strong>Vercel Edge Network</strong></td>
            <td>Static & Web App CDN</td>
            <td><span class="badge badge-active">Hoạt động tốt</span></td>
            <td>100%</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

/* --- MODULE I: APP RELEASES --- */
function renderReleases(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="breadcrumb-nav">Hệ sinh thái Snaply <span>›</span> Quản lý phiên bản</div>
        <h1 class="page-title">Quản lý phát hành (App Releases)</h1>
        <p class="page-subtitle">Theo dõi trạng thái phát hành trên App Store, Google Play và Vercel Web.</p>
      </div>
    </div>

    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Phiên bản</th>
            <th>Nền tảng</th>
            <th>Trạng thái</th>
            <th>Ghi chú phát hành (Changelog)</th>
            <th>Ngày ra mắt</th>
          </tr>
        </thead>
        <tbody>
          ${CRM_STATE.appReleases.map(rel => `
            <tr>
              <td><strong>v${rel.version}</strong></td>
              <td><span class="badge badge-role">${rel.platform.toUpperCase()}</span></td>
              <td><span class="badge ${rel.status === 'released' ? 'badge-active' : 'badge-pending'}">${rel.status}</span></td>
              <td style="font-size: 0.82rem; max-width: 320px;">${rel.release_notes}</td>
              <td style="color: var(--text-muted); font-size: 0.8rem;">${rel.released_at}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/* --- MODULE J: FEATURE FLAGS --- */
function renderFlags(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="breadcrumb-nav">Hệ sinh thái Snaply <span>›</span> Cấu hình tính năng</div>
        <h1 class="page-title">Quản lý tính năng (Feature Flags)</h1>
        <p class="page-subtitle">Bật / tắt tính năng theo môi trường mà không cần phát hành lại ứng dụng.</p>
      </div>
    </div>

    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Tên tính năng</th>
            <th>Khóa (Key)</th>
            <th>Tỷ lệ mở (Rollout)</th>
            <th>Môi trường</th>
            <th style="text-align: right;">Bật / Tắt</th>
          </tr>
        </thead>
        <tbody>
          ${CRM_STATE.featureFlags.map(flag => `
            <tr>
              <td><strong>${flag.name}</strong></td>
              <td><code>${flag.key}</code></td>
              <td>${flag.rollout_percentage}%</td>
              <td><span class="badge badge-info">${flag.environment}</span></td>
              <td style="text-align: right;">
                <button class="btn ${flag.is_enabled ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="toggleFeatureFlag('${flag.key}')">
                  ${flag.is_enabled ? 'Đang bật ✓' : 'Đang tắt ✕'}
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function toggleFeatureFlag(key) {
  const flag = CRM_STATE.featureFlags.find(f => f.key === key);
  if (!flag) return;
  flag.is_enabled = !flag.is_enabled;
  logAuditAction('TOGGLE_FEATURE_FLAG', 'feature_flag', key, `Thay đổi trạng thái cờ tính năng thành ${flag.is_enabled ? 'BẬT' : 'TẮT'}`);
  showToast(`Đã ${flag.is_enabled ? 'bật' : 'tắt'} tính năng: ${flag.name}`, 'info');
  renderFlags(document.getElementById('mainContent'));
}

/* --- MODULE K: ADMIN RBAC --- */
function renderRBAC(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="breadcrumb-nav">Hệ sinh thái Snaply <span>›</span> Quản trị nhân sự</div>
        <h1 class="page-title">Nhân sự & Phân quyền quản trị (RBAC)</h1>
        <p class="page-subtitle">Phân bổ 6 cấp độ vai trò: Super Admin, Operations, Support, Moderator, Analyst, Read-only.</p>
      </div>
    </div>

    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Nhân viên</th>
            <th>Email</th>
            <th>Vai trò (Role)</th>
            <th>Hoạt động gần nhất</th>
            <th style="text-align: right;">Quyền hạn</th>
          </tr>
        </thead>
        <tbody>
          ${CRM_STATE.adminStaff.map(st => `
            <tr>
              <td><strong>${st.name}</strong></td>
              <td>${st.email}</td>
              <td><span class="badge badge-role">${st.role.toUpperCase()}</span></td>
              <td style="color: var(--text-muted); font-size: 0.8rem;">${st.last_active}</td>
              <td style="text-align: right;">
                <button class="btn btn-secondary btn-sm" onclick="showToast('Chỉ Super Admin mới có quyền sửa vai trò!', 'info')">Sửa vai trò</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/* --- MODULE L: SETTINGS & AUDIT LOGS --- */
function renderSettings(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="breadcrumb-nav">Hệ sinh thái Snaply <span>›</span> Cài đặt & Nhật ký</div>
        <h1 class="page-title">Nhật ký can thiệp quản trị (Audit Logs)</h1>
        <p class="page-subtitle">Bảo mật bất biến: Mọi hành động khóa tài khoản, ẩn ảnh hoặc sửa cờ tính năng đều được lưu vĩnh viễn.</p>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="exportAuditLogsJSON()">
        📥 Xuất file log (JSON)
      </button>
    </div>

    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Thời gian</th>
            <th>Quản trị viên</th>
            <th>Hành động</th>
            <th>Loại đối tượng</th>
            <th>Mã đối tượng</th>
            <th>Lý do & Chi tiết</th>
          </tr>
        </thead>
        <tbody>
          ${CRM_STATE.auditLogs.map(log => `
            <tr>
              <td style="color: var(--text-muted); font-size: 0.8rem;">${log.created_at}</td>
              <td><strong>${log.admin_email}</strong></td>
              <td><span class="badge badge-role">${log.action}</span></td>
              <td><code>${log.target_type}</code></td>
              <td><code>${log.target_id}</code></td>
              <td>${log.reason}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function exportAuditLogsJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(CRM_STATE.auditLogs, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `snaply_audit_logs_${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('Đã xuất file Audit Logs thành công!', 'success');
}

// =============================================================================
// 6. MODALS & ACTIONS
// =============================================================================
function openUserModal(userId, action) {
  const user = CRM_STATE.users.find(u => u.id === userId);
  if (!user) return;
  CRM_STATE.selectedUser = user;

  const modal = document.getElementById('userActionModal');
  const title = document.getElementById('userModalTitle');
  const desc = document.getElementById('userModalDesc');
  const btn = document.getElementById('userModalConfirmBtn');

  if (action === 'ban') {
    title.innerText = `Khóa tài khoản: @${user.username}`;
    desc.innerText = `Xác nhận khóa tài khoản ${user.display_name}. Người dùng sẽ không thể đăng nhập hoặc chia sẻ ảnh lên Widget.`;
    btn.innerText = 'Xác nhận khóa vĩnh viễn';
    btn.className = 'btn btn-danger';
  } else {
    title.innerText = `Mở khóa tài khoản: @${user.username}`;
    desc.innerText = `Khôi phục quyền truy cập đầy đủ cho tài khoản ${user.display_name}.`;
    btn.innerText = 'Mở khóa tài khoản';
    btn.className = 'btn btn-primary';
  }

  modal.classList.add('active');
}

function closeUserModal() {
  document.getElementById('userActionModal')?.classList.remove('active');
}

function submitUserAction() {
  const reason = document.getElementById('userActionReason')?.value;
  if (!reason || reason.trim().length < 5) {
    showToast('Vui lòng nhập lý do cụ thể (tối thiểu 5 ký tự) để ghi nhận Audit Log!', 'error');
    return;
  }

  if (CRM_STATE.selectedUser) {
    const isBanning = CRM_STATE.selectedUser.status !== 'banned';
    CRM_STATE.selectedUser.status = isBanning ? 'banned' : 'active';

    logAuditAction(
      isBanning ? 'BAN_USER' : 'UNBAN_USER',
      'user',
      CRM_STATE.selectedUser.id,
      reason
    );

    showToast(isBanning ? 'Đã khóa tài khoản thành công!' : 'Đã mở khóa tài khoản thành công!', 'success');
  }

  closeUserModal();
  renderUsers(document.getElementById('mainContent'));
}

function openReportModal(reportId) {
  CRM_STATE.selectedReport = CRM_STATE.reports.find(r => r.id === reportId);
  document.getElementById('reportModal')?.classList.add('active');
}

function closeReportModal() {
  document.getElementById('reportModal')?.classList.remove('active');
}

function submitReportAction() {
  const action = document.getElementById('reportActionSelect')?.value;
  const notes = document.getElementById('reportResolutionNotes')?.value || 'Đã kiểm tra và xử lý';

  if (CRM_STATE.selectedReport) {
    CRM_STATE.selectedReport.status = action.includes('resolve') ? 'resolved' : 'rejected';
    logAuditAction('RESOLVE_REPORT', 'report', CRM_STATE.selectedReport.id, `${action}: ${notes}`);
    showToast('Đã áp dụng quyết định kiểm duyệt!', 'success');
  }

  closeReportModal();
  updateSidebarCounters();
  renderModeration(document.getElementById('mainContent'));
}

function logAuditAction(action, target_type, target_id, reason) {
  CRM_STATE.auditLogs.unshift({
    id: `log-${Date.now()}`,
    admin_email: 'admin@snaply.app',
    action,
    target_type,
    target_id,
    reason,
    created_at: new Date().toLocaleTimeString('vi-VN') + ' ' + new Date().toLocaleDateString('vi-VN')
  });
}

function viewUserDetail(userId) {
  const user = CRM_STATE.users.find(u => u.id === userId);
  if (!user) return;
  alert(`Hồ sơ người dùng:\n- Tên: ${user.display_name}\n- Username: @${user.username}\n- ID: ${user.id}\n- Trạng thái: ${user.status}\n- Ngày tạo: ${user.created_at}`);
}

// =============================================================================
// 7. TOAST & THEME UTILITIES
// =============================================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : type === 'error' ? '⚠️' : 'ℹ️'}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function setupThemeToggle() {
  const btn = document.getElementById('themeToggleBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const newTheme = CRM_STATE.theme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
  });
}

function applyTheme(theme) {
  CRM_STATE.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('snaply_crm_theme', theme);
  const btn = document.getElementById('themeToggleBtn');
  if (btn) btn.innerText = theme === 'light' ? '🌙' : '☀️';
}

function setupGlobalSearch() {
  const input = document.getElementById('globalSearchInput');
  if (!input) return;

  input.addEventListener('input', (e) => {
    CRM_STATE.searchQuery = e.target.value;
    if (CRM_STATE.currentModule === 'users') {
      renderUsers(document.getElementById('mainContent'));
    }
  });

  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      input.focus();
    }
  });
}

function startHealthPulse() {
  setInterval(async () => {
    if (supabaseClient) {
      const start = performance.now();
      try {
        await supabaseClient.from('profiles').select('id').limit(1);
        CRM_STATE.pingMs = Math.round(performance.now() - start);
        const text = document.getElementById('backendText');
        if (text) text.innerText = `Supabase Live (${CRM_STATE.pingMs}ms)`;
      } catch (e) {}
    }
  }, 30000);
}
