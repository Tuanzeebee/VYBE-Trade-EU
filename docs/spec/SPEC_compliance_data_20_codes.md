# SPEC — Lớp dữ liệu tuân thủ cho 20 mã đợt 1 (backlog C1, C4, C6)

Đặt file này ở `docs/specs/` cùng thư mục `seed/`. Đọc `CLAUDE.md` và spec MVP trước khi bắt đầu.

## 1. Bài toán

Máy tính thuế (C2), máy tính xuất xứ (C4) và danh sách bằng chứng (C6) phải chạy trên **dữ liệu đã được luật sư duyệt**, không viết cứng trong code. Spec này dựng lớp dữ liệu, bộ nạp seed, cổng duyệt và hai hàm lõi (tính thuế, đánh giá xuất xứ) cho 20 mã thuộc Chương 3, 7, 8.

Kết quả cần có: một nhà xuất khẩu nhập mã HS, trị giá lô và câu trả lời về nguyên liệu, nhận lại (a) số tiền tiết kiệm, (b) Đạt / Không đạt / Chưa kết luận kèm lý do, (c) danh sách bằng chứng bắt buộc cho đúng lô đó.

## 2. Nguyên tắc không được vi phạm

1. **Không đoán logic tuân thủ.** Mọi tỷ lệ thuế, quy tắc, ngưỡng, danh sách bằng chứng nằm trong DB. Code chỉ chứa thuật toán.
2. **Dữ liệu chưa duyệt vẫn hiển thị, nhưng luôn kèm lưu ý.** Ở mọi môi trường, kể cả `prod`, dòng có `reviewed_by IS NULL` vẫn được dùng để tính và hiển thị. Mọi response dựa trên ít nhất một thành phần chưa duyệt phải có `"review_state": "UNREVIEWED"` và `"disclaimer"` (mục 2a). Không có cờ môi trường nào tắt được lưu ý này.
2a. **Dòng lưu ý cho người dùng.** Chuỗi lấy từ i18n, khóa `compliance.disclaimer.unreviewed`:
    - vi: "Lưu ý: Thông tin này chưa được luật sư thương mại xác nhận. Vui lòng đối chiếu với cơ quan cấp C/O hoặc chuyên gia tư vấn trước khi sử dụng."
    - en: "Note: This information has not yet been confirmed by a trade lawyer. Please check with the issuing authority or a trade compliance advisor before relying on it."
    Hiển thị ngay dưới con số tiết kiệm, dưới kết quả xuất xứ và ở đầu danh sách bằng chứng; cùng cỡ chữ với nội dung chính, không thu gọn, không ẩn sau tooltip. Khi `review_state = REVIEWED` thì không hiện.
3. **Ba trạng thái tách biệt.** `PASS`, `FAIL`, `INCONCLUSIVE` không được gộp. Thiếu dữ liệu đầu vào → `INCONCLUSIVE`, không phải `FAIL`.
4. **Tiền và tỷ lệ dùng `Decimal`** (PostgreSQL `numeric`). Không dùng float ở bất kỳ đâu trong luồng tính.
5. **Mọi lần tính ghi `compliance_checks`** (append-only), kể cả khách chưa đăng nhập, kèm `tariff_line_id`, `rule_id`, phiên bản dữ liệu.

## 3. Hiện trạng dữ liệu seed (đọc kỹ)

| File | Nội dung | Ghi chú |
|---|---|---|
| `hs_codes.json` | 20 mã CN 2012 | `cn_code_current = null`, `cn_mapping_verified = false`: phải đối chiếu CN 2026 |
| `tariff_lines.json` | Thuế cơ sở, nhóm lộ trình | `mfn_rate` hiện = thuế cơ sở 2012, `mfn_verified_taric = false` |
| `staging_categories.json` | A, B3, B5, B7 | Số bậc cắt giảm đều |
| `product_specific_rules.json` | Nguyên văn Annex II + loại logic + tham số | 2 mã 0304 có `requires_expert = true` |
| `roo_questions.json` | Câu hỏi hiển thị theo mã | Văn bản hiển thị, không dùng làm logic |
| `evidence_types.json` | 16 loại bằng chứng | Có `legal_status`: VERIFIED / TO_VERIFY / PLATFORM_RULE |
| `evidence_requirements.json` | 199 dòng mã × bằng chứng × điều kiện | Sinh từ ma trận nhóm, mỗi dòng duyệt riêng |
| `evidence_conditions.json` | Mã điều kiện | Enum đóng, không cho thêm tự do |
| `evidence_matrix_review.xlsx` | Bản cho luật sư duyệt | Cột vàng là ô nhập |

