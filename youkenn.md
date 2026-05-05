<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Shaken Notify — 車検通知管理デモ</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Noto+Sans+JP:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root {
  --bg: #faf8f5;
  --surface: #ffffff;
  --surface-2: #f4f1ec;
  --border: #e8e3db;
  --border-strong: #d4cdbf;
  --ink: #1a1814;
  --ink-2: #4a4640;
  --ink-3: #8a8478;
  --accent: #2d4a3e;
  --accent-soft: #e8efe9;
  --warn: #b85c2e;
  --warn-soft: #fbeee3;
  --danger: #a83232;
  --danger-soft: #f7e4e4;
  --info: #2c5a8a;
  --info-soft: #e3edf6;
  --shadow-sm: 0 1px 2px rgba(26,24,20,0.04);
  --shadow: 0 1px 3px rgba(26,24,20,0.06), 0 8px 24px rgba(26,24,20,0.04);
  --shadow-lg: 0 4px 12px rgba(26,24,20,0.08), 0 24px 48px rgba(26,24,20,0.08);
}

* { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  font-family: 'Noto Sans JP', sans-serif;
  background: var(--bg);
  color: var(--ink);
  font-size: 14px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

body {
  background-image:
    radial-gradient(circle at 0% 0%, rgba(45,74,62,0.03), transparent 40%),
    radial-gradient(circle at 100% 100%, rgba(184,92,46,0.03), transparent 40%);
  min-height: 100vh;
}

/* ============ TOP NAV ============ */
.top-nav {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: 0 32px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 50;
  backdrop-filter: blur(8px);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-mark {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--ink);
  color: var(--bg);
  display: grid;
  place-items: center;
  font-family: 'Fraunces', serif;
  font-weight: 600;
  font-size: 16px;
  letter-spacing: -0.02em;
}

.brand-name {
  font-family: 'Fraunces', serif;
  font-weight: 600;
  font-size: 18px;
  letter-spacing: -0.01em;
}

.brand-sub {
  font-size: 11px;
  color: var(--ink-3);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-left: 4px;
  padding-left: 12px;
  border-left: 1px solid var(--border);
}

/* role switcher */
.role-switch {
  display: flex;
  background: var(--surface-2);
  border-radius: 8px;
  padding: 3px;
  gap: 2px;
}

.role-switch button {
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-3);
  background: transparent;
  border: none;
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.role-switch button.active {
  background: var(--surface);
  color: var(--ink);
  box-shadow: var(--shadow-sm);
}

.top-nav-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.demo-badge {
  font-size: 10px;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.1em;
  background: var(--warn-soft);
  color: var(--warn);
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 500;
}

/* ============ LAYOUT ============ */
.app-shell {
  display: flex;
  min-height: calc(100vh - 64px);
}

.sidebar {
  width: 240px;
  background: var(--surface);
  border-right: 1px solid var(--border);
  padding: 24px 16px;
  flex-shrink: 0;
}

.sidebar-section {
  margin-bottom: 24px;
}

.sidebar-label {
  font-size: 10px;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.12em;
  color: var(--ink-3);
  text-transform: uppercase;
  padding: 0 12px;
  margin-bottom: 8px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  color: var(--ink-2);
  cursor: pointer;
  transition: all 0.15s ease;
  font-weight: 500;
  border: none;
  background: transparent;
  width: 100%;
  text-align: left;
  font-family: inherit;
}

.nav-item:hover { background: var(--surface-2); color: var(--ink); }
.nav-item.active { background: var(--ink); color: var(--bg); }
.nav-item.active .nav-count { background: rgba(255,255,255,0.15); color: var(--bg); }

.nav-item svg { width: 16px; height: 16px; flex-shrink: 0; }

.nav-count {
  margin-left: auto;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  background: var(--surface-2);
  color: var(--ink-3);
  padding: 2px 6px;
  border-radius: 4px;
}

.main {
  flex: 1;
  padding: 32px 40px;
  overflow-x: hidden;
}

/* ============ PAGE HEADER ============ */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border);
}

.page-title {
  font-family: 'Fraunces', serif;
  font-size: 32px;
  font-weight: 500;
  letter-spacing: -0.02em;
  line-height: 1.1;
  margin-bottom: 4px;
}

.page-sub {
  color: var(--ink-3);
  font-size: 13px;
}

.page-actions { display: flex; gap: 8px; }

.btn {
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  padding: 8px 14px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--ink);
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn:hover { background: var(--surface-2); border-color: var(--border-strong); }

.btn-primary {
  background: var(--ink);
  color: var(--bg);
  border-color: var(--ink);
}
.btn-primary:hover { background: #2a2620; border-color: #2a2620; }

.btn svg { width: 14px; height: 14px; }

/* ============ KPI CARDS ============ */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.kpi {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  position: relative;
  overflow: hidden;
}

.kpi-label {
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.1em;
  color: var(--ink-3);
  text-transform: uppercase;
  margin-bottom: 12px;
}

.kpi-value {
  font-family: 'Fraunces', serif;
  font-size: 36px;
  font-weight: 500;
  letter-spacing: -0.02em;
  line-height: 1;
}

.kpi-unit {
  font-family: 'Noto Sans JP', sans-serif;
  font-size: 14px;
  color: var(--ink-3);
  margin-left: 4px;
  font-weight: 400;
}

.kpi-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--ink-3);
}

