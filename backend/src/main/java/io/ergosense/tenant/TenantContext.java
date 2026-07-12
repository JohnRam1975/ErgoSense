package io.ergosense.tenant;

public final class TenantContext {
    private static final ThreadLocal<String> CURRENT = new ThreadLocal<>();

    private TenantContext() {}

    public static void setTenantId(String tenantId) {
        CURRENT.set(tenantId);
    }

    public static String getTenantId() {
        return CURRENT.get();
    }

    public static void requireTenant(String tenantId) {
        String current = getTenantId();
        if (current == null || !current.equals(tenantId)) {
            throw new TenantAccessDeniedException("Tenant mismatch");
        }
    }

    public static void clear() {
        CURRENT.remove();
    }
}
