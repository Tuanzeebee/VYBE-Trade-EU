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
    "/api/me/delete": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Delete Me */
        post: operations["delete_me_api_me_delete_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/companies": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Companies */
        get: operations["list_companies_api_admin_companies_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/companies/{company_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update Company */
        patch: operations["update_company_api_admin_companies__company_id__patch"];
        trace?: never;
    };
    "/api/admin/products": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Products */
        get: operations["list_products_api_admin_products_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/products/{product_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update Product */
        patch: operations["update_product_api_admin_products__product_id__patch"];
        trace?: never;
    };
    "/api/admin/audit-logs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Audit Logs */
        get: operations["audit_logs_api_admin_audit_logs_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/stats": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Stats */
        get: operations["stats_api_admin_stats_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/public/billing-items": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Billing Items */
        get: operations["list_billing_items_api_public_billing_items_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/me/orders": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List My Orders */
        get: operations["list_my_orders_api_me_orders_get"];
        put?: never;
        /** Create Order */
        post: operations["create_order_api_me_orders_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/me/orders/{order_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get My Order */
        get: operations["get_my_order_api_me_orders__order_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/me/orders/{order_id}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Cancel My Order */
        post: operations["cancel_my_order_api_me_orders__order_id__cancel_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/me/entitlements": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** My Entitlements */
        get: operations["my_entitlements_api_me_entitlements_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/orders": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Admin List Orders */
        get: operations["admin_list_orders_api_admin_orders_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/orders/{order_id}/confirm-payment": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Confirm Payment */
        post: operations["confirm_payment_api_admin_orders__order_id__confirm_payment_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/orders/{order_id}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Admin Cancel Order */
        post: operations["admin_cancel_order_api_admin_orders__order_id__cancel_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/billing-items": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Admin List Items */
        get: operations["admin_list_items_api_admin_billing_items_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/billing-items/{code}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Admin Update Item */
        patch: operations["admin_update_item_api_admin_billing_items__code__patch"];
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
    "/api/buyer/sourcing-needs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Sourcing Needs */
        get: operations["get_sourcing_needs_api_buyer_sourcing_needs_get"];
        /** Put Sourcing Needs */
        put: operations["put_sourcing_needs_api_buyer_sourcing_needs_put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/exporter/services": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Services */
        get: operations["list_services_api_exporter_services_get"];
        put?: never;
        /** Create Service */
        post: operations["create_service_api_exporter_services_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/exporter/services/{service_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Delete Service */
        delete: operations["delete_service_api_exporter_services__service_id__delete"];
        options?: never;
        head?: never;
        /** Update Service */
        patch: operations["update_service_api_exporter_services__service_id__patch"];
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
    "/api/public/industries": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Industries */
        get: operations["industries_api_public_industries_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/public/service-categories": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Service Categories */
        get: operations["service_categories_api_public_service_categories_get"];
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
    "/api/public/tariff/options": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Tariff Options */
        get: operations["tariff_options_api_public_tariff_options_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/public/sector-alerts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Sector Alerts */
        get: operations["sector_alerts_api_public_sector_alerts_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/public/shipping-hints": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Shipping Hints */
        get: operations["shipping_hints_api_public_shipping_hints_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/exporter/tariff-preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Tariff Preview */
        get: operations["tariff_preview_api_exporter_tariff_preview_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/public/roo": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Calculate Roo */
        post: operations["calculate_roo_api_public_roo_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/public/hs-codes/{cn}/origin-questions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Origin Questions */
        get: operations["origin_questions_api_public_hs_codes__cn__origin_questions_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/public/origin": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Calculate Origin */
        post: operations["calculate_origin_api_public_origin_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/exporter/evidence-requirements": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Exporter Evidence Requirements */
        get: operations["exporter_evidence_requirements_api_exporter_evidence_requirements_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/companies/{company_id}/evidence-checklist": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Evidence Checklist */
        get: operations["evidence_checklist_api_companies__company_id__evidence_checklist_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/public/markets": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Rank Markets */
        post: operations["rank_markets_api_public_markets_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/tariff-lines/template.xlsx": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Tariff Lines Template */
        get: operations["tariff_lines_template_api_admin_tariff_lines_template_xlsx_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/tariff-lines/export.xlsx": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Tariff Lines Export */
        get: operations["tariff_lines_export_api_admin_tariff_lines_export_xlsx_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/tariff-lines/import": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Tariff Lines Import */
        post: operations["tariff_lines_import_api_admin_tariff_lines_import_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/roo-rules/template.xlsx": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Roo Rules Template */
        get: operations["roo_rules_template_api_admin_roo_rules_template_xlsx_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/roo-rules/export.xlsx": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Roo Rules Export */
        get: operations["roo_rules_export_api_admin_roo_rules_export_xlsx_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/roo-rules/import": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Roo Rules Import */
        post: operations["roo_rules_import_api_admin_roo_rules_import_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/tariff-lines": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Tariff Lines */
        get: operations["list_tariff_lines_api_admin_tariff_lines_get"];
        put?: never;
        /** Create Tariff Line */
        post: operations["create_tariff_line_api_admin_tariff_lines_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/tariff-lines/{line_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Delete Tariff Line */
        delete: operations["delete_tariff_line_api_admin_tariff_lines__line_id__delete"];
        options?: never;
        head?: never;
        /** Update Tariff Line */
        patch: operations["update_tariff_line_api_admin_tariff_lines__line_id__patch"];
        trace?: never;
    };
    "/api/admin/tariff-lines/{line_id}/review": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Review Tariff Line */
        post: operations["review_tariff_line_api_admin_tariff_lines__line_id__review_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/roo-rules": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Roo Rules */
        get: operations["list_roo_rules_api_admin_roo_rules_get"];
        put?: never;
        /** Create Roo Rule */
        post: operations["create_roo_rule_api_admin_roo_rules_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/roo-rules/{rule_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Delete Roo Rule */
        delete: operations["delete_roo_rule_api_admin_roo_rules__rule_id__delete"];
        options?: never;
        head?: never;
        /** Update Roo Rule */
        patch: operations["update_roo_rule_api_admin_roo_rules__rule_id__patch"];
        trace?: never;
    };
    "/api/admin/roo-rules/{rule_id}/review": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Review Roo Rule */
        post: operations["review_roo_rule_api_admin_roo_rules__rule_id__review_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/exporter/documents/eur1": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Request Eur1 */
        post: operations["request_eur1_api_exporter_documents_eur1_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/exporter/documents": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Documents */
        get: operations["list_documents_api_exporter_documents_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/exporter/documents/{document_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Document */
        get: operations["get_document_api_exporter_documents__document_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/trade-agreements": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Trade Agreements */
        get: operations["list_trade_agreements_api_admin_trade_agreements_get"];
        put?: never;
        /** Create Trade Agreement */
        post: operations["create_trade_agreement_api_admin_trade_agreements_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/trade-agreements/{agreement_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Delete Trade Agreement */
        delete: operations["delete_trade_agreement_api_admin_trade_agreements__agreement_id__delete"];
        options?: never;
        head?: never;
        /** Update Trade Agreement */
        patch: operations["update_trade_agreement_api_admin_trade_agreements__agreement_id__patch"];
        trace?: never;
    };
    "/api/admin/trade-agreements/{agreement_id}/review": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Review Trade Agreement */
        post: operations["review_trade_agreement_api_admin_trade_agreements__agreement_id__review_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/product-subtypes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Product Subtypes */
        get: operations["list_product_subtypes_api_admin_product_subtypes_get"];
        put?: never;
        /** Create Product Subtype */
        post: operations["create_product_subtype_api_admin_product_subtypes_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/product-subtypes/{subtype_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Delete Product Subtype */
        delete: operations["delete_product_subtype_api_admin_product_subtypes__subtype_id__delete"];
        options?: never;
        head?: never;
        /** Update Product Subtype */
        patch: operations["update_product_subtype_api_admin_product_subtypes__subtype_id__patch"];
        trace?: never;
    };
    "/api/admin/product-subtypes/{subtype_id}/review": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Review Product Subtype */
        post: operations["review_product_subtype_api_admin_product_subtypes__subtype_id__review_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/tariff-quotas": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Tariff Quotas */
        get: operations["list_tariff_quotas_api_admin_tariff_quotas_get"];
        put?: never;
        /** Create Tariff Quota */
        post: operations["create_tariff_quota_api_admin_tariff_quotas_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/tariff-quotas/{quota_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Delete Tariff Quota */
        delete: operations["delete_tariff_quota_api_admin_tariff_quotas__quota_id__delete"];
        options?: never;
        head?: never;
        /** Update Tariff Quota */
        patch: operations["update_tariff_quota_api_admin_tariff_quotas__quota_id__patch"];
        trace?: never;
    };
    "/api/admin/tariff-quotas/{quota_id}/review": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Review Tariff Quota */
        post: operations["review_tariff_quota_api_admin_tariff_quotas__quota_id__review_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/tariff-quotas/{quota_id}/balances": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Quota Balances */
        get: operations["list_quota_balances_api_admin_tariff_quotas__quota_id__balances_get"];
        put?: never;
        /** Add Quota Balance */
        post: operations["add_quota_balance_api_admin_tariff_quotas__quota_id__balances_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/sector-alerts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Sector Alerts */
        get: operations["list_sector_alerts_api_admin_sector_alerts_get"];
        put?: never;
        /** Create Sector Alert */
        post: operations["create_sector_alert_api_admin_sector_alerts_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/sector-alerts/{alert_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Delete Sector Alert */
        delete: operations["delete_sector_alert_api_admin_sector_alerts__alert_id__delete"];
        options?: never;
        head?: never;
        /** Update Sector Alert */
        patch: operations["update_sector_alert_api_admin_sector_alerts__alert_id__patch"];
        trace?: never;
    };
    "/api/admin/sector-alerts/{alert_id}/review": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Review Sector Alert */
        post: operations["review_sector_alert_api_admin_sector_alerts__alert_id__review_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/country-terms": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Country Terms */
        get: operations["list_country_terms_api_admin_country_terms_get"];
        put?: never;
        /** Create Country Term */
        post: operations["create_country_term_api_admin_country_terms_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/country-terms/{term_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Delete Country Term */
        delete: operations["delete_country_term_api_admin_country_terms__term_id__delete"];
        options?: never;
        head?: never;
        /** Update Country Term */
        patch: operations["update_country_term_api_admin_country_terms__term_id__patch"];
        trace?: never;
    };
    "/api/admin/country-terms/{term_id}/review": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Review Country Term */
        post: operations["review_country_term_api_admin_country_terms__term_id__review_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/compliance-review-issues": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Review Issues */
        get: operations["list_review_issues_api_admin_compliance_review_issues_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/compliance-review-issues/{issue_id}/resolve": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Resolve Review Issue */
        post: operations["resolve_review_issue_api_admin_compliance_review_issues__issue_id__resolve_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/public/copilot/ask": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Ask */
        post: operations["ask_api_public_copilot_ask_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/public/copilot/queries/{query_id}/feedback": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Feedback */
        post: operations["feedback_api_public_copilot_queries__query_id__feedback_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/public/copilot/queries/{query_id}/escalate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Escalate */
        post: operations["escalate_api_public_copilot_queries__query_id__escalate_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/ai-queries": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Ai Queries */
        get: operations["list_ai_queries_api_admin_ai_queries_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/ai-queries/weekly-sample": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Weekly Sample */
        get: operations["weekly_sample_api_admin_ai_queries_weekly_sample_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/corpus-documents": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Corpus Documents */
        get: operations["list_corpus_documents_api_admin_corpus_documents_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/corpus-documents/{document_id}/review": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Review Corpus Document */
        post: operations["review_corpus_document_api_admin_corpus_documents__document_id__review_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/public/companies/{slug}/view": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Record View */
        post: operations["record_view_api_public_companies__slug__view_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/exporter/profile-viewers": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Profile Viewers */
        get: operations["profile_viewers_api_exporter_profile_viewers_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/exporter/dashboard": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Exporter Dashboard */
        get: operations["exporter_dashboard_api_exporter_dashboard_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/buyer/dashboard": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Buyer Dashboard */
        get: operations["buyer_dashboard_api_buyer_dashboard_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/stats/return-visits": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Return Visits */
        get: operations["return_visits_api_admin_stats_return_visits_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/public/suppliers": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Search Suppliers */
        get: operations["search_suppliers_api_public_suppliers_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/public/suppliers/filters": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Supplier Filters */
        get: operations["supplier_filters_api_public_suppliers_filters_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/public/suppliers/{slug}/credentials": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Supplier Credentials */
        get: operations["supplier_credentials_api_public_suppliers__slug__credentials_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/me/notifications": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List My Notifications */
        get: operations["list_my_notifications_api_me_notifications_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/me/notifications/unread-count": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Unread Count */
        get: operations["unread_count_api_me_notifications_unread_count_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/me/notifications/read-all": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Read All */
        post: operations["read_all_api_me_notifications_read_all_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/me/notifications/{notification_id}/read": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Read One */
        post: operations["read_one_api_me_notifications__notification_id__read_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/buyer/rfqs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Create Rfq */
        post: operations["create_rfq_api_buyer_rfqs_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/buyer/rfq-quota": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Rfq Quota */
        get: operations["rfq_quota_api_buyer_rfq_quota_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/me/rfqs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List My Rfqs */
        get: operations["list_my_rfqs_api_me_rfqs_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/me/rfqs/{rfq_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Rfq */
        get: operations["get_rfq_api_me_rfqs__rfq_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/exporter/rfqs/{rfq_id}/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Set Rfq Status */
        patch: operations["set_rfq_status_api_exporter_rfqs__rfq_id__status_patch"];
        trace?: never;
    };
    "/api/exporter/rfqs/{rfq_id}/quotes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Create Quote */
        post: operations["create_quote_api_exporter_rfqs__rfq_id__quotes_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/me/rfqs/{rfq_id}/quotes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Quotes */
        get: operations["list_quotes_api_me_rfqs__rfq_id__quotes_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/buyer/quotes/{quote_id}/decision": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Decide Quote */
        post: operations["decide_quote_api_buyer_quotes__quote_id__decision_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/exporter/quotes/{quote_id}/withdraw": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Withdraw Quote */
        post: operations["withdraw_quote_api_exporter_quotes__quote_id__withdraw_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/me/conversations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List My Conversations */
        get: operations["list_my_conversations_api_me_conversations_get"];
        put?: never;
        /**
         * Start Direct Conversation
         * @description U7: nhắn tin trực tiếp tới nhà cung cấp (không cần RFQ); đã có hội thoại thì gửi tiếp.
         */
        post: operations["start_direct_conversation_api_me_conversations_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/me/conversations/{conversation_id}/messages": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Messages */
        get: operations["list_messages_api_me_conversations__conversation_id__messages_get"];
        put?: never;
        /** Send Message */
        post: operations["send_message_api_me_conversations__conversation_id__messages_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/trade-imports": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Trade Imports */
        get: operations["list_trade_imports_api_admin_trade_imports_get"];
        put?: never;
        /** Create Trade Import */
        post: operations["create_trade_import_api_admin_trade_imports_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/trade-imports/priority-products": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Priority Products */
        get: operations["priority_products_api_admin_trade_imports_priority_products_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/trade-imports/file": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Upload Trade File */
        post: operations["upload_trade_file_api_admin_trade_imports_file_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/public/markets/recommendation": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Market Recommendation */
        get: operations["market_recommendation_api_public_markets_recommendation_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/public/markets/price-reference": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Price Reference
         * @description U17: đơn giá nhập khẩu EU tham khảo cho form sản phẩm (không phải giá sàn).
         */
        get: operations["price_reference_api_public_markets_price_reference_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/exporter/market-reports": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Market Reports */
        get: operations["list_market_reports_api_exporter_market_reports_get"];
        put?: never;
        /** Create Market Report */
        post: operations["create_market_report_api_exporter_market_reports_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/exporter/market-reports/{report_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Market Report */
        get: operations["get_market_report_api_exporter_market_reports__report_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/exporter/consulting-leads": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Create Consulting Lead */
        post: operations["create_consulting_lead_api_exporter_consulting_leads_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/consulting-leads": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Consulting Leads */
        get: operations["list_consulting_leads_api_admin_consulting_leads_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/consulting-leads/{lead_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update Consulting Lead */
        patch: operations["update_consulting_lead_api_admin_consulting_leads__lead_id__patch"];
        trace?: never;
    };
    "/api/exporter/evidence-types": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Available Evidence Types */
        get: operations["list_available_evidence_types_api_exporter_evidence_types_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/exporter/evidences": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Evidences */
        get: operations["list_evidences_api_exporter_evidences_get"];
        put?: never;
        /** Create Evidence */
        post: operations["create_evidence_api_exporter_evidences_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/exporter/evidences/checklist": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Evidence Checklist */
        get: operations["evidence_checklist_api_exporter_evidences_checklist_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/exporter/evidences/{evidence_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Evidence */
        get: operations["get_evidence_api_exporter_evidences__evidence_id__get"];
        put?: never;
        post?: never;
        /** Delete Evidence */
        delete: operations["delete_evidence_api_exporter_evidences__evidence_id__delete"];
        options?: never;
        head?: never;
        /** Update Evidence */
        patch: operations["update_evidence_api_exporter_evidences__evidence_id__patch"];
        trace?: never;
    };
    "/api/admin/evidence-types/template.xlsx": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Evidence Types Template */
        get: operations["evidence_types_template_api_admin_evidence_types_template_xlsx_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/evidence-types/export.xlsx": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Evidence Types Export */
        get: operations["evidence_types_export_api_admin_evidence_types_export_xlsx_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/evidence-types/import": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Evidence Types Import */
        post: operations["evidence_types_import_api_admin_evidence_types_import_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/evidence-rules/template.xlsx": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Evidence Rules Template */
        get: operations["evidence_rules_template_api_admin_evidence_rules_template_xlsx_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/evidence-rules/export.xlsx": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Evidence Rules Export */
        get: operations["evidence_rules_export_api_admin_evidence_rules_export_xlsx_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/evidence-rules/import": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Evidence Rules Import */
        post: operations["evidence_rules_import_api_admin_evidence_rules_import_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/evidence-rules/{rule_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Delete Evidence Rule */
        delete: operations["delete_evidence_rule_api_admin_evidence_rules__rule_id__delete"];
        options?: never;
        head?: never;
        /** Update Evidence Rule */
        patch: operations["update_evidence_rule_api_admin_evidence_rules__rule_id__patch"];
        trace?: never;
    };
    "/api/admin/evidence-types": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Evidence Types */
        get: operations["list_evidence_types_api_admin_evidence_types_get"];
        put?: never;
        /** Create Evidence Type */
        post: operations["create_evidence_type_api_admin_evidence_types_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/evidence-types/{code}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update Evidence Type */
        patch: operations["update_evidence_type_api_admin_evidence_types__code__patch"];
        trace?: never;
    };
    "/api/admin/evidence-types/{code}/review": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Review Evidence Type */
        post: operations["review_evidence_type_api_admin_evidence_types__code__review_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/evidence-rules": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Evidence Rules */
        get: operations["list_evidence_rules_api_admin_evidence_rules_get"];
        put?: never;
        /** Create Evidence Rule */
        post: operations["create_evidence_rule_api_admin_evidence_rules_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/evidence-rules/{rule_id}/review": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Review Evidence Rule */
        post: operations["review_evidence_rule_api_admin_evidence_rules__rule_id__review_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/evidences/{evidence_id}/review": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Review Evidence */
        post: operations["review_evidence_api_admin_evidences__evidence_id__review_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/exporter/verification-requests": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** My Verification Requests */
        get: operations["my_verification_requests_api_exporter_verification_requests_get"];
        put?: never;
        /** Submit Verification Request */
        post: operations["submit_verification_request_api_exporter_verification_requests_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/buyer/verification-requests": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** My Buyer Verification Requests */
        get: operations["my_buyer_verification_requests_api_buyer_verification_requests_get"];
        put?: never;
        /** Submit Buyer Verification Request */
        post: operations["submit_buyer_verification_request_api_buyer_verification_requests_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/verification-queue": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Verification Queue */
        get: operations["verification_queue_api_admin_verification_queue_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/verification-requests/{request_id}/decision": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Decide Verification Request */
        post: operations["decide_verification_request_api_admin_verification_requests__request_id__decision_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/me/verification-tier": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** My Verification Tier */
        get: operations["my_verification_tier_api_me_verification_tier_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/exporter/verification-tier-requests": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Request Verification Tier */
        post: operations["request_verification_tier_api_exporter_verification_tier_requests_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/companies/{company_id}/tier-down": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Tier Down */
        post: operations["tier_down_api_admin_companies__company_id__tier_down_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/me/verification-checks": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** My Verification Checks */
        get: operations["my_verification_checks_api_me_verification_checks_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/companies/{company_id}/checks": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Company Checks */
        get: operations["company_checks_api_admin_companies__company_id__checks_get"];
        put?: never;
        /** Record Manual Check */
        post: operations["record_manual_check_api_admin_companies__company_id__checks_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/companies/{company_id}/checks/run": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Run Company Checks */
        post: operations["run_company_checks_api_admin_companies__company_id__checks_run_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/approved-establishments/import": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Import Approved Establishments */
        post: operations["import_approved_establishments_api_admin_approved_establishments_import_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/exporter/consistency-hints": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Consistency Hints */
        get: operations["consistency_hints_api_exporter_consistency_hints_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/companies/{company_id}/findings": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Company Findings */
        get: operations["company_findings_api_admin_companies__company_id__findings_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/exporter/trust-score": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** My Trust Score */
        get: operations["my_trust_score_api_exporter_trust_score_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/companies/{company_id}/trust-score": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Company Trust Score */
        get: operations["company_trust_score_api_admin_companies__company_id__trust_score_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/public/companies/{slug}/trust-score": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Public Trust Score */
        get: operations["public_trust_score_api_public_companies__slug__trust_score_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/public/trust-criteria": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Trust Criteria */
        get: operations["trust_criteria_api_public_trust_criteria_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/exporter/evidences/extract-preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Extract Preview
         * @description Đọc thử file vừa tải lên để điền sẵn form nộp bằng chứng; không tạo bản ghi.
         */
        post: operations["extract_preview_api_exporter_evidences_extract_preview_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/exporter/evidences/{evidence_id}/extraction": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Evidence Extraction */
        get: operations["evidence_extraction_api_exporter_evidences__evidence_id__extraction_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/exporter/evidences/{evidence_id}/extraction/apply": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Apply Evidence Extraction */
        post: operations["apply_evidence_extraction_api_exporter_evidences__evidence_id__extraction_apply_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/evidences/{evidence_id}/extraction": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Admin Evidence Extraction */
        get: operations["admin_evidence_extraction_api_admin_evidences__evidence_id__extraction_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/companies/{company_id}/identity": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Company Identity */
        get: operations["company_identity_api_admin_companies__company_id__identity_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/companies/{company_id}/identity-checks": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Record Identity Check */
        post: operations["record_identity_check_api_admin_companies__company_id__identity_checks_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/identity-clusters": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Identity Clusters */
        get: operations["identity_clusters_api_admin_identity_clusters_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/identity-clusters/export.xlsx": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Identity Clusters Export */
        get: operations["identity_clusters_export_api_admin_identity_clusters_export_xlsx_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/blocklist": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Blocklist */
        get: operations["list_blocklist_api_admin_blocklist_get"];
        put?: never;
        /** Add Blocklist */
        post: operations["add_blocklist_api_admin_blocklist_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/blocklist/{entry_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Remove Blocklist */
        delete: operations["remove_blocklist_api_admin_blocklist__entry_id__delete"];
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
        /** AdminBillingItemOut */
        AdminBillingItemOut: {
            /** Code */
            code: string;
            /** Name Vi */
            name_vi: string;
            /** Name En */
            name_en: string;
            /** Description Vi */
            description_vi: string | null;
            /** Description En */
            description_en: string | null;
            /**
             * Audience
             * @enum {string}
             */
            audience: "exporter" | "buyer";
            /** Feature */
            feature: string;
            /** Price */
            price: string;
            /** Currency */
            currency: string;
            /** Duration Days */
            duration_days: number | null;
            /** Price Is Placeholder */
            price_is_placeholder: boolean;
            /** Is Active */
            is_active: boolean;
            /** Sort Order */
            sort_order: number;
            /** Updated At */
            updated_at: string | null;
        };
        /** AdminCompanyOut */
        AdminCompanyOut: {
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
            /** Country */
            country: string;
            /** Tax Id */
            tax_id: string | null;
            /** Website */
            website: string | null;
            /** Address */
            address: string | null;
            /** Contact Email */
            contact_email: string | null;
            /** Description Vi */
            description_vi: string | null;
            /** Description En */
            description_en: string | null;
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
            /**
             * Verification Tier
             * @default 0
             */
            verification_tier?: number;
            /** Is Hidden */
            is_hidden: boolean;
            /** Profile Completeness Score */
            profile_completeness_score: string;
            /** Owner Email */
            owner_email: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /**
         * AdminCompanyPatch
         * @description Chỉ nội dung và cờ ẩn. Trạng thái xác minh, chủ sở hữu, MST KHÔNG sửa được ở đây.
         */
        AdminCompanyPatch: {
            /** Legal Name */
            legal_name?: string | null;
            /** Description Vi */
            description_vi?: string | null;
            /** Description En */
            description_en?: string | null;
            /** Website */
            website?: string | null;
            /** Address */
            address?: string | null;
            /** Contact Email */
            contact_email?: string | null;
            /** Is Hidden */
            is_hidden?: boolean | null;
        };
        /** AdminConsultingLeadOut */
        AdminConsultingLeadOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Company Id
             * Format: uuid
             */
            company_id: string;
            /** Report Id */
            report_id: string | null;
            /** Contact Name */
            contact_name: string;
            /** Contact Email */
            contact_email: string;
            /** Phone */
            phone: string | null;
            /** Message */
            message: string | null;
            /**
             * Status
             * @enum {string}
             */
            status: "new" | "contacted" | "closed";
            /** Handled At */
            handled_at: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Company Name */
            company_name: string;
            /** Report Query */
            report_query?: string | null;
        };
        /** AdminOrderOut */
        AdminOrderOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Item Code */
            item_code: string;
            /** Item Name Vi */
            item_name_vi: string;
            /** Item Name En */
            item_name_en: string;
            /** Feature */
            feature: string;
            /** Amount */
            amount: string;
            /** Currency */
            currency: string;
            /** Reference */
            reference: string;
            /**
             * Status
             * @enum {string}
             */
            status: "pending" | "paid" | "cancelled";
            /** Invoice Info */
            invoice_info: {
                [key: string]: string | null;
            };
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Paid At */
            paid_at: string | null;
            /** Cancelled At */
            cancelled_at: string | null;
            bank_transfer: components["schemas"]["BankTransferOut"] | null;
            /**
             * Company Id
             * Format: uuid
             */
            company_id: string;
            /** Company Name */
            company_name: string;
            /** Admin Note */
            admin_note: string | null;
        };
        /** AdminProductOut */
        AdminProductOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Company Id
             * Format: uuid
             */
            company_id: string;
            /** Company Name */
            company_name: string;
            /** Name */
            name: string;
            /** Hs Code */
            hs_code: string;
            /** Description Vi */
            description_vi: string | null;
            /** Description En */
            description_en: string | null;
            /** Is Active */
            is_active: boolean;
            /**
             * Approval Status
             * @enum {string}
             */
            approval_status: "pending" | "approved" | "hidden";
            /** Created At */
            created_at?: string | null;
            /**
             * Industry Mismatch
             * @default false
             */
            industry_mismatch?: boolean;
        };
        /**
         * AdminProductPatch
         * @description Kiểm duyệt: sửa chữ, ẩn/hiện. Không đổi mã HS, giá hay MOQ của exporter.
         */
        AdminProductPatch: {
            /** Name */
            name?: string | null;
            /** Description Vi */
            description_vi?: string | null;
            /** Description En */
            description_en?: string | null;
            /** Is Active */
            is_active?: boolean | null;
            /** Approval Status */
            approval_status?: ("approved" | "hidden") | null;
        };
        /** AdminSectorAlertOut */
        AdminSectorAlertOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Code */
            code: string;
            /** Hs Prefixes */
            hs_prefixes: string[];
            /** Severity */
            severity: string;
            /** Title Vi */
            title_vi: string;
            /** Title En */
            title_en: string;
            /** Body Vi */
            body_vi: string | null;
            /** Body En */
            body_en: string | null;
            /** Source Url */
            source_url: string | null;
            /**
             * Valid From
             * Format: date
             */
            valid_from: string;
            /** Valid Until */
            valid_until: string | null;
            /** Is Demo */
            is_demo: boolean;
            /** Reviewed By */
            reviewed_by: string | null;
            /** Reviewed At */
            reviewed_at: string | null;
        };
        /** AgreementOut */
        AgreementOut: {
            /** Code */
            code: string;
            /** Name Vi */
            name_vi: string;
            /** Name En */
            name_en: string;
        };
        /** AiQueryOut */
        AiQueryOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** User Id */
            user_id: string | null;
            /** Company Id */
            company_id: string | null;
            /** Question */
            question: string;
            /** Language */
            language: string;
            /** Hs Code */
            hs_code: string | null;
            /** Answer */
            answer: string | null;
            /**
             * Confidence
             * @enum {string}
             */
            confidence: "high" | "medium" | "low" | "out_of_scope";
            /** Self Assessment */
            self_assessment: string | null;
            /** Error */
            error: string | null;
            /** Citation Ids */
            citation_ids: string[];
            /** Latency Ms */
            latency_ms: number;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Was Helpful */
            was_helpful?: boolean | null;
            /**
             * Escalated
             * @default false
             */
            escalated?: boolean;
        };
        /** AskIn */
        AskIn: {
            /** Question */
            question: string;
            /** Hs Code */
            hs_code?: string | null;
            /**
             * Language
             * @default vi
             * @enum {string}
             */
            language?: "vi" | "en";
        };
        /** AskOut */
        AskOut: {
            /**
             * Query Id
             * Format: uuid
             */
            query_id: string;
            /** Answer */
            answer: string;
            /**
             * Confidence
             * @enum {string}
             */
            confidence: "high" | "medium" | "low" | "out_of_scope";
            /** Citations */
            citations: components["schemas"]["CitationOut"][];
            /** Can Escalate */
            can_escalate: boolean;
        };
        /** AuditLogOut */
        AuditLogOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Actor Id */
            actor_id: string | null;
            /** Action Type */
            action_type: string;
            /** Entity Type */
            entity_type: string;
            /** Entity Id */
            entity_id: string;
            /** Before State */
            before_state: {
                [key: string]: unknown;
            } | null;
            /** After State */
            after_state: {
                [key: string]: unknown;
            } | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /**
         * BadgeOut
         * @description Huy hiệu EVFTA-verified theo nhóm hàng. Văn bản chỉ nói về C/O EUR.1 đã cấp trong 12 tháng
         *     gần nhất, không nói hàng đạt xuất xứ EVFTA.
         */
        BadgeOut: {
            /** Category */
            category: string;
            /** Granted */
            granted: boolean;
            /** Text Vi */
            text_vi: string | null;
            /** Text En */
            text_en: string | null;
            /** Reason */
            reason: string | null;
            /** Missing */
            missing: string[];
        };
        /**
         * BalanceTerms
         * @description Điều khoản cho phần còn lại sau đặt cọc.
         * @enum {string}
         */
        BalanceTerms: "tt_before_shipment" | "against_bl_copy" | "lc_at_sight" | "none";
        /** BankTransferOut */
        BankTransferOut: {
            /** Bank Name */
            bank_name: string;
            /** Account Name */
            account_name: string;
            /** Account Number */
            account_number: string;
            /** Iban */
            iban: string | null;
            /** Swift */
            swift: string | null;
            /** Transfer Note */
            transfer_note: string;
            /** Is Demo Account */
            is_demo_account: boolean;
        };
        /** BillingItemOut */
        BillingItemOut: {
            /** Code */
            code: string;
            /** Name Vi */
            name_vi: string;
            /** Name En */
            name_en: string;
            /** Description Vi */
            description_vi: string | null;
            /** Description En */
            description_en: string | null;
            /**
             * Audience
             * @enum {string}
             */
            audience: "exporter" | "buyer";
            /** Feature */
            feature: string;
            /** Price */
            price: string;
            /** Currency */
            currency: string;
            /** Duration Days */
            duration_days: number | null;
            /** Price Is Placeholder */
            price_is_placeholder: boolean;
        };
        /**
         * BillingItemPatch
         * @description Admin chỉnh giá / bật tắt mục thu phí. Tiền nhận CHUỖI JSON (strict), không nhận số.
         */
        BillingItemPatch: {
            /** Price */
            price?: number | string | null;
            /** Currency */
            currency?: ("VND" | "EUR" | "USD") | null;
            /** Duration Days */
            duration_days?: number | null;
            /** Is Active */
            is_active?: boolean | null;
            /** Price Is Placeholder */
            price_is_placeholder?: boolean | null;
        };
        /** BlocklistIn */
        BlocklistIn: {
            /**
             * Identifier Type
             * @enum {string}
             */
            identifier_type: "tax_id" | "domain" | "phone" | "file_sha256";
            /** Value */
            value: string;
            /** Reason */
            reason: string;
        };
        /** BlocklistOut */
        BlocklistOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Identifier Type */
            identifier_type: string;
            /** Value */
            value: string;
            /** Reason */
            reason: string;
            /**
             * Added By
             * Format: uuid
             */
            added_by: string;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /** Body_evidence_rules_import_api_admin_evidence_rules_import_post */
        Body_evidence_rules_import_api_admin_evidence_rules_import_post: {
            /** File */
            file: string;
        };
        /** Body_evidence_types_import_api_admin_evidence_types_import_post */
        Body_evidence_types_import_api_admin_evidence_types_import_post: {
            /** File */
            file: string;
        };
        /** Body_import_approved_establishments_api_admin_approved_establishments_import_post */
        Body_import_approved_establishments_api_admin_approved_establishments_import_post: {
            /** File */
            file: string;
        };
        /** Body_roo_rules_import_api_admin_roo_rules_import_post */
        Body_roo_rules_import_api_admin_roo_rules_import_post: {
            /** File */
            file: string;
        };
        /** Body_tariff_lines_import_api_admin_tariff_lines_import_post */
        Body_tariff_lines_import_api_admin_tariff_lines_import_post: {
            /** File */
            file: string;
        };
        /** Body_upload_trade_file_api_admin_trade_imports_file_post */
        Body_upload_trade_file_api_admin_trade_imports_file_post: {
            /** File */
            file: string;
        };
        /** BuyerDashboard */
        BuyerDashboard: {
            saved_searches: components["schemas"]["SavedSearchTile"];
            rfqs_sent: components["schemas"]["RfqTile"];
            recently_viewed: components["schemas"]["SupplierListTile"];
            new_verified: components["schemas"]["SupplierListTile"];
        };
        /**
         * CatalogItemOut
         * @description Một dòng danh mục (ngành hàng, loại dịch vụ) — tên hai ngôn ngữ lấy từ DB.
         */
        CatalogItemOut: {
            /** Code */
            code: string;
            /** Name Vi */
            name_vi: string;
            /** Name En */
            name_en: string;
        };
        /**
         * CheckOut
         * @description Kết quả mới nhất của một loại kiểm (U21) — tín hiệu cho admin, không phải quyết định.
         */
        CheckOut: {
            /** Check Code */
            check_code: string;
            /**
             * Status
             * @enum {string}
             */
            status: "pass" | "fail" | "warning" | "unknown";
            /** Detail */
            detail: {
                [key: string]: unknown;
            };
            /** Source */
            source: string;
            /** Manual */
            manual: boolean;
            /**
             * Checked At
             * Format: date-time
             */
            checked_at: string;
        };
        /** ChecklistItem */
        ChecklistItem: {
            /** Type Code */
            type_code: string;
            /** Name Vi */
            name_vi: string;
            /** Name En */
            name_en: string;
            /** Required */
            required: boolean;
            /** Note */
            note: string | null;
            /**
             * State
             * @enum {string}
             */
            state: "missing" | "pending" | "approved" | "expired" | "rejected";
        };
        /** CitationOut */
        CitationOut: {
            /**
             * Chunk Id
             * Format: uuid
             */
            chunk_id: string;
            /** Title */
            title: string;
            /** Source */
            source: string;
            /** Source Url */
            source_url: string | null;
            /** Heading */
            heading: string;
        };
        /** ClusterCompany */
        ClusterCompany: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Legal Name */
            legal_name: string;
        };
        /** ClusterOut */
        ClusterOut: {
            /** Identifier Type */
            identifier_type: string;
            /** Value */
            value: string;
            /** Companies */
            companies: components["schemas"]["ClusterCompany"][];
        };
        /** CompanyChecklistItemOut */
        CompanyChecklistItemOut: {
            /** Code */
            code: string;
            /** Name Vi */
            name_vi: string;
            /** Name En */
            name_en: string | null;
            /**
             * Blocks
             * @enum {string}
             */
            blocks: "IMPORT" | "TARIFF_PREFERENCE" | "NONE";
            /** Legal Status */
            legal_status: string;
            /** Verification Type Code */
            verification_type_code: string | null;
            /**
             * State
             * @enum {string}
             */
            state: "approved" | "pending" | "expired" | "rejected" | "missing" | "not_mapped";
            /**
             * Review State
             * @enum {string}
             */
            review_state: "REVIEWED" | "UNREVIEWED";
        };
        /** CompanyChecklistOut */
        CompanyChecklistOut: {
            /** Hs Code */
            hs_code: string;
            /** Hs Formatted */
            hs_formatted: string;
            /** Category */
            category: string | null;
            /** Items */
            items: components["schemas"]["CompanyChecklistItemOut"][];
            badge: components["schemas"]["BadgeOut"] | null;
            /**
             * Review State
             * @enum {string}
             */
            review_state: "REVIEWED" | "UNREVIEWED";
            /** Unreviewed Components */
            unreviewed_components: string[];
            /** Disclaimer */
            disclaimer: string | null;
        };
        /** CompanyIdentityOut */
        CompanyIdentityOut: {
            /**
             * Company Id
             * Format: uuid
             */
            company_id: string;
            /** Ownership Proven */
            ownership_proven: boolean;
            /** Signals */
            signals: components["schemas"]["SignalOut"][];
            /** Checks */
            checks: components["schemas"]["IdentityCheckOut"][];
            /** Clusters */
            clusters: components["schemas"]["ClusterOut"][];
        };
        /** CompanyIn */
        CompanyIn: {
            /** Registration Number */
            registration_number?: string | null;
            /** Tax Id */
            tax_id?: string | null;
            /** Business Type */
            business_type?: string | null;
            /** Industry Sector */
            industry_sector?: ("agriculture" | "fruits_vegetables" | "coffee_tea" | "seafood" | "food_beverage" | "spices" | "textiles" | "handicrafts" | "other") | null;
            /** Industry Other */
            industry_other?: string | null;
            /** Founded Year */
            founded_year?: number | null;
            /** Address */
            address?: string | null;
            /** Website */
            website?: string | null;
            /** Contact Email */
            contact_email?: string | null;
            /** Phone */
            phone?: string | null;
            /** Contact Name */
            contact_name?: string | null;
            /** City */
            city?: string | null;
            /** Legal Rep Name */
            legal_rep_name?: string | null;
            /** Legal Rep Title */
            legal_rep_title?: string | null;
            /** Issuing Authority */
            issuing_authority?: string | null;
            /** Description Vi */
            description_vi?: string | null;
            /** Description En */
            description_en?: string | null;
            /** Offering Type */
            offering_type?: ("products" | "services" | "both") | null;
            /** Factory Address */
            factory_address?: string | null;
            /** Capacity Value */
            capacity_value?: number | string | null;
            /** Capacity Unit */
            capacity_unit?: ("kg" | "tonne" | "piece" | "carton" | "liter" | "container_20ft" | "container_40ft") | null;
            /** Capacity Period */
            capacity_period?: ("month" | "year") | null;
            /** Main Customers */
            main_customers?: string | null;
            /** Location Public */
            location_public?: boolean | null;
            /** Company Size */
            company_size?: ("1_10" | "11_50" | "51_200" | "201_500" | "gt_500") | null;
            /** Procurement Estimate */
            procurement_estimate?: ("lt_100k" | "100k_500k" | "500k_2m" | "2m_10m" | "gt_10m") | null;
            /** Vat Number */
            vat_number?: string | null;
            /** Eori Number */
            eori_number?: string | null;
            /** Lei Code */
            lei_code?: string | null;
            /** Hide Profile Views */
            hide_profile_views?: boolean | null;
            /** Legal Name */
            legal_name: string;
            /**
             * Country
             * @default VN
             */
            country?: string;
            /** Export Markets */
            export_markets?: string[];
            /** Export Market Channels */
            export_market_channels?: {
                [key: string]: "official" | "unofficial";
            };
            /** Languages Spoken */
            languages_spoken?: string[];
            /** Sourcing Categories */
            sourcing_categories?: ("agriculture" | "fruits_vegetables" | "coffee_tea" | "seafood" | "food_beverage" | "spices" | "textiles" | "handicrafts" | "other")[];
            /** Facility Codes */
            facility_codes?: components["schemas"]["FacilityCodeIn"][];
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
            /** Industry Other */
            industry_other: string | null;
            /** Founded Year */
            founded_year: number | null;
            /** Address */
            address: string | null;
            /** Website */
            website: string | null;
            /** Contact Email */
            contact_email: string | null;
            /** Phone */
            phone: string | null;
            /** Contact Name */
            contact_name?: string | null;
            /** City */
            city?: string | null;
            /** Legal Rep Name */
            legal_rep_name: string | null;
            /** Legal Rep Title */
            legal_rep_title: string | null;
            /** Issuing Authority */
            issuing_authority: string | null;
            /** Description Vi */
            description_vi: string | null;
            /** Description En */
            description_en: string | null;
            /** Logo Key */
            logo_key: string | null;
            /** Offering Type */
            offering_type: ("products" | "services" | "both") | null;
            /** Factory Address */
            factory_address: string | null;
            /** Capacity Value */
            capacity_value: string | null;
            /** Capacity Unit */
            capacity_unit: string | null;
            /** Capacity Period */
            capacity_period: string | null;
            /** Main Customers */
            main_customers: string | null;
            /** Location Public */
            location_public: boolean;
            /** Latitude */
            latitude?: string | null;
            /** Longitude */
            longitude?: string | null;
            /** Facility Codes */
            facility_codes: components["schemas"]["FacilityCodeOut"][];
            /** Export Markets */
            export_markets: string[];
            /** Export Market Channels */
            export_market_channels?: {
                [key: string]: string;
            };
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
            /** Lei Code */
            lei_code?: string | null;
            /** Hide Profile Views */
            hide_profile_views: boolean;
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
            /**
             * Verification Tier
             * @default 0
             */
            verification_tier?: number;
            /** Tier Reviewed At */
            tier_reviewed_at?: string | null;
            /** Tier Expires At */
            tier_expires_at?: string | null;
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
            industry_sector?: ("agriculture" | "fruits_vegetables" | "coffee_tea" | "seafood" | "food_beverage" | "spices" | "textiles" | "handicrafts" | "other") | null;
            /** Industry Other */
            industry_other?: string | null;
            /** Founded Year */
            founded_year?: number | null;
            /** Address */
            address?: string | null;
            /** Website */
            website?: string | null;
            /** Contact Email */
            contact_email?: string | null;
            /** Phone */
            phone?: string | null;
            /** Contact Name */
            contact_name?: string | null;
            /** City */
            city?: string | null;
            /** Legal Rep Name */
            legal_rep_name?: string | null;
            /** Legal Rep Title */
            legal_rep_title?: string | null;
            /** Issuing Authority */
            issuing_authority?: string | null;
            /** Description Vi */
            description_vi?: string | null;
            /** Description En */
            description_en?: string | null;
            /** Offering Type */
            offering_type?: ("products" | "services" | "both") | null;
            /** Factory Address */
            factory_address?: string | null;
            /** Capacity Value */
            capacity_value?: number | string | null;
            /** Capacity Unit */
            capacity_unit?: ("kg" | "tonne" | "piece" | "carton" | "liter" | "container_20ft" | "container_40ft") | null;
            /** Capacity Period */
            capacity_period?: ("month" | "year") | null;
            /** Main Customers */
            main_customers?: string | null;
            /** Location Public */
            location_public?: boolean | null;
            /** Company Size */
            company_size?: ("1_10" | "11_50" | "51_200" | "201_500" | "gt_500") | null;
            /** Procurement Estimate */
            procurement_estimate?: ("lt_100k" | "100k_500k" | "500k_2m" | "2m_10m" | "gt_10m") | null;
            /** Vat Number */
            vat_number?: string | null;
            /** Eori Number */
            eori_number?: string | null;
            /** Lei Code */
            lei_code?: string | null;
            /** Hide Profile Views */
            hide_profile_views?: boolean | null;
            /** Legal Name */
            legal_name?: string | null;
            /** Country */
            country?: string | null;
            /** Export Markets */
            export_markets?: string[] | null;
            /** Export Market Channels */
            export_market_channels?: {
                [key: string]: "official" | "unofficial";
            } | null;
            /** Languages Spoken */
            languages_spoken?: string[] | null;
            /** Sourcing Categories */
            sourcing_categories?: ("agriculture" | "fruits_vegetables" | "coffee_tea" | "seafood" | "food_beverage" | "spices" | "textiles" | "handicrafts" | "other")[] | null;
            /** Facility Codes */
            facility_codes?: components["schemas"]["FacilityCodeIn"][] | null;
            /** Logo Key */
            logo_key?: string | null;
        };
        /** CompetitorOut */
        CompetitorOut: {
            /** Partner */
            partner: string;
            /** Value */
            value: string;
            /** Share */
            share: string;
            /** Unit Price */
            unit_price: string | null;
        };
        /** CompletenessData */
        CompletenessData: {
            /** Score */
            score: string;
            /** Missing */
            missing: components["schemas"]["MissingItem"][];
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
        /** CompletenessTile */
        CompletenessTile: {
            data: components["schemas"]["CompletenessData"] | null;
            /** Empty Hint Key */
            empty_hint_key?: string | null;
        };
        /** ConsultingLeadIn */
        ConsultingLeadIn: {
            /** Report Id */
            report_id?: string | null;
            /** Contact Name */
            contact_name: string;
            /**
             * Contact Email
             * Format: email
             */
            contact_email: string;
            /** Phone */
            phone?: string | null;
            /** Message */
            message?: string | null;
        };
        /** ConsultingLeadOut */
        ConsultingLeadOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Company Id
             * Format: uuid
             */
            company_id: string;
            /** Report Id */
            report_id: string | null;
            /** Contact Name */
            contact_name: string;
            /** Contact Email */
            contact_email: string;
            /** Phone */
            phone: string | null;
            /** Message */
            message: string | null;
            /**
             * Status
             * @enum {string}
             */
            status: "new" | "contacted" | "closed";
            /** Handled At */
            handled_at: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /** ConsultingLeadPatch */
        ConsultingLeadPatch: {
            /**
             * Status
             * @enum {string}
             */
            status: "new" | "contacted" | "closed";
        };
        /** ConversationOut */
        ConversationOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Rfq Id */
            rfq_id: string | null;
            /** Product Name */
            product_name: string;
            /**
             * Counterpart Company Id
             * Format: uuid
             */
            counterpart_company_id: string;
            /** Counterpart Name */
            counterpart_name: string;
            /** Counterpart Verified */
            counterpart_verified: boolean;
            /** Last Message */
            last_message: string | null;
            /**
             * Last Message At
             * Format: date-time
             */
            last_message_at: string;
            /** Unread Count */
            unread_count: number;
        };
        /** CopilotTile */
        CopilotTile: {
            /** Data */
            data: components["schemas"]["QuestionBrief"][];
            /** Empty Hint Key */
            empty_hint_key?: string | null;
        };
        /** CorpusDocumentOut */
        CorpusDocumentOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Title */
            title: string;
            /** Source */
            source: string;
            /** Source Url */
            source_url: string | null;
            /** Doc Type */
            doc_type: string;
            /** Language */
            language: string;
            /** Hs Codes */
            hs_codes: string[];
            /** Reviewed By */
            reviewed_by: string | null;
            /** Reviewed At */
            reviewed_at: string | null;
            /**
             * Ingested At
             * Format: date-time
             */
            ingested_at: string;
            /**
             * Chunk Count
             * @default 0
             */
            chunk_count?: number;
        };
        /** CountryTermIn */
        CountryTermIn: {
            /** Hs Code */
            hs_code: string;
            /** Country */
            country: string;
            /** Vat Rate */
            vat_rate: number | string;
            /** Label Languages */
            label_languages?: string | null;
            /** Note */
            note?: string | null;
            /** Note En */
            note_en?: string | null;
            /** Source */
            source?: string | null;
            /**
             * Valid From
             * Format: date
             */
            valid_from: string;
            /** Valid Until */
            valid_until?: string | null;
        };
        /** CountryTermOut */
        CountryTermOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Hs Code */
            hs_code: string;
            /** Country */
            country: string;
            /** Vat Rate */
            vat_rate: string;
            /** Label Languages */
            label_languages: string | null;
            /** Note */
            note: string | null;
            /** Note En */
            note_en: string | null;
            /** Source */
            source: string | null;
            /**
             * Valid From
             * Format: date
             */
            valid_from: string;
            /** Valid Until */
            valid_until: string | null;
            /** Reviewed By */
            reviewed_by: string | null;
            /** Reviewed At */
            reviewed_at: string | null;
        };
        /** CountryTermPatch */
        CountryTermPatch: {
            /** Hs Code */
            hs_code?: string | null;
            /** Country */
            country?: string | null;
            /** Vat Rate */
            vat_rate?: number | string | null;
            /** Label Languages */
            label_languages?: string | null;
            /** Note */
            note?: string | null;
            /** Note En */
            note_en?: string | null;
            /** Source */
            source?: string | null;
            /** Valid From */
            valid_from?: string | null;
            /** Valid Until */
            valid_until?: string | null;
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
        /** DecisionIn */
        DecisionIn: {
            /**
             * Decision
             * @enum {string}
             */
            decision: "approve" | "reject" | "request_info";
            /** Reason */
            reason?: string | null;
        };
        /**
         * DeleteAccountIn
         * @description Xóa tài khoản là không thể hoàn tác nên phải nhập lại mật khẩu.
         */
        DeleteAccountIn: {
            /** Password */
            password: string;
        };
        /**
         * DirectConversationIn
         * @description U7: nhắn tin trực tiếp tới nhà cung cấp đang hiển thị công khai (theo slug hồ sơ).
         */
        DirectConversationIn: {
            /** Supplier Slug */
            supplier_slug: string;
            /** Body */
            body: string;
        };
        /** DocumentOut */
        DocumentOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Document Type
             * @constant
             */
            document_type: "eur1_draft";
            /**
             * Compliance Check Id
             * Format: uuid
             */
            compliance_check_id: string;
            /**
             * Status
             * @enum {string}
             */
            status: "queued" | "ready" | "failed";
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** File Url */
            file_url: string | null;
        };
        /**
         * DutyType
         * @enum {string}
         */
        DutyType: "ad_valorem" | "specific" | "mixed";
        /** EntitlementOut */
        EntitlementOut: {
            /** Feature */
            feature: string;
            /**
             * Valid From
             * Format: date-time
             */
            valid_from: string;
            /** Valid Until */
            valid_until: string | null;
            /**
             * Order Id
             * Format: uuid
             */
            order_id: string;
        };
        /**
         * EscalateIn
         * @description Khách phải để lại email; người đã đăng nhập dùng email tài khoản.
         */
        EscalateIn: {
            /** Contact Email */
            contact_email?: string | null;
        };
        /** EscalationOut */
        EscalationOut: {
            /**
             * Ticket Id
             * Format: uuid
             */
            ticket_id: string;
            /** Status */
            status: string;
        };
        /**
         * Eur1In
         * @description Dữ liệu hóa đơn để phủ lên bản nháp EUR.1. Khối lượng là CHUỖI JSON.
         */
        Eur1In: {
            /**
             * Compliance Check Id
             * Format: uuid
             */
            compliance_check_id: string;
            /** Consignee Name */
            consignee_name: string;
            /** Consignee Address */
            consignee_address: string;
            /** Consignee Country */
            consignee_country: string;
            /** Invoice Number */
            invoice_number: string;
            /**
             * Invoice Date
             * Format: date
             */
            invoice_date: string;
            /** Goods Description */
            goods_description: string;
            /** Packages */
            packages: string;
            /** Gross Mass Kg */
            gross_mass_kg: number | string;
            /** Transport Details */
            transport_details?: string | null;
            /** Remarks */
            remarks?: string | null;
        };
        /** EvidenceIn */
        EvidenceIn: {
            /** Type Code */
            type_code: string;
            /** File Key */
            file_key: string;
            /** Certificate Number */
            certificate_number?: string | null;
            /** Issuer */
            issuer?: string | null;
            /** Issued At */
            issued_at?: string | null;
            /** Expires At */
            expires_at?: string | null;
            /** Custom Type Name */
            custom_type_name?: string | null;
        };
        /** EvidenceItemOut */
        EvidenceItemOut: {
            /** Code */
            code: string;
            /** Name Vi */
            name_vi: string;
            /** Name En */
            name_en: string | null;
            /** Layer */
            layer: string;
            /** Scope */
            scope: string;
            /**
             * Blocks
             * @enum {string}
             */
            blocks: "IMPORT" | "TARIFF_PREFERENCE" | "NONE";
            /** Legal Status */
            legal_status: string;
            /**
             * Status
             * @enum {string}
             */
            status: "REQUIRED" | "NEEDS_INPUT" | "CHECK_REQUIRED";
            /** Conditions */
            conditions: string[];
            /**
             * Review State
             * @enum {string}
             */
            review_state: "REVIEWED" | "UNREVIEWED";
        };
        /** EvidenceOut */
        EvidenceOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Type Code */
            type_code: string;
            /** Type Name Vi */
            type_name_vi: string;
            /** Type Name En */
            type_name_en: string;
            /** Certificate Number */
            certificate_number: string | null;
            /** Issuer */
            issuer: string | null;
            /** Issued At */
            issued_at: string | null;
            /** Expires At */
            expires_at: string | null;
            /** Custom Type Name */
            custom_type_name?: string | null;
            /**
             * Approval Status
             * @enum {string}
             */
            approval_status: "pending" | "approved" | "rejected";
            /** Reject Reason */
            reject_reason: string | null;
            /** File Url */
            file_url: string;
        };
        /**
         * EvidencePatch
         * @description Chỉ trường được gửi mới đổi. Sửa bằng chứng luôn đưa nó về `pending` để duyệt lại.
         */
        EvidencePatch: {
            /** Type Code */
            type_code?: string | null;
            /** File Key */
            file_key?: string | null;
            /** Certificate Number */
            certificate_number?: string | null;
            /** Issuer */
            issuer?: string | null;
            /** Issued At */
            issued_at?: string | null;
            /** Expires At */
            expires_at?: string | null;
            /** Custom Type Name */
            custom_type_name?: string | null;
        };
        /** EvidenceReviewIn */
        EvidenceReviewIn: {
            /**
             * Decision
             * @enum {string}
             */
            decision: "approve" | "reject";
            /** Reason */
            reason?: string | null;
            /** Issued At */
            issued_at?: string | null;
            /** Expires At */
            expires_at?: string | null;
        };
        /** EvidenceTypeIn */
        EvidenceTypeIn: {
            /** Code */
            code: string;
            /** Name Vi */
            name_vi: string;
            /** Name En */
            name_en: string;
            /** Group */
            group: string;
            /** Validity Months */
            validity_months?: number | null;
            /**
             * Is Active
             * @default true
             */
            is_active?: boolean;
            /** Source */
            source?: string | null;
        };
        /** EvidenceTypeOut */
        EvidenceTypeOut: {
            /** Code */
            code: string;
            /** Name Vi */
            name_vi: string;
            /** Name En */
            name_en: string;
            /** Group */
            group: string;
            /** Validity Months */
            validity_months: number | null;
            /** Is Active */
            is_active: boolean;
            /** Source */
            source: string | null;
            /** Reviewed By */
            reviewed_by: string | null;
            /** Reviewed At */
            reviewed_at: string | null;
        };
        /** EvidenceTypePatch */
        EvidenceTypePatch: {
            /** Name Vi */
            name_vi?: string | null;
            /** Name En */
            name_en?: string | null;
            /** Group */
            group?: string | null;
            /** Validity Months */
            validity_months?: number | null;
            /** Is Active */
            is_active?: boolean | null;
            /** Source */
            source?: string | null;
        };
        /**
         * EvidenceTypePublic
         * @description Loại bằng chứng exporter được nộp (đã duyệt, đang bật) — không lộ thông tin duyệt.
         */
        EvidenceTypePublic: {
            /** Code */
            code: string;
            /** Name Vi */
            name_vi: string;
            /** Name En */
            name_en: string;
            /** Group */
            group: string;
            /** Validity Months */
            validity_months: number | null;
        };
        /** ExporterDashboard */
        ExporterDashboard: {
            completeness: components["schemas"]["CompletenessTile"];
            profile_views: components["schemas"]["ProfileViewsTile"];
            rfqs: components["schemas"]["RfqTile"];
            verification: components["schemas"]["VerificationTile"];
            tariff_savings: components["schemas"]["SavingsTile"];
            copilot: components["schemas"]["CopilotTile"];
            journey: components["schemas"]["JourneyOut"];
        };
        /**
         * ExporterRequirementsOut
         * @description Bằng chứng cần chuẩn bị theo từng mã HS sản phẩm công ty đang bán (chưa biết trị giá lô,
         *     nguồn nguyên liệu: dòng có điều kiện kèm danh sách điều kiện để người dùng tự đối chiếu).
         */
        ExporterRequirementsOut: {
            /** Eur1 Threshold Eur */
            eur1_threshold_eur: string;
            /** Products */
            products: components["schemas"]["ProductRequirementsOut"][];
            /**
             * Review State
             * @enum {string}
             */
            review_state: "REVIEWED" | "UNREVIEWED";
            /** Disclaimer */
            disclaimer: string | null;
        };
        /** ExtractionApplyIn */
        ExtractionApplyIn: {
            /** Fields */
            fields: ("certificate_number" | "issuer" | "issued_at" | "expires_at")[];
        };
        /** ExtractionFieldCompare */
        ExtractionFieldCompare: {
            /** Field */
            field: string;
            /** Declared */
            declared: string | null;
            /** Extracted */
            extracted: string | null;
            /** Match */
            match: boolean | null;
        };
        /** ExtractionOut */
        ExtractionOut: {
            /**
             * Evidence Id
             * Format: uuid
             */
            evidence_id: string;
            /**
             * Status
             * @enum {string}
             */
            status: "queued" | "running" | "ready" | "failed" | "skipped";
            /** Method */
            method: ("text" | "vision") | null;
            /** Model */
            model: string | null;
            /** Fields */
            fields: {
                [key: string]: string | null;
            };
            /** Error */
            error: string | null;
            /** Finished At */
            finished_at: string | null;
            /** Applied At */
            applied_at: string | null;
            /** Comparison */
            comparison?: components["schemas"]["ExtractionFieldCompare"][];
        };
        /** ExtractionPreviewIn */
        ExtractionPreviewIn: {
            /** File Key */
            file_key: string;
        };
        /**
         * ExtractionPreviewOut
         * @description Đọc thử file đã tải lên TRƯỚC khi nộp: chỉ gợi ý để seller kiểm tra, không tạo bản ghi.
         */
        ExtractionPreviewOut: {
            /**
             * Status
             * @enum {string}
             */
            status: "ready" | "failed" | "skipped";
            /** Method */
            method: ("text" | "vision" | "rules" | "text+rules") | null;
            /** Fields */
            fields: {
                [key: string]: string | null;
            };
            /** Error */
            error?: string | null;
        };
        /** FacilityCodeIn */
        FacilityCodeIn: {
            /**
             * Code Type
             * @enum {string}
             */
            code_type: "growing_area" | "packing_facility" | "establishment" | "other";
            /** Code */
            code: string;
        };
        /** FacilityCodeOut */
        FacilityCodeOut: {
            /** Code Type */
            code_type: string;
            /** Code */
            code: string;
        };
        /** FamilyOut */
        FamilyOut: {
            /** Family */
            family: string;
            /** Name Vi */
            name_vi: string;
            /** Name En */
            name_en: string;
            /** Products */
            products: string[];
        };
        /** FeedbackIn */
        FeedbackIn: {
            /** Was Helpful */
            was_helpful: boolean;
        };
        /** FilterOptions */
        FilterOptions: {
            /** Categories */
            categories: string[];
            /** Certificates */
            certificates: components["schemas"]["PublicCertificateOut"][];
            /** Service Categories */
            service_categories?: string[];
        };
        /**
         * FindingOut
         * @description Kết quả luật kiểm chéo (U22): cờ cho admin, gợi ý cho chủ hồ sơ (owner_visible).
         */
        FindingOut: {
            /** Code */
            code: string;
            /**
             * Severity
             * @enum {string}
             */
            severity: "info" | "warning";
            /** Owner Visible */
            owner_visible: boolean;
            /** Message Vi */
            message_vi: string;
            /** Message En */
            message_en: string;
        };
        /** FreightHintOut */
        FreightHintOut: {
            /** Container Type */
            container_type: string;
            /** Price Low */
            price_low: string;
            /** Price Typical */
            price_typical: string;
            /** Price High */
            price_high: string;
            /** Currency */
            currency: string;
            /** Source */
            source: string;
            /**
             * Valid Until
             * Format: date
             */
            valid_until: string;
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
        /** IdentityCheckIn */
        IdentityCheckIn: {
            /**
             * Check Type
             * @enum {string}
             */
            check_type: "registry_lookup" | "phone_callback" | "email_domain";
            /**
             * Result
             * @enum {string}
             */
            result: "match" | "mismatch" | "not_found" | "unchecked";
            /** Note */
            note?: string | null;
            registry?: components["schemas"]["RegistryFactsIn"] | null;
        };
        /** IdentityCheckOut */
        IdentityCheckOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Subject */
            subject: string;
            /** Check Type */
            check_type: string;
            /** Result */
            result: string;
            /** Facts */
            facts: {
                [key: string]: unknown;
            } | null;
            /** Note */
            note: string | null;
            /** Checked By */
            checked_by: string | null;
            /**
             * Checked At
             * Format: date-time
             */
            checked_at: string;
        };
        /** ImportResult */
        ImportResult: {
            /** Created */
            created: number;
            /** Updated */
            updated: number;
            /** Unchanged */
            unchanged: number;
            /** Dry Run */
            dry_run: boolean;
            /** Applied */
            applied: boolean;
            /** Errors */
            errors: components["schemas"]["RowError"][];
        };
        /**
         * Incoterm
         * @description Incoterms 2020 (11 điều kiện của ICC). Danh sách áp dụng do PO chốt.
         * @enum {string}
         */
        Incoterm: "EXW" | "FCA" | "FAS" | "FOB" | "CFR" | "CIF" | "CPT" | "CIP" | "DAP" | "DPU" | "DDP";
        /** InsuranceHintOut */
        InsuranceHintOut: {
            /** Rate Percent */
            rate_percent: string;
            /** Basis */
            basis: string;
            /** Source */
            source: string;
        };
        /**
         * InvoiceInfo
         * @description Thông tin xuất hoá đơn VAT (xuất ngoài hệ thống, ADR-0005). Tuỳ chọn.
         */
        InvoiceInfo: {
            /** Company Name */
            company_name?: string | null;
            /** Tax Code */
            tax_code?: string | null;
            /** Address */
            address?: string | null;
            /** Email */
            email?: string | null;
        };
        /** JourneyOut */
        JourneyOut: {
            /** Next Step */
            next_step: string | null;
            /** Steps */
            steps: components["schemas"]["JourneyStepOut"][];
            /** Product Done */
            product_done: number;
            /** Product Total */
            product_total: number;
            /** Sales Done */
            sales_done: number;
            /** Sales Total */
            sales_total: number;
        };
        /** JourneyStepOut */
        JourneyStepOut: {
            /** Key */
            key: string;
            /** Track */
            track: string;
            /** Done */
            done: boolean;
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
        /** ManualCheckIn */
        ManualCheckIn: {
            /**
             * Check Code
             * @enum {string}
             */
            check_code: "national_registry" | "company_registry" | "certificate_issuer" | "factory_video" | "other";
            /**
             * Status
             * @enum {string}
             */
            status: "pass" | "fail" | "warning";
            /** Note */
            note: string;
            /** Url */
            url?: string | null;
        };
        /** MarketOut */
        MarketOut: {
            /** Country */
            country: string;
            /** Score */
            score: string;
            /** Import Value */
            import_value: string;
            /** Import Cagr */
            import_cagr: string | null;
            /** Vn Value */
            vn_value: string;
            /** Vn Share */
            vn_share: string;
            /** Vn Cagr */
            vn_cagr: string | null;
            /** World Unit Price */
            world_unit_price: string | null;
            /** Vn Unit Price */
            vn_unit_price: string | null;
            /** Reasons */
            reasons?: components["schemas"]["ReasonOut"][];
        };
        /** MarketRecommendationOut */
        MarketRecommendationOut: {
            /**
             * Status
             * @enum {string}
             */
            status: "ok" | "no_data";
            /** Query */
            query: string;
            family: components["schemas"]["FamilyOut"] | null;
            /** Year */
            year: number | null;
            /** Source */
            source: string;
            /** Retrieved At */
            retrieved_at: string | null;
            /** Top Markets */
            top_markets: components["schemas"]["MarketOut"][];
            /** Potential Markets */
            potential_markets: components["schemas"]["MarketOut"][];
            /** Countries */
            countries: components["schemas"]["MarketOut"][];
            /** Competitors */
            competitors: components["schemas"]["CompetitorOut"][];
            /** Vn Extra Eu Share */
            vn_extra_eu_share: string | null;
            /** Vn Rank */
            vn_rank: number | null;
            /** Hhi */
            hhi: string | null;
            /** Weights */
            weights: {
                [key: string]: string;
            };
            /** Suggestions */
            suggestions?: components["schemas"]["FamilyOut"][];
        };
        /** MarketRowOut */
        MarketRowOut: {
            /** Country */
            country: string;
            /**
             * Status
             * @enum {string}
             */
            status: "ranked" | "no_data";
            /** Rank */
            rank: number | null;
            /** Duty */
            duty: string | null;
            /** Vat Rate */
            vat_rate: string | null;
            /** Vat */
            vat: string | null;
            /** Total */
            total: string | null;
            /** Label Languages */
            label_languages: string | null;
            /** Note */
            note: string | null;
            /** Note En */
            note_en: string | null;
        };
        /**
         * MarketsIn
         * @description Số tiền nhận dạng CHUỖI JSON (không nhận số). roo_status lấy từ máy tính xuất xứ.
         */
        MarketsIn: {
            /** Hs Code */
            hs_code: string;
            /** Product Value */
            product_value: number | string;
            /** Roo Status */
            roo_status?: ("pass" | "fail" | "inconclusive") | null;
        };
        /** MarketsOut */
        MarketsOut: {
            /** Check Id */
            check_id: string;
            /**
             * Status
             * @enum {string}
             */
            status: "ok" | "unsupported" | "needs_review";
            /** Basis */
            basis: ("evfta" | "mfn") | null;
            /** Hs Code */
            hs_code: string;
            /** Hs Formatted */
            hs_formatted: string;
            /** Product Value */
            product_value: string;
            /** Duty Rate */
            duty_rate: string | null;
            /** Rows */
            rows: components["schemas"]["MarketRowOut"][];
        };
        /** MaterialIn */
        MaterialIn: {
            /** Origin Country */
            origin_country: string;
            /** Value */
            value: number | string;
            /** Hs Code */
            hs_code?: string | null;
        };
        /** MePatch */
        MePatch: {
            /** Preferred Language */
            preferred_language?: ("vi" | "en") | null;
            /** Phone */
            phone?: string | null;
        };
        /** MessageIn */
        MessageIn: {
            /** Body */
            body: string;
        };
        /** MessageOut */
        MessageOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Conversation Id
             * Format: uuid
             */
            conversation_id: string;
            /**
             * Sender Company Id
             * Format: uuid
             */
            sender_company_id: string;
            /** Mine */
            mine: boolean;
            /** Body */
            body: string;
            /** Body Original */
            body_original: string;
            /** Translated */
            translated: boolean;
            /** Original Language */
            original_language: string;
            /** Translated Language */
            translated_language: string | null;
            /**
             * Sent At
             * Format: date-time
             */
            sent_at: string;
            /** Read At */
            read_at: string | null;
        };
        /** MissingItem */
        MissingItem: {
            /** Field */
            field: string;
            /** Group */
            group: string;
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
        /** NotificationOut */
        NotificationOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            type: components["schemas"]["NotificationType"];
            /** Payload */
            payload: {
                [key: string]: unknown;
            };
            /** Link */
            link: string;
            /** Is Read */
            is_read: boolean;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /**
         * NotificationType
         * @description Năm loại của spec §4.9 (RFQ và tin nhắn do F1/F2 tạo; báo giá U8 dùng loại rfq) cùng ba loại
         *     của bản nâng cấp: ai đã xem hồ sơ (U9), cảnh báo ngành (U14), đơn hàng (U19).
         * @enum {string}
         */
        NotificationType: "message" | "rfq" | "verification_status" | "new_match" | "expiry_alert" | "profile_viewed" | "sector_alert" | "order" | "reengagement";
        /** OrderDecisionIn */
        OrderDecisionIn: {
            /** Note */
            note?: string | null;
        };
        /** OrderIn */
        OrderIn: {
            /** Item Code */
            item_code: string;
            invoice_info?: components["schemas"]["InvoiceInfo"];
        };
        /** OrderOut */
        OrderOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Item Code */
            item_code: string;
            /** Item Name Vi */
            item_name_vi: string;
            /** Item Name En */
            item_name_en: string;
            /** Feature */
            feature: string;
            /** Amount */
            amount: string;
            /** Currency */
            currency: string;
            /** Reference */
            reference: string;
            /**
             * Status
             * @enum {string}
             */
            status: "pending" | "paid" | "cancelled";
            /** Invoice Info */
            invoice_info: {
                [key: string]: string | null;
            };
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Paid At */
            paid_at: string | null;
            /** Cancelled At */
            cancelled_at: string | null;
            bank_transfer: components["schemas"]["BankTransferOut"] | null;
        };
        /**
         * OriginIn
         * @description Câu trả lời cho máy tính xuất xứ. Trường bỏ trống = chưa trả lời (→ inconclusive).
         */
        OriginIn: {
            /** Hs Code */
            hs_code: string;
            /** Consignment Value Eur */
            consignment_value_eur?: number | string | null;
            /** Transit Third Country */
            transit_third_country?: boolean | null;
            /** Transit Handling */
            transit_handling?: ("STORAGE_UNDER_CUSTOMS" | "PROCESSED") | null;
            /** Only Article6 Operations */
            only_article6_operations?: boolean | null;
            /** Sourcing */
            sourcing?: ("FARMED_IN_VN" | "CAUGHT_IN_VN_TERRITORIAL_SEA" | "CAUGHT_BY_VESSEL" | "IMPORTED") | null;
            /** Vessel Registered Vn Eu */
            vessel_registered_vn_eu?: boolean | null;
            /** Vessel Flag Vn Eu */
            vessel_flag_vn_eu?: boolean | null;
            /** Vessel Ownership Pct */
            vessel_ownership_pct?: number | string | null;
            /** Materials Outside Territorial Sea */
            materials_outside_territorial_sea?: boolean | null;
            /** Restricted Nonorig Pct Weight */
            restricted_nonorig_pct_weight?: number | string | null;
            /** Restricted Nonorig Pct Value */
            restricted_nonorig_pct_value?: number | string | null;
            /** Sugar Pct Weight */
            sugar_pct_weight?: number | string | null;
            /** Raw Material Source */
            raw_material_source?: ("AQUACULTURE" | "WILD_CAUGHT" | "GROWN") | null;
            /** Is Fresh */
            is_fresh?: boolean | null;
        };
        /** OriginInputOut */
        OriginInputOut: {
            /** Name */
            name: string;
            /**
             * Kind
             * @enum {string}
             */
            kind: "boolean" | "percent" | "enum";
            /** Options */
            options: string[];
            /** Required If */
            required_if: string | null;
        };
        /** OriginOut */
        OriginOut: {
            /** Check Id */
            check_id: string;
            /**
             * Status
             * @enum {string}
             */
            status: "pass" | "fail" | "inconclusive" | "unsupported";
            /** Reasons */
            reasons: components["schemas"]["OriginReasonOut"][];
            /** Inputs Missing */
            inputs_missing: string[];
            /** Additional Evidence */
            additional_evidence: string[];
            required_evidence?: components["schemas"]["RequiredEvidenceOut"] | null;
            /** Hs Code */
            hs_code: string;
            /** Hs Formatted */
            hs_formatted: string;
            /** Rule Type */
            rule_type: string | null;
            /** Rule Text Vi */
            rule_text_vi: string | null;
            /** Rule Text En */
            rule_text_en: string | null;
            /** Insufficient Operations Vi */
            insufficient_operations_vi: string | null;
            /** Tolerance Note Vi */
            tolerance_note_vi: string | null;
            /** Risk Note Vi */
            risk_note_vi: string | null;
            /** Requires Expert */
            requires_expert: boolean;
            /** Preference Applicable */
            preference_applicable: boolean;
            /** Savings */
            savings: string | null;
            /**
             * Review State
             * @enum {string}
             */
            review_state: "REVIEWED" | "UNREVIEWED";
            /** Unreviewed Components */
            unreviewed_components: string[];
            /** Disclaimer */
            disclaimer: string | null;
        };
        /** OriginQuestionOut */
        OriginQuestionOut: {
            /** Order */
            order: number;
            /** Text Vi */
            text_vi: string;
            /** Text En */
            text_en: string | null;
        };
        /**
         * OriginQuestionsOut
         * @description Câu hỏi hiển thị + các trường trả lời theo rule_type. `unsupported` thì không có gì.
         */
        OriginQuestionsOut: {
            /**
             * Status
             * @enum {string}
             */
            status: "ok" | "unsupported";
            /** Hs Code */
            hs_code: string;
            /** Hs Formatted */
            hs_formatted: string;
            /** Rule Type */
            rule_type: string | null;
            /** Requires Expert */
            requires_expert: boolean;
            /** Questions */
            questions: components["schemas"]["OriginQuestionOut"][];
            /** Inputs */
            inputs: components["schemas"]["OriginInputOut"][];
            /**
             * Review State
             * @enum {string}
             */
            review_state: "REVIEWED" | "UNREVIEWED";
            /** Unreviewed Components */
            unreviewed_components: string[];
            /** Disclaimer */
            disclaimer: string | null;
        };
        /** OriginReasonOut */
        OriginReasonOut: {
            /** Code */
            code: string;
            /** Vi */
            vi: string;
            /** En */
            en: string;
        };
        /** PackagingIn */
        PackagingIn: {
            /** Pack Size */
            pack_size: number | string;
            /**
             * Pack Unit
             * @enum {string}
             */
            pack_unit: "g" | "kg" | "tonne" | "ml" | "liter" | "piece";
            /**
             * Pack Type
             * @enum {string}
             */
            pack_type: "bag" | "sack" | "carton" | "box" | "can" | "bottle" | "jar" | "bulk" | "other";
            /**
             * Channel
             * @default any
             * @enum {string}
             */
            channel?: "horeca" | "retail" | "industrial" | "any";
        };
        /** PackagingOut */
        PackagingOut: {
            /** Pack Size */
            pack_size: string;
            /** Pack Unit */
            pack_unit: string;
            /** Pack Type */
            pack_type: string;
            /** Channel */
            channel: string;
        };
        /** PresignIn */
        PresignIn: {
            /**
             * Purpose
             * @enum {string}
             */
            purpose: "logo" | "product_image" | "evidence";
            /**
             * Content Type
             * @enum {string}
             */
            content_type: "image/png" | "image/jpeg" | "image/webp" | "application/pdf";
        };
        /** PresignOut */
        PresignOut: {
            /** Upload Url */
            upload_url: string;
            /** Key */
            key: string;
        };
        /** PricePointOut */
        PricePointOut: {
            /** Partner */
            partner: string;
            /** Unit Price */
            unit_price: string;
            /** Value */
            value: string;
        };
        /**
         * PriceReferenceOut
         * @description Đơn giá nhập khẩu vào EU (EUR/kg) — CHỈ THAM KHẢO, không phải giá sàn hay giá chống bán
         *     phá giá.
         */
        PriceReferenceOut: {
            /**
             * Status
             * @enum {string}
             */
            status: "ok" | "no_data";
            /** Hs Code */
            hs_code: string;
            /** Year */
            year: number | null;
            /** Source */
            source: string;
            vietnam: components["schemas"]["PricePointOut"] | null;
            extra_eu_average: components["schemas"]["PricePointOut"] | null;
            /** Competitors */
            competitors?: components["schemas"]["PricePointOut"][];
        };
        /**
         * PriceTierIn
         * @description Từ min_quantity (cùng đơn vị với MOQ) trở lên thì đơn giá là unit_price (theo đơn vị giá).
         */
        PriceTierIn: {
            /** Min Quantity */
            min_quantity: number | string;
            /** Unit Price */
            unit_price: number | string;
        };
        /** PriceTierOut */
        PriceTierOut: {
            /** Min Quantity */
            min_quantity: string;
            /** Unit Price */
            unit_price: string;
        };
        /** PriorityProductOut */
        PriorityProductOut: {
            /** Hs Code */
            hs_code: string;
            /** Family */
            family: string;
            /** Name Vi */
            name_vi: string;
            /** Name En */
            name_en: string;
            /** Keywords */
            keywords: string[];
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
            /** Brand Model */
            brand_model?: ("oem" | "own_brand" | "both") | null;
            /** Description Source Lang */
            description_source_lang?: ("vi" | "en") | null;
            /** Packagings */
            packagings?: components["schemas"]["PackagingIn"][];
            /** Price Tiers */
            price_tiers?: components["schemas"]["PriceTierIn"][];
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
            /** Brand Model */
            brand_model?: string | null;
            /** Description Source Lang */
            description_source_lang?: string | null;
            /**
             * Description Vi Machine
             * @default false
             */
            description_vi_machine?: boolean;
            /**
             * Description En Machine
             * @default false
             */
            description_en_machine?: boolean;
            /** Packagings */
            packagings?: components["schemas"]["PackagingOut"][];
            /** Price Tiers */
            price_tiers?: components["schemas"]["PriceTierOut"][];
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
            /** Brand Model */
            brand_model?: ("oem" | "own_brand" | "both") | null;
            /** Description Source Lang */
            description_source_lang?: ("vi" | "en") | null;
            /** Packagings */
            packagings?: components["schemas"]["PackagingIn"][] | null;
            /** Price Tiers */
            price_tiers?: components["schemas"]["PriceTierIn"][] | null;
        };
        /** ProductRequirementsOut */
        ProductRequirementsOut: {
            /** Hs Code */
            hs_code: string;
            /** Hs Formatted */
            hs_formatted: string;
            /** Name Vi */
            name_vi: string;
            /** Name En */
            name_en: string;
            /** Items */
            items: components["schemas"]["EvidenceItemOut"][];
        };
        /** ProductSubtypeIn */
        ProductSubtypeIn: {
            /** Code */
            code: string;
            /** Hs Prefix */
            hs_prefix: string;
            /** Name Vi */
            name_vi: string;
            /** Name En */
            name_en: string;
            /** Description Vi */
            description_vi?: string | null;
            /** Description En */
            description_en?: string | null;
            /** Source */
            source?: string | null;
        };
        /** ProductSubtypeOut */
        ProductSubtypeOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Code */
            code: string;
            /** Hs Prefix */
            hs_prefix: string;
            /** Name Vi */
            name_vi: string;
            /** Name En */
            name_en: string;
            /** Description Vi */
            description_vi: string | null;
            /** Description En */
            description_en: string | null;
            /** Source */
            source: string | null;
            /** Is Demo */
            is_demo: boolean;
            /** Reviewed By */
            reviewed_by: string | null;
            /** Reviewed At */
            reviewed_at: string | null;
        };
        /** ProductSubtypePatch */
        ProductSubtypePatch: {
            /** Hs Prefix */
            hs_prefix?: string | null;
            /** Name Vi */
            name_vi?: string | null;
            /** Name En */
            name_en?: string | null;
            /** Description Vi */
            description_vi?: string | null;
            /** Description En */
            description_en?: string | null;
            /** Source */
            source?: string | null;
        };
        /**
         * ProfileViewerOut
         * @description Một buyer đã xác minh (không ẩn danh) đã xem hồ sơ trong khoảng thời gian.
         */
        ProfileViewerOut: {
            /** Legal Name */
            legal_name: string;
            /** Country */
            country: string;
            /** Business Type */
            business_type: string | null;
            /** Views */
            views: number;
            /**
             * Last Viewed At
             * Format: date-time
             */
            last_viewed_at: string;
        };
        /**
         * ProfileViewersOut
         * @description U9 "ai đã xem hồ sơ": tên chỉ hiện với buyer đã xác minh, không bật ẩn danh; còn lại đếm.
         */
        ProfileViewersOut: {
            /** Days */
            days: number;
            /** Total Views */
            total_views: number;
            /** Guest Views */
            guest_views: number;
            /** Anonymous Company Views */
            anonymous_company_views: number;
            /** Viewers */
            viewers: components["schemas"]["ProfileViewerOut"][];
            /**
             * Full
             * @default true
             */
            full?: boolean;
            /**
             * Hidden Viewers
             * @default 0
             */
            hidden_viewers?: number;
        };
        /** ProfileViewsData */
        ProfileViewsData: {
            /** This Week */
            this_week: number;
            /** Previous Week */
            previous_week: number;
        };
        /** ProfileViewsTile */
        ProfileViewsTile: {
            data: components["schemas"]["ProfileViewsData"] | null;
            /** Empty Hint Key */
            empty_hint_key?: string | null;
        };
        /**
         * PublicCertificateOut
         * @description Loại chứng nhận có thể lọc công khai trong danh bạ.
         */
        PublicCertificateOut: {
            /** Code */
            code: string;
            /** Name Vi */
            name_vi: string;
            /** Name En */
            name_en: string;
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
            /**
             * Verification Tier
             * @default 1
             */
            verification_tier?: number;
            /**
             * Offering Type
             * @default products
             * @enum {string}
             */
            offering_type?: "products" | "services" | "both";
            /** City */
            city?: string | null;
            /** Company Size */
            company_size?: string | null;
            /** Capacity Value */
            capacity_value?: string | null;
            /** Capacity Unit */
            capacity_unit?: string | null;
            /** Capacity Period */
            capacity_period?: string | null;
            /** Facility Codes */
            facility_codes?: components["schemas"]["FacilityCodeOut"][];
            /**
             * Location Public
             * @default false
             */
            location_public?: boolean;
            /** Factory Address */
            factory_address?: string | null;
            /** Latitude */
            latitude?: string | null;
            /** Longitude */
            longitude?: string | null;
            /** Services */
            services?: components["schemas"]["ServiceOfferingOut"][];
        };
        /**
         * PublicProductOut
         * @description Sản phẩm trên hồ sơ công khai — không lộ trạng thái duyệt hay khóa ảnh. `id` cần để buyer
         *     gắn RFQ (F1); id sản phẩm không nhạy cảm, còn id công ty vẫn không lộ.
         */
        PublicProductOut: {
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
            /** Images */
            images: string[];
            /** Brand Model */
            brand_model?: string | null;
            /**
             * Description Vi Machine
             * @default false
             */
            description_vi_machine?: boolean;
            /**
             * Description En Machine
             * @default false
             */
            description_en_machine?: boolean;
            /** Packagings */
            packagings?: components["schemas"]["PackagingOut"][];
            /** Price Tiers */
            price_tiers?: components["schemas"]["PriceTierOut"][];
        };
        /** QuestionBrief */
        QuestionBrief: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Question */
            question: string;
            /** Confidence */
            confidence: string;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /** QueueItem */
        QueueItem: {
            /**
             * Request Id
             * Format: uuid
             */
            request_id: string;
            /**
             * Company Id
             * Format: uuid
             */
            company_id: string;
            /** Legal Name */
            legal_name: string;
            /** Tax Id */
            tax_id: string | null;
            /** Country */
            country: string;
            /**
             * Submitted At
             * Format: date-time
             */
            submitted_at: string;
            /** Evidences */
            evidences: components["schemas"]["EvidenceOut"][];
            company: components["schemas"]["CompanyOut"];
            /** Products */
            products: components["schemas"]["ReviewProductOut"][];
            /**
             * Target Tier
             * @default 1
             */
            target_tier?: number;
            /**
             * Current Tier
             * @default 0
             */
            current_tier?: number;
            /** Tier Requirements */
            tier_requirements?: components["schemas"]["TierRequirementOut"][];
            /** Checks */
            checks?: components["schemas"]["CheckOut"][];
            /** Findings */
            findings?: components["schemas"]["FindingOut"][];
            /**
             * Signals
             * @default []
             */
            signals?: components["schemas"]["SignalOut"][];
            /**
             * Ownership Proven
             * @default false
             */
            ownership_proven?: boolean;
        };
        /**
         * QuotaBalanceIn
         * @description Khối lượng đã dùng tại một ngày; ngày và nguồn bắt buộc (số liệu thực tế).
         */
        QuotaBalanceIn: {
            /**
             * As Of
             * Format: date
             */
            as_of: string;
            /** Used Volume */
            used_volume: number | string;
            /** Source */
            source: string;
        };
        /** QuotaBalanceOut */
        QuotaBalanceOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Quota Id
             * Format: uuid
             */
            quota_id: string;
            /**
             * As Of
             * Format: date
             */
            as_of: string;
            /** Used Volume */
            used_volume: string;
            /** Source */
            source: string;
            /** Entered By */
            entered_by: string | null;
        };
        /**
         * QuotaBalanceStateOut
         * @description Số dư hạn ngạch. status = unknown khi chưa có số liệu: KHÔNG được hiểu là còn hạn ngạch.
         */
        QuotaBalanceStateOut: {
            /**
             * Status
             * @enum {string}
             */
            status: "unknown" | "open" | "low" | "exhausted";
            /** As Of */
            as_of?: string | null;
            /** Used */
            used?: string | null;
            /** Remaining */
            remaining?: string | null;
            /** Remaining Pct */
            remaining_pct?: string | null;
            /**
             * Stale
             * @default false
             */
            stale?: boolean;
            /** Source */
            source?: string | null;
        };
        /**
         * QuotaEconomicsOut
         * @description Giá trị kinh tế của hạn ngạch cho lô hàng và điểm hòa vốn so với chi phí người dùng nhập.
         */
        QuotaEconomicsOut: {
            /** Savings */
            savings: string;
            /** Savings Per Unit */
            savings_per_unit: string | null;
            /** Savings Pct Of Value */
            savings_pct_of_value: string;
            /** Access Cost */
            access_cost: string | null;
            /** Net Benefit */
            net_benefit: string | null;
            /** Worthwhile */
            worthwhile: boolean | null;
        };
        /**
         * QuotaInfoOut
         * @description Thông tin hạn ngạch đã duyệt (hiển thị kèm kịch bản).
         */
        QuotaInfoOut: {
            /** Quota Code */
            quota_code: string | null;
            /** Quota Year */
            quota_year: number | null;
            /** Volume */
            volume: string;
            /** Volume Unit */
            volume_unit: string;
            /** Specific Unit */
            specific_unit: string | null;
            /** Licence Note Vi */
            licence_note_vi: string | null;
            /** Licence Note En */
            licence_note_en: string | null;
            /** Allocation Note Vi */
            allocation_note_vi: string | null;
            /** Allocation Note En */
            allocation_note_en: string | null;
            /** Source Url */
            source_url: string | null;
            /** Period Start */
            period_start?: string | null;
            /** Period End */
            period_end?: string | null;
            /** Days Left */
            days_left?: number | null;
            /** In Period */
            in_period?: boolean | null;
            /** Allocation Method */
            allocation_method?: string | null;
            /**
             * Licence Required
             * @default false
             */
            licence_required?: boolean;
            /** Licence Issuer Vi */
            licence_issuer_vi?: string | null;
            balance?: components["schemas"]["QuotaBalanceStateOut"] | null;
            /** Share Pct */
            share_pct?: string | null;
            economics?: components["schemas"]["QuotaEconomicsOut"] | null;
        };
        /** QuoteDecisionIn */
        QuoteDecisionIn: {
            /**
             * Decision
             * @enum {string}
             */
            decision: "accept" | "decline";
            /** Reason */
            reason?: string | null;
        };
        /**
         * QuoteIn
         * @description Seller báo giá: đơn giá, Incoterm, đặt cọc %, điều khoản phần còn lại, thời gian giao và
         *     hiệu lực. quantity / unit bỏ trống thì lấy theo RFQ.
         */
        QuoteIn: {
            /** Unit Price */
            unit_price: number | string;
            /**
             * Currency
             * @default EUR
             */
            currency?: string;
            /** Quantity */
            quantity?: number | string | null;
            /** Unit */
            unit?: string | null;
            incoterm: components["schemas"]["Incoterm"];
            /** Named Place */
            named_place?: string | null;
            /** Deposit Percent */
            deposit_percent: number;
            balance_terms: components["schemas"]["BalanceTerms"];
            /** Lead Time Days */
            lead_time_days: number;
            /**
             * Valid Until
             * Format: date
             */
            valid_until: string;
            /** Notes */
            notes?: string | null;
        };
        /** QuoteOut */
        QuoteOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Rfq Id
             * Format: uuid
             */
            rfq_id: string;
            /** Unit Price */
            unit_price: string;
            /** Currency */
            currency: string;
            /** Quantity */
            quantity: string;
            /** Unit */
            unit: string;
            /** Total Amount */
            total_amount: string;
            /** Deposit Percent */
            deposit_percent: number;
            /** Deposit Amount */
            deposit_amount: string;
            balance_terms: components["schemas"]["BalanceTerms"];
            incoterm: components["schemas"]["Incoterm"];
            /** Named Place */
            named_place: string | null;
            /** Lead Time Days */
            lead_time_days: number;
            /**
             * Valid Until
             * Format: date
             */
            valid_until: string;
            /** Notes */
            notes: string | null;
            /** Status */
            status: string;
            /** Decision Reason */
            decision_reason: string | null;
            /** Decided At */
            decided_at: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /**
         * ReasonOut
         * @description Lý do bằng số: code để giao diện dựng câu, value/year là số đã tính từ thống kê.
         */
        ReasonOut: {
            /** Code */
            code: string;
            /** Value */
            value?: string | null;
            /** Year */
            year?: number | null;
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
         * RegistryFactsIn
         * @description Dữ kiện admin đọc từ sổ đăng ký chính thức. Tên người đại diện chỉ dùng để băm, không lưu.
         */
        RegistryFactsIn: {
            /** Legal Representative */
            legal_representative?: string | null;
            /** Founded Year */
            founded_year?: number | null;
            /**
             * Tax Status
             * @default unknown
             * @enum {string}
             */
            tax_status?: "active" | "inactive" | "unknown";
            /**
             * Name Changed Recently
             * @default false
             */
            name_changed_recently?: boolean;
            /**
             * Representative Changed Recently
             * @default false
             */
            representative_changed_recently?: boolean;
        };
        /**
         * ReportIn
         * @description Chọn sản phẩm của công ty (product_id) hoặc nhập tên/mã HS. Ngân sách là tuỳ chọn, dùng cho
         *     phần "OEM hay thương hiệu riêng".
         */
        ReportIn: {
            /** Product Id */
            product_id?: string | null;
            /**
             * Q
             * @default
             */
            q?: string;
            /** Hs */
            hs?: string | null;
            /**
             * Language
             * @default vi
             * @enum {string}
             */
            language?: "vi" | "en";
            /** Marketing Budget */
            marketing_budget?: number | string | null;
            /** Expected Revenue */
            expected_revenue?: number | string | null;
            /** Brand Model */
            brand_model?: ("oem" | "own_brand" | "both") | null;
        };
        /** ReportListItemOut */
        ReportListItemOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Query */
            query: string;
            /** Language */
            language: string;
            /**
             * Status
             * @enum {string}
             */
            status: "queued" | "running" | "ready" | "failed";
            /** Product Id */
            product_id: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Finished At */
            finished_at: string | null;
        };
        /**
         * ReportOut
         * @description full = công ty có quyền xem bản đầy đủ. Bản tóm tắt: chỉ phần summary/recommendations có
         *     lời văn, bảng đối thủ và file PDF bị khoá.
         */
        ReportOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Query */
            query: string;
            /** Language */
            language: string;
            /**
             * Status
             * @enum {string}
             */
            status: "queued" | "running" | "ready" | "failed";
            /** Product Id */
            product_id: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Finished At */
            finished_at: string | null;
            /** Full */
            full: boolean;
            /** Product Name */
            product_name?: string | null;
            /** Year */
            year?: number | null;
            /** Source */
            source?: string | null;
            /** Narrative Source */
            narrative_source?: ("model" | "template") | null;
            /** Tariff Data Status */
            tariff_data_status?: ("reviewed" | "demo_unreviewed") | null;
            /** Sections */
            sections?: components["schemas"]["ReportSectionOut"][];
            /** Top Markets */
            top_markets?: components["schemas"]["ReportTableRowOut"][];
            /** Potential Markets */
            potential_markets?: components["schemas"]["ReportTableRowOut"][];
            /** Competitors */
            competitors?: components["schemas"]["ReportTableRowOut"][];
            /** Pdf Url */
            pdf_url?: string | null;
            /** Error */
            error?: string | null;
        };
        /** ReportSectionOut */
        ReportSectionOut: {
            /** Key */
            key: string;
            /** Title */
            title: string;
            /** Text */
            text: string;
            /** Locked */
            locked: boolean;
        };
        /** ReportTableRowOut */
        ReportTableRowOut: {
            /** Country */
            country: string;
            /** Value */
            value: string;
            /** Share */
            share: string | null;
            /** Growth */
            growth?: string | null;
            /** Unit Price */
            unit_price?: string | null;
        };
        /**
         * RequiredEvidenceOut
         * @description Danh sách bằng chứng cho lô, sắp IMPORT → TARIFF_PREFERENCE → NONE. Có dòng chưa duyệt thì
         *     review_state = UNREVIEWED và disclaimer hiển thị ở đầu danh sách.
         */
        RequiredEvidenceOut: {
            /** Items */
            items: components["schemas"]["EvidenceItemOut"][];
            /**
             * Review State
             * @enum {string}
             */
            review_state: "REVIEWED" | "UNREVIEWED";
            /** Disclaimer */
            disclaimer: string | null;
        };
        /** ReturnVisitStats */
        ReturnVisitStats: {
            /** Weeks */
            weeks: components["schemas"]["WeekStat"][];
            /** Overall Ratio */
            overall_ratio: string | null;
            /** Target Ratio */
            target_ratio: string;
        };
        /**
         * ReviewIssueOut
         * @description Hàng đợi admin: dòng luật sư trả "SUA" (cần sửa), chưa được duyệt.
         */
        ReviewIssueOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Entity Type */
            entity_type: string;
            /** Entity Id */
            entity_id: string;
            /** Label */
            label: string;
            /** Note */
            note: string;
            /**
             * Created By
             * Format: uuid
             */
            created_by: string;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Resolved At */
            resolved_at: string | null;
        };
        /**
         * ReviewProductOut
         * @description Sản phẩm exporter đã khai, để admin đối chiếu khi duyệt xác minh (chỉ đọc).
         */
        ReviewProductOut: {
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
            hs_name_vi: string | null;
            /** Hs Name En */
            hs_name_en: string | null;
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
        };
        /** RfqBrief */
        RfqBrief: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Counterpart Name */
            counterpart_name: string;
            /** Product Name */
            product_name: string;
            /** Status */
            status: string;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /** RfqIn */
        RfqIn: {
            /**
             * Product Id
             * Format: uuid
             */
            product_id: string;
            /** Quantity */
            quantity: number | string;
            /** Unit */
            unit: string;
            /** Target Price */
            target_price?: number | string | null;
            /**
             * Currency
             * @default EUR
             */
            currency?: string;
            incoterms: components["schemas"]["Incoterm"];
            /** Destination Country */
            destination_country: string;
            /** Destination Port */
            destination_port?: string | null;
            /**
             * Required Date
             * Format: date
             */
            required_date: string;
            /** Message */
            message?: string | null;
        };
        /** RfqOut */
        RfqOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Product Id
             * Format: uuid
             */
            product_id: string;
            /** Product Name */
            product_name: string;
            /**
             * Buyer Company Id
             * Format: uuid
             */
            buyer_company_id: string;
            /** Buyer Name */
            buyer_name: string;
            /** Buyer Verified */
            buyer_verified: boolean;
            /**
             * Exporter Company Id
             * Format: uuid
             */
            exporter_company_id: string;
            /** Exporter Name */
            exporter_name: string;
            /** Quantity */
            quantity: string;
            /** Unit */
            unit: string;
            /** Target Price */
            target_price: string | null;
            /** Currency */
            currency: string;
            incoterms: components["schemas"]["Incoterm"];
            /** Destination Country */
            destination_country: string;
            /** Destination Port */
            destination_port: string | null;
            /**
             * Required Date
             * Format: date
             */
            required_date: string;
            /** Message */
            message: string | null;
            status: components["schemas"]["RfqStatus"];
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
         * RfqQuotaOut
         * @description Hạn mức RFQ 24 giờ của buyer (U6): buyer chưa xác minh vẫn gửi được, chỉ ít hơn.
         */
        RfqQuotaOut: {
            /** Limit */
            limit: number;
            /** Used */
            used: number;
            /** Remaining */
            remaining: number;
            /** Verified */
            verified: boolean;
        };
        /**
         * RfqStatus
         * @enum {string}
         */
        RfqStatus: "new" | "viewed" | "quoted" | "closed";
        /** RfqStatusIn */
        RfqStatusIn: {
            status: components["schemas"]["RfqStatus"];
        };
        /** RfqTile */
        RfqTile: {
            data: components["schemas"]["RfqTileData"] | null;
            /** Empty Hint Key */
            empty_hint_key?: string | null;
        };
        /** RfqTileData */
        RfqTileData: {
            /** Counts */
            counts: {
                [key: string]: number;
            };
            /** Total */
            total: number;
            /** New This Week */
            new_this_week: number;
            /** Recent */
            recent: components["schemas"]["RfqBrief"][];
        };
        /**
         * RooIn
         * @description Xuất xứ hàng Việt Nam xuất sang EU. Mọi số tiền cùng một đơn vị tiền tệ, là CHUỖI JSON.
         */
        RooIn: {
            /** Hs Code */
            hs_code: string;
            /** Ex Works Value */
            ex_works_value?: number | string | null;
            /** Materials Declared */
            materials_declared: boolean;
            /** Materials */
            materials?: components["schemas"]["MaterialIn"][];
        };
        /** RooOut */
        RooOut: {
            /** Check Id */
            check_id: string;
            /**
             * Status
             * @enum {string}
             */
            status: "pass" | "fail" | "inconclusive" | "unsupported";
            /** Reason */
            reason: string | null;
            /** Hs Code */
            hs_code: string;
            /** Hs Formatted */
            hs_formatted: string;
            /** Ex Works Value */
            ex_works_value: string | null;
            /** Nom Pct */
            nom_pct: string | null;
            /** Rvc Pct */
            rvc_pct: string | null;
            /** Rule Type */
            rule_type: string | null;
            /** Threshold Pct */
            threshold_pct: string | null;
            /** Rule Text */
            rule_text: string | null;
            /** Source */
            source: string | null;
        };
        /** RooRuleIn */
        RooRuleIn: {
            /** Hs Code */
            hs_code: string;
            rule_type: components["schemas"]["RuleType"];
            /** Threshold Pct */
            threshold_pct?: number | string | null;
            /** Rule Text */
            rule_text?: string | null;
            /**
             * Requires Expert
             * @default false
             */
            requires_expert?: boolean;
            /** Source */
            source?: string | null;
            /**
             * Valid From
             * Format: date
             */
            valid_from: string;
            /** Valid Until */
            valid_until?: string | null;
        };
        /** RooRuleOut */
        RooRuleOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Hs Code */
            hs_code: string;
            rule_type: components["schemas"]["RuleType"];
            /** Threshold Pct */
            threshold_pct: string | null;
            /** Rule Text */
            rule_text: string | null;
            /** Requires Expert */
            requires_expert: boolean;
            /** Source */
            source: string | null;
            /**
             * Valid From
             * Format: date
             */
            valid_from: string;
            /** Valid Until */
            valid_until: string | null;
            /** Reviewed By */
            reviewed_by: string | null;
            /** Reviewed At */
            reviewed_at: string | null;
        };
        /** RooRulePatch */
        RooRulePatch: {
            /** Hs Code */
            hs_code?: string | null;
            rule_type?: components["schemas"]["RuleType"] | null;
            /** Threshold Pct */
            threshold_pct?: number | string | null;
            /** Rule Text */
            rule_text?: string | null;
            /** Requires Expert */
            requires_expert?: boolean | null;
            /** Source */
            source?: string | null;
            /** Valid From */
            valid_from?: string | null;
            /** Valid Until */
            valid_until?: string | null;
        };
        /** RowError */
        RowError: {
            /** Row */
            row: number;
            /** Message */
            message: string;
        };
        /** RuleIn */
        RuleIn: {
            /** Category */
            category: string;
            /** Evidence Type Code */
            evidence_type_code: string;
            /**
             * Is Required
             * @default true
             */
            is_required?: boolean;
            /** Note */
            note?: string | null;
        };
        /** RuleOut */
        RuleOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Category */
            category: string;
            /** Evidence Type Code */
            evidence_type_code: string;
            /** Is Required */
            is_required: boolean;
            /** Note */
            note: string | null;
            /** Reviewed By */
            reviewed_by: string | null;
            /** Reviewed At */
            reviewed_at: string | null;
        };
        /** RulePatch */
        RulePatch: {
            /** Category */
            category?: string | null;
            /** Evidence Type Code */
            evidence_type_code?: string | null;
            /** Is Required */
            is_required?: boolean | null;
            /** Note */
            note?: string | null;
        };
        /**
         * RuleType
         * @enum {string}
         */
        RuleType: "WO" | "CTH" | "MaxNOM" | "CTH_OR_MaxNOM" | "WO_PRODUCT" | "WO_PRODUCT_VESSEL" | "WO_MATERIALS" | "WO_MATERIALS_VESSEL" | "WO_MATERIALS_TOLERANCE" | "WO_MATERIALS_SUGAR_CAP";
        /**
         * SavedSearchTile
         * @description Tìm kiếm đã lưu là P1 (K1); chưa có thì ô hướng dẫn thay vì để trống.
         */
        SavedSearchTile: {
            /** Data */
            data: string[];
            /** Empty Hint Key */
            empty_hint_key?: string | null;
        };
        /** SavingsData */
        SavingsData: {
            /** Total Eur */
            total_eur: string;
            /** Runs */
            runs: number;
        };
        /** SavingsTile */
        SavingsTile: {
            data: components["schemas"]["SavingsData"] | null;
            /** Empty Hint Key */
            empty_hint_key?: string | null;
        };
        /** ScenarioOut */
        ScenarioOut: {
            /**
             * Kind
             * @enum {string}
             */
            kind: "in_quota" | "out_of_quota";
            /**
             * Duty Type
             * @enum {string}
             */
            duty_type: "ad_valorem" | "specific" | "mixed";
            /** Rate */
            rate: string | null;
            /** Specific */
            specific: string | null;
            /** Duty */
            duty: string;
        };
        /** SectorAlertIn */
        SectorAlertIn: {
            /** Code */
            code: string;
            /** Hs Prefixes */
            hs_prefixes: string[];
            /**
             * Severity
             * @default warning
             * @enum {string}
             */
            severity?: "info" | "warning" | "critical";
            /** Title Vi */
            title_vi: string;
            /** Title En */
            title_en: string;
            /** Body Vi */
            body_vi?: string | null;
            /** Body En */
            body_en?: string | null;
            /** Source Url */
            source_url?: string | null;
            /**
             * Valid From
             * Format: date
             */
            valid_from: string;
            /** Valid Until */
            valid_until?: string | null;
        };
        /**
         * SectorAlertOut
         * @description Cảnh báo ngành áp cho mã HS (U14). data_status = demo_unreviewed với dữ liệu minh hoạ.
         */
        SectorAlertOut: {
            /** Code */
            code: string;
            /**
             * Severity
             * @enum {string}
             */
            severity: "info" | "warning" | "critical";
            /** Title Vi */
            title_vi: string;
            /** Title En */
            title_en: string;
            /** Body Vi */
            body_vi: string | null;
            /** Body En */
            body_en: string | null;
            /** Source Url */
            source_url: string | null;
            /**
             * Data Status
             * @enum {string}
             */
            data_status: "reviewed" | "demo_unreviewed";
        };
        /** SectorAlertPatch */
        SectorAlertPatch: {
            /** Hs Prefixes */
            hs_prefixes?: string[] | null;
            /** Severity */
            severity?: ("info" | "warning" | "critical") | null;
            /** Title Vi */
            title_vi?: string | null;
            /** Title En */
            title_en?: string | null;
            /** Body Vi */
            body_vi?: string | null;
            /** Body En */
            body_en?: string | null;
            /** Source Url */
            source_url?: string | null;
            /** Valid From */
            valid_from?: string | null;
            /** Valid Until */
            valid_until?: string | null;
        };
        /** ServiceOfferingIn */
        ServiceOfferingIn: {
            /** Category Code */
            category_code: string;
            /** Title */
            title: string;
            /** Description Vi */
            description_vi?: string | null;
            /** Description En */
            description_en?: string | null;
            /** Coverage Countries */
            coverage_countries?: string[];
            /**
             * Is Active
             * @default true
             */
            is_active?: boolean;
        };
        /** ServiceOfferingOut */
        ServiceOfferingOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Category Code */
            category_code: string;
            /** Category Name Vi */
            category_name_vi: string;
            /** Category Name En */
            category_name_en: string;
            /** Title */
            title: string;
            /** Description Vi */
            description_vi: string | null;
            /** Description En */
            description_en: string | null;
            /** Coverage Countries */
            coverage_countries: string[];
            /** Is Active */
            is_active: boolean;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /** ServiceOfferingPatch */
        ServiceOfferingPatch: {
            /** Category Code */
            category_code?: string | null;
            /** Title */
            title?: string | null;
            /** Description Vi */
            description_vi?: string | null;
            /** Description En */
            description_en?: string | null;
            /** Coverage Countries */
            coverage_countries?: string[] | null;
            /** Is Active */
            is_active?: boolean | null;
        };
        /**
         * ShippingHintsOut
         * @description N6a: giá tham khảo đã duyệt và còn hạn. Không có dòng nào thì rỗng/None, không đoán.
         */
        ShippingHintsOut: {
            /** Freight */
            freight: components["schemas"]["FreightHintOut"][];
            insurance: components["schemas"]["InsuranceHintOut"] | null;
        };
        /**
         * SignalOut
         * @description Tín hiệu rủi ro danh tính (I11) — chỉ để xếp ưu tiên, không phải quyết định.
         */
        SignalOut: {
            /** Code */
            code: string;
            /**
             * Severity
             * @enum {string}
             */
            severity: "high" | "medium" | "low";
        };
        /**
         * SourcingNeedsIn
         * @description Thay toàn bộ nhu cầu (PUT). Mọi trường tùy chọn — buyer bổ sung dần ở "Hoàn thiện hồ sơ".
         */
        SourcingNeedsIn: {
            /** Products Text */
            products_text?: string | null;
            /** Quantity */
            quantity?: number | string | null;
            /** Quantity Unit */
            quantity_unit?: ("kg" | "tonne" | "piece" | "carton" | "liter" | "container_20ft" | "container_40ft") | null;
            /** Frequency */
            frequency?: ("one_off" | "monthly" | "quarterly" | "yearly") | null;
            /** Certifications Wanted */
            certifications_wanted?: string[];
            /** Min Supplier Tier */
            min_supplier_tier?: number | null;
            /** Destination Country */
            destination_country?: string | null;
            /** Destination Port */
            destination_port?: string | null;
            /** Incoterm */
            incoterm?: ("EXW" | "FCA" | "CPT" | "CIP" | "DAP" | "DPU" | "DDP" | "FAS" | "FOB" | "CFR" | "CIF") | null;
            /** Budget Amount */
            budget_amount?: number | string | null;
            /**
             * Budget Currency
             * @default EUR
             * @enum {string}
             */
            budget_currency?: "EUR" | "USD";
            /** Notes */
            notes?: string | null;
        };
        /** SourcingNeedsOut */
        SourcingNeedsOut: {
            /** Products Text */
            products_text?: string | null;
            /** Quantity */
            quantity?: string | null;
            /** Quantity Unit */
            quantity_unit?: ("kg" | "tonne" | "piece" | "carton" | "liter" | "container_20ft" | "container_40ft") | null;
            /** Frequency */
            frequency?: ("one_off" | "monthly" | "quarterly" | "yearly") | null;
            /** Certifications Wanted */
            certifications_wanted?: string[];
            /** Min Supplier Tier */
            min_supplier_tier?: number | null;
            /** Destination Country */
            destination_country?: string | null;
            /** Destination Port */
            destination_port?: string | null;
            /** Incoterm */
            incoterm?: ("EXW" | "FCA" | "CPT" | "CIP" | "DAP" | "DPU" | "DDP" | "FAS" | "FOB" | "CFR" | "CIF") | null;
            /** Budget Amount */
            budget_amount?: string | null;
            /**
             * Budget Currency
             * @default EUR
             * @enum {string}
             */
            budget_currency?: "EUR" | "USD";
            /** Notes */
            notes?: string | null;
            /** Updated At */
            updated_at?: string | null;
        };
        /**
         * StagingOut
         * @description Bậc cắt giảm thuế EVFTA đang áp dụng tại ngày tính.
         */
        StagingOut: {
            /** Category */
            category: string;
            /** Stage */
            stage: number;
            /** Stages */
            stages: number;
            /** Zero From */
            zero_from: string | null;
        };
        /**
         * StatsOut
         * @description Số liệu dashboard nội bộ.
         */
        StatsOut: {
            /** Verified Count */
            verified_count: number;
            /** Pending Count */
            pending_count: number;
            /** Ai Queries This Week */
            ai_queries_this_week: number;
            /** Avg Confidence */
            avg_confidence: number | null;
        };
        /** SubtypeOut */
        SubtypeOut: {
            /** Code */
            code: string;
            /** Name Vi */
            name_vi: string;
            /** Name En */
            name_en: string;
            /** Description Vi */
            description_vi: string | null;
            /** Description En */
            description_en: string | null;
        };
        /** SupplierBrief */
        SupplierBrief: {
            /** Slug */
            slug: string;
            /** Name */
            name: string;
            /** Country */
            country: string;
            /** At */
            at: string | null;
        };
        /**
         * SupplierCardOut
         * @description Thẻ nhà cung cấp trong danh bạ (E3): tên, huy hiệu, nhóm hàng, quốc gia, mô tả ngắn.
         */
        SupplierCardOut: {
            /** Slug */
            slug: string;
            /** Legal Name */
            legal_name: string;
            /** Country */
            country: string;
            /** Industry Sector */
            industry_sector: string | null;
            /**
             * Verification Level
             * @enum {string}
             */
            verification_level: "basic" | "evfta_verified";
            /**
             * Verification Tier
             * @default 1
             */
            verification_tier?: number;
            /** Description Vi */
            description_vi: string | null;
            /** Description En */
            description_en: string | null;
            /** Logo Url */
            logo_url: string | null;
            /** Product Names */
            product_names: string[];
            /** Product Count */
            product_count: number;
            /** Categories */
            categories: string[];
            /** Matched Product Names */
            matched_product_names?: string[];
            /**
             * Offering Type
             * @default products
             * @enum {string}
             */
            offering_type?: "products" | "services" | "both";
            /** City */
            city?: string | null;
            /** Service Titles */
            service_titles?: string[];
            /** Service Categories */
            service_categories?: string[];
        };
        /**
         * SupplierCredentialsOut
         * @description U10 "Dữ liệu đã kiểm" trên hồ sơ công khai: ai kiểm, lúc nào, còn hiệu lực đến bao giờ.
         */
        SupplierCredentialsOut: {
            /** Verified At */
            verified_at: string | null;
            /** Expires At */
            expires_at: string | null;
            /**
             * Verified By
             * @default VYBE Trade
             */
            verified_by?: string;
            /** Origin Evidence Complete */
            origin_evidence_complete: boolean;
            /** Certificates */
            certificates: components["schemas"]["VerifiedCertificateOut"][];
            /**
             * Verification Tier
             * @default 1
             */
            verification_tier?: number;
            /** Tier Reviewed At */
            tier_reviewed_at?: string | null;
            /** Tier Expires At */
            tier_expires_at?: string | null;
        };
        /** SupplierListTile */
        SupplierListTile: {
            /** Data */
            data: components["schemas"]["SupplierBrief"][];
            /** Empty Hint Key */
            empty_hint_key?: string | null;
        };
        /** SupplierPage */
        SupplierPage: {
            /** Items */
            items: components["schemas"]["SupplierCardOut"][];
            /** Total */
            total: number;
            /** Page */
            page: number;
            /** Page Size */
            page_size: number;
        };
        /**
         * TariffIn
         * @description Số tiền nhận dạng CHUỖI JSON (không nhận số) để không bao giờ đi qua float.
         *
         *     U12: `destination` là mọi nước ISO-2; `agreement` bỏ trống thì nước EU dùng EVFTA, nước khác
         *     dùng hiệp định duy nhất có dữ liệu đã duyệt (nhiều hơn một → phải chọn).
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
            /** Agreement */
            agreement?: string | null;
            /** Subtype Code */
            subtype_code?: string | null;
            /** Quantity */
            quantity?: number | string | null;
            /** Quota Allocated */
            quota_allocated?: ("yes" | "no" | "unknown") | null;
            /** Quantity Unit */
            quantity_unit?: ("tonne" | "kg" | "piece" | "liter") | null;
            /** Quota Access Cost */
            quota_access_cost?: number | string | null;
            /** Incoterm */
            incoterm?: ("EXW" | "FCA" | "FAS" | "FOB" | "CFR" | "CPT" | "CIF" | "CIP" | "DAP" | "DPU" | "DDP") | null;
            /** Currency */
            currency?: string | null;
            /** Freight */
            freight?: number | string | null;
            /** Insurance */
            insurance?: number | string | null;
            /** Post Border Costs */
            post_border_costs?: number | string | null;
            /** Import Date */
            import_date?: string | null;
        };
        /** TariffLineIn */
        TariffLineIn: {
            /** Hs Code */
            hs_code: string;
            /** Destination */
            destination: string;
            /**
             * Agreement Code
             * @default EVFTA
             */
            agreement_code?: string;
            duty_type: components["schemas"]["DutyType"];
            /** Mfn Rate */
            mfn_rate?: number | string | null;
            /** Mfn Specific */
            mfn_specific?: string | null;
            /** Evfta Rate Current */
            evfta_rate_current?: number | string | null;
            /** Staging Category */
            staging_category?: string | null;
            /** Zero From */
            zero_from?: string | null;
            /**
             * Quota Required
             * @default false
             */
            quota_required?: boolean;
            /** Quota Note */
            quota_note?: string | null;
            /** Condition Note */
            condition_note?: string | null;
            /** Quota Note En */
            quota_note_en?: string | null;
            /** Condition Note En */
            condition_note_en?: string | null;
            /** Source Url */
            source_url?: string | null;
            /**
             * Valid From
             * Format: date
             */
            valid_from: string;
            /** Valid Until */
            valid_until?: string | null;
        };
        /** TariffLineOut */
        TariffLineOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Hs Code */
            hs_code: string;
            /** Destination */
            destination: string;
            /** Agreement Code */
            agreement_code: string;
            duty_type: components["schemas"]["DutyType"];
            /** Mfn Rate */
            mfn_rate: string | null;
            /** Mfn Specific */
            mfn_specific: string | null;
            /** Evfta Rate Current */
            evfta_rate_current: string | null;
            /** Staging Category */
            staging_category: string | null;
            /** Zero From */
            zero_from: string | null;
            /** Quota Required */
            quota_required: boolean;
            /** Quota Note */
            quota_note: string | null;
            /** Condition Note */
            condition_note: string | null;
            /** Quota Note En */
            quota_note_en: string | null;
            /** Condition Note En */
            condition_note_en: string | null;
            /** Source Url */
            source_url: string | null;
            /**
             * Valid From
             * Format: date
             */
            valid_from: string;
            /** Valid Until */
            valid_until: string | null;
            /**
             * Is Demo
             * @default false
             */
            is_demo?: boolean;
            /** Reviewed By */
            reviewed_by: string | null;
            /** Reviewed At */
            reviewed_at: string | null;
        };
        /**
         * TariffLinePatch
         * @description Mọi trường tùy chọn; chỉ trường được gửi mới đổi (kể cả gửi null để xóa).
         */
        TariffLinePatch: {
            /** Hs Code */
            hs_code?: string | null;
            /** Destination */
            destination?: string | null;
            /** Agreement Code */
            agreement_code?: string | null;
            duty_type?: components["schemas"]["DutyType"] | null;
            /** Mfn Rate */
            mfn_rate?: number | string | null;
            /** Mfn Specific */
            mfn_specific?: string | null;
            /** Evfta Rate Current */
            evfta_rate_current?: number | string | null;
            /** Staging Category */
            staging_category?: string | null;
            /** Zero From */
            zero_from?: string | null;
            /** Quota Required */
            quota_required?: boolean | null;
            /** Quota Note */
            quota_note?: string | null;
            /** Condition Note */
            condition_note?: string | null;
            /** Quota Note En */
            quota_note_en?: string | null;
            /** Condition Note En */
            condition_note_en?: string | null;
            /** Source Url */
            source_url?: string | null;
            /** Valid From */
            valid_from?: string | null;
            /** Valid Until */
            valid_until?: string | null;
        };
        /**
         * TariffOptionsOut
         * @description Lựa chọn cho form tính thuế: hiệp định có dữ liệu cho (mã HS, thị trường); U13: phân nhóm
         *     đã duyệt của mã HS và các hiệp định có hạn ngạch đã duyệt.
         */
        TariffOptionsOut: {
            /** Hs Code */
            hs_code: string;
            /** Destination */
            destination: string;
            /** Agreements */
            agreements: components["schemas"]["AgreementOut"][];
            /** Subtypes */
            subtypes?: components["schemas"]["SubtypeOut"][];
            /** Quota Agreements */
            quota_agreements?: string[];
        };
        /** TariffOut */
        TariffOut: {
            /** Check Id */
            check_id: string;
            /**
             * Status
             * @enum {string}
             */
            status: "ok" | "unsupported" | "needs_review" | "quota_scenarios";
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
            /** Quota Note En */
            quota_note_en: string | null;
            /** Condition Note En */
            condition_note_en: string | null;
            /**
             * Citation Missing
             * @default true
             */
            citation_missing?: boolean;
            agreement?: components["schemas"]["AgreementOut"] | null;
            /** Preferential Rate */
            preferential_rate?: string | null;
            /** Preferential Duty */
            preferential_duty?: string | null;
            /** Data Status */
            data_status?: ("reviewed" | "demo_unreviewed") | null;
            /**
             * Review State
             * @default REVIEWED
             * @enum {string}
             */
            review_state?: "REVIEWED" | "UNREVIEWED";
            /** Unreviewed Components */
            unreviewed_components?: string[];
            /** Disclaimer */
            disclaimer?: string | null;
            /** Reasons */
            reasons?: string[];
            /** Customs Value */
            customs_value?: string | null;
            valuation?: components["schemas"]["ValuationOut"] | null;
            /** Rate Date */
            rate_date?: string | null;
            staging?: components["schemas"]["StagingOut"] | null;
            /** Review Reason */
            review_reason?: string | null;
            /** Scenarios */
            scenarios?: components["schemas"]["ScenarioOut"][];
            quota?: components["schemas"]["QuotaInfoOut"] | null;
            subtype?: components["schemas"]["SubtypeOut"] | null;
            /** Subtypes */
            subtypes?: components["schemas"]["SubtypeOut"][];
            /** Conditions */
            conditions?: string[];
            /** Quantity */
            quantity?: string | null;
            /** Quota Allocated */
            quota_allocated?: ("yes" | "no" | "unknown") | null;
            /** Alerts */
            alerts?: components["schemas"]["SectorAlertOut"][];
        };
        /**
         * TariffPreviewOut
         * @description Xem thuế tại sản phẩm (chỉ đọc). `unsupported` và `needs_review` không có con số nào.
         */
        TariffPreviewOut: {
            /**
             * Status
             * @enum {string}
             */
            status: "ok" | "unsupported" | "needs_review";
            /** Hs Code */
            hs_code: string;
            /** Hs Formatted */
            hs_formatted: string;
            /** Mfn Rate */
            mfn_rate: string | null;
            /** Evfta Rate */
            evfta_rate: string | null;
            /** Staging Category */
            staging_category: string | null;
            /** Zero From */
            zero_from: string | null;
            /** Quota Note */
            quota_note: string | null;
            /** Condition Note */
            condition_note: string | null;
            /** Quota Note En */
            quota_note_en: string | null;
            /** Condition Note En */
            condition_note_en: string | null;
            /** Source Url */
            source_url: string | null;
            /** Data Status */
            data_status?: ("reviewed" | "demo_unreviewed") | null;
            /**
             * Review State
             * @default REVIEWED
             * @enum {string}
             */
            review_state?: "REVIEWED" | "UNREVIEWED";
            /** Unreviewed Components */
            unreviewed_components?: string[];
            /** Disclaimer */
            disclaimer?: string | null;
            /** Alerts */
            alerts?: components["schemas"]["SectorAlertOut"][];
        };
        /** TariffQuotaIn */
        TariffQuotaIn: {
            /** In Quota Rate */
            in_quota_rate?: number | string | null;
            /** In Quota Specific */
            in_quota_specific?: number | string | null;
            /** Out Quota Rate */
            out_quota_rate?: number | string | null;
            /** Out Quota Specific */
            out_quota_specific?: number | string | null;
            /**
             * Agreement Code
             * @default EVFTA
             */
            agreement_code?: string;
            /** Destination */
            destination: string;
            /** Hs Prefix */
            hs_prefix: string;
            /** Quota Code */
            quota_code?: string | null;
            /** Quota Year */
            quota_year?: number | null;
            /** Volume */
            volume: number | string;
            /**
             * Volume Unit
             * @default tonne
             * @enum {string}
             */
            volume_unit?: "tonne" | "kg" | "piece" | "liter";
            in_quota_duty_type: components["schemas"]["DutyType"];
            out_quota_duty_type: components["schemas"]["DutyType"];
            /** Specific Unit */
            specific_unit?: ("tonne" | "kg" | "piece" | "liter") | null;
            /** Licence Note Vi */
            licence_note_vi?: string | null;
            /** Licence Note En */
            licence_note_en?: string | null;
            /** Allocation Note Vi */
            allocation_note_vi?: string | null;
            /** Allocation Note En */
            allocation_note_en?: string | null;
            /** Period Start */
            period_start?: string | null;
            /** Period End */
            period_end?: string | null;
            /** Allocation Method */
            allocation_method?: ("IMPORTER_FIRST_COME" | "IMPORT_LICENCE" | "EXPORT_LICENCE" | "ALLOCATION" | "OTHER") | null;
            /**
             * Licence Required
             * @default false
             */
            licence_required?: boolean;
            /** Licence Issuer Vi */
            licence_issuer_vi?: string | null;
            /** Source Url */
            source_url?: string | null;
            /**
             * Valid From
             * Format: date
             */
            valid_from: string;
            /** Valid Until */
            valid_until?: string | null;
            /** Eligible Subtypes */
            eligible_subtypes?: string[];
        };
        /** TariffQuotaOut */
        TariffQuotaOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Agreement Code */
            agreement_code: string;
            /** Destination */
            destination: string;
            /** Hs Prefix */
            hs_prefix: string;
            /** Quota Code */
            quota_code: string | null;
            /** Quota Year */
            quota_year: number | null;
            /** Volume */
            volume: string;
            /** Volume Unit */
            volume_unit: string;
            in_quota_duty_type: components["schemas"]["DutyType"];
            /** In Quota Rate */
            in_quota_rate: string | null;
            /** In Quota Specific */
            in_quota_specific: string | null;
            out_quota_duty_type: components["schemas"]["DutyType"];
            /** Out Quota Rate */
            out_quota_rate: string | null;
            /** Out Quota Specific */
            out_quota_specific: string | null;
            /** Specific Unit */
            specific_unit: string | null;
            /** Licence Note Vi */
            licence_note_vi: string | null;
            /** Licence Note En */
            licence_note_en: string | null;
            /** Allocation Note Vi */
            allocation_note_vi: string | null;
            /** Allocation Note En */
            allocation_note_en: string | null;
            /** Period Start */
            period_start: string | null;
            /** Period End */
            period_end: string | null;
            /** Allocation Method */
            allocation_method: string | null;
            /** Licence Required */
            licence_required: boolean;
            /** Licence Issuer Vi */
            licence_issuer_vi: string | null;
            /** Source Url */
            source_url: string | null;
            /**
             * Valid From
             * Format: date
             */
            valid_from: string;
            /** Valid Until */
            valid_until: string | null;
            /** Eligible Subtypes */
            eligible_subtypes: string[];
            /** Is Demo */
            is_demo: boolean;
            /** Reviewed By */
            reviewed_by: string | null;
            /** Reviewed At */
            reviewed_at: string | null;
        };
        /** TariffQuotaPatch */
        TariffQuotaPatch: {
            /** In Quota Rate */
            in_quota_rate?: number | string | null;
            /** In Quota Specific */
            in_quota_specific?: number | string | null;
            /** Out Quota Rate */
            out_quota_rate?: number | string | null;
            /** Out Quota Specific */
            out_quota_specific?: number | string | null;
            /** Agreement Code */
            agreement_code?: string | null;
            /** Destination */
            destination?: string | null;
            /** Hs Prefix */
            hs_prefix?: string | null;
            /** Quota Code */
            quota_code?: string | null;
            /** Quota Year */
            quota_year?: number | null;
            /** Volume */
            volume?: number | string | null;
            /** Volume Unit */
            volume_unit?: ("tonne" | "kg" | "piece" | "liter") | null;
            in_quota_duty_type?: components["schemas"]["DutyType"] | null;
            out_quota_duty_type?: components["schemas"]["DutyType"] | null;
            /** Specific Unit */
            specific_unit?: ("tonne" | "kg" | "piece" | "liter") | null;
            /** Licence Note Vi */
            licence_note_vi?: string | null;
            /** Licence Note En */
            licence_note_en?: string | null;
            /** Allocation Note Vi */
            allocation_note_vi?: string | null;
            /** Allocation Note En */
            allocation_note_en?: string | null;
            /** Period Start */
            period_start?: string | null;
            /** Period End */
            period_end?: string | null;
            /** Allocation Method */
            allocation_method?: ("IMPORTER_FIRST_COME" | "IMPORT_LICENCE" | "EXPORT_LICENCE" | "ALLOCATION" | "OTHER") | null;
            /** Licence Required */
            licence_required?: boolean | null;
            /** Licence Issuer Vi */
            licence_issuer_vi?: string | null;
            /** Source Url */
            source_url?: string | null;
            /** Valid From */
            valid_from?: string | null;
            /** Valid Until */
            valid_until?: string | null;
            /** Eligible Subtypes */
            eligible_subtypes?: string[] | null;
        };
        /** TierDownIn */
        TierDownIn: {
            /** Reason */
            reason: string;
        };
        /** TierOverviewOut */
        TierOverviewOut: {
            /**
             * Company Kind
             * @enum {string}
             */
            company_kind: "product_seller" | "service_provider" | "buyer";
            /** Status */
            status: string;
            /** Tier */
            tier: number;
            /** Tier Name Vi */
            tier_name_vi: string;
            /** Tier Name En */
            tier_name_en: string;
            /** Verified At */
            verified_at: string | null;
            /** Tier Reviewed At */
            tier_reviewed_at: string | null;
            /** Tier Expires At */
            tier_expires_at: string | null;
            /** Expires At */
            expires_at: string | null;
            /** Next Tier */
            next_tier: number | null;
            /** Next Tier Paid */
            next_tier_paid: boolean;
            /** Entitled */
            entitled: boolean;
            /** Pending Tier Request */
            pending_tier_request: boolean;
            /** Request Error */
            request_error: string | null;
            /** Requirements */
            requirements: components["schemas"]["TierRequirementOut"][];
        };
        /** TierRequestIn */
        TierRequestIn: {
            /** Target Tier */
            target_tier: number;
        };
        /**
         * TierRequirementOut
         * @description Một yêu cầu của cấp xác minh (U20). reviewed=False: bản nháp chưa được luật TM duyệt.
         */
        TierRequirementOut: {
            /** Tier */
            tier: number;
            /**
             * Kind
             * @enum {string}
             */
            kind: "evidence" | "check" | "manual";
            /** Code */
            code: string;
            /** Label Vi */
            label_vi: string;
            /** Label En */
            label_en: string;
            /** Is Required */
            is_required: boolean;
            /** Reviewed */
            reviewed: boolean;
            /**
             * State
             * @enum {string}
             */
            state: "met" | "pending" | "missing" | "manual";
        };
        /** TradeAgreementIn */
        TradeAgreementIn: {
            /** Code */
            code: string;
            /** Name Vi */
            name_vi: string;
            /** Name En */
            name_en: string;
            /** Partners */
            partners?: string[];
            /** In Force From */
            in_force_from?: string | null;
            /** Source Url */
            source_url?: string | null;
            /** Note */
            note?: string | null;
        };
        /** TradeAgreementOut */
        TradeAgreementOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Code */
            code: string;
            /** Name Vi */
            name_vi: string;
            /** Name En */
            name_en: string;
            /** Partners */
            partners: string[];
            /** In Force From */
            in_force_from: string | null;
            /** Source Url */
            source_url: string | null;
            /** Note */
            note: string | null;
            /** Reviewed By */
            reviewed_by: string | null;
            /** Reviewed At */
            reviewed_at: string | null;
        };
        /** TradeAgreementPatch */
        TradeAgreementPatch: {
            /** Name Vi */
            name_vi?: string | null;
            /** Name En */
            name_en?: string | null;
            /** Partners */
            partners?: string[] | null;
            /** In Force From */
            in_force_from?: string | null;
            /** Source Url */
            source_url?: string | null;
            /** Note */
            note?: string | null;
        };
        /** TradeImportBatchOut */
        TradeImportBatchOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Source */
            source: string;
            /** Params */
            params: {
                [key: string]: unknown;
            };
            /** Status */
            status: string;
            /** Rows Imported */
            rows_imported: number;
            /** Error */
            error: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Finished At */
            finished_at: string | null;
        };
        /**
         * TradeImportIn
         * @description Nạp từ Eurostat Comext. Bỏ trống products = danh sách mã ưu tiên; năm mặc định 6 năm gần
         *     nhất.
         */
        TradeImportIn: {
            /** Products */
            products?: string[];
            /** Year From */
            year_from?: number | null;
            /** Year To */
            year_to?: number | null;
        };
        /** TrustComponentOut */
        TrustComponentOut: {
            /**
             * Component
             * @enum {string}
             */
            component: "documents" | "automated" | "behaviour";
            /** Label Vi */
            label_vi: string;
            /** Label En */
            label_en: string;
            /** Score */
            score: string | null;
            /** Criteria */
            criteria: components["schemas"]["TrustCriterionOut"][];
        };
        /** TrustCriterionOut */
        TrustCriterionOut: {
            /** Fact Key */
            fact_key: string;
            /** Label Vi */
            label_vi: string;
            /** Label En */
            label_en: string;
            /** Weight */
            weight: string;
            /** Value */
            value: string | null;
            /** Draft */
            draft: boolean;
            /** Component */
            component?: string | null;
        };
        /**
         * TrustScoreOut
         * @description Điểm 0–100 kèm điểm thành phần, ngày tính, phương pháp và câu "không phải chứng nhận".
         */
        TrustScoreOut: {
            /** Score */
            score: string | null;
            /**
             * Computed At
             * Format: date-time
             */
            computed_at: string;
            /** New On Platform */
            new_on_platform: boolean;
            /** Uses Draft Criteria */
            uses_draft_criteria: boolean;
            /** Method Url */
            method_url: string;
            /** Disclaimer Vi */
            disclaimer_vi: string;
            /** Disclaimer En */
            disclaimer_en: string;
            /** Components */
            components: components["schemas"]["TrustComponentOut"][];
            /** Self Declared */
            self_declared: string[];
        };
        /** UnreadCountOut */
        UnreadCountOut: {
            /** Count */
            count: number;
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
        /** ValuationOut */
        ValuationOut: {
            /** Incoterm */
            incoterm: string | null;
            /** Currency */
            currency: string | null;
            /** Basis */
            basis: ("CIF" | "FOB") | null;
            /** Invoice Value */
            invoice_value: string;
            /** Customs Value */
            customs_value: string | null;
            /** Steps */
            steps: components["schemas"]["ValueStepOut"][];
            /** Warnings */
            warnings: string[];
        };
        /**
         * ValueStepOut
         * @description Một bước từ giá hóa đơn đến trị giá tính thuế; amount có dấu (trừ là số âm).
         */
        ValueStepOut: {
            /**
             * Code
             * @enum {string}
             */
            code: "invoice" | "freight" | "insurance" | "post_border";
            /** Amount */
            amount: string;
        };
        /** VerificationData */
        VerificationData: {
            /** Status */
            status: string;
            /** Level */
            level: string;
            /** Expires At */
            expires_at: string | null;
            /** Days Left */
            days_left: number | null;
        };
        /** VerificationRequestOut */
        VerificationRequestOut: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Company Id
             * Format: uuid
             */
            company_id: string;
            /**
             * Status
             * @enum {string}
             */
            status: "pending" | "approved" | "rejected" | "info_requested";
            /** Evidence Ids */
            evidence_ids: string[];
            /**
             * Submitted At
             * Format: date-time
             */
            submitted_at: string;
            /** Reviewed At */
            reviewed_at: string | null;
            /** Decision Reason */
            decision_reason: string | null;
            /**
             * Target Tier
             * @default 1
             */
            target_tier?: number;
        };
        /** VerificationTile */
        VerificationTile: {
            data: components["schemas"]["VerificationData"] | null;
            /** Empty Hint Key */
            empty_hint_key?: string | null;
        };
        /**
         * VerifiedCertificateOut
         * @description Chứng nhận đã duyệt, còn hạn, loại được phép công khai (không lộ file hay số chứng nhận).
         */
        VerifiedCertificateOut: {
            /** Type Code */
            type_code: string;
            /** Name Vi */
            name_vi: string;
            /** Name En */
            name_en: string;
            /** Issuer */
            issuer: string | null;
            /** Expires At */
            expires_at: string | null;
            /** Reviewed At */
            reviewed_at: string | null;
        };
        /** WeekStat */
        WeekStat: {
            /**
             * Week Start
             * Format: date
             */
            week_start: string;
            /** Return Visits */
            return_visits: number;
            /** With New Info */
            with_new_info: number;
            /** Ratio */
            ratio: string | null;
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
    delete_me_api_me_delete_post: {
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
                "application/json": components["schemas"]["DeleteAccountIn"];
            };
        };
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
    list_companies_api_admin_companies_get: {
        parameters: {
            query?: {
                q?: string | null;
                status?: ("unverified" | "pending" | "verified" | "rejected") | null;
                hidden?: boolean | null;
                limit?: number;
                offset?: number;
            };
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
                    "application/json": components["schemas"]["AdminCompanyOut"][];
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
    update_company_api_admin_companies__company_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                company_id: string;
            };
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AdminCompanyPatch"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdminCompanyOut"];
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
    list_products_api_admin_products_get: {
        parameters: {
            query?: {
                company_id?: string | null;
                q?: string | null;
                limit?: number;
                offset?: number;
                recent_days?: number | null;
            };
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
                    "application/json": components["schemas"]["AdminProductOut"][];
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
    update_product_api_admin_products__product_id__patch: {
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
                "application/json": components["schemas"]["AdminProductPatch"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdminProductOut"];
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
    audit_logs_api_admin_audit_logs_get: {
        parameters: {
            query?: {
                entity_type?: string | null;
                entity_id?: string | null;
                action_type?: string | null;
                limit?: number;
                offset?: number;
            };
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
                    "application/json": components["schemas"]["AuditLogOut"][];
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
    stats_api_admin_stats_get: {
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
                    "application/json": components["schemas"]["StatsOut"];
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
    list_billing_items_api_public_billing_items_get: {
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
                    "application/json": components["schemas"]["BillingItemOut"][];
                };
            };
        };
    };
    list_my_orders_api_me_orders_get: {
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
                    "application/json": components["schemas"]["OrderOut"][];
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
    create_order_api_me_orders_post: {
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
                "application/json": components["schemas"]["OrderIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrderOut"];
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
    get_my_order_api_me_orders__order_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                order_id: string;
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
                    "application/json": components["schemas"]["OrderOut"];
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
    cancel_my_order_api_me_orders__order_id__cancel_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                order_id: string;
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
                    "application/json": components["schemas"]["OrderOut"];
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
    my_entitlements_api_me_entitlements_get: {
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
                    "application/json": components["schemas"]["EntitlementOut"][];
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
    admin_list_orders_api_admin_orders_get: {
        parameters: {
            query?: {
                status?: ("pending" | "paid" | "cancelled") | null;
            };
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
                    "application/json": components["schemas"]["AdminOrderOut"][];
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
    confirm_payment_api_admin_orders__order_id__confirm_payment_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                order_id: string;
            };
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["OrderDecisionIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrderOut"];
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
    admin_cancel_order_api_admin_orders__order_id__cancel_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                order_id: string;
            };
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["OrderDecisionIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrderOut"];
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
    admin_list_items_api_admin_billing_items_get: {
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
                    "application/json": components["schemas"]["AdminBillingItemOut"][];
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
    admin_update_item_api_admin_billing_items__code__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                code: string;
            };
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["BillingItemPatch"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdminBillingItemOut"];
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
    get_sourcing_needs_api_buyer_sourcing_needs_get: {
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
                    "application/json": components["schemas"]["SourcingNeedsOut"];
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
    put_sourcing_needs_api_buyer_sourcing_needs_put: {
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
                "application/json": components["schemas"]["SourcingNeedsIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SourcingNeedsOut"];
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
    list_services_api_exporter_services_get: {
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
                    "application/json": components["schemas"]["ServiceOfferingOut"][];
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
    create_service_api_exporter_services_post: {
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
                "application/json": components["schemas"]["ServiceOfferingIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ServiceOfferingOut"];
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
    delete_service_api_exporter_services__service_id__delete: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                service_id: string;
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
    update_service_api_exporter_services__service_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                service_id: string;
            };
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ServiceOfferingPatch"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ServiceOfferingOut"];
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
    industries_api_public_industries_get: {
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
                    "application/json": components["schemas"]["CatalogItemOut"][];
                };
            };
        };
    };
    service_categories_api_public_service_categories_get: {
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
                    "application/json": components["schemas"]["CatalogItemOut"][];
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
            header?: {
                "accept-language"?: string | null;
            };
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
    tariff_options_api_public_tariff_options_get: {
        parameters: {
            query: {
                hs_code: string;
                destination: string;
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
                    "application/json": components["schemas"]["TariffOptionsOut"];
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
    sector_alerts_api_public_sector_alerts_get: {
        parameters: {
            query: {
                hs_code: string;
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
                    "application/json": components["schemas"]["SectorAlertOut"][];
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
    shipping_hints_api_public_shipping_hints_get: {
        parameters: {
            query: {
                dest_country: string;
                cargo_class?: "dry" | "reefer" | "hazard";
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
                    "application/json": components["schemas"]["ShippingHintsOut"];
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
    tariff_preview_api_exporter_tariff_preview_get: {
        parameters: {
            query: {
                hs_code: string;
            };
            header?: {
                "accept-language"?: string | null;
            };
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
                    "application/json": components["schemas"]["TariffPreviewOut"];
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
    calculate_roo_api_public_roo_post: {
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
                "application/json": components["schemas"]["RooIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RooOut"];
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
    origin_questions_api_public_hs_codes__cn__origin_questions_get: {
        parameters: {
            query?: never;
            header?: {
                "accept-language"?: string | null;
            };
            path: {
                cn: string;
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
                    "application/json": components["schemas"]["OriginQuestionsOut"];
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
    calculate_origin_api_public_origin_post: {
        parameters: {
            query?: never;
            header?: {
                "accept-language"?: string | null;
            };
            path?: never;
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["OriginIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OriginOut"];
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
    exporter_evidence_requirements_api_exporter_evidence_requirements_get: {
        parameters: {
            query?: never;
            header?: {
                "accept-language"?: string | null;
            };
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
                    "application/json": components["schemas"]["ExporterRequirementsOut"];
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
    evidence_checklist_api_companies__company_id__evidence_checklist_get: {
        parameters: {
            query: {
                hs: string;
            };
            header?: {
                "accept-language"?: string | null;
            };
            path: {
                company_id: string;
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
                    "application/json": components["schemas"]["CompanyChecklistOut"];
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
    rank_markets_api_public_markets_post: {
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
                "application/json": components["schemas"]["MarketsIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MarketsOut"];
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
    tariff_lines_template_api_admin_tariff_lines_template_xlsx_get: {
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
    tariff_lines_export_api_admin_tariff_lines_export_xlsx_get: {
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
    tariff_lines_import_api_admin_tariff_lines_import_post: {
        parameters: {
            query?: {
                dry_run?: boolean;
            };
            header?: never;
            path?: never;
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["Body_tariff_lines_import_api_admin_tariff_lines_import_post"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ImportResult"];
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
    roo_rules_template_api_admin_roo_rules_template_xlsx_get: {
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
    roo_rules_export_api_admin_roo_rules_export_xlsx_get: {
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
    roo_rules_import_api_admin_roo_rules_import_post: {
        parameters: {
            query?: {
                dry_run?: boolean;
            };
            header?: never;
            path?: never;
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["Body_roo_rules_import_api_admin_roo_rules_import_post"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ImportResult"];
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
    list_tariff_lines_api_admin_tariff_lines_get: {
        parameters: {
            query?: {
                hs_code?: string | null;
                reviewed?: boolean | null;
            };
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
                    "application/json": components["schemas"]["TariffLineOut"][];
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
    create_tariff_line_api_admin_tariff_lines_post: {
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
                "application/json": components["schemas"]["TariffLineIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TariffLineOut"];
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
    delete_tariff_line_api_admin_tariff_lines__line_id__delete: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                line_id: string;
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
    update_tariff_line_api_admin_tariff_lines__line_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                line_id: string;
            };
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TariffLinePatch"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TariffLineOut"];
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
    review_tariff_line_api_admin_tariff_lines__line_id__review_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                line_id: string;
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
                    "application/json": components["schemas"]["TariffLineOut"];
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
    list_roo_rules_api_admin_roo_rules_get: {
        parameters: {
            query?: {
                hs_code?: string | null;
                reviewed?: boolean | null;
            };
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
                    "application/json": components["schemas"]["RooRuleOut"][];
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
    create_roo_rule_api_admin_roo_rules_post: {
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
                "application/json": components["schemas"]["RooRuleIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RooRuleOut"];
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
    delete_roo_rule_api_admin_roo_rules__rule_id__delete: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                rule_id: string;
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
    update_roo_rule_api_admin_roo_rules__rule_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                rule_id: string;
            };
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RooRulePatch"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RooRuleOut"];
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
    review_roo_rule_api_admin_roo_rules__rule_id__review_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                rule_id: string;
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
                    "application/json": components["schemas"]["RooRuleOut"];
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
    request_eur1_api_exporter_documents_eur1_post: {
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
                "application/json": components["schemas"]["Eur1In"];
            };
        };
        responses: {
            /** @description Successful Response */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DocumentOut"];
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
    list_documents_api_exporter_documents_get: {
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
                    "application/json": components["schemas"]["DocumentOut"][];
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
    get_document_api_exporter_documents__document_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                document_id: string;
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
                    "application/json": components["schemas"]["DocumentOut"];
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
    list_trade_agreements_api_admin_trade_agreements_get: {
        parameters: {
            query?: {
                reviewed?: boolean | null;
            };
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
                    "application/json": components["schemas"]["TradeAgreementOut"][];
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
    create_trade_agreement_api_admin_trade_agreements_post: {
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
                "application/json": components["schemas"]["TradeAgreementIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TradeAgreementOut"];
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
    delete_trade_agreement_api_admin_trade_agreements__agreement_id__delete: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                agreement_id: string;
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
    update_trade_agreement_api_admin_trade_agreements__agreement_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                agreement_id: string;
            };
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TradeAgreementPatch"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TradeAgreementOut"];
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
    review_trade_agreement_api_admin_trade_agreements__agreement_id__review_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                agreement_id: string;
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
                    "application/json": components["schemas"]["TradeAgreementOut"];
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
    list_product_subtypes_api_admin_product_subtypes_get: {
        parameters: {
            query?: {
                reviewed?: boolean | null;
            };
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
                    "application/json": components["schemas"]["ProductSubtypeOut"][];
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
    create_product_subtype_api_admin_product_subtypes_post: {
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
                "application/json": components["schemas"]["ProductSubtypeIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProductSubtypeOut"];
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
    delete_product_subtype_api_admin_product_subtypes__subtype_id__delete: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                subtype_id: string;
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
    update_product_subtype_api_admin_product_subtypes__subtype_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                subtype_id: string;
            };
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProductSubtypePatch"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProductSubtypeOut"];
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
    review_product_subtype_api_admin_product_subtypes__subtype_id__review_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                subtype_id: string;
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
                    "application/json": components["schemas"]["ProductSubtypeOut"];
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
    list_tariff_quotas_api_admin_tariff_quotas_get: {
        parameters: {
            query?: {
                reviewed?: boolean | null;
            };
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
                    "application/json": components["schemas"]["TariffQuotaOut"][];
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
    create_tariff_quota_api_admin_tariff_quotas_post: {
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
                "application/json": components["schemas"]["TariffQuotaIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TariffQuotaOut"];
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
    delete_tariff_quota_api_admin_tariff_quotas__quota_id__delete: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                quota_id: string;
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
    update_tariff_quota_api_admin_tariff_quotas__quota_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                quota_id: string;
            };
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TariffQuotaPatch"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TariffQuotaOut"];
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
    review_tariff_quota_api_admin_tariff_quotas__quota_id__review_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                quota_id: string;
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
                    "application/json": components["schemas"]["TariffQuotaOut"];
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
    list_quota_balances_api_admin_tariff_quotas__quota_id__balances_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                quota_id: string;
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
                    "application/json": components["schemas"]["QuotaBalanceOut"][];
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
    add_quota_balance_api_admin_tariff_quotas__quota_id__balances_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                quota_id: string;
            };
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["QuotaBalanceIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QuotaBalanceOut"];
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
    list_sector_alerts_api_admin_sector_alerts_get: {
        parameters: {
            query?: {
                reviewed?: boolean | null;
            };
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
                    "application/json": components["schemas"]["AdminSectorAlertOut"][];
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
    create_sector_alert_api_admin_sector_alerts_post: {
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
                "application/json": components["schemas"]["SectorAlertIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdminSectorAlertOut"];
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
    delete_sector_alert_api_admin_sector_alerts__alert_id__delete: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                alert_id: string;
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
    update_sector_alert_api_admin_sector_alerts__alert_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                alert_id: string;
            };
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SectorAlertPatch"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdminSectorAlertOut"];
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
    review_sector_alert_api_admin_sector_alerts__alert_id__review_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                alert_id: string;
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
                    "application/json": components["schemas"]["AdminSectorAlertOut"];
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
    list_country_terms_api_admin_country_terms_get: {
        parameters: {
            query?: {
                hs_code?: string | null;
                reviewed?: boolean | null;
            };
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
                    "application/json": components["schemas"]["CountryTermOut"][];
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
    create_country_term_api_admin_country_terms_post: {
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
                "application/json": components["schemas"]["CountryTermIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CountryTermOut"];
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
    delete_country_term_api_admin_country_terms__term_id__delete: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                term_id: string;
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
    update_country_term_api_admin_country_terms__term_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                term_id: string;
            };
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CountryTermPatch"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CountryTermOut"];
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
    review_country_term_api_admin_country_terms__term_id__review_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                term_id: string;
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
                    "application/json": components["schemas"]["CountryTermOut"];
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
    list_review_issues_api_admin_compliance_review_issues_get: {
        parameters: {
            query?: {
                only_open?: boolean;
            };
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
                    "application/json": components["schemas"]["ReviewIssueOut"][];
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
    resolve_review_issue_api_admin_compliance_review_issues__issue_id__resolve_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                issue_id: string;
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
                    "application/json": components["schemas"]["ReviewIssueOut"];
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
    ask_api_public_copilot_ask_post: {
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
                "application/json": components["schemas"]["AskIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AskOut"];
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
    feedback_api_public_copilot_queries__query_id__feedback_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                query_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["FeedbackIn"];
            };
        };
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
    escalate_api_public_copilot_queries__query_id__escalate_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                query_id: string;
            };
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EscalateIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EscalationOut"];
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
    list_ai_queries_api_admin_ai_queries_get: {
        parameters: {
            query?: {
                confidence?: string | null;
                helpful?: boolean | null;
                limit?: number;
                offset?: number;
            };
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
                    "application/json": components["schemas"]["AiQueryOut"][];
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
    weekly_sample_api_admin_ai_queries_weekly_sample_get: {
        parameters: {
            query?: {
                size?: number;
            };
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
                    "application/json": components["schemas"]["AiQueryOut"][];
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
    list_corpus_documents_api_admin_corpus_documents_get: {
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
                    "application/json": components["schemas"]["CorpusDocumentOut"][];
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
    review_corpus_document_api_admin_corpus_documents__document_id__review_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                document_id: string;
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
                    "application/json": components["schemas"]["CorpusDocumentOut"];
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
    record_view_api_public_companies__slug__view_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                slug: string;
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
    profile_viewers_api_exporter_profile_viewers_get: {
        parameters: {
            query?: {
                days?: number;
            };
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
                    "application/json": components["schemas"]["ProfileViewersOut"];
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
    exporter_dashboard_api_exporter_dashboard_get: {
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
                    "application/json": components["schemas"]["ExporterDashboard"];
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
    buyer_dashboard_api_buyer_dashboard_get: {
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
                    "application/json": components["schemas"]["BuyerDashboard"];
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
    return_visits_api_admin_stats_return_visits_get: {
        parameters: {
            query?: {
                weeks?: number;
            };
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
                    "application/json": components["schemas"]["ReturnVisitStats"];
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
    search_suppliers_api_public_suppliers_get: {
        parameters: {
            query?: {
                q?: string;
                hs?: string | null;
                country?: string | null;
                category?: string | null;
                cert?: string | null;
                page?: number;
                page_size?: number;
                kind?: "products" | "services";
                service_category?: string | null;
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
                    "application/json": components["schemas"]["SupplierPage"];
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
    supplier_filters_api_public_suppliers_filters_get: {
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
                    "application/json": components["schemas"]["FilterOptions"];
                };
            };
        };
    };
    supplier_credentials_api_public_suppliers__slug__credentials_get: {
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
                    "application/json": components["schemas"]["SupplierCredentialsOut"];
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
    list_my_notifications_api_me_notifications_get: {
        parameters: {
            query?: {
                unread_only?: boolean;
                limit?: number;
                offset?: number;
            };
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
                    "application/json": components["schemas"]["NotificationOut"][];
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
    unread_count_api_me_notifications_unread_count_get: {
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
                    "application/json": components["schemas"]["UnreadCountOut"];
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
    read_all_api_me_notifications_read_all_post: {
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
                    "application/json": components["schemas"]["UnreadCountOut"];
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
    read_one_api_me_notifications__notification_id__read_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                notification_id: string;
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
                    "application/json": components["schemas"]["NotificationOut"];
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
    create_rfq_api_buyer_rfqs_post: {
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
                "application/json": components["schemas"]["RfqIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RfqOut"];
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
    rfq_quota_api_buyer_rfq_quota_get: {
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
                    "application/json": components["schemas"]["RfqQuotaOut"];
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
    list_my_rfqs_api_me_rfqs_get: {
        parameters: {
            query?: {
                status?: components["schemas"]["RfqStatus"] | null;
                limit?: number;
                offset?: number;
            };
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
                    "application/json": components["schemas"]["RfqOut"][];
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
    get_rfq_api_me_rfqs__rfq_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                rfq_id: string;
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
                    "application/json": components["schemas"]["RfqOut"];
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
    set_rfq_status_api_exporter_rfqs__rfq_id__status_patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                rfq_id: string;
            };
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RfqStatusIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RfqOut"];
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
    create_quote_api_exporter_rfqs__rfq_id__quotes_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                rfq_id: string;
            };
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["QuoteIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QuoteOut"];
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
    list_quotes_api_me_rfqs__rfq_id__quotes_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                rfq_id: string;
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
                    "application/json": components["schemas"]["QuoteOut"][];
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
    decide_quote_api_buyer_quotes__quote_id__decision_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                quote_id: string;
            };
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["QuoteDecisionIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QuoteOut"];
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
    withdraw_quote_api_exporter_quotes__quote_id__withdraw_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                quote_id: string;
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
                    "application/json": components["schemas"]["QuoteOut"];
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
    list_my_conversations_api_me_conversations_get: {
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
                    "application/json": components["schemas"]["ConversationOut"][];
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
    start_direct_conversation_api_me_conversations_post: {
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
                "application/json": components["schemas"]["DirectConversationIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConversationOut"];
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
    list_messages_api_me_conversations__conversation_id__messages_get: {
        parameters: {
            query?: {
                after?: string | null;
                limit?: number;
            };
            header?: never;
            path: {
                conversation_id: string;
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
                    "application/json": components["schemas"]["MessageOut"][];
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
    send_message_api_me_conversations__conversation_id__messages_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                conversation_id: string;
            };
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MessageIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MessageOut"];
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
    list_trade_imports_api_admin_trade_imports_get: {
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
                    "application/json": components["schemas"]["TradeImportBatchOut"][];
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
    create_trade_import_api_admin_trade_imports_post: {
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
                "application/json": components["schemas"]["TradeImportIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TradeImportBatchOut"];
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
    priority_products_api_admin_trade_imports_priority_products_get: {
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
                    "application/json": components["schemas"]["PriorityProductOut"][];
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
    upload_trade_file_api_admin_trade_imports_file_post: {
        parameters: {
            query?: {
                source?: "eurostat_comext" | "curated";
            };
            header?: never;
            path?: never;
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["Body_upload_trade_file_api_admin_trade_imports_file_post"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TradeImportBatchOut"];
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
    market_recommendation_api_public_markets_recommendation_get: {
        parameters: {
            query?: {
                q?: string;
                hs?: string | null;
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
                    "application/json": components["schemas"]["MarketRecommendationOut"];
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
    price_reference_api_public_markets_price_reference_get: {
        parameters: {
            query: {
                hs: string;
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
                    "application/json": components["schemas"]["PriceReferenceOut"];
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
    list_market_reports_api_exporter_market_reports_get: {
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
                    "application/json": components["schemas"]["ReportListItemOut"][];
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
    create_market_report_api_exporter_market_reports_post: {
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
                "application/json": components["schemas"]["ReportIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReportOut"];
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
    get_market_report_api_exporter_market_reports__report_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                report_id: string;
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
                    "application/json": components["schemas"]["ReportOut"];
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
    create_consulting_lead_api_exporter_consulting_leads_post: {
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
                "application/json": components["schemas"]["ConsultingLeadIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConsultingLeadOut"];
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
    list_consulting_leads_api_admin_consulting_leads_get: {
        parameters: {
            query?: {
                status?: ("new" | "contacted" | "closed") | null;
            };
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
                    "application/json": components["schemas"]["AdminConsultingLeadOut"][];
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
    update_consulting_lead_api_admin_consulting_leads__lead_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                lead_id: string;
            };
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ConsultingLeadPatch"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConsultingLeadOut"];
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
    list_available_evidence_types_api_exporter_evidence_types_get: {
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
                    "application/json": components["schemas"]["EvidenceTypePublic"][];
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
    list_evidences_api_exporter_evidences_get: {
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
                    "application/json": components["schemas"]["EvidenceOut"][];
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
    create_evidence_api_exporter_evidences_post: {
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
                "application/json": components["schemas"]["EvidenceIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EvidenceOut"];
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
    evidence_checklist_api_exporter_evidences_checklist_get: {
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
                    "application/json": components["schemas"]["ChecklistItem"][];
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
    get_evidence_api_exporter_evidences__evidence_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                evidence_id: string;
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
                    "application/json": components["schemas"]["EvidenceOut"];
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
    delete_evidence_api_exporter_evidences__evidence_id__delete: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                evidence_id: string;
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
    update_evidence_api_exporter_evidences__evidence_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                evidence_id: string;
            };
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EvidencePatch"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EvidenceOut"];
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
    evidence_types_template_api_admin_evidence_types_template_xlsx_get: {
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
    evidence_types_export_api_admin_evidence_types_export_xlsx_get: {
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
    evidence_types_import_api_admin_evidence_types_import_post: {
        parameters: {
            query?: {
                dry_run?: boolean;
            };
            header?: never;
            path?: never;
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["Body_evidence_types_import_api_admin_evidence_types_import_post"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ImportResult"];
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
    evidence_rules_template_api_admin_evidence_rules_template_xlsx_get: {
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
    evidence_rules_export_api_admin_evidence_rules_export_xlsx_get: {
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
    evidence_rules_import_api_admin_evidence_rules_import_post: {
        parameters: {
            query?: {
                dry_run?: boolean;
            };
            header?: never;
            path?: never;
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["Body_evidence_rules_import_api_admin_evidence_rules_import_post"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ImportResult"];
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
    delete_evidence_rule_api_admin_evidence_rules__rule_id__delete: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                rule_id: string;
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
    update_evidence_rule_api_admin_evidence_rules__rule_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                rule_id: string;
            };
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RulePatch"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RuleOut"];
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
    list_evidence_types_api_admin_evidence_types_get: {
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
                    "application/json": components["schemas"]["EvidenceTypeOut"][];
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
    create_evidence_type_api_admin_evidence_types_post: {
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
                "application/json": components["schemas"]["EvidenceTypeIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EvidenceTypeOut"];
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
    update_evidence_type_api_admin_evidence_types__code__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                code: string;
            };
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EvidenceTypePatch"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EvidenceTypeOut"];
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
    review_evidence_type_api_admin_evidence_types__code__review_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                code: string;
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
                    "application/json": components["schemas"]["EvidenceTypeOut"];
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
    list_evidence_rules_api_admin_evidence_rules_get: {
        parameters: {
            query?: {
                category?: string | null;
            };
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
                    "application/json": components["schemas"]["RuleOut"][];
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
    create_evidence_rule_api_admin_evidence_rules_post: {
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
                "application/json": components["schemas"]["RuleIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RuleOut"];
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
    review_evidence_rule_api_admin_evidence_rules__rule_id__review_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                rule_id: string;
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
                    "application/json": components["schemas"]["RuleOut"];
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
    review_evidence_api_admin_evidences__evidence_id__review_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                evidence_id: string;
            };
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EvidenceReviewIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EvidenceOut"];
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
    my_verification_requests_api_exporter_verification_requests_get: {
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
                    "application/json": components["schemas"]["VerificationRequestOut"][];
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
    submit_verification_request_api_exporter_verification_requests_post: {
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
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["VerificationRequestOut"];
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
    my_buyer_verification_requests_api_buyer_verification_requests_get: {
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
                    "application/json": components["schemas"]["VerificationRequestOut"][];
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
    submit_buyer_verification_request_api_buyer_verification_requests_post: {
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
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["VerificationRequestOut"];
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
    verification_queue_api_admin_verification_queue_get: {
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
                    "application/json": components["schemas"]["QueueItem"][];
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
    decide_verification_request_api_admin_verification_requests__request_id__decision_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                request_id: string;
            };
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DecisionIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["VerificationRequestOut"];
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
    my_verification_tier_api_me_verification_tier_get: {
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
                    "application/json": components["schemas"]["TierOverviewOut"];
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
    request_verification_tier_api_exporter_verification_tier_requests_post: {
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
                "application/json": components["schemas"]["TierRequestIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["VerificationRequestOut"];
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
    tier_down_api_admin_companies__company_id__tier_down_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                company_id: string;
            };
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TierDownIn"];
            };
        };
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
    my_verification_checks_api_me_verification_checks_get: {
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
                    "application/json": components["schemas"]["CheckOut"][];
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
    company_checks_api_admin_companies__company_id__checks_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                company_id: string;
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
                    "application/json": components["schemas"]["CheckOut"][];
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
    record_manual_check_api_admin_companies__company_id__checks_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                company_id: string;
            };
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ManualCheckIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CheckOut"];
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
    run_company_checks_api_admin_companies__company_id__checks_run_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                company_id: string;
            };
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            202: {
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
    import_approved_establishments_api_admin_approved_establishments_import_post: {
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
                "multipart/form-data": components["schemas"]["Body_import_approved_establishments_api_admin_approved_establishments_import_post"];
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
                        [key: string]: number;
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
    consistency_hints_api_exporter_consistency_hints_get: {
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
                    "application/json": components["schemas"]["FindingOut"][];
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
    company_findings_api_admin_companies__company_id__findings_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                company_id: string;
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
                    "application/json": components["schemas"]["FindingOut"][];
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
    my_trust_score_api_exporter_trust_score_get: {
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
                    "application/json": components["schemas"]["TrustScoreOut"];
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
    company_trust_score_api_admin_companies__company_id__trust_score_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                company_id: string;
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
                    "application/json": components["schemas"]["TrustScoreOut"];
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
    public_trust_score_api_public_companies__slug__trust_score_get: {
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
                    "application/json": components["schemas"]["TrustScoreOut"];
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
    trust_criteria_api_public_trust_criteria_get: {
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
                    "application/json": components["schemas"]["TrustCriterionOut"][];
                };
            };
        };
    };
    extract_preview_api_exporter_evidences_extract_preview_post: {
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
                "application/json": components["schemas"]["ExtractionPreviewIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ExtractionPreviewOut"];
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
    evidence_extraction_api_exporter_evidences__evidence_id__extraction_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                evidence_id: string;
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
                    "application/json": components["schemas"]["ExtractionOut"];
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
    apply_evidence_extraction_api_exporter_evidences__evidence_id__extraction_apply_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                evidence_id: string;
            };
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ExtractionApplyIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EvidenceOut"];
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
    admin_evidence_extraction_api_admin_evidences__evidence_id__extraction_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                evidence_id: string;
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
                    "application/json": components["schemas"]["ExtractionOut"];
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
    company_identity_api_admin_companies__company_id__identity_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                company_id: string;
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
                    "application/json": components["schemas"]["CompanyIdentityOut"];
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
    record_identity_check_api_admin_companies__company_id__identity_checks_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                company_id: string;
            };
            cookie?: {
                evfta_session?: string | null;
            };
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["IdentityCheckIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["IdentityCheckOut"];
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
    identity_clusters_api_admin_identity_clusters_get: {
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
                    "application/json": components["schemas"]["ClusterOut"][];
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
    identity_clusters_export_api_admin_identity_clusters_export_xlsx_get: {
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
    list_blocklist_api_admin_blocklist_get: {
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
                    "application/json": components["schemas"]["BlocklistOut"][];
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
    add_blocklist_api_admin_blocklist_post: {
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
                "application/json": components["schemas"]["BlocklistIn"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BlocklistOut"];
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
    remove_blocklist_api_admin_blocklist__entry_id__delete: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                entry_id: string;
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
