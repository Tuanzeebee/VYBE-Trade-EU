"""J8: mọi route có tham số id ngoài /api/admin và /api/public phải có test "người khác không đụng vào".

Thêm route mới có {id} mà quên test chéo chủ sở hữu thì test này đỏ, buộc người viết cân nhắc IDOR.
Cột bên phải là test giữ từng route.
"""

from app.main import app

COVERED = {
    (
        "/api/exporter/documents/{document_id}",
        "get",
    ): "compliance: test_other_exporter_cannot_see_or_open_my_documents",
    (
        "/api/exporter/evidences/{evidence_id}",
        "get",
    ): "verification: test_other_exporter_cannot_touch_my_evidence",
    (
        "/api/exporter/evidences/{evidence_id}",
        "patch",
    ): "verification: test_other_exporter_cannot_touch_my_evidence",
    (
        "/api/exporter/evidences/{evidence_id}",
        "delete",
    ): "verification: test_other_exporter_cannot_touch_my_evidence",
    (
        "/api/exporter/products/{product_id}",
        "get",
    ): "companies: test_products_api (sản phẩm của người khác 404)",
    (
        "/api/exporter/products/{product_id}",
        "patch",
    ): "companies: test_products_api (sản phẩm của người khác 404)",
    (
        "/api/exporter/products/{product_id}",
        "delete",
    ): "companies: test_products_api (sản phẩm của người khác 404)",
    (
        "/api/exporter/services/{service_id}",
        "patch",
    ): "companies: test_other_seller_cannot_touch_my_service",
    (
        "/api/exporter/services/{service_id}",
        "delete",
    ): "companies: test_other_seller_cannot_touch_my_service",
    (
        "/api/exporter/rfqs/{rfq_id}/status",
        "patch",
    ): "messaging: test_only_recipient_exporter_changes_status",
    ("/api/me/rfqs/{rfq_id}", "get"): "messaging: test_lists_are_scoped_to_the_callers_company",
    (
        "/api/me/conversations/{conversation_id}/messages",
        "get",
    ): "messaging: test_non_participant_gets_404",
    (
        "/api/me/conversations/{conversation_id}/messages",
        "post",
    ): "messaging: test_non_participant_gets_404",
    (
        "/api/me/notifications/{notification_id}/read",
        "post",
    ): "notifications: test_user_cannot_read_others_notifications",
}


def test_every_owned_id_route_has_a_cross_owner_test() -> None:
    found = {
        (path, method)
        for path, operations in app.openapi()["paths"].items()
        if "{" in path and not path.startswith(("/api/admin", "/api/public"))
        for method in operations
    }
    assert found == set(COVERED), {
        "thiếu test chéo chủ sở hữu": sorted(found - set(COVERED)),
        "route không còn": sorted(set(COVERED) - found),
    }