.kpi-trend.up { color: var(--accent); }
.kpi-trend.warn { color: var(--warn); }

.kpi-spark {
  position: absolute;
  right: 16px;
  bottom: 16px;
  opacity: 0.6;
}

/* ============ CONTENT GRID ============ */
.content-grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 24px;
  margin-bottom: 32px;
}

.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}

.panel-header {
  padding: 18px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-title {
  font-family: 'Fraunces', serif;
  font-weight: 600;
  font-size: 16px;
  letter-spacing: -0.01em;
}

.panel-link {
  font-size: 12px;
  color: var(--ink-3);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 4px;
}
.panel-link:hover { color: var(--ink); }

/* ============ TABLE ============ */
.table-wrap { overflow-x: auto; }

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

thead th {
  font-size: 10px;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-3);
  font-weight: 500;
  text-align: left;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
}

tbody td {
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
}

tbody tr:last-child td { border-bottom: none; }
tbody tr { transition: background 0.15s ease; cursor: pointer; }
tbody tr:hover { background: var(--surface-2); }

.cust-name { font-weight: 500; }
.cust-meta { font-size: 11px; color: var(--ink-3); margin-top: 2px; }

.plate {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  background: var(--surface-2);
  padding: 3px 8px;
  border-radius: 4px;
  display: inline-block;
}

.days-left { font-family: 'Fraunces', serif; font-weight: 500; font-size: 15px; }
.days-left.urgent { color: var(--danger); }
.days-left.warn { color: var(--warn); }
.days-left.ok { color: var(--ink-2); }

.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  padding: 3px 8px;
  border-radius: 4px;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.04em;
}

.badge-dot { width: 6px; height: 6px; border-radius: 50%; }
.badge-success { background: var(--accent-soft); color: var(--accent); }
.badge-success .badge-dot { background: var(--accent); }
.badge-warn { background: var(--warn-soft); color: var(--warn); }
.badge-warn .badge-dot { background: var(--warn); }
.badge-danger { background: var(--danger-soft); color: var(--danger); }
.badge-danger .badge-dot { background: var(--danger); }
.badge-info { background: var(--info-soft); color: var(--info); }
.badge-info .badge-dot { background: var(--info); }
.badge-neutral { background: var(--surface-2); color: var(--ink-3); }
.badge-neutral .badge-dot { background: var(--ink-3); }

/* ============ NOTIFICATION QUEUE ============ */
.notif-list { padding: 8px; }

.notif-item {
  padding: 14px;
  border-radius: 8px;
  margin-bottom: 4px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  transition: background 0.15s;
  cursor: pointer;
}

.notif-item:hover { background: var(--surface-2); }

.notif-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.notif-icon.line { background: #06c755; color: white; }
.notif-icon.app { background: var(--ink); color: var(--bg); }
.notif-icon.mail { background: var(--info-soft); color: var(--info); }

.notif-icon svg { width: 16px; height: 16px; }

.notif-body { flex: 1; min-width: 0; }
.notif-title { font-weight: 500; font-size: 13px; margin-bottom: 2px; }
.notif-meta { font-size: 11px; color: var(--ink-3); display: flex; gap: 8px; align-items: center; }
.notif-time { font-family: 'JetBrains Mono', monospace; }

/* ============ TIMELINE / SCHEDULE ============ */
.schedule-row {
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  align-items: center;
}
.schedule-row:last-child { border-bottom: none; }

.schedule-date {
  font-family: 'Fraunces', serif;
  font-size: 24px;
  font-weight: 500;
  line-height: 1;
}
.schedule-month { font-size: 11px; color: var(--ink-3); font-family: 'JetBrains Mono', monospace; letter-spacing: 0.08em; text-transform: uppercase; }

.schedule-event { font-size: 13px; }
.schedule-event-title { font-weight: 500; margin-bottom: 2px; }
.schedule-event-meta { font-size: 11px; color: var(--ink-3); }

/* ============ CUSTOMER VIEW ============ */
.customer-view {
  max-width: 420px;
  margin: 0 auto;
  padding-top: 16px;
}

.phone-frame {
  background: var(--ink);
  border-radius: 36px;
  padding: 12px;
  box-shadow: var(--shadow-lg);
}

.phone-screen {
  background: var(--bg);
  border-radius: 28px;
  overflow: hidden;
  height: 720px;
  display: flex;
  flex-direction: column;
}

.phone-statusbar {
  height: 36px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--ink);
  font-weight: 500;
}

.phone-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 20px 80px;
}

.phone-header {
  padding: 8px 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.phone-greeting-label { font-size: 11px; color: var(--ink-3); font-family: 'JetBrains Mono', monospace; letter-spacing: 0.08em; text-transform: uppercase; }
.phone-greeting-name { font-family: 'Fraunces', serif; font-size: 22px; font-weight: 500; letter-spacing: -0.01em; margin-top: 2px; }

.phone-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
  display: grid;
  place-items: center;
  font-family: 'Fraunces', serif;
  font-weight: 600;
}

