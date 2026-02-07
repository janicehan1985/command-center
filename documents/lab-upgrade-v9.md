# Lab Upgrade Project - vSphere to Version 9

**Created:** 2026-02-02
**Deadline:** Before April 1, 2026
**Status:** Planning

---

## 🎯 Objectives

1. Upgrade vSphere/vCenter to Version 9
2. Upgrade Host 45 → Version 9
3. Upgrade Host 48 → Version 9
4. Migrate VMs to shared storage before upgrade
5. Setup NFS for Supermicro
6. Remove AI 8 VMware licenses before usage report
7. **Backup all virtual machines** (new!)

---

## 📋 Task Breakdown

### Phase 1: Pre-Upgrade Preparation

- [ ] **Backup current configuration**
  - Export vCenter inventory
  - Document current VM locations
  - Snapshot critical VMs (DNS, vCenter itself)

- [ ] **Setup NFS storage (Supermicro)**
  - Configure NFS datastores in vCenter
  - Verify NFS connectivity from Host 45 & 48
  - Test NFS performance

- [ ] **Migrate VMs to NFS**
  - Migrate DNS server(s)
  - Migrate other critical VMs
  - Ensure VMs are running on NFS before host upgrade

- [ ] **License cleanup**
  - Remove AI 8 (AppDefense 8) VMware licenses
  - Document current license usage
  - Prepare license report

### Phase 2: vCenter Upgrade

- [ ] **Upgrade vCenter Server to Version 9**
  - Review vCenter upgrade requirements
  - Take vCenter snapshot/backup
  - Run upgrade
  - Verify vCenter functionality post-upgrade

### Phase 3: Host Upgrades

- [ ] **Upgrade Host 45 to Version 9**
  - Place host in maintenance mode
  - Migrate remaining VMs
  - Run host upgrade
  - Verify host is healthy
  - Exit maintenance mode

- [ ] **Upgrade Host 48 to Version 9**
  - Place host in maintenance mode
  - Migrate remaining VMs
  - Run host upgrade
  - Verify host is healthy
  - Exit maintenance mode

### Phase 4: Post-Upgrade

- [ ] **Verify all VMs operational**
- [ ] **Test vMotion between upgraded hosts**
- [ ] **Run compliance checks**
- [ ] **Send VMware usage report**
- [ ] **Document any issues encountered**

---

## 🔧 Current Inventory

| Host | IP | Current Version | Target Version | Notes |
|------|-----|-----------------|----------------|-------|
| Host 45 | ??? | vSphere 8 | vSphere 9 | To be upgraded |
| Host 48 | ??? | vSphere 8 | vSphere 9 | To be upgraded |
| Supermicro NAS | ??? | N/A | NFS Setup | Shared storage |

---

## ⚠️ Important Notes

1. **Order matters:** Upgrade vCenter FIRST, then hosts
2. **Migration first:** VMs must be on NFS/shared storage before host upgrades
3. **License cleanup BEFORE report:** Remove AI 8 licenses first
4. **Backups first:** Take snapshots/config exports before each step

---

## 📞 Resources

- VMware Upgrade Guide: https://docs.vmware.com
- Host upgrade order: vCenter → Hosts → VMs

---

## 📝 Progress Log

**2026-02-02:** Project documented, pending execution

---

## 🗄️ VM Backup Strategy

### Backup Methods

| Method | Pros | Cons | Best For |
|--------|------|------|----------|
| **OVF Export** | Portable, easy to restore | Slow, VM must be powered off | One-time backup, migration |
| **Snapshots** | Fast, no downtime | Not for long-term, impacts performance | Short-term checkpoints |
| **NFS Replication** | Continuous, fast | Requires NFS storage | DR protection |
| **vSphere Backup API** | Incremental, efficient | Requires backup software | Production backup |

### Recommended Approach

**Pre-Upgrade: OVF Export for Critical VMs**

1. Export DNS VM to OVF
2. Export vCenter VM (if possible) or take snapshot
3. Export any other critical VMs
4. Store on Supermicro NFS or external storage

**Post-Upgrade: Configure regular backups**

---

## 📋 VM Inventory (to backup)

| VM Name | Purpose | Priority | Backup Method |
|---------|---------|----------|---------------|
| DNS Server | Name resolution | 🔴 Critical | OVF Export + Snapshot |
| vCenter | Lab management | 🔴 Critical | Snapshot only |
| ??? | | | |

*Add more VMs as needed*

---

*Backup task added to GTD: http://10.114.1.23:8035*
