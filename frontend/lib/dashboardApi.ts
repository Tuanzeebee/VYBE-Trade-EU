// Dashboard exporter và buyer (G1, G2) và số đo quay lại (G3). null = lỗi tải, không giả làm dữ liệu rỗng.
import { createApiClient } from './api/client';
import type { components } from './api/schema';

export type ExporterDashboardData = components['schemas']['ExporterDashboard'];
export type BuyerDashboardData = components['schemas']['BuyerDashboard'];
export type ReturnVisitStats = components['schemas']['ReturnVisitStats'];

export async function fetchExporterDashboard(): Promise<ExporterDashboardData | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/exporter/dashboard');
    return response.ok && data ? data : null;
  } catch {
    return null;
  }
}

export async function fetchBuyerDashboard(): Promise<BuyerDashboardData | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/buyer/dashboard');
    return response.ok && data ? data : null;
  } catch {
    return null;
  }
}

export async function fetchReturnVisits(weeks = 8): Promise<ReturnVisitStats | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/admin/stats/return-visits', { params: { query: { weeks } } });
    return response.ok && data ? data : null;
  } catch {
    return null;
  }
}

export type ProfileViewers = components['schemas']['ProfileViewersOut'];

/** U9: ai đã xem hồ sơ trong `days` ngày. null = lỗi tải. */
export async function getProfileViewers(days: number): Promise<ProfileViewers | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/exporter/profile-viewers', { params: { query: { days } } });
    return response.ok && data ? data : null;
  } catch {
    return null;
  }
}

/** Ghi lượt xem hồ sơ công khai; thất bại không ảnh hưởng người xem. */
export async function recordProfileView(slug: string): Promise<void> {
  try {
    await createApiClient().POST('/api/public/companies/{slug}/view', { params: { path: { slug } } });
  } catch {
    // bỏ qua
  }
}

// Khóa hướng dẫn của ô trống → lời nhắc (tiếng Việt; giao diện dịch qua tr()).
export const HINTS: Record<string, string> = {
  create_company: 'Hoàn thiện hồ sơ doanh nghiệp để bắt đầu.',
  no_profile_views: 'Chưa có ai xem hồ sơ. Hoàn thiện hồ sơ và xác minh để buyer tìm thấy bạn.',
  no_rfqs_received: 'Chưa có yêu cầu báo giá. Buyer sẽ gửi khi thấy sản phẩm của bạn trong danh bạ.',
  start_verification: 'Doanh nghiệp chưa được xác minh. Gửi yêu cầu xác minh để xuất hiện trong danh bạ.',
  no_tariff_runs: 'Chưa có lần tính thuế nào. Dùng máy tính thuế để thấy tổng tiền tiết kiệm nhờ EVFTA.',
  no_copilot_questions: 'Bạn chưa hỏi trợ lý tuân thủ. Đặt câu hỏi đầu tiên để nhận trả lời có trích dẫn.',
  saved_searches_coming_soon: 'Tính năng lưu tìm kiếm sắp ra mắt. Trong lúc này hãy dùng danh bạ để tìm nhà cung cấp.',
  no_rfqs_sent: 'Bạn chưa gửi yêu cầu báo giá. Tìm nhà cung cấp trong danh bạ và gửi yêu cầu đầu tiên.',
  no_recent_suppliers: 'Chưa có nhà cung cấp nào bạn đã xem. Khám phá danh bạ để bắt đầu.',
  set_sourcing_categories: 'Chọn nhóm hàng quan tâm trong hồ sơ để thấy nhà cung cấp mới được xác minh.',
  no_new_verified: 'Tuần này chưa có nhà cung cấp mới được xác minh trong nhóm hàng của bạn.',
};