/* hero car card */
.car-card {
  background: linear-gradient(135deg, #1a1814 0%, #2a2620 100%);
  color: var(--bg);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
  position: relative;
  overflow: hidden;
}

.car-card::before {
  content: '';
  position: absolute;
  top: -40px;
  right: -40px;
  width: 160px;
  height: 160px;
  background: radial-gradient(circle, rgba(184,92,46,0.2), transparent 70%);
  border-radius: 50%;
}

.car-card-label { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.6; font-family: 'JetBrains Mono', monospace; }
.car-card-name { font-family: 'Fraunces', serif; font-size: 22px; font-weight: 500; margin-top: 4px; letter-spacing: -0.01em; }
.car-card-plate { font-family: 'JetBrains Mono', monospace; font-size: 12px; opacity: 0.7; margin-top: 4px; }

.car-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 20px;
  position: relative;
}

.car-stat-label { font-size: 10px; opacity: 0.6; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.08em; text-transform: uppercase; }
.car-stat-value { font-family: 'Fraunces', serif; font-size: 18px; margin-top: 2px; font-weight: 500; }
.car-stat-unit { font-size: 11px; opacity: 0.6; margin-left: 2px; font-weight: 400; font-family: 'Noto Sans JP', sans-serif; }

/* alert card */
.alert-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-left: 3px solid var(--warn);
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 12px;
}

.alert-label {
  font-size: 10px;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--warn);
  font-weight: 600;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.alert-title { font-weight: 600; font-size: 14px; margin-bottom: 4px; }
.alert-desc { font-size: 12px; color: var(--ink-2); line-height: 1.55; }

/* quote card */
.quote-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 12px;
}

.quote-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.quote-title { font-family: 'Fraunces', serif; font-size: 15px; font-weight: 600; }
.quote-id { font-size: 10px; font-family: 'JetBrains Mono', monospace; color: var(--ink-3); }

.quote-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  padding: 8px 0;
  border-bottom: 1px dashed var(--border);
}

.quote-row:last-of-type { border-bottom: none; }
.quote-row-label { color: var(--ink-2); }
.quote-row-value { font-family: 'JetBrains Mono', monospace; font-weight: 500; }

.quote-section-label { font-size: 10px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-3); margin: 12px 0 4px; }

.quote-total {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--ink);
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.quote-total-label { font-size: 11px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.1em; text-transform: uppercase; }
.quote-total-value { font-family: 'Fraunces', serif; font-size: 22px; font-weight: 500; }

.quote-cta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 14px;
}

.quote-cta button {
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  cursor: pointer;
  background: var(--surface);
}

.quote-cta button.primary {
  background: var(--ink);
  color: var(--bg);
  border-color: var(--ink);
}

/* timeline list (customer) */
.timeline-section { margin-top: 20px; }
.section-label { font-size: 11px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-3); margin-bottom: 10px; padding: 0 4px; }

.history-item {
  display: flex;
  gap: 12px;
  padding: 12px 4px;
  border-bottom: 1px solid var(--border);
}

.history-item:last-child { border-bottom: none; }

.history-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  margin-top: 6px;
  flex-shrink: 0;
}

.history-body { flex: 1; }
.history-title { font-size: 13px; font-weight: 500; }
.history-meta { font-size: 11px; color: var(--ink-3); margin-top: 2px; }

/* phone tab bar */
.phone-tabbar {
  background: var(--surface);
  border-top: 1px solid var(--border);
  display: flex;
  padding: 8px 0 12px;
  margin: 0 -20px -80px;
}

.phone-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  font-size: 10px;
  color: var(--ink-3);
  cursor: pointer;
}

.phone-tab.active { color: var(--ink); }
.phone-tab svg { width: 20px; height: 20px; }

/* ============ MODAL ============ */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(26,24,20,0.5);
  backdrop-filter: blur(4px);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
}

.modal-overlay.show { display: flex; }

.modal {
  background: var(--surface);
  border-radius: 16px;
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title { font-family: 'Fraunces', serif; font-size: 20px; font-weight: 600; }
.modal-close { background: transparent; border: none; cursor: pointer; color: var(--ink-3); padding: 4px; border-radius: 4px; }
.modal-close:hover { background: var(--surface-2); color: var(--ink); }

.modal-body { padding: 24px; }

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px 24px;
  margin-bottom: 20px;
}

.detail-item .detail-label { font-size: 10px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-3); margin-bottom: 4px; }
.detail-item .detail-value { font-size: 14px; font-weight: 500; }

.modal-section {
  border-top: 1px solid var(--border);
  padding-top: 20px;
  margin-top: 20px;
}

.modal-section-title { font-family: 'Fraunces', serif; font-weight: 600; font-size: 15px; margin-bottom: 12px; }

.notif-channel-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.channel-toggle {
  flex: 1;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s;
}

.channel-toggle.selected { border-color: var(--ink); background: var(--ink); color: var(--bg); }

.preview-message {
  background: var(--surface-2);
  border-radius: 10px;
  padding: 14px;
  font-size: 12px;
  line-height: 1.6;
  font-family: 'JetBrains Mono', monospace;
  white-space: pre-wrap;
  border-left: 3px solid var(--accent);
}