**Toàn bộ seed có `reviewed_by = null`** vì file nguồn chưa có cột luật sư xác nhận. Hệ quả: cả 20 mã chạy được trên mọi môi trường, nhưng mọi kết quả đều kèm dòng lưu ý ở mục 2a cho tới khi có lệnh nhập kết quả duyệt (mục 6.3).

## 4. Mô hình dữ liệu

Viết bằng SQLAlchemy 2.0 + Alembic. Tất cả bảng dữ liệu tuân thủ có các cột chung: `source`, `reviewed_by` (FK users, nullable), `reviewed_at`, `valid_from`, `valid_until`, `data_version`, `created_at`.

```
hs_codes(id, cn_code_2012 unique, cn_code_current null, cn_mapping_verified bool,
         chapter int, heading char(4), hs6 char(6), product_group_vi, name_vi, name_en null,
         evidence_group, is_calculator_supported bool)        -- is_calculator_supported là cột suy diễn, xem 6.2

staging_categories(code pk, stages int, zero_from date)

tariff_lines(id, hs_code_id fk, destination 'EU', duty_type enum(AD_VALOREM|SPECIFIC|MIXED),
             base_rate numeric(6,4), mfn_rate numeric(6,4), mfn_source enum(BASE_RATE_CCT_2012|TARIC),
             mfn_verified_taric bool, staging_category fk, quota_required bool, quota_note,
             condition_note, + cột chung)

product_specific_rules(id, hs_code_id fk, rule_type enum, rule_text_en, rule_text_vi,
             params jsonb, insufficient_operations_vi, tolerance_note_vi, risk_note_vi,
             requires_expert bool, requires_expert_reason, + cột chung)

roo_questions(id, hs_code_id fk, order int, text_vi, text_en null)

evidence_types(code pk, layer enum(TARIFF|ORIGIN_RECORD|MARKET_ACCESS|PLATFORM_BADGE),
             scope enum(SHIPMENT|COMPANY), name_vi, name_en null, issuer_vi,
             validity_months null, retention_years null, blocks enum(TARIFF_PREFERENCE|IMPORT|NONE),
             legal_basis, legal_status enum(VERIFIED|TO_VERIFY|PLATFORM_RULE), + cột chung)

evidence_requirements(id, hs_code_id fk, evidence_type fk, condition enum, + cột chung,
             unique(hs_code_id, evidence_type, condition))
```

`params` theo `rule_type` phải được kiểm bằng Pydantic model riêng cho từng loại (discriminated union). Seed sai schema → bộ nạp dừng, không nạp một phần.

## 5. Logic lõi

Đặt trong `app/compliance/`, thuần Python, không gọi DB, không phụ thuộc FastAPI. Đầu vào là dataclass, đầu ra là dataclass có `status`, `reasons[]` (mã lý do + diễn giải vi/en), `inputs_missing[]`.

### 5.1 Thuế EVFTA tại một ngày

`evfta_rate(base_rate, category, on_date) -> Decimal`

- Bậc 1 có hiệu lực 01/08/2020; mỗi ngày 01/01 sau đó tăng một bậc.
- `rate = base_rate × (stages − k) / stages`, với `k` = số bậc đã qua (tối thiểu 1, tối đa `stages`). Làm tròn 4 chữ số thập phân, `ROUND_HALF_UP`.
- `savings = value × (mfn_rate − evfta_rate)`, làm tròn 2 chữ số.
- `quota_required = true` hoặc `duty_type != AD_VALOREM` → trả `INCONCLUSIVE` với lý do `NEEDS_MANUAL_CHECK`, không trả số.

Kiểm thử: với năm 2026, cả 20 mã có thuế EVFTA = 0, và tiết kiệm trên lô 100.000 EUR phải khớp `golden_saving_eur_on_100000` trong seed. Thêm test cho B7 năm 2026 (bậc 7/8) dù chưa có mã B7 trong seed.

### 5.2 Đánh giá xuất xứ

`evaluate_origin(rule, answers) -> OriginResult`

Kiểm tra chung, chạy trước mọi loại quy tắc:

| Điều kiện | Kết quả |
|---|---|
| Thiếu câu trả lời bắt buộc | `INCONCLUSIVE` + `inputs_missing` |
| Hàng quá cảnh nước thứ ba và bị gia công ngoài thao tác bảo quản, dán nhãn (Điều 13) | `FAIL` |
| Hàng quá cảnh, chỉ lưu kho/chia lô dưới giám sát hải quan | tiếp tục; thêm `TRANSPORT_DOC` vào checklist |
| Mọi thao tác tại VN trên nguyên liệu nhập chỉ là thao tác Điều 6 | `FAIL`, lý do `INSUFFICIENT_OPERATION` |

