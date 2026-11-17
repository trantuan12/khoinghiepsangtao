/**
 * CENTRALIZED API RBAC, IDOR PROTECTION & SERVER-SIDE STATE GUARD
 * Rà soát và xác thực quyền sở hữu dữ liệu (schedules, care-logs, profiles, payments, messages, notifications, reviews, exports)
 * dựa trên phiên đăng nhập đã xác thực từ server (req.auth), tuyệt đối không tin ID/status từ trình duyệt.
 */

import { resolveVerifiedAuthContext } from './auth.js';
import { writeAuditLog } from './security.js';

const UNTRUSTED_BODY_STATE_KEYS = [
  'is_admin',
  'is_premium',
  'premium_until',
  'care_score',
  'escrow_status',
  'caregiver_payout_status',
  'family_payment_status',
  'approved_by_admin_id',
  'approved_at',
];

function setSafeQuery(req, overrides = {}, keysToDelete = []) {
  const nextQuery = { ...(req.query || {}) };
  for (const k of keysToDelete) {
    delete nextQuery[k];
  }
  Object.assign(nextQuery, overrides);
  Object.defineProperty(req, 'query', {
    value: nextQuery,
    writable: true,
    configurable: true,
    enumerable: true,
  });
}

function isMismatchId(providedVal, expectedUid) {
  if (providedVal === undefined || providedVal === null || providedVal === '') return false;
  const num = Number(providedVal);
  return !Number.isFinite(num) || num !== Number(expectedUid);
}

