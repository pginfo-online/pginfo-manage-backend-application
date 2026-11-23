export function adminRequestMetadata(request) {
    return {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
    };
}
//# sourceMappingURL=admin-request.js.map