Theo `rule_type`:

| `rule_type` | Đạt khi | Ghi chú |
|---|---|---|
| `WO_PRODUCT` | Nuôi tại VN từ trứng/giống/ấu trùng, hoặc đánh bắt trong lãnh hải VN | Giống nhập khẩu vẫn đạt (Điều 4.1(g)). Không có dung sai |
| `WO_PRODUCT_VESSEL` | Như trên, hoặc tàu đáp ứng cả 3: đăng ký VN/EU, mang cờ VN/EU, sở hữu ≥ `vessel_min_ownership_pct` | Thiếu 1 điều kiện tàu → `FAIL` |
| `WO_MATERIALS` | Mọi nguyên liệu Chương 3 đều thuần túy | Có nguyên liệu Chương 3 nhập: 0% → xét tiếp; >0% → `INCONCLUSIVE` (`requires_expert`) cho tới khi luật sư chốt dung sai |
| `WO_MATERIALS_VESSEL` | `WO_MATERIALS` + điều kiện tàu nếu nguyên liệu đánh bắt ngoài lãnh hải | Như trên |
| `WO_MATERIALS_TOLERANCE` | Nguyên liệu Chương 7 không thuần túy ≤ `tolerance_pct` | Mặc định thận trọng: phải ≤ 10% **cả** theo trọng lượng **và** theo giá xuất xưởng. Nếu chỉ có một con số → `INCONCLUSIVE` |
| `WO_MATERIALS_SUGAR_CAP` | Quả/hạt Chương 8 thuần túy (dung sai như trên) **và** đường ≤ `sugar_max_pct_weight` | Đường > 20% → `FAIL` |

`requires_expert = true` trên quy tắc → kết quả cuối không bao giờ là `PASS`; tối đa là `INCONCLUSIVE` kèm lý do.

### 5.3 Danh sách bằng chứng cho một lô

`required_evidence(hs_code, shipment) -> list[EvidenceItem]`

`shipment` gồm: `consignment_value_eur`, `raw_material_source` (AQUACULTURE | WILD_CAUGHT | GROWN | null), `transit_third_country` bool, `is_fresh` bool. Ánh xạ điều kiện:

| `condition` | Lấy dòng khi |
|---|---|
| `ALWAYS` | luôn |
| `CONSIGNMENT_GT_6000` / `CONSIGNMENT_LE_6000` | so với 6.000 EUR (ngưỡng đọc từ cấu hình, không viết cứng) |
| `IF_WILD_CAUGHT` / `IF_AQUACULTURE` | theo `raw_material_source`; null → trả cả hai, đánh dấu `needs_input` |
| `IF_TRANSIT_THIRD_COUNTRY` | `transit_third_country = true` |
| `IF_FRESH_AND_NOT_PHYTO_EXEMPT` | `is_fresh = true` |
| `IF_LISTED_2019_1793`, `IF_NOT_PHYTO_EXEMPT` | **chưa có dữ liệu danh mục** → luôn trả về với `status = "CHECK_REQUIRED"` và link nguồn; không tự kết luận là không cần |

Mỗi `EvidenceItem` trả về: mã, tên, lớp, phạm vi, `blocks`, `legal_status`, và `review_state` của chính dòng đó. Danh sách có ít nhất một dòng `UNREVIEWED` → kèm lưu ý mục 2a ở đầu danh sách. Sắp theo `blocks`: `IMPORT` → `TARIFF_PREFERENCE` → `NONE`.

### 5.4 Huy hiệu "EVFTA-verified" (C6)

Một công ty có huy hiệu cho nhóm hàng X khi: `verification_status = verified` **và** có bằng chứng loại `EUR1_ISSUED_12M` cho X, đã duyệt, còn hạn, **và** mọi bằng chứng `scope = COMPANY, blocks = IMPORT` của X đã duyệt và còn hạn. Job hằng ngày tự hạ mức khi hết hạn và ghi `audit_logs`.

Văn bản hiển thị của huy hiệu: "Đã được cấp C/O EUR.1 cho nhóm hàng này trong 12 tháng gần nhất". **Không** dùng câu "hàng đạt xuất xứ EVFTA", vì EUR.1 chỉ chứng minh cho lô đã cấp.

## 6. Bộ nạp seed và cổng duyệt

### 6.1 Lệnh nạp

`uv run python -m app.compliance.seed load seed/ --data-version 2026-10-r1`