/* ============ HIDE / SHOW ============ */
.view { display: none; }
.view.active { display: block; }

.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%) translateY(20px);
  background: var(--ink);
  color: var(--bg);
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 13px;
  box-shadow: var(--shadow-lg);
  opacity: 0;
  transition: all 0.3s ease;
  z-index: 200;
  display: flex;
  align-items: center;
  gap: 8px;
}

.toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

@media (max-width: 1100px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .content-grid { grid-template-columns: 1fr; }
  .sidebar { display: none; }
  .main { padding: 24px; }
}
</style>
</head>
<body>

<!-- ============ TOP NAV ============ -->
<header class="top-nav">
  <div class="brand">
    <div class="brand-mark">S</div>
    <div>
      <div style="display:flex;align-items:center;">
        <span class="brand-name">Shaken Notify</span>
        <span class="brand-sub">v0.1 demo</span>
      </div>
    </div>
  </div>

  <div class="role-switch" id="roleSwitch">
    <button class="active" data-role="admin">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M3 3h18v4H3zM3 11h18v4H3zM3 19h18v2H3z"/></svg>
      管理者ビュー
    </button>
    <button data-role="customer">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><rect x="6" y="2" width="12" height="20" rx="3"/><circle cx="12" cy="18" r="1"/></svg>
      顧客ビュー
    </button>
  </div>

  <div class="top-nav-right">
    <span class="demo-badge">DEMO MODE</span>
  </div>
</header>

<!-- ============ ADMIN VIEW ============ -->
<div id="adminView" class="view active">
<div class="app-shell">

  <aside class="sidebar">
    <div class="sidebar-section">
      <div class="sidebar-label">メイン</div>
      <button class="nav-item active">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
        ダッシュボード
      </button>
      <button class="nav-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        顧客一覧
        <span class="nav-count">128</span>
      </button>
      <button class="nav-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V15a1 1 0 0 0 1 1h2"/><circle cx="6.5" cy="16.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/></svg>
        車両管理
        <span class="nav-count">142</span>
      </button>
      <button class="nav-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        通知センター
        <span class="nav-count">7</span>
      </button>
      <button class="nav-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>
        見積管理
      </button>
    </div>

    <div class="sidebar-section">
      <div class="sidebar-label">設定</div>
      <button class="nav-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        通知テンプレート
      </button>
      <button class="nav-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        通知ルール
      </button>
    </div>
  </aside>

  <main class="main">

    <div class="page-header">
      <div>
        <h1 class="page-title">ダッシュボード</h1>
        <div class="page-sub">2026年5月2日 土曜日 / 本日の通知対象 7件</div>
      </div>
      <div class="page-actions">
        <button class="btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          エクスポート
        </button>
        <button class="btn btn-primary" onclick="sendBatchNotifications()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          一括通知送信
        </button>
      </div>
    </div>

    <!-- KPI -->
    <div class="kpi-grid">
      <div class="kpi">
        <div class="kpi-label">登録車両</div>
        <div class="kpi-value">142<span class="kpi-unit">台</span></div>
        <div class="kpi-trend up">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          先月比 +8
        </div>
        <svg class="kpi-spark" width="60" height="24" viewBox="0 0 60 24"><polyline points="0,18 10,15 20,16 30,12 40,10 50,8 60,4" fill="none" stroke="#2d4a3e" stroke-width="1.5"/></svg>
      </div>
      <div class="kpi">
        <div class="kpi-label">90日以内に車検</div>
        <div class="kpi-value">23<span class="kpi-unit">台</span></div>
        <div class="kpi-trend warn">うち緊急 4台</div>
        <svg class="kpi-spark" width="60" height="24" viewBox="0 0 60 24"><polyline points="0,12 10,14 20,10 30,16 40,18 50,20 60,18" fill="none" stroke="#b85c2e" stroke-width="1.5"/></svg>
      </div>
      <div class="kpi">
        <div class="kpi-label">未送信通知</div>
        <div class="kpi-value">7<span class="kpi-unit">件</span></div>
        <div class="kpi-trend">承認待ち 2件</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">今月の見積</div>
        <div class="kpi-value">18<span class="kpi-unit">件</span></div>
        <div class="kpi-trend up">受注率 67%</div>
        <svg class="kpi-spark" width="60" height="24" viewBox="0 0 60 24"><polyline points="0,20 10,18 20,14 30,16 40,10 50,8 60,6" fill="none" stroke="#2d4a3e" stroke-width="1.5"/></svg>
      </div>
    </div>

    <div class="content-grid">

      <!-- Customer table -->
      <div class="panel">
        <div class="panel-header">
          <div>
            <div class="panel-title">車検期限が近い顧客</div>
            <div style="font-size:11px;color:var(--ink-3);margin-top:2px;font-family:'JetBrains Mono',monospace;">期限の近い順 / 上位8件</div>
          </div>
          <a href="#" class="panel-link">すべて見る →</a>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>顧客 / 車両</th>
                <th>登録番号</th>
                <th>車検満了</th>
                <th>残日数</th>
                <th>通知状況</th>
              </tr>
            </thead>
            <tbody id="customerTable">
              <!-- filled by JS -->
            </tbody>
          </table>
        </div>
      </div>

      <!-- Notification queue -->
      <div class="panel">
        <div class="panel-header">
          <div>
            <div class="panel-title">通知キュー</div>
            <div style="font-size:11px;color:var(--ink-3);margin-top:2px;font-family:'JetBrains Mono',monospace;">本日 17:00 配信予定</div>
          </div>
        </div>
        <div class="notif-list" id="notifList">
          <!-- filled by JS -->
        </div>
      </div>
    </div>

    <!-- Schedule -->
    <div class="panel">
      <div class="panel-header">
        <div>
          <div class="panel-title">配信スケジュール</div>
          <div style="font-size:11px;color:var(--ink-3);margin-top:2px;font-family:'JetBrains Mono',monospace;">今後7日間</div>
        </div>
        <a href="#" class="panel-link">カレンダーで見る →</a>
      </div>
      <div id="scheduleList">
        <!-- filled by JS -->
      </div>
    </div>

  </main>
