var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { BadRequestException, Injectable, } from '@nestjs/common';
let ZodValidationPipe = class ZodValidationPipe {
    schema;
    constructor(schema) {
        this.schema = schema;
    }
    transform(value, metadata) {
        if (this.schema) {
            return this.validate(this.schema, value);
        }
        const metatype = metadata.metatype;
        if (metatype?.schema) {
            return this.validate(metatype.schema, value);
        }
        return value;
    }
    validate(schema, value) {
        const result = schema.safeParse(value);
        if (result.success) {
            return result.data;
        }
        throw new BadRequestException(formatZodErrors(result.error));
    }
};
ZodValidationPipe = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [Function])
], ZodValidationPipe);
export { ZodValidationPipe };
function formatZodErrors(error) {
    const errors = error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
    }));
    return {
        message: 'Validation failed',
        errors,
    };
}
//# sourceMappingURL=zod-validation.pipe.js.map