- Idempotent: chạy lại cùng `data-version` không tạo dòng mới.
- Một transaction cho toàn bộ; lỗi ở bất kỳ file nào → rollback.
- Không bao giờ ghi đè dòng đã có `reviewed_by`. Dữ liệu mới cho dòng đã duyệt → tạo phiên bản mới (`valid_from` mới), dòng cũ đặt `valid_until`.
- In báo cáo: số dòng thêm/bỏ qua/đổi, số dòng chưa duyệt theo bảng.

### 6.2 `is_calculator_supported` và `review_state`

- `is_calculator_supported = true` khi mã có `tariff_line` và `product_specific_rule` còn hiệu lực, **không phụ thuộc** trạng thái duyệt.
- `review_state` của một kết quả = `REVIEWED` chỉ khi mọi thành phần được dùng đều đã duyệt: dòng thuế, quy tắc xuất xứ, `cn_mapping_verified = true`, `mfn_verified_taric = true`, và mọi dòng bằng chứng được trả về. Thiếu một trong số đó → `UNREVIEWED`.
- Response kèm `unreviewed_components[]` (ví dụ `["tariff_line", "mfn_taric", "cn_mapping"]`) để admin và log biết thiếu gì. UI người dùng chỉ hiện dòng lưu ý, không liệt kê kỹ thuật.
- `compliance_checks` ghi thêm cột `review_state` và `unreviewed_components` cho mỗi lần tính.
- Tính lại sau mỗi lần nạp hoặc duyệt. Không cho sửa tay.

### 6.3 Nhập kết quả duyệt của luật sư

`uv run python -m app.compliance.seed import-review evidence_matrix_review.xlsx --reviewer-email <email>`

- Đọc sheet `Ma tran bang chung`: `DONG_Y` → đặt `reviewed_by`, `reviewed_at`; `SUA` → không duyệt, ghi ghi chú vào hàng đợi admin; `BO` → đặt `valid_until = today`.
- Người duyệt phải là user có vai trò `legal_reviewer` (thêm vai trò này vào RBAC).
- Mỗi dòng đổi trạng thái ghi `audit_logs` với before/after.
- Cùng cơ chế cho `tariff_lines` và `product_specific_rules` (màn hình admin ở backlog C1 dùng chung service này).

## 7. API

| Method | Path | Auth | Trả về |
|---|---|---|---|
| GET | `/api/public/hs-codes?q=` | không | Gợi ý mã (dùng chung B4), kèm `is_calculator_supported` |
| POST | `/api/public/tariff` | không | `{mfn_rate, evfta_rate, savings, annual_projection, status, reasons, review_state, unreviewed_components, disclaimer}` |
| GET | `/api/public/hs-codes/{cn}/origin-questions` | không | Câu hỏi + kiểu trả lời theo `rule_type` |
| POST | `/api/public/origin` | không | `OriginResult` + `required_evidence` cho lô |
| GET | `/api/companies/{id}/evidence-checklist?hs=` | có | Checklist cấp công ty, trạng thái từng bằng chứng, huy hiệu |

Endpoint công khai chịu giới hạn tần suất của J1. Mã ngoài 20 mã (không có dòng thuế hoặc quy tắc) → `200` với `status = "NOT_SUPPORTED"`, không trả số. `disclaimer` là chuỗi đã dịch theo `Accept-Language`, hoặc `null` khi `REVIEWED`.

## 8. Kiểm thử bắt buộc (pytest, chạy trong CI)

Thuế:
1. 20 mã, năm 2026, lô 100.000 EUR → tiết kiệm khớp `golden_saving_eur_on_100000`.
2. Bậc lộ trình: B3 ngày 31/12/2022 = 1/4 thuế cơ sở; ngày 01/01/2023 = 0.

Xuất xứ (mỗi ca là một test có tên):

| Mã | Tình huống | Kỳ vọng |
|---|---|---|
| 03061792 | Tôm nuôi tại VN từ tôm giống nhập | PASS |
| 03061792 | Tôm nguyên liệu nhập, chỉ sơ chế, đông lạnh | FAIL (`NOT_WHOLLY_OBTAINED`) |
| 03034290 | Tàu cờ VN, đăng ký VN, sở hữu VN 60% | PASS |
| 03034290 | Tàu cờ VN, sở hữu VN 40% | FAIL |
| 03048700 | Có 5% cá ngừ nhập | INCONCLUSIVE (`requires_expert`) |
| 07123200 | Nguyên liệu Chương 7 nhập 8% trọng lượng, 8% giá | PASS |
| 07123200 | Nhập 8% trọng lượng, 12% giá | FAIL |
| 07123200 | Chỉ khai 8% trọng lượng | INCONCLUSIVE |
| 07123200 | Nấm khô nhập từ Trung Quốc, đóng gói lại | FAIL (`INSUFFICIENT_OPERATION`) |
| 08119085 | Quả VN, thêm đường 25% | FAIL |
| 08013200 | Điều nhân từ điều thô nhập | FAIL; tiết kiệm = 0 |
| bất kỳ | Quá cảnh Singapore, chỉ lưu kho dưới giám sát hải quan | Kết quả theo quy tắc + có `TRANSPORT_DOC` |
| bất kỳ | Thiếu câu trả lời | INCONCLUSIVE + `inputs_missing` |