</div>
</div>


<!-- ============ CUSTOMER VIEW ============ -->
<div id="customerView" class="view">
  <div class="customer-view">
    <div style="text-align:center;margin-bottom:16px;font-size:11px;color:var(--ink-3);font-family:'JetBrains Mono',monospace;letter-spacing:0.1em;text-transform:uppercase;">
      ↓ 顧客向けアプリ画面プレビュー
    </div>

    <div class="phone-frame">
      <div class="phone-screen">
        <div class="phone-statusbar">
          <span>9:41</span>
          <span style="display:flex;gap:4px;align-items:center;">
            <svg viewBox="0 0 24 24" fill="currentColor" style="width:14px;height:14px"><path d="M2 22h2v-6H2v6zm5 0h2V11H7v11zm5 0h2V6h-2v16zm5 0h2V2h-2v20z"/></svg>
            <span>100%</span>
          </span>
        </div>

        <div class="phone-content">

          <div class="phone-header">
            <div>
              <div class="phone-greeting-label">こんにちは</div>
              <div class="phone-greeting-name">田中 健一さん</div>
            </div>
            <div class="phone-avatar">田</div>
          </div>

          <!-- Hero car -->
          <div class="car-card">
            <div class="car-card-label">My Vehicle</div>
            <div class="car-card-name">トヨタ プリウス</div>
            <div class="car-card-plate">横浜 300 あ 12-34</div>

            <div class="car-stats">
              <div>
                <div class="car-stat-label">走行距離</div>
                <div class="car-stat-value">48,230<span class="car-stat-unit">km</span></div>
              </div>
              <div>
                <div class="car-stat-label">次回車検まで</div>
                <div class="car-stat-value">28<span class="car-stat-unit">日</span></div>
              </div>
            </div>
          </div>

          <!-- Alert -->
          <div class="alert-card">
            <div class="alert-label">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:12px;height:12px"><path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
              車検期限が近づいています
            </div>
            <div class="alert-title">2026年5月30日が期限です</div>
            <div class="alert-desc">期限まで残り28日となりました。お早めにご予約をお願いします。お見積をご確認いただけます。</div>
          </div>

          <!-- Quote -->
          <div class="quote-card">
            <div class="quote-header">
              <div class="quote-title">車検お見積</div>
              <div class="quote-id">QT-2026-0429-T01</div>
            </div>

            <div class="quote-section-label">法定費用</div>
            <div class="quote-row">
              <span class="quote-row-label">自賠責保険料（24ヶ月）</span>
              <span class="quote-row-value">¥17,650</span>
            </div>
            <div class="quote-row">
              <span class="quote-row-label">重量税（エコカー減税適用）</span>
              <span class="quote-row-value">¥15,000</span>
            </div>
            <div class="quote-row">
              <span class="quote-row-label">印紙代</span>
              <span class="quote-row-value">¥1,800</span>
            </div>

            <div class="quote-section-label">整備費用</div>
            <div class="quote-row">
              <span class="quote-row-label">24ヶ月点検基本料</span>
              <span class="quote-row-value">¥28,000</span>
            </div>
            <div class="quote-row">
              <span class="quote-row-label">ブレーキフルード交換</span>
              <span class="quote-row-value">¥4,500</span>
            </div>
            <div class="quote-row">
              <span class="quote-row-label">エンジンオイル交換</span>
              <span class="quote-row-value">¥6,200</span>
            </div>

            <div class="quote-total">
              <span class="quote-total-label">合計（税込）</span>
              <span class="quote-total-value">¥73,150</span>
            </div>

            <div class="quote-cta">
              <button onclick="showToast('お問い合わせフォームへ移動します')">問い合わせ</button>
              <button class="primary" onclick="showToast('予約画面へ移動します')">予約する</button>
            </div>
          </div>

          <!-- History -->
          <div class="timeline-section">
            <div class="section-label">整備履歴</div>
            <div class="history-item">
              <div class="history-dot"></div>
              <div class="history-body">
                <div class="history-title">12ヶ月点検 + オイル交換</div>
                <div class="history-meta">2025年5月15日 / 走行 38,400km</div>
              </div>
            </div>
            <div class="history-item">
              <div class="history-dot" style="background:var(--ink-3)"></div>
              <div class="history-body">
                <div class="history-title">タイヤローテーション</div>
                <div class="history-meta">2024年11月8日 / 走行 32,100km</div>
              </div>
            </div>
            <div class="history-item">
              <div class="history-dot" style="background:var(--ink-3)"></div>
              <div class="history-body">
                <div class="history-title">前回車検</div>
                <div class="history-meta">2024年5月20日 / 走行 26,800km</div>
              </div>
            </div>
          </div>

          <div class="phone-tabbar">
            <div class="phone-tab active">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
              <span>ホーム</span>
            </div>
            <div class="phone-tab">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span>予約</span>
            </div>
            <div class="phone-tab">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
              <span>チャット</span>
            </div>
            <div class="phone-tab">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span>マイページ</span>
            </div>
          </div>

        </div>
      </div>
    </div>

    <div style="margin-top:24px;text-align:center;font-size:12px;color:var(--ink-3);max-width:380px;margin-left:auto;margin-right:auto;">
      これは顧客がスマートフォンで受け取る通知・見積画面のプレビューです。<br>実機ではLINE通知・アプリ内通知のリンクから遷移します。
    </div>
  </div>
