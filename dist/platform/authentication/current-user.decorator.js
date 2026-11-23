import { createParamDecorator } from '@nestjs/common';
export const CurrentUser = createParamDecorator((_data, ctx) => {
    const request = ctx
        .switchToHttp()
        .getRequest();
    return request.user;
});
export const CurrentUserId = createParamDecorator((_data, ctx) => {
    const request = ctx
        .switchToHttp()
        .getRequest();
    return request.user?.id;
});
export const CurrentOrgId = createParamDecorator((_data, ctx) => {
    const request = ctx
        .switchToHttp()
        .getRequest();
    return request.user?.organizationId ?? null;
});
//# sourceMappingURL=current-user.decorator.js.map