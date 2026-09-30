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
        post?: never;
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
            /** Facility Codes */
            facility_codes: components["schemas"]["FacilityCodeOut"][];
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
            /** Legal Name */
            legal_name?: string | null;
            /** Country */
            country?: string | null;
            /** Export Markets */
            export_markets?: string[] | null;
            /** Languages Spoken */
            languages_spoken?: string[] | null;
            /** Sourcing Categories */
            sourcing_categories?: ("agriculture" | "fruits_vegetables" | "coffee_tea" | "seafood" | "food_beverage" | "spices" | "textiles" | "handicrafts" | "other")[] | null;
            /** Facility Codes */
            facility_codes?: components["schemas"]["FacilityCodeIn"][] | null;
            /** Logo Key */
            logo_key?: string | null;
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
        /** ConversationOut */
        ConversationOut: {
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
            /** Product Name */
            product_name: string;
            /** Counterpart Name */
            counterpart_name: string;
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
         * @description Năm loại của spec §4.9. RFQ và tin nhắn do F1/F2 tạo.
         * @enum {string}
         */
        NotificationType: "message" | "rfq" | "verification_status" | "new_match" | "expiry_alert";
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
        RuleType: "WO" | "CTH" | "MaxNOM" | "CTH_OR_MaxNOM";
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
        /** TariffLineIn */
        TariffLineIn: {
            /** Hs Code */
            hs_code: string;
            /** Destination */
            destination: string;
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
            /** Quota Note En */
            quota_note_en: string | null;
            /** Condition Note En */
            condition_note_en: string | null;
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
        };
        /** VerificationTile */
        VerificationTile: {
            data: components["schemas"]["VerificationData"] | null;
            /** Empty Hint Key */
            empty_hint_key?: string | null;
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
    tariff_preview_api_exporter_tariff_preview_get: {
        parameters: {
            query: {
                hs_code: string;
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