export function createApiAccessGuard(pool, getIsDbConnected) {
  return async function apiAccessGuard(req, res, next) {
    const isDbConnected = Boolean(getIsDbConnected());
    const p = req.path || '/';
    const method = req.method.toUpperCase();

    if (method === 'OPTIONS') return next();

    // 1. Luôn giải mã & đối chiếu token_version từ cookie/Bearer
    const auth = await resolveVerifiedAuthContext(req, pool, isDbConnected);
    req.auth = auth;

    // 2. Xóa các trường trạng thái nhạy cảm nếu người gửi không phải Admin
    if (auth.userRole !== 'admin' && req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
      for (const k of UNTRUSTED_BODY_STATE_KEYS) {
        if (k in req.body) delete req.body[k];
      }
      if ('verification_status' in req.body) {
        delete req.body.verification_status;
      }
    }

    const deny401 = () => res.status(401).json({ error: 'Vui lòng đăng nhập để sử dụng tính năng này.' });
    const deny403 = async (reason = 'idor_or_role_denied', resourceType = p, resourceId = null) => {
      await writeAuditLog(pool, isDbConnected, req, {
        action: 'security.idor_blocked',
        resourceType,
        resourceId,
        status: 'denied',
        metadata: { method, path: p, reason },
      });
      return res.status(403).json({ error: 'Bạn không có quyền truy cập hoặc chỉnh sửa dữ liệu của tài khoản khác.' });
    };

    // 3. Nhóm API công khai (không cần đăng nhập)
    if (
      p === '/health' ||
      p === '/auth/login' ||
      p === '/auth/admin/verify-mfa' ||
      p === '/auth/register' ||
      p === '/auth/refresh' ||
      p === '/auth/logout' ||
      p === '/auth/forgot-password' ||
      p === '/auth/verify-otp' ||
      p === '/auth/reset-password' ||
      (method === 'GET' && (p === '/caregivers' || /^\/caregivers\/\d+$/.test(p))) ||
      (method === 'GET' && (p === '/caregiver-reviews' || /^\/reviews\/caregiver\/\d+$/.test(p))) ||
      (method === 'GET' && p === '/vouchers') ||
      (method === 'POST' && p === '/vouchers/apply') ||
      (method === 'GET' && p === '/settings') ||
      (method === 'GET' && p === '/communities') ||
      (method === 'POST' && (p === '/ai/match-caregiver' || p === '/ai/chat' || p === '/ai/chat/stream'))
    ) {
      return next();
    }

    // 4. Nhóm API chỉ dành cho Admin
    const isAdminOnly =
      p === '/admin' ||
      p.startsWith('/admin/') ||
      p.startsWith('/export/') ||
      (p === '/settings' && method !== 'GET') ||
      ((p === '/vouchers' || p.startsWith('/vouchers/')) && method !== 'GET') ||
      ((p === '/communities' || p.startsWith('/communities/')) && method !== 'GET') ||
      /^\/caregiver-profile\/\d+\/status$/.test(p) ||
      /^\/caregiver-reviews\/\d+\/status$/.test(p) ||
      p === '/ai/status' ||
      p === '/ai/rag/reindex' ||
      p === '/ai/metrics' ||
      p === '/ai/knowledge' ||
      p === '/ai/training-logs' ||
      p.startsWith('/ai/training-logs/') ||
      p === '/ai/export-finetune-jsonl';

    if (isAdminOnly) {
      if (!auth.authenticated) return deny401();
      if (auth.userRole !== 'admin') return deny403('admin_route_forbidden', 'admin_endpoint');
      if (p.startsWith('/export/') || p === '/ai/export-finetune-jsonl') {
        await writeAuditLog(pool, isDbConnected, req, { action: 'admin.data.export', resourceType: p });
      }
      return next();
    }

    // 5. Từ đây trở xuống BẮT BUỘC đã đăng nhập
    if (!auth.authenticated || !auth.userId) {
      return deny401();
    }

    const uid = Number(auth.userId);
    const role = auth.userRole;
    const q = req.query || {};
    const b = req.body && typeof req.body === 'object' ? req.body : {};

    try {
      // --- ELDERLY PROFILES ---
      if (p === '/elderly-profiles') {
        if (method === 'GET') {
          if (role === 'family') {
            if (isMismatchId(q.userId, uid)) return deny403('elderly_list_other_user', 'elderly_profiles', q.userId);
            setSafeQuery(req, { userId: String(uid) });
          } else if (role !== 'admin') {
            return deny403('caregiver_cannot_list_all_elderly', 'elderly_profiles');
          }
        } else if (method === 'POST') {
          if (role === 'caregiver') return deny403('caregiver_cannot_create_elderly', 'elderly_profiles');
          if (role === 'family') {
            if (isMismatchId(b.user_id, uid)) return deny403('elderly_create_other_user', 'elderly_profiles', b.user_id);
            req.body.user_id = uid;
          }
        }
        return next();
      }

      const epIdMatch = p.match(/^\/elderly-profiles\/(\d+)$/);
      if (epIdMatch) {
        const epId = Number(epIdMatch[1]);
        if (isDbConnected) {
          const [rows] = await pool.execute('SELECT id, user_id, full_name FROM elderly_profiles WHERE id = ? LIMIT 1', [epId]);
          if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy hồ sơ người bệnh' });
          const ep = rows[0];
          if (role === 'family' && Number(ep.user_id) !== uid) {
            return deny403('elderly_profile_idor', 'elderly_profiles', epId);
          }
          if (role === 'caregiver') {
            if (method !== 'GET') return deny403('caregiver_modify_elderly', 'elderly_profiles', epId);
            const [sRows] = await pool.execute(
              'SELECT 1 FROM schedules WHERE caregiver_user_id = ? AND (elderly_profile_id = ? OR LOWER(elderly_name) = LOWER(?)) LIMIT 1',
              [uid, epId, ep.full_name || '']
            );
            if (!sRows.length) return deny403('caregiver_unassigned_elderly', 'elderly_profiles', epId);
          }
          if (method === 'GET') {
            await writeAuditLog(pool, isDbConnected, req, {
              action: 'patient.record.view',
              resourceType: 'elderly_profiles',
              resourceId: epId,
            });
          }
        }
        return next();
      }

      const epNameMatch = p.match(/^\/elderly-profiles\/by-name\/(.+)$/);
      if (epNameMatch) {
        const rawName = decodeURIComponent(epNameMatch[1]).trim();
        if (isDbConnected && role !== 'admin') {
          const [rows] = await pool.execute(
            'SELECT id, user_id, full_name FROM elderly_profiles WHERE full_name ILIKE ? OR full_name = ? LIMIT 1',
            [`%${rawName}%`, rawName]
          );
          if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy hồ sơ người bệnh' });
          const ep = rows[0];
          if (role === 'family' && Number(ep.user_id) !== uid) {
            return deny403('elderly_by_name_idor', 'elderly_profiles', ep.id);
          }
          if (role === 'caregiver') {
            const [sRows] = await pool.execute(
              'SELECT 1 FROM schedules WHERE caregiver_user_id = ? AND (elderly_profile_id = ? OR LOWER(elderly_name) = LOWER(?)) LIMIT 1',
              [uid, ep.id, ep.full_name || '']
            );
            if (!sRows.length) return deny403('caregiver_by_name_idor', 'elderly_profiles', ep.id);
          }
        }
        return next();
      }

      // --- FAMILY PROFILE ---
      if (p === '/family-profile') {
        if (role === 'caregiver') return deny403('caregiver_family_profile', 'family_profiles');
        if (role === 'family') {
          if (method === 'GET') {
            if (isMismatchId(q.userId, uid)) return deny403('family_profile_read_idor', 'family_profiles', q.userId);
            setSafeQuery(req, { userId: String(uid) });
          } else {
            if (isMismatchId(b.user_id, uid)) return deny403('family_profile_write_idor', 'family_profiles', b.user_id);
            req.body.user_id = uid;
          }
        }
        return next();
      }

      // --- CAREGIVER PROFILE, INTERVIEW & BANK ACCOUNT ---
      if (p === '/caregiver-profile' || p === '/caregiver/schedule-interview' || p === '/caregiver/bank-account') {
        if (role === 'family') return deny403('family_caregiver_private', p);
        if (role === 'caregiver') {
          if (method === 'GET') {
            if (isMismatchId(q.userId, uid)) return deny403('cg_profile_read_idor', p, q.userId);
            setSafeQuery(req, { userId: String(uid) });
          } else {
            const sentId = b.user_id ?? b.userId ?? b.caregiverUserId ?? b.caregiver_user_id;
            if (isMismatchId(sentId, uid)) return deny403('cg_profile_write_idor', p, sentId);
            req.body.user_id = uid;
            req.body.userId = uid;
            req.body.caregiverUserId = uid;
            req.body.caregiver_user_id = uid;
          }
        }
        return next();
      }

      // --- SCHEDULES ---
      if (p === '/schedules') {
        if (method === 'GET') {
          if (role === 'family') {
            if (isMismatchId(q.familyUserId, uid) || q.caregiverUserId) {
              return deny403('schedules_family_idor', 'schedules', q.familyUserId || q.caregiverUserId);
            }
            setSafeQuery(req, { familyUserId: String(uid) }, ['caregiverUserId', 'caregiverName']);
          } else if (role === 'caregiver') {
            if (isMismatchId(q.caregiverUserId, uid) || q.familyUserId) {
              return deny403('schedules_caregiver_idor', 'schedules', q.caregiverUserId || q.familyUserId);
            }
            setSafeQuery(req, { caregiverUserId: String(uid) }, ['familyUserId']);
          }
        } else if (method === 'POST') {
          if (role === 'caregiver') return deny403('caregiver_create_schedule', 'schedules');
          if (role === 'family') {
            if (isMismatchId(b.family_user_id, uid)) return deny403('schedule_create_other_family', 'schedules', b.family_user_id);
            if (b.elderly_profile_id && isDbConnected) {
              const [epRows] = await pool.execute('SELECT user_id FROM elderly_profiles WHERE id = ? LIMIT 1', [Number(b.elderly_profile_id)]);
              if (!epRows.length || Number(epRows[0].user_id) !== uid) {
                return deny403('schedule_other_elderly_profile', 'elderly_profiles', b.elderly_profile_id);
              }
            }
            req.body.family_user_id = uid;
            req.body.status = 'pending_payment';
          }
        }
        return next();
      }

      const schedIdMatch = p.match(/^\/schedules\/(\d+)(?:\/(reschedule|cancel))?$/);
      if (schedIdMatch) {
        const sId = Number(schedIdMatch[1]);
        if (isDbConnected && role !== 'admin') {
          const [rows] = await pool.execute('SELECT family_user_id, caregiver_user_id FROM schedules WHERE id = ? LIMIT 1', [sId]);
          if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy ca chăm sóc' });
          const s = rows[0];
          const owns =
            (role === 'family' && Number(s.family_user_id) === uid) ||
            (role === 'caregiver' && Number(s.caregiver_user_id) === uid);
          if (!owns) return deny403('schedule_item_idor', 'schedules', sId);
          if (req.body && req.body.confirmedBy) {
            req.body.confirmedBy = role;
          }
        }
        return next();
      }

      // --- CARE LOGS ---
      if (p === '/care-logs/families-tree') {
        if (role === 'caregiver') return deny403('caregiver_families_tree', 'patient_care_logs');
        if (role === 'family') {
          if (isMismatchId(q.familyUserId, uid)) return deny403('families_tree_idor', 'patient_care_logs', q.familyUserId);
          setSafeQuery(req, { familyUserId: String(uid) });
        }
        return next();
      }

      if (p === '/care-logs' || p === '/care-logs/patients') {
        if (method === 'GET') {
          if (role === 'family') {
            if (isMismatchId(q.familyUserId, uid) || q.caregiverUserId) {
              return deny403('care_logs_family_idor', 'patient_care_logs', q.familyUserId || q.caregiverUserId);
            }
            setSafeQuery(req, { familyUserId: String(uid) }, ['caregiverUserId']);
          } else if (role === 'caregiver') {
            if (isMismatchId(q.caregiverUserId, uid) || q.familyUserId) {
              return deny403('care_logs_cg_idor', 'patient_care_logs', q.caregiverUserId || q.familyUserId);
            }
            setSafeQuery(req, { caregiverUserId: String(uid) }, ['familyUserId']);
          }
          await writeAuditLog(pool, isDbConnected, req, { action: 'patient.care_logs.view', resourceType: 'patient_care_logs' });
        } else if (method === 'POST') {
          if (role === 'family') return deny403('family_create_care_log', 'patient_care_logs');
          if (role === 'caregiver') {
            if (isMismatchId(b.caregiver_user_id, uid)) return deny403('care_log_spoof_cg', 'patient_care_logs', b.caregiver_user_id);
            if (b.schedule_id && isDbConnected) {
              const [sRows] = await pool.execute('SELECT caregiver_user_id, family_user_id, elderly_profile_id FROM schedules WHERE id = ? LIMIT 1', [Number(b.schedule_id)]);
              if (!sRows.length || Number(sRows[0].caregiver_user_id) !== uid) {
                return deny403('care_log_unowned_schedule', 'schedules', b.schedule_id);
              }
              req.body.family_user_id = sRows[0].family_user_id;
              if (sRows[0].elderly_profile_id) req.body.elderly_profile_id = sRows[0].elderly_profile_id;
            } else if (b.family_user_id && isDbConnected) {
              const [sRows] = await pool.execute(
                'SELECT 1 FROM schedules WHERE caregiver_user_id = ? AND family_user_id = ? LIMIT 1',
                [uid, Number(b.family_user_id)]
              );
              if (!sRows.length) {
                return deny403('care_log_unassigned_family', 'patient_care_logs', b.family_user_id);
              }
            }
            req.body.caregiver_user_id = uid;
          }
        }
        return next();
      }

      const careLogAckMatch = p.match(/^\/care-logs\/(\d+)\/acknowledge$/);
      if (careLogAckMatch) {
        const logId = Number(careLogAckMatch[1]);
        if (role === 'caregiver') return deny403('caregiver_ack_care_log', 'patient_care_logs', logId);
        if (role === 'family' && isDbConnected) {
          const [rows] = await pool.execute('SELECT family_user_id FROM patient_care_logs WHERE id = ? LIMIT 1', [logId]);
          if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy nhật ký chăm sóc' });
          if (Number(rows[0].family_user_id) !== uid) return deny403('care_log_ack_idor', 'patient_care_logs', logId);
        }
        return next();
      }

      // --- PAYMENTS & SUBSCRIPTIONS ---
      if (p === '/family-premium/status') {
        if (role === 'caregiver') return deny403('cg_family_premium', 'family_subscriptions');
        if (role === 'family') {
          const qUid = q.userId ?? q.user_id;
          if (isMismatchId(qUid, uid)) return deny403('premium_status_idor', 'family_subscriptions', qUid);
          setSafeQuery(req, { userId: String(uid) }, ['user_id']);
        }
        return next();
      }

      const famSubMatch = p.match(/^\/family\/subscription\/(\d+)$/);
      if (famSubMatch) {
        if (role === 'caregiver') return deny403('cg_family_sub', 'family_subscriptions');
        if (role === 'family' && Number(famSubMatch[1]) !== uid) {
          return deny403('family_sub_idor', 'family_subscriptions', famSubMatch[1]);
        }
        return next();
      }

      if (p === '/family/subscribe') {
        if (role === 'caregiver') return deny403('cg_subscribe_family', 'family_subscriptions');
        if (role === 'family') {
          if (isMismatchId(b.userId, uid)) return deny403('family_subscribe_idor', 'family_subscriptions', b.userId);
          req.body.userId = uid;
        }
        return next();
      }

      const famPayMatch = p.match(/^\/payments\/family\/(\d+)$/);
      if (famPayMatch) {
        if (role === 'caregiver') return deny403('cg_read_family_payments', 'booking_escrow_payments');
        if (role === 'family' && Number(famPayMatch[1]) !== uid) {
          return deny403('family_payments_idor', 'booking_escrow_payments', famPayMatch[1]);
        }
        return next();
      }

      const cgPayMatch = p.match(/^\/payments\/caregiver\/(\d+)$/);
      if (cgPayMatch) {
        if (role === 'family') return deny403('family_read_cg_payments', 'booking_escrow_payments');
        if (role === 'caregiver' && Number(cgPayMatch[1]) !== uid) {
          return deny403('cg_payments_idor', 'booking_escrow_payments', cgPayMatch[1]);
        }
        return next();
      }

      if (p === '/payments/pay-booking') {
        if (role === 'caregiver') return deny403('cg_pay_booking', 'booking_escrow_payments');
        if (role === 'family' && isDbConnected) {
          if (isMismatchId(b.userId, uid)) return deny403('pay_booking_uid_idor', 'booking_escrow_payments', b.userId);
          if (b.paymentId) {
            const [pRows] = await pool.execute('SELECT family_user_id FROM booking_escrow_payments WHERE id = ? LIMIT 1', [Number(b.paymentId)]);
            if (!pRows.length || Number(pRows[0].family_user_id) !== uid) {
              return deny403('pay_booking_payment_idor', 'booking_escrow_payments', b.paymentId);
            }
          } else if (b.scheduleId) {
            const [sRows] = await pool.execute('SELECT family_user_id FROM schedules WHERE id = ? LIMIT 1', [Number(b.scheduleId)]);
            if (!sRows.length || Number(sRows[0].family_user_id) !== uid) {
              return deny403('pay_booking_sched_idor', 'schedules', b.scheduleId);
            }
          }
          req.body.userId = uid;
        }
        return next();
      }

      if (p === '/payments/confirm-shift-complete') {
        if (role !== 'admin' && isDbConnected) {
          let sId = Number(b.scheduleId || 0);
          if (!sId && b.paymentId) {
            const [pRows] = await pool.execute('SELECT schedule_id FROM booking_escrow_payments WHERE id = ? LIMIT 1', [Number(b.paymentId)]);
            if (pRows.length) sId = Number(pRows[0].schedule_id);
          }
          if (sId) {
            const [sRows] = await pool.execute('SELECT family_user_id, caregiver_user_id FROM schedules WHERE id = ? LIMIT 1', [sId]);
            if (!sRows.length) return res.status(404).json({ error: 'Không tìm thấy ca chăm sóc' });
            const owns =
              (role === 'family' && Number(sRows[0].family_user_id) === uid) ||
              (role === 'caregiver' && Number(sRows[0].caregiver_user_id) === uid);
            if (!owns) return deny403('confirm_shift_idor', 'schedules', sId);
          }
          req.body.confirmedBy = role;
        }
        return next();
      }

      // --- MESSAGES, CONVERSATIONS & NOTIFICATIONS ---
      if (p === '/messages' && method === 'GET') {
        if (role !== 'admin') {
          if (isMismatchId(q.userId, uid)) return deny403('messages_read_idor', 'messages', q.userId);
          setSafeQuery(req, { userId: String(uid) });
        }
        return next();
      }

      if (p === '/messages' && method === 'POST') {
        if (role !== 'admin') {
          if (isMismatchId(b.sender_user_id, uid)) return deny403('messages_send_spoof', 'messages', b.sender_user_id);
          req.body.sender_user_id = uid;
          req.body.sender_role = role;
          if (auth.userName) req.body.sender_name = auth.userName;
          const rId = Number(b.recipient_user_id || 1);
          req.body.conversation_id = `conv_${Math.min(uid, rId)}_${Math.max(uid, rId)}`;
        }
        return next();
      }

      if (p === '/messages/read') {
        if (role !== 'admin') {
          if (isMismatchId(b.userId, uid)) return deny403('messages_mark_read_idor', 'messages', b.userId);
          req.body.userId = uid;
        }
        return next();
      }

      if (p === '/conversations') {
        if (role !== 'admin') {
          if (isMismatchId(q.userId, uid)) return deny403('conversations_idor', 'messages', q.userId);
          setSafeQuery(req, { userId: String(uid), role });
        }
        return next();
      }

      if (p === '/notifications') {
        if (role !== 'admin') {
          if (isMismatchId(q.userId, uid)) return deny403('notifications_idor', 'notifications', q.userId);
          setSafeQuery(req, { userId: String(uid) });
        }
        return next();
      }

      if (p === '/notifications/read-all') {
        if (role !== 'admin') {
          if (isMismatchId(b.userId, uid)) return deny403('notifications_read_all_idor', 'notifications', b.userId);
          req.body.userId = uid;
        }
        return next();
      }

      const notifReadMatch = p.match(/^\/notifications\/(\d+)\/read$/);
      if (notifReadMatch && role !== 'admin' && isDbConnected) {
        const nId = Number(notifReadMatch[1]);
        const [nRows] = await pool.execute('SELECT user_id FROM notifications WHERE id = ? LIMIT 1', [nId]);
        if (nRows.length && Number(nRows[0].user_id) !== uid) {
          return deny403('notification_item_idor', 'notifications', nId);
        }
        return next();
      }

      // --- REVIEWS (POST) ---
      if (p === '/caregiver-reviews' && method === 'POST') {
        if (role === 'caregiver') return deny403('cg_post_review', 'caregiver_reviews');
        if (role === 'family') {
          if (isMismatchId(b.family_user_id, uid)) return deny403('review_spoof_family', 'caregiver_reviews', b.family_user_id);
          if (b.schedule_id && isDbConnected) {
            const [sRows] = await pool.execute('SELECT family_user_id FROM schedules WHERE id = ? LIMIT 1', [Number(b.schedule_id)]);
            if (!sRows.length || Number(sRows[0].family_user_id) !== uid) {
              return deny403('review_unowned_schedule', 'schedules', b.schedule_id);
            }
          }
          req.body.family_user_id = uid;
        }
        return next();
      }

      return next();
    } catch (err) {
      console.error('Lỗi kiểm tra phân quyền API:', err.message);
      return res.status(500).json({ error: 'Lỗi kiểm tra quyền truy cập dữ liệu.' });
    }
  };
}
