// File sinh tự động bởi scripts/generate-api.mjs — không sửa tay.
export interface paths {
    "/api/auth/register": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Register */
        post: operations["register_api_auth_register_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Login */
        post: operations["login_api_auth_login_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Logout */
        post: operations["logout_api_auth_logout_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Me */
        get: operations["me_api_me_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Patch Me */
        patch: operations["patch_me_api_me_patch"];
        trace?: never;
    };
    "/api/me/company": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get My Company */
        get: operations["get_my_company_api_me_company_get"];
        put?: never;
        /** Create My Company */
        post: operations["create_my_company_api_me_company_post"];
        delete?: never;
        options?: never;
        head?: never;
        /** Update My Company */
        patch: operations["update_my_company_api_me_company_patch"];
        trace?: never;
    };
    "/api/me/company/completeness": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get My Completeness */
        get: operations["get_my_completeness_api_me_company_completeness_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/uploads/presign": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Presign Upload */
        post: operations["presign_upload_api_uploads_presign_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/exporter/products": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Products */
        get: operations["list_products_api_exporter_products_get"];
        put?: never;
        /** Create Product */
        post: operations["create_product_api_exporter_products_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/exporter/products/{product_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Product */
        get: operations["get_product_api_exporter_products__product_id__get"];
        put?: never;
        post?: never;
        /** Delete Product */
        delete: operations["delete_product_api_exporter_products__product_id__delete"];
        options?: never;
        head?: never;
        /** Update Product */
        patch: operations["update_product_api_exporter_products__product_id__patch"];
        trace?: never;
    };
    "/api/public/companies/{slug}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Public Company */
        get: operations["public_company_api_public_companies__slug__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/public/hs-codes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Search Hs Codes */
        get: operations["search_hs_codes_api_public_hs_codes_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/compliance-checks.csv": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Export Compliance Checks */
        get: operations["export_compliance_checks_api_admin_compliance_checks_csv_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/public/tariff": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Calculate Tariff */
        post: operations["calculate_tariff_api_public_tariff_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Health */
        get: operations["health_health_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /** CompanyIn */
        CompanyIn: {
            /** Registration Number */
            registration_number?: string | null;
            /** Tax Id */
            tax_id?: string | null;
            /** Business Type */
            business_type?: string | null;
            /** Industry Sector */
            industry_sector?: ("agriculture" | "seafood" | "food_beverage" | "textiles" | "handicrafts" | "spices") | null;
            /** Founded Year */
            founded_year?: number | null;
            /** Address */
            address?: string | null;
            /** Website */
            website?: string | null;
            /** Contact Email */
            contact_email?: string | null;
            /** Description Vi */
            description_vi?: string | null;
            /** Description En */
            description_en?: string | null;
            /** Company Size */
            company_size?: ("1_10" | "11_50" | "51_200" | "201_500" | "gt_500") | null;
            /** Procurement Estimate */
            procurement_estimate?: ("lt_100k" | "100k_500k" | "500k_2m" | "2m_10m" | "gt_10m") | null;
            /** Vat Number */
            vat_number?: string | null;
            /** Eori Number */
            eori_number?: string | null;
            /** Legal Name */
            legal_name: string;
            /**
             * Country
             * @default VN
             */
            country?: string;
            /** Export Markets */
            export_markets?: string[];
            /** Languages Spoken */
            languages_spoken?: string[];
            /** Sourcing Categories */
            sourcing_categories?: ("agriculture" | "seafood" | "food_beverage" | "textiles" | "handicrafts" | "spices")[];
        };
        /** CompanyOut */
        CompanyOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Slug */
            slug: string;
            /**
             * Type
             * @enum {string}
             */
            type: "exporter" | "buyer";
            /** Legal Name */
            legal_name: string;
            /** Registration Number */
            registration_number: string | null;
            /** Tax Id */
            tax_id: string | null;
            /** Business Type */
            business_type: string | null;
            /** Country */
            country: string;
            /** Industry Sector */
            industry_sector: string | null;
            /** Founded Year */
            founded_year: number | null;
            /** Address */
            address: string | null;
            /** Website */
            website: string | null;
            /** Contact Email */
            contact_email: string | null;
            /** Description Vi */
            description_vi: string | null;
            /** Description En */
            description_en: string | null;
            /** Logo Key */
            logo_key: string | null;
            /** Export Markets */
            export_markets: string[];
            /** Languages Spoken */
            languages_spoken: string[];
            /** Company Size */
            company_size: string | null;
            /** Procurement Estimate */
            procurement_estimate: string | null;
            /** Vat Number */
            vat_number: string | null;
            /** Eori Number */
            eori_number: string | null;
            /** Sourcing Categories */
            sourcing_categories: string[];
            /**
             * Verification Status
             * @enum {string}
             */
            verification_status: "unverified" | "pending" | "verified" | "rejected";
            /**
             * Verification Level
             * @enum {string}
             */
            verification_level: "basic" | "evfta_verified";
            /** Verified At */
            verified_at: string | null;
            /** Expires At */
            expires_at: string | null;
            /** Profile Completeness Score */
            profile_completeness_score: string;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
        };
        /**
         * CompanyPatch
         * @description Chỉ các trường gửi lên mới được sửa; danh sách gửi lên thay thế danh sách cũ.
         */
        CompanyPatch: {
            /** Registration Number */
            registration_number?: string | null;
            /** Tax Id */
            tax_id?: string | null;
            /** Business Type */
            business_type?: string | null;
            /** Industry Sector */
            industry_sector?: ("agriculture" | "seafood" | "food_beverage" | "textiles" | "handicrafts" | "spices") | null;
            /** Founded Year */
            founded_year?: number | null;
            /** Address */
            address?: string | null;
            /** Website */
            website?: string | null;
            /** Contact Email */
            contact_email?: string | null;
            /** Description Vi */
            description_vi?: string | null;
            /** Description En */
            description_en?: string | null;
            /** Company Size */
            company_size?: ("1_10" | "11_50" | "51_200" | "201_500" | "gt_500") | null;
            /** Procurement Estimate */
            procurement_estimate?: ("lt_100k" | "100k_500k" | "500k_2m" | "2m_10m" | "gt_10m") | null;
            /** Vat Number */
            vat_number?: string | null;
            /** Eori Number */
            eori_number?: string | null;
            /** Legal Name */
            legal_name?: string | null;
            /** Country */
            country?: string | null;
            /** Export Markets */
            export_markets?: string[] | null;
            /** Languages Spoken */
            languages_spoken?: string[] | null;
            /** Sourcing Categories */
            sourcing_categories?: ("agriculture" | "seafood" | "food_beverage" | "textiles" | "handicrafts" | "spices")[] | null;
            /** Logo Key */
            logo_key?: string | null;
        };
        /**
         * CompletenessOut
         * @description Chỉ điểm và danh sách còn thiếu — cố ý KHÔNG chứa trạng thái xác minh (khái niệm khác).
         */
        CompletenessOut: {
            /** Score */
            score: string;
            /** Missing */
            missing: components["schemas"]["MissingOut"][];
        };
        /** CurrentUser */
        CurrentUser: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Email */
            email: string;
            /**
             * Role
             * @enum {string}
             */
            role: "exporter" | "buyer" | "admin";
            /**
             * Preferred Language
             * @enum {string}
             */
            preferred_language: "vi" | "en";
        };
        /** HTTPValidationError */
        HTTPValidationError: {
            /** Detail */
            detail?: components["schemas"]["ValidationError"][];
        };
        /** HsCodeOut */
        HsCodeOut: {
            /** Code */
            code: string;
            /** Formatted */
            formatted: string;
            /** Name Vi */
            name_vi: string;
            /** Name En */
            name_en: string;
            /** Chapter */
            chapter: string;
            /** Category */
            category: string | null;
            /** Supported */
            supported: boolean;
        };
        /** LoginIn */
        LoginIn: {
            /**
             * Email
             * Format: email
             */
            email: string;
            /** Password */
            password: string;
        };
        /** MePatch */
        MePatch: {
            /** Preferred Language */
            preferred_language?: ("vi" | "en") | null;
            /** Phone */
            phone?: string | null;
        };
        /** MissingOut */
        MissingOut: {
            /** Field */
            field: string;
            /** Group */
            group: string;
            /** Weight */
            weight: string;
        };
        /** PresignIn */
        PresignIn: {
            /**
             * Purpose
             * @enum {string}
             */
            purpose: "logo" | "product_image";
            /**
             * Content Type
             * @enum {string}
             */
            content_type: "image/png" | "image/jpeg" | "image/webp";
        };
        /** PresignOut */
        PresignOut: {
            /** Upload Url */
            upload_url: string;
            /** Key */
            key: string;
        };
        /** ProductImageOut */
        ProductImageOut: {
            /** Key */
            key: string;
            /** Url */
            url: string;
        };
        /** ProductIn */
        ProductIn: {
            /** Name */
            name: string;
            /** Hs Code */
            hs_code: string;
            /** Description Vi */
            description_vi?: string | null;
            /** Description En */
            description_en?: string | null;
            /** Price Min */
            price_min?: number | string | null;
            /** Price Max */
            price_max?: number | string | null;
            /**
             * Currency
             * @default USD
             * @enum {string}
             */
            currency?: "USD" | "EUR" | "VND";
            /** Unit */
            unit?: ("kg" | "tonne" | "piece" | "carton" | "liter" | "container_20ft" | "container_40ft") | null;
            /** Moq */
            moq?: number | string | null;
            /** Moq Unit */
            moq_unit?: ("kg" | "tonne" | "piece" | "carton" | "liter" | "container_20ft" | "container_40ft") | null;
            /**
             * Is Active
             * @default true
             */
            is_active?: boolean;
            /** Image Keys */
            image_keys?: string[];
        };
        /** ProductOut */
        ProductOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Name */
            name: string;
            /** Hs Code */
            hs_code: string;
            /** Hs Formatted */
            hs_formatted: string;
            /** Hs Name Vi */
            hs_name_vi: string;
            /** Hs Name En */
            hs_name_en: string;
            /** Description Vi */
            description_vi: string | null;
            /** Description En */
            description_en: string | null;
            /** Price Min */
            price_min: string | null;
            /** Price Max */
            price_max: string | null;
            /** Currency */
            currency: string;
            /** Unit */
            unit: string | null;
            /** Moq */
            moq: string | null;
            /** Moq Unit */
            moq_unit: string | null;
            /** Is Active */
            is_active: boolean;
            /**
             * Approval Status
             * @enum {string}
             */
            approval_status: "pending" | "approved" | "hidden";
            /** Images */
            images: components["schemas"]["ProductImageOut"][];
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /**
         * ProductPatch
         * @description Chỉ các trường gửi lên mới được sửa; image_keys gửi lên thay thế toàn bộ ảnh.
         */
        ProductPatch: {
            /** Name */
            name?: string | null;
            /** Hs Code */
            hs_code?: string | null;
            /** Description Vi */
            description_vi?: string | null;
            /** Description En */
            description_en?: string | null;
            /** Price Min */
            price_min?: number | string | null;
            /** Price Max */
            price_max?: number | string | null;
            /** Currency */
            currency?: ("USD" | "EUR" | "VND") | null;
            /** Unit */
            unit?: ("kg" | "tonne" | "piece" | "carton" | "liter" | "container_20ft" | "container_40ft") | null;
            /** Moq */
            moq?: number | string | null;
            /** Moq Unit */
            moq_unit?: ("kg" | "tonne" | "piece" | "carton" | "liter" | "container_20ft" | "container_40ft") | null;
            /** Is Active */
            is_active?: boolean | null;
            /** Image Keys */
            image_keys?: string[] | null;
        };
        /**
         * PublicCompanyOut
         * @description Hồ sơ công khai của exporter đã xác minh. Không có email liên hệ, mã số thuế,
         *     số đăng ký kinh doanh hay địa chỉ chi tiết.
         */
        PublicCompanyOut: {
            /** Slug */
            slug: string;
            /** Legal Name */
            legal_name: string;
            /** Country */
            country: string;
            /** Industry Sector */
            industry_sector: string | null;
            /** Founded Year */
            founded_year: number | null;
            /** Website */
            website: string | null;
            /** Description Vi */
            description_vi: string | null;
            /** Description En */
            description_en: string | null;
            /** Logo Url */
            logo_url: string | null;
            /** Export Markets */
            export_markets: string[];
            /** Languages Spoken */
            languages_spoken: string[];
            /**
             * Verification Level
             * @enum {string}
             */
            verification_level: "basic" | "evfta_verified";
            /** Verified At */
            verified_at: string | null;
            /** Products */
            products: components["schemas"]["PublicProductOut"][];
        };
        /**
         * PublicProductOut
         * @description Sản phẩm trên hồ sơ công khai — không lộ id nội bộ, trạng thái duyệt hay khóa ảnh.
         */
        PublicProductOut: {
            /** Name */
            name: string;
            /** Hs Code */
            hs_code: string;
            /** Hs Formatted */
            hs_formatted: string;
            /** Hs Name Vi */
            hs_name_vi: string;
            /** Hs Name En */
            hs_name_en: string;
            /** Description Vi */
            description_vi: string | null;
            /** Description En */
            description_en: string | null;
            /** Price Min */
            price_min: string | null;
            /** Price Max */
            price_max: string | null;
            /** Currency */
            currency: string;
            /** Unit */
            unit: string | null;
            /** Moq */
            moq: string | null;
            /** Moq Unit */
            moq_unit: string | null;
            /** Images */
            images: string[];
        };
        /** RegisterIn */
        RegisterIn: {
            /**
             * Email
             * Format: email
             */
            email: string;
            /** Password */
            password: string;
            /**
             * Role
             * @enum {string}
             */
            role: "exporter" | "buyer";
            /** Phone */
            phone?: string | null;
            /**
             * Preferred Language
             * @default vi
             * @enum {string}
             */
            preferred_language?: "vi" | "en";
            /**
             * Accept Terms
             * @constant
             */
            accept_terms: true;
        };
        /**
         * TariffIn
         * @description Số tiền nhận dạng CHUỖI JSON (không nhận số) để không bao giờ đi qua float.
         */
        TariffIn: {
            /** Hs Code */
            hs_code: string;
            /** Destination */
            destination: string;
            /** Product Value */
            product_value: number | string;
            /** Shipments Per Year */
            shipments_per_year?: number | null;
        };
        /** TariffOut */
        TariffOut: {
            /** Check Id */
            check_id: string;
            /**
             * Status
             * @enum {string}
             */
            status: "ok" | "unsupported" | "needs_review";
            /** Hs Code */
            hs_code: string;
            /** Hs Formatted */
            hs_formatted: string;
            /** Destination */
            destination: string;
            /** Product Value */
            product_value: string;
            /** Mfn Rate */
            mfn_rate: string | null;
            /** Evfta Rate */
            evfta_rate: string | null;
            /** Mfn Duty */
            mfn_duty: string | null;
            /** Evfta Duty */
            evfta_duty: string | null;
            /** Savings */
            savings: string | null;
            /** Annual Savings */
            annual_savings: string | null;
            /** Quota Note */
            quota_note: string | null;
            /** Condition Note */
            condition_note: string | null;
        };
        /** ValidationError */
        ValidationError: {
            /** Location */
            loc: (string | number)[];
            /** Message */
            msg: string;
            /** Error Type */
            type: string;
            /** Input */
            input?: unknown;
            /** Context */
            ctx?: Record<string, never>;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    register_api_auth_register_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RegisterIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: string;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    login_api_auth_login_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LoginIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: string;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    logout_api_auth_logout_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    me_api_me_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CurrentUser"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    patch_me_api_me_patch: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MePatch"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CurrentUser"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_my_company_api_me_company_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CompanyOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    create_my_company_api_me_company_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CompanyIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CompanyOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    update_my_company_api_me_company_patch: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CompanyPatch"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CompanyOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_my_completeness_api_me_company_completeness_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CompletenessOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    presign_upload_api_uploads_presign_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PresignIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PresignOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_products_api_exporter_products_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProductOut"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    create_product_api_exporter_products_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProductIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProductOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_product_api_exporter_products__product_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                product_id: string;
            };
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProductOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    delete_product_api_exporter_products__product_id__delete: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                product_id: string;
            };
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    update_product_api_exporter_products__product_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                product_id: string;
            };
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProductPatch"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProductOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    public_company_api_public_companies__slug__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublicCompanyOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    search_hs_codes_api_public_hs_codes_get: {
        parameters: {
            query?: {
                q?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HsCodeOut"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    export_compliance_checks_api_admin_compliance_checks_csv_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    calculate_tariff_api_public_tariff_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TariffIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TariffOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    health_health_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
        };
    };
}
