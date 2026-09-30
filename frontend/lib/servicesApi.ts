// Dịch vụ của nhà cung cấp dịch vụ (U2): logistics, hải quan, kế toán-thuế… Bản nháp trong form ↔ API.
import { createApiClient } from './api/client';
import type { components } from './api/schema';

export type ServiceOffering = components['schemas']['ServiceOfferingOut'];
export type ServiceOfferingIn = components['schemas']['ServiceOfferingIn'];
export type CatalogItem = components['schemas']['CatalogItemOut'];

export interface ServiceDraft {
  /** Có id = dịch vụ đã lưu trên server. */
  id?: string;
  categoryCode: string;
  title: string;
  descriptionVi: string;
  coverage: string[];
}

const NETWORK = 'Không kết nối được máy chủ. Vui lòng thử lại.';

export function emptyServiceDraft(): ServiceDraft {
  return { categoryCode: '', title: '', descriptionVi: '', coverage: ['VN'] };
}

export function draftFromService(s: ServiceOffering): ServiceDraft {
  return {
    id: s.id,
    categoryCode: s.category_code,
    title: s.title,
    descriptionVi: s.description_vi ?? s.description_en ?? '',
    coverage: s.coverage_countries,
  };
}

/** Kiểm tối thiểu ở giao diện; server kiểm lại loại dịch vụ và độ dài. */
export function serviceDraftToBody(d: ServiceDraft): ServiceOfferingIn {
  if (!d.categoryCode) throw new Error('Vui lòng chọn loại dịch vụ.');
  if (!d.title.trim()) throw new Error('Vui lòng nhập tên dịch vụ.');
  return {
    category_code: d.categoryCode,
    title: d.title.trim(),
    description_vi: d.descriptionVi.trim() || null,
    coverage_countries: [...new Set(d.coverage)],
    is_active: true,
  };
}

export async function listServiceCategories(): Promise<CatalogItem[]> {
  try {
    const { data, response } = await createApiClient().GET('/api/public/service-categories');
    return response.ok && data ? data : [];
  } catch {
    return [];
  }
}

export async function getMyServices(): Promise<ServiceOffering[] | null> {
  try {
    const { data, response } = await createApiClient().GET('/api/exporter/services');
    return response.ok && data ? data : null;
  } catch {
    return null;
  }
}

/** Đồng bộ danh sách trong form với server: tạo mới, sửa, xóa dịch vụ không còn trong form. */
export async function syncServices(drafts: ServiceDraft[]): Promise<ServiceOffering[]> {
  const bodies = drafts.map((d) => serviceDraftToBody(d));
  const api = createApiClient();
  try {
    const listed = await api.GET('/api/exporter/services');
    if (!listed.response.ok || !listed.data) throw new Error(NETWORK);
    const existingIds = new Set(listed.data.map((s) => s.id));
    const keptIds = new Set<string>();
    const saved: ServiceOffering[] = [];
    for (const [index, draft] of drafts.entries()) {
      const body = bodies[index];
      const update = draft.id !== undefined && existingIds.has(draft.id);
      const result = update
        ? await api.PATCH('/api/exporter/services/{service_id}', {
            params: { path: { service_id: draft.id as string } },
            body,
          })
        : await api.POST('/api/exporter/services', { body });
      if (!result.response.ok || !result.data) throw new Error(`Không lưu được dịch vụ "${body.title}". Vui lòng kiểm tra lại.`);
      if (update) keptIds.add(draft.id as string);
      saved.push(result.data);
    }
    for (const service of listed.data) {
      if (keptIds.has(service.id)) continue;
      await api.DELETE('/api/exporter/services/{service_id}', { params: { path: { service_id: service.id } } });
    }
    return saved;
  } catch (error) {
    if (error instanceof Error && error.message !== 'Failed to fetch' && !(error instanceof TypeError)) throw error;
    throw new Error(NETWORK);
  }
}
