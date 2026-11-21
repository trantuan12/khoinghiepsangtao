/**
 * DTO / SERIALIZER TÁCH DỮ LIỆU CÔNG KHAI & RIÊNG TƯ
 * Đảm bảo không bao giờ lộ password_hash, token_version, refresh_token_hash,
 * hoặc thông tin liên lạc/CCCD riêng tư cho người không có quyền.
 */

import { decryptSensitiveField, maskIdNumber } from '../security.js';

export function serializeUserDto(userRow, { canViewPrivateContact = false } = {}) {
  if (!userRow || typeof userRow !== 'object') return null;
  const dto = {
    id: Number(userRow.id),
    username: String(userRow.username || ''),
    role: String(userRow.role || 'family'),
    full_name: String(userRow.full_name || ''),
    avatar_initials: String(userRow.avatar_initials || 'CM'),
    ...(userRow.caregiver_title !== undefined ? { caregiver_title: userRow.caregiver_title } : {}),
    ...(userRow.caregiver_rating !== undefined ? { caregiver_rating: userRow.caregiver_rating } : {}),
    ...(userRow.created_at !== undefined ? { created_at: userRow.created_at } : {}),
  };

  if (canViewPrivateContact) {
    dto.email = String(userRow.email || '');
    dto.phone = String(userRow.phone || '');
    if (userRow.must_change_password !== undefined) {
      dto.must_change_password = Boolean(userRow.must_change_password);
    }
    if (userRow.mfa_enabled !== undefined) {
      dto.mfa_enabled = Boolean(userRow.mfa_enabled);
    }
  }

  return dto;
}

export function serializeDocumentMetadataList(rawDocuments, { includeRawFiles = false } = {}) {
  const list = Array.isArray(rawDocuments) ? rawDocuments : [];
  if (includeRawFiles) return list;
  return list.map((d) => ({
    type: d?.document_type || d?.type || d?.category || 'certificate',
    name: d?.document_name || d?.name || 'Hồ sơ đã xác thực',
    status: d?.status || 'verified',
  }));
}

export function serializeFamilyProfileDto(profileRow, { mode = 'owner' } = {}) {
  if (!profileRow || typeof profileRow !== 'object') return null;
  const out = { ...profileRow };
  if (mode === 'owner' || mode === 'admin_detail') {
    out.id_number = decryptSensitiveField(profileRow.id_number);
  } else if (mode === 'admin_list') {
    out.id_number = maskIdNumber(profileRow.id_number);
    delete out.id_card_front;
    delete out.id_card_back;
  } else {
    delete out.id_number;
    delete out.id_card_front;
    delete out.id_card_back;
  }
  return out;
}