Bằng chứng:
1. 03034290, lô 50.000 EUR → có `EUR1`, `VESSEL_DOCS`, `IUU_CATCH_CERT`; không có `ORIGIN_DECLARATION`.
2. 03061792, lô 5.000 EUR → có `ORIGIN_DECLARATION`, `FARM_RECORD`; không có `EUR1`, không có `IUU_CATCH_CERT`.
3. 03077100, chưa khai nguồn → trả cả `FARM_RECORD` và `IUU_CATCH_CERT`, đánh dấu `needs_input`.
4. 07096099 → `OFFICIAL_CERT_2019_1793` có `status = CHECK_REQUIRED`.

Trạng thái duyệt và lưu ý:
1. Prod, dữ liệu chưa duyệt → cả 20 mã vẫn trả số; `review_state = UNREVIEWED`; `disclaimer` khác `null`, đúng chuỗi vi/en theo `Accept-Language`.
2. Duyệt dòng thuế và quy tắc nhưng `mfn_verified_taric = false` → vẫn `UNREVIEWED`, `unreviewed_components = ["mfn_taric", ...]`.
3. Mọi thành phần đã duyệt → `REVIEWED`, `disclaimer = null`.
4. Test FE (Playwright): trang máy tính thuế với dữ liệu chưa duyệt hiển thị dòng lưu ý ngay dưới con số tiết kiệm, nhìn thấy được không cần thao tác.
5. Nạp lại seed không ghi đè dòng đã duyệt.

## 9. Xong khi

- Migration, seed loader, `import-review` chạy được trên staging; CI xanh với toàn bộ test mục 8; mypy strict sạch.
- Nạp seed `2026-10-r1` báo đúng: 20 mã, 20 dòng thuế, 20 quy tắc, 16 loại bằng chứng, 199 dòng yêu cầu, tất cả chưa duyệt; cả 20 mã có `is_calculator_supported = true`.
- Sau khi nhập file duyệt mẫu (tạo trong test), các mã đã duyệt đủ thành phần chuyển `review_state = REVIEWED` và không còn dòng lưu ý.

## 10. Không làm trong spec này

Giao diện máy tính (C2, C4 phần FE), sinh PDF EUR.1 (C5), màn hình admin đầy đủ (C1), tải lên file bằng chứng (C6 phần upload). Chỉ cung cấp service và API mà các hạng mục đó sẽ gọi.

## 11. Câu hỏi mở cho luật sư (không tự quyết; để `TODO(legal)` trong code và test)

1. Dung sai 10% cho phi lê 0304: Điều 5.3(a) hay (b)? Áp dụng không? (đang trả `INCONCLUSIVE`)
2. Dung sai Chương 7, 8 tính theo trọng lượng **hay** giá xuất xưởng, hay doanh nghiệp được chọn? (đang yêu cầu cả hai)
3. Ghi chú 4.1 Phụ lục I có áp dụng cho nấm trồng từ meo giống nhập không?
4. Việt Nam có được xuất nhuyễn thể hai mảnh vỏ sống (0307 71) vào EU không? Nếu không, bỏ mã khỏi danh mục.
5. Danh mục miễn chứng nhận kiểm dịch thực vật áp dụng cho dứa, sầu riêng ở mã nào.
6. Mã nào trong 20 mã đang thuộc phụ lục QĐ 2019/1793 với xuất xứ Việt Nam (đặc biệt ớt, đậu bắp, thanh long).
7. MFN hiện hành trên TARIC và mã CN 2026 tương ứng cho từng mã.

## 12. Thứ tự PR đề xuất

1. Model + migration + Pydantic schema cho `params` + seed loader (kèm test nạp).
2. `evfta_rate` + `/api/public/tariff` + test thuế.
3. `evaluate_origin` + câu hỏi + `/api/public/origin` + test xuất xứ.
4. `required_evidence` + checklist công ty + huy hiệu + job hạ mức.
5. `import-review` + vai trò `legal_reviewer` + audit.

Mỗi PR nhỏ, có test, không gộp.