</div>


<!-- ============ MODAL ============ -->
<div class="modal-overlay" id="modal">
  <div class="modal">
    <div class="modal-header">
      <div>
        <div class="modal-title" id="modalTitle">顧客詳細</div>
        <div style="font-size:11px;color:var(--ink-3);font-family:'JetBrains Mono',monospace;margin-top:2px;" id="modalSub"></div>
      </div>
      <button class="modal-close" onclick="closeModal()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="modal-body" id="modalBody"></div>
  </div>
</div>

<div class="toast" id="toast">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px;height:16px"><polyline points="20 6 9 17 4 12"/></svg>
  <span id="toastMsg">通知を送信しました</span>
</div>


<script>
// ============ DATA ============
const customers = [
  { id: 1, name: '田中 健一', furigana: 'タナカ ケンイチ', phone: '090-1234-5678', email: 'tanaka@example.jp',
    car: 'トヨタ プリウス', plate: '横浜 300 あ 12-34', vin: 'ZVW50-1234567',
    expire: '2026-05-30', daysLeft: 28, mileage: 48230, notif: 'sent', channel: 'LINE',
    nextNotif: '本日 17:00', notifType: '車検30日前', priority: 'urgent' },
  { id: 2, name: '佐藤 美咲', furigana: 'サトウ ミサキ', phone: '080-2345-6789', email: 'sato@example.jp',
    car: 'ホンダ N-BOX', plate: '横浜 580 う 56-78', vin: 'JF3-2345678',
    expire: '2026-06-12', daysLeft: 41, mileage: 32100, notif: 'pending', channel: 'LINE',
    nextNotif: '本日 17:00', notifType: '車検45日前', priority: 'warn' },
  { id: 3, name: '鈴木 隆', furigana: 'スズキ タカシ', phone: '090-3456-7890', email: 'suzuki@example.jp',
    car: '日産 セレナ', plate: '横浜 500 さ 90-12', vin: 'C27-3456789',
    expire: '2026-06-25', daysLeft: 54, mileage: 67890, notif: 'sent', channel: 'メール',
    nextNotif: '済', notifType: '車検60日前', priority: 'warn' },
  { id: 4, name: '高橋 由美', furigana: 'タカハシ ユミ', phone: '080-4567-8901', email: 'takahashi@example.jp',
    car: 'マツダ CX-5', plate: '横浜 330 い 34-56', vin: 'KE-4567890',
    expire: '2026-07-08', daysLeft: 67, mileage: 89200, notif: 'sent', channel: 'LINE+アプリ',
    nextNotif: '5/15 17:00', notifType: '車検90日前', priority: 'ok' },
  { id: 5, name: '伊藤 健二', furigana: 'イトウ ケンジ', phone: '090-5678-9012', email: 'ito@example.jp',
    car: 'スバル フォレスター', plate: '横浜 300 こ 78-90', vin: 'SK-5678901',
    expire: '2026-05-18', daysLeft: 16, mileage: 55400, notif: 'failed', channel: 'LINE',
    nextNotif: '再送待ち', notifType: '車検7日前', priority: 'urgent' },
  { id: 6, name: '渡辺 さくら', furigana: 'ワタナベ サクラ', phone: '080-6789-0123', email: 'watanabe@example.jp',
    car: 'ダイハツ タント', plate: '横浜 580 け 12-90', vin: 'LA-6789012',
    expire: '2026-07-22', daysLeft: 81, mileage: 21300, notif: 'sent', channel: 'アプリ',
    nextNotif: '5/22 17:00', notifType: '車検90日前', priority: 'ok' },
  { id: 7, name: '山本 大輔', furigana: 'ヤマモト ダイスケ', phone: '090-7890-1234', email: 'yamamoto@example.jp',
    car: 'トヨタ アクア', plate: '横浜 500 ま 45-67', vin: 'NHP10-7890123',
    expire: '2026-06-03', daysLeft: 32, mileage: 41800, notif: 'pending', channel: 'LINE',
    nextNotif: '本日 17:00', notifType: '車検30日前', priority: 'warn' },
  { id: 8, name: '中村 真奈美', furigana: 'ナカムラ マナミ', phone: '080-8901-2345', email: 'nakamura@example.jp',
    car: 'ホンダ フィット', plate: '横浜 510 な 89-01', vin: 'GR-8901234',
    expire: '2026-07-15', daysLeft: 74, mileage: 36700, notif: 'sent', channel: 'メール',
    nextNotif: '5/16 17:00', notifType: '車検90日前', priority: 'ok' },
];

