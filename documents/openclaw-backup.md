# OpenClaw Backup & Recovery Plan

**Created:** 2026-02-02
**Purpose:** Ensure OpenClaw can be recovered if VM is lost

---

## 📦 What to Backup

### Core OpenClaw Files
| Path | Description | Priority |
|------|-------------|----------|
| `/root/.openclaw/` | OpenClaw configuration & data | 🔴 Critical |
| `/root/clawd/` | All custom applications | 🔴 Critical |
| `/etc/openclaw/` | System configuration | 🟡 High |

### Data to Preserve
- ✅ OpenClaw configuration files
- ✅ Memory files (`MEMORY.md`, `memory/*.md`)
- ✅ Command center documents
- ✅ Application data (expenses, tasks, etc.)
- ✅ Git repositories (`*/.git/`)
- ✅ Environment variables & secrets
- ✅ Channel configurations

---

## 🗄️ Database Backup Options

### Option 1: SQLite/PostgreSQL for Key Data
- Store memories, tasks, expenses in SQL database
- Easy to backup with `pg_dump` or `sqlite3`
- Enables better querying

### Option 2: Git-based Backup
- Push all critical files to GitHub daily
- Version history preserved
- Can restore from any point

### Option 3: rsync to External Storage
- Sync to NAS/Cloud storage
- Incremental backups
- Fast recovery

---

## ✅ Recommended Approach

**Hybrid: Git + Export Scripts**

1. **Daily Git Push** - Commit changes automatically
2. **Weekly Export** - Dump all data to JSON/CSV
3. **Cloud Storage** - Backup to Google Drive/S3/NAS

---

## 📋 Backup Checklist

- [ ] Create backup script
- [ ] Configure automated daily backups
- [ ] Set up GitHub remote for critical repos
- [ ] Document recovery procedures
- [ ] Test recovery process

---

## 🔧 Recovery Steps

1. Install fresh OpenClaw
2. Clone GitHub repositories
3. Restore configuration files
4. Import data from exports
5. Verify all services start

---

*More details coming as we implement!*
