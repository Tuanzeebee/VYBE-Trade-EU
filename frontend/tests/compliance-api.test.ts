import { describe, expect, it } from 'vitest';
import { buildOriginBody, isInputVisible, parsePercent, type OriginInput } from '@/lib/complianceApi';

const input = (over: Partial<OriginInput> & { name: string }): OriginInput => ({
  kind: 'boolean',
  options: [],
  required_if: null,
  ...over,
});

describe('parsePercent', () => {
  it.each(['0', '8', '12.5', '100', '100.00', '99.99', ' 7 ', '7,5'])('chấp nhận %j', (raw) => {
    expect(parsePercent(raw)).not.toBeNull();
  });
  it.each(['', '-1', '101', '100.01', '1e2', 'abc', '12.345', '8%'])('từ chối %j', (raw) => {
    expect(parsePercent(raw)).toBeNull();
  });
  it('chuẩn hóa dấu phẩy thành dấu chấm và cắt khoảng trắng', () => {
    expect(parsePercent(' 7,5 ')).toBe('7.5');
  });
});

describe('isInputVisible', () => {
  const vessel = input({ name: 'vessel_flag_vn_eu', required_if: 'sourcing=CAUGHT_BY_VESSEL' });
  const handling = input({ name: 'transit_handling', kind: 'enum', required_if: 'transit_third_country=true' });
  it('luôn hiện khi không có điều kiện hoặc điều kiện "optional"', () => {
    expect(isInputVisible(input({ name: 'a' }), {})).toBe(true);
    expect(isInputVisible(input({ name: 'a', required_if: 'optional' }), {})).toBe(true);
  });
  it('hiện theo giá trị enum của câu trả lời khác', () => {
    expect(isInputVisible(vessel, {})).toBe(false);
    expect(isInputVisible(vessel, { sourcing: 'IMPORTED' })).toBe(false);
    expect(isInputVisible(vessel, { sourcing: 'CAUGHT_BY_VESSEL' })).toBe(true);
  });
  it('điều kiện =true nghĩa là câu trả lời Có', () => {
    expect(isInputVisible(handling, { transit_third_country: 'no' })).toBe(false);
    expect(isInputVisible(handling, { transit_third_country: 'yes' })).toBe(true);
  });
});

describe('buildOriginBody', () => {
  const inputs = [
    input({ name: 'transit_third_country' }),
    input({ name: 'transit_handling', kind: 'enum', required_if: 'transit_third_country=true' }),
    input({ name: 'sourcing', kind: 'enum' }),
    input({ name: 'restricted_nonorig_pct_weight', kind: 'percent' }),
  ];
  const extra = { consignmentValue: null, rawMaterialSource: '', isFresh: '' };

  it('chỉ gửi câu đã trả lời; Có/Không thành boolean, % giữ dạng chuỗi', () => {
    const built = buildOriginBody(
      '03061792',
      inputs,
      { transit_third_country: 'no', sourcing: 'FARMED_IN_VN', restricted_nonorig_pct_weight: '8' },
      extra,
    );
    expect(built).toEqual({
      ok: true,
      body: { hs_code: '03061792', transit_third_country: false, sourcing: 'FARMED_IN_VN', restricted_nonorig_pct_weight: '8' },
    });
  });
  it('"Chưa rõ" (chuỗi rỗng) không được gửi: thiếu dữ liệu là inconclusive, không phải câu trả lời Không', () => {
    const built = buildOriginBody('03061792', inputs, { transit_third_country: '' }, extra);
    expect(built).toEqual({ ok: true, body: { hs_code: '03061792' } });
  });
  it('bỏ câu trả lời của trường đang ẩn', () => {
    const built = buildOriginBody('03061792', inputs, { transit_third_country: 'no', transit_handling: 'PROCESSED' }, extra);
    expect(built.ok && 'transit_handling' in built.body).toBe(false);
  });
  it('phần trăm sai định dạng thì trả tên trường lỗi', () => {
    expect(buildOriginBody('03061792', inputs, { restricted_nonorig_pct_weight: '120' }, extra)).toEqual({
      ok: false,
      field: 'restricted_nonorig_pct_weight',
    });
  });
  it('thêm thông tin lô: trị giá, nguồn nguyên liệu, hàng tươi', () => {
    const built = buildOriginBody('03061792', [], {}, { consignmentValue: '5000', rawMaterialSource: 'AQUACULTURE', isFresh: 'yes' });
    expect(built).toEqual({
      ok: true,
      body: { hs_code: '03061792', consignment_value_eur: '5000', raw_material_source: 'AQUACULTURE', is_fresh: true },
    });
  });
});