const notifications = [
  { type: 'LINE', title: '車検30日前のお知らせ', target: '田中 健一さん', time: '17:00', status: 'pending', tmpl: 'shaken_30days' },
  { type: 'LINE', title: '車検45日前のお知らせ', target: '佐藤 美咲さん', time: '17:00', status: 'pending', tmpl: 'shaken_45days' },
  { type: 'LINE', title: '車検30日前のお知らせ', target: '山本 大輔さん', time: '17:00', status: 'pending', tmpl: 'shaken_30days' },
  { type: 'app', title: '車検7日前 再送', target: '伊藤 健二さん', time: '18:00', status: 'retry', tmpl: 'shaken_7days' },
  { type: 'mail', title: '見積書発行のご案内', target: '小林 修さん', time: '明日 10:00', status: 'scheduled', tmpl: 'quote_ready' },
];

const schedule = [
  { day: '02', month: 'May', title: '一括通知配信', meta: '車検期限通知 7件 / 17:00', icon: 'send' },
  { day: '03', month: 'May', title: '点検リマインド', meta: '12ヶ月点検対象 12件', icon: 'wrench' },
  { day: '06', month: 'May', title: '見積有効期限通知', meta: '未対応見積 3件', icon: 'doc' },
  { day: '08', month: 'May', title: '走行距離リマインド', meta: '5,000km通知 5件', icon: 'gauge' },
];

// ============ RENDER ============
function priorityClass(p) { return p === 'urgent' ? 'urgent' : p === 'warn' ? 'warn' : 'ok'; }
function notifBadge(n) {
  if (n === 'sent') return '<span class="badge badge-success"><span class="badge-dot"></span>送信済</span>';
  if (n === 'pending') return '<span class="badge badge-info"><span class="badge-dot"></span>待機中</span>';
  if (n === 'failed') return '<span class="badge badge-danger"><span class="badge-dot"></span>失敗</span>';
  return '<span class="badge badge-neutral"><span class="badge-dot"></span>未送信</span>';
}

function renderTable() {
  const tbody = document.getElementById('customerTable');
  tbody.innerHTML = customers.slice(0, 8).map(c => `
    <tr onclick="openCustomerDetail(${c.id})">
      <td>
        <div class="cust-name">${c.name}</div>
        <div class="cust-meta">${c.car}</div>
      </td>
      <td><span class="plate">${c.plate}</span></td>
      <td style="font-size:12px;color:var(--ink-2);">${c.expire.replace(/-/g,'/')}</td>
      <td><span class="days-left ${priorityClass(c.priority)}">${c.daysLeft}<span style="font-size:11px;font-family:'Noto Sans JP',sans-serif;font-weight:400;color:var(--ink-3);margin-left:2px;">日</span></span></td>
      <td>${notifBadge(c.notif)}</td>
    </tr>
  `).join('');
}

function renderNotifQueue() {
  const list = document.getElementById('notifList');
  const iconMap = {
    LINE: { cls: 'line', svg: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>' },
    app: { cls: 'app', svg: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>' },
    mail: { cls: 'mail', svg: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>' },
  };
  list.innerHTML = notifications.map(n => {
    const ic = iconMap[n.type];
    const statusBadge = n.status === 'pending' ? '<span class="badge badge-info"><span class="badge-dot"></span>待機</span>' :
                         n.status === 'retry' ? '<span class="badge badge-warn"><span class="badge-dot"></span>再送</span>' :
                         '<span class="badge badge-neutral"><span class="badge-dot"></span>予約</span>';
    return `
      <div class="notif-item" onclick="previewNotification('${n.tmpl}','${n.target}','${n.type}')">
        <div class="notif-icon ${ic.cls}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${ic.svg}</svg>
        </div>
        <div class="notif-body">
          <div class="notif-title">${n.title}</div>
          <div class="notif-meta">
            <span>${n.target}</span>
            <span>·</span>
            <span class="notif-time">${n.time}</span>
            ${statusBadge}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderSchedule() {
  const list = document.getElementById('scheduleList');
  list.innerHTML = schedule.map(s => `
    <div class="schedule-row">
      <div>
        <div class="schedule-date">${s.day}</div>
        <div class="schedule-month">${s.month}</div>
      </div>
      <div class="schedule-event">
        <div class="schedule-event-title">${s.title}</div>
        <div class="schedule-event-meta">${s.meta}</div>
      </div>
    </div>
  `).join('');
}

// ============ ROLE SWITCH ============
document.querySelectorAll('#roleSwitch button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#roleSwitch button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const role = btn.dataset.role;
    document.getElementById('adminView').classList.toggle('active', role === 'admin');
    document.getElementById('customerView').classList.toggle('active', role === 'customer');
  });
});

// ============ MODAL ============
function openCustomerDetail(id) {
  const c = customers.find(x => x.id === id);
  if (!c) return;
  document.getElementById('modalTitle').textContent = c.name + ' さん';
  document.getElementById('modalSub').textContent = c.furigana + ' / ID: CUST-' + String(c.id).padStart(5, '0');

  const previewMsg = `${c.name}様

いつもお世話になっております。
ご愛用の${c.car}（${c.plate}）の
車検満了日が${c.daysLeft}日後に迫っております。

【満了日】${c.expire.replace(/-/g, '年').replace(/-/g, '月') + '日'}
【現在走行距離】${c.mileage.toLocaleString()} km

下記より、お見積のご確認・
ご予約が可能です。
▶ https://shaken.example.jp/q/${c.id}`;

  document.getElementById('modalBody').innerHTML = `
    <div class="detail-grid">
      <div class="detail-item"><div class="detail-label">電話番号</div><div class="detail-value">${c.phone}</div></div>
      <div class="detail-item"><div class="detail-label">メール</div><div class="detail-value">${c.email}</div></div>
      <div class="detail-item"><div class="detail-label">車両</div><div class="detail-value">${c.car}</div></div>
      <div class="detail-item"><div class="detail-label">登録番号</div><div class="detail-value"><span class="plate">${c.plate}</span></div></div>
      <div class="detail-item"><div class="detail-label">車体番号</div><div class="detail-value" style="font-family:'JetBrains Mono',monospace;font-size:12px;">${c.vin}</div></div>
      <div class="detail-item"><div class="detail-label">走行距離</div><div class="detail-value">${c.mileage.toLocaleString()} km</div></div>
      <div class="detail-item"><div class="detail-label">車検満了日</div><div class="detail-value">${c.expire.replace(/-/g,'/')}</div></div>
      <div class="detail-item"><div class="detail-label">残日数</div><div class="detail-value"><span class="days-left ${priorityClass(c.priority)}">${c.daysLeft}日</span></div></div>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">通知設定</div>
      <div class="notif-channel-row">
        <div class="channel-toggle ${c.channel.includes('LINE') ? 'selected' : ''}">LINE</div>
        <div class="channel-toggle ${c.channel.includes('アプリ') ? 'selected' : ''}">アプリ通知</div>
        <div class="channel-toggle ${c.channel.includes('メール') ? 'selected' : ''}">メール</div>
        <div class="channel-toggle">SMS</div>
      </div>
      <div style="font-size:11px;color:var(--ink-3);font-family:'JetBrains Mono',monospace;">次回配信: ${c.nextNotif} / トリガー: ${c.notifType}</div>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">通知文プレビュー</div>
      <div class="preview-message">${previewMsg}</div>
    </div>

    <div style="display:flex;gap:8px;margin-top:24px;">
      <button class="btn" style="flex:1;" onclick="closeModal()">閉じる</button>
      <button class="btn btn-primary" style="flex:1;" onclick="closeModal();showToast('${c.name}さんに通知を送信しました')">今すぐ通知送信</button>
    </div>
  `;
  document.getElementById('modal').classList.add('show');
}

function previewNotification(tmpl, target, type) {
  document.getElementById('modalTitle').textContent = '通知プレビュー';
  document.getElementById('modalSub').textContent = `テンプレート: ${tmpl} / 宛先: ${target}`;

  document.getElementById('modalBody').innerHTML = `
    <div style="display:flex;gap:12px;margin-bottom:20px;align-items:center;">
      <div class="badge badge-info"><span class="badge-dot"></span>${type.toUpperCase()}</div>
      <div style="font-size:12px;color:var(--ink-3);">配信予定: 本日 17:00</div>
    </div>
    <div class="modal-section-title" style="margin-bottom:8px;">配信内容</div>
    <div class="preview-message">${target}

いつもありがとうございます。
お車の車検満了日が近づいて
おりますのでお知らせします。

【満了日】2026年5月30日
【残日数】28日

▶ お見積を確認する
   https://shaken.example.jp/q/abc

▶ ご予約はこちら
   https://shaken.example.jp/r/abc

────────────
配信停止: メニュー > 通知設定</div>

    <div style="display:flex;gap:8px;margin-top:24px;">
      <button class="btn" style="flex:1;" onclick="closeModal()">閉じる</button>
      <button class="btn" style="flex:1;" onclick="closeModal();showToast('配信を取り消しました')">取り消し</button>
      <button class="btn btn-primary" style="flex:1;" onclick="closeModal();showToast('${target}に送信しました')">今すぐ送信</button>
    </div>
  `;
  document.getElementById('modal').classList.add('show');
}

function closeModal() { document.getElementById('modal').classList.remove('show'); }

document.getElementById('modal').addEventListener('click', e => {
  if (e.target.id === 'modal') closeModal();
});

// ============ TOAST ============
function showToast(msg) {
  const t = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.remove('show'), 2400);
}

function sendBatchNotifications() {
  showToast('7件の通知を一括送信しました');
}

// ============ INIT ============
renderTable();
renderNotifQueue();
renderSchedule();
</script>

</body>
</